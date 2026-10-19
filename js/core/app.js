// VeriQ 2.0 - Core Application Controller
(function() {
  const VeriQ = window.VeriQ;

  const App = {
    currentTool: null,
    activeCategory: 'all',
    activeMode: 'all',
    searchQuery: '',

    async init() {
      console.log('🛡️ Initializing VeriQ 2.0 Testing Tools Suite...');

      // Check backend status
      this.checkBackend();
      setInterval(() => this.checkBackend(), 15000);

      // Setup router
      window.addEventListener('hashchange', () => this.handleRoute());
      this.bindEvents();

      // Initial route
      if (!window.location.hash) {
        window.location.hash = '#catalog';
      } else {
        this.handleRoute();
      }
    },

    async checkBackend() {
      const statusPill = document.getElementById('backend-status-pill');
      if (!statusPill) return;

      const health = await VeriQ.backend.checkHealth();
      if (health.online) {
        statusPill.className = 'backend-pill pill-online';
        statusPill.innerHTML = '🟢 Backend Online (v2.0)';
        statusPill.title = `Connected to ${VeriQ.backend.baseUrl}`;
      } else {
        statusPill.className = 'backend-pill pill-offline';
        statusPill.innerHTML = '🟡 Client Mode (Offline Backend)';
        statusPill.title = `Backend at ${VeriQ.backend.baseUrl} is unreachable. Native tools will run in browser.`;
      }
    },

    handleRoute() {
      const hash = window.location.hash.slice(1) || 'catalog';

      // Hide all main pages
      document.querySelectorAll('.main-view').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));

      if (hash === 'catalog' || hash.startsWith('category-')) {
        const cat = hash.startsWith('category-') ? hash.replace('category-', '').toUpperCase() : 'all';
        this.activeCategory = cat;
        this.showCatalog();
      } else if (hash.startsWith('tool-')) {
        const toolIdOrNum = hash.replace('tool-', '');
        this.showToolWorkspace(toolIdOrNum);
      } else if (hash === 'history') {
        this.showHistory();
      } else if (hash === 'settings') {
        this.showSettings();
      } else {
        this.showCatalog();
      }
    },

    showCatalog() {
      const catalogView = document.getElementById('view-catalog');
      if (catalogView) catalogView.style.display = 'block';

      // Update sidebar
      const navLink = document.querySelector(`.sidebar-nav a[href="#${this.activeCategory === 'all' ? 'catalog' : 'category-' + this.activeCategory.toLowerCase()}"]`);
      if (navLink) navLink.classList.add('active');

      this.renderCatalogGrid();
    },

    renderCatalogGrid() {
      const grid = document.getElementById('tools-catalog-grid');
      const countEl = document.getElementById('catalog-results-count');
      if (!grid) return;

      const filtered = VeriQ.searchTools(this.searchQuery, this.activeCategory, this.activeMode);
      if (countEl) countEl.textContent = `Showing ${filtered.length} of 148 Tools`;

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="empty-catalog">
            <div class="empty-icon">🔍</div>
            <h3>No matching tools found</h3>
            <p>Try clearing your search query or selecting "All Categories".</p>
            <button class="btn btn-secondary" onclick="VeriQ.app.resetFilters()">Clear Filters</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(t => {
        const isServer = t.executionMode === 'server';
        const numPadded = String(t.num).padStart(3, '0');
        return `
          <div class="tool-card" onclick="window.location.hash='#tool-${t.num}'">
            <div class="tool-card-header">
              <span class="tool-num-badge">#${numPadded}</span>
              <span class="tool-mode-pill ${isServer ? 'mode-server' : 'mode-client'}">
                ${isServer ? '🖥️ Backend' : '⚡ Browser'}
              </span>
            </div>
            <div class="tool-card-body">
              <div class="tool-card-title">
                <span class="tool-icon">${t.icon || '🔧'}</span>
                <h3>${t.name}</h3>
              </div>
              <p class="tool-card-desc">${t.purpose}</p>
            </div>
            <div class="tool-card-footer">
              <span class="tool-cat-pill cat-${t.category.toLowerCase()}">Cat ${t.category}: ${t.categoryName}</span>
              <span class="tool-launch-arrow">Open Tool ➔</span>
            </div>
          </div>
        `;
      }).join('');
    },

    showToolWorkspace(toolIdentifier) {
      const tool = VeriQ.getToolByNum(toolIdentifier) || VeriQ.getToolById(toolIdentifier);
      if (!tool) {
        window.location.hash = '#catalog';
        return;
      }

      this.currentTool = tool;
      const workspaceView = document.getElementById('view-tool-workspace');
      if (!workspaceView) return;
      workspaceView.style.display = 'block';

      // Update active navigation
      const navLink = document.querySelector(`.sidebar-nav a[href="#category-${tool.category.toLowerCase()}"]`);
      if (navLink) navLink.classList.add('active');

      // Populate Header
      document.getElementById('ws-tool-num').textContent = `#${String(tool.num).padStart(3, '0')}`;
      document.getElementById('ws-tool-icon').textContent = tool.icon || '🔧';
      document.getElementById('ws-tool-name').textContent = tool.name;
      document.getElementById('ws-tool-purpose').textContent = tool.purpose;
      document.getElementById('ws-tool-category').textContent = `Category ${tool.category}: ${tool.categoryName}`;
      
      const modePill = document.getElementById('ws-tool-mode');
      const isServer = tool.executionMode === 'server';
      modePill.className = `tool-mode-pill ${isServer ? 'mode-server' : 'mode-client'}`;
      modePill.textContent = isServer ? '🖥️ Backend Accelerated' : '⚡ Browser Native';

      // Breadcrumbs
      document.getElementById('ws-breadcrumb-cat').textContent = `Category ${tool.category}`;
      document.getElementById('ws-breadcrumb-cat').href = `#category-${tool.category.toLowerCase()}`;
      document.getElementById('ws-breadcrumb-tool').textContent = tool.name;

      // Render Dynamic Inputs
      this.renderToolForm(tool);

      // Reset Results Area to Ready state
      this.resetResultsArea(tool);
    },

    renderToolForm(tool) {
      const formContainer = document.getElementById('ws-form-fields');
      if (!formContainer) return;

      formContainer.innerHTML = tool.inputs.map(inp => {
        let fieldHtml = '';
        const val = inp.default !== undefined ? inp.default : '';

        if (inp.type === 'code' || inp.type === 'textarea') {
          fieldHtml = `
            <textarea id="input-${inp.id}" class="form-code-area" rows="${inp.type === 'code' ? 6 : 4}" placeholder="${inp.placeholder || ''}">${val}</textarea>
          `;
        } else if (inp.type === 'select') {
          fieldHtml = `
            <select id="input-${inp.id}" class="form-select">
              ${(inp.options || []).map(opt => `<option value="${opt}" ${opt === val ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          `;
        } else if (inp.type === 'slider') {
          fieldHtml = `
            <div class="slider-wrapper">
              <input type="range" id="input-${inp.id}" class="form-range" min="${inp.min || 1}" max="${inp.max || 100}" value="${val}" oninput="document.getElementById('val-${inp.id}').textContent = this.value">
              <span id="val-${inp.id}" class="range-val-badge">${val}</span>
            </div>
          `;
        } else if (inp.type === 'checkbox') {
          fieldHtml = `
            <label class="toggle-control">
              <input type="checkbox" id="input-${inp.id}" ${val ? 'checked' : ''}>
              <span class="toggle-slider"></span>
              <span class="toggle-text">${inp.label}</span>
            </label>
          `;
        } else {
          fieldHtml = `
            <input type="${inp.type || 'text'}" id="input-${inp.id}" class="form-input" value="${val}" placeholder="${inp.placeholder || ''}">
          `;
        }

        return `
          <div class="form-group ${inp.type === 'checkbox' ? 'form-group-toggle' : ''}">
            ${inp.type !== 'checkbox' ? `<label class="form-label" for="input-${inp.id}">${inp.label}</label>` : ''}
            ${fieldHtml}
          </div>
        `;
      }).join('');
    },

    resetResultsArea(tool) {
      const resultsContainer = document.getElementById('ws-results-container');
      if (!resultsContainer) return;

      resultsContainer.innerHTML = `
        <div class="results-idle-state">
          <div class="radar-box">
            <div class="radar-circle"></div>
            <div class="radar-sweep"></div>
            <span class="radar-icon">${tool.icon || '🧪'}</span>
          </div>
          <h3>Ready to Test</h3>
          <p>Configure the test inputs on the left or click <strong>✨ Load Sample Data</strong>, then press <strong>🚀 Run Test</strong>.</p>
        </div>
      `;
    },

    loadSampleData() {
      if (!this.currentTool || !this.currentTool.sampleData) return;
      const sample = this.currentTool.sampleData;
      this.currentTool.inputs.forEach(inp => {
        const el = document.getElementById(`input-${inp.id}`);
        if (!el) return;
        if (sample[inp.id] !== undefined) {
          if (inp.type === 'checkbox') {
            el.checked = !!sample[inp.id];
          } else {
            el.value = sample[inp.id];
          }
          const badge = document.getElementById(`val-${inp.id}`);
          if (badge) badge.textContent = sample[inp.id];
        }
      });
      this.showToast('✨ Loaded sample test data!', 'info');
    },

    resetForm() {
      if (!this.currentTool) return;
      this.renderToolForm(this.currentTool);
      this.resetResultsArea(this.currentTool);
      this.showToast('Form reset to defaults.', 'info');
    },

    collectInputs() {
      if (!this.currentTool) return {};
      const collected = {};
      this.currentTool.inputs.forEach(inp => {
        const el = document.getElementById(`input-${inp.id}`);
        if (!el) return;
        if (inp.type === 'checkbox') {
          collected[inp.id] = el.checked;
        } else if (inp.type === 'number' || inp.type === 'slider') {
          collected[inp.id] = Number(el.value);
        } else {
          collected[inp.id] = el.value;
        }
      });
      return collected;
    },

    async runCurrentTool() {
      if (!this.currentTool) return;
      const tool = this.currentTool;
      const inputs = this.collectInputs();

      const btnRun = document.getElementById('btn-run-tool');
      if (btnRun) {
        btnRun.disabled = true;
        btnRun.innerHTML = '⏳ Running Test...';
      }

      const resultsContainer = document.getElementById('ws-results-container');
      resultsContainer.innerHTML = `
        <div class="results-running-state">
          <div class="radar-box active-scanning">
            <div class="radar-circle"></div>
            <div class="radar-sweep active-sweep"></div>
            <span class="radar-icon">⚡</span>
          </div>
          <h3>Executing Tool #${tool.num}...</h3>
          <p class="running-status-text">Analyzing parameters and running deterministic verification...</p>
        </div>
      `;

      const startTime = performance.now();
      try {
        const result = await tool.execute(inputs, VeriQ.backend);
        const duration = Math.round(performance.now() - startTime);

        this.renderResults(tool, result, duration);
        this.saveHistoryRecord(tool, result, duration);
      } catch (err) {
        resultsContainer.innerHTML = `
          <div class="results-card card-fail">
            <div class="res-status-banner status-fail">
              <span class="res-icon">💥</span>
              <div>
                <h3>Execution Error</h3>
                <p>${err.message}</p>
              </div>
            </div>
            <div class="res-body">
              <pre class="res-code-box">${err.stack || err.message}</pre>
            </div>
          </div>
        `;
      } finally {
        if (btnRun) {
          btnRun.disabled = false;
          btnRun.innerHTML = '🚀 Run Test';
        }
      }
    },

    renderResults(tool, result, duration) {
      const resultsContainer = document.getElementById('ws-results-container');
      if (!resultsContainer) return;

      const isPass = result.status === 'pass';
      const isWarn = result.status === 'warn';
      const isFail = result.status === 'fail';

      const statusBadgeClass = isPass ? 'badge-pass' : (isWarn ? 'badge-warn' : (isFail ? 'badge-fail' : 'badge-info'));
      const statusIcon = isPass ? '✅' : (isWarn ? '⚠️' : (isFail ? '❌' : 'ℹ️'));

      // Metrics cards
      const metricsHtml = (result.metrics || []).map(m => `
        <div class="metric-card">
          <span class="metric-label">${m.label}</span>
          <span class="metric-value">${m.value}</span>
        </div>
      `).join('');

      // Details rendering (tables, lists, code, text)
      const detailsHtml = (result.details || []).map(d => {
        if (d.type === 'table') {
          return `
            <div class="detail-block">
              <h4>${d.label}</h4>
              <div class="table-responsive">
                <table class="data-table">
                  <thead><tr>${d.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                  <tbody>${d.rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
              </div>
            </div>
          `;
        } else if (d.type === 'list') {
          return `
            <div class="detail-block">
              <h4>${d.label}</h4>
              <ul class="detail-list">${d.value.map(v => `<li>${v}</li>`).join('')}</ul>
            </div>
          `;
        } else if (d.type === 'code') {
          return `
            <div class="detail-block">
              <h4>${d.label}</h4>
              <pre class="res-code-box">${d.value}</pre>
            </div>
          `;
        } else {
          return `
            <div class="detail-block">
              <h4>${d.label}</h4>
              <p>${d.value}</p>
            </div>
          `;
        }
      }).join('');

      // Recommendations
      const recsHtml = (result.recommendations && result.recommendations.length > 0) ? `
        <div class="recommendations-box">
          <h4>💡 Recommended Actions</h4>
          <ul>
            ${result.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : '';

      resultsContainer.innerHTML = `
        <div class="results-card card-${result.status}">
          <div class="res-header">
            <div class="res-status-group">
              <span class="res-badge ${statusBadgeClass}">${statusIcon} ${result.status.toUpperCase()}</span>
              <span class="res-score-circle ${result.score >= 80 ? 'score-high' : (result.score >= 50 ? 'score-mid' : 'score-low')}">
                ${result.score}%
              </span>
            </div>
            <div class="res-timing">Duration: ${duration}ms</div>
          </div>

          <div class="res-summary-box">
            <p>${result.summary}</p>
          </div>

          ${metricsHtml ? `<div class="metrics-grid">${metricsHtml}</div>` : ''}

          ${detailsHtml}

          ${recsHtml}

          <div class="res-footer-actions">
            <button class="btn btn-sm btn-secondary" onclick="VeriQ.app.exportResultJson()">📥 Export JSON</button>
            <button class="btn btn-sm btn-secondary" onclick="VeriQ.app.copyShareLink()">🔗 Copy Link</button>
          </div>
        </div>
      `;
    },

    saveHistoryRecord(tool, result, duration) {
      const records = JSON.parse(localStorage.getItem('veriq_tool_history') || '[]');
      records.unshift({
        id: Date.now(),
        toolNum: tool.num,
        toolName: tool.name,
        category: tool.category,
        status: result.status,
        score: result.score,
        duration,
        timestamp: new Date().toLocaleTimeString()
      });
      // Keep latest 50
      if (records.length > 50) records.pop();
      localStorage.setItem('veriq_tool_history', JSON.stringify(records));
    },

    showHistory() {
      const historyView = document.getElementById('view-history');
      if (!historyView) return;
      historyView.style.display = 'block';

      const navLink = document.querySelector('.sidebar-nav a[href="#history"]');
      if (navLink) navLink.classList.add('active');

      const tbody = document.getElementById('history-tbody');
      const emptyState = document.getElementById('history-empty-state');
      const table = document.getElementById('history-table');

      const records = JSON.parse(localStorage.getItem('veriq_tool_history') || '[]');
      if (records.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (table) table.style.display = 'none';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      if (table) table.style.display = 'table';

      tbody.innerHTML = records.map(r => `
        <tr>
          <td>${r.timestamp}</td>
          <td><strong>#${String(r.toolNum).padStart(3, '0')}</strong>: ${r.toolName}</td>
          <td><span class="tool-cat-pill cat-${r.category.toLowerCase()}">Cat ${r.category}</span></td>
          <td><span class="res-badge badge-${r.status}">${r.status.toUpperCase()}</span></td>
          <td><strong>${r.score}%</strong></td>
          <td>${r.duration}ms</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="window.location.hash='#tool-${r.toolNum}'">Open Tool</button>
          </td>
        </tr>
      `).join('');
    },

    clearHistory() {
      localStorage.removeItem('veriq_tool_history');
      this.showHistory();
      this.showToast('Test execution history cleared.', 'info');
    },

    showSettings() {
      const settingsView = document.getElementById('view-settings');
      if (!settingsView) return;
      settingsView.style.display = 'block';

      const navLink = document.querySelector('.sidebar-nav a[href="#settings"]');
      if (navLink) navLink.classList.add('active');

      const inputUrl = document.getElementById('settings-backend-url');
      if (inputUrl) inputUrl.value = VeriQ.backend.baseUrl;
    },

    async saveSettings() {
      const inputUrl = document.getElementById('settings-backend-url');
      if (inputUrl) {
        await VeriQ.backend.setBaseUrl(inputUrl.value.trim());
        this.checkBackend();
        this.showToast('Settings saved. Backend connection updated.', 'pass');
      }
    },

    resetFilters() {
      this.searchQuery = '';
      this.activeCategory = 'all';
      this.activeMode = 'all';

      const searchInput = document.getElementById('global-search-input');
      if (searchInput) searchInput.value = '';

      document.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
      document.querySelectorAll('.mode-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'all'));

      this.renderCatalogGrid();
    },

    exportResultJson() {
      if (!this.currentTool) return;
      const data = {
        tool: { num: this.currentTool.num, name: this.currentTool.name, category: this.currentTool.category },
        inputs: this.collectInputs(),
        timestamp: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `veriq-tool-${this.currentTool.num}-result.json`;
      a.click();
    },

    copyShareLink() {
      navigator.clipboard.writeText(window.location.href);
      this.showToast('Link copied to clipboard!', 'info');
    },

    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `<span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    bindEvents() {
      // Global Search input
      const searchInput = document.getElementById('global-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value;
          if (window.location.hash !== '#catalog' && !window.location.hash.startsWith('#category-')) {
            window.location.hash = '#catalog';
          }
          this.renderCatalogGrid();
        });
      }

      // Category tabs in Catalog view
      document.querySelectorAll('.cat-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeCategory = btn.dataset.cat;
          this.renderCatalogGrid();
        });
      });

      // Mode filter pills in Catalog view
      document.querySelectorAll('.mode-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.mode-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeMode = btn.dataset.mode;
          this.renderCatalogGrid();
        });
      });
    }
  };

  VeriQ.app = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
