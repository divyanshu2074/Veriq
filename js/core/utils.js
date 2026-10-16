/**
 * VeriQ - Website Testing Suite
 * Core Engine: Global Namespace & Utility Functions
 *
 * This file must be loaded first. It defines the global window.VeriQ namespace
 * and provides comprehensive utilities for URLs, strings, formatting, colors,
 * DOM manipulation, HTTP headers, and HTML element extraction.
 */

// Initialize global VeriQ namespace
window.VeriQ = window.VeriQ || {
  version: '1.0.0',
  modules: {},  // populated by each module file
  core: {},     // populated by core files
  state: {
    currentPage: 'dashboard',
    currentUrl: '',
    isRunning: false,
    lastResults: {},    // moduleId -> results[]
    lastRunTime: null,
  },
  ui: {}        // UI helpers
};

VeriQ.core.utils = (function() {
  'use strict';

  // -------------------------------------------------------------------------
  // URL Utilities
  // -------------------------------------------------------------------------

  /**
   * Check if a given string is a valid HTTP/HTTPS URL
   * @param {string} url - URL string to validate
   * @returns {boolean}
   */
  function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;

    try {
      // Prepend https:// if protocol is missing to validate hostname structure
      const urlToTest = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

      const parsed = new URL(urlToTest);
      const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      const hasHost = Boolean(parsed.hostname) && (
        parsed.hostname === 'localhost' ||
        parsed.hostname.includes('.') ||
        /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)
      );

      return isHttp && hasHost;
    } catch (e) {
      return false;
    }
  }

  /**
   * Normalizes a URL: ensures https:// by default, removes trailing slash if path is empty,
   * collapses duplicate slashes in pathname, and normalizes hostname to lowercase.
   * @param {string} url - URL to normalize
   * @returns {string} Normalized URL
   */
  function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let trimmed = url.trim();

    // Ensure protocol
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//i.test(trimmed)) {
      if (trimmed.startsWith('//')) {
        trimmed = 'https:' + trimmed;
      } else {
        trimmed = 'https://' + trimmed;
      }
    }

    try {
      const parsed = new URL(trimmed);
      parsed.hostname = parsed.hostname.toLowerCase();

      // Clean trailing slash for root paths: https://example.com/ -> https://example.com
      if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
        return parsed.origin;
      }

      // Clean trailing slash for directory paths: https://example.com/blog/ -> https://example.com/blog
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      parsed.pathname = pathname;

      return parsed.href;
    } catch (e) {
      return trimmed;
    }
  }

  /**
   * Extract the domain (hostname) from a URL
   * @param {string} url - 'https://sub.example.com/path' -> 'sub.example.com'
   * @returns {string} Hostname
   */
  function extractDomain(url) {
    if (!url) return '';
    try {
      const normalized = normalizeUrl(url);
      const parsed = new URL(normalized);
      return parsed.hostname;
    } catch (e) {
      return '';
    }
  }

  /**
   * Extract the origin (protocol + host + port) from a URL
   * @param {string} url - 'https://example.com:8080/path' -> 'https://example.com:8080'
   * @returns {string} Origin
   */
  function extractOrigin(url) {
    if (!url) return '';
    try {
      const normalized = normalizeUrl(url);
      const parsed = new URL(normalized);
      return parsed.origin;
    } catch (e) {
      return '';
    }
  }

  /**
   * Extract the base path / origin from a URL
   * @param {string} url - 'https://example.com/blog/post' -> 'https://example.com'
   * @returns {string} Base path
   */
  function extractBasePath(url) {
    return extractOrigin(url);
  }

  /**
   * Converts a relative or absolute href into an absolute URL string based on a base URL
   * @param {string} href - Relative or absolute link
   * @param {string} base - Base URL
   * @returns {string} Absolute URL
   */
  function makeAbsolute(href, base) {
    if (!href || typeof href !== 'string') return '';
    const trimmedHref = href.trim();

    // Skip special non-HTTP links
    if (/^(javascript:|mailto:|tel:|data:|#)/i.test(trimmedHref)) {
      return trimmedHref;
    }

    try {
      const normalizedBase = normalizeUrl(base || window.location.href);
      return new URL(trimmedHref, normalizedBase).href;
    } catch (e) {
      return trimmedHref;
    }
  }

  /**
   * Check if two URLs belong to the same domain / hostname
   * @param {string} url1
   * @param {string} url2
   * @returns {boolean}
   */
  function isSameDomain(url1, url2) {
    const domain1 = extractDomain(url1);
    const domain2 = extractDomain(url2);
    if (!domain1 || !domain2) return false;
    return domain1.toLowerCase() === domain2.toLowerCase();
  }

  // -------------------------------------------------------------------------
  // String Utilities
  // -------------------------------------------------------------------------

  /**
   * Truncates a string to maxLen and appends '...' if it exceeds length
   * @param {string} str
   * @param {number} maxLen
   * @returns {string}
   */
  function truncate(str, maxLen = 50) {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLen) return str;
    if (maxLen <= 3) return str.slice(0, maxLen);
    return str.slice(0, maxLen - 3) + '...';
  }

  /**
   * Escapes HTML special characters: <, >, &, ", '
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Removes HTML tags from a string
   * @param {string} str
   * @returns {string}
   */
  function stripHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Converts a string into a URL-friendly slug
   * @param {string} str - 'Hello World' -> 'hello-world'
   * @returns {string}
   */
  function slugify(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')     // remove non-alphanumeric except hyphen and space
      .replace(/[\s_-]+/g, '-')     // collapse whitespace/underscores to hyphen
      .replace(/^-+|-+$/g, '');     // trim leading/trailing hyphens
  }

  // -------------------------------------------------------------------------
  // Format Utilities
  // -------------------------------------------------------------------------

  /**
   * Formats a byte size into human readable string
   * @param {number} bytes
   * @returns {string} '0 B', '1.2 KB', '4.5 MB', etc.
   */
  function formatBytes(bytes) {
    if (bytes === null || bytes === undefined || isNaN(bytes) || bytes <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const unitIndex = Math.min(i, units.length - 1);
    const value = bytes / Math.pow(1024, unitIndex);

    // Format with up to 1-2 decimal places without trailing zeros
    const formatted = unitIndex === 0
      ? value.toString()
      : value >= 100
        ? value.toFixed(0)
        : value.toFixed(1).replace(/\.0$/, '');

    return `${formatted} ${units[unitIndex]}`;
  }

  /**
   * Formats milliseconds into human-readable duration
   * @param {number} ms
   * @returns {string} '0ms', '350ms', '1.23s', '2m 14s'
   */
  function formatTime(ms) {
    if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return '0ms';
    const num = Number(ms);

    if (num < 1000) {
      return `${Math.round(num)}ms`;
    }

    if (num < 60000) {
      const secs = (num / 1000).toFixed(2).replace(/\.00$/, '');
      return `${secs}s`;
    }

    const minutes = Math.floor(num / 60000);
    const remainingSecs = Math.round((num % 60000) / 1000);
    return `${minutes}m ${remainingSecs}s`;
  }

  /**
   * Formats a timestamp into '16 Oct 2026, 4:30 PM'
   * @param {number|Date|string} timestamp
   * @returns {string}
   */
  function formatDate(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return '—';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour is 12 AM

    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  }

  /**
   * Formats a test score
   * @param {number|null} score
   * @returns {string} null -> '—', 75 -> '75'
   */
  function formatScore(score) {
    if (score === null || score === undefined || isNaN(score)) {
      return '—';
    }
    return Math.round(Number(score)).toString();
  }

  // -------------------------------------------------------------------------
  // Color & Accessibility Contrast Utilities
  // -------------------------------------------------------------------------

  /**
   * Converts hex color string to RGB object
   * Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA
   * @param {string} hex
   * @returns {{r: number, g: number, b: number}|null}
   */
  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    let cleanHex = hex.trim().replace(/^#/, '');

    // Expand shorthand form (e.g. "03F") to full form ("0033FF")
    if (cleanHex.length === 3 || cleanHex.length === 4) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }

    if (cleanHex.length !== 6 && cleanHex.length !== 8) {
      return null;
    }

    const num = parseInt(cleanHex.slice(0, 6), 16);
    if (isNaN(num)) return null;

    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  /**
   * Converts RGB numbers (0-255) to hex color string (#rrggbb)
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @returns {string}
   */
  function rgbToHex(r, g, b) {
    const toHex = (n) => {
      const clamped = Math.max(0, Math.min(255, Math.round(n || 0)));
      return clamped.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Calculates WCAG 2.1 relative luminance for sRGB color
   * Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B (after gamma correction)
   * @param {number} r - 0 to 255
   * @param {number} g - 0 to 255
   * @param {number} b - 0 to 255
   * @returns {number} Relative luminance between 0 and 1
   */
  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(val => {
      const c = (val || 0) / 255;
      return c <= 0.04045
        ? c / 12.92
        : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Calculates WCAG 2.1 contrast ratio between two hex colors
   * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is lighter
   * @param {string} hex1 - e.g. '#FFFFFF'
   * @param {string} hex2 - e.g. '#000000'
   * @returns {number} Contrast ratio rounded to 2 decimal places (e.g. 21.0 or 4.5)
   */
  function getContrastRatio(hex1, hex2) {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);

    if (!rgb1 || !rgb2) return 1;

    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const l1 = Math.max(lum1, lum2);
    const l2 = Math.min(lum1, lum2);

    const ratio = (l1 + 0.05) / (l2 + 0.05);
    return Number(ratio.toFixed(2));
  }

  /**
   * Check if contrast ratio meets WCAG AA standard (4.5:1 for normal text)
   * @param {number} ratio
   * @returns {boolean}
   */
  function meetsWCAGAA(ratio) {
    return typeof ratio === 'number' && ratio >= 4.5;
  }

  /**
   * Check if contrast ratio meets WCAG AAA standard (7.0:1 for normal text)
   * @param {number} ratio
   * @returns {boolean}
   */
  function meetsWCAGAAA(ratio) {
    return typeof ratio === 'number' && ratio >= 7.0;
  }

  /**
   * Maps numerical score (0-100) to theme color hex
   * null -> '#94A3B8', <50 -> '#DC2626', <80 -> '#D97706', else '#059669'
   * @param {number|null} score
   * @returns {string} Hex color
   */
  function scoreToColor(score) {
    if (score === null || score === undefined || isNaN(score)) {
      return '#94A3B8'; // Slate 400
    }
    const num = Number(score);
    if (num < 50) return '#DC2626'; // Red 600
    if (num < 80) return '#D97706'; // Amber 600
    return '#059669';              // Emerald 600
  }

  /**
   * Maps numerical score (0-100) to letter grade
   * null -> '—', <50 -> 'F', <60 -> 'D', <70 -> 'C', <80 -> 'B', <90 -> 'A-', else 'A'
   * @param {number|null} score
   * @returns {string}
   */
  function scoreToGrade(score) {
    if (score === null || score === undefined || isNaN(score)) {
      return '—';
    }
    const num = Number(score);
    if (num < 50) return 'F';
    if (num < 60) return 'D';
    if (num < 70) return 'C';
    if (num < 80) return 'B';
    if (num < 90) return 'A-';
    return 'A';
  }

  /**
   * Maps status string to emoji indicator
   * @param {string} status - 'pass' | 'fail' | 'warn' | 'info' | 'skip' | 'error'
   * @returns {string} Emoji
   */
  function statusToEmoji(status) {
    const map = {
      pass: '✅',
      fail: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      skip: '⏭️',
      error: '💥'
    };
    return map[String(status).toLowerCase()] || '❓';
  }

  /**
   * Maps status string to uppercase display label
   * @param {string} status
   * @returns {string}
   */
  function statusToLabel(status) {
    const map = {
      pass: 'PASS',
      fail: 'FAIL',
      warn: 'WARN',
      info: 'INFO',
      skip: 'SKIP',
      error: 'ERROR'
    };
    return map[String(status).toLowerCase()] || String(status || '').toUpperCase();
  }

  // -------------------------------------------------------------------------
  // DOM Utilities
  // -------------------------------------------------------------------------

  /**
   * Query selector shorthand
   * @param {string} selector
   * @param {Element|Document} [parent=document]
   * @returns {Element|null}
   */
  function $(selector, parent) {
    const root = parent || document;
    return root.querySelector(selector);
  }

  /**
   * Query selector all returning an array
   * @param {string} selector
   * @param {Element|Document} [parent=document]
   * @returns {Element[]}
   */
  function $$(selector, parent) {
    const root = parent || document;
    return Array.from(root.querySelectorAll(selector));
  }

  /**
   * Creates an HTMLElement with attributes, event listeners, and children
   * @param {string} tag - Tag name
   * @param {Object} [attrs={}] - Attributes, style object, dataset, on* listeners
   * @param {Array|string|Node} [children=[]] - Child nodes or string content
   * @returns {HTMLElement}
   */
  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    if (attrs && typeof attrs === 'object') {
      for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined) continue;

        if (key === 'className' || key === 'class') {
          el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(el.style, value);
        } else if (key === 'style' && typeof value === 'string') {
          el.style.cssText = value;
        } else if (key === 'dataset' && typeof value === 'object') {
          Object.assign(el.dataset, value);
        } else if (key === 'html' || key === 'innerHTML') {
          el.innerHTML = value;
        } else if (key === 'text' || key === 'textContent') {
          el.textContent = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
          const eventName = key.slice(2).toLowerCase();
          el.addEventListener(eventName, value);
        } else if (typeof value === 'boolean') {
          if (value) el.setAttribute(key, '');
        } else {
          el.setAttribute(key, String(value));
        }
      }
    }

    const appendChildSafe = (child) => {
      if (child === null || child === undefined) return;
      if (Array.isArray(child)) {
        child.forEach(appendChildSafe);
      } else if (child instanceof Node) {
        el.appendChild(child);
      } else {
        el.appendChild(document.createTextNode(String(child)));
      }
    };

    if (children) {
      appendChildSafe(children);
    }

    return el;
  }

  /**
   * Parses an HTML string into a DOM Document
   * @param {string} html
   * @returns {Document}
   */
  function parseHtml(html) {
    const parser = new DOMParser();
    try {
      return parser.parseFromString(html || '', 'text/html');
    } catch (e) {
      console.warn('VeriQ: parseHtml failed to parse string, returning empty document', e);
      return parser.parseFromString('', 'text/html');
    }
  }

  // -------------------------------------------------------------------------
  // Miscellaneous Utilities
  // -------------------------------------------------------------------------

  /**
   * Returns a Promise that resolves after the specified milliseconds
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
  }

  /**
   * Generates a random short unique identifier
   * @returns {string} e.g. 'vq-7k8x9z-1849f2b'
   */
  function generateId() {
    const rand = Math.random().toString(36).substring(2, 9);
    const time = Date.now().toString(36);
    return `vq-${rand}-${time}`;
  }

  /**
   * Creates a deep clone of a plain object or array
   * @param {*} obj
   * @returns {*}
   */
  function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(obj);
      } catch (e) {
        // Fallback for non-cloneable objects
      }
    }
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      // Fallback recursive clone
      if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
      }
      const copy = {};
      for (const key of Object.keys(obj)) {
        copy[key] = deepClone(obj[key]);
      }
      return copy;
    }
  }

  /**
   * Deeply merges properties of source into target object
   * @param {Object} target
   * @param {Object} source
   * @returns {Object} Target
   */
  function mergeDeep(target, source) {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return deepClone(source);

    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      const targetVal = target[key];

      if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
        if (!targetVal || typeof targetVal !== 'object' || Array.isArray(targetVal)) {
          target[key] = {};
        }
        mergeDeep(target[key], sourceVal);
      } else {
        target[key] = deepClone(sourceVal);
      }
    }

    return target;
  }

  // -------------------------------------------------------------------------
  // Headers Parsing Utilities
  // -------------------------------------------------------------------------

  /**
   * Parses a raw HTTP header string into a key-value object (normalized with lowercase keys)
   * @param {string} headerStr - e.g. 'Content-Type: text/html\nCache-Control: max-age=3600'
   * @returns {Object<string, string>}
   */
  function parseHeaders(headerStr) {
    const headers = {};
    if (!headerStr || typeof headerStr !== 'string') return headers;

    const lines = headerStr.trim().split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmedLine.slice(0, colonIndex).trim().toLowerCase();
        const value = trimmedLine.slice(colonIndex + 1).trim();
        if (headers[key]) {
          headers[key] += `, ${value}`;
        } else {
          headers[key] = value;
        }
      }
    }

    return headers;
  }

  /**
   * Case-insensitive header lookup from headers object or Headers instance
   * @param {Object|Headers} headers
   * @param {string} name
   * @returns {string|null}
   */
  function getHeader(headers, name) {
    if (!headers || !name) return null;

    if (typeof headers.get === 'function') {
      return headers.get(name);
    }

    if (typeof headers === 'object') {
      const target = name.toLowerCase();
      for (const [key, val] of Object.entries(headers)) {
        if (key.toLowerCase() === target) {
          return val;
        }
      }
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // Link & Resource Extraction Utilities
  // -------------------------------------------------------------------------

  /**
   * Extract all anchor links from a Document with resolved URLs and classification
   * @param {Document} doc
   * @param {string} baseUrl
   * @returns {Array<{href: string, rawHref: string, text: string, isExternal: boolean, isValid: boolean, target: string, rel: string}>}
   */
  function extractLinks(doc, baseUrl) {
    if (!doc) return [];
    const elements = doc.querySelectorAll('a[href]');
    const results = [];
    const baseDomain = extractDomain(baseUrl);

    elements.forEach(el => {
      const rawHref = el.getAttribute('href') || '';
      const trimmedHref = rawHref.trim();
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const target = el.getAttribute('target') || '';
      const rel = el.getAttribute('rel') || '';

      const isJavascript = /^javascript:/i.test(trimmedHref);
      const isMailto = /^mailto:/i.test(trimmedHref);
      const isTel = /^tel:/i.test(trimmedHref);
      const isAnchor = trimmedHref.startsWith('#');

      const absolute = makeAbsolute(trimmedHref, baseUrl);
      const isValid = Boolean(trimmedHref) && !isJavascript && isValidUrl(absolute);

      let isExternal = false;
      if (isValid && baseDomain) {
        const linkDomain = extractDomain(absolute);
        isExternal = Boolean(linkDomain && linkDomain.toLowerCase() !== baseDomain.toLowerCase());
      }

      results.push({
        href: absolute,
        rawHref,
        text,
        isExternal,
        isValid,
        isSpecial: isJavascript || isMailto || isTel || isAnchor,
        target,
        rel
      });
    });

    return results;
  }

  /**
   * Extract all image elements with resolved src and accessibility metadata
   * @param {Document} doc
   * @param {string} baseUrl
   * @returns {Array<{src: string, rawSrc: string, alt: string|null, hasAlt: boolean, isExternal: boolean, width: string|null, height: string|null, loading: string|null}>}
   */
  function extractImages(doc, baseUrl) {
    if (!doc) return [];
    const elements = doc.querySelectorAll('img');
    const results = [];
    const baseDomain = extractDomain(baseUrl);

    elements.forEach(img => {
      const rawSrc = img.getAttribute('src') || img.getAttribute('data-src') || '';
      const alt = img.getAttribute('alt'); // null if attribute is absent, string if present
      const absolute = makeAbsolute(rawSrc, baseUrl);

      let isExternal = false;
      if (absolute && baseDomain) {
        const imgDomain = extractDomain(absolute);
        isExternal = Boolean(imgDomain && imgDomain.toLowerCase() !== baseDomain.toLowerCase());
      }

      results.push({
        src: absolute,
        rawSrc,
        alt: alt !== null ? alt.trim() : null,
        hasAlt: alt !== null,
        isExternal,
        width: img.getAttribute('width'),
        height: img.getAttribute('height'),
        loading: img.getAttribute('loading')
      });
    });

    return results;
  }

  /**
   * Extract external resources (CSS, JS, Fonts, Preloads, Icons, Manifest)
   * @param {Document} doc
   * @param {string} baseUrl
   * @returns {Array<{type: string, url: string, rawUrl: string, rel?: string}>}
   */
  function extractResources(doc, baseUrl) {
    if (!doc) return [];
    const resources = [];

    // CSS stylesheets
    doc.querySelectorAll('link[rel~="stylesheet"]').forEach(el => {
      const raw = el.getAttribute('href') || '';
      if (raw) {
        resources.push({
          type: 'css',
          url: makeAbsolute(raw, baseUrl),
          rawUrl: raw
        });
      }
    });

    // JavaScript files
    doc.querySelectorAll('script[src]').forEach(el => {
      const raw = el.getAttribute('src') || '';
      if (raw) {
        resources.push({
          type: 'js',
          url: makeAbsolute(raw, baseUrl),
          rawUrl: raw
        });
      }
    });

    // Favicon & Icons
    doc.querySelectorAll('link[rel*="icon"]').forEach(el => {
      const raw = el.getAttribute('href') || '';
      if (raw) {
        resources.push({
          type: 'icon',
          url: makeAbsolute(raw, baseUrl),
          rawUrl: raw,
          rel: el.getAttribute('rel') || ''
        });
      }
    });

    // Fonts & Preloads
    doc.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"]').forEach(el => {
      const raw = el.getAttribute('href') || '';
      const as = el.getAttribute('as') || 'resource';
      if (raw) {
        resources.push({
          type: as === 'font' ? 'font' : as === 'style' ? 'css' : as === 'script' ? 'js' : 'preload',
          url: makeAbsolute(raw, baseUrl),
          rawUrl: raw,
          rel: el.getAttribute('rel') || ''
        });
      }
    });

    // Manifest
    const manifestEl = doc.querySelector('link[rel="manifest"]');
    if (manifestEl && manifestEl.getAttribute('href')) {
      const raw = manifestEl.getAttribute('href');
      resources.push({
        type: 'manifest',
        url: makeAbsolute(raw, baseUrl),
        rawUrl: raw
      });
    }

    return resources;
  }

  /**
   * Extract all form elements and details from a Document
   * @param {Document} doc
   * @returns {Array<Object>}
   */
  function extractForms(doc) {
    if (!doc) return [];
    const forms = doc.querySelectorAll('form');
    const results = [];

    forms.forEach((form, index) => {
      const inputs = Array.from(form.querySelectorAll('input, select, textarea, button'));
      const inputTypes = inputs.map(inp => (inp.getAttribute('type') || inp.tagName.toLowerCase()).toLowerCase());

      const hasSubmit = inputs.some(inp => {
        const type = (inp.getAttribute('type') || '').toLowerCase();
        return type === 'submit' || inp.tagName.toLowerCase() === 'button';
      });

      const hasPassword = inputTypes.includes('password');

      // Check for common CSRF input names
      const hasCsrf = inputs.some(inp => {
        const name = (inp.getAttribute('name') || '').toLowerCase();
        return name.includes('csrf') || name.includes('token') || name.includes('_token');
      });

      results.push({
        index,
        id: form.getAttribute('id') || '',
        name: form.getAttribute('name') || '',
        action: form.getAttribute('action') || '',
        method: (form.getAttribute('method') || 'GET').toUpperCase(),
        inputCount: inputs.length,
        inputTypes,
        hasSubmit,
        hasPassword,
        hasCsrf
      });
    });

    return results;
  }

  /**
   * Extract comprehensive metadata from HTML Document (Title, Meta description, OpenGraph, Twitter, Viewport, etc.)
   * @param {Document} doc
   * @returns {Object}
   */
  function extractMeta(doc) {
    if (!doc) return {};

    const getMetaContent = (query) => {
      const el = doc.querySelector(query);
      return el ? (el.getAttribute('content') || '').trim() : '';
    };

    const titleEl = doc.querySelector('title');
    const title = titleEl ? (titleEl.textContent || '').trim() : '';

    const canonicalEl = doc.querySelector('link[rel="canonical"]');
    const canonical = canonicalEl ? (canonicalEl.getAttribute('href') || '').trim() : '';

    const charsetEl = doc.querySelector('meta[charset]') || doc.querySelector('meta[http-equiv="Content-Type" i]');
    const charset = charsetEl
      ? (charsetEl.getAttribute('charset') || charsetEl.getAttribute('content') || '').trim()
      : '';

    // Collect all meta tags for auditing
    const allMetaTags = Array.from(doc.querySelectorAll('meta')).map(m => ({
      name: m.getAttribute('name') || '',
      property: m.getAttribute('property') || '',
      content: m.getAttribute('content') || '',
      httpEquiv: m.getAttribute('http-equiv') || '',
      charset: m.getAttribute('charset') || ''
    }));

    return {
      title,
      description: getMetaContent('meta[name="description" i]'),
      keywords: getMetaContent('meta[name="keywords" i]'),
      viewport: getMetaContent('meta[name="viewport" i]'),
      robots: getMetaContent('meta[name="robots" i]'),
      author: getMetaContent('meta[name="author" i]'),
      themeColor: getMetaContent('meta[name="theme-color" i]'),
      charset,
      canonical,
      generator: getMetaContent('meta[name="generator" i]'),
      openGraph: {
        title: getMetaContent('meta[property="og:title" i]'),
        description: getMetaContent('meta[property="og:description" i]'),
        image: getMetaContent('meta[property="og:image" i]'),
        url: getMetaContent('meta[property="og:url" i]'),
        type: getMetaContent('meta[property="og:type" i]'),
        siteName: getMetaContent('meta[property="og:site_name" i]'),
        locale: getMetaContent('meta[property="og:locale" i]')
      },
      twitter: {
        card: getMetaContent('meta[name="twitter:card" i]') || getMetaContent('meta[property="twitter:card" i]'),
        title: getMetaContent('meta[name="twitter:title" i]') || getMetaContent('meta[property="twitter:title" i]'),
        description: getMetaContent('meta[name="twitter:description" i]') || getMetaContent('meta[property="twitter:description" i]'),
        image: getMetaContent('meta[name="twitter:image" i]') || getMetaContent('meta[property="twitter:image" i]'),
        site: getMetaContent('meta[name="twitter:site" i]') || getMetaContent('meta[property="twitter:site" i]'),
        creator: getMetaContent('meta[name="twitter:creator" i]') || getMetaContent('meta[property="twitter:creator" i]')
      },
      all: allMetaTags
    };
  }

  // -------------------------------------------------------------------------
  // Public API Export
  // -------------------------------------------------------------------------
  return {
    // URL
    isValidUrl,
    normalizeUrl,
    extractDomain,
    extractOrigin,
    extractBasePath,
    makeAbsolute,
    isSameDomain,

    // String
    truncate,
    escapeHtml,
    stripHtml,
    slugify,

    // Format
    formatBytes,
    formatTime,
    formatDate,
    formatScore,

    // Color & Contrast
    hexToRgb,
    rgbToHex,
    getLuminance,
    getContrastRatio,
    meetsWCAGAA,
    meetsWCAGAAA,
    scoreToColor,
    scoreToGrade,
    statusToEmoji,
    statusToLabel,

    // DOM
    $,
    $$,
    createElement,
    parseHtml,

    // Misc
    wait,
    generateId,
    deepClone,
    mergeDeep,

    // Headers
    parseHeaders,
    getHeader,

    // Extraction
    extractLinks,
    extractImages,
    extractResources,
    extractForms,
    extractMeta
  };
})();
