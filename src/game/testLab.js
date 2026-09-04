// src/game/testLab.js - Streamlined Test Environment (Authentic Boss 9 Duel & Frame Timing Controls)
import { al } from './bosses.js';

let isTestLabActive = false;
let timingMode = 'mode1_clamped60'; // 'mode1_clamped60' | 'mode2_smooth_dt' | 'mode3_fixed_accumulator' | 'mode4_uncapped_native'
let dockMinimized = false;
let lastTelemetryUpdate = 0;

export const TIMING_MODES = [
  {
    id: 'mode1_clamped60',
    name: 'Mode 1: Engine Clamped (Adaptive)',
    desc: 'Adaptive sub-stepping (up to 3 steps on lag spikes >=38ms at 60Hz, >=22ms at 120Hz). Clamps frame delta to prevent speedups and bullet tunneling.'
  },
  {
    id: 'mode2_smooth_dt',
    name: 'Mode 2: Smooth Variable dt (Delta Time)',
    desc: 'Feeds exact elapsed delta time directly into physics (stepDt = delta). 100% fluid, continuous finger tracking without fixed-step quantization.'
  },
  {
    id: 'mode3_fixed_accumulator',
    name: 'Mode 3: Fixed Accumulator (60Hz Decoupled Physics)',
    desc: 'Decouples physics from refresh rate. Always ticks at fixed 60Hz (16.6ms) across all displays (60Hz, 90Hz, 120Hz) with renderAlpha interpolation.'
  },
  {
    id: 'mode4_uncapped_native',
    name: 'Mode 4: Native Uncapped RAF (Hardware VSync)',
    desc: '1:1 lock with hardware screen refreshes. Timestep is normalized to target refresh rate so movement speed stays 1.0x normal time.'
  }
];

export function isTestLab() {
  return isTestLabActive;
}

export function getTimingMode() {
  return timingMode;
}

export function setTimingMode(mode) {
  timingMode = mode;
  updateDockUI();
}

/**
 * Configure Player Ship with Max Upgrades and Complete Invulnerability
 */
export function applyMaxPlayerWeapons(g) {
  if (!g) return;
  g.invulnerable = true;
  g.godMode = true;
  g.hp = 9999;
  g.maxHp = 9999;
  g.iTimer = 999999999;

  // Max Plasma Bolt Arsenal
  g.shots = 5;         // 5-way forward plasma bolts
  g.ring = true;       // 8-way 360-degree ring bolts on every shot
  g.rate = 140;        // Extreme firing rate
  g.dmg = 24;          // High damage
  g.laserLevel = 5;    // Max dual plasma lasers
  g.aura = true;       // Ion aura active
  g.auraNova = true;   // Periodic pulse nova
  g.auraDmgMult = 3.0; // 3x aura damage
  g.pierce = 4;        // Plasma bolts pierce 4 targets

  // Populate max upgrade counts
  g.upgCounts = {
    multi: 5,
    fire: 5,
    dmg: 5,
    aura: 5,
    laser: 5,
    pierce: 3,
    hp: 0,
    killheal: 0,
    xpmag: 0
  };
  g.upgOrder = ['multi', 'fire', 'dmg', 'aura', 'laser', 'pierce'];
}

/**
 * Launch Test Lab: Authentic Boss Mode at Boss 9
 */
export function launchTestLab() {
  isTestLabActive = true;
  window.isTestLabActive = true;

  // Trigger main game launch
  const btnStart = document.getElementById('btn-start');
  if (btnStart && btnStart.onclick) {
    btnStart.onclick();
  }

  // Hide modal screens
  ['start-screen', 'settings-screen', 'pause-screen', 'up-screen', 'over-screen', 'win-screen', 'score-screen', 'adv-sounds-screen', 'enc-screen', 'lore-screen', 'achievements-screen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // Ensure Pause button is active & visible
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.style.display = 'flex';
    pauseBtn.classList.add('active');
  }

  // Initialize Authentic Boss Mode at Wave 27 (Boss 9)
  setTimeout(() => {
    const g = (window.w && window.w.G) ? window.w.G : null;
    if (g) {
      g.bossMode = true;
      g.wave = 27; // Authentic Wave 27 (Boss 9 in Boss Mode)
      g.waveTransition = false;
      g._pendingWave = false;
      g._upgradeQueue = 0;

      // Clean out any leftover entities without breaking pooled arrays and push methods
      if (g.bullets) g.bullets.length = 0;
      if (g.playerBullets) g.playerBullets.length = 0;
      if (g.enemyBullets) g.enemyBullets.length = 0;
      if (g.enemies) g.enemies.length = 0;
      if (g.parts) g.parts.length = 0;
      if (g.pickups) g.pickups.length = 0;
      g.activeBoss = null;

      // Cancel any wave banner so it doesn't later wipe the boss wave
      if (window.w) {
        window.w._waveBanner = null;
      }

      // Apply Max Weapons & God Mode to Player
      applyMaxPlayerWeapons(g);

      // Spawn authentic Boss 9 using official game engine Bv(27, al)
      if (typeof window.Bv === 'function') {
        window.Bv(27, al);
      }

      // Mark boss invulnerable so it never dies during testing
      if (g.activeBoss) {
        g.activeBoss.invulnerable = true;
      }

      // Ensure top-right wave label displays BOSS 9
      const waveLbl = document.getElementById('wave-lbl');
      if (waveLbl) waveLbl.innerHTML = 'BOSS<br>9';

      // Ensure Boss Bar displays BOSS 9
      const bbWrap = document.getElementById('boss-bar-wrap');
      const bbName = document.getElementById('boss-name-lbl');
      const bbFill = document.getElementById('boss-bar-fill');
      const bbVal = document.getElementById('boss-bar-val');
      if (bbWrap) bbWrap.classList.add('show');
      if (bbName) bbName.textContent = 'BOSS 9 (INVULNERABLE)';
      if (bbFill) bbFill.style.width = '100%';
      if (bbVal) bbVal.textContent = 'INVULNERABLE';
    }
    createOrShowDock();
  }, 120);
}

/**
 * Exit Test Lab and return to Start Screen
 */
export function exitTestLab() {
  isTestLabActive = false;
  window.isTestLabActive = false;

  // Hide Test Lab Dock
  const dock = document.getElementById('test-lab-dock');
  if (dock) dock.style.display = 'none';

  // Stop game loop
  if (window.w && window.w.G) {
    window.w.G.running = false;
    window.w.G.over = true;
  }
  if (window.w && window.w.rafId) {
    cancelAnimationFrame(window.w.rafId);
    window.w.rafId = null;
  }

  // Clear entities
  const g = (window.w && window.w.G) ? window.w.G : null;
  if (g) {
    if (g.bullets) g.bullets.length = 0;
    if (g.playerBullets) g.playerBullets.length = 0;
    if (g.enemyBullets) g.enemyBullets.length = 0;
    if (g.enemies) g.enemies.length = 0;
    if (g.parts) g.parts.length = 0;
    if (g.pickups) g.pickups.length = 0;
    g.activeBoss = null;
  }

  const bbWrap = document.getElementById('boss-bar-wrap');
  if (bbWrap) bbWrap.classList.remove('show');

  // Hide pause screen if it was open
  const pauseScreen = document.getElementById('pause-screen');
  if (pauseScreen) pauseScreen.classList.add('hidden');

  // Show start screen
  const startScreen = document.getElementById('start-screen');
  if (startScreen) startScreen.classList.remove('hidden');
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) {
    pauseBtn.classList.remove('active');
    pauseBtn.style.display = 'none';
  }
}

/**
 * Test Lab On-Screen Dock & Telemetry HUD Overlay
 */
function createOrShowDock() {
  let dock = document.getElementById('test-lab-dock');
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'test-lab-dock';
    document.body.appendChild(dock);
    setupDockEvents(dock);
  }
  dock.style.display = 'block';
  updateDockUI();
}

function setupDockEvents(dock) {
  dock.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;

    if (target.id === 'tl-btn-minimize' || target.closest('#tl-btn-minimize')) {
      dockMinimized = !dockMinimized;
      updateDockUI();
    } else if (target.id === 'tl-btn-pause' || target.closest('#tl-btn-pause')) {
      const pauseBtn = document.getElementById('pause-btn');
      if (pauseBtn) pauseBtn.click();
    } else if (target.id === 'tl-fps-60' || target.closest('#tl-fps-60')) {
      if (window.selectFpsTarget) window.selectFpsTarget('60hz');
      updateDockUI();
    } else if (target.id === 'tl-fps-120' || target.closest('#tl-fps-120')) {
      if (window.selectFpsTarget) window.selectFpsTarget('120hz');
      updateDockUI();
    } else if (target.id === 'tl-fps-auto' || target.closest('#tl-fps-auto')) {
      if (window.selectFpsTarget) window.selectFpsTarget('auto');
      updateDockUI();
    } else if (target.id === 'tl-mode-1' || target.closest('#tl-mode-1')) {
      setTimingMode('mode1_clamped60');
    } else if (target.id === 'tl-mode-2' || target.closest('#tl-mode-2')) {
      setTimingMode('mode2_smooth_dt');
    } else if (target.id === 'tl-mode-3' || target.closest('#tl-mode-3')) {
      setTimingMode('mode3_fixed_accumulator');
    } else if (target.id === 'tl-mode-4' || target.closest('#tl-mode-4')) {
      setTimingMode('mode4_uncapped_native');
    } else if (target.id === 'tl-mode-5' || target.closest('#tl-mode-5')) {
      setTimingMode('mode5_30hz_interpolated');
    } else if (target.id === 'tl-btn-exit' || target.closest('#tl-btn-exit')) {
      exitTestLab();
    }
  });
}

/**
 * Update Telemetry & Dock UI
 */
export function updateTestLabTelemetry(fps, delta, subSteps, computeMs) {
  if (!isTestLabActive) return;
  const now = performance.now();
  if (now - lastTelemetryUpdate < 90) return;
  lastTelemetryUpdate = now;

  const g = (window.w && window.w.G) ? window.w.G : null;
  if (!g) return;

  // Maintain Invulnerability for both Player and Boss 9
  g.hp = g.maxHp = 9999;
  g.godMode = true;
  g.invulnerable = true;
  if (g.activeBoss) {
    g.activeBoss.chp = g.activeBoss.mhp;
    g.activeBoss.alive = true;
    g.activeBoss.invulnerable = true;
  }

  const bCount = g.bullets ? g.bullets.filter(b => b.alive).length : 0;
  const displayHz = window.w && window.w.displayHz ? window.w.displayHz : 60;
  const spikes = (window.devMetrics && window.devMetrics.stutterCount) ? window.devMetrics.stutterCount : 0;

  const elFps = document.getElementById('tl-stat-fps');
  const elDelta = document.getElementById('tl-stat-delta');
  const elHz = document.getElementById('tl-stat-hz');
  const elSteps = document.getElementById('tl-stat-steps');
  const elEntities = document.getElementById('tl-stat-entities');
  const elSpikes = document.getElementById('tl-stat-spikes');

  if (elFps) elFps.textContent = fps + ' FPS';
  if (elDelta) elDelta.textContent = delta.toFixed(1) + ' ms';
  if (elHz) elHz.textContent = displayHz + ' Hz';
  if (elSteps) elSteps.textContent = subSteps + ' step' + (subSteps > 1 ? 's' : '');
  if (elEntities) elEntities.textContent = 'Bullets: ' + bCount;
  if (elSpikes) {
    elSpikes.textContent = spikes;
    elSpikes.style.color = spikes === 0 ? '#00ffaa' : (spikes < 5 ? '#ffaa00' : '#ff3366');
  }
}

export function updateDockUI() {
  const dock = document.getElementById('test-lab-dock');
  if (!dock) return;

  const curFpsMode = (window.et && window.et.targetFps) ? window.et.targetFps : 'auto';
  const modeObj = TIMING_MODES.find(m => m.id === timingMode) || TIMING_MODES[0];

  if (dockMinimized) {
    dock.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <span style="color:#00ffaa; font-weight:bold; font-size:12px;">🧪 TEST LAB: <span id="tl-stat-fps">60 FPS</span></span>
        <span style="color:#ffcc00; font-size:11px;" id="tl-stat-delta">16.6ms</span>
        <div style="display:flex; gap:6px;">
          <button id="tl-btn-pause" class="tl-btn" style="padding:2px 8px; font-size:10px; background:#ffaa00; color:#000; font-weight:bold;">⏸ PAUSE</button>
          <button id="tl-btn-minimize" class="tl-btn" style="padding:2px 8px; font-size:10px; background:#00e5ff; color:#000;">EXPAND</button>
        </div>
      </div>
    `;
    return;
  }

  dock.innerHTML = `
    <!-- Dock Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0,255,170,0.3); padding-bottom:5px; margin-bottom:8px;">
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="font-size:13px; font-weight:bold; color:#00ffaa; text-shadow:0 0 8px #00ffaa;">🧪 HZ & TIMING LAB</span>
        <span style="font-size:9px; background:rgba(0,255,170,0.15); color:#00ffaa; border:1px solid #00ffaa; padding:1px 4px; border-radius:3px;">BOSS 9 DUEL</span>
      </div>
      <div style="display:flex; gap:5px;">
        <button id="tl-btn-pause" class="tl-btn" style="padding:2px 8px; font-size:10px; background:#ffaa00; color:#000; font-weight:bold;">⏸ PAUSE</button>
        <button id="tl-btn-minimize" class="tl-btn" style="padding:2px 8px; font-size:10px; background:#00e5ff; color:#000;">MIN</button>
        <button id="tl-btn-exit" class="tl-btn" style="padding:2px 8px; font-size:10px; background:#ff3366; color:#fff; font-weight:bold;">✕ EXIT</button>
      </div>
    </div>

    <!-- Target Refresh Switcher (60Hz / 120Hz / Auto) -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:rgba(0,25,45,0.85); padding:5px 8px; border-radius:6px; border:1px solid rgba(0,229,255,0.3);">
      <span style="font-size:10px; color:#88e5ff; font-weight:bold; letter-spacing:0.5px;">TARGET REFRESH:</span>
      <div style="display:flex; gap:4px;">
        <button id="tl-fps-60" class="tl-btn" style="padding:3px 10px; font-size:11px; background:${curFpsMode === '60hz' ? '#00ffaa' : '#1e293b'}; color:${curFpsMode === '60hz' ? '#000' : '#fff'}; font-weight:bold; border-color:${curFpsMode === '60hz' ? '#00ffaa' : 'rgba(255,255,255,0.2)'};">60 HZ</button>
        <button id="tl-fps-120" class="tl-btn" style="padding:3px 10px; font-size:11px; background:${curFpsMode === '120hz' ? '#00ffaa' : '#1e293b'}; color:${curFpsMode === '120hz' ? '#000' : '#fff'}; font-weight:bold; border-color:${curFpsMode === '120hz' ? '#00ffaa' : 'rgba(255,255,255,0.2)'};">120 HZ</button>
        <button id="tl-fps-auto" class="tl-btn" style="padding:3px 10px; font-size:11px; background:${curFpsMode === 'auto' ? '#00ffaa' : '#1e293b'}; color:${curFpsMode === 'auto' ? '#000' : '#fff'}; font-weight:bold; border-color:${curFpsMode === 'auto' ? '#00ffaa' : 'rgba(255,255,255,0.2)'};">AUTO</button>
      </div>
    </div>

    <!-- Live Telemetry Matrix -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; background:rgba(0,10,20,0.85); border:1px solid rgba(0,204,136,0.25); border-radius:6px; padding:6px 8px; margin-bottom:8px; font-family:'Outfit',monospace; font-size:11px;">
      <div>FPS: <strong id="tl-stat-fps" style="color:#00ffaa;">60 FPS</strong></div>
      <div>Delta: <strong id="tl-stat-delta" style="color:#ffcc00;">16.6 ms</strong></div>
      <div>Display: <strong id="tl-stat-hz" style="color:#00e5ff;">60 Hz</strong></div>
      <div>Physics: <strong id="tl-stat-steps" style="color:#cc66ff;">1 step</strong></div>
      <div>Active: <strong id="tl-stat-entities" style="color:#88ffcc;">Bullets: 0</strong></div>
      <div>Spikes: <strong id="tl-stat-spikes" style="color:#00ffaa;">0</strong></div>
    </div>

    <!-- Timing Methods Switcher (4 Direct Buttons) -->
    <div style="margin-bottom:4px;">
      <div style="font-size:10px; color:#88bbcc; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Timing & Physics Method:</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:6px;">
        <button id="tl-mode-1" class="tl-btn" style="padding:6px 4px; font-size:10px; font-weight:bold; text-align:center; background:${timingMode === 'mode1_clamped60' ? '#00e5ff' : 'rgba(0,40,60,0.85)'}; color:${timingMode === 'mode1_clamped60' ? '#000' : '#88e5ff'}; border-color:${timingMode === 'mode1_clamped60' ? '#00e5ff' : 'rgba(0,229,255,0.3)'};">
          1: CLAMPED
        </button>
        <button id="tl-mode-2" class="tl-btn" style="padding:6px 4px; font-size:10px; font-weight:bold; text-align:center; background:${timingMode === 'mode2_smooth_dt' ? '#00ffaa' : 'rgba(0,50,40,0.85)'}; color:${timingMode === 'mode2_smooth_dt' ? '#000' : '#00ffaa'}; border-color:${timingMode === 'mode2_smooth_dt' ? '#00ffaa' : 'rgba(0,255,170,0.3)'};">
          2: SMOOTH DT
        </button>
        <button id="tl-mode-3" class="tl-btn" style="padding:6px 4px; font-size:10px; font-weight:bold; text-align:center; background:${timingMode === 'mode3_fixed_accumulator' ? '#ffcc00' : 'rgba(50,40,0,0.85)'}; color:${timingMode === 'mode3_fixed_accumulator' ? '#000' : '#ffcc00'}; border-color:${timingMode === 'mode3_fixed_accumulator' ? '#ffcc00' : 'rgba(255,204,0,0.3)'};">
          3: FIXED ACC
        </button>
        <button id="tl-mode-4" class="tl-btn" style="padding:6px 4px; font-size:10px; font-weight:bold; text-align:center; background:${timingMode === 'mode4_uncapped_native' ? '#cc66ff' : 'rgba(50,10,60,0.85)'}; color:${timingMode === 'mode4_uncapped_native' ? '#000' : '#cc66ff'}; border-color:${timingMode === 'mode4_uncapped_native' ? '#cc66ff' : 'rgba(204,102,255,0.3)'};">
          4: UNCAPPED
        </button>
        <button id="tl-mode-5" class="tl-btn" style="grid-column: 1 / -1; padding:7px 4px; font-size:10px; font-weight:bold; text-align:center; background:${timingMode === 'mode5_30hz_interpolated' ? '#ff0055' : 'rgba(60,10,25,0.85)'}; color:${timingMode === 'mode5_30hz_interpolated' ? '#fff' : '#ff6688'}; border-color:${timingMode === 'mode5_30hz_interpolated' ? '#ff0055' : 'rgba(255,0,85,0.4)'}; box-shadow:${timingMode === 'mode5_30hz_interpolated' ? '0 0 10px rgba(255,0,85,0.5)' : 'none'};">
          ⭐ 5: 30Hz DECOUPLED (2:1 INTERPOLATED)
        </button>
      </div>
      <div style="font-size:9.5px; color:#bbddee; background:rgba(0,20,35,0.8); border:1px solid rgba(0,229,255,0.2); border-radius:4px; padding:4px 6px; line-height:1.35;">
        <strong style="color:#00e5ff;">${modeObj.name}:</strong> ${modeObj.desc}
      </div>
    </div>
  `;
}

window.updateTestLabDockUI = updateDockUI;
