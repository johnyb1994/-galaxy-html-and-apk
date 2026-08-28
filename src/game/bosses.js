/**
 * @fileoverview Boss Assets & Definitions (10 Bosses).
 */
import bossSkullSrc from '../assets/boss_skull.png';

const bossSkullImg = new Image();
bossSkullImg.src = bossSkullSrc;

const al=[{bossType:1,name:"BOSS 1",clr:"#ff0033",glw:"#ff0033",w:56,h:48,bhp:660,spd:.75,sc:500,xp:283,pat:"boss1",shoots:!0,isBoss:!0,tentacleCount:8,tentacleLen:2,coreSize:1,engineFlareSize:.5},{bossType:0,name:"BOSS 2",clr:"#aa00ff",glw:"#dd00ff",w:62,h:54,bhp:800,spd:.5,sc:800,xp:458,pat:"boss0",shoots:!0,isBoss:!0,clawThickness:2.5,clawLen:1.4,thrusterLen:.6,eyeSize:.8},{bossType:2,name:"BOSS 3",clr:"#0088ff",glw:"#00ccff",w:70,h:62,bhp:1e3,spd:.65,sc:1200,xp:849,pat:"boss2",shoots:!0,isBoss:!0,pistonStroke:2.5,visorSpeed:1.3,turretSize:2.5,visorWidth:1.3},{bossType:3,name:"BOSS 4",clr:"#ff6600",glw:"#ff9900",w:66,h:58,bhp:1200,spd:.8,sc:1800,xp:1611,pat:"boss3",shoots:!0,isBoss:!0,panelCount:16,panelOrbit:2.5,sailSpread:.5,reactorScale:1.2},{bossType:4,name:"BOSS 5",clr:"#00ffaa",glw:"#00ffdd",w:70,h:62,bhp:1460,spd:.7,sc:2600,xp:2695,pat:"boss4",shoots:!0,isBoss:!0,wingSize:1.4,mandibleAngle:1.2,antennaLen:1.3,satelliteCount:7},{bossType:5,name:"BOSS 6",clr:"#ddddff",glw:"#aaaaff",w:74,h:66,bhp:1800,spd:.55,sc:3500,xp:3907,pat:"boss5",shoots:!0,isBoss:!0,jitterMult:0,ringSpeed:1,bladeLen:2.5,shimmerTrails:8},{bossType:6,name:"BOSS 7",clr:"#aaaaaa",glw:"#ffffff",w:78,h:70,bhp:2200,spd:.9,sc:5e3,xp:5619,pat:"boss6",shoots:!0,isBoss:!0,vibrationAmp:3,radarSpeed:1.1,hazardBlinkRate:1,stabilizerWidth:.5},{bossType:7,name:"BOSS 8",clr:"#ffff00",glw:"#ffff88",w:76,h:68,bhp:2700,spd:.75,sc:7e3,xp:8052,pat:"boss7",shoots:!0,isBoss:!0,lightningDensity:1.9,branchProb:0,sparkRad:2.5,cloudGlow:.5},{bossType:8,name:"BOSS 9",clr:"#9900ff",glw:"#cc66ff",w:80,h:72,bhp:3200,spd:.6,sc:9500,xp:10019,pat:"boss8",shoots:!0,isBoss:!0,spiralRays:6,swirlSpeed:2,pylonCount:7,distortionRadius:1.9},{bossType:9,name:"BOSS 10",clr:"#ff2200",glw:"#ffffff",w:90,h:80,bhp:4200,spd:.65,sc:2e4,xp:0,pat:"boss9",shoots:!0,isBoss:!0,segmentCount:12,waveLength:.2,bloodMistDensity:.4,wingScale:1.2}];

window.bossSkullImg = window._bossSkullImg = bossSkullImg;
window.al = al;

export { bossSkullImg, al };
