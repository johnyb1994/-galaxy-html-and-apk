const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9229',
  '--disable-gpu',
  '--window-size=433,915',
  '--user-data-dir=' + path.resolve('.chrome-clean-view')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  try {
    await wait(2500);
    const res = await fetch('http://127.0.0.1:9229/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
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

    await wait(2000);
    // Launch Test Lab
    await send('Runtime.evaluate', { expression: 'document.getElementById("btn-show-settings").click()' });
    await wait(300);
    await send('Runtime.evaluate', { expression: 'document.getElementById("btn-show-test-lab").click()' });
    await wait(500);

    // Minimize Dev Diagnostics and Test Lab dock
    await send('Runtime.evaluate', { expression: `(function() {
      var devToggle = document.getElementById("dev-toggle-btn");
      if (devToggle && devToggle.textContent.includes("MINIMIZE")) devToggle.click();
      var tlMin = document.getElementById("tl-btn-min");
      if (tlMin && tlMin.textContent.includes("MIN")) tlMin.click();
    })()` });

    // Wait until Boss 9 descends and fires spiral patterns
    let captures = 0;
    for (let i = 0; i < 20; i++) {
      await wait(400);
      const r = await send('Runtime.evaluate', {
        expression: `JSON.stringify((function() {
          var g = window.w ? window.w.G : null;
          if (!g) return { bullets: 0 };
          var eb = (g.bullets || []).filter(b => b.enemy && b.alive);
          return {
            bullets: eb.length,
            bossY: g.activeBoss ? Math.round(g.activeBoss.y) : 0
          };
        })())`
      });

      const st = JSON.parse(r.result.result.value);
      console.log(`t=${(i*0.4+0.4).toFixed(1)}s: BossY=${st.bossY}, Enemy Bullets=${st.bullets}`);

      if (st.bullets >= 20 && captures < 3) {
        captures++;
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        const targetPath = `c:/Users/ACER/.gemini/antigravity/brain/6929f852-3731-4391-a88f-d4f039d9975f/boss9_clean_bullet_spiral_${captures}.png`;
        fs.writeFileSync(targetPath, Buffer.from(ss.result.data, 'base64'));
        // Also save locally in galaxy_apk
        fs.writeFileSync(`boss9_clean_view_${captures}.png`, Buffer.from(ss.result.data, 'base64'));
        console.log(`📸 SAVED CLEAN VIEW SCREENSHOT #${captures}: ${targetPath}`);
      }
    }

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    try { chromeProc.kill(); } catch (e) {}
    process.exit(0);
  }
}

main();
