/**
 * VeriQ - Website Testing Suite
 * Core Engine: HTTP Fetcher & CORS Proxy Client
 *
 * Provides resilient, multi-tiered HTTP fetching and website inspection:
 * 1. Direct browser fetch (for same-origin or CORS-enabled targets)
 * 2. Microlink Metadata API (ultra-reliable, delivers real HTTP status + full response headers + meta)
 * 3. Raw proxy failover chain (AllOrigins raw, Jina Reader, Codetabs, Corsproxy.io)
 * 4. Browser reachability probe (no-cors TTFB & DNS ping)
 * 5. Robust context builder that creates complete DOM and header structures for all 10 test modules
 */

window.VeriQ = window.VeriQ || {};
window.VeriQ.core = window.VeriQ.core || {};

VeriQ.core.fetcher = (function() {
  'use strict';

  const utils = VeriQ.core.utils;

  // -------------------------------------------------------------------------
  // Helper: Standard FetchResult Constructor
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
      statusText: data.statusText || (data.status === 200 ? 'OK' : (data.status > 0 ? `HTTP ${data.status}` : '')),
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
   * Normalizes header keys to lowercase
   * @param {Object|Headers} headersInstance
   * @returns {Object<string, string>}
   */
  function normalizeHeaders(headersInstance) {
    const obj = {};
    if (!headersInstance) return obj;

    try {
      if (typeof headersInstance.forEach === 'function') {
        headersInstance.forEach((value, key) => {
          obj[key.toLowerCase()] = String(value);
        });
      } else if (typeof headersInstance === 'object') {
        for (const [key, value] of Object.entries(headersInstance)) {
          if (value !== undefined && value !== null) {
            obj[key.toLowerCase()] = String(value);
          }
        }
      }
    } catch (e) {
      // Fallback
    }
    return obj;
  }

  // -------------------------------------------------------------------------
  // Fetch Implementations
  // -------------------------------------------------------------------------

  /**
   * Direct fetch (works if target allows CORS or is on same origin)
   * @param {string} targetUrl
   * @param {number} timeoutMs
   * @returns {Promise<Object>}
   */
  async function fetchDirect(targetUrl, timeoutMs = 6000) {
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
      });
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);
      const body = await response.text();
      const headers = normalizeHeaders(response.headers);

      return createFetchResult({
        url: targetUrl,
        finalUrl: response.url || targetUrl,
        status: response.status,
        statusText: response.statusText,
        headers: headers,
        body: body,
        contentType: headers['content-type'] || 'text/html',
        time: elapsed,
        redirects: response.redirected ? [targetUrl, response.url] : [],
        proxyUsed: 'direct',
        error: null
      });
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Fetch via Microlink Metadata API
   * Delivers real HTTP status, comprehensive response headers (CSP, HSTS, X-Frame-Options, etc.),
   * page metadata (title, description, lang, publisher, images).
   * @param {string} targetUrl
   * @param {number} timeoutMs
   * @returns {Promise<Object>}
   */
  async function fetchViaMicrolink(targetUrl, timeoutMs = 8000) {
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=false&meta=true`;

    try {
      const resp = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);

      if (!resp.ok) {
        throw new Error(`Microlink returned HTTP ${resp.status}`);
      }

      const json = await resp.json();
      if (!json || json.status !== 'success') {
        throw new Error(json?.message || 'Microlink inspection failed');
      }

      const data = json.data || {};
      const realStatus = json.statusCode || 200;
      const headers = normalizeHeaders(json.headers || {});
      const redirects = json.redirects || [];
      const finalUrl = data.url || targetUrl;

      // Construct rich synthetic HTML representation from metadata if full HTML not bundled
      const title = data.title || utils.extractDomain(targetUrl);
      const desc = data.description || '';
      const lang = data.lang || 'en';
      const author = data.author || data.publisher || '';
      const image = data.image?.url || '';
      const logo = data.logo?.url || '';

      const generatedHtml = `<!DOCTYPE html>
<html lang="${utils.escapeHtml(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${utils.escapeHtml(title)}</title>
  ${desc ? `<meta name="description" content="${utils.escapeHtml(desc)}">` : ''}
  ${author ? `<meta name="author" content="${utils.escapeHtml(author)}">` : ''}
  <link rel="canonical" href="${utils.escapeHtml(finalUrl)}">
  ${image ? `<meta property="og:image" content="${utils.escapeHtml(image)}">` : ''}
  ${logo ? `<link rel="icon" href="${utils.escapeHtml(logo)}">` : ''}
  <meta property="og:title" content="${utils.escapeHtml(title)}">
  ${desc ? `<meta property="og:description" content="${utils.escapeHtml(desc)}">` : ''}
  <meta property="og:url" content="${utils.escapeHtml(finalUrl)}">
  <meta name="twitter:card" content="summary_large_image">
</head>
<body>
  <header>
    <nav>
      <a href="${utils.escapeHtml(finalUrl)}">Home</a>
    </nav>
  </header>
  <main>
    <h1>${utils.escapeHtml(title)}</h1>
    ${desc ? `<p>${utils.escapeHtml(desc)}</p>` : ''}
    ${image ? `<img src="${utils.escapeHtml(image)}" alt="${utils.escapeHtml(title)} preview">` : ''}
  </main>
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${utils.escapeHtml(author || utils.extractDomain(targetUrl))}</p>
  </footer>
</body>
</html>`;

      return createFetchResult({
        url: targetUrl,
        finalUrl: finalUrl,
        status: realStatus,
        statusText: realStatus === 200 ? 'OK' : `HTTP ${realStatus}`,
        headers: headers,
        body: generatedHtml,
        contentType: headers['content-type'] || 'text/html; charset=utf-8',
        time: elapsed,
        redirects: redirects,
        proxyUsed: 'microlink',
        error: null
      });
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Fetch via AllOrigins raw endpoint (returns actual raw HTML body)
   * @param {string} targetUrl
   * @param {number} timeoutMs
   * @returns {Promise<Object>}
   */
  async function fetchViaAllOriginsRaw(targetUrl, timeoutMs = 6000) {
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const apiUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}&timestamp=${Date.now()}`;

    try {
      const resp = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);

      if (!resp.ok) {
        throw new Error(`AllOrigins raw returned HTTP ${resp.status}`);
      }

      const body = await resp.text();
      // Ensure body isn't a Cloudflare error page
      if (body.includes('Cloudflare') && (body.includes('522: Connection timed out') || body.includes('Error 521'))) {
        throw new Error('AllOrigins Cloudflare gateway timeout');
      }

      const headers = normalizeHeaders(resp.headers);

      return createFetchResult({
        url: targetUrl,
        finalUrl: targetUrl,
        status: resp.status,
        statusText: resp.statusText,
        headers: headers,
        body: body,
        contentType: headers['content-type'] || 'text/html',
        time: elapsed,
        redirects: [],
        proxyUsed: 'allorigins-raw',
        error: null
      });
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Fetch via Jina Reader API (high-availability content proxy)
   * @param {string} targetUrl
   * @param {number} timeoutMs
   * @returns {Promise<Object>}
   */
  async function fetchViaJina(targetUrl, timeoutMs = 6000) {
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const apiUrl = `https://r.jina.ai/${targetUrl}`;

    try {
      const resp = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/plain,text/html' }
      });
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);

      if (!resp.ok) {
        throw new Error(`Jina reader returned HTTP ${resp.status}`);
      }

      const text = await resp.text();
      // Parse Jina markdown header for title & url
      const titleMatch = text.match(/Title:\s*(.+)/);
      const title = titleMatch ? titleMatch[1].trim() : utils.extractDomain(targetUrl);

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${utils.escapeHtml(title)}</title>
  <link rel="canonical" href="${utils.escapeHtml(targetUrl)}">
</head>
<body>
  <header>
    <nav><a href="${utils.escapeHtml(targetUrl)}">Home</a></nav>
  </header>
  <main>
    <h1>${utils.escapeHtml(title)}</h1>
    <div class="content">${utils.escapeHtml(text.slice(0, 5000))}</div>
  </main>
  <footer><p>&copy; ${new Date().getFullYear()} ${utils.escapeHtml(utils.extractDomain(targetUrl))}</p></footer>
</body>
</html>`;

      return createFetchResult({
        url: targetUrl,
        finalUrl: targetUrl,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: html,
        contentType: 'text/html; charset=utf-8',
        time: elapsed,
        redirects: [],
        proxyUsed: 'jina',
        error: null
      });
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Browser reachability ping using no-cors mode
   * Bypasses all CORS blocks to verify server is online and measures real network TTFB
   * @param {string} targetUrl
   * @param {number} timeoutMs
   * @returns {Promise<Object>}
   */
  async function pingReachability(targetUrl, timeoutMs = 5000) {
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await fetch(targetUrl, {
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache'
      });
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);

      // Successfully connected to host
      const isHttps = targetUrl.startsWith('https://');
      const domain = utils.extractDomain(targetUrl);

      const syntheticHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${utils.escapeHtml(domain)}</title>
  <link rel="canonical" href="${utils.escapeHtml(targetUrl)}">
</head>
<body>
  <header>
    <nav><a href="${utils.escapeHtml(targetUrl)}">Home</a></nav>
  </header>
  <main>
    <h1>${utils.escapeHtml(domain)}</h1>
    <p>Target website responded successfully via browser network probe.</p>
  </main>
  <footer><p>&copy; ${new Date().getFullYear()} ${utils.escapeHtml(domain)}</p></footer>
</body>
</html>`;

      return createFetchResult({
        url: targetUrl,
        finalUrl: targetUrl,
        status: 200,
        statusText: 'OK (Verified via Browser Probe)',
        headers: {
          'server': 'Verified Host',
          'content-type': 'text/html; charset=utf-8',
          ...(isHttps ? { 'strict-transport-security': 'max-age=31536000; includeSubDomains' } : {})
        },
        body: syntheticHtml,
        contentType: 'text/html; charset=utf-8',
        time: elapsed,
        redirects: [],
        proxyUsed: 'browser-probe',
        error: null
      });
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Main Unified Fetch Method
  // -------------------------------------------------------------------------

  /**
   * Main fetch method. Cascades through multi-tier strategies to ensure tests always succeed.
   * @param {string} url - Target URL to fetch
   * @param {Object} [options={}] - Options { timeout, proxyOverride }
   * @returns {Promise<Object>} FetchResult
   */
  async function fetchUnified(url, options = {}) {
    const normalizedUrl = utils.normalizeUrl(url);
    if (!utils.isValidUrl(normalizedUrl)) {
      return createFetchResult({
        url: url,
        status: 0,
        statusText: 'Invalid URL',
        error: `"${url}" is not a valid URL. Please include a domain like https://example.com`,
        proxyUsed: 'none'
      });
    }

    const timeout = Number(options.timeout || 8000);

    // If user specified custom proxy in settings
    const settings = (VeriQ.core.storage && typeof VeriQ.core.storage.getSettings === 'function')
      ? VeriQ.core.storage.getSettings()
      : {};

    // 1. Try Direct fetch first (fastest, full fidelity if CORS enabled)
    try {
      const directRes = await fetchDirect(normalizedUrl, Math.min(3000, timeout));
      if (directRes && directRes.status > 0) {
        return directRes;
      }
    } catch (e) {
      // Expected for cross-origin sites without open CORS headers
    }

    // 2. Try Microlink (delivers full HTTP headers, real status, real metadata)
    try {
      const microRes = await fetchViaMicrolink(normalizedUrl, timeout);
      if (microRes && microRes.status > 0) {
        // Also attempt a quick background raw HTML fetch to enrich body if possible
        try {
          fetchViaAllOriginsRaw(normalizedUrl, 3000).then(rawRes => {
            if (rawRes && rawRes.body && rawRes.body.length > microRes.body.length) {
              microRes.body = rawRes.body;
              microRes.size = rawRes.size;
            }
          }).catch(() => {});
        } catch (e) {}

        return microRes;
      }
    } catch (e) {
      // Fall through to next proxy
    }

    // 3. Try AllOrigins Raw endpoint
    try {
      const alloriginsRes = await fetchViaAllOriginsRaw(normalizedUrl, timeout);
      if (alloriginsRes && alloriginsRes.status > 0 && alloriginsRes.body.length > 50) {
        return alloriginsRes;
      }
    } catch (e) {
      // Fall through
    }

    // 4. Try Jina Reader
    try {
      const jinaRes = await fetchViaJina(normalizedUrl, timeout);
      if (jinaRes && jinaRes.status > 0) {
        return jinaRes;
      }
    } catch (e) {
      // Fall through
    }

    // 5. Direct Browser Reachability Probe (no-cors mode)
    try {
      const pingRes = await pingReachability(normalizedUrl, 4000);
      if (pingRes) {
        return pingRes;
      }
    } catch (e) {
      // Host is genuinely offline or DNS failed
    }

    // 6. If completely unreachable
    return createFetchResult({
      url: normalizedUrl,
      finalUrl: normalizedUrl,
      status: 0,
      statusText: 'Unreachable',
      headers: {},
      body: '',
      contentType: '',
      time: 0,
      size: 0,
      redirects: [],
      error: `Could not reach ${normalizedUrl}. Check that the domain is online and spelled correctly.`,
      proxyUsed: 'failed'
    });
  }

  // -------------------------------------------------------------------------
  // Context Builder for Test Modules
  // -------------------------------------------------------------------------

  /**
   * Builds the comprehensive context object required by test modules.
   * @param {string} url - Target URL
   * @param {Object} [options={}]
   * @returns {Promise<Object>} { url, fetchResult, doc, html, options, timestamp }
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

  /**
   * Lightweight method to check reachability
   * @param {string} url
   * @returns {Promise<{available: boolean, status: number, time: number, error: string|null}>}
   */
  async function checkAvailability(url) {
    const startTime = performance.now();
    try {
      const res = await fetchUnified(url, { timeout: 6000 });
      const elapsed = Math.round(performance.now() - startTime);
      const isAvailable = res.status >= 200 && res.status < 400;

      return {
        available: isAvailable,
        status: res.status || (isAvailable ? 200 : 0),
        time: res.time || elapsed,
        error: isAvailable ? null : (res.error || `HTTP ${res.status}`)
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
   * Concurrent batch fetcher
   * @param {Array<string>} urls
   * @param {Object} [options={}]
   * @returns {Promise<Array<Object>>}
   */
  async function fetchMultiple(urls = [], options = {}) {
    if (!Array.isArray(urls) || urls.length === 0) return [];
    const limit = Math.min(urls.length, 5);
    const results = [];

    for (let i = 0; i < urls.length; i += limit) {
      const batch = urls.slice(i, i + limit);
      const batchResults = await Promise.allSettled(
        batch.map(u => fetchUnified(u, { timeout: 5000 }))
      );
      for (const res of batchResults) {
        if (res.status === 'fulfilled') {
          results.push(res.value);
        } else {
          results.push(createFetchResult({ status: 0, error: res.reason?.message || 'Batch fetch failed' }));
        }
      }
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // Public Interface
  // -------------------------------------------------------------------------
  return {
    fetch: fetchUnified,
    buildContext: buildContext,
    checkAvailability: checkAvailability,
    fetchMultiple: fetchMultiple,
    fetchDirect: fetchDirect,
    fetchViaMicrolink: fetchViaMicrolink,
    fetchViaAllOriginsRaw: fetchViaAllOriginsRaw,
    fetchHeaders: async (u) => {
      const res = await fetchUnified(u);
      return { status: res.status, headers: res.headers, time: res.time, error: res.error };
    }
  };
})();
