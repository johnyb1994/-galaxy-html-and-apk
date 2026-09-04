const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9226',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + path.resolve('.chrome-layout-profile')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await wait(2000);
  try {
    const res = await fetch('http://127.0.0.1:9226/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
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

    // Inject the proposed candidate CSS to test interactively
    const injectRes = await send('Runtime.evaluate', {
      expression: `(function() {
        var style = document.createElement('style');
        style.id = 'test-hud-layout-override';
        style.textContent = \`
          #hud {
            grid-template-columns: 190px 105px 126px !important;
          }
          .hud-mid {
            width: 105px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            justify-self: center !important;
            position: relative !important;
          }
          #lvl-lbl {
            font-family: Cinzel, serif !important;
            font-size: 9.5px !important;
            color: #00e5ff !important;
            text-shadow: 0 0 8px rgba(0,229,255,.7) !important;
            font-weight: 700 !important;
            letter-spacing: 0.4px !important;
            white-space: nowrap !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            line-height: 1 !important;
          }
          #lost-xp-counter {
            display: none !important;
          }
          #time-wrap {
            position: relative !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 3.5px !important;
            margin-top: 8px !important;
          }
          #time-lbl {
            min-width: 32px !important;
            text-align: left !important;
          }
          #best-time-wrap {
            position: absolute !important;
            left: calc(100% + 4px) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            font-size: 8px !important;
            color: #ffaa00 !important;
            opacity: 0.9 !important;
            white-space: nowrap !important;
            pointer-events: none !important;
          }
          .hud-right {
            width: 126px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            margin-left: auto !important;
            padding: 2px 0 !important;
          }
          #wave-row {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: baseline !important;
            width: 100% !important;
          }
          #wave-lbl {
            display: inline-flex !important;
            justify-content: flex-end !important;
            align-items: baseline !important;
            gap: 5.5px !important;
            line-height: 1 !important;
          }
          .wave-title {
            font-family: Cinzel Decorative, serif !important;
            font-weight: 700 !important;
            font-size: 11px !important;
            letter-spacing: 0.5px !important;
            color: #00ffaa !important;
            flex-shrink: 0 !important;
          }
          .wave-val {
            font-family: Cinzel Decorative, serif !important;
            font-size: 13.5px !important;
            font-weight: 900 !important;
            color: #00ffaa !important;
            min-width: 22px !important;
            text-align: left !important;
            flex-shrink: 0 !important;
          }
          #hi-row {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: baseline !important;
            width: 100% !important;
            gap: 5.5px !important;
            white-space: nowrap !important;
          }
          #hi-lbl {
            font-family: Cinzel, serif !important;
            font-weight: 700 !important;
            font-size: 10px !important;
            letter-spacing: 0.3px !important;
            color: #fa0 !important;
            flex-shrink: 0 !important;
          }
          #hi-val {
            color: gold !important;
            font-weight: 700 !important;
            font-family: 'Outfit', sans-serif !important;
            font-size: 12px !important;
            font-variant-numeric: tabular-nums !important;
            text-align: right !important;
            letter-spacing: 0.2px !important;
            min-width: 62px !important;
            flex-shrink: 0 !important;
          }
          #score-row {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: baseline !important;
            width: 100% !important;
            gap: 5.5px !important;
            white-space: nowrap !important;
          }
          .score-title {
            font-family: Cinzel, serif !important;
            font-weight: 700 !important;
            font-size: 10.5px !important;
            color: orange !important;
            letter-spacing: 0.3px !important;
            flex-shrink: 0 !important;
          }
          #score-lbl {
            color: #fc2 !important;
            font-family: 'Outfit', sans-serif !important;
            font-size: 15px !important;
            font-weight: 800 !important;
            font-variant-numeric: tabular-nums !important;
            text-align: right !important;
            letter-spacing: 0.3px !important;
            text-shadow: 0 0 6px rgba(255,204,34,0.45) !important;
            min-width: 68px !important;
            flex-shrink: 0 !important;
          }
        \`;
        document.head.appendChild(style);
        return 'injected';
      })()`
    });

    console.log('Candidate CSS Injected:', injectRes.result.value);

    // Measure alignment and gaps in Stress state
    const evalStress = await send('Runtime.evaluate', {
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
            right: Math.round((r.right - wRect.left) * 100) / 100,
            centerX: Math.round(((r.left + r.right) / 2 - wRect.left) * 100) / 100
          };
        }

        // Apply stress values
        document.getElementById("hp-val").textContent = "150 / 150";
        document.getElementById("hp-fill").style.width = "100%";
        document.getElementById("xp-val").textContent = "9,999 / 9,999";
        document.getElementById("xp-fill").style.width = "100%";
        document.getElementById("lvl-val-text").textContent = "LVL 26";
        document.getElementById("score-lbl").textContent = "999,990";
        document.getElementById("hi-val").textContent = "1,000,000";
        document.getElementById("time-lbl").textContent = "14:59";
        var bt = document.getElementById("best-time-wrap");
        if (bt) {
          bt.style.display = "inline-block";
          document.getElementById("best-time-lbl").textContent = "14:59";
        }
        var waveLbl = document.getElementById("wave-lbl");
        waveLbl.innerHTML = '<span class="wave-title">WAVE</span><span class="wave-val">30</span>';

        return {
          hudMid: g(".hud-mid"),
          hudRight: g(".hud-right"),
          lvlLbl: g("#lvl-lbl"),
          timeWrap: g("#time-wrap"),
          timeLbl: g("#time-lbl"),
          bestTime: g("#best-time-wrap"),
          waveTitle: g(".wave-title"),
          waveVal: g(".wave-val"),
          waveGap: Math.round((g(".wave-val").x - g(".wave-title").right) * 100) / 100,
          scoreTitle: g(".score-title"),
          scoreLbl: g("#score-lbl"),
          scoreGap: Math.round((g("#score-lbl").x - g(".score-title").right) * 100) / 100,
          hiLbl: g("#hi-lbl"),
          hiVal: g("#hi-val"),
          hiGap: Math.round((g("#hi-val").x - g("#hi-lbl").right) * 100) / 100,
          spaceTimerToScore: Math.round((g(".score-title").x - g("#time-wrap").right) * 100) / 100,
          spaceTimerToHi: Math.round((g("#hi-lbl").x - g("#time-wrap").right) * 100) / 100,
          lvlToClockCenterDelta: Math.round(Math.abs(g("#lvl-lbl").centerX - g("#time-wrap").centerX) * 100) / 100
        };
      })()`,
      returnByValue: true
    });

    console.log('\nSTRESS MEASUREMENTS WITH CANDIDATE CSS:');
    console.log(JSON.stringify(evalStress.result.result.value, null, 2));

    // Capture screenshot of stress HUD with candidate CSS
    const ssStress = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: 433, height: 120, scale: 2 }
    });
    fs.writeFileSync('hud_candidate_stress.png', Buffer.from(ssStress.result.data, 'base64'));
    console.log('\n📸 Captured hud_candidate_stress.png');

    // Also test Normal gameplay state (LVL 1, Score 1,250, Wave 1, Time 0:02, PB hidden)
    const evalNorm = await send('Runtime.evaluate', {
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
            right: Math.round((r.right - wRect.left) * 100) / 100,
            centerX: Math.round(((r.left + r.right) / 2 - wRect.left) * 100) / 100
          };
        }

        document.getElementById("lvl-val-text").textContent = "LVL 1";
        document.getElementById("score-lbl").textContent = "1,250";
        document.getElementById("time-lbl").textContent = "0:02";
        var bt = document.getElementById("best-time-wrap");
        if (bt) bt.style.display = "none";
        var waveLbl = document.getElementById("wave-lbl");
        waveLbl.innerHTML = '<span class="wave-title">WAVE</span><span class="wave-val">1</span>';

        return {
          lvlLbl: g("#lvl-lbl"),
          timeWrap: g("#time-wrap"),
          scoreTitle: g(".score-title"),
          scoreLbl: g("#score-lbl"),
          scoreGap: Math.round((g("#score-lbl").x - g(".score-title").right) * 100) / 100,
          lvlToClockCenterDelta: Math.round(Math.abs(g("#lvl-lbl").centerX - g("#time-wrap").centerX) * 100) / 100
        };
      })()`,
      returnByValue: true
    });

    console.log('\nNORMAL MEASUREMENTS WITH CANDIDATE CSS:');
    console.log(JSON.stringify(evalNorm.result.result.value, null, 2));

    const ssNorm = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: 433, height: 120, scale: 2 }
    });
    fs.writeFileSync('hud_candidate_normal.png', Buffer.from(ssNorm.result.data, 'base64'));
    console.log('📸 Captured hud_candidate_normal.png');

    await ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chromeProc.kill();
  }
}

main();
