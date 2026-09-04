const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9225',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + path.resolve('.chrome-inspect-profile')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await wait(2000);
  try {
    const res = await fetch('http://127.0.0.1:9225/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
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
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 433,
      height: 915,
      deviceScaleFactor: 1,
      mobile: true
    });

    await wait(2500);

    // Click LAUNCH
    await send('Runtime.evaluate', {
      expression: `(function() {
        var btn = document.getElementById("btn-start");
        if (btn) btn.click();
        var panel = document.getElementById("dev-diag-panel");
        if (panel) panel.style.display = "none";
      })()`
    });

    await wait(1000);

    // Inspect current layout measurements
    const current = await send('Runtime.evaluate', {
      expression: `(function() {
        var wrap = document.getElementById("wrap");
        var wRect = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 };
        function g(id) {
          var el = typeof id === 'string' ? document.querySelector(id) : id;
          if (!el) return null;
          var r = el.getBoundingClientRect();
          return {
            x: Math.round((r.left - wRect.left) * 100) / 100,
            y: Math.round((r.top - wRect.top) * 100) / 100,
            w: Math.round(r.width * 100) / 100,
            h: Math.round(r.height * 100) / 100,
            right: Math.round((r.right - wRect.left) * 100) / 100
          };
        }
        return {
          hudLeft: g(".hud-left"),
          hudMid: g(".hud-mid"),
          hudRight: g(".hud-right"),
          lvlLbl: g("#lvl-lbl"),
          timeWrap: g("#time-wrap"),
          timeLbl: g("#time-lbl"),
          bestTime: g("#best-time-wrap"),
          waveTitle: g(".wave-title"),
          waveVal: g(".wave-val"),
          scoreTitle: g(".score-title"),
          scoreLbl: g("#score-lbl"),
          hiLbl: g("#hi-lbl"),
          hiVal: g("#hi-val")
        };
      })()`,
      returnByValue: true
    });

    console.log('CURRENT LAYOUT MEASUREMENTS:');
    console.log(JSON.stringify(current.result.result.value, null, 2));

    await ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chromeProc.kill();
  }
}

main();
