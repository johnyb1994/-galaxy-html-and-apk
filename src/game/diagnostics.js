// src/game/diagnostics.js - Developer Diagnostics & Profiler Overlay
(function() {
  var triggerLog = window._triggerLog || (window._triggerLog = []);
  window.addTrigger = function(type, detail) {
    var now = performance.now();
    triggerLog.push({ type: type, detail: detail, time: now });
    if (triggerLog.length > 400) triggerLog.shift();

    // If entering or exiting LevelUp, Upgrade Pick, Pause, Resume, or Game Over:
    if (type === "LevelUp" || type === "UpgPick" || type === "Pause" || type === "Resume" || type === "GameOver" || type === "Victory" || type === "WaveBanner" || type === "Launch") {
      resumeGraceUntil = Math.max(resumeGraceUntil, now + 850);
      lastGameFrameTime = now;

      // Purge any stutter logged in the immediate 450ms before entering pause / level-up transition
      var cutoff = now - 450;
      while (devMetrics.stutterLog.length > 0) {
        var top = devMetrics.stutterLog[0];
        var entryTime = (top && typeof top === "object") ? top.time : 0;
        if (entryTime && entryTime >= cutoff) {
          var removed = devMetrics.stutterLog.shift();
          devMetrics.stutterCount = Math.max(0, devMetrics.stutterCount - 1);
          if (removed.causeType && devMetrics.causeStats[removed.causeType]) {
            devMetrics.causeStats[removed.causeType] = Math.max(0, devMetrics.causeStats[removed.causeType] - 1);
          }
        } else {
          break;
        }
      }
    }
  };

  function getRecentTriggers(msWindow) {
    var cutoff = performance.now() - (msWindow || 100);
    var counts = {};
    var order = [];
    for (var i = 0; i < triggerLog.length; i++) {
      if (triggerLog[i].time >= cutoff) {
        var key = triggerLog[i].detail ? (triggerLog[i].type + ":" + triggerLog[i].detail) : triggerLog[i].type;
        if (!counts[key]) {
          counts[key] = 1;
          order.push(key);
        } else {
          counts[key]++;
        }
      }
    }
    var batched = [];
    for (var j = 0; j < order.length; j++) {
      var k = order[j];
      batched.push(counts[k] > 1 ? (k + "*" + counts[k]) : k);
    }
    return batched;
  }

  function getEntityStats() {
    try {
      var g = (window.w && window.w.G) ? window.w.G : window.G;
      if (!g) return "B:0 E:0 P:0";
      var bCount = 0;
      if (g.bullets) {
        for (var i = 0; i < g.bullets.length; i++) if (g.bullets[i] && g.bullets[i].alive) bCount++;
      }
      var eCount = 0;
      if (g.enemies) {
        for (var j = 0; j < g.enemies.length; j++) if (g.enemies[j] && g.enemies[j].alive) eCount++;
      }
      var pCount = g.parts ? g.parts.length : 0;
      var gemCount = g.pickups ? g.pickups.length : 0;
      return "B:" + bCount + " E:" + eCount + " P:" + pCount + (gemCount > 0 ? (" G:" + gemCount) : "");
    } catch(err) { return "B:? E:? P:?"; }
  }

  function getBossStatus() {
    try {
      var g = (window.w && window.w.G) ? window.w.G : window.G;
      if (!g) return "0";
      if (g.activeBoss && g.activeBoss.alive) {
        return g.activeBoss.name ? g.activeBoss.name : "1";
      }
      if (g.enemies) {
        for (var i = 0; i < g.enemies.length; i++) {
          if (g.enemies[i] && g.enemies[i].alive && g.enemies[i].isBoss) {
            return g.enemies[i].name ? g.enemies[i].name : "1";
          }
        }
      }
      return "0";
    } catch(e) { return "0"; }
  }

  var _origAudioPlay = null, _origOsc = null, _origStorageFn = null;
  function installHooks() {
    try {
      if (!_origAudioPlay && typeof HTMLAudioElement !== "undefined") {
        _origAudioPlay = HTMLAudioElement.prototype.play;
        HTMLAudioElement.prototype.play = function() {
          var s = "snd";
          try {
            if (this.id) s = this.id;
            else if (this.src) {
              if (this.src.startsWith("data:")) {
                s = "data_sfx";
              } else {
                s = this.src.split("/").pop().split("?")[0].replace(".mp3", "").replace(".wav", "");
                if (s.length > 16) s = s.substring(0, 16);
              }
            }
          } catch(e) { s = "snd"; }
          window.addTrigger("Aud", s);
          return _origAudioPlay.apply(this, arguments);
        };
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!_origOsc && AC && AC.prototype && AC.prototype.createOscillator) {
        _origOsc = AC.prototype.createOscillator;
        AC.prototype.createOscillator = function() {
          window.addTrigger("Synth", "osc");
          return _origOsc.apply(this, arguments);
        };
      }
      if (!_origStorageFn && typeof localStorage !== "undefined" && localStorage.setItem) {
        _origStorageFn = localStorage.setItem;
        localStorage.setItem = function(k, v) {
          if (k !== "galaxy_dev_diag") window.addTrigger("Save", k);
          return _origStorageFn.apply(this, arguments);
        };
      }
    } catch(e) {}
  }

  function uninstallHooks() {
    try {
      if (_origAudioPlay && typeof HTMLAudioElement !== "undefined") {
        HTMLAudioElement.prototype.play = _origAudioPlay;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (_origOsc && AC && AC.prototype) {
        AC.prototype.createOscillator = _origOsc;
      }
      if (_origStorageFn && typeof localStorage !== "undefined") {
        localStorage.setItem = _origStorageFn;
      }
    } catch(e) {}
    _origAudioPlay = null;
    _origOsc = null;
    _origStorageFn = null;
  }

  let devMetrics = {
    fps: 60,
    computeTimeMs: 0,
    intervalMs: 16.6,
    stutterCount: 0,
    stutterLog: [],
    history: new Array(60).fill(4.0),
    intervalHistory: new Array(30).fill(16.6),
    lastTime: performance.now(),
    heapUsedMB: "N/A",
    lastHeapNum: 0,
    gcPauses: 0,
    maxComputeMs: 0,
    avgComputeMs: 0,
    totalComputeMs: 0,
    causeStats: { vsync: 0, micro: 0, cpu: 0, physics: 0, gc: 0 },
    memTimer: performance.now()
  };
  window.__devMetrics = devMetrics;

  let storedState = localStorage.getItem("galaxy_dev_diag");
  let isDevDiagEnabled = storedState !== "off";
  let isMinimized = false;

  function updateDevDiagState(enabled) {
    isDevDiagEnabled = !!enabled;
    try { localStorage.setItem("galaxy_dev_diag", isDevDiagEnabled ? "on" : "off"); } catch(e) {}
    const devDiagPanel = document.getElementById("dev-diag-panel");
    const setDevDiagBtn = document.getElementById("set-dev-diag-btn");
    if (devDiagPanel) devDiagPanel.style.display = isDevDiagEnabled ? "block" : "none";
    if (setDevDiagBtn) {
      setDevDiagBtn.textContent = isDevDiagEnabled ? "ON" : "OFF";
      setDevDiagBtn.classList.toggle("on", isDevDiagEnabled);
    }
    applyInstrumentation();
  }
  window.updateDevDiagState = updateDevDiagState;
  window.isDevDiagEnabled = isDevDiagEnabled;
  window.devMetrics = devMetrics;

  function isModalOrOverlayActive() {
    const modalIds = [
      'up-screen',
      'pause-screen',
      'start-screen',
      'over-screen',
      'win-screen',
      'settings-screen',
      'score-screen',
      'adv-sounds-screen',
      'enc-screen',
      'lore-screen',
      'achievements-screen'
    ];
    for (let i = 0; i < modalIds.length; i++) {
      const el = document.getElementById(modalIds[i]);
      if (el && !el.classList.contains('hidden')) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') return true;
      }
    }
    return false;
  }

  document.addEventListener("click", function(e) {
    var target = e.target;
    if (!target) return;
    if (target.id === "set-dev-diag-btn" || target.closest("#set-dev-diag-btn")) {
      e.stopPropagation();
      updateDevDiagState(!isDevDiagEnabled);
    } else if (target.id === "dev-close-btn" || target.closest("#dev-close-btn")) {
      e.stopPropagation();
      updateDevDiagState(false);
    } else if (target.id === "dev-toggle-btn" || target.closest("#dev-toggle-btn")) {
      e.stopPropagation();
      toggleMinimize();
    } else if (target.id === "dev-header" || target.closest("#dev-header")) {
      if (!target.closest("button")) {
        e.stopPropagation();
        toggleMinimize();
      }
    } else if (target.id === "dev-header-clear-btn" || target.id === "dev-clear-report-btn") {
      e.stopPropagation();
      clearDiagnosticsData();
    } else if (target.id === "diag-copy-btn" || target.closest("#diag-copy-btn") || target.id === "dev-copy-report-btn" || target.closest("#dev-copy-report-btn")) {
      e.stopPropagation();
      copyFullDiagnosticsReport();
    }
  });

  function toggleMinimize() {
    var devBody = document.getElementById("dev-body");
    var devToggleBtn = document.getElementById("dev-toggle-btn");
    var devHeaderTitle = document.getElementById("dev-header-title");
    var devHeader = document.getElementById("dev-header");
    var devPanel = document.getElementById("dev-diag-panel");
    if (devBody) {
      isMinimized = !isMinimized;
      devBody.style.display = isMinimized ? "none" : "block";
      if (devToggleBtn) devToggleBtn.textContent = isMinimized ? "EXPAND" : "MINIMIZE";
      if (devPanel) {
        devPanel.style.width = isMinimized ? "auto" : "270px";
        devPanel.style.padding = isMinimized ? "6px 10px" : "10px 14px";
      }
      if (devHeader) {
        devHeader.style.marginBottom = isMinimized ? "0px" : "8px";
        devHeader.style.paddingBottom = isMinimized ? "0px" : "6px";
        devHeader.style.borderBottom = isMinimized ? "none" : "1px solid rgba(0,255,170,0.25)";
      }
      if (devHeaderTitle) {
        devHeaderTitle.textContent = isMinimized ? ("SPIKES: " + devMetrics.stutterCount) : "DEV DIAGNOSTICS";
        devHeaderTitle.style.color = isMinimized ? (devMetrics.stutterCount === 0 ? "#00ffaa" : devMetrics.stutterCount < 5 ? "#ffaa00" : "#ff3366") : "#00e5ff";
      }
    }
  }

  function clearDiagnosticsData() {
    devMetrics.stutterCount = 0;
    devMetrics.gcPauses = 0;
    devMetrics.stutterLog = [];
    devMetrics.maxComputeMs = 0;
    devMetrics.causeStats = { vsync: 0, micro: 0, cpu: 0, physics: 0, gc: 0 };
    const elLog = document.getElementById("dev-stutter-log");
    if (elLog) elLog.innerHTML = '<span style="color:#667788;">No active gameplay issues.</span>';
    const elSpikes = document.getElementById("dev-spikes-val") || document.getElementById("diag-stutter-val");
    if (elSpikes) { elSpikes.textContent = "0"; elSpikes.style.color = "#00ffaa"; }
    const elGc = document.getElementById("dev-gc-val");
    if (elGc) { elGc.textContent = "0"; }
    const devHeaderTitle = document.getElementById("dev-header-title");
    if (devHeaderTitle && isMinimized) {
      devHeaderTitle.textContent = "SPIKES: 0";
      devHeaderTitle.style.color = "#00ffaa";
    }
  }

  function copyFullDiagnosticsReport() {
    var elWave = document.getElementById("wave-lbl");
    var wav = elWave ? elWave.textContent.trim().split("\n").join(" ") : "W?";
    var bss = getBossStatus();
    var tot = devMetrics.stutterCount;
    var den = tot || 1;
    var trig = getRecentTriggers(100);
    var trigStr = trig.length ? trig.join(",") : "None";
    var ent = getEntityStats();
    var is120Active = (window.et && window.et.targetFps === "120hz") && (window.w && window.w.displayHz > 90);
    var targetHz = is120Active ? ((window.w && window.w.displayHz) ? window.w.displayHz : 120) : 60;
    var targetBudgetMs = (1000 / targetHz).toFixed(1);

    var lines = [
      "[DIAGNOSTICS REPORT]",
      "FPS: " + devMetrics.fps + " (Target: " + targetHz + "Hz / " + targetBudgetMs + "ms) | Compute: avg " + devMetrics.avgComputeMs.toFixed(1) + "ms, max " + devMetrics.maxComputeMs.toFixed(1) + "ms | Last Interval: " + devMetrics.intervalMs.toFixed(1) + "ms",
      "Total Issues Recorded: " + tot + " | GC Pauses: " + devMetrics.gcPauses + " | RAM: " + devMetrics.heapUsedMB,
      "Wave: " + wav + " | Boss: " + bss + " | Entities: " + ent,
      "Causes Breakdown:",
      "  • VSync Drops (≥1.35x): " + devMetrics.causeStats.vsync + " (" + ((devMetrics.causeStats.vsync / den) * 100).toFixed(0) + "%)",
      "  • Micro-Hitches (≥1.18x / Δ≥4ms): " + devMetrics.causeStats.micro + " (" + ((devMetrics.causeStats.micro / den) * 100).toFixed(0) + "%)",
      "  • Heavy CPU (>58% frame): " + devMetrics.causeStats.cpu + " (" + ((devMetrics.causeStats.cpu / den) * 100).toFixed(0) + "%)",
      "  • Physics Bursts (2x+): " + devMetrics.causeStats.physics + " (" + ((devMetrics.causeStats.physics / den) * 100).toFixed(0) + "%)",
      "  • GC Freezes: " + devMetrics.causeStats.gc + " (" + ((devMetrics.causeStats.gc / den) * 100).toFixed(0) + "%)",
      "Recent Triggers (100ms): " + trigStr,
      "Recorded Event Log (" + devMetrics.stutterLog.length + " entries):"
    ];

    for (var i = 0; i < devMetrics.stutterLog.length; i++) {
      var item = devMetrics.stutterLog[i];
      var textStr = (item && typeof item === "object") ? item.text : item;
      lines.push("[" + (i + 1) + "] " + textStr);
    }
    if (!devMetrics.stutterLog.length) lines.push("No gameplay issues recorded.");
    copyReportText(lines.join("\n"));
  }

  function copyReportText(text) {
    var btn = document.getElementById("diag-copy-btn") || document.getElementById("dev-copy-report-btn");
    function ok() {
      if (btn) {
        var origText = btn.textContent;
        var origBg = btn.style.background;
        var origColor = btn.style.color;
        btn.textContent = "COPIED!";
        btn.style.background = "#00ffaa";
        btn.style.color = "#000";
        setTimeout(function() {
          btn.textContent = origText || "COPY REPORT";
          btn.style.background = origBg || "rgba(0,51,34,0.8)";
          btn.style.color = origColor || "#00ffaa";
        }, 2000);
      }
    }
    function fallback(str) {
      var ta = document.createElement("textarea");
      ta.value = str;
      ta.style.cssText = "position:fixed;left:-99999px;top:-99999px;";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy") ? ok() : prompt("Copy report:", str); } catch(e) { prompt("Copy report:", str); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok).catch(function() { fallback(text); });
    } else { fallback(text); }
  }

  const originalRAF = window.requestAnimationFrame;
  let lastGameFrameTime = performance.now();
  let lastGameLoopTick = 0;
  let resumeGraceUntil = performance.now() + 3000;
  const recentComputeWindow = [];
  const fpsFrameTimestamps = [];

  // Initialize heap display immediately if supported
  if (window.performance && window.performance.memory) {
    try {
      devMetrics.lastHeapNum = window.performance.memory.usedJSHeapSize / 1048576;
      devMetrics.heapUsedMB = devMetrics.lastHeapNum.toFixed(1) + " MB";
    } catch(e) {}
  }

  function drawSparkline(canvas, history) {
    if (!canvas || !history || !history.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width || 240;
    const h = canvas.height || 40;
    ctx.clearRect(0, 0, w, h);

    const is120Active = (window.et && window.et.targetFps === "120hz") && (window.w && window.w.displayHz > 90);
    const targetHz = is120Active ? ((window.w && window.w.displayHz) ? window.w.displayHz : 120) : 60;
    const targetBudgetMs = 1000 / targetHz;

    // Determine dynamic max scale based on recent max compute (min 25ms, up to 60ms)
    let maxComputeInHistory = targetBudgetMs * 1.5;
    for (let i = 0; i < history.length; i++) {
      if (history[i] > maxComputeInHistory) maxComputeInHistory = history[i];
    }
    const maxScale = Math.min(60.0, Math.max(25.0, maxComputeInHistory * 1.15));

    // Target frame budget reference line (red dashed)
    const lineY = Math.round(h - (targetBudgetMs / maxScale) * h);
    ctx.strokeStyle = "rgba(255, 68, 68, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(w, lineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot waveform
    const len = history.length;
    const step = w / Math.max(1, len - 1);
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const val = Math.min(maxScale, Math.max(0, history[i]));
      const y = h - (val / maxScale) * (h - 4) - 2;
      const x = i * step;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#00ffaa";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 255, 170, 0.12)";
    ctx.fill();
  }

  function handleVisibilityOrFocusResume() {
    const now = performance.now();
    lastGameFrameTime = now;
    resumeGraceUntil = now + 850;
  }

  window.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    handleVisibilityOrFocusResume();
  });
  window.addEventListener('focus', () => {
    handleVisibilityOrFocusResume();
  });

  var lastUIUpdateTime = 0;
  var lastPaintTimestamp = 0;
  var accumulatedFrameCompute = 0;
  var prevInterval = 16.6;

  var diagRAF = function(callback) {
    return originalRAF.call(window, function(timestamp) {
      if (!isDevDiagEnabled) {
        callback(timestamp);
        return;
      }

      const isNewPaintTick = (timestamp !== lastPaintTimestamp);
      const now = performance.now();

      if (isNewPaintTick) {
        lastPaintTimestamp = timestamp;
        accumulatedFrameCompute = 0;
      }

      // Precision callback duration measurement
      const cbStart = performance.now();
      callback(timestamp);
      const cbEnd = performance.now();
      const cbDuration = (cbEnd - cbStart);
      accumulatedFrameCompute += cbDuration;

      // Track game frame render ticks specifically
      const curGameTick = (window.w && window.w._gameLoopTick) ? window.w._gameLoopTick : 0;
      const isGameTick = (curGameTick !== lastGameLoopTick) || (window.w && window.w.G && window.w.G.running);

      if (isGameTick) {
        lastGameLoopTick = curGameTick;
        const interval = now - lastGameFrameTime;

        // Valid presentation interval (>= 2ms)
        if (interval >= 2.0) {
          lastGameFrameTime = now;

          // Skip background tab dormancy (> 500ms)
          if (interval < 500.0) {
            devMetrics.intervalMs = interval;
            devMetrics.intervalHistory.push(interval);
            if (devMetrics.intervalHistory.length > 30) devMetrics.intervalHistory.shift();

            const computeTime = accumulatedFrameCompute;
            devMetrics.computeTimeMs = computeTime;

            // Rolling 60-frame compute average
            recentComputeWindow.push(computeTime);
            if (recentComputeWindow.length > 60) recentComputeWindow.shift();
            var sumComp = 0;
            for (var ci = 0; ci < recentComputeWindow.length; ci++) sumComp += recentComputeWindow[ci];
            devMetrics.avgComputeMs = sumComp / recentComputeWindow.length;

            if (computeTime > devMetrics.maxComputeMs) devMetrics.maxComputeMs = computeTime;

            // Rolling 1-second FPS
            fpsFrameTimestamps.push(now);
            while (fpsFrameTimestamps.length > 0 && (now - fpsFrameTimestamps[0]) > 1000) {
              fpsFrameTimestamps.shift();
            }
            if (fpsFrameTimestamps.length >= 2) {
              const elapsedWindow = now - fpsFrameTimestamps[0];
              devMetrics.fps = elapsedWindow > 0 ? Math.round(((fpsFrameTimestamps.length - 1) * 1000) / elapsedWindow) : 60;
            } else if (window.w && window.w.currentFps) {
              devMetrics.fps = window.w.currentFps;
            }

            const gObj = window.w && window.w.G;
            const isModalOpen = isModalOrOverlayActive();
            const isPausedOrModal = isModalOpen || (gObj && gObj.paused);

            // If game is paused or any modal is open, continuously push the grace window forward
            if (isPausedOrModal) {
              resumeGraceUntil = Math.max(resumeGraceUntil, now + 850);
            }

            const isGameRunning = gObj && gObj.running && !gObj.over && !isPausedOrModal;
            const launchElapsed = window._gameLaunchTime ? (now - window._gameLaunchTime) : (gObj ? (gObj.runTimeMs || 0) : 0);
            const isEligibleForCombatProfiling = isGameRunning && launchElapsed >= 3000 && now >= resumeGraceUntil;

            // Real-time Memory & GC Tracking
            let heapDrop = 0, isGC = false, currentHeapMB = 0;
            if (window.performance && window.performance.memory) {
              try {
                currentHeapMB = window.performance.memory.usedJSHeapSize / 1048576;
                if (devMetrics.lastHeapNum > 0 && (devMetrics.lastHeapNum - currentHeapMB) >= 0.12) {
                  heapDrop = devMetrics.lastHeapNum - currentHeapMB;
                  isGC = true;
                  if (isEligibleForCombatProfiling) devMetrics.gcPauses++;
                }
                devMetrics.lastHeapNum = currentHeapMB;
                devMetrics.heapUsedMB = currentHeapMB.toFixed(1) + " MB";
              } catch(e) {}
            }

            // Target display refresh rate and dynamic frame budget
            const is120Active = (window.et && window.et.targetFps === "120hz") && (window.w && window.w.displayHz > 90);
            const targetHz = is120Active ? ((window.w && window.w.displayHz) ? window.w.displayHz : 120) : 60;
            const targetInterval = 1000 / targetHz; // 16.66ms on 60Hz, 8.33ms on 120Hz

            // High-sensitivity multi-tier issue detection for ACTIVE COMBAT
            const isDroppedVsync = interval >= (targetInterval * 1.35); // >= 22.5ms on 60Hz
            const intervalDelta = Math.abs(interval - prevInterval);
            const isMicroStutter = (interval >= targetInterval * 1.18 && interval < targetInterval * 1.35) || (intervalDelta >= targetInterval * 0.30 && interval >= targetInterval * 1.10); // 19.6ms - 22.4ms or 5ms pacing swing
            const isHeavyCpu = computeTime >= (targetInterval * 0.58); // >= 9.6ms on 60Hz (leaving <7ms for compositor)
            const subSteps = (window.w && window.w._lastSubSteps) ? window.w._lastSubSteps : 1;
            const isPhysicsBurst = (subSteps >= 2);

            // Record ONLY during active combat gameplay with bullets and enemies
            if (isEligibleForCombatProfiling && (isDroppedVsync || isMicroStutter || isHeavyCpu || isPhysicsBurst || (isGC && interval >= targetInterval * 1.10))) {
              devMetrics.stutterCount++;

              let cause = "";
              let causeKey = "";
              if (isGC) {
                cause = "GC(-" + heapDrop.toFixed(1) + "MB)";
                causeKey = "gc";
                devMetrics.causeStats.gc++;
              } else if (isDroppedVsync) {
                cause = "VSyncDrop";
                causeKey = "vsync";
                devMetrics.causeStats.vsync++;
              } else if (isMicroStutter) {
                cause = "MicroStutter";
                causeKey = "micro";
                devMetrics.causeStats.micro++;
              } else if (isHeavyCpu) {
                cause = "HeavyCPU";
                causeKey = "cpu";
                devMetrics.causeStats.cpu++;
              } else if (isPhysicsBurst) {
                cause = "PhysicsBurst";
                causeKey = "physics";
                devMetrics.causeStats.physics++;
              } else {
                cause = "CadenceJitter";
                causeKey = "micro";
                devMetrics.causeStats.micro++;
              }

              const inGameTimeEl = document.getElementById("time-lbl");
              const inGameTime = inGameTimeEl ? inGameTimeEl.textContent.trim() : "0:00";
              const elWave = document.getElementById("wave-lbl");
              const wt = elWave ? elWave.textContent.trim().split("\n").join(" ") : ("W" + (gObj ? gObj.wave : "?"));

              const ent = getEntityStats();
              const lookbackMs = Math.max(500, Math.round(interval + 200));
              const rec = getRecentTriggers(lookbackMs);
              const trigStr = rec.length ? rec.join(",") : "None";

              const touchState = gObj ? (gObj.isDragging ? "Drag" : "Idle") : "NoGame";
              const waveSubState = gObj ? (gObj.waveTransition ? "WaveTrans" : (gObj.activeBoss ? "BossFight" : "Combat")) : "Idle";
              const cadence = devMetrics.intervalHistory.slice(-4, -1).map(function(x){ return Math.round(x) + "ms"; }).join(",");
              const extraInfo = isPhysicsBurst ? (" (" + subSteps + "x steps)") : isMicroStutter ? (" (Δ:" + intervalDelta.toFixed(1) + "ms)") : isHeavyCpu ? (" (Load:" + Math.round((computeTime/targetInterval)*100) + "%)") : "";

              const logEntry = cause + extraInfo + " [" + inGameTime + "] C:" + computeTime.toFixed(1) + "ms I:" + interval.toFixed(1) + "ms | " + wt + " (" + waveSubState + "|" + touchState + ") RAM:" + devMetrics.heapUsedMB + " | Prev:[" + cadence + "] | " + ent + " | Trig:" + trigStr;
              devMetrics.stutterLog.unshift({ text: logEntry, time: now, causeType: causeKey });
              if (devMetrics.stutterLog.length > 100) devMetrics.stutterLog.pop();
            }

            prevInterval = interval;
            devMetrics.history.push(computeTime);
            if (devMetrics.history.length > 60) devMetrics.history.shift();
          }
        }
      }

      // Throttle DOM and Sparkline UI updates to ~8Hz (every 120ms)
      if (now - lastUIUpdateTime >= 120) {
        lastUIUpdateTime = now;

        // Periodic background memory poll
        if (now - devMetrics.memTimer >= 1000) {
          devMetrics.memTimer = now;
          if (window.performance && window.performance.memory) {
            try {
              const mem = window.performance.memory;
              const usedMB = mem.usedJSHeapSize / 1048576;
              devMetrics.lastHeapNum = usedMB;
              devMetrics.heapUsedMB = usedMB.toFixed(1) + " MB";
            } catch(e) {}
          }
        }

        // Update Dev Diagnostics UI
        if (isMinimized) {
          const devHeaderTitle = document.getElementById("dev-header-title");
          if (devHeaderTitle) {
            devHeaderTitle.textContent = "SPIKES: " + devMetrics.stutterCount;
            devHeaderTitle.style.color = devMetrics.stutterCount === 0 ? "#00ffaa" : devMetrics.stutterCount < 5 ? "#ffaa00" : "#ff3366";
          }
        } else {
          // 1. FPS
          const elFps = document.getElementById("dev-fps-val") || document.getElementById("diag-fps-val");
          if (elFps) {
            elFps.textContent = devMetrics.fps;
            elFps.style.color = devMetrics.fps >= 55 ? "#00ffaa" : devMetrics.fps >= 30 ? "#ffaa00" : "#ff3366";
          }
          // 2. FRAME COMPUTE
          const elFrameTime = document.getElementById("dev-frametime-val");
          if (elFrameTime) {
            const ct = devMetrics.computeTimeMs;
            elFrameTime.textContent = ct.toFixed(1) + " ms";
            elFrameTime.style.color = ct <= 8.0 ? "#00ffaa" : ct <= 14.0 ? "#ffaa00" : "#ff3366";
          }
          // 3. INTERVAL
          const elInterval = document.getElementById("dev-interval-val");
          if (elInterval) {
            const itv = devMetrics.intervalMs;
            elInterval.textContent = itv.toFixed(1) + " ms";
            elInterval.style.color = itv <= 18.0 ? "#00e5ff" : itv <= 22.0 ? "#ffaa00" : "#ff3366";
          }
          // 4. RAM (HEAP)
          const elRam = document.getElementById("dev-ram-val");
          if (elRam) {
            elRam.textContent = devMetrics.heapUsedMB;
          }
          // 5. GAMEPLAY SPIKES & HITCHES
          const elSpikes = document.getElementById("dev-spikes-val") || document.getElementById("diag-stutter-val");
          if (elSpikes) {
            elSpikes.textContent = devMetrics.stutterCount;
            elSpikes.style.color = devMetrics.stutterCount === 0 ? "#00ffaa" : devMetrics.stutterCount < 5 ? "#ffaa00" : "#ff3366";
          }
          // 6. GC PAUSES
          const elGc = document.getElementById("dev-gc-val");
          if (elGc) {
            elGc.textContent = devMetrics.gcPauses;
          }
          // 7. SPARKLINE CANVAS
          const sparkCanvas = document.getElementById("dev-sparkline-canvas");
          if (sparkCanvas) {
            drawSparkline(sparkCanvas, devMetrics.history);
          }
          // 8. STUTTER & HITCH LOG
          const elLog = document.getElementById("dev-stutter-log");
          if (elLog) {
            if (devMetrics.stutterLog.length === 0) {
              elLog.innerHTML = '<span style="color:#667788;">No active gameplay issues.</span>';
            } else {
              elLog.innerHTML = devMetrics.stutterLog.map(function(item, idx) {
                var text = (item && typeof item === "object") ? item.text : item;
                const isGc = text.indexOf("GC") === 0;
                const isCpu = text.indexOf("HeavyCPU") === 0;
                const isVsync = text.indexOf("VSyncDrop") === 0;
                const isPhys = text.indexOf("PhysicsBurst") === 0;
                const isMicro = text.indexOf("MicroStutter") === 0;
                const clr = isGc ? "#cc66ff" : (isVsync ? "#ff3366" : (isCpu ? "#ff6644" : (isPhys ? "#ffee44" : (isMicro ? "#00e5ff" : "#ffaa00"))));
                return '<div style="color:' + clr + ';margin-bottom:2px;font-size:10px;line-height:1.25;">[' + (idx + 1) + '] ' + text + '</div>';
              }).join("");
            }
          }
        }
      }
    });
  };

  function applyInstrumentation() {
    if (isDevDiagEnabled) {
      if (window.requestAnimationFrame === originalRAF) window.requestAnimationFrame = diagRAF;
      installHooks();
    } else {
      if (window.requestAnimationFrame === diagRAF) window.requestAnimationFrame = originalRAF;
      uninstallHooks();
    }
  }

  updateDevDiagState(isDevDiagEnabled);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() { updateDevDiagState(isDevDiagEnabled); });
  }
})();
export {};



