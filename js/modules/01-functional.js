/**
 * VeriQ - Website Testing Suite
 * Module 01: Functional Testing
 *
 * Evaluates essential website functionality, navigation links, form validation,
 * custom error pages, heading hierarchy, document flow, mobile viewport, and ID uniqueness.
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

  async function fetchViaProxy(url, timeoutMs = 7000) {
    if (window.VeriQ && window.VeriQ.core && window.VeriQ.core.fetcher) {
      try {
        const res = await window.VeriQ.core.fetcher.fetch(url, { timeout: timeoutMs });
        return {
          ok: res.status >= 200 && res.status < 400,
          status: res.status,
          contents: res.body || '',
          headers: res.headers || {},
          raw: res
        };
      } catch (e) {
        return { ok: false, status: 0, contents: '', error: e.message };
      }
    }
    try {
      const resp = await fetch(url, { mode: 'no-cors' });
      return { ok: true, status: 200, contents: '', raw: resp };
    } catch (err) {
      return { ok: false, status: 0, contents: null, error: err.message };
    }
  }

  // --- Module Registration ---
  VeriQ.modules['01-functional'] = {
    id: '01-functional',
    name: 'Functional Testing',
    icon: '🔧',
    color: '#3B82F6',
    description: 'Evaluates essential website functionality, navigation links, form validation, error pages, mobile viewport, and document flow.',
    tests: [
      // 1. Form Validation
      {
        id: 'form-validation',
        name: 'Form Validation',
        description: 'Verifies forms have required fields, semantic input types, names, and accessible labels.',
        helpText: 'Proper form validation ensures users can enter correct data and that assistive technologies understand each input.',
        type: 'auto',
        tags: ['forms', 'validation', 'inputs', 'accessibility'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'form-validation',
              name: 'Form Validation',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const forms = Array.from(doc.querySelectorAll('form'));
          if (forms.length === 0) {
            return {
              id: 'form-validation',
              name: 'Form Validation',
              status: 'info',
              score: 100,
              summary: 'No <form> elements found on this page.',
              details: [{ label: 'Forms Found', value: '0 forms detected in DOM', type: 'text' }],
              recommendations: ['If your page accepts user input, enclose fields in semantic <form> tags.'],
              duration: Date.now() - start,
              raw: { formCount: 0 }
            };
          }

          const issues = [];
          const tableRows = [['Form #', 'Element', 'Name/ID', 'Issue Description', 'Severity']];
          let totalInputs = 0;

          forms.forEach((form, formIndex) => {
            const formNumber = formIndex + 1;
            const controls = Array.from(form.querySelectorAll('input, select, textarea')).filter(el => {
              const type = (el.getAttribute('type') || '').toLowerCase();
              return !['hidden', 'submit', 'button', 'reset', 'image'].includes(type);
            });

            totalInputs += controls.length;

            controls.forEach(ctrl => {
              const tag = ctrl.tagName.toLowerCase();
              const type = (ctrl.getAttribute('type') || (tag === 'input' ? 'text' : tag)).toLowerCase();
              const name = ctrl.getAttribute('name') || '';
              const id = ctrl.getAttribute('id') || '';
              const identifier = name || (id ? `#${id}` : `<${tag}>`);
              const ariaLabel = ctrl.getAttribute('aria-label') || '';
              const ariaLabelledby = ctrl.getAttribute('aria-labelledby') || '';
              const placeholder = ctrl.getAttribute('placeholder') || '';
              const hasExplicitLabel = id && doc.querySelector(`label[for="${CSS.escape(id)}"]`);
              const hasParentLabel = ctrl.closest('label');

              // 1. Missing name attribute
              if (!name) {
                issues.push(`Form ${formNumber}: ${identifier} is missing a name attribute`);
                tableRows.push([`#${formNumber}`, `<${tag}>`, identifier, 'Missing [name] attribute (omitted from submission)', 'High']);
              }

              // 2. Missing label check
              if (!hasExplicitLabel && !hasParentLabel && !ariaLabel && !ariaLabelledby) {
                if (placeholder) {
                  issues.push(`Form ${formNumber}: ${identifier} relies solely on placeholder for labeling`);
                  tableRows.push([`#${formNumber}`, `<${tag}>`, identifier, 'Placeholder used instead of accessible <label>', 'Medium']);
                } else {
                  issues.push(`Form ${formNumber}: ${identifier} has no label, aria-label, or placeholder`);
                  tableRows.push([`#${formNumber}`, `<${tag}>`, identifier, 'No associated label or ARIA labeling attribute', 'High']);
                }
              }

              // 3. Semantic input type checks
              if (tag === 'input') {
                const combinedHint = `${name} ${id} ${placeholder}`.toLowerCase();

                if (/email|e-mail/.test(combinedHint) && type !== 'email') {
                  issues.push(`Form ${formNumber}: ${identifier} appears to be an email field but uses type="${type}"`);
                  tableRows.push([`#${formNumber}`, '<input>', identifier, `Email field should use type="email" (found type="${type}")`, 'Medium']);
                } else if (/phone|mobile|tel|cell/.test(combinedHint) && type !== 'tel') {
                  issues.push(`Form ${formNumber}: ${identifier} appears to be a phone field but uses type="${type}"`);
                  tableRows.push([`#${formNumber}`, '<input>', identifier, `Phone field should use type="tel" (found type="${type}")`, 'Medium']);
                } else if (/website|homepage|site-url|web-url/.test(combinedHint) && type !== 'url') {
                  issues.push(`Form ${formNumber}: ${identifier} appears to be a website field but uses type="${type}"`);
                  tableRows.push([`#${formNumber}`, '<input>', identifier, `URL field should use type="url" (found type="${type}")`, 'Medium']);
                }

                // Check for required consistency if label has '*'
                let labelText = '';
                if (hasExplicitLabel) labelText = hasExplicitLabel.textContent || '';
                else if (hasParentLabel) labelText = hasParentLabel.textContent || '';
                if (/\*|required/i.test(labelText) && !ctrl.hasAttribute('required') && ctrl.getAttribute('aria-required') !== 'true') {
                  issues.push(`Form ${formNumber}: ${identifier} text hints required (*) but lacks required attribute`);
                  tableRows.push([`#${formNumber}`, '<input>', identifier, 'Label indicates required but element lacks [required]', 'Low']);
                }
              }
            });
          });

          const score = Math.max(0, 100 - issues.length * 10);
          const status = issues.length === 0 ? 'pass' : (score >= 60 ? 'warn' : 'fail');
          const summary = issues.length === 0
            ? `All ${forms.length} form(s) and ${totalInputs} field(s) passed validation checks.`
            : `Found ${issues.length} issue(s) across ${forms.length} form(s) and ${totalInputs} field(s).`;

          const recs = [];
          if (issues.some(i => i.includes('name attribute'))) {
            recs.push('Add unique name attributes to all inputs so their values are sent upon form submission.');
          }
          if (issues.some(i => i.includes('label'))) {
            recs.push('Associate each input with an explicit <label for="id"> to ensure screen reader compatibility.');
          }
          if (issues.some(i => i.includes('type="'))) {
            recs.push('Use semantic input types (type="email", type="tel", type="url") for proper mobile keyboard layouts.');
          }

          return {
            id: 'form-validation',
            name: 'Form Validation',
            status,
            score,
            summary,
            details: [
              { label: 'Forms Analyzed', value: `${forms.length} form(s), ${totalInputs} interactive field(s)`, type: 'text' },
              { label: 'Issues Detected', value: `${issues.length} issue(s)`, type: 'text' },
              ...(tableRows.length > 1 ? [{ label: 'Form Controls Audit', value: tableRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['Maintain standard HTML5 form controls and explicit labels.'],
            duration: Date.now() - start,
            raw: { formsCount: forms.length, totalInputs, issuesCount: issues.length }
          };
        }
      },

      // 2. Navigation Links
      {
        id: 'navigation-links',
        name: 'Navigation Links',
        description: 'Inspects <nav> elements for valid anchors, meaningful link text, and skip-navigation links.',
        helpText: 'Accessible navigation landmarks and meaningful link text allow keyboard and screen reader users to browse efficiently.',
        type: 'auto',
        tags: ['navigation', 'links', 'landmarks', 'accessibility'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'navigation-links',
              name: 'Navigation Links',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const navElements = Array.from(doc.querySelectorAll('nav, [role="navigation"]'));
          const skipLink = doc.querySelector('a[href^="#main"], a[href^="#content"], a[href^="#skip"], a[href^="#main-content"]');
          
          if (navElements.length === 0) {
            return {
              id: 'navigation-links',
              name: 'Navigation Links',
              status: 'warn',
              score: 40,
              summary: 'No <nav> or role="navigation" elements found on the page.',
              details: [
                { label: 'Nav Landmarks', value: '0 navigation landmarks found', type: 'text' },
                { label: 'Skip Link', value: skipLink ? 'Skip link present' : 'No skip navigation link found', type: 'text' }
              ],
              recommendations: [
                'Wrap primary navigation menus inside semantic <nav> elements.',
                'Add a skip-to-content link (<a href="#main">Skip to main content</a>) as the first focusable element.'
              ],
              duration: Date.now() - start,
              raw: { navCount: 0, hasSkipLink: !!skipLink }
            };
          }

          let totalNavLinks = 0;
          let emptyTextLinks = 0;
          let invalidHrefLinks = 0;
          const problematicRows = [['Nav #', 'Link Text', 'Href', 'Issue']];

          navElements.forEach((nav, index) => {
            const navIndex = index + 1;
            const links = Array.from(nav.querySelectorAll('a'));
            totalNavLinks += links.length;

            links.forEach(a => {
              const href = (a.getAttribute('href') || '').trim();
              const text = (a.textContent || '').trim();
              const ariaLabel = a.getAttribute('aria-label') || '';
              const img = a.querySelector('img[alt]');
              const imgAlt = img ? img.getAttribute('alt').trim() : '';
              const accessibleText = text || ariaLabel || imgAlt;

              const isInvalidHref = !href || href === '#' || href.toLowerCase().startsWith('javascript:');
              const isEmptyText = !accessibleText;

              if (isInvalidHref || isEmptyText) {
                if (isEmptyText) emptyTextLinks++;
                if (isInvalidHref) invalidHrefLinks++;

                let issueDesc = [];
                if (isEmptyText) issueDesc.push('Empty text/no accessible name');
                if (isInvalidHref) issueDesc.push(`Invalid/placeholder href ("${href || 'empty'}")`);

                problematicRows.push([`#${navIndex}`, text || '[Empty]', href || '[None]', issueDesc.join(', ')]);
              }
            });
          });

          let score = 100;
          if (totalNavLinks === 0) score -= 40;
          score -= (emptyTextLinks * 10);
          score -= (invalidHrefLinks * 8);
          if (!skipLink) score -= 15;
          score = Math.max(0, score);

          const status = score >= 85 ? 'pass' : (score >= 50 ? 'warn' : 'fail');
          const summary = `Found ${navElements.length} nav landmark(s) with ${totalNavLinks} link(s). ${emptyTextLinks + invalidHrefLinks} link issue(s).`;

          const recs = [];
          if (!skipLink) recs.push('Add a skip-to-content link (<a href="#main" class="skip-link">Skip to Content</a>) at the top of the body.');
          if (emptyTextLinks > 0) recs.push('Ensure all navigation anchors have meaningful text or descriptive aria-label attributes.');
          if (invalidHrefLinks > 0) recs.push('Replace placeholder href="#" and javascript: void(0) links with valid URLs or use <button> for actions.');

          return {
            id: 'navigation-links',
            name: 'Navigation Links',
            status,
            score,
            summary,
            details: [
              { label: 'Nav Elements', value: `${navElements.length} landmark(s) found`, type: 'text' },
              { label: 'Total Navigation Links', value: `${totalNavLinks} link(s)`, type: 'text' },
              { label: 'Skip Link Detected', value: skipLink ? `Yes (${skipLink.getAttribute('href')})` : 'No skip link found', type: 'text' },
              ...(problematicRows.length > 1 ? [{ label: 'Problematic Links', value: problematicRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['Navigation links and landmarks are properly configured.'],
            duration: Date.now() - start,
            raw: { navCount: navElements.length, totalNavLinks, emptyTextLinks, invalidHrefLinks, hasSkipLink: !!skipLink }
          };
        }
      },

      // 3. Custom Error Pages
      {
        id: 'error-pages',
        name: 'Custom Error Pages',
        description: 'Tests server response for non-existent URLs to detect 404 handling and avoid soft 404 errors.',
        helpText: 'A proper 404 response helps search engines avoid indexing missing content and guides lost users back on track.',
        type: 'auto',
        tags: ['http', '404', 'error-handling', 'seo'],
        async run(context) {
          const start = Date.now();
          const baseUrl = getBaseUrl(context.url || 'https://example.com');
          const test404Url = `${baseUrl.replace(/\/+$/, '')}/this-page-definitely-does-not-exist-veriq-test-404`;

          const fetchResult = await fetchViaProxy(test404Url, 8000);

          if (!fetchResult.ok && fetchResult.status === 0) {
            return {
              id: 'error-pages',
              name: 'Custom Error Pages',
              status: 'info',
              score: null,
              summary: 'Could not test 404 response due to network/proxy limitations.',
              details: [
                { label: 'Tested URL', value: test404Url, type: 'text' },
                { label: 'Network Error', value: fetchResult.error || 'CORS Proxy request failed', type: 'text' },
                { label: 'CORS Proxy', value: 'api.allorigins.win used', type: 'text' }
              ],
              recommendations: ['Verify your web server returns HTTP 404 with a helpful branded error page for missing URLs.'],
              duration: Date.now() - start,
              raw: { testedUrl: test404Url, error: fetchResult.error }
            };
          }

          const httpStatus = fetchResult.status;
          const body = (fetchResult.contents || '').toLowerCase();
          const bodyLength = body.length;
          const has404Text = body.includes('404') || body.includes('not found') || body.includes("page doesn't exist");
          const isGenericServer = body.includes('nginx') && body.includes('404 not found') && bodyLength < 600 ||
                                  body.includes('apache') && body.includes('not found') && bodyLength < 600;

          let status = 'pass';
          let score = 100;
          let summary = '';
          const recs = [];

          if (httpStatus === 404) {
            if (isGenericServer || bodyLength < 300) {
              status = 'warn';
              score = 75;
              summary = 'Server returned HTTP 404, but the error page appears to be default/generic web server output.';
              recs.push('Create a friendly, branded custom 404 page featuring navigation links and site search.');
            } else {
              status = 'pass';
              score = 100;
              summary = 'Custom 404 error page properly returned with HTTP 404 Not Found status code.';
            }
          } else if (httpStatus === 200) {
            if (has404Text) {
              status = 'warn';
              score = 50;
              summary = 'Soft 404 detected: page returns HTTP 200 OK while displaying "not found" content.';
              recs.push('Configure your web server to return a genuine HTTP 404 or 410 status code instead of HTTP 200.');
            } else {
              status = 'fail';
              score = 20;
              summary = 'Non-existent URL returned HTTP 200 OK without any 404 or Not Found indication.';
              recs.push('Ensure unmatched routes return HTTP 404 status codes to prevent duplicate content indexing.');
            }
          } else if ([301, 302, 307, 308].includes(httpStatus)) {
            status = 'warn';
            score = 65;
            summary = `Non-existent page triggered a redirect (HTTP ${httpStatus}) rather than a direct 404 error.`;
            recs.push('Avoid redirecting all 404 errors to the homepage; return a proper 404 response.');
          } else {
            status = 'info';
            score = 70;
            summary = `Server responded with HTTP ${httpStatus} for non-existent test URL.`;
          }

          return {
            id: 'error-pages',
            name: 'Custom Error Pages',
            status,
            score,
            summary,
            details: [
              { label: 'Tested Route', value: test404Url, type: 'text' },
              { label: 'HTTP Status Code', value: `${httpStatus}`, type: 'text' },
              { label: 'Response Body Size', value: `${bodyLength} bytes`, type: 'text' },
              { label: 'Soft 404 Detected', value: (httpStatus === 200 && has404Text) ? 'Yes (Warning)' : 'No', type: 'text' },
              { label: 'CORS Proxy Used', value: 'api.allorigins.win', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['404 error handling is working as expected.'],
            duration: Date.now() - start,
            raw: { httpStatus, bodyLength, has404Text, isGenericServer }
          };
        }
      },

      // 4. Form Actions & Methods
      {
        id: 'form-action',
        name: 'Form Actions & Methods',
        description: 'Checks form action attributes, transmission methods (GET vs POST), and sensitive credential protection.',
        helpText: 'Forms transmitting login or payment data must use POST over HTTPS to prevent credentials leaking into URLs and logs.',
        type: 'auto',
        tags: ['forms', 'security', 'http-methods'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'form-action',
              name: 'Form Actions & Methods',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const forms = Array.from(doc.querySelectorAll('form'));
          if (forms.length === 0) {
            return {
              id: 'form-action',
              name: 'Form Actions & Methods',
              status: 'info',
              score: 100,
              summary: 'No forms present on this page to analyze.',
              details: [{ label: 'Forms Found', value: '0 forms', type: 'text' }],
              recommendations: ['No form configuration required on this page.'],
              duration: Date.now() - start,
              raw: { formCount: 0 }
            };
          }

          const issues = [];
          const rows = [['Form #', 'Action', 'Method', 'Sensitive Data', 'Status']];

          forms.forEach((form, idx) => {
            const formNumber = idx + 1;
            const action = form.getAttribute('action');
            const rawMethod = (form.getAttribute('method') || '').toUpperCase();
            const method = rawMethod || 'GET (Default)';

            // Check sensitive fields
            const hasPassword = form.querySelector('input[type="password"]');
            const sensitiveInputs = form.querySelector('input[name*="credit" i], input[name*="card" i], input[name*="cvv" i], input[name*="ssn" i], input[name*="token" i]');
            const formIdent = `${form.id ? '#' + form.id : ''} ${form.className ? '.' + form.className : ''}`.trim();
            const isSensitive = !!(hasPassword || sensitiveInputs || /login|signin|register|signup|auth|checkout|payment/i.test(formIdent + ' ' + (action || '')));

            let formStatus = 'OK';
            let formIssues = [];

            if (action === null || action.trim() === '') {
              formIssues.push('Action attribute missing or empty (submits to self)');
            } else if (action.trim().toLowerCase().startsWith('javascript:')) {
              formIssues.push('Action uses inline javascript: pseudo-protocol');
            }

            if (!rawMethod) {
              formIssues.push('Method attribute omitted (defaults to GET)');
            }

            if (isSensitive && method.includes('GET')) {
              formIssues.push('CRITICAL: Sensitive form uses GET method (credentials exposed in URL)');
              formStatus = 'CRITICAL FAIL';
            } else if (formIssues.length > 0) {
              formStatus = 'Warning';
            }

            if (formIssues.length > 0) {
              issues.push(`Form #${formNumber}: ${formIssues.join(', ')}`);
            }

            rows.push([
              `#${formNumber}${formIdent ? ' (' + formIdent + ')' : ''}`,
              action || '[Self / Empty]',
              method,
              isSensitive ? 'Yes (Credentials/Auth)' : 'No',
              formStatus
            ]);
          });

          const hasCritical = issues.some(i => i.includes('CRITICAL'));
          let score = 100 - (issues.length * 15);
          if (hasCritical) score = Math.min(score, 30);
          score = Math.max(0, score);

          const status = hasCritical ? 'fail' : (issues.length === 0 ? 'pass' : 'warn');
          const summary = issues.length === 0
            ? `All ${forms.length} form(s) have explicit methods and secure configurations.`
            : `Detected ${issues.length} form action/method issue(s) across ${forms.length} form(s).`;

          const recs = [];
          if (hasCritical) recs.push('Immediately change sensitive login/registration/payment forms to method="POST".');
          if (issues.some(i => i.includes('Method attribute omitted'))) recs.push('Always specify method="POST" or method="GET" explicitly on every <form>.');
          if (issues.some(i => i.includes('Action attribute missing'))) recs.push('Specify a dedicated action URL on all forms to avoid accidental self-submission issues.');

          return {
            id: 'form-action',
            name: 'Form Actions & Methods',
            status,
            score,
            summary,
            details: [
              { label: 'Forms Inspected', value: `${forms.length} form(s)`, type: 'text' },
              { label: 'Issues Count', value: `${issues.length} issue(s)`, type: 'text' },
              { label: 'Forms Breakdown', value: rows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['All form actions and transmission methods comply with best practices.'],
            duration: Date.now() - start,
            raw: { formCount: forms.length, issuesCount: issues.length, hasCritical }
          };
        }
      },

      // 5. Page Structure & Flow
      {
        id: 'page-structure',
        name: 'Page Structure & Flow',
        description: 'Audits HTML5 landmark elements (<main>, <header>, <footer>) and heading hierarchy consistency.',
        helpText: 'A well-structured document hierarchy enables screen readers and search bots to understand content relationships.',
        type: 'auto',
        tags: ['semantic-html', 'headings', 'landmarks', 'structure'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'page-structure',
              name: 'Page Structure & Flow',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const mainCount = doc.querySelectorAll('main, [role="main"]').length;
          const headerCount = doc.querySelectorAll('header, [role="banner"]').length;
          const footerCount = doc.querySelectorAll('footer, [role="contentinfo"]').length;
          const h1List = Array.from(doc.querySelectorAll('h1'));

          const issues = [];
          if (mainCount === 0) issues.push('Missing <main> content landmark');
          else if (mainCount > 1) issues.push(`Multiple (${mainCount}) <main> landmarks found (should be exactly one)`);

          if (headerCount === 0) issues.push('Missing <header> landmark element');
          if (footerCount === 0) issues.push('Missing <footer> landmark element');

          if (h1List.length === 0) issues.push('No <h1> heading found on the page');
          else if (h1List.length > 1) issues.push(`Found ${h1List.length} <h1> tags (best practice is exactly one per page)`);

          // Analyze Heading Hierarchy
          const allHeadings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          const headingRows = [['Tag', 'Level', 'Heading Text', 'Hierarchy Check']];
          let previousLevel = 0;
          let skippedHeadings = 0;
          let emptyHeadings = 0;

          allHeadings.forEach(h => {
            const level = parseInt(h.tagName.substring(1), 10);
            const text = (h.textContent || '').trim();
            let check = 'Valid';

            if (!text) {
              check = 'Empty heading';
              emptyHeadings++;
              issues.push(`Empty <h${level}> found in document`);
            } else if (previousLevel > 0 && level > previousLevel + 1) {
              check = `Skipped from H${previousLevel} to H${level}`;
              skippedHeadings++;
              issues.push(`Heading level skipped: H${previousLevel} to H${level}`);
            }

            headingRows.push([`<${h.tagName.toLowerCase()}>`, `Level ${level}`, text ? (text.length > 50 ? text.slice(0, 50) + '…' : text) : '[Empty]', check]);
            previousLevel = level;
          });

          let score = 100;
          if (mainCount !== 1) score -= 15;
          if (headerCount === 0) score -= 10;
          if (footerCount === 0) score -= 10;
          if (h1List.length === 0) score -= 20;
          else if (h1List.length > 1) score -= 10;
          score -= (skippedHeadings * 10);
          score -= (emptyHeadings * 10);
          score = Math.max(0, score);

          const status = score >= 85 ? 'pass' : (score >= 55 ? 'warn' : 'fail');
          const summary = issues.length === 0
            ? 'Semantic HTML5 structure and heading hierarchy are well-formed.'
            : `Structure analysis revealed ${issues.length} defect(s) in landmarks or heading flow.`;

          const recs = [];
          if (mainCount !== 1) recs.push('Wrap your primary page content inside exactly one <main> element.');
          if (h1List.length === 0) recs.push('Add a descriptive <h1> as the top-level title of the page.');
          if (skippedHeadings > 0) recs.push('Maintain sequential heading order without skipping levels (e.g., follow <h2> with <h3>, never jump directly to <h4>).');
          if (emptyHeadings > 0) recs.push('Remove or populate empty heading tags.');

          return {
            id: 'page-structure',
            name: 'Page Structure & Flow',
            status,
            score,
            summary,
            details: [
              { label: 'Landmarks Summary', value: `<main>: ${mainCount}, <header>: ${headerCount}, <footer>: ${footerCount}`, type: 'text' },
              { label: 'H1 Headings', value: `${h1List.length} found`, type: 'text' },
              { label: 'Total Headings', value: `${allHeadings.length} total headings (h1-h6)`, type: 'text' },
              ...(headingRows.length > 1 ? [{ label: 'Heading Outline', value: headingRows.slice(0, 25), type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['Keep HTML structure semantic with proper landmarks and heading progression.'],
            duration: Date.now() - start,
            raw: { mainCount, headerCount, footerCount, h1Count: h1List.length, totalHeadings: allHeadings.length, skippedHeadings, emptyHeadings }
          };
        }
      },

      // 6. Interactive Elements
      {
        id: 'interactive-elements',
        name: 'Interactive Elements',
        description: 'Audits buttons, links, target="_blank" security attributes, and form button types.',
        helpText: 'Interactive buttons and links need accessible text, appropriate button types, and security attributes when opening external tabs.',
        type: 'auto',
        tags: ['buttons', 'links', 'tabnabbing', 'accessibility'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'interactive-elements',
              name: 'Interactive Elements',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const buttons = Array.from(doc.querySelectorAll('button'));
          const links = Array.from(doc.querySelectorAll('a[href]'));
          const issues = [];
          const issueRows = [['Type', 'Target / Name', 'Issue Description', 'Recommendation']];

          // 1. Button accessible labels and types
          buttons.forEach((btn, idx) => {
            const text = (btn.textContent || '').trim();
            const ariaLabel = btn.getAttribute('aria-label') || btn.getAttribute('aria-labelledby') || btn.getAttribute('title') || '';
            const imgAlt = btn.querySelector('img[alt]')?.getAttribute('alt') || '';
            const hasAccessibleName = !!(text || ariaLabel || imgAlt);
            const isInForm = !!btn.closest('form');
            const hasType = btn.hasAttribute('type');

            if (!hasAccessibleName) {
              issues.push(`Button #${idx + 1} lacks accessible name/text`);
              issueRows.push(['<button>', `#${idx + 1} (${btn.className || 'no-class'})`, 'No text or aria-label', 'Provide descriptive button text or aria-label']);
            }

            if (isInForm && !hasType) {
              issues.push(`Button #${idx + 1} in form missing explicit type attribute`);
              issueRows.push(['<button>', `#${idx + 1}`, 'Missing type attribute inside <form>', 'Explicitly specify type="button" or type="submit"']);
            }
          });

          // 2. Links opening new tabs without rel="noopener noreferrer"
          links.forEach(a => {
            const target = (a.getAttribute('target') || '').toLowerCase();
            const rel = (a.getAttribute('rel') || '').toLowerCase();
            const href = a.getAttribute('href') || '';

            if (target === '_blank') {
              const hasNoOpener = rel.includes('noopener');
              const hasNoReferrer = rel.includes('noreferrer');

              if (!hasNoOpener && !hasNoReferrer) {
                issues.push(`Link with target="_blank" lacks rel="noopener noreferrer"`);
                issueRows.push(['<a target="_blank">', href.slice(0, 40), 'Missing rel="noopener noreferrer"', 'Add rel="noopener noreferrer" to prevent reverse tabnabbing']);
              }
            }
          });

          const score = Math.max(0, 100 - issues.length * 8);
          const status = score >= 85 ? 'pass' : (score >= 60 ? 'warn' : 'fail');
          const summary = issues.length === 0
            ? `Analyzed ${buttons.length} button(s) and ${links.length} link(s) with zero security or labeling issues.`
            : `Detected ${issues.length} issue(s) across interactive buttons and links.`;

          const recs = [];
          if (issues.some(i => i.includes('rel="noopener'))) {
            recs.push('Always add rel="noopener noreferrer" to links that open in new windows (target="_blank").');
          }
          if (issues.some(i => i.includes('accessible name'))) {
            recs.push('Provide descriptive text or aria-label for all icon-only or graphical buttons.');
          }
          if (issues.some(i => i.includes('type attribute'))) {
            recs.push('Set type="button" on buttons inside forms that are not meant to submit the form.');
          }

          return {
            id: 'interactive-elements',
            name: 'Interactive Elements',
            status,
            score,
            summary,
            details: [
              { label: 'Interactive Elements Count', value: `${buttons.length} button(s), ${links.length} anchor link(s)`, type: 'text' },
              { label: 'Issues Detected', value: `${issues.length} issue(s)`, type: 'text' },
              ...(issueRows.length > 1 ? [{ label: 'Element Audit', value: issueRows.slice(0, 25), type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['All buttons and links adhere to security and accessibility standards.'],
            duration: Date.now() - start,
            raw: { buttonCount: buttons.length, linkCount: links.length, issuesCount: issues.length }
          };
        }
      },

      // 7. Mobile Viewport
      {
        id: 'meta-viewport',
        name: 'Mobile Viewport',
        description: 'Validates <meta name="viewport"> configuration for mobile responsiveness and user scalability.',
        helpText: 'Without a proper mobile viewport tag, mobile devices render pages at desktop width, forcing users to pinch-to-zoom.',
        type: 'auto',
        tags: ['mobile', 'responsive', 'viewport', 'accessibility'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'meta-viewport',
              name: 'Mobile Viewport',
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
              id: 'meta-viewport',
              name: 'Mobile Viewport',
              status: 'fail',
              score: 0,
              summary: 'Missing <meta name="viewport"> tag. Site will not render responsively on mobile devices.',
              details: [{ label: 'Viewport Tag', value: 'Not found in <head>', type: 'text' }],
              recommendations: ['Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside <head>.'],
              duration: Date.now() - start,
              raw: { hasViewport: false }
            };
          }

          const content = (viewportMeta.getAttribute('content') || '').toLowerCase();
          const hasWidthDevice = content.includes('width=device-width');
          const hasInitialScale = /initial-scale\s*=\s*1(\.0)?/.test(content);
          const hasNoUserScalable = /user-scalable\s*=\s*(no|0)/.test(content);
          const hasMaxScale1 = /maximum-scale\s*=\s*1(\.0)?/.test(content);

          let score = 100;
          const issues = [];

          if (!hasWidthDevice) {
            score -= 40;
            issues.push('Missing "width=device-width" in viewport content');
          }
          if (!hasInitialScale) {
            score -= 10;
            issues.push('Recommended "initial-scale=1.0" is omitted');
          }
          if (hasNoUserScalable) {
            score -= 30;
            issues.push('Restricts zooming: "user-scalable=no" harms visually impaired users');
          }
          if (hasMaxScale1) {
            score -= 20;
            issues.push('Restricts zooming: "maximum-scale=1" prevents users from enlarging text');
          }

          score = Math.max(0, score);
          const status = score === 100 ? 'pass' : (score >= 60 ? 'warn' : 'fail');
          const summary = issues.length === 0
            ? 'Mobile viewport is perfectly configured with width=device-width and unrestricted zoom.'
            : `Viewport tag found with ${issues.length} issue(s): ${issues.join('; ')}.`;

          const recs = [];
          if (!hasWidthDevice) recs.push('Include width=device-width in the viewport content.');
          if (hasNoUserScalable || hasMaxScale1) recs.push('Remove user-scalable=no and maximum-scale=1 to comply with WCAG 2.1 accessibility guidelines.');

          return {
            id: 'meta-viewport',
            name: 'Mobile Viewport',
            status,
            score,
            summary,
            details: [
              { label: 'Viewport Tag', value: `<meta name="viewport" content="${viewportMeta.getAttribute('content')}">`, type: 'code' },
              { label: 'width=device-width', value: hasWidthDevice ? 'Present (Pass)' : 'Missing (Fail)', type: 'text' },
              { label: 'Zoom Restrictions', value: (hasNoUserScalable || hasMaxScale1) ? 'Yes (Anti-accessibility)' : 'None (Pass)', type: 'text' },
              { label: 'Issues Found', value: issues.length ? issues : ['None'], type: 'list' }
            ],
            recommendations: recs.length ? recs : ['Mobile viewport is configured according to modern standards.'],
            duration: Date.now() - start,
            raw: { content, hasWidthDevice, hasInitialScale, hasNoUserScalable, hasMaxScale1 }
          };
        }
      },

      // 8. Page Title
      {
        id: 'page-title',
        name: 'Page Title',
        description: 'Evaluates presence, length, and quality of the <title> tag for SEO and user tab recognition.',
        helpText: 'The page title is the primary anchor text shown in browser tabs, bookmarks, and search engine results.',
        type: 'auto',
        tags: ['seo', 'title', 'metadata', 'ux'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'page-title',
              name: 'Page Title',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const titleEl = doc.querySelector('title');
          const title = titleEl ? (titleEl.textContent || '').trim() : '';

          if (!titleEl || title.length === 0) {
            return {
              id: 'page-title',
              name: 'Page Title',
              status: 'fail',
              score: 0,
              summary: 'Page is missing a <title> element or title is empty.',
              details: [{ label: 'Page Title', value: 'Not found or empty', type: 'text' }],
              recommendations: ['Add a descriptive, concise <title> tag between 10 and 70 characters inside <head>.'],
              duration: Date.now() - start,
              raw: { titleLength: 0 }
            };
          }

          const len = title.length;
          let score = 100;
          let status = 'pass';
          const issues = [];
          const recs = [];

          if (len < 10) {
            score -= 30;
            issues.push(`Title is too short (${len} characters). Ideal length is 10-70 characters.`);
            recs.push('Expand the title with relevant brand and page description keywords.');
          } else if (len > 70) {
            score -= 20;
            issues.push(`Title is too long (${len} characters) and will be truncated in search results.`);
            recs.push('Shorten the title to under 70 characters so it fits neatly in search engine snippets.');
          }

          if (/^(home\s*[-|:]|welcome\s*to|untitled)/i.test(title)) {
            score -= 25;
            issues.push('Title starts with weak/generic prefix ("Home -", "Welcome to", or "Untitled")');
            recs.push('Place your primary topic keyword or brand name first instead of generic greeting words.');
          }

          score = Math.max(0, score);
          if (score < 60) status = 'fail';
          else if (score < 90) status = 'warn';

          const summary = issues.length === 0
            ? `Page title "${title}" is optimal (${len} characters).`
            : `Title has ${issues.length} recommendation(s): ${issues.join('; ')}`;

          return {
            id: 'page-title',
            name: 'Page Title',
            status,
            score,
            summary,
            details: [
              { label: 'Title Text', value: title, type: 'text' },
              { label: 'Character Count', value: `${len} characters (optimal: 10-70)`, type: 'text' },
              { label: 'Evaluation', value: issues.length ? issues : ['Title meets all SEO and UX guidelines'], type: 'list' }
            ],
            recommendations: recs.length ? recs : ['Page title is descriptive and within optimal character limits.'],
            duration: Date.now() - start,
            raw: { title, length: len, issues }
          };
        }
      },

      // 9. Link Text Quality
      {
        id: 'link-text-quality',
        name: 'Link Text Quality',
        description: 'Detects ambiguous link anchor text ("click here", "read more") and empty icon-only links.',
        helpText: 'Descriptive link text clarifies link destination out of context for screen reader users and boosts SEO.',
        type: 'auto',
        tags: ['links', 'accessibility', 'screen-readers', 'seo'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'link-text-quality',
              name: 'Link Text Quality',
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
              id: 'link-text-quality',
              name: 'Link Text Quality',
              status: 'info',
              score: 100,
              summary: 'No links with href attributes found on this page.',
              details: [{ label: 'Links Found', value: '0 links', type: 'text' }],
              recommendations: [],
              duration: Date.now() - start,
              raw: { totalLinks: 0 }
            };
          }

          const genericPhrases = ['click here', 'here', 'read more', 'more', 'link', 'learn more', 'this', 'go', 'view', 'details', 'continue'];
          const problematic = [];
          const rows = [['Link Text', 'Href', 'Problem', 'Fix Recommendation']];

          links.forEach(a => {
            const rawText = (a.textContent || '').trim();
            const lowerText = rawText.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
            const ariaLabel = (a.getAttribute('aria-label') || '').trim();
            const img = a.querySelector('img');
            const imgAlt = img ? (img.getAttribute('alt') || '').trim() : null;
            const href = a.getAttribute('href') || '';

            let issueType = '';
            let fix = '';

            // Check if generic
            if (genericPhrases.includes(lowerText) && !ariaLabel) {
              issueType = `Generic text ("${rawText}")`;
              fix = 'Use specific text describing the destination or add aria-label';
            } else if (!rawText && !ariaLabel && img && !imgAlt) {
              issueType = 'Image-only link with missing alt attribute';
              fix = 'Provide descriptive alt attribute on the image';
            } else if (!rawText && !ariaLabel && !img) {
              issueType = 'Empty link with no accessible text';
              fix = 'Add visible text or aria-label attribute';
            }

            if (issueType) {
              problematic.push({ text: rawText || '[Empty]', href, issue: issueType });
              rows.push([rawText || '[Empty]', href.slice(0, 35), issueType, fix]);
            }
          });

          const total = links.length;
          const badCount = problematic.length;
          const goodRatio = total > 0 ? (total - badCount) / total : 1;
          const score = Math.round(goodRatio * 100);

          const status = score >= 90 ? 'pass' : (score >= 70 ? 'warn' : 'fail');
          const summary = badCount === 0
            ? `All ${total} link(s) have clear, descriptive anchor text.`
            : `Found ${badCount} problematic link(s) out of ${total} total links (${Math.round((badCount / total) * 100)}% issue rate).`;

          const recs = [];
          if (badCount > 0) {
            recs.push('Replace generic phrases like "click here" or "read more" with destination-specific text (e.g., "Read our 2024 Annual Report").');
            recs.push('Ensure icon-only links contain aria-label or visually hidden descriptive text.');
          }

          return {
            id: 'link-text-quality',
            name: 'Link Text Quality',
            status,
            score,
            summary,
            details: [
              { label: 'Total Links Tested', value: `${total} links`, type: 'text' },
              { label: 'Problematic Links', value: `${badCount} link(s)`, type: 'text' },
              ...(rows.length > 1 ? [{ label: 'Flagged Links Sample', value: rows.slice(0, 25), type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['Link text quality is high across the page.'],
            duration: Date.now() - start,
            raw: { totalLinks: total, badLinks: badCount, score }
          };
        }
      },

      // 10. Duplicate IDs
      {
        id: 'duplicate-ids',
        name: 'Duplicate IDs',
        description: 'Detects duplicate id attribute values across elements to maintain DOM validity and script reliability.',
        helpText: 'Element IDs must be unique per HTML document. Duplicates break CSS styling, label associations, and JavaScript querySelector.',
        type: 'auto',
        tags: ['html-validity', 'dom', 'ids', 'javascript'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);

          if (!doc) {
            return {
              id: 'duplicate-ids',
              name: 'Duplicate IDs',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const elementsWithId = Array.from(doc.querySelectorAll('[id]'));
          const idMap = new Map();

          elementsWithId.forEach(el => {
            const rawId = el.getAttribute('id');
            if (rawId === null) return;
            const id = rawId.trim();
            if (!id) return;

            if (!idMap.has(id)) {
              idMap.set(id, []);
            }
            idMap.get(id).push(el.tagName.toLowerCase());
          });

          const duplicateRows = [['Duplicate ID', 'Occurrences', 'Tags Sharing ID']];
          let duplicateCount = 0;

          idMap.forEach((tags, id) => {
            if (tags.length > 1) {
              duplicateCount++;
              duplicateRows.push([`#${id}`, `${tags.length} times`, tags.join(', ')]);
            }
          });

          const totalUniqueIds = idMap.size;
          const score = Math.max(0, 100 - (duplicateCount * 15));
          const status = duplicateCount === 0 ? 'pass' : (score >= 60 ? 'warn' : 'fail');
          const summary = duplicateCount === 0
            ? `All ${elementsWithId.length} element IDs in the document are completely unique.`
            : `Found ${duplicateCount} duplicate ID value(s) across ${elementsWithId.length} identified elements.`;

          const recs = [];
          if (duplicateCount > 0) {
            recs.push('Ensure every id attribute in the HTML document is strictly unique.');
            recs.push('Use CSS classes (.class-name) rather than repeated IDs for repeating interface components.');
          }

          return {
            id: 'duplicate-ids',
            name: 'Duplicate IDs',
            status,
            score,
            summary,
            details: [
              { label: 'Total Elements with ID', value: `${elementsWithId.length} elements`, type: 'text' },
              { label: 'Unique IDs', value: `${totalUniqueIds} unique IDs`, type: 'text' },
              { label: 'Duplicate IDs Found', value: `${duplicateCount} duplicate(s)`, type: 'text' },
              ...(duplicateRows.length > 1 ? [{ label: 'Duplicate ID List', value: duplicateRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['All element IDs are unique.'],
            duration: Date.now() - start,
            raw: { totalElementsWithId: elementsWithId.length, uniqueIds: totalUniqueIds, duplicateCount }
          };
        }
      }
    ]
  };
})();
