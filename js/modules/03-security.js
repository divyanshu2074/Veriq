/**
 * VeriQ - Website Testing Suite
 * Module 03: Security Testing
 *
 * Audits HTTPS enforcement, HSTS, Content Security Policy (CSP), clickjacking defenses,
 * MIME sniffing protection, referrer policy, permissions policy, mixed content,
 * sensitive data exposure, cookie flags, CORS configuration, server banner disclosure, and Subresource Integrity (SRI).
 *
 * ⚠️ Important: VeriQ security tests are passive inspections designed for auditing websites
 * you own or have explicit authorization to evaluate.
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

  function maskSecret(str) {
    if (!str || str.length <= 6) return '******';
    return str.slice(0, 3) + '*****' + str.slice(-3);
  }

  // --- Module Registration ---
  VeriQ.modules['03-security'] = {
    id: '03-security',
    name: 'Security Testing',
    icon: '🔒',
    color: '#DC2626',
    description: 'Audits essential web security headers, HTTPS configuration, content security policies, cookie flags, and sensitive data exposure.',
    disclaimer: '⚠️ Important: VeriQ security tests are non-destructive, passive inspections designed solely for auditing websites you own or have explicit permission to evaluate.',
    tests: [
      // 1. HTTPS Enforcement & HSTS
      {
        id: 'https-enforcement',
        name: 'HTTPS Enforcement',
        description: 'Checks if the connection is encrypted via HTTPS and verifies HTTP Strict Transport Security (HSTS).',
        helpText: 'HTTPS encrypts data in transit against eavesdropping, while HSTS forces browsers to connect exclusively over HTTPS.',
        type: 'auto',
        tags: ['https', 'ssl', 'tls', 'hsts', 'encryption'],
        async run(context) {
          const start = Date.now();
          const targetUrl = context?.url || '';
          const isHttps = targetUrl.toLowerCase().startsWith('https://');

          if (!isHttps) {
            return {
              id: 'https-enforcement',
              name: 'HTTPS Enforcement',
              status: 'fail',
              score: 0,
              summary: 'Insecure protocol: Target site loads over plaintext HTTP.',
              details: [
                { label: 'URL Scheme', value: 'http:// (Insecure)', type: 'text' },
                { label: 'HSTS Header', value: 'Not applicable over HTTP', type: 'text' }
              ],
              recommendations: [
                'Install a TLS/SSL certificate (e.g. Let\'s Encrypt or Cloudflare) immediately.',
                'Configure your web server to redirect all HTTP requests to HTTPS with HTTP 301 Moved Permanently.'
              ],
              duration: Date.now() - start,
              raw: { isHttps: false, score: 0 }
            };
          }

          const headers = context?.fetchResult?.headers;
          const hsts = getHeader(headers, 'strict-transport-security') || '';

          let score = 60; // Base score for HTTPS without HSTS
          let status = 'warn';
          let summary = '';
          const recs = [];

          let maxAge = null;
          const matchMaxAge = hsts.match(/max-age\s*=\s*(\d+)/i);
          if (matchMaxAge) {
            maxAge = parseInt(matchMaxAge[1], 10);
          }
          const hasSubDomains = /includesubdomains/i.test(hsts);
          const hasPreload = /preload/i.test(hsts);

          const oneYearSeconds = 31536000;

          if (hsts) {
            if (maxAge !== null && maxAge >= oneYearSeconds) {
              score = 100;
              status = 'pass';
              summary = `HTTPS active with robust HSTS policy (max-age: ${Math.round(maxAge / 86400)} days${hasSubDomains ? ', includes subdomains' : ''}).`;
            } else if (maxAge !== null && maxAge > 0) {
              score = 80;
              status = 'pass';
              summary = `HTTPS active, but HSTS max-age (${Math.round(maxAge / 86400)} days) is shorter than recommended 1 year.`;
              recs.push('Increase HSTS max-age to at least 31536000 seconds (1 year).');
            } else {
              score = 70;
              status = 'warn';
              summary = 'HSTS header present but max-age is zero or invalid.';
              recs.push('Set Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
            }
          } else {
            score = 60;
            status = 'warn';
            summary = 'HTTPS is active, but Strict-Transport-Security (HSTS) header is missing.';
            recs.push('Enable HSTS header to prevent SSL-stripping attacks: Strict-Transport-Security: max-age=31536000; includeSubDomains');
          }

          if (hsts && !hasSubDomains) {
            recs.push('Add "includeSubDomains" directive to your HSTS policy to protect all subdomains.');
          }

          return {
            id: 'https-enforcement',
            name: 'HTTPS Enforcement',
            status,
            score,
            summary,
            details: [
              { label: 'HTTPS Protocol', value: 'Active (https://)', type: 'text' },
              { label: 'HSTS Header', value: hsts || 'Missing', type: 'text' },
              { label: 'HSTS Max-Age', value: maxAge !== null ? `${maxAge} seconds (~${Math.round(maxAge / 86400)} days)` : 'None', type: 'text' },
              { label: 'Includes Subdomains', value: hasSubDomains ? 'Yes' : 'No', type: 'text' },
              { label: 'Preload Flag', value: hasPreload ? 'Yes (eligible for HSTS preload list)' : 'No', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['HTTPS and HSTS are configured to maximum security standards.'],
            duration: Date.now() - start,
            raw: { isHttps, hsts, maxAge, hasSubDomains, hasPreload, score }
          };
        }
      },

      // 2. Content Security Policy (CSP)
      {
        id: 'content-security-policy',
        name: 'Content Security Policy (CSP)',
        description: 'Analyzes Content-Security-Policy headers or meta tags for XSS, script injection, and clickjacking restrictions.',
        helpText: 'CSP specifies authorized sources of executable scripts, stylesheets, and objects to prevent Cross-Site Scripting (XSS).',
        type: 'auto',
        tags: ['csp', 'xss', 'security-headers', 'injection'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);
          const headers = context?.fetchResult?.headers;

          let csp = getHeader(headers, 'content-security-policy') || '';
          if (!csp && doc) {
            const metaCsp = doc.querySelector('meta[http-equiv="Content-Security-Policy" i]');
            if (metaCsp) {
              csp = metaCsp.getAttribute('content') || '';
            }
          }

          if (!csp) {
            return {
              id: 'content-security-policy',
              name: 'Content Security Policy (CSP)',
              status: 'fail',
              score: 0,
              summary: 'Missing Content-Security-Policy header. Site is vulnerable to cross-site script injections.',
              details: [{ label: 'CSP Status', value: 'Not configured', type: 'text' }],
              recommendations: [
                'Implement a strong Content-Security-Policy header (e.g. default-src \'self\'; script-src \'self\'; style-src \'self\'; object-src \'none\').',
                'Start with Content-Security-Policy-Report-Only to test policy violations before enforcing.'
              ],
              duration: Date.now() - start,
              raw: { hasCsp: false }
            };
          }

          // Parse CSP Directives
          const rawDirectives = csp.split(';').map(d => d.trim()).filter(Boolean);
          const directives = {};
          const directiveRows = [['Directive', 'Sources / Values', 'Evaluation']];

          rawDirectives.forEach(dir => {
            const parts = dir.split(/\s+/);
            const name = parts[0].toLowerCase();
            const values = parts.slice(1);
            directives[name] = values;
          });

          const issues = [];
          const recs = [];
          let score = 100;

          // 1. Check default-src
          if (!directives['default-src']) {
            score -= 20;
            issues.push('Missing default-src fallback directive');
            directiveRows.push(['default-src', '[Missing]', '⚠️ High Risk: No fallback source defined']);
          }

          // 2. Check script-src
          const scriptSrc = directives['script-src'] || directives['default-src'] || [];
          if (scriptSrc.length > 0) {
            const hasUnsafeInline = scriptSrc.includes("'unsafe-inline'");
            const hasUnsafeEval = scriptSrc.includes("'unsafe-eval'");
            const hasWildcard = scriptSrc.includes('*');

            let scriptEval = 'Well restricted';
            if (hasUnsafeInline) {
              score -= 25;
              issues.push("script-src allows 'unsafe-inline' (allows injected script execution)");
              scriptEval = "❌ Flawed: allows 'unsafe-inline'";
              recs.push("Replace 'unsafe-inline' scripts with cryptographic nonces (nonce-...) or SHA-256 hashes.");
            }
            if (hasUnsafeEval) {
              score -= 20;
              issues.push("script-src allows 'unsafe-eval' (allows eval and string execution)");
              scriptEval += (scriptEval ? ', ' : '') + "❌ allows 'unsafe-eval'";
              recs.push("Remove 'unsafe-eval' from script-src to prevent dynamic code generation vulnerabilities.");
            }
            if (hasWildcard) {
              score -= 20;
              issues.push('script-src uses wildcard * (allows scripts from any web origin)');
              scriptEval += (scriptEval ? ', ' : '') + '❌ wildcard origin';
              recs.push('Restrict script-src to specific trusted domains instead of wildcard *.');
            }

            directiveRows.push(['script-src', scriptSrc.join(' '), scriptEval]);
          }

          // 3. Check object-src
          const objectSrc = directives['object-src'] || directives['default-src'] || [];
          if (!objectSrc.includes("'none'")) {
            score -= 10;
            issues.push("object-src is not set to 'none' (Flash/Java plugin attack surface)");
            recs.push("Set object-src 'none' to disable legacy plugins and object embedding.");
          }

          // Append other directives to table
          Object.keys(directives).forEach(name => {
            if (name !== 'default-src' && name !== 'script-src') {
              directiveRows.push([name, directives[name].join(' '), 'Configured']);
            }
          });

          score = Math.max(0, score);
          const status = issues.length === 0 ? 'pass' : (score >= 60 ? 'warn' : 'fail');
          const summary = issues.length === 0
            ? 'Strong Content Security Policy configured with strict script execution boundaries.'
            : `CSP present with ${issues.length} weakness(es): ${issues.join('; ')}.`;

          return {
            id: 'content-security-policy',
            name: 'Content Security Policy (CSP)',
            status,
            score,
            summary,
            details: [
              { label: 'Raw Policy', value: csp, type: 'code' },
              { label: 'Directives Audit', value: directiveRows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['CSP directives adhere to modern web application security benchmarks.'],
            duration: Date.now() - start,
            raw: { csp, directives, issues, score }
          };
        }
      },

      // 3. Clickjacking Protection (X-Frame-Options)
      {
        id: 'x-frame-options',
        name: 'Clickjacking Protection (X-Frame-Options)',
        description: 'Inspects X-Frame-Options and CSP frame-ancestors to prevent unauthorized iframe framing.',
        helpText: 'Clickjacking tricks users into clicking disguised buttons by embedding the site in an invisible iframe overlay.',
        type: 'auto',
        tags: ['clickjacking', 'x-frame-options', 'iframe', 'frame-ancestors'],
        async run(context) {
          const start = Date.now();
          const headers = context?.fetchResult?.headers;
          const xfo = (getHeader(headers, 'x-frame-options') || '').toUpperCase().trim();
          const csp = (getHeader(headers, 'content-security-policy') || '').toLowerCase();

          const hasFrameAncestors = csp.includes('frame-ancestors');
          const isDeny = xfo === 'DENY';
          const isSameOrigin = xfo === 'SAMEORIGIN';

          let score = 0;
          let status = 'fail';
          let summary = '';
          const recs = [];

          if (hasFrameAncestors) {
            score = 100;
            status = 'pass';
            summary = 'Clickjacking protection enforced via modern CSP frame-ancestors directive.';
          } else if (isDeny) {
            score = 100;
            status = 'pass';
            summary = 'Clickjacking protection enforced via X-Frame-Options: DENY.';
          } else if (isSameOrigin) {
            score = 90;
            status = 'pass';
            summary = 'Clickjacking protection configured via X-Frame-Options: SAMEORIGIN.';
            recs.push('Consider modernizing by adding Content-Security-Policy: frame-ancestors \'self\'.');
          } else if (xfo === 'ALLOWALL' || xfo.startsWith('ALLOW-FROM')) {
            score = 30;
            status = 'warn';
            summary = `Deprecated or permissive frame option detected: ${xfo}.`;
            recs.push('Replace obsolete ALLOW-FROM with CSP frame-ancestors directive.');
          } else {
            score = 0;
            status = 'fail';
            summary = 'Missing X-Frame-Options and CSP frame-ancestors. Site is vulnerable to iframe clickjacking.';
            recs.push('Send header "X-Frame-Options: SAMEORIGIN" or "Content-Security-Policy: frame-ancestors \'self\'".');
          }

          return {
            id: 'x-frame-options',
            name: 'Clickjacking Protection (X-Frame-Options)',
            status,
            score,
            summary,
            details: [
              { label: 'X-Frame-Options Header', value: xfo || 'Not Set', type: 'text' },
              { label: 'CSP frame-ancestors', value: hasFrameAncestors ? 'Configured in CSP' : 'Not configured', type: 'text' },
              { label: 'Clickjacking Protection', value: (score >= 90) ? 'Protected' : 'Unprotected', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Iframe framing restrictions prevent UI redressing and clickjacking.'],
            duration: Date.now() - start,
            raw: { xfo, hasFrameAncestors, score }
          };
        }
      },

      // 4. MIME-Type Sniffing Protection
      {
        id: 'x-content-type',
        name: 'MIME-Type Sniffing Protection',
        description: 'Checks for X-Content-Type-Options: nosniff header to prevent browsers executing malicious uploaded files.',
        helpText: 'Without "nosniff", browsers may interpret user-uploaded images or text files as executable JavaScript.',
        type: 'auto',
        tags: ['mime', 'nosniff', 'x-content-type-options', 'headers'],
        async run(context) {
          const start = Date.now();
          const headers = context?.fetchResult?.headers;
          const xcto = (getHeader(headers, 'x-content-type-options') || '').toLowerCase().trim();

          const isNosniff = xcto === 'nosniff';
          const score = isNosniff ? 100 : 0;
          const status = isNosniff ? 'pass' : 'fail';
          const summary = isNosniff
            ? 'X-Content-Type-Options is set to "nosniff" (MIME type sniffing disabled).'
            : 'Missing X-Content-Type-Options: nosniff header.';

          const recs = [];
          if (!isNosniff) {
            recs.push('Configure web server to add "X-Content-Type-Options: nosniff" to all HTTP responses.');
          }

          return {
            id: 'x-content-type',
            name: 'MIME-Type Sniffing Protection',
            status,
            score,
            summary,
            details: [
              { label: 'X-Content-Type-Options Header', value: xcto || 'Missing', type: 'text' },
              { label: 'MIME Sniffing Status', value: isNosniff ? 'Disabled (Protected)' : 'Vulnerable', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Browser MIME-sniffing protection is active.'],
            duration: Date.now() - start,
            raw: { header: xcto, isNosniff }
          };
        }
      },

      // 5. Referrer Policy
      {
        id: 'referrer-policy',
        name: 'Referrer Policy',
        description: 'Inspects Referrer-Policy HTTP headers or meta tags to prevent leaking sensitive URLs in Referer headers.',
        helpText: 'Restricting the Referer header prevents sensitive query parameters (like tokens or reset links) leaking to third parties.',
        type: 'auto',
        tags: ['referrer-policy', 'privacy', 'headers'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);
          const headers = context?.fetchResult?.headers;

          let policy = getHeader(headers, 'referrer-policy') || '';
          if (!policy && doc) {
            const metaRef = doc.querySelector('meta[name="referrer" i]');
            if (metaRef) {
              policy = metaRef.getAttribute('content') || '';
            }
          }
          policy = policy.toLowerCase().trim();

          let score = 50;
          let status = 'warn';
          let summary = '';
          const recs = [];

          const bestPolicies = ['strict-origin-when-cross-origin', 'no-referrer', 'same-origin'];
          const acceptablePolicies = ['strict-origin', 'no-referrer-when-downgrade'];
          const dangerousPolicies = ['unsafe-url'];

          if (bestPolicies.includes(policy)) {
            score = 100;
            status = 'pass';
            summary = `Strong Referrer-Policy configured: "${policy}".`;
          } else if (policy === 'strict-origin') {
            score = 80;
            status = 'pass';
            summary = `Referrer-Policy "${policy}" is active.`;
          } else if (dangerousPolicies.includes(policy)) {
            score = 20;
            status = 'fail';
            summary = 'Dangerous policy "unsafe-url" leaks complete URLs (including query strings) to third-party domains.';
            recs.push('Immediately change Referrer-Policy to "strict-origin-when-cross-origin" or "no-referrer".');
          } else if (!policy) {
            score = 50;
            status = 'warn';
            summary = 'No Referrer-Policy specified. Browsers default to "strict-origin-when-cross-origin".';
            recs.push('Explicitly declare header "Referrer-Policy: strict-origin-when-cross-origin" to guarantee consistent behavior across all clients.');
          } else {
            score = 70;
            status = 'info';
            summary = `Referrer policy set to "${policy}".`;
          }

          return {
            id: 'referrer-policy',
            name: 'Referrer Policy',
            status,
            score,
            summary,
            details: [
              { label: 'Referrer-Policy', value: policy || 'Not explicitly declared (Browser default)', type: 'text' },
              { label: 'Policy Rating', value: score === 100 ? 'Optimal' : (score >= 70 ? 'Acceptable' : 'Deficient'), type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Referrer policy prevents unwanted URL leakages.'],
            duration: Date.now() - start,
            raw: { policy, score }
          };
        }
      },

      // 6. Permissions Policy
      {
        id: 'permissions-policy',
        name: 'Permissions Policy',
        description: 'Audits Permissions-Policy (formerly Feature-Policy) for disabling unused browser APIs (camera, microphone, geolocation).',
        helpText: 'Disabling sensitive hardware APIs ensures third-party scripts or embedded iframes cannot access webcams or microphones.',
        type: 'auto',
        tags: ['permissions-policy', 'feature-policy', 'camera', 'microphone', 'geolocation'],
        async run(context) {
          const start = Date.now();
          const headers = context?.fetchResult?.headers;

          const pp = getHeader(headers, 'permissions-policy') || getHeader(headers, 'feature-policy') || '';

          const hasPolicy = !!pp;
          const score = hasPolicy ? 100 : 60;
          const status = hasPolicy ? 'pass' : 'info';
          const summary = hasPolicy
            ? 'Permissions-Policy header detected. Hardware and device API privileges are restricted.'
            : 'No Permissions-Policy header found. Hardware features rely on browser user prompts.';

          const recs = [];
          if (!hasPolicy) {
            recs.push('Add a Permissions-Policy header to disable unused device APIs: Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
          }

          return {
            id: 'permissions-policy',
            name: 'Permissions Policy',
            status,
            score,
            summary,
            details: [
              { label: 'Permissions-Policy Header', value: pp || 'Omitted', type: 'text' },
              { label: 'Feature Restrictions', value: hasPolicy ? 'Explicitly defined' : 'Default browser permissions', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Permissions policy restricts sensitive browser capabilities.'],
            duration: Date.now() - start,
            raw: { permissionsPolicy: pp, hasPolicy }
          };
        }
      },

      // 7. Mixed Content Detection
      {
        id: 'mixed-content',
        name: 'Mixed Content Detection',
        description: 'Scans for insecure HTTP resources (images, scripts, styles, iframes) on an HTTPS webpage.',
        helpText: 'Active mixed content (scripts/iframes over HTTP) allows attackers to rewrite webpage content; passive mixed content leaks data.',
        type: 'auto',
        tags: ['mixed-content', 'https', 'insecure-resources'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);
          const targetUrl = context?.url || '';
          const isHttps = targetUrl.toLowerCase().startsWith('https://');

          if (!doc) {
            return {
              id: 'mixed-content',
              name: 'Mixed Content Detection',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          if (!isHttps) {
            return {
              id: 'mixed-content',
              name: 'Mixed Content Detection',
              status: 'info',
              score: 50,
              summary: 'Site is served over plain HTTP; mixed content analysis requires an HTTPS parent origin.',
              details: [{ label: 'Scheme', value: 'http://', type: 'text' }],
              recommendations: ['Migrate site to HTTPS first.'],
              duration: Date.now() - start,
              raw: { isHttps: false }
            };
          }

          const mixedItems = [];
          const mixedRows = [['Element Type', 'Resource URL', 'Risk Level']];

          // 1. Insecure Scripts (Active Mixed Content - Critical)
          doc.querySelectorAll('script[src^="http://"]').forEach(el => {
            const src = el.getAttribute('src');
            mixedItems.push({ type: 'script', url: src, critical: true });
            mixedRows.push(['<script src>', src.slice(0, 45), 'CRITICAL (Active Mixed Content)']);
          });

          // 2. Insecure Stylesheets (Active Mixed Content - High)
          doc.querySelectorAll('link[rel="stylesheet"][href^="http://"]').forEach(el => {
            const href = el.getAttribute('href');
            mixedItems.push({ type: 'stylesheet', url: href, critical: true });
            mixedRows.push(['<link stylesheet>', href.slice(0, 45), 'HIGH (Active Mixed Content)']);
          });

          // 3. Insecure Iframes (Active Mixed Content - Critical)
          doc.querySelectorAll('iframe[src^="http://"]').forEach(el => {
            const src = el.getAttribute('src');
            mixedItems.push({ type: 'iframe', url: src, critical: true });
            mixedRows.push(['<iframe src>', src.slice(0, 45), 'CRITICAL (Active Mixed Content)']);
          });

          // 4. Insecure Images & Media (Passive Mixed Content - Medium)
          doc.querySelectorAll('img[src^="http://"], video[src^="http://"], audio[src^="http://"], source[src^="http://"]').forEach(el => {
            const src = el.getAttribute('src');
            mixedItems.push({ type: el.tagName.toLowerCase(), url: src, critical: false });
            mixedRows.push([`<${el.tagName.toLowerCase()}>`, src.slice(0, 45), 'MEDIUM (Passive Mixed Content)']);
          });

          const totalMixed = mixedItems.length;
          const score = totalMixed === 0 ? 100 : 0;
          const status = totalMixed === 0 ? 'pass' : 'fail';
          const summary = totalMixed === 0
            ? 'Zero mixed content detected. All media, scripts, and stylesheets load securely over HTTPS.'
            : `Detected ${totalMixed} insecure HTTP resource(s) loaded on an HTTPS webpage!`;

          const recs = [];
          if (totalMixed > 0) {
            recs.push('Update all insecure resource URLs to use "https://" or root-relative paths.');
            recs.push('Add CSP directive "upgrade-insecure-requests;" to automatically rewrite HTTP requests to HTTPS.');
          }

          return {
            id: 'mixed-content',
            name: 'Mixed Content Detection',
            status,
            score,
            summary,
            details: [
              { label: 'Insecure Resources Count', value: `${totalMixed} resource(s)`, type: 'text' },
              ...(mixedRows.length > 1 ? [{ label: 'Mixed Content Audit', value: mixedRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['All subresources adhere to secure transport standards.'],
            duration: Date.now() - start,
            raw: { totalMixed, mixedItems }
          };
        }
      },

      // 8. Sensitive Data in Source
      {
        id: 'sensitive-data-exposure',
        name: 'Sensitive Data in Source',
        description: 'Scans HTML markup, comments, and inline scripts for exposed API keys, credentials, internal IPs, and emails.',
        helpText: 'Developers occasionally leave confidential API credentials, database passwords, or internal server IPs in client-visible code.',
        type: 'auto',
        tags: ['api-keys', 'secrets', 'leakage', 'comments', 'ip-addresses'],
        async run(context) {
          const start = Date.now();
          const html = context?.html || '';

          if (!html) {
            return {
              id: 'sensitive-data-exposure',
              name: 'Sensitive Data in Source',
              status: 'info',
              score: 100,
              summary: 'No raw HTML available to scan for sensitive data patterns.',
              details: [{ label: 'HTML', value: 'Unavailable', type: 'text' }],
              recommendations: [],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const findings = [];
          const findingRows = [['Pattern Category', 'Masked Finding Sample', 'Risk Assessment']];

          // 1. AWS Access Keys
          const awsKeys = html.match(/\b(AKIA[0-9A-Z]{16})\b/g) || [];
          awsKeys.forEach(k => {
            findings.push({ category: 'AWS Access Key', match: k, severity: 'Critical' });
            findingRows.push(['AWS Access Key ID', maskSecret(k), 'CRITICAL: Revoke and rotate key immediately']);
          });

          // 2. Google API Keys
          const googleKeys = html.match(/\b(AIza[0-9A-Za-z\-_]{35})\b/g) || [];
          googleKeys.forEach(k => {
            findings.push({ category: 'Google API Key', match: k, severity: 'High' });
            findingRows.push(['Google Cloud API Key', maskSecret(k), 'HIGH: Verify key is restricted by HTTP referrer / API type']);
          });

          // 3. Passwords / Secrets in HTML Comments
          const commentRegex = /<!--([\s\S]*?)-->/g;
          let commentMatch;
          while ((commentMatch = commentRegex.exec(html)) !== null) {
            const commentBody = commentMatch[1];
            if (/password|passwd|pwd|secret_key|auth_token|db_pass/i.test(commentBody)) {
              findings.push({ category: 'Comment Secret', match: commentBody.trim().slice(0, 50), severity: 'High' });
              findingRows.push(['Secret in HTML Comment', maskSecret(commentBody.trim().slice(0, 30)), 'HIGH: Remove confidential notes from HTML comments']);
            }
          }

          // 4. Private RFC-1918 IP Addresses
          const privateIpRegex = /\b(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/g;
          const privateIps = html.match(privateIpRegex) || [];
          const uniqueIps = Array.from(new Set(privateIps));
          uniqueIps.forEach(ip => {
            findings.push({ category: 'Internal IP', match: ip, severity: 'Medium' });
            findingRows.push(['Internal IP Address', ip, 'MEDIUM: Internal network topology disclosure']);
          });

          // 5. Email addresses (Often public, but useful for notice)
          const emails = html.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || [];
          const uniqueEmails = Array.from(new Set(emails));
          if (uniqueEmails.length > 0) {
            findingRows.push(['Public Email Addresses', `${uniqueEmails.length} found (${uniqueEmails.slice(0, 3).join(', ')})`, 'LOW: Public contact info (target for spam bots)']);
          }

          const hasCritical = findings.some(f => f.severity === 'Critical');
          const hasHigh = findings.some(f => f.severity === 'High');

          let score = 100;
          let status = 'pass';
          const recs = [];

          if (hasCritical) {
            score = 20;
            status = 'fail';
            recs.push('CRITICAL: Rotate and invalidate any leaked AWS or cloud credentials immediately!');
          } else if (hasHigh) {
            score = 50;
            status = 'warn';
            recs.push('Remove hardcoded secrets and strip internal development comments from production builds.');
          } else if (uniqueIps.length > 0) {
            score = 80;
            status = 'warn';
            recs.push('Mask internal RFC 1918 private IP addresses in production HTML outputs.');
          }

          const summary = findings.length === 0
            ? 'No exposed credentials, private IPs, or suspicious tokens found in HTML markup.'
            : `Detected ${findings.length} potential security pattern match(es) in client source code.`;

          return {
            id: 'sensitive-data-exposure',
            name: 'Sensitive Data in Source',
            status,
            score,
            summary,
            details: [
              { label: 'Potential Leakages', value: `${findings.length} item(s)`, type: 'text' },
              { label: 'Public Emails Detected', value: `${uniqueEmails.length} address(es)`, type: 'text' },
              ...(findingRows.length > 1 ? [{ label: 'Exposure Audit', value: findingRows, type: 'table' }] : [])
            ],
            recommendations: recs.length ? recs : ['HTML source is clean of confidential tokens and credentials.'],
            duration: Date.now() - start,
            raw: { findingsCount: findings.length, emailCount: uniqueEmails.length }
          };
        }
      },

      // 9. Cookie Security
      {
        id: 'cookie-security',
        name: 'Cookie Security',
        description: 'Examines Set-Cookie flags (Secure, HttpOnly, SameSite) to protect session tokens against XSS and CSRF.',
        helpText: 'Secure cookies cannot be read in transit; HttpOnly prevents theft via XSS; SameSite shields against Cross-Site Request Forgery.',
        type: 'auto',
        tags: ['cookies', 'session', 'httponly', 'samesite', 'csrf'],
        async run(context) {
          const start = Date.now();
          const headers = context?.fetchResult?.headers;
          const rawSetCookie = getHeader(headers, 'set-cookie') || '';

          if (!rawSetCookie) {
            return {
              id: 'cookie-security',
              name: 'Cookie Security',
              status: 'info',
              score: 100,
              summary: 'No Set-Cookie response headers detected on this endpoint.',
              details: [{ label: 'Set-Cookie Header', value: 'None sent in initial HTTP response', type: 'text' }],
              recommendations: ['Ensure any cookies issued during user sessions include Secure, HttpOnly, and SameSite=Lax flags.'],
              duration: Date.now() - start,
              raw: { cookieCount: 0 }
            };
          }

          // Split multiple cookies if formatted as array or comma-separated
          const cookieStrings = Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie];
          const cookieRows = [['Cookie Name', 'Secure Flag', 'HttpOnly Flag', 'SameSite Flag', 'Status']];
          let totalCookies = 0;
          let insecureCount = 0;

          cookieStrings.forEach(cStr => {
            totalCookies++;
            const parts = cStr.split(';').map(p => p.trim());
            const nameVal = parts[0] || '';
            const cookieName = nameVal.split('=')[0] || `Cookie #${totalCookies}`;

            const isSecure = parts.some(p => p.toLowerCase() === 'secure');
            const isHttpOnly = parts.some(p => p.toLowerCase() === 'httponly');
            const sameSitePart = parts.find(p => p.toLowerCase().startsWith('samesite='));
            const sameSite = sameSitePart ? sameSitePart.split('=')[1] : null;

            let isProblem = false;
            if (!isSecure || !isHttpOnly || !sameSite) {
              isProblem = true;
              insecureCount++;
            }

            cookieRows.push([
              cookieName,
              isSecure ? '✅ Secure' : '❌ Missing',
              isHttpOnly ? '✅ HttpOnly' : '❌ Missing (XSS risk)',
              sameSite ? `✅ ${sameSite}` : '❌ Missing (CSRF risk)',
              isProblem ? '⚠️ Needs Hardening' : '✅ Optimal'
            ]);
          });

          const score = Math.max(0, 100 - (insecureCount * 25));
          const status = insecureCount === 0 ? 'pass' : (score >= 60 ? 'warn' : 'fail');
          const summary = insecureCount === 0
            ? `All ${totalCookies} cookie(s) have Secure, HttpOnly, and SameSite flags enabled.`
            : `Found ${insecureCount} cookie(s) missing security flags out of ${totalCookies} total cookie(s).`;

          const recs = [];
          if (insecureCount > 0) {
            recs.push('Always append "Secure" flag to ensure cookies are only transmitted over HTTPS.');
            recs.push('Append "HttpOnly" to session cookies to prevent theft via JavaScript document.cookie.');
            recs.push('Append "SameSite=Lax" or "SameSite=Strict" to protect against Cross-Site Request Forgery (CSRF).');
          }

          return {
            id: 'cookie-security',
            name: 'Cookie Security',
            status,
            score,
            summary,
            details: [
              { label: 'Cookies Evaluated', value: `${totalCookies} cookie(s)`, type: 'text' },
              { label: 'Hardened Cookies', value: `${totalCookies - insecureCount} of ${totalCookies}`, type: 'text' },
              { label: 'Cookie Flag Breakdown', value: cookieRows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['All cookies comply with modern browser security flags.'],
            duration: Date.now() - start,
            raw: { totalCookies, insecureCount, score }
          };
        }
      },

      // 10. CORS Configuration
      {
        id: 'cors-headers',
        name: 'CORS Configuration',
        description: 'Verifies Access-Control-Allow-Origin and Access-Control-Allow-Credentials configuration.',
        helpText: 'Permissive CORS wildcards combined with credentials allow unauthorized domains to read private user responses.',
        type: 'auto',
        tags: ['cors', 'origin', 'cross-origin', 'api-security'],
        async run(context) {
          const start = Date.now();
          const headers = context?.fetchResult?.headers;

          const acao = (getHeader(headers, 'access-control-allow-origin') || '').trim();
          const acac = (getHeader(headers, 'access-control-allow-credentials') || '').trim().toLowerCase();

          let score = 100;
          let status = 'pass';
          let summary = '';
          const recs = [];

          if (!acao) {
            score = 100;
            status = 'pass';
            summary = 'CORS headers omitted. Default same-origin policy is active (safest setting for standard websites).';
          } else if (acao === '*') {
            if (acac === 'true') {
              score = 0;
              status = 'fail';
              summary = 'CRITICAL: Access-Control-Allow-Origin: * combined with Allow-Credentials: true violates web standards and leaks authenticated data!';
              recs.push('Never combine wildcard Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true.');
            } else {
              score = 65;
              status = 'warn';
              summary = 'Access-Control-Allow-Origin is set to wildcard (*). Any website can read response content via fetch/XHR.';
              recs.push('If this endpoint is not a public public API, restrict Access-Control-Allow-Origin to authorized domains.');
            }
          } else {
            score = 100;
            status = 'pass';
            summary = `CORS is restricted to authorized origin: ${acao}.`;
          }

          return {
            id: 'cors-headers',
            name: 'CORS Configuration',
            status,
            score,
            summary,
            details: [
              { label: 'Access-Control-Allow-Origin', value: acao || 'None (Default Same-Origin)', type: 'text' },
              { label: 'Access-Control-Allow-Credentials', value: acac || 'None', type: 'text' },
              { label: 'CORS Risk Evaluation', value: (score === 100) ? 'Secure' : (score > 50 ? 'Moderate (Public wildcard)' : 'Critical Vulnerability'), type: 'text' }
            ],
            recommendations: recs.length ? recs : ['CORS cross-origin access rules follow security best practices.'],
            duration: Date.now() - start,
            raw: { acao, acac, score }
          };
        }
      },

      // 11. Server Information Disclosure
      {
        id: 'server-information',
        name: 'Server Information Disclosure',
        description: 'Checks for software name and version number leaks in Server and X-Powered-By response headers.',
        helpText: 'Disclosing exact server versions (e.g. Apache/2.4.41 or PHP/8.0.2) helps attackers search CVE databases for known exploits.',
        type: 'auto',
        tags: ['banner-grabbing', 'server-header', 'x-powered-by', 'fingerprinting'],
        async run(context) {
          const start = Date.now();
          const headers = context?.fetchResult?.headers;

          const server = getHeader(headers, 'server') || '';
          const xPoweredBy = getHeader(headers, 'x-powered-by') || '';

          const hasVersion = /\d+\.\d+/.test(`${server} ${xPoweredBy}`);
          let score = 100;
          let status = 'pass';
          let summary = '';
          const recs = [];

          if (!server && !xPoweredBy) {
            score = 100;
            status = 'pass';
            summary = 'No Server or X-Powered-By software banners disclosed in HTTP response headers.';
          } else if (hasVersion) {
            score = 40;
            status = 'warn';
            summary = `Exact software version numbers disclosed in response headers: "${[server, xPoweredBy].filter(Boolean).join('; ')}".`;
            recs.push('Disable version banners in your web server (e.g., "server_tokens off" in nginx; "ServerSignature Off" and "ServerTokens Prod" in Apache).');
            recs.push('Remove the X-Powered-By header (e.g., "expose_php = Off" in php.ini).');
          } else {
            score = 80;
            status = 'info';
            summary = `Generic server banner revealed without version details: "${[server, xPoweredBy].filter(Boolean).join('; ')}".`;
            recs.push('Consider stripping the Server header completely using your reverse proxy or CDN.');
          }

          return {
            id: 'server-information',
            name: 'Server Information Disclosure',
            status,
            score,
            summary,
            details: [
              { label: 'Server Header', value: server || 'Hidden / None', type: 'text' },
              { label: 'X-Powered-By Header', value: xPoweredBy || 'Hidden / None', type: 'text' },
              { label: 'Version Exposure', value: hasVersion ? 'Exposed (Security Risk)' : 'Hidden', type: 'text' }
            ],
            recommendations: recs.length ? recs : ['Server technology fingerprints are well-concealed.'],
            duration: Date.now() - start,
            raw: { server, xPoweredBy, hasVersion, score }
          };
        }
      },

      // 12. Subresource Integrity (SRI)
      {
        id: 'subresource-integrity',
        name: 'Subresource Integrity (SRI)',
        description: 'Audits third-party CDN scripts and stylesheets for integrity hashes (integrity="sha384-...").',
        helpText: 'SRI ensures that if a third-party CDN is compromised, malicious code injected into libraries will not execute.',
        type: 'auto',
        tags: ['sri', 'cdn', 'integrity', 'supply-chain'],
        async run(context) {
          const start = Date.now();
          const doc = getDoc(context);
          const pageHost = getHostname(context?.url || '');

          if (!doc) {
            return {
              id: 'subresource-integrity',
              name: 'Subresource Integrity (SRI)',
              status: 'error',
              score: null,
              summary: 'Document could not be parsed.',
              details: [{ label: 'Error', value: 'Missing HTML content in test context', type: 'text' }],
              recommendations: ['Ensure the page URL is reachable and returns HTML.'],
              duration: Date.now() - start,
              raw: {}
            };
          }

          const externalAssets = [];
          const rows = [['Asset Type', 'CDN Host / URL', 'Integrity Hash', 'Crossorigin Attribute']];

          // Scripts
          doc.querySelectorAll('script[src]').forEach(script => {
            const src = script.getAttribute('src') || '';
            let host = '';
            try {
              host = new URL(src, context?.url || 'https://example.com').hostname.toLowerCase();
            } catch (e) {
              return;
            }

            if (host && pageHost && host !== pageHost && !host.endsWith(`.${pageHost}`)) {
              const hasIntegrity = script.hasAttribute('integrity');
              const integrity = script.getAttribute('integrity') || '';
              const hasCross = script.hasAttribute('crossorigin');
              externalAssets.push({ type: 'script', src, hasIntegrity, integrity, hasCross });
              rows.push(['<script>', host, hasIntegrity ? integrity.slice(0, 20) + '…' : '❌ Missing', hasCross ? '✅ Present' : '❌ Missing']);
            }
          });

          // Stylesheets
          doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href') || '';
            let host = '';
            try {
              host = new URL(href, context?.url || 'https://example.com').hostname.toLowerCase();
            } catch (e) {
              return;
            }

            if (host && pageHost && host !== pageHost && !host.endsWith(`.${pageHost}`)) {
              const hasIntegrity = link.hasAttribute('integrity');
              const integrity = link.getAttribute('integrity') || '';
              const hasCross = link.hasAttribute('crossorigin');
              externalAssets.push({ type: 'stylesheet', src: href, hasIntegrity, integrity, hasCross });
              rows.push(['<link css>', host, hasIntegrity ? integrity.slice(0, 20) + '…' : '❌ Missing', hasCross ? '✅ Present' : '❌ Missing']);
            }
          });

          if (externalAssets.length === 0) {
            return {
              id: 'subresource-integrity',
              name: 'Subresource Integrity (SRI)',
              status: 'pass',
              score: 100,
              summary: 'All scripts and styles are self-hosted (no external CDN subresources requiring SRI).',
              details: [{ label: 'External Assets', value: '0 external CDN scripts/styles', type: 'text' }],
              recommendations: ['Self-hosting dependencies avoids external supply chain vulnerabilities.'],
              duration: Date.now() - start,
              raw: { externalCount: 0 }
            };
          }

          const withSri = externalAssets.filter(a => a.hasIntegrity).length;
          const ratio = withSri / externalAssets.length;
          const score = Math.round(ratio * 100);
          const status = score >= 90 ? 'pass' : (score >= 50 ? 'warn' : 'fail');

          const summary = withSri === externalAssets.length
            ? `All ${externalAssets.length} external CDN assets are protected with cryptographic SRI hashes.`
            : `${withSri} of ${externalAssets.length} external CDN asset(s) utilize Subresource Integrity (SRI).`;

          const recs = [];
          if (withSri < externalAssets.length) {
            recs.push('Add integrity="sha384-..." and crossorigin="anonymous" to all external CDN scripts and stylesheets.');
          }

          return {
            id: 'subresource-integrity',
            name: 'Subresource Integrity (SRI)',
            status,
            score,
            summary,
            details: [
              { label: 'External CDN Dependencies', value: `${externalAssets.length} asset(s)`, type: 'text' },
              { label: 'SRI Coverage', value: `${withSri} of ${externalAssets.length} (${Math.round(ratio * 100)}%)`, type: 'text' },
              { label: 'CDN Assets SRI Audit', value: rows, type: 'table' }
            ],
            recommendations: recs.length ? recs : ['All CDN dependencies are locked with SRI hashes.'],
            duration: Date.now() - start,
            raw: { total: externalAssets.length, withSri, score }
          };
        }
      }
    ]
  };
})();
