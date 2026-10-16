/**
 * VeriQ - Website Testing Suite
 * Module 08: Localization Testing
 *
 * Tests language attributes, character encoding, multi-language hreflang tags,
 * bidirectional text support (RTL), international date/currency formats,
 * Unicode fidelity, and translation readiness.
 */

window.VeriQ = window.VeriQ || {};
window.VeriQ.modules = window.VeriQ.modules || {};

(function () {
  'use strict';

  const VeriQ = window.VeriQ;

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

  VeriQ.modules['08-localization'] = {
    id: '08-localization',
    name: 'Localization Testing',
    icon: '🌍',
    color: '#EC4899',
    description: 'Tests language attributes, character encoding, multi-language hreflang tags, bidirectional text support (RTL), international date/currency formats, Unicode fidelity, and translation readiness.',
    tests: [
      // -------------------------------------------------------------
      // Test 1: html-lang
      // -------------------------------------------------------------
      {
        id: 'html-lang',
        name: 'HTML Language Attribute',
        description: 'Verifies the <html> element declares a valid BCP 47 language code for accessibility and SEO.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'html-lang',
              name: 'HTML Language Attribute',
              status: 'error',
              score: null,
              summary: 'Document unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const htmlEl = doc.querySelector('html');
          const lang = htmlEl ? (htmlEl.getAttribute('lang') || '').trim() : '';

          // BCP 47 format: 2-3 letters, optional subtags (e.g., en, en-US, zh-Hans-CN, pt-BR)
          const bcp47Regex = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
          const isValidFormat = bcp47Regex.test(lang);

          // Language heuristics: sample visible words to check alignment
          const textSample = (doc.body ? doc.body.textContent : '').toLowerCase().slice(0, 3000);
          const langIndicators = {
            en: ['the', 'and', 'with', 'from', 'this', 'that', 'have', 'for'],
            es: ['que', 'con', 'para', 'este', 'por', 'como', 'los', 'las'],
            fr: ['que', 'dans', 'pour', 'avec', 'les', 'des', 'est', 'une'],
            de: ['und', 'der', 'die', 'das', 'mit', 'auf', 'für', 'von'],
            pt: ['com', 'para', 'este', 'uma', 'dos', 'das', 'não', 'mais'],
            it: ['che', 'con', 'per', 'questo', 'della', 'delle', 'sono', 'nel']
          };

          let primaryCode = lang.split('-')[0].toLowerCase();
          let wordMatches = 0;
          if (langIndicators[primaryCode]) {
            for (const word of langIndicators[primaryCode]) {
              const reg = new RegExp(`\\b${word}\\b`, 'i');
              if (reg.test(textSample)) wordMatches++;
            }
          }

          let score = 0;
          let status = 'fail';
          let summary = '';
          const recommendations = [];

          if (!lang) {
            score = 0;
            status = 'fail';
            summary = 'Missing: <html lang="..."> attribute is not defined.';
            recommendations.push('Add a valid lang attribute to the <html> root tag (e.g. <html lang="en">). This is critical for screen readers, automated translation, and search engines.');
          } else if (!isValidFormat) {
            score = 40;
            status = 'warn';
            summary = `Invalid format: "${lang}" is not a valid BCP 47 language tag.`;
            recommendations.push('Format language code according to BCP 47 (e.g. "en", "en-US", "es-ES", "zh-CN").');
          } else {
            score = 100;
            status = 'pass';
            summary = `Valid language declared: lang="${lang}" (BCP 47 compliant).`;
            if (langIndicators[primaryCode] && wordMatches === 0 && textSample.length > 200) {
              recommendations.push(`Heuristic check: Page content did not match expected vocabulary for "${lang}". Verify correct language is declared.`);
            }
          }

          const details = [
            { label: 'Declared Language Attribute', value: lang ? `lang="${lang}"` : 'Missing', type: 'text' },
            { label: 'BCP 47 Format Validity', value: isValidFormat ? 'Valid' : (lang ? 'Invalid' : 'N/A'), type: 'text' },
            { label: 'Sample Vocabulary Alignment', value: lang ? `${wordMatches} vocabulary markers matched for "${primaryCode}"` : 'Skipped', type: 'text' }
          ];

          return {
            id: 'html-lang',
            name: 'HTML Language Attribute',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { lang, isValidFormat, wordMatches }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 2: charset
      // -------------------------------------------------------------
      {
        id: 'charset',
        name: 'Character Encoding',
        description: 'Ensures the document specifies UTF-8 encoding within the first 1024 bytes of the HTML head.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);
          const rawHtml = context.html || '';

          // 1. Check <meta charset="...">
          let metaCharset = '';
          if (doc) {
            const el = doc.querySelector('meta[charset]');
            if (el) metaCharset = (el.getAttribute('charset') || '').toUpperCase();
          }

          // 2. Check <meta http-equiv="Content-Type" content="... charset=...">
          let httpEquivCharset = '';
          if (doc) {
            const el = doc.querySelector('meta[http-equiv="Content-Type" i]');
            if (el) {
              const content = el.getAttribute('content') || '';
              const match = content.match(/charset=([^\s;]+)/i);
              if (match) httpEquivCharset = match[1].toUpperCase();
            }
          }

          // 3. Response header Content-Type
          let headerCharset = '';
          const headers = (context.fetchResult && context.fetchResult.headers) || {};
          for (const k of Object.keys(headers)) {
            if (k.toLowerCase() === 'content-type') {
              const match = String(headers[k]).match(/charset=([^\s;]+)/i);
              if (match) headerCharset = match[1].toUpperCase();
            }
          }

          // 4. Check position in raw HTML: recommended within first 1024 bytes
          const charsetIndex = rawHtml.toLowerCase().indexOf('charset');
          const isEarlyInHead = charsetIndex !== -1 && charsetIndex < 1024;

          const declaredCharset = metaCharset || httpEquivCharset || headerCharset;
          const isUtf8 = declaredCharset.includes('UTF-8') || declaredCharset.includes('UTF8');

          let score = 20;
          let status = 'fail';
          let summary = '';
          const recommendations = [];

          if (isUtf8 && isEarlyInHead) {
            score = 100;
            status = 'pass';
            summary = `UTF-8 encoding declared early in document head (<meta charset="${metaCharset || 'UTF-8'}"> at byte ${charsetIndex}).`;
          } else if (isUtf8 && !isEarlyInHead) {
            score = 80;
            status = 'pass';
            summary = 'UTF-8 encoding declared, but positioned after byte 1024 in the document.';
            recommendations.push('Move <meta charset="UTF-8"> to be the first child inside <head> to avoid browser encoding buffer restarts.');
          } else if (declaredCharset) {
            score = 50;
            status = 'warn';
            summary = `Non-UTF8 encoding declared (${declaredCharset}). Modern multilingual web standards recommend UTF-8.`;
            recommendations.push('Migrate document encoding to UTF-8 for universal character support.');
          } else {
            score = 20;
            status = 'fail';
            summary = 'No character encoding declaration found in HTML or HTTP headers.';
            recommendations.push('Add <meta charset="UTF-8"> immediately after the opening <head> tag.');
          }

          const details = [
            { label: 'HTML Meta Charset', value: metaCharset || 'None', type: 'text' },
            { label: 'HTTP-Equiv Charset', value: httpEquivCharset || 'None', type: 'text' },
            { label: 'HTTP Content-Type Header', value: headerCharset || 'Not in headers', type: 'text' },
            { label: 'Byte Offset in Source', value: charsetIndex !== -1 ? `${charsetIndex} bytes (Optimal <1024 bytes)` : 'Not found', type: 'text' }
          ];

          return {
            id: 'charset',
            name: 'Character Encoding',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { declaredCharset, isUtf8, isEarlyInHead, charsetIndex }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 3: hreflang
      // -------------------------------------------------------------
      {
        id: 'hreflang',
        name: 'Hreflang Tags (Multi-language)',
        description: 'Audits multi-regional alternate hreflang annotations, x-default fallbacks, and URL validity.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'hreflang',
              name: 'Hreflang Tags (Multi-language)',
              status: 'info',
              score: null,
              summary: 'Document unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const hreflangElements = Array.from(doc.querySelectorAll('link[rel="alternate"][hreflang]'));
          const hreflangList = [];
          let hasXDefault = false;
          let hasRelativeUrls = false;
          let invalidCodeCount = 0;
          const bcp47Regex = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;

          for (const el of hreflangElements) {
            const langCode = (el.getAttribute('hreflang') || '').trim();
            const href = (el.getAttribute('href') || '').trim();

            if (langCode.toLowerCase() === 'x-default') {
              hasXDefault = true;
            } else if (!bcp47Regex.test(langCode)) {
              invalidCodeCount++;
            }

            const isAbsolute = /^https?:\/\//i.test(href);
            if (!isAbsolute) hasRelativeUrls = true;

            hreflangList.push({ lang: langCode, href, isAbsolute });
          }

          let score = null;
          let status = 'info';
          let summary = '';
          const recommendations = [];

          if (hreflangElements.length === 0) {
            score = null;
            status = 'info';
            summary = 'No hreflang tags found. This is standard for single-language websites.';
            recommendations.push('If your site targets multiple languages or regions, implement <link rel="alternate" hreflang="..." href="..."> tags.');
          } else if (invalidCodeCount === 0 && !hasRelativeUrls && hasXDefault) {
            score = 100;
            status = 'pass';
            summary = `Found ${hreflangElements.length} valid hreflang annotations including x-default fallback.`;
          } else if (invalidCodeCount > 0) {
            score = 20;
            status = 'fail';
            summary = `Found ${invalidCodeCount} invalid language codes in hreflang tags.`;
            recommendations.push('Correct malformed language codes according to ISO 639-1 / BCP 47.');
          } else {
            score = 60;
            status = 'warn';
            summary = `Found ${hreflangElements.length} hreflang annotations, but some best practices were missed.`;
            if (!hasXDefault) {
              recommendations.push('Add an "x-default" hreflang tag to serve as the global fallback for unmatched languages.');
            }
            if (hasRelativeUrls) {
              recommendations.push('Use fully qualified absolute URLs in hreflang href attributes.');
            }
          }

          const details = [
            { label: 'Hreflang Tags Count', value: String(hreflangElements.length), type: 'text' },
            { label: 'Has x-default Fallback', value: hasXDefault ? 'Yes' : 'No', type: 'text' },
            { label: 'All URLs Absolute', value: hasRelativeUrls ? 'No (Relative URLs detected)' : 'Yes', type: 'text' },
            { label: 'Annotations Table', value: hreflangList.length > 0 ? JSON.stringify(hreflangList, null, 2) : 'None', type: 'table' }
          ];

          return {
            id: 'hreflang',
            name: 'Hreflang Tags (Multi-language)',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { count: hreflangElements.length, hasXDefault, hasRelativeUrls, invalidCodeCount, hreflangList }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 4: direction-support
      // -------------------------------------------------------------
      {
        id: 'direction-support',
        name: 'Text Direction (RTL) Support',
        description: 'Checks dir attributes and CSS properties to evaluate support for Right-to-Left languages (Arabic, Hebrew, Persian, Urdu).',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'direction-support',
              name: 'Text Direction (RTL) Support',
              status: 'info',
              score: null,
              summary: 'Document unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const htmlDir = doc.querySelector('html') ? doc.querySelector('html').getAttribute('dir') : null;
          const bodyDir = doc.querySelector('body') ? doc.querySelector('body').getAttribute('dir') : null;
          const explicitDir = htmlDir || bodyDir || 'Default (ltr)';

          // Check CSS in style tags for direction rules
          const styles = Array.from(doc.querySelectorAll('style'));
          let hasRtlCss = false;
          let hasDirectionProp = false;
          for (const s of styles) {
            const css = s.textContent || '';
            if (/direction:\s*rtl/i.test(css) || /\[dir=["']?rtl["']?\]/i.test(css) || /\.rtl\b/i.test(css)) {
              hasRtlCss = true;
            }
            if (/direction:/i.test(css) || /unicode-bidi:/i.test(css)) {
              hasDirectionProp = true;
            }
          }

          const recommendations = [];
          if (!hasRtlCss && explicitDir !== 'rtl') {
            recommendations.push('To support Arabic or Hebrew markets, consider adding CSS logical properties (margin-inline-start instead of margin-left) and [dir="rtl"] stylesheets.');
          }

          const summary = explicitDir === 'rtl'
            ? 'Page direction is explicitly set to RTL (Right-to-Left).'
            : (hasRtlCss
                ? 'Page direction is LTR with active CSS rules supporting RTL switching.'
                : 'Page is configured with standard LTR (Left-to-Right) direction.');

          const details = [
            { label: 'HTML / Body dir Attribute', value: explicitDir, type: 'text' },
            { label: 'RTL Stylesheet Selectors Found', value: hasRtlCss ? 'Yes ([dir="rtl"] or .rtl rules present)' : 'None found', type: 'text' },
            { label: 'CSS Direction Properties Used', value: hasDirectionProp ? 'Yes' : 'No', type: 'text' }
          ];

          return {
            id: 'direction-support',
            name: 'Text Direction (RTL) Support',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { explicitDir, hasRtlCss, hasDirectionProp }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 5: date-time-format
      // -------------------------------------------------------------
      {
        id: 'date-time-format',
        name: 'Date/Time Formatting',
        description: 'Analyzes date strings and semantic <time> elements for internationalization clarity.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'date-time-format',
              name: 'Date/Time Formatting',
              status: 'info',
              score: null,
              summary: 'Document unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const text = (doc.body ? doc.body.textContent : '') || '';

          // Patterns
          const isoRegex = /\b\d{4}-\d{2}-\d{2}\b/g;
          const slashDateRegex = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;

          const isoMatches = text.match(isoRegex) || [];
          const slashMatches = text.match(slashDateRegex) || [];

          // Semantic <time> tags
          const timeElements = Array.from(doc.querySelectorAll('time'));
          const withDatetime = timeElements.filter(el => el.hasAttribute('datetime'));

          const recommendations = [];
          if (slashMatches.length > 0) {
            recommendations.push('Ambiguous date format (MM/DD/YYYY vs DD/MM/YYYY) detected. Use unambiguous formats like ISO 8601 (YYYY-MM-DD) or write out month names.');
          }
          if (timeElements.length > 0 && withDatetime.length < timeElements.length) {
            recommendations.push('Add machine-readable datetime attributes to all <time> elements (e.g. <time datetime="2026-10-16T11:00:00Z">).');
          }

          const summary = `Found ${timeElements.length} semantic <time> element(s), ${isoMatches.length} ISO 8601 dates, and ${slashMatches.length} slash dates.`;

          const details = [
            { label: 'Semantic <time> Elements', value: `${timeElements.length} found (${withDatetime.length} with datetime attribute)`, type: 'text' },
            { label: 'ISO 8601 Dates (YYYY-MM-DD)', value: `${isoMatches.length} instances`, type: 'text' },
            { label: 'Slash-Delimited Dates (XX/XX/XXXX)', value: `${slashMatches.length} instances (Ambiguous across regions)`, type: 'text' },
            { label: 'Best Practice Recommendation', value: 'Use <time datetime="YYYY-MM-DD"> for international clarity and SEO.', type: 'text' }
          ];

          return {
            id: 'date-time-format',
            name: 'Date/Time Formatting',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { timeElementsCount: timeElements.length, withDatetimeCount: withDatetime.length, isoCount: isoMatches.length, slashCount: slashMatches.length }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 6: currency-number-format
      // -------------------------------------------------------------
      {
        id: 'currency-number-format',
        name: 'Number & Currency Format',
        description: 'Scans visible content for international currency symbols, numeric delimiters, and JS formatting APIs.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);
          const rawHtml = context.html || '';

          const text = (doc && doc.body ? doc.body.textContent : '') || '';

          const currencies = [
            { symbol: '$', name: 'US Dollar / Peso' },
            { symbol: '€', name: 'Euro' },
            { symbol: '£', name: 'British Pound' },
            { symbol: '¥', name: 'Japanese Yen / Chinese Yuan' },
            { symbol: '₹', name: 'Indian Rupee' },
            { symbol: '₩', name: 'South Korean Won' },
            { symbol: '₺', name: 'Turkish Lira' },
            { symbol: '₴', name: 'Ukrainian Hryvnia' },
            { symbol: '₪', name: 'Israeli Shekel' }
          ];

          const detectedCurrencies = [];
          for (const c of currencies) {
            if (text.includes(c.symbol)) {
              detectedCurrencies.push(`${c.symbol} (${c.name})`);
            }
          }

          // Check for Intl.NumberFormat in scripts
          const hasIntlApi = /Intl\.NumberFormat/i.test(rawHtml);
          const hasIntlDate = /Intl\.DateTimeFormat/i.test(rawHtml);

          const recommendations = [];
          if (!hasIntlApi && detectedCurrencies.length > 0) {
            recommendations.push('Use the native JavaScript Intl.NumberFormat API for dynamic currency and decimal formatting tailored to the visitor locale.');
          }

          const summary = detectedCurrencies.length > 0
            ? `Detected currencies: ${detectedCurrencies.join(', ')}. Intl API: ${hasIntlApi ? 'Used' : 'Not detected in inline scripts'}.`
            : 'No distinct currency symbols detected in page body.';

          const details = [
            { label: 'Currencies Detected', value: detectedCurrencies.length > 0 ? detectedCurrencies.join(', ') : 'None', type: 'text' },
            { label: 'Intl.NumberFormat Usage', value: hasIntlApi ? 'Detected in scripts' : 'Not detected', type: 'text' },
            { label: 'Intl.DateTimeFormat Usage', value: hasIntlDate ? 'Detected in scripts' : 'Not detected', type: 'text' }
          ];

          return {
            id: 'currency-number-format',
            name: 'Number & Currency Format',
            status: 'info',
            score: null,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { detectedCurrencies, hasIntlApi, hasIntlDate }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 7: unicode-support
      // -------------------------------------------------------------
      {
        id: 'unicode-support',
        name: 'Unicode & Special Characters',
        description: 'Audits document text for broken character encoding (mojibake), legacy HTML entity over-use, and emoji compatibility.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);
          const rawHtml = context.html || '';

          const text = (doc && doc.body ? doc.body.textContent : '') || '';

          // Mojibake character patterns (common UTF-8 decoded as Windows-1252/ISO-8859-1)
          const mojibakePatterns = [
            /Ã©/g, /â€™/g, /ï¿½/g, //g, /Ã¡/g, /Ã³/g, /Ã±/g, /â€œ/g, /â€\x9d/g, /Â /g
          ];

          let mojibakeCount = 0;
          const foundMojibake = [];
          for (const pattern of mojibakePatterns) {
            const matches = text.match(pattern);
            if (matches) {
              mojibakeCount += matches.length;
              foundMojibake.push(pattern.source);
            }
          }

          // Count HTML entities (e.g., &eacute;, &#8217;)
          const entityRegex = /&(?:[a-z\d]+|#\d+|#x[a-f\d]+);/gi;
          const entityMatches = rawHtml.match(entityRegex) || [];
          const entityCount = entityMatches.length;

          // Check for emoji in text
          const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
          const hasEmoji = emojiRegex.test(text);

          let score = 100;
          let status = 'pass';
          let summary = '';
          const recommendations = [];

          if (mojibakeCount > 0) {
            score = 30;
            status = 'fail';
            summary = `Detected ${mojibakeCount} broken character artifact(s) (mojibake). Corrupted character encoding ruins readability.`;
            recommendations.push('Re-save source HTML files with explicit UTF-8 encoding without BOM.');
            recommendations.push('Configure web server header Content-Type: text/html; charset=UTF-8.');
          } else {
            score = 100;
            status = 'pass';
            summary = `Unicode text is clean. No broken mojibake characters found. Emoji support: ${hasEmoji ? 'Present' : 'Supported'}.`;
            if (entityCount > 100) {
              recommendations.push(`Found ${entityCount} HTML entities. In UTF-8 documents, literal Unicode characters can be used directly for smaller payload size.`);
            }
          }

          const details = [
            { label: 'Corrupted Characters (Mojibake)', value: mojibakeCount > 0 ? `${mojibakeCount} instances detected (${foundMojibake.join(', ')})` : 'Zero detected (Clean)', type: 'text' },
            { label: 'HTML Named Entities', value: `${entityCount} entities present`, type: 'text' },
            { label: 'Emoji Characters Observed', value: hasEmoji ? 'Yes (Native UTF-8 symbols render correctly)' : 'No emoji found', type: 'text' }
          ];

          return {
            id: 'unicode-support',
            name: 'Unicode & Special Characters',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { mojibakeCount, entityCount, hasEmoji }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 8: translation-readiness
      // -------------------------------------------------------------
      {
        id: 'translation-readiness',
        name: 'Translation Readiness',
        description: 'Identifies localization anti-patterns like hardcoded CSS generated text, text in images, and hardcoded input values.',
        async run(context) {
          const startTime = performance.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'translation-readiness',
              name: 'Translation Readiness',
              status: 'error',
              score: null,
              summary: 'Document unavailable for parsing.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const issues = [];

          // 1. Check CSS content: "..." in style tags
          const styles = Array.from(doc.querySelectorAll('style'));
          let cssTextContentCount = 0;
          for (const s of styles) {
            const matches = s.textContent.match(/content:\s*["']([^"']{2,})["']/gi);
            if (matches) {
              cssTextContentCount += matches.length;
            }
          }
          if (cssTextContentCount > 0) {
            issues.push({
              type: 'CSS Generated Content',
              count: cssTextContentCount,
              description: 'Text injected via CSS content: cannot be extracted or translated by automated translation engines.'
            });
          }

          // 2. Hardcoded text in submit / button inputs
          const buttonInputs = Array.from(doc.querySelectorAll('input[type="submit"], input[type="button"], input[type="reset"]'));
          let hardcodedInputsCount = 0;
          for (const input of buttonInputs) {
            if (input.getAttribute('value')) hardcodedInputsCount++;
          }
          if (hardcodedInputsCount > 0) {
            issues.push({
              type: 'Hardcoded Input Values',
              count: hardcodedInputsCount,
              description: '<input value="..."> buttons often get omitted during automated CMS string extraction.'
            });
          }

          // 3. Images with text indicators in filenames
          const images = Array.from(doc.querySelectorAll('img[src]'));
          let imagesWithTextCount = 0;
          for (const img of images) {
            const src = (img.getAttribute('src') || '').toLowerCase();
            if (/text|banner|heading|title|btn|button|promo/i.test(src)) {
              imagesWithTextCount++;
            }
          }
          if (imagesWithTextCount > 0) {
            issues.push({
              type: 'Possible Text Baked in Images',
              count: imagesWithTextCount,
              description: 'Image filenames suggest text is burned into raster images, preventing translation.'
            });
          }

          // 4. Translate="no" elements
          const notranslateEls = doc.querySelectorAll('[translate="no"], .notranslate');

          let score = 100;
          let status = 'pass';
          const recommendations = [];

          if (issues.length > 0) {
            score = Math.max(40, 100 - (issues.length * 20));
            status = 'warn';
            for (const issue of issues) {
              recommendations.push(`${issue.type}: ${issue.description}`);
            }
          }

          const summary = issues.length === 0
            ? 'Excellent: No major localization anti-patterns detected.'
            : `Found ${issues.length} potential localization anti-pattern(s) that may hinder translation.`;

          const details = [
            { label: 'Identified Anti-Patterns', value: issues.length > 0 ? JSON.stringify(issues, null, 2) : 'None', type: 'table' },
            { label: 'CSS Generated Text Occurrences', value: String(cssTextContentCount), type: 'text' },
            { label: 'Elements with translate="no"', value: `${notranslateEls.length} elements`, type: 'text' }
          ];

          return {
            id: 'translation-readiness',
            name: 'Translation Readiness',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { issues, notranslateCount: notranslateEls.length }
          };
        }
      }
    ]
  };
})();
