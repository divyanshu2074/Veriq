// VeriQ Category C: Security Testing Tools (Tools #75 to #96)
(function() {
  const tools = [
    // 75. Security Testing (General Posture)
    {
      num: 75, id: '075-security-testing', name: 'Security Posture Audit', category: 'C', categoryName: 'Security Testing', icon: '🔒',
      purpose: 'Audits complete website security posture, headers, SSL/TLS, and exposure points into a safety grade (A+ to F)',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target Web URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.securityScan(inputs.url);
        if (res.error) return { status: 'fail', score: 0, summary: 'Security scan error: ' + res.error, metrics: [], details: [], recommendations: [] };

        return {
          status: res.score >= 80 ? 'pass' : (res.score >= 60 ? 'warn' : 'fail'),
          score: res.score,
          summary: `Security Posture Grade: ${res.grade} (${res.score}/100) with ${res.findings.length} security observation(s).`,
          metrics: [
            { label: 'Security Grade', value: res.grade },
            { label: 'Score', value: `${res.score}/100` },
            { label: 'Findings', value: res.findings.length }
          ],
          details: [
            { label: 'Security Findings', type: 'table', headers: ['Severity', 'Vulnerability', 'Description'], rows: res.findings.map(f => [f.severity, f.title, f.desc]) }
          ],
          recommendations: res.findings.map(f => `Resolve [${f.severity}]: ${f.title} (${f.desc})`)
        };
      }
    },

    // 76. Vulnerability Scanning
    {
      num: 76, id: '076-vulnerability-scanning', name: 'Vulnerability Scanning', category: 'C', categoryName: 'Security Testing', icon: '🛡️',
      purpose: 'Probes for dangerous exposed files (.env, .git, backup archives, debug dumps)',
      executionMode: 'server',
      inputs: [
        { id: 'baseUrl', label: 'Base Domain / URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { baseUrl: 'https://example.com' },
      async execute(inputs, backend) {
        const paths = ['/.env', '/.git/HEAD', '/backup.zip', '/wp-config.php.bak'];
        const rows = [];
        let exposed = 0;

        for (const p of paths) {
          const full = inputs.baseUrl.replace(/\/$/, '') + p;
          const res = await backend.proxy(full);
          const isExposed = res.status === 200 && res.body && !res.body.includes('<!doctype html');
          if (isExposed) exposed++;
          rows.push([p, res.status || 'ERR', isExposed ? '🚨 CRITICAL EXPOSURE' : '✅ Protected (404/Blocked)']);
        }

        const score = exposed === 0 ? 100 : 0;
        return {
          status: score === 100 ? 'pass' : 'fail',
          score,
          summary: exposed === 0 ? 'Vulnerability scan PASSED: Zero sensitive configuration files exposed.' : `CRITICAL ALERT: ${exposed} sensitive file(s) accessible!`,
          metrics: [{ label: 'Files Probed', value: paths.length }, { label: 'Exposed Files', value: exposed }],
          details: [{ label: 'Vulnerability Scan Log', type: 'table', headers: ['Probed Path', 'HTTP Status', 'Security State'], rows }],
          recommendations: exposed > 0 ? ['Immediately restrict public access to hidden directories and environment files via web server configuration.'] : []
        };
      }
    },

    // 77. Penetration Testing
    {
      num: 77, id: '077-penetration-testing', name: 'Penetration Testing (Ethical)', category: 'C', categoryName: 'Security Testing', icon: '⚔️',
      purpose: 'Tests input reflection, header injection, and permissive CORS endpoints',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target URL', type: 'text', default: 'https://example.com' },
        { id: 'authorized', label: 'I have authorization to test this target', type: 'checkbox', default: true }
      ],
      sampleData: { url: 'https://example.com', authorized: true },
      async execute(inputs, backend) {
        if (!inputs.authorized) {
          return { status: 'warn', score: 0, summary: 'Penetration testing requires explicit authorization confirmation.', metrics: [], details: [], recommendations: ['Only perform ethical penetration testing against systems you own or have permission to audit.'] };
        }
        const res = await backend.proxy(inputs.url + '?test=%22%3E%3Cscript%3E');
        const reflected = res.body && res.body.includes('"><script>');
        return {
          status: !reflected ? 'pass' : 'fail',
          score: !reflected ? 100 : 10,
          summary: !reflected ? 'Penetration assessment PASSED: Test canary was not reflected unescaped in server response.' : 'Potential reflected injection vulnerability detected!',
          metrics: [{ label: 'Payload Reflected', value: reflected ? 'YES (Vulnerable)' : 'No (Sanitized)' }],
          details: [],
          recommendations: reflected ? ['Encode all user inputs and query parameters before rendering into DOM.'] : []
        };
      }
    },

    // 78. Authentication Testing
    {
      num: 78, id: '078-authentication-testing', name: 'Authentication Testing', category: 'C', categoryName: 'Security Testing', icon: '🔑',
      purpose: 'Audits password masking, transmission encryption, and secure authentication methods',
      executionMode: 'client',
      inputs: [
        { id: 'formHtml', label: 'Login Form HTML Markup', type: 'code', default: '<form action="https://example.com/api/login" method="POST">\n  <input type="text" name="username">\n  <input type="password" name="password">\n  <button type="submit">Sign In</button>\n</form>' }
      ],
      sampleData: { formHtml: '<form action="http://insecure.com/login" method="GET"><input type="text" name="pwd"></form>' },
      async execute(inputs) {
        const doc = new DOMParser().parseFromString(inputs.formHtml, 'text/html');
        const form = doc.querySelector('form');
        const pwd = doc.querySelector('input[type="password"]');

        const isPost = form && (form.getAttribute('method') || '').toUpperCase() === 'POST';
        const isHttps = form && (form.getAttribute('action') || '').toLowerCase().startsWith('https://');
        const hasMaskedPwd = !!pwd;

        let score = (isPost ? 35 : 0) + (isHttps ? 35 : 0) + (hasMaskedPwd ? 30 : 0);
        return {
          status: score >= 90 ? 'pass' : 'fail',
          score,
          summary: score >= 90 ? 'Authentication form adheres to secure transmission standards (HTTPS + POST + masked password).' : 'Insecure authentication form detected!',
          metrics: [
            { label: 'HTTP POST Method', value: isPost ? 'Yes' : 'No (Insecure GET)' },
            { label: 'HTTPS Endpoint', value: isHttps ? 'Yes' : 'No (Plaintext HTTP)' },
            { label: 'Masked Password Input', value: hasMaskedPwd ? 'Yes' : 'No' }
          ],
          details: [],
          recommendations: score < 90 ? ['Always submit authentication credentials over HTTPS using HTTP POST and type="password".'] : []
        };
      }
    },

    // 79. Authorization Testing
    {
      num: 79, id: '079-authorization-testing', name: 'Authorization Testing', category: 'C', categoryName: 'Security Testing', icon: '🛂',
      purpose: 'Tests access controls, role bypass, and unauthenticated endpoint protections',
      executionMode: 'server',
      inputs: [
        { id: 'adminUrl', label: 'Protected Admin / Private Endpoint URL', type: 'text', default: 'https://example.com/admin' }
      ],
      sampleData: { adminUrl: 'https://example.com/dashboard/private' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.adminUrl);
        const properlyProtected = [401, 403, 302, 301, 404].includes(res.status);
        return {
          status: properlyProtected ? 'pass' : 'warn',
          score: properlyProtected ? 100 : 40,
          summary: properlyProtected ? `Endpoint properly protected without authentication (Status: ${res.status}).` : `Warning: Endpoint returned HTTP ${res.status} to unauthenticated client.`,
          metrics: [{ label: 'HTTP Status', value: res.status || 'ERR' }, { label: 'Protected', value: properlyProtected ? 'Yes' : 'Potentially Open' }],
          details: [],
          recommendations: !properlyProtected ? ['Ensure protected administrative routes require valid session authentication tokens.'] : []
        };
      }
    },

    // 80. SQL Injection Testing (SQLi)
    {
      num: 80, id: '080-sqli-testing', name: 'SQL Injection Testing', category: 'C', categoryName: 'Security Testing', icon: '💉',
      purpose: 'Inspects query strings and form parameters for SQL injection vulnerability indicators',
      executionMode: 'server',
      inputs: [
        { id: 'querySample', label: 'SQL Query or Target Parameter URL', type: 'code', default: "SELECT * FROM users WHERE username = 'admin' AND password = 'secret';" }
      ],
      sampleData: { querySample: "SELECT * FROM products WHERE category = 'books' OR 1=1--" },
      async execute(inputs, backend) {
        const res = await backend.testDatabase({ query: inputs.querySample });
        const hasSqliPattern = res.issues && res.issues.some(i => i.type === 'SECURITY');
        return {
          status: !hasSqliPattern ? 'pass' : 'fail',
          score: !hasSqliPattern ? 100 : 0,
          summary: !hasSqliPattern ? 'SQL injection check PASSED: No vulnerable syntax concatenation detected.' : 'CRITICAL WARNING: SQL injection vulnerability signature detected in query!',
          metrics: [{ label: 'Vulnerability Detected', value: hasSqliPattern ? 'CRITICAL RISK' : 'None' }],
          details: [{ label: 'Inspection Log', type: 'list', value: res.issues ? res.issues.map(i => i.message) : ['Query syntax clean.'] }],
          recommendations: hasSqliPattern ? ['Always use parameterized prepared statements ($1, ?) rather than string concatenation.'] : []
        };
      }
    },

    // 81. Cross-Site Scripting Testing (XSS)
    {
      num: 81, id: '081-xss-testing', name: 'Cross-Site Scripting (XSS) Testing', category: 'C', categoryName: 'Security Testing', icon: '🦠',
      purpose: 'Tests for reflected and stored XSS vulnerabilities using safe canary payloads',
      executionMode: 'client',
      inputs: [
        { id: 'inputPayload', label: 'User Input String to Test', type: 'text', default: '<script>alert(1)</script>' }
      ],
      sampleData: { inputPayload: '<img src=x onerror=alert(1)>' },
      async execute(inputs) {
        const div = document.createElement('div');
        div.textContent = inputs.inputPayload; // safe escaping
        const escaped = div.innerHTML;
        const safe = !escaped.includes('<script>') && !escaped.includes('onerror=');
        return {
          status: safe ? 'pass' : 'fail',
          score: safe ? 100 : 0,
          summary: `HTML entity encoding demonstration: Raw input was sanitized to "${escaped}".`,
          metrics: [{ label: 'Raw Input', value: inputs.inputPayload }, { label: 'Sanitized Output', value: escaped }, { label: 'Escaping Active', value: safe ? 'Yes' : 'No' }],
          details: [],
          recommendations: []
        };
      }
    },

    // 82. CSRF Testing
    {
      num: 82, id: '082-csrf-testing', name: 'Cross-Site Request Forgery (CSRF)', category: 'C', categoryName: 'Security Testing', icon: '🎭',
      purpose: 'Inspects forms for anti-CSRF tokens and SameSite cookie policies',
      executionMode: 'client',
      inputs: [
        { id: 'formHtml', label: 'State-Changing Form HTML', type: 'code', default: '<form action="/transfer" method="POST">\n  <input type="hidden" name="csrf_token" value="abc123xyz">\n  <input type="text" name="amount">\n  <button type="submit">Transfer</button>\n</form>' }
      ],
      sampleData: { formHtml: '<form action="/delete-account" method="POST"><button>Delete</button></form>' },
      async execute(inputs) {
        const hasToken = /csrf|token|_token/i.test(inputs.formHtml);
        return {
          status: hasToken ? 'pass' : 'fail',
          score: hasToken ? 100 : 20,
          summary: hasToken ? 'Anti-CSRF verification PASSED: Cryptographic synchronizer token found in form.' : 'CSRF VULNERABILITY: Form lacks anti-CSRF defense token.',
          metrics: [{ label: 'Anti-CSRF Token', value: hasToken ? 'Present' : 'Missing' }],
          details: [],
          recommendations: !hasToken ? ['Embed unique cryptographically random anti-CSRF tokens in all POST/PUT/DELETE forms.'] : []
        };
      }
    },

    // 83. Security Misconfiguration Testing
    {
      num: 83, id: '083-misconfiguration-testing', name: 'Security Misconfiguration', category: 'C', categoryName: 'Security Testing', icon: '⚙️',
      purpose: 'Audits default server banners, exposed stack traces, and open directory indexes',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target Web URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.securityScan(inputs.url);
        const headers = res.headers || {};
        const disclosesServer = !!headers['server'];
        const disclosesPoweredBy = !!headers['x-powered-by'];
        const score = (!disclosesServer && !disclosesPoweredBy) ? 100 : 70;
        return {
          status: score >= 80 ? 'pass' : 'warn',
          score,
          summary: score === 100 ? 'Zero software banner misconfigurations detected.' : 'Server banners disclose internal framework details.',
          metrics: [{ label: 'Server Header', value: headers['server'] || 'Hidden' }, { label: 'X-Powered-By Header', value: headers['x-powered-by'] || 'Hidden' }],
          details: [],
          recommendations: disclosesPoweredBy ? ['Disable X-Powered-By headers in web server configuration.'] : []
        };
      }
    },

    // 84. Data Protection & Privacy Testing
    {
      num: 84, id: '084-data-protection-testing', name: 'Data Protection & Privacy Testing', category: 'C', categoryName: 'Security Testing', icon: '🔏',
      purpose: 'Scans source code and markup for plaintext credit cards, SSNs, and secrets',
      executionMode: 'client',
      inputs: [
        { id: 'content', label: 'Text / Code to Scan for Sensitive Data', type: 'textarea', default: 'User profile: Name="Bob", Email="bob@example.com", Status="Active"' }
      ],
      sampleData: { content: 'Token = "sk_live_1234567890abcdef"' },
      async execute(inputs) {
        const hasCard = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/.test(inputs.content);
        const hasKey = /sk_live|AKIA[0-9A-Z]{16}/.test(inputs.content);
        const safe = !hasCard && !hasKey;
        return {
          status: safe ? 'pass' : 'fail',
          score: safe ? 100 : 0,
          summary: safe ? 'Data protection audit PASSED: No unmasked PAN or production API credentials detected.' : 'CRITICAL ALERT: Sensitive secrets or unmasked payment data detected in payload!',
          metrics: [{ label: 'Unmasked Cards', value: hasCard ? 'FOUND' : 'None' }, { label: 'Exposed API Keys', value: hasKey ? 'FOUND' : 'None' }],
          details: [],
          recommendations: !safe ? ['Mask all sensitive payment details (PCI-DSS) and rotate any committed secrets immediately.'] : []
        };
      }
    },

    // 85. Session Management Testing
    {
      num: 85, id: '085-session-management-testing', name: 'Session Management Testing', category: 'C', categoryName: 'Security Testing', icon: '🍪',
      purpose: 'Audits cookie security flags (HttpOnly, Secure, SameSite) and expiration lifetimes',
      executionMode: 'client',
      inputs: [
        { id: 'cookieHeader', label: 'Set-Cookie Header Value', type: 'text', default: 'session_id=xyz789; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600' }
      ],
      sampleData: { cookieHeader: 'token=123; Path=/' },
      async execute(inputs) {
        const c = inputs.cookieHeader;
        const hasSecure = /Secure/i.test(c);
        const hasHttpOnly = /HttpOnly/i.test(c);
        const hasSameSite = /SameSite=(Strict|Lax)/i.test(c);

        const score = (hasSecure ? 35 : 0) + (hasHttpOnly ? 35 : 0) + (hasSameSite ? 30 : 0);
        return {
          status: score >= 90 ? 'pass' : (score >= 50 ? 'warn' : 'fail'),
          score,
          summary: `Session cookie security score: ${score}/100. Secure: ${hasSecure}, HttpOnly: ${hasHttpOnly}, SameSite: ${hasSameSite}.`,
          metrics: [{ label: 'Secure Flag', value: hasSecure ? 'Yes' : 'Missing' }, { label: 'HttpOnly Flag', value: hasHttpOnly ? 'Yes' : 'Missing' }, { label: 'SameSite Attribute', value: hasSameSite ? 'Strict/Lax' : 'Missing' }],
          details: [],
          recommendations: score < 90 ? ['Always configure session cookies with HttpOnly, Secure, and SameSite=Strict or Lax attributes.'] : []
        };
      }
    },

    // 86. Input Validation Testing
    {
      num: 86, id: '086-input-validation-testing', name: 'Input Validation Testing', category: 'C', categoryName: 'Security Testing', icon: '🛡️',
      purpose: 'Injects boundaries: null bytes, excessive lengths, and control characters to verify safe rejection',
      executionMode: 'client',
      inputs: [
        { id: 'inputSample', label: 'Input String to Validate', type: 'text', default: 'ValidUser123' }
      ],
      sampleData: { inputSample: 'test\x00admin' },
      async execute(inputs) {
        const hasNullByte = inputs.inputSample.includes('\0');
        const hasOverlong = inputs.inputSample.length > 5000;
        const valid = !hasNullByte && !hasOverlong;
        return {
          status: valid ? 'pass' : 'fail',
          score: valid ? 100 : 20,
          summary: valid ? 'Input validation PASSED: Length and character encoding within safe limits.' : 'Input failed safety validation (Null byte or excessive length detected).',
          metrics: [{ label: 'Null Byte Detected', value: hasNullByte ? 'Yes' : 'No' }, { label: 'Character Count', value: inputs.inputSample.length }],
          details: [],
          recommendations: !valid ? ['Filter null bytes and enforce strict maximum length boundaries on all inputs.'] : []
        };
      }
    },

    // 87. TLS / SSL Testing
    {
      num: 87, id: '087-tls-ssl-testing', name: 'TLS / SSL Testing', category: 'C', categoryName: 'Security Testing', icon: '🔐',
      purpose: 'Connects via raw TLS socket to inspect SSL certificate validity, issuer, cipher, and TLS protocol version',
      executionMode: 'server',
      inputs: [
        { id: 'host', label: 'Target Host / Domain', type: 'text', default: 'example.com' },
        { id: 'port', label: 'Port (default: 443)', type: 'number', default: 443 }
      ],
      sampleData: { host: 'google.com', port: 443 },
      async execute(inputs, backend) {
        const res = await backend.tlsInspect(inputs.host, inputs.port);
        if (res.error) return { status: 'fail', score: 0, summary: 'TLS Handshake failed: ' + res.error, metrics: [], details: [], recommendations: ['Verify port 443 is open and SSL certificate is installed.'] };

        const cert = res.certificate || {};
        const days = cert.daysRemaining || 0;
        const valid = res.authorized && days > 0;
        const score = valid ? (days > 30 ? 100 : 70) : 0;

        return {
          status: score >= 80 ? 'pass' : (score > 0 ? 'warn' : 'fail'),
          score,
          summary: `SSL/TLS Certificate for ${res.host}: ${res.protocol} with ${res.cipher.name}. Valid for ${days} more days.`,
          metrics: [
            { label: 'TLS Protocol', value: res.protocol },
            { label: 'Cipher Suite', value: res.cipher.name },
            { label: 'Days Remaining', value: `${days} days` },
            { label: 'Certificate Authority', value: cert.issuer ? cert.issuer.O || cert.issuer.CN : 'Unknown' }
          ],
          details: [
            { label: 'Certificate Details', type: 'table', headers: ['Property', 'Value'], rows: [
              ['Subject CN', cert.subject ? cert.subject.CN : 'N/A'],
              ['Issuer', cert.issuer ? cert.issuer.CN : 'N/A'],
              ['Valid From', cert.validFrom || 'N/A'],
              ['Valid To', cert.validTo || 'N/A'],
              ['Fingerprint', cert.fingerprint || 'N/A']
            ]}
          ],
          recommendations: days < 30 ? ['Renew SSL certificate before expiration to avoid browser warnings.'] : []
        };
      }
    },

    // 88. Security Headers Testing
    {
      num: 88, id: '088-security-headers-testing', name: 'Security Headers Testing', category: 'C', categoryName: 'Security Testing', icon: '🛡️',
      purpose: 'Audits HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target Web URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url);
        const headers = res.headers || {};

        const hsts = !!headers['strict-transport-security'];
        const csp = !!headers['content-security-policy'];
        const xframe = !!headers['x-frame-options'];
        const nosniff = headers['x-content-type-options'] === 'nosniff';

        let score = (hsts ? 25 : 0) + (csp ? 35 : 0) + (xframe ? 20 : 0) + (nosniff ? 20 : 0);
        return {
          status: score >= 80 ? 'pass' : (score >= 50 ? 'warn' : 'fail'),
          score,
          summary: `Security headers score: ${score}/100. HSTS: ${hsts ? 'Active' : 'Missing'}, CSP: ${csp ? 'Active' : 'Missing'}.`,
          metrics: [
            { label: 'HSTS', value: hsts ? 'Enforced' : 'Missing' },
            { label: 'CSP', value: csp ? 'Enforced' : 'Missing' },
            { label: 'X-Frame-Options', value: xframe ? headers['x-frame-options'] : 'Missing' },
            { label: 'X-Content-Type', value: nosniff ? 'nosniff' : 'Missing' }
          ],
          details: [],
          recommendations: score < 100 ? ['Add missing HSTS, CSP, and X-Content-Type-Options headers in web server responses.'] : []
        };
      }
    },

    // 89. CORS Security Testing
    {
      num: 89, id: '089-cors-testing', name: 'CORS Security Testing', category: 'C', categoryName: 'Security Testing', icon: '🌐',
      purpose: 'Checks cross-origin access control headers and flags dangerous wildcard credentials',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target API Endpoint', type: 'text', default: 'https://example.com/api' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url, {
          headers: { 'Origin': 'https://evil-untrusted-domain.com' }
        });
        const allowOrigin = res.headers ? res.headers['access-control-allow-origin'] : null;
        const allowCreds = res.headers ? res.headers['access-control-allow-credentials'] : null;

        const isDangerous = allowOrigin === '*' && allowCreds === 'true';
        return {
          status: !isDangerous ? 'pass' : 'fail',
          score: !isDangerous ? 100 : 0,
          summary: !isDangerous ? 'CORS policy verification PASSED: Restrictive origin configuration.' : 'CRITICAL CORS VULNERABILITY: Wildcard origin combined with credentials.',
          metrics: [{ label: 'Access-Control-Allow-Origin', value: allowOrigin || 'None (Safe)' }, { label: 'Allow-Credentials', value: allowCreds || 'None' }],
          details: [],
          recommendations: isDangerous ? ['Never combine Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true.'] : []
        };
      }
    },

    // 90. Content Security Policy (CSP) Testing
    {
      num: 90, id: '090-csp-testing', name: 'Content Security Policy (CSP)', category: 'C', categoryName: 'Security Testing', icon: '📜',
      purpose: 'Audits CSP directives to detect unsafe-inline, unsafe-eval, and missing default-src',
      executionMode: 'client',
      inputs: [
        { id: 'cspString', label: 'CSP Header Value to Audit', type: 'textarea', default: "default-src 'self'; script-src 'self' https://trusted-cdn.com; object-src 'none';" }
      ],
      sampleData: { cspString: "default-src *; script-src 'unsafe-inline' 'unsafe-eval' *" },
      async execute(inputs) {
        const csp = inputs.cspString;
        const hasUnsafeInline = csp.includes("'unsafe-inline'");
        const hasUnsafeEval = csp.includes("'unsafe-eval'");
        const hasWildcard = csp.includes('*');

        const score = (!hasUnsafeInline && !hasUnsafeEval && !hasWildcard) ? 100 : (hasUnsafeInline ? 50 : 70);
        return {
          status: score >= 80 ? 'pass' : 'warn',
          score,
          summary: score === 100 ? 'CSP policy is strict and hardened against XSS injections.' : 'CSP policy contains permissive directives (unsafe-inline / wildcard).',
          metrics: [{ label: 'unsafe-inline', value: hasUnsafeInline ? 'Present (Risky)' : 'None' }, { label: 'unsafe-eval', value: hasUnsafeEval ? 'Present (Risky)' : 'None' }],
          details: [],
          recommendations: hasUnsafeInline ? ['Remove "unsafe-inline" and use cryptographic nonces or hashes for scripts.'] : []
        };
      }
    },

    // 91. Clickjacking Testing
    {
      num: 91, id: '091-clickjacking-testing', name: 'Clickjacking Protection', category: 'C', categoryName: 'Security Testing', icon: '🖼️',
      purpose: 'Evaluates X-Frame-Options and CSP frame-ancestors to prevent malicious iframe framing',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url);
        const headers = res.headers || {};
        const xfo = headers['x-frame-options'];
        const csp = headers['content-security-policy'] || '';
        const hasFrameAncestors = csp.includes('frame-ancestors');

        const protected = (xfo && ['DENY', 'SAMEORIGIN'].includes(xfo.toUpperCase())) || hasFrameAncestors;
        return {
          status: protected ? 'pass' : 'fail',
          score: protected ? 100 : 20,
          summary: protected ? `Clickjacking protection ACTIVE via ${xfo ? 'X-Frame-Options: ' + xfo : 'CSP frame-ancestors'}.` : 'VULNERABILITY: Page can be framed in malicious third-party iframes (Clickjacking risk).',
          metrics: [{ label: 'X-Frame-Options', value: xfo || 'Missing' }, { label: 'CSP frame-ancestors', value: hasFrameAncestors ? 'Present' : 'Missing' }],
          details: [],
          recommendations: !protected ? ['Set X-Frame-Options: SAMEORIGIN or Content-Security-Policy: frame-ancestors \'self\'.'] : []
        };
      }
    },

    // 92. Sensitive Data Exposure Testing
    {
      num: 92, id: '092-sensitive-data-testing', name: 'Sensitive Data Exposure', category: 'C', categoryName: 'Security Testing', icon: '👁️',
      purpose: 'Scans response HTML and scripts for leaked private keys, JWTs, and internal paths',
      executionMode: 'client',
      inputs: [
        { id: 'sourceCode', label: 'HTML / JS Markup to Scan', type: 'textarea', default: '<!-- TODO: remove test credentials before production -->\nvar apiKey = "test_12345";' }
      ],
      sampleData: { sourceCode: 'const privateKey = "-----BEGIN PRIVATE KEY-----abc";' },
      async execute(inputs) {
        const hasPrivateKey = inputs.sourceCode.includes('BEGIN PRIVATE KEY');
        const hasJwt = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/.test(inputs.sourceCode);
        const safe = !hasPrivateKey && !hasJwt;
        return {
          status: safe ? 'pass' : 'fail',
          score: safe ? 100 : 0,
          summary: safe ? 'Sensitive data audit PASSED: No private keys or hardcoded JWT tokens in client source.' : 'CRITICAL EXPOSURE: Hardcoded private key or JWT token detected in source code!',
          metrics: [{ label: 'Private Key Found', value: hasPrivateKey ? 'YES (CRITICAL)' : 'No' }, { label: 'JWT Token Found', value: hasJwt ? 'YES' : 'No' }],
          details: [],
          recommendations: !safe ? ['Remove all private keys and credentials from client-side bundles immediately.'] : []
        };
      }
    },

    // 93. Server Information Disclosure
    {
      num: 93, id: '093-server-info-testing', name: 'Server Information Disclosure', category: 'C', categoryName: 'Security Testing', icon: 'ℹ️',
      purpose: 'Audits headers for disclosure of backend web server, version numbers, and OS',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target Web URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url);
        const server = res.headers ? res.headers['server'] : null;
        const disclosesVersion = server && /[0-9]+\.[0-9]+/.test(server);
        return {
          status: !disclosesVersion ? 'pass' : 'warn',
          score: !disclosesVersion ? 100 : 60,
          summary: !disclosesVersion ? 'Server information disclosure check passed.' : `Server header discloses exact version (${server}).`,
          metrics: [{ label: 'Server Header', value: server || 'None' }, { label: 'Version Number Disclosed', value: disclosesVersion ? 'Yes' : 'No' }],
          details: [],
          recommendations: disclosesVersion ? ['Suppress version numbers in server banner (e.g. ServerTokens Prod in Apache/Nginx).'] : []
        };
      }
    },

    // 94. Subresource Integrity (SRI)
    {
      num: 94, id: '094-sri-testing', name: 'Subresource Integrity (SRI)', category: 'C', categoryName: 'Security Testing', icon: '🔗',
      purpose: 'Checks CDN scripts and stylesheets for integrity hashes (sha256/384/512)',
      executionMode: 'client',
      inputs: [
        { id: 'htmlCode', label: 'HTML Markup with External Scripts', type: 'code', default: '<script src="https://cdn.example.com/lib.js" integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC" crossorigin="anonymous"></script>' }
      ],
      sampleData: { htmlCode: '<script src="https://cdn.example.com/untrusted.js"></script>' },
      async execute(inputs) {
        const doc = new DOMParser().parseFromString(inputs.htmlCode, 'text/html');
        const cdnScripts = Array.from(doc.querySelectorAll('script[src^="http"]'));
        const missingSri = cdnScripts.filter(s => !s.getAttribute('integrity'));
        const score = cdnScripts.length === 0 ? 100 : Math.round(((cdnScripts.length - missingSri.length) / cdnScripts.length) * 100);
        return {
          status: score >= 80 ? 'pass' : 'warn',
          score,
          summary: `SRI audit: ${cdnScripts.length - missingSri.length}/${cdnScripts.length} external CDN resources protected with integrity hashes.`,
          metrics: [{ label: 'External Scripts', value: cdnScripts.length }, { label: 'Protected with SRI', value: cdnScripts.length - missingSri.length }],
          details: [],
          recommendations: missingSri.length > 0 ? ['Add integrity="sha384-..." and crossorigin="anonymous" to external CDN script tags.'] : []
        };
      }
    },

    // 95. Mixed Content Testing
    {
      num: 95, id: '095-mixed-content-testing', name: 'Mixed Content Testing', category: 'C', categoryName: 'Security Testing', icon: '🔓',
      purpose: 'Scans HTTPS page markup for insecure plaintext http:// images, scripts, and links',
      executionMode: 'client',
      inputs: [
        { id: 'htmlCode', label: 'HTTPS Page HTML Markup', type: 'code', default: '<img src="http://insecure-cdn.com/logo.png">\n<script src="https://secure-cdn.com/app.js"></script>' }
      ],
      sampleData: { htmlCode: '<img src="https://secure.com/pic.png">' },
      async execute(inputs) {
        const matches = inputs.htmlCode.match(/src=["']http:\/\/[^"']+/gi) || [];
        const score = matches.length === 0 ? 100 : 0;
        return {
          status: score === 100 ? 'pass' : 'fail',
          score,
          summary: score === 100 ? 'Zero mixed content assets detected. All subresources loaded securely.' : `CRITICAL: Found ${matches.length} insecure plaintext http:// asset(s) loaded over HTTPS.`,
          metrics: [{ label: 'Mixed Content Items', value: matches.length }],
          details: [{ label: 'Insecure URLs', type: 'list', value: matches.length ? matches : ['None'] }],
          recommendations: matches.length > 0 ? ['Update all image and script sources from http:// to https://.'] : []
        };
      }
    },

    // 96. Cryptographic Storage Testing
    {
      num: 96, id: '096-crypto-storage-testing', name: 'Cryptographic Storage Testing', category: 'C', categoryName: 'Security Testing', icon: '💾',
      purpose: 'Audits localStorage and client-side stores for plaintext credentials and tokens',
      executionMode: 'client',
      inputs: [
        { id: 'storageKey', label: 'Test Storage Key', type: 'text', default: 'auth_token' },
        { id: 'storageVal', label: 'Test Stored Value', type: 'text', default: 'encrypted:d8f7a6b5c4...' }
      ],
      sampleData: { storageKey: 'password', storageVal: 'plaintext123' },
      async execute(inputs) {
        const isPlaintextPassword = /password|pwd|secret/i.test(inputs.storageKey) && !inputs.storageVal.includes('encrypted');
        return {
          status: !isPlaintextPassword ? 'pass' : 'fail',
          score: !isPlaintextPassword ? 100 : 10,
          summary: !isPlaintextPassword ? 'Storage audit PASSED: No plaintext passwords stored in web storage key.' : 'CRITICAL SECURITY RISK: Plaintext password stored in unencrypted browser storage.',
          metrics: [{ label: 'Storage Key', value: inputs.storageKey }, { label: 'Encryption Detected', value: !isPlaintextPassword ? 'Yes' : 'No' }],
          details: [],
          recommendations: isPlaintextPassword ? ['Never store raw credentials in localStorage or sessionStorage. Use HTTP-only cookies.'] : []
        };
      }
    }
  ];

  tools.forEach(t => window.VeriQ.registerTool(t));
})();
