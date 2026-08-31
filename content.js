/**
 * Dola AI Video Watermark Remover — Content Script (Isolated World)
 * Connects MAIN-world extractor (extractor.js) to background.js for 100% Watermark-Free raw downloads.
 */
(() => {
  'use strict';

  console.log('[Dola Downloader Bridge] Content script active on:', window.location.href);

  const downloadedMediaKeys = new Set();
  let latestExtractedVideos = [];

  function showDownloadToast(title, resolution = '1080p Raw') {
    try {
      const existing = document.getElementById('dola-auto-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'dola-auto-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999999;
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.12);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05);
        color: #09090b;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: dolaSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      `;

      toast.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div style="color: #09090b; font-weight: 600; font-size: 12px; display: flex; align-items: center; gap: 8px;">
            <span>Watermark-Free Video Downloaded</span>
            <span style="color: #059669; font-size: 11px; font-weight: 600;">${escapeHtml(resolution)}</span>
          </div>
          <span style="color: #71717a; font-size: 11px; max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(title || 'Saved to Downloads folder')}</span>
        </div>
      `;

      if (!document.getElementById('dola-toast-style')) {
        const style = document.createElement('style');
        style.id = 'dola-toast-style';
        style.textContent = `
          @keyframes dolaSlideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    } catch {}
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function triggerDownload(video, force = false) {
    if (!video || !video.url) return;

    const cleanUrl = String(video.url).trim();
    if (!cleanUrl.startsWith('http')) return;

    const mediaKey = String(video.vid || cleanUrl);
    if (!force && downloadedMediaKeys.has(mediaKey)) {
      return;
    }
    downloadedMediaKeys.add(mediaKey);

    // Safeguard against invalidated extension context
    if (!chrome || !chrome.runtime || !chrome.runtime.id) {
      console.warn('[Dola Downloader] Extension context invalidated. Please refresh the page.');
      return;
    }

    try {
      chrome.runtime.sendMessage({
        type: 'AUTO_DOWNLOAD_VIDEO',
        force,
        video: {
          ...video,
          url: cleanUrl,
          pageUrl: window.location.href,
          prompt: video.prompt || video.title || ''
        }
      }, response => {
        if (chrome.runtime.lastError) {
          // Suppress error in console if background was asleep or restarted
          return;
        }
        if (response?.ok && response?.downloaded) {
          showDownloadToast(video.prompt || video.title || 'Dola Video', '1080p Raw (No Watermark)');
        }
      });
    } catch (err) {
      console.warn('[Dola Downloader] Send message exception:', err);
    }
  }

  function requestMainWorldMedia(timeoutMs = 1500) {
    return new Promise(resolve => {
      let settled = false;
      const onResponse = event => {
        if (settled) return;
        settled = true;
        window.removeEventListener('DOLA_CHAT_MEDIA_RESPONSE', onResponse);
        const videos = event?.detail?.videos || [];
        latestExtractedVideos = videos;
        resolve(videos);
      };
      window.addEventListener('DOLA_CHAT_MEDIA_RESPONSE', onResponse, { once: true });
      window.dispatchEvent(new CustomEvent('DOLA_GET_CHAT_MEDIA'));
      setTimeout(() => {
        if (!settled) {
          settled = true;
          window.removeEventListener('DOLA_CHAT_MEDIA_RESPONSE', onResponse);
          resolve(latestExtractedVideos);
        }
      }, timeoutMs);
    });
  }

  // 1. Listen for new unwatermarked video extractions from extractor.js
  window.addEventListener('DOLA_VIDEO_EXTRACTED', event => {
    try {
      const video = event.detail;
      if (video && video.url) {
        console.log('[Dola Downloader Bridge] Captured unwatermarked video stream:', video);
        triggerDownload(video);
      }
    } catch (e) {
      console.warn('[Dola Downloader] Extracted event error:', e);
    }
  });

  // 2. Handle manual download trigger from extension popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'SCAN_AND_DOWNLOAD_ACTIVE_TAB') {
      (async () => {
        try {
          const videos = await requestMainWorldMedia(2000);
          const validVideos = (videos || []).filter(v => v && v.url);

          if (validVideos.length > 0) {
            const target = validVideos[validVideos.length - 1];
            triggerDownload(target, true);
            sendResponse({ ok: true, foundCount: 1, unwatermarked: true, url: target.url });
            return;
          }

          sendResponse({ ok: false, foundCount: 0, message: 'No unwatermarked video detected on screen.' });
        } catch (err) {
          sendResponse({ ok: false, error: err.message || String(err) });
        }
      })();
      return true;
    }
  });

})();
