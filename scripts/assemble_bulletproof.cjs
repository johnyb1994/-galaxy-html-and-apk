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
const posW = s2.indexOf(',w={G:');
const posPb = s2.indexOf('function _pb(');
const posSo = s2.indexOf('function so(');
const posZ0 = s2.indexOf('function Z0(');
const posH0 = s2.indexOf('function H0(');
const posCanvasVars = s2.indexOf('let at,Dn,Ga,Pa=null');
const posScoreKey = s2.indexOf('function scoreKey(');
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

// 3. src/game/weapons.js
const weaponsCode = s2.slice(posWpnIcons, posAl).trim();
const plCode = 'const ' + s2.slice(posPl + 1, posW).trim() + ';';

const weaponsJs = `/**
 * @fileoverview Weapon Upgrades Catalog (ha), Weapon Icons (WPN_ICONS), and Enemy Stats (pl).
 */
${weaponsCode}

${plCode}

window.WPN_ICONS = WPN_ICONS;
window.ha = ha;
window.pl = pl;

export {
  WPN_ICONS,
  ha,
  pl
};
`;
fs.writeFileSync('src/game/weapons.js', weaponsJs);
console.log('Created src/game/weapons.js');

// 4. src/game/state.js
const stateHeadCode = s2.slice(posGameConst, posSfxBuf).trim();
const wCode = 'const ' + s2.slice(posW + 1, posPb).trim();
const z0Code = s2.slice(posZ0, posH0).trim();
const scoresCode = s2.slice(posScoreKey, posXv).trim();

const stateJs = `/**
 * @fileoverview Game State Factory (Z0), Game Constants, Settings & High Score Tables.
 */
import { al } from './bosses.js';
import { ha, pl, WPN_ICONS } from './weapons.js';
import {
  fo, U0, Ph, Uh, Nh, Gn, Rn, J0, W0, $0, F0, x0, eu, tu, Yh, lu,
  playBufferSfx, pauseSiren, sfxBuffers
} from './audio.js';
import { H0, _pb } from './render.js';

${stateHeadCode}

${wCode}

${z0Code}

${scoresCode}

window.GAME_CONSTANTS = GAME_CONSTANTS;
window.w = w;
window.et = et;
window.Gh = Gh;
window.Mv = Mv;
window.Rh = Rh;
window.getModeHighScore = getModeHighScore;
window.getModeDamagelessHighScore = getModeDamagelessHighScore;
window.triggerWaveTransitionGC = triggerWaveTransitionGC;
window.prewarmGraphics = prewarmGraphics;
window.updateFpsDisplayState = updateFpsDisplayState;
window.K0 = K0;
window.qh = qh;
window.N0 = N0;
window.Xh = Xh;
window.kh = kh;
window.Av = Av;
window.wv = wv;
window.zv = zv;
window.Bv = Bv;
window.ma = ma;
window.ct = ct;
window.Ov = Ov;
window.Lv = Lv;
window.gl = gl;
window.jt = jt;
window.Gv = Gv;
window.Ra = Ra;
window.Ah = Ah;
window.Rv = Rv;
window.Hv = Hv;
window.Pv = Pv;
window.Uv = Uv;
window.Nv = Nv;
window._bsc = _bsc;
window._asc = _asc;
window.Z0 = Z0;
window.Kv = Kv;
window.scoreKey = scoreKey;
window.runScoreKey = runScoreKey;
window.loadScores = loadScores;
window.updateDamageless = updateDamageless;
window.setScoreTab = setScoreTab;
window.scoreTab = scoreTab;
window.Lh = Lh;
window.xs = xs;
window.SCORE_TABLE_HEADER = SCORE_TABLE_HEADER;
window.oo = oo;
window.Fv = Fv;

export {
  GAME_CONSTANTS,
  w,
  et,
  Gh,
  Mv,
  Rh,
  getModeHighScore,
  getModeDamagelessHighScore,
  triggerWaveTransitionGC,
  prewarmGraphics,
  updateFpsDisplayState,
  K0,
  qh,
  N0,
  Xh,
  kh,
  Av,
  wv,
  zv,
  Bv,
  ma,
  ct,
  Ov,
  Lv,
  gl,
  jt,
  Gv,
  Ra,
  Ah,
  Rv,
  Hv,
  Pv,
  Uv,
  Nv,
  _bsc,
  _asc,
  Z0,
  Kv,
  scoreKey,
  runScoreKey,
  loadScores,
  updateDamageless,
  setScoreTab,
  scoreTab,
  Lh,
  xs,
  SCORE_TABLE_HEADER,
  oo,
  Fv
};
`;
fs.writeFileSync('src/game/state.js', stateJs);
console.log('Created src/game/state.js');

// 5. src/game/render.js
const renderLoopCode = s2.slice(posPb, posSo).trim();
const soCode = s2.slice(posSo, posZ0).trim();
const prewarmCode = s2.slice(posH0, posCanvasVars).trim();

const renderJs = `/**
 * @fileoverview Main Canvas Renderer (so), Bullet Spawner (_pb), Update Loop (ao), Ship Drawing (Ln) & Texture Prewarming (H0, Qh, Jv).
 */
import { al, bossSkullImg } from './bosses.js';
import { ha, pl, WPN_ICONS } from './weapons.js';
import {
  w, et, Z0, xs, Fv, GAME_CONSTANTS, K0,
  qh, N0, Xh, kh, Av, wv, zv, Bv, ma, ct, Ov, Lv, gl, jt, Gv, Ra, Ah, Rv, Hv, Pv, Uv, Nv, _bsc, _asc,
  prewarmGraphics, triggerWaveTransitionGC
} from './state.js';
import {
  fo, U0, Ph, Uh, Nh, Gn, Rn, J0, W0, $0, F0, x0, eu, tu, Yh, lu
} from './audio.js';

${renderLoopCode}

${soCode}

${prewarmCode}

window._pb = _pb;
window.ao = ao;
window.Ln = Ln;
window.hu = hu;
window.io = io;
window.so = so;
window.H0 = H0;
window.Qh = Qh;
window.Jv = Jv;

export {
  _pb,
  ao,
  Ln,
  hu,
  io,
  so,
  H0,
  Qh,
  Jv
};
`;
fs.writeFileSync('src/game/render.js', renderJs);
console.log('Created src/game/render.js');

// 6. src/game/diagnostics.js
fs.writeFileSync('src/game/diagnostics.js', `// src/game/diagnostics.js - Developer Diagnostics & Profiler Overlay\n${s3.trim()}\nexport {};\n`);
console.log('Created src/game/diagnostics.js');

// 7. src/main.js
const reactCode = s2.slice(posReact, posGameConst).trim();
const canvasAndUiHandlers = s2.slice(posCanvasVars, posScoreKey).trim();
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
import { WPN_ICONS, ha, pl } from './game/weapons.js';
import {
  sirenAudioSrc, sfxBuffers, playBufferSfx, pauseSiren,
  fo, U0, Ph, Uh, Nh, Gn, Rn, J0, W0, $0, F0, x0, eu, tu, Yh, lu, Fe
} from './game/audio.js';
import {
  GAME_CONSTANTS, w, et, Gh, Mv, Rh, getModeHighScore, getModeDamagelessHighScore,
  triggerWaveTransitionGC, prewarmGraphics, updateFpsDisplayState, K0,
  qh, N0, Xh, kh, Av, wv, zv, Bv, ma, ct, Ov, Lv, gl, jt, Gv, Ra, Ah, Rv, Hv, Pv, Uv, Nv,
  _bsc, _asc, Z0, Kv, scoreKey, runScoreKey, loadScores, updateDamageless, setScoreTab, scoreTab,
  Lh, xs, SCORE_TABLE_HEADER, oo, Fv
} from './game/state.js';
import { _pb, ao, Ln, hu, io, so, H0, Qh, Jv } from './game/render.js';
import './game/diagnostics.js';

// Global shared state for UI & FPS timers across React & xv scopes
let lastRenderT = 0;
let ie = 0;

// 4. React Runtime & UI Markup
${reactCode}

// 5. Canvas State & UI Modal Event Handlers
${canvasAndUiHandlers}

// 6. Main Canvas Initialization, Event Listeners, Menus & React Root Component
${xvCode}

// 7. React DOM Mount
${mountCode}
`;
fs.writeFileSync('src/main.js', mainJs);
console.log('Created src/main.js');
