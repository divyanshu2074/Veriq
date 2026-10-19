# VeriQ 2.0 - Complete 148 Independent Software Testing Tools Suite 🛡️

[![Deploy to GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?logo=github&style=for-the-badge)](https://github.com/divyanshu2074/Veriq)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Tools: 148/148 Active](https://img.shields.io/badge/Tools-148%2F148%20Independent-brightgreen.svg?style=for-the-badge)]()
[![Backend: Node.js Express](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green.svg?style=for-the-badge)]()
[![Zero AI Dependencies](https://img.shields.io/badge/AI%20Dependencies-0%25%20(Pure%20Algorithms)-purple.svg?style=for-the-badge)]()

> **The ultimate suite of 148 independent, specialized software testing tools.**  
> Each tool operates as an autonomous testing utility with its own custom input parameters, 1-click sample data presets, and deep automated diagnostic reports. Powered by a hybrid engine: lightweight browser-native execution paired with a local Node.js/Express backend for raw network, TLS socket inspection, DNS resolution, and multi-user load testing.

---

## 🚀 Quick Start (Running VeriQ 2.0)

### 1. Run with Local Backend Acceleration (Recommended)
Clone the repository and run:
```bash
git clone https://github.com/divyanshu2074/Veriq.git
cd Veriq
npm install
npm start
```
Open **`http://localhost:3000`** in your browser. All 148 tools (including backend-accelerated load, socket, and DNS tools) will be fully functional!

### 2. Standalone / GitHub Pages Mode
The frontend is also 100% static and can run directly on GitHub Pages:
**`https://divyanshu2074.github.io/Veriq/`**
- In this mode, browser-native tools run client-side.
- You can connect to your local backend (`http://localhost:3000`) or a remote server by configuring the endpoint in the **Settings** view (`#settings`).

---

## 💡 What Makes VeriQ 2.0 Different?

Unlike monolithic URL scanners that run generic checks, **VeriQ 2.0 provides 148 dedicated, individual tools**:
- **Tailored Inputs per Tool**: 
  - **Unit Testing (#1)** asks for JS function code & unit assertions.
  - **API Testing (#13)** asks for HTTP method (GET/POST/PUT/DELETE), endpoint, headers, and request payload.
  - **Boundary Value Testing (#25)** asks for min and max bounds and auto-generates test vectors.
  - **Load Testing (#37)** provides sliders for concurrent virtual users (VUs) and request batches.
  - **TLS/SSL Testing (#87)** asks for domain and port and inspects raw certificate chains.
  - **DNS Configuration (#120)** queries A, AAAA, MX, TXT, NS records directly via Node `dns.promises`.
- **1-Click Sample Data**: Every tool includes a "✨ Load Sample Data" button so anyone can run tests instantly without typing complex configurations.
- **Deep-Linkable Tools**: Every tool has a dedicated permanent route (`#tool-1` to `#tool-148`) that can be shared or bookmarked directly.
- **Zero AI / Pure Algorithms**: 100% deterministic, transparent evaluation logic with zero hallucination.

---

## 📊 Complete 148 Independent Tools Directory

| # | Tool Name | Category | Mode | Description |
|:---:|:---|:---:|:---:|:---|
| **1** | **Unit Testing** | A. Functional | ⚡ Browser | Tests individual functions with assertions and execution timing. |
| **2** | **Component Testing** | A. Functional | ⚡ Browser | Tests isolated UI components, ARIA roles, and DOM markup. |
| **3** | **Integration Testing** | A. Functional | ⚡ Browser | Tests data pipeline flow between producer and consumer services. |
| **4** | **System Testing** | A. Functional | ⚡ Browser | Validates integrated system response and required keywords. |
| **5** | **End-to-End (E2E) Testing** | A. Functional | ⚡ Browser | Executes multi-step user workflows (navigate, assert, click). |
| **6** | **User Acceptance Testing (UAT)** | A. Functional | ⚡ Browser | Generates acceptance criteria sign-off matrices for stakeholders. |
| **7** | **Alpha Testing** | A. Functional | ⚡ Browser | Validates staging builds and internal environment flags. |
| **8** | **Beta Testing** | A. Functional | ⚡ Browser | Configures cohort telemetry and feedback collection pipelines. |
| **9** | **Smoke Testing** | A. Functional | ⚡ Browser | Pings critical route paths to determine build stability. |
| **10** | **Sanity Testing** | A. Functional | ⚡ Browser | Focused verification of specific bug fixes or modifications. |
| **11** | **Regression Testing** | A. Functional | ⚡ Browser | Diffs current JSON output against baseline to catch breaking changes. |
| **12** | **Retesting / Confirmation** | A. Functional | ⚡ Browser | Verifies that a reported defect ticket has been resolved. |
| **13** | **API Testing** | A. Functional | 🖥️ Backend | Tests REST endpoints with custom methods, headers, and payloads. |
| **14** | **Contract Testing** | A. Functional | ⚡ Browser | Verifies response payloads strictly match JSON schema contracts. |
| **15** | **Database Testing** | A. Functional | 🖥️ Backend | Analyzes SQL queries for syntax errors, injection risks, and constraints. |
| **16** | **UI Testing** | A. Functional | ⚡ Browser | Inspects element hierarchies, buttons, links, and layout containers. |
| **17** | **GUI Testing** | A. Functional | ⚡ Browser | Verifies graphical element dimensions and accessible touch sizes. |
| **18** | **Form Validation Testing** | A. Functional | ⚡ Browser | Audits form inputs, required fields, labels, and methods. |
| **19** | **Navigation Testing** | A. Functional | ⚡ Browser | Detects placeholder hrefs (#), broken routes, and dead links. |
| **20** | **Business Logic Testing** | A. Functional | ⚡ Browser | Validates application business rules and discount calculators. |
| **21** | **Workflow Testing** | A. Functional | ⚡ Browser | Validates multi-stage state handoffs (Cart -> Checkout -> Order). |
| **22** | **Error Handling Testing** | A. Functional | ⚡ Browser | Asserts proper HTTP 404 responses for non-existent paths. |
| **23** | **Negative Testing** | A. Functional | ⚡ Browser | Tests invalid inputs (negative values, malformed data) for safe rejection. |
| **24** | **Positive Testing** | A. Functional | ⚡ Browser | Tests compliant datasets and verifies successful processing. |
| **25** | **Boundary Value Testing (BVA)** | A. Functional | ⚡ Browser | Calculates 7 boundary points (Min-1, Min, Min+1, Max-1, Max, Max+1). |
| **26** | **Equivalence Partitioning (EP)** | A. Functional | ⚡ Browser | Partitions inputs into valid and invalid classes to reduce test count. |
| **27** | **Decision Table Testing** | A. Functional | ⚡ Browser | Computes complete 2^N truth table combinations for condition rules. |
| **28** | **State Transition Testing** | A. Functional | ⚡ Browser | Validates state models, event triggers, and prevents deadlocks. |
| **29** | **Pairwise Testing** | A. Functional | ⚡ Browser | AllPairs combinatorial optimization covering all 2-way interactions. |
| **30** | **Exploratory Testing** | A. Functional | ⚡ Browser | Timeboxed charter-based testing notebook for rapid bug logging. |
| **31** | **Ad Hoc Testing** | A. Functional | ⚡ Browser | Unscripted chaos testing actions and edge-case logging. |
| **32** | **Checklist Testing** | A. Functional | ⚡ Browser | Tracks completion against standard QA release checklists. |
| **33** | **Scenario Testing** | A. Functional | ⚡ Browser | Maps user journeys for specific personas (e.g., Guest mobile buyer). |
| **34** | **Data-Driven Testing** | A. Functional | ⚡ Browser | Runs logic against parameterized datasets in batch. |
| **35** | **Configuration Testing** | A. Functional | ⚡ Browser | Tests environment flags, feature toggles, and runtime variables. |
| **36** | **Performance Testing** | B. Non-Functional | 🖥️ Backend | Measures page speed, Time to First Byte (TTFB), and response weight. |
| **37** | **Load Testing** | B. Non-Functional | 🖥️ Backend | Multi-worker concurrent load generator with latency percentiles. |
| **38** | **Stress Testing** | B. Non-Functional | 🖥️ Backend | Ramps up concurrency to discover the application breaking point. |
| **39** | **Spike Testing** | B. Non-Functional | 🖥️ Backend | Simulates sudden instantaneous traffic bursts. |
| **40** | **Endurance / Soak Testing** | B. Non-Functional | 🖥️ Backend | Multi-cycle continuous probing to detect memory degradation. |
| **41** | **Scalability Testing** | B. Non-Functional | ⚡ Browser | Models throughput capacity across stepped virtual user tiers. |
| **42** | **Volume Testing** | B. Non-Functional | ⚡ Browser | Ingests and serializes high-volume records to check memory bounds. |
| **43** | **Capacity Testing** | B. Non-Functional | ⚡ Browser | Calculates theoretical maximum sustainable RPS based on CPU cores. |
| **44** | **Concurrency Testing** | B. Non-Functional | 🖥️ Backend | Dispatches parallel simultaneous requests to detect race conditions. |
| **45** | **Throughput Testing** | B. Non-Functional | 🖥️ Backend | Measures transactions and requests processed per second (RPS). |
| **46** | **Latency Testing** | B. Non-Functional | 🖥️ Backend | Calculates min, max, average, and network jitter across ping samples. |
| **47** | **Response-Time Testing** | B. Non-Functional | 🖥️ Backend | Asserts response duration against SLA criteria (e.g., <500ms). |
| **48** | **Resource Utilization** | B. Non-Functional | ⚡ Browser | Audits DOM tree complexity and payload weight. |
| **49** | **Reliability Testing** | B. Non-Functional | 🖥️ Backend | Measures consistency percentage over repeated executions. |
| **50** | **Availability Testing** | B. Non-Functional | 🖥️ Backend | Determines whether a website is online and serving HTTP 200 OK. |
| **51** | **Resilience Testing** | B. Non-Functional | ⚡ Browser | Evaluates circuit breaker and exponential backoff strategies. |
| **52** | **Recovery Testing** | B. Non-Functional | ⚡ Browser | Asserts actual recovery duration against Recovery Time Objective (RTO). |
| **53** | **Failover Testing** | B. Non-Functional | 🖥️ Backend | Tests hot-standby secondary backup instance readiness. |
| **54** | **Fault-Tolerance Testing** | B. Non-Functional | ⚡ Browser | Evaluates cluster node redundancy and tolerable failure count. |
| **55** | **Disaster Recovery Testing** | B. Non-Functional | ⚡ Browser | Validates snapshot frequency against Recovery Point Objective (RPO). |
| **56** | **Memory Leak Testing** | B. Non-Functional | ⚡ Browser | Runs rapid DOM creation/destruction cycles to audit memory leaks. |
| **57** | **Usability Testing** | B. Non-Functional | ⚡ Browser | Evaluates Nielsen Norman heuristics and semantic page landmarks. |
| **58** | **Accessibility (a11y)** | B. Non-Functional | ⚡ Browser | Audits WCAG 2.1 AA rules (image alt tags, html lang, h1 headings). |
| **59** | **Compatibility Testing** | B. Non-Functional | ⚡ Browser | Checks modern CSS/JS feature queries against browser matrices. |
| **60** | **Cross-Browser Testing** | B. Non-Functional | ⚡ Browser | Evaluates Blink, Gecko, and WebKit rendering engine support. |
| **61** | **Cross-Device Testing** | B. Non-Functional | ⚡ Browser | Simulates Desktop, Laptop, iPad, and iPhone screen viewports. |
| **62** | **Responsive Testing** | B. Non-Functional | ⚡ Browser | Audits viewport meta tags and media query breakpoints. |
| **63** | **Visual Testing** | B. Non-Functional | ⚡ Browser | Inspects brand color tokens and contrast against surfaces. |
| **64** | **Visual Regression** | B. Non-Functional | ⚡ Browser | Diffs current DOM signatures against golden baseline templates. |
| **65** | **Localization Testing (L10n)** | B. Non-Functional | ⚡ Browser | Formats numbers and dates according to target locale standards. |
| **66** | **Internationalization (I18n)**| B. Non-Functional | ⚡ Browser | Checks UTF-8 encoding, html lang, and hreflang tag declarations. |
| **67** | **Portability Testing** | B. Non-Functional | ⚡ Browser | Audits cross-platform hosting portability (Docker, Edge, Serverless). |
| **68** | **Installability Testing (PWA)**| B. Non-Functional | ⚡ Browser | Checks manifest.json fields and icon sizes for PWA installation. |
| **69** | **Maintainability Testing** | B. Non-Functional | ⚡ Browser | Calculates Cyclomatic Complexity and lines of code (LOC). |
| **70** | **Modularity Testing** | B. Non-Functional | ⚡ Browser | Checks encapsulation and modular export boundaries. |
| **71** | **Interoperability Testing** | B. Non-Functional | ⚡ Browser | Validates standard MIME types and RFC 8259 JSON compliance. |
| **72** | **Compliance Testing** | B. Non-Functional | ⚡ Browser | Audits Privacy Policy links, Terms, and cookie consent banners. |
| **73** | **Documentation Testing** | B. Non-Functional | ⚡ Browser | Verifies markdown headings, code sample blocks, and API docs. |
| **74** | **ADA / Section 508 Testing** | B. Non-Functional | ⚡ Browser | Checks "Skip to Content" links and main landmarks for accessibility. |
| **75** | **Security Posture Audit** | C. Security | 🖥️ Backend | Scans security headers and SSL to compute a posture grade (A+ to F). |
| **76** | **Vulnerability Scanning** | C. Security | 🖥️ Backend | Probes for exposed `.env`, `.git/HEAD`, and backup files. |
| **77** | **Penetration Testing** | C. Security | 🖥️ Backend | Tests for unescaped canary reflections in query parameters. |
| **78** | **Authentication Testing** | C. Security | ⚡ Browser | Asserts HTTPS endpoints, HTTP POST method, and password masking. |
| **79** | **Authorization Testing** | C. Security | 🖥️ Backend | Checks whether private routes block unauthenticated access (401/403). |
| **80** | **SQL Injection Testing (SQLi)**| C. Security | 🖥️ Backend | Detects SQL injection signatures and unescaped concatenation. |
| **81** | **Cross-Site Scripting (XSS)** | C. Security | ⚡ Browser | Tests HTML entity escaping against canary script injections. |
| **82** | **CSRF Defense Testing** | C. Security | ⚡ Browser | Inspects state-changing forms for anti-CSRF synchronizer tokens. |
| **83** | **Misconfiguration Testing** | C. Security | 🖥️ Backend | Detects server and framework disclosure headers. |
| **84** | **Data Protection Testing** | C. Security | ⚡ Browser | Scans for exposed credit cards (PCI-DSS) and production API keys. |
| **85** | **Session Management** | C. Security | ⚡ Browser | Audits cookie flags: HttpOnly, Secure, and SameSite=Strict/Lax. |
| **86** | **Input Validation Testing** | C. Security | ⚡ Browser | Injects null bytes and overlong strings to verify safe rejection. |
| **87** | **TLS / SSL Testing** | C. Security | 🖥️ Backend | Connects via raw TLS socket to inspect certificates, cipher, and expiry. |
| **88** | **Security Headers Testing** | C. Security | 🖥️ Backend | Audits HSTS, CSP, X-Frame-Options, and X-Content-Type-Options. |
| **89** | **CORS Security Testing** | C. Security | 🖥️ Backend | Flags dangerous combinations of `Origin: *` with credentials. |
| **90** | **CSP Policy Testing** | C. Security | ⚡ Browser | Audits CSP directives for unsafe-inline, unsafe-eval, and wildcards. |
| **91** | **Clickjacking Testing** | C. Security | 🖥️ Backend | Verifies X-Frame-Options (DENY/SAMEORIGIN) and frame-ancestors. |
| **92** | **Sensitive Data Exposure** | C. Security | ⚡ Browser | Scans for hardcoded private keys and JWT authentication tokens. |
| **93** | **Server Info Disclosure** | C. Security | 🖥️ Backend | Audits server headers disclosing exact software version numbers. |
| **94** | **Subresource Integrity (SRI)**| C. Security | ⚡ Browser | Verifies sha384/sha512 integrity hashes on CDN script tags. |
| **95** | **Mixed Content Testing** | C. Security | ⚡ Browser | Scans HTTPS page markup for unencrypted `http://` assets. |
| **96** | **Cryptographic Storage** | C. Security | ⚡ Browser | Audits web storage keys to prevent plaintext credential storage. |
| **97** | **Website Availability** | D. Web-Specific | 🖥️ Backend | Probes HTTP and HTTPS availability and response codes. |
| **98** | **HTTP Status Code Testing** | D. Web-Specific | 🖥️ Backend | Evaluates HTTP status codes and standard REST semantics. |
| **99** | **Redirect Chain Testing** | D. Web-Specific | 🖥️ Backend | Follows redirect hops and checks for infinite redirect loops. |
| **100** | **Page Load Time** | D. Web-Specific | 🖥️ Backend | High-precision benchmarking of network transit and page load. |
| **101** | **Page Size & Weight** | D. Web-Specific | 🖥️ Backend | Audits HTML document byte weight against performance budgets. |
| **102** | **Resource Count Testing** | D. Web-Specific | ⚡ Browser | Counts external scripts, stylesheets, and image assets. |
| **103** | **Script Quality Testing** | D. Web-Specific | ⚡ Browser | Audits inline scripts for eval() calls and document.write(). |
| **104** | **Console Error Testing** | D. Web-Specific | ⚡ Browser | Scans for console.error sinks and debug logging in markup. |
| **105** | **HTML Validation Testing** | D. Web-Specific | ⚡ Browser | Audits HTML5 doctype and duplicate element IDs. |
| **106** | **CSS Validation Testing** | D. Web-Specific | ⚡ Browser | Analyzes CSS rules and excessive !important declarations. |
| **107** | **SEO Technical Testing** | D. Web-Specific | ⚡ Browser | Audits title length (10-70), meta description, canonical, and OG tags. |
| **108** | **Sitemap Testing** | D. Web-Specific | 🖥️ Backend | Fetches and validates sitemap.xml syntax and URL count. |
| **109** | **Robots.txt Testing** | D. Web-Specific | 🖥️ Backend | Parses user-agent directives and checks for unintended Disallow: /. |
| **110** | **Structured Data Testing** | D. Web-Specific | ⚡ Browser | Validates Schema.org JSON-LD scripts and @type definitions. |
| **111** | **Page Indexability** | D. Web-Specific | ⚡ Browser | Checks for noindex/nofollow directives in robots meta tags. |
| **112** | **Broken Links Testing** | D. Web-Specific | 🖥️ Backend | Probes link lists and flags 404 Not Found or connection errors. |
| **113** | **Broken Images Testing** | D. Web-Specific | 🖥️ Backend | Probes image URLs and confirms HTTP 200 OK asset delivery. |
| **114** | **Favicon Testing** | D. Web-Specific | ⚡ Browser | Audits standard favicon and Apple Touch Icon link declarations. |
| **115** | **Social Preview Testing** | D. Web-Specific | ⚡ Browser | Displays live social share preview cards for Twitter, Facebook, etc. |
| **116** | **Cookie Security Testing** | D. Web-Specific | ⚡ Browser | Audits Secure, HttpOnly, and SameSite attributes on cookies. |
| **117** | **CORS Configuration** | D. Web-Specific | 🖥️ Backend | Probes preflight OPTIONS responses and cross-origin permissions. |
| **118** | **Asset Compression** | D. Web-Specific | 🖥️ Backend | Verifies gzip/brotli compression headers and bandwidth savings. |
| **119** | **Browser Caching Testing** | D. Web-Specific | 🖥️ Backend | Audits Cache-Control max-age and ETag validation headers. |
| **120** | **DNS Configuration** | D. Web-Specific | 🖥️ Backend | Resolves A, AAAA, MX, TXT, NS records using Node.js dns.promises. |
| **121** | **CDN Delivery Testing** | D. Web-Specific | 🖥️ Backend | Analyzes edge headers (cf-ray, x-amz-cf-id) to identify CDN delivery. |
| **122** | **Mobile Viewport Testing** | D. Web-Specific | ⚡ Browser | Audits meta viewport for width=device-width and zoomability. |
| **123** | **Touch Targets Testing** | D. Web-Specific | ⚡ Browser | Audits interactive buttons to ensure minimum 44x44px touch sizes. |
| **124** | **Print Stylesheet Testing** | D. Web-Specific | ⚡ Browser | Checks for @media print stylesheets to optimize printed pages. |
| **125** | **Third-Party Script Testing**| D. Web-Specific | ⚡ Browser | Detects and categorizes Google Analytics, Segment, and Facebook trackers. |
| **126** | **PWA Manifest Testing** | E. Specialized | ⚡ Browser | Validates manifest.json fields (name, icons, display: standalone). |
| **127** | **Service Worker Testing** | E. Specialized | ⚡ Browser | Audits service worker install and fetch caching lifecycle events. |
| **128** | **Offline Readiness** | E. Specialized | ⚡ Browser | Checks for custom offline.html fallback views. |
| **129** | **WebSocket Testing** | E. Specialized | ⚡ Browser | Connects to WebSocket URLs (wss://) and measures echo roundtrip latency. |
| **130** | **Web Storage Testing** | E. Specialized | ⚡ Browser | Tests localStorage and sessionStorage read/write quotas and availability. |
| **131** | **Browser History Testing** | E. Specialized | ⚡ Browser | Checks HTML5 History API (pushState) support for client-side routing. |
| **132** | **File Upload Testing** | E. Specialized | ⚡ Browser | Audits input[type="file"] fields, accept MIME restrictions, and multiple files. |
| **133** | **Deep Linking Testing** | E. Specialized | ⚡ Browser | Verifies that deep URL paths, fragments, and queries parse cleanly. |
| **134** | **Dark Mode Testing** | E. Specialized | ⚡ Browser | Audits @media (prefers-color-scheme: dark) rules and CSS variables. |
| **135** | **Reduced Motion Testing** | E. Specialized | ⚡ Browser | Audits @media (prefers-reduced-motion: reduce) for vestibular safety. |
| **136** | **Font Loading Testing** | E. Specialized | ⚡ Browser | Checks for font-display: swap in @font-face rules to prevent FOIT. |
| **137** | **Core Web Vitals Testing** | E. Specialized | ⚡ Browser | Benchmarks LCP (<= 2.5s), INP (<= 200ms), and CLS (<= 0.1) thresholds. |
| **138** | **Lazy Loading Testing** | E. Specialized | ⚡ Browser | Audits native loading="lazy" attribute on below-the-fold images. |
| **139** | **Third-Party Integrations** | E. Specialized | ⚡ Browser | Audits active external SDKs (Stripe, Sentry, PayPal). |
| **140** | **Favicon Multi-Platform** | E. Specialized | ⚡ Browser | Validates vector SVG, PNG, and Apple Touch Icon coverage. |
| **141** | **Social Metadata Testing** | E. Specialized | ⚡ Browser | Validates OpenGraph images (1200x630) and Twitter Card tags. |
| **142** | **Multi-Tab Synchronization**| E. Specialized | ⚡ Browser | Tests BroadcastChannel API for real-time cross-tab synchronization. |
| **143** | **Orientation & Sensors** | E. Specialized | ⚡ Browser | Evaluates screen orientation profiles and device sensor APIs. |
| **144** | **Payment Request API** | E. Specialized | ⚡ Browser | Probes browser PaymentRequest API for Apple Pay / Google Pay. |
| **145** | **Web Share API Testing** | E. Specialized | ⚡ Browser | Checks navigator.share support for native mobile share sheets. |
| **146** | **Clipboard API Testing** | E. Specialized | ⚡ Browser | Tests asynchronous navigator.clipboard write and read capabilities. |
| **147** | **Full Screen API Testing** | E. Specialized | ⚡ Browser | Verifies requestFullscreen and exitFullscreen support. |
| **148** | **Battery Status API** | E. Specialized | ⚡ Browser | Probes navigator.getBattery for device power levels and battery drain adaptation. |

---

## 🛠️ Automated Verification Suite

Run all verification test suites locally:
```bash
npm test            # Validates all 148 tools, schemas, and execution handlers
npm run test:backend # Tests Express REST APIs (DNS, TLS, Load, Database)
npm run test:e2e    # Tests production E2E benchmark scenarios
```

---

## 📄 License
MIT License - Open Source QA Testing Engine.
