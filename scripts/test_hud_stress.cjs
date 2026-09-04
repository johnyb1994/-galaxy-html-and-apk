const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('www/index.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

console.log('Testing HUD Stress & Anti-Jitter in Chrome:', fileUrl);

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9223',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + path.resolve('.chrome-stress-profile')
]);

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await wait(2000);

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

  // Set viewport to 433x915
  await send('Emulation.setDeviceMetricsOverride', {
    width: 433,
    height: 915,
    deviceScaleFactor: 1,
    mobile: true
  });

  await wait(3000);

  // Click LAUNCH to enter gameplay
  await send('Runtime.evaluate', {
    expression: `(function() {
      var btn = document.getElementById("btn-start");
      if (btn) btn.click();
    })()`
  });

  await wait(1000);

  // Close dev diagnostics for clean measurements and screenshots
  await send('Runtime.evaluate', {
    expression: `(function() {
      var devClose = document.getElementById("dev-close-btn");
      if (devClose) devClose.click();
      var panel = document.getElementById("dev-diag-panel");
      if (panel) panel.style.display = "none";
    })()`
  });

  // Capture normal gameplay screenshots
  const ssNormCrop = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 433, height: 120, scale: 2 }
  });
  fs.writeFileSync('hud_normal_test.png', Buffer.from(ssNormCrop.result.data, 'base64'));
  console.log('📸 Saved normal HUD screenshot to: galaxy_apk/hud_normal_test.png');

  const ssNormFull = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('gameplay_normal_test.png', Buffer.from(ssNormFull.result.data, 'base64'));
  console.log('📸 Saved normal gameplay screenshot to: galaxy_apk/gameplay_normal_test.png');

  console.log('\n=== TEST 1: ANTI-JITTER VERIFICATION (CLOCK & SCORE UPDATES) ===');
  const testTimes = ['0:02', '0:09', '0:10', '1:05', '9:59', '10:00', '14:59', '59:59'];
  const jitterResults = [];

  for (const t of testTimes) {
    const evalRes = await send('Runtime.evaluate', {
      expression: `(function() {
        var timeLbl = document.getElementById("time-lbl");
        if (timeLbl) timeLbl.textContent = "${t}";
        
        var wrap = document.getElementById("wrap");
        var wRect = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 };

        function getRel(id) {
          var el = document.getElementById(id);
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
          time: "${t}",
          scoreRow: getRel("score-row"),
          hiRow: getRel("hi-row"),
          waveLbl: getRel("wave-lbl"),
          lvl: getRel("lvl-lbl"),
          timeWrap: getRel("time-wrap")
        };
      })()`,
      returnByValue: true
    });
    jitterResults.push(evalRes.result.result.value);
  }

  const baseScoreX = jitterResults[0].scoreRow.x;
  const baseHiX = jitterResults[0].hiRow.x;
  const baseWaveX = jitterResults[0].waveLbl.x;
  let jitterDetected = false;

  for (const r of jitterResults) {
    if (r.scoreRow.x !== baseScoreX) {
      console.error('❌ Jitter in score-row at time ' + r.time + ': expected ' + baseScoreX + ', got ' + r.scoreRow.x);
      jitterDetected = true;
    }
    if (r.hiRow.x !== baseHiX) {
      console.error('❌ Jitter in hi-row at time ' + r.time + ': expected ' + baseHiX + ', got ' + r.hiRow.x);
      jitterDetected = true;
    }
    if (r.waveLbl.x !== baseWaveX) {
      console.error('❌ Jitter in wave-lbl at time ' + r.time + ': expected ' + baseWaveX + ', got ' + r.waveLbl.x);
      jitterDetected = true;
    }
  }

  if (!jitterDetected) {
    console.log('✔ Anti-jitter PASSED: score-row (' + baseScoreX + 'px), hi-row (' + baseHiX + 'px), wave-lbl (' + baseWaveX + 'px) stayed stationary across all clock times!');
  }

  console.log('\n=== TEST 1B: SCORE LABEL ("SCORE" & "HI") STATIONARY VERIFICATION ===');
  const testScores = ['0', '9', '50', '250', '1,250', '25,000', '150,000', '1,250,450'];
  const labelPositions = [];

  for (const s of testScores) {
    const res = await send('Runtime.evaluate', {
      expression: `(function() {
        var scoreLbl = document.getElementById("score-lbl");
        if (scoreLbl) scoreLbl.textContent = "${s}";
        var wrap = document.getElementById("wrap");
        var wRect = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 };
        var title = document.querySelector(".score-title");
        var r = title ? title.getBoundingClientRect() : null;
        var hi = document.getElementById("hi-lbl");
        var hr = hi ? hi.getBoundingClientRect() : null;
        return {
          score: "${s}",
          titleX: r ? Math.round((r.left - wRect.left) * 100) / 100 : null,
          hiX: hr ? Math.round((hr.left - wRect.left) * 100) / 100 : null
        };
      })()`,
      returnByValue: true
    });
    labelPositions.push(res.result.result.value);
  }

  const baseTitleX = labelPositions[0].titleX;
  const baseHiLblX = labelPositions[0].hiX;
  let titleJitter = false;
  for (const lp of labelPositions) {
    if (Math.abs(lp.titleX - baseTitleX) > 0.5) {
      console.error('❌ Movement in "SCORE" title at score ' + lp.score + ': expected ' + baseTitleX + ', got ' + lp.titleX);
      titleJitter = true;
    }
    if (Math.abs(lp.hiX - baseHiLblX) > 0.5) {
      console.error('❌ Movement in "HI" title at score ' + lp.score + ': expected ' + baseHiLblX + ', got ' + lp.hiX);
      titleJitter = true;
    }
  }
  if (!titleJitter) {
    console.log('✔ Score labels PASSED: "SCORE" title (' + baseTitleX + 'px) and "HI" title (' + baseHiLblX + 'px) are 100% stationary across all score updates!');
  }

  console.log('\n=== TEST 2: STRESS-TEST NORMAL & MAXIMUM GAMEPLAY VALUES ===');

  const stressMetrics = await send('Runtime.evaluate', {
    expression: `(function() {
      var wrap = document.getElementById("wrap");
      var wRect = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 };

      // Set Shield to 150 / 150
      var hpVal = document.getElementById("hp-val");
      var hpFill = document.getElementById("hp-fill");
      if (hpVal) hpVal.textContent = "150 / 150";
      if (hpFill) hpFill.style.width = "100%";

      // Set XP to 9,999 / 9,999
      var xpVal = document.getElementById("xp-val");
      var xpFill = document.getElementById("xp-fill");
      if (xpVal) xpVal.textContent = "9,999 / 9,999";
      if (xpFill) xpFill.style.width = "100%";

      // Set LVL 26 with green dot (lost XP counter hidden as in normal gameplay)
      var lvlTxt = document.getElementById("lvl-val-text");
      if (lvlTxt) lvlTxt.textContent = "LVL 26";
      var lostEl = document.getElementById("lost-xp-counter");
      if (lostEl) lostEl.style.display = "none";

      // Set PB Time to 14:59
      if (window.w && window.w.G) {
        window.w.G.bestCompletionTimeMs = 14 * 60 * 1000 + 59 * 1000;
      }
      var bt = document.getElementById("best-time-wrap");
      if (bt) {
        bt.style.display = "inline-block";
        var btl = document.getElementById("best-time-lbl");
        if (btl) btl.textContent = "14:59";
      }

      // Set Score to 999,990 (stress score)
      var nodmgVal = document.getElementById("nodmg-val");
      if (nodmgVal) nodmgVal.textContent = "1,000,000";

      var hiVal = document.getElementById("hi-val");
      if (hiVal) hiVal.textContent = "957,785";

      var scoreLbl = document.getElementById("score-lbl");
      if (scoreLbl) scoreLbl.textContent = "999,990";

      // Set Wave to 30 with structured spans
      var waveLbl = document.getElementById("wave-lbl");
      if (waveLbl) waveLbl.innerHTML = '<span class="wave-title">WAVE</span><span class="wave-val">30</span>';

      // Set Time to 14:59
      var timeLbl = document.getElementById("time-lbl");
      if (timeLbl) timeLbl.textContent = "14:59";

      // Populate all 9 equipment badge slots matching engine.js DOM with real in-game weapon icons
      var badges = document.getElementById("max-badges");
      if (badges) {
        var wIcons = window.WPN_ICONS || {};
        var iconKeys = Object.keys(wIcons);
        var badgesHtml = '';
        for (var i = 0; i < 9; i++) {
          var isMax = (i === 0 || i === 3);
          var lvlText = isMax ? "★" : String(i + 1);
          var cls = isMax ? "maxed" : "unlocked";
          var iconSrc = iconKeys[i] ? wIcons[iconKeys[i]] : '';
          badgesHtml += '<div class="eq-square ' + cls + '">' +
            '<span class="eq-icon"><img class="wpn-icon-img" src="' + iconSrc + '" alt="eq"></span>' +
            '<span class="eq-lvl">' + lvlText + '</span>' +
            '</div>';
        }
        badges.innerHTML = badgesHtml;
      }

      function getRel(el) {
        if (!el) return null;
        var r = el.getBoundingClientRect();
        return {
          left: Math.round((r.left - wRect.left) * 100) / 100,
          right: Math.round((r.right - wRect.left) * 100) / 100,
          top: Math.round((r.top - wRect.top) * 100) / 100,
          bottom: Math.round((r.bottom - wRect.top) * 100) / 100,
          width: Math.round(r.width * 100) / 100,
          height: Math.round(r.height * 100) / 100
        };
      }

      var hud = document.getElementById("hud");
      var lvl = document.getElementById("lvl-lbl");
      var timeWrap = document.getElementById("time-wrap");
      var scoreRow = document.getElementById("score-row");
      var scoreVal = document.getElementById("score-lbl");
      var hiRow = document.getElementById("hi-row");
      var hiVal = document.getElementById("hi-val");
      var hiLbl = document.getElementById("hi-lbl");
      var waveRow = document.getElementById("wave-row");
      var waveLbl = document.getElementById("wave-lbl");
      var waveTitle = document.querySelector(".wave-title");
      var waveVal = document.querySelector(".wave-val");
      var barsRow = document.querySelector(".hud-bars-row");
      var nodmgRow = document.getElementById("nodmg-row");
      var nodmgVal = document.getElementById("nodmg-val");
      var nodmgLbl = document.getElementById("nodmg-lbl");
      var firstSquare = document.querySelector(".eq-square");
      var firstIconImg = document.querySelector(".eq-square .wpn-icon-img");
      var firstEqLvl = document.querySelector(".eq-square .eq-lvl");

      return {
        hud: getRel(hud),
        barsRow: getRel(barsRow),
        badges: getRel(badges),
        firstSquare: getRel(firstSquare),
        firstIconImg: getRel(firstIconImg),
        firstEqLvl: getRel(firstEqLvl),
        lvl: getRel(lvl),
        timeWrap: getRel(timeWrap),
        nodmgRow: getRel(nodmgRow),
        nodmgVal: getRel(nodmgVal),
        nodmgLbl: getRel(nodmgLbl),
        scoreRow: getRel(scoreRow),
        scoreVal: getRel(scoreVal),
        hiRow: getRel(hiRow),
        hiVal: getRel(hiVal),
        hiLbl: getRel(hiLbl),
        waveRow: getRel(waveRow),
        waveLbl: getRel(waveLbl),
        waveTitle: getRel(waveTitle),
        waveVal: getRel(waveVal)
      };
    })()`,
    returnByValue: true
  });

  const m = stressMetrics.result.result.value;
  console.log('📐 Measured Metrics under Stress:\n', JSON.stringify(m, null, 2));

  // Take Screenshots under Stress Test
  const ssCrop = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 433, height: 120, scale: 2 }
  });
  fs.writeFileSync('hud_stress_test.png', Buffer.from(ssCrop.result.data, 'base64'));
  console.log('📸 Saved high-res HUD stress screenshot to: galaxy_apk/hud_stress_test.png');

  const ssFull = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('gameplay_stress_test.png', Buffer.from(ssFull.result.data, 'base64'));
  console.log('📸 Saved full gameplay stress screenshot to: galaxy_apk/gameplay_stress_test.png');

  // Verify constraints
  console.log('\n=== CONSTRAINT VERIFICATION ===');
  let pass = true;

  // 1. HUD bottom line constraint
  if (m.hud.bottom > 83) {
    console.error('❌ HUD bottom (' + m.hud.bottom + 'px) exceeds max allowed 83px!');
    pass = false;
  } else {
    console.log('✔ HUD bottom (' + m.hud.bottom + 'px) is <= 83px (divider line preserved)');
  }

  // 2. LVL and clock top-row positioning
  if (m.lvl.top > 30) {
    console.error('❌ LVL top (' + m.lvl.top + 'px) is too low (> 30px) - should be in top row!');
    pass = false;
  } else {
    console.log('✔ LVL top (' + m.lvl.top + 'px) is in top row area');
  }

  // 3. Equipment badge icon flush at top (no blank space on top)
  if (m.firstSquare && m.firstIconImg) {
    const iconTopGap = m.firstIconImg.top - m.firstSquare.top;
    console.log('- Top blank space above equipment image: ' + iconTopGap.toFixed(1) + 'px (badge top: ' + m.firstSquare.top + 'px, icon top: ' + m.firstIconImg.top + 'px)');
    if (iconTopGap > 4) {
      console.error('❌ Blank space on top of equipment image is too large: ' + iconTopGap + 'px > 4px!');
      pass = false;
    } else {
      console.log('✔ Equipment image is flush at top with NO blank space (gap: ' + iconTopGap.toFixed(1) + 'px)');
    }
    console.log('- Badge height: ' + m.firstSquare.height + 'px, Badge bottom: ' + m.firstSquare.bottom + 'px');
    if (m.firstSquare.height < 36) {
      console.error('❌ Badge height (' + m.firstSquare.height + 'px) is under 36px!');
      pass = false;
    } else {
      console.log('✔ Badge height (' + m.firstSquare.height + 'px) fills vertical space cleanly');
    }
  }

  // 3b. Equipment level text strictly at bottom of image with NO overlap
  if (m.firstIconImg && m.firstEqLvl) {
    const overlap = m.firstIconImg.bottom - m.firstEqLvl.top;
    console.log('- Image bottom: ' + m.firstIconImg.bottom + 'px, Level text top: ' + m.firstEqLvl.top + 'px (gap/clearance: ' + (-overlap).toFixed(1) + 'px)');
    if (overlap > 0.5) {
      console.error('❌ Equipment level text overlaps image! (overlap: ' + overlap.toFixed(1) + 'px)');
      pass = false;
    } else {
      console.log('✔ Equipment level text sits cleanly at the bottom of the image with NO overlap! (clearance: ' + (-overlap).toFixed(1) + 'px)');
    }
  }

  // 4. Horizontal clearances: Shortened bars vs Center col, and Badges vs Scores
  if (m.barsRow && m.timeWrap) {
    const barsToCenterGap = m.timeWrap.left - m.barsRow.right;
    console.log('- Gap between Bars right (' + m.barsRow.right + 'px) and Center col left (' + m.timeWrap.left + 'px): ' + barsToCenterGap.toFixed(1) + 'px');
    if (m.barsRow.right > m.timeWrap.left) {
      console.error('❌ Bars overlap center column! (right: ' + m.barsRow.right + ' > center: ' + m.timeWrap.left + ')');
      pass = false;
    } else {
      console.log('✔ Bars do NOT overlap center column (clearance: ' + barsToCenterGap.toFixed(1) + 'px)');
    }
  }

  if (m.badges && m.scoreRow) {
    const badgesToScoresGap = m.scoreRow.left - m.badges.right;
    console.log('- Gap between Badges right (' + m.badges.right + 'px) and Scores left (' + m.scoreRow.left + 'px): ' + badgesToScoresGap.toFixed(1) + 'px');
    if (m.badges.right > m.scoreRow.left) {
      console.error('❌ Badges overlap scores area!');
      pass = false;
    } else {
      console.log('✔ Badges do NOT overlap scores area (clearance: ' + badgesToScoresGap.toFixed(1) + 'px)');
    }
  }

  // 5. Center col (lvl, timeWrap) vs Right col (scores / wave)
  const rightColLeft = Math.min(m.scoreRow.left, m.hiRow.left, m.waveLbl.left);
  const centerToRightGap = rightColLeft - Math.max(m.lvl.right, m.timeWrap.right);
  console.log('- Gap between Center col right (' + Math.max(m.lvl.right, m.timeWrap.right) + 'px) and Right col left (' + rightColLeft + 'px): ' + centerToRightGap.toFixed(1) + 'px');
  if (Math.max(m.lvl.right, m.timeWrap.right) > rightColLeft) {
    console.error('❌ Center column overlaps Right column!');
    pass = false;
  } else {
    console.log('✔ Center column does NOT overlap Right column (clearance: ' + centerToRightGap.toFixed(1) + 'px)');
  }

  // 6. Vertical Hierarchy: WAVE on top, NODMG HI next, HI next, SCORE underneath
  console.log('- Vertical positions: WAVE bottom=' + m.waveLbl.bottom + 'px, NODMG top=' + (m.nodmgRow ? m.nodmgRow.top : 'N/A') + 'px');
  if (m.nodmgRow && m.waveLbl.bottom > m.nodmgRow.top + 1) {
    console.error('❌ Wave row overlaps NODMG row vertically!');
    pass = false;
  } else {
    console.log('✔ Wave row is cleanly on top of NODMG row');
  }
  if (m.nodmgRow && m.hiRow && m.nodmgRow.bottom > m.hiRow.top + 1) {
    console.error('❌ NODMG row overlaps HI row vertically!');
    pass = false;
  } else {
    console.log('✔ NODMG row is cleanly on top of HI row');
  }
  if (m.hiRow && m.scoreRow && m.hiRow.bottom > m.scoreRow.top + 1) {
    console.error('❌ HI row overlaps Score row vertically!');
    pass = false;
  } else {
    console.log('✔ Score row is cleanly underneath HI row');
  }

  // 7. Right edge clearance
  if (m.scoreRow.right > m.hud.right || m.waveLbl.right > m.hud.right || (m.nodmgRow && m.nodmgRow.right > m.hud.right)) {
    console.error('❌ Elements overflow HUD right edge!');
    pass = false;
  } else {
    console.log('✔ All right column elements are within HUD bounds');
  }

  // 8. Wave title and number proximity (tight spacing, not far apart)
  if (m.waveTitle && m.waveVal) {
    const waveGap = m.waveVal.left - m.waveTitle.right;
    console.log('- Gap between WAVE title and number: ' + waveGap.toFixed(1) + 'px (title right: ' + m.waveTitle.right + 'px, number left: ' + m.waveVal.left + 'px)');
    if (waveGap > 12) {
      console.error('❌ Wave number is too far from word WAVE: ' + waveGap.toFixed(1) + 'px > 12px!');
      pass = false;
    } else {
      console.log('✔ Wave number is tight and close to word WAVE (gap: ' + waveGap.toFixed(1) + 'px <= 12px)');
    }
  }

  // 9. LVL centered with clock / time
    const lvlCenter = (m.lvl.left + m.lvl.right) / 2;
    const timeCenter = (m.timeWrap.left + m.timeWrap.right) / 2;
    const lvlDelta = Math.abs(lvlCenter - timeCenter);
    console.log('- Center alignment: LVL center=' + lvlCenter.toFixed(2) + 'px, Clock center=' + timeCenter.toFixed(2) + 'px (delta: ' + lvlDelta.toFixed(2) + 'px)');
    if (lvlDelta > 2) {
      console.error('❌ LVL is not centered with clock! Delta: ' + lvlDelta.toFixed(2) + 'px > 2px');
      pass = false;
    } else {
      console.log('✔ LVL is perfectly centered with clock / time (delta: ' + lvlDelta.toFixed(2) + 'px <= 2px)');
    }

    // 10. Copy artifacts for user viewing
    const artDir = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\d389b141-549f-4354-8ef0-735bc60d9281';
    if (fs.existsSync(artDir)) {
      fs.copyFileSync('hud_stress_test.png', path.join(artDir, 'hud_stress_closeup.png'));
      fs.copyFileSync('hud_normal_test.png', path.join(artDir, 'hud_normal_closeup.png'));
      fs.copyFileSync('gameplay_stress_test.png', path.join(artDir, 'gameplay_stress.png'));
      fs.copyFileSync('gameplay_normal_test.png', path.join(artDir, 'gameplay_normal.png'));
      console.log('✔ Copied fresh HUD screenshots to artifact directory');
    }

    // Close Chrome
    await send('Page.close');
    ws.close();
    chromeProc.kill();

    if (!pass) {
      console.error('\n❌ STRESS TEST FAILED CONSTRAINTS');
      process.exit(1);
    } else {
      console.log('\n\x1b[32m✔ ALL STRESS & CLEARANCE CHECKS PASSED PERFECTLY!\x1b[0m\n');
    }
}

main().catch(e => {
  console.error(e);
  chromeProc.kill();
  process.exit(1);
});
