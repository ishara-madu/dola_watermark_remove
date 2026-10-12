# Privacy Policy

**Last Updated:** October 12, 2026  
**Project:** Dola AI Video Watermark Remover & Downloader  
**Author / Developer:** [Ishara M.](https://github.com/ishara-madu)  
**Repository:** [dola_watermark_remove](https://github.com/ishara-madu/dola_watermark_remove)

---

## 1. Introduction & Core Privacy Philosophy

Your privacy is paramount. **Dola AI Video Watermark Remover & Downloader** is built with a strict **privacy-first, client-side only** architecture.

This software is designed to function entirely within your local browser environment. We believe that utilities should do their job without tracking their users, harvesting personal information, or compromising your security.

---

## 2. Information We Do NOT Collect

We do **not** collect, store, transmit, or sell any personal or sensitive information:

- **No Personal Identifiable Information (PII):** We do not collect names, email addresses, phone numbers, IP addresses, or device identifiers.
- **No Browsing History or Telemetry:** We do not track websites you visit, search queries, or general browsing behavior.
- **No Video Generation Prompts or Content:** We do not log, inspect, store, or transmit your creative prompts, chat histories, or generated video content.
- **No Account or Authentication Data:** We do not access, intercept, or store login tokens, cookies, passwords, or payment credentials.
- **No Remote Analytics or Trackers in Extension:** The extension contains zero tracking libraries, zero Google Analytics, zero telemetry SDKs, and zero background analytics pings.

---

## 3. Browser Permissions & Justifications

The extension requests only the minimum set of permissions necessary to function as declared in `manifest.json`:

| Permission | Purpose | Data Scope |
| :--- | :--- | :--- |
| `storage` | Saves your local preferences (such as auto-download toggle, download folder name, and download history log). | Stored exclusively inside `chrome.storage.local` on your local device. Never synced or transmitted to any external server. |
| `downloads` | Saves watermark-free video files (`.mp4`) directly into your browser's default download folder. | Local disk access only via the official Chromium Downloads API. |
| `notifications` | Displays an optional desktop notification confirming when a video download has completed. | Local display only; no notification content is sent externally. |
| `scripting` | Injects stream extraction and token decryption logic into the active video generation page. | Executed strictly within the target webpage context during active sessions. |
| `tabs` | Reads the current active tab's URL to check if you are on a supported platform (e.g., Dola AI or Doubao). | Only inspects URLs to activate or deactivate extension features accordingly. |
| `host_permissions` | Allows intercepting video stream tokens and direct raw streams from supported domains: `*.dola.com`, `*.doubao.com`, `*.seaart.ai`, and related content delivery networks (`*.byteintl.com`, `*.ibytedtos.com`). | Restricted strictly to the domains where video generation and stream decryption occur. |

---

## 4. How Data is Processed

- **100% Local Stream Interception:** All stream decryption (including AES-CBC token decryption and watermark flag overrides) takes place in your browser's volatile memory.
- **Direct CDN Downloads:** When downloading a watermark-free raw MP4, your browser communicates directly with the media host's CDN. No intermediate proxy servers or third-party servers are involved.
- **Local Persistence Only:** Any preference you configure in the extension popup is stored locally on your machine via `chrome.storage.local`.

---

## 5. Third-Party Services & Web Platform

### Chrome Extension
The browser extension itself does **not** communicate with any third-party analytics, tracking, or advertising services.

### Project Web Landing Page
The companion informational website is hosted via **GitHub Pages** (governed by the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement)). 

- The project website includes optional links to external community channels (e.g., GitHub, Buy Me a Coffee).
- If the user explicitly interacts with external sponsored links or third-party platforms from the web landing page, those interactions are governed by the respective third-party privacy policies.

---

## 6. User Control & Data Retention

You maintain full control over any data stored by this extension:

- **Clear History & Settings:** You can clear your download history and reset preferences directly from the extension popup interface at any time.
- **Complete Data Removal:** Removing or uninstalling the extension from your browser (`chrome://extensions`) immediately and permanently deletes all locally stored preferences, logs, and cache.

---

## 7. Children's Privacy

Our software is not directed to children under the age of 13, and we do not knowingly collect personal information from children.

---

## 8. Compliance & Disclaimer

This project is an independent open-source utility developed for personal media management, educational, and research workflows. It is not affiliated with, endorsed by, or sponsored by Dola AI, Doubao, SeaArt, or ByteDance. Users are responsible for adhering to the respective platforms' terms of service and copyright regulations.

---

## 9. Changes to this Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in extension features, browser APIs, or regulatory requirements. Any updates will be published directly to this repository with an updated "Last Updated" revision date.

---

## 10. Contact Information

If you have questions, feedback, or concerns regarding this Privacy Policy or the security of the extension, please open an issue or reach out via:

- **GitHub Issues:** [https://github.com/ishara-madu/dola_watermark_remove/issues](https://github.com/ishara-madu/dola_watermark_remove/issues)
- **Developer Profile:** [https://github.com/ishara-madu](https://github.com/ishara-madu)
