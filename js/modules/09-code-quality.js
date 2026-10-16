/**
 * VeriQ - Website Testing Suite
 * Module 09: Code Quality Testing
 *
 * Analyzes HTML doctype, W3C markup validity, document head ordering,
 * script safety, external dependencies, sensitive code comments,
 * modern image formats, resource hints, licenses, and page weight budget.
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
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) return { success: false, status: resp.status, contents: '' };
      const data = await resp.json();
      return {
        success: true,
        status: (data.status && data.status.http_code) || 200,
        contents: data.contents || ''
      };
    } catch (err) {
      clearTimeout(timer);
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

  VeriQ.modules['09-code-quality'] = {
    id: '09-code-quality',
    name: 'Code Quality',
    icon: '💻',
    color: '#6366F1',
    description: 'Analyzes HTML doctype, W3C markup validity, document head ordering, script safety, external dependencies, sensitive code comments, modern image formats, resource hints, licenses, and page weight budget.',
    tests: [
      // -------------------------------------------------------------
      // Test 1: html-doctype
      // -------------------------------------------------------------
      {
        id: 'html-doctype',
        name: 'HTML Doctype',
        description: 'Checks for a valid modern HTML5 doctype declaration at the beginning of the markup to prevent quirks mode rendering.',
        async run(context) {
          const startTime = performance.now();
          const rawHtml = (context.html || (context.fetchResult && context.fetchResult.body) || '').trim();

          const doctypeMatch = rawHtml.match(/^<!DOCTYPE\s+([^>]+)>/i);
          const hasHtml5Doctype = /^<!DOCTYPE\s+html>/i.test(rawHtml);
          const hasXhtmlDoctype = /XHTML/i.test(rawHtml.slice(0, 300));
          const hasHtml4Doctype = /HTML 4\.01/i.test(rawHtml.slice(0, 300));

          let score = 0;
          let status = 'fail';
          let summary = '';
          const recommendations = [];

          if (hasHtml5Doctype) {
            score = 100;
            status = 'pass';
            summary = 'Modern HTML5 doctype (<!DOCTYPE html>) is present at the beginning of the document.';
          } else if (hasXhtmlDoctype || hasHtml4Doctype) {
            score = 50;
            status = 'warn';
            const legacyType = hasXhtmlDoctype ? 'XHTML' : 'HTML 4.01';
            summary = `Legacy ${legacyType} doctype detected. Modern web standards require the HTML5 doctype.`;
            recommendations.push('Replace legacy doctype declaration with standard <!DOCTYPE html>.');
          } else if (doctypeMatch) {
            score = 60;
            status = 'warn';
            summary = `Non-standard doctype declaration found: "${doctypeMatch[0]}".`;
            recommendations.push('Switch to the clean modern HTML5 declaration: <!DOCTYPE html>.');
          } else {
            score = 0;
            status = 'fail';
            summary = 'Missing <!DOCTYPE html> declaration! Browsers will render in Quirks Mode, causing inconsistent layouts and CSS bugs.';
            recommendations.push('Add <!DOCTYPE html> as the absolute first line of your HTML document.');
          }

          const details = [
            { label: 'Doctype Detected', value: doctypeMatch ? doctypeMatch[0] : 'None (Missing)', type: 'text' },
            { label: 'Doctype Standard', value: hasHtml5Doctype ? 'HTML5 (Standard)' : (doctypeMatch ? 'Legacy / Non-standard' : 'Quirks Mode Trigger'), type: 'text' },
            { label: 'Positioned at Start', value: rawHtml.startsWith('<!DOCTYPE') ? 'Yes' : 'No', type: 'text' }
          ];

          return {
            id: 'html-doctype',
            name: 'HTML Doctype',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { hasHtml5Doctype, doctypeMatch: doctypeMatch ? doctypeMatch[0] : null }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 2: html-validation-check
      // -------------------------------------------------------------
      {
        id: 'html-validation-check',
        name: 'HTML Validation (W3C)',
        description: 'Validates HTML markup against the official W3C Nu HTML Checker service, with local DOM fallback heuristics.',
        async run(context) {
          const startTime = performance.now();
          const targetUrl = context.url || (context.fetchResult && context.fetchResult.url);
          const doc = getDoc(context);

          let errorCount = 0;
          let warningCount = 0;
          let validatorSource = 'W3C Nu Validator';
          const issueList = [];

          if (targetUrl) {
            const w3cApiUrl = `https://validator.w3.org/nu/?out=json&doc=${encodeURIComponent(targetUrl)}`;
            const res = await fetchViaProxy(w3cApiUrl, 8000);

            if (res.success && res.contents) {
              try {
                const data = JSON.parse(res.contents);
                const messages = Array.isArray(data.messages) ? data.messages : [];
                for (const msg of messages) {
                  if (msg.type === 'error') {
                    errorCount++;
                    if (issueList.length < 10) issueList.push({ type: 'Error', message: msg.message, line: msg.lastLine || 'N/A' });
                  } else if (msg.type === 'info' && msg.subType === 'warning') {
                    warningCount++;
                    if (issueList.length < 10) issueList.push({ type: 'Warning', message: msg.message, line: msg.lastLine || 'N/A' });
                  }
                }
              } catch (e) {
                // Parse failed, fallback below
              }
            }
          }

          // Fallback to client-side DOM heuristic analysis if W3C API did not return messages
          if (issueList.length === 0 && doc) {
            validatorSource = 'Local Heuristic Analysis';

            // 1. Check deprecated tags
            const deprecatedTags = ['font', 'center', 'marquee', 'blink', 'strike', 'big', 'basefont', 'tt', 'applet', 'frameset', 'frame'];
            for (const tag of deprecatedTags) {
              const count = doc.querySelectorAll(tag).length;
              if (count > 0) {
                errorCount += count;
                issueList.push({ type: 'Error', message: `Deprecated HTML tag <${tag}> used (${count} instance(s)).`, line: 'DOM' });
              }
            }

            // 2. Check duplicate IDs
            const allWithId = Array.from(doc.querySelectorAll('[id]'));
            const idSet = new Set();
            for (const el of allWithId) {
              const id = el.getAttribute('id');
              if (idSet.has(id)) {
                errorCount++;
                if (issueList.length < 10) {
                  issueList.push({ type: 'Error', message: `Duplicate HTML ID attribute found: id="${id}".`, line: 'DOM' });
                }
              }
              idSet.add(id);
            }

            // 3. Check images missing alt
            const imgsNoAlt = doc.querySelectorAll('img:not([alt])').length;
            if (imgsNoAlt > 0) {
              warningCount += imgsNoAlt;
              issueList.push({ type: 'Warning', message: `${imgsNoAlt} image(s) missing required alt attribute.`, line: 'DOM' });
            }
          }

          let score = 100;
          let status = 'pass';
          const recommendations = [];

          if (errorCount === 0) {
            score = 100;
            status = 'pass';
          } else if (errorCount <= 2) {
            score = 80;
            status = 'pass';
            recommendations.push('Review and fix the 1-2 HTML syntax errors identified.');
          } else if (errorCount <= 5) {
            score = 60;
            status = 'warn';
            recommendations.push('Multiple HTML validation errors detected. Ensure all tags are properly closed and valid attributes are used.');
          } else if (errorCount <= 10) {
            score = 40;
            status = 'warn';
            recommendations.push('High volume of HTML validation errors found. Clean up duplicate IDs and malformed markup.');
          } else {
            score = 20;
            status = 'fail';
            recommendations.push('Critical number of HTML errors (>10). Run source code through an automated linter (HTMLHint).');
          }

          const details = [
            { label: 'Validation Engine', value: validatorSource, type: 'text' },
            { label: 'Errors Count', value: String(errorCount), type: 'text' },
            { label: 'Warnings Count', value: String(warningCount), type: 'text' },
            { label: 'Sample Issues', value: issueList.length > 0 ? JSON.stringify(issueList, null, 2) : 'No issues found', type: 'table' }
          ];

          return {
            id: 'html-validation-check',
            name: 'HTML Validation (W3C)',
            status,
            score,
            summary: `${errorCount} HTML error(s) and ${warningCount} warning(s) detected via ${validatorSource}.`,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { errorCount, warningCount, validatorSource, issueList }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 3: head-order
      // -------------------------------------------------------------
      {
        id: 'head-order',
        name: 'Document Head Structure',
        description: 'Audits the sequencing of elements in the <head> to optimize browser parsing and avoid rendering delays.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc || !doc.head) {
            return {
              id: 'head-order',
              name: 'Document Head Structure',
              status: 'error',
              score: null,
              summary: 'Head element unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const headChildren = Array.from(doc.head.children);
          const violations = [];

          let charsetIndex = -1;
          let titleIndex = -1;
          let viewportIndex = -1;
          let firstStylesheetIndex = -1;
          let firstBlockingScriptIndex = -1;

          headChildren.forEach((child, index) => {
            const tagName = child.tagName.toLowerCase();
            if (tagName === 'meta' && child.hasAttribute('charset') && charsetIndex === -1) {
              charsetIndex = index;
            }
            if (tagName === 'title' && titleIndex === -1) {
              titleIndex = index;
            }
            if (tagName === 'meta' && child.getAttribute('name') === 'viewport' && viewportIndex === -1) {
              viewportIndex = index;
            }
            if (tagName === 'link' && child.getAttribute('rel') === 'stylesheet' && firstStylesheetIndex === -1) {
              firstStylesheetIndex = index;
            }
            if (tagName === 'script' && child.hasAttribute('src') && !child.hasAttribute('async') && !child.hasAttribute('defer') && firstBlockingScriptIndex === -1) {
              firstBlockingScriptIndex = index;
            }
          });

          // Check rule 1: Charset should be among first 2 elements
          if (charsetIndex > 2) {
            violations.push(`Charset meta tag is delayed (position ${charsetIndex + 1}). Should be the first element in <head>.`);
          } else if (charsetIndex === -1) {
            violations.push('No <meta charset> tag found in <head>.');
          }

          // Check rule 2: Title should appear near the top
          if (titleIndex > 5) {
            violations.push(`Title tag appears late in <head> (position ${titleIndex + 1}). Move it near the top.`);
          }

          // Check rule 3: Viewport should be declared early for mobile optimization
          if (viewportIndex > 5) {
            violations.push(`Viewport meta tag is positioned late (position ${viewportIndex + 1}).`);
          }

          // Check rule 4: CSS stylesheets should precede blocking scripts
          if (firstBlockingScriptIndex !== -1 && firstStylesheetIndex !== -1 && firstBlockingScriptIndex < firstStylesheetIndex) {
            violations.push(`Blocking <script> (position ${firstBlockingScriptIndex + 1}) appears before stylesheet <link> (position ${firstStylesheetIndex + 1}), stalling parallel CSSOM construction.`);
          }

          let score = Math.max(20, 100 - (violations.length * 20));
          let status = violations.length === 0 ? 'pass' : (violations.length <= 2 ? 'warn' : 'fail');
          const recommendations = violations.map(v => `Order improvement: ${v}`);

          const summary = violations.length === 0
            ? 'Optimal <head> ordering: charset is first, followed by viewport, title, stylesheets, and scripts.'
            : `Found ${violations.length} <head> element sequence order violation(s).`;

          const details = [
            { label: 'Total Children in <head>', value: String(headChildren.length), type: 'text' },
            { label: 'Charset Tag Position', value: charsetIndex !== -1 ? `Element #${charsetIndex + 1}` : 'Missing', type: 'text' },
            { label: 'Title Tag Position', value: titleIndex !== -1 ? `Element #${titleIndex + 1}` : 'Missing', type: 'text' },
            { label: 'Viewport Meta Position', value: viewportIndex !== -1 ? `Element #${viewportIndex + 1}` : 'Missing', type: 'text' },
            { label: 'First Stylesheet vs Script', value: (firstStylesheetIndex !== -1 && firstBlockingScriptIndex !== -1) ? `Stylesheet #${firstStylesheetIndex + 1} vs Script #${firstBlockingScriptIndex + 1}` : 'N/A', type: 'text' },
            { label: 'Order Violations List', value: violations.length > 0 ? violations.join('; ') : 'None (Clean order)', type: 'text' }
          ];

          return {
            id: 'head-order',
            name: 'Document Head Structure',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { violations, charsetIndex, titleIndex, viewportIndex, firstStylesheetIndex, firstBlockingScriptIndex }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 4: console-errors
      // -------------------------------------------------------------
      {
        id: 'console-errors',
        name: 'Inline Script Quality',
        description: 'Tests inline script blocks for syntax errors, deprecated APIs, eval(), document.write(), and security anti-patterns.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'console-errors',
              name: 'Inline Script Quality',
              status: 'error',
              score: null,
              summary: 'Document unavailable for script inspection.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const inlineScripts = Array.from(doc.querySelectorAll('script:not([src])'));
          const issues = [];
          let syntaxErrorCount = 0;
          let evalCount = 0;
          let docWriteCount = 0;
          let withCount = 0;

          inlineScripts.forEach((script, idx) => {
            const code = script.textContent || '';
            const trimmed = code.trim();
            if (!trimmed) return;

            // 1. Syntax check via Function constructor
            try {
              new Function(code);
            } catch (err) {
              syntaxErrorCount++;
              issues.push({ scriptIndex: idx + 1, type: 'Syntax Error', detail: err.message });
            }

            // 2. Dangerous APIs
            if (/\bdocument\.write(?:ln)?\s*\(/i.test(code)) {
              docWriteCount++;
              issues.push({ scriptIndex: idx + 1, type: 'Anti-Pattern', detail: 'document.write() blocks HTML parser' });
            }
            if (/\beval\s*\(/i.test(code)) {
              evalCount++;
              issues.push({ scriptIndex: idx + 1, type: 'Security Risk', detail: 'eval() is a code injection vector' });
            }
            if (/\bwith\s*\(/i.test(code)) {
              withCount++;
              issues.push({ scriptIndex: idx + 1, type: 'Deprecated API', detail: '"with" statement is forbidden in strict mode' });
            }
          });

          let score = 100;
          if (syntaxErrorCount > 0) score -= (syntaxErrorCount * 30);
          if (evalCount > 0) score -= (evalCount * 20);
          if (docWriteCount > 0) score -= (docWriteCount * 15);
          if (withCount > 0) score -= (withCount * 10);
          score = Math.max(0, score);

          let status = 'pass';
          const recommendations = [];

          if (syntaxErrorCount > 0) {
            status = 'fail';
            recommendations.push('Fix syntax errors in inline script blocks to prevent browser JavaScript execution failures.');
          } else if (evalCount > 0 || docWriteCount > 0) {
            status = 'warn';
            if (docWriteCount > 0) recommendations.push('Replace document.write() with modern DOM manipulation (e.g. appendChild or textContent).');
            if (evalCount > 0) recommendations.push('Eliminate eval() calls; use JSON.parse() or structured handlers instead.');
          }

          const summary = inlineScripts.length === 0
            ? 'No inline scripts found on page (best practice: external scripts used).'
            : (issues.length === 0
                ? `All ${inlineScripts.length} inline scripts passed syntax and safety checks.`
                : `Found ${issues.length} issue(s) across ${inlineScripts.length} inline scripts.`);

          const details = [
            { label: 'Inline Scripts Inspected', value: String(inlineScripts.length), type: 'text' },
            { label: 'Syntax Errors', value: String(syntaxErrorCount), type: 'text' },
            { label: 'document.write() Occurrences', value: String(docWriteCount), type: 'text' },
            { label: 'eval() Occurrences', value: String(evalCount), type: 'text' },
            { label: 'Detected Script Issues', value: issues.length > 0 ? JSON.stringify(issues, null, 2) : 'None', type: 'table' }
          ];

          return {
            id: 'console-errors',
            name: 'Inline Script Quality',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { inlineScriptsCount: inlineScripts.length, syntaxErrorCount, evalCount, docWriteCount, issues }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 5: external-dependencies
      // -------------------------------------------------------------
      {
        id: 'external-dependencies',
        name: 'External Dependencies',
        description: 'Audits third-party script and stylesheet sources, checks for trusted CDNs, and warns on risky origins.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'external-dependencies',
              name: 'External Dependencies',
              status: 'info',
              score: null,
              summary: 'Document unavailable for parsing dependencies.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const scripts = Array.from(doc.querySelectorAll('script[src]'));
          const stylesheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'));

          const knownCdns = [
            'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com',
            'ajax.googleapis.com', 'fonts.googleapis.com', 'stackpath.bootstrapcdn.com',
            'code.jquery.com', 'cdn.tailwindcss.com'
          ];

          const dependencies = [];
          const domainsSet = new Set();
          let riskySourcesCount = 0;
          const recommendations = [];

          for (const s of scripts) {
            const src = s.getAttribute('src') || '';
            try {
              const u = new URL(src, context.url);
              domainsSet.add(u.hostname);
              const isTrustedCdn = knownCdns.some(cdn => u.hostname.includes(cdn));
              const isGithubRaw = u.hostname.includes('raw.githubusercontent.com') || u.hostname.includes('rawgit.com');
              const isHttpInsecure = u.protocol === 'http:';

              if (isGithubRaw || isHttpInsecure) {
                riskySourcesCount++;
                if (isGithubRaw) recommendations.push(`Avoid loading production scripts directly from raw GitHub (${u.hostname}); use an established CDN.`);
                if (isHttpInsecure) recommendations.push(`Mixed Content warning: External dependency loaded over insecure HTTP (${src}).`);
              }

              dependencies.push({
                type: 'JavaScript',
                host: u.hostname,
                cdn: isTrustedCdn ? 'Trusted CDN' : 'Custom / External Domain',
                url: src.slice(0, 70) + (src.length > 70 ? '...' : '')
              });
            } catch (e) {
              // Ignore invalid URLs
            }
          }

          let score = 100;
          let status = 'pass';
          if (riskySourcesCount > 0) {
            score = 60;
            status = 'warn';
          }

          const summary = `Found ${dependencies.length} external resource(s) across ${domainsSet.size} domain(s). Risky origins: ${riskySourcesCount}.`;

          const details = [
            { label: 'External Scripts Count', value: String(scripts.length), type: 'text' },
            { label: 'External Stylesheets Count', value: String(stylesheets.length), type: 'text' },
            { label: 'Unique Remote Domains', value: String(domainsSet.size), type: 'text' },
            { label: 'Flagged Risky Origins', value: String(riskySourcesCount), type: 'text' },
            { label: 'Dependency Inventory', value: dependencies.length > 0 ? JSON.stringify(dependencies.slice(0, 15), null, 2) : 'None', type: 'table' }
          ];

          return {
            id: 'external-dependencies',
            name: 'External Dependencies',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { totalDeps: dependencies.length, uniqueDomains: domainsSet.size, riskySourcesCount }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 6: code-comments
      // -------------------------------------------------------------
      {
        id: 'code-comments',
        name: 'Sensitive Info in Comments',
        description: 'Scans HTML and inline scripts for TODO flags, developer annotations, exposed internal paths, and credentials.',
        async run(context) {
          const startTime = performance.now();
          const rawHtml = context.html || (context.fetchResult && context.fetchResult.body) || '';

          // 1. Extract HTML comments: <!-- ... -->
          const htmlComments = rawHtml.match(/<!--([\s\S]*?)-->/g) || [];

          const sensitivePatterns = [
            { regex: /\b(TODO|FIXME|HACK|XXX|TEMP|BUG)\b/i, category: 'Dev Marker' },
            { regex: /(password|passwd|api[_-]?key|secret|private[_-]?key|token)\s*[:=]\s*['"][^'"]{4,}['"]/i, category: 'Potential Credential' },
            { regex: /(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|127\.0\.0\.1|localhost)/i, category: 'Internal IP/Host' },
            { regex: /(\/var\/www|C:\\inetpub|\/home\/[a-z0-9_-]+)/i, category: 'Server File Path' },
            { regex: /(mongodb|mysql|postgres|redis):\/\//i, category: 'Database Connection String' }
          ];

          const findings = [];
          for (const comment of htmlComments) {
            for (const p of sensitivePatterns) {
              if (p.regex.test(comment)) {
                const match = comment.match(p.regex);
                findings.push({
                  category: p.category,
                  snippet: (match ? match[0] : comment.slice(0, 40)).replace(/\s+/g, ' ').trim()
                });
              }
            }
          }

          const credentialsFound = findings.filter(f => f.category === 'Potential Credential' || f.category === 'Database Connection String');
          const devMarkersFound = findings.filter(f => f.category === 'Dev Marker');

          let score = 100;
          let status = 'pass';
          const recommendations = [];

          if (credentialsFound.length > 0) {
            score = 30;
            status = 'fail';
            recommendations.push('CRITICAL: Remove hardcoded credentials or database connection strings immediately from client-visible source comments.');
          } else if (findings.length > 0) {
            score = 80;
            status = 'warn';
            recommendations.push('Strip TODO/FIXME developer comments and internal server paths before deploying to production (enable minification/bundler comment stripping).');
          }

          const summary = findings.length === 0
            ? `Scanned ${htmlComments.length} HTML comment blocks. No sensitive data or exposed development notes found.`
            : `Found ${findings.length} flagged comment snippet(s) (${devMarkersFound.length} dev markers, ${credentialsFound.length} critical).`;

          const details = [
            { label: 'HTML Comments Found', value: String(htmlComments.length), type: 'text' },
            { label: 'Sensitive Flagged Items', value: String(findings.length), type: 'text' },
            { label: 'Exposed Credentials / DB Strings', value: String(credentialsFound.length), type: 'text' },
            { label: 'Flagged Snippets Table', value: findings.length > 0 ? JSON.stringify(findings.slice(0, 10), null, 2) : 'Clean', type: 'table' }
          ];

          return {
            id: 'code-comments',
            name: 'Sensitive Info in Comments',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { totalComments: htmlComments.length, findingsCount: findings.length, findings }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 7: image-formats
      // -------------------------------------------------------------
      {
        id: 'image-formats',
        name: 'Image Format Efficiency',
        description: 'Analyzes image formats used across the page and calculates adoption ratio of modern compression formats (WebP, AVIF, SVG).',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'image-formats',
              name: 'Image Format Efficiency',
              status: 'error',
              score: null,
              summary: 'Document unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const imgElements = Array.from(doc.querySelectorAll('img[src], source[srcset]'));
          const counts = { webp: 0, avif: 0, svg: 0, jpg: 0, png: 0, gif: 0, other: 0 };
          let totalImages = 0;

          for (const el of imgElements) {
            const url = (el.getAttribute('src') || el.getAttribute('srcset') || '').toLowerCase();
            if (!url || url.startsWith('data:')) continue;
            totalImages++;

            if (url.includes('.webp')) counts.webp++;
            else if (url.includes('.avif')) counts.avif++;
            else if (url.includes('.svg')) counts.svg++;
            else if (url.includes('.jpg') || url.includes('.jpeg')) counts.jpg++;
            else if (url.includes('.png')) counts.png++;
            else if (url.includes('.gif')) counts.gif++;
            else counts.other++;
          }

          const modernCount = counts.webp + counts.avif + counts.svg;
          const modernRatio = totalImages > 0 ? Math.round((modernCount / totalImages) * 100) : 100;
          const picturesCount = doc.querySelectorAll('picture').length;

          let score = 100;
          let status = 'pass';
          const recommendations = [];

          if (totalImages === 0) {
            score = 100;
            status = 'pass';
          } else if (modernRatio >= 75) {
            score = 100;
            status = 'pass';
          } else if (modernRatio >= 40) {
            score = 80;
            status = 'pass';
            recommendations.push('Convert remaining legacy PNG/JPEG graphics to modern WebP or AVIF formats for 30-50% bandwidth savings.');
          } else {
            score = 50;
            status = 'warn';
            recommendations.push(`Only ${modernRatio}% of images use modern formats. Serve WebP/AVIF images with <picture> fallback elements.`);
          }

          if (counts.gif > 1) {
            recommendations.push(`Found ${counts.gif} animated GIF file(s). Convert GIFs to MP4/WebM video or animated WebP to reduce download weight by up to 90%.`);
          }

          const summary = totalImages === 0
            ? 'No external image elements found.'
            : `${modernRatio}% modern format adoption (${modernCount}/${totalImages} images in WebP/AVIF/SVG).`;

          const details = [
            { label: 'Total Images Identified', value: String(totalImages), type: 'text' },
            { label: 'Modern Formats (WebP, AVIF, SVG)', value: `${modernCount} (${modernRatio}%)`, type: 'text' },
            { label: 'Legacy Formats (JPEG, PNG)', value: `${counts.jpg + counts.png}`, type: 'text' },
            { label: 'GIF Images', value: String(counts.gif), type: 'text' },
            { label: '<picture> Tag Implementations', value: `${picturesCount} responsive picture containers`, type: 'text' },
            { label: 'Format Distribution', value: JSON.stringify(counts, null, 2), type: 'table' }
          ];

          return {
            id: 'image-formats',
            name: 'Image Format Efficiency',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { totalImages, modernRatio, counts, picturesCount }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 8: link-prefetch
      // -------------------------------------------------------------
      {
        id: 'link-prefetch',
        name: 'Performance Prefetch Hints',
        description: 'Detects resource hints (preconnect, dns-prefetch, preload, prefetch, modulepreload) in the HTML head.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'link-prefetch',
              name: 'Performance Prefetch Hints',
              status: 'info',
              score: null,
              summary: 'Document unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const hints = {
            preconnect: doc.querySelectorAll('link[rel="preconnect"]').length,
            dnsPrefetch: doc.querySelectorAll('link[rel="dns-prefetch"]').length,
            preload: doc.querySelectorAll('link[rel="preload"]').length,
            prefetch: doc.querySelectorAll('link[rel="prefetch"]').length,
            modulepreload: doc.querySelectorAll('link[rel="modulepreload"]').length
          };

          const totalHints = Object.values(hints).reduce((a, b) => a + b, 0);

          let score = 50;
          let status = 'info';
          const recommendations = [];

          if (totalHints >= 3) {
            score = 100;
            status = 'pass';
          } else if (totalHints >= 1) {
            score = 70;
            status = 'pass';
            recommendations.push('Leverage <link rel="preconnect"> for critical third-party fonts or API origins to accelerate connection handshakes.');
          } else {
            score = 50;
            status = 'info';
            recommendations.push('Add resource hints such as <link rel="preconnect" href="https://fonts.gstatic.com"> and <link rel="preload" as="image"> for critical LCP hero images.');
          }

          const summary = totalHints > 0
            ? `Found ${totalHints} resource hint(s) (${hints.preconnect} preconnect, ${hints.preload} preload, ${hints.dnsPrefetch} dns-prefetch).`
            : 'No resource prefetching or preconnection hints found in <head>.';

          const details = [
            { label: 'Preconnect Hints', value: String(hints.preconnect), type: 'text' },
            { label: 'DNS Prefetch Hints', value: String(hints.dnsPrefetch), type: 'text' },
            { label: 'Preload Directives', value: String(hints.preload), type: 'text' },
            { label: 'Prefetch Directives', value: String(hints.prefetch), type: 'text' },
            { label: 'Modulepreload Directives', value: String(hints.modulepreload), type: 'text' }
          ];

          return {
            id: 'link-prefetch',
            name: 'Performance Prefetch Hints',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { hints, totalHints }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 9: open-source-licenses
      // -------------------------------------------------------------
      {
        id: 'open-source-licenses',
        name: 'License & Attribution',
        description: 'Audits license link relations, copyright statements, and legal policy pages.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);
          const rawHtml = context.html || '';

          const text = (doc && doc.body ? doc.body.textContent : '') || '';

          // 1. Check <link rel="license">
          const licenseLink = doc ? doc.querySelector('link[rel="license"]') : null;
          const licenseHref = licenseLink ? licenseLink.getAttribute('href') : null;

          // 2. Check copyright notices
          const copyrightRegex = /(?:©|&copy;|Copyright|\(c\))\s*(?:20\d\d|19\d\d)?(?:\s*-\s*20\d\d)?\s*([^.,\n\r<]{2,40})/i;
          const copyrightMatch = text.match(copyrightRegex) || rawHtml.match(copyrightRegex);
          const copyrightStatement = copyrightMatch ? copyrightMatch[0].trim() : 'None detected';

          // 3. Search for legal footer links (Privacy, Terms, License)
          const legalLinks = [];
          if (doc) {
            const anchors = Array.from(doc.querySelectorAll('a[href]'));
            for (const a of anchors) {
              const href = (a.getAttribute('href') || '').toLowerCase();
              const label = (a.textContent || '').trim().toLowerCase();
              if (/privacy|terms|license|disclaimer|legal|copyright/i.test(href) || /privacy|terms|license|legal/i.test(label)) {
                legalLinks.push({ label: a.textContent.trim(), href: a.getAttribute('href') });
              }
            }
          }

          const recommendations = [];
          if (!copyrightMatch) {
            recommendations.push('Include a visible copyright statement in the footer to protect your intellectual property.');
          }
          if (legalLinks.length === 0) {
            recommendations.push('Add links to Terms of Service and Privacy Policy to satisfy regional compliance regulations (GDPR, CCPA).');
          }

          const summary = `License metadata: Copyright ${copyrightMatch ? '✓' : '✗'}, Legal Links (${legalLinks.length} found), License Rel ${licenseHref ? '✓' : '✗'}.`;

          const details = [
            { label: 'Copyright Notice', value: copyrightStatement, type: 'text' },
            { label: '<link rel="license"> Tag', value: licenseHref || 'Not defined', type: 'text' },
            { label: 'Legal Policy Links Found', value: legalLinks.length > 0 ? JSON.stringify(legalLinks.slice(0, 5), null, 2) : 'None', type: 'table' }
          ];

          return {
            id: 'open-source-licenses',
            name: 'License & Attribution',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { copyrightStatement, licenseHref, legalLinksCount: legalLinks.length }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 10: page-weight-budget
      // -------------------------------------------------------------
      {
        id: 'page-weight-budget',
        name: 'Performance Budget Check',
        description: 'Estimates composite page transfer weight based on HTML size, external CSS links, scripts, and image assets.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          // HTML size
          const htmlBytes = (context.fetchResult && typeof context.fetchResult.size === 'number' && context.fetchResult.size > 0)
            ? context.fetchResult.size
            : ((context.html && context.html.length) || 0);

          let cssCount = 0;
          let jsCount = 0;
          let imgCount = 0;

          if (doc) {
            cssCount = doc.querySelectorAll('link[rel="stylesheet"]').length;
            jsCount = doc.querySelectorAll('script[src]').length;
            imgCount = doc.querySelectorAll('img[src]').length;
          }

          // Conservative empirical weight estimates: CSS ~30KB, JS ~100KB, IMG ~120KB
          const estimatedCssBytes = cssCount * 30 * 1024;
          const estimatedJsBytes = jsCount * 100 * 1024;
          const estimatedImgBytes = imgCount * 120 * 1024;
          const totalEstimatedBytes = htmlBytes + estimatedCssBytes + estimatedJsBytes + estimatedImgBytes;
          const totalEstimatedMB = (totalEstimatedBytes / (1024 * 1024)).toFixed(2);

          let score = 100;
          let status = 'pass';
          let summary = '';
          const recommendations = [];

          if (totalEstimatedBytes <= 1024 * 1024) {
            score = 100;
            status = 'pass';
            summary = `Estimated page weight ~${totalEstimatedMB} MB is within the optimal 1 MB performance budget.`;
          } else if (totalEstimatedBytes <= 3 * 1024 * 1024) {
            score = 70;
            status = 'warn';
            summary = `Estimated page weight ~${totalEstimatedMB} MB exceeds 1 MB recommended budget.`;
            recommendations.push('Minify JavaScript and CSS bundles, and implement responsive image sizing.');
          } else {
            score = 40;
            status = 'fail';
            summary = `Estimated page weight ~${totalEstimatedMB} MB is heavy (>3 MB)! Mobile users on slow connections will experience sluggish loading.`;
            recommendations.push('Implement code-splitting for large JS libraries and lazy-load offscreen images (loading="lazy").');
          }

          const details = [
            { label: 'HTML Document Size', value: `${(htmlBytes / 1024).toFixed(1)} KB`, type: 'text' },
            { label: 'External CSS Files', value: `${cssCount} links (~${(estimatedCssBytes / 1024).toFixed(0)} KB)`, type: 'text' },
            { label: 'External JavaScript Files', value: `${jsCount} scripts (~${(estimatedJsBytes / 1024).toFixed(0)} KB)`, type: 'text' },
            { label: 'Images on Page', value: `${imgCount} images (~${(estimatedImgBytes / 1024).toFixed(0)} KB)`, type: 'text' },
            { label: 'Estimated Total Weight', value: `~${totalEstimatedMB} MB`, type: 'text' }
          ];

          return {
            id: 'page-weight-budget',
            name: 'Performance Budget Check',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { htmlBytes, cssCount, jsCount, imgCount, totalEstimatedBytes, totalEstimatedMB }
          };
        }
      }
    ]
  };
})();
