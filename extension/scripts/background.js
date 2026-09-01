// Dola Video Watermark Remover - Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default storage values
    chrome.storage.sync.set({
      autoRemove: true,
      downloadBtn: true,
      cleanStream: true,
    });
    console.log('Dola Video Watermark Remover successfully installed!');
  }
});

// Update badge status based on current active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && changeInfo.status === 'complete') {
    const isDola = tab.url.includes('dola.ai') ||
                   tab.url.includes('dolai.video') ||
                   tab.url.includes('dola.com');
    if (isDola) {
      chrome.action.setBadgeText({ tabId, text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  }
});

// Handle download messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOWNLOAD_VIDEO') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename || `dola_clean_${Date.now()}.mp4`,
      saveAs: false,
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download error:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true; // Keep message channel open for async response
  }
});
