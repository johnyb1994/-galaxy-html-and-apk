const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9233',
  '--disable-gpu',
  '--window-size=433,915',
  '--user-data-dir=' + path.resolve('.chrome-hud-measure')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await wait(2000);
  const res = await fetch('http://127.0.0.1:9233/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
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
  await wait(3000);

  // Click start
  await send('Runtime.evaluate', { expression: 'document.getElementById("btn-start").click()' });
  await wait(3000);

  const m = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      const hud = document.getElementById("hud");
      const r = hud.getBoundingClientRect();
      const cs = getComputedStyle(hud);
      const lvl = document.getElementById("lvl-lbl").getBoundingClientRect();
      const hp = document.querySelector(".hp-bar").getBoundingClientRect();
      const badges = document.getElementById("max-badges").getBoundingClientRect();
      const time = document.getElementById("time-wrap").getBoundingClientRect();
      const score = document.getElementById("score-row").getBoundingClientRect();
      const hi = document.getElementById("hi-row").getBoundingClientRect();
      const wave = document.getElementById("wave-lbl").getBoundingClientRect();
      return {
        hud: { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), padding: cs.padding },
        lvl: { top: Math.round(lvl.top), bottom: Math.round(lvl.bottom), left: Math.round(lvl.left), height: Math.round(lvl.height) },
        hp: { top: Math.round(hp.top), bottom: Math.round(hp.bottom), left: Math.round(hp.left), height: Math.round(hp.height) },
        badges: { top: Math.round(badges.top), bottom: Math.round(badges.bottom), left: Math.round(badges.left), width: Math.round(badges.width), height: Math.round(badges.height) },
        time: { top: Math.round(time.top), bottom: Math.round(time.bottom), left: Math.round(time.left), width: Math.round(time.width), height: Math.round(time.height) },
        score: { top: Math.round(score.top), bottom: Math.round(score.bottom), left: Math.round(score.left), width: Math.round(score.width), height: Math.round(score.height) },
        hi: { top: Math.round(hi.top), bottom: Math.round(hi.bottom), left: Math.round(hi.left), width: Math.round(hi.width), height: Math.round(hi.height) },
        wave: { top: Math.round(wave.top), bottom: Math.round(wave.bottom), left: Math.round(wave.left), width: Math.round(wave.width), height: Math.round(wave.height) }
      };
    })(), null, 2)`
  });

  console.log('MEASUREMENTS:\n', m.result.result.value);
  await send('Page.close');
  ws.close();
  chromeProc.kill();
}
main().catch(err => {
  console.error(err);
  chromeProc.kill();
  process.exit(1);
});
