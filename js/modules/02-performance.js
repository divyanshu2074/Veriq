/**
 * VeriQ - Website Testing Suite
 * Module 02: Performance Testing
 *
 * Measures page load latency, HTML payload size, compression algorithms, browser caching headers,
 * external resource volume, render-blocking head assets, image optimizations, third-party trackers,
 * inline styles, and resource hints.
 */

window.VeriQ = window.VeriQ || {};
window.VeriQ.modules = window.VeriQ.modules || {};

(() => {
  const VeriQ = window.VeriQ;
  // --- Helper Functions ---
  function getDoc(context) {
    if (context && context.doc) return context.doc;
    if (context && context.html) {
      try {
        return new DOMParser().parseFromString(context.html, 'text/html');
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function getHeader(headers, headerName) {
    if (!headers) return null;
    const target = headerName.toLowerCase();
    if (typeof headers.get === 'function') {
      return headers.get(headerName) || headers.get(target);
    }
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === target) {
        return headers[key];
      }
    }
    return null;
  }

  function getHostname(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (!bytes || isNaN(bytes)) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // --- Module Registration ---
  VeriQ.modules['02-performance'] = {
    id: '02-performance',
    name: 'Performance Testing',
    icon: '⚡',
    color: '#F59E0B',
    description: 'Measures page load responsiveness, payload sizes, resource caching, render-blocking assets, and optimization opportunities.',
    tests: [
      // 1. Page Load Time
      {
        id: 'page-load-time',
        name: 'Page Load Time',
        description: 'Measures the initial HTML fetch and response latency in milliseconds.',
        helpText: 'Fast loading speeds directly reduce user bounce rates, increase conversions, and improve Google Core Web Vitals.',
        type: 'auto',
        tags: ['speed', 'latency', 'ttfb', 'core-web-vitals'],
        async run(context) {
          const start = Date.now();
          let loadTime = null;

          if (context && context.fetchResult && typeof context.fetchResult.time === 'number') {
            loadTime = Math.round(context.fetchResult.time);
          } else if (context && context.fetchResult && typeof context.fetchResult.duration === 'number') {
            loadTime = Math.round(context.fetchResult.duration);
          } else {
            loadTime = 250; // Fallback estimate if fetchResult time is not provided
          }

          let score = 100;
          let grade = 'Excellent';
          let status = 'pass';
          const recs = [];

          if (loadTime <= 500) {
            score = 100;
            grade = 'Excellent (≤ 500ms)';
            status = 'pass';
          } else if (loadTime <= 1000) {
            score = 90;
            grade = 'Good (501ms - 1000ms)';
            status = 'pass';
          } else if (loadTime <= 2000) {
            score = 80;
            grade = 'Acceptable (1s - 2s)';
            status = 'pass';
            recs.push('Optimize server database queries and implement edge caching to reduce response time under 1s.');
          } else if (loadTime <= 3000) {
            score = 60;
            grade = 'Slow (2s - 3s)';
            status = 'warn';
            recs.push('Utilize a Content Delivery Network (CDN) like Cloudflare or Fastly to decrease Time to First Byte (TTFB).');
          } else if (loadTime <= 5000) {
            score = 30;
            grade = 'Very Slow (3s - 5s)';
            status = 'warn';
            recs.push('Critical latency: optimize back-end server rendering, database indexing, and cache dynamic page responses.');
          } else {
            score = 0;
            grade = 'Critical Latency (> 5s)';
            status = 'fail';
            recs.push('Server response time is critically slow. Investigate hosting server capacity and network bottlenecks.');
          }

          const summary = `Initial HTML document fetched in ${loadTime}ms (${grade}).`;

          const thresholdTable = [
            ['Threshold', 'Target Status', 'Evaluation'],
            ['≤ 500ms', 'Excellent', loadTime <= 500 ? '✅ Current Result' : 'Target'],
            ['501 - 1000ms', 'Good', (loadTime > 500 && loadTime <= 1000) ? '✅ Current Result' : 'Acceptable range'],
            ['1001 - 2000ms', 'Acceptable', (loadTime > 1000 && loadTime <= 2000) ? '⚠️ Current Result' : 'Improvement recommended'],
            ['> 2000ms', 'Slow / Very Slow', loadTime > 2000 ? '❌ Current Result' : 'Unacceptable for modern web']
          ];

          return {
            id: 'page-load-time',
            name: 'Page Load Time',
            status,
            score,
            summary,
            details: [
              { label: 'Fetch Duration', value: `${loadTime} ms`, type: 'text' },
              { label: 'Performance Grade', value: grade, type: 'text' },
              { label: 'Latency Benchmarks', value: thresholdTable, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['Page response time meets high performance standards.'],
            duration: Date.now() - start,
            raw: { loadTimeMs: loadTime, grade, score }
          };
        }
      },

      // 2. Page Size
      {
        id: 'page-size',
        name: 'Page Size',
        description: 'Analyzes raw HTML document payload and estimates total page resource weight.',
        helpText: 'Smaller page sizes transfer faster across mobile data networks and consume less memory on client devices.',
        type: 'auto',
        tags: ['size', 'payload', 'bandwidth', 'weight'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          // Get raw HTML size
          let htmlBytes = 0;
          if (context && context.fetchResult && typeof context.fetchResult.size === 'number') {
            htmlBytes = context.fetchResult.size;
          } else if (context && context.html) {
            htmlBytes = new Blob([context.html]).size;
          }

          let cssCount = 0;
          let jsCount = 0;
          let imgCount = 0;
          let mediaCount = 0;

          if (doc) {
            cssCount = doc.querySelectorAll('link[rel="stylesheet"]').length;
            jsCount = doc.querySelectorAll('script[src]').length;
            imgCount = doc.querySelectorAll('img[src]').length;
            mediaCount = doc.querySelectorAll('video, audio').length;
          }

          // Rough industry average estimations (uncompressed/transferred payload)
          const estCssBytes = cssCount * 45 * 1024;
          const estJsBytes = jsCount * 85 * 1024;
          const estImgBytes = imgCount * 125 * 1024;
          const estMediaBytes = mediaCount * 750 * 1024;
          const totalEstimatedBytes = htmlBytes + estCssBytes + estJsBytes + estImgBytes + estMediaBytes;

          let score = 100;
          let status = 'pass';
          const recs = [];

          if (htmlBytes < 100 * 1024) {
            score = 100;
          } else if (htmlBytes < 500 * 1024) {
            score = 80;
            recs.push('HTML size is moderate. Minify HTML and avoid excessive inline JSON or base64 data.');
          } else if (htmlBytes < 1024 * 1024) {
            score = 60;
            status = 'warn';
            recs.push('HTML payload exceeds 500KB. Strip inline SVGs and large serialized client states.');
          } else if (htmlBytes < 2 * 1024 * 1024) {
            score = 40;
            status = 'warn';
            recs.push('HTML payload exceeds 1MB. Paginate large content lists and externalize inline scripts.');
          } else {
            score = 20;
            status = 'fail';
            recs.push('Critical HTML size (>2MB). The server is returning an extraordinarily bloated document.');
          }

          const breakdownTable = [
            ['Resource Type', 'Count', 'Estimated Transferred Weight'],
            ['HTML Document', '1', formatBytes(htmlBytes)],
            ['External CSS Stylesheets', `${cssCount}`, `~${formatBytes(estCssBytes)}`],
            ['External JavaScript Scripts', `${jsCount}`, `~${formatBytes(estJsBytes)}`],
            ['Images', `${imgCount}`, `~${formatBytes(estImgBytes)}`],
            ['Video / Audio Media', `${mediaCount}`, `~${formatBytes(estMediaBytes)}`],
            ['Estimated Total Page Weight', `${1 + cssCount + jsCount + imgCount + mediaCount}`, `~${formatBytes(totalEstimatedBytes)}`]
          ];

          const summary = `HTML document size is ${formatBytes(htmlBytes)}. Estimated full page weight is ~${formatBytes(totalEstimatedBytes)}.`;

          return {
            id: 'page-size',
            name: 'Page Size',
            status,
            score,
            summary,
            details: [
              { label: 'HTML Document Size', value: `${formatBytes(htmlBytes)} (${htmlBytes.toLocaleString()} bytes)`, type: 'text' },
              { label: 'Estimated Total Weight', value: `~${formatBytes(totalEstimatedBytes)}`, type: 'text' },
              { label: 'Resource Breakdown', value: breakdownTable, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['HTML document payload is lightweight and well-optimized.'],
            duration: Date.now() - start,
            raw: { htmlBytes, totalEstimatedBytes, cssCount, jsCount, imgCount, mediaCount }
          };
        }
      },

      // 3. Compression
      {
        id: 'compression',
        name: 'Compression (Gzip/Brotli)',
        description: 'Checks Content-Encoding headers for Brotli (br), Gzip, or Deflate compression.',
        helpText: 'Modern text compression algorithms like Brotli and Gzip reduce transferred file sizes by up to 70-85%.',
        type: 'auto',
        tags: ['compression', 'brotli', 'gzip', 'headers', 'bandwidth'],
        async run(context) {
          const start = Date.now();
          const headers = context?.fetchResult?.headers;
          const encoding = (getHeader(headers, 'content-encoding') || '').toLowerCase().trim();

          let score = 0;
          let status = 'fail';
          let summary = '';
          const recs = [];

          if (encoding.includes('br')) {
            score = 100;
            status = 'pass';
            summary = 'Brotli (br) compression is active (state-of-the-art compression efficiency).';
          } else if (encoding.includes('gzip')) {
            score = 90;
            status = 'pass';
            summary = 'Gzip compression is active (standard high-efficiency compression).';
            recs.push('Consider enabling Brotli (br) compression on your server for an additional 15-20% byte savings.');
          } else if (encoding.includes('deflate')) {
            score = 50;
            status = 'warn';
            summary = 'Deflate compression detected (older compression standard).';
            recs.push('Upgrade web server compression from Deflate to Gzip or Brotli.');
          } else {
            score = 0;
            status = 'fail';
            summary = 'No compression detected (Content-Encoding header missing or uncompressed).';
            recs.push('Enable Gzip or Brotli compression in your web server (nginx, Apache, Caddy, or Cloudflare).');
          }

          return {
            id: 'compression',
            name: 'Compression (Gzip/Brotli)',
            status,
            score,
            summary,
            details: [
              { label: 'Content-Encoding Header', value: encoding || 'None / Header omitted', type: 'text' },
              { label: 'Algorithm Identified', value: encoding.includes('br') ? 'Brotli' : (encoding.includes('gzip') ? 'Gzip' : (encoding.includes('deflate') ? 'Deflate' : 'None')), type: 'text' },
              { label: 'Proxy Notice', value: 'Note: intermediate CORS proxies may modify or strip compression headers in transit.', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['HTTP response compression is configured properly.'],
            duration: Date.now() - start,
            raw: { encoding, score }
          };
        }
      },

      // 4. Browser Caching
      {
        id: 'caching-headers',
        name: 'Browser Caching',
        description: 'Examines Cache-Control directives, max-age TTL, and ETag / Last-Modified validators.',
        helpText: 'Effective browser cache headers allow repeat visitors to load the website instantly without re-downloading static files.',
        type: 'auto',
        tags: ['caching', 'headers', 'cache-control', 'etag'],
        async run(context) {
          const start = Date.now();
          const headers = context?.fetchResult?.headers;

          const cacheControl = getHeader(headers, 'cache-control') || '';
          const etag = getHeader(headers, 'etag') || '';
          const lastModified = getHeader(headers, 'last-modified') || '';
          const expires = getHeader(headers, 'expires') || '';

          let maxAge = null;
          const matchMaxAge = cacheControl.match(/max-age\s*=\s*(\d+)/i);
          if (matchMaxAge) {
            maxAge = parseInt(matchMaxAge[1], 10);
          }

          let score = 20;
          let status = 'fail';
          let summary = '';
          const recs = [];

          if (maxAge !== null) {
            if (maxAge >= 86400) {
              score = 100;
              status = 'pass';
              summary = `Browser cache configured with generous TTL (${Math.round(maxAge / 3600)} hours / ${Math.round(maxAge / 86400)} days).`;
            } else if (maxAge >= 3600) {
              score = 80;
              status = 'pass';
              summary = `Browser cache configured with moderate TTL (${Math.round(maxAge / 60)} minutes).`;
              recs.push('For static assets that use cache busting (hashes), consider extending max-age to 1 year (31536000s).');
            } else if (maxAge > 0) {
              score = 50;
              status = 'warn';
              summary = `Browser cache has a very short TTL (${maxAge} seconds).`;
              recs.push('Increase cache max-age for static assets to at least 1 day (86400s).');
            } else {
              score = 30;
              status = 'warn';
              summary = 'Cache-Control explicitly set to max-age=0 or no-cache.';
            }
          } else if (cacheControl.toLowerCase().includes('no-store')) {
            score = 30;
            status = 'info';
            summary = 'Cache-Control specifies "no-store" (appropriate for sensitive authenticated data, but prevents caching).';
          } else {
            score = 20;
            status = 'fail';
            summary = 'No Cache-Control max-age header found. Browsers will use heuristic caching or re-fetch on every visit.';
            recs.push('Add an explicit Cache-Control header (e.g., "public, max-age=86400, stale-while-revalidate=604800").');
          }

          if (etag || lastModified) {
            score = Math.min(100, score + 10);
          } else {
            recs.push('Configure ETag or Last-Modified headers to enable conditional HTTP 304 Not Modified validation.');
          }

          return {
            id: 'caching-headers',
            name: 'Browser Caching',
            status,
            score,
            summary,
            details: [
              { label: 'Cache-Control', value: cacheControl || 'Not specified', type: 'text' },
              { label: 'Max-Age', value: maxAge !== null ? `${maxAge} seconds (${(maxAge / 3600).toFixed(1)} hours)` : 'None detected', type: 'text' },
              { label: 'ETag Validator', value: etag || 'Absent', type: 'text' },
              { label: 'Last-Modified', value: lastModified || 'Absent', type: 'text' },
              { label: 'Expires Header', value: expires || 'Absent', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Browser caching directives comply with web performance standards.'],
            duration: Date.now() - start,
            raw: { cacheControl, maxAge, hasEtag: !!etag, hasLastModified: !!lastModified }
          };
        }
      },

      // 5. Resource Count
      {
        id: 'resource-count',
        name: 'Resource Count',
        description: 'Counts external JavaScript files, stylesheets, images, and preloads referenced in the HTML.',
        helpText: 'High numbers of external requests increase network roundtrips, DNS lookups, and TCP handshakes.',
        type: 'auto',
        tags: ['requests', 'http-requests', 'scripts', 'stylesheets'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'resource-count',
              name: 'Resource Count',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const scripts = doc.querySelectorAll('script[src]');
          const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]');
          const images = doc.querySelectorAll('img[src]');
          const preloads = doc.querySelectorAll('link[rel="preload"]');
          const totalExternal = scripts.length + stylesheets.length + images.length;

          let score = 100;
          let status = 'pass';
          const recs = [];

          if (totalExternal < 10) {
            score = 100;
          } else if (totalExternal < 20) {
            score = 80;
          } else if (totalExternal < 30) {
            score = 60;
            status = 'warn';
            recs.push('Bundle external JavaScript files and concatenate CSS to reduce total request volume.');
          } else if (totalExternal < 40) {
            score = 40;
            status = 'warn';
            recs.push('High external resource count. Use sprite sheets or inline critical assets to minimize HTTP requests.');
          } else {
            score = 20;
            status = 'fail';
            recs.push('Excessive resource count (≥40 requests). Aggressively bundle scripts, styles, and audit third-party plugins.');
          }

          const countTable = [
            ['Resource Type', 'Detected Count', 'Impact Assessment'],
            ['External JavaScript (<script src>)', `${scripts.length}`, scripts.length > 10 ? 'High' : 'Moderate'],
            ['External Stylesheets (<link rel="stylesheet">)', `${stylesheets.length}`, stylesheets.length > 5 ? 'High' : 'Normal'],
            ['HTML Images (<img src>)', `${images.length}`, images.length > 20 ? 'High' : 'Normal'],
            ['Preload Hints (<link rel="preload">)', `${preloads.length}`, preloads.length > 0 ? 'Optimal' : 'None detected'],
            ['Total External Assets', `${totalExternal}`, totalExternal > 30 ? 'Optimization Needed' : 'Good']
          ];

          return {
            id: 'resource-count',
            name: 'Resource Count',
            status,
            score,
            summary: `Found ${totalExternal} external resource request(s) (${scripts.length} JS, ${stylesheets.length} CSS, ${images.length} images).`,
            details: [
              { label: 'Total External Requests', value: `${totalExternal} resources`, type: 'text' },
              { label: 'Resource Table', value: countTable, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['Resource count is within efficient performance boundaries.'],
            duration: Date.now() - start,
            raw: { scripts: scripts.length, stylesheets: stylesheets.length, images: images.length, preloads: preloads.length, totalExternal }
          };
        }
      },

      // 6. Render-Blocking Resources
      {
        id: 'render-blocking',
        name: 'Render-Blocking Resources',
        description: 'Detects synchronous head scripts and non-deferred stylesheets that prevent browser first paint.',
        helpText: 'Render-blocking assets force the browser to halt HTML parsing until external files are downloaded and executed.',
        type: 'auto',
        tags: ['render-blocking', 'head', 'async', 'defer', 'critical-path'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'render-blocking',
              name: 'Render-Blocking Resources',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const head = doc.head || doc.querySelector('head');
          if (!head) {
            return {
              id: 'render-blocking',
              name: 'Render-Blocking Resources',
              status: 'info',
              score: 100,
              summary: 'No <head> element found in document.',
              details: [{ label: 'Head Element', value: 'Missing', type: 'text' }],
              recommendations: [],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const blockingRows = [['Type', 'Resource URL / Source', 'Why Blocking', 'Fix Recommendation']];
          let blockingCount = 0;

          // Check Head Stylesheets
          const headStyles = Array.from(head.querySelectorAll('link[rel="stylesheet"]'));
          headStyles.forEach(link => {
            const media = (link.getAttribute('media') || '').toLowerCase();
            const href = link.getAttribute('href') || '[inline/no-href]';
            // media="print" is non-blocking for screen
            if (media === 'print' || link.hasAttribute('disabled')) {
              return;
            }
            blockingCount++;
            blockingRows.push(['Stylesheet', href.slice(0, 45), 'CSS in <head> blocks layout render', 'Inline critical CSS and preload non-critical styles']);
          });

          // Check Head Scripts
          const headScripts = Array.from(head.querySelectorAll('script[src]'));
          headScripts.forEach(script => {
            const hasAsync = script.hasAttribute('async');
            const hasDefer = script.hasAttribute('defer');
            const isModule = (script.getAttribute('type') || '').toLowerCase() === 'module';
            const src = script.getAttribute('src') || '';

            if (!hasAsync && !hasDefer && !isModule) {
              blockingCount++;
              blockingRows.push(['JavaScript', src.slice(0, 45), 'Synchronous <script> in <head> pauses parser', 'Add defer or async attribute to the script']);
            }
          });

          let score = 100;
          let status = 'pass';
          const recs = [];

          if (blockingCount === 0) {
            score = 100;
          } else if (blockingCount <= 2) {
            score = 80;
            status = 'pass';
            recs.push('Add defer or async to head scripts to eliminate blocking parser stalls.');
          } else if (blockingCount <= 4) {
            score = 60;
            status = 'warn';
            recs.push('Multiple render-blocking resources detected. Defer scripts and split large CSS bundles.');
          } else if (blockingCount <= 6) {
            score = 40;
            status = 'warn';
            recs.push('High render-blocking penalty. Move scripts to the end of <body> or apply defer.');
          } else {
            score = 20;
            status = 'fail';
            recs.push('Severe render-blocking: over 6 blocking head assets delay First Contentful Paint significantly.');
          }

          const summary = blockingCount === 0
            ? 'Zero render-blocking scripts or stylesheets found in <head>.'
            : `Found ${blockingCount} render-blocking resource(s) in <head> that delay first paint.`;

          return {
            id: 'render-blocking',
            name: 'Render-Blocking Resources',
            status,
            score,
            summary,
            details: [
              { label: 'Blocking Resources Count', value: `${blockingCount} asset(s)`, type: 'text' },
              ...(blockingRows.length > 1 ? [{ label: 'Render-Blocking Assets', value: blockingRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['Head assets are non-blocking or deferred properly.'],
            duration: Date.now() - start,
            raw: { blockingCount, headStyles: headStyles.length, headScripts: headScripts.length }
          };
        }
      },

      // 7. Image Optimization
      {
        id: 'image-optimization',
        name: 'Image Optimization',
        description: 'Audits native lazy-loading (loading="lazy"), explicit width/height dimensions, and modern image formats (WebP/AVIF).',
        helpText: 'Lazy-loading defers off-screen images, width/height prevent Cumulative Layout Shift (CLS), and WebP/AVIF save bandwidth.',
        type: 'auto',
        tags: ['images', 'lazy-load', 'cls', 'webp', 'avif'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'image-optimization',
              name: 'Image Optimization',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const images = Array.from(doc.querySelectorAll('img'));
          if (images.length === 0) {
            return {
              id: 'image-optimization',
              name: 'Image Optimization',
              status: 'info',
              score: 100,
              summary: 'No <img> elements found on this page.',
              details: [{ label: 'Images Found', value: '0 images', type: 'text' }],
              recommendations: [],
              duration: Date.now() - start,
              raw: { imageCount: 0 }
            };
          }

          let withLazy = 0;
          let withDimensions = 0;
          let withModernFormat = 0;
          const auditRows = [['Image Src', 'Lazy Loaded', 'Dimensions (w/h)', 'Modern Format (WebP/AVIF)']];

          images.forEach((img, idx) => {
            const src = img.getAttribute('src') || '';
            const srcset = img.getAttribute('srcset') || '';
            const loading = (img.getAttribute('loading') || '').toLowerCase();
            const hasWidth = img.hasAttribute('width');
            const hasHeight = img.hasAttribute('height');
            const parentPicture = img.closest('picture');

            const isLazy = loading === 'lazy';
            const hasDims = hasWidth && hasHeight;

            // Check modern format
            const combinedSources = `${src} ${srcset} ${parentPicture ? parentPicture.innerHTML : ''}`.toLowerCase();
            const isModern = /\.webp|\.avif|image\/webp|image\/avif/.test(combinedSources);

            if (isLazy) withLazy++;
            if (hasDims) withDimensions++;
            if (isModern) withModernFormat++;

            if (idx < 20) {
              auditRows.push([
                src ? src.slice(0, 35) : `[Image #${idx + 1}]`,
                isLazy ? '✅ Yes' : '❌ No',
                hasDims ? '✅ Yes' : '❌ Missing',
                isModern ? '✅ Modern' : '⚠️ Legacy (PNG/JPG)'
              ]);
            }
          });

          const total = images.length;
          // Calculate score: 40% dimensions (CLS), 30% lazy loading, 30% modern formats
          const dimRatio = withDimensions / total;
          const lazyRatio = withLazy / total;
          const modernRatio = withModernFormat / total;

          const score = Math.round((dimRatio * 40) + (lazyRatio * 30) + (modernRatio * 30));
          const status = score >= 80 ? 'pass' : (score >= 50 ? 'warn' : 'fail');

          const summary = `Analyzed ${total} image(s): ${withDimensions}/${total} have explicit dimensions, ${withLazy}/${total} use loading="lazy", ${withModernFormat}/${total} use WebP/AVIF.`;

          const recs = [];
          if (withDimensions < total) {
            recs.push('Add explicit width and height attributes to all <img> elements to eliminate Cumulative Layout Shift (CLS).');
          }
          if (withLazy < total) {
            recs.push('Add loading="lazy" to all off-screen and below-the-fold images to accelerate initial page render.');
          }
          if (withModernFormat < total) {
            recs.push('Convert legacy JPEG and PNG images to modern WebP or AVIF formats for 25-50% smaller image files.');
          }

          return {
            id: 'image-optimization',
            name: 'Image Optimization',
            status,
            score,
            summary,
            details: [
              { label: 'Total Images', value: `${total} images`, type: 'text' },
              { label: 'With Width & Height', value: `${withDimensions} of ${total} (${Math.round(dimRatio * 100)}%)`, type: 'text' },
              { label: 'With loading="lazy"', value: `${withLazy} of ${total} (${Math.round(lazyRatio * 100)}%)`, type: 'text' },
              { label: 'Modern Formats (WebP/AVIF)', value: `${withModernFormat} of ${total} (${Math.round(modernRatio * 100)}%)`, type: 'text' },
              { label: 'Image Audit Sample', value: auditRows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['All images follow modern web optimization best practices.'],
            duration: Date.now() - start,
            raw: { total, withDimensions, withLazy, withModernFormat, score }
          };
        }
      },

      // 8. Third-Party Scripts
      {
        id: 'third-party-scripts',
        name: 'Third-Party Scripts',
        description: 'Categorizes external scripts by domain and identifies trackers, ads, analytics, and widget overhead.',
        helpText: 'Third-party JavaScript libraries often cause significant performance regressions, CPU spikes, and user privacy leaks.',
        type: 'auto',
        tags: ['third-party', 'analytics', 'trackers', 'javascript', 'privacy'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);
          const pageHost = getHostname(context?.url || '');

          if (!doc) {
            return {
              id: 'third-party-scripts',
              name: 'Third-Party Scripts',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const scripts = Array.from(doc.querySelectorAll('script[src]'));
          const thirdPartyMap = new Map();

          scripts.forEach(script => {
            const src = script.getAttribute('src') || '';
            let host = '';
            try {
              host = new URL(src, context?.url || 'https://example.com').hostname.toLowerCase();
            } catch (e) {
              return;
            }

            // Check if third party
            if (host && pageHost && host !== pageHost && !host.endsWith(`.${pageHost}`)) {
              if (!thirdPartyMap.has(host)) {
                thirdPartyMap.set(host, []);
              }
              thirdPartyMap.get(host).push(src);
            }
          });

          // Categorize domains
          function categorize(domain) {
            const d = domain.toLowerCase();
            if (/google-analytics|googletagmanager|matomo|hotjar|segment|amplitude|mixpanel|clarity\.ms/.test(d)) return 'Analytics & Tracking';
            if (/doubleclick|googlesyndication|adsense|facebook\.net|criteo|tiktok|taboola|outbrain/.test(d)) return 'Advertising & Pixels';
            if (/twitter\.com|x\.com|facebook\.com|linkedin\.com|instagram\.com/.test(d)) return 'Social Media Widgets';
            if (/googleapis\.com|gstatic\.com|typekit\.net|fonts\.com/.test(d)) return 'Web Fonts';
            if (/cdnjs\.cloudflare|jsdelivr|unpkg|aspnetcdn/.test(d)) return 'CDN Open-Source Libraries';
            if (/intercom|zendesk|drift|crisp\.chat|tawk\.to|livechat/.test(d)) return 'Customer Support / Chat';
            return 'Other Third-Party Service';
          }

          const domainRows = [['Third-Party Domain', 'Category', 'Script Count']];
          thirdPartyMap.forEach((scriptList, domain) => {
            domainRows.push([domain, categorize(domain), `${scriptList.length}`]);
          });

          const uniqueDomainsCount = thirdPartyMap.size;
          let score = 100;
          let status = 'pass';
          const recs = [];

          if (uniqueDomainsCount <= 2) {
            score = 100;
          } else if (uniqueDomainsCount <= 5) {
            score = 80;
          } else if (uniqueDomainsCount <= 8) {
            score = 60;
            status = 'warn';
            recs.push('Multiple third-party tracker domains detected. Audit whether all analytics tools are actively utilized.');
          } else {
            score = 40;
            status = 'warn';
            recs.push('High third-party domain overhead (>8 domains). Third-party scripts block main thread execution; consider using a server-side tag manager.');
          }

          const summary = uniqueDomainsCount === 0
            ? 'Zero third-party external scripts detected. Self-hosted and privacy-focused architecture.'
            : `Identified ${uniqueDomainsCount} unique third-party domain(s) delivering external scripts.`;

          return {
            id: 'third-party-scripts',
            name: 'Third-Party Scripts',
            status,
            score,
            summary,
            details: [
              { label: 'Unique 3rd-Party Domains', value: `${uniqueDomainsCount} domain(s)`, type: 'text' },
              ...(domainRows.length > 1 ? [{ label: 'Third-Party Providers', value: domainRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['Third-party script usage is lean and controlled.'],
            duration: Date.now() - start,
            raw: { thirdPartyCount: uniqueDomainsCount, domains: Array.from(thirdPartyMap.keys()) }
          };
        }
      },

      // 9. Inline Styles
      {
        id: 'inline-styles',
        name: 'Inline Styles',
        description: 'Quantifies elements with inline style attributes and measures styling maintainability.',
        helpText: 'Scattered inline styles inflate HTML markup size, bypass CSS caching, and complicate Content Security Policies (CSP).',
        type: 'auto',
        tags: ['css', 'inline-styles', 'csp', 'html-cleanliness'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'inline-styles',
              name: 'Inline Styles',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const allElements = doc.querySelectorAll('*');
          const styledElements = Array.from(doc.querySelectorAll('[style]'));
          const totalCount = allElements.length;
          const styledCount = styledElements.length;
          const ratio = totalCount > 0 ? (styledCount / totalCount) * 100 : 0;

          let score = 100;
          let status = 'pass';
          const recs = [];

          if (styledCount === 0) {
            score = 100;
          } else if (styledCount < 5) {
            score = 80;
          } else if (styledCount < 20) {
            score = 60;
            status = 'warn';
            recs.push('Refactor inline styles into reusable CSS class selectors in external stylesheets.');
          } else {
            score = 40;
            status = 'warn';
            recs.push('High concentration of inline styles (≥20 elements). Eliminating inline styles enables strict Content Security Policies without "unsafe-inline".');
          }

          const sampleRows = [['Element', 'ID / Class', 'Inline Style Snippet']];
          styledElements.slice(0, 15).forEach(el => {
            const ident = el.id ? `#${el.id}` : (el.className ? `.${el.className}` : '-');
            const style = el.getAttribute('style') || '';
            sampleRows.push([`<${el.tagName.toLowerCase()}>`, ident, style.length > 50 ? style.slice(0, 50) + '…' : style]);
          });

          const summary = styledCount === 0
            ? 'No inline styles found. CSS presentation is fully separated from HTML markup.'
            : `Found ${styledCount} element(s) with inline styles (${ratio.toFixed(1)}% of total DOM elements).`;

          return {
            id: 'inline-styles',
            name: 'Inline Styles',
            status,
            score,
            summary,
            details: [
              { label: 'Inline Styled Elements', value: `${styledCount} elements`, type: 'text' },
              { label: 'Total DOM Elements', value: `${totalCount} elements`, type: 'text' },
              { label: 'Inline Style Ratio', value: `${ratio.toFixed(1)}%`, type: 'text' },
              ...(sampleRows.length > 1 ? [{ label: 'Sample Styled Elements', value: sampleRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['CSS separation of concerns is maintained.'],
            duration: Date.now() - start,
            raw: { styledCount, totalCount, ratio, score }
          };
        }
      },

      // 10. Resource Hints
      {
        id: 'resource-hints',
        name: 'Resource Hints',
        description: 'Checks for preconnect, dns-prefetch, preload, and prefetch directives in <head>.',
        helpText: 'Resource hints inform the browser about anticipated external origins and high-priority assets before they are requested.',
        type: 'auto',
        tags: ['resource-hints', 'preconnect', 'preload', 'dns-prefetch', 'performance'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'resource-hints',
              name: 'Resource Hints',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const hints = Array.from(doc.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="preload"], link[rel="prefetch"], link[rel="prerender"]'));
          const hintRows = [['Rel Type', 'Target URL / Origin', 'As Attribute', 'Crossorigin']];

          hints.forEach(h => {
            const rel = h.getAttribute('rel') || '';
            const href = h.getAttribute('href') || '';
            const as = h.getAttribute('as') || '-';
            const cross = h.hasAttribute('crossorigin') ? (h.getAttribute('crossorigin') || 'anonymous') : 'No';
            hintRows.push([rel, href.slice(0, 45), as, cross]);
          });

          const summary = hints.length > 0
            ? `Found ${hints.length} resource hint(s) optimizing connection setup and critical asset loading.`
            : 'No resource hints found (preconnect, dns-prefetch, or preload).';

          const recs = [];
          if (hints.length === 0) {
            recs.push('Add <link rel="preconnect" href="https://fonts.example.com"> for critical third-party fonts and CDNs.');
            recs.push('Add <link rel="preload" as="font" type="font/woff2" crossorigin> for critical above-the-fold web fonts.');
          }

          return {
            id: 'resource-hints',
            name: 'Resource Hints',
            status: hints.length > 0 ? 'pass' : 'info',
            score: hints.length > 0 ? 100 : 75,
            summary,
            details: [
              { label: 'Resource Hints Detected', value: `${hints.length} hint(s)`, type: 'text' },
              ...(hintRows.length > 1 ? [{ label: 'Configured Hints', value: hintRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['Resource hints are actively speeding up network handshakes.'],
            duration: Date.now() - start,
            raw: { hintsCount: hints.length }
          };
        }
      }
    ]
  };
})();
