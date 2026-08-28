const fs = require('fs');

const html = fs.readFileSync('../game html for android.html', 'utf8');
const scripts = html.match(/<script[\s\S]*?<\/script>/gi);

const s0Orig = scripts[0].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
const s1 = scripts[1].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
let s2 = scripts[2].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
const s3 = scripts[3].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');

// Replace prewarm collision flags in s2 safely on window using robust regexes
s2 = s2.replace(/let Ha\s*=\s*null\s*,\s*to\s*=\s*!1\s*,\s*no\s*=\s*!1;/, 'let Ha=null;window._gameBulletsPrewarmed=!1;window._gamePrerendersDone=!1;');
s2 = s2.replace(/function H0\(\)\s*\{\s*if\s*\(\s*no\s*\)\s*return;\s*no\s*=\s*!0;\s*to\s*=\s*!0;/, 'function H0(){\n  if(window._gamePrerendersDone)return;\n  window._gamePrerendersDone=!0;window._gameBulletsPrewarmed=!0;');
s2 = s2.replace(/async function Jv\(\s*a\s*\)\s*\{\s*if\s*\(\s*no\s*\)\s*\{/, 'async function Jv(a){\n  if(window._gamePrerendersDone){');
s2 = s2.replace(/if\s*\(\s*!to\s*\)\s*\{\s*to\s*=\s*!0;\s*for\s*\(\s*let u\s*=\s*0;\s*u\s*<\s*8;\s*u\+\+\s*\)\s*Ne\("player_bullet_"\s*\+\s*u\s*,/, 'if(!window._gameBulletsPrewarmed){\n  window._gameBulletsPrewarmed=!0;for(let u=0;u<8;u++)Ne("player_bullet_"+u,');
s2 = s2.replace(/Qh\(\)\s*,\s*no\s*=\s*!0\s*,\s*to\s*=\s*!0/, 'Qh(),window._gamePrerendersDone=!0,window._gameBulletsPrewarmed=!0');

// Landmarks in s2
const posBossImg = s2.indexOf('const bossSkullImg=');
const posSiren = s2.indexOf('const sirenAudioSrc=');
const posReact = s2.indexOf('var E0={exports:{}},Ai={};');
const posGameConst = s2.indexOf('const GAME_CONSTANTS=');
const posSfxBuf = s2.indexOf('let Fe=null');
const posWpnIcons = s2.indexOf('const WPN_ICONS=') !== -1 ? s2.indexOf('const WPN_ICONS=') : s2.indexOf('const WPN_ICONS');
const posAl = s2.indexOf(',al=[');
const posPl = s2.indexOf(',pl=[');
const posXv = s2.indexOf('function xv(');
const posCreateRoot = s2.indexOf('vv.createRoot(');

// 1. src/game/bosses.js
const alCode = 'const ' + s2.slice(posAl + 1, posPl).trim() + ';';
const bossesJs = `/**
 * @fileoverview Boss Assets & Definitions (10 Bosses).
 */
import bossSkullSrc from '../assets/boss_skull.png';

const bossSkullImg = new Image();
bossSkullImg.src = bossSkullSrc;

${alCode}

window.bossSkullImg = window._bossSkullImg = bossSkullImg;
window.al = al;

export { bossSkullImg, al };
`;
fs.writeFileSync('src/game/bosses.js', bossesJs);
console.log('Created src/game/bosses.js');

// 2. src/game/audio.js
const audioCode = s2.slice(posSfxBuf, posWpnIcons).trim();
const audioJs = `/**
 * @fileoverview Sound Synthesis, SFX Buffers & Siren Streaming.
 */
import sirenAudioSrc from '../assets/siren.mp3';

${audioCode}

window.sirenAudioSrc = sirenAudioSrc;
window.sfxBuffers = sfxBuffers;
window.playBufferSfx = playBufferSfx;
window.pauseSiren = pauseSiren;
window.fo = fo;
window.U0 = U0;
window.Ph = Ph;
window.Uh = Uh;
window.Nh = Nh;
window.Gn = Gn;
window.Rn = Rn;
window.J0 = J0;
window.W0 = W0;
window.$0 = $0;
window.F0 = F0;
window.x0 = x0;
window.eu = eu;
window.tu = tu;
window.Yh = Yh;
window.lu = lu;
window.Fe = Fe;

export {
  sirenAudioSrc,
  sfxBuffers,
  playBufferSfx,
  pauseSiren,
  fo,
  U0,
  Ph,
  Uh,
  Nh,
  Gn,
  Rn,
  J0,
  W0,
  $0,
  F0,
  x0,
  eu,
  tu,
  Yh,
  lu,
  Fe
};
`;
fs.writeFileSync('src/game/audio.js', audioJs);
console.log('Created src/game/audio.js');

// 3. src/game/engine.js (Contains constants, weapons, state, renderers, prewarmers, and score systems)
const enginePart1 = s2.slice(posGameConst, posSfxBuf).trim();
const enginePart2 = s2.slice(posWpnIcons, posAl).trim();
const enginePart3 = 'const ' + s2.slice(posPl + 1, posXv).trim();

const engineJs = `/**
 * @fileoverview Unified Galaxy Outlast Game Engine.
 */
import { bossSkullImg, al } from './bosses.js';
import {
  sirenAudioSrc, sfxBuffers, playBufferSfx, pauseSiren,
  fo, U0, Ph, Uh, Nh, Gn, Rn, J0, W0, $0, F0, x0, eu, tu, Yh, lu, Fe
} from './audio.js';

${enginePart1}

${enginePart2}

${enginePart3}

// Attach all engine symbols to window
window.GAME_CONSTANTS = GAME_CONSTANTS;
window.w = w;
window.et = et;
window.WPN_ICONS = WPN_ICONS;
window.ha = ha;
window.pl = pl;
window.Z0 = Z0;
window.kh = kh;
window.so = so;
window.ao = ao;
window._pb = _pb;
window.Ln = Ln;
window.H0 = H0;
window.Qh = Qh;
window.Jv = Jv;
window.N0 = N0;
window.qh = qh;
window.ma = ma;
window.Bv = Bv;
window.Av = Av;
window.wv = wv;
window.zv = zv;
window.Gv = Gv;
window.Ra = Ra;
window.Ah = Ah;
window.Rv = Rv;
window.Hv = Hv;
window.Pv = Pv;
window.Uv = Uv;
window.Nv = Nv;
window.Gh = Gh;
window.Mv = Mv;
window.Rh = Rh;
window.K0 = K0;
window.scoreKey = scoreKey;
window.runScoreKey = runScoreKey;
window.loadScores = loadScores;
window.updateDamageless = updateDamageless;
window.setScoreTab = setScoreTab;
window.Lh = Lh;
window.xs = xs;
window.Wv = Wv;
window.Xl = Xl;
window.Bh = Bh;
window.Ui = Ui;
window.Ih = Ih;
window.prewarmGraphics = prewarmGraphics;
window.triggerWaveTransitionGC = triggerWaveTransitionGC;
window.updateFpsDisplayState = updateFpsDisplayState;

export {
  GAME_CONSTANTS,
  w,
  et,
  WPN_ICONS,
  ha,
  pl,
  Z0,
  kh,
  so,
  ao,
  _pb,
  Ln,
  H0,
  Qh,
  Jv,
  N0,
  qh,
  ma,
  Bv,
  Av,
  wv,
  zv,
  Gv,
  Ra,
  Ah,
  Rv,
  Hv,
  Pv,
  Uv,
  Nv,
  Gh,
  Mv,
  Rh,
  K0,
  scoreKey,
  runScoreKey,
  loadScores,
  updateDamageless,
  setScoreTab,
  Lh,
  xs,
  Wv,
  Xl,
  Bh,
  Ui,
  Ih,
  prewarmGraphics,
  triggerWaveTransitionGC,
  updateFpsDisplayState
};
`;
fs.writeFileSync('src/game/engine.js', engineJs);
console.log('Created src/game/engine.js');

// 4. src/game/state.js, src/game/render.js, src/game/weapons.js
const stateJs = `/**
 * @fileoverview Game Constants & State Interface.
 */
export const GAME_CONSTANTS = {
  CANVAS_WIDTH: 433,
  CANVAS_HEIGHT: 915,
  HEADER_HEIGHT: 86,
  MAX_WAVES: 30
};

export * from './engine.js';
`;
fs.writeFileSync('src/game/state.js', stateJs);
console.log('Created src/game/state.js');

fs.writeFileSync('src/game/render.js', `export * from './engine.js';\n`);
console.log('Created src/game/render.js');

fs.writeFileSync('src/game/weapons.js', `export * from './engine.js';\n`);
console.log('Created src/game/weapons.js');

// 5. src/game/diagnostics.js
fs.writeFileSync('src/game/diagnostics.js', `// src/game/diagnostics.js - Developer Diagnostics & Profiler Overlay\n${s3.trim()}\nexport {};\n`);
console.log('Created src/game/diagnostics.js');

// 6. src/main.js
const reactCode = s2.slice(posReact, posGameConst).trim();
const xvCode = s2.slice(posXv, posCreateRoot).trim();
const mountCode = s2.slice(posCreateRoot).trim();

// Enhanced top error banner in main.js
const s0Enhanced = `(function(){
  var shown = !1;
  function show(tag, msg) {
    try {
      var box = document.getElementById("__boot_err");
      if (!box) {
        box = document.createElement("div");
        box.id = "__boot_err";
        box.style.cssText = "position:fixed;left:10px;right:10px;top:15px;max-height:85vh;z-index:2147483647;background:rgba(90,0,17,0.97);border:2px solid #ff4466;color:#ffffff;font:13px/1.4 monospace;padding:16px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.9);white-space:pre-wrap;overflow-y:auto;";
        (document.body || document.documentElement).appendChild(box);
        box.addEventListener("click", function() { box.parentNode && box.parentNode.removeChild(box); });
      }
      shown = !0;
      box.textContent = "GALAXY OUTLAST " + tag + " (build v1.33):\\n" + String(msg).substring(0, 1200) + "\\n\\n[ TAP ANYWHERE ON THIS BOX TO DISMISS ]";
    } catch(e) {}
  }
  window.__showFatal = function(msg) { show("ERROR", msg); };
  window.__bootStage = "page-loaded";
  setTimeout(function() {
    try {
      if (!window.__bootDone) {
        var bs = document.getElementById("btn-start");
        show("STARTUP STALL", "stage=" + window.__bootStage +
          " | launchWired=" + (!!(bs && bs.onclick)) +
          " | view=" + window.innerWidth + "x" + window.innerHeight +
          " dpr=" + window.devicePixelRatio);
      }
    } catch(e) {}
  }, 4000);
  window.addEventListener("error", function(e) {
    var r = e && (e.error || e.message);
    show("ERROR", r && ((r.stack || r.message) || String(r)) || String(e));
  });
  window.addEventListener("unhandledrejection", function(e) {
    var r = e && e.reason, s = (r && (r.stack || r.message)) || String(r);
    if (/orientation\\.lock|ServiceWorkerRegistration|serviceWorker/i.test(s)) return;
    show("PROMISE REJECTION", s);
  });
})();`;

const mainJs = `// src/main.js - Galaxy Outlast Main Entry Point
import './styles/main.css';

// 1. Boot Error Reporter
${s0Enhanced}

// 2. Service Worker & Cache Cleanup
${s1.trim()}

// 3. Game Core Modules & Full Cross-Module Imports
import { bossSkullImg, al } from './game/bosses.js';
import {
  sirenAudioSrc, sfxBuffers, playBufferSfx, pauseSiren,
  fo, U0, Ph, Uh, Nh, Gn, Rn, J0, W0, $0, F0, x0, eu, tu, Yh, lu, Fe
} from './game/audio.js';
import {
  GAME_CONSTANTS, w, et, WPN_ICONS, ha, pl, Z0, kh, so, ao, _pb, Ln, H0, Qh, Jv,
  N0, qh, ma, Bv, Av, wv, zv, Gv, Ra, Ah, Rv, Hv, Pv, Uv, Nv, Gh, Mv, Rh, K0,
  scoreKey, runScoreKey, loadScores, updateDamageless, setScoreTab, Lh, xs,
  Wv, Xl, Bh, Ui, Ih, prewarmGraphics, triggerWaveTransitionGC, updateFpsDisplayState
} from './game/engine.js';
import './game/diagnostics.js';

// Global shared state for UI & FPS timers across React & xv scopes
let lastRenderT = 0;
let ie = 0;

// 4. React Runtime & UI Markup
${reactCode}

// 5. Main Canvas Initialization, Event Listeners, Menus & React Root Component
${xvCode}

// 6. React DOM Mount
${mountCode}
`;
fs.writeFileSync('src/main.js', mainJs);
console.log('Created src/main.js');
