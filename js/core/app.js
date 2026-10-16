/**
 * VeriQ - Website Testing Suite
 * Core Engine: Main Application Controller & UI Coordinator
 *
 * This file is loaded last. It coordinates:
 * - Application lifecycle, state, and hash-based navigation
 * - Sequential orchestration of the 10 test modules
 * - Single module and single test isolated execution
 * - Progressive test result rendering and live progress updates
 * - Settings synchronization and external service dispatch (GitHub / Sheets)
 * - Global UI notification toasts, interactive modals, and confirmations
 */

window.VeriQ = window.VeriQ || {};
window.VeriQ.core = window.VeriQ.core || {};

// ---------------------------------------------------------------------------
// Global UI Helpers (VeriQ.ui)
// ---------------------------------------------------------------------------
window.VeriQ.ui = (function() {
  'use strict';

  const utils = VeriQ.core.utils;

  /**
   * Displays an animated toast notification
   * @param {string} msg - Message text
   * @param {'info'|'success'|'warning'|'error'} [type='info']
   * @param {number} [duration=4000] - Duration in ms before auto dismiss
   */
  function toast(msg, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; max-width: 420px; pointer-events: none;';
      document.body.appendChild(container);
    }

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    const icon = icons[type] || 'ℹ️';

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;
    toastEl.style.cssText = `
      display: flex; align-items: center; gap: 12px; padding: 14px 18px;
      background: #1E293B; color: #F8FAFC; border: 1px solid #334155;
      border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4);
      pointer-events: auto; opacity: 0; transform: translateY(12px);
      transition: opacity 0.25s ease, transform 0.25s ease; font-size: 14px;
    `;

    toastEl.innerHTML = `
      <span class="toast-icon" style="font-size: 16px;">${icon}</span>
      <span class="toast-msg" style="flex: 1; word-break: break-word;">${utils.escapeHtml(msg)}</span>
      <button class="toast-close" aria-label="Close" style="background: none; border: none; color: #94A3B8; cursor: pointer; font-size: 16px; padding: 2px 6px;">✕</button>
    `;

    container.appendChild(toastEl);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateY(0)';
    });

    const removeToast = () => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(12px)';
      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
      }, 250);
    };

    const closeBtn = toastEl.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', removeToast);
    }

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  }

  /**
   * Displays a modal dialog
   * @param {string} title
   * @param {string|HTMLElement} body
   * @param {Array<{label: string, type: 'primary'|'secondary'|'danger', onClick: Function}>} [actions=[]]
   */
  function modal(title, body, actions = []) {
    closeModal(); // Close existing modal if open

    const backdrop = document.createElement('div');
    backdrop.id = 'modal-backdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px); z-index: 9990; display: flex;
      align-items: center; justify-content: center; padding: 20px;
      opacity: 0; transition: opacity 0.2s ease;
    `;

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.style.cssText = `
      background: #1E293B; color: #F8FAFC; border: 1px solid #334155;
      border-radius: 12px; width: 100%; max-width: 520px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden;
      transform: scale(0.95); transition: transform 0.2s ease;
    `;

    // Modal Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #334155;';
    header.innerHTML = `
      <h3 style="font-size: 18px; font-weight: 600; margin: 0;">${utils.escapeHtml(title)}</h3>
      <button class="modal-close" style="background: none; border: none; color: #94A3B8; font-size: 20px; cursor: pointer; line-height: 1;">✕</button>
    `;

    // Modal Body
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'modal-body';
    bodyContainer.style.cssText = 'padding: 24px; font-size: 14px; line-height: 1.6; color: #CBD5E1; max-height: 60vh; overflow-y: auto;';
    if (typeof body === 'string') {
      bodyContainer.innerHTML = body;
    } else if (body instanceof Node) {
      bodyContainer.appendChild(body);
    }

    // Modal Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #334155; background: #0F172A;';

    const defaultCloseBtn = document.createElement('button');
    defaultCloseBtn.className = 'btn btn-secondary';
    defaultCloseBtn.textContent = 'Close';
    defaultCloseBtn.style.cssText = 'padding: 8px 16px; border-radius: 6px; border: 1px solid #475569; background: #334155; color: #F8FAFC; cursor: pointer; font-size: 13px; font-weight: 500;';
    defaultCloseBtn.addEventListener('click', closeModal);

    if (actions && actions.length > 0) {
      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.textContent = action.label;
        btn.className = `btn btn-${action.type || 'primary'}`;

        let bg = '#2563EB';
        if (action.type === 'danger') bg = '#DC2626';
        if (action.type === 'secondary') bg = '#334155';

        btn.style.cssText = `padding: 8px 16px; border-radius: 6px; border: none; background: ${bg}; color: #FFFFFF; cursor: pointer; font-size: 13px; font-weight: 500;`;
        btn.addEventListener('click', () => {
          if (typeof action.onClick === 'function') {
            action.onClick();
          }
          closeModal();
        });
        footer.appendChild(btn);
      });
    } else {
      footer.appendChild(defaultCloseBtn);
    }

    dialog.appendChild(header);
    dialog.appendChild(bodyContainer);
    dialog.appendChild(footer);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Event listeners for close
    header.querySelector('.modal-close').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', onKeyDown);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // Animate in
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      dialog.style.transform = 'scale(1)';
    });
  }

  /**
   * Closes any currently active modal
   */
  function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.style.opacity = '0';
      const dialog = backdrop.querySelector('.modal-dialog');
      if (dialog) dialog.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
      }, 200);
    }
  }

  /**
   * Displays a confirmation dialog and resolves with a boolean
   * @param {string} msg
   * @returns {Promise<boolean>}
   */
  function confirm(msg) {
    return new Promise(resolve => {
      modal(
        'Confirm Action',
        `<p>${utils.escapeHtml(msg)}</p>`,
        [
          {
            label: 'Cancel',
            type: 'secondary',
            onClick: () => resolve(false)
          },
          {
            label: 'Confirm',
            type: 'danger',
            onClick: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Sets the global test progress UI
   * @param {number} current
   * @param {number} total
   * @param {string} label
   */
  function setProgress(current, total, label) {
    const progressContainer = document.getElementById('progress-wrapper') ||
      document.getElementById('progress-container') ||
      document.querySelector('.progress-bar-container, .progress-wrapper');

    if (progressContainer) {
      progressContainer.style.display = 'block';
    }

    VeriQ.core.reporter.updateProgress(current, total, label);

    // Update Live Process HUD
    const hud = document.getElementById('live-process-hud');
    if (hud) {
      hud.style.display = 'flex';
      const hudStep = document.getElementById('hud-step-text');
      const hudTitle = document.getElementById('hud-test-title');
      const hudProgress = document.getElementById('hud-progress-percent');
      if (hudStep) hudStep.textContent = total > 0 ? `[${Math.min(current + 1, total)}/${total}]` : '';
      if (hudTitle) hudTitle.textContent = label;
      if (hudProgress) {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        hudProgress.textContent = `${pct}%`;
      }
    }
  }

  /**
   * Hides the global progress UI
   */
  function hideProgress() {
    const progressContainer = document.getElementById('progress-wrapper') ||
      document.getElementById('progress-container') ||
      document.querySelector('.progress-bar-container, .progress-wrapper');

    if (progressContainer) {
      setTimeout(() => {
        progressContainer.style.display = 'none';
      }, 500);
    }

    const hud = document.getElementById('live-process-hud');
    if (hud) {
      setTimeout(() => {
        hud.style.display = 'none';
      }, 500);
    }
  }

  /**
   * Disables or enables the run button for a specific module
   * @param {string} moduleId
   * @param {boolean} disabled
   */
  function setCategoryRunButton(moduleId, disabled) {
    const btns = document.querySelectorAll(`[data-action="run-module"][data-module="${moduleId}"], #btn-run-${moduleId}`);
    btns.forEach(btn => {
      btn.disabled = Boolean(disabled);
      if (disabled) {
        btn.classList.add('disabled', 'loading');
      } else {
        btn.classList.remove('disabled', 'loading');
      }
    });
  }

  return {
    toast,
    modal,
    closeModal,
    confirm,
    setProgress,
    hideProgress,
    setCategoryRunButton
  };
})();

// ---------------------------------------------------------------------------
// Main Application Controller (VeriQ.core.app)
// ---------------------------------------------------------------------------
(function() {
  'use strict';

  const utils = VeriQ.core.utils;
  const storage = VeriQ.core.storage;
  const reporter = VeriQ.core.reporter;
  const fetcher = VeriQ.core.fetcher;
  const ui = VeriQ.ui;

  // The 10 core VeriQ testing modules
  const DEFAULT_MODULE_IDS = [
    '01-functional',
    '02-performance',
    '03-security',
    '04-accessibility',
    '05-compatibility',
    '06-health-seo',
    '07-reliability',
    '08-localization',
    '09-code-quality',
    '10-specialized'
  ];

  const app = VeriQ.core.app = {

    // -----------------------------------------------------------------------
    // Navigation / Routing (Hash-based)
    // -----------------------------------------------------------------------

    /**
     * Navigates to a specific page
     * @param {string} page - Page ID (e.g. 'dashboard', 'seo', 'settings')
     */
    navigate(page) {
      if (!page) return;
      const cleanPage = page.replace(/^#?\/?/, '');
      window.location.hash = `#/${cleanPage}`;
    },

    /**
     * Returns currently active page identifier
     * @returns {string}
     */
    getCurrentPage() {
      return VeriQ.state.currentPage || 'dashboard';
    },

    /**
     * Hash change handler to show corresponding .page[data-page] and update sidebar
     */
    handleHashChange() {
      const rawHash = window.location.hash || '';
      let page = rawHash.replace(/^#\/?/, '').trim();

      if (!page) {
        page = 'dashboard';
      }

      VeriQ.state.currentPage = page;

      // 1. Toggle page visibility
      const pageElements = document.querySelectorAll('.page[data-page], [data-page-content]');
      let found = false;

      pageElements.forEach(el => {
        const p = el.getAttribute('data-page') || el.getAttribute('data-page-content');
        if (p === page) {
          el.style.display = 'block';
          el.classList.add('active');
          found = true;
        } else {
          el.style.display = 'none';
          el.classList.remove('active');
        }
      });

      // If no page matched, fallback to dashboard
      if (!found && page !== 'dashboard') {
        const dashboardEl = document.querySelector('.page[data-page="dashboard"], [data-page-content="dashboard"]');
        if (dashboardEl) {
          dashboardEl.style.display = 'block';
          dashboardEl.classList.add('active');
          VeriQ.state.currentPage = 'dashboard';
        }
      }

      // 2. Update active sidebar item
      const navLinks = document.querySelectorAll('[data-nav], .sidebar-link');
      navLinks.forEach(link => {
        const target = (link.getAttribute('data-nav') || link.getAttribute('href') || '')
          .replace(/^#\/?/, '')
          .trim();

        if (target === page) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      // 3. Update view header title if present
      const titleEl = document.getElementById('current-page-title');
      if (titleEl) {
        titleEl.textContent = page.charAt(0).toUpperCase() + page.slice(1);
      }

      // Scroll view to top on navigation
      window.scrollTo(0, 0);
    },

    // -----------------------------------------------------------------------
    // URL Management
    // -----------------------------------------------------------------------

    /**
     * Reads, normalizes, and validates the URL input
     * @returns {string} Validated URL or empty string
     */
    getUrl() {
      const inputEl = document.getElementById('input-url') ||
        document.getElementById('target-url') ||
        document.querySelector('input[type="url"], input[name="url"]');

      if (!inputEl) return VeriQ.state.currentUrl || '';

      const raw = inputEl.value.trim();
      if (!raw) {
        ui.toast('Please enter a website URL to test', 'warning');
        inputEl.focus();
        return '';
      }

      const normalized = utils.normalizeUrl(raw);
      if (!utils.isValidUrl(normalized)) {
        ui.toast(`"${raw}" is not a valid website URL`, 'error');
        inputEl.focus();
        return '';
      }

      // Update input field and state
      inputEl.value = normalized;
      VeriQ.state.currentUrl = normalized;
      return normalized;
    },

    /**
     * Sets URL in input and state
     * @param {string} url
     */
    setUrl(url) {
      const normalized = utils.normalizeUrl(url);
      VeriQ.state.currentUrl = normalized;
      const inputEl = document.getElementById('input-url') ||
        document.getElementById('target-url') ||
        document.querySelector('input[type="url"], input[name="url"]');

      if (inputEl) {
        inputEl.value = normalized;
      }
    },

    /**
     * Sets running state flag and updates Run buttons
     * @param {boolean} isRunning
     */
    setRunning(isRunning) {
      VeriQ.state.isRunning = Boolean(isRunning);

      const runAllBtns = document.querySelectorAll('#btn-run-all, [data-action="run-all"]');
      runAllBtns.forEach(btn => {
        btn.disabled = isRunning;
        if (isRunning) {
          btn.classList.add('loading', 'disabled');
        } else {
          btn.classList.remove('loading', 'disabled');
        }
      });

      const urlInput = document.getElementById('input-url') ||
        document.getElementById('target-url') ||
        document.querySelector('input[type="url"]');

      if (urlInput) {
        urlInput.disabled = isRunning;
      }
    },

    // -----------------------------------------------------------------------
    // Progress Tracking Callbacks
    // -----------------------------------------------------------------------

    onTestStart(moduleId, testId) {
      reporter.updateStatus(`Running ${moduleId}: ${testId}...`, 'running');
    },

    onTestComplete(moduleId, testResult) {
      // Progressively called as each test completes
    },

    onModuleComplete(moduleId, results) {
      VeriQ.state.lastResults[moduleId] = results;
      reporter.renderModuleResults(moduleId, results);
    },

    onAllComplete(allResults) {
      VeriQ.state.lastResults = allResults;
      reporter.updateDashboard(allResults);
    },

    // -----------------------------------------------------------------------
    // Test Execution Orchestration
    // -----------------------------------------------------------------------

    /**
     * Runs a single test inside a specific module
     * @param {string} moduleId
     * @param {string} testId
     * @param {string} [url]
     * @returns {Promise<Object>} TestResult
     */
    async runSingleTest(moduleId, testId, url) {
      const targetUrl = url || app.getUrl();
      if (!targetUrl) return null;

      const mod = VeriQ.modules[moduleId];
      if (!mod) {
        ui.toast(`Module "${moduleId}" not found`, 'error');
        return null;
      }

      reporter.updateStatus(`Running test: ${testId}...`, 'running');
      ui.setProgress(1, 1, `Executing ${testId}...`);

      try {
        const context = await fetcher.buildContext(targetUrl);
        let testDef = null;

        if (Array.isArray(mod.tests)) {
          testDef = mod.tests.find(t => t.id === testId);
        }

        let result = null;
        const startTime = performance.now();

        if (testDef && typeof testDef.run === 'function') {
          result = await testDef.run(context);
        } else if (typeof mod.runSingleTest === 'function') {
          result = await mod.runSingleTest(testId, context);
        } else {
          throw new Error(`Test definition for "${testId}" not found`);
        }

        result.duration = Math.round(performance.now() - startTime);
        result.id = result.id || testId;

        // Update module results in state
        const currentModResults = VeriQ.state.lastResults[moduleId] || [];
        const index = currentModResults.findIndex(t => t.id === testId);
        if (index >= 0) {
          currentModResults[index] = result;
        } else {
          currentModResults.push(result);
        }

        reporter.renderModuleResults(moduleId, currentModResults);
        reporter.updateDashboard(VeriQ.state.lastResults);
        reporter.updateStatus('Test completed', 'done');
        ui.hideProgress();

        return result;
      } catch (err) {
        reporter.updateStatus('Test error', 'error');
        ui.toast(`Test execution failed: ${err.message}`, 'error');
        ui.hideProgress();
        return null;
      }
    },

    /**
     * Runs all tests for one specific module
     * @param {string} moduleId
     * @param {string} [url]
     * @param {Object} [sharedContext] - Optional pre-fetched context to prevent repeated network calls
     * @returns {Promise<Array<Object>>} Array of TestResult objects
     */
    async runModule(moduleId, url, sharedContext = null) {
      const targetUrl = url || app.getUrl();
      if (!targetUrl) return [];

      const isStandaloneRun = !sharedContext;

      if (isStandaloneRun) {
        if (VeriQ.state.isRunning) {
          ui.toast('A test run is already in progress', 'warning');
          return [];
        }
        app.setRunning(true);
        app.navigate(moduleId);
      }

      ui.setCategoryRunButton(moduleId, true);
      reporter.updateStatus(`Testing ${moduleId.toUpperCase()}...`, 'running');

      const mod = VeriQ.modules[moduleId];
      const testList = (mod && Array.isArray(mod.tests)) ? mod.tests : [];

      reporter.showLoading(moduleId, testList.length || 4);

      try {
        // Build or reuse context
        const context = sharedContext || await fetcher.buildContext(targetUrl);

        if (context.fetchResult && context.fetchResult.error && context.fetchResult.status === 0) {
          throw new Error(`Failed to fetch target URL: ${context.fetchResult.error}`);
        }

        const results = [];

        // 1. If module defines a test array
        if (testList.length > 0) {
          for (let i = 0; i < testList.length; i++) {
            const test = testList[i];
            app.onTestStart(moduleId, test.id);
            if (isStandaloneRun) {
              ui.setProgress(i, testList.length, `[${i + 1}/${testList.length}] ${test.name || test.id}`);
            }

            const testStart = performance.now();
            let testResult;

            try {
              testResult = await test.run(context);
            } catch (err) {
              testResult = {
                id: test.id,
                name: test.name || test.id,
                status: 'error',
                summary: `Test encountered an error: ${err.message}`,
                error: err.message
              };
            }

            testResult.id = testResult.id || test.id;
            testResult.name = testResult.name || test.name || test.id;
            testResult.duration = typeof testResult.duration === 'number'
              ? testResult.duration
              : Math.round(performance.now() - testStart);

            results.push(testResult);
            app.onTestComplete(moduleId, testResult);

            // Progressive rendering of module results
            reporter.renderModuleResults(moduleId, results);
          }
        }
        // 2. If module defines run() function
        else if (mod && typeof mod.run === 'function') {
          const modResults = await mod.run(context);
          if (Array.isArray(modResults)) {
            results.push(...modResults);
          }
        }
        // 3. If module defines runAll() function
        else if (mod && typeof mod.runAll === 'function') {
          const modResults = await mod.runAll(context);
          if (Array.isArray(modResults)) {
            results.push(...modResults);
          }
        }
        // 4. Fallback if module is not yet registered
        else {
          results.push({
            id: `${moduleId}-module-status`,
            name: `${moduleId.toUpperCase()} Module Check`,
            status: 'info',
            summary: `Module "${moduleId}" is registered or awaiting test definitions.`,
            score: null
          });
        }

        app.onModuleComplete(moduleId, results);

        if (isStandaloneRun) {
          app.setRunning(false);
          ui.setCategoryRunButton(moduleId, false);
          reporter.updateStatus('Done', 'done');
          ui.hideProgress();
          reporter.updateDashboard(VeriQ.state.lastResults);
        }

        return results;
      } catch (err) {
        console.error(`VeriQ: Error running module ${moduleId}`, err);

        const errorResults = [{
          id: `${moduleId}-error`,
          name: `${moduleId.toUpperCase()} Execution Error`,
          status: 'error',
          summary: err.message || 'Unknown error occurred during test execution',
          error: err.message
        }];

        app.onModuleComplete(moduleId, errorResults);

        if (isStandaloneRun) {
          app.setRunning(false);
          ui.setCategoryRunButton(moduleId, false);
          reporter.updateStatus('Error', 'error');
          ui.hideProgress();
          ui.toast(`Module ${moduleId} failed: ${err.message}`, 'error');
        }

        return errorResults;
      }
    },

    /**
     * Executes all 10 test modules in sequence across the target URL
     * @param {string} [url]
     */
    async runAll(url) {
      const targetUrl = url || app.getUrl();
      if (!targetUrl) return;

      if (VeriQ.state.isRunning) {
        ui.toast('A test run is currently running. Please wait for it to finish.', 'warning');
        return;
      }

      app.setRunning(true);
      const overallStart = performance.now();

      // Clear previous active states on category cards
      document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('testing-active');
      });

      const moduleIds = DEFAULT_MODULE_IDS;

      reporter.updateStatus('Connecting & fetching website...', 'running');
      ui.setProgress(0, moduleIds.length, 'Connecting to website via proxy...');

      try {
        // Step 1: Pre-fetch website context to avoid 10 redundant proxy calls
        const context = await fetcher.buildContext(targetUrl);

        const allResults = {};

        // Step 2-5: Iterate through all modules sequentially
        for (let i = 0; i < moduleIds.length; i++) {
          const modId = moduleIds[i];
          const modDef = VeriQ.modules[modId];
          const modTitle = modDef ? modDef.name : modId;

          // Pulse animation on the category card in dashboard
          const catCard = document.querySelector(`.category-card[data-module="${modId}"]`);
          if (catCard) {
            catCard.classList.add('testing-active');
            const scoreEl = catCard.querySelector('.cat-score');
            if (scoreEl) {
              scoreEl.innerHTML = '<span class="hud-inline-spinner">⚙️</span> <span style="font-size:12px;color:#3B82F6;">Testing...</span>';
            }
          }

          // Update progress HUD
          ui.setProgress(i, moduleIds.length, `Running ${modTitle} tests...`);

          // Run module tests and render results progressively
          const modResults = await app.runModule(modId, targetUrl, context);
          allResults[modId] = modResults;

          if (catCard) {
            catCard.classList.remove('testing-active');
            catCard.classList.add('test-completed');
          }

          // Progressively update dashboard scores and progress so user sees live animation
          reporter.updateDashboard(allResults);

          // Brief pause for UI transition smoothness
          await utils.wait(150);
        }

        const overallDuration = Math.round(performance.now() - overallStart);

        // Step 6: Update dashboard after all complete
        app.onAllComplete(allResults);

        // Calculate overall metrics
        const allTestsFlat = Object.values(allResults).flat();
        const overallScore = reporter.calculateScore(allTestsFlat);
        const overallStats = reporter.calcStats(allTestsFlat);

        const runData = {
          id: utils.generateId(),
          url: targetUrl,
          timestamp: Date.now(),
          duration: overallDuration,
          results: allResults,
          overallScore: overallScore,
          summary: {
            total: overallStats.total,
            pass: overallStats.pass,
            fail: overallStats.fail,
            warn: overallStats.warn,
            skip: overallStats.skip,
            error: overallStats.error
          }
        };

        // Step 7: Save run to storage
        storage.saveRun(runData);
        VeriQ.state.lastRunTime = runData.timestamp;

        // Step 8: Update history page and dashboard history
        app.renderHistoryPage();

        // Optional push to Sheets if enabled
        const settings = storage.getSettings();
        if (settings.sheets?.enabled) {
          ui.toast('Syncing test results to Google Sheets...', 'info', 2000);
          storage.pushToGoogleSheets(runData).then(res => {
            if (res.success) {
              ui.toast('Saved results to Google Sheets!', 'success');
            }
          });
        }
        if (settings.github?.enabled) {
          storage.pushToGitHub(runData);
        }

        ui.setProgress(moduleIds.length, moduleIds.length, 'All tests completed!');
        reporter.updateStatus('Done', 'done');

        setTimeout(() => {
          ui.hideProgress();
          app.setRunning(false);
          ui.toast(`🎉 Suite finished in ${utils.formatTime(overallDuration)}! Overall Score: ${overallScore}%`, 'success', 5000);
        }, 500);

      } catch (err) {
        console.error('VeriQ: Critical error during runAll execution', err);
        app.setRunning(false);
        reporter.updateStatus('Error', 'error');
        ui.hideProgress();
      }
    },

    // -----------------------------------------------------------------------
    // UI Helpers (proxied to VeriQ.ui)
    // -----------------------------------------------------------------------

    showToast(msg, type, duration) {
      ui.toast(msg, type, duration);
    },

    showModal(title, body, actions) {
      ui.modal(title, body, actions);
    },

    closeModal() {
      ui.closeModal();
    },

    // -----------------------------------------------------------------------
    // Event Listeners Binding
    // -----------------------------------------------------------------------

    bindEvents() {
      // 1. URL Form Submit & Run All Button
      const urlForm = document.getElementById('form-url') || document.querySelector('form.url-form');
      if (urlForm) {
        urlForm.addEventListener('submit', (e) => {
          e.preventDefault();
          app.runAll();
        });
      }

      const runAllBtn = document.getElementById('btn-run-all');
      if (runAllBtn) {
        runAllBtn.addEventListener('click', (e) => {
          e.preventDefault();
          app.runAll();
        });
      }

      // 2. Module Run Buttons & Run Category Button
      const runCategoryBtn = document.getElementById('btn-run-category');
      if (runCategoryBtn) {
        runCategoryBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const curPage = app.getCurrentPage();
          if (curPage && (curPage.startsWith('0') || curPage.startsWith('10'))) {
            app.runModule(curPage);
          } else {
            app.runAll();
          }
        });
      }

      document.addEventListener('click', (e) => {
        const runModBtn = e.target.closest('[data-action="run-module"], [data-run-module], .btn-run-category');
        if (runModBtn && runModBtn !== runCategoryBtn) {
          e.preventDefault();
          const modId = runModBtn.getAttribute('data-module') || runModBtn.getAttribute('data-run-module');
          if (modId) {
            app.runModule(modId);
          }
        }
      });

      // 2b. Click Category Cards on Dashboard to navigate to that category
      document.addEventListener('click', (e) => {
        const catCard = e.target.closest('.category-card[data-module]');
        if (catCard && !e.target.closest('button, a')) {
          const modId = catCard.getAttribute('data-module');
          if (modId) {
            app.navigate(modId);
          }
        }
      });

      // 3. Navigation Links Delegation
      document.addEventListener('click', (e) => {
        const navLink = e.target.closest('[data-nav], .sidebar-link');
        if (navLink) {
          const target = navLink.getAttribute('data-nav') || navLink.getAttribute('href');
          if (target && !target.startsWith('http')) {
            e.preventDefault();
            app.navigate(target);

            // Close mobile sidebar if open
            document.body.classList.remove('sidebar-open');
          }
        }
      });

      // 3b. History search, sort, and export
      const histSearch = document.getElementById('history-search');
      if (histSearch) {
        histSearch.addEventListener('input', () => app.renderHistoryPage());
      }
      const histSort = document.getElementById('history-sort');
      if (histSort) {
        histSort.addEventListener('change', () => app.renderHistoryPage());
      }
      const histExportAll = document.getElementById('btn-export-history');
      if (histExportAll) {
        histExportAll.addEventListener('click', () => {
          storage.exportCsv();
          ui.toast('Exported history to CSV', 'info');
        });
      }

      // 4. Test Filter Buttons Delegation
      document.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('[data-filter]');
        if (filterBtn) {
          e.preventDefault();
          const filter = filterBtn.getAttribute('data-filter');
          const modId = filterBtn.getAttribute('data-module') ||
            filterBtn.closest('[data-page]')?.getAttribute('data-page') ||
            app.getCurrentPage();

          if (modId && filter) {
            reporter.filterTests(modId, filter);
          }
        }
      });

      // 5. Export JSON / CSV / HTML / Full Data
      const exportAllDataBtn = document.getElementById('btn-export-all');
      if (exportAllDataBtn) {
        exportAllDataBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const allData = {
            settings: storage.getSettings(),
            runs: storage.getRuns()
          };
          storage.exportJson(allData);
          ui.toast('Exported full database backup to JSON', 'info');
        });
      }

      const importDataBtn = document.getElementById('btn-import-data');
      const importInput = document.getElementById('import-file-input');
      if (importDataBtn && importInput) {
        importDataBtn.addEventListener('click', (e) => {
          e.preventDefault();
          importInput.click();
        });
        importInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (file) {
            const res = await storage.importJson(file);
            if (res.success) {
              ui.toast('Imported test data successfully!', 'success');
              app.renderHistoryPage();
              reporter.updateDashboard(VeriQ.state.lastResults || {});
            } else {
              ui.toast(`Import failed: ${res.message}`, 'error');
            }
          }
        });
      }

      const clearAllBtn = document.getElementById('btn-clear-all-data');
      if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const confirmed = await ui.confirm('Permanently reset all settings and wipe all test history?');
          if (confirmed) {
            storage.clearHistory();
            storage.resetSettings();
            app.applySettingsToForm();
            app.renderHistoryPage();
            reporter.updateDashboard({});
            ui.toast('All local data cleared and reset to defaults', 'info');
          }
        });
      }

      // 5. Export JSON / CSV / HTML
      document.addEventListener('click', (e) => {
        const exportJsonBtn = e.target.closest('#btn-export-json, [data-action="export-json"]');
        if (exportJsonBtn) {
          e.preventDefault();
          storage.exportJson();
          ui.toast('Exported results to JSON file', 'info');
          return;
        }

        const exportCsvBtn = e.target.closest('#btn-export-csv, [data-action="export-csv"]');
        if (exportCsvBtn) {
          e.preventDefault();
          storage.exportCsv();
          ui.toast('Exported results to CSV file', 'info');
          return;
        }

        const exportHtmlBtn = e.target.closest('#btn-export-html, [data-action="export-html"]');
        if (exportHtmlBtn) {
          e.preventDefault();
          const runs = storage.getRuns();
          if (runs.length > 0) {
            reporter.exportHtml(runs[0]);
            ui.toast('Generated standalone HTML report', 'info');
          } else {
            ui.toast('No test runs available to export', 'warning');
          }
          return;
        }
      });

      // 6. Clear History
      document.addEventListener('click', async (e) => {
        const clearBtn = e.target.closest('#btn-clear-history, [data-action="clear-history"]');
        if (clearBtn) {
          e.preventDefault();
          const confirmed = await ui.confirm('Are you sure you want to permanently clear all test run history?');
          if (confirmed) {
            storage.clearHistory();
            ui.toast('All test history cleared', 'info');
            app.renderHistoryPage();
          }
        }
      });

      // 7. Mobile Sidebar Toggle
      const hamburger = document.getElementById('btn-sidebar-toggle') || document.querySelector('.sidebar-toggle, .hamburger-menu');
      if (hamburger) {
        hamburger.addEventListener('click', (e) => {
          e.preventDefault();
          document.body.classList.toggle('sidebar-open');
        });
      }

      // 8. Settings Form Handlers
      const settingsForm = document.getElementById('settings-form') || document.getElementById('form-settings');
      if (settingsForm) {
        // Handle input changes
        settingsForm.addEventListener('change', () => {
          app.saveSettingsFromForm();
        });

        // Proxy selection toggles custom URL input visibility
        const proxyRadios = settingsForm.querySelectorAll('input[name="proxy"], select[name="proxy"]');
        proxyRadios.forEach(input => {
          input.addEventListener('change', () => {
            const val = input.value;
            const customGroup = document.getElementById('custom-proxy-group') || document.querySelector('.custom-proxy-group');
            if (customGroup) {
              customGroup.style.display = (val === 'custom') ? 'block' : 'none';
            }
          });
        });

        // GitHub / Sheets toggle switches
        const ghEnable = document.getElementById('setting-github-enabled');
        if (ghEnable) {
          ghEnable.addEventListener('change', () => {
            const sub = document.getElementById('github-settings-group');
            if (sub) sub.style.display = ghEnable.checked ? 'block' : 'none';
          });
        }

        const sheetsEnable = document.getElementById('setting-sheets-enabled');
        if (sheetsEnable) {
          sheetsEnable.addEventListener('change', () => {
            const sub = document.getElementById('sheets-settings-group');
            if (sub) sub.style.display = sheetsEnable.checked ? 'block' : 'none';
          });
        }
      }

      // 9. Integration Connection Test Buttons
      const testProxyBtn = document.getElementById('btn-test-proxy');
      if (testProxyBtn) {
        testProxyBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          ui.toast('Testing proxy connection...', 'info');
          const avail = await fetcher.checkAvailability('https://example.com');
          if (avail.available) {
            ui.toast(`Proxy reachable! HTTP ${avail.status} (${avail.time}ms)`, 'success');
          } else {
            ui.toast(`Proxy check failed: ${avail.error}`, 'error');
          }
        });
      }

      const testGhBtn = document.getElementById('btn-test-github');
      if (testGhBtn) {
        testGhBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const s = storage.getSettings();
          if (!s.github.token || !s.github.repo) {
            ui.toast('Please configure GitHub Token and Repo first', 'warning');
            return;
          }
          ui.toast('Testing GitHub connection...', 'info');
          try {
            const repoClean = s.github.repo.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
            const res = await fetch(`https://api.github.com/repos/${repoClean}`, {
              headers: {
                'Authorization': `Bearer ${s.github.token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            if (res.ok) {
              const data = await res.json();
              ui.toast(`Connected to repo: ${data.full_name}`, 'success');
            } else {
              ui.toast(`GitHub connection failed: HTTP ${res.status}`, 'error');
            }
          } catch (err) {
            ui.toast(`GitHub connection error: ${err.message}`, 'error');
          }
        });
      }
    },

    // -----------------------------------------------------------------------
    // Settings Form Sync
    // -----------------------------------------------------------------------

    /**
     * Reads values from settings form inputs and persists to storage
     */
    saveSettingsFromForm() {
      const form = document.getElementById('settings-form') || document.getElementById('form-settings');
      if (!form) return;

      const proxyEl = form.querySelector('input[name="proxy"]:checked, select[name="proxy"]');
      const customProxyEl = form.querySelector('[name="customProxyUrl"], #setting-custom-proxy');
      const timeoutEl = form.querySelector('[name="timeout"], #setting-timeout');
      const retriesEl = form.querySelector('[name="retries"], #setting-retries');
      const skipSlowEl = form.querySelector('[name="skipSlowTests"], #setting-skip-slow');

      const ghEnabledEl = form.querySelector('#setting-github-enabled, [name="github.enabled"]');
      const ghTokenEl = form.querySelector('#setting-github-token, [name="github.token"]');
      const ghRepoEl = form.querySelector('#setting-github-repo, [name="github.repo"]');
      const ghBranchEl = form.querySelector('#setting-github-branch, [name="github.branch"]');

      const sheetsEnabledEl = form.querySelector('#setting-sheets-enabled, [name="sheets.enabled"]');
      const sheetsIdEl = form.querySelector('#setting-sheets-id, [name="sheets.sheetId"]');
      const sheetsKeyEl = form.querySelector('#setting-sheets-key, [name="sheets.apiKey"]');
      const sheetsNameEl = form.querySelector('#setting-sheets-name, [name="sheets.sheetName"]');

      const updated = {
        proxy: proxyEl ? proxyEl.value : 'allorigins',
        customProxyUrl: customProxyEl ? customProxyEl.value : '',
        timeout: timeoutEl ? parseInt(timeoutEl.value, 10) : 15000,
        retries: retriesEl ? parseInt(retriesEl.value, 10) : 2,
        skipSlowTests: skipSlowEl ? skipSlowEl.checked : false,
        github: {
          enabled: ghEnabledEl ? ghEnabledEl.checked : false,
          token: ghTokenEl ? ghTokenEl.value.trim() : '',
          repo: ghRepoEl ? ghRepoEl.value.trim() : '',
          branch: ghBranchEl ? ghBranchEl.value.trim() : 'main'
        },
        sheets: {
          enabled: sheetsEnabledEl ? sheetsEnabledEl.checked : false,
          sheetId: sheetsIdEl ? sheetsIdEl.value.trim() : '',
          apiKey: sheetsKeyEl ? sheetsKeyEl.value.trim() : '',
          sheetName: sheetsNameEl ? sheetsNameEl.value.trim() : 'VeriQ Results'
        }
      };

      storage.saveSettings(updated);
    },

    /**
     * Applies stored settings into form elements
     */
    applySettingsToForm() {
      const s = storage.getSettings();
      const form = document.getElementById('settings-form') || document.getElementById('form-settings');
      if (!form) return;

      // Proxy radio/select
      const proxyRadio = form.querySelector(`input[name="proxy"][value="${s.proxy}"]`);
      if (proxyRadio) proxyRadio.checked = true;
      const proxySelect = form.querySelector('select[name="proxy"]');
      if (proxySelect) proxySelect.value = s.proxy;

      const customProxyEl = form.querySelector('[name="customProxyUrl"], #setting-custom-proxy');
      if (customProxyEl) customProxyEl.value = s.customProxyUrl || '';

      const customGroup = document.getElementById('custom-proxy-group') || document.querySelector('.custom-proxy-group');
      if (customGroup) {
        customGroup.style.display = (s.proxy === 'custom') ? 'block' : 'none';
      }

      // Timeouts & retries
      const timeoutEl = form.querySelector('[name="timeout"], #setting-timeout');
      if (timeoutEl) timeoutEl.value = s.timeout;
      const retriesEl = form.querySelector('[name="retries"], #setting-retries');
      if (retriesEl) retriesEl.value = s.retries;
      const skipSlowEl = form.querySelector('[name="skipSlowTests"], #setting-skip-slow');
      if (skipSlowEl) skipSlowEl.checked = Boolean(s.skipSlowTests);

      // GitHub
      const gh = s.github || {};
      const ghEnabledEl = form.querySelector('#setting-github-enabled, [name="github.enabled"]');
      if (ghEnabledEl) ghEnabledEl.checked = Boolean(gh.enabled);
      const ghTokenEl = form.querySelector('#setting-github-token, [name="github.token"]');
      if (ghTokenEl) ghTokenEl.value = gh.token || '';
      const ghRepoEl = form.querySelector('#setting-github-repo, [name="github.repo"]');
      if (ghRepoEl) ghRepoEl.value = gh.repo || '';
      const ghBranchEl = form.querySelector('#setting-github-branch, [name="github.branch"]');
      if (ghBranchEl) ghBranchEl.value = gh.branch || 'main';

      const ghGroup = document.getElementById('github-settings-group');
      if (ghGroup) ghGroup.style.display = gh.enabled ? 'block' : 'none';

      // Sheets
      const gs = s.sheets || {};
      const sheetsEnabledEl = form.querySelector('#setting-sheets-enabled, [name="sheets.enabled"]');
      if (sheetsEnabledEl) sheetsEnabledEl.checked = Boolean(gs.enabled);
      const sheetsIdEl = form.querySelector('#setting-sheets-id, [name="sheets.sheetId"]');
      if (sheetsIdEl) sheetsIdEl.value = gs.sheetId || '';
      const sheetsKeyEl = form.querySelector('#setting-sheets-key, [name="sheets.apiKey"]');
      if (sheetsKeyEl) sheetsKeyEl.value = gs.apiKey || '';
      const sheetsNameEl = form.querySelector('#setting-sheets-name, [name="sheets.sheetName"]');
      if (sheetsNameEl) sheetsNameEl.value = gs.sheetName || 'VeriQ Results';

      const gsGroup = document.getElementById('sheets-settings-group');
      if (gsGroup) gsGroup.style.display = gs.enabled ? 'block' : 'none';
    },

    /**
     * Renders test run history table in history page if container exists
     */
    renderHistoryPage() {
      const historyTable = document.getElementById('history-table');
      const historyTbody = document.getElementById('history-tbody') ||
        document.getElementById('history-table-body');
      const historyEmpty = document.getElementById('history-empty');

      if (!historyTbody) return;

      let runs = storage.getRuns() || [];

      // Check search input filter
      const searchInput = document.getElementById('history-search');
      const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      if (query) {
        runs = runs.filter(r => (r.url && r.url.toLowerCase().includes(query)) || (r.id && r.id.toLowerCase().includes(query)));
      }

      // Check sort select
      const sortSelect = document.getElementById('history-sort');
      const sortBy = sortSelect ? sortSelect.value : 'newest';
      if (sortBy === 'oldest') {
        runs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      } else if (sortBy === 'score-high') {
        runs.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
      } else if (sortBy === 'score-low') {
        runs.sort((a, b) => (a.overallScore || 0) - (b.overallScore || 0));
      } else {
        // default newest first
        runs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }

      if (runs.length === 0) {
        if (historyEmpty) historyEmpty.style.display = 'block';
        if (historyTable) historyTable.style.display = 'none';
        historyTbody.innerHTML = '';
        return;
      }

      if (historyEmpty) historyEmpty.style.display = 'none';
      if (historyTable) historyTable.style.display = 'table';

      let rowsHtml = '';
      for (const run of runs) {
        const dateStr = utils.formatDate(run.timestamp);
        const score = Math.round(run.overallScore || 0);
        const scoreColor = utils.scoreToColor(score);
        const grade = utils.scoreToGrade(score);
        const summary = run.summary || {};

        rowsHtml += `
          <tr data-run-id="${run.id}">
            <td><strong>${dateStr}</strong><br><small style="color: #64748B;">ID: ${run.id}</small></td>
            <td>
              <a href="${utils.escapeHtml(run.url)}" target="_blank" rel="noopener noreferrer" style="color: #3B82F6; font-weight: 600; text-decoration: none;">${utils.escapeHtml(run.url)}</a>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Duration: ${utils.formatTime(run.duration || 0)}</div>
            </td>
            <td>
              <span class="score-badge" style="background: ${scoreColor}18; color: ${scoreColor}; border: 1.5px solid ${scoreColor}40; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 13px;">
                ${score}% (${grade})
              </span>
            </td>
            <td>
              <span style="color: #10B981; font-weight: 600;">✓ ${summary.pass || 0}</span>
              <span style="color: #EF4444; font-weight: 600; margin-left: 6px;">✕ ${summary.fail || 0}</span>
              <span style="color: #F59E0B; font-weight: 600; margin-left: 6px;">⚠ ${summary.warn || 0}</span>
            </td>
            <td>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn btn-sm btn-inspect-run" data-id="${run.id}" title="Inspect in Dashboard" style="padding: 4px 8px; font-size: 12px; background: #2563EB; color: #fff; border-radius: 4px; border:none; cursor:pointer;">Inspect</button>
                <button class="btn btn-sm btn-retest-run" data-url="${utils.escapeHtml(run.url)}" title="Re-run all tests" style="padding: 4px 8px; font-size: 12px; background: #059669; color: #fff; border-radius: 4px; border:none; cursor:pointer;">Re-test</button>
                <button class="btn btn-sm btn-export-run" data-id="${run.id}" title="Export HTML report" style="padding: 4px 8px; font-size: 12px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor:pointer;">Report</button>
                <button class="btn btn-sm btn-delete-run" data-id="${run.id}" title="Delete run" style="padding: 4px 8px; font-size: 12px; background: #DC2626; color: #fff; border:none; border-radius: 4px; cursor:pointer;">✕</button>
              </div>
            </td>
          </tr>
        `;
      }

      historyTbody.innerHTML = rowsHtml;

      // Event delegation for history action buttons
      historyTbody.querySelectorAll('.btn-inspect-run').forEach(btn => {
        btn.addEventListener('click', () => {
          const runId = btn.getAttribute('data-id');
          const run = storage.getRunById(runId);
          if (run) {
            app.setUrl(run.url);
            VeriQ.state.lastResults = run.results || {};
            reporter.updateDashboard(run.results || {});
            app.navigate('dashboard');
            ui.toast(`Loaded results for ${run.url} from ${utils.formatDate(run.timestamp)}`, 'info');
          }
        });
      });

      historyTbody.querySelectorAll('.btn-retest-run').forEach(btn => {
        btn.addEventListener('click', () => {
          const runUrl = btn.getAttribute('data-url');
          if (runUrl) {
            app.setUrl(runUrl);
            app.runAll(runUrl);
          }
        });
      });

      historyTbody.querySelectorAll('.btn-export-run').forEach(btn => {
        btn.addEventListener('click', () => {
          const runId = btn.getAttribute('data-id');
          const run = storage.getRunById(runId);
          if (run) reporter.exportHtml(run);
        });
      });

      historyTbody.querySelectorAll('.btn-delete-run').forEach(btn => {
        btn.addEventListener('click', async () => {
          const runId = btn.getAttribute('data-id');
          const confirmed = await ui.confirm('Permanently delete this test run?');
          if (confirmed) {
            storage.deleteRun(runId);
            app.renderHistoryPage();
            reporter.updateDashboard(VeriQ.state.lastResults || {});
            ui.toast('Run deleted', 'info');
          }
        });
      });
    },

    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /**
     * Initializes the VeriQ engine on DOM ready
     */
    async init() {
      // 1. Apply stored settings to UI
      app.applySettingsToForm();

      // 2. Set up hash router
      window.addEventListener('hashchange', () => {
        app.handleHashChange();
      });

      // 3. Bind all UI and navigation events
      app.bindEvents();

      // 4. Initial route resolution
      app.handleHashChange();

      // 5. Restore most recent run data if present in history
      const runs = storage.getRuns();
      if (runs.length > 0) {
        const latest = runs[0];
        if (latest.url && !VeriQ.state.currentUrl) {
          app.setUrl(latest.url);
        }
        VeriQ.state.lastResults = latest.results || {};
        reporter.updateDashboard(latest.results || {});
      }

      // 6. Render history page if view exists
      app.renderHistoryPage();

      // 7. Initialize idle status
      reporter.updateStatus('Ready', 'idle');
    }
  };

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }
})();
