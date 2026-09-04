const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9231',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + path.resolve('.chrome-eq-fill-test')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await wait(2000);
  try {
    const res = await fetch('http://127.0.0.1:9231/json/new?' + encodeURIComponent(fileUrl), { method: 'PUT' });
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

    // Apply base alignments (score finishes at same line as HI, fps has 8px gap)
    await send('Runtime.evaluate', {
      expression: `(function() {
        var style = document.createElement('style');
        style.id = 'hud-base-align';
        style.textContent = \`
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

        // Populate stress weapons
        var badges = document.getElementById("max-badges");
        if (badges) {
          var wIcons = window.WPN_ICONS || {};
          var iconKeys = Object.keys(wIcons);
          var html = '';
          for (var i = 0; i < 9; i++) {
            var isMax = (i === 0 || i === 3);
            var isUnlocked = isMax || (i < 6);
            var statusClass = isMax ? 'maxed' : (isUnlocked ? 'unlocked' : 'locked');
            var k = iconKeys[i % iconKeys.length] || 'blaster';
            var iconSrc = wIcons[k] || '';
            var lvlText = isMax ? '★' : (isUnlocked ? String((i % 4) + 1) : '');
            var iconContent = iconSrc ? '<img src="' + iconSrc + '" class="wpn-icon-img" alt="' + k + '" />' : '<span>⚡</span>';
            html += '<div class="eq-square ' + statusClass + '">' +
              '<div class="eq-icon">' + iconContent + '</div>' +
              (lvlText ? '<span class="eq-lvl">' + lvlText + '</span>' : '') +
              '</div>';
          }
          badges.innerHTML = html;
        }

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

    // Capture MOCKUP 1: Pure Clean Align (No extra fill, just tight top flush)
    const ss1 = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: 433, height: 120, scale: 2 }
    });
    fs.writeFileSync('hud_mockup_clean.png', Buffer.from(ss1.result.data, 'base64'));

    // Apply MOCKUP 2: Sci-Fi Neon Pip / Glow Header Bar on top of equipment image
    await send('Runtime.evaluate', {
      expression: `(function() {
        var style = document.createElement('style');
        style.id = 'hud-opt-neon-pip';
        style.textContent = \`
          .eq-square::before {
            content: "";
            display: block;
            width: 100%;
            height: 2px;
            background: #003d5c;
            border-bottom: 1px solid #001e32;
            flex-shrink: 0;
          }
          .eq-square.unlocked::before {
            background: #00e5ff;
            box-shadow: 0 0 4px #00e5ff;
          }
          .eq-square.maxed::before {
            background: #ffaa00;
            box-shadow: 0 0 5px #ffaa00;
          }
          .eq-square {
            padding: 0 !important;
          }
          .eq-icon {
            padding-top: 2px !important;
          }
        \`;
        document.head.appendChild(style);
      })()`
    });

    await wait(200);

    const ss2 = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: 433, height: 120, scale: 2 }
    });
    fs.writeFileSync('hud_mockup_neon_pip.png', Buffer.from(ss2.result.data, 'base64'));

    // Apply MOCKUP 3: Luminous Gradient Energy Bay
    await send('Runtime.evaluate', {
      expression: `(function() {
        var el = document.getElementById('hud-opt-neon-pip');
        if (el) el.remove();
        var style = document.createElement('style');
        style.id = 'hud-opt-gradient';
        style.textContent = \`
          .eq-square.unlocked {
            background: linear-gradient(180deg, rgba(0, 229, 255, 0.3) 0%, rgba(0, 25, 45, 0.85) 60%, rgba(0, 10, 20, 0.95) 100%) !important;
          }
          .eq-square.maxed {
            background: linear-gradient(180deg, rgba(255, 170, 0, 0.35) 0%, rgba(45, 25, 0, 0.85) 60%, rgba(20, 10, 0, 0.95) 100%) !important;
          }
          .eq-square.locked {
            background: linear-gradient(180deg, rgba(0, 60, 90, 0.25) 0%, rgba(0, 10, 20, 0.85) 100%) !important;
          }
          .wpn-icon-img {
            width: 17.5px !important;
            height: 17.5px !important;
          }
        \`;
        document.head.appendChild(style);
      })()`
    });

    await wait(200);

    const ss3 = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: 433, height: 120, scale: 2 }
    });
    fs.writeFileSync('hud_mockup_energy_gradient.png', Buffer.from(ss3.result.data, 'base64'));

    console.log('📸 All 3 mockups generated successfully!');

    await ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chromeProc.kill();
  }
}

main();
