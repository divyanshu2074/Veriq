# VeriQ - Website Testing Suite 🛡️

[![Deploy to GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?logo=github&style=for-the-badge)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-emerald.svg?style=for-the-badge)]()
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20JS)-purple.svg?style=for-the-badge)]()
[![Automated CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-brightgreen?logo=githubactions&style=for-the-badge)]()

> **The all-in-one, browser-based website auditing and test automation platform.** Run comprehensive quality assurance, security, accessibility, SEO, reliability, and code quality audits on any public website directly from your browser—no command line, build tools, or software installations required.

---

## 🌐 Live Demo

Experience VeriQ directly in your browser:
**`https://YOUR-USERNAME.github.io/Veriq/`** *(replace with your GitHub username)*

---

## 💡 What is VeriQ?

**VeriQ** (Verification & Quality) is a web-based testing suite created for QA engineers, web developers, site owners, and product teams. It evaluates any website across **10 distinct quality dimensions** and outputs instant visual health scores, actionable technical recommendations, and exportable reports.

Traditional website auditing tools often require complex command-line setups, paid SaaS subscriptions, or server infrastructure. VeriQ runs **100% client-side in vanilla JavaScript**, allowing you to deploy it for free on GitHub Pages and audit websites on demand or automatically on a schedule via GitHub Actions.

---

## ✨ Features

- 🎯 **10 Comprehensive Testing Modules**: Covering everything from core functionality and page speed to SSL certificates, security headers, WCAG accessibility, and PWA capabilities.
- ⚡ **80+ Automated In-Browser Tests**: Immediate feedback with scores (0–100), severity levels (*Pass*, *Warn*, *Fail*, *Info*), and remediation steps.
- 🚀 **100% Browser-Based & Serverless**: Written in pure modern JavaScript (ES2022+) and CSS with zero frontend build dependencies.
- 🔄 **Continuous CI/CD Workflows**: Ready-to-use GitHub Actions for automated 6-hour health checks, failure notifications, and k6 load testing.
- 💾 **Multi-Target Data Export**: Save test audit history locally in `localStorage`, push JSON reports to your GitHub repository, or stream them to Google Sheets.
- 🔐 **Privacy-Aware Architecture**: Runs transparently in your browser with CORS proxy fallbacks and optional self-hosted proxy deployment.

---

## 📊 Test Categories

VeriQ organizes over 80 automated tests across 10 structured quality categories:

| Icon | Category | ID | Description | Tests |
|:---:|:---|:---|:---|:---:|
| 🔧 | **Functional** | `01-functional` | Validates forms, button states, DOM structure, viewport responsiveness, and broken visual layouts. | 10 |
| ⚡ | **Performance** | `02-performance` | Evaluates TTFB latency, resource payload sizes, CSS/JS minification, caching headers, and Core Web Vitals. | 10 |
| 🔒 | **Security** | `03-security` | Analyzes SSL/TLS configurations, HSTS, CSP, X-Frame-Options, mixed content risks, cookies, and vulnerability flags. | 12 |
| ♿ | **Accessibility** | `04-accessibility` | Audits WCAG 2.1 AA compliance: contrast ratios, alt text, ARIA attributes, semantic headings, and tab navigation. | 12 |
| 🖥️ | **Compatibility** | `05-compatibility` | Validates responsive meta tags, touch targets, CSS feature queries, vendor prefixes, and viewport scaling. | 10 |
| 🌐 | **Health & SEO** | `06-health-seo` | Checks HTTP availability, redirect hops, page titles, meta descriptions, sitemap.xml, robots.txt, and indexability. | 12 |
| ⏱️ | **Reliability** | `07-reliability` | Measures response latency, multi-ping availability, server error rates, latency variance, and caching consistency. | 6 |
| 🌍 | **Localization** | `08-localization` | Audits HTML lang tags, UTF-8 charsets, multi-language hreflang tags, RTL direction, date/currency formats, and translation readiness. | 8 |
| 💻 | **Code Quality** | `09-code-quality` | Checks HTML5 doctype, W3C validation, head element ordering, inline script safety, dependencies, and performance budget. | 10 |
| 🔬 | **Specialized** | `10-specialized` | Tests PWA manifests, Service Worker registration, offline caching, WebSockets, file uploads, and favicon suites. | 10 |

---

## 🚀 Quick Start

Get your own private instance of VeriQ up and running in less than 2 minutes:

1. **Fork or Clone this repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Veriq.git
   cd Veriq
   ```
2. **Open locally**:
   Double click `index.html` or serve it with any local static HTTP server:
   ```bash
   npx serve .
   ```
3. **Deploy on GitHub Pages**: Follow the step-by-step instructions below.

---

## 📦 Deploying to GitHub Pages

Deploying VeriQ is completely free and requires zero backend server configuration:

```
[Your GitHub Repo] ──> Settings ──> Pages ──> Source: Deploy from branch ──> Branch: main / root ──> Save
```

### Step-by-Step Instructions:

1. **Open your repository** on GitHub.
2. Click on the **Settings** tab in the top navigation bar.
3. In the left sidebar under *Code and automation*, click **Pages**.
4. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` from the dropdown and set folder to `/(root)`.
5. Click **Save**.
6. Wait 30–60 seconds. Refresh the page to see your live deployment banner:
   > *"Your site is live at `https://<username>.github.io/Veriq/`"*
7. Visit the URL, enter any website address (e.g. `https://example.com`), and run tests!

---

## ⚙️ Setting Up GitHub Integration

VeriQ can automatically record test reports directly into your GitHub repository and trigger automated alert issues when critical bugs or outages are detected.

### 1. Generate a Personal Access Token (PAT)
1. Go to **GitHub Settings** ➔ **Developer settings** ➔ **Personal access tokens** ➔ **Fine-grained tokens** (or Tokens classic).
2. Click **Generate new token**.
3. Name: `VeriQ Test Runner`.
4. Expiration: 90 days or No expiration.
5. Repository access: Select **Only select repositories** and pick your `Veriq` repository.
6. Permissions:
   - **Contents**: `Read and write` (to save test result JSON files).
   - **Issues**: `Read and write` (to create alert issues on test failure).
7. Click **Generate token** and copy the resulting string (e.g., `github_pat_...`).

### 2. Configure VeriQ UI Settings
1. Open your deployed VeriQ web app.
2. Click the **Settings (⚙️)** icon in the top header.
3. Enter your **GitHub Username**, **Repository Name** (`Veriq`), and paste your **Personal Access Token**.
4. Click **Save Configuration**.
5. When audits finish, click **"Save to GitHub"** to commit reports to `/test-results/` automatically!

---

## 📈 Setting Up Google Sheets Integration

Store your test history in Google Sheets for client reporting, custom graphs, or BI dashboard integration.

### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.new) and create a spreadsheet titled `VeriQ Test Logs`.
2. Name the first row header columns:
   `Timestamp | Target URL | Overall Score | Status | Passed | Warnings | Failed | Summary`

### Step 2: Create Google Apps Script Webhook
1. In your sheet, click **Extensions** ➔ **Apps Script**.
2. Replace any code with this webhook receiver:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.targetUrl || '',
      data.score || 0,
      data.status || 'unknown',
      data.passedCount || 0,
      data.warnCount || 0,
      data.failCount || 0,
      data.summary || ''
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click **Deploy** ➔ **New deployment**.
4. Click the gear icon ➔ **Web app**.
5. Configuration:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
6. Click **Deploy** and copy the **Web app URL**.
7. Paste this URL into the **Google Sheets Webhook URL** field inside VeriQ Settings!

---

## ⚡ Instant In-Browser Automated Testing

VeriQ is built to work immediately right in your browser with zero configuration:

1. **Enter any public URL** in the top navigation bar.
2. Click **Run All Tests** (or click **Run Category** to test just the active module).
3. **Watch the live process HUD** and glowing animated cards as each of the 10 quality categories is analyzed in real-time.
4. **Inspect details**: Click on any test card to expand full technical findings, WCAG contrast details, security headers, and step-by-step remediation suggestions.
5. **Review History**: All runs are automatically saved to the **History** tab where you can search, sort, re-test, or export standalone HTML/CSV audit reports at any time.

---

## 🏗️ Architecture & Technology Stack

VeriQ is designed with a lightweight, maintainable, modular architecture:

```
┌────────────────────────────────────────────────────────┐
│                      VeriQ Core UI                     │
│  (index.html / CSS Variables Theme / Responsive Shell) │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            ▼                                ▼
┌──────────────────────┐         ┌───────────────────────┐
│ Global Test Registry │         │  AllOrigins CORS      │
│  window.VeriQ.modules │◄────────┤  Proxy Client / Fetch │
└───────────┬──────────┘         └───────────────────────┘
            │
            ├──► 01-functional-ui.js
            ├──► 02-performance.js
            ├──► 03-accessibility.js
            ├──► 04-security.js
            ├──► 05-cross-browser.js
            ├──► 06-health-seo.js
            ├──► 07-reliability.js
            ├──► 08-localization.js
            ├──► 09-code-quality.js
            └──► 10-specialized.js
```

- **Frontend Core**: Vanilla JavaScript (ES2022+), CSS3 Variables with dark/light theme support.
- **HTML DOM Parsing**: Browser-native `DOMParser` API for zero-dependency markup analysis.
- **Network Layer**: Dual fetch strategy with native browser `fetch()` and CORS proxy fallback.
- **Automation Engine**: Asynchronous test pipeline returning standardized evaluation objects (`id`, `name`, `status`, `score`, `summary`, `details`, `recommendations`, `duration`, `raw`).

---

## 📋 Comprehensive Test Coverage Matrix

The suite covers 148 standard quality criteria across automated checks, manual audits, and template workflows:

| Category | Test ID | Test Name | Execution Mode | Description |
|:---|:---|:---|:---:|:---|
| **Health & SEO** | `availability` | Website Availability | Automated | Probes HTTP response and verifies status code in 2xx range |
| **Health & SEO** | `http-status` | HTTP Status Code Analysis | Automated | Explains SEO implications of returned HTTP status code |
| **Health & SEO** | `redirect-chain` | Redirect Chain Audit | Automated | Measures hop count, detects redirect loops, verifies HTTPS canonicals |
| **Health & SEO** | `meta-title` | Page Title (SEO) | Automated | Validates title existence, 30–60 char length, checks keyword stuffing |
| **Health & SEO** | `meta-description`| Meta Description (SEO) | Automated | Audits presence and 70–160 character snippet boundaries |
| **Health & SEO** | `meta-tags` | SEO & Social Meta Tags | Automated | Inspects canonical tags, Open Graph, Twitter Cards, and robots directives |
| **Health & SEO** | `broken-links` | Broken Links Check | Automated | Samples internal hyperlinks and checks for 404/500 errors |
| **Health & SEO** | `broken-images` | Broken Images & Alt Audit | Automated | Identifies broken image files and flags missing image alt attributes |
| **Health & SEO** | `sitemap` | XML Sitemap Discovery | Automated | Discovers and validates `/sitemap.xml` schema and `<url>` entries |
| **Health & SEO** | `robots-txt` | Robots.txt Audit | Automated | Evaluates crawl permissions and crawler blocking rules |
| **Health & SEO** | `structured-data`| Schema.org Structured Data | Automated | Parses JSON-LD scripts, Microdata, and validates Schema.org entities |
| **Health & SEO** | `page-indexability`| Page Indexability | Automated | Cross-checks noindex, nofollow, and canonical URL alignment |
| **Reliability** | `response-time` | Response Time (TTFB) | Automated | Measures latency and classifies into performance tiers |
| **Reliability** | `multi-ping` | Availability Consistency (3 Pings) | Automated | Executes 3 sequential pings with 1s delays to test stability |
| **Reliability** | `server-errors` | Server Error Rate | Automated | Flags 5xx codes and scans HTML for database/PHP exception traces |
| **Reliability** | `timeout-resilience`| Timeout Variation | Automated | Calculates latency coefficient of variation across requests |
| **Reliability** | `content-consistency`| Dynamic Caching Consistency | Automated | Compares successive HTML snapshots for title or byte flapping |
| **Reliability** | `uptime-monitoring-setup`| 24/7 Uptime Workflow | Template | Ready-to-commit GitHub Actions 5-minute uptime monitor |
| **Localization** | `html-lang` | HTML Language Tag | Automated | Validates BCP 47 language format and verifies vocabulary alignment |
| **Localization** | `charset` | Character Encoding (UTF-8) | Automated | Ensures `<meta charset="UTF-8">` is declared within first 1024 bytes |
| **Localization** | `hreflang` | Multi-language Hreflang | Automated | Audits alternate language links and x-default fallbacks |
| **Localization** | `direction-support`| Text Direction (RTL) | Automated | Checks `dir="rtl"` attributes and bidirectional CSS stylesheets |
| **Localization** | `date-time-format`| Date/Time Localization | Automated | Audits ISO 8601 vs slash dates and validates `<time datetime>` tags |
| **Localization** | `currency-number-format`| Number & Currency Symbols | Automated | Detects international currencies and `Intl.NumberFormat` APIs |
| **Localization** | `unicode-support`| Unicode & Mojibake Check | Automated | Scans for character corruption (`Ã©`, `â€™`) and emoji readiness |
| **Localization** | `translation-readiness`| Translation Anti-Patterns | Automated | Flags hardcoded CSS generated text, text in images, and input values |
| **Code Quality** | `html-doctype` | HTML5 Doctype | Automated | Validates `<!DOCTYPE html>` at start to prevent browser Quirks Mode |
| **Code Quality** | `html-validation-check`| W3C HTML Validation | Automated | Queries W3C Nu Validator with local heuristic tag discrepancy fallbacks |
| **Code Quality** | `head-order` | Head Structure Sequencing | Automated | Enforces optimal head tag ordering (charset ➔ viewport ➔ title ➔ css ➔ js) |
| **Code Quality** | `console-errors`| Inline Script Safety | Automated | Tests script syntax and flags `eval()`, `document.write()`, and `with()` |
| **Code Quality** | `external-dependencies`| External Resource Origins | Automated | Catalogs third-party domains, checks CDNs, and flags raw GitHub scripts |
| **Code Quality** | `code-comments` | Sensitive Info in Comments | Automated | Detects TODOs, exposed internal paths, passwords, and database strings |
| **Code Quality** | `image-formats` | Modern Image Formats | Automated | Measures ratio of WebP/AVIF/SVG graphics vs legacy PNG/JPEG/GIF |
| **Code Quality** | `link-prefetch` | Performance Resource Hints | Automated | Audits `preconnect`, `dns-prefetch`, `preload`, and `prefetch` |
| **Code Quality** | `open-source-licenses`| Legal Notices & Licenses | Automated | Detects copyright statements, legal links, and license tags |
| **Code Quality** | `page-weight-budget`| Page Weight Budget (1MB) | Automated | Estimates composite page transfer weight across HTML, CSS, JS, and images |
| **Specialized** | `pwa-manifest` | Web App Manifest | Automated | Validates PWA manifest, standalone display, and 192/512px icons |
| **Specialized** | `service-worker`| Service Worker Registration| Automated | Detects worker registration scripts and probes `/sw.js` endpoints |
| **Specialized** | `offline-capability`| Offline Storage Readiness | Automated | Evaluates Cache Storage API and IndexedDB persistence readiness |
| **Specialized** | `websocket-detection`| Real-time WebSockets | Automated | Scans for native WebSockets, Socket.io, SignalR, or SockJS |
| **Specialized** | `file-upload` | File Upload Controls | Automated | Audits `<input type="file">` controls, accept filters, and form encodings |
| **Specialized** | `deep-linking` | URL Structure & Slugs | Automated | Evaluates URL length, parameter hygiene, and canonical matching |
| **Specialized** | `browser-history`| History Navigation Model | Automated | Detects HTML5 pushState, popstate, or legacy hash-based routing |
| **Specialized** | `web-storage` | Web Storage APIs | Automated | Catalogs client usage of localStorage, sessionStorage, and cookies |
| **Specialized** | `third-party-integrations`| Vendor Service Detection | Automated | Identifies Google Analytics, Stripe, HubSpot, Intercom, CDNs, etc. |
| **Specialized** | `favicon-complete`| Favicon Completeness | Automated | Audits standard icons, Apple Touch icons, Windows tiles, and Safari masks |

---

## 🔒 CORS Proxy Note & Privacy

### Why is a CORS Proxy Needed?
When running tests directly in a web browser, browsers enforce the **Same-Origin Policy (SOP)**. A web page hosted on `your-username.github.io` cannot directly inspect the raw HTML or response headers of `example.com` via standard `fetch()` unless the target domain explicitly provides `Access-Control-Allow-Origin: *` headers.

To bypass this browser security constraint without requiring you to run a local backend server, VeriQ routes read-only GET requests through public CORS proxies (such as [AllOrigins](https://allorigins.win/)).

### Privacy Implications:
- The public proxy receives the target website URL and returns public HTML content to your browser.
- **Never enter password-protected internal URLs, staging sites with sensitive proprietary data, or intranet endpoints** into a public proxy.
- For private intranets or corporate enterprise testing, we recommend deploying our lightweight **Cloudflare Worker CORS Proxy** (included in `/docs/proxy-setup.md`) under your own Cloudflare account.

---

## 🤝 Contributing

Contributions are welcome! To add a new test or refine an existing module:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/new-seo-test`.
3. Add your test definition into the appropriate file under `js/modules/`.
4. Ensure your test returns the standardized VeriQ result object:
   ```javascript
   return {
     id: 'unique-test-id',
     name: 'Human Readable Name',
     status: 'pass' | 'fail' | 'warn' | 'info',
     score: 100, // 0-100 or null
     summary: 'Brief evaluation summary.',
     details: [{ label: 'Metric', value: '123 ms', type: 'text' }],
     recommendations: ['Suggested fix action.'],
     duration: 45,
     raw: {}
   };
   ```
5. Test locally in your browser.
6. Submit a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.

```
Copyright (c) 2026 VeriQ Testing Suite Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```
