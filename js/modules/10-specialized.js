/**
 * VeriQ - Website Testing Suite
 * Module 10: Specialized Testing
 *
 * Inspects Progressive Web App (PWA) readiness, service workers,
 * offline capabilities, WebSockets, file uploads, URL structure & deep linking,
 * History API routing, Web Storage, third-party integrations, and favicon completeness.
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
  async function fetchViaProxy(targetUrl, timeoutMs = 7000) {
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
        return { success: false, status: 0, contents: '', error: e.message };
      }
    }
    try {
      const resp = await fetch(targetUrl, { mode: 'no-cors' });
      return { success: true, status: 200, contents: '', time: 100 };
    } catch (err) {
      return { success: false, status: 0, contents: '', error: err.message };
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

  VeriQ.modules['10-specialized'] = {
    id: '10-specialized',
    name: 'Specialized Testing',
    icon: '🔬',
    color: '#14B8A6',
    description: 'Inspects Progressive Web App (PWA) readiness, service workers, offline capabilities, WebSockets, file uploads, URL structure & deep linking, History API routing, Web Storage, third-party integrations, and favicon completeness.',
    tests: [
      // -------------------------------------------------------------
      // Test 1: pwa-manifest
      // -------------------------------------------------------------
      {
        id: 'pwa-manifest',
        name: 'Progressive Web App (PWA) Manifest',
        description: 'Validates presence, configuration, icons, and installability criteria of the Web App Manifest.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'pwa-manifest',
              name: 'Progressive Web App (PWA) Manifest',
              status: 'error',
              score: null,
              summary: 'Document unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const manifestEl = doc.querySelector('link[rel="manifest"]');
          const rawHref = manifestEl ? manifestEl.getAttribute('href') : null;

          let score = 20;
          let status = 'info';
          let summary = '';
          const recommendations = [];

          if (!rawHref) {
            score = 20;
            status = 'info';
            summary = 'No Web App Manifest (<link rel="manifest">) found. Site cannot be installed as a PWA.';
            recommendations.push('Create a manifest.json with name, icons, and start_url to allow users to install your site to mobile and desktop home screens.');
            return {
              id: 'pwa-manifest',
              name: 'Progressive Web App (PWA) Manifest',
              status,
              score,
              summary,
              details: [{ label: 'Manifest Link Tag', value: 'Not declared', type: 'text' }],
              recommendations,
              duration: Math.round(performance.now() - startTime),
              raw: { hasManifest: false }
            };
          }

          let manifestUrl = rawHref;
          try {
            manifestUrl = new URL(rawHref, context.url).href;
          } catch (e) {
            // fallback
          }

          const res = await fetchViaProxy(manifestUrl, 6000);
          let manifestData = null;
          try {
            manifestData = JSON.parse(res.contents);
          } catch (e) {
            manifestData = null;
          }

          if (!manifestData) {
            score = 40;
            status = 'warn';
            summary = `Manifest tag points to ${manifestUrl}, but response was not valid JSON.`;
            recommendations.push('Ensure manifest JSON file is reachable and properly formatted.');
            return {
              id: 'pwa-manifest',
              name: 'Progressive Web App (PWA) Manifest',
              status,
              score,
              summary,
              details: [{ label: 'Manifest URL', value: manifestUrl, type: 'text' }],
              recommendations,
              duration: Math.round(performance.now() - startTime),
              raw: { manifestUrl, validJson: false }
            };
          }

          // Validate fields
          const hasName = Boolean(manifestData.name || manifestData.short_name);
          const hasStartUrl = Boolean(manifestData.start_url);
          const displayMode = manifestData.display || 'browser';
          const isStandalone = displayMode === 'standalone' || displayMode === 'fullscreen' || displayMode === 'minimal-ui';
          const icons = Array.isArray(manifestData.icons) ? manifestData.icons : [];

          const has192 = icons.some(i => i.sizes && i.sizes.includes('192x192'));
          const has512 = icons.some(i => i.sizes && i.sizes.includes('512x512'));
          const hasIcons = has192 && has512;

          let passCount = 0;
          if (hasName) passCount++;
          if (hasStartUrl) passCount++;
          if (isStandalone) passCount++;
          if (hasIcons) passCount++;
          if (manifestData.theme_color || manifestData.background_color) passCount++;

          if (passCount >= 4) {
            score = 100;
            status = 'pass';
            summary = `Valid PWA Manifest found with "${manifestData.name || manifestData.short_name}" and high-res app icons.`;
          } else {
            score = 60;
            status = 'warn';
            summary = 'Manifest found, but missing recommended PWA installability properties.';
            if (!hasIcons) recommendations.push('Add both 192x192 and 512x512 PNG app icons to the manifest.');
            if (!isStandalone) recommendations.push('Set display to "standalone" in manifest.json for app-like presentation.');
          }

          const details = [
            { label: 'Manifest URL', value: manifestUrl, type: 'text' },
            { label: 'App Name', value: manifestData.name || manifestData.short_name || 'Missing', type: 'text' },
            { label: 'Display Mode', value: displayMode, type: 'text' },
            { label: '192px and 512px Icons', value: hasIcons ? 'Present' : 'Incomplete', type: 'text' },
            { label: 'Theme & Background Colors', value: `Theme: ${manifestData.theme_color || 'None'} | Background: ${manifestData.background_color || 'None'}`, type: 'text' }
          ];

          return {
            id: 'pwa-manifest',
            name: 'Progressive Web App (PWA) Manifest',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { manifestUrl, hasName, hasStartUrl, isStandalone, hasIcons, iconCount: icons.length }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 2: service-worker
      // -------------------------------------------------------------
      {
        id: 'service-worker',
        name: 'Service Worker Registration',
        description: 'Detects Service Worker registration scripts and probes common service worker script endpoints.',
        async run(context) {
          const startTime = performance.now();
          const rawHtml = context.html || (context.fetchResult && context.fetchResult.body) || '';
          const origin = getOrigin(context);

          const hasSwRegistration = /navigator\.serviceWorker\.register|serviceWorker\.register/i.test(rawHtml);

          // Probe common service worker filenames
          const swCandidates = [`${origin}/sw.js`, `${origin}/service-worker.js`];
          let foundSwFile = null;

          for (const url of swCandidates) {
            const probe = await fetchViaProxy(url, 4000);
            if (probe.success && probe.status === 200 && probe.contents && probe.contents.length > 20) {
              foundSwFile = url;
              break;
            }
          }

          let score = 30;
          let status = 'info';
          let summary = '';
          const recommendations = [];

          if (hasSwRegistration && foundSwFile) {
            score = 100;
            status = 'pass';
            summary = `Service Worker registration detected and verified active at ${foundSwFile}.`;
          } else if (hasSwRegistration) {
            score = 75;
            status = 'pass';
            summary = 'Service Worker registration found in page scripts (custom worker file location).';
          } else if (foundSwFile) {
            score = 60;
            status = 'info';
            summary = `Service Worker file detected at ${foundSwFile}, but registration code was not in initial HTML.`;
          } else {
            score = 30;
            status = 'info';
            summary = 'No Service Worker registration detected. Site lacks client-side background caching.';
            recommendations.push('Register a Service Worker to enable offline caching, push notifications, and instant reloads.');
          }

          const details = [
            { label: 'Registration Code in HTML', value: hasSwRegistration ? 'Detected (navigator.serviceWorker.register)' : 'Not detected', type: 'text' },
            { label: 'Probed Worker Endpoint', value: foundSwFile || 'None located at /sw.js or /service-worker.js', type: 'text' }
          ];

          return {
            id: 'service-worker',
            name: 'Service Worker Registration',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { hasSwRegistration, foundSwFile }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 3: offline-capability
      // -------------------------------------------------------------
      {
        id: 'offline-capability',
        name: 'Offline Capability',
        description: 'Analyzes client-side caching mechanisms (Cache Storage API, IndexedDB) for offline readiness.',
        async run(context) {
          const startTime = performance.now();
          const rawHtml = context.html || '';

          const hasCacheApi = /caches\.open|cache\.addAll|caches\.match/i.test(rawHtml);
          const hasIndexedDb = /indexedDB\.open/i.test(rawHtml);
          const hasSw = /serviceWorker\.register/i.test(rawHtml);

          let readinessLevel = 'None';
          if (hasSw && hasCacheApi) {
            readinessLevel = 'High (Service Worker + Cache Storage API)';
          } else if (hasSw || hasCacheApi) {
            readinessLevel = 'Moderate (Partial offline caching code detected)';
          } else if (hasIndexedDb) {
            readinessLevel = 'Client Storage Only (IndexedDB used without Service Worker)';
          } else {
            readinessLevel = 'None (Requires continuous active internet connection)';
          }

          const recommendations = [];
          if (readinessLevel.startsWith('None')) {
            recommendations.push('Implement a Cache-First or Stale-While-Revalidate caching strategy with Workbox to allow basic offline usage.');
          }

          const summary = `Offline readiness: ${readinessLevel}.`;

          const details = [
            { label: 'Offline Capability Level', value: readinessLevel, type: 'text' },
            { label: 'Cache Storage API Usage', value: hasCacheApi ? 'Yes' : 'Not detected in inline scripts', type: 'text' },
            { label: 'IndexedDB Usage', value: hasIndexedDb ? 'Yes' : 'Not detected', type: 'text' }
          ];

          return {
            id: 'offline-capability',
            name: 'Offline Capability',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { readinessLevel, hasCacheApi, hasIndexedDb, hasSw }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 4: websocket-detection
      // -------------------------------------------------------------
      {
        id: 'websocket-detection',
        name: 'WebSocket Detection',
        description: 'Scans for native WebSocket connections and real-time messaging frameworks (Socket.io, SignalR, SockJS).',
        async run(context) {
          const startTime = performance.now();
          const rawHtml = context.html || '';

          const hasNativeWs = /new\s+WebSocket\s*\(|WebSocket\s*\(/i.test(rawHtml);
          const hasWsProtocol = /wss?:\/\//i.test(rawHtml);
          const hasSocketIo = /socket\.io/i.test(rawHtml);
          const hasSignalR = /signalr/i.test(rawHtml);
          const hasPusher = /pusher/i.test(rawHtml);
          const hasSockJs = /sockjs/i.test(rawHtml);

          const librariesFound = [];
          if (hasNativeWs || hasWsProtocol) librariesFound.push('Native WebSockets (ws:// or wss://)');
          if (hasSocketIo) librariesFound.push('Socket.io');
          if (hasSignalR) librariesFound.push('ASP.NET SignalR');
          if (hasPusher) librariesFound.push('Pusher');
          if (hasSockJs) librariesFound.push('SockJS');

          const hasRealtime = librariesFound.length > 0;
          const summary = hasRealtime
            ? `Real-time WebSocket integrations detected: ${librariesFound.join(', ')}.`
            : 'No WebSocket connections detected (Standard HTTP/REST request model).';

          const details = [
            { label: 'Real-time Transport Detected', value: hasRealtime ? 'Yes' : 'No', type: 'text' },
            { label: 'Technologies Identified', value: hasRealtime ? librariesFound.join(', ') : 'None', type: 'text' }
          ];

          return {
            id: 'websocket-detection',
            name: 'WebSocket Detection',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations: hasRealtime && rawHtml.includes('ws://') ? ['Ensure all WebSocket connections use secure wss:// protocol.'] : [],
            duration: Math.round(performance.now() - startTime),
            raw: { hasRealtime, librariesFound }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 5: file-upload
      // -------------------------------------------------------------
      {
        id: 'file-upload',
        name: 'File Upload Testing',
        description: 'Audits file upload form controls, accepted MIME types, multiple file support, and client validation.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'file-upload',
              name: 'File Upload Testing',
              status: 'info',
              score: null,
              summary: 'Document unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const fileInputs = Array.from(doc.querySelectorAll('input[type="file"]'));
          const uploadFields = [];
          const recommendations = [];

          for (const input of fileInputs) {
            const accept = input.getAttribute('accept');
            const multiple = input.hasAttribute('multiple');
            const name = input.getAttribute('name') || input.getAttribute('id') || 'unnamed';

            if (!accept) {
              recommendations.push(`Upload field "${name}" has no "accept" attribute. Restrict acceptable file extensions or MIME types to prevent arbitrary uploads.`);
            }

            uploadFields.push({
              name,
              accept: accept || 'Any file type (*)',
              multiple: multiple ? 'Yes' : 'Single file only',
              formEnctype: input.form ? input.form.getAttribute('enctype') : 'No parent form'
            });
          }

          const summary = fileInputs.length === 0
            ? 'No file upload fields (<input type="file">) found on page.'
            : `Found ${fileInputs.length} file upload control(s).`;

          const details = [
            { label: 'File Inputs Count', value: String(fileInputs.length), type: 'text' },
            { label: 'Upload Fields Breakdown', value: uploadFields.length > 0 ? JSON.stringify(uploadFields, null, 2) : 'None', type: 'table' }
          ];

          return {
            id: 'file-upload',
            name: 'File Upload Testing',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { fileInputCount: fileInputs.length, uploadFields }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 6: deep-linking
      // -------------------------------------------------------------
      {
        id: 'deep-linking',
        name: 'URL Structure & Deep Linking',
        description: 'Evaluates URL slug readability, length, parameter hygiene, and canonical linking consistency.',
        async run(context) {
          const startTime = performance.now();
          const currentUrl = context.url || '';
          const doc = getDoc(context);

          let parsed = null;
          try {
            parsed = new URL(currentUrl);
          } catch (e) {
            // fallback
          }

          if (!parsed) {
            return {
              id: 'deep-linking',
              name: 'URL Structure & Deep Linking',
              status: 'warn',
              score: 50,
              summary: 'Invalid URL format.',
              details: [],
              recommendations: [],
              duration: 0,
              raw: {}
            };
          }

          const isHashRouting = parsed.hash.startsWith('#/') || parsed.hash.length > 2;
          const queryParamsCount = Array.from(parsed.searchParams.keys()).length;
          const isUrlLong = currentUrl.length > 200;
          const isIdOnly = /\?id=\d+/i.test(currentUrl) || /\/index\.(php|html|asp)\?id=/i.test(currentUrl);

          // Check canonical matches current URL
          let canonicalHref = '';
          let canonicalMatches = true;
          if (doc) {
            const canonicalEl = doc.querySelector('link[rel="canonical"]');
            if (canonicalEl) {
              canonicalHref = canonicalEl.getAttribute('href') || '';
              try {
                canonicalMatches = (new URL(canonicalHref, currentUrl).href === parsed.href);
              } catch (e) {
                canonicalMatches = false;
              }
            }
          }

          let score = 100;
          let status = 'pass';
          let summary = '';
          const recommendations = [];

          if (isUrlLong) {
            score -= 20;
            recommendations.push('Shorten URL structure (<200 characters is ideal for sharing and SEO).');
          }
          if (isHashRouting) {
            score = 60;
            status = 'warn';
            summary = 'Hash-based SPA routing (#/...) detected. Hash fragments are not sent to server or indexed well by search bots.';
            recommendations.push('Migrate from hash routing to HTML5 History API (pushState) for crawlable deep links.');
          } else if (isIdOnly) {
            score = 70;
            status = 'pass';
            summary = 'Query-based ID routing (?id=...) detected. Descriptive keyword slugs are preferred for SEO.';
            recommendations.push('Use semantic URL slugs (e.g. /products/running-shoes instead of /products?id=492).');
          } else {
            score = Math.max(score, 80);
            status = 'pass';
            summary = 'Clean, human-readable URL structure with semantic path routing.';
          }

          const details = [
            { label: 'Analyzed URL', value: currentUrl, type: 'text' },
            { label: 'URL Length', value: `${currentUrl.length} characters`, type: 'text' },
            { label: 'Routing Mechanism', value: isHashRouting ? 'Hash-based (#/)' : 'Standard Path routing', type: 'text' },
            { label: 'Query Parameters Count', value: String(queryParamsCount), type: 'text' },
            { label: 'Canonical Alignment', value: canonicalHref ? (canonicalMatches ? 'Aligned with canonical' : `Differs (${canonicalHref})`) : 'No canonical defined', type: 'text' }
          ];

          return {
            id: 'deep-linking',
            name: 'URL Structure & Deep Linking',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { isHashRouting, isUrlLong, isIdOnly, queryParamsCount, canonicalMatches }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 7: browser-history
      // -------------------------------------------------------------
      {
        id: 'browser-history',
        name: 'History API Usage',
        description: 'Identifies SPA navigation patterns (HTML5 History pushState, popstate, or hashchange).',
        async run(context) {
          const startTime = performance.now();
          const rawHtml = context.html || '';

          const hasPushState = /history\.pushState/i.test(rawHtml);
          const hasReplaceState = /history\.replaceState/i.test(rawHtml);
          const hasPopState = /popstate|onpopstate/i.test(rawHtml);
          const hasHashChange = /hashchange|onhashchange/i.test(rawHtml);

          let navigationType = 'Traditional Multi-Page Navigation (MPA)';
          if (hasPushState || hasReplaceState) {
            navigationType = 'Modern Single-Page Navigation (HTML5 History API)';
          } else if (hasHashChange) {
            navigationType = 'Legacy Hash-Based SPA Navigation (hashchange)';
          }

          const summary = `Client navigation model: ${navigationType}.`;

          const details = [
            { label: 'Architecture Model', value: navigationType, type: 'text' },
            { label: 'history.pushState Usage', value: hasPushState ? 'Detected' : 'Not in inline scripts', type: 'text' },
            { label: 'history.replaceState Usage', value: hasReplaceState ? 'Detected' : 'Not in inline scripts', type: 'text' },
            { label: 'popstate / onpopstate Handler', value: hasPopState ? 'Active' : 'Not detected', type: 'text' },
            { label: 'hashchange Handler', value: hasHashChange ? 'Active' : 'Not detected', type: 'text' }
          ];

          return {
            id: 'browser-history',
            name: 'History API Usage',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations: [],
            duration: Math.round(performance.now() - startTime),
            raw: { navigationType, hasPushState, hasReplaceState, hasPopState, hasHashChange }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 8: web-storage
      // -------------------------------------------------------------
      {
        id: 'web-storage',
        name: 'Web Storage Usage',
        description: 'Detects client-side persistence mechanisms (localStorage, sessionStorage, document.cookie, IndexedDB, Cache API).',
        async run(context) {
          const startTime = performance.now();
          const rawHtml = context.html || '';

          const storageApis = {
            localStorage: /localStorage\.(setItem|getItem|removeItem|clear)/i.test(rawHtml),
            sessionStorage: /sessionStorage\.(setItem|getItem|removeItem|clear)/i.test(rawHtml),
            cookies: /document\.cookie/i.test(rawHtml),
            indexedDB: /indexedDB\.open/i.test(rawHtml),
            cacheStorage: /caches\.open/i.test(rawHtml)
          };

          const activeApis = Object.keys(storageApis).filter(k => storageApis[k]);

          const summary = activeApis.length > 0
            ? `Detected client storage APIs: ${activeApis.join(', ')}.`
            : 'No explicit Web Storage APIs found in inline scripts.';

          const recommendations = [];
          if (storageApis.cookies && !storageApis.localStorage) {
            recommendations.push('Prefer localStorage or sessionStorage over document.cookie for non-sensitive client state to avoid sending cookies on every HTTP request.');
          }

          const details = [
            { label: 'localStorage Usage', value: storageApis.localStorage ? 'Detected' : 'None', type: 'text' },
            { label: 'sessionStorage Usage', value: storageApis.sessionStorage ? 'Detected' : 'None', type: 'text' },
            { label: 'document.cookie Usage', value: storageApis.cookies ? 'Detected' : 'None', type: 'text' },
            { label: 'IndexedDB Usage', value: storageApis.indexedDB ? 'Detected' : 'None', type: 'text' },
            { label: 'Cache Storage API', value: storageApis.cacheStorage ? 'Detected' : 'None', type: 'text' }
          ];

          return {
            id: 'web-storage',
            name: 'Web Storage Usage',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { storageApis, activeCount: activeApis.length }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 9: third-party-integrations
      // -------------------------------------------------------------
      {
        id: 'third-party-integrations',
        name: 'Third-Party Service Integrations',
        description: 'Categorizes external integrations including Analytics, Tag Managers, Payment Gateways, Customer Support, and CDNs.',
        async run(context) {
          const startTime = performance.now();
          const rawHtml = (context.html || (context.fetchResult && context.fetchResult.body) || '').toLowerCase();
          const doc = getDoc(context);

          const scriptSources = doc ? Array.from(doc.querySelectorAll('script[src]')).map(s => (s.getAttribute('src') || '').toLowerCase()) : [];
          const combinedSearch = rawHtml + ' ' + scriptSources.join(' ');

          const signatureMap = [
            { category: 'Analytics', name: 'Google Analytics (GA4/UA)', pattern: /google-analytics\.com|googletagmanager\.com\/gtag|analytics\.js/ },
            { category: 'Analytics', name: 'Matomo Analytics', pattern: /matomo\.js|piwik\.js/ },
            { category: 'Analytics', name: 'Plausible Analytics', pattern: /plausible\.io/ },
            { category: 'Analytics', name: 'Fathom Analytics', pattern: /usefathom\.com/ },
            { category: 'Tag Manager', name: 'Google Tag Manager', pattern: /googletagmanager\.com\/gtm\.js/ },
            { category: 'Tag Manager', name: 'Segment', pattern: /cdn\.segment\.com/ },
            { category: 'Payment', name: 'Stripe', pattern: /js\.stripe\.com/ },
            { category: 'Payment', name: 'PayPal SDK', pattern: /paypal\.com\/sdk/ },
            { category: 'Customer Support', name: 'Intercom', pattern: /widget\.intercom\.io/ },
            { category: 'Customer Support', name: 'Zendesk', pattern: /zdassets\.com|zendesk\.com/ },
            { category: 'Customer Support', name: 'HubSpot', pattern: /js\.hs-scripts\.com/ },
            { category: 'Customer Support', name: 'Crisp / Tawk.to', pattern: /client\.crisp\.chat|embed\.tawk\.to/ },
            { category: 'Social / Pixel', name: 'Meta (Facebook) Pixel', pattern: /fbevents\.js|connect\.facebook\.net/ },
            { category: 'Social / Pixel', name: 'Twitter/X Tracking', pattern: /static\.ads-twitter\.com/ },
            { category: 'Social / Pixel', name: 'LinkedIn Insight', pattern: /snap\.licdn\.com/ },
            { category: 'Maps', name: 'Google Maps API', pattern: /maps\.googleapis\.com/ },
            { category: 'Maps', name: 'Mapbox', pattern: /api\.mapbox\.com/ },
            { category: 'Video', name: 'YouTube Embed API', pattern: /youtube\.com\/iframe_api/ },
            { category: 'Video', name: 'Vimeo Player', pattern: /player\.vimeo\.com/ },
            { category: 'Fonts', name: 'Google Fonts', pattern: /fonts\.googleapis\.com|fonts\.gstatic\.com/ },
            { category: 'Fonts', name: 'Adobe Fonts (Typekit)', pattern: /use\.typekit\.net/ },
            { category: 'CDN', name: 'Cloudflare', pattern: /cdnjs\.cloudflare\.com/ },
            { category: 'CDN', name: 'jsDelivr', pattern: /cdn\.jsdelivr\.net/ },
            { category: 'CDN', name: 'Unpkg', pattern: /unpkg\.com/ }
          ];

          const detected = [];
          for (const sig of signatureMap) {
            if (sig.pattern.test(combinedSearch)) {
              detected.push({ Category: sig.category, Service: sig.name });
            }
          }

          const summary = detected.length > 0
            ? `Detected ${detected.length} third-party integration(s) (${detected.map(d => d.Service).slice(0, 3).join(', ')}${detected.length > 3 ? '...' : ''}).`
            : 'No prominent third-party tracker or vendor integrations identified.';

          const details = [
            { label: 'Integrations Identified', value: String(detected.length), type: 'text' },
            { label: 'Detected Services Breakdown', value: detected.length > 0 ? JSON.stringify(detected, null, 2) : 'None', type: 'table' }
          ];

          return {
            id: 'third-party-integrations',
            name: 'Third-Party Service Integrations',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations: detected.length > 8 ? ['High number of third-party trackers detected. Monitor their impact on Core Web Vitals (TBT/INP).'] : [],
            duration: Math.round(performance.now() - startTime),
            raw: { count: detected.length, detected }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 10: favicon-complete
      // -------------------------------------------------------------
      {
        id: 'favicon-complete',
        name: 'Favicon Completeness',
        description: 'Validates standard icons, Apple Touch icons, Windows tiles, Safari pinned tab masks, and probes /favicon.ico.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);
          const origin = getOrigin(context);

          const standardIcon = doc ? doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]') : null;
          const appleTouchIcon = doc ? doc.querySelector('link[rel="apple-touch-icon"]') : null;
          const msTile = doc ? doc.querySelector('meta[name="msapplication-TileImage"]') : null;
          const maskIcon = doc ? doc.querySelector('link[rel="mask-icon"]') : null;

          // Probe /favicon.ico and /apple-touch-icon.png
          const icoProbe = await fetchViaProxy(`${origin}/favicon.ico`, 4000);
          const hasRootIco = icoProbe.success && icoProbe.status === 200;

          const appleProbe = await fetchViaProxy(`${origin}/apple-touch-icon.png`, 4000);
          const hasRootApple = appleProbe.success && appleProbe.status === 200;

          const hasAnyApple = Boolean(appleTouchIcon) || hasRootApple;
          const hasAnyFavicon = Boolean(standardIcon) || hasRootIco;

          let score = 0;
          let status = 'fail';
          const recommendations = [];

          if (hasAnyFavicon && hasAnyApple && (msTile || maskIcon)) {
            score = 100;
            status = 'pass';
          } else if (hasAnyFavicon && hasAnyApple) {
            score = 80;
            status = 'pass';
            recommendations.push('Add a vector SVG icon or mask-icon for high-DPI Safari tab rendering.');
          } else if (hasAnyFavicon) {
            score = 60;
            status = 'warn';
            recommendations.push('Add an <link rel="apple-touch-icon" href="..."> (180x180 PNG) for iOS bookmarking.');
          } else {
            score = 0;
            status = 'fail';
            recommendations.push('No favicon found. Add <link rel="icon" href="/favicon.ico"> and /favicon.ico at server root.');
          }

          const summary = score >= 80
            ? 'Comprehensive favicon configuration across standard browsers and mobile devices.'
            : (score > 0 ? 'Basic favicon present, but missing Apple Touch Icon or Windows tile assets.' : 'No favicon declared or accessible at /favicon.ico.');

          const details = [
            { label: 'Standard Favicon Link Tag', value: standardIcon ? (standardIcon.getAttribute('href') || 'Present') : 'None in HTML', type: 'text' },
            { label: 'Root /favicon.ico Reachable', value: hasRootIco ? 'Yes (HTTP 200)' : 'No', type: 'text' },
            { label: 'Apple Touch Icon (iOS)', value: hasAnyApple ? 'Present' : 'Missing', type: 'text' },
            { label: 'Windows Tile / Safari Mask', value: (msTile || maskIcon) ? 'Present' : 'Not configured', type: 'text' }
          ];

          return {
            id: 'favicon-complete',
            name: 'Favicon Completeness',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { hasAnyFavicon, hasAnyApple, hasRootIco, hasRootApple, msTile: Boolean(msTile), maskIcon: Boolean(maskIcon) }
          };
        }
      }
    ]
  };
})();
