// ── Dola Video Watermark Remover Extension Website Logic ──

const MONETAG_DIRECT_LINK = 'https://omg10.com/4/11698737';
const DOWNLOAD_ZIP_URL = 'https://github.com/ishara-madu/dola_watermark_remove/releases/download/v1.0.0/dola_watermark_remove.zip';
const GITHUB_REPO_API = 'https://api.github.com/repos/ishara-madu/dola_watermark_remove';

// ── 0. Unblockable Monetag Popup Trigger (For Download Buttons Only) ──
// Browsers allow window.open without blocking ONLY when called synchronously
// in direct response to a trusted user gesture (click / pointerup).
let lastAdTimestamp = 0;

function triggerMonetagAd() {
  const now = Date.now();
  if (now - lastAdTimestamp < 800) {
    return; // Prevent duplicate popup in the exact same event tick
  }
  lastAdTimestamp = now;

  if (!MONETAG_DIRECT_LINK) return;

  try {
    const adWindow = window.open(MONETAG_DIRECT_LINK, '_blank', 'noopener,noreferrer');
    if (adWindow) {
      adWindow.opener = null;
    }
  } catch (err) {
    console.warn('Monetag trigger error:', err);
  }
}
window.triggerMonetagAd = triggerMonetagAd;

// ── 1. Extension Download Handler (Only here Monetag is triggered) ──
function downloadExtension(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  // Show user notification toast
  showToast('Starting extension download...');

  // Step 1: Open Monetag ad in new tab (Synchronous in user click - NOT blocked by browser)
  triggerMonetagAd();

  // Step 2: Trigger direct file download without opening a second conflicting tab
  try {
    const anchor = document.createElement('a');
    anchor.href = DOWNLOAD_ZIP_URL;
    anchor.download = 'dola_watermark_remove.zip';
    anchor.target = '_self';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
    }, 200);
  } catch (err) {
    window.location.href = DOWNLOAD_ZIP_URL;
  }
}
window.downloadExtension = downloadExtension;

// ── 2. Copy Chrome Extensions URL to Clipboard ──
function copyExtensionUrl() {
  const url = 'chrome://extensions';
  const btn = document.getElementById('btn-copy-ext-url');
  const btnText = document.getElementById('copy-btn-text');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showCopyFeedback(btn, btnText);
    }).catch(() => {
      fallbackCopy(url, btn, btnText);
    });
  } else {
    fallbackCopy(url, btn, btnText);
  }
}
window.copyExtensionUrl = copyExtensionUrl;

function showCopyFeedback(btn, btnText) {
  if (btnText) btnText.textContent = 'Copied!';
  showToast('Copied "chrome://extensions" to clipboard!');
  setTimeout(() => {
    if (btnText) btnText.textContent = 'Copy URL';
  }, 2500);
}

function fallbackCopy(text, btn, btnText) {
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  try {
    document.execCommand('copy');
    showCopyFeedback(btn, btnText);
  } catch (e) {
    showToast('Press Ctrl+C to copy: ' + text);
  }
  document.body.removeChild(input);
}

// ── 3. Toast Notifications ──
let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('app-toast');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}
window.showToast = showToast;

// ── 4. Mobile Menu & Interactive Handlers ──
document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.querySelector('.mobile-nav-links');
  const iconHamburger = document.querySelector('.icon-hamburger');
  const iconClose = document.querySelector('.icon-close');

  function closeMobileMenu() {
    if (!mobileNav || !mobileNav.classList.contains('open')) return;
    mobileNav.classList.remove('open');
    if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
    if (iconHamburger && iconClose) {
      iconHamburger.classList.remove('hidden');
      iconClose.classList.add('hidden');
    }
  }

  function openMobileMenu() {
    if (!mobileNav) return;
    mobileNav.classList.add('open');
    if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'true');
    if (iconHamburger && iconClose) {
      iconHamburger.classList.add('hidden');
      iconClose.classList.remove('hidden');
    }
  }

  if (mobileBtn && mobileNav) {
    mobileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileNav.classList.contains('open');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    // Close menu when clicking navigation links
    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!mobileNav.contains(e.target) && !mobileBtn.contains(e.target)) {
        closeMobileMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    });

    // Close on window resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        closeMobileMenu();
      }
    }, { passive: true });
  }

  // ── 5. Tools Dropdown Toggle on Mobile/Touch ──
  const toolsDropdown = document.getElementById('tools-dropdown');
  const toolsDropdownBtn = document.getElementById('tools-dropdown-btn');

  if (toolsDropdown && toolsDropdownBtn) {
    toolsDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = toolsDropdown.classList.toggle('open');
      toolsDropdownBtn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!toolsDropdown.contains(e.target)) {
        toolsDropdown.classList.remove('open');
        toolsDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── 6. Fetch GitHub Stars ──
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(fetchGitHubStars, { timeout: 3000 });
  } else {
    setTimeout(fetchGitHubStars, 1200);
  }
});

function fetchGitHubStars() {
  fetch(GITHUB_REPO_API, { priority: 'low' })
    .then((res) => res.json())
    .then((data) => {
      if (data && typeof data.stargazers_count === 'number') {
        document.querySelectorAll('.star-count-num, #star-count-num').forEach((el) => {
          el.textContent = data.stargazers_count;
        });
      }
    })
    .catch(() => {
      document.querySelectorAll('.star-count-num, #star-count-num').forEach((el) => {
        el.textContent = '★';
      });
    });
}
