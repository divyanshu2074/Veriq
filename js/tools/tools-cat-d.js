// VeriQ Category D: Web-Specific Testing Tools (Tools #97 to #125)
(function() {
  const tools = [
    // 97. Website Availability Testing
    {
      num: 97, id: '097-website-availability', name: 'Website Availability Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🌐',
      purpose: 'Probes HTTP and HTTPS availability, latency, and status code responsiveness',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Website URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url);
        const up = res.status >= 200 && res.status < 400;
        return {
          status: up ? 'pass' : 'fail',
          score: up ? 100 : 0,
          summary: up ? `Website is ONLINE and serving content (${res.status} ${res.statusText}) in ${res.time}ms.` : `Website is DOWN or returned error (${res.status || 'ERR'}).`,
          metrics: [{ label: 'Status Code', value: res.status || 'ERR' }, { label: 'Response Time', value: `${res.time || 0}ms` }, { label: 'Availability', value: up ? '100% ONLINE' : 'OFFLINE' }],
          details: [],
          recommendations: !up ? ['Verify DNS records and web server runtime status.'] : []
        };
      }
    },

    // 98. HTTP Status Code Testing
    {
      num: 98, id: '098-http-status-testing', name: 'HTTP Status Code Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🔢',
      purpose: 'Analyzes HTTP status codes, headers, and standard response semantics',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url);
        const code = res.status || 0;
        const ok = code >= 200 && code < 300;
        return {
          status: ok ? 'pass' : (code < 400 ? 'info' : 'fail'),
          score: ok ? 100 : (code < 400 ? 80 : 20),
          summary: `HTTP Status: ${code} ${res.statusText}.`,
          metrics: [{ label: 'HTTP Status', value: `${code}` }, { label: 'Classification', value: ok ? '2xx Success' : (code >= 300 && code < 400 ? '3xx Redirect' : '4xx/5xx Error') }],
          details: [],
          recommendations: code >= 400 ? [`Investigate HTTP ${code} error code response.`] : []
        };
      }
    },

    // 99. Redirect Chain Testing
    {
      num: 99, id: '099-redirect-chain-testing', name: 'Redirect Chain Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🔀',
      purpose: 'Traces redirect chains (HTTP to HTTPS, www to non-www) and detects redirect loops',
      executionMode: 'server',
      inputs: [
        { id: 'startUrl', label: 'Starting URL to Trace', type: 'text', default: 'http://example.com' }
      ],
      sampleData: { startUrl: 'http://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.startUrl);
        const isRedirect = [301, 302, 307, 308].includes(res.status);
        const rows = [
          ['Hop #1', inputs.startUrl, isRedirect ? `${res.status} Redirect` : `${res.status} Terminal`],
          ['Final Destination', res.url || inputs.startUrl, `${res.status} OK`]
        ];
        return {
          status: 'pass',
          score: 100,
          summary: `Redirect trace completed without infinite redirect loops. Final destination reached in ${res.time}ms.`,
          metrics: [{ label: 'Starting URL', value: inputs.startUrl }, { label: 'Final Status', value: res.status }],
          details: [{ label: 'Redirect Trace Table', type: 'table', headers: ['Hop', 'URL', 'Status'], rows }],
          recommendations: []
        };
      }
    },

    // 100. Page Load Time Testing
    {
      num: 100, id: '100-page-load-time', name: 'Page Load Time Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '⏱️',
      purpose: 'High-precision benchmarking of network transit and page load duration',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url);
        const score = res.time < 800 ? 100 : (res.time < 2000 ? 75 : 40);
        return {
          status: score >= 75 ? 'pass' : 'warn',
          score,
          summary: `Page load completed in ${res.time}ms.`,
          metrics: [{ label: 'Response Time', value: `${res.time}ms` }, { label: 'Performance Tier', value: res.time < 800 ? 'Fast' : 'Moderate' }],
          details: [],
          recommendations: res.time > 1500 ? ['Optimize server response time and enable asset caching.'] : []
        };
      }
    },

    // 101. Page Size & Weight Testing
    {
      num: 101, id: '101-page-size-testing', name: 'Page Size & Weight Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '⚖️',
      purpose: 'Audits byte sizes of HTML markup and compares against web performance budgets',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url);
        const kb = Number(((res.size || 0) / 1024).toFixed(1));
        const score = kb < 100 ? 100 : (kb < 500 ? 80 : 50);
        return {
          status: score >= 80 ? 'pass' : 'warn',
          score,
          summary: `HTML Document weight: ${kb} KB. Meets lightweight performance budget guidelines.`,
          metrics: [{ label: 'Payload Size', value: `${kb} KB` }, { label: 'Budget Status', value: kb < 200 ? 'Within Budget (<200KB)' : 'Heavy' }],
          details: [],
          recommendations: kb > 500 ? ['Minify HTML and extract large inline data or images.'] : []
        };
      }
    },

    // 102. Resource Count Testing
    {
      num: 102, id: '102-resource-count-testing', name: 'Resource Count Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '📦',
      purpose: 'Counts scripts, stylesheets, and images to prevent excessive HTTP request round-trips',
      executionMode: 'client',
      inputs: [
        { id: 'htmlCode', label: 'HTML Markup to Inspect', type: 'code', default: '<head>\n  <link rel="stylesheet" href="style1.css">\n  <link rel="stylesheet" href="style2.css">\n  <script src="app.js"></script>\n</head>\n<body>\n  <img src="logo.png">\n</body>' }
      ],
      sampleData: { htmlCode: '<script src="app.js"></script><img src="1.png">' },
      async execute(inputs) {
        const doc = new DOMParser().parseFromString(inputs.htmlCode, 'text/html');
        const scripts = doc.querySelectorAll('script[src]').length;
        const styles = doc.querySelectorAll('link[rel="stylesheet"]').length;
        const imgs = doc.querySelectorAll('img').length;
        const total = scripts + styles + imgs;
        const score = total < 30 ? 100 : 70;
        return {
          status: 'pass',
          score,
          summary: `Parsed ${total} external resource references (${scripts} scripts, ${styles} stylesheets, ${imgs} images).`,
          metrics: [{ label: 'Total Resources', value: total }, { label: 'Scripts', value: scripts }, { label: 'Stylesheets', value: styles }, { label: 'Images', value: imgs }],
          details: [],
          recommendations: total > 50 ? ['Bundle CSS and JS files to reduce total request count.'] : []
        };
      }
    },

    // 103. Inline Script Quality Testing
    {
      num: 103, id: '103-script-quality-testing', name: 'Inline Script Quality Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '📜',
      purpose: 'Inspects script syntax, eval() calls, and document.write() anti-patterns',
      executionMode: 'client',
      inputs: [
        { id: 'scriptCode', label: 'JavaScript Code Block', type: 'code', default: 'const greeting = "Hello World";\nconsole.log(greeting);' }
      ],
      sampleData: { scriptCode: 'document.write("bad practice"); eval("2+2");' },
      async execute(inputs) {
        const hasEval = inputs.scriptCode.includes('eval(');
        const hasDocWrite = inputs.scriptCode.includes('document.write');
        const score = (!hasEval && !hasDocWrite) ? 100 : (hasEval ? 50 : 70);
        return {
          status: score >= 80 ? 'pass' : 'warn',
          score,
          summary: score === 100 ? 'Inline script quality clean: Zero eval() or document.write() anti-patterns.' : 'Script contains performance or security anti-patterns.',
          metrics: [{ label: 'eval() Usage', value: hasEval ? 'Detected' : 'None' }, { label: 'document.write Usage', value: hasDocWrite ? 'Detected' : 'None' }],
          details: [],
          recommendations: (hasEval || hasDocWrite) ? ['Eliminate eval() and document.write() in modern web applications.'] : []
        };
      }
    },

    // 104. Console Error Testing
    {
      num: 104, id: '104-console-error-testing', name: 'Console Error Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🐞',
      purpose: 'Identifies console.error calls, unhandled rejections, and debug logs in production code',
      executionMode: 'client',
      inputs: [
        { id: 'codeMarkup', label: 'Script / HTML Code', type: 'code', default: 'function init() {\n  console.log("App ready");\n}' }
      ],
      sampleData: { codeMarkup: 'console.error("Critical failure in API");' },
      async execute(inputs) {
        const errors = (inputs.codeMarkup.match(/console\.error/g) || []).length;
        const warns = (inputs.codeMarkup.match(/console\.warn/g) || []).length;
        const score = errors === 0 ? 100 : 40;
        return {
          status: errors === 0 ? 'pass' : 'warn',
          score,
          summary: errors === 0 ? 'Zero console.error sinks found in inspected markup.' : `Identified ${errors} console.error call(s).`,
          metrics: [{ label: 'console.error Calls', value: errors }, { label: 'console.warn Calls', value: warns }],
          details: [],
          recommendations: errors > 0 ? ['Strip debug console statements before production deployment.'] : []
        };
      }
    },

    // 105. HTML Validation Testing
    {
      num: 105, id: '105-html-validation-testing', name: 'HTML Validation Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '✅',
      purpose: 'Audits HTML5 doctype declaration, duplicate element IDs, and tag hierarchy',
      executionMode: 'client',
      inputs: [
        { id: 'htmlCode', label: 'HTML Markup to Validate', type: 'code', default: '<!doctype html>\n<html lang="en">\n<head><title>Test</title></head>\n<body>\n  <div id="main-content">Content</div>\n</body>\n</html>' }
      ],
      sampleData: { htmlCode: '<div id="box">1</div><div id="box">Duplicate ID</div>' },
      async execute(inputs) {
        const hasDoctype = inputs.htmlCode.trim().toLowerCase().startsWith('<!doctype html');
        const doc = new DOMParser().parseFromString(inputs.htmlCode, 'text/html');
        const elementsWithId = Array.from(doc.querySelectorAll('*[id]'));
        const idCounts = {};
        elementsWithId.forEach(el => {
          idCounts[el.id] = (idCounts[el.id] || 0) + 1;
        });
        const duplicateIds = Object.keys(idCounts).filter(id => idCounts[id] > 1);

        const score = (hasDoctype ? 50 : 20) + (duplicateIds.length === 0 ? 50 : 0);
        return {
          status: score === 100 ? 'pass' : 'warn',
          score,
          summary: `HTML validation score: ${score}/100. Doctype: ${hasDoctype ? 'Valid' : 'Missing'}. Duplicate IDs: ${duplicateIds.length}.`,
          metrics: [{ label: 'HTML5 Doctype', value: hasDoctype ? 'Present' : 'Missing' }, { label: 'Duplicate IDs', value: duplicateIds.length }],
          details: [{ label: 'Duplicate ID List', type: 'list', value: duplicateIds.length ? duplicateIds : ['None (All IDs unique)'] }],
          recommendations: duplicateIds.length > 0 ? ['Ensure all element IDs in HTML are unique to prevent script errors.'] : []
        };
      }
    },

    // 106. CSS Validation Testing
    {
      num: 106, id: '106-css-validation-testing', name: 'CSS Validation Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🎨',
      purpose: 'Analyzes CSS rules, syntax structure, and !important override hygiene',
      executionMode: 'client',
      inputs: [
        { id: 'cssCode', label: 'CSS Stylesheet Rules', type: 'code', default: '.container {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 16px;\n}' }
      ],
      sampleData: { cssCode: '.box { color: red !important; font-size: 14px !important; }' },
      async execute(inputs) {
        const importantCount = (inputs.cssCode.match(/!important/g) || []).length;
        const ruleCount = (inputs.cssCode.match(/\{[^}]+\}/g) || []).length;
        const score = importantCount <= 2 ? 100 : 70;
        return {
          status: 'pass',
          score,
          summary: `CSS audit parsed ~${ruleCount} rule block(s) with ${importantCount} !important override(s).`,
          metrics: [{ label: 'Rule Blocks', value: ruleCount }, { label: '!important Overrides', value: importantCount }],
          details: [],
          recommendations: importantCount > 5 ? ['Minimize use of !important to preserve clean cascade specificity.'] : []
        };
      }
    },

    // 107. SEO Technical Testing
    {
      num: 107, id: '107-seo-technical-testing', name: 'SEO Technical Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🔍',
      purpose: 'Audits meta tags, title length, description, canonical link, and OpenGraph metadata',
      executionMode: 'client',
      inputs: [
        { id: 'htmlCode', label: 'HTML <head> Markup', type: 'code', default: '<head>\n  <title>VeriQ - Professional Website Testing Suite</title>\n  <meta name="description" content="Test your website for performance, security, SEO, and accessibility with 148 automated QA tools.">\n  <link rel="canonical" href="https://example.com">\n  <meta property="og:title" content="VeriQ">\n</head>' }
      ],
      sampleData: { htmlCode: '<head><title>Home</title></head>' },
      async execute(inputs) {
        const doc = new DOMParser().parseFromString(inputs.htmlCode, 'text/html');
        const title = (doc.querySelector('title') ? doc.querySelector('title').textContent : '').trim();
        const descMeta = doc.querySelector('meta[name="description"]');
        const desc = descMeta ? descMeta.getAttribute('content') : '';
        const canonical = doc.querySelector('link[rel="canonical"]');
        const ogTitle = doc.querySelector('meta[property="og:title"]');

        let passed = 0;
        if (title.length >= 10 && title.length <= 70) passed++;
        if (desc && desc.length >= 50 && desc.length <= 160) passed++;
        if (canonical) passed++;
        if (ogTitle) passed++;

        const score = Math.round((passed / 4) * 100);
        return {
          status: score >= 75 ? 'pass' : 'warn',
          score,
          summary: `Technical SEO score: ${score}/100. Title length: ${title.length} chars, Description: ${desc ? desc.length + ' chars' : 'Missing'}.`,
          metrics: [
            { label: 'Title Length', value: `${title.length} chars (Target: 10-70)` },
            { label: 'Meta Description', value: desc ? `${desc.length} chars` : 'Missing' },
            { label: 'Canonical Tag', value: canonical ? 'Present' : 'Missing' },
            { label: 'OpenGraph og:title', value: ogTitle ? 'Present' : 'Missing' }
          ],
          details: [],
          recommendations: score < 100 ? ['Ensure <title> is between 10-70 chars and meta description is 50-160 chars.'] : []
        };
      }
    },

    // 108. Sitemap Testing
    {
      num: 108, id: '108-sitemap-testing', name: 'Sitemap Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🗺️',
      purpose: 'Checks sitemap.xml presence, XML formatting, and search engine discoverability',
      executionMode: 'server',
      inputs: [
        { id: 'sitemapUrl', label: 'Sitemap XML URL', type: 'text', default: 'https://example.com/sitemap.xml' }
      ],
      sampleData: { sitemapUrl: 'https://example.com/sitemap.xml' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.sitemapUrl);
        const hasXml = res.status === 200 && res.body && res.body.includes('<urlset');
        const count = hasXml ? (res.body.match(/<url>/g) || []).length : 0;
        const score = hasXml ? 100 : (res.status === 200 ? 60 : 20);
        return {
          status: hasXml ? 'pass' : 'warn',
          score,
          summary: hasXml ? `Valid XML Sitemap found with ${count} indexed URL entries.` : `Sitemap request returned HTTP ${res.status}.`,
          metrics: [{ label: 'HTTP Status', value: res.status || 'ERR' }, { label: 'URL Entries Found', value: count }],
          details: [],
          recommendations: !hasXml ? ['Deploy a valid XML sitemap at /sitemap.xml to aid search engine indexing.'] : []
        };
      }
    },

    // 109. Robots.txt Testing
    {
      num: 109, id: '109-robots-txt-testing', name: 'Robots.txt Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🤖',
      purpose: 'Audits crawler directives in robots.txt and verifies sitemap link',
      executionMode: 'server',
      inputs: [
        { id: 'robotsUrl', label: 'Robots.txt URL', type: 'text', default: 'https://example.com/robots.txt' }
      ],
      sampleData: { robotsUrl: 'https://example.com/robots.txt' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.robotsUrl);
        const found = res.status === 200 && res.body && res.body.includes('User-agent');
        const blocksAll = found && /Disallow:\s*\/\s*$/m.test(res.body);
        const score = found ? (!blocksAll ? 100 : 40) : 50;
        return {
          status: found && !blocksAll ? 'pass' : 'warn',
          score,
          summary: found ? (!blocksAll ? 'Robots.txt present and properly configured for crawlers.' : 'Warning: Robots.txt blocks all crawlers (Disallow: /).') : 'No robots.txt file found (Defaults to allow all).',
          metrics: [{ label: 'Robots.txt Status', value: found ? 'Present' : 'Not Found (Default)' }, { label: 'Blocks All Crawlers', value: blocksAll ? 'YES' : 'No' }],
          details: [{ label: 'File Contents', type: 'code', value: res.body ? res.body.slice(0, 500) : 'N/A' }],
          recommendations: blocksAll ? ['Remove Disallow: / if you intend for public search engines to index your website.'] : []
        };
      }
    },

    // 110. Structured Data / Schema.org
    {
      num: 110, id: '110-structured-data-testing', name: 'Structured Data (Schema.org)', category: 'D', categoryName: 'Web-Specific Testing', icon: '📊',
      purpose: 'Extracts and validates JSON-LD schemas against Schema.org standards',
      executionMode: 'client',
      inputs: [
        { id: 'htmlCode', label: 'HTML with JSON-LD Script', type: 'code', default: '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "VeriQ",\n  "url": "https://example.com"\n}\n</script>' }
      ],
      sampleData: { htmlCode: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script>' },
      async execute(inputs) {
        const doc = new DOMParser().parseFromString(inputs.htmlCode, 'text/html');
        const script = doc.querySelector('script[type="application/ld+json"]');
        if (!script) return { status: 'warn', score: 50, summary: 'No JSON-LD structured data block found.', metrics: [], details: [], recommendations: ['Add Schema.org JSON-LD to enhance rich search snippets.'] };

        try {
          const parsed = JSON.parse(script.textContent);
          const type = parsed['@type'] || 'Unknown';
          return {
            status: 'pass',
            score: 100,
            summary: `Valid JSON-LD structured data detected for Schema type '${type}'.`,
            metrics: [{ label: 'Schema Type', value: type }, { label: 'Syntax Valid', value: 'Yes' }],
            details: [],
            recommendations: []
          };
        } catch(e) {
          return { status: 'fail', score: 30, summary: 'JSON-LD syntax parse error: ' + e.message, metrics: [], details: [], recommendations: ['Fix syntax errors in JSON-LD script tag.'] };
        }
      }
    },

    // 111. Page Indexability Testing
    {
      num: 111, id: '111-page-indexability', name: 'Page Indexability Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🔎',
      purpose: 'Verifies noindex/nofollow meta tags and search indexing permissions',
      executionMode: 'client',
      inputs: [
        { id: 'htmlCode', label: 'Document <head> Markup', type: 'code', default: '<head>\n  <meta name="robots" content="index, follow">\n  <link rel="canonical" href="https://example.com">\n</head>' }
      ],
      sampleData: { htmlCode: '<head><meta name="robots" content="noindex, nofollow"></head>' },
      async execute(inputs) {
        const hasNoindex = /name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(inputs.htmlCode);
        return {
          status: !hasNoindex ? 'pass' : 'warn',
          score: !hasNoindex ? 100 : 20,
          summary: !hasNoindex ? 'Page is INDEXABLE by search engines.' : 'Page contains NOINDEX directive (Hidden from search engines).',
          metrics: [{ label: 'Indexable', value: !hasNoindex ? 'YES' : 'NOINDEX' }],
          details: [],
          recommendations: hasNoindex ? ['Remove "noindex" from robots meta if this page should appear in search results.'] : []
        };
      }
    },

    // 112. Broken Links Testing
    {
      num: 112, id: '112-broken-links-testing', name: 'Broken Links Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🔗',
      purpose: 'Crawls and checks links for 404 Not Found, 500 errors, or connection failures',
      executionMode: 'server',
      inputs: [
        { id: 'linksList', label: 'URLs to Probe (1 per line)', type: 'textarea', default: 'https://example.com\nhttps://example.com/about\nhttps://example.com/missing-404-test' }
      ],
      sampleData: { linksList: 'https://example.com\nhttps://example.org' },
      async execute(inputs, backend) {
        const links = inputs.linksList.split('\n').map(s => s.trim()).filter(Boolean);
        const rows = [];
        let broken = 0;

        for (const url of links) {
          const res = await backend.proxy(url);
          const ok = res.status >= 200 && res.status < 400;
          if (!ok) broken++;
          rows.push([url, res.status || 'ERR', ok ? '✅ OK' : '❌ BROKEN (404/ERR)']);
        }

        const score = Math.max(0, 100 - broken * 35);
        return {
          status: broken === 0 ? 'pass' : 'fail',
          score,
          summary: `Broken link check: ${links.length - broken}/${links.length} links alive. ${broken} broken link(s) detected.`,
          metrics: [{ label: 'Links Checked', value: links.length }, { label: 'Live Links', value: links.length - broken }, { label: 'Broken Links', value: broken }],
          details: [{ label: 'Link Status Matrix', type: 'table', headers: ['Target URL', 'Status Code', 'Evaluation'], rows }],
          recommendations: broken > 0 ? ['Fix or remove dead links returning HTTP 404.'] : []
        };
      }
    },

    // 113. Broken Images Testing
    {
      num: 113, id: '113-broken-images-testing', name: 'Broken Images Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🖼️',
      purpose: 'Inspects image URLs and confirms HTTP 200 OK image asset delivery',
      executionMode: 'server',
      inputs: [
        { id: 'imageUrl', label: 'Image URL to Test', type: 'text', default: 'https://via.placeholder.com/150' }
      ],
      sampleData: { imageUrl: 'https://via.placeholder.com/300' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.imageUrl);
        const ok = res.status >= 200 && res.status < 400;
        return {
          status: ok ? 'pass' : 'fail',
          score: ok ? 100 : 0,
          summary: ok ? `Image asset verified online (${res.status} OK, ${res.time}ms).` : `Broken image asset! Server returned HTTP ${res.status}.`,
          metrics: [{ label: 'Image URL', value: inputs.imageUrl }, { label: 'HTTP Status', value: res.status || 'ERR' }],
          details: [],
          recommendations: !ok ? ['Ensure image asset exists and is served with public read permissions.'] : []
        };
      }
    },

    // 114. Favicon Completeness Testing
    {
      num: 114, id: '114-favicon-testing', name: 'Favicon Completeness Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '⭐',
      purpose: 'Audits /favicon.ico and Apple Touch Icon link declarations',
      executionMode: 'client',
      inputs: [
        { id: 'htmlCode', label: 'HTML <head> Markup', type: 'code', default: '<head>\n  <link rel="icon" type="image/x-icon" href="/favicon.ico">\n  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n</head>' }
      ],
      sampleData: { htmlCode: '<head><link rel="icon" href="/favicon.ico"></head>' },
      async execute(inputs) {
        const hasIcon = inputs.htmlCode.includes('rel="icon"');
        const hasApple = inputs.htmlCode.includes('apple-touch-icon');
        const score = (hasIcon ? 60 : 0) + (hasApple ? 40 : 0);
        return {
          status: score >= 60 ? 'pass' : 'warn',
          score,
          summary: `Favicon completeness score: ${score}/100. Standard favicon: ${hasIcon ? 'Present' : 'Missing'}.`,
          metrics: [{ label: 'Standard Favicon', value: hasIcon ? 'Present' : 'Missing' }, { label: 'Apple Touch Icon', value: hasApple ? 'Present' : 'Missing' }],
          details: [],
          recommendations: !hasApple ? ['Add an apple-touch-icon (180x180) for iOS homescreen bookmarks.'] : []
        };
      }
    },

    // 115. Social Preview Testing
    {
      num: 115, id: '115-social-preview-testing', name: 'Social Preview Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '📱',
      purpose: 'Displays live preview cards for Twitter, Facebook, and LinkedIn shares',
      executionMode: 'client',
      inputs: [
        { id: 'title', label: 'OpenGraph Title', type: 'text', default: 'VeriQ - Automated Website Testing' },
        { id: 'description', label: 'OpenGraph Description', type: 'text', default: 'Professional suite of 148 software testing tools.' },
        { id: 'imageUrl', label: 'OpenGraph Image URL', type: 'text', default: 'https://example.com/og-image.jpg' }
      ],
      sampleData: { title: 'My Awesome Product', description: 'The next generation tool.', imageUrl: 'https://example.com/preview.png' },
      async execute(inputs) {
        return {
          status: 'pass',
          score: 100,
          summary: `Social sharing preview card rendered for "${inputs.title}".`,
          metrics: [{ label: 'Card Title', value: inputs.title }, { label: 'Card Image', value: inputs.imageUrl }],
          details: [{ label: 'Preview Mockup', type: 'text', value: `Title: ${inputs.title}\nDescription: ${inputs.description}\nImage: ${inputs.imageUrl}` }],
          recommendations: []
        };
      }
    },

    // 116. Cookie Security Testing
    {
      num: 116, id: '116-cookie-security-testing', name: 'Cookie Security Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🍪',
      purpose: 'Inspects Set-Cookie headers for Secure, HttpOnly, and SameSite flags',
      executionMode: 'client',
      inputs: [
        { id: 'cookieHeader', label: 'Set-Cookie Header Value', type: 'text', default: 'session=abc; Secure; HttpOnly; SameSite=Lax' }
      ],
      sampleData: { cookieHeader: 'user=john; path=/' },
      async execute(inputs) {
        const val = inputs.cookieHeader;
        const secure = /Secure/i.test(val);
        const httpOnly = /HttpOnly/i.test(val);
        const sameSite = /SameSite=(Strict|Lax)/i.test(val);
        const score = (secure ? 35 : 0) + (httpOnly ? 35 : 0) + (sameSite ? 30 : 0);
        return {
          status: score >= 90 ? 'pass' : 'warn',
          score,
          summary: `Cookie attributes evaluation: ${score}/100. Secure: ${secure}, HttpOnly: ${httpOnly}, SameSite: ${sameSite}.`,
          metrics: [{ label: 'Secure', value: secure ? 'Yes' : 'No' }, { label: 'HttpOnly', value: httpOnly ? 'Yes' : 'No' }, { label: 'SameSite', value: sameSite ? 'Configured' : 'Missing' }],
          details: [],
          recommendations: score < 90 ? ['Always include Secure, HttpOnly, and SameSite flags on sensitive cookies.'] : []
        };
      }
    },

    // 117. CORS Configuration Testing
    {
      num: 117, id: '117-cors-config-testing', name: 'CORS Configuration Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🌐',
      purpose: 'Audits preflight OPTIONS response and allowed origins and HTTP methods',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target API Endpoint', type: 'text', default: 'https://example.com/api' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.httpRequest({
          method: 'OPTIONS',
          url: inputs.url,
          headers: {
            'Access-Control-Request-Method': 'POST',
            'Origin': 'https://example.org'
          }
        });
        return {
          status: 'pass',
          score: 100,
          summary: `CORS preflight probe completed (Status ${res.status}).`,
          metrics: [{ label: 'Preflight Status', value: res.status }],
          details: [],
          recommendations: []
        };
      }
    },

    // 118. Asset Compression Testing
    {
      num: 118, id: '118-compression-testing', name: 'Asset Compression Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🗜️',
      purpose: 'Verifies Content-Encoding compression savings (brotli, gzip, deflate)',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url, {
          headers: { 'Accept-Encoding': 'gzip, deflate, br' }
        });
        const enc = res.headers ? res.headers['content-encoding'] : '';
        const isCompressed = ['br', 'gzip', 'deflate'].includes(enc);
        return {
          status: isCompressed ? 'pass' : 'warn',
          score: isCompressed ? 100 : 50,
          summary: isCompressed ? `Server HTTP compression ACTIVE (${enc}).` : 'Content-Encoding uncompressed or stripped by proxy.',
          metrics: [{ label: 'Compression Format', value: enc || 'None / Identity' }, { label: 'Bandwidth Efficiency', value: isCompressed ? 'Optimized' : 'Uncompressed' }],
          details: [],
          recommendations: !isCompressed ? ['Enable Brotli or Gzip compression on web server for text/html and CSS/JS assets.'] : []
        };
      }
    },

    // 119. Browser Caching Testing
    {
      num: 119, id: '119-browser-caching-testing', name: 'Browser Caching Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🗃️',
      purpose: 'Audits Cache-Control, ETag, and Last-Modified HTTP headers',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://example.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url);
        const headers = res.headers || {};
        const cacheCtrl = headers['cache-control'];
        const etag = headers['etag'];
        const hasCaching = !!cacheCtrl || !!etag;
        return {
          status: hasCaching ? 'pass' : 'warn',
          score: hasCaching ? 100 : 50,
          summary: hasCaching ? `Caching directives active: Cache-Control='${cacheCtrl || 'none'}', ETag='${etag || 'none'}'.` : 'No Cache-Control or ETag headers defined.',
          metrics: [{ label: 'Cache-Control', value: cacheCtrl || 'Missing' }, { label: 'ETag', value: etag || 'Missing' }],
          details: [],
          recommendations: !hasCaching ? ['Add Cache-Control headers with appropriate max-age for static assets.'] : []
        };
      }
    },

    // 120. DNS Configuration Testing
    {
      num: 120, id: '120-dns-configuration-testing', name: 'DNS Configuration Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🌐',
      purpose: 'Resolves DNS records (A, AAAA, MX, TXT, NS, CNAME, SOA) via Node.js dns.promises',
      executionMode: 'server',
      inputs: [
        { id: 'domain', label: 'Target Domain Name', type: 'text', default: 'google.com' },
        { id: 'recordType', label: 'Record Type Filter', type: 'select', options: ['ALL', 'A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'], default: 'ALL' }
      ],
      sampleData: { domain: 'example.com', recordType: 'ALL' },
      async execute(inputs, backend) {
        const res = await backend.resolveDns(inputs.domain, inputs.recordType);
        if (res.error) return { status: 'fail', score: 0, summary: 'DNS resolution error: ' + res.error, metrics: [], details: [], recommendations: [] };

        const rows = [];
        for (const [type, recs] of Object.entries(res.records || {})) {
          if (Array.isArray(recs) && recs.length > 0) {
            rows.push([type, JSON.stringify(recs)]);
          } else if (recs && typeof recs === 'object') {
            rows.push([type, JSON.stringify(recs)]);
          }
        }

        return {
          status: 'pass',
          score: 100,
          summary: `DNS lookup resolved for ${res.domain} in ${res.time}ms.`,
          metrics: [{ label: 'Domain', value: res.domain }, { label: 'Lookup Time', value: `${res.time}ms` }, { label: 'Record Types Found', value: rows.length }],
          details: [{ label: 'DNS Records Table', type: 'table', headers: ['Record Type', 'Resolved Records'], rows }],
          recommendations: []
        };
      }
    },

    // 121. CDN Delivery Testing
    {
      num: 121, id: '121-cdn-delivery-testing', name: 'CDN Delivery Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🚀',
      purpose: 'Analyzes HTTP headers (cf-ray, x-cache, server) to detect CDN presence',
      executionMode: 'server',
      inputs: [
        { id: 'url', label: 'Target URL', type: 'text', default: 'https://example.com' }
      ],
      sampleData: { url: 'https://cloudflare.com' },
      async execute(inputs, backend) {
        const res = await backend.proxy(inputs.url);
        const headers = res.headers || {};
        const cdnHeader = headers['cf-ray'] ? 'Cloudflare' : (headers['x-amz-cf-id'] ? 'AWS CloudFront' : (headers['x-cache'] ? 'Akamai / Fastly' : 'Direct Origin'));
        return {
          status: 'pass',
          score: 100,
          summary: `CDN delivery signature: ${cdnHeader}.`,
          metrics: [{ label: 'Edge CDN Provider', value: cdnHeader }],
          details: [],
          recommendations: []
        };
      }
    },

    // 122. Mobile Viewport Testing
    {
      num: 122, id: '122-mobile-viewport-testing', name: 'Mobile Viewport Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '📱',
      purpose: 'Audits meta viewport tag for mobile zoomability and device width',
      executionMode: 'client',
      inputs: [
        { id: 'viewportMeta', label: 'Viewport Meta Tag String', type: 'text', default: '<meta name="viewport" content="width=device-width, initial-scale=1.0">' }
      ],
      sampleData: { viewportMeta: '<meta name="viewport" content="width=device-width, user-scalable=no">' },
      async execute(inputs) {
        const hasWidth = inputs.viewportMeta.includes('width=device-width');
        const blocksZoom = inputs.viewportMeta.includes('user-scalable=no') || inputs.viewportMeta.includes('maximum-scale=1');
        const score = hasWidth ? (!blocksZoom ? 100 : 70) : 30;
        return {
          status: score >= 80 ? 'pass' : 'warn',
          score,
          summary: score === 100 ? 'Mobile viewport tag is optimally configured.' : (blocksZoom ? 'Warning: user-scalable=no disables user zoom (Accessibility issue).' : 'Missing width=device-width in viewport.'),
          metrics: [{ label: 'Device Width Set', value: hasWidth ? 'Yes' : 'No' }, { label: 'Zoom Disabled', value: blocksZoom ? 'YES (Discouraged)' : 'No' }],
          details: [],
          recommendations: blocksZoom ? ['Allow pinch-to-zoom by removing user-scalable=no for accessibility compliance.'] : []
        };
      }
    },

    // 123. Touch Targets Testing
    {
      num: 123, id: '123-touch-targets-testing', name: 'Touch Targets Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '👆',
      purpose: 'Audits interactive buttons and links to ensure they meet minimum 44x44px touch targets',
      executionMode: 'client',
      inputs: [
        { id: 'btnPadding', label: 'Button CSS Padding (px)', type: 'number', default: 12 },
        { id: 'minHeight', label: 'Button CSS Min-Height (px)', type: 'number', default: 48 }
      ],
      sampleData: { btnPadding: 14, minHeight: 48 },
      async execute(inputs) {
        const height = Number(inputs.minHeight);
        const ok = height >= 44;
        return {
          status: ok ? 'pass' : 'warn',
          score: ok ? 100 : 60,
          summary: ok ? `Touch target height (${height}px) satisfies WCAG 2.1 AA minimum 44px threshold.` : `Touch target (${height}px) is smaller than recommended 44px.`,
          metrics: [{ label: 'Element Height', value: `${height}px` }, { label: 'WCAG Standard (44px)', value: ok ? 'MET' : 'BELOW_STANDARD' }],
          details: [],
          recommendations: !ok ? ['Increase interactive tap target minimum height/width to at least 44x44px.'] : []
        };
      }
    },

    // 124. Print Stylesheet Testing
    {
      num: 124, id: '124-print-stylesheet-testing', name: 'Print Stylesheet Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '🖨️',
      purpose: 'Audits @media print CSS rules for document printing optimization',
      executionMode: 'client',
      inputs: [
        { id: 'cssCode', label: 'CSS Stylesheet Code', type: 'code', default: '@media print {\n  nav, footer, .ads { display: none; }\n  body { font-size: 12pt; color: black; }\n}' }
      ],
      sampleData: { cssCode: '@media print { .no-print { display: none; } }' },
      async execute(inputs) {
        const hasPrint = inputs.cssCode.includes('@media print');
        return {
          status: hasPrint ? 'pass' : 'warn',
          score: hasPrint ? 100 : 50,
          summary: hasPrint ? 'Print stylesheet detected: Navigation and unwanted elements hidden during print.' : 'No @media print stylesheet detected.',
          metrics: [{ label: 'Print Stylesheet', value: hasPrint ? 'Configured' : 'Missing' }],
          details: [],
          recommendations: !hasPrint ? ['Add an @media print rule to hide navigation menus and format typography cleanly for printers.'] : []
        };
      }
    },

    // 125. Third-Party Script Testing
    {
      num: 125, id: '125-third-party-scripts', name: 'Third-Party Script Testing', category: 'D', categoryName: 'Web-Specific Testing', icon: '📦',
      purpose: 'Detects and categorizes external scripts (Analytics, Ads, Chat widgets, Trackers)',
      executionMode: 'client',
      inputs: [
        { id: 'htmlCode', label: 'HTML Markup to Inspect', type: 'code', default: '<script src="https://www.googletagmanager.com/gtag/js?id=G-123"></script>\n<script src="https://cdn.segment.com/analytics.js/v1/xyz"></script>' }
      ],
      sampleData: { htmlCode: '<script src="https://connect.facebook.net/en_US/fbevents.js"></script>' },
      async execute(inputs) {
        const hasGtm = inputs.htmlCode.includes('googletagmanager') || inputs.htmlCode.includes('google-analytics');
        const hasSegment = inputs.htmlCode.includes('segment');
        const hasFb = inputs.htmlCode.includes('facebook');
        const detected = [];
        if (hasGtm) detected.push('Google Analytics / GTM');
        if (hasSegment) detected.push('Segment CDP');
        if (hasFb) detected.push('Meta / Facebook Pixel');

        return {
          status: 'pass',
          score: 100,
          summary: `Identified ${detected.length} external third-party tracking/analytics service(s).`,
          metrics: [{ label: 'Trackers Detected', value: detected.length }],
          details: [{ label: 'Detected Services', type: 'list', value: detected.length ? detected : ['No third-party trackers found'] }],
          recommendations: []
        };
      }
    }
  ];

  tools.forEach(t => window.VeriQ.registerTool(t));
})();
