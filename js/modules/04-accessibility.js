/**
 * VeriQ - Website Testing Suite
 * Module 04: Accessibility Testing (WCAG 2.1)
 *
 * Evaluates image alt texts, form labels, heading hierarchy, WCAG contrast ratios,
 * keyboard navigation, landmark roles, page language, link clarity, document structure,
 * table semantics, reduced-motion preferences, and visible focus indicators.
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

  // --- Real WCAG 2.1 Color Contrast Algorithms ---
  const NAMED_COLORS = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff',
    gray: '#808080', grey: '#808080', lightgray: '#d3d3d3', lightgrey: '#d3d3d3',
    darkgray: '#a9a9a9', darkgrey: '#a9a9a9', navy: '#000080', teal: '#008080',
    orange: '#ffa500', purple: '#800080', maroon: '#800000', olive: '#808000',
    silver: '#c0c0c0', lime: '#00ff00', aqua: '#00ffff', fuchsia: '#ff00ff'
  };

  function parseColor(input) {
    if (!input || typeof input !== 'string') return null;
    let str = input.trim().toLowerCase();

    if (NAMED_COLORS[str]) {
      str = NAMED_COLORS[str];
    }

    // #rgb or #rrggbb or #rrggbbaa
    if (str.startsWith('#')) {
      let hex = str.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        hex = hex.split('').map(c => c + c).join('');
      }
      if (hex.length >= 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b };
      }
    }

    // rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = str.match(/rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
    if (rgbMatch) {
      return {
        r: Math.min(255, parseInt(rgbMatch[1], 10)),
        g: Math.min(255, parseInt(rgbMatch[2], 10)),
        b: Math.min(255, parseInt(rgbMatch[3], 10))
      };
    }

    return null;
  }

  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function getContrastRatio(rgb1, rgb2) {
    if (!rgb1 || !rgb2) return null;
    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // --- Module Registration ---
  VeriQ.modules['04-accessibility'] = {
    id: '04-accessibility',
    name: 'Accessibility Testing',
    icon: '♿',
    color: '#8B5CF6',
    description: 'Evaluates WCAG 2.1 accessibility compliance including alt text, contrast ratios, keyboard navigation, form labeling, and ARIA roles.',
    tests: [
      // 1. Image Alt Text
      {
        id: 'image-alt-text',
        name: 'Image Alt Text',
        description: 'Verifies all <img> tags have meaningful descriptive alternative text or are correctly marked as decorative.',
        helpText: 'Screen readers read alt text aloud to visually impaired users; missing alt text renders images completely invisible.',
        type: 'auto',
        tags: ['images', 'alt-text', 'screen-readers', 'wcag-1.1.1'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'image-alt-text',
              name: 'Image Alt Text',
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
              id: 'image-alt-text',
              name: 'Image Alt Text',
              status: 'info',
              score: 100,
              summary: 'No <img> elements found on this page.',
              details: [{ label: 'Images Found', value: '0 images', type: 'text' }],
              recommendations: [],
              duration: Date.now() - start,
              raw: { imageCount: 0 }
            };
          }

          let missingAltCount = 0;
          let filenameAltCount = 0;
          let genericAltCount = 0;
          let decorativeCount = 0;
          let descriptiveCount = 0;

          const auditRows = [['Image Source', 'Alt Text', 'Assessment', 'WCAG Compliance']];
          const genericNames = ['image', 'photo', 'picture', 'graphic', 'logo', 'icon', 'banner', 'img'];

          images.forEach((img, idx) => {
            const hasAlt = img.hasAttribute('alt');
            const alt = (img.getAttribute('alt') || '').trim();
            const src = img.getAttribute('src') || `[Image #${idx + 1}]`;
            const role = (img.getAttribute('role') || '').toLowerCase();
            const ariaHidden = img.getAttribute('aria-hidden') === 'true';

            let assessment = 'Descriptive Alt';
            let compliance = 'Pass (WCAG AA)';

            if (!hasAlt) {
              missingAltCount++;
              assessment = 'Missing alt attribute completely';
              compliance = '❌ Fail (WCAG 1.1.1 Violation)';
            } else if (alt === '') {
              if (role === 'presentation' || role === 'none' || ariaHidden) {
                decorativeCount++;
                assessment = 'Decorative image correctly hidden';
                compliance = 'Pass (Decorative)';
              } else {
                decorativeCount++;
                assessment = 'Empty alt="" without explicit decorative role';
                compliance = '⚠️ Warn (Ensure purely decorative)';
              }
            } else if (/\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(alt)) {
              filenameAltCount++;
              assessment = `Alt contains raw filename ("${alt}")`;
              compliance = '⚠️ Warn (Poor description)';
            } else if (genericNames.includes(alt.toLowerCase())) {
              genericAltCount++;
              assessment = `Generic placeholder alt ("${alt}")`;
              compliance = '⚠️ Warn (Uninformative)';
            } else {
              descriptiveCount++;
            }

            if (idx < 25) {
              auditRows.push([src.slice(0, 35), alt ? `"${alt.slice(0, 30)}"` : '[Empty/Missing]', assessment, compliance]);
            }
          });

          const total = images.length;
          const badCount = missingAltCount + (filenameAltCount * 0.5) + (genericAltCount * 0.5);
          const score = Math.max(0, Math.round(100 - (badCount / total) * 100));

          const status = missingAltCount > 0 ? (score >= 60 ? 'warn' : 'fail') : (filenameAltCount + genericAltCount > 0 ? 'warn' : 'pass');
          const summary = missingAltCount === 0 && filenameAltCount === 0 && genericAltCount === 0
            ? `All ${total} image(s) have descriptive alternative text or are correctly marked decorative.`
            : `Evaluated ${total} images: ${missingAltCount} missing alt, ${filenameAltCount} with filenames, ${genericAltCount} with generic text.`;

          const recs = [];
          if (missingAltCount > 0) {
            recs.push('Provide meaningful alt="..." text for every informative image; for decorative graphics use alt="" role="presentation".');
          }
          if (filenameAltCount > 0) {
            recs.push('Replace image file names in alt attributes with natural language descriptions of the image content.');
          }
          if (genericAltCount > 0) {
            recs.push('Avoid generic words like "image" or "photo" in alt text; describe the specific subject or function.');
          }

          return {
            id: 'image-alt-text',
            name: 'Image Alt Text',
            status,
            score,
            summary,
            details: [
              { label: 'Total Images', value: `${total} images`, type: 'text' },
              { label: 'Descriptive Alt', value: `${descriptiveCount} image(s)`, type: 'text' },
              { label: 'Decorative (alt="")', value: `${decorativeCount} image(s)`, type: 'text' },
              { label: 'Missing Alt Attribute', value: `${missingAltCount} image(s) (Critical)`, type: 'text' },
              { label: 'Image Alt Audit', value: auditRows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['All images comply with WCAG 1.1.1 Non-text Content.'],
            duration: Date.now() - start,
            raw: { total, missingAltCount, filenameAltCount, genericAltCount, decorativeCount, descriptiveCount, score }
          };
        }
      },

      // 2. Form Labels
      {
        id: 'form-labels',
        name: 'Form Labels',
        description: 'Ensures all form inputs have associated programmatic labels via <label for>, aria-label, or aria-labelledby.',
        helpText: 'Accessible form labels ensure screen reader users know what information to enter in each field.',
        type: 'auto',
        tags: ['forms', 'labels', 'wcag-1.3.1', 'wcag-4.1.2'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'form-labels',
              name: 'Form Labels',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const controls = Array.from(doc.querySelectorAll('input, select, textarea')).filter(el => {
            const type = (el.getAttribute('type') || '').toLowerCase();
            return !['hidden', 'submit', 'reset', 'button', 'image'].includes(type);
          });

          if (controls.length === 0) {
            return {
              id: 'form-labels',
              name: 'Form Labels',
              status: 'info',
              score: 100,
              summary: 'No interactive form controls found on this page.',
              details: [{ label: 'Form Controls', value: '0 inputs/selects/textareas', type: 'text' }],
              recommendations: [],
              duration: Date.now() - start,
              raw: { controlCount: 0 }
            };
          }

          let properlyLabeled = 0;
          let placeholderOnly = 0;
          let completelyUnlabeled = 0;
          const rows = [['Element', 'Field ID / Name', 'Labeling Mechanism', 'Accessibility Status']];

          controls.forEach((ctrl, idx) => {
            const tag = ctrl.tagName.toLowerCase();
            const type = (ctrl.getAttribute('type') || (tag === 'input' ? 'text' : tag)).toLowerCase();
            const id = ctrl.getAttribute('id') || '';
            const name = ctrl.getAttribute('name') || '';
            const ident = id ? `#${id}` : (name ? `[name="${name}"]` : `Field #${idx + 1}`);

            const hasExplicitLabel = id && doc.querySelector(`label[for="${CSS.escape(id)}"]`);
            const hasParentLabel = ctrl.closest('label');
            const hasAriaLabel = ctrl.hasAttribute('aria-label');
            const hasAriaLabelledby = ctrl.hasAttribute('aria-labelledby');
            const hasPlaceholder = ctrl.hasAttribute('placeholder');

            let mechanism = '';
            let status = '';

            if (hasExplicitLabel) {
              properlyLabeled++;
              mechanism = '<label for="..."> tag';
              status = '✅ Accessible';
            } else if (hasParentLabel) {
              properlyLabeled++;
              mechanism = 'Wrapped in <label>';
              status = '✅ Accessible';
            } else if (hasAriaLabel) {
              properlyLabeled++;
              mechanism = `aria-label="${ctrl.getAttribute('aria-label')}"`;
              status = '✅ Accessible';
            } else if (hasAriaLabelledby) {
              properlyLabeled++;
              mechanism = `aria-labelledby="${ctrl.getAttribute('aria-labelledby')}"`;
              status = '✅ Accessible';
            } else if (hasPlaceholder) {
              placeholderOnly++;
              mechanism = 'Placeholder only (No real label)';
              status = '⚠️ Warn (Incomplete)';
            } else {
              completelyUnlabeled++;
              mechanism = 'None';
              status = '❌ Fail (Unlabeled)';
            }

            if (idx < 25) {
              rows.push([`<${tag} type="${type}">`, ident, mechanism, status]);
            }
          });

          const total = controls.length;
          const score = Math.max(0, Math.round(((properlyLabeled + (placeholderOnly * 0.4)) / total) * 100));
          const status = completelyUnlabeled > 0 ? (score >= 60 ? 'warn' : 'fail') : (placeholderOnly > 0 ? 'warn' : 'pass');

          const summary = properlyLabeled === total
            ? `All ${total} form field(s) have clear programmatic labels.`
            : `Evaluated ${total} field(s): ${properlyLabeled} labeled, ${placeholderOnly} rely on placeholder, ${completelyUnlabeled} completely unlabeled.`;

          const recs = [];
          if (completelyUnlabeled > 0) {
            recs.push('Provide an explicit <label for="inputId"> or aria-label for all unlabeled form controls.');
          }
          if (placeholderOnly > 0) {
            recs.push('Do not use placeholder text as a replacement for labels; placeholders disappear when users type and often fail contrast.');
          }

          return {
            id: 'form-labels',
            name: 'Form Labels',
            status,
            score,
            summary,
            details: [
              { label: 'Total Controls Evaluated', value: `${total} inputs`, type: 'text' },
              { label: 'Properly Labeled', value: `${properlyLabeled} of ${total} (${Math.round((properlyLabeled / total) * 100)}%)`, type: 'text' },
              { label: 'Placeholder Only', value: `${placeholderOnly} inputs (Warning)`, type: 'text' },
              { label: 'Completely Unlabeled', value: `${completelyUnlabeled} inputs (Critical)`, type: 'text' },
              { label: 'Form Label Audit', value: rows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['All form fields comply with WCAG 2.1 form labeling guidelines.'],
            duration: Date.now() - start,
            raw: { total, properlyLabeled, placeholderOnly, completelyUnlabeled, score }
          };
        }
      },

      // 3. Heading Hierarchy
      {
        id: 'heading-hierarchy',
        name: 'Heading Hierarchy',
        description: 'Audits sequential progression of headings (H1-H6) and verifies page has a single primary <h1>.',
        helpText: 'Users navigating with screen readers scan headings to jump to sections; skipped levels disorient navigation.',
        type: 'auto',
        tags: ['headings', 'wcag-1.3.1', 'screen-readers', 'structure'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'heading-hierarchy',
              name: 'Heading Hierarchy',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          const h1List = headings.filter(h => h.tagName.toLowerCase() === 'h1');

          if (headings.length === 0) {
            return {
              id: 'heading-hierarchy',
              name: 'Heading Hierarchy',
              status: 'fail',
              score: 20,
              summary: 'No heading elements (h1-h6) found in the entire document.',
              details: [{ label: 'Headings Count', value: '0 headings found', type: 'text' }],
              recommendations: ['Add structural headings starting with an <h1> for the page title and <h2> for content sections.'],
              duration: Date.now() - start,
              raw: { totalHeadings: 0 }
            };
          }

          let skippedLevels = 0;
          let emptyHeadings = 0;
          let previousLevel = 0;
          const rows = [['Tag', 'Level', 'Heading Text Content', 'Hierarchy Order']];

          headings.forEach(h => {
            const level = parseInt(h.tagName.substring(1), 10);
            const text = (h.textContent || '').trim();
            let check = '✅ Valid';

            if (!text) {
              emptyHeadings++;
              check = '❌ Empty heading';
            } else if (previousLevel > 0 && level > previousLevel + 1) {
              skippedLevels++;
              check = `⚠️ Skipped (H${previousLevel} to H${level})`;
            }

            rows.push([
              `<${h.tagName.toLowerCase()}>`,
              `H${level}`,
              text ? (text.length > 45 ? text.slice(0, 45) + '…' : text) : '[Empty]',
              check
            ]);

            previousLevel = level;
          });

          let score = 100;
          if (h1List.length === 0) score -= 25;
          else if (h1List.length > 1) score -= 15;
          score -= (skippedLevels * 12);
          score -= (emptyHeadings * 15);
          score = Math.max(0, score);

          const status = score >= 85 ? 'pass' : (score >= 55 ? 'warn' : 'fail');
          const summary = (h1List.length === 1 && skippedLevels === 0 && emptyHeadings === 0)
            ? `Heading structure is well-formed with 1 <h1> and ${headings.length - 1} nested subheadings.`
            : `Detected heading hierarchy issues: ${h1List.length} H1(s), ${skippedLevels} level skip(s), ${emptyHeadings} empty heading(s).`;

          const recs = [];
          if (h1List.length === 0) recs.push('Add an <h1> heading at the top of the main content area.');
          if (h1List.length > 1) recs.push('Reduce multiple <h1> elements to a single primary page title, using <h2> for major sections.');
          if (skippedLevels > 0) recs.push('Maintain strict sequential heading order without jumping over levels (e.g., h2 followed by h3, never h4 directly).');
          if (emptyHeadings > 0) recs.push('Remove empty heading tags from the DOM.');

          return {
            id: 'heading-hierarchy',
            name: 'Heading Hierarchy',
            status,
            score,
            summary,
            details: [
              { label: 'H1 Headings', value: `${h1List.length} (Optimal: 1)`, type: 'text' },
              { label: 'Total Headings', value: `${headings.length} headings`, type: 'text' },
              { label: 'Skipped Levels', value: `${skippedLevels} skipped hierarchy jumps`, type: 'text' },
              { label: 'Empty Headings', value: `${emptyHeadings} empty elements`, type: 'text' },
              { label: 'Headings Outline', value: rows.slice(0, 30), type: 'table' }
            ],
            recommendations: recs.length ? recs : ['Heading hierarchy adheres to WCAG 1.3.1 Info and Relationships.'],
            duration: Date.now() - start,
            raw: { total: headings.length, h1Count: h1List.length, skippedLevels, emptyHeadings, score }
          };
        }
      },

      // 4. Color Contrast (WCAG)
      {
        id: 'color-contrast',
        name: 'Color Contrast (WCAG)',
        description: 'Calculates relative luminance and contrast ratios for text and background color pairs (WCAG 2.1 AA/AAA).',
        helpText: 'Sufficient color contrast allows people with low vision or color blindness to read text comfortably.',
        type: 'auto',
        tags: ['contrast', 'wcag-1.4.3', 'colors', 'luminance', 'wcag-aa'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'color-contrast',
              name: 'Color Contrast (WCAG)',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const colorPairs = [];

          // 1. Extract from inline styles
          const styledElements = Array.from(doc.querySelectorAll('[style*="color"]'));
          styledElements.forEach(el => {
            const style = el.getAttribute('style') || '';
            const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
            const bgMatch = style.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);

            if (colorMatch && bgMatch) {
              const fg = parseColor(colorMatch[1]);
              const bg = parseColor(bgMatch[1]);
              if (fg && bg) {
                colorPairs.push({
                  element: `<${el.tagName.toLowerCase()}>`,
                  fgRaw: colorMatch[1].trim(),
                  bgRaw: bgMatch[1].trim(),
                  fg,
                  bg
                });
              }
            }
          });

          // 2. Extract basic pairs from <style> tags
          const styleTags = Array.from(doc.querySelectorAll('style'));
          styleTags.forEach(st => {
            const css = st.textContent || '';
            const ruleRegex = /([^{]+)\{([^}]+)\}/g;
            let ruleMatch;
            while ((ruleMatch = ruleRegex.exec(css)) !== null) {
              const selector = ruleMatch[1].trim();
              const body = ruleMatch[2];
              const cMatch = body.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
              const bMatch = body.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);
              if (cMatch && bMatch) {
                const fg = parseColor(cMatch[1]);
                const bg = parseColor(bMatch[1]);
                if (fg && bg) {
                  colorPairs.push({
                    element: selector.slice(0, 25),
                    fgRaw: cMatch[1].trim(),
                    bgRaw: bMatch[1].trim(),
                    fg,
                    bg
                  });
                }
              }
            }
          });

          // Fallback sample if no explicit inline color pairs found in static HTML
          if (colorPairs.length === 0) {
            return {
              id: 'color-contrast',
              name: 'Color Contrast (WCAG)',
              status: 'info',
              score: 85,
              summary: 'No explicit color+background inline pairs found in static markup (styles are likely defined in external CSS).',
              details: [
                { label: 'Static Analysis Limitation', value: 'Complete computed color contrast requires browser CSS rendering of external stylesheets.', type: 'text' },
                { label: 'WCAG Standard', value: '4.5:1 required for normal body text; 3.0:1 required for large text (18pt+ / 14pt+ bold)', type: 'text' }
              ],
              recommendations: ['Inspect external CSS rules using browser devtools to ensure text meets the 4.5:1 WCAG AA contrast threshold.'],
              duration: Date.now() - start,
              raw: { pairsFound: 0 }
            };
          }

          let passAaCount = 0;
          let passAaaCount = 0;
          let failCount = 0;
          const rows = [['Element / Selector', 'Foreground', 'Background', 'Contrast Ratio', 'WCAG AA (4.5:1)', 'WCAG AAA (7.0:1)']];

          colorPairs.forEach((pair, idx) => {
            const ratio = getContrastRatio(pair.fg, pair.bg);
            if (ratio === null) return;

            const passesAa = ratio >= 4.5;
            const passesAaa = ratio >= 7.0;

            if (passesAa) passAaCount++;
            else failCount++;

            if (passesAaa) passAaaCount++;

            if (idx < 20) {
              rows.push([
                pair.element,
                pair.fgRaw,
                pair.bgRaw,
                `${ratio.toFixed(2)}:1`,
                passesAa ? '✅ Pass' : '❌ Fail (< 4.5:1)',
                passesAaa ? '✅ Pass' : '⚠️ Fail (< 7.0:1)'
              ]);
            }
          });

          const total = passAaCount + failCount;
          const score = total > 0 ? Math.round((passAaCount / total) * 100) : 100;
          const status = failCount === 0 ? 'pass' : (score >= 60 ? 'warn' : 'fail');

          const summary = failCount === 0
            ? `All ${total} evaluated color pair(s) satisfy the WCAG AA minimum 4.5:1 contrast requirement.`
            : `Detected ${failCount} color pair(s) failing WCAG AA (4.5:1 minimum) out of ${total} inspected pairs.`;

          const recs = [];
          if (failCount > 0) {
            recs.push('Darken foreground text colors or lighten backgrounds on failing elements until contrast ratio exceeds 4.5:1.');
          }

          return {
            id: 'color-contrast',
            name: 'Color Contrast (WCAG)',
            status,
            score,
            summary,
            details: [
              { label: 'Color Pairs Evaluated', value: `${total} pairs`, type: 'text' },
              { label: 'Passing WCAG AA (≥4.5:1)', value: `${passAaCount} pairs (${Math.round((passAaCount / total) * 100)}%)`, type: 'text' },
              { label: 'Passing WCAG AAA (≥7.0:1)', value: `${passAaaCount} pairs`, type: 'text' },
              { label: 'Failing WCAG AA', value: `${failCount} pairs`, type: 'text' },
              { label: 'Color Contrast Audit', value: rows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['All static color pairs meet WCAG AA contrast standards.'],
            duration: Date.now() - start,
            raw: { total, passAaCount, passAaaCount, failCount, score }
          };
        }
      },

      // 5. Keyboard Navigation
      {
        id: 'keyboard-navigation',
        name: 'Keyboard Navigation',
        description: 'Audits keyboard accessibility: href presence on anchors, tabindex anti-patterns, and skip links.',
        helpText: 'Users with motor disabilities rely entirely on the keyboard (Tab key) to navigate web interfaces.',
        type: 'auto',
        tags: ['keyboard', 'tabindex', 'skip-link', 'wcag-2.1.1'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'keyboard-navigation',
              name: 'Keyboard Navigation',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          // 1. Positive tabindex check
          const elementsWithTabindex = Array.from(doc.querySelectorAll('[tabindex]'));
          const positiveTabindex = [];
          const negativeTabindex = [];

          elementsWithTabindex.forEach(el => {
            const rawVal = el.getAttribute('tabindex');
            const val = parseInt(rawVal, 10);
            if (!isNaN(val)) {
              if (val > 0) positiveTabindex.push({ el, val });
              else if (val < -1) negativeTabindex.push({ el, val });
            }
          });

          // 2. Anchors without href but with click handlers
          const anchors = Array.from(doc.querySelectorAll('a'));
          const nonNavAnchors = anchors.filter(a => !a.hasAttribute('href') && (a.hasAttribute('onclick') || a.getAttribute('role') === 'button'));

          // 3. Skip link
          const skipLink = doc.querySelector('a[href^="#main"], a[href^="#content"], a[href^="#skip"], a[href^="#main-content"]');

          // 4. Focus rules in styles
          let hasFocusRules = false;
          const styles = doc.querySelectorAll('style');
          styles.forEach(s => {
            if (/:focus|:focus-visible/.test(s.textContent || '')) {
              hasFocusRules = true;
            }
          });

          let score = 100;
          const issues = [];
          const recs = [];

          if (positiveTabindex.length > 0) {
            score -= (positiveTabindex.length * 15);
            issues.push(`Found ${positiveTabindex.length} element(s) with positive tabindex (breaks natural DOM tab order)`);
            recs.push('Remove positive tabindex values (tabindex="1", "2"). Rely on natural DOM source order or use tabindex="0".');
          }

          if (nonNavAnchors.length > 0) {
            score -= (nonNavAnchors.length * 10);
            issues.push(`Found ${nonNavAnchors.length} <a> tag(s) without href attribute acting as buttons`);
            recs.push('Replace <a onclick="..."> without href with semantic <button> elements.');
          }

          if (!skipLink) {
            score -= 15;
            issues.push('No skip-to-content link found at the start of the page');
            recs.push('Add a skip navigation link (<a href="#main" class="skip-link">Skip to Content</a>) for keyboard users.');
          }

          score = Math.max(0, score);
          const status = score >= 85 ? 'pass' : (score >= 50 ? 'warn' : 'fail');
          const summary = issues.length === 0
            ? 'Keyboard navigation order and focus targets comply with WCAG 2.1 guidelines.'
            : `Keyboard navigation audit identified ${issues.length} issue(s): ${issues.join('; ')}.`;

          return {
            id: 'keyboard-navigation',
            name: 'Keyboard Navigation',
            status,
            score,
            summary,
            details: [
              { label: 'Positive Tabindex (>0)', value: positiveTabindex.length > 0 ? `${positiveTabindex.length} anti-patterns found` : 'None (Pass)', type: 'text' },
              { label: 'Skip Navigation Link', value: skipLink ? `Present (${skipLink.getAttribute('href')})` : 'Missing (Warning)', type: 'text' },
              { label: 'Anchors Missing Href', value: `${nonNavAnchors.length} pseudo-link buttons`, type: 'text' },
              { label: 'Focus Styles in CSS', value: hasFocusRules ? 'Present in <style>' : 'Relying on default browser outline', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Maintain natural document tab order and visible keyboard focus styling.'],
            duration: Date.now() - start,
            raw: { positiveTabindexCount: positiveTabindex.length, hasSkipLink: !!skipLink, nonNavAnchorsCount: nonNavAnchors.length, score }
          };
        }
      },

      // 6. ARIA Landmark Roles
      {
        id: 'aria-usage',
        name: 'ARIA Landmark Roles',
        description: 'Audits ARIA landmarks (main, navigation, banner, contentinfo) and validates aria-* attribute spelling.',
        helpText: 'ARIA landmarks partition the page into perceivable sections; invalid or misspelled ARIA attributes fail silently.',
        type: 'auto',
        tags: ['aria', 'landmarks', 'screen-readers', 'wcag-4.1.2'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'aria-usage',
              name: 'ARIA Landmark Roles',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          // Check Landmarks
          const hasMain = doc.querySelector('main, [role="main"]');
          const hasNav = doc.querySelector('nav, [role="navigation"]');
          const hasHeader = doc.querySelector('header, [role="banner"]');
          const hasFooter = doc.querySelector('footer, [role="contentinfo"]');

          // Check ARIA Attributes
          const validAriaAttrs = new Set([
            'aria-activedescendant', 'aria-atomic', 'aria-autocomplete', 'aria-busy', 'aria-checked',
            'aria-colcount', 'aria-colindex', 'aria-colspan', 'aria-controls', 'aria-current',
            'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect', 'aria-errormessage',
            'aria-expanded', 'aria-flowto', 'aria-grabbed', 'aria-haspopup', 'aria-hidden',
            'aria-invalid', 'aria-keyshortcuts', 'aria-label', 'aria-labelledby', 'aria-level',
            'aria-live', 'aria-modal', 'aria-multiline', 'aria-multiselectable', 'aria-orientation',
            'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed', 'aria-readonly',
            'aria-relevant', 'aria-required', 'aria-roledescription', 'aria-rowcount', 'aria-rowindex',
            'aria-rowspan', 'aria-selected', 'aria-setsize', 'aria-sort', 'aria-valuemax',
            'aria-valuemin', 'aria-valuenow', 'aria-valuetext'
          ]);

          const allElements = Array.from(doc.querySelectorAll('*'));
          let ariaAttrCount = 0;
          const invalidAttrs = [];

          allElements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
              if (attr.name.toLowerCase().startsWith('aria-')) {
                ariaAttrCount++;
                if (!validAriaAttrs.has(attr.name.toLowerCase())) {
                  invalidAttrs.push({ tag: el.tagName.toLowerCase(), attr: attr.name });
                }
              }
            });
          });

          let score = 100;
          const issues = [];
          if (!hasMain) { score -= 20; issues.push('Missing main landmark'); }
          if (!hasNav) { score -= 15; issues.push('Missing navigation landmark'); }
          if (!hasHeader) { score -= 10; issues.push('Missing banner/header landmark'); }
          if (!hasFooter) { score -= 10; issues.push('Missing contentinfo/footer landmark'); }
          if (invalidAttrs.length > 0) {
            score -= (invalidAttrs.length * 15);
            issues.push(`Found ${invalidAttrs.length} invalid/misspelled ARIA attribute(s)`);
          }
          score = Math.max(0, score);

          const status = score >= 85 ? 'pass' : (score >= 60 ? 'warn' : 'fail');
          const summary = issues.length === 0
            ? 'Key landmark roles are present and all ARIA attributes are valid.'
            : `Landmark audit detected ${issues.length} defect(s): ${issues.join('; ')}.`;

          const recs = [];
          if (!hasMain) recs.push('Wrap central page content in <main> or role="main".');
          if (invalidAttrs.length > 0) {
            recs.push(`Fix misspelled ARIA attributes (e.g. ${invalidAttrs.map(a => a.attr).join(', ')}).`);
          }

          return {
            id: 'aria-usage',
            name: 'ARIA Landmark Roles',
            status,
            score,
            summary,
            details: [
              { label: 'Main Landmark', value: hasMain ? 'Present' : 'Missing', type: 'text' },
              { label: 'Navigation Landmark', value: hasNav ? 'Present' : 'Missing', type: 'text' },
              { label: 'Banner Landmark', value: hasHeader ? 'Present' : 'Missing', type: 'text' },
              { label: 'Contentinfo Landmark', value: hasFooter ? 'Present' : 'Missing', type: 'text' },
              { label: 'Total ARIA Attributes', value: `${ariaAttrCount} attributes`, type: 'text' },
              { label: 'Invalid ARIA Attributes', value: invalidAttrs.length ? invalidAttrs.map(a => `${a.tag}[${a.attr}]`).join(', ') : 'None (Pass)', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['All ARIA landmark roles and attribute syntaxes are valid.'],
            duration: Date.now() - start,
            raw: { hasMain: !!hasMain, hasNav: !!hasNav, ariaAttrCount, invalidAttrsCount: invalidAttrs.length, score }
          };
        }
      },

      // 7. Page Language
      {
        id: 'language-declaration',
        name: 'Page Language',
        description: 'Verifies the <html> element has a valid BCP-47 lang attribute declaration.',
        helpText: 'Without a declared language, screen readers use default synthesizer pronunciations, rendering words unintelligible.',
        type: 'auto',
        tags: ['lang', 'bcp-47', 'i18n', 'wcag-3.1.1'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'language-declaration',
              name: 'Page Language',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const htmlEl = doc.documentElement || doc.querySelector('html');
          const lang = htmlEl ? (htmlEl.getAttribute('lang') || '').trim() : '';

          if (!lang) {
            return {
              id: 'language-declaration',
              name: 'Page Language',
              status: 'fail',
              score: 0,
              summary: 'Missing or empty "lang" attribute on the <html> root element.',
              details: [{ label: '<html> lang Attribute', value: 'Missing', type: 'text' }],
              recommendations: ['Add lang="en" (or your appropriate BCP-47 language code) to the <html> opening tag.'],
              duration: Date.now() - start,
              raw: { hasLang: false }
            };
          }

          // Validate BCP-47 format (e.g. 'en', 'en-US', 'fr-CA', 'zh-Hans')
          const bcp47Regex = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
          const isValidFormat = bcp47Regex.test(lang);

          const score = isValidFormat ? 100 : 50;
          const status = isValidFormat ? 'pass' : 'warn';
          const summary = isValidFormat
            ? `Page language is declared as "${lang}" (valid BCP-47 code).`
            : `Language attribute "${lang}" does not match standard BCP-47 language formatting.`;

          const recs = [];
          if (!isValidFormat) {
            recs.push('Use a standard BCP-47 language code such as "en", "en-US", "es", or "de".');
          }

          return {
            id: 'language-declaration',
            name: 'Page Language',
            status,
            score,
            summary,
            details: [
              { label: 'Language Code', value: lang, type: 'text' },
              { label: 'BCP-47 Format', value: isValidFormat ? 'Valid' : 'Non-standard', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Page language is accurately declared for assistive technology.'],
            duration: Date.now() - start,
            raw: { lang, isValidFormat, score }
          };
        }
      },

      // 8. Link Purpose
      {
        id: 'link-purpose',
        name: 'Link Purpose',
        description: 'Checks that all hyperlinks clearly convey destination purpose out of context (WCAG 2.4.4).',
        helpText: 'Links named "click here" or "learn more" force screen reader users to read surrounding text to understand intent.',
        type: 'auto',
        tags: ['links', 'link-purpose', 'wcag-2.4.4'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'link-purpose',
              name: 'Link Purpose',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const links = Array.from(doc.querySelectorAll('a[href]'));
          if (links.length === 0) {
            return {
              id: 'link-purpose',
              name: 'Link Purpose',
              status: 'info',
              score: 100,
              summary: 'No links with href found on this page.',
              details: [{ label: 'Links', value: '0 links', type: 'text' }],
              recommendations: [],
              duration: Date.now() - start,
              raw: { total: 0 }
            };
          }

          const vaguePhrases = ['click here', 'here', 'read more', 'more', 'learn more', 'link', 'details', 'continue', 'this page'];
          const vagueLinks = [];
          const newTabWithoutNotice = [];

          links.forEach(a => {
            const rawText = (a.textContent || '').trim().toLowerCase();
            const ariaLabel = (a.getAttribute('aria-label') || '').toLowerCase();
            const title = (a.getAttribute('title') || '').toLowerCase();
            const target = (a.getAttribute('target') || '').toLowerCase();
            const href = a.getAttribute('href') || '';

            // 1. Vague text check
            if (vaguePhrases.includes(rawText) && !ariaLabel) {
              vagueLinks.push({ text: a.textContent.trim(), href });
            }

            // 2. target="_blank" without screen reader notice
            if (target === '_blank') {
              const fullAccessibleText = `${rawText} ${ariaLabel} ${title}`;
              const warnsNewTab = /new (window|tab)|external/i.test(fullAccessibleText);
              if (!warnsNewTab) {
                newTabWithoutNotice.push({ text: a.textContent.trim() || '[Icon/Empty]', href });
              }
            }
          });

          const total = links.length;
          const badCount = vagueLinks.length + (newTabWithoutNotice.length * 0.5);
          const score = Math.max(0, Math.round(100 - (badCount / total) * 100));
          const status = score >= 85 ? 'pass' : (score >= 60 ? 'warn' : 'fail');

          const summary = vagueLinks.length === 0
            ? `All ${total} links feature descriptive destination text.`
            : `Found ${vagueLinks.length} vague link(s) and ${newTabWithoutNotice.length} unannounced new-window links.`;

          const recs = [];
          if (vagueLinks.length > 0) {
            recs.push('Replace generic phrases like "read more" with explicit link names (e.g. "Read more about our pricing").');
          }
          if (newTabWithoutNotice.length > 0) {
            recs.push('Add an aria-label or visually-hidden span informing users when a link opens in a new tab.');
          }

          return {
            id: 'link-purpose',
            name: 'Link Purpose',
            status,
            score,
            summary,
            details: [
              { label: 'Total Links Tested', value: `${total} links`, type: 'text' },
              { label: 'Vague Link Text', value: `${vagueLinks.length} links`, type: 'text' },
              { label: 'New Tab Unannounced', value: `${newTabWithoutNotice.length} links`, type: 'text' }
            ],
            recommendations: recs.length ? recs : ['All link purposes are clearly communicated in context.'],
            duration: Date.now() - start,
            raw: { total, vagueCount: vagueLinks.length, newTabCount: newTabWithoutNotice.length, score }
          };
        }
      },

      // 9. Document Structure
      {
        id: 'document-structure',
        name: 'Document Structure',
        description: 'Comprehensive audit of fundamental HTML accessibility foundation elements.',
        helpText: 'A solid document shell provides character encodings, viewport sizing, page titles, and content landmarks.',
        type: 'auto',
        tags: ['structure', 'wcag', 'meta', 'foundation'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'document-structure',
              name: 'Document Structure',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const hasLang = !!(doc.documentElement?.getAttribute('lang') || doc.querySelector('html[lang]'));
          const title = (doc.querySelector('title')?.textContent || '').trim();
          const hasTitle = title.length > 0;
          const hasMain = !!doc.querySelector('main, [role="main"]');
          const hasHeadings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;
          const hasCharset = !!doc.querySelector('meta[charset], meta[http-equiv="Content-Type" i]');
          const hasViewport = !!doc.querySelector('meta[name="viewport"]');

          const checklist = [
            ['<html> root has lang attribute', hasLang ? '✅ Pass' : '❌ Fail'],
            ['<head> contains non-empty <title>', hasTitle ? '✅ Pass' : '❌ Fail'],
            ['<main> landmark content container', hasMain ? '✅ Pass' : '❌ Fail'],
            ['At least one semantic heading present', hasHeadings ? '✅ Pass' : '❌ Fail'],
            ['<meta charset> declared early', hasCharset ? '✅ Pass' : '❌ Fail'],
            ['<meta name="viewport"> configured', hasViewport ? '✅ Pass' : '❌ Fail']
          ];

          const passCount = checklist.filter(item => item[1].includes('Pass')).length;
          const score = Math.round((passCount / checklist.length) * 100);
          const status = score === 100 ? 'pass' : (score >= 65 ? 'warn' : 'fail');

          const summary = score === 100
            ? 'Document structure satisfies all foundational accessibility shell criteria.'
            : `Passed ${passCount} of ${checklist.length} core structural requirements.`;

          const recs = [];
          if (!hasLang) recs.push('Add lang="en" to <html> tag.');
          if (!hasTitle) recs.push('Add a descriptive <title> in <head>.');
          if (!hasMain) recs.push('Enclose primary content in a <main> tag.');
          if (!hasCharset) recs.push('Add <meta charset="UTF-8"> as the first tag in <head>.');

          return {
            id: 'document-structure',
            name: 'Document Structure',
            status,
            score,
            summary,
            details: [
              { label: 'Foundation Score', value: `${passCount} / ${checklist.length} Passed (${score}%)`, type: 'text' },
              { label: 'Checklist Breakdown', value: checklist, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['Document structure conforms to modern accessibility standards.'],
            duration: Date.now() - start,
            raw: { passCount, totalChecks: checklist.length, score }
          };
        }
      },

      // 10. Table Accessibility
      {
        id: 'tables-accessibility',
        name: 'Table Accessibility',
        description: 'Inspects <table> elements for captions, <th> headers with scope attributes, and non-layout semantics.',
        helpText: 'Data tables require headers (<th scope="col">) so screen readers can announce header context for every data cell.',
        type: 'auto',
        tags: ['tables', 'wcag-1.3.1', 'scope', 'caption'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'tables-accessibility',
              name: 'Table Accessibility',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const tables = Array.from(doc.querySelectorAll('table'));
          if (tables.length === 0) {
            return {
              id: 'tables-accessibility',
              name: 'Table Accessibility',
              status: 'info',
              score: 100,
              summary: 'No <table> elements found on this page.',
              details: [{ label: 'Tables Found', value: '0 tables', type: 'text' }],
              recommendations: [],
              duration: Date.now() - start,
              raw: { tableCount: 0 }
            };
          }

          let tablesWithHeaders = 0;
          let tablesWithScope = 0;
          let tablesWithCaption = 0;
          const rows = [['Table #', 'Caption / Label', '<th> Headers', 'Scope Attributes', 'Assessment']];

          tables.forEach((tbl, idx) => {
            const tableNum = idx + 1;
            const caption = tbl.querySelector('caption');
            const ariaLabel = tbl.getAttribute('aria-label') || tbl.getAttribute('aria-labelledby');
            const hasDesc = !!(caption || ariaLabel);

            const thList = Array.from(tbl.querySelectorAll('th'));
            const hasTh = thList.length > 0;
            const thWithScope = thList.filter(th => th.hasAttribute('scope'));
            const hasScope = thWithScope.length > 0;

            if (hasDesc) tablesWithCaption++;
            if (hasTh) tablesWithHeaders++;
            if (hasScope) tablesWithScope++;

            let assess = 'Accessible Data Table';
            if (!hasTh) assess = '⚠️ Missing <th> header cells (or used for layout)';
            else if (!hasScope) assess = '⚠️ Headers missing scope="col|row"';

            rows.push([
              `Table #${tableNum}`,
              hasDesc ? (caption ? caption.textContent.trim().slice(0, 25) : 'aria-label') : '❌ None',
              hasTh ? `✅ ${thList.length} header(s)` : '❌ 0 headers',
              hasScope ? `✅ ${thWithScope.length}/${thList.length}` : '❌ Missing scope',
              assess
            ]);
          });

          const total = tables.length;
          const score = Math.round(((tablesWithHeaders * 50) + (tablesWithScope * 30) + (tablesWithCaption * 20)) / total);
          const status = score >= 80 ? 'pass' : (score >= 50 ? 'warn' : 'fail');

          const summary = `Analyzed ${total} table(s): ${tablesWithHeaders} have <th> headers, ${tablesWithScope} use scope attributes, ${tablesWithCaption} have captions.`;

          const recs = [];
          if (tablesWithHeaders < total) {
            recs.push('Ensure all data tables use <th> for header rows and columns rather than styled <td> cells.');
          }
          if (tablesWithScope < total) {
            recs.push('Add scope="col" to column headers and scope="row" to row headers.');
          }
          if (tablesWithCaption < total) {
            recs.push('Add a <caption> element to each data table describing the dataset.');
          }

          return {
            id: 'tables-accessibility',
            name: 'Table Accessibility',
            status,
            score,
            summary,
            details: [
              { label: 'Total Tables', value: `${total} table(s)`, type: 'text' },
              { label: 'With <th> Headers', value: `${tablesWithHeaders} of ${total}`, type: 'text' },
              { label: 'With Scope Attributes', value: `${tablesWithScope} of ${total}`, type: 'text' },
              { label: 'Table Audit', value: rows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['Data tables comply with WCAG tabular accessibility criteria.'],
            duration: Date.now() - start,
            raw: { total, tablesWithHeaders, tablesWithScope, tablesWithCaption, score }
          };
        }
      },

      // 11. Reduced Motion Support
      {
        id: 'motion-preferences',
        name: 'Reduced Motion Support',
        description: 'Checks CSS in <style> tags for @media (prefers-reduced-motion: reduce) rules.',
        helpText: 'Users with vestibular motion sensitivity can experience nausea or dizziness from parallax and auto-animations.',
        type: 'auto',
        tags: ['reduced-motion', 'animations', 'vestibular', 'wcag-2.3.3'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'motion-preferences',
              name: 'Reduced Motion Support',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          let hasReducedMotion = false;
          let hasAnimations = false;

          const styles = doc.querySelectorAll('style');
          styles.forEach(s => {
            const css = s.textContent || '';
            if (/prefers-reduced-motion\s*:\s*reduce/i.test(css)) {
              hasReducedMotion = true;
            }
            if (/animation|@keyframes|transition/i.test(css)) {
              hasAnimations = true;
            }
          });

          const score = hasReducedMotion ? 100 : (hasAnimations ? 65 : 85);
          const status = hasReducedMotion ? 'pass' : 'info';
          const summary = hasReducedMotion
            ? 'prefers-reduced-motion media query found. Animations respect user motion settings.'
            : (hasAnimations ? 'CSS animations detected, but no prefers-reduced-motion overrides found.' : 'No prominent inline animations or motion media queries found.');

          const recs = [];
          if (!hasReducedMotion && hasAnimations) {
            recs.push('Add @media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } } to disable dizzying motion.');
          }

          return {
            id: 'motion-preferences',
            name: 'Reduced Motion Support',
            status,
            score,
            summary,
            details: [
              { label: 'Prefers-Reduced-Motion Media Query', value: hasReducedMotion ? 'Implemented in CSS' : 'Not detected in inline styles', type: 'text' },
              { label: 'CSS Animations / Transitions', value: hasAnimations ? 'Detected' : 'None detected in <style>', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Motion sensitivity considerations are addressed.'],
            duration: Date.now() - start,
            raw: { hasReducedMotion, hasAnimations, score }
          };
        }
      },

      // 12. Focus Indicators
      {
        id: 'focus-visible',
        name: 'Focus Indicators',
        description: 'Detects destructive CSS rules that strip keyboard focus rings (outline: none) without providing alternatives.',
        helpText: 'Stripping focus outlines leaves keyboard users blind to which link or button currently has focus.',
        type: 'auto',
        tags: ['focus', 'outline', 'focus-visible', 'wcag-2.4.7'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'focus-visible',
              name: 'Focus Indicators',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          let outlineResetCount = 0;
          let hasFocusVisible = false;
          const badRules = [];

          const styles = doc.querySelectorAll('style');
          styles.forEach(s => {
            const css = s.textContent || '';
            if (/:focus-visible/i.test(css)) {
              hasFocusVisible = true;
            }

            // Look for :focus rules that reset outline
            const focusRuleRegex = /([^{]+:focus[^{]*)\{([^}]+)\}/gi;
            let match;
            while ((match = focusRuleRegex.exec(css)) !== null) {
              const selector = match[1].trim();
              const body = match[2];
              const stripsOutline = /outline\s*:\s*(none|0)\b/i.test(body);
              const hasAlternative = /box-shadow|border/i.test(body);

              if (stripsOutline && !hasAlternative) {
                outlineResetCount++;
                badRules.push(selector);
              }
            }
          });

          const score = outlineResetCount === 0 ? 100 : 25;
          const status = outlineResetCount === 0 ? 'pass' : 'fail';
          const summary = outlineResetCount === 0
            ? 'No destructive outline:none focus resets detected. Focus indicators remain intact.'
            : `Detected ${outlineResetCount} CSS rule(s) removing focus outlines without alternative styling!`;

          const recs = [];
          if (outlineResetCount > 0) {
            recs.push(`Never set outline: none on :focus without providing an accessible alternative box-shadow or high-contrast border (${badRules.slice(0, 3).join(', ')}).`);
            recs.push('Utilize :focus-visible to show outlines exclusively for keyboard navigators while preserving clean clicks for mouse users.');
          }

          return {
            id: 'focus-visible',
            name: 'Focus Indicators',
            status,
            score,
            summary,
            details: [
              { label: 'Harmful Outline Resets', value: outlineResetCount > 0 ? `${outlineResetCount} rule(s) found (WCAG Violation)` : 'None (Pass)', type: 'text' },
              { label: ':focus-visible Usage', value: hasFocusVisible ? 'Used in CSS' : 'Not detected in inline styles', type: 'text' },
              ...(badRules.length > 0 ? [{ label: 'Flagged Selectors', value: badRules.slice(0, 10), type: 'list' }] : [])
            ],
            recommendations: recs.length ? recs : ['Keyboard focus indicators conform to WCAG 2.4.7 Focus Visible.'],
            duration: Date.now() - start,
            raw: { outlineResetCount, hasFocusVisible, score }
          };
        }
      }
    ]
  };
})();
