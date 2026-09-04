const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9230',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + path.resolve('.chrome-score-hi-align-profile')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await wait(2000);
  try {
    const res = await fetch('http://127.0.0.1:9230/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
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

    await wait(1500);

    // Test aligning score title finish line with HI finish line
    // And adding gap to FPS
    const testCss = await send('Runtime.evaluate', {
      expression: `(function() {
        var style = document.createElement('style');
        style.id = 'hud-score-hi-align-test';
        style.textContent = \`
          /* FPS gap from wave */
          #fps-lbl {
            display: inline-block !important;
            margin-right: 8px !important;
          }
          #wave-row {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: baseline !important;
            width: 100% !important;
          }

          /* Match number widths so HI and SCORE titles finish at the EXACT SAME vertical line */
          #hi-val {
            min-width: 72px !important;
            text-align: right !important;
            flex-shrink: 0 !important;
          }
          #score-lbl {
            min-width: 72px !important;
            text-align: right !important;
            flex-shrink: 0 !important;
          }
          #hi-row, #score-row {
            gap: 5.5px !important;
            justify-content: flex-end !important;
          }
        \`;
        document.head.appendChild(style);

        // Populate stress state
        document.getElementById("hp-val").textContent = "150 / 150";
        document.getElementById("xp-val").textContent = "9,999 / 9,999";
        document.getElementById("lvl-val-text").textContent = "LVL 26";
        document.getElementById("score-lbl").textContent = "999,990";
        document.getElementById("hi-val").textContent = "1,000,000";
        document.getElementById("time-lbl").textContent = "14:59";
        if (window.w && window.w.G) {
          window.w.G.bestCompletionTimeMs = 14 * 60 * 1000 + 59 * 1000;
        }
        var bt = document.getElementById("best-time-wrap");
        if (bt) {
          bt.style.display = "inline-block";
          document.getElementById("best-time-lbl").textContent = "14:59";
        }
        var waveLbl = document.getElementById("wave-lbl");
        waveLbl.innerHTML = '<span class="wave-title">WAVE</span><span class="wave-val">30</span>';
        var fpsLbl = document.getElementById("fps-lbl");
        if (fpsLbl) {
          fpsLbl.style.display = "inline-block";
          fpsLbl.textContent = "60 FPS";
        }
      })()`
    });

    await wait(200);

    const m = await send('Runtime.evaluate', {
      expression: `(function() {
        var wrap = document.getElementById("wrap");
        var wRect = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 };
        function g(sel) {
          var el = document.querySelector(sel);
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
        var scoreTitle = g(".score-title");
        var hiLbl = g("#hi-lbl");
        var fps = g("#fps-lbl");
        var waveLbl = g("#wave-lbl");
        return {
          scoreTitleRight: scoreTitle ? scoreTitle.right : null,
          hiLblRight: hiLbl ? hiLbl.right : null,
          alignDelta: (scoreTitle && hiLbl) ? Math.round(Math.abs(scoreTitle.right - hiLbl.right) * 100) / 100 : null,
          fpsRight: fps ? fps.right : null,
          waveLblLeft: waveLbl ? waveLbl.x : null,
          fpsToWaveGap: (fps && waveLbl) ? Math.round((waveLbl.x - fps.right) * 100) / 100 : null
        };
      })()`,
      returnByValue: true
    });

    console.log('ALIGNMENT & GAP METRICS:');
    console.log(JSON.stringify(m.result.result.value, null, 2));

    const ss = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: 433, height: 120, scale: 2 }
    });
    fs.writeFileSync('hud_align_test.png', Buffer.from(ss.result.data, 'base64'));
    console.log('📸 Saved: hud_align_test.png');

    await ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chromeProc.kill();
  }
}

main();
