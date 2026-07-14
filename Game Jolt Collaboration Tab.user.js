// ==UserScript==
// @name         Game Jolt Collaborators Tab
// @namespace    https://github.com/SeenWonderAlex/Game-Jolt-Addons
// @version      1.0.0
// @description  Adds the collaborators tab on GameJolt games.
// @author       SeenWonderAlex
// @match        *://gamejolt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gamejolt.com
// @updateURL    https://github.com/SeenWonderAlex/Game-Jolt-Addons/raw/refs/heads/main/Game%20Jolt%20Collaboration%20Tab.user.js
// @downloadURL  https://github.com/SeenWonderAlex/Game-Jolt-Addons/raw/refs/heads/main/Game%20Jolt%20Collaboration%20Tab.user.js
// @run-at       document-idle
// @inject-into  page
// @grant        none
// ==/UserScript==
/**
 * @type {Array}
 */
let CollaboratorList = [];
let AddedAlready = false;
let LastGameID = "";
let NotLoggedIn = false;
let ErrorMsg = false;
let LastGameIDDetected = "";
let UserOwnsGame = false;

function Add(count = -1) {
    if (!window.location.pathname.startsWith("/games/")) return;
    if (AddedAlready) return;
    AddedAlready = true;
    if (count === 0) {
        console.log("[Game Jolt Collaborator Tab] No collaborators detected!");
        ErrorMsg = false;
        return;
    }
    const ul = document.querySelector('.platform-list > ul');

    const li = document.createElement('li');
    const a = document.createElement('a');
    const span1 = document.createElement('span');
    span1.innerText = "Collaborators";
    const span2 = document.createElement('span');
    span2.className = "badge";
    if (count === -1) {
        span2.innerText = "!";
        span2.style.color = "red";
        a.title = NotLoggedIn ? "You must be logged in to see the collaborators list." : "Failed to retrieve collaborators list. Please make sure one of the game's posts or the game itself has at least one comment.";
        AddedAlready = false;
        ErrorMsg = true;
    }
    else {
        ErrorMsg = false;
        span2.innerText = count.toString();
        a.addEventListener('click', () => {
            for (const Ele of document.querySelectorAll('.router-link-exact-active')) {
                Ele.addEventListener('click', (ev) => { window.location.reload(); });
                Ele.className = "";
            }
            a.className = "router-link-exact-active active";
            LoadCollaborators();
        });
    }
    a.appendChild(span1);
    a.appendChild(span2);
    a.setAttribute("class", "");
    a.href = "javascript:void(0)";
    li.appendChild(a);
    ul.insertBefore(li, ul.lastChild);
}

function WaitForAnElement(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function InitalizePage(RetrievedGameID) {
    let IncreaseDelay = !!RetrievedGameID ? (document.querySelector('.share-control > input') && new URL(document.querySelector('.share-control > input').value).pathname.split("/")[3] !== RetrievedGameID) : false;
    let timeout = setTimeout(() => {
        if (!window.location.pathname.startsWith("/games/")) return;
        timeout = -1;
        console.log("Comments are disabled. Falling back on game posts");
        const GetGameURL = new URL(document.querySelector('.share-control > input').value);
        const GameID = GetGameURL.pathname.split("/")[3]
        LastGameIDDetected = GameID;
        UserOwnsGame = false;
        try {
            if (document.querySelector('.post-add-button') && document.querySelector('.post-add-button').querySelector('.-username').innerText.split("@")[1] === document.querySelector('.page-header-content').querySelector('small').innerText.split("@")[1]) {
                console.log("[Game Jolt Collaborator Tab] This is the user's game. Using the /collaborators/ endpoint instead.");
                fetch("https://gamejolt.com/site-api/web/dash/developer/games/collaborators/" + GameID)
                    .then(res => {
                        return res.json();
                    })
                    .then(json => {
                        if (!json.payload || !json.payload.collaborators) {
                            return Promise.reject("Json is missing payload");
                        }
                        UserOwnsGame = true;
                        CollaboratorList = json.payload.collaborators;
                        var Count = CollaboratorList.length;
                        for (const Collaborator of CollaboratorList) {
                            if (Collaborator.status !== "active") {
                                Count--;
                            }
                        }
                        Add(Count);
                    })
                    .catch(err => {
                        console.error("[Game Jolt Collaborator Tab] Collaborator fetch error", err);
                        Add(-1);
                    })
                return;
            }
        } catch (error) {
            console.error(error);
        }
        fetch("https://gamejolt.com/site-api/web/discover/games/overview/" + GameID + "?ignore")
            .then(res => {
                return res.json();
            })
            .then(async json => {
                if (!json.payload || !json.payload.posts) {
                    return Promise.reject("Json is missing payload");
                }
                if (json.payload.posts.length <= 0) {
                    return Promise.reject("No posts found");
                }
                const postList = json.payload.posts;
                let Found = false;
                for (let i = 0; i < postList.length; i++) {
                    const post = postList[i];
                    await fetch("https://gamejolt.com/site-api/comments/Fireside_Post/" + post.action_resource_id + "/hot?page=1")
                        .then(res => {
                            return res.json();
                        })
                        .then(json => {
                            if (!json.payload || !json.payload.collaborators) {
                                if (json.payload && json.user === null) {
                                    NotLoggedIn = true;
                                    return Promise.reject("User is not logged in, collaborators list is hidden from API");
                                }
                                return Promise.reject("Json is missing payload");
                            }
                            CollaboratorList = json.payload.collaborators;
                            Add(CollaboratorList.length);
                            Found = true;
                        })
                        .catch(err => {
                            console.error("[Game Jolt Collaborator Tab] Failed to fetch POST " + post.action_resource_id, err);
                            return Promise.resolve({});
                        })
                    if (Found) break;
                }
                if (!Found) {
                    return Promise.reject("Failed to find any posts that comments are enabled");
                }
                // CollaboratorList = json.payload.collaborators;
                // Add(CollaboratorList.length);
            })
            .catch(err => {
                console.error("[Game Jolt Collaborator Tab] Collaborator fetch error", err);
                Add(-1);
            })
    }, 500 + (IncreaseDelay ? 500 : 0));
    setTimeout(() => {
        WaitForAnElement(".comment-add-button").then(() => {
            clearTimeout(timeout);
            if (timeout == -1) return;
            const GetGameURL = new URL(document.querySelector('.share-control > input').value);
            const GameID = GetGameURL.pathname.split("/")[3]
            LastGameIDDetected = GameID;
            UserOwnsGame = false;
            try {
                if (document.querySelector('.post-add-button') && document.querySelector('.post-add-button').querySelector('.-username').innerText.split("@")[1] === document.querySelector('.page-header-content').querySelector('small').innerText.split("@")[1]) {
                    console.log("[Game Jolt Collaborator Tab] This is the user's game. Using the /collaborators/ endpoint instead.");
                    fetch("https://gamejolt.com/site-api/web/dash/developer/games/collaborators/" + GameID)
                        .then(res => {
                            return res.json();
                        })
                        .then(json => {
                            if (!json.payload || !json.payload.collaborators) {
                                return Promise.reject("Json is missing payload");
                            }
                            UserOwnsGame = true;
                            CollaboratorList = json.payload.collaborators;
                            var Count = CollaboratorList.length;
                            for (const Collaborator of CollaboratorList) {
                                if (Collaborator.status !== "active") {
                                    Count--;
                                }
                            }
                            Add(Count);
                        })
                        .catch(err => {
                            console.error("[Game Jolt Collaborator Tab] Collaborator fetch error", err);
                            Add(-1);
                        })
                    return;
                }
            } catch (error) {
                console.error(error);
            }
            fetch("https://gamejolt.com/site-api/comments/Game/" + GameID + "/hot?page=1")
                .then(res => {
                    return res.json();
                })
                .then(json => {
                    if (!json.payload || !json.payload.collaborators) {
                        if (json.payload && json.user === null) {
                            NotLoggedIn = true;
                            return Promise.reject("User is not logged in, collaborators list is hidden from API");
                        }
                        return Promise.reject("Json is missing payload");
                    }
                    CollaboratorList = json.payload.collaborators;
                    Add(CollaboratorList.length);
                })
                .catch(err => {
                    console.error("[Game Jolt Collaborator Tab] Collaborator fetch error", err);
                    Add(-1);
                })
        })
    }, IncreaseDelay ? 500 : 0);
}

AddedAlready = false;
WaitForAnElement(".share-card")
    .then(() => {
        InitalizePage();
    });

let WillBeGamePageOverview = false;
let WillBeGamePage = true;
let IsNavigating = false;
let GamePath = "";
navigation.addEventListener('navigate', (ev) => {
    if (ev.navigationType === "push") {
        IsNavigating = true;
        let path = (new URL(ev.destination.url).pathname).split("/");
        if (path[1] === "games" && path.length === 4) {
            WillBeGamePageOverview = true;
            WillBeGamePage = true;
            GamePath = new URL(ev.destination.url).pathname;
        }
        else if (path[1] === "games" && path.length >= 4) {
            WillBeGamePageOverview = false;
            WillBeGamePage = true;
            GamePath = new URL(ev.destination.url).pathname;
        }
        else {
            WillBeGamePageOverview = false;
            WillBeGamePage = false;
            GamePath = "";
        }
    }
});
navigation.addEventListener('navigatesuccess', (ev) => {
    if (IsNavigating) {
        IsNavigating = false;
        if (WillBeGamePage) {
            let HasID = undefined;
            if ((ErrorMsg || AddedAlready) && document.querySelector('a[href="javascript:void(0)"]')) {
                try {
                    const GameID = GamePath.split("\"/games/")[1].split("/")[1].split("\"")[0];
                    if (GameID !== LastGameIDDetected) {
                        ErrorMsg = false;
                        AddedAlready = true;
                        HasID = GameID;
                        document.querySelector('a[href="javascript:void(0)"]').remove();
                    }
                } catch (error) {
                    console.error(error);
                }
            }
            if ((ErrorMsg || AddedAlready) && !document.querySelector('a[href="javascript:void(0)"]')) {
                AddedAlready = false;
                ErrorMsg = false;
                WaitForAnElement(".share-card")
                    .then(() => {
                        InitalizePage(HasID);
                    });
            }
        }
        else if (WillBeGamePage) {
            if (ErrorMsg) {
                ErrorMsg = false;
                AddedAlready = true;
            }
        }
    }
})

const HTMLTemplate = `<div data-v-3fb1b769="">
    <div data-v-c5414ab9="" data-v-3fb1b769="" id="theme-82"
        class="user-card sheet sheet-full sheet-no-full-bleed sheet-elevate"{additional_styling}>
        <style>
            #theme-82 {
                --theme-white: #fff;
                --theme-white-trans: rgba(255, 255, 255, 0);
                --theme-white-rgb: 255, 255, 255;
                --theme-black: #000;
                --theme-black-trans: rgba(0, 0, 0, 0);
                --theme-black-rgb: 0, 0, 0;
                --theme-darkest: #101015;
                --theme-darkest-trans: rgba(16, 16, 21, 0);
                --theme-darkest-rgb: 16, 16, 21;
                --theme-darker: #1d1e27;
                --theme-darker-trans: rgba(29, 30, 39, 0);
                --theme-darker-rgb: 29, 30, 39;
                --theme-dark: #272731;
                --theme-dark-trans: rgba(39, 39, 49, 0);
                --theme-dark-rgb: 39, 39, 49;
                --theme-gray: #33343e;
                --theme-gray-trans: rgba(51, 52, 62, 0);
                --theme-gray-rgb: 51, 52, 62;
                --theme-gray-subtle: #41414b;
                --theme-gray-subtle-trans: rgba(65, 65, 75, 0);
                --theme-gray-subtle-rgb: 65, 65, 75;
                --theme-light: #787983;
                --theme-light-trans: rgba(120, 121, 131, 0);
                --theme-light-rgb: 120, 121, 131;
                --theme-lighter: #a1a1ab;
                --theme-lighter-trans: rgba(161, 161, 171, 0);
                --theme-lighter-rgb: 161, 161, 171;
                --theme-lightest: #e6e6f0;
                --theme-lightest-trans: rgba(230, 230, 240, 0);
                --theme-lightest-rgb: 230, 230, 240;
                --theme-highlight: #ff3333;
                --theme-highlight-trans: rgba(255, 51, 51, 0);
                --theme-highlight-rgb: 255, 51, 51;
                --theme-highlight-fg: #000;
                --theme-highlight-fg-trans: rgba(0, 0, 0, 0);
                --theme-highlight-fg-rgb: 0, 0, 0;
                --theme-backlight: #4c0029;
                --theme-backlight-trans: rgba(76, 0, 41, 0);
                --theme-backlight-rgb: 76, 0, 41;
                --theme-backlight-fg: #fff;
                --theme-backlight-fg-trans: rgba(255, 255, 255, 0);
                --theme-backlight-fg-rgb: 255, 255, 255;
                --theme-notice: #ff0078;
                --theme-notice-trans: rgba(255, 0, 120, 0);
                --theme-notice-rgb: 255, 0, 120;
                --theme-notice-fg: #000;
                --theme-notice-fg-trans: rgba(0, 0, 0, 0);
                --theme-notice-fg-rgb: 0, 0, 0;
                --theme-bi-bg: #4c0029;
                --theme-bi-bg-trans: rgba(76, 0, 41, 0);
                --theme-bi-bg-rgb: 76, 0, 41;
                --theme-bi-fg: #ff3333;
                --theme-bi-fg-trans: rgba(255, 51, 51, 0);
                --theme-bi-fg-rgb: 255, 51, 51;
                --theme-bg: var(--theme-white);
                --theme-bg-trans: var(--theme-white-trans);
                --theme-bg-rgb: var(--theme-white-rgb);
                --theme-bg-offset: var(--theme-lightest);
                --theme-bg-offset-trans: var(--theme-lightest-trans);
                --theme-bg-offset-rgb: var(--theme-lightest-rgb);
                --theme-bg-backdrop: #f3f3f8;
                --theme-bg-backdrop-trans: rgba(243, 243, 248, 0);
                --theme-bg-backdrop-rgb: 243, 243, 248;
                --theme-bg-subtle: var(--theme-lighter);
                --theme-bg-subtle-trans: var(--theme-lighter-trans);
                --theme-bg-subtle-rgb: var(--theme-lighter-rgb);
                --theme-fg: var(--theme-dark);
                --theme-fg-trans: var(--theme-dark-trans);
                --theme-fg-rgb: var(--theme-dark-rgb);
                --theme-fg-muted: var(--theme-light);
                --theme-fg-muted-trans: var(--theme-light-trans);
                --theme-fg-muted-rgb: var(--theme-light-rgb);
                --theme-link: var(--theme-backlight);
                --theme-link-trans: var(--theme-backlight-trans);
                --theme-link-rgb: var(--theme-backlight-rgb);
                --theme-link-hover: var(--theme-black);
                --theme-link-hover-trans: var(--theme-black-trans);
                --theme-link-hover-rgb: var(--theme-black-rgb);
                --theme-primary: var(--theme-link);
                --theme-primary-trans: var(--theme-link-trans);
                --theme-primary-rgb: var(--theme-link-rgb);
                --theme-primary-fg: var(--theme-backlight-fg);
                --theme-primary-fg-trans: var(--theme-backlight-fg-trans);
                --theme-primary-fg-rgb: var(--theme-backlight-fg-rgb);
                --dark-theme-highlight: #ff3333;
                --dark-theme-highlight-trans: rgba(255, 51, 51, 0);
                --dark-theme-highlight-rgb: 255, 51, 51;
                --dark-theme-backlight: #4c0029;
                --dark-theme-backlight-trans: rgba(76, 0, 41, 0);
                --dark-theme-backlight-rgb: 76, 0, 41;
                --dark-theme-notice: #ff0078;
                --dark-theme-notice-trans: rgba(255, 0, 120, 0);
                --dark-theme-notice-rgb: 255, 0, 120;
                --dark-theme-bi-bg: #ff3333;
                --dark-theme-bi-bg-trans: rgba(255, 51, 51, 0);
                --dark-theme-bi-bg-rgb: 255, 51, 51;
                --dark-theme-bi-fg: #000;
                --dark-theme-bi-fg-trans: rgba(0, 0, 0, 0);
                --dark-theme-bi-fg-rgb: 0, 0, 0;
                --dark-theme-bg: var(--theme-dark);
                --dark-theme-bg-trans: var(--theme-dark-trans);
                --dark-theme-bg-rgb: var(--theme-dark-rgb);
                --dark-theme-bg-offset: var(--theme-darker);
                --dark-theme-bg-offset-trans: var(--theme-darker-trans);
                --dark-theme-bg-offset-rgb: var(--theme-darker-rgb);
                --dark-theme-bg-backdrop: #20212a;
                --dark-theme-bg-backdrop-trans: rgba(32, 33, 42, 0);
                --dark-theme-bg-backdrop-rgb: 32, 33, 42;
                --dark-theme-bg-subtle: var(--theme-gray-subtle);
                --dark-theme-bg-subtle-trans: var(--theme-gray-subtle-trans);
                --dark-theme-bg-subtle-rgb: var(--theme-gray-subtle-rgb);
                --dark-theme-fg: var(--theme-lightest);
                --dark-theme-fg-trans: var(--theme-lightest-trans);
                --dark-theme-fg-rgb: var(--theme-lightest-rgb);
                --dark-theme-fg-muted: var(--theme-light);
                --dark-theme-fg-muted-trans: var(--theme-light-trans);
                --dark-theme-fg-muted-rgb: var(--theme-light-rgb);
                --dark-theme-link: #ff3333;
                --dark-theme-link-trans: rgba(255, 51, 51, 0);
                --dark-theme-link-rgb: 255, 51, 51;
                --dark-theme-link-hover: var(--theme-white);
                --dark-theme-link-hover-trans: var(--theme-white-trans);
                --dark-theme-link-hover-rgb: var(--theme-white-rgb);
                --dark-theme-primary: var(--theme-link);
                --dark-theme-primary-trans: var(--theme-link-trans);
                --dark-theme-primary-rgb: var(--theme-link-rgb);
                --dark-theme-primary-fg: #000;
                --dark-theme-primary-fg-trans: rgba(0, 0, 0, 0);
                --dark-theme-primary-fg-rgb: 0, 0, 0;
            }

            #theme-82 {
                --theme-highlight: var(--dark-theme-highlight);
                --theme-highlight-trans: var(--dark-theme-highlight-trans);
                --theme-highlight-rgb: var(--dark-theme-highlight-rgb);
                --theme-backlight: var(--dark-theme-backlight);
                --theme-backlight-trans: var(--dark-theme-backlight-trans);
                --theme-backlight-rgb: var(--dark-theme-backlight-rgb);
                --theme-notice: var(--dark-theme-notice);
                --theme-notice-trans: var(--dark-theme-notice-trans);
                --theme-notice-rgb: var(--dark-theme-notice-rgb);
                --theme-bi-bg: var(--dark-theme-bi-bg);
                --theme-bi-bg-trans: var(--dark-theme-bi-bg-trans);
                --theme-bi-bg-rgb: var(--dark-theme-bi-bg-rgb);
                --theme-bi-fg: var(--dark-theme-bi-fg);
                --theme-bi-fg-trans: var(--dark-theme-bi-fg-trans);
                --theme-bi-fg-rgb: var(--dark-theme-bi-fg-rgb);
                --theme-bg: var(--dark-theme-bg);
                --theme-bg-trans: var(--dark-theme-bg-trans);
                --theme-bg-rgb: var(--dark-theme-bg-rgb);
                --theme-bg-offset: var(--dark-theme-bg-offset);
                --theme-bg-offset-trans: var(--dark-theme-bg-offset-trans);
                --theme-bg-offset-rgb: var(--dark-theme-bg-offset-rgb);
                --theme-bg-backdrop: var(--dark-theme-bg-backdrop);
                --theme-bg-backdrop-trans: var(--dark-theme-bg-backdrop-trans);
                --theme-bg-backdrop-rgb: var(--dark-theme-bg-backdrop-rgb);
                --theme-bg-subtle: var(--dark-theme-bg-subtle);
                --theme-bg-subtle-trans: var(--dark-theme-bg-subtle-trans);
                --theme-bg-subtle-rgb: var(--dark-theme-bg-subtle-rgb);
                --theme-fg: var(--dark-theme-fg);
                --theme-fg-trans: var(--dark-theme-fg-trans);
                --theme-fg-rgb: var(--dark-theme-fg-rgb);
                --theme-fg-muted: var(--dark-theme-fg-muted);
                --theme-fg-muted-trans: var(--dark-theme-fg-muted-trans);
                --theme-fg-muted-rgb: var(--dark-theme-fg-muted-rgb);
                --theme-link: var(--dark-theme-link);
                --theme-link-trans: var(--dark-theme-link-trans);
                --theme-link-rgb: var(--dark-theme-link-rgb);
                --theme-link-hover: var(--dark-theme-link-hover);
                --theme-link-hover-trans: var(--dark-theme-link-hover-trans);
                --theme-link-hover-rgb: var(--dark-theme-link-hover-rgb);
                --theme-primary: var(--dark-theme-primary);
                --theme-primary-trans: var(--dark-theme-primary-trans);
                --theme-primary-rgb: var(--dark-theme-primary-rgb);
                --theme-primary-fg: var(--dark-theme-primary-fg);
                --theme-primary-fg-trans: var(--dark-theme-primary-fg-trans);
                --theme-primary-fg-rgb: var(--dark-theme-primary-fg-rgb);
            }

            .-avatar-img[data-v-c5414ab9] {
                border-radius: 50%;
                display: block;
                width: 100px;
                height: 100px;
                border: 4px solid var(--theme-bg-actual);
            }

            .-user-info[data-v-c5414ab9] {
                --theme-bg-actual: var(--theme-bg);
                --theme-bg-actual-trans: var(--theme-bg-trans);
                background-color: #fff;
                background-color: var(--theme-bg);
                text-align: center;
            }

            .-avatar[data-v-c5414ab9] {
                position: relative;
                width: 100px;
                height: 100px;
                margin-top: -38.2px;
                margin-left: auto;
                margin-right: auto;
                z-index: 2;
            }

            .-header[data-v-c5414ab9] {
                --theme-bg-actual: var(--theme-link);
                --theme-bg-actual-trans: var(--theme-link-trans);
                background-color: #2f7f6f;
                background-color: var(--theme-link);
                height: 100px;
                background-repeat: no-repeat;
                background-position: center center;
                background-size: cover;
            }

            .-display-name[data-v-c5414ab9] {
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                font-weight: 700;
                font-size: 19px;
            }

            .-username[data-v-c5414ab9] {
                color: #7e7e7e;
                color: var(--theme-fg-muted);
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                font-size: 13px;
            }

            .-well[data-v-c5414ab9] {
                position: relative;
                padding: 10px;
            }

            .user-card[data-v-c5414ab9] {
                border-radius: 12px;
                margin-bottom: 21px;
                overflow: hidden;
            }
        </style>
        <div data-v-c5414ab9="" class="-user-info">
            <div data-v-c5414ab9="" class="-header"></div>
            <div data-v-3ddc1c91="" data-v-c5414ab9="" class="-avatar"><a data-v-3ddc1c91=""
                    href="https://gamejolt.com/@{username}">
                    <div data-v-3ddc1c91="" style="position: relative;">
                        <div style="z-index: 1;">
                            <div data-v-3ddc1c91="" style="position: relative;">
                                <div style="position: relative; height: 0px; padding-top: 100%;">
                                    <div style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;">
                                        <div style="width: 100%; height: 100%; position: relative;">
                                            <div
                                                style="position: absolute; z-index: 0; inset: 0%; width: 100%; height: 100%;">
                                                <div data-v-3ddc1c91=""
                                                    style="--theme-bg-actual: var(--theme-bg); --theme-bg-actual-trans: var(--theme-bg-trans); background-color: var(--theme-bg); border-radius: 50%; overflow: hidden; line-height: 0;">
                                                    <span data-v-c5414ab9="" class="user-avatar-img -avatar-img"
                                                        style="display: block; position: relative; border-width: medium; border-style: none; border-color: currentcolor; border-image: initial;"><img
                                                            src="{profile_url}"
                                                            class="img-responsive" alt=""
                                                            style="border-radius: 50%;"></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div><!---->
                    </div>
                </a></div>
            <div data-v-c5414ab9="" class="-well fill-bg"><!----><span class="badge">{role}</span>
                <div data-v-c5414ab9="" class="-display-name"><a data-v-c5414ab9="" href="/@{username}"
                        class="link-unstyled">{display_name}</a></div>
                <div data-v-c5414ab9="" class="-username"><a data-v-c5414ab9="" href="/@{username}"
                        class="link-unstyled"> @{username}</a></div>
                <div data-v-c5414ab9="" class="-follow-counts small"><strong data-v-c5414ab9="" title="{invitedate}">{invitedsince}</strong><span data-v-c5414ab9="" class="dot-separator"></span><strong
                        data-v-c5414ab9="" title="{approvedate}">{approvedsince}</strong></div>
            </div>
        </div>
    </div>
</div>`;

const GetUsersByGameAPI = function (UserList = []) {
    const ENDPOINT = 'https://api.gamejolt.com/api/game/v1_2';
    const Request = async function (url, option = { "method": "get" }) {
        const URL = ENDPOINT + url;
        async function sha1(message) {
            const msgUint8 = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
            return hashHex;
        }
        let SIGN = (await sha1(URL + "f17763efb6216a8685cacd2b9f9816e7")).toString();
        return fetch(URL + "&signature=" + SIGN, option);
    }
    return Request("/users/?game_id=983283&user_id=" + UserList.join(","));
};

function LoadCollaborators() {
    const PageTemplate = `<style>
html, body, #content {
	--theme-bg-actual: var(--theme-bg-backdrop);
	--theme-bg-actual-trans: var(--theme-bg-backdrop-trans);
	background-color: var(--theme-bg-backdrop) !important;
}
    .-list[data-v-3fb1b769] {
    display: grid;
    grid-template-columns: repeat(auto-fill,minmax(250px,1fr));
    grid-gap: 0px 16px
}
</style><section class="section"><div class="container"><div data-v-3fb1b769="" class="follower-list"><div data-v-3fb1b769="" class="-list"></div></div></div></section>`;
    const backdrop = document.querySelector('.fill-backdrop');
    backdrop.className = "fill-backdrop";
    backdrop.innerHTML = PageTemplate;
    const list = document.querySelector('.follower-list > .-list');
    let CollabList = CollaboratorList;
    let UserIds = [];
    for (let User of CollabList) {
        UserIds.push(User.user_id);
    }
    GetUsersByGameAPI(UserIds)
        .then(res => {
            return res.json();
        })
        .then(json => {
            if (!json.response) return Promise.reject("Failed with " + JSON.stringify(json));
            const UserFetchedList = json.response.users;
            let UserList = []; // The corrected version
            for (const Collab of CollabList) {
                for (const UserFetched of UserFetchedList) {
                    if (Collab.user_id.toString() == UserFetched.id.toString()) {
                        UserList.push(UserFetched);
                        break;
                    }
                }
            }
            for (let i = 0; i < UserList.length; i++) {
                let Template = HTMLTemplate
                    .replaceAll("{username}", UserList[i].username)
                    .replaceAll("{display_name}", UserList[i].developer_name)
                    .replaceAll("{profile_url}", UserList[i].avatar_url.replace("/60/", "/200/"));
                let RoleName = "Community Manager";
                if (CollabList[i].role === "collaborator") {
                    RoleName = "Collaborator";
                }
                if (CollabList[i].status === "active") {
                    const Added = new Date(CollabList[i].added_on);
                    const Accepted = new Date(CollabList[i].accepted_on);
                    Template = Template
                        .replace("{additional_styling}", "")
                        .replace("{role}", RoleName)
                        .replace("{invitedate}", Added.toLocaleString())
                        .replace("{invitedsince}", "Appointed " + timeAgo(Added))
                        .replace("{approvedate}", Accepted.toLocaleString())
                        .replace("{approvedsince}", "Accepted " + timeAgo(Accepted));
                }
                else {
                    const Added = new Date(CollabList[i].added_on);
                    Template = Template
                        .replace("{additional_styling}", " style=\"opacity: 0.5;\"")
                        .replace("{role}", "Pending " + RoleName)
                        .replace("{invitedate}", Added.toLocaleString())
                        .replace("{invitedsince}", "Invited " + timeAgo(Added))
                        .replace("{approvedate}", "Pending")
                        .replace("{approvedsince}", "");
                }
                list.insertAdjacentHTML('beforeend', Template)
            }
        })
        .catch(err => {
            alert("Failed to load collaborators list");
            console.error(err);
        })
}

function timeAgo(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + " year" + ((Math.floor(interval) == 1) ? "" : "s") + " ago";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " month" + ((Math.floor(interval) == 1) ? "" : "s") + " ago";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " day" + ((Math.floor(interval) == 1) ? "" : "s") + " ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hour" + ((Math.floor(interval) == 1) ? "" : "s") + " ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minute" + ((Math.floor(interval) == 1) ? "" : "s") + " ago";
    }
    return Math.floor(seconds) + " second" + ((Math.floor(interval) == 1) ? "" : "s") + " ago";
}