const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9235',
  '--disable-gpu',
  '--window-size=433,915',
  '--user-data-dir=' + path.resolve('.chrome-measure-detailed')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await wait(2500);
  const res = await fetch('http://127.0.0.1:9235/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
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
  await wait(2500);

  // Close dev diagnostics
  await send('Runtime.evaluate', {
    expression: `(function() {
      var d = document.getElementById("dev-close-btn");
      if (d) d.click();
      var p = document.getElementById("dev-diag-panel");
      if (p) p.style.display = "none";
    })()`
  });
  await wait(300);

  // Click start
  await send('Runtime.evaluate', {
    expression: `(function() {
      var b = document.getElementById("btn-start");
      if (b) b.click();
    })()`
  });
  await wait(3000);

  const detailed = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function() {
      const boxes = Array.from(document.querySelectorAll(".eq-square")).map((b, i) => {
        const r = b.getBoundingClientRect();
        return { i, left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
      });
      const lvl = document.getElementById("lvl-lbl").getBoundingClientRect();
      const time = document.getElementById("time-wrap").getBoundingClientRect();
      const mid = document.querySelector(".hud-mid").getBoundingClientRect();
      const score = document.getElementById("score-row").getBoundingClientRect();
      const hi = document.getElementById("hi-row").getBoundingClientRect();
      const wave = document.getElementById("wave-lbl").getBoundingClientRect();
      return { boxes, lvl, time, mid, score, hi, wave };
    })(), null, 2)`
  });

  console.log(detailed?.result?.result?.value);
  await send('Page.close');
  ws.close();
  chromeProc.kill();
}
main().catch(console.error);
