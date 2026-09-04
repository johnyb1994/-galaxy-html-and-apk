const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function captureSession(modeName, setupFn, captureFramesCount, outPrefix) {
  const profileDir = path.resolve('.chrome-profile-' + modeName);
  const port = modeName === 'real' ? 9225 : 9226;

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=' + port,
    '--disable-gpu',
    '--window-size=433,915',
    '--user-data-dir=' + profileDir
  ]);

  try {
    await wait(2200);
    const res = await fetch(`http://127.0.0.1:${port}/json/new?` + encodeURIComponent(fileUrl), { method: 'PUT' });
    const page = await res.json();
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    let msgId = 1;
    const pending = new Map();

    ws.on('message', (raw) => {
      const data = JSON.parse(raw.toString());
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
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
    await wait(1800);

    // Run setup
    await send('Runtime.evaluate', { expression: setupFn });
    console.log(`[${modeName}] Setup executed. Waiting for boss firing...`);

    // Poll until activeBoss is in position (y > 100) and bullets are fired
    let captured = 0;
    for (let t = 0; t < 20; t++) {
      await wait(400);
      const evalRes = await send('Runtime.evaluate', {
        expression: `JSON.stringify((function() {
          var g = window.w ? window.w.G : null;
          if (!g) return { hasG: false };
          var b = (g.bullets || []).filter(x => x.enemy && x.alive);
          return {
            hasG: true,
            running: g.running,
            wave: g.wave,
            bossY: g.activeBoss ? Math.round(g.activeBoss.y) : null,
            eBullets: b.length,
            details: b.slice(0, 3).map(x => ({ x: Math.round(x.x), y: Math.round(x.y), vx: x.vx.toFixed(1), vy: x.vy.toFixed(1), clr: x.color }))
          };
        })())`
      });

      const info = JSON.parse(evalRes.result.result.value);
      console.log(`[${modeName}] t=${(t*0.4).toFixed(1)}s:`, JSON.stringify(info));

      if (info.eBullets > 0 && captured < captureFramesCount) {
        captured++;
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        const fn = `${outPrefix}_firing_${captured}.png`;
        fs.writeFileSync(fn, Buffer.from(ss.result.data, 'base64'));
        console.log(`📸 [${modeName}] Saved screenshot: ${fn} (bullets: ${info.eBullets})`);
        if (captured >= captureFramesCount) break;
      }
    }

    ws.close();
  } catch (err) {
    console.error(`[${modeName}] Error:`, err);
  } finally {
    try { chromeProc.kill(); } catch (e) {}
  }
}

async function main() {
  console.log('=== RUNNING REAL GAME BOSS MODE WAVE 27 ===');
  // Setup real game in boss mode at wave 27
  await captureSession('real', `(function() {
    window.et = window.et || {};
    window.et.bossMode = true;
    window.et.insanity = false;
    // Launch normal game
    document.getElementById("btn-start").click();
    setTimeout(function() {
      var g = window.w ? window.w.G : null;
      if (g) {
        g.bossMode = true;
        g.wave = 27; // Boss 9
        // God mode so ship doesn't die while observing
        g.godMode = true;
        g.hp = 9999;
        g.maxhp = 9999;
        g.iTimer = 999999999;
        // Move ship to bottom corner so it does not block bullets
        g.px = 40;
        g.py = 820;
        if (window.Bv) window.Bv(27, al);
      }
    }, 150);
  })()`, 3, 'real_boss9');

  console.log('=== RUNNING TEST LAB ===');
  // Setup test lab
  await captureSession('testlab', `(function() {
    document.getElementById("btn-show-settings").click();
    setTimeout(function() {
      document.getElementById("btn-show-test-lab").click();
      setTimeout(function() {
        var g = window.w ? window.w.G : null;
        if (g) {
          // Move ship to bottom corner so it does not block bullets
          g.px = 40;
          g.py = 820;
        }
      }, 200);
    }, 300);
  })()`, 3, 'testlab_boss9');

  console.log('=== COMPARISON SESSIONS COMPLETE ===');
}

main();
