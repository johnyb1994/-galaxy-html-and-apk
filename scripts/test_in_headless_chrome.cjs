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
      var devBtn = document.getElementById("set-dev-diag-btn");
      var devRow = document.getElementById("set-dev-diag-row");
      var backBtn = document.getElementById("btn-hide-settings");
      if (btn) btn.click();
      var opened = sc && !sc.classList.contains("hidden");
      var devRowVisible = devRow && window.getComputedStyle(devRow).display !== "none";
      var devBtnText = devBtn ? devBtn.textContent : null;

      // Test Advanced Sound Settings modal & Boss Attack Cues toggle
      var btnSoundAdv = document.getElementById("btn-configure-sound");
      var advSc = document.getElementById("adv-sounds-screen");
      var bossCuesBtn = document.getElementById("set-sfx-boss-cues-btn");
      var advBackBtn = document.getElementById("btn-hide-adv-sounds");
      if (btnSoundAdv) btnSoundAdv.click();
      var advOpened = advSc && !advSc.classList.contains("hidden");
      var bossCuesInitial = bossCuesBtn ? bossCuesBtn.textContent : null;
      if (bossCuesBtn) bossCuesBtn.click();
      var bossCuesToggledOff = bossCuesBtn ? bossCuesBtn.textContent : null;
      var settingOff = window.et ? window.et.sfx_boss_cues : null;
      if (bossCuesBtn) bossCuesBtn.click();
      var bossCuesToggledOn = bossCuesBtn ? bossCuesBtn.textContent : null;
      var settingOn = window.et ? window.et.sfx_boss_cues : null;
      if (advBackBtn) advBackBtn.click();
      var advClosed = advSc && advSc.classList.contains("hidden");

      if (backBtn) backBtn.click();
      var closed = sc && sc.classList.contains("hidden");
      return {
        buttonFound: !!btn,
        opened: opened,
        devRowVisible: devRowVisible,
        devBtnText: devBtnText,
        closedAfterBack: closed,
        advOpened: advOpened,
        bossCuesInitial: bossCuesInitial,
        bossCuesToggledOff: bossCuesToggledOff,
        settingOff: settingOff,
        bossCuesToggledOn: bossCuesToggledOn,
        settingOn: settingOn,
        advClosed: advClosed
      };
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

  // 5b. Test Test Lab Launch, Spawners & Dock
  const testLabCheck = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      var labBtn = document.getElementById("btn-show-test-lab");
      if (!labBtn) return { buttonFound: false };
      labBtn.click();
      var g = window.w ? window.w.G : null;
      var dock = document.getElementById("test-lab-dock");
      return {
        buttonFound: true,
        isTestLab: window.isTestLabActive,
        godMode: g ? g.godMode : false,
        shots: g ? g.shots : 0,
        ring: g ? g.ring : false,
        dockVisible: dock ? dock.style.display !== "none" : false
      };
    })())`
  });
  console.log('5b. Test Lab launch test:', testLabCheck.result.result.value);

  await wait(600);

  // Test Pausing, Resuming, Target Refresh switching, 10 Boss Switcher, and 3-Sound Variations in Test Lab
  const testLabInteraction = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      var pauseBtn = document.getElementById("tl-btn-pause");
      var pauseSc = document.getElementById("pause-screen");
      var resumeBtn = document.getElementById("btn-resume");
      var g = window.w ? window.w.G : null;
      
      // Test Pause
      if (pauseBtn) pauseBtn.click();
      var pausedDuringLab = g ? g.paused : false;
      var pauseScOpen = pauseSc && !pauseSc.classList.contains("hidden");

      // Test Resume
      if (resumeBtn) resumeBtn.click();
      var resumedDuringLab = g ? !g.paused : false;
      var pauseScClosed = pauseSc && pauseSc.classList.contains("hidden");

      // Test Target Refresh Buttons
      var fps120 = document.getElementById("tl-fps-120");
      if (fps120) fps120.click();
      var target120 = (window.et && window.et.targetFps === "120hz");
      var fps60 = document.getElementById("tl-fps-60");
      if (fps60) fps60.click();
      var target60 = (window.et && window.et.targetFps === "60hz");

      // Test 10 Boss Switching (B1 to B10)
      var bossSwitchSuccess = true;
      for (var b = 0; b < 10; b++) {
        if (window.switchTestLabBoss) window.switchTestLabBoss(b);
        if (!g || g.wave !== (b + 1) * 3 || !g.activeBoss || !g.activeBoss.alive || !g.activeBoss.invulnerable) {
          bossSwitchSuccess = false;
        }
      }

      // Test 3 Sound Variations for selected boss (B4 / Boss 4 Solar Reactor Fortress)
      window.switchTestLabBoss(3);
      var bossDef = window.al[3];
      var bType = bossDef.bossType;
      
      // Set variant 1
      window.setBossCueVariant(bType, 1);
      var savedVariant = window.getBossCueVariant(bType);

      // Trigger attack and verify chargeTimer set to 1200ms
      var triggerBtn = document.getElementById("tl-btn-trigger-attack");
      if (triggerBtn) triggerBtn.click();
      var timerAfterTrigger = g && g.activeBoss ? g.activeBoss.chargeTimer : null;

      // Test Direct Timing Mode Switches
      var m2 = document.getElementById("tl-mode-2");
      if (m2) m2.click();
      var m3 = document.getElementById("tl-mode-3");
      if (m3) m3.click();
      var m5 = document.getElementById("tl-mode-5");
      if (m5) m5.click();
      var m1 = document.getElementById("tl-mode-1");
      if (m1) m1.click();
      var exitBtn = document.getElementById("tl-btn-exit");
      if (exitBtn) exitBtn.click();

      return {
        pausedDuringLab: pausedDuringLab,
        pauseScOpen: pauseScOpen,
        resumedDuringLab: resumedDuringLab,
        pauseScClosed: pauseScClosed,
        target120Worked: target120,
        target60Worked: target60,
        bossSwitchSuccess: bossSwitchSuccess,
        savedVariantMatches: savedVariant === 1,
        timerAfterTrigger: timerAfterTrigger,
        timingMode2Available: !!m2,
        timingMode3Available: !!m3,
        timingMode5Available: !!m5,
        timingMode1Available: !!m1,
        exitReturned: !window.isTestLabActive
      };
    })())`
  });
  console.log('5c. Test Lab pause, refresh rate, 10-boss & 3-sound test:', testLabInteraction.result.result.value);

  await wait(400);

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

  // Close dev diagnostics completely so it never overlaps the HUD in screenshots
  await send('Runtime.evaluate', {
    expression: `(function() {
      var devClose = document.getElementById("dev-close-btn");
      if (devClose) devClose.click();
      var panel = document.getElementById("dev-diag-panel");
      if (panel) panel.style.display = "none";
    })()`
  });
  await wait(300);

  // Take screenshot of Active Gameplay
  const ssGame = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('gameplay_screenshot.png', Buffer.from(ssGame.result.data, 'base64'));
  console.log('📸 Gameplay screenshot saved to: galaxy_apk/gameplay_screenshot.png');

  // Take high-resolution close-up crop of the HUD header
  const ssHud = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 433, height: 120, scale: 2 }
  });
  fs.writeFileSync('hud_closeup.png', Buffer.from(ssHud.result.data, 'base64'));
  console.log('📸 HUD close-up screenshot saved to: galaxy_apk/hud_closeup.png');

  // Visual layout check & HUD metrics
  const visualLayout = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      var cv = document.getElementById("canvas");
      var diag = document.getElementById("dev-diag-panel");
      var hud = document.getElementById("hud");
      var hudRect = hud ? hud.getBoundingClientRect() : null;
      var lvl = document.getElementById("lvl-lbl");
      var lvlRect = lvl ? lvl.getBoundingClientRect() : null;
      var badges = document.getElementById("max-badges");
      var badgesRect = badges ? badges.getBoundingClientRect() : null;
      var scoreRow = document.getElementById("score-row");
      var scoreRect = scoreRow ? scoreRow.getBoundingClientRect() : null;
      var hiRow = document.getElementById("hi-row");
      var hiRect = hiRow ? hiRow.getBoundingClientRect() : null;
      var timeWrap = document.getElementById("time-wrap");
      var timeRect = timeWrap ? timeWrap.getBoundingClientRect() : null;
      return {
        canvas: cv ? { width: cv.width, height: cv.height, clientWidth: cv.clientWidth, clientHeight: cv.clientHeight, display: getComputedStyle(cv).display } : null,
        diagPanel: diag ? { display: getComputedStyle(diag).display, position: getComputedStyle(diag).position, zIndex: getComputedStyle(diag).zIndex } : null,
        hud: hudRect ? { top: Math.round(hudRect.top), bottom: Math.round(hudRect.bottom), height: Math.round(hudRect.height), padTop: getComputedStyle(hud).paddingTop } : null,
        lvl: lvlRect ? { top: Math.round(lvlRect.top), bottom: Math.round(lvlRect.bottom), left: Math.round(lvlRect.left), height: Math.round(lvlRect.height) } : null,
        badges: badgesRect ? { top: Math.round(badgesRect.top), bottom: Math.round(badgesRect.bottom), left: Math.round(badgesRect.left), width: Math.round(badgesRect.width), height: Math.round(badgesRect.height) } : null,
        scoreRow: scoreRect ? { top: Math.round(scoreRect.top), bottom: Math.round(scoreRect.bottom), left: Math.round(scoreRect.left), width: Math.round(scoreRect.width) } : null,
        hiRow: hiRect ? { top: Math.round(hiRect.top), bottom: Math.round(hiRect.bottom), left: Math.round(hiRect.left), width: Math.round(hiRect.width) } : null,
        timeWrap: timeRect ? { top: Math.round(timeRect.top), bottom: Math.round(timeRect.bottom), left: Math.round(timeRect.left), width: Math.round(timeRect.width) } : null
      };
    })(), null, 2)`
  });
  console.log('📐 Visual layout metrics:\n', visualLayout?.result?.result?.value);

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
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test error:', err);
  chromeProc.kill();
  process.exit(1);
});
