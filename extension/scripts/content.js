// Dola Video Watermark Remover - Content Script
(function () {
  'use strict';

  let settings = {
    autoRemove: true,
    downloadBtn: true,
    cleanStream: true,
  };

  // Load preferences
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(settings, (items) => {
      if (items) settings = Object.assign(settings, items);
      initScanner();
    });
  } else {
    initScanner();
  }

  // Listen for messages from popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'UPDATE_SETTINGS') {
        settings = Object.assign(settings, request.settings);
        processAllVideos();
        sendResponse({ success: true });
      } else if (request.action === 'GET_PAGE_STATS') {
        const videos = document.querySelectorAll('video');
        sendResponse({ videoCount: videos.length });
      } else if (request.action === 'TRIGGER_SCAN_AND_CLEAN') {
        const count = processAllVideos();
        showToast(`✨ Cleaned & processed ${count} video(s) on page!`);
        sendResponse({ success: true, videoCount: count });
      }
      return true;
    });
  }

  function initScanner() {
    processAllVideos();

    // DOM Observer for dynamic SPA video loading
    const observer = new MutationObserver(() => {
      processAllVideos();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function processAllVideos() {
    const videos = document.querySelectorAll('video');
    let count = 0;

    videos.forEach((video) => {
      count++;
      if (settings.autoRemove) {
        removeWatermarkOverlays(video);
      }
      if (settings.downloadBtn) {
        injectDownloadButton(video);
      }
    });

    return count;
  }

  // Remove overlay watermark elements near video player
  function removeWatermarkOverlays(video) {
    const parent = video.parentElement;
    if (!parent) return;

    // Search siblings and parent children for watermark indicators
    const possibleOverlays = parent.querySelectorAll(
      '[class*="watermark"], [class*="logo"], [id*="watermark"], [class*="badge"], [class*="overlay-brand"], img[src*="logo"], img[src*="watermark"], [class*="dola-watermark"]'
    );

    possibleOverlays.forEach((el) => {
      // Don't remove our injected button
      if (el.classList.contains('dola-clean-dl-btn') || el.classList.contains('dola-toast-notification')) return;

      el.style.display = 'none';
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.classList.add('dola-watermark-hidden');
    });
  }

  // Inject a clean download button on each video container
  function injectDownloadButton(video) {
    let container = video.parentElement;
    if (!container) return;

    // Ensure relative positioning so floating button anchors properly
    const computedPos = window.getComputedStyle(container).position;
    if (computedPos === 'static') {
      container.style.position = 'relative';
    }

    // Check if button already injected
    if (container.querySelector('.dola-clean-dl-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'dola-clean-dl-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Clean HD</span>
    `;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      downloadCleanVideo(video, btn);
    });

    container.appendChild(btn);
  }

  // Download logic for video
  async function downloadCleanVideo(video, btn) {
    btn.classList.add('dola-dl-loading');
    btn.querySelector('span').textContent = 'Downloading...';

    showToast('🚀 Extracting clean unwatermarked video stream...');

    try {
      let videoSrc = video.currentSrc || video.src;

      // If no src on video tag directly, check child <source> tags
      if (!videoSrc) {
        const source = video.querySelector('source');
        if (source) videoSrc = source.src;
      }

      if (!videoSrc) {
        // Fallback: search parent attributes or blob
        videoSrc = video.getAttribute('data-src') || video.getAttribute('data-url');
      }

      if (!videoSrc) {
        showToast('⚠️ Could not extract video URL directly. Try playing the video first.');
        resetBtn(btn);
        return;
      }

      // If background service worker download is available
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'DOWNLOAD_VIDEO',
          url: videoSrc,
          filename: `dola_clean_video_${Date.now()}.mp4`,
        }, (response) => {
          if (response && response.success) {
            showToast('✅ Clean video download started!');
          } else {
            // Direct browser anchor fallback
            fallbackDirectDownload(videoSrc);
          }
          resetBtn(btn);
        });
      } else {
        fallbackDirectDownload(videoSrc);
        resetBtn(btn);
      }
    } catch (err) {
      console.error('Dola Remover download error:', err);
      showToast('❌ Error downloading video.');
      resetBtn(btn);
    }
  }

  function fallbackDirectDownload(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `dola_clean_video_${Date.now()}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('✅ Download initiated!');
  }

  function resetBtn(btn) {
    setTimeout(() => {
      btn.classList.remove('dola-dl-loading');
      btn.querySelector('span').textContent = 'Clean HD';
    }, 1200);
  }

  // Sleek toast notification
  function showToast(message) {
    const existing = document.querySelector('.dola-toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'dola-toast-notification';
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
})();
