// ==UserScript==
// @name         Game Jolt Feed Preserver
// @namespace    https://github.com/SeenWonderAlex/Game-Jolt-Addons
// @version      1.0.6
// @description  Preserve deleted posts of your following feed. This also gives the option to default the following tab on Game Jolt.
// @author       SeenWonderAlex
// @match        *://gamejolt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gamejolt.com
// @updateURL    https://github.com/SeenWonderAlex/Game-Jolt-Addons/raw/refs/heads/main/Game%20Jolt%20Feed%20Preserver.user.js
// @downloadURL  https://github.com/SeenWonderAlex/Game-Jolt-Addons/raw/refs/heads/main/Game%20Jolt%20Feed%20Preserver.user.js
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==
var cachedPosts = {};
var deletedPosts = {};
var displayedPosts = {};

let periodStart = 0;
let periodEnd = new Date().getTime();

let cachedChildComments = [];
let currentDeletedPost = undefined;

let CheckCacheEveryCheck = false;

let Set_CacheComments = (localStorage.getItem("p1") === null) ? true : (localStorage.getItem("p1") === "t");
let Set_FollowingPage = (localStorage.getItem("p2") === null) ? true : (localStorage.getItem("p2") === "t");
let Set_Days = parseInt((localStorage.getItem("p3") === null) ? "3" : localStorage.getItem("p3"));

if (isNaN(Set_Days)) Set_Days = 3;

const bc = new BroadcastChannel("gj-feed-preserver");

bc.onmessage = (event) => {
    if (event.data === "tab_check") {
        bc.postMessage("turn_on_storage_check");
        CheckCacheEveryCheck = true;
        console.warn("[Game Jolt Feed Preserver] We detected another tab open. Storage will now be checked every time a post is cached.")
    }
    if (event.data === "turn_on_storage_check") {
        CheckCacheEveryCheck = true;
        console.warn("[Game Jolt Feed Preserver] Another tab was open. Storage will now be checked every time a post is cached.")
    }
};

bc.postMessage("tab_check");

let RegularOutput = {
    "c": { eea: false, ads: true },
    "t": [],
    "user": null,
    "ver": "786"
}

if (localStorage.getItem("gjcacheposts") !== null) {
    try {
        cachedPosts = JSON.parse(localStorage.getItem("gjcacheposts"));
    } catch (error) {
        console.error("[Game Jolt Feed Preserver] Failed to load cached posts... resetting local storage item");
        localStorage.removeItem("gjcacheposts");
    }
}

function UpdateCachedPosts(newPosts = []) {
    if (CheckCacheEveryCheck && localStorage.getItem("gjcacheposts") !== null) {
        try {
            cachedPosts = JSON.parse(localStorage.getItem("gjcacheposts"));
        } catch (error) {
            console.error("[Game Jolt Feed Preserver] Failed to load cached posts. Overriding.");
        }
    }
    for (const newPost of newPosts) {
        const postId = newPost.hash;
        if (cachedPosts[postId]) {
            cachedPosts[postId] = { ...cachedPosts[postId], ...newPost };
        }
        else {
            cachedPosts[postId] = newPost;
        }
    }
    if (Set_Days < 30) {
        try {
            for (const cachedPost of Object.values(cachedPosts)) {
                if (cachedPost.added_on <= new Date(Date.now() - (86400000 * Set_Days))) {
                    delete cachedPosts[cachedPost.hash];
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
    localStorage.setItem("gjcacheposts", JSON.stringify(cachedPosts));
}


function UpdateDeletedPosts(newPosts = []) {
    for (const newPost of newPosts) {
        const postId = newPost.hash;
        if (deletedPosts[postId]) {
            deletedPosts[postId] = { ...deletedPosts[postId], ...newPost };
        }
        else {
            deletedPosts[postId] = newPost;
        }
    }
    setTimeout(() => {
        const postContents = document.querySelectorAll('.fireside-post-lead-content');
        for (const postContent of postContents) {
            const span = postContent.querySelector('span');
            if (span) {
                const text = span.innerText;
                for (const newPost of newPosts) {
                    if (text === newPost.leadStr) {
                        postContent.closest(".AppBackground").parentElement.style.filter = "grayscale(0.7)";
                        break;
                    }
                }
            }
        }
    }, 150)
}

function GetPosts(PeriodStart = 0, PeriodEnd = 0) {
    if (PeriodEnd == 0) {
        PeriodEnd = new Date().getTime();
    }
    let list = {};
    for (const cachedPost of Object.values(cachedPosts)) {
        if (cachedPost.added_on > PeriodStart && cachedPost.added_on <= PeriodEnd) {
            list[cachedPost.hash] = cachedPost;
        }
    }
    console.log("[Game Jolt Feed Perserver] Returned list from " + PeriodStart + " to " + PeriodEnd);
    return list;
}

function CacheArticleToPost(postId, article_content) {
    if (cachedPosts[postId]) {
        console.log("[Game Jolt Feed Preserver] Cached article for post " + postId)
        cachedPosts[postId].article_content = article_content;
        UpdateCachedPosts([cachedPosts[postId]]);
    }
    else {
        console.error("[Game Jolt Feed Preserver] We are unable to cache the article for " + postId + " because the post is not cached.");
    }
}

function CacheCommentsToPost(postId, comments = [], childcomments = undefined) {
    if (cachedPosts[postId]) {
        console.log("[Game Jolt Feed Preserver] Cached comments for post " + postId)
        cachedPosts[postId].comments = comments;
        cachedPosts[postId].childComments = childcomments;
        UpdateCachedPosts([cachedPosts[postId]]);
    }
    else {
        console.error("[Game Jolt Feed Preserver] We are unable to cache the comments for " + postId + " because the post is not cached.");
    }
}

function GetCommentsFromHashedPost(postId) {
    if (cachedPosts[postId] && cachedPosts[postId].comments) {
        return [[], cachedPosts[postId].childComments];
    }
    else {
        return [[], undefined];
    }
}

function GetArticleFromHashedPost(postId) {
    if (cachedPosts[postId] && cachedPosts[postId].article_content) {
        return cachedPosts[postId].article_content;
    }
    else {
        return JSON.stringify({ "version": "4", "createdOn": 1783937123689, "context": "fireside-post-article", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[We could not preserve the article]" }] }], "hydration": [] });
    }
}

/**
 * 
 * @param {XMLHttpRequest} xhr 
 */
function setupHook(xhr) {
    function getter() {
        delete xhr.responseText;
        var ret = xhr.responseText;
        xhr._realResponseText = ret;
        try {
            let json = JSON.parse(ret);
            if (json.user) {
                let HasFYPDefault = false;
                if (json.user && json.user.created_on >= 1666742400 * 1000) {
                    HasFYPDefault = true;
                }

                if (HasFYPDefault && Set_FollowingPage) {
                    json.user.created_on = 1666742399 * 1000;
                }
                else if (!HasFYPDefault && !Set_FollowingPage) {
                    json.user.created_on = 1666742400 * 1000;
                }
            }
            if (json.payload.items && typeof json.payload.items === "object" && json.payload.items.length > 0) {
                periodStart = json.payload.items[json.payload.items.length - 1].added_on;
            }
            else {
                periodStart = 0;
            }
            var listOfPosts = json.payload.items;
            var deletedpostslist = GetPosts(periodStart, periodEnd);
            let l = listOfPosts.length;
            for (let i = 0; i < l; i++) {
                const listedPost = listOfPosts[i];
                displayedPosts[listedPost.action_resource_model.hash] = true;
                if (deletedpostslist[listedPost.action_resource_model.hash]) {
                    deletedpostslist[listedPost.action_resource_model.hash] = undefined;
                    delete deletedpostslist[listedPost.action_resource_model.hash];
                }
                if (deletedPosts[listedPost.action_resource_model.hash]) // That means it's on the deleted list for a weird reason... remove it from there and simply remove from the payload to prevent duplicates.
                {
                    deletedPosts[listedPost.action_resource_model.hash] = undefined;
                    delete deletedPosts[listedPost.action_resource_model.hash];
                    console.log("[Game Jolt Feed Preserver] Detected a thought-of-deleted post that is not deleted [" + listedPost.action_resource_model.hash + "]. Stats may be out of date.");
                    UpdateCachedPosts([listedPost.action_resource_model]);

                    listOfPosts.splice(listOfPosts.indexOf(listedPost), 1);
                    i--;
                    l--;
                }
            }
            for (const checkPost of Object.values(deletedpostslist)) {
                if (displayedPosts[checkPost.hash]) {
                    deletedpostslist[checkPost.hash] = undefined;
                    delete deletedpostslist[checkPost.hash];
                }
            }
            let deletedposts = Object.values(deletedpostslist);
            UpdateDeletedPosts(deletedposts);
            let deletedPostsResources = [];
            for (let deletedPost of deletedposts) {
                deletedPost.can_view_comments = true;
                if (deletedPost.status === "removed") {
                    deletedPost.status = "active";
                }
                deletedPost.can_comment = false;
                let json = {
                    "action_resource": "Fireside_Post",
                    "action_resource_id": deletedPost.id,
                    "action_resource_model": deletedPost,
                    "added_on": deletedPost.added_on,

                    "from_resource": "User",
                    "from_resource_id": deletedPost.user.id,
                    "from_resource_model": deletedPost.user,

                    "id": (Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000),
                    "is_notification_feed_item": false,
                    "scroll_id": JSON.stringify({ "ver": 1, "pos": (deletedPost.added_on / 1000).toString() }),

                    "to_resource": "User",
                    "to_resource_id": deletedPost.user.id,
                    "to_resource_model": deletedPost.user,
                    "type": "post-add"
                }
                if (deletedPost.game !== null) {
                    json.to_resource = "Game";
                    json.to_resource_id = deletedPost.game.id;
                    json.to_resource_model = deletedPost.game;
                }
                deletedPostsResources.push(json);
            }
            listOfPosts = listOfPosts.concat(deletedPostsResources)
            listOfPosts.sort((a, b) => b.added_on - a.added_on);
            json.payload.items = listOfPosts;
            ret = JSON.stringify(json);
        } catch (error) {
            console.error(error);
        }

        setup();
        return ret;
    }

    function setter(str) {

    }

    function setup() {
        Object.defineProperty(xhr, 'responseText', {
            get: getter,
            set: setter,
            configurable: true
        });
    }
    setup();
}

function isDeletedPost(post_id) {
    return getDeletedPost(post_id) !== null;
}

function getDeletedPost(post_id) {
    if (!isNaN(post_id)) {
        for (const post of Object.values(deletedPosts)) {
            if (post_id === post.id) {
                return post;
            }
        }
    }
    return null;
}

/**
 * 
 * @param {XMLHttpRequest} xhr 
 */
function setupDiffHook(xhr) {
    function getter() {
        delete xhr.responseText;
        var ret = xhr.responseText;
        try {
            let json = JSON.parse(ret);
            if (json.user) {
                let HasFYPDefault = false;
                if (json.user && json.user.created_on >= 1666742400 * 1000) {
                    HasFYPDefault = true;
                }

                if (HasFYPDefault && Set_FollowingPage) {
                    json.user.created_on = 1666742399 * 1000;
                }
                else if (!HasFYPDefault && !Set_FollowingPage) {
                    json.user.created_on = 1666742400 * 1000;
                }

                ret = JSON.stringify(json);
            }
        } catch (error) {
            console.error(error);
        }

        setup();
        return ret;
    }

    function setter(str) {

    }

    function setup() {
        Object.defineProperty(xhr, 'responseText', {
            get: getter,
            set: setter,
            configurable: true
        });
    }
    setup();
}

const oldXHROpen = window.XMLHttpRequest.prototype.open;
const originalSend = window.XMLHttpRequest.prototype.send;

let getting = false;

window.XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    if (RegularOutput.user === null && !getting && url.includes("/site-api/")) {
        getting = true;
        this.addEventListener('load', function () {
            try {
                const json = JSON.parse(this.responseText);
                RegularOutput.user = json.user;
            } catch (error) {
                console.error(error);
            }
        });
        this.addEventListener('loadend', function () {
            getting = false;
        });
    }
    if (url.includes("gamejolt.com/site-api/web/dash/activity/activity") && method === "GET") {// do something with the method, url and etc.
        if (!this._hooked) {
            this._hooked = true;
            setupHook(this);
        }
        this.addEventListener('load', function () {
            this.responseText;
            try {
                const json = JSON.parse(this._realResponseText || this.responseText);
                let listOfPosts = json.payload.items;
                let postList = [];
                for (const listedPost of listOfPosts) {
                    postList.push(listedPost.action_resource_model);
                }
                UpdateCachedPosts(postList);
                console.log("[Game Jolt Feed Perserver] Cached " + postList.length + " posts");
            } catch (error) {
                console.error(error);
            }
        });
        periodEnd = new Date().getTime();
        displayedPosts = {};
    }
    else if (url.includes("gamejolt.com/site-api/web/dash/activity/more/activity") && method === "POST") {
        if (!this._hooked) {
            this._hooked = true;
            setupHook(this);
        }
        this.addEventListener('load', function () {
            this.responseText;
            try {
                const json = JSON.parse(this._realResponseText || this.responseText);
                let listOfPosts = json.payload.items;
                let postList = [];
                for (const listedPost of listOfPosts) {
                    postList.push(listedPost.action_resource_model);
                }
                UpdateCachedPosts(postList);
                console.log("[Game Jolt Feed Perserver] Cached " + postList.length + " posts");
            } catch (error) {
                console.error(error);
            }
        });

        window.XMLHttpRequest.prototype.send = function (body) {
            if (typeof body === "string") {
                try {
                    const bod = JSON.parse(body);
                    if (!bod.scrollId) {
                        periodEnd = new Date().getTime();
                    }
                    else if (periodStart > 0) {
                        periodEnd = Math.min(periodStart, parseFloat(JSON.parse(bod.scrollId).pos) * 1000);
                    }
                    else {
                        periodEnd = parseFloat(JSON.parse(bod.scrollId).pos) * 1000;
                    }
                } catch (error) {
                    console.error(error);
                }
            }
            // Call the original send method so the request still goes through
            return originalSend.apply(this, arguments);
        };
    }
    else if (url.includes("/site-api/web/posts/recommendations/")) {
        try {
            const post_id = parseInt(url.split("/site-api/web/posts/recommendations/")[1])
            if (isDeletedPost(post_id)) {
                this.send = function (body) {
                    console.warn("[Game Jolt Feed Reserver] Ignoring post recommendations of a deleted post");
                    Object.defineProperty(this, 'readyState', {
                        value: XMLHttpRequest.DONE,
                        configurable: true
                    });
                    Object.defineProperty(this, 'status', {
                        value: 200,
                        configurable: true
                    });
                    Object.defineProperty(this, 'statusText', {
                        value: "OK",
                        configurable: true
                    });
                    Object.defineProperty(this, 'responseType', {
                        value: "string",
                        configurable: true
                    });
                    Object.defineProperty(this, 'responseText', {
                        value: JSON.stringify({
                            ...RegularOutput, ...{
                                "payload": {
                                    "posts": []
                                }
                            }
                        }),
                        configurable: true
                    });
                    this.dispatchEvent(new ProgressEvent("load"));
                    this.dispatchEvent(new ProgressEvent("loadend"));
                    // Ignore the original send method
                };
            }
        } catch (error) {
            console.error(error);
        }
    }
    else if (url.includes("/site-api/web/posts/view/")) {
        const post_slug = url.split("/site-api/web/posts/view/")[1]

        if (location.search === "?cached") {
            if (localStorage.getItem("gjcacheposts") !== null) {
                try {
                    cachedPosts = JSON.parse(localStorage.getItem("gjcacheposts"));
                    if (cachedPosts[post_slug]) {
                        deletedPosts[post_slug] = cachedPosts[post_slug];
                        console.log("Detected cache");
                    }
                } catch (error) {
                    console.error("[Game Jolt Feed Preserver] Failed to load cached posts... resetting local storage item");
                    localStorage.removeItem("gjcacheposts");
                }
            }
        }
        if (deletedPosts[post_slug]) {
            console.log("[Game Jolt Feed Reserver] Loading cached post: " + post_slug);
            let post = deletedPosts[post_slug];
            post.allow_comments = 0;
            this.send = function (body) {
                Object.defineProperty(this, 'readyState', {
                    value: XMLHttpRequest.DONE,
                    configurable: true
                });
                Object.defineProperty(this, 'status', {
                    value: 200,
                    configurable: true
                });
                Object.defineProperty(this, 'statusText', {
                    value: "OK",
                    configurable: true
                });
                Object.defineProperty(this, 'responseType', {
                    value: "string",
                    configurable: true
                });
                Object.defineProperty(this, 'responseText', {
                    value: JSON.stringify({
                        ...RegularOutput, ...{
                            "payload": {
                                "communityNotifications": [],
                                "fb": {
                                    "description": "[deleted]",
                                    "title": "[deleted]",
                                    "type": "article"
                                },
                                "twitter": {
                                    "card": "summary_large_image",
                                    "description": "[deleted]",
                                    "title": "[deleted]"
                                },
                                "post": post
                            }
                        }
                    }),
                    configurable: true
                });
                this.dispatchEvent(new ProgressEvent("load"));
                this.dispatchEvent(new ProgressEvent("loadend"));
            };
        }
    }
    else if (url.includes("/site-api/comments/Fireside_Post/")) {
        const post_id = parseInt(url.split("/site-api/comments/Fireside_Post/")[1].split("/")[0]);
        if (isDeletedPost(post_id)) {
            this.send = function (body) {
                Object.defineProperty(this, 'readyState', {
                    value: XMLHttpRequest.DONE,
                    configurable: true
                });
                Object.defineProperty(this, 'status', {
                    value: 200,
                    configurable: true
                });
                Object.defineProperty(this, 'statusText', {
                    value: "OK",
                    configurable: true
                });
                Object.defineProperty(this, 'responseType', {
                    value: "string",
                    configurable: true
                });
                const deletedPost = getDeletedPost(post_id);
                cachedChildComments = [];
                currentDeletedPost = deletedPost;
                if (Array.isArray(deletedPost.comments)) {
                    if (Array.isArray(deletedPost.childComments)) {
                        cachedChildComments = deletedPost.childComments;
                    }
                    Object.defineProperty(this, 'responseText', {
                        value: JSON.stringify({
                            ...RegularOutput, ...{
                                "payload": {
                                    "comments": deletedPost.comments,
                                    "childComments": deletedPost.childComments,
                                    "count": deletedPost.comment_count ?? deletedPost.comments.length,
                                    "parentCount": deletedPost.comments.length,
                                    "perPage": 15 + Math.max(0, deletedPost.comments.length - 14),
                                    "resourceOwner": deletedPost.user
                                }
                            }
                        }),
                        configurable: true
                    });
                }
                else {
                    Object.defineProperty(this, 'responseText', {
                        value: JSON.stringify({
                            ...RegularOutput, ...{
                                "payload": {
                                    "comments": [],
                                    "count": 0,
                                    "parentCount": 0,
                                    "perPage": 15,
                                    "resourceOwner": deletedPost.user
                                }
                            }
                        }),
                        configurable: true
                    });
                }
                this.dispatchEvent(new ProgressEvent("load"));
                this.dispatchEvent(new ProgressEvent("loadend"));
            }
        }
        else if (!isNaN(post_id) && !url.endsWith("/you") && Set_CacheComments) { // Avoid using the You tab to perserve comments
            cachedChildComments = [];
            currentDeletedPost = undefined;
            this.addEventListener('load', function () {
                const json = JSON.parse(this.responseText);
                for (const post of Object.values(cachedPosts)) {
                    if (post_id === post.id) {
                        CacheCommentsToPost(post.hash, json.payload.comments, json.payload.childComments);
                    }
                }
            });
        }
    }
    else if (url.includes("/site-api/comments/get-thread/")) {
        const post_id = parseInt(url.split("/site-api/comments/get-thread/")[1]);
        if (Array.isArray(cachedChildComments) && cachedChildComments.length > 0) {
            let currentComment = undefined;
            for (const comm of currentDeletedPost.comments) {
                if (comm.id === post_id) {
                    currentComment = comm;
                    break;
                }
            }
            if (currentComment) {
                this.send = function (body) {
                    Object.defineProperty(this, 'readyState', {
                        value: XMLHttpRequest.DONE,
                        configurable: true
                    });
                    Object.defineProperty(this, 'status', {
                        value: 200,
                        configurable: true
                    });
                    Object.defineProperty(this, 'statusText', {
                        value: "OK",
                        configurable: true
                    });
                    Object.defineProperty(this, 'responseType', {
                        value: "string",
                        configurable: true
                    });

                    let thisChildComments = [];
                    for (const comm of cachedChildComments) {
                        if (comm.parent_id === currentComment.id) {
                            thisChildComments.push(comm);
                        }
                    }
                    thisChildComments.sort((a, b) => b.posted_on - a.posted_on);

                    if (thisChildComments.length > 0) {
                        Object.defineProperty(this, 'responseText', {
                            value: JSON.stringify({
                                ...RegularOutput, ...{
                                    "payload": {
                                        "children": thisChildComments,
                                        "parent": currentComment,
                                        "perPage": 15 + Math.max(0, thisChildComments.length - 14),
                                        "resourceOwner": currentDeletedPost.user
                                    }
                                }
                            }),
                            configurable: true
                        });
                    }
                    else {
                        Object.defineProperty(this, 'responseText', {
                            value: JSON.stringify({
                                ...RegularOutput, ...{
                                    "payload": {
                                        "children": [],
                                        "parent": currentComment,
                                        "perPage": 15,
                                        "resourceOwner": currentDeletedPost.user
                                    }
                                }
                            }),
                            configurable: true
                        });
                    }
                    this.dispatchEvent(new ProgressEvent("load"));
                    this.dispatchEvent(new ProgressEvent("loadend"));
                }
            }
        }
    }
    else if (url.includes("/site-api/web/posts/article/")) {
        const post_id = parseInt(url.split("/site-api/web/posts/article/")[1].split("/")[0]);
        if (isDeletedPost(post_id)) {
            this.send = function (body) {
                Object.defineProperty(this, 'readyState', {
                    value: XMLHttpRequest.DONE,
                    configurable: true
                });
                Object.defineProperty(this, 'status', {
                    value: 200,
                    configurable: true
                });
                Object.defineProperty(this, 'statusText', {
                    value: "OK",
                    configurable: true
                });
                Object.defineProperty(this, 'responseType', {
                    value: "string",
                    configurable: true
                });
                Object.defineProperty(this, 'responseText', {
                    value: JSON.stringify({
                        ...RegularOutput, ...{
                            "payload": {
                                "article_content": GetArticleFromHashedPost(getDeletedPost(post_id).hash)
                            }
                        }
                    }),
                    configurable: true
                });
                this.dispatchEvent(new ProgressEvent("load"));
                this.dispatchEvent(new ProgressEvent("loadend"));
            }
        }
        else if (!isNaN(post_id)) {
            this.addEventListener('load', function () {
                const json = JSON.parse(this.responseText);
                for (const post of Object.values(cachedPosts)) {
                    if (post_id === post.id) {
                        CacheArticleToPost(post.hash, json.payload.article);
                    }
                }
            });
        }
    }
    else if (url.includes("/site-api/web/touch") || url.includes("/site-api/web/dash/home") || url.includes("/site-api/web/dash/shell") || url.includes("/site-api/web/posts/for-you")) {
        if (!this._hooked) {
            this._hooked = true;
            setupDiffHook(this);
        }
    }
    else if (url.endsWith("/site-api/web/dash/account") && method === "GET") // To check if it's on the settings page. That's all, no interception.
    {
        const CreateToggleHTML = (Name, Desc, Checked, ID) => {
            let HTML = document.querySelector('div.toggle').parentElement.parentElement.outerHTML;
            HTML = HTML.replace("Allow shouts?", Name);
            HTML = HTML.replace("Will let people post short comments on your profile page. Turning this off will hide any shouts already on the page.", Desc);
            if (Checked) {
                HTML = HTML.replace('"toggle"', '"toggle -checked"');
            }
            else {
                HTML = HTML.replace('"toggle -checked"', '"toggle"');
            }
            HTML = HTML.replaceAll("shouts_enabled", ID);
            HTML = HTML.replace(`class="form-group"`, `class="form-group" id="${ID}"`)
            return HTML;
        }
        setTimeout(() => {
            function formatBytes(bytes, decimals = 2) {
                if (!+bytes) return '0 Bytes'

                const k = 1024
                const dm = decimals < 0 ? 0 : decimals
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

                const i = Math.floor(Math.log(bytes) / Math.log(k))

                return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
            }

            const CacheCommentsHTML = CreateToggleHTML("Cache comments", "Preserve the first page of comments on a post once viewed in case of deletion.", (localStorage.getItem("p1") === null) ? true : (localStorage.getItem("p1") === "t"), "cache-comments");
            const FollowingDefaultHTML = CreateToggleHTML("Default to the following tab?", "On the home page, show following first to completely remove Internal Server Errors caused by the for you page.", (localStorage.getItem("p2") === null) ? true : (localStorage.getItem("p2") === "t"), "following-default");
            const DontCachePostHTML = `<div class="form-group"><label class="control-label"><!---->Don't Cache Posts Past<!----></label><select class="form-control" id="CachePostsDeleteBy" value="${(localStorage.getItem("p3") === null) ? "3" : localStorage.getItem("p3")}"><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="30">30 days</option></select></div>`;
            const ClearCachePostHTML = `<button id="ClearCache" type="button" class="button -primary -solid" style="font-size: 13px; font-weight: 700; line-height: 33px; overflow: hidden; border-color: var(--theme-fg); color: var(--theme-fg); background-color: var(--theme-bg-actual); vertical-align: middle; cursor: pointer; white-space: nowrap; user-select: none; border-style: solid; border-color: #0000;  outline: 0; font-family: Nunito,Helvetica Neue,Helvetica,Arial,sans-serif; transition: transform .2s cubic-bezier(.19,1,.2,1); display: inline-block; text-decoration: none !important;"><!----><!----><span>Clear ${Object.keys(cachedPosts).length} Cached Posts (${formatBytes((localStorage.getItem("gjcacheposts") ?? "").length, 1)})</span><!----></button>`;

            const MainContent = document.querySelector('.loading-fade-content');
            MainContent.insertAdjacentHTML('afterbegin', ClearCachePostHTML);
            MainContent.insertAdjacentHTML('afterbegin', DontCachePostHTML);
            MainContent.insertAdjacentHTML('afterbegin', FollowingDefaultHTML);
            MainContent.insertAdjacentHTML('afterbegin', CacheCommentsHTML);

            document.querySelector("#CachePostsDeleteBy").value = (localStorage.getItem("p3") === null) ? "3" : localStorage.getItem("p3");
            document.querySelector("#CachePostsDeleteBy").addEventListener('change', (ev) => {
                localStorage.setItem("p3", ev.target.value.toString())
                Set_Days = parseInt(ev.target.value);
            })
            document.querySelector("#ClearCache").addEventListener('click', () => {
                if (confirm("Are you sure you want to clear your cached posts? You won't be able to recover deleted posts.")) {
                    localStorage.removeItem("gjcacheposts");
                    document.querySelector('#ClearCache').querySelector('span').innerText = "Cleared All Cached Posts"
                    cachedPosts = {};
                    deletedPosts = {};
                }
            });

            document.querySelector('#cache-comments').querySelector('.toggle').addEventListener('click', (ev) => {
                const checked = ev.target.classList.contains("-knob") ? ev.target.parentElement.classList.contains("-checked") : ev.target.classList.contains("-checked");
                localStorage.setItem("p1", checked ? "f" : "t");
                Set_CacheComments = !checked;
                if (checked) {
                    if (ev.target.classList.contains("-knob")) {
                        ev.target.parentElement.classList.remove("-checked");
                    }
                    else {
                        ev.target.classList.remove("-checked");
                    }
                }
                else {
                    if (ev.target.classList.contains("-knob")) {
                        ev.target.parentElement.classList.add("-checked");
                    }
                    else {
                        ev.target.classList.add("-checked");
                    }
                }
            })

            document.querySelector('#following-default').querySelector('.toggle').addEventListener('click', (ev) => {
                const checked = ev.target.classList.contains("-knob") ? ev.target.parentElement.classList.contains("-checked") : ev.target.classList.contains("-checked");
                localStorage.setItem("p2", checked ? "f" : "t");
                Set_FollowingPage = !checked;
                if (checked) {
                    if (ev.target.classList.contains("-knob")) {
                        ev.target.parentElement.classList.remove("-checked");
                    }
                    else {
                        ev.target.classList.remove("-checked");
                    }
                }
                else {
                    if (ev.target.classList.contains("-knob")) {
                        ev.target.parentElement.classList.add("-checked");
                    }
                    else {
                        ev.target.classList.add("-checked");
                    }
                }
            })
        }, 250)
    }

    return oldXHROpen.apply(this, arguments);
};

let property = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data");

const data = property.get;

// wrapper that replaces getter
function lookAtMessage() {

    let socket = this.currentTarget instanceof WebSocket;

    if (!socket) {
        return data.call(this);
    }

    let msg = data.call(this);

    Object.defineProperty(this, "data", { value: msg }); //anti-loop
    if (typeof msg === "string" && msg.includes("new-notification") && msg.includes("\"action_resource\":\"Fireside_Post")) {
        try {
            const payload = JSON.parse(msg)[4];
            const post = payload.notification_data.event_item.action_resource_model;
            console.log("[Game Jolt Feed Preserver] Caching notification");
            UpdateCachedPosts([post]);
            if (post.has_article) {
                console.log("[Game Jolt Feed Preserver] Automatically caching post's article...");
                const xhr = new window.XMLHttpRequest();
                xhr.open("GET", "https://gamejolt.com/site-api/web/posts/article/" + post.id, true);
                xhr.send();
            }
        } catch (error) {
            console.error(error);
        }

    }
    return msg;
}

property.get = lookAtMessage;

Object.defineProperty(window.MessageEvent.prototype, "data", property);