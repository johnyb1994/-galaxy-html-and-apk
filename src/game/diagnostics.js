// src/game/diagnostics.js - Developer Diagnostics & Profiler Overlay
(function() {
  var triggerLog = window._triggerLog || (window._triggerLog = []);
  window.addTrigger = function(type, detail) {
    var now = performance.now();
    triggerLog.push({ type: type, detail: detail, time: now });
    if (triggerLog.length > 120) triggerLog.shift();
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
        for (var i = 0; i < g.bullets.length; i++) if (g.bullets[i].alive) bCount++;
      }
      var eCount = 0;
      if (g.enemies) {
        for (var j = 0; j < g.enemies.length; j++) if (g.enemies[j].alive) eCount++;
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
          if (g.enemies[i].alive && g.enemies[i].isBoss) {
            return g.enemies[i].name ? g.enemies[i].name : "1";
          }
        }
      }
      return "0";
    } catch(e) { return "0"; }
  }

  var _origAudioPlay=null,_origOsc=null,_origStorageFn=null,_hookInterval=null;
  function installHooks() {
    if (_hookInterval) return;
    try {
      _origAudioPlay = HTMLAudioElement.prototype.play;
      HTMLAudioElement.prototype.play = function() {
        var s = "snd";
        try {
          if (this.id) s = this.id;
          else if (this.src) {
            if (this.src.startsWith("data:")) {
              s = "data_sfx";
            } else {
              s = this.src.split("/").pop().split("?")[0].replace(".mp3","").replace(".wav","");
              if (s.length > 16) s = s.substring(0, 16);
            }
          }
        } catch(e) { s = "snd"; }
        window.addTrigger("Aud", s);
        return _origAudioPlay.apply(this, arguments);
      };
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC && AC.prototype.createOscillator) {
        _origOsc = AC.prototype.createOscillator;
        AC.prototype.createOscillator = function() {
          window.addTrigger("Synth", "osc");
          return _origOsc.apply(this, arguments);
        };
      }
      _origStorageFn = localStorage.setItem;
      localStorage.setItem = function(k, v) {
        if (k !== "galaxy_dev_diag") window.addTrigger("Save", k);
        return _origStorageFn.apply(this, arguments);
      };
      _hookInterval = setInterval(function() {
        if (typeof window.gl === "function" && !window.gl.__traced) {
          var _gl = window.gl;
          window.gl = function(boss) {
            window.addTrigger("BossCharge", boss ? (boss.pat || "atk") : "atk");
            return _gl.apply(this, arguments);
          };
          window.gl.__traced = true;
        }
        if (typeof window.Bv === "function" && !window.Bv.__traced) {
          var _Bv = window.Bv;
          window.Bv = function(w) {
            window.addTrigger("BossSpawn", "W" + w);
            return _Bv.apply(this, arguments);
          };
          window.Bv.__traced = true;
        }
        if (typeof window.triggerWaveTransitionGC === "function" && !window.triggerWaveTransitionGC.__traced) {
          window.triggerWaveTransitionGC.__traced = true;
        }
      }, 300);
    } catch(e) {}
  }
  function uninstallHooks() {
    if (!_hookInterval) return;
    clearInterval(_hookInterval); _hookInterval = null;
    try {
      if (_origAudioPlay) HTMLAudioElement.prototype.play = _origAudioPlay;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC && _origOsc) AC.prototype.createOscillator = _origOsc;
      if (_origStorageFn) localStorage.setItem = _origStorageFn;
    } catch(e) {}
    _origAudioPlay=null;_origOsc=null;_origStorageFn=null;
  }

  let devMetrics = {
    fps: 0, computeTimeMs: 0, intervalMs: 0, stutterCount: 0, stutterLog: [],
    history: new Array(60).fill(4.0), intervalHistory: new Array(30).fill(16.6),
    lastTime: performance.now(), heapUsedMB: "N/A", lastHeap: 0, lastHeapNum: 0, gcPauses: 0,
    maxComputeMs: 0, avgComputeMs: 0, totalComputeMs: 0, causeStats: { vsync: 0, cpu: 0, gc: 0 },
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

  function isOverlayActive() {
    const overlayIds = ['up-screen','pause-screen','start-screen','over-screen','win-screen','settings-screen','achievements-screen','enc-screen','adv-sounds-screen','lore-screen'];
    for (let i = 0; i < overlayIds.length; i++) {
      const el = document.getElementById(overlayIds[i]);
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
    } else if (target.id === "dev-toggle-btn" || target.id === "dev-header" || target.closest("#dev-header")) {
      e.stopPropagation();
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
          devPanel.style.padding = isMinimized ? "5px 10px" : "10px 14px";
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
    } else if (target.id === "dev-header-clear-btn" || target.id === "dev-clear-report-btn") {
      e.stopPropagation();
      devMetrics.stutterCount = 0;
      devMetrics.gcPauses = 0;
      devMetrics.stutterLog = [];
      devMetrics.causeStats = { vsync: 0, cpu: 0, gc: 0 };
      const elLog = document.getElementById("dev-stutter-log");
      if (elLog) elLog.innerHTML = '<span style="color:#667788;">No active gameplay stutters.</span>';
      const elSpikes = document.getElementById("dev-spikes-val");
      if (elSpikes) { elSpikes.textContent = "0"; elSpikes.style.color = "#00ffaa"; }
      const elGc = document.getElementById("dev-gc-val");
      if (elGc) { elGc.textContent = "0"; }
    } else if (target.id === "diag-copy-btn" || target.closest("#diag-copy-btn") || target.id === "dev-copy-report-btn" || target.closest("#dev-copy-report-btn")) {
      e.stopPropagation();
      var elWave = document.getElementById("wave-lbl");
      var wav = elWave ? elWave.textContent.trim().split("\n").join("") : "W?";
      var bss = getBossStatus();
      var tot = devMetrics.stutterCount;
      var den = tot || 1;
      var trig = getRecentTriggers(100);
      var trigStr = trig.length ? trig.join(",") : "None";
      var lines = [
        "[DIAG] FPS:" + devMetrics.fps + " C:avg " + devMetrics.avgComputeMs.toFixed(1) + "ms,max " + devMetrics.maxComputeMs.toFixed(1) + "ms | Spikes:" + tot + " | GC:" + devMetrics.gcPauses + " | RAM:" + devMetrics.heapUsedMB + " | " + wav + " Boss:" + bss,
        "Causes: VSync:" + devMetrics.causeStats.vsync + "(" + ((devMetrics.causeStats.vsync/den)*100).toFixed(0) + "%) CPU:" + devMetrics.causeStats.cpu + "(" + ((devMetrics.causeStats.cpu/den)*100).toFixed(0) + "%) GC:" + devMetrics.causeStats.gc + "(" + ((devMetrics.causeStats.gc/den)*100).toFixed(0) + "%)",
        "Triggers(100ms): " + trigStr,
        "Logs(" + devMetrics.stutterLog.length + "):"
      ];
      for (var i = 0; i < devMetrics.stutterLog.length; i++) {
        lines.push("[" + (i+1) + "] " + devMetrics.stutterLog[i]);
      }
      if (!devMetrics.stutterLog.length) lines.push("No stutters");
      copyReportText(lines.join("\n"));
    }
  });

  function copyReportText(text) {
    var btn = document.getElementById("diag-copy-btn") || document.getElementById("dev-copy-report-btn");
    function ok() {
      if (btn) {
        btn.textContent = "COPIED!";
        btn.style.background = "#00ffaa";
        btn.style.color = "#000";
        setTimeout(function() {
          btn.textContent = "COPY REPORT";
          btn.style.background = "rgba(0,51,34,0.8)";
          btn.style.color = "#00ffaa";
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
  let lastFrameTime = performance.now();
  let totalFramesOverall = 0;

  // Initialize heap display immediately if supported
  if (window.performance && window.performance.memory) {
    try {
      devMetrics.heapUsedMB = (window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1) + " MB";
    } catch(e) {}
  }

  function drawSparkline(canvas, history) {
    if (!canvas || !history || !history.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width || 240;
    const h = canvas.height || 40;
    ctx.clearRect(0, 0, w, h);

    // 16.6ms threshold reference line (red dashed)
    const maxScale = 33.3;
    const lineY = Math.round(h - (16.6 / maxScale) * h);
    ctx.strokeStyle = "rgba(255, 68, 68, 0.4)";
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

  window.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    lastFrameTime = performance.now();
  });
  window.addEventListener('focus', () => {
    lastFrameTime = performance.now();
  });

  var diagRAF = function(callback) {
    return originalRAF.call(window, function(timestamp) {
      const now = performance.now();
      const interval = now - lastFrameTime;
      lastFrameTime = now;

      // Always execute callback
      const cbStart = performance.now();
      callback(timestamp);
      const cbEnd = performance.now();
      const computeTime = (cbEnd - cbStart);

      if (!isDevDiagEnabled || interval >= 500.0) {
        return;
      }

      devMetrics.intervalMs = interval;
      devMetrics.intervalHistory.push(interval);
      if (devMetrics.intervalHistory.length > 30) devMetrics.intervalHistory.shift();

      devMetrics.computeTimeMs = computeTime;
      totalFramesOverall++;
      devMetrics.totalComputeMs += computeTime;
      devMetrics.avgComputeMs = devMetrics.totalComputeMs / totalFramesOverall;
      if (computeTime > devMetrics.maxComputeMs) devMetrics.maxComputeMs = computeTime;

      const inGameTimeEl = document.getElementById("time-lbl");
      const inGameTime = inGameTimeEl ? inGameTimeEl.textContent.trim() : "0:00";
      const elWave = document.getElementById("wave-lbl");
      const wt = elWave ? elWave.textContent.trim().split("\n").join("") : "W?";
      const bss = getBossStatus();

      const gObj = window.w && window.w.G;
      const isGameActive = gObj && gObj.running && !gObj.over;
      const launchElapsed = window._gameLaunchTime ? (now - window._gameLaunchTime) : (gObj ? (gObj.runTimeMs || 0) : 0);
      const isPastGracePeriod = isGameActive && launchElapsed >= 3000;

      // Instantaneous Real-time Heap & GC Check
      let heapDrop = 0, isGC = false, currentHeapMB = 0;
      if (window.performance && window.performance.memory) {
        try {
          const mem = window.performance.memory;
          currentHeapMB = Number((mem.usedJSHeapSize / (1024 * 1024)).toFixed(2));
          if (devMetrics.lastHeapNum > 0 && (devMetrics.lastHeapNum - currentHeapMB) >= 0.35) {
            heapDrop = Number((devMetrics.lastHeapNum - currentHeapMB).toFixed(2));
            isGC = true;
            if (isPastGracePeriod) devMetrics.gcPauses++;
          }
          devMetrics.lastHeapNum = currentHeapMB;
          devMetrics.heapUsedMB = currentHeapMB.toFixed(1) + " MB";
        } catch(e) {}
      }

      // Detect Spike / Jank (Only logs after 3 seconds post-launch)
      if (isPastGracePeriod && (interval > 24.0 || computeTime > 16.6) && interval < 500.0) {
        devMetrics.stutterCount++;
        const isCpu = computeTime > 16.6;
        let cause = isGC ? ("GC(-" + heapDrop + "MB)") : (isCpu ? "CPU" : "VSync");
        if (isGC) devMetrics.causeStats.gc++;
        else if (isCpu) devMetrics.causeStats.cpu++;
        else devMetrics.causeStats.vsync++;

        const ent = getEntityStats();
        const lookbackMs = Math.max(500, interval + 200);
        const rec = getRecentTriggers(lookbackMs, 2);
        const trigStr = rec.length ? rec.join(",") : "None";

        const touchState = gObj ? (gObj.isDragging ? "TouchDrag" : "TouchIdle") : "NoGame";
        const waveSubState = gObj ? (gObj.waveTransition ? "WaveTrans" : (gObj.activeBoss ? "BossFight" : "Combat")) : "Idle";
        const cadence = devMetrics.intervalHistory.slice(-4, -1).map(function(x){ return Math.round(x) + "ms"; }).join(",");

        const logEntry = cause + "[" + inGameTime + "] C:" + computeTime.toFixed(1) + "ms I:" + interval.toFixed(1) + "ms | " + wt + " (" + waveSubState + "|" + touchState + ") RAM:" + devMetrics.heapUsedMB + " | Prev:[" + cadence + "] | " + ent + " | Trig:" + trigStr;
        devMetrics.stutterLog.unshift(logEntry);
        if (devMetrics.stutterLog.length > 50) devMetrics.stutterLog.pop();
      }

      devMetrics.history.push(computeTime);
      if (devMetrics.history.length > 60) devMetrics.history.shift();

      const sumIntervals = devMetrics.intervalHistory.reduce((a, b) => a + b, 0);
      const avgInterval = sumIntervals / devMetrics.intervalHistory.length;
      devMetrics.fps = avgInterval > 0 ? Math.round(1000 / avgInterval) : 60;

      // Periodic memory poll
      if (now - devMetrics.memTimer >= 1000) {
        devMetrics.memTimer = now;
        if (window.performance && window.performance.memory) {
          try {
            const mem = window.performance.memory;
            const usedMB = (mem.usedJSHeapSize / (1024 * 1024)).toFixed(1);
            if (devMetrics.lastHeap > 0 && (devMetrics.lastHeap - usedMB) > 3.5) {
              devMetrics.gcPauses++;
              devMetrics.causeStats.gc++;
            }
            devMetrics.lastHeap = usedMB;
            devMetrics.heapUsedMB = usedMB + " MB";
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
          elFrameTime.style.color = ct <= 8.0 ? "#00ffaa" : ct <= 16.0 ? "#ffaa00" : "#ff3366";
        }
        // 3. INTERVAL
        const elInterval = document.getElementById("dev-interval-val");
        if (elInterval) {
          const itv = devMetrics.intervalMs;
          elInterval.textContent = itv.toFixed(1) + " ms";
          elInterval.style.color = itv <= 18.0 ? "#00e5ff" : itv <= 24.0 ? "#ffaa00" : "#ff3366";
        }
        // 4. RAM (HEAP)
        const elRam = document.getElementById("dev-ram-val");
        if (elRam) {
          elRam.textContent = devMetrics.heapUsedMB;
        }
        // 5. GAMEPLAY SPIKES
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
        // 8. STUTTER LOG
        const elLog = document.getElementById("dev-stutter-log");
        if (elLog) {
          if (devMetrics.stutterLog.length === 0) {
            elLog.innerHTML = '<span style="color:#667788;">No active gameplay stutters.</span>';
          } else {
            elLog.innerHTML = devMetrics.stutterLog.map(function(item, idx) {
              const isGc = item.indexOf("GC") === 0;
              const isCpu = item.indexOf("CPU") === 0;
              const clr = isGc ? "#cc66ff" : (isCpu ? "#ff4466" : "#ffaa00");
              return '<div style="color:' + clr + ';margin-bottom:2px;">[' + (idx + 1) + '] ' + item + '</div>';
            }).join("");
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
