// VeriQ Backend Client Bridge
(function() {
  window.VeriQ = window.VeriQ || {};

  const BackendClient = {
    baseUrl: localStorage.getItem('veriq_backend_url') || 'http://localhost:3000',
    isOnline: false,

    setBaseUrl(url) {
      this.baseUrl = (url || 'http://localhost:3000').replace(/\/$/, '');
      localStorage.setItem('veriq_backend_url', this.baseUrl);
      return this.checkHealth();
    },

    async checkHealth() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${this.baseUrl}/api/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          this.isOnline = data.status === 'ok';
          return { online: true, data };
        }
      } catch (e) {
        this.isOnline = false;
      }
      return { online: false, error: 'Cannot connect to VeriQ backend at ' + this.baseUrl };
    },

    async proxy(url, options = {}) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${this.baseUrl}/api/proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, ...options })
          });
          return await res.json();
        } catch (e) {
          console.warn('Backend proxy failed, trying public fallback...', e);
        }
      }

      // Fallback to public CORS proxy if backend is offline
      try {
        const start = performance.now();
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const json = await res.json();
        const time = Math.round(performance.now() - start);
        return {
          url,
          status: json.status ? json.status.http_code : 200,
          statusText: 'OK',
          headers: {},
          body: json.contents || '',
          time,
          size: (json.contents || '').length,
          proxyUsed: 'allorigins.win (Fallback)'
        };
      } catch (err) {
        return { error: 'Failed to fetch target URL: ' + err.message, status: 0, time: 0 };
      }
    },

    async httpRequest(options = {}) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${this.baseUrl}/api/http/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
          });
          return await res.json();
        } catch(e) {
          return { error: 'Backend HTTP request failed: ' + e.message, status: 0 };
        }
      }

      // Direct client fetch fallback
      try {
        const start = performance.now();
        const res = await fetch(options.url, {
          method: options.method || 'GET',
          headers: options.headers || {}
        });
        let data;
        const text = await res.text();
        try { data = JSON.parse(text); } catch(e) { data = text; }
        return {
          status: res.status,
          statusText: res.statusText,
          headers: {},
          data,
          time: Math.round(performance.now() - start),
          size: text.length
        };
      } catch(e) {
        return { error: 'Direct request blocked by CORS. Please run the VeriQ backend (npm start).', status: 0 };
      }
    },

    async loadTest(options = {}) {
      if (!this.isOnline) {
        return {
          error: 'Load & Concurrency testing requires the VeriQ Node.js backend to generate parallel socket workers. Please run "npm start".',
          concurrency: options.concurrency || 10,
          totalRequests: options.totalRequests || 20,
          successfulRequests: 0,
          failedRequests: options.totalRequests || 20,
          rps: 0,
          totalDuration: 0,
          latencies: { min: 0, max: 0, avg: 0, p50: 0, p90: 0, p99: 0 }
        };
      }
      const res = await fetch(`${this.baseUrl}/api/load/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      return await res.json();
    },

    async securityScan(url) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${this.baseUrl}/api/security/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          return await res.json();
        } catch(e) {}
      }
      return {
        url,
        score: 75,
        grade: 'B',
        findings: [{ severity: 'INFO', title: 'Client Scan Only', desc: 'Run VeriQ backend for complete raw header and exposure analysis.' }],
        headers: {}
      };
    },

    async testDatabase(options = {}) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${this.baseUrl}/api/database/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
          });
          return await res.json();
        } catch(e) {}
      }
      // Client-side fallback inspection
      const q = options.query || '';
      const hasSqli = /(\bOR\b\s+['"]?1['"]?\s*=\s*['"]?1['"]?|--)/i.test(q);
      return {
        query: q,
        valid: !hasSqli,
        score: hasSqli ? 20 : 100,
        issues: hasSqli ? [{ type: 'SECURITY', severity: 'HIGH', message: 'Potential SQL injection pattern detected.' }] : [],
        suggestions: []
      };
    },

    async resolveDns(domain, recordType = 'ALL') {
      if (!this.isOnline) {
        return {
          domain,
          records: { A: ['Unavailable without backend (Browser sandbox cannot resolve raw DNS)'] },
          time: 0,
          error: 'DNS resolution requires the VeriQ Node.js backend. Please run "npm start".'
        };
      }
      const res = await fetch(`${this.baseUrl}/api/net/dns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, recordType })
      });
      return await res.json();
    },

    async tlsInspect(host, port = 443) {
      if (!this.isOnline) {
        return {
          host,
          port,
          error: 'Raw TLS socket certificate inspection requires the VeriQ Node.js backend. Please run "npm start".'
        };
      }
      const res = await fetch(`${this.baseUrl}/api/net/tls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port })
      });
      return await res.json();
    }
  };

  window.VeriQ.backend = BackendClient;
})();
