# Dola AI Video Watermark Remover & Downloader

A lightweight, powerful Google Chrome extension (Manifest V3) designed to automatically intercept and download **100% Watermark-Free 1080p Raw MP4 videos** in real-time from **Dola AI** and **Doubao**.

---

## Overview

When generating videos on Dola AI (`dola.com`) or Doubao (`doubao.com`), the platforms attach overlay watermarks and compress the default preview streams. 

**Dola AI Video Watermark Remover & Downloader** runs quietly in the background, intercepts the raw master video streams at the network layer, decrypts AES-CBC encrypted stream tokens, and downloads the original crystal-clear, unwatermarked 1080p MP4 file the second generation completes.

---

## Key Features

- **100% Watermark-Free Raw 1080p**: Automatically overrides stream parameters (`logo_type=unwatermarked`) and decrypts the master CDN stream token (`qAAB` decryption) to fetch original uncompressed videos.
- **Automatic Background Downloading**: Detects when a video finishes rendering and automatically saves it to your downloads directory without requiring manual clicks.
- **1-Click Screen Grabber**: On-demand download button in the extension popup to instantly capture and save any active video visible on your current tab.
- **Custom Subfolder Organization**: Specify a custom folder name (e.g., `Dola_Videos`) to keep your downloads neatly organized.
- **Download History & Quick Locate**: Keep track of recent downloads with one-click access to open the file location directly on your computer.
- **Privacy-Focused & Lightweight**: No external dependencies, no accounts required, no telemetry, and zero bloat. Pure native JavaScript.

---

## Supported Platforms

| Platform | Domain | Support Level |
| :--- | :--- | :--- |
| **Dola AI** | `dola.com` | Full Support (Auto-capture & decrypt) |
| **Doubao** | `doubao.com` | Full Support (Auto-capture & decrypt) |
| **SeaArt AI** | `seaart.ai` | Partial / Compatible stream support |

---

## How It Works

```
[Dola AI / Doubao Frontend]
            │ (Video Generation Finishes)
            ▼
[extractor.js (MAIN World)]
 ├── Intercepts XHR / Fetch API responses
 ├── Extracts fallback video streams
 ├── Injects logo_type=unwatermarked
 └── Decrypts QAAB AES-CBC master video tokens
            │
            ▼
[content.js (Bridge)]
 └── Dispatches custom event & notifies background worker
            │
            ▼
[background.js (Service Worker)]
 ├── Deduplicates video ID / URL
 ├── Generates clean timestamped filename
 └── Downloads directly via chrome.downloads API
```

---

## Installation Guide

### Prerequisites
- Any Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Opera, Vivaldi).

### Steps to Install

1. **Clone or Download the Repository**:
   ```bash
   git clone https://github.com/your-username/dola_watermark_remove.git
   ```
   *(Or download the repository as a `.zip` file and extract it)*.

2. **Open Extensions Management**:
   - In Google Chrome, go to `chrome://extensions/`
   - In Microsoft Edge, go to `edge://extensions/`
   - In Brave, go to `brave://extensions/`

3. **Enable Developer Mode**:
   - Toggle the **Developer mode** switch in the top-right corner.

4. **Load the Extension**:
   - Click the **Load unpacked** button in the top-left corner.
   - Select the root folder of this project (the directory containing `manifest.json`).

5. **Pin the Extension**:
   - Click the puzzle icon (Extensions menu) on your browser toolbar and pin **Dola Downloader**.

---

## Usage Guide

1. **Automatic Download Mode (Default)**:
   - Navigate to [dola.com](https://dola.com) or [doubao.com](https://doubao.com).
   - Generate a video using any prompt.
   - Once generation is finished, the extension will automatically intercept the master stream and download the watermark-free video directly into your `Downloads/Dola_Videos/` folder.
   - A subtle notification toast will appear on the bottom-right of your screen confirming the download.

2. **Manual Screen Grab**:
   - If a video is already loaded on the page, click the extension icon in your browser toolbar.
   - Click **Download Video on Screen** to instantly download the active video.

3. **Settings & Customization**:
   - **Auto-Download Toggle**: Enable or disable automatic downloads at any time from the popup.
   - **Subfolder Name**: Change the destination folder name inside your `Downloads` directory and click **Save**.
   - **History**: View past downloads and click the folder icon to reveal downloaded files on your computer.

---

## Project Structure

```
dola_watermark_remove/
├── manifest.json       # Manifest V3 extension configuration & permissions
├── background.js      # Background service worker (download manager, history, storage)
├── content.js         # Content script bridge (isolated world)
├── extractor.js       # Main-world network interceptor & stream decryptor
├── popup.html         # Extension popup user interface
├── popup.css          # Minimalist typography & dark theme styling
├── popup.js           # Popup controller & settings manager
├── icon16.png         # 16x16 icon
├── icon32.png         # 32x32 icon
├── icon48.png         # 48x48 icon
└── icon128.png        # 128x128 icon
```

---

## Permissions & Privacy

This extension requests minimal permissions required for its functionality:

- `storage`: To save your custom settings (folder path, auto-download preference) and download history locally.
- `downloads`: To save the decrypted MP4 files into your downloads folder.
- `notifications`: To display optional completion notifications when a video finishes downloading.
- `scripting` & `tabs`: To inject the stream extractor into Dola AI and Doubao tabs.
- `host_permissions`: Limited strictly to `dola.com`, `doubao.com`, and related CDN domains for stream decryption.

> **Note**: No user data, prompts, or video streams are ever transmitted to any third-party servers. All operations happen 100% locally in your browser.

---

## Disclaimer

This project is created for educational and personal research purposes only. All trademarks, service marks, and company names are the property of their respective owners. Please adhere to the terms of service of the respective platforms when using this tool.

---

## License

This project is licensed under the [MIT License](LICENSE).
