/**
 * Dola AI & Doubao Watermark-Free Video Stream Extractor (MAIN World)
 * Intercepts network responses, extracts fallback APIs, requests unwatermarked streams,
 * decodes QAAB AES-CBC encrypted URLs, and notifies the content script.
 */
(() => {
  'use strict';

  if (window.__DOLA_EXTRACTOR_INITIALIZED__) return;
  window.__DOLA_EXTRACTOR_INITIALIZED__ = true;

  console.log('[Dola Extractor] Stream interceptor initialized in MAIN world.');

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const NativeReadableStream = pageWindow.ReadableStream || ReadableStream;
  const NativeResponse = pageWindow.Response || Response;

  let extractedVideos = [];
  const videoUrlIndex = new Set();
  const videoVidIndex = new Set();
  const processedFallbackApis = new Set();
  const fallbackVideoPosterIndex = new Map();

  const QAAB_SALT_HEX = '4dd4c2e6b83162090e52b3c7a6733ba4'
    + '1cb2462b829ab58a196b39db57177524'
    + 'f49baf7f08e8d68d26a72e37c1a95a2f'
    + '1f05a51892aef2949732b62a38aadd58';

  function normalizeImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.trim().replace(/^http:\/\//i, 'https://');
  }

  function isHttpUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
  }

  function addExtractedVideo(videoInfo) {
    if (!videoInfo || !videoInfo.url) return;
    const url = normalizeImageUrl(videoInfo.url);
    const vid = videoInfo.vid ? String(videoInfo.vid) : '';

    if ((vid && videoVidIndex.has(vid)) || videoUrlIndex.has(url)) {
      const existing = extractedVideos.find(v => (vid && String(v.vid) === vid) || v.url === url);
      if (existing && videoInfo.prompt && !existing.prompt) {
        existing.prompt = videoInfo.prompt;
      }
      return;
    }

    const normalized = {
      ...videoInfo,
      url,
      vid: vid || url,
      timestamp: Date.now()
    };

    extractedVideos.push(normalized);
    videoUrlIndex.add(url);
    if (vid) videoVidIndex.add(vid);

    console.log('[Dola Extractor] 🎯 New Unwatermarked Video Captured:', normalized);

    try {
      window.dispatchEvent(new CustomEvent('DOLA_VIDEO_EXTRACTED', { detail: normalized }));
    } catch (e) {
      console.warn('[Dola Extractor] Failed to dispatch DOLA_VIDEO_EXTRACTED:', e);
    }
  }

  // Hook XHR
  const originalXHROpen = pageWindow.XMLHttpRequest.prototype.open;
  const originalXHRSend = pageWindow.XMLHttpRequest.prototype.send;

  pageWindow.XMLHttpRequest.prototype.open = function (method, url, ...args) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  pageWindow.XMLHttpRequest.prototype.send = function (...args) {
    const url = this._url;
    this.addEventListener('load', function () {
      if (url && (url.includes('/im/chain/single') || url.includes('/chat/completion') || url.includes('/samantha/'))) {
        try {
          const data = JSON.parse(this.responseText);
          processDoubaoFallbackVideos(data, this.responseText);
        } catch (e) {}
      }
    });
    return originalXHRSend.apply(this, args);
  };

  // Hook Fetch
  const originalFetch = pageWindow.fetch;
  pageWindow.fetch = async function (...args) {
    const url = args[0];
    const requestUrl = typeof url === 'string' ? url : (url?.url || '');

    if (requestUrl && requestUrl.includes('/im/chain/single')) {
      const response = await originalFetch.apply(this, args);
      response.clone().text().then(text => {
        try {
          const data = JSON.parse(text);
          processDoubaoFallbackVideos(data, text);
        } catch (e) {}
      }).catch(() => {});
      return response;
    }

    if (requestUrl && requestUrl.includes('/chat/completion')) {
      const response = await originalFetch.apply(this, args);
      if (!response.body || typeof response.body.getReader !== 'function') {
        return response;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const stream = new NativeReadableStream({
        async start(controller) {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.substring(6).trim();
                  if (jsonStr.includes('fallback_api') || jsonStr.includes('creation_block') || jsonStr.includes('creations')) {
                    const data = JSON.parse(jsonStr);
                    processDoubaoFallbackVideos(data, jsonStr);
                  }
                } catch (e) {}
              }
            }

            controller.enqueue(value);
          }
          controller.close();
        }
      });

      return new NativeResponse(stream, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText
      });
    }

    return originalFetch.apply(this, args);
  };

  function processDoubaoFallbackVideos(json, rawBody = '', posterUrl = '') {
    const fallbackApis = findDoubaoFallbackApis(json, rawBody);
    if (!fallbackApis.length) return;

    for (const fallbackApi of fallbackApis) {
      if (posterUrl) fallbackVideoPosterIndex.set(fallbackApi, posterUrl);
      if (processedFallbackApis.has(fallbackApi)) continue;
      processedFallbackApis.add(fallbackApi);

      getDoubaoVideoInfoFromFallbackApi(fallbackApi)
        .then(info => {
          if (info) {
            if (!info.poster_url) {
              info.poster_url = fallbackVideoPosterIndex.get(fallbackApi) || '';
            }
            addExtractedVideo(info);
          }
        })
        .catch(err => {
          console.warn('[Dola Extractor] Fallback API extraction error:', err);
        });
    }
  }

  function findDoubaoFallbackApis(json, rawBody = '') {
    const apis = new Set();

    for (const value of findValuesByKey(json, 'fallback_api')) {
      addFallbackApi(apis, value);
    }

    const body = typeof rawBody === 'string' ? rawBody : '';
    const patterns = [
      /fallback_api\\":\\"(.*?)\\"/g,
      /"fallback_api"\s*:\s*"([^"]+)"/g,
    ];

    for (const pattern of patterns) {
      let match = pattern.exec(body);
      while (match) {
        addFallbackApi(apis, decodeJsonEscapedFragment(match[1]));
        match = pattern.exec(body);
      }
    }

    return Array.from(apis);
  }

  function addFallbackApi(apis, value) {
    if (typeof value !== 'string' || !value) return;
    const url = decodeJsonEscapedFragment(value);
    if (isHttpUrl(url)) {
      apis.add(url);
    }
  }

  function decodeJsonEscapedFragment(value) {
    let text = value;
    for (let i = 0; i < 3; i++) {
      try {
        const decoded = JSON.parse(`"${text.replace(/"/g, '\\"')}"`);
        if (decoded === text) break;
        text = decoded;
      } catch {
        break;
      }
    }
    return text.replace(/\\u0026/g, '&').replace(/\\\//g, '/');
  }

  function replaceQueryParams(url, params) {
    try {
      const parsedUrl = new URL(url);
      for (const [key, value] of Object.entries(params)) {
        parsedUrl.searchParams.set(key, value);
      }
      return parsedUrl.toString();
    } catch {
      return url;
    }
  }

  async function getDoubaoVideoInfoFromFallbackApi(fallbackApi) {
    // Override logo_type to unwatermarked for full 1080P raw master video
    const apiUrl = replaceQueryParams(fallbackApi, {
      channel: 'no',
      codec_type: '8',
      logo_type: 'unwatermarked',
    });

    const payload = await requestJson(apiUrl);
    const data = getVideoData(payload);
    const picked = pickMainUrlEntry(data);
    if (!picked?.token) {
      return null;
    }

    const videoUrl = await decodeMainUrl(picked.token, findKeySeedDeep(payload));
    if (!videoUrl) {
      return null;
    }

    const meta = picked.entry || {};
    return {
      vid: data.vid || data.video_id || meta.vid || meta.video_id || apiUrl,
      source: 'fallback_api',
      width: Number(meta.vwidth || meta.width || data.vwidth || data.width || 0),
      height: Number(meta.vheight || meta.height || data.vheight || data.height || 0),
      definition: meta.definition || data.definition || '1080P Raw',
      duration: Number(meta.duration || data.duration || 0),
      codec_type: meta.codec_type || data.codec_type || '',
      poster_url: data.poster_url || data.poster || '',
      url: videoUrl,
      prompt: data.title || meta.title || data.text || ''
    };
  }

  function requestJson(url) {
    return originalFetch.call(pageWindow, url, {
      method: 'GET',
      credentials: 'omit',
      headers: {
        accept: 'application/json,text/plain,*/*',
      },
    }).then(res => res.json());
  }

  function getVideoData(payload) {
    const videoInfo = payload?.video_info || payload?.data?.video_info || payload;
    const data = videoInfo?.data || videoInfo;
    return data && typeof data === 'object' ? data : {};
  }

  function pickMainUrlEntry(data) {
    const videoList = data?.video_list;
    const entries = videoList && typeof videoList === 'object' && Object.keys(videoList).length
      ? Object.values(videoList)
      : [data];
    let best = null;

    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const token = entry.main_url || entry.play_url || '';
      if (typeof token !== 'string' || !token.trim()) continue;
      const score = Number(entry.bitrate || entry.real_bitrate || 0)
        + Number(entry.vwidth || entry.width || 0) * Number(entry.vheight || entry.height || 0);
      if (!best || score > best.score) {
        best = { token: token.trim(), score, entry };
      }
    }

    return best;
  }

  function findKeySeedDeep(value, depth = 0) {
    if (depth > 10 || value == null) return '';

    if (typeof value === 'string') {
      let match = value.match(/(?:^|[?&])key_seed=([^&"'<>\\\s]+)/i);
      if (match) return decodeURIComponent(match[1]);
      match = value.match(/["']key_seed["']\s*:\s*["']([^"']+)/i);
      return match ? decodeURIComponent(match[1]) : '';
    }

    if (typeof value !== 'object') return '';

    if (typeof value.key_seed === 'string' && value.key_seed.trim()) {
      return value.key_seed.trim();
    }

    for (const item of Object.values(value)) {
      const hit = findKeySeedDeep(item, depth + 1);
      if (hit) return hit;
    }

    return '';
  }

  async function decodeMainUrl(token, keySeed = '') {
    if (isHttpUrl(token)) return token;

    const plainUrl = tryDecodeBase64Url(token);
    if (plainUrl) return plainUrl;

    if (token.startsWith('qAAB') && keySeed) {
      return await decodeQaabToken(token, keySeed);
    }

    return '';
  }

  function tryDecodeBase64Url(token) {
    const bytes = base64DecodeLoose(token);
    if (!bytes) return '';
    const text = asciiUrlFromBytes(bytes);
    return isHttpUrl(text) ? text : '';
  }

  function base64DecodeLoose(text) {
    const input = String(text || '').trim();
    const variants = [
      input,
      input.replace(/[$@#]/g, char => ({ '$': '_', '@': '/', '#': '.' }[char])),
      input.replace(/[$@#]/g, char => ({ '$': '+', '@': '/', '#': '=' }[char])),
    ];
    const seen = new Set();

    for (const candidate of variants) {
      if (!candidate || seen.has(candidate)) continue;
      seen.add(candidate);
      try {
        const normalized = padBase64(candidate).replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(normalized);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } catch {}
    }

    return null;
  }

  function padBase64(text) {
    const pad = (4 - (text.length % 4)) % 4;
    return text + '='.repeat(pad);
  }

  function asciiUrlFromBytes(bytes) {
    if (!bytes || !bytes.length) return '';
    for (const byte of bytes) {
      if (byte !== 9 && byte !== 10 && byte !== 13 && (byte < 32 || byte > 126)) {
        return '';
      }
    }
    return new TextDecoder().decode(bytes);
  }

  async function decodeQaabToken(token, keySeed) {
    const data = base64DecodeLoose(token);
    const seed = base64DecodeLoose(keySeed);
    if (!data || !seed) return '';

    const digest1 = await crypto.subtle.digest('SHA-512', seed.slice(0, 32));
    const salt = hexToBytes(QAAB_SALT_HEX);
    const digest2Input = concatBytes(new Uint8Array(digest1), salt);
    const digest2 = new Uint8Array(await crypto.subtle.digest('SHA-512', digest2Input));
    const key = digest2.slice(0, 16);
    const iv = digest2.slice(16, 32);
    const attempts = [];

    if (data.length >= 4 && data[0] === 0xa8 && data[1] === 0x00 && data[2] === 0x01 && data[3] === 0x00) {
      attempts.push({ payload: data.slice(4), key, iv });
      attempts.push({ payload: data.slice(4), key: iv, iv: key });
      if (data.length > 36) {
        attempts.push({ payload: data.slice(36), key, iv: data.slice(20, 36) });
        attempts.push({ payload: data.slice(36), key, iv });
      }
    } else {
      attempts.push({ payload: data, key, iv });
    }

    for (const attempt of attempts) {
      const url = await decryptAesCbcUrl(attempt.payload, attempt.key, attempt.iv);
      if (url) return url;
    }

    return '';
  }

  async function decryptAesCbcUrl(payload, keyBytes, ivBytes) {
    if (!payload.length || payload.length % 16 !== 0) return '';

    try {
      const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['decrypt']);
      const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBytes }, key, payload));
      const direct = asciiUrlFromBytes(plain);
      if (isHttpUrl(direct)) return direct;
      const stripped = stripPkcs7(plain);
      const url = asciiUrlFromBytes(stripped);
      return isHttpUrl(url) ? url : '';
    } catch {
      return '';
    }
  }

  function stripPkcs7(bytes) {
    if (!bytes || !bytes.length) return new Uint8Array();
    const pad = bytes[bytes.length - 1];
    if (pad < 1 || pad > 16 || pad > bytes.length) return bytes;
    for (let i = bytes.length - pad; i < bytes.length; i++) {
      if (bytes[i] !== pad) return bytes;
    }
    return bytes.slice(0, bytes.length - pad);
  }

  function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  function concatBytes(first, second) {
    const bytes = new Uint8Array(first.length + second.length);
    bytes.set(first, 0);
    bytes.set(second, first.length);
    return bytes;
  }

  function findValuesByKey(value, targetKey) {
    const values = [];
    walkJsonAndStrings(value, (node) => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) return;
      if (Object.prototype.hasOwnProperty.call(node, targetKey)) {
        values.push(node[targetKey]);
      }
    });
    return values;
  }

  function walkJsonAndStrings(value, visitor, seen = new Set()) {
    if (value == null) return;

    if (typeof value === 'string') {
      const parsed = parseJsonString(value);
      if (parsed !== null) {
        walkJsonAndStrings(parsed, visitor, seen);
      }
      return;
    }

    if (typeof value !== 'object' || seen.has(value)) return;

    seen.add(value);
    visitor(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        walkJsonAndStrings(item, visitor, seen);
      }
      return;
    }

    for (const key of Object.keys(value)) {
      walkJsonAndStrings(value[key], visitor, seen);
    }
  }

  function parseJsonString(text) {
    const trimmed = text.trim();
    if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
      return null;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  // Scan initial page HTML script tags for pre-rendered fallback APIs
  function scanPageScriptTags() {
    try {
      const scriptElement = document.querySelector(
        'script[data-script-src="modern-run-router-data-fn"], script[data-script-src="modern-run-window-fn"][data-fn-name="mergeLoaderData"]'
      );
      if (scriptElement) {
        const dataFnArgs = scriptElement.getAttribute('data-fn-args');
        if (dataFnArgs) {
          const jsonStr = dataFnArgs.replace(/&quot;/g, '"');
          const jsonData = JSON.parse(jsonStr);
          processDoubaoFallbackVideos(jsonData, jsonStr);
        }
      }
    } catch (e) {}
  }

  // Handle requests from content script
  window.addEventListener('DOLA_GET_CHAT_MEDIA', () => {
    window.dispatchEvent(new CustomEvent('DOLA_CHAT_MEDIA_RESPONSE', {
      detail: { videos: extractedVideos }
    }));
  });

  // Run initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanPageScriptTags);
  } else {
    scanPageScriptTags();
  }
})();