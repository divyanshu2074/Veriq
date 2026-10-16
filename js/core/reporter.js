/**
 * VeriQ - Website Testing Suite
 * Core Engine: Results Reporter & DOM Renderer
 *
 * Handles:
 * - Rendering individual test cards with accordion expansion & accessibility
 * - Module test list rendering and stats synchronization
 * - Overall dashboard score updates and module card summaries
 * - Animated SVG donut score circles (WCAG compliant colors)
 * - Progress bar and URL bar status updates
 * - Test filtering by status (All, Pass, Fail, Warn, Skip)
 * - Skeleton loading state during test execution
 * - Standalone printable HTML report generation and export
 */

window.VeriQ = window.VeriQ || {};
window.VeriQ.core = window.VeriQ.core || {};

VeriQ.core.reporter = (function() {
  'use strict';

  const utils = VeriQ.core.utils;

  // -------------------------------------------------------------------------
  // Helper: DOM Element Resolution
  // -------------------------------------------------------------------------

  /**
   * Safe element finder that tries multiple common selector patterns
   * @param {string} id
   * @param {string} [secondarySelector]
   * @returns {HTMLElement|null}
   */
  function findElement(id, secondarySelector) {
    let el = document.getElementById(id);
    if (!el && secondarySelector) {
      el = document.querySelector(secondarySelector);
    }
    return el;
  }

  // -------------------------------------------------------------------------
  // Score Calculations & Statistics
  // -------------------------------------------------------------------------

  /**
   * Calculates module or overall score (0 - 100) from test results
   * Ignores 'skip' and 'info' tests from the weighted average
   * @param {Array<Object>} results - Array of TestResult objects
   * @returns {number} Score between 0 and 100
   */
  function calculateScore(results) {
    if (!Array.isArray(results) || results.length === 0) return 0;

    let totalPoints = 0;
    let scoredTestsCount = 0;

    for (const test of results) {
      if (!test) continue;
      const status = String(test.status || '').toLowerCase();

      // Skip or Info tests do not count toward or against the score
      if (status === 'skip' || status === 'info') {
        continue;
      }

      scoredTestsCount++;

      // If test defines an explicit score (0 - 100), use that
      if (typeof test.score === 'number' && !isNaN(test.score)) {
        totalPoints += Math.max(0, Math.min(100, test.score));
      } else {
        // Otherwise determine score by status
        if (status === 'pass') {
          totalPoints += 100;
        } else if (status === 'warn') {
          totalPoints += 50;
        } else if (status === 'fail' || status === 'error') {
          totalPoints += 0;
        } else {
          totalPoints += 50;
        }
      }
    }

    if (scoredTestsCount === 0) {
      // If all tests were skip/info, return 100 if none failed, else 0
      return results.length > 0 ? 100 : 0;
    }

    return Math.round(totalPoints / scoredTestsCount);
  }

  /**
   * Computes aggregate statistics from test results
   * @param {Array<Object>} results
   * @returns {{total: number, pass: number, fail: number, warn: number, info: number, skip: number, error: number, score: number}}
   */
  function calcStats(results) {
    const stats = {
      total: 0,
      pass: 0,
      fail: 0,
      warn: 0,
      info: 0,
      skip: 0,
      error: 0,
      score: 0
    };

    if (!Array.isArray(results)) return stats;

    stats.total = results.length;

    for (const test of results) {
      if (!test) continue;
      const s = String(test.status || '').toLowerCase();
      if (stats[s] !== undefined) {
        stats[s]++;
      } else {
        stats.info++;
      }
    }

    stats.score = calculateScore(results);
    return stats;
  }

  // -------------------------------------------------------------------------
  // Score Circle SVG Generator
  // -------------------------------------------------------------------------

  /**
   * Creates an animated SVG score donut element
   * Circumference = 2 * Math.PI * 40 = 251.33
   * @param {number|null} score - 0 to 100 or null
   * @param {string} [size='md'] - 'lg' | 'md' | 'sm'
   * @returns {HTMLElement} Score circle wrapper element
   */
  function createScoreCircle(score, size = 'md') {
    const isValNull = score === null || score === undefined || isNaN(score);
    const validScore = isValNull ? 0 : Math.max(0, Math.min(100, Math.round(score)));
    const strokeColor = isValNull ? '#94A3B8' : utils.scoreToColor(validScore);
    const displayText = isValNull ? '—' : validScore.toString();
    const grade = isValNull ? '' : utils.scoreToGrade(validScore);

    const radius = 40;
    const circumference = 2 * Math.PI * radius; // 251.327...
    const strokeDash = isValNull
      ? `0 ${circumference}`
      : `${(validScore / 100) * circumference} ${circumference - (validScore / 100) * circumference}`;

    // Dimensions configuration
    const sizeMap = {
      lg: { width: 130, height: 130, strokeWidth: 8, fontSize: 30, gradeSize: 13, showGrade: true },
      md: { width: 84,  height: 84,  strokeWidth: 7, fontSize: 22, gradeSize: 10, showGrade: true },
      sm: { width: 48,  height: 48,  strokeWidth: 5, fontSize: 13, gradeSize: 0,  showGrade: false }
    };
    const cfg = sizeMap[size] || sizeMap.md;

    const wrapper = document.createElement('div');
    wrapper.className = `score-circle-container score-circle-${size}`;
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.position = 'relative';
    wrapper.style.width = `${cfg.width}px`;
    wrapper.style.height = `${cfg.height}px`;

    const gradeSvg = (cfg.showGrade && grade)
      ? `<text x="50" y="70" text-anchor="middle" font-size="${cfg.gradeSize}" font-weight="600" fill="${strokeColor}">${grade}</text>`
      : '';

    const textY = (cfg.showGrade && grade) ? 48 : 55;

    wrapper.innerHTML = `
      <svg viewBox="0 0 100 100" width="${cfg.width}" height="${cfg.height}" class="score-donut-svg" aria-label="Score: ${displayText}">
        <!-- Background Track -->
        <circle cx="50" cy="50" r="${radius}" fill="none" stroke="currentColor" class="score-track" stroke-width="${cfg.strokeWidth}" opacity="0.18"></circle>
        <!-- Animated Score Value Circle -->
        <circle cx="50" cy="50" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="${cfg.strokeWidth}"
          stroke-dasharray="${strokeDash}" stroke-dashoffset="0" stroke-linecap="round"
          transform="rotate(-90 50 50)" class="score-indicator-circle"
          style="transition: stroke-dasharray 0.8s ease-out, stroke 0.4s ease;">
        </circle>
        <!-- Score Text -->
        <text x="50" y="${textY}" text-anchor="middle" font-size="${cfg.fontSize}" font-weight="700" fill="currentColor" class="score-text">
          ${displayText}
        </text>
        ${gradeSvg}
      </svg>
    `;

    return wrapper;
  }

  // -------------------------------------------------------------------------
  // Test Card Component
  // -------------------------------------------------------------------------

  /**
   * Creates an interactive, accessible test card DOM element
   * @param {Object} testResult - TestResult object
   * @returns {HTMLElement} .test-card element
   */
  function createTestCard(testResult) {
    const test = testResult || {};
    const status = String(test.status || 'info').toLowerCase();
    const testId = test.id || utils.generateId();
    const emoji = utils.statusToEmoji(status);
    const statusLabel = utils.statusToLabel(status);
    const testName = utils.escapeHtml(test.name || test.title || 'Untitled Test');
    const summary = utils.escapeHtml(test.summary || test.message || 'No summary provided');
    const scoreVal = (typeof test.score === 'number' && !isNaN(test.score)) ? Math.round(test.score) : null;
    const duration = (typeof test.duration === 'number' && test.duration > 0)
      ? test.duration
      : (typeof test.time === 'number' ? test.time : null);

    const card = document.createElement('div');
    card.className = 'test-card';
    card.setAttribute('data-status', status);
    card.setAttribute('data-test-id', testId);

    // Score badge markup (only if test has score)
    const scoreBadgeHtml = scoreVal !== null
      ? `<span class="test-score-badge" style="color: ${utils.scoreToColor(scoreVal)}">${scoreVal}/100</span>`
      : '';

    // Recommendations list markup
    let recsHtml = '';
    const recs = Array.isArray(test.recommendations)
      ? test.recommendations
      : (test.recommendation ? [test.recommendation] : []);

    if (recs.length > 0) {
      const items = recs
        .map(r => `<li>${utils.escapeHtml(typeof r === 'string' ? r : (r.text || JSON.stringify(r)))}</li>`)
        .join('');
      recsHtml = `
        <div class="test-recommendations">
          <h4>💡 How to fix</h4>
          <ul>${items}</ul>
        </div>
      `;
    }

    // Details dl markup
    let detailsHtml = '';
    if (test.details) {
      let dlItems = '';
      if (Array.isArray(test.details)) {
        dlItems = test.details
          .map(d => `<dt>${utils.escapeHtml(d.label || d.key)}</dt><dd>${utils.escapeHtml(String(d.value))}</dd>`)
          .join('');
      } else if (typeof test.details === 'object') {
        dlItems = Object.entries(test.details)
          .map(([k, v]) => `<dt>${utils.escapeHtml(k)}</dt><dd>${utils.escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</dd>`)
          .join('');
      }
      if (dlItems) {
        detailsHtml = `<dl class="test-details">${dlItems}</dl>`;
      }
    }

    // Meta row (execution time)
    const metaHtml = duration !== null
      ? `<div class="test-meta"><span>Tested in ${utils.formatTime(duration)}</span></div>`
      : '';

    // Raw Data toggle
    const rawData = test.raw !== undefined ? test.raw : test.data;
    let rawHtml = '';
    if (rawData !== undefined && rawData !== null) {
      try {
        const rawJson = JSON.stringify(rawData, null, 2);
        rawHtml = `
          <details class="test-raw-data">
            <summary>Raw data</summary>
            <pre><code>${utils.escapeHtml(rawJson)}</code></pre>
          </details>
        `;
      } catch (e) {
        // Skip invalid JSON
      }
    }

    card.innerHTML = `
      <div class="test-card-header" role="button" tabindex="0" aria-expanded="false">
        <span class="test-status-emoji">${emoji}</span>
        <div class="test-info">
          <div class="test-name">${testName}</div>
          <div class="test-summary-preview">${summary}</div>
        </div>
        <div class="test-card-right">
          <span class="badge badge-${status}">${statusLabel}</span>
          ${scoreBadgeHtml}
          <span class="test-expand-icon">▼</span>
        </div>
      </div>
      <div class="test-card-body">
        <p class="test-summary">${summary}</p>
        ${detailsHtml}
        ${recsHtml}
        ${metaHtml}
        ${rawHtml}
      </div>
    `;

    // Setup interactive expand / collapse behavior
    const header = card.querySelector('.test-card-header');
    const body = card.querySelector('.test-card-body');

    // Smooth CSS max-height transition styling
    body.style.overflow = 'hidden';
    body.style.maxHeight = '0';
    body.style.transition = 'max-height 0.28s ease, opacity 0.2s ease, padding 0.28s ease';
    body.style.opacity = '0';
    body.style.paddingTop = '0';
    body.style.paddingBottom = '0';

    const toggleExpand = () => {
      const isExpanded = card.classList.contains('expanded');
      if (isExpanded) {
        card.classList.remove('expanded');
        header.setAttribute('aria-expanded', 'false');
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        body.style.paddingTop = '0';
        body.style.paddingBottom = '0';
      } else {
        card.classList.add('expanded');
        header.setAttribute('aria-expanded', 'true');
        body.style.paddingTop = '';
        body.style.paddingBottom = '';
        body.style.maxHeight = `${body.scrollHeight + 40}px`;
        body.style.opacity = '1';
      }
    };

    header.addEventListener('click', (e) => {
      // Don't toggle if clicking raw details toggle inside
      if (e.target.closest('details')) return;
      toggleExpand();
    });

    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleExpand();
      }
    });

    return card;
  }

  // -------------------------------------------------------------------------
  // Module Results Rendering
  // -------------------------------------------------------------------------

  /**
   * Renders all test cards for a given module into its container and updates stats
   * @param {string} moduleId
   * @param {Array<Object>} results
   */
  function renderModuleResults(moduleId, results = []) {
    const container = findElement(`tests-${moduleId}`, `[data-module-results="${moduleId}"]`) ||
      findElement(`module-results-${moduleId}`);

    const stats = calcStats(results);

    // Update container with test cards
    if (container) {
      container.innerHTML = '';
      if (results.length === 0) {
        container.innerHTML = '<div class="empty-tests-state"><p>No tests have been executed for this category yet.</p></div>';
      } else {
        const frag = document.createDocumentFragment();
        for (const test of results) {
          frag.appendChild(createTestCard(test));
        }
        container.appendChild(frag);
      }
    }

    // Update module counter badges
    const totalEl = findElement(`stat-total-${moduleId}`);
    const passEl = findElement(`stat-pass-${moduleId}`);
    const failEl = findElement(`stat-fail-${moduleId}`);
    const warnEl = findElement(`stat-warn-${moduleId}`);

    if (totalEl) totalEl.textContent = stats.total.toString();
    if (passEl) passEl.textContent = stats.pass.toString();
    if (failEl) failEl.textContent = stats.fail.toString();
    if (warnEl) warnEl.textContent = stats.warn.toString();

    // Update score circle
    const circleContainer = findElement(`score-circle-${moduleId}`) ||
      findElement(`module-score-${moduleId}`);

    if (circleContainer) {
      circleContainer.innerHTML = '';
      circleContainer.appendChild(createScoreCircle(stats.score, 'md'));
    }
  }

  // -------------------------------------------------------------------------
  // Dashboard Updates
  // -------------------------------------------------------------------------

  /**
   * Updates overall dashboard score and all module summary cards
   * @param {Object<string, Array<Object>>} allResults - moduleId -> results[]
   */
  function updateDashboard(allResults = {}) {
    const allTests = [];
    const moduleScores = {};

    for (const [modId, results] of Object.entries(allResults)) {
      if (Array.isArray(results)) {
        allTests.push(...results);
        moduleScores[modId] = calculateScore(results);
      }
    }

    const overallStats = calcStats(allTests);

    // Update Overall Score Circle
    const overallCircleContainer = findElement('dashboard-overall-score', '#score-circle-dashboard') ||
      findElement('dash-overall-score');

    if (overallCircleContainer) {
      overallCircleContainer.innerHTML = '';
      overallCircleContainer.appendChild(createScoreCircle(overallStats.score, 'lg'));
    }

    // Update Dashboard Counts
    const totalEl = findElement('dash-total-tests', '#stat-total-dashboard');
    const passEl = findElement('dash-pass-count', '#stat-pass-dashboard');
    const failEl = findElement('dash-fail-count', '#stat-fail-dashboard');
    const warnEl = findElement('dash-warn-count', '#stat-warn-dashboard');

    if (totalEl) totalEl.textContent = overallStats.total.toString();
    if (passEl) passEl.textContent = overallStats.pass.toString();
    if (failEl) failEl.textContent = overallStats.fail.toString();
    if (warnEl) warnEl.textContent = overallStats.warn.toString();

    // Update individual module cards on Dashboard
    for (const [modId, score] of Object.entries(moduleScores)) {
      const scoreBadge = findElement(`dash-score-${modId}`, `[data-dash-score="${modId}"]`);
      if (scoreBadge) {
        scoreBadge.textContent = `${score}%`;
        scoreBadge.style.color = utils.scoreToColor(score);
      }

      const modCard = findElement(`dash-card-${modId}`, `[data-dash-card="${modId}"]`);
      if (modCard) {
        modCard.setAttribute('data-score-grade', utils.scoreToGrade(score));
      }
    }
  }

  // -------------------------------------------------------------------------
  // Status & Progress Updates
  // -------------------------------------------------------------------------

  /**
   * Update the global URL bar status badge
   * @param {string} text - Status label text
   * @param {'idle'|'running'|'done'|'error'} type
   */
  function updateStatus(text, type = 'idle') {
    const statusBadges = document.querySelectorAll('#url-bar-status, #run-status-badge, .global-status-badge');
    statusBadges.forEach(badge => {
      badge.textContent = text;
      badge.className = `badge status-badge status-${type}`;
    });
  }

  /**
   * Update global test execution progress bar
   * @param {number} current - Current completed step
   * @param {number} total - Total steps
   * @param {string} [label] - Description label
   */
  function updateProgress(current, total, label = '') {
    const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

    const progressBars = document.querySelectorAll('#test-progress-bar, .test-progress-bar-fill');
    progressBars.forEach(bar => {
      bar.style.width = `${percent}%`;
      bar.setAttribute('aria-valuenow', percent);
    });

    const labels = document.querySelectorAll('#test-progress-label, #test-progress-text');
    labels.forEach(el => {
      el.textContent = label || `${percent}% (${current}/${total})`;
    });
  }

  // -------------------------------------------------------------------------
  // Filtering & Search
  // -------------------------------------------------------------------------

  /**
   * Filter test cards in a module by status
   * @param {string} moduleId
   * @param {'all'|'pass'|'fail'|'warn'|'skip'} filter
   */
  function filterTests(moduleId, filter = 'all') {
    const container = findElement(`tests-${moduleId}`, `[data-module-results="${moduleId}"]`) ||
      findElement(`module-results-${moduleId}`);

    if (!container) return;

    const cards = container.querySelectorAll('.test-card');
    const targetFilter = filter.toLowerCase();

    cards.forEach(card => {
      const cardStatus = (card.getAttribute('data-status') || '').toLowerCase();
      if (targetFilter === 'all' || cardStatus === targetFilter) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });

    // Update active filter button state
    const filterButtons = document.querySelectorAll(`[data-module="${moduleId}"][data-filter], .filter-btn[data-filter]`);
    filterButtons.forEach(btn => {
      if (btn.getAttribute('data-filter') === targetFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // -------------------------------------------------------------------------
  // Skeleton Loading State
  // -------------------------------------------------------------------------

  /**
   * Shows skeleton loader cards inside a module container while tests run
   * @param {string} moduleId
   * @param {number} [testCount=4]
   */
  function showLoading(moduleId, testCount = 4) {
    const container = findElement(`tests-${moduleId}`, `[data-module-results="${moduleId}"]`) ||
      findElement(`module-results-${moduleId}`);

    if (!container) return;

    let skeletonsHtml = '';
    for (let i = 0; i < testCount; i++) {
      skeletonsHtml += `
        <div class="test-card test-card-skeleton" style="opacity: 0.7; pointer-events: none; margin-bottom: 12px;">
          <div class="test-card-header" style="display: flex; align-items: center; gap: 12px; padding: 14px 18px;">
            <div class="skeleton-shimmer" style="width: 28px; height: 28px; border-radius: 50%; background: rgba(148,163,184,0.25);"></div>
            <div style="flex: 1;">
              <div class="skeleton-shimmer" style="width: 40%; height: 16px; border-radius: 4px; background: rgba(148,163,184,0.25); margin-bottom: 6px;"></div>
              <div class="skeleton-shimmer" style="width: 70%; height: 12px; border-radius: 4px; background: rgba(148,163,184,0.18);"></div>
            </div>
            <div class="skeleton-shimmer" style="width: 60px; height: 22px; border-radius: 9999px; background: rgba(148,163,184,0.2);"></div>
          </div>
        </div>
      `;
    }

    container.innerHTML = skeletonsHtml;
  }

  // -------------------------------------------------------------------------
  // Standalone HTML Report Generation
  // -------------------------------------------------------------------------

  /**
   * Generates a complete standalone, beautifully styled HTML report and triggers browser download
   * @param {Object} runData
   */
  function exportHtml(runData) {
    if (!runData || !runData.url) {
      alert('No test run data available to export.');
      return;
    }

    const dateStr = utils.formatDate(runData.timestamp);
    const score = Math.round(runData.overallScore || 0);
    const grade = utils.scoreToGrade(score);
    const scoreColor = utils.scoreToColor(score);
    const summary = runData.summary || {};
    const modules = runData.results || {};

    let modulesHtml = '';

    for (const [modId, tests] of Object.entries(modules)) {
      if (!Array.isArray(tests) || tests.length === 0) continue;

      const modScore = calculateScore(tests);
      const modStats = calcStats(tests);
      const modTitle = modId.toUpperCase();

      let testsRows = '';
      for (const t of tests) {
        const emoji = utils.statusToEmoji(t.status);
        const name = utils.escapeHtml(t.name || t.id);
        const testSummary = utils.escapeHtml(t.summary || '');
        const statusBadge = `<span class="badge badge-${t.status}">${utils.statusToLabel(t.status)}</span>`;

        testsRows += `
          <tr class="test-row status-${t.status}">
            <td style="width: 32px; text-align: center;">${emoji}</td>
            <td><strong>${name}</strong><br><small style="color: #64748B;">${testSummary}</small></td>
            <td style="text-align: right;">${statusBadge}</td>
          </tr>
        `;
      }

      modulesHtml += `
        <div class="report-module-card">
          <div class="report-module-header">
            <h3>${modTitle}</h3>
            <span class="report-module-score" style="color: ${utils.scoreToColor(modScore)}">${modScore}%</span>
          </div>
          <div class="report-module-stats">
            <span>Total: <b>${modStats.total}</b></span>
            <span style="color: #059669;">Pass: <b>${modStats.pass}</b></span>
            <span style="color: #DC2626;">Fail: <b>${modStats.fail}</b></span>
            <span style="color: #D97706;">Warn: <b>${modStats.warn}</b></span>
          </div>
          <table class="report-tests-table">
            <tbody>
              ${testsRows}
            </tbody>
          </table>
        </div>
      `;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeriQ Test Report - ${utils.escapeHtml(runData.url)}</title>
  <style>
    :root {
      --bg: #0F172A;
      --card-bg: #1E293B;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --border: #334155;
      --pass: #059669;
      --fail: #DC2626;
      --warn: #D97706;
      --info: #2563EB;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 30px 20px;
    }
    .report-container { max-width: 900px; margin: 0 auto; }
    .report-header {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .report-title h1 { font-size: 24px; margin-bottom: 6px; }
    .report-title p { color: var(--text-muted); font-size: 14px; word-break: break-all; }
    .report-score-box {
      text-align: center;
      background: rgba(15, 23, 42, 0.6);
      padding: 16px 24px;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .report-score-value { font-size: 44px; font-weight: 800; line-height: 1; }
    .report-score-grade { font-size: 14px; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
    .report-summary-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .stat-num { font-size: 24px; font-weight: 700; }
    .stat-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; }
    .report-module-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .report-module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .report-module-header h3 { font-size: 18px; }
    .report-module-score { font-size: 20px; font-weight: 700; }
    .report-module-stats {
      display: flex;
      gap: 16px;
      font-size: 13px;
      margin-bottom: 14px;
      color: var(--text-muted);
    }
    .report-tests-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .report-tests-table td { padding: 10px 8px; border-bottom: 1px solid rgba(51,65,85,0.4); }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-pass { background: rgba(5,150,105,0.2); color: #34D399; }
    .badge-fail { background: rgba(220,38,38,0.2); color: #F87171; }
    .badge-warn { background: rgba(217,119,6,0.2); color: #FBBF24; }
    .badge-info { background: rgba(37,99,235,0.2); color: #60A5FA; }
    .badge-skip { background: rgba(148,163,184,0.2); color: #94A3B8; }
    @media print {
      body { background: #fff; color: #000; }
      .report-header, .stat-box, .report-module-card { background: #fff; border-color: #ccc; }
      .report-score-box { background: #f4f4f4; border-color: #ccc; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <div class="report-title">
        <h1>VeriQ Test Report</h1>
        <p>Target: <strong>${utils.escapeHtml(runData.url)}</strong></p>
        <p>Executed on ${dateStr} • Duration: ${utils.formatTime(runData.duration || 0)}</p>
      </div>
      <div class="report-score-box">
        <div class="report-score-value" style="color: ${scoreColor}">${score}</div>
        <div class="report-score-grade" style="color: ${scoreColor}">Grade: ${grade}</div>
      </div>
    </div>

    <div class="report-summary-bar">
      <div class="stat-box">
        <div class="stat-num">${summary.total || 0}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color: #10B981;">${summary.pass || 0}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color: #EF4444;">${summary.fail || 0}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" style="color: #F59E0B;">${summary.warn || 0}</div>
        <div class="stat-label">Warnings</div>
      </div>
    </div>

    <div class="report-modules">
      ${modulesHtml}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veriQ-report-${runData.id || Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  // -------------------------------------------------------------------------
  // Public API Export
  // -------------------------------------------------------------------------
  return {
    createTestCard,
    renderModuleResults,
    updateDashboard,
    updateStatus,
    updateProgress,
    createScoreCircle,
    calculateScore,
    calcStats,
    filterTests,
    exportHtml,
    showLoading
  };
})();
