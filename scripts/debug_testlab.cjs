const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--disable-gpu',
  '--window-size=433,915',
  '--user-data-dir=' + path.resolve('.chrome-temp-debug')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await wait(2500);
  const res = await fetch('http://127.0.0.1:9224/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
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
  console.log('Clicking Settings...');
  await send('Runtime.evaluate', { expression: 'document.getElementById("btn-show-settings").click()' });
  await wait(300);
  console.log('Clicking Test Lab...');
  await send('Runtime.evaluate', { expression: 'document.getElementById("btn-show-test-lab").click()' });

  for (let i = 0; i < 14; i++) {
    await wait(500);
    const r = await send('Runtime.evaluate', {
      expression: `JSON.stringify((function() {
        var g = window.w ? window.w.G : null;
        if (!g) return { t: ${(i*0.5+0.5).toFixed(1)}, noG: true };
        var boss = g.activeBoss;
        var bullets = g.bullets || [];
        var eBullets = bullets.filter(b => b.enemy && b.alive);
        return {
          t: ${(i*0.5+0.5).toFixed(1)},
          running: g.running,
          over: g.over,
          wave: g.wave,
          isTestLab: window.isTestLabActive,
          hasBoss: !!boss,
          bossY: boss ? Math.round(boss.y) : null,
          bossShotCd: boss ? Math.round(boss.shotCd) : null,
          eBullets: eBullets.length,
          sampleEnemyBullet: eBullets[0] ? { x: Math.round(eBullets[0].x), y: Math.round(eBullets[0].y), vx: eBullets[0].vx, vy: eBullets[0].vy, clr: eBullets[0].eClr || eBullets[0].color } : null
        };
      })())`
    });
    console.log('Tick:', r.result.result.value);

    const data = JSON.parse(r.result.result.value);
    // When bullets are flying, capture validation screenshots
    if (data.eBullets >= 15) {
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      const filename = `boss9_bullets_valid_t${data.t}s.png`;
      fs.writeFileSync(filename, Buffer.from(ss.result.data, 'base64'));
      console.log(`📸 Saved screenshot: ${filename} (Enemy bullets: ${data.eBullets})`);
    }
  }

  ws.close();
  chromeProc.kill();
  process.exit(0);
}
main();
