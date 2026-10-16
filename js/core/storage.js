/**
 * VeriQ - Website Testing Suite
 * Core Engine: Storage & External Integrations
 *
 * Handles:
 * - Local storage persistence for suite configuration & test history
 * - GitHub Contents API integration (saving run results directly to a repo)
 * - Google Sheets API v4 integration (appending run summary rows to spreadsheets)
 * - Exporting data to JSON and CSV formats
 * - Importing test history from JSON backup files
 */

window.VeriQ = window.VeriQ || {};
window.VeriQ.core = window.VeriQ.core || {};

VeriQ.core.storage = (function() {
  'use strict';

  const utils = VeriQ.core.utils;

  const STORAGE_KEYS = {
    SETTINGS: 'veriQ_settings',
    HISTORY: 'veriQ_history'
  };

  const DEFAULT_SETTINGS = {
    proxy: 'allorigins', // 'allorigins' | 'corsproxy' | 'direct' | 'custom'
    customProxyUrl: '',
    timeout: 15000,
    maxRedirects: 5,
    retries: 2,
    skipSlowTests: false,
    github: {
      enabled: false,
      token: '',
      repo: '',       // 'owner/repo' or 'https://github.com/owner/repo'
      branch: 'main'
    },
    sheets: {
      enabled: false,
      sheetId: '',
      apiKey: '',
      sheetName: 'VeriQ Results'
    }
  };

  // -------------------------------------------------------------------------
  // Helper: Unicode-safe Base64 Encoding
  // -------------------------------------------------------------------------
  function utf8ToBase64(str) {
    try {
      return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
    } catch (e) {
      return btoa(unescape(encodeURIComponent(str)));
    }
  }

  // -------------------------------------------------------------------------
  // Settings Management
  // -------------------------------------------------------------------------

  /**
   * Retrieves user settings merged with defaults
   * @returns {Object} Settings object
   */
  function getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return utils.deepClone(DEFAULT_SETTINGS);

      const parsed = JSON.parse(raw);
      return utils.mergeDeep(utils.deepClone(DEFAULT_SETTINGS), parsed);
    } catch (e) {
      console.warn('VeriQ.storage: Failed to parse settings from localStorage, resetting to defaults', e);
      return utils.deepClone(DEFAULT_SETTINGS);
    }
  }

  /**
   * Saves settings, merging with existing settings
   * @param {Object} newSettings
   * @returns {Object} Merged saved settings
   */
  function saveSettings(newSettings) {
    try {
      const current = getSettings();
      const merged = utils.mergeDeep(current, newSettings || {});
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('VeriQ.storage: Failed to save settings to localStorage', e);
      return getSettings();
    }
  }

  /**
   * Resets settings to factory defaults
   * @returns {Object} Default settings
   */
  function resetSettings() {
    try {
      const defaults = utils.deepClone(DEFAULT_SETTINGS);
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaults));
      return defaults;
    } catch (e) {
      console.error('VeriQ.storage: Failed to reset settings in localStorage', e);
      return utils.deepClone(DEFAULT_SETTINGS);
    }
  }

  // -------------------------------------------------------------------------
  // Run History Management (Max 50 Runs)
  // -------------------------------------------------------------------------

  /**
   * Retrieves all saved test runs sorted newest first
   * @returns {Array<Object>} Array of Run objects
   */
  function getRuns() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (!raw) return [];
      const runs = JSON.parse(raw);
      if (!Array.isArray(runs)) return [];

      // Sort newest first by timestamp
      return runs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
      console.warn('VeriQ.storage: Failed to read history from localStorage', e);
      return [];
    }
  }

  /**
   * Saves a new test run to history (maintains maximum 50 runs)
   * @param {Object} runData
   * @returns {Object} The saved run object
   */
  function saveRun(runData) {
    if (!runData || typeof runData !== 'object') {
      throw new Error('VeriQ.storage: Invalid runData passed to saveRun');
    }

    const runs = getRuns();

    const formattedRun = {
      id: runData.id || utils.generateId(),
      url: runData.url || '',
      timestamp: typeof runData.timestamp === 'number' ? runData.timestamp : Date.now(),
      duration: typeof runData.duration === 'number' ? runData.duration : 0,
      results: runData.results || {},
      overallScore: typeof runData.overallScore === 'number' ? runData.overallScore : 0,
      summary: {
        total: Number(runData.summary?.total || 0),
        pass: Number(runData.summary?.pass || 0),
        fail: Number(runData.summary?.fail || 0),
        warn: Number(runData.summary?.warn || 0),
        skip: Number(runData.summary?.skip || 0),
        error: Number(runData.summary?.error || 0)
      }
    };

    // Remove existing run with same id if already present
    const filtered = runs.filter(r => r.id !== formattedRun.id);

    // Prepend new run and keep up to 50
    filtered.unshift(formattedRun);
    const trimmed = filtered.slice(0, 50);

    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('VeriQ.storage: localStorage full, trimming oldest 10 runs', e);
      try {
        const smaller = trimmed.slice(0, 30);
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(smaller));
      } catch (err) {
        console.error('VeriQ.storage: Could not save run to localStorage', err);
      }
    }

    return formattedRun;
  }

  /**
   * Retrieves a specific run by ID
   * @param {string} id
   * @returns {Object|null}
   */
  function getRunById(id) {
    if (!id) return null;
    const runs = getRuns();
    return runs.find(r => r.id === id) || null;
  }

  /**
   * Deletes a run by ID
   * @param {string} id
   * @returns {Array<Object>} Updated runs
   */
  function deleteRun(id) {
    if (!id) return getRuns();
    const runs = getRuns();
    const updated = runs.filter(r => r.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('VeriQ.storage: Failed to delete run from localStorage', e);
    }
    return updated;
  }

  /**
   * Clears all test run history
   */
  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {
      console.error('VeriQ.storage: Failed to clear history', e);
    }
  }

  // -------------------------------------------------------------------------
  // GitHub Integration: Save Run as JSON to Repository
  // -------------------------------------------------------------------------

  /**
   * Parses repository owner and name from string (handles 'owner/repo' or GitHub URLs)
   * @param {string} repoStr
   * @returns {{owner: string, repo: string}|null}
   */
  function parseRepoString(repoStr) {
    if (!repoStr || typeof repoStr !== 'string') return null;
    const cleaned = repoStr.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  }

  /**
   * Push test results to configured GitHub repository via Contents API
   * Path: test-results/{date}-{id}.json
   * @param {Object} runData
   * @returns {Promise<{success: boolean, message: string, url?: string, data?: any}>}
   */
  async function pushToGitHub(runData) {
    const settings = getSettings();
    const gh = settings.github || {};

    if (!gh.enabled) {
      return { success: false, message: 'GitHub integration is disabled in settings' };
    }

    if (!gh.token) {
      return { success: false, message: 'GitHub Personal Access Token is missing' };
    }

    const repoInfo = parseRepoString(gh.repo);
    if (!repoInfo) {
      return { success: false, message: 'Invalid GitHub repository format. Use "owner/repo"' };
    }

    const branch = gh.branch || 'main';
    const dateStr = new Date(runData.timestamp || Date.now()).toISOString().split('T')[0];
    const fileName = `${dateStr}-${runData.id}.json`;
    const filePath = `test-results/${fileName}`;
    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${filePath}`;

    const contentJson = JSON.stringify(runData, null, 2);
    const contentBase64 = utf8ToBase64(contentJson);

    try {
      // 1. Check if file already exists to get its SHA (for update)
      let sha = null;
      try {
        const checkRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
          headers: {
            'Authorization': `Bearer ${gh.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (checkRes.ok) {
          const checkJson = await checkRes.json();
          sha = checkJson.sha;
        }
      } catch (checkErr) {
        // File doesn't exist yet, proceed with create
      }

      // 2. Commit file via PUT request
      const commitBody = {
        message: `VeriQ test results for ${runData.url} [${runData.id}]`,
        content: contentBase64,
        branch: branch
      };

      if (sha) {
        commitBody.sha = sha;
      }

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${gh.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commitBody)
      });

      const resData = await response.json();

      if (!response.ok) {
        const errorMsg = resData.message || response.statusText;
        return {
          success: false,
          message: `GitHub API error: ${errorMsg}`
        };
      }

      const fileUrl = resData.content?.html_url || `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${branch}/${filePath}`;
      return {
        success: true,
        message: `Successfully pushed to GitHub: ${filePath}`,
        url: fileUrl,
        data: resData
      };
    } catch (e) {
      return {
        success: false,
        message: `Network error connecting to GitHub: ${e.message}`
      };
    }
  }

  // -------------------------------------------------------------------------
  // Google Sheets Integration: Append Row to Spreadsheet
  // -------------------------------------------------------------------------

  /**
   * Appends test run summary row to Google Sheet using Sheets API v4
   * @param {Object} runData
   * @returns {Promise<{success: boolean, message: string, data?: any}>}
   */
  async function pushToGoogleSheets(runData) {
    const settings = getSettings();
    const gs = settings.sheets || {};

    if (!gs.enabled) {
      return { success: false, message: 'Google Sheets integration is disabled in settings' };
    }

    if (!gs.sheetId) {
      return { success: false, message: 'Google Sheet ID is missing' };
    }

    if (!gs.apiKey) {
      return { success: false, message: 'Google API Key is missing' };
    }

    const sheetName = gs.sheetName || 'VeriQ Results';
    const range = encodeURIComponent(`${sheetName}!A:I`);
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${gs.sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${encodeURIComponent(gs.apiKey)}`;

    const durationStr = runData.duration
      ? `${(runData.duration / 1000).toFixed(2)}s`
      : '0s';

    const rowValues = [
      new Date(runData.timestamp || Date.now()).toLocaleString(),
      runData.url || '',
      runData.overallScore !== undefined ? runData.overallScore : 0,
      runData.summary?.total || 0,
      runData.summary?.pass || 0,
      runData.summary?.fail || 0,
      runData.summary?.warn || 0,
      durationStr,
      runData.id || ''
    ];

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        const errorMsg = resData.error?.message || response.statusText;
        return {
          success: false,
          message: `Google Sheets API error: ${errorMsg}`
        };
      }

      return {
        success: true,
        message: `Successfully appended row to Google Sheet "${sheetName}"`,
        data: resData
      };
    } catch (e) {
      return {
        success: false,
        message: `Network error connecting to Google Sheets: ${e.message}`
      };
    }
  }

  // -------------------------------------------------------------------------
  // Import / Export Utilities
  // -------------------------------------------------------------------------

  /**
   * Helper to trigger browser download of a generated file
   * @param {string} content
   * @param {string} filename
   * @param {string} mimeType
   */
  function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  /**
   * Exports data object or runs history as downloadable JSON file
   * @param {*} [data] - Data to export (defaults to current runs history)
   * @param {string} [filename]
   */
  function exportJson(data, filename) {
    const exportData = data !== undefined ? data : getRuns();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const name = filename || `veriQ-results-${dateStr}.json`;
    const jsonStr = JSON.stringify(exportData, null, 2);
    triggerDownload(jsonStr, name, 'application/json');
  }

  /**
   * Exports runs history as downloadable CSV file
   * @param {Array<Object>} [runs] - Runs to export (defaults to current runs)
   * @param {string} [filename]
   */
  function exportCsv(runs, filename) {
    const runList = Array.isArray(runs) ? runs : getRuns();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const name = filename || `veriQ-history-${dateStr}.csv`;

    const headers = [
      'ID',
      'Date',
      'URL',
      'Overall Score',
      'Grade',
      'Total Tests',
      'Pass',
      'Fail',
      'Warn',
      'Skip',
      'Error',
      'Duration (ms)'
    ];

    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '""';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const rows = [headers.map(escapeCsvField).join(',')];

    for (const run of runList) {
      const row = [
        run.id,
        new Date(run.timestamp).toLocaleString(),
        run.url,
        run.overallScore,
        utils.scoreToGrade(run.overallScore),
        run.summary?.total || 0,
        run.summary?.pass || 0,
        run.summary?.fail || 0,
        run.summary?.warn || 0,
        run.summary?.skip || 0,
        run.summary?.error || 0,
        run.duration || 0
      ];
      rows.push(row.map(escapeCsvField).join(','));
    }

    const csvContent = '\uFEFF' + rows.join('\r\n'); // Add UTF-8 BOM for Excel compatibility
    triggerDownload(csvContent, name, 'text/csv;charset=utf-8;');
  }

  /**
   * Imports JSON file containing single run or array of runs into history
   * @param {File|string} fileOrJson - File instance from input[type=file] or raw JSON string
   * @returns {Promise<{success: boolean, count: number, message: string}>}
   */
  async function importJson(fileOrJson) {
    let jsonText = '';

    if (typeof fileOrJson === 'string') {
      jsonText = fileOrJson;
    } else if (fileOrJson instanceof File || fileOrJson instanceof Blob) {
      jsonText = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file contents'));
        reader.readAsText(fileOrJson);
      });
    } else {
      return { success: false, count: 0, message: 'Invalid input provided for import' };
    }

    try {
      const parsed = JSON.parse(jsonText);
      const incomingRuns = Array.isArray(parsed) ? parsed : [parsed];

      let importedCount = 0;
      for (const run of incomingRuns) {
        if (run && typeof run === 'object' && run.url) {
          saveRun(run);
          importedCount++;
        }
      }

      if (importedCount === 0) {
        return {
          success: false,
          count: 0,
          message: 'No valid VeriQ run objects found in JSON file'
        };
      }

      return {
        success: true,
        count: importedCount,
        message: `Successfully imported ${importedCount} test ${importedCount === 1 ? 'run' : 'runs'}`
      };
    } catch (e) {
      return {
        success: false,
        count: 0,
        message: `JSON parse error: ${e.message}`
      };
    }
  }

  // -------------------------------------------------------------------------
  // Public API Export
  // -------------------------------------------------------------------------
  return {
    getSettings,
    saveSettings,
    resetSettings,
    saveRun,
    getRuns,
    getRunById,
    deleteRun,
    clearHistory,
    pushToGitHub,
    pushToGoogleSheets,
    exportJson,
    exportCsv,
    importJson
  };
})();
