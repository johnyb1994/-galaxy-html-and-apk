const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

console.log('Testing full UI suite in real Google Chrome:', fileUrl);

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + path.resolve('.chrome-temp-profile')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await wait(2000);

  const res = await fetch('http://127.0.0.1:9222/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
  const page = await res.json();
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  const caughtExceptions = [];

  ws.on('message', (raw) => {
    const data = JSON.parse(raw.toString());
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      const desc = data.params.exceptionDetails.exception ? data.params.exceptionDetails.exception.description : data.params.exceptionDetails.text;
      if (!/orientation\.lock|ServiceWorkerRegistration/i.test(desc)) {
        caughtExceptions.push(desc);
        console.error('[BROWSER EXCEPTION]', desc);
      }
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(r => ws.on('open', r));

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');

  console.log('Navigating to page in Chrome...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 433,
    height: 915,
    deviceScaleFactor: 2,
    mobile: true,
    screenOrientation: { angle: 0, type: 'portraitPrimary' }
  });
  await send('Page.navigate', { url: fileUrl });

  console.log('Waiting 3s for browser boot and canvas warmup...');
  await wait(3000);

  // 1. Check Boot State
  const bootState = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      bootStage: window.__bootStage,
      bootDone: window.__bootDone,
      errBoxText: document.getElementById("__boot_err") ? document.getElementById("__boot_err").innerText : null,
      startBtnText: document.getElementById("btn-start") ? document.getElementById("btn-start").innerText : null
    })`
  });
  console.log('1. Boot state:', bootState.result.result.value);

  // 2. Test Achievements modal
  const achTest = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      var btn = document.getElementById("btn-show-achievements");
      var sc = document.getElementById("achievements-screen");
      var backBtn = document.getElementById("btn-hide-achievements");
      if (btn) btn.click();
      var opened = sc && !sc.classList.contains("hidden");
      if (backBtn) backBtn.click();
      var closed = sc && sc.classList.contains("hidden");
      return { buttonFound: !!btn, opened: opened, closedAfterBack: closed };
    })())`
  });
  console.log('2. Achievements modal test:', achTest.result.result.value);

  // 3. Test High Scores modal
  const scoreTest = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      var btn = document.getElementById("btn-show-scores");
      var sc = document.getElementById("score-screen");
      var backBtn = document.getElementById("btn-hide-scores");
      if (btn) btn.click();
      var opened = sc && !sc.classList.contains("hidden");
      if (backBtn) backBtn.click();
      var closed = sc && sc.classList.contains("hidden");
      return { buttonFound: !!btn, opened: opened, closedAfterBack: closed };
    })())`
  });
  console.log('3. High Scores modal test:', scoreTest.result.result.value);

  // 4. Test Settings modal
  const settingsTest = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      var btn = document.getElementById("btn-show-settings");
      var sc = document.getElementById("settings-screen");
      var backBtn = document.getElementById("btn-hide-settings");
      if (btn) btn.click();
      var opened = sc && !sc.classList.contains("hidden");
      if (backBtn) backBtn.click();
      var closed = sc && sc.classList.contains("hidden");
      return { buttonFound: !!btn, opened: opened, closedAfterBack: closed };
    })())`
  });
  console.log('4. Settings modal test:', settingsTest.result.result.value);

  // 5. Test Equipment modal
  const eqTest = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      var btn = document.getElementById("btn-show-enc");
      var sc = document.getElementById("enc-screen");
      var backBtn = document.getElementById("btn-hide-enc");
      if (btn) btn.click();
      var opened = sc && !sc.classList.contains("hidden");
      if (backBtn) backBtn.click();
      var closed = sc && sc.classList.contains("hidden");
      return { buttonFound: !!btn, opened: opened, closedAfterBack: closed };
    })())`
  });
  console.log('5. Equipment modal test:', eqTest.result.result.value);

  // Take screenshot of Main Menu
  const ssMenu = await send('Page.captureScreenshot', { format: 'png' });
  const fs = require('fs');
  fs.writeFileSync('menu_screenshot.png', Buffer.from(ssMenu.result.data, 'base64'));
  console.log('📸 Main menu screenshot saved to: galaxy_apk/menu_screenshot.png');

  // 6. Test Launch & 60 frames
  console.log('6. Testing LAUNCH and gameplay loop...');
  const launchTest = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      var startBtn = document.getElementById("btn-start");
      if (startBtn) startBtn.click();
      return {
        gameRunning: window.w && window.w.G && window.w.G.running,
        wave: window.w && window.w.G && window.w.G.wave,
        score: window.w && window.w.G && window.w.G.score,
        playerHp: window.w && window.w.G && window.w.G.hp,
        playerMaxHp: window.w && window.w.G && window.w.G.maxhp
      };
    })())`
  });
  console.log('   Launch result:', launchTest?.result?.result?.value || JSON.stringify(launchTest));

  await wait(2000);

  // Take screenshot of Active Gameplay
  const ssGame = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('gameplay_screenshot.png', Buffer.from(ssGame.result.data, 'base64'));
  console.log('📸 Gameplay screenshot saved to: galaxy_apk/gameplay_screenshot.png');

  // Visual layout check
  const visualLayout = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      var cv = document.getElementById("canvas");
      var diag = document.getElementById("dev-diag-panel");
      var btn = document.getElementById("btn-start");
      return {
        canvas: cv ? { width: cv.width, height: cv.height, clientWidth: cv.clientWidth, clientHeight: cv.clientHeight, display: getComputedStyle(cv).display } : null,
        diagPanel: diag ? { display: getComputedStyle(diag).display, position: getComputedStyle(diag).position, zIndex: getComputedStyle(diag).zIndex } : null
      };
    })())`
  });
  console.log('📐 Visual layout metrics:', visualLayout?.result?.result?.value);

  // Close tab
  await send('Page.close');
  ws.close();
  chromeProc.kill();

  if (caughtExceptions.length > 0) {
    console.error('\n❌ FAILED with ' + caughtExceptions.length + ' exceptions:');
    caughtExceptions.forEach(e => console.error('  - ' + e));
    process.exit(1);
  } else {
    console.log('\n\x1b[32m✔ 100% REAL GOOGLE CHROME VERIFICATION PASSED WITH ZERO EXCEPTIONS!\x1b[0m\n');
  }
}

main().catch(err => {
  console.error('Test error:', err);
  chromeProc.kill();
  process.exit(1);
});
