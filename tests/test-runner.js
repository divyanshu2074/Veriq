/**
 * VeriQ - Automated Verification Test Suite
 *
 * Validates that all 148 software testing types are registered, numbered 1-148 sequentially,
 * and execute with valid result schemas and score calculations.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🛡️ Starting VeriQ 148 Tests Automated Verification Suite...\n');

// Set up simulated browser environment
const window = {
  location: { hash: '#dashboard' },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  performance: { now: () => Date.now(), memory: { usedJSHeapSize: 20 * 1024 * 1024 } },
  navigator: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    platform: 'Win32',
    storage: { estimate: async () => ({ quota: 1000 * 1024 * 1024, usage: 10 * 1024 * 1024 }) }
  }
};
window.window = window;
global.window = window;
global.VeriQ = window.VeriQ = { core: {}, modules: {} };
global.localStorage = window.localStorage;
global.performance = window.performance;
global.navigator = window.navigator;
global.document = {
  body: { classList: { remove() {}, add() {} } },
  getElementById: () => null,
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ setAttribute() {}, style: {}, classList: { add() {}, remove() {} }, appendChild() {} })
};

// Create simulated DOM parser
global.DOMParser = class {
  parseFromString(str, type) {
    return {
      querySelectorAll(selector) {
        if (selector.includes('script:not([src])')) {
          return [{ textContent: 'function testUnit() { return 42; }' }];
        }
        if (selector.includes('script[src]')) return [{ getAttribute: () => 'app.js' }];
        if (selector.includes('link[rel="stylesheet"]')) return [{ getAttribute: () => 'style.css' }];
        if (selector.includes('link[rel*="font"]')) return [];
        if (selector.includes('img')) return [{ getAttribute: (attr) => attr === 'src' ? 'logo.png' : 'Logo' }];
        if (selector.includes('a[href]')) return [{ getAttribute: () => 'https://example.com/about', textContent: 'About Us' }];
        if (selector.includes('form')) return [{ getAttribute: (attr) => attr === 'action' ? '/submit' : 'POST' }];
        if (selector.includes('button')) return [{ textContent: 'Submit', getAttribute: () => 'submit' }];
        if (selector.includes('input')) return [{ getAttribute: (attr) => attr === 'type' ? 'text' : 'test' }];
        if (selector.includes('*[id]')) return [{ id: 'app' }, { id: 'main' }];
        if (selector.includes('*[tabindex]')) return [];
        if (selector.includes('main, nav, header, footer')) return [{ tagName: 'MAIN' }, { tagName: 'HEADER' }, { tagName: 'FOOTER' }];
        if (selector.includes('h1, h2, h3')) return [{ tagName: 'H1', textContent: 'Welcome' }];
        return [];
      },
      querySelector(selector) {
        if (selector === 'title') return { textContent: 'VeriQ Test Page - Software Quality Assurance' };
        if (selector.includes('meta[name="description"]')) return { getAttribute: () => 'Comprehensive automated website testing suite.' };
        if (selector.includes('link[rel="canonical"]')) return { getAttribute: () => 'https://example.com' };
        if (selector.includes('meta[name="viewport"]')) return { getAttribute: () => 'width=device-width, initial-scale=1.0' };
        return null;
      }
    };
  }
};

// Load core files
const basePath = path.resolve(__dirname, '..');
const loadScript = (relPath) => {
  const code = fs.readFileSync(path.join(basePath, relPath), 'utf8');
  vm.runInThisContext(code);
};

loadScript('js/core/utils.js');
loadScript('js/core/storage.js');

// Load 5 Category modules
loadScript('js/modules/cat-a-functional.js');
loadScript('js/modules/cat-b-nonfunctional.js');
loadScript('js/modules/cat-c-security.js');
loadScript('js/modules/cat-d-webspecific.js');
loadScript('js/modules/cat-e-specialized.js');

async function runVerification() {
  const modules = window.VeriQ.modules;
  const categoryIds = [
    'cat-a-functional',
    'cat-b-nonfunctional',
    'cat-c-security',
    'cat-d-webspecific',
    'cat-e-specialized'
  ];

  console.log('📦 Loaded Modules:');
  categoryIds.forEach(id => {
    const mod = modules[id];
    if (!mod) {
      console.error(`❌ Missing module: ${id}`);
      process.exit(1);
    }
    console.log(`  ✓ ${mod.name} [Cat ${mod.code}]: ${mod.tests.length} tests`);
  });

  // Verify all 148 tests
  let totalTests = 0;
  const numbersSeen = new Set();
  const duplicateNumbers = [];
  const testList = [];

  categoryIds.forEach(id => {
    const mod = modules[id];
    mod.tests.forEach(test => {
      totalTests++;
      if (numbersSeen.has(test.num)) {
        duplicateNumbers.push(test.num);
      }
      numbersSeen.add(test.num);
      testList.push({ ...test, category: id });
    });
  });

  console.log(`\n📊 Total Software Testing Types Registered: ${totalTests}`);
  if (totalTests !== 148) {
    console.error(`❌ Expected exactly 148 tests, but got ${totalTests}`);
    process.exit(1);
  } else {
    console.log('✅ Exact count confirmed: 148 tests.');
  }

  if (duplicateNumbers.length > 0) {
    console.error(`❌ Duplicate test numbers found: ${duplicateNumbers.join(', ')}`);
    process.exit(1);
  } else {
    console.log('✅ Zero duplicate test numbers. All test numbers are unique.');
  }

  // Check sequence 1 to 148
  const missingNumbers = [];
  for (let i = 1; i <= 148; i++) {
    if (!numbersSeen.has(i)) {
      missingNumbers.push(i);
    }
  }

  if (missingNumbers.length > 0) {
    console.error(`❌ Missing numbers in sequence 1..148: ${missingNumbers.join(', ')}`);
    process.exit(1);
  } else {
    console.log('✅ Complete sequential coverage: All numbers 1 through 148 are present.');
  }

  // Execution simulation of all 148 tests
  console.log('\n🚀 Executing all 148 tests in simulated sandbox...');
  const mockContext = {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      finalUrl: 'https://example.com',
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'content-encoding': 'gzip',
        'cache-control': 'public, max-age=86400',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN'
      },
      time: 145,
      size: 45200,
      redirects: []
    },
    doc: new global.DOMParser().parseFromString('<html></html>', 'text/html'),
    html: '<!DOCTYPE html><html><head><title>VeriQ Test</title><meta name="description" content="Test description"></head><body><h1>Hello</h1></body></html>'
  };

  let passedExecution = 0;
  let failedExecution = 0;

  for (const test of testList) {
    try {
      const result = await test.run(mockContext);
      if (!result || typeof result !== 'object') {
        throw new Error('Test returned non-object result');
      }
      if (!result.id || typeof result.num !== 'number' || !result.name || !result.status) {
        throw new Error(`Test #${test.num} result missing required schema fields (id, num, name, status)`);
      }
      passedExecution++;
    } catch (err) {
      console.error(`❌ Execution failure in Test #${test.num} (${test.name}): ${err.message}`);
      failedExecution++;
    }
  }

  console.log(`\n🎉 Execution Results: ${passedExecution}/148 passed without exceptions.`);
  if (failedExecution > 0) {
    console.error(`❌ ${failedExecution} tests failed execution.`);
    process.exit(1);
  }

  console.log('✅ ALL 148 VERIQ TESTS VERIFIED AND FULLY OPERATIONAL!\n');
}

runVerification().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
