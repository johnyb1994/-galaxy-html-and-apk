const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9223',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=433,915',
  '--user-data-dir=' + path.resolve('.chrome-temp-profile-test')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  try {
    await wait(2500);

    const res = await fetch('http://127.0.0.1:9223/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
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
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('[CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
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

    console.log('Page connected. Waiting for boot...');
    await wait(2000);

    // 1. Open Settings -> Test Lab
    console.log('Opening Settings...');
    await send('Runtime.evaluate', { expression: `document.getElementById("btn-show-settings").click()` });
    await wait(400);

    console.log('Launching Test Lab...');
    await send('Runtime.evaluate', { expression: `document.getElementById("btn-show-test-lab").click()` });

    // Wait 1.5s for boss to spawn and enter
    await wait(1500);

    // Check boss state and bullets in game
    const state1 = await send('Runtime.evaluate', {
      expression: `JSON.stringify((function() {
        var g = window.w ? window.w.G : null;
        if (!g) return { error: 'No G' };
        var boss = g.activeBoss;
        var bullets = g.bullets || [];
        var enemyBullets = bullets.filter(b => b.enemy && b.alive);
        var playerBullets = bullets.filter(b => !b.enemy && b.alive);
        return {
          wave: g.wave,
          bossMode: g.bossMode,
          hasBoss: !!boss,
          bossName: boss ? boss.name : null,
          bossPat: boss ? boss.pat : null,
          bossX: boss ? boss.x : null,
          bossY: boss ? boss.y : null,
          bossShoots: boss ? boss.shoots : null,
          bossShotCd: boss ? boss.shotCd : null,
          totalBullets: bullets.length,
          aliveEnemyBullets: enemyBullets.length,
          alivePlayerBullets: playerBullets.length,
          sampleEnemyBullets: enemyBullets.slice(0, 5).map(b => ({
            x: Math.round(b.x),
            y: Math.round(b.y),
            vx: b.vx.toFixed(2),
            vy: b.vy.toFixed(2),
            clr: b.color || b.c,
            rad: b.rad || b.r
          }))
        };
      })())`
    });
    console.log('State at 1.5s:', state1.result.result.value);

    // Capture Screenshot 1
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('testlab_1.5s.png', Buffer.from(ss1.result.data, 'base64'));
    console.log('Saved testlab_1.5s.png');

    // Wait another 2 seconds
    await wait(2000);

    const state2 = await send('Runtime.evaluate', {
      expression: `JSON.stringify((function() {
        var g = window.w ? window.w.G : null;
        if (!g) return { error: 'No G' };
        var boss = g.activeBoss;
        var bullets = g.bullets || [];
        var enemyBullets = bullets.filter(b => b.enemy && b.alive);
        return {
          bossY: boss ? Math.round(boss.y) : null,
          bossTimer: boss ? Math.round(boss.timer) : null,
          aliveEnemyBullets: enemyBullets.length,
          sampleEnemyBullets: enemyBullets.slice(0, 8).map(b => ({
            x: Math.round(b.x),
            y: Math.round(b.y),
            vx: b.vx.toFixed(2),
            vy: b.vy.toFixed(2),
            clr: b.color || b.c
          }))
        };
      })())`
    });
    console.log('State at 3.5s:', state2.result.result.value);

    // Capture Screenshot 2
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('testlab_3.5s.png', Buffer.from(ss2.result.data, 'base64'));
    console.log('Saved testlab_3.5s.png');

    // Wait another 2.5 seconds (around special attack)
    await wait(2500);
    const ss3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('testlab_6.0s.png', Buffer.from(ss3.result.data, 'base64'));
    console.log('Saved testlab_6.0s.png');

    // Check bullet render loop in render.js or engine.js!
    const renderCheck = await send('Runtime.evaluate', {
      expression: `JSON.stringify((function() {
        var g = window.w ? window.w.G : null;
        if (!g) return {};
        var enemyBullets = (g.bullets || []).filter(b => b.enemy && b.alive);
        // Check if bullets have custom shapes or if render loop draws them
        return {
          totalAliveEnemy: enemyBullets.length,
          firstBullet: enemyBullets[0] || null
        };
      })())`
    });
    console.log('Render check at 6s:', renderCheck.result.result.value);

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    try { chromeProc.kill(); } catch (e) {}
    process.exit(0);
  }
}

main();
