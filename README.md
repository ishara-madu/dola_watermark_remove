# Dola AI Video Watermark Remover & Downloader

Automatic, 100% Watermark-Free 1080p Raw MP4 Downloader for Dola AI (`dola.com`) and Doubao (`doubao.com`).

---

## Key Features

1. **Watermark-Free Raw 1080p Downloads**:
   - Intercepts raw master MP4 CDN video streams the second video rendering completes.
   - Overrides stream query parameters (`logo_type=unwatermarked`) and decrypts the master stream token.
   - Automatically saves unwatermarked videos directly into your chosen downloads folder (default: `Dola_Videos`).

2. **On-Demand Screen Video Grabber**:
   - 1-Click button to instantly grab and download any video currently displayed on Dola / Doubao without watermarks.

3. **Custom Subfolder & History Manager**:
   - Organize downloaded videos into a dedicated folder.
   - Track recent downloads with a 1-click folder locate button.

4. **Zero Bloat & Lightweight**:
   - No license locks, no unnecessary background tasks, no bulky accounts/prompt managers.
   - Clean, native, fast JavaScript.

---

## Project Structure

```
├── manifest.json       # Manifest V3 extension configuration
├── background.js      # Background service worker & auto-download file manager
├── content.js         # Content script bridge connecting Dola page to background
├── extractor.js       # In-page network interceptor & raw unwatermarked stream decryptor
├── popup.html         # Seamless typography-driven interface
├── popup.css          # Minimalist dark theme stylesheet
├── popup.js           # Lightweight popup controller
├── icon16.png         # Toolbar icon (16x16)
├── icon48.png         # Extension page icon (48x48)
└── icon128.png        # High-resolution icon (128x128)
```

---

## How to Install / Load in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Turn ON **Developer mode** (top-right corner).
3. Click **Load unpacked** and select this extension directory.
4. Open [dola.com](https://dola.com) or [doubao.com](https://doubao.com).
5. Generate any video — it will download raw without watermarks automatically.
