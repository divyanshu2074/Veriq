const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const tls = require('tls');
const net = require('net');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '.')));

// 1. Health & Server Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    platform: process.platform,
    nodeVersion: process.version,
    uptime: Math.round(process.uptime()),
    timestamp: Date.now()
  });
});

// 2. High-Fidelity Proxy
app.post('/api/proxy', async (req, res) => {
  const { url, timeout = 15000, method = 'GET', headers = {}, body = null } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing required field: url' });

  const startTime = Date.now();
  try {
    const targetUrl = new URL(url);
    const client = targetUrl.protocol === 'https:' ? https : http;

    const reqHeaders = {
      'User-Agent': 'VeriQ-QA-Engine/2.0',
      'Accept': '*/*',
      ...headers
    };

    const options = {
      method,
      headers: reqHeaders,
      timeout,
      rejectUnauthorized: false
    };

    const proxyReq = client.request(url, options, (proxyRes) => {
      let rawData = '';
      proxyRes.setEncoding('utf8');

      proxyRes.on('data', (chunk) => {
        if (rawData.length < 5 * 1024 * 1024) { // 5MB limit
          rawData += chunk;
        }
      });

      proxyRes.on('end', () => {
        const duration = Date.now() - startTime;
        res.json({
          url,
          status: proxyRes.statusCode,
          statusText: proxyRes.statusMessage,
          headers: proxyRes.headers,
          body: rawData,
          contentType: proxyRes.headers['content-type'] || '',
          time: duration,
          size: Buffer.byteLength(rawData, 'utf8')
        });
      });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Request timed out after ' + timeout + 'ms', time: Date.now() - startTime });
    });

    proxyReq.on('error', (err) => {
      res.status(502).json({ error: err.message, time: Date.now() - startTime });
    });

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      proxyReq.write(typeof body === 'object' ? JSON.stringify(body) : String(body));
    }
    proxyReq.end();
  } catch (err) {
    res.status(400).json({ error: 'Invalid URL or parameters: ' + err.message });
  }
});

// 3. DNS Configuration & Resolution
app.post('/api/net/dns', async (req, res) => {
  const { domain, recordType = 'ALL' } = req.body;
  if (!domain) return res.status(400).json({ error: 'Missing required field: domain' });

  // Clean domain input
  const cleanDomain = domain.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  const results = { domain: cleanDomain, records: {}, time: 0 };
  const startTime = Date.now();

  const typesToFetch = recordType === 'ALL'
    ? ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA']
    : [recordType.toUpperCase()];

  for (const type of typesToFetch) {
    try {
      if (type === 'A') results.records.A = await dns.resolve4(cleanDomain);
      else if (type === 'AAAA') results.records.AAAA = await dns.resolve6(cleanDomain);
      else if (type === 'MX') results.records.MX = await dns.resolveMx(cleanDomain);
      else if (type === 'TXT') results.records.TXT = await dns.resolveTxt(cleanDomain);
      else if (type === 'NS') results.records.NS = await dns.resolveNs(cleanDomain);
      else if (type === 'CNAME') results.records.CNAME = await dns.resolveCname(cleanDomain);
      else if (type === 'SOA') results.records.SOA = await dns.resolveSoa(cleanDomain);
    } catch (e) {
      results.records[type] = [];
    }
  }

  results.time = Date.now() - startTime;
  res.json(results);
});

// 4. TLS & SSL Handshake Inspector
app.post('/api/net/tls', (req, res) => {
  const { host, port = 443, timeout = 10000 } = req.body;
  if (!host) return res.status(400).json({ error: 'Missing required field: host' });

  const cleanHost = host.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  const startTime = Date.now();

  const socket = tls.connect({
    host: cleanHost,
    port: parseInt(port, 10),
    servername: cleanHost,
    timeout,
    rejectUnauthorized: false
  }, () => {
    const cert = socket.getPeerCertificate(true);
    const cipher = socket.getCipher();
    const protocol = socket.getProtocol();
    const authorized = socket.authorized;
    const authError = socket.authorizationError;

    socket.end();

    const now = new Date();
    const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
    const daysRemaining = validTo ? Math.round((validTo - now) / (1000 * 60 * 60 * 24)) : null;

    res.json({
      host: cleanHost,
      port,
      authorized,
      authError: authError || null,
      protocol,
      cipher,
      certificate: {
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        daysRemaining,
        fingerprint: cert.fingerprint256 || cert.fingerprint,
        subjectAltNames: cert.subjectaltname ? cert.subjectaltname.split(', ') : []
      },
      time: Date.now() - startTime
    });
  });

  socket.on('timeout', () => {
    socket.destroy();
    res.status(504).json({ error: 'TLS connection timed out', time: Date.now() - startTime });
  });

  socket.on('error', (err) => {
    res.status(502).json({ error: err.message, time: Date.now() - startTime });
  });
});

// 5. Port Scanner / Reachability
app.post('/api/net/ports', async (req, res) => {
  const { host, ports = [80, 443, 8080, 8443, 3000], timeout = 3000 } = req.body;
  if (!host) return res.status(400).json({ error: 'Missing required field: host' });

  const cleanHost = host.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  const portChecks = ports.map(port => {
    return new Promise(resolve => {
      const s = Date.now();
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.connect(port, cleanHost, () => {
        socket.destroy();
        resolve({ port, open: true, time: Date.now() - s });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ port, open: false, error: 'Timeout', time: Date.now() - s });
      });

      socket.on('error', (err) => {
        resolve({ port, open: false, error: err.code || err.message, time: Date.now() - s });
      });
    });
  });

  const results = await Promise.all(portChecks);
  res.json({ host: cleanHost, results });
});

// 6. HTTP & REST Request Tool
app.post('/api/http/request', async (req, res) => {
  const { url, method = 'GET', headers = {}, body = null, timeout = 15000 } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing required field: url' });

  const startTime = Date.now();
  try {
    const targetUrl = new URL(url);
    const client = targetUrl.protocol === 'https:' ? https : http;

    const options = {
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'VeriQ-API-Tester/2.0',
        ...headers
      },
      timeout,
      rejectUnauthorized: false
    };

    const apiReq = client.request(url, options, (apiRes) => {
      let rawData = '';
      apiRes.setEncoding('utf8');

      apiRes.on('data', chunk => { rawData += chunk; });
      apiRes.on('end', () => {
        let parsedJson = null;
        try { parsedJson = JSON.parse(rawData); } catch (e) {}

        res.json({
          status: apiRes.statusCode,
          statusText: apiRes.statusMessage,
          headers: apiRes.headers,
          data: parsedJson !== null ? parsedJson : rawData,
          isJson: parsedJson !== null,
          size: Buffer.byteLength(rawData, 'utf8'),
          time: Date.now() - startTime
        });
      });
    });

    apiReq.on('timeout', () => {
      apiReq.destroy();
      res.status(504).json({ error: 'Request timed out', time: Date.now() - startTime });
    });

    apiReq.on('error', err => {
      res.status(502).json({ error: err.message, time: Date.now() - startTime });
    });

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      apiReq.write(typeof body === 'object' ? JSON.stringify(body) : String(body));
    }
    apiReq.end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Load & Concurrency Engine
app.post('/api/load/run', async (req, res) => {
  const { url, concurrency = 10, totalRequests = 30, timeout = 10000 } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing required field: url' });

  const numConcurrency = Math.min(Math.max(parseInt(concurrency, 10) || 5, 1), 50);
  const total = Math.min(Math.max(parseInt(totalRequests, 10) || 20, numConcurrency), 200);

  const startTime = Date.now();
  const latencies = [];
  const statusCodes = {};
  let successfulRequests = 0;
  let failedRequests = 0;

  const runSingle = async () => {
    const s = Date.now();
    try {
      const targetUrl = new URL(url);
      const client = targetUrl.protocol === 'https:' ? https : http;

      return await new Promise((resolve) => {
        const r = client.get(url, { timeout, rejectUnauthorized: false }, (resp) => {
          resp.resume(); // consume stream
          resp.on('end', () => {
            const time = Date.now() - s;
            latencies.push(time);
            statusCodes[resp.statusCode] = (statusCodes[resp.statusCode] || 0) + 1;
            if (resp.statusCode >= 200 && resp.statusCode < 400) successfulRequests++;
            else failedRequests++;
            resolve();
          });
        });

        r.on('error', () => {
          failedRequests++;
          statusCodes['ERROR'] = (statusCodes['ERROR'] || 0) + 1;
          resolve();
        });

        r.on('timeout', () => {
          r.destroy();
          failedRequests++;
          statusCodes['TIMEOUT'] = (statusCodes['TIMEOUT'] || 0) + 1;
          resolve();
        });
      });
    } catch (e) {
      failedRequests++;
      statusCodes['ERROR'] = (statusCodes['ERROR'] || 0) + 1;
    }
  };

  // Run in concurrency pools
  let completed = 0;
  const workers = Array(numConcurrency).fill(null).map(async () => {
    while (completed < total) {
      completed++;
      await runSingle();
    }
  });

  await Promise.all(workers);
  const totalDuration = Date.now() - startTime;

  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = latencies.length > 0 ? Math.round(sum / latencies.length) : 0;
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const rps = totalDuration > 0 ? Number(((total / totalDuration) * 1000).toFixed(2)) : 0;

  res.json({
    url,
    concurrency: numConcurrency,
    totalRequests: total,
    successfulRequests,
    failedRequests,
    statusCodes,
    totalDuration,
    rps,
    latencies: { min, max, avg, p50, p90, p99 }
  });
});

// 8. Automated Security & Exposure Scanner
app.post('/api/security/scan', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing required field: url' });

  try {
    const targetUrl = new URL(url);
    const client = targetUrl.protocol === 'https:' ? https : http;

    client.get(url, { timeout: 10000, rejectUnauthorized: false }, (resp) => {
      let body = '';
      resp.on('data', chunk => { if (body.length < 500000) body += chunk; });
      resp.on('end', () => {
        const headers = resp.headers;
        const findings = [];

        // HSTS Check
        if (targetUrl.protocol === 'https:') {
          if (!headers['strict-transport-security']) {
            findings.push({ severity: 'HIGH', title: 'Missing HSTS Header', desc: 'Strict-Transport-Security header is not enforced.' });
          }
        } else {
          findings.push({ severity: 'CRITICAL', title: 'Unencrypted Protocol', desc: 'Site is served over plain unencrypted HTTP.' });
        }

        // CSP Check
        if (!headers['content-security-policy']) {
          findings.push({ severity: 'HIGH', title: 'Missing Content Security Policy', desc: 'No Content-Security-Policy header defined.' });
        }

        // X-Frame-Options
        if (!headers['x-frame-options']) {
          findings.push({ severity: 'MEDIUM', title: 'Missing X-Frame-Options', desc: 'Vulnerable to clickjacking attacks if frame-ancestors is also missing.' });
        }

        // X-Content-Type-Options
        if (headers['x-content-type-options'] !== 'nosniff') {
          findings.push({ severity: 'LOW', title: 'MIME-Sniffing Not Blocked', desc: 'X-Content-Type-Options should be set to nosniff.' });
        }

        // Server disclosure
        if (headers['server']) {
          findings.push({ severity: 'INFO', title: 'Server Software Disclosed', desc: `Server banner discloses: ${headers['server']}` });
        }
        if (headers['x-powered-by']) {
          findings.push({ severity: 'MEDIUM', title: 'X-Powered-By Disclosed', desc: `Framework banner discloses: ${headers['x-powered-by']}` });
        }

        const score = Math.max(10, 100 - findings.filter(f => f.severity === 'CRITICAL').length * 40 - findings.filter(f => f.severity === 'HIGH').length * 20 - findings.filter(f => f.severity === 'MEDIUM').length * 10 - findings.filter(f => f.severity === 'LOW').length * 5);

        res.json({
          url,
          score,
          grade: score >= 90 ? 'A+' : (score >= 80 ? 'A' : (score >= 70 ? 'B' : (score >= 60 ? 'C' : 'F'))),
          findings,
          headers
        });
      });
    }).on('error', err => {
      res.status(502).json({ error: err.message });
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9. SQL Syntax & Constraint Analysis
app.post('/api/database/test', (req, res) => {
  const { query = '', dialect = 'sql' } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing required field: query' });

  const cleaned = query.trim();
  const issues = [];
  const suggestions = [];

  // SQL Injection risk indicators
  if (/(\bOR\b\s+['"]?1['"]?\s*=\s*['"]?1['"]?|--|\/\*|\bxp_cmdshell\b)/i.test(cleaned)) {
    issues.push({ type: 'SECURITY', severity: 'HIGH', message: 'Potential SQL injection pattern or insecure literal comparison detected.' });
  }

  // Missing WHERE clause on destructive queries
  if (/^DELETE\s+FROM\b/i.test(cleaned) && !/\bWHERE\b/i.test(cleaned)) {
    issues.push({ type: 'SAFETY', severity: 'CRITICAL', message: 'Unconstrained DELETE statement without WHERE clause will wipe entire table.' });
  }
  if (/^UPDATE\s+\w+\s+SET\b/i.test(cleaned) && !/\bWHERE\b/i.test(cleaned)) {
    issues.push({ type: 'SAFETY', severity: 'CRITICAL', message: 'Unconstrained UPDATE statement without WHERE clause will overwrite all records.' });
  }

  // SELECT * performance warning
  if (/SELECT\s+\*\s+FROM/i.test(cleaned)) {
    suggestions.push({ type: 'PERFORMANCE', message: 'Avoid SELECT * in production queries; explicitly list needed columns to minimize I/O overhead.' });
  }

  // Syntax heuristic
  const hasMatchingQuotes = (cleaned.split("'").length % 2 === 1) && (cleaned.split('"').length % 2 === 1);
  if (!hasMatchingQuotes) {
    issues.push({ type: 'SYNTAX', severity: 'HIGH', message: 'Mismatched single or double quotes detected.' });
  }

  const score = Math.max(0, 100 - issues.length * 35);
  res.json({
    query: cleaned,
    valid: issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length === 0,
    score,
    issues,
    suggestions
  });
});

app.listen(PORT, () => {
  console.log(`🛡️ VeriQ QA Testing Engine running on http://localhost:${PORT}`);
});
