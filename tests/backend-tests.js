const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'object' ? JSON.stringify(data) : data);
    }
    req.end();
  });
}

async function runBackendTests() {
  console.log('🚀 Launching VeriQ Backend Server for automated endpoint validation...');
  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3099' },
    stdio: 'pipe'
  });

  serverProcess.stderr.on('data', d => console.error(`[Server stderr] ${d}`));

  let serverStarted = false;
  serverProcess.stdout.on('data', d => {
    if (d.toString().includes('running on')) {
      serverStarted = true;
    }
  });

  // Wait for server to boot
  for (let i = 0; i < 20; i++) {
    if (serverStarted) break;
    await wait(200);
  }

  try {
    console.log('▶ Test 1: GET /api/health');
    const health = await request({
      hostname: '127.0.0.1',
      port: 3099,
      path: '/api/health',
      method: 'GET'
    });
    if (health.status !== 200 || health.data.status !== 'ok') {
      throw new Error(`Health check failed: ${JSON.stringify(health)}`);
    }
    console.log('  ✓ /api/health responded 200 OK with version ' + health.data.version);

    console.log('▶ Test 2: POST /api/database/test');
    const dbTest = await request({
      hostname: '127.0.0.1',
      port: 3099,
      path: '/api/database/test',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { query: 'SELECT id, username FROM users WHERE status = 1;' });
    if (dbTest.status !== 200 || !dbTest.data.valid) {
      throw new Error(`Database test failed: ${JSON.stringify(dbTest)}`);
    }
    console.log('  ✓ /api/database/test validated clean SQL query successfully');

    console.log('▶ Test 3: POST /api/net/dns (local/mock domain)');
    const dnsTest = await request({
      hostname: '127.0.0.1',
      port: 3099,
      path: '/api/net/dns',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { domain: 'localhost' });
    if (dnsTest.status !== 200) {
      throw new Error(`DNS endpoint failed: ${JSON.stringify(dnsTest)}`);
    }
    console.log('  ✓ /api/net/dns executed lookup successfully');

    console.log('🎉 ALL BACKEND API ENDPOINTS TESTED AND FUNCTIONING!');
  } finally {
    serverProcess.kill();
  }
}

runBackendTests().catch(err => {
  console.error('❌ Backend test error:', err);
  process.exit(1);
});
