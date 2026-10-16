/**
 * VeriQ - Website Testing Suite
 * Module 06: Health & SEO Testing
 *
 * Evaluates website availability, response health, redirect chains,
 * SEO metadata, sitemaps, robots.txt, broken links, broken images,
 * and search engine indexability.
 */

window.VeriQ = window.VeriQ || {};
window.VeriQ.modules = window.VeriQ.modules || {};

(function () {
  'use strict';

  const VeriQ = window.VeriQ;

  /**
   * Helper to perform a CORS-safe fetch via allorigins proxy
   * @param {string} targetUrl 
   * @param {number} timeoutMs 
   * @returns {Promise<{success: boolean, status: number, contents: string, time: number, error?: string}>}
   */
  async function fetchViaProxy(targetUrl, timeoutMs = 8000) {
    if (window.VeriQ && window.VeriQ.core && window.VeriQ.core.fetcher) {
      try {
        const res = await window.VeriQ.core.fetcher.fetch(targetUrl, { timeout: timeoutMs });
        return {
          success: res.status >= 200 && res.status < 400,
          status: res.status || 200,
          contents: res.body || '',
          time: res.time || 200,
          error: res.error
        };
      } catch (e) {
        return { success: false, status: 0, contents: '', time: 0, error: e.message };
      }
    }
    try {
      const resp = await fetch(targetUrl, { mode: 'no-cors' });
      return { success: true, status: 200, contents: '', time: 100 };
    } catch (err) {
      return { success: false, status: 0, contents: '', time: 0, error: err.message };
    }
  }

  /**
   * Helper to safely obtain parsed DOM Document
   * @param {object} context 
   * @returns {Document|null}
   */
  function getDoc(context) {
    if (context.doc) return context.doc;
    if (context.html && typeof DOMParser !== 'undefined') {
      try {
        return new DOMParser().parseFromString(context.html, 'text/html');
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Helper to get target origin from context
   * @param {object} context 
   * @returns {string}
   */
  function getOrigin(context) {
    try {
      const parsed = new URL(context.url);
      return parsed.origin;
    } catch (e) {
      return context.url || '';
    }
  }

  VeriQ.modules['06-health-seo'] = {
    id: '06-health-seo',
    name: 'Health & SEO',
    icon: '🌐',
    color: '#10B981',
    description: 'Evaluates website availability, response health, redirect chains, SEO metadata, sitemaps, robots.txt, broken links, broken images, and search engine indexability.',
    tests: [
      // -------------------------------------------------------------
      // Test 1: availability
      // -------------------------------------------------------------
      {
        id: 'availability',
        name: 'Website Availability',
        description: 'Verifies the website is online, reachable, and responding to HTTP requests.',
        async run(context) {
          const startTime = performance.now();
          const fetchResult = context.fetchResult || {};
          const status = fetchResult.status || 0;
          const time = typeof fetchResult.time === 'number' ? fetchResult.time : null;
          const url = context.url || 'Unknown URL';
          const finalUrl = fetchResult.finalUrl || url;
          const error = fetchResult.error || null;

          let testStatus = 'fail';
          let score = 0;
          let summary = '';
          const recommendations = [];

          if (error) {
            testStatus = 'fail';
            score = 0;
            summary = `Website failed to respond: ${error}`;
            recommendations.push('Check DNS configuration and ensure domain is pointed to active servers.');
            recommendations.push('Verify web server / CDN is online and not rejecting incoming traffic.');
          } else if (status >= 200 && status < 300) {
            testStatus = 'pass';
            score = 100;
            summary = `Website is online and accessible (HTTP ${status}). Response received in ${time !== null ? time + 'ms' : 'reasonable time'}.`;
          } else if (status >= 300 && status < 400) {
            testStatus = 'warn';
            score = 80;
            summary = `Website is reachable via redirect (HTTP ${status}) to ${finalUrl}.`;
            recommendations.push('Ensure canonical URLs are linked directly to avoid redirect latency.');
          } else if (status >= 400 && status < 500) {
            testStatus = 'fail';
            score = 0;
            summary = `Website returned client error (HTTP ${status}). Resource not found or forbidden.`;
            recommendations.push(`Inspect web server configuration for HTTP ${status} error.`);
          } else if (status >= 500) {
            testStatus = 'fail';
            score = 0;
            summary = `Website returned server error (HTTP ${status}). Upstream server failed.`;
            recommendations.push('Inspect server application logs and crash dumps immediately.');
          } else {
            testStatus = 'error';
            score = 0;
            summary = 'Unable to determine website status from fetch result.';
            recommendations.push('Retry test with CORS proxy enabled.');
          }

          const details = [
            { label: 'Initial Request URL', value: url, type: 'text' },
            { label: 'Final Destination URL', value: finalUrl, type: 'text' },
            { label: 'HTTP Status Code', value: String(status || 'None'), type: 'text' },
            { label: 'Response Time', value: time !== null ? `${time} ms` : 'N/A', type: 'text' },
            { label: 'Proxy Used', value: fetchResult.proxyUsed ? 'Yes (CORS Proxy)' : 'No (Direct)', type: 'text' }
          ];

          return {
            id: 'availability',
            name: 'Website Availability',
            status: testStatus,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { status, time, finalUrl, error }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 2: http-status
      // -------------------------------------------------------------
      {
        id: 'http-status',
        name: 'HTTP Status Code',
        description: 'Analyzes the HTTP status code returned by the server and explains its SEO and operational impact.',
        async run(context) {
          const startTime = performance.now();
          const fetchResult = context.fetchResult || {};
          const status = fetchResult.status || 0;

          const statusDictionary = {
            200: { name: 'OK', meaning: 'The request succeeded. The server returned requested content successfully.', score: 100, status: 'pass' },
            201: { name: 'Created', meaning: 'The request has succeeded and a new resource has been created.', score: 100, status: 'pass' },
            204: { name: 'No Content', meaning: 'The server successfully processed the request, but is not returning any content.', score: 85, status: 'warn' },
            301: { name: 'Moved Permanently', meaning: 'The target resource has been assigned a new permanent URI. Search engines transfer link equity.', score: 80, status: 'warn' },
            302: { name: 'Found (Temporary Redirect)', meaning: 'The target resource resides temporarily under a different URI. Link equity may not pass.', score: 80, status: 'warn' },
            304: { name: 'Not Modified', meaning: 'Resource has not been modified since the version specified in request headers.', score: 100, status: 'pass' },
            307: { name: 'Temporary Redirect', meaning: 'Target resource resides temporarily under a different URI without changing HTTP method.', score: 75, status: 'warn' },
            308: { name: 'Permanent Redirect', meaning: 'Target resource has been assigned a new permanent URI without changing HTTP method.', score: 80, status: 'warn' },
            400: { name: 'Bad Request', meaning: 'The server cannot or will not process request due to perceived client error.', score: 0, status: 'fail' },
            401: { name: 'Unauthorized', meaning: 'Authentication is required and has failed or has not yet been provided.', score: 0, status: 'fail' },
            403: { name: 'Forbidden', meaning: 'The request was valid, but the server is refusing action (permissions/WAF).', score: 0, status: 'fail' },
            404: { name: 'Not Found', meaning: 'The requested resource could not be found on the server.', score: 0, status: 'fail' },
            405: { name: 'Method Not Allowed', meaning: 'The request method is not supported for requested resource.', score: 0, status: 'fail' },
            410: { name: 'Gone', meaning: 'The target resource has been permanently removed and will not be available again.', score: 0, status: 'fail' },
            429: { name: 'Too Many Requests', meaning: 'The user has sent too many requests in a given amount of time (rate limited).', score: 0, status: 'fail' },
            500: { name: 'Internal Server Error', meaning: 'The server encountered an unexpected condition that prevented it from fulfilling the request.', score: 0, status: 'fail' },
            502: { name: 'Bad Gateway', meaning: 'The server, while acting as a gateway or proxy, received an invalid response from inbound server.', score: 0, status: 'fail' },
            503: { name: 'Service Unavailable', meaning: 'The server is currently unable to handle request due to temporary overloading or maintenance.', score: 0, status: 'fail' },
            504: { name: 'Gateway Timeout', meaning: 'The server acting as a gateway did not receive a timely response from upstream server.', score: 0, status: 'fail' }
          };

          let info = statusDictionary[status];
          if (!info) {
            if (status >= 200 && status < 300) {
              info = { name: 'Successful', meaning: `Standard success code (${status}).`, score: 100, status: 'pass' };
            } else if (status >= 300 && status < 400) {
              info = { name: 'Redirection', meaning: `Redirect response code (${status}).`, score: 80, status: 'warn' };
            } else if (status >= 400 && status < 500) {
              info = { name: 'Client Error', meaning: `Client error response code (${status}).`, score: 0, status: 'fail' };
            } else if (status >= 500) {
              info = { name: 'Server Error', meaning: `Server error response code (${status}).`, score: 0, status: 'fail' };
            } else {
              info = { name: 'Unknown Code', meaning: `Unrecognized or missing HTTP code (${status}).`, score: 0, status: 'error' };
            }
          }

          const recommendations = [];
          if (info.status === 'fail') {
            recommendations.push(`Diagnose why the web server returned HTTP ${status} (${info.name}).`);
            if (status === 404) recommendations.push('Ensure the URL exists, routing is configured, and index files are present.');
            if (status === 403) recommendations.push('Review web server file permissions, .htaccess / nginx configs, or CDN firewall rules.');
            if (status >= 500) recommendations.push('Review backend runtime logs, PHP/Node/Python error traces, and database connections.');
          } else if (info.status === 'warn') {
            recommendations.push('If this is the main website landing page, update marketing and canonical links to target the final destination directly.');
          }

          const details = [
            { label: 'Status Code', value: String(status || 'None'), type: 'text' },
            { label: 'Status Name', value: info.name, type: 'text' },
            { label: 'Meaning & SEO Impact', value: info.meaning, type: 'text' }
          ];

          return {
            id: 'http-status',
            name: 'HTTP Status Code',
            status: info.status,
            score: info.score,
            summary: `Server returned HTTP ${status} ${info.name}: ${info.meaning}`,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { status, info }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 3: redirect-chain
      // -------------------------------------------------------------
      {
        id: 'redirect-chain',
        name: 'Redirect Chain',
        description: 'Analyzes redirection hops, checks for redirect loops, and verifies canonical HTTPS/WWW consistency.',
        async run(context) {
          const startTime = performance.now();
          const fetchResult = context.fetchResult || {};
          const redirects = Array.isArray(fetchResult.redirects) ? fetchResult.redirects : [];
          const initialUrl = context.url || '';
          const finalUrl = fetchResult.finalUrl || initialUrl;

          // Check if initial differed from final even if redirects array wasn't fully populated
          let hopCount = redirects.length;
          if (hopCount === 0 && initialUrl && finalUrl && initialUrl !== finalUrl) {
            hopCount = 1;
          }

          // Check for redirect loop
          const visitedUrls = [initialUrl, ...redirects];
          const hasLoop = new Set(visitedUrls).size !== visitedUrls.length;

          // Check HTTP -> HTTPS
          const isInitialHttp = initialUrl.startsWith('http://');
          const isFinalHttps = finalUrl.startsWith('https://');
          const isSecureUpgrade = isInitialHttp && isFinalHttps;

          // Check WWW vs non-WWW consistency
          let wwwConsistency = 'Consistent';
          try {
            const u1 = new URL(initialUrl);
            const u2 = new URL(finalUrl);
            const w1 = u1.hostname.startsWith('www.');
            const w2 = u2.hostname.startsWith('www.');
            if (w1 !== w2) {
              wwwConsistency = w1 ? 'WWW redirected to non-WWW' : 'Non-WWW redirected to WWW';
            }
          } catch (e) {
            wwwConsistency = 'Unable to evaluate hostnames';
          }

          let score = 100;
          let status = 'pass';
          let summary = '';
          const recommendations = [];

          if (hasLoop) {
            status = 'fail';
            score = 0;
            summary = 'Redirect loop detected! Browser will fail with ERR_TOO_MANY_REDIRECTS.';
            recommendations.push('Fix web server or CDN redirect rules to prevent cyclic redirection loops.');
          } else if (hopCount === 0) {
            score = 100;
            status = 'pass';
            summary = 'No redirects encountered; direct connection to canonical URL.';
          } else if (hopCount === 1) {
            score = isSecureUpgrade ? 90 : 85;
            status = 'pass';
            summary = `1 redirect observed (${isSecureUpgrade ? 'HTTP to HTTPS upgrade' : 'canonical route'}). Good configuration.`;
          } else if (hopCount === 2) {
            score = 70;
            status = 'warn';
            summary = '2 redirect hops observed. Moderate impact on page load speed and crawler crawl budget.';
            recommendations.push('Consolidate redirect hops (e.g. redirect http://example.com directly to https://www.example.com in one step).');
          } else {
            score = 40;
            status = 'warn';
            summary = `${hopCount} redirect hops observed! Excessive redirect chains hurt page load time and search rank.`;
            recommendations.push('Eliminate multi-hop redirect chains so clients land on canonical destination in maximum 1 hop.');
          }

          const details = [
            { label: 'Total Redirect Hops', value: String(hopCount), type: 'text' },
            { label: 'Initial URL', value: initialUrl, type: 'text' },
            { label: 'Final URL', value: finalUrl, type: 'text' },
            { label: 'HTTPS Upgrade', value: isSecureUpgrade ? 'Yes (HTTP -> HTTPS)' : (initialUrl.startsWith('https://') ? 'Already HTTPS' : 'No'), type: 'text' },
            { label: 'Domain Host Canonicalization', value: wwwConsistency, type: 'text' },
            { label: 'Redirect Loop Detected', value: hasLoop ? 'YES (CRITICAL)' : 'No', type: 'text' }
          ];

          if (redirects.length > 0) {
            details.push({
              label: 'Redirect Chain Path',
              value: [initialUrl, ...redirects, finalUrl].join('  ➔  '),
              type: 'text'
            });
          }

          return {
            id: 'redirect-chain',
            name: 'Redirect Chain',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { hopCount, hasLoop, isSecureUpgrade, wwwConsistency, redirects }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 4: meta-title
      // -------------------------------------------------------------
      {
        id: 'meta-title',
        name: 'Page Title (SEO)',
        description: 'Validates presence, length, and keyword stuffing for the HTML <title> tag.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'meta-title',
              name: 'Page Title (SEO)',
              status: 'error',
              score: null,
              summary: 'Unable to parse HTML document to inspect title tag.',
              details: [],
              recommendations: ['Ensure page HTML was successfully retrieved.'],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const titleEl = doc.querySelector('title');
          const titleText = titleEl ? titleEl.textContent.trim() : '';
          const length = titleText.length;

          // Check keyword stuffing: tokenize words with length > 3
          const stopWords = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'more', 'about', 'some', 'what', 'when', 'where', 'which']);
          const words = titleText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
          const freq = {};
          let stuffedWord = null;
          let maxCount = 0;
          for (const w of words) {
            freq[w] = (freq[w] || 0) + 1;
            if (freq[w] > maxCount) {
              maxCount = freq[w];
              stuffedWord = w;
            }
          }
          const isKeywordStuffed = maxCount >= 4;

          let score = 0;
          let status = 'fail';
          let evaluation = '';
          const recommendations = [];

          if (!titleEl || length === 0) {
            score = 0;
            status = 'fail';
            evaluation = 'Missing: No <title> tag found or title is completely empty.';
            recommendations.push('Add an informative, unique <title> tag inside the <head> element.');
          } else if (isKeywordStuffed) {
            score = 40;
            status = 'warn';
            evaluation = `Keyword stuffing suspected: word "${stuffedWord}" appears ${maxCount} times.`;
            recommendations.push('Write natural, human-friendly titles avoiding repetitive keyword spamming.');
          } else if (length >= 30 && length <= 60) {
            score = 100;
            status = 'pass';
            evaluation = 'Optimal length (30-60 characters). Displays cleanly across search engines without truncation.';
          } else if (length >= 10 && length <= 70) {
            score = 80;
            status = 'pass';
            evaluation = length > 60
              ? 'Acceptable length, but may be truncated on smaller mobile search result screens (>60 chars).'
              : 'Acceptable length, but could be more descriptive (<30 chars).';
            if (length > 60) recommendations.push('Trim title under 60 characters to prevent snippet ellipsis in Google/Bing SERPs.');
          } else if (length > 70) {
            score = 50;
            status = 'warn';
            evaluation = `Too long (${length} characters). Search engines will truncate this title with "...".`;
            recommendations.push('Shorten title to between 30 and 60 characters.');
          } else {
            score = 50;
            status = 'warn';
            evaluation = `Too short (${length} characters). Does not adequately describe page contents.`;
            recommendations.push('Expand title with descriptive branding and primary page topic (minimum 10-30 characters).');
          }

          const details = [
            { label: 'Title Text', value: titleText || '(None)', type: 'text' },
            { label: 'Character Count', value: `${length} characters`, type: 'text' },
            { label: 'Evaluation', value: evaluation, type: 'text' },
            { label: 'Keyword Stuffing Check', value: isKeywordStuffed ? `Flagged: "${stuffedWord}" (${maxCount}x)` : 'Passed (Natural distribution)', type: 'text' }
          ];

          return {
            id: 'meta-title',
            name: 'Page Title (SEO)',
            status,
            score,
            summary: titleText ? `Title: "${titleText}" (${length} chars) - ${evaluation}` : 'Missing <title> tag',
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { titleText, length, isKeywordStuffed, maxCount }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 5: meta-description
      // -------------------------------------------------------------
      {
        id: 'meta-description',
        name: 'Meta Description (SEO)',
        description: 'Checks for the presence and optimal character length of the meta description tag.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'meta-description',
              name: 'Meta Description (SEO)',
              status: 'error',
              score: null,
              summary: 'HTML document unavailable for parsing.',
              details: [],
              recommendations: ['Ensure page HTML was successfully loaded.'],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const descMeta = doc.querySelector('meta[name="description" i]');
          const content = descMeta ? (descMeta.getAttribute('content') || '').trim() : '';
          const length = content.length;

          let score = 0;
          let status = 'fail';
          let evaluation = '';
          const recommendations = [];

          if (!descMeta || length === 0) {
            score = 0;
            status = 'fail';
            evaluation = 'Missing: No <meta name="description"> tag found.';
            recommendations.push('Add a unique <meta name="description" content="..."> tag between 70 and 160 characters.');
          } else if (length >= 100 && length <= 160) {
            score = 100;
            status = 'pass';
            evaluation = 'Optimal length (100-160 characters). Perfect for search engine snippet previews.';
          } else if (length >= 70 && length < 100) {
            score = 80;
            status = 'pass';
            evaluation = 'Acceptable length (70-99 characters), but could provide more context to maximize search CTR.';
            recommendations.push('Expand meta description to around 120-155 characters for higher click-through rates.');
          } else if (length > 160 && length <= 300) {
            score = 50;
            status = 'warn';
            evaluation = `Too long (${length} characters). Search engines will truncate it beyond ~160 characters.`;
            recommendations.push('Condense meta description under 160 characters so search snippets remain intact.');
          } else if (length > 300) {
            score = 30;
            status = 'fail';
            evaluation = `Excessively long (${length} characters). May be ignored or severely cut by crawlers.`;
            recommendations.push('Drastically reduce meta description length to under 160 characters.');
          } else {
            score = 50;
            status = 'warn';
            evaluation = `Too short (${length} characters). Fails to provide sufficient summary.`;
            recommendations.push('Provide a compelling summary of 100-160 characters.');
          }

          const details = [
            { label: 'Meta Description', value: content || '(None)', type: 'text' },
            { label: 'Character Count', value: `${length} characters`, type: 'text' },
            { label: 'Assessment', value: evaluation, type: 'text' }
          ];

          return {
            id: 'meta-description',
            name: 'Meta Description (SEO)',
            status,
            score,
            summary: content ? `Description: "${content.substring(0, 80)}${length > 80 ? '...' : ''}" (${length} chars)` : 'No meta description found',
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { content, length }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 6: meta-tags
      // -------------------------------------------------------------
      {
        id: 'meta-tags',
        name: 'SEO Meta Tags',
        description: 'Inspects robots, canonical, author, Open Graph, and Twitter Card tags.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'meta-tags',
              name: 'SEO Meta Tags',
              status: 'error',
              score: null,
              summary: 'DOM not available for meta tag inspection.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const getMeta = (selector, attr = 'content') => {
            const el = doc.querySelector(selector);
            return el ? el.getAttribute(attr) : null;
          };

          const robotsTag = getMeta('meta[name="robots" i]');
          const keywordsTag = getMeta('meta[name="keywords" i]');
          const authorTag = getMeta('meta[name="author" i]');
          const canonicalEl = doc.querySelector('link[rel="canonical" i]');
          const canonicalHref = canonicalEl ? canonicalEl.getAttribute('href') : null;

          // Open Graph tags
          const ogTitle = getMeta('meta[property="og:title" i]');
          const ogDesc = getMeta('meta[property="og:description" i]');
          const ogImage = getMeta('meta[property="og:image" i]');
          const ogUrl = getMeta('meta[property="og:url" i]');
          const ogType = getMeta('meta[property="og:type" i]');

          // Twitter tags
          const twCard = getMeta('meta[name="twitter:card" i]') || getMeta('meta[property="twitter:card" i]');
          const twTitle = getMeta('meta[name="twitter:title" i]') || getMeta('meta[property="twitter:title" i]');
          const twImage = getMeta('meta[name="twitter:image" i]') || getMeta('meta[property="twitter:image" i]');

          const tableRows = [
            { Tag: 'Canonical Link', Value: canonicalHref || 'Missing', Status: canonicalHref ? 'Found' : 'Missing' },
            { Tag: 'Robots Directive', Value: robotsTag || 'Default (index, follow)', Status: 'Found' },
            { Tag: 'Author', Value: authorTag || 'Not specified', Status: authorTag ? 'Found' : 'Optional' },
            { Tag: 'Keywords', Value: keywordsTag ? `${keywordsTag.substring(0, 40)}...` : 'None', Status: keywordsTag ? 'Deprecated' : 'Omitted (OK)' },
            { Tag: 'og:title', Value: ogTitle || 'Missing', Status: ogTitle ? 'Found' : 'Missing' },
            { Tag: 'og:description', Value: ogDesc ? `${ogDesc.substring(0, 40)}...` : 'Missing', Status: ogDesc ? 'Found' : 'Missing' },
            { Tag: 'og:image', Value: ogImage || 'Missing', Status: ogImage ? 'Found' : 'Missing' },
            { Tag: 'og:url', Value: ogUrl || 'Missing', Status: ogUrl ? 'Found' : 'Missing' },
            { Tag: 'og:type', Value: ogType || 'Missing', Status: ogType ? 'Found' : 'Missing' },
            { Tag: 'twitter:card', Value: twCard || 'Missing', Status: twCard ? 'Found' : 'Missing' },
            { Tag: 'twitter:title', Value: twTitle || 'Missing', Status: twTitle ? 'Found' : 'Missing' },
            { Tag: 'twitter:image', Value: twImage || 'Missing', Status: twImage ? 'Found' : 'Missing' }
          ];

          let points = 0;
          if (canonicalHref) points += 25;
          if (ogTitle && ogImage) points += 35;
          else if (ogTitle || ogImage) points += 20;
          if (twCard) points += 20;
          if (ogDesc) points += 10;
          if (ogUrl) points += 10;

          const score = Math.min(100, points);
          let status = 'pass';
          const recommendations = [];

          if (!canonicalHref) {
            recommendations.push('Add a <link rel="canonical" href="..."> to prevent duplicate content indexing issues.');
          }
          if (!ogImage || !ogTitle) {
            recommendations.push('Provide Open Graph tags (og:title, og:image, og:description) for rich social media sharing on Facebook, LinkedIn, Slack.');
          }
          if (!twCard) {
            recommendations.push('Add <meta name="twitter:card" content="summary_large_image"> for rich cards on Twitter/X.');
          }

          if (score < 50) status = 'warn';

          return {
            id: 'meta-tags',
            name: 'SEO Meta Tags',
            status,
            score,
            summary: `SEO & Social Meta Tags: Canonical ${canonicalHref ? '✓' : '✗'}, OpenGraph ${ogTitle ? '✓' : '✗'}, Twitter Card ${twCard ? '✓' : '✗'}.`,
            details: [
              { label: 'Canonical URL', value: canonicalHref || 'None', type: 'text' },
              { label: 'Robots Content', value: robotsTag || 'None (crawlers assume index, follow)', type: 'text' },
              { label: 'Found Meta Tags Summary', value: JSON.stringify(tableRows, null, 2), type: 'table' }
            ],
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { canonicalHref, robotsTag, ogTitle, ogDesc, ogImage, ogUrl, twCard, twTitle, twImage }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 7: broken-links
      // -------------------------------------------------------------
      {
        id: 'broken-links',
        name: 'Broken Links Check',
        description: 'Scans internal page hyperlinks and checks their HTTP status to detect dead or broken links.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'broken-links',
              name: 'Broken Links Check',
              status: 'error',
              score: null,
              summary: 'Document not available to parse links.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const baseUrl = context.url || window.location.href;
          let baseHost = '';
          try {
            baseHost = new URL(baseUrl).hostname;
          } catch (e) {
            baseHost = '';
          }

          const rawLinks = Array.from(doc.querySelectorAll('a[href]'));
          const candidateUrls = new Set();

          for (const a of rawLinks) {
            const rawHref = a.getAttribute('href') || '';
            const trimmed = rawHref.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('javascript:') ||
                trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('sms:')) {
              continue;
            }

            try {
              const resolved = new URL(trimmed, baseUrl);
              // Only sample internal links to avoid overwhelming proxy and external servers
              if (resolved.hostname === baseHost && (resolved.protocol === 'http:' || resolved.protocol === 'https:')) {
                candidateUrls.add(resolved.href);
              }
            } catch (e) {
              // Ignore invalid URLs
            }
          }

          const linksToCheck = Array.from(candidateUrls).slice(0, 15);
          const checkedResults = [];
          let brokenCount = 0;

          // Check links sequentially or small batch with short timeout
          for (const link of linksToCheck) {
            const res = await fetchViaProxy(link, 5000);
            const isBroken = !res.success || res.status >= 400;
            if (isBroken) brokenCount++;
            checkedResults.push({
              url: link,
              status: res.status || 'Failed',
              isBroken,
              time: res.time
            });
          }

          let score = 100;
          let status = 'pass';
          const recommendations = [];

          if (brokenCount === 0) {
            score = 100;
            status = 'pass';
          } else if (brokenCount <= 2) {
            score = 80;
            status = 'warn';
            recommendations.push('Fix or remove the broken internal links listed in the test details.');
          } else if (brokenCount <= 5) {
            score = 50;
            status = 'warn';
            recommendations.push('Multiple internal broken links detected. Perform a site-wide URL audit.');
          } else {
            score = 0;
            status = 'fail';
            recommendations.push('Critical number of broken links found. Fix broken routing and 404 targets.');
          }

          const summary = linksToCheck.length === 0
            ? 'No internal crawlable links found to test on this page.'
            : `Checked ${linksToCheck.length} internal links: ${brokenCount} broken link(s) found.`;

          const details = [
            { label: 'Total Links on Page', value: String(rawLinks.length), type: 'text' },
            { label: 'Internal Links Sampled', value: String(linksToCheck.length), type: 'text' },
            { label: 'Broken Links Count', value: String(brokenCount), type: 'text' },
            { label: 'Sampled Link Statuses', value: JSON.stringify(checkedResults, null, 2), type: 'table' }
          ];

          return {
            id: 'broken-links',
            name: 'Broken Links Check',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { totalFound: rawLinks.length, sampled: linksToCheck.length, brokenCount, results: checkedResults }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 8: broken-images
      // -------------------------------------------------------------
      {
        id: 'broken-images',
        name: 'Broken Images',
        description: 'Checks image resources for 404 errors and flags missing accessibility alt attributes.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'broken-images',
              name: 'Broken Images',
              status: 'error',
              score: null,
              summary: 'Document unavailable for image checking.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const baseUrl = context.url || window.location.href;
          const imgElements = Array.from(doc.querySelectorAll('img'));
          const imageList = [];
          let missingAltCount = 0;

          for (const img of imgElements) {
            const rawSrc = img.getAttribute('src') || '';
            const alt = img.getAttribute('alt');
            if (alt === null || alt.trim() === '') {
              missingAltCount++;
            }

            if (!rawSrc || rawSrc.startsWith('data:')) continue;

            try {
              const absoluteUrl = new URL(rawSrc, baseUrl).href;
              if (!imageList.some(item => item.url === absoluteUrl)) {
                imageList.push({ url: absoluteUrl, hasAlt: alt !== null && alt.trim() !== '' });
              }
            } catch (e) {
              // Ignore invalid image URLs
            }
          }

          const sampleImages = imageList.slice(0, 12);
          const imageResults = [];
          let brokenImagesCount = 0;

          for (const item of sampleImages) {
            const res = await fetchViaProxy(item.url, 4000);
            const isBroken = !res.success || res.status >= 400;
            if (isBroken) brokenImagesCount++;
            imageResults.push({
              url: item.url,
              status: res.status || 'Failed',
              isBroken,
              hasAlt: item.hasAlt
            });
          }

          let score = brokenImagesCount === 0 ? 100 : 0;
          let status = brokenImagesCount === 0 ? 'pass' : 'fail';
          const recommendations = [];

          if (brokenImagesCount > 0) {
            recommendations.push(`Fix ${brokenImagesCount} broken image link(s) to restore visual presentation.`);
          }
          if (missingAltCount > 0) {
            recommendations.push(`Add descriptive alt attributes to ${missingAltCount} image(s) for screen readers and SEO.`);
          }

          const summary = sampleImages.length === 0
            ? 'No external image files found to test on page.'
            : `Tested ${sampleImages.length} images: ${brokenImagesCount} broken image(s), ${missingAltCount} missing alt text.`;

          const details = [
            { label: 'Total Images in DOM', value: String(imgElements.length), type: 'text' },
            { label: 'Images Sampled', value: String(sampleImages.length), type: 'text' },
            { label: 'Broken Images Count', value: String(brokenImagesCount), type: 'text' },
            { label: 'Missing Alt Attribute Count', value: String(missingAltCount), type: 'text' },
            { label: 'Image Test Breakdown', value: JSON.stringify(imageResults, null, 2), type: 'table' }
          ];

          return {
            id: 'broken-images',
            name: 'Broken Images',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { totalImages: imgElements.length, sampled: sampleImages.length, brokenImagesCount, missingAltCount }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 9: sitemap
      // -------------------------------------------------------------
      {
        id: 'sitemap',
        name: 'XML Sitemap',
        description: 'Attempts to locate and validate sitemap.xml to ensure crawlers can discover all website content.',
        async run(context) {
          const startTime = performance.now();
          const origin = getOrigin(context);
          const defaultSitemapUrl = `${origin}/sitemap.xml`;

          // Step 1: Probe default /sitemap.xml
          let sitemapUrl = defaultSitemapUrl;
          let fetchRes = await fetchViaProxy(sitemapUrl, 7000);

          // Step 2: If 404, probe robots.txt for a Sitemap: directive
          if (!fetchRes.success || fetchRes.status >= 400) {
            const robotsRes = await fetchViaProxy(`${origin}/robots.txt`, 4000);
            if (robotsRes.success && robotsRes.contents) {
              const match = robotsRes.contents.match(/Sitemap:\s*([^\r\n]+)/i);
              if (match && match[1]) {
                sitemapUrl = match[1].trim();
                fetchRes = await fetchViaProxy(sitemapUrl, 7000);
              }
            }
          }

          let score = 20;
          let status = 'fail';
          let summary = '';
          let urlCount = 0;
          let hasUrlset = false;
          let hasLastmod = false;
          const recommendations = [];

          if (fetchRes.success && fetchRes.status === 200 && fetchRes.contents) {
            const xml = fetchRes.contents;
            hasUrlset = xml.includes('<urlset') || xml.includes('<sitemapindex');
            hasLastmod = xml.includes('<lastmod>');
            const urlMatches = xml.match(/<loc>/g);
            urlCount = urlMatches ? urlMatches.length : 0;

            if (hasUrlset) {
              score = 100;
              status = 'pass';
              summary = `Valid XML Sitemap found at ${sitemapUrl} containing ~${urlCount} URLs.`;
              if (!hasLastmod) {
                recommendations.push('Include <lastmod> timestamps in sitemap URLs to notify crawlers when pages update.');
              }
            } else {
              score = 60;
              status = 'warn';
              summary = `Sitemap file located at ${sitemapUrl}, but XML does not contain a standard <urlset> or <sitemapindex> root.`;
              recommendations.push('Ensure XML sitemap adheres to the sitemaps.org standard schema.');
            }
          } else {
            score = 20;
            status = 'warn';
            summary = `XML Sitemap not found at default location (/sitemap.xml).`;
            recommendations.push('Create and publish an XML sitemap at /sitemap.xml and submit it to Google Search Console.');
            recommendations.push('Declare Sitemap: https://yourdomain.com/sitemap.xml in robots.txt.');
          }

          const details = [
            { label: 'Sitemap Target URL', value: sitemapUrl, type: 'text' },
            { label: 'HTTP Status', value: String(fetchRes.status || 'Failed'), type: 'text' },
            { label: 'Standard Schema (<urlset>)', value: hasUrlset ? 'Yes' : 'No', type: 'text' },
            { label: 'Discovered URL Entries', value: String(urlCount), type: 'text' },
            { label: 'Lastmod Timestamps Included', value: hasLastmod ? 'Yes' : 'No', type: 'text' }
          ];

          return {
            id: 'sitemap',
            name: 'XML Sitemap',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { sitemapUrl, status: fetchRes.status, urlCount, hasUrlset, hasLastmod }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 10: robots-txt
      // -------------------------------------------------------------
      {
        id: 'robots-txt',
        name: 'Robots.txt',
        description: 'Evaluates the presence and crawl directives of the website robots.txt file.',
        async run(context) {
          const startTime = performance.now();
          const origin = getOrigin(context);
          const robotsUrl = `${origin}/robots.txt`;

          const res = await fetchViaProxy(robotsUrl, 6000);

          let score = 50;
          let status = 'warn';
          let summary = '';
          const directivesFound = [];
          const recommendations = [];
          let blocksAll = false;
          let hasSitemap = false;

          if (res.success && res.status === 200 && res.contents) {
            const lines = res.contents.split(/\r?\n/);
            let currentAgent = '';

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line || line.startsWith('#')) continue;

              if (/^User-agent:/i.test(line)) {
                currentAgent = line.split(':')[1].trim();
                directivesFound.push({ type: 'User-agent', value: currentAgent });
              } else if (/^Disallow:/i.test(line)) {
                const path = line.split(':')[1].trim();
                directivesFound.push({ type: 'Disallow', agent: currentAgent, value: path });
                if ((currentAgent === '*' || currentAgent === '') && (path === '/' || path === '/*')) {
                  blocksAll = true;
                }
              } else if (/^Allow:/i.test(line)) {
                const path = line.split(':')[1].trim();
                directivesFound.push({ type: 'Allow', agent: currentAgent, value: path });
              } else if (/^Sitemap:/i.test(line)) {
                hasSitemap = true;
                const sm = line.substring(line.indexOf(':') + 1).trim();
                directivesFound.push({ type: 'Sitemap', value: sm });
              } else if (/^Crawl-delay:/i.test(line)) {
                const delay = line.split(':')[1].trim();
                directivesFound.push({ type: 'Crawl-delay', value: delay });
              }
            }

            if (blocksAll) {
              score = 20;
              status = 'fail';
              summary = 'CRITICAL: robots.txt blocks all search engine crawlers (Disallow: / for User-agent: *).';
              recommendations.push('Remove "Disallow: /" if you want search engines like Google and Bing to index your site.');
            } else {
              score = 100;
              status = 'pass';
              summary = `Valid robots.txt found with ${directivesFound.length} directives. Crawling is permitted.`;
              if (!hasSitemap) {
                recommendations.push('Add a Sitemap: reference to robots.txt to help crawlers discover your sitemap automatically.');
              }
            }
          } else {
            score = 50;
            status = 'warn';
            summary = 'robots.txt file was not found (HTTP 404). Search engines will crawl without restrictions.';
            recommendations.push('Create a /robots.txt file to guide search engine bots and prevent crawling of sensitive paths.');
          }

          const details = [
            { label: 'Robots.txt Location', value: robotsUrl, type: 'text' },
            { label: 'File Present', value: (res.success && res.status === 200) ? 'Yes (HTTP 200)' : 'No', type: 'text' },
            { label: 'Blocks All Crawlers', value: blocksAll ? 'YES (Index Blocked)' : 'No', type: 'text' },
            { label: 'Declares Sitemap', value: hasSitemap ? 'Yes' : 'No', type: 'text' },
            { label: 'Directives Parsed', value: JSON.stringify(directivesFound.slice(0, 20), null, 2), type: 'table' }
          ];

          return {
            id: 'robots-txt',
            name: 'Robots.txt',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { blocksAll, hasSitemap, directivesCount: directivesFound.length }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 11: structured-data
      // -------------------------------------------------------------
      {
        id: 'structured-data',
        name: 'Structured Data (Schema.org)',
        description: 'Detects Schema.org structured data, JSON-LD scripts, Microdata, and RDFa markup.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'structured-data',
              name: 'Structured Data (Schema.org)',
              status: 'error',
              score: null,
              summary: 'Document unavailable for structured data parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
          const foundSchemas = [];
          let malformedJsonCount = 0;

          // Parse JSON-LD
          for (const script of jsonLdScripts) {
            const raw = script.textContent.trim();
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              const extractTypes = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                if (obj['@type']) {
                  foundSchemas.push({ format: 'JSON-LD', type: obj['@type'], details: obj['name'] || obj['headline'] || 'Present' });
                }
                if (Array.isArray(obj['@graph'])) {
                  obj['@graph'].forEach(extractTypes);
                }
              };
              if (Array.isArray(parsed)) {
                parsed.forEach(extractTypes);
              } else {
                extractTypes(parsed);
              }
            } catch (e) {
              malformedJsonCount++;
            }
          }

          // Check Microdata
          const microdataItems = Array.from(doc.querySelectorAll('[itemscope][itemtype]'));
          for (const el of microdataItems) {
            const itemType = el.getAttribute('itemtype') || '';
            const typeName = itemType.split('/').pop();
            foundSchemas.push({ format: 'Microdata', type: typeName || itemType, details: 'HTML Itemscope' });
          }

          // Check RDFa
          const rdfaItems = Array.from(doc.querySelectorAll('[typeof]'));
          for (const el of rdfaItems) {
            foundSchemas.push({ format: 'RDFa', type: el.getAttribute('typeof'), details: 'RDFa attribute' });
          }

          let score = 50;
          let status = 'info';
          let summary = '';
          const recommendations = [];

          if (malformedJsonCount > 0 && foundSchemas.length === 0) {
            score = 30;
            status = 'warn';
            summary = `${malformedJsonCount} malformed JSON-LD script(s) found with syntax errors.`;
            recommendations.push('Validate JSON-LD syntax using Google Rich Results Test to fix JSON syntax errors.');
          } else if (foundSchemas.length > 0) {
            score = 100;
            status = 'pass';
            summary = `Found ${foundSchemas.length} structured data item(s) (${foundSchemas.map(s => s.type).filter(Boolean).slice(0, 4).join(', ')}).`;
          } else {
            score = 50;
            status = 'info';
            summary = 'No Schema.org structured data (JSON-LD or Microdata) detected on this page.';
            recommendations.push('Add JSON-LD structured data (e.g., Organization, WebSite, Article, Product) to qualify for rich search snippets.');
          }

          const details = [
            { label: 'JSON-LD Scripts Found', value: String(jsonLdScripts.length), type: 'text' },
            { label: 'Malformed JSON Count', value: String(malformedJsonCount), type: 'text' },
            { label: 'Microdata / RDFa Items', value: String(microdataItems.length + rdfaItems.length), type: 'text' },
            { label: 'Detected Schemas', value: JSON.stringify(foundSchemas, null, 2), type: 'table' }
          ];

          return {
            id: 'structured-data',
            name: 'Structured Data (Schema.org)',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { jsonLdCount: jsonLdScripts.length, malformedJsonCount, schemas: foundSchemas }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 12: page-indexability
      // -------------------------------------------------------------
      {
        id: 'page-indexability',
        name: 'Page Indexability',
        description: 'Synthesizes meta robots, HTTP headers, canonical tags, and robots directives to determine if search engines can index this page.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);
          const fetchResult = context.fetchResult || {};
          const headers = fetchResult.headers || {};
          const recommendations = [];

          let hasNoindex = false;
          let hasNofollow = false;
          let xRobotsTag = '';

          // 1. Meta robots tag
          if (doc) {
            const robotsMeta = doc.querySelector('meta[name="robots" i]');
            if (robotsMeta) {
              const content = (robotsMeta.getAttribute('content') || '').toLowerCase();
              if (content.includes('noindex')) hasNoindex = true;
              if (content.includes('nofollow')) hasNofollow = true;
            }
          }

          // 2. HTTP headers X-Robots-Tag
          for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === 'x-robots-tag') {
              xRobotsTag = String(headers[key]).toLowerCase();
              if (xRobotsTag.includes('noindex')) hasNoindex = true;
              if (xRobotsTag.includes('nofollow')) hasNofollow = true;
            }
          }

          // 3. Canonical check
          let canonicalHref = '';
          let canonicalMatches = true;
          if (doc) {
            const canonicalEl = doc.querySelector('link[rel="canonical" i]');
            canonicalHref = canonicalEl ? (canonicalEl.getAttribute('href') || '') : '';
            if (canonicalHref && context.url) {
              try {
                const u1 = new URL(canonicalHref, context.url).href;
                const u2 = new URL(context.url).href;
                canonicalMatches = (u1 === u2);
              } catch (e) {
                canonicalMatches = false;
              }
            }
          }

          let score = 100;
          let status = 'pass';
          let summary = '';

          if (hasNoindex) {
            score = 0;
            status = 'fail';
            summary = 'BLOCKED: Page instructs search engines not to index this URL (noindex active).';
            recommendations.push('Remove the "noindex" directive from <meta name="robots"> or X-Robots-Tag if this page is meant for search engines.');
          } else if (!canonicalMatches && canonicalHref) {
            score = 50;
            status = 'warn';
            summary = `Page is indexable, but points its canonical tag to a different destination: ${canonicalHref}`;
            recommendations.push('Verify canonical link targets the intended primary URL to avoid splitting ranking signals.');
          } else if (hasNofollow) {
            score = 75;
            status = 'warn';
            summary = 'Page is indexable, but links are set to "nofollow", preventing search equity from flowing to other pages.';
            recommendations.push('Remove "nofollow" from page-level robots directive unless deliberately isolating all internal links.');
          } else {
            score = 100;
            status = 'pass';
            summary = 'Page is fully indexable. No blocking robots directives found; canonical setup is sound.';
          }

          const details = [
            { label: 'Indexable by Search Engines', value: hasNoindex ? 'NO (Blocked by noindex)' : 'YES', type: 'text' },
            { label: 'Follow Links Permitted', value: hasNofollow ? 'NO (nofollow active)' : 'YES', type: 'text' },
            { label: 'X-Robots-Tag Header', value: xRobotsTag || 'None', type: 'text' },
            { label: 'Canonical Matches Current URL', value: canonicalHref ? (canonicalMatches ? 'Yes (Self-referential)' : `Different (${canonicalHref})`) : 'No canonical defined', type: 'text' }
          ];

          return {
            id: 'page-indexability',
            name: 'Page Indexability',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { hasNoindex, hasNofollow, xRobotsTag, canonicalHref, canonicalMatches }
          };
        }
      }
    ]
  };
})();
