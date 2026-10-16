/**
 * VeriQ - Website Testing Suite
 * Core Engine: HTTP Fetcher & CORS Proxy Client
 *
 * Provides resilient HTTP fetching with multi-tier proxy failover:
 * 1. allorigins.win (JSON wrapped proxy)
 * 2. corsproxy.io (Direct streaming CORS proxy)
 * 3. Direct browser fetch (for same-origin or CORS-enabled targets)
 * 4. User-configured custom proxy (if enabled)
 *
 * Includes timeout control via AbortController, retry logic, concurrent batching,
 * header extraction, availability checks, and context builder for test modules.
 */

window.VeriQ = window.VeriQ || {};
window.VeriQ.core = window.VeriQ.core || {};

VeriQ.core.fetcher = (function() {
  'use strict';

  const utils = VeriQ.core.utils;

  // -------------------------------------------------------------------------
  // Helper: Create Standard FetchResult
  // -------------------------------------------------------------------------

  /**
   * Constructs a standardized FetchResult object
   * @param {Object} data
   * @returns {Object}
   */
  function createFetchResult(data = {}) {
    const body = data.body || '';
    const contentType = (data.contentType || data.headers?.['content-type'] || '').toLowerCase();
    const size = typeof data.size === 'number'
      ? data.size
      : (typeof Blob !== 'undefined' ? new Blob([body]).size : body.length);

    const isHtml = contentType.includes('text/html') ||
      contentType.includes('application/xhtml+xml') ||
      body.trim().startsWith('<!DOCTYPE') ||
      /<html[\s>]/i.test(body);

    const isJson = contentType.includes('application/json') ||
      (body.trim().startsWith('{') && body.trim().endsWith('}')) ||
      (body.trim().startsWith('[') && body.trim().endsWith(']'));

    return {
      url: data.url || '',
      finalUrl: data.finalUrl || data.url || '',
      status: typeof data.status === 'number' ? data.status : 0,
      statusText: data.statusText || (data.status === 200 ? 'OK' : ''),
      headers: data.headers || {},
      body: body,
      contentType: contentType,
      time: typeof data.time === 'number' ? data.time : 0,
      size: size,
      redirects: Array.isArray(data.redirects) ? data.redirects : [],
      error: data.error || null,
      proxyUsed: data.proxyUsed || 'direct',
      isHtml: isHtml,
      isJson: isJson
    };
  }

  /**
   * Converts fetch Response Headers to a plain key-value object
   * @param {Headers} headersInstance
   * @returns {Object<string, string>}
   */
  function headersToObject(headersInstance) {
    const obj = {};
    if (!headersInstance) return obj;

    try {
      if (typeof headersInstance.forEach === 'function') {
        headersInstance.forEach((value, key) => {
          obj[key.toLowerCase()] = value;
        });
      } else if (typeof headersInstance.entries === 'function') {
        for (const [key, value] of headersInstance.entries()) {
          obj[key.toLowerCase()] = value;
        }
      }
    } catch (e) {
      // Fallback
    }
    return obj;
  }

  // -------------------------------------------------------------------------
  // Low-level Proxy Fetch Implementations
  // -------------------------------------------------------------------------

  /**
   * Fetch via allorigins.win API
   * allorigins returns JSON: { contents: string, status: { url, content_type, http_code, response_time } }
   * @param {string} targetUrl
   * @param {number} timeoutMs
   * @returns {Promise<Object>} FetchResult
   */
  async function fetchViaAllOrigins(targetUrl, timeoutMs = 15000) {
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const proxyApiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&timestamp=${Date.now()}`;

    try {
      const response = await fetch(proxyApiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`AllOrigins proxy returned HTTP ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      const elapsed = Math.round(performance.now() - startTime);

      if (!json || typeof json !== 'object') {
        throw new Error('Invalid response structure from AllOrigins proxy');
      }

      const statusMeta = json.status || {};
      const httpCode = statusMeta.http_code || 200;
      const finalUrl = statusMeta.url || targetUrl;
      const contentType = statusMeta.content_type || 'text/html';
      const body = json.contents || '';

      const headers = {
        'content-type': contentType
      };

      const redirects = (finalUrl !== targetUrl) ? [targetUrl, finalUrl] : [];

      return createFetchResult({
        url: targetUrl,
        finalUrl: finalUrl,
        status: httpCode,
        statusText: httpCode === 200 ? 'OK' : `HTTP ${httpCode}`,
        headers: headers,
        body: body,
        contentType: contentType,
        time: elapsed,
        redirects: redirects,
        proxyUsed: 'allorigins',
        error: null
      });
    } catch (err) {
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout ? `Request timed out after ${timeoutMs}ms (AllOrigins)` : err.message;

      throw new Error(`AllOrigins fetch failed: ${msg}`);
    }
  }

  /**
   * Fetch via corsproxy.io direct streaming CORS proxy
   * @param {string} targetUrl
   * @param {number} timeoutMs
   * @returns {Promise<Object>} FetchResult
   */
  async function fetchViaCorsproxy(targetUrl, timeoutMs = 15000) {
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const proxyApiUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
      const response = await fetch(proxyApiUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);

      const headers = headersToObject(response.headers);
      const body = await response.text();
      const contentType = headers['content-type'] || '';

      // Determine final URL from response or headers
      const finalUrl = response.url && !response.url.includes('corsproxy.io')
        ? response.url
        : targetUrl;

      return createFetchResult({
        url: targetUrl,
        finalUrl: finalUrl,
        status: response.status,
        statusText: response.statusText,
        headers: headers,
        body: body,
        contentType: contentType,
        time: elapsed,
        redirects: response.redirected ? [targetUrl, finalUrl] : [],
        proxyUsed: 'corsproxy',
        error: null
      });
    } catch (err) {
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout ? `Request timed out after ${timeoutMs}ms (corsproxy.io)` : err.message;

      throw new Error(`corsproxy.io fetch failed: ${msg}`);
    }
  }

  /**
   * Direct fetch (no proxy)
   * @param {string} targetUrl
   * @param {number} timeoutMs
   * @returns {Promise<Object>} FetchResult
   */
  async function fetchDirect(targetUrl, timeoutMs = 15000) {
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);

      const headers = headersToObject(response.headers);
      const body = await response.text();

      return createFetchResult({
        url: targetUrl,
        finalUrl: response.url || targetUrl,
        status: response.status,
        statusText: response.statusText,
        headers: headers,
        body: body,
        contentType: headers['content-type'] || '',
        time: elapsed,
        redirects: response.redirected ? [targetUrl, response.url] : [],
        proxyUsed: 'direct',
        error: null
      });
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout ? `Request timed out after ${timeoutMs}ms (Direct)` : err.message;
      throw new Error(`Direct fetch failed (likely CORS restriction or network error): ${msg}`);
    }
  }

  /**
   * Fetch via custom proxy defined by user in settings
   * Supports templates: "https://myproxy.com/?url=${url}" or "https://myproxy.com/${url}"
   * @param {string} targetUrl
   * @param {string} customProxyUrl
   * @param {number} timeoutMs
   * @returns {Promise<Object>}
   */
  async function fetchViaCustomProxy(targetUrl, customProxyUrl, timeoutMs = 15000) {
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let finalProxyUrl = customProxyUrl.trim();
    if (finalProxyUrl.includes('${url}')) {
      finalProxyUrl = finalProxyUrl.replace(/\$\{url\}/g, encodeURIComponent(targetUrl));
    } else if (finalProxyUrl.includes('{url}')) {
      finalProxyUrl = finalProxyUrl.replace(/\{url\}/g, encodeURIComponent(targetUrl));
    } else {
      const joinChar = finalProxyUrl.includes('?') ? '&' : (finalProxyUrl.endsWith('/') ? '' : '?url=');
      finalProxyUrl = `${finalProxyUrl}${joinChar}${encodeURIComponent(targetUrl)}`;
    }

    try {
      const response = await fetch(finalProxyUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,application/json,*/*;q=0.8' }
      });

      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);
      const headers = headersToObject(response.headers);
      const body = await response.text();

      return createFetchResult({
        url: targetUrl,
        finalUrl: targetUrl,
        status: response.status,
        statusText: response.statusText,
        headers: headers,
        body: body,
        contentType: headers['content-type'] || '',
        time: elapsed,
        redirects: [],
        proxyUsed: 'custom',
        error: null
      });
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout ? `Custom proxy timed out after ${timeoutMs}ms` : err.message;
      throw new Error(`Custom proxy fetch failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // Main Unified Fetch Method
  // -------------------------------------------------------------------------

  /**
   * Main fetch method. Resolves settings, handles retries, and steps through proxy failover chain.
   * @param {string} url - Target URL to fetch
   * @param {Object} [options={}] - Options { timeout, retries, proxyOverride, followRedirects }
   * @returns {Promise<Object>} FetchResult
   */
  async function fetchUnified(url, options = {}) {
    const settings = (VeriQ.core.storage && typeof VeriQ.core.storage.getSettings === 'function')
      ? VeriQ.core.storage.getSettings()
      : {};

    const normalizedUrl = utils.normalizeUrl(url);
    if (!utils.isValidUrl(normalizedUrl)) {
      return createFetchResult({
        url: url,
        status: 0,
        error: `Invalid URL: "${url}"`,
        proxyUsed: 'none'
      });
    }

    const timeout = Number(options.timeout || settings.timeout || 15000);
    const maxRetries = typeof options.retries === 'number'
      ? options.retries
      : (typeof settings.retries === 'number' ? settings.retries : 2);

    // Build ordered list of proxy strategies to attempt
    let proxyChain = [];

    if (options.proxyOverride) {
      proxyChain = [options.proxyOverride];
    } else {
      const preferredProxy = settings.proxy || 'allorigins';
      const customUrl = (settings.customProxyUrl || '').trim();

      if (preferredProxy === 'custom' && customUrl) {
        proxyChain = ['custom', 'allorigins', 'corsproxy', 'direct'];
      } else if (preferredProxy === 'corsproxy') {
        proxyChain = ['corsproxy', 'allorigins', 'direct'];
      } else if (preferredProxy === 'direct') {
        proxyChain = ['direct', 'corsproxy', 'allorigins'];
      } else {
        // Default: allorigins first, then corsproxy, then direct
        proxyChain = ['allorigins', 'corsproxy', 'direct'];
      }
    }

    let lastError = null;
    let attempt = 0;

    // Retry loop
    while (attempt <= maxRetries) {
      for (const proxyType of proxyChain) {
        try {
          let result = null;

          if (proxyType === 'custom' && settings.customProxyUrl) {
            result = await fetchViaCustomProxy(normalizedUrl, settings.customProxyUrl, timeout);
          } else if (proxyType === 'allorigins') {
            result = await fetchViaAllOrigins(normalizedUrl, timeout);
          } else if (proxyType === 'corsproxy') {
            result = await fetchViaCorsproxy(normalizedUrl, timeout);
          } else if (proxyType === 'direct') {
            result = await fetchDirect(normalizedUrl, timeout);
          }

          if (result && (!result.error || result.status > 0)) {
            return result;
          }
        } catch (err) {
          lastError = err;
          // Continue to next proxy in the failover chain
        }
      }

      attempt++;
      if (attempt <= maxRetries) {
        // Backoff delay before retry attempt
        await utils.wait(500 * attempt);
      }
    }

    // If all failover attempts fail, return a structured error result
    return createFetchResult({
      url: normalizedUrl,
      finalUrl: normalizedUrl,
      status: 0,
      statusText: 'Fetch Failed',
      headers: {},
      body: '',
      contentType: '',
      time: 0,
      size: 0,
      redirects: [],
      error: lastError ? lastError.message : 'All proxies failed to fetch target URL',
      proxyUsed: proxyChain[0] || 'unknown'
    });
  }

  // -------------------------------------------------------------------------
  // Specialized Methods
  // -------------------------------------------------------------------------

  /**
   * Lightweight method to fetch response headers
   * @param {string} url
   * @returns {Promise<Object>} { status, headers, contentType, size, time, error }
   */
  async function fetchHeaders(url) {
    const startTime = performance.now();
    const normalizedUrl = utils.normalizeUrl(url);

    try {
      // Direct HEAD request attempt
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(normalizedUrl, {
          method: 'HEAD',
          signal: controller.signal
        });
        clearTimeout(timer);

        const elapsed = Math.round(performance.now() - startTime);
        const headers = headersToObject(response.headers);

        return {
          status: response.status,
          headers: headers,
          contentType: headers['content-type'] || '',
          size: Number(headers['content-length'] || 0),
          time: elapsed,
          error: null
        };
      } catch (headErr) {
        clearTimeout(timer);
        // If direct HEAD fails (CORS or method not allowed), fallback to proxy fetch
      }

      const fullResult = await fetchUnified(normalizedUrl, { timeout: 10000 });
      return {
        status: fullResult.status,
        headers: fullResult.headers,
        contentType: fullResult.contentType,
        size: fullResult.size,
        time: fullResult.time,
        error: fullResult.error
      };
    } catch (e) {
      return {
        status: 0,
        headers: {},
        contentType: '',
        size: 0,
        time: Math.round(performance.now() - startTime),
        error: e.message
      };
    }
  }

  /**
   * Fetch multiple URLs concurrently with a concurrency limit of 5
   * Useful for broken link checkers, image audits, etc.
   * @param {string[]} urls - Array of URLs to fetch
   * @param {Object} [options={}] - Options passed to fetch
   * @returns {Promise<Object[]>} Array of FetchResult objects in original URL order
   */
  async function fetchMultiple(urls, options = {}) {
    if (!Array.isArray(urls) || urls.length === 0) return [];

    const concurrencyLimit = 5;
    const results = new Array(urls.length);
    let currentIndex = 0;

    async function worker() {
      while (currentIndex < urls.length) {
        const index = currentIndex++;
        const target = urls[index];

        try {
          if (!target || !utils.isValidUrl(target)) {
            results[index] = createFetchResult({
              url: target,
              status: 0,
              error: 'Invalid URL',
              proxyUsed: 'none'
            });
          } else {
            results[index] = await fetchUnified(target, options);
          }
        } catch (err) {
          results[index] = createFetchResult({
            url: target,
            status: 0,
            error: err.message,
            proxyUsed: 'none'
          });
        }
      }
    }

    const workers = [];
    const activeCount = Math.min(concurrencyLimit, urls.length);
    for (let i = 0; i < activeCount; i++) {
      workers.push(worker());
    }

    await Promise.allSettled(workers);
    return results;
  }

  /**
   * Check if a URL is reachable
   * @param {string} url
   * @returns {Promise<{available: boolean, status: number, time: number, error: string|null}>}
   */
  async function checkAvailability(url) {
    const startTime = performance.now();
    try {
      const result = await fetchUnified(url, { timeout: 10000, retries: 1 });
      const elapsed = Math.round(performance.now() - startTime);

      const isAvailable = result.status >= 200 && result.status < 400;
      return {
        available: isAvailable,
        status: result.status,
        time: result.time || elapsed,
        error: isAvailable ? null : (result.error || `HTTP ${result.status}`)
      };
    } catch (e) {
      return {
        available: false,
        status: 0,
        time: Math.round(performance.now() - startTime),
        error: e.message
      };
    }
  }

  /**
   * Build complete context object for test modules.
   * Fetches the URL, parses the HTML DOM, and packages metadata.
   * @param {string} url - Target URL
   * @param {Object} [options={}]
   * @returns {Promise<{url: string, fetchResult: Object, doc: Document, html: string, options: Object, timestamp: number}>}
   */
  async function buildContext(url, options = {}) {
    const normalizedUrl = utils.normalizeUrl(url);
    const fetchResult = await fetchUnified(normalizedUrl, options);
    const html = fetchResult.body || '';
    const doc = utils.parseHtml(html);

    return {
      url: normalizedUrl,
      fetchResult: fetchResult,
      doc: doc,
      html: html,
      options: options,
      timestamp: Date.now()
    };
  }

  // -------------------------------------------------------------------------
  // Public API Export
  // -------------------------------------------------------------------------
  return {
    fetch: fetchUnified,
    fetchViaAllOrigins,
    fetchViaCorsproxy,
    fetchDirect,
    fetchViaCustomProxy,
    fetchHeaders,
    fetchMultiple,
    checkAvailability,
    buildContext
  };
})();
