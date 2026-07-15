# Game Jolt Addons
These are some [Tampermonkey](https://github.com/Tampermonkey/tampermonkey) scripts that I made for Game Jolt in my free time. It consists of:

**Collaborator Tab**: Adds a tab to the game page to list all collaborators & community managers. This works by retrieving the exposed collaborators object in the Comments API, which only works if you are logged in to Game Jolt.

<img width="1608" height="585" alt="Screenshot 2026-07-14 173916" src="https://github.com/user-attachments/assets/4f872925-02bc-4c09-b340-01f781f8f355" />

**Feed Preserver & Default to Following Tab**: Posts from your following feed are cached to your device and remain visible even if they are deleted. Comments can also be preserved if you view the post. You are also able to switch the homepage tab to "Following" for accounts created after 2022, which is recommended since the "For You" tab gives Internal Server Errors.

<img width="820" height="322" alt="image" src="https://github.com/user-attachments/assets/ecd31b58-bf1c-49f1-a668-66e8a82f28ec" />

<img width="820" height="767" alt="image" src="https://github.com/user-attachments/assets/f8b53eae-c79f-4228-a7ac-4f9e0a653dfd" />

<details>
  <summary>And if you wish, you can configure the extension for better performance by going to your settings.</summary>
  <img width="784" height="494" alt="image" src="https://github.com/user-attachments/assets/a4a7c3e9-ef58-404f-9081-ce984b96a389" />
</details>

All of these are intended for personal use only. Some of the code is assisted by StackOverflow users (to ease my coding process) and licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

**Keep in mind, these scripts do not interfere with the backend at all. All of these scripts simply retrieve the responses from HTTP requests and intercept responses from the device if needed. Code is available to view for verification.**

**If you have any concerns, feel free to reach out to me on my profile.**
