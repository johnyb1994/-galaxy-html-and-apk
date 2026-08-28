/**
 * @fileoverview Boss Assets, Definitions and Boss Wave Configurations for Galaxy Outlast.
 * Contains the 10 boss configurations (al) with HP, speed, score, attack patterns, and assets.
 */

import bossSkullSrc from '../assets/boss_skull.png';

const bossSkullImg = new Image();
bossSkullImg.src = bossSkullSrc;

/**
 * 10 Boss Ship Definitions
 * @type {Array<{bossType: number, name: string, clr: string, glw: string, w: number, h: number, bhp: number, spd: number, sc: number, xp: number, pat: string, shoots: boolean, isBoss: boolean, segmentCount?: number, waveLength?: number, bloodMistDensity?: number, wingScale?: number}>}
 */
const al = [
  { bossType: 1, name: "BOSS 1", clr: "#ff0033", glw: "#ff0033", w: 56, h: 48, bhp: 660, spd: 0.75, sc: 500, xp: 283, pat: "boss1", shoots: true, isBoss: true },
  { bossType: 2, name: "BOSS 2", clr: "#9900ff", glw: "#aa00ff", w: 60, h: 50, bhp: 1400, spd: 0.85, sc: 800, xp: 472, pat: "boss2", shoots: true, isBoss: true },
  { bossType: 3, name: "BOSS 3", clr: "#00ffee", glw: "#00ccff", w: 64, h: 52, bhp: 2600, spd: 0.8, sc: 1200, xp: 755, pat: "boss3", shoots: true, isBoss: true },
  { bossType: 4, name: "BOSS 4", clr: "#ff6600", glw: "#ff4400", w: 68, h: 54, bhp: 4200, spd: 0.9, sc: 1700, xp: 1133, pat: "boss4", shoots: true, isBoss: true },
  { bossType: 5, name: "BOSS 5", clr: "#ffff00", glw: "#ffcc00", w: 72, h: 56, bhp: 6500, spd: 0.95, sc: 2300, xp: 1605, pat: "boss5", shoots: true, isBoss: true },
  { bossType: 6, name: "BOSS 6", clr: "#ff0099", glw: "#ff0066", w: 76, h: 58, bhp: 9800, spd: 1.0, sc: 3000, xp: 2266, pat: "boss6", shoots: true, isBoss: true },
  { bossType: 7, name: "BOSS 7", clr: "#00ff88", glw: "#00ffaa", w: 80, h: 60, bhp: 14000, spd: 1.05, sc: 4000, xp: 3021, pat: "boss7", shoots: true, isBoss: true },
  { bossType: 8, name: "BOSS 8", clr: "#7700ff", glw: "#9900ff", w: 84, h: 62, bhp: 20000, spd: 1.1, sc: 5500, xp: 4154, pat: "boss8", shoots: true, isBoss: true },
  { bossType: 9, name: "BOSS 9", clr: "#ff2200", glw: "#ff0000", w: 88, h: 64, bhp: 28000, spd: 1.15, sc: 7500, xp: 5664, pat: "boss9", shoots: true, isBoss: true, segmentCount: 12, waveLength: 0.2, bloodMistDensity: 0.4, wingScale: 1.2 },
  { bossType: 10, name: "FINAL BOSS", clr: "#ffffff", glw: "#ff0033", w: 96, h: 72, bhp: 40000, spd: 1.2, sc: 12000, xp: 7553, pat: "boss9", shoots: true, isBoss: true, segmentCount: 12, waveLength: 0.2, bloodMistDensity: 0.4, wingScale: 1.2 }
];

window.bossSkullImg = window._bossSkullImg = bossSkullImg;
window.al = al;

export { bossSkullImg, al };
