/**
 * Dola AI Video Watermark Remover — Background Service Worker
 * Manages auto-downloads, deduplication, folder storage, history, and notifications.
 */

let dolaConfig = {
  autoDownload: true,
  subfolder: 'Dola_Videos',
  notifications: true,
  totalDownloaded: 0
};

let dolaDownloadHistory = [];
const dolaInProgressKeys = new Set();
const dolaDownloadedKeys = new Set();

async function dolaLoadState() {
  try {
    const res = await chrome.storage.local.get(['dola_downloader_config', 'dola_download_history']);
    if (res.dola_downloader_config) {
      dolaConfig = { ...dolaConfig, ...res.dola_downloader_config };
    }
    if (Array.isArray(res.dola_download_history)) {
      dolaDownloadHistory = res.dola_download_history;
    }
  } catch (e) {
    console.warn('[Dola Downloader] Failed to load state:', e);
  }
}

async function dolaSaveState() {
  try {
    await chrome.storage.local.set({
      dola_downloader_config: dolaConfig,
      dola_download_history: dolaDownloadHistory.slice(0, 100)
    });
  } catch (e) {
    console.warn('[Dola Downloader] Failed to save state:', e);
  }
}

function dolaUpdateBadge() {
  try {
    const count = dolaConfig.totalDownloaded || dolaDownloadHistory.length;
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count > 99 ? '99+' : count) });
      chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch {}
}

function dolaSanitizeFilename(str) {
  return String(str || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 60)
    .trim();
}

function dolaGenerateFilename(video) {
  const folder = (dolaConfig.subfolder || 'Dola_Videos').trim().replace(/^[/\\]+|[/\\]+$/g, '');
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
  const rawPrompt = video.prompt || video.title || 'video';
  const cleanPrompt = dolaSanitizeFilename(rawPrompt) || 'video';
  return `${folder}/dola_${timestamp}_${cleanPrompt}.mp4`;
}

async function dolaHandleAutoDownload(video, force = false) {
  if (!video || !video.url) return { ok: false, error: 'Invalid video URL' };
  if (!dolaConfig.autoDownload && !force) return { ok: true, downloaded: false, reason: 'Auto-download is paused' };

  const cleanUrl = String(video.url).trim();
  const mediaKey = String(video.vid || cleanUrl);

  // Deduplication
  if (!force) {
    if (dolaDownloadedKeys.has(mediaKey) || dolaDownloadedKeys.has(cleanUrl)) {
      return { ok: true, downloaded: false, reason: 'Already downloaded' };
    }
    if (dolaInProgressKeys.has(mediaKey)) {
      return { ok: true, downloaded: false, reason: 'Download already in progress' };
    }
  }

  dolaInProgressKeys.add(mediaKey);
  dolaDownloadedKeys.add(mediaKey);
  dolaDownloadedKeys.add(cleanUrl);

  const filename = dolaGenerateFilename(video);

  try {
    console.log('[Dola Downloader] Downloading raw unwatermarked MP4:', filename, cleanUrl);

    const downloadId = await chrome.downloads.download({
      url: cleanUrl,
      filename,
      saveAs: false,
      conflictAction: 'uniquify'
    });

    dolaInProgressKeys.delete(mediaKey);
    dolaConfig.totalDownloaded = (dolaConfig.totalDownloaded || 0) + 1;

    const historyEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      downloadId,
      url: cleanUrl,
      filename,
      prompt: video.prompt || video.title || 'Dola Unwatermarked Video',
      resolution: '1080P Raw (No Watermark)',
      timestamp: Date.now()
    };

    dolaDownloadHistory.unshift(historyEntry);
    await dolaSaveState();
    dolaUpdateBadge();

    if (dolaConfig.notifications) {
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: '🎬 Video Downloaded (No Watermark)!',
          message: `${(historyEntry.prompt).substring(0, 50)}...\nSaved to Downloads/${filename}`,
          priority: 1
        });
      } catch {}
    }

    return { ok: true, downloaded: true, downloadId, filename };
  } catch (err) {
    dolaInProgressKeys.delete(mediaKey);
    console.error('[Dola Downloader] Download failed:', err);
    return { ok: false, error: err.message || String(err) };
  }
}

async function dolaAutoInjectIntoExistingTabs() {
  try {
    const tabs = await chrome.tabs.query({
      url: [
        'https://*.dola.com/*',
        'https://*.doubao.com/*',
        'https://*.seaart.ai/*'
      ]
    });

    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['extractor.js'],
          world: 'MAIN'
        }).catch(() => {});

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).catch(() => {});
      } catch (err) {
        console.warn('[Dola Downloader] Injection failed on tab', tab.id, err);
      }
    }
  } catch (e) {
    console.warn('[Dola Downloader] autoInject failed:', e);
  }
}

// Runtime messaging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'AUTO_DOWNLOAD_VIDEO') {
    dolaHandleAutoDownload(message.video, Boolean(message.force)).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_STATUS' || message.type === 'GET_DOWNLOADER_STATUS') {
    sendResponse({
      ok: true,
      config: dolaConfig,
      history: dolaDownloadHistory,
      totalDownloaded: dolaConfig.totalDownloaded || dolaDownloadHistory.length
    });
    return false;
  }

  if (message.type === 'TOGGLE_AUTO_DOWNLOAD') {
    dolaConfig.autoDownload = Boolean(message.enabled);
    dolaSaveState().then(() => {
      dolaUpdateBadge();
      sendResponse({ ok: true, autoDownload: dolaConfig.autoDownload });
    });
    return true;
  }

  if (message.type === 'UPDATE_CONFIG' || message.type === 'UPDATE_DOWNLOADER_CONFIG') {
    dolaConfig = { ...dolaConfig, ...(message.config || {}) };
    dolaSaveState().then(() => {
      dolaUpdateBadge();
      sendResponse({ ok: true, config: dolaConfig });
    });
    return true;
  }

  if (message.type === 'CLEAR_HISTORY' || message.type === 'CLEAR_DOWNLOAD_HISTORY') {
    dolaDownloadHistory = [];
    dolaSaveState().then(() => {
      dolaUpdateBadge();
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'SHOW_DOWNLOAD_ITEM') {
    if (message.downloadId) {
      chrome.downloads.show(message.downloadId);
      sendResponse({ ok: true });
    } else {
      chrome.downloads.showDefaultFolder();
      sendResponse({ ok: true });
    }
    return false;
  }

  if (message.type === 'TRIGGER_PAGE_SCAN_AND_DOWNLOAD') {
    (async () => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id) {
          return sendResponse({ ok: false, error: 'No active tab found' });
        }

        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['extractor.js'],
          world: 'MAIN'
        }).catch(() => {});
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.js']
        }).catch(() => {});

        const scanRes = await chrome.tabs.sendMessage(activeTab.id, { type: 'SCAN_AND_DOWNLOAD_ACTIVE_TAB' });
        if (scanRes?.ok && scanRes.foundCount > 0) {
          sendResponse({ ok: true, downloadedCount: scanRes.foundCount, unwatermarked: scanRes.unwatermarked, url: scanRes.url });
        } else {
          sendResponse({ ok: false, downloadedCount: 0, message: scanRes?.message || 'No unwatermarked video detected.' });
        }
      } catch (err) {
        sendResponse({ ok: false, error: err.message || String(err) });
      }
    })();
    return true;
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await dolaLoadState();
  dolaUpdateBadge();
  dolaAutoInjectIntoExistingTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await dolaLoadState();
  dolaUpdateBadge();
  dolaAutoInjectIntoExistingTabs();
});

dolaLoadState().then(dolaAutoInjectIntoExistingTabs);
