/**
 * VeriQ - Website Testing Suite
 * Module 05: Compatibility Testing
 *
 * Inspects cross-device viewport configuration, responsive media queries and breakpoints,
 * modern HTML5 semantic feature adoption, touch-friendly touch targets and gestures,
 * print stylesheets, Open Graph & Twitter social sharing cards, favicon icons,
 * deprecated/obsolete HTML markup, outdated CSS vendor prefixes, and runner client browser specs.
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

  function getBaseUrl(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch (e) {
      return url || '';
    }
  }

  async function fetchViaProxy(url, timeoutMs = 6000) {
    if (window.VeriQ && window.VeriQ.core && window.VeriQ.core.fetcher) {
      try {
        const res = await window.VeriQ.core.fetcher.fetch(url, { timeout: timeoutMs });
        return {
          ok: res.status >= 200 && res.status < 400,
          status: res.status,
          contents: res.body || '',
          headers: res.headers || {}
        };
      } catch (e) {
        return { ok: false, status: 0, contents: null };
      }
    }
    try {
      const resp = await fetch(url, { mode: 'no-cors' });
      return { ok: true, status: 200, contents: '' };
    } catch (err) {
      return { ok: false, status: 0, contents: null };
    }
  }

  // --- Module Registration ---
  VeriQ.modules['05-compatibility'] = {
    id: '05-compatibility',
    name: 'Compatibility Testing',
    icon: '🖥️',
    color: '#06B6D4',
    description: 'Inspects cross-device viewport configuration, responsive breakpoints, HTML5 feature support, social sharing metadata, and deprecated markup.',
    tests: [
      // 1. Viewport Configuration
      {
        id: 'viewport-meta',
        name: 'Viewport Configuration',
        description: 'Verifies the viewport meta tag is properly tuned for fluid mobile and multi-device rendering.',
        helpText: 'A responsive viewport ensures tablets, smartphones, and foldables scale content fluidly to match screen widths.',
        type: 'auto',
        tags: ['mobile', 'responsive', 'viewport', 'meta'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'viewport-meta',
              name: 'Viewport Configuration',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const viewportMeta = doc.querySelector('meta[name="viewport"]');
          if (!viewportMeta) {
            return {
              id: 'viewport-meta',
              name: 'Viewport Configuration',
              status: 'fail',
              score: 0,
              summary: 'Missing <meta name="viewport"> tag. The layout will default to desktop mode on mobile screens.',
              details: [{ label: 'Viewport Meta', value: 'Not found', type: 'text' }],
              recommendations: ['Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside <head>.'],
              duration: Date.now() - start,
              raw: { hasViewport: false }
            };
          }

          const content = (viewportMeta.getAttribute('content') || '').toLowerCase();
          const hasWidthDevice = content.includes('width=device-width');
          const hasInitialScale = /initial-scale\s*=\s*1(\.0)?/.test(content);
          const hasNoZoom = /user-scalable\s*=\s*(no|0)/.test(content) || /maximum-scale\s*=\s*1(\.0)?/.test(content);

          let score = 100;
          const issues = [];
          const recs = [];

          if (!hasWidthDevice) {
            score -= 40;
            issues.push('Missing "width=device-width"');
            recs.push('Set width=device-width so the page adapts to the device screen width.');
          }
          if (!hasInitialScale) {
            score -= 15;
            issues.push('Missing "initial-scale=1.0"');
            recs.push('Set initial-scale=1.0 to establish a 1:1 relationship between CSS pixels and device-independent pixels.');
          }
          if (hasNoZoom) {
            score -= 30;
            issues.push('Zoom restrictions detected (user-scalable=no or maximum-scale=1)');
            recs.push('Remove zoom locks to permit low-vision users to pinch-to-zoom.');
          }

          score = Math.max(0, score);
          const status = score === 100 ? 'pass' : (score >= 60 ? 'warn' : 'fail');
          const summary = issues.length === 0
            ? 'Viewport is fully optimized for fluid multi-device scaling.'
            : `Viewport tag has ${issues.length} defect(s): ${issues.join(', ')}.`;

          return {
            id: 'viewport-meta',
            name: 'Viewport Configuration',
            status,
            score,
            summary,
            details: [
              { label: 'Viewport Content', value: viewportMeta.getAttribute('content'), type: 'code' },
              { label: 'width=device-width', value: hasWidthDevice ? 'Present' : 'Missing', type: 'text' },
              { label: 'initial-scale=1', value: hasInitialScale ? 'Present' : 'Missing', type: 'text' },
              { label: 'Zoom Restriction', value: hasNoZoom ? 'Blocked (Anti-pattern)' : 'Unrestricted (Good)', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Viewport conforms to cross-device compatibility standards.'],
            duration: Date.now() - start,
            raw: { content, hasWidthDevice, hasInitialScale, hasNoZoom, score }
          };
        }
      },

      // 2. Responsive CSS Media Queries
      {
        id: 'responsive-meta-query',
        name: 'Responsive CSS Media Queries',
        description: 'Scans inline stylesheets for CSS @media rules and common responsive device breakpoints.',
        helpText: 'CSS media queries reconfigure navigation menus, grids, and typography to fit small mobile and wide desktop monitors.',
        type: 'auto',
        tags: ['css', 'media-queries', 'breakpoints', 'responsive'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'responsive-meta-query',
              name: 'Responsive CSS Media Queries',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const styleTags = Array.from(doc.querySelectorAll('style'));
          const linkTags = Array.from(doc.querySelectorAll('link[rel="stylesheet"][media]'));

          const mediaQueriesFound = [];
          const breakpointsFound = new Set();

          // Scan <style> tags
          styleTags.forEach(s => {
            const css = s.textContent || '';
            const mqRegex = /@media[^{]+\{/gi;
            let match;
            while ((match = mqRegex.exec(css)) !== null) {
              const rule = match[0].replace(/\{$/, '').trim();
              mediaQueriesFound.push(rule);

              // Extract px breakpoints
              const pxMatches = rule.match(/\d+px/gi) || [];
              pxMatches.forEach(bp => breakpointsFound.add(bp.toLowerCase()));
            }
          });

          // Scan <link media="..."> tags
          linkTags.forEach(l => {
            const media = l.getAttribute('media') || '';
            if (media && media !== 'all' && media !== 'print') {
              mediaQueriesFound.push(`Link stylesheet: ${media}`);
              const pxMatches = media.match(/\d+px/gi) || [];
              pxMatches.forEach(bp => breakpointsFound.add(bp.toLowerCase()));
            }
          });

          const count = mediaQueriesFound.length;
          const bpList = Array.from(breakpointsFound);

          const isResponsive = count > 0;
          const score = isResponsive ? 100 : 70;
          const status = isResponsive ? 'pass' : 'info';

          const summary = isResponsive
            ? `Detected ${count} media query declaration(s) across breakpoints: ${bpList.slice(0, 5).join(', ') || 'fluid rules'}.`
            : 'No media queries detected in inline <style> tags (media queries may be hosted in external CSS files).';

          const sampleRows = [['Query Type', 'Media Rule Expression']];
          mediaQueriesFound.slice(0, 15).forEach(mq => {
            sampleRows.push(['@media rule', mq.length > 60 ? mq.slice(0, 60) + '…' : mq]);
          });

          const recs = [];
          if (!isResponsive) {
            recs.push('Ensure your external CSS includes media queries targeting common breakpoints (e.g. 768px tablets, 1024px desktops).');
          }

          return {
            id: 'responsive-meta-query',
            name: 'Responsive CSS Media Queries',
            status,
            score,
            summary,
            details: [
              { label: 'Media Queries Detected', value: `${count} query rules`, type: 'text' },
              { label: 'Identified Breakpoints', value: bpList.length ? bpList.join(', ') : 'None in inline styles', type: 'text' },
              ...(sampleRows.length > 1 ? [{ label: 'Sample Media Queries', value: sampleRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['Responsive styling and multi-breakpoint layouts are configured.'],
            duration: Date.now() - start,
            raw: { count, breakpoints: bpList }
          };
        }
      },

      // 3. Modern Browser Feature Usage
      {
        id: 'browser-compatibility-features',
        name: 'Modern Browser Feature Usage',
        description: 'Audits HTML5 semantic elements (<picture>, <dialog>, <details>, <video>, <canvas>) in page source.',
        helpText: 'Modern HTML5 elements provide native accessibility, reduce JavaScript bloat, and perform better across browsers.',
        type: 'auto',
        tags: ['html5', 'semantics', 'picture', 'dialog', 'features'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'browser-compatibility-features',
              name: 'Modern Browser Feature Usage',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const featuresToCheck = [
            { tag: 'picture', name: 'Responsive <picture>', purpose: 'Art direction and format fallback' },
            { tag: 'dialog', name: 'Native <dialog>', purpose: 'Accessible native modal dialogs' },
            { tag: 'details', name: 'Interactive <details>/<summary>', purpose: 'Native collapsible accordions' },
            { tag: 'video', name: 'HTML5 <video>', purpose: 'Plugin-free video playback' },
            { tag: 'canvas', name: 'HTML5 <canvas>', purpose: 'Hardware-accelerated 2D/3D graphics' },
            { tag: 'main', name: 'Semantic <main>', purpose: 'Primary content landmark' },
            { tag: 'article', name: 'Semantic <article>', purpose: 'Independent reusable content' },
            { tag: 'section', name: 'Semantic <section>', purpose: 'Thematic grouping of content' },
            { tag: 'aside', name: 'Semantic <aside>', purpose: 'Tangentially related content / sidebar' },
            { tag: 'nav', name: 'Semantic <nav>', purpose: 'Navigation landmark' },
            { tag: 'figure', name: 'Semantic <figure>/<figcaption>', purpose: 'Self-contained illustrative media' }
          ];

          const featureRows = [['Feature / Element', 'Detected Count', 'Purpose & Browser Support', 'Status']];
          let detectedCount = 0;

          featuresToCheck.forEach(item => {
            const count = doc.querySelectorAll(item.tag).length;
            if (count > 0) detectedCount++;
            featureRows.push([
              item.name,
              `${count}`,
              item.purpose,
              count > 0 ? '✅ In Use' : 'Not used'
            ]);
          });

          return {
            id: 'browser-compatibility-features',
            name: 'Modern Browser Feature Usage',
            status: 'info',
            score: 100,
            summary: `Identified ${detectedCount} modern HTML5 semantic feature(s) actively deployed in document.`,
            details: [
              { label: 'Modern Features Adopted', value: `${detectedCount} of ${featuresToCheck.length} checked features`, type: 'text' },
              { label: 'Feature Inventory', value: featureRows, type: 'table' }
            ],
            recommendations: ['Continue adopting semantic HTML5 native elements like <dialog> and <picture>.'],
            duration: Date.now() - start,
            raw: { detectedCount, totalChecked: featuresToCheck.length }
          };
        }
      },

      // 4. Touch-Friendly Design
      {
        id: 'touch-friendly',
        name: 'Touch-Friendly Design',
        description: 'Examines touch screen indicators: pointer:coarse media queries, touch-action CSS, and tap target sizing.',
        helpText: 'Interactive buttons and links need adequate touch target sizing (minimum 44x44px or 48x48px) for accurate tapping on phones.',
        type: 'auto',
        tags: ['touch', 'mobile', 'tap-targets', 'gestures'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'touch-friendly',
              name: 'Touch-Friendly Design',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          let hasPointerCoarse = false;
          let hasTouchAction = false;
          let tinyTargetsCount = 0;

          // Scan style tags
          const styles = doc.querySelectorAll('style');
          styles.forEach(s => {
            const css = s.textContent || '';
            if (/pointer\s*:\s*coarse/i.test(css)) hasPointerCoarse = true;
            if (/touch-action\s*:/i.test(css)) hasTouchAction = true;
          });

          // Check interactive elements for small inline height/width (< 32px)
          const interactives = Array.from(doc.querySelectorAll('button[style], a[style]'));
          interactives.forEach(el => {
            const style = el.getAttribute('style') || '';
            const hMatch = style.match(/(?:^|;)\s*height\s*:\s*(\d+)px/i);
            const wMatch = style.match(/(?:^|;)\s*width\s*:\s*(\d+)px/i);

            if (hMatch && parseInt(hMatch[1], 10) < 32 && wMatch && parseInt(wMatch[1], 10) < 32) {
              tinyTargetsCount++;
            }
          });

          const hasViewport = !!doc.querySelector('meta[name="viewport"]');

          let score = 100;
          if (!hasViewport) score -= 30;
          if (tinyTargetsCount > 0) score -= Math.min(30, tinyTargetsCount * 10);
          score = Math.max(0, score);

          const status = score >= 85 ? 'pass' : (score >= 60 ? 'warn' : 'fail');
          const summary = `Touch readiness: Viewport configured (${hasViewport ? 'Yes' : 'No'}), coarse pointer styles (${hasPointerCoarse ? 'Yes' : 'No'}), ${tinyTargetsCount} tiny inline tap targets.`;

          const recs = [];
          if (tinyTargetsCount > 0) {
            recs.push('Enlarge clickable buttons and links to at least 44x44 CSS pixels to satisfy touch accessibility requirements.');
          }
          if (!hasPointerCoarse) {
            recs.push('Utilize @media (pointer: coarse) in your CSS to enlarge hit targets and padding on touchscreen devices.');
          }

          return {
            id: 'touch-friendly',
            name: 'Touch-Friendly Design',
            status,
            score,
            summary,
            details: [
              { label: 'Mobile Viewport', value: hasViewport ? 'Configured' : 'Missing', type: 'text' },
              { label: '@media (pointer: coarse)', value: hasPointerCoarse ? 'Implemented' : 'Not detected in inline styles', type: 'text' },
              { label: 'touch-action CSS Property', value: hasTouchAction ? 'Present' : 'Default gesture behavior', type: 'text' },
              { label: 'Tiny Tap Targets (<32px)', value: `${tinyTargetsCount} elements flagged`, type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Touch ergonomics and tap target sizes follow mobile UX guidelines.'],
            duration: Date.now() - start,
            raw: { hasViewport, hasPointerCoarse, hasTouchAction, tinyTargetsCount, score }
          };
        }
      },

      // 5. Print Stylesheet
      {
        id: 'print-styles',
        name: 'Print Stylesheet',
        description: 'Checks for dedicated print media styles (<link media="print"> or @media print in CSS).',
        helpText: 'Print stylesheets hide unnecessary navigation, sidebars, and dark backgrounds when users print or save as PDF.',
        type: 'auto',
        tags: ['print', 'media-queries', 'pdf', 'styling'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'print-styles',
              name: 'Print Stylesheet',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const hasPrintLink = !!doc.querySelector('link[rel="stylesheet"][media*="print"]');
          let hasPrintMedia = false;

          const styles = doc.querySelectorAll('style');
          styles.forEach(s => {
            if (/@media\s+print/i.test(s.textContent || '')) {
              hasPrintMedia = true;
            }
          });

          const hasPrintStyles = hasPrintLink || hasPrintMedia;
          const score = hasPrintStyles ? 100 : 50;
          const status = hasPrintStyles ? 'pass' : 'warn';
          const summary = hasPrintStyles
            ? 'Print styles detected. Document adapts cleanly when printed or exported as PDF.'
            : 'No print stylesheet or @media print rules found in HTML document.';

          const recs = [];
          if (!hasPrintStyles) {
            recs.push('Add an @media print { nav, footer, .sidebar, .ads { display: none !important; } } rule so pages print cleanly without wasting ink.');
          }

          return {
            id: 'print-styles',
            name: 'Print Stylesheet',
            status,
            score,
            summary,
            details: [
              { label: '<link media="print">', value: hasPrintLink ? 'Present' : 'Not linked', type: 'text' },
              { label: '@media print in <style>', value: hasPrintMedia ? 'Present' : 'Not found in inline styles', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Print stylesheet configuration is present.'],
            duration: Date.now() - start,
            raw: { hasPrintLink, hasPrintMedia, hasPrintStyles, score }
          };
        }
      },

      // 6. Social Media Preview Tags
      {
        id: 'social-media-meta',
        name: 'Social Media Preview Tags',
        description: 'Audits Open Graph (og:*) and Twitter Card (twitter:*) metadata tags for rich social sharing cards.',
        helpText: 'When pages are shared on LinkedIn, Slack, Twitter/X, or Facebook, social tags generate rich preview images and titles.',
        type: 'auto',
        tags: ['open-graph', 'twitter-card', 'social', 'metadata', 'seo'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'social-media-meta',
              name: 'Social Media Preview Tags',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          function getMeta(propertyOrName) {
            const el = doc.querySelector(`meta[property="${propertyOrName}" i], meta[name="${propertyOrName}" i]`);
            return el ? (el.getAttribute('content') || '').trim() : '';
          }

          const ogTitle = getMeta('og:title');
          const ogDesc = getMeta('og:description');
          const ogImage = getMeta('og:image');
          const ogUrl = getMeta('og:url');

          const twCard = getMeta('twitter:card');
          const twTitle = getMeta('twitter:title');
          const twDesc = getMeta('twitter:description');
          const twImage = getMeta('twitter:image');

          const hasOg = !!(ogTitle && (ogImage || ogDesc));
          const hasTw = !!(twCard || twTitle);

          let score = 25;
          let status = 'fail';
          let summary = '';

          if (hasOg && hasTw) {
            score = 100;
            status = 'pass';
            summary = 'Complete Open Graph and Twitter Card metadata present for rich social sharing cards.';
          } else if (hasOg) {
            score = 75;
            status = 'warn';
            summary = 'Open Graph tags present, but dedicated Twitter Card metadata is missing.';
          } else if (hasTw) {
            score = 50;
            status = 'warn';
            summary = 'Twitter Card metadata present, but Open Graph (Facebook/LinkedIn) tags are missing.';
          } else {
            score = 25;
            status = 'fail';
            summary = 'Missing social media preview tags (no Open Graph or Twitter metadata).';
          }

          const rows = [
            ['Tag Property', 'Found Content Value', 'Presence Status'],
            ['og:title', ogTitle || '[Missing]', ogTitle ? '✅ Pass' : '❌ Missing'],
            ['og:description', ogDesc ? ogDesc.slice(0, 45) + '…' : '[Missing]', ogDesc ? '✅ Pass' : '❌ Missing'],
            ['og:image', ogImage ? ogImage.slice(0, 45) + '…' : '[Missing]', ogImage ? '✅ Pass' : '❌ Missing'],
            ['og:url', ogUrl || '[Missing]', ogUrl ? '✅ Pass' : '⚠️ Optional'],
            ['twitter:card', twCard || '[Missing]', twCard ? '✅ Pass' : '❌ Missing'],
            ['twitter:title', twTitle || '[Missing]', twTitle ? '✅ Pass' : '⚠️ Fallback to og:title'],
            ['twitter:image', twImage ? twImage.slice(0, 45) + '…' : '[Missing]', twImage ? '✅ Pass' : '⚠️ Fallback to og:image']
          ];

          const recs = [];
          if (!ogTitle || !ogImage) {
            recs.push('Add <meta property="og:title" content="..."> and <meta property="og:image" content="..."> for rich link previews.');
          }
          if (!twCard) {
            recs.push('Add <meta name="twitter:card" content="summary_large_image"> to display full-width preview banners on Twitter/X.');
          }

          return {
            id: 'social-media-meta',
            name: 'Social Media Preview Tags',
            status,
            score,
            summary,
            details: [
              { label: 'Open Graph Support', value: hasOg ? 'Configured' : 'Incomplete / Missing', type: 'text' },
              { label: 'Twitter Card Support', value: hasTw ? 'Configured' : 'Incomplete / Missing', type: 'text' },
              { label: 'Social Tags Audit', value: rows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['Social sharing cards are configured with titles, descriptions, and preview images.'],
            duration: Date.now() - start,
            raw: { ogTitle, ogDesc, ogImage, twCard, hasOg, hasTw, score }
          };
        }
      },

      // 7. Favicon
      {
        id: 'favicon',
        name: 'Favicon',
        description: 'Verifies the presence of standard web favicons and Apple Touch Icons for iOS home screens.',
        helpText: 'A crisp favicon identifies the site in crowded browser tabs, bookmarks, and mobile home screen shortcuts.',
        type: 'auto',
        tags: ['favicon', 'icon', 'apple-touch-icon', 'branding'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);
          const baseUrl = getBaseUrl(context?.url || '');

          if (!doc) {
            return {
              id: 'favicon',
              name: 'Favicon',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const icon = doc.querySelector('link[rel="icon" i], link[rel="shortcut icon" i]');
          const appleIcon = doc.querySelector('link[rel="apple-touch-icon" i]');
          const manifest = doc.querySelector('link[rel="manifest" i]');

          const hasIcon = !!icon;
          const hasApple = !!appleIcon;

          let score = 0;
          let status = 'fail';
          let summary = '';

          if (hasIcon && hasApple) {
            score = 100;
            status = 'pass';
            summary = 'Both standard browser favicon and Apple Touch Icon are declared in <head>.';
          } else if (hasIcon) {
            score = 75;
            status = 'pass';
            summary = 'Standard favicon found, but Apple Touch Icon for iOS mobile bookmarks is missing.';
          } else if (hasApple) {
            score = 50;
            status = 'warn';
            summary = 'Apple Touch Icon declared, but standard <link rel="icon"> is missing.';
          } else {
            score = 0;
            status = 'fail';
            summary = 'No favicon or Apple Touch Icon links found in <head>.';
          }

          const rows = [
            ['Icon Type', 'Found Link Target', 'Status'],
            ['Standard Favicon (<link rel="icon">)', icon ? icon.getAttribute('href') : '[None]', hasIcon ? '✅ Declared' : '❌ Missing'],
            ['Apple Touch Icon (<link rel="apple-touch-icon">)', appleIcon ? appleIcon.getAttribute('href') : '[None]', hasApple ? '✅ Declared' : '⚠️ Missing'],
            ['Web App Manifest (<link rel="manifest">)', manifest ? manifest.getAttribute('href') : '[None]', manifest ? '✅ Declared' : 'Optional']
          ];

          const recs = [];
          if (!hasIcon) {
            recs.push('Add <link rel="icon" type="image/svg+xml" href="/favicon.svg"> and /favicon.ico for browser tabs.');
          }
          if (!hasApple) {
            recs.push('Add <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"> for high-resolution iOS icons.');
          }

          return {
            id: 'favicon',
            name: 'Favicon',
            status,
            score,
            summary,
            details: [
              { label: 'Favicon Link', value: icon ? icon.getAttribute('href') : 'Missing', type: 'text' },
              { label: 'Apple Touch Icon', value: appleIcon ? appleIcon.getAttribute('href') : 'Missing', type: 'text' },
              { label: 'Icon Links Breakdown', value: rows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['Site icons are configured across desktop and mobile platforms.'],
            duration: Date.now() - start,
            raw: { hasIcon, hasApple, hasManifest: !!manifest, score }
          };
        }
      },

      // 8. Deprecated HTML Elements
      {
        id: 'deprecated-html',
        name: 'Deprecated HTML Elements',
        description: 'Scans for obsolete HTML tags (<font>, <center>, <marquee>, <blink>) and table-based layout abuses.',
        helpText: 'Deprecated elements violate modern HTML5 standards, render inconsistently, and degrade accessibility.',
        type: 'auto',
        tags: ['deprecated', 'obsolete', 'html5', 'markup-cleanliness'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'deprecated-html',
              name: 'Deprecated HTML Elements',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const obsoleteTags = ['font', 'center', 'marquee', 'blink', 'frame', 'frameset', 'big', 'strike', 'tt', 'acronym', 'applet', 'basefont', 'dir', 'isindex', 'noframes'];
          const deprecatedFindings = [];
          const rows = [['Tag / Attribute', 'Count Detected', 'Modern Standard Replacement']];

          obsoleteTags.forEach(tag => {
            const count = doc.querySelectorAll(tag).length;
            if (count > 0) {
              deprecatedFindings.push({ type: `<${tag}>`, count, replacement: 'Modern CSS styling or semantic elements' });
              rows.push([`<${tag}>`, `${count}`, `Replace with CSS styling or semantic alternatives`]);
            }
          });

          // Check deprecated attributes: bgcolor, border on non-table, align
          const elementsWithBgcolor = doc.querySelectorAll('[bgcolor]').length;
          const elementsWithAlign = doc.querySelectorAll('[align]').length;

          if (elementsWithBgcolor > 0) {
            deprecatedFindings.push({ type: 'bgcolor attribute', count: elementsWithBgcolor, replacement: 'CSS background-color' });
            rows.push(['[bgcolor] attribute', `${elementsWithBgcolor}`, 'CSS background-color']);
          }
          if (elementsWithAlign > 0) {
            deprecatedFindings.push({ type: 'align attribute', count: elementsWithAlign, replacement: 'CSS text-align / flexbox' });
            rows.push(['[align] attribute', `${elementsWithAlign}`, 'CSS text-align or margin: 0 auto']);
          }

          // Table layout heuristic: <table> with no <th> containing nested divs
          const tables = Array.from(doc.querySelectorAll('table'));
          let layoutTableCount = 0;
          tables.forEach(t => {
            if (t.querySelectorAll('th').length === 0 && t.querySelectorAll('div, table').length > 4) {
              layoutTableCount++;
            }
          });

          if (layoutTableCount > 0) {
            deprecatedFindings.push({ type: 'Table-based layout', count: layoutTableCount, replacement: 'CSS Grid or Flexbox' });
            rows.push(['Layout <table>', `${layoutTableCount}`, 'CSS Grid or Flexbox container']);
          }

          const totalDeprecated = deprecatedFindings.reduce((acc, f) => acc + f.count, 0);
          const score = Math.max(0, 100 - (totalDeprecated * 15));
          const status = totalDeprecated === 0 ? 'pass' : (score >= 60 ? 'warn' : 'fail');

          const summary = totalDeprecated === 0
            ? 'Zero deprecated HTML elements or obsolete presentation attributes found.'
            : `Detected ${totalDeprecated} instance(s) of obsolete HTML markup or deprecated attributes.`;

          const recs = [];
          if (totalDeprecated > 0) {
            recs.push('Replace obsolete HTML tags (<font>, <center>, <marquee>) with modern CSS presentation rules.');
            recs.push('Replace table-based layouts with CSS Grid and Flexbox.');
          }

          return {
            id: 'deprecated-html',
            name: 'Deprecated HTML Elements',
            status,
            score,
            summary,
            details: [
              { label: 'Obsolete Markup Count', value: `${totalDeprecated} issue(s)`, type: 'text' },
              ...(rows.length > 1 ? [{ label: 'Deprecated Elements Audit', value: rows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['Document markup strictly complies with modern HTML5 living standards.'],
            duration: Date.now() - start,
            raw: { totalDeprecated, deprecatedFindings, score }
          };
        }
      },

      // 9. CSS Vendor Prefixes
      {
        id: 'css-vendor-prefixes',
        name: 'CSS Vendor Prefixes',
        description: 'Scans inline CSS for obsolete vendor prefixes (-webkit-, -moz-, -ms-) on standardized properties.',
        helpText: 'Properties like border-radius, box-shadow, and transition are standardized across all browsers and no longer need prefixes.',
        type: 'auto',
        tags: ['css', 'vendor-prefixes', 'cross-browser', 'clean-code'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'css-vendor-prefixes',
              name: 'CSS Vendor Prefixes',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const obsoletePrefixList = [
            '-webkit-border-radius', '-moz-border-radius',
            '-webkit-box-shadow', '-moz-box-shadow',
            '-webkit-transition', '-moz-transition', '-o-transition',
            '-webkit-transform', '-moz-transform', '-ms-transform', '-o-transform',
            '-webkit-animation', '-moz-animation',
            '-webkit-opacity', '-moz-opacity',
            '-ms-flex', '-webkit-box-sizing', '-moz-box-sizing'
          ];

          const prefixCounts = {};
          let totalObsolete = 0;

          const styles = doc.querySelectorAll('style');
          styles.forEach(s => {
            const css = (s.textContent || '').toLowerCase();
            obsoletePrefixList.forEach(prop => {
              const regex = new RegExp(prop.replace('-', '\\-'), 'g');
              const matches = css.match(regex);
              if (matches) {
                prefixCounts[prop] = (prefixCounts[prop] || 0) + matches.length;
                totalObsolete += matches.length;
              }
            });
          });

          const rows = [['Outdated Prefixed Property', 'Occurrences in <style>', 'Standard Modern Property']];
          Object.keys(prefixCounts).forEach(prop => {
            const standard = prop.replace(/^-(webkit|moz|ms|o)-/, '');
            rows.push([prop, `${prefixCounts[prop]}`, standard]);
          });

          const summary = totalObsolete === 0
            ? 'No obsolete CSS vendor prefixes detected in inline stylesheets.'
            : `Detected ${totalObsolete} obsolete vendor prefix(es) in inline CSS that can be safely removed.`;

          const recs = [];
          if (totalObsolete > 0) {
            recs.push('Use an automated build tool like Autoprefixer to strip obsolete vendor prefixes and only include necessary ones.');
          }

          return {
            id: 'css-vendor-prefixes',
            name: 'CSS Vendor Prefixes',
            status: 'info',
            score: 100,
            summary,
            details: [
              { label: 'Outdated Prefixes Count', value: `${totalObsolete} occurrences`, type: 'text' },
              ...(rows.length > 1 ? [{ label: 'Prefix Breakdown', value: rows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['CSS properties use clean standardized syntax.'],
            duration: Date.now() - start,
            raw: { totalObsolete, prefixCounts }
          };
        }
      },

      // 10. Current Browser Info
      {
        id: 'browser-current',
        name: 'Current Browser Info',
        description: 'Reports execution runtime browser specifications, platform capabilities, and modern API support.',
        helpText: 'Displays the client engine executing tests to ensure consistent testing environment baselines.',
        type: 'auto',
        tags: ['client', 'environment', 'browser', 'capabilities'],
        async run(context) {
          const start = Date.now();

          const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'Unknown';
          const platform = (typeof navigator !== 'undefined' && (navigator.userAgentData?.platform || navigator.platform)) ? (navigator.userAgentData?.platform || navigator.platform) : 'Unknown';
          const language = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en';

          // Feature support detection in current browser
          const supportsGrid = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('display', 'grid');
          const supportsFlex = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('display', 'flex');
          const supportsAspectRatio = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('aspect-ratio', '1 / 1');
          const supportsServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
          const supportsWebAssembly = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
          const supportsFetch = typeof fetch === 'function';
          const supportsIntersectionObserver = typeof IntersectionObserver === 'function';

          const capabilitiesTable = [
            ['Web Capability / API', 'Current Browser Support', 'Standard Level'],
            ['CSS Grid (display: grid)', supportsGrid ? '✅ Supported' : '❌ Unsupported', 'W3C Recommendation'],
            ['CSS Flexbox (display: flex)', supportsFlex ? '✅ Supported' : '❌ Unsupported', 'W3C Recommendation'],
            ['CSS aspect-ratio', supportsAspectRatio ? '✅ Supported' : '❌ Unsupported', 'CSS Box Sizing Level 4'],
            ['Fetch API (window.fetch)', supportsFetch ? '✅ Supported' : '❌ Unsupported', 'WHATWG Living Standard'],
            ['Service Workers', supportsServiceWorker ? '✅ Supported' : '❌ Unsupported', 'W3C Recommendation'],
            ['IntersectionObserver', supportsIntersectionObserver ? '✅ Supported' : '❌ Unsupported', 'W3C Candidate'],
            ['WebAssembly (Wasm)', supportsWebAssembly ? '✅ Supported' : '❌ Unsupported', 'W3C Recommendation']
          ];

          return {
            id: 'browser-current',
            name: 'Current Browser Info',
            status: 'info',
            score: 100,
            summary: `Test runner environment: ${platform} (${language}) with full modern API support.`,
            details: [
              { label: 'User Agent', value: ua, type: 'text' },
              { label: 'Operating Platform', value: platform, type: 'text' },
              { label: 'Client Locale', value: language, type: 'text' },
              { label: 'Browser API Capabilities', value: capabilitiesTable, type: 'table' }
            ],
            recommendations: ['Test runner client meets modern browser standards.'],
            duration: Date.now() - start,
            raw: { ua, platform, language, supportsGrid, supportsFlex, supportsServiceWorker, supportsWebAssembly }
          };
        }
      }
    ]
  };
})();
