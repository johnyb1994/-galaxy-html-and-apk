const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const profileDir = path.resolve('.chrome-profile-validate');
  const port = 9228;

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
    await wait(1500);

    // Open Settings -> Test Lab
    console.log('Launching Test Lab...');
    await send('Runtime.evaluate', { expression: `document.getElementById("btn-show-settings").click()` });
    await wait(200);
    await send('Runtime.evaluate', { expression: `document.getElementById("btn-show-test-lab").click()` });

    // Minimize Dev Diagnostics so it doesn't block the screen view of the boss and bullets
    await wait(600);
    await send('Runtime.evaluate', { expression: `(function() {
      // Minimize dev diag panel
      var devPanel = document.getElementById("dev-diag-panel");
      if (devPanel) {
        var minBtn = devPanel.querySelector("button");
        if (minBtn) minBtn.click();
      }
      // Minimize Test Lab dock so the entire bullet patterns are fully visible
      var minDockBtn = document.getElementById("tl-btn-min");
      if (minDockBtn) minDockBtn.click();
    })()` });

    console.log('Watching Boss 9 bullet patterns...');
    let shotIndex = 0;
    for (let t = 0; t < 25; t++) {
      await wait(350);
      const evalRes = await send('Runtime.evaluate', {
        expression: `JSON.stringify((function() {
          var g = window.w ? window.w.G : null;
          if (!g) return { error: 'no G' };
          var b = (g.bullets || []).filter(x => x.enemy && x.alive);
          var boss = g.activeBoss;
          return {
            bossY: boss ? Math.round(boss.y) : null,
            bossCharge: boss ? Math.round(boss.chargeTimer) : null,
            eBullets: b.length,
            sample: b.slice(0, 5).map(x => ({ x: Math.round(x.x), y: Math.round(x.y), vx: x.vx.toFixed(1), vy: x.vy.toFixed(1), clr: x.eClr || x.color }))
          };
        })())`
      });

      const info = JSON.parse(evalRes.result.result.value);
      console.log(`t=${(t*0.35).toFixed(2)}s, BossY=${info.bossY}, eBullets=${info.eBullets}`);

      if (info.eBullets >= 20 && shotIndex < 4) {
        shotIndex++;
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        const fn = `boss9_spiral_validation_${shotIndex}.png`;
        fs.writeFileSync(fn, Buffer.from(ss.result.data, 'base64'));
        console.log(`📸 SAVED VALIDATION SCREENSHOT: ${fn} (Active Enemy Bullets: ${info.eBullets})`);
      }
    }

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    try { chromeProc.kill(); } catch (e) {}
  }
}

main();
