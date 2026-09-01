document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('site-status');
  const statusText = document.getElementById('status-text');
  const dolaBanner = document.getElementById('dola-banner');
  const nonDolaBanner = document.getElementById('non-dola-banner');
  const videoCountEl = document.getElementById('videos-detected-count');

  const toggleAutoRemove = document.getElementById('toggle-auto-remove');
  const toggleDownloadBtn = document.getElementById('toggle-download-btn');
  const toggleCleanStream = document.getElementById('toggle-clean-stream');

  const btnScanPage = document.getElementById('btn-scan-page');
  const btnQuickClean = document.getElementById('btn-quick-clean');

  // Load preferences from storage
  const defaultSettings = {
    autoRemove: true,
    downloadBtn: true,
    cleanStream: true,
  };

  chrome.storage.sync.get(defaultSettings, (items) => {
    toggleAutoRemove.checked = items.autoRemove;
    toggleDownloadBtn.checked = items.downloadBtn;
    toggleCleanStream.checked = items.cleanStream;
  });

  // Save changes
  function saveSettings() {
    const settings = {
      autoRemove: toggleAutoRemove.checked,
      downloadBtn: toggleDownloadBtn.checked,
      cleanStream: toggleCleanStream.checked,
    };
    chrome.storage.sync.set(settings);

    // Notify active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'UPDATE_SETTINGS',
          settings: settings,
        }).catch(() => {});
      }
    });
  }

  toggleAutoRemove.addEventListener('change', saveSettings);
  toggleDownloadBtn.addEventListener('change', saveSettings);
  toggleCleanStream.addEventListener('change', saveSettings);

  // Check active tab domain
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      const isDola = url.hostname.includes('dola.ai') ||
                     url.hostname.includes('dolai.video') ||
                     url.hostname.includes('dola.com') ||
                     url.hostname.includes('localhost');

      if (isDola) {
        statusBadge.classList.remove('status-inactive');
        statusBadge.classList.add('status-active');
        statusText.textContent = 'Active on Dola';
        dolaBanner.classList.remove('hidden');
        nonDolaBanner.classList.add('hidden');

        // Query content script for video count
        chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_STATS' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            videoCountEl.textContent = 'Ready to clean watermarks';
          } else {
            const count = response.videoCount || 0;
            videoCountEl.textContent = `${count} video${count === 1 ? '' : 's'} detected on page`;
          }
        });
      } else {
        statusBadge.classList.add('status-inactive');
        statusBadge.classList.remove('status-active');
        statusText.textContent = 'Not on Dola';
        dolaBanner.classList.add('hidden');
        nonDolaBanner.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('Error querying tab:', err);
  }

  // Scan & Clean trigger
  btnScanPage.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    btnScanPage.textContent = 'Scanning...';
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_SCAN_AND_CLEAN' }, (response) => {
      setTimeout(() => {
        btnScanPage.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          Scan & Clean Videos
        `;
        if (response && typeof response.videoCount === 'number') {
          videoCountEl.textContent = `${response.videoCount} video(s) cleaned`;
        }
      }, 500);
    });
  });

  if (btnQuickClean) {
    btnQuickClean.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      btnQuickClean.textContent = 'Cleaning...';
      chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_SCAN_AND_CLEAN' }, () => {
        setTimeout(() => {
          btnQuickClean.textContent = 'Cleaned!';
          setTimeout(() => { btnQuickClean.textContent = 'Clean All'; }, 1500);
        }, 400);
      });
    });
  }
});
