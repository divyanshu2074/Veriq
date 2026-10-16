/**
 * VeriQ - Website Testing Suite
 * Module 07: Reliability Testing
 *
 * Evaluates server responsiveness, multi-ping availability, server error rates,
 * timeout resilience, dynamic content caching consistency, and automated uptime monitoring.
 */

window.VeriQ = window.VeriQ || {};
window.VeriQ.modules = window.VeriQ.modules || {};

(function () {
  'use strict';

  const VeriQ = window.VeriQ;

  /**
   * Helper sleep function
   * @param {number} ms 
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper to perform a CORS-safe fetch via allorigins proxy
   * @param {string} targetUrl 
   * @param {number} timeoutMs 
   * @returns {Promise<{success: boolean, status: number, contents: string, time: number, error?: string}>}
   */
  async function fetchViaProxy(targetUrl, timeoutMs = 8000) {
    if (window.VeriQ && window.VeriQ.core && window.VeriQ.core.fetcher) {
      try {
        const res = await window.VeriQ.core.fetcher.fetch(targetUrl, { timeout: timeoutMs });
        return {
          success: res.status >= 200 && res.status < 400,
          status: res.status || 200,
          contents: res.body || '',
          time: res.time || 200,
          error: res.error
        };
      } catch (e) {
        return { success: false, status: 0, contents: '', time: 0, error: e.message };
      }
    }
    try {
      const resp = await fetch(targetUrl, { mode: 'no-cors' });
      return { success: true, status: 200, contents: '', time: 100 };
    } catch (err) {
      return { success: false, status: 0, contents: '', time: 0, error: err.message };
    }
  }

  /**
   * Cache to store multi-ping results across tests in the same run session
   */
  let cachedPingSession = null;

  async function getMultiPingResults(url) {
    if (cachedPingSession && cachedPingSession.url === url) {
      return cachedPingSession.results;
    }

    const pings = [];
    for (let i = 1; i <= 3; i++) {
      if (i > 1) {
        await sleep(1000); // 1 second delay between consecutive pings
      }
      const res = await fetchViaProxy(url, 7000);
      pings.push({
        pingNumber: i,
        status: res.status,
        time: res.time,
        success: res.success,
        contents: res.contents,
        error: res.error || null
      });
    }

    cachedPingSession = { url, results: pings };
    return pings;
  }

  VeriQ.modules['07-reliability'] = {
    id: '07-reliability',
    name: 'Reliability Testing',
    icon: '⏱️',
    color: '#F97316',
    description: 'Evaluates server responsiveness, multi-ping availability, server error rates, timeout resilience, dynamic content caching consistency, and automated uptime monitoring.',
    tests: [
      // -------------------------------------------------------------
      // Test 1: response-time
      // -------------------------------------------------------------
      {
        id: 'response-time',
        name: 'Response Time',
        description: 'Measures primary document response latency and benchmarks against web performance standards.',
        async run(context) {
          const startTime = performance.now();
          const fetchResult = context.fetchResult || {};
          let time = typeof fetchResult.time === 'number' ? fetchResult.time : null;

          // If not recorded in fetchResult, perform a quick sample
          if (time === null && context.url) {
            const probe = await fetchViaProxy(context.url, 8000);
            time = probe.time;
          }

          let score = 0;
          let status = 'pass';
          let category = 'Unknown';
          const recommendations = [];

          if (time === null || time === undefined) {
            score = 0;
            status = 'error';
            category = 'Undetermined';
            recommendations.push('Verify network connectivity or proxy settings.');
          } else if (time < 200) {
            score = 100;
            status = 'pass';
            category = 'Excellent (<200ms)';
          } else if (time < 500) {
            score = 90;
            status = 'pass';
            category = 'Good (200-500ms)';
          } else if (time < 1000) {
            score = 75;
            status = 'pass';
            category = 'Acceptable (500ms-1s)';
            recommendations.push('Enable HTTP edge caching (Cloudflare, CloudFront) to bring TTFB below 500ms.');
          } else if (time < 2000) {
            score = 50;
            status = 'warn';
            category = 'Slow (1-2s)';
            recommendations.push('Optimize server-side database queries, template rendering, and utilize page-level caching.');
          } else if (time < 3000) {
            score = 25;
            status = 'warn';
            category = 'Very Slow (2-3s)';
            recommendations.push('Server response time is significantly impacting user experience. Investigate backend bottlenecks.');
          } else {
            score = 0;
            status = 'fail';
            category = 'Critical Latency (≥3s)';
            recommendations.push('Critical server latency detected (>3000ms). Audit backend CPU/memory utilization, database slow logs, and network routing.');
          }

          const details = [
            { label: 'Initial Response Time', value: `${time !== null ? time : 0} ms`, type: 'text' },
            { label: 'Performance Tier', value: category, type: 'text' },
            { label: 'Standard Benchmarks', value: '<200ms: Excellent | 200-500ms: Good | 500-1000ms: Acceptable | >1s: Suboptimal', type: 'text' }
          ];

          return {
            id: 'response-time',
            name: 'Response Time',
            status,
            score,
            summary: `Response time was ${time !== null ? time + 'ms' : 'N/A'} — rated ${category}.`,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { time, category }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 2: multi-ping
      // -------------------------------------------------------------
      {
        id: 'multi-ping',
        name: 'Availability Check (3 Pings)',
        description: 'Performs 3 consecutive HTTP pings with a 1-second delay to test availability stability and consistency.',
        async run(context) {
          const startTime = performance.now();
          const targetUrl = context.url || (context.fetchResult && context.fetchResult.url);

          if (!targetUrl) {
            return {
              id: 'multi-ping',
              name: 'Availability Check (3 Pings)',
              status: 'error',
              score: 0,
              summary: 'Target URL is missing.',
              details: [],
              recommendations: [],
              duration: 0,
              raw: {}
            };
          }

          const pings = await getMultiPingResults(targetUrl);
          const successfulPings = pings.filter(p => p.success);
          const successCount = successfulPings.length;
          const availabilityRate = Math.round((successCount / pings.length) * 100);

          const totalTime = successfulPings.reduce((acc, p) => acc + p.time, 0);
          const avgTime = successCount > 0 ? Math.round(totalTime / successCount) : 0;

          let score = 0;
          let status = 'pass';
          const recommendations = [];

          if (successCount === 3) {
            score = 100;
            status = 'pass';
          } else if (successCount === 2) {
            score = 60;
            status = 'warn';
            recommendations.push('1 of 3 requests failed. Inspect server intermittently dropping connections or throttling requests.');
          } else if (successCount === 1) {
            score = 20;
            status = 'fail';
            recommendations.push('2 of 3 requests failed. Severe intermittent availability issues detected.');
          } else {
            score = 0;
            status = 'fail';
            recommendations.push('All 3 consecutive requests failed. Target server appears offline or unreachable.');
          }

          const pingTable = pings.map(p => ({
            Ping: `#${p.pingNumber}`,
            Status: p.status ? `HTTP ${p.status}` : (p.error || 'Failed'),
            ResponseTime: `${p.time} ms`,
            Result: p.success ? 'Success' : 'Failure'
          }));

          const details = [
            { label: 'Consecutive Consistency Note', value: '3 consecutive requests were made to check consistency with 1s pause between requests.', type: 'text' },
            { label: 'Availability Rate', value: `${availabilityRate}% (${successCount}/3 pings successful)`, type: 'text' },
            { label: 'Average Response Time', value: `${avgTime} ms`, type: 'text' },
            { label: 'Ping Execution Breakdown', value: JSON.stringify(pingTable, null, 2), type: 'table' }
          ];

          return {
            id: 'multi-ping',
            name: 'Availability Check (3 Pings)',
            status,
            score,
            summary: `${successCount}/3 pings succeeded (${availabilityRate}% availability), avg response ${avgTime}ms.`,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { pings, successCount, availabilityRate, avgTime }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 3: server-errors
      // -------------------------------------------------------------
      {
        id: 'server-errors',
        name: 'Server Error Rate',
        description: 'Audits multi-ping responses and HTML body content for 5xx errors, unhandled exceptions, and stack traces.',
        async run(context) {
          const startTime = performance.now();
          const targetUrl = context.url || (context.fetchResult && context.fetchResult.url);
          const pings = targetUrl ? await getMultiPingResults(targetUrl) : [];

          // Count 5xx from pings and initial fetch
          const initialStatus = context.fetchResult ? context.fetchResult.status : 0;
          let count5xx = 0;
          if (initialStatus >= 500 && initialStatus < 600) count5xx++;
          for (const p of pings) {
            if (p.status >= 500 && p.status < 600) count5xx++;
          }

          // Scan HTML for server error traces and database crash signatures
          const html = context.html || (context.fetchResult && context.fetchResult.body) || '';
          const errorPatterns = [
            { regex: /Fatal error:/i, label: 'PHP Fatal Error' },
            { regex: /Stack trace:/i, label: 'Stack Trace Dump' },
            { regex: /Exception:/i, label: 'Unhandled Exception' },
            { regex: /undefined variable/i, label: 'Undefined Variable Notice' },
            { regex: /mysql_connect/i, label: 'Deprecated MySQL Call / Connection Failure' },
            { regex: /SQLSTATE/i, label: 'Raw SQL Database Error' },
            { regex: /Internal Server Error/i, label: 'Internal Server Error Heading' },
            { regex: /502 Bad Gateway/i, label: '502 Bad Gateway Banner' },
            { regex: /Database error/i, label: 'Database Error Warning' },
            { regex: /Unhandled Promise Rejection/i, label: 'Node.js Unhandled Rejection' }
          ];

          const detectedHtmlErrors = [];
          for (const pattern of errorPatterns) {
            if (pattern.regex.test(html)) {
              detectedHtmlErrors.push(pattern.label);
            }
          }

          let score = 100;
          let status = 'pass';
          let summary = '';
          const recommendations = [];

          if (count5xx > 0 || detectedHtmlErrors.length > 0) {
            score = 0;
            status = 'fail';
            summary = `Server errors detected: ${count5xx} HTTP 5xx responses and ${detectedHtmlErrors.length} exception signature(s) found in markup.`;
            recommendations.push('Disable display_errors and verbose stack traces in production environment to avoid leaking sensitive architecture details.');
            recommendations.push('Inspect server application error logs to fix crashes and database connection leaks.');
          } else {
            score = 100;
            status = 'pass';
            summary = 'Zero HTTP 5xx errors recorded and no server exception signatures detected in HTML.';
          }

          const details = [
            { label: '5xx Status Codes Observed', value: String(count5xx), type: 'text' },
            { label: 'HTML Server Error Signatures Found', value: detectedHtmlErrors.length > 0 ? detectedHtmlErrors.join(', ') : 'None (Clean HTML)', type: 'text' },
            { label: 'Status Evaluation', value: (count5xx === 0 && detectedHtmlErrors.length === 0) ? 'Pass (0% error rate)' : 'Fail (Errors present)', type: 'text' }
          ];

          return {
            id: 'server-errors',
            name: 'Server Error Rate',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { count5xx, detectedHtmlErrors }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 4: timeout-resilience
      // -------------------------------------------------------------
      {
        id: 'timeout-resilience',
        name: 'Timeout Behavior',
        description: 'Calculates response latency variation across consecutive requests to gauge stability under variable network conditions.',
        async run(context) {
          const startTime = performance.now();
          const targetUrl = context.url || (context.fetchResult && context.fetchResult.url);
          const pings = targetUrl ? await getMultiPingResults(targetUrl) : [];

          const times = pings.filter(p => p.success).map(p => p.time);
          if (context.fetchResult && typeof context.fetchResult.time === 'number' && context.fetchResult.time > 0) {
            times.unshift(context.fetchResult.time);
          }

          if (times.length < 2) {
            return {
              id: 'timeout-resilience',
              name: 'Timeout Behavior',
              status: 'warn',
              score: 50,
              summary: 'Insufficient sample data to calculate response time variation.',
              details: [{ label: 'Samples Collected', value: String(times.length), type: 'text' }],
              recommendations: ['Ensure website is reachable to gather multiple latency samples.'],
              duration: Math.round(performance.now() - startTime),
              raw: { times }
            };
          }

          // Compute mean
          const sum = times.reduce((a, b) => a + b, 0);
          const mean = sum / times.length;

          // Compute standard deviation
          const variance = times.reduce((acc, t) => acc + Math.pow(t - mean, 2), 0) / times.length;
          const stdDev = Math.sqrt(variance);

          // Coefficient of variation (CV) in percent
          const cv = mean > 0 ? Math.round((stdDev / mean) * 100) : 0;

          let score = 100;
          let status = 'pass';
          let summary = '';
          const recommendations = [];

          if (cv < 20) {
            score = 100;
            status = 'pass';
            summary = `Highly consistent response latency (CV: ${cv}%). Server exhibits resilient, predictable performance.`;
          } else if (cv < 50) {
            score = 70;
            status = 'pass';
            summary = `Moderate latency variation (CV: ${cv}%). Server response time fluctuates occasionally.`;
            recommendations.push('Investigate caching layers and database connection pooling to stabilize server latency.');
          } else {
            score = 40;
            status = 'warn';
            summary = `High latency instability detected (CV: ${cv}%). Response times swing widely under similar request conditions.`;
            recommendations.push('High response variance indicates thread contention, cold cache misses, or server throttling. Audit background task spikes.');
          }

          const details = [
            { label: 'Sample Count', value: `${times.length} requests`, type: 'text' },
            { label: 'Mean Response Time', value: `${Math.round(mean)} ms`, type: 'text' },
            { label: 'Standard Deviation', value: `±${Math.round(stdDev)} ms`, type: 'text' },
            { label: 'Coefficient of Variation (CV)', value: `${cv}%`, type: 'text' },
            { label: 'Min / Max Response Times', value: `${Math.min(...times)} ms / ${Math.max(...times)} ms`, type: 'text' }
          ];

          return {
            id: 'timeout-resilience',
            name: 'Timeout Behavior',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { times, mean: Math.round(mean), stdDev: Math.round(stdDev), cv }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 5: content-consistency
      // -------------------------------------------------------------
      {
        id: 'content-consistency',
        name: 'Content Consistency',
        description: 'Compares successive page loads to detect dynamic HTML length variance and title flapping caused by improper caching.',
        async run(context) {
          const startTime = performance.now();
          const targetUrl = context.url || (context.fetchResult && context.fetchResult.url);
          const initialHtml = context.html || (context.fetchResult && context.fetchResult.body) || '';

          // Fetch a fresh snapshot to compare against the initial HTML
          let secondHtml = '';
          if (targetUrl) {
            const probe = await fetchViaProxy(targetUrl, 7000);
            secondHtml = probe.contents || '';
          }

          if (!initialHtml || !secondHtml) {
            return {
              id: 'content-consistency',
              name: 'Content Consistency',
              status: 'info',
              score: null,
              summary: 'Single content snapshot available. Need secondary fetch to compare consistency.',
              details: [],
              recommendations: [],
              duration: Math.round(performance.now() - startTime),
              raw: {}
            };
          }

          const len1 = initialHtml.length;
          const len2 = secondHtml.length;
          const maxLen = Math.max(len1, len2);
          const diffBytes = Math.abs(len1 - len2);
          const variancePercent = maxLen > 0 ? Math.round((diffBytes / maxLen) * 100) : 0;

          // Compare titles
          const parseTitle = (htmlStr) => {
            const m = htmlStr.match(/<title[^>]*>([^<]*)<\/title>/i);
            return m ? m[1].trim() : '';
          };
          const title1 = parseTitle(initialHtml);
          const title2 = parseTitle(secondHtml);
          const titlesMatch = (title1 === title2);

          let score = 100;
          let status = 'pass';
          let summary = '';
          const recommendations = [];

          if (titlesMatch && variancePercent <= 5) {
            score = 100;
            status = 'pass';
            summary = `HTML is consistent across successive fetches (${variancePercent}% variance, identical <title>).`;
          } else if (titlesMatch && variancePercent <= 20) {
            score = 75;
            status = 'pass';
            summary = `Minor HTML variance observed (${variancePercent}% variance, ${diffBytes} bytes difference). Expected for dynamic timestamps or CSRF tokens.`;
          } else {
            score = 40;
            status = 'warn';
            summary = `Major variance detected (${variancePercent}% size difference, ${diffBytes} bytes diff${!titlesMatch ? ', title changed' : ''}). Potential caching or session issue.`;
            recommendations.push('Investigate whether dynamic caching, A/B testing proxies, or session-dependent templates are causing erratic content differences.');
            if (!titlesMatch) recommendations.push(`Title changed between requests: "${title1}" vs "${title2}".`);
          }

          const details = [
            { label: 'Initial Snapshot Size', value: `${len1.toLocaleString()} bytes`, type: 'text' },
            { label: 'Second Snapshot Size', value: `${len2.toLocaleString()} bytes`, type: 'text' },
            { label: 'Length Variance', value: `${variancePercent}% (${diffBytes.toLocaleString()} bytes)`, type: 'text' },
            { label: 'Title Tag Consistency', value: titlesMatch ? `Consistent ("${title1}")` : `Mismatch ("${title1}" vs "${title2}")`, type: 'text' }
          ];

          return {
            id: 'content-consistency',
            name: 'Content Consistency',
            status,
            score,
            summary,
            details,
            recommendations,
            duration: Math.round(performance.now() - startTime),
            raw: { len1, len2, variancePercent, titlesMatch, title1, title2 }
          };
        }
      },

      // -------------------------------------------------------------
      // Test 6: uptime-monitoring-setup
      // -------------------------------------------------------------
      {
        id: 'uptime-monitoring-setup',
        name: 'Uptime Monitoring (GitHub Actions)',
        description: 'Provides ready-to-deploy GitHub Actions workflow template for scheduled 24/7 uptime monitoring.',
        type: 'template',
        async run(context) {
          const startTime = performance.now();
          const targetUrl = context.url || 'https://example.com';

          const templateYaml = `name: VeriQ 24/7 Uptime Monitor

on:
  schedule:
    - cron: '*/5 * * * *'  # Runs every 5 minutes
  workflow_dispatch:

jobs:
  ping-check:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Target Website
        run: |
          STATUS=$(curl -o /dev/null -s -w "%{http_code}" -L --max-time 10 "${targetUrl}")
          echo "HTTP Status: $STATUS"
          if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 400 ]; then
            echo "Website is UP and operational."
            exit 0
          else
            echo "::error::Website returned failure code: $STATUS"
            exit 1
          fi

      - name: Create GitHub Alert Issue on Failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 CRITICAL: Website Down Alert (${targetUrl})',
              body: 'Automated 5-minute health probe failed for ${targetUrl} at ' + new Date().toISOString() + '. Please investigate immediate server health.'
            });`;

          const details = [
            { label: 'Monitoring Capability', value: 'Automated 24/7 uptime monitoring using GitHub Actions (Zero hosting cost).', type: 'text' },
            { label: 'Recommended Cron Cadence', value: 'Every 5 minutes (*/5 * * * *)', type: 'text' },
            { label: 'Workflow Setup Path', value: '.github/workflows/uptime-monitor.yml', type: 'text' },
            { label: 'Template Workflow Configuration', value: templateYaml, type: 'code' }
          ];

          return {
            id: 'uptime-monitoring-setup',
            name: 'Uptime Monitoring (GitHub Actions)',
            status: 'info',
            score: null,
            summary: 'Automated 24/7 uptime monitoring workflow template generated and ready to commit.',
            details,
            recommendations: [
              'Save the template above into your repository at .github/workflows/uptime-monitor.yml.',
              'Ensure Actions permissions are set to "Read and write permissions" to permit automatic failure issue creation.'
            ],
            duration: Math.round(performance.now() - startTime),
            raw: { targetUrl, templateYaml }
          };
        }
      }
    ]
  };
})();
