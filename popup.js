/**
 * Dola AI Video Watermark Remover — Popup Controller
 * Clean, lightweight, and typography-driven UI.
 */
(() => {
  'use strict';

  // Elements
  const autoDownloadToggle = document.getElementById('dola-auto-download-toggle');
  const btnDownloadScreen = document.getElementById('btn-download-screen');
  const btnDownloadScreenText = document.getElementById('btn-download-screen-text');
  const metricCount = document.getElementById('dola-metric-count');
  const subfolderInput = document.getElementById('dola-subfolder-input');
  const saveFolderBtn = document.getElementById('btn-dola-save-folder');
  const historyList = document.getElementById('dola-history-list');
  const historyCount = document.getElementById('dola-history-count');
  const clearHistoryBtn = document.getElementById('btn-dola-clear-history');

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function renderHistory(items = []) {
    if (!historyList) return;
    if (historyCount) historyCount.textContent = String(items.length);

    if (!items || items.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          No videos downloaded yet.<br>
          Generate any video on Dola AI or Doubao to download unwatermarked videos automatically.
        </div>
      `;
      return;
    }

    historyList.innerHTML = items.slice(0, 30).map(item => `
      <div class="history-item">
        <div class="history-details">
          <div class="history-prompt" title="${escapeHtml(item.prompt || item.filename)}">
            ${escapeHtml(item.prompt || item.filename)}
          </div>
          <div class="history-meta">
            <span class="history-tag">${escapeHtml(item.resolution || '1080p Raw')}</span>
            <span>•</span>
            <span>${formatTime(item.timestamp)}</span>
          </div>
        </div>
        <button class="btn-icon-open" data-download-id="${item.downloadId || ''}" title="Show in folder" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
    `).join('');

    historyList.querySelectorAll('.btn-icon-open').forEach(btn => {
      btn.addEventListener('click', () => {
        const dId = btn.getAttribute('data-download-id');
        chrome.runtime.sendMessage({
          type: 'SHOW_DOWNLOAD_ITEM',
          downloadId: dId ? Number(dId) : null
        });
      });
    });
  }

  function refreshDownloaderState() {
    chrome.runtime.sendMessage({ type: 'GET_DOWNLOADER_STATUS' }, res => {
      if (chrome.runtime.lastError || !res || !res.ok) return;

      if (metricCount) {
        metricCount.textContent = String(res.totalDownloaded || (res.history ? res.history.length : 0));
      }
      if (autoDownloadToggle && res.config) {
        autoDownloadToggle.checked = Boolean(res.config.autoDownload);
      }
      if (subfolderInput && res.config && res.config.subfolder) {
        subfolderInput.value = res.config.subfolder;
      }
      renderHistory(res.history || []);
    });
  }

  // Toggle Auto-Download
  if (autoDownloadToggle) {
    autoDownloadToggle.addEventListener('change', () => {
      chrome.runtime.sendMessage({
        type: 'TOGGLE_AUTO_DOWNLOAD',
        enabled: autoDownloadToggle.checked
      }, () => {
        if (chrome.runtime.lastError) return;
        refreshDownloaderState();
      });
    });
  }

  // Save Folder Name
  if (saveFolderBtn && subfolderInput) {
    saveFolderBtn.addEventListener('click', () => {
      const folder = subfolderInput.value.trim() || 'Dola_Videos';
      chrome.runtime.sendMessage({
        type: 'UPDATE_CONFIG',
        config: { subfolder: folder }
      }, () => {
        if (chrome.runtime.lastError) return;
        saveFolderBtn.textContent = 'Saved';
        setTimeout(() => { saveFolderBtn.textContent = 'Save'; }, 1500);
      });
    });
  }

  // Clear History
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear video download history?')) {
        chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, () => {
          if (chrome.runtime.lastError) return;
          refreshDownloaderState();
        });
      }
    });
  }

  // Grab Screen Video
  if (btnDownloadScreen) {
    btnDownloadScreen.addEventListener('click', () => {
      const originalText = btnDownloadScreenText.textContent;
      btnDownloadScreen.disabled = true;
      btnDownloadScreenText.textContent = 'Scanning for 1080p Stream...';

      chrome.runtime.sendMessage({ type: 'TRIGGER_PAGE_SCAN_AND_DOWNLOAD' }, res => {
        btnDownloadScreen.disabled = false;
        if (chrome.runtime.lastError) {
          btnDownloadScreenText.textContent = 'Connection error';
        } else if (res?.ok && res.downloadedCount > 0) {
          btnDownloadScreenText.textContent = 'Video Downloaded (No Watermark)!';
        } else {
          btnDownloadScreenText.textContent = res?.message || 'No video detected';
        }
        setTimeout(() => {
          btnDownloadScreenText.textContent = originalText;
        }, 2500);
        refreshDownloaderState();
      });
    });
  }

  // Initial load
  refreshDownloaderState();
})();
