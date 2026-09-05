/**
 * @fileoverview Sound Synthesis, SFX Buffers & Siren Streaming.
 */
import sirenAudioSrc from '../assets/siren.mp3';

let Fe=null,On=null;const sfxBuffers={};

const bossAudioVariants = [
  // ==========================================
  // Boss 0: Void Claw Pincer Dread (Purple #aa00ff)
  // ==========================================
  [
    // Variant 0: High-Voltage Arc Charge
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(110, t0);
      osc1.frequency.exponentialRampToValueAtTime(550, t0 + dur * 0.95);

      osc2.type = "square";
      osc2.frequency.setValueAtTime(850, t0);
      osc2.frequency.exponentialRampToValueAtTime(2400, t0 + dur * 0.95);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(600, t0);
      filter.frequency.exponentialRampToValueAtTime(2800, t0 + dur * 0.95);
      filter.Q.setValueAtTime(3.5, t0);

      gain.gain.setValueAtTime(0.01, t0);
      gain.gain.linearRampToValueAtTime(0.2, t0 + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0.28, t0 + dur * 0.95);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + dur);
      osc2.stop(t0 + dur);
    },
    // Variant 1: Hydraulic Pincer Grind & Clamp
    function(ctx, t0, out) {
      const dur = 1.2;
      const sub = ctx.createOscillator();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      sub.type = "sawtooth";
      sub.frequency.setValueAtTime(65, t0);
      sub.frequency.exponentialRampToValueAtTime(140, t0 + dur * 0.9);

      // Minor second dissonance creates heavy mechanical crunch
      osc1.type = "square";
      osc1.frequency.setValueAtTime(220, t0);
      osc1.frequency.exponentialRampToValueAtTime(440, t0 + dur * 0.9);

      osc2.type = "square";
      osc2.frequency.setValueAtTime(233, t0);
      osc2.frequency.exponentialRampToValueAtTime(466, t0 + dur * 0.9);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(280, t0);
      filter.frequency.exponentialRampToValueAtTime(1200, t0 + dur * 0.9);
      filter.Q.setValueAtTime(4.0, t0);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.26, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      sub.connect(filter);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      sub.start(t0);
      osc1.start(t0);
      osc2.start(t0);
      sub.stop(t0 + dur);
      osc1.stop(t0 + dur);
      osc2.stop(t0 + dur);
    },
    // Variant 2: Plasma Capacitor Whistle & Arc Snaps
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(380, t0);
      osc.frequency.exponentialRampToValueAtTime(2800, t0 + dur * 0.95);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + dur * 0.9);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + dur);

      // 4 electric arc discharge snaps
      [0.2, 0.45, 0.7, 0.95].forEach(st => {
        const snap = ctx.createOscillator();
        const sg = ctx.createGain();
        snap.type = "sawtooth";
        snap.frequency.setValueAtTime(1600, t0 + st);
        snap.frequency.exponentialRampToValueAtTime(120, t0 + st + 0.06);
        sg.gain.setValueAtTime(0.18, t0 + st);
        sg.gain.exponentialRampToValueAtTime(0.001, t0 + st + 0.06);
        snap.connect(sg);
        sg.connect(out);
        snap.start(t0 + st);
        snap.stop(t0 + st + 0.07);
      });
    }
  ],

  // ==========================================
  // Boss 1: Crimson Tentacle Horror (Red #ff0033)
  // ==========================================
  [
    // Variant 0: Bio-Heartbeat Surge
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const mainGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(85, t0);
      osc.frequency.exponentialRampToValueAtTime(260, t0 + dur * 0.95);

      lfo.type = "sine";
      lfo.frequency.setValueAtTime(4, t0);
      lfo.frequency.linearRampToValueAtTime(14, t0 + dur * 0.95);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(220, t0);
      filter.frequency.exponentialRampToValueAtTime(850, t0 + dur * 0.95);
      filter.Q.setValueAtTime(4.0, t0);

      lfo.connect(mainGain.gain);

      mainGain.gain.setValueAtTime(0.05, t0);
      mainGain.gain.linearRampToValueAtTime(0.26, t0 + dur * 0.85);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(mainGain);
      mainGain.connect(out);

      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + dur);
      lfo.stop(t0 + dur);
    },
    // Variant 1: Alien Guttural Hiss / Acid Prime
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(70, t0);
      osc1.frequency.exponentialRampToValueAtTime(220, t0 + dur * 0.95);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(73, t0);
      osc2.frequency.exponentialRampToValueAtTime(228, t0 + dur * 0.95);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(320, t0);
      filter.frequency.exponentialRampToValueAtTime(1400, t0 + dur * 0.95);
      filter.Q.setValueAtTime(5.5, t0);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.28, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + dur);
      osc2.stop(t0 + dur);
    },
    // Variant 2: Visceral Flesh Whiplash
    function(ctx, t0, out) {
      const dur = 1.2;
      const sub = ctx.createOscillator();
      const lash = ctx.createOscillator();
      const trem = ctx.createOscillator();
      const tremGain = ctx.createGain();
      const lashGain = ctx.createGain();

      sub.type = "sine";
      sub.frequency.setValueAtTime(58, t0);
      sub.frequency.exponentialRampToValueAtTime(95, t0 + dur);

      lash.type = "sawtooth";
      lash.frequency.setValueAtTime(120, t0);
      lash.frequency.exponentialRampToValueAtTime(450, t0 + dur * 0.95);

      trem.type = "sine";
      trem.frequency.setValueAtTime(14, t0);
      trem.frequency.linearRampToValueAtTime(24, t0 + dur * 0.95);
      trem.connect(lashGain.gain);

      lashGain.gain.setValueAtTime(0.03, t0);
      lashGain.gain.linearRampToValueAtTime(0.25, t0 + dur * 0.85);
      lashGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      sub.connect(lashGain);
      lash.connect(lashGain);
      lashGain.connect(out);

      sub.start(t0);
      lash.start(t0);
      trem.start(t0);
      sub.stop(t0 + dur);
      lash.stop(t0 + dur);
      trem.stop(t0 + dur);
    }
  ],

  // ==========================================
  // Boss 2: Blue Steel Dreadnought (Blue #0088ff)
  // ==========================================
  [
    // Variant 0: Hydraulic Servo & Tactical Lock
    function(ctx, t0, out) {
      const dur = 1.2;
      const servo = ctx.createOscillator();
      const servoGain = ctx.createGain();
      const servoFilter = ctx.createBiquadFilter();

      servo.type = "sawtooth";
      servo.frequency.setValueAtTime(75, t0);
      servo.frequency.exponentialRampToValueAtTime(160, t0 + dur * 0.9);

      servoFilter.type = "lowpass";
      servoFilter.frequency.setValueAtTime(180, t0);
      servoFilter.frequency.exponentialRampToValueAtTime(900, t0 + dur * 0.9);

      servoGain.gain.setValueAtTime(0.08, t0);
      servoGain.gain.linearRampToValueAtTime(0.2, t0 + dur * 0.85);
      servoGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      servo.connect(servoFilter);
      servoFilter.connect(servoGain);
      servoGain.connect(out);
      servo.start(t0);
      servo.stop(t0 + dur);

      const chirps = [
        { t: 0.0, f: 440, len: 0.18 },
        { t: 0.28, f: 660, len: 0.18 },
        { t: 0.56, f: 880, len: 0.18 },
        { t: 0.84, f: 1320, len: 0.35 }
      ];
      chirps.forEach(c => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(c.f, t0 + c.t);
        g.gain.setValueAtTime(0, t0 + c.t);
        g.gain.linearRampToValueAtTime(0.12, t0 + c.t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + c.t + c.len);
        o.connect(g);
        g.connect(out);
        o.start(t0 + c.t);
        o.stop(t0 + c.t + c.len);
      });
    },
    // Variant 1: Sonar Ping & Heavy Railgun Charge
    function(ctx, t0, out) {
      const dur = 1.2;
      // Sonar ping
      const ping = ctx.createOscillator();
      const pingGain = ctx.createGain();
      ping.type = "sine";
      ping.frequency.setValueAtTime(800, t0);
      ping.frequency.exponentialRampToValueAtTime(740, t0 + 0.4);
      pingGain.gain.setValueAtTime(0.25, t0);
      pingGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
      ping.connect(pingGain);
      pingGain.connect(out);
      ping.start(t0);
      ping.stop(t0 + 0.5);

      // Rising railgun magnetic charge
      const rail = ctx.createOscillator();
      const railGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      rail.type = "sawtooth";
      rail.frequency.setValueAtTime(90, t0 + 0.2);
      rail.frequency.exponentialRampToValueAtTime(560, t0 + dur * 0.95);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(250, t0 + 0.2);
      filter.frequency.exponentialRampToValueAtTime(1800, t0 + dur * 0.95);
      railGain.gain.setValueAtTime(0.01, t0 + 0.2);
      railGain.gain.linearRampToValueAtTime(0.28, t0 + dur * 0.9);
      railGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      rail.connect(filter);
      filter.connect(railGain);
      railGain.connect(out);
      rail.start(t0 + 0.2);
      rail.stop(t0 + dur);
    },
    // Variant 2: High-Tech Cyber Targeting Siren
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(600, t0);
      osc.frequency.linearRampToValueAtTime(1300, t0 + dur * 0.95);

      lfo.type = "square";
      lfo.frequency.setValueAtTime(8, t0);
      lfo.frequency.linearRampToValueAtTime(16, t0 + dur * 0.95);
      lfoGain.gain.setValueAtTime(120, t0);
      lfo.connect(osc.frequency);

      gain.gain.setValueAtTime(0.03, t0);
      gain.gain.linearRampToValueAtTime(0.2, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + dur);
      lfo.stop(t0 + dur);
    }
  ],

  // ==========================================
  // Boss 3: Solar Reactor Fortress (Orange #ff6600)
  // ==========================================
  [
    // Variant 0: Thermonuclear Fusion Flare
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      sub.type = "sine";
      sub.frequency.setValueAtTime(55, t0);
      sub.frequency.exponentialRampToValueAtTime(110, t0 + dur);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(130, t0);
      osc.frequency.exponentialRampToValueAtTime(420, t0 + dur * 0.95);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, t0);
      filter.frequency.exponentialRampToValueAtTime(1600, t0 + dur * 0.95);
      filter.Q.setValueAtTime(5.0, t0);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.24, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      sub.connect(gain);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      sub.start(t0);
      osc.start(t0);
      sub.stop(t0 + dur);
      osc.stop(t0 + dur);
    },
    // Variant 1: Solar Magnetic Vortex / Particle Sweep
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const fm = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, t0);
      osc.frequency.exponentialRampToValueAtTime(620, t0 + dur * 0.95);

      fm.type = "sine";
      fm.frequency.setValueAtTime(12, t0);
      fm.frequency.linearRampToValueAtTime(36, t0 + dur * 0.95);
      fm.connect(osc.frequency);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, t0);
      filter.frequency.exponentialRampToValueAtTime(2200, t0 + dur * 0.95);
      filter.Q.setValueAtTime(4.0, t0);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.28, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(t0);
      fm.start(t0);
      osc.stop(t0 + dur);
      fm.stop(t0 + dur);
    },
    // Variant 2: Critical Mass Geiger Radiation
    function(ctx, t0, out) {
      const dur = 1.2;
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = "triangle";
      sub.frequency.setValueAtTime(60, t0);
      sub.frequency.exponentialRampToValueAtTime(150, t0 + dur * 0.9);
      subGain.gain.setValueAtTime(0.12, t0);
      subGain.gain.linearRampToValueAtTime(0.24, t0 + dur * 0.85);
      subGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      sub.connect(subGain);
      subGain.connect(out);
      sub.start(t0);
      sub.stop(t0 + dur);

      // Accelerated radiation clicks
      const clicks = [0.05, 0.18, 0.32, 0.44, 0.54, 0.63, 0.71, 0.78, 0.84, 0.89, 0.94, 0.98];
      clicks.forEach(ctk => {
        const cOsc = ctx.createOscillator();
        const cG = ctx.createGain();
        cOsc.type = "square";
        cOsc.frequency.setValueAtTime(1400, t0 + ctk);
        cOsc.frequency.exponentialRampToValueAtTime(200, t0 + ctk + 0.02);
        cG.gain.setValueAtTime(0.16, t0 + ctk);
        cG.gain.exponentialRampToValueAtTime(0.001, t0 + ctk + 0.02);
        cOsc.connect(cG);
        cG.connect(out);
        cOsc.start(t0 + ctk);
        cOsc.stop(t0 + ctk + 0.025);
      });
    }
  ],

  // ==========================================
  // Boss 4: Emerald Mantis Queen (Emerald #00ffaa)
  // ==========================================
  [
    // Variant 0: Ultrasonic Wing Drone
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const trem = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, t0);
      osc.frequency.exponentialRampToValueAtTime(680, t0 + dur * 0.95);

      trem.type = "sine";
      trem.frequency.setValueAtTime(32, t0);
      trem.frequency.linearRampToValueAtTime(58, t0 + dur * 0.95);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(480, t0);
      filter.frequency.exponentialRampToValueAtTime(1800, t0 + dur * 0.95);
      filter.Q.setValueAtTime(3.0, t0);

      trem.connect(gain.gain);

      gain.gain.setValueAtTime(0.03, t0);
      gain.gain.linearRampToValueAtTime(0.22, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(t0);
      trem.start(t0);
      osc.stop(t0 + dur);
      trem.stop(t0 + dur);
    },
    // Variant 1: Cybernetic Swarm Chitter
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const fm = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(750, t0);
      osc.frequency.exponentialRampToValueAtTime(2200, t0 + dur * 0.95);

      fm.type = "square";
      fm.frequency.setValueAtTime(28, t0);
      fm.frequency.linearRampToValueAtTime(52, t0 + dur * 0.95);
      fm.connect(osc.frequency);

      filter.type = "highpass";
      filter.frequency.setValueAtTime(600, t0);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.2, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(t0);
      fm.start(t0);
      osc.stop(t0 + dur);
      fm.stop(t0 + dur);
    },
    // Variant 2: Venom Stinger Razor Whine
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(520, t0);
      osc.frequency.exponentialRampToValueAtTime(1480, t0 + dur * 0.95);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(700, t0);
      filter.frequency.exponentialRampToValueAtTime(2400, t0 + dur * 0.95);
      filter.Q.setValueAtTime(6.0, t0);

      gain.gain.setValueAtTime(0.03, t0);
      gain.gain.linearRampToValueAtTime(0.26, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(t0);
      osc.stop(t0 + dur);
    }
  ],

  // ==========================================
  // Boss 5: Spectral Chrono Phantom (Lavender #ddddff)
  // ==========================================
  [
    // Variant 0: Dimensional Shimmer & Chime
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(360, t0);
      osc1.frequency.exponentialRampToValueAtTime(740, t0 + dur * 0.95);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(366, t0);
      osc2.frequency.exponentialRampToValueAtTime(752, t0 + dur * 0.95);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(500, t0);
      filter.frequency.exponentialRampToValueAtTime(2600, t0 + dur * 0.95);
      filter.Q.setValueAtTime(5.5, t0);

      gain.gain.setValueAtTime(0.05, t0);
      gain.gain.linearRampToValueAtTime(0.42, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + dur);
      osc2.stop(t0 + dur);
    },
    // Variant 1: Chrono-Stutter Reverse
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      // Downward frequency sweep gives time-reverse feel
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1100, t0);
      osc.frequency.exponentialRampToValueAtTime(280, t0 + dur * 0.95);

      lfo.type = "square";
      lfo.frequency.setValueAtTime(16, t0);
      lfo.frequency.linearRampToValueAtTime(32, t0 + dur * 0.95);
      lfo.connect(gain.gain);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, t0);
      filter.frequency.exponentialRampToValueAtTime(2200, t0 + dur * 0.95);
      filter.Q.setValueAtTime(4.0, t0);

      gain.gain.setValueAtTime(0.03, t0);
      gain.gain.linearRampToValueAtTime(0.3, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + dur);
      lfo.stop(t0 + dur);
    },
    // Variant 2: Ghostly Astral Harmonica Howl
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(580, t0);
      osc1.frequency.exponentialRampToValueAtTime(1160, t0 + dur * 0.95);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(870, t0);
      osc2.frequency.exponentialRampToValueAtTime(1740, t0 + dur * 0.95);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.24, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(out);

      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + dur);
      osc2.stop(t0 + dur);
    }
  ],

  // ==========================================
  // Boss 6: Heavy Armored Juggernaut (Silver #aaaaaa)
  // ==========================================
  [
    // Variant 0: Tactical Hazard Klaxon
    function(ctx, t0, out) {
      const dur = 1.2;
      const hum = ctx.createOscillator();
      const humGain = ctx.createGain();
      hum.type = "triangle";
      hum.frequency.setValueAtTime(60, t0);
      hum.frequency.exponentialRampToValueAtTime(95, t0 + dur);
      humGain.gain.setValueAtTime(0.12, t0);
      humGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      hum.connect(humGain);
      humGain.connect(out);
      hum.start(t0);
      hum.stop(t0 + dur);

      const pulses = [
        { t: 0.0, f: 720 },
        { t: 0.22, f: 900 },
        { t: 0.44, f: 720 },
        { t: 0.66, f: 900 },
        { t: 0.88, f: 1200 }
      ];
      pulses.forEach(p => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(p.f, t0 + p.t);
        g.gain.setValueAtTime(0, t0 + p.t);
        g.gain.linearRampToValueAtTime(0.14, t0 + p.t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + p.t + (p.t >= 0.88 ? 0.3 : 0.16));
        o.connect(g);
        g.connect(out);
        o.start(t0 + p.t);
        o.stop(t0 + p.t + (p.t >= 0.88 ? 0.32 : 0.18));
      });
    },
    // Variant 1: Heavy Air-Raid Cruiser Siren
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, t0);
      osc.frequency.linearRampToValueAtTime(580, t0 + dur * 0.95);

      lfo.type = "sine";
      lfo.frequency.setValueAtTime(3, t0);
      lfo.connect(osc.frequency);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, t0);
      filter.frequency.exponentialRampToValueAtTime(1600, t0 + dur * 0.95);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.26, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + dur);
      lfo.stop(t0 + dur);
    },
    // Variant 2: Fast Fire-Control Interlock
    function(ctx, t0, out) {
      const dur = 1.2;
      const beeps = [
        { t: 0.0, f: 950 },
        { t: 0.18, f: 1100 },
        { t: 0.36, f: 1250 },
        { t: 0.54, f: 1400 },
        { t: 0.72, f: 1600 },
        { t: 0.90, f: 1850 }
      ];
      beeps.forEach(b => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(b.f, t0 + b.t);
        g.gain.setValueAtTime(0, t0 + b.t);
        g.gain.linearRampToValueAtTime(0.2, t0 + b.t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + b.t + 0.12);
        o.connect(g);
        g.connect(out);
        o.start(t0 + b.t);
        o.stop(t0 + b.t + 0.13);
      });
    }
  ],

  // ==========================================
  // Boss 7: Thunder Tempest Core (Yellow #ffff00)
  // ==========================================
  [
    // Variant 0: Voltaic Ionization Surge
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const fmMod = ctx.createOscillator();
      const fmGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, t0);
      osc.frequency.exponentialRampToValueAtTime(780, t0 + dur * 0.95);

      fmMod.type = "sawtooth";
      fmMod.frequency.setValueAtTime(65, t0);
      fmMod.frequency.linearRampToValueAtTime(160, t0 + dur * 0.95);
      fmGain.gain.setValueAtTime(80, t0);
      fmGain.gain.linearRampToValueAtTime(240, t0 + dur * 0.95);
      fmMod.connect(osc.frequency);

      filter.type = "highpass";
      filter.frequency.setValueAtTime(150, t0);
      filter.frequency.exponentialRampToValueAtTime(450, t0 + dur * 0.95);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.22, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(t0);
      fmMod.start(t0);
      osc.stop(t0 + dur);
      fmMod.stop(t0 + dur);
    },
    // Variant 1: Tesla Coil Strum & Arcs
    function(ctx, t0, out) {
      const dur = 1.2;
      const notes = [
        { t: 0.0, f: 220 },
        { t: 0.28, f: 440 },
        { t: 0.56, f: 880 },
        { t: 0.84, f: 1760 }
      ];
      notes.forEach(n => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(n.f, t0 + n.t);
        g.gain.setValueAtTime(0, t0 + n.t);
        g.gain.linearRampToValueAtTime(0.18, t0 + n.t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + n.t + 0.24);
        o.connect(g);
        g.connect(out);
        o.start(t0 + n.t);
        o.stop(t0 + n.t + 0.26);
      });
    },
    // Variant 2: Dynamo Lightning Whip
    function(ctx, t0, out) {
      const dur = 1.2;
      const thunder = ctx.createOscillator();
      const thunderGain = ctx.createGain();
      thunder.type = "triangle";
      thunder.frequency.setValueAtTime(45, t0);
      thunder.frequency.linearRampToValueAtTime(90, t0 + dur);
      thunderGain.gain.setValueAtTime(0.15, t0);
      thunderGain.gain.linearRampToValueAtTime(0.25, t0 + dur * 0.8);
      thunderGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      thunder.connect(thunderGain);
      thunderGain.connect(out);
      thunder.start(t0);
      thunder.stop(t0 + dur);

      const whip = ctx.createOscillator();
      const whipGain = ctx.createGain();
      whip.type = "sawtooth";
      whip.frequency.setValueAtTime(300, t0);
      whip.frequency.exponentialRampToValueAtTime(3200, t0 + dur * 0.95);
      whipGain.gain.setValueAtTime(0.01, t0);
      whipGain.gain.linearRampToValueAtTime(0.22, t0 + dur * 0.85);
      whipGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      whip.connect(whipGain);
      whipGain.connect(out);
      whip.start(t0);
      whip.stop(t0 + dur);
    }
  ],

  // ==========================================
  // Boss 8: Dark Matter Singularity (Violet #9900ff)
  // ==========================================
  [
    // Variant 0: Sub-Bass Gravitational Vortex
    function(ctx, t0, out) {
      const dur = 1.2;
      const sub = ctx.createOscillator();
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      sub.type = "sine";
      sub.frequency.setValueAtTime(42, t0);
      sub.frequency.linearRampToValueAtTime(85, t0 + dur * 0.92);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(600, t0);
      osc.frequency.exponentialRampToValueAtTime(90, t0 + dur * 0.92);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, t0);
      filter.frequency.exponentialRampToValueAtTime(180, t0 + dur * 0.92);
      filter.Q.setValueAtTime(4.5, t0);

      gain.gain.setValueAtTime(0.01, t0);
      gain.gain.exponentialRampToValueAtTime(0.28, t0 + dur * 0.9);
      gain.gain.setValueAtTime(0.001, t0 + dur * 0.93);

      sub.connect(gain);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      sub.start(t0);
      osc.start(t0);
      sub.stop(t0 + dur);
      osc.stop(t0 + dur);
    },
    // Variant 1: Event Horizon Distortion / Dark Implosion
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const bell = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(50, t0);
      osc1.frequency.linearRampToValueAtTime(30, t0 + dur * 0.95);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(53, t0);
      osc2.frequency.linearRampToValueAtTime(32, t0 + dur * 0.95);

      bell.type = "sine";
      bell.frequency.setValueAtTime(280, t0);
      bell.frequency.exponentialRampToValueAtTime(920, t0 + dur * 0.95);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(500, t0);
      filter.frequency.linearRampToValueAtTime(120, t0 + dur * 0.95);

      gain.gain.setValueAtTime(0.03, t0);
      gain.gain.linearRampToValueAtTime(0.3, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      bell.connect(gain);
      gain.connect(out);

      osc1.start(t0);
      osc2.start(t0);
      bell.start(t0);
      osc1.stop(t0 + dur);
      osc2.stop(t0 + dur);
      bell.stop(t0 + dur);
    },
    // Variant 2: Wormhole Collapse Whine
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(140, t0);
      osc.frequency.exponentialRampToValueAtTime(40, t0 + dur * 0.95);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(150, t0);
      filter.frequency.exponentialRampToValueAtTime(1800, t0 + dur * 0.95);
      filter.Q.setValueAtTime(8.0, t0);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.28, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(t0);
      osc.stop(t0 + dur);
    }
  ],

  // ==========================================
  // Boss 9: Scarlet Dragon Sovereign (Crimson #ff2200)
  // ==========================================
  [
    // Variant 0: Apocalyptic Draconic Roar
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const formant = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      sub.type = "sine";
      sub.frequency.setValueAtTime(36, t0);
      sub.frequency.exponentialRampToValueAtTime(75, t0 + dur * 0.95);

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(70, t0);
      osc1.frequency.exponentialRampToValueAtTime(190, t0 + dur * 0.95);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(380, t0);
      osc2.frequency.exponentialRampToValueAtTime(1450, t0 + dur * 0.95);

      formant.type = "bandpass";
      formant.frequency.setValueAtTime(420, t0);
      formant.frequency.exponentialRampToValueAtTime(1200, t0 + dur * 0.95);
      formant.Q.setValueAtTime(3.8, t0);

      gain.gain.setValueAtTime(0.02, t0);
      gain.gain.linearRampToValueAtTime(0.26, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      sub.connect(gain);
      osc1.connect(formant);
      osc2.connect(formant);
      formant.connect(gain);
      gain.connect(out);

      sub.start(t0);
      osc1.start(t0);
      osc2.start(t0);
      sub.stop(t0 + dur);
      osc1.stop(t0 + dur);
      osc2.stop(t0 + dur);
    },
    // Variant 1: Dragon Inhale / Flame Crucible
    function(ctx, t0, out) {
      const dur = 1.2;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, t0);
      osc.frequency.exponentialRampToValueAtTime(260, t0 + dur * 0.95);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(120, t0);
      filter.frequency.exponentialRampToValueAtTime(850, t0 + dur * 0.95);
      filter.Q.setValueAtTime(6.0, t0);

      gain.gain.setValueAtTime(0.01, t0);
      gain.gain.exponentialRampToValueAtTime(0.32, t0 + dur * 0.9);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(t0);
      osc.stop(t0 + dur);
    },
    // Variant 2: Cataclysmic Death Bell & Screech
    function(ctx, t0, out) {
      const dur = 1.2;
      // Death bell cluster
      const bell1 = ctx.createOscillator();
      const bell2 = ctx.createOscillator();
      const screech = ctx.createOscillator();
      const gain = ctx.createGain();

      bell1.type = "sine";
      bell1.frequency.setValueAtTime(110, t0);
      bell1.frequency.exponentialRampToValueAtTime(85, t0 + dur);

      bell2.type = "sine";
      bell2.frequency.setValueAtTime(165, t0);
      bell2.frequency.exponentialRampToValueAtTime(130, t0 + dur);

      screech.type = "sawtooth";
      screech.frequency.setValueAtTime(120, t0);
      screech.frequency.exponentialRampToValueAtTime(1600, t0 + dur * 0.95);

      gain.gain.setValueAtTime(0.04, t0);
      gain.gain.linearRampToValueAtTime(0.28, t0 + dur * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      bell1.connect(gain);
      bell2.connect(gain);
      screech.connect(gain);
      gain.connect(out);

      bell1.start(t0);
      bell2.start(t0);
      screech.start(t0);
      bell1.stop(t0 + dur);
      bell2.stop(t0 + dur);
      screech.stop(t0 + dur);
    }
  ]
];

const bossAudioVariantNames = [
  // Boss 0: Void Claw Pincer Dread
  [
    { name: "High-Voltage Arc", desc: "Sawtooth & square capacitor whine through bandpass sweep" },
    { name: "Hydraulic Pincer", desc: "Deep mechanical rumble with harmonic crunch" },
    { name: "Capacitor Overcharge", desc: "Rising high-voltage whistle with arc discharge snaps" }
  ],
  // Boss 1: Crimson Tentacle Horror
  [
    { name: "Bio-Heartbeat Surge", desc: "Visceral heartbeat LFO with low triangle swell" },
    { name: "Alien Guttural Hiss", desc: "Detuned drone sliding into resonant throat screech" },
    { name: "Flesh Whiplash", desc: "Heavy sub-bass thud with rapid tentacle lash flutter" }
  ],
  // Boss 2: Blue Steel Dreadnought
  [
    { name: "Hydraulic Servo", desc: "Heavy mechanical servo whine + stepped radar lock chirps" },
    { name: "Sonar & Railgun", desc: "Spatial naval sonar ping echoing into coilgun hum" },
    { name: "Cyber Targeting", desc: "Alternating dual-frequency alarm with digital telemetry" }
  ],
  // Boss 3: Solar Reactor Fortress
  [
    { name: "Fusion Flare", desc: "55Hz sub-bass sine + thermonuclear lowpass resonance" },
    { name: "Solar Vortex", desc: "Spinning orbital FM hum with howling corona sweep" },
    { name: "Critical Mass", desc: "Rapid particle geiger clicks over radioactive drone" }
  ],
  // Boss 4: Emerald Mantis Queen
  [
    { name: "Ultrasonic Wings", desc: "54Hz tremolo wing drone matching visual fluttering" },
    { name: "Swarm Chitter", desc: "Chitinous mandible clicks into high alien queen chatter" },
    { name: "Venom Whine", desc: "High-tension razor drone with whistling overtones" }
  ],
  // Boss 5: Spectral Chrono Phantom
  [
    { name: "Chrono Shimmer", desc: "Detuned dual chorusing bells through shimmering bandpass" },
    { name: "Time Stutter", desc: "Time-warped reverse pitch sweep with rapid stutter" },
    { name: "Astral Howl", desc: "Eerie wind resonance layered with glass harmonica swell" }
  ],
  // Boss 6: Heavy Armored Juggernaut
  [
    { name: "Hazard Klaxon", desc: "Staccato dual-tone alarm burst accelerating into lock-on" },
    { name: "Air-Raid Siren", desc: "Naval cruiser klaxon with ominous wow-and-flutter pitch" },
    { name: "Interlock Telemetry", desc: "6 rapid high-pitch lock-on bursts with hydraulic release" }
  ],
  // Boss 7: Thunder Tempest Core
  [
    { name: "Voltaic Ionization", desc: "Sawtooth surge modulated by audio-rate FM sizzle" },
    { name: "Tesla Coil Strum", desc: "Stepped electric octave jumps with buzzing discharge" },
    { name: "Lightning Dynamo", desc: "Rolling 45Hz thunder hum overlaid with whistling swept-sine" }
  ],
  // Boss 8: Dark Matter Singularity
  [
    { name: "Gravitational Vortex", desc: "42Hz sub-bass sine swell with downward vacuum drop" },
    { name: "Event Horizon", desc: "Detuned low sawtooths with cosmic bell tone sweep" },
    { name: "Wormhole Collapse", desc: "Pulsing spatial rift accelerating into vortex whine" }
  ],
  // Boss 9: Scarlet Dragon Sovereign
  [
    { name: "Draconic Roar", desc: "36Hz sub tremor + guttural throat growl + hellfire screech" },
    { name: "Dragon Inhale", desc: "Demonic inward vacuum breath into unholy flame bellow" },
    { name: "Death Bell Screech", desc: "Low church death bell cluster into primal monster screech" }
  ]
];

const BOSS_CUES_STORAGE_KEY = "galaxy_outlast_boss_cues";

const DEFAULT_BOSS_CUES = {
  0: 1, // Boss 2: Variant 2 (Hydraulic Pincer)
  1: 1, // Boss 1: Variant 2 (Alien Guttural Hiss)
  2: 2, // Boss 3: Variant 3 (Cyber Targeting)
  3: 1, // Boss 4: Variant 2 (Solar Vortex)
  4: 0, // Boss 5: Variant 1 (Ultrasonic Wings)
  5: 1, // Boss 6: Variant 2 (Time Stutter)
  6: 2, // Boss 7: Variant 3 (Interlock Telemetry)
  7: 2, // Boss 8: Variant 3 (Lightning Dynamo)
  8: 1, // Boss 9: Variant 2 (Event Horizon)
  9: 2  // Boss 10: Variant 3 (Death Bell Screech)
};

function getBossCueVariant(bossType) {
  const b = typeof bossType === "number" ? bossType : (parseInt(bossType, 10) || 0);
  try {
    const saved = JSON.parse(localStorage.getItem(BOSS_CUES_STORAGE_KEY) || "{}");
    if (saved && typeof saved[b] === "number" && saved[b] >= 0 && saved[b] < 3) {
      return saved[b];
    }
  } catch (e) {}
  return DEFAULT_BOSS_CUES[b] !== undefined ? DEFAULT_BOSS_CUES[b] : 0;
}

function setBossCueVariant(bossType, variantIndex) {
  const b = typeof bossType === "number" ? bossType : (parseInt(bossType, 10) || 0);
  const v = Math.max(0, Math.min(2, parseInt(variantIndex, 10) || 0));
  try {
    const saved = JSON.parse(localStorage.getItem(BOSS_CUES_STORAGE_KEY) || "{}");
    saved[b] = v;
    localStorage.setItem(BOSS_CUES_STORAGE_KEY, JSON.stringify(saved));
  } catch (e) {}
  return v;
}

(function initDefaultBossCues() {
  try {
    if (typeof localStorage !== "undefined") {
      const isInit = localStorage.getItem("galaxy_outlast_boss_cues_v2");
      if (!isInit) {
        localStorage.setItem(BOSS_CUES_STORAGE_KEY, JSON.stringify(DEFAULT_BOSS_CUES));
        localStorage.setItem("galaxy_outlast_boss_cues_v2", "1");
      }
    }
  } catch (e) {}
})();


function addBossBulletFireSfx(ctx, tLaunch, out, bossType, variantIdx) {
  const b = typeof bossType === "number" ? bossType : (parseInt(bossType, 10) || 0);
  const v = variantIdx || 0;

  // 1. Primary Muzzle Blast / Concussive Launch Thump
  const blastOsc = ctx.createOscillator();
  const blastGain = ctx.createGain();
  const blastFilter = ctx.createBiquadFilter();

  blastOsc.type = (b === 0 || b === 7) ? "sawtooth" : (b === 2 || b === 6) ? "square" : "triangle";
  const startPitch = (b === 2 || b === 6) ? 450 : (b === 0 || b === 7) ? 800 : (b === 4) ? 900 : 350;
  const endPitch = (b === 8 || b === 9) ? 35 : 55;

  blastOsc.frequency.setValueAtTime(startPitch, tLaunch);
  blastOsc.frequency.exponentialRampToValueAtTime(endPitch, tLaunch + 0.12);

  blastFilter.type = (b === 0 || b === 7) ? "bandpass" : "lowpass";
  blastFilter.frequency.setValueAtTime((b === 0 || b === 7) ? 1200 : 800, tLaunch);
  blastFilter.frequency.exponentialRampToValueAtTime(150, tLaunch + 0.15);

  blastGain.gain.setValueAtTime(0.35, tLaunch);
  blastGain.gain.exponentialRampToValueAtTime(0.001, tLaunch + 0.22);

  blastOsc.connect(blastFilter);
  blastFilter.connect(blastGain);
  blastGain.connect(out);

  blastOsc.start(tLaunch);
  blastOsc.stop(tLaunch + 0.25);

  // 2. Multi-Projectile Salvo / Rapid Bullet Scatter Pulses (simulating bullet burst)
  const salvoPitches = [
    [1100, 950, 800],  // Boss 0: arc zaps
    [900, 750, 600],   // Boss 1: bio spikes
    [1400, 1100, 850], // Boss 2: railgun darts
    [850, 700, 550],   // Boss 3: solar comets
    [1800, 1500, 1200], // Boss 4: needle spray
    [1600, 1300, 1000], // Boss 5: chrono laser shards
    [700, 550, 400],   // Boss 6: heavy shells
    [1500, 1200, 900], // Boss 7: lightning sparks
    [500, 380, 250],   // Boss 8: void pulses
    [650, 500, 350]    // Boss 9: dragon fireballs
  ][b] || [1000, 800, 600];

  const pulseCount = 3;
  for (let i = 0; i < pulseCount; i++) {
    const tPulse = tLaunch + 0.02 + i * 0.045;
    const pOsc = ctx.createOscillator();
    const pGain = ctx.createGain();

    pOsc.type = (b === 4 || b === 5) ? "sawtooth" : (b === 0 || b === 2 || b === 7) ? "square" : "sine";
    const baseP = salvoPitches[i] || 800;
    const vOffset = v === 1 ? 80 : v === 2 ? -60 : 0;
    const p0 = baseP + vOffset;

    pOsc.frequency.setValueAtTime(p0, tPulse);
    pOsc.frequency.exponentialRampToValueAtTime(Math.max(60, p0 * 0.25), tPulse + 0.06);

    pGain.gain.setValueAtTime(0.18 - i * 0.03, tPulse);
    pGain.gain.exponentialRampToValueAtTime(0.001, tPulse + 0.07);

    pOsc.connect(pGain);
    pGain.connect(out);

    pOsc.start(tPulse);
    pOsc.stop(tPulse + 0.08);
  }

  // 3. Sub-Bass Body & Concussive Impact
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();

  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime((b === 8 || b === 9) ? 42 : 58, tLaunch);
  subOsc.frequency.exponentialRampToValueAtTime(28, tLaunch + 0.32);

  subGain.gain.setValueAtTime(0.28, tLaunch);
  subGain.gain.exponentialRampToValueAtTime(0.001, tLaunch + 0.35);

  subOsc.connect(subGain);
  subGain.connect(out);

  subOsc.start(tLaunch);
  subOsc.stop(tLaunch + 0.35);
}

function playBossFireSfx(bossType) {
  const isWarm = (typeof w !== "undefined" && w && w.isWarming) || (typeof window !== "undefined" && window.w && window.w.isWarming);
  if (isWarm) return;
  const b = typeof bossType === "number" ? bossType : (parseInt(bossType, 10) || 0);
  const v = getBossCueVariant(b);
  const key = "bossFire_" + b;
  window.addTrigger && window.addTrigger("SFX", key);
  if (playBufferSfx(key)) return;
  const ctx = Gn();
  if (ctx) {
    try {
      addBossBulletFireSfx(ctx, ctx.currentTime, Rn(ctx), b, v);
    } catch (e) {}
  }
}

const bossAudioSynthesizers = bossAudioVariants.map((variants, b) => {
  return function(ctx, t0, out) {
    const v = getBossCueVariant(b);
    if (variants && variants[v]) {
      variants[v](ctx, t0, out);
      addBossBulletFireSfx(ctx, t0 + 1.2, out, b, v);
    }
  };
});

let activeBossWarnSource = null;

function stopBossWarnSfx() {
  if (activeBossWarnSource) {
    try {
      activeBossWarnSource.stop();
      activeBossWarnSource.disconnect();
    } catch (e) {}
    activeBossWarnSource = null;
  }
}

function playBossWarnSfx(bossType, variantIndex = null, forcePlay = false) {
  stopBossWarnSfx();
  const isWarm = (typeof w !== "undefined" && w && w.isWarming) || (typeof window !== "undefined" && window.w && window.w.isWarming);
  if (isWarm) return;

  if (!forcePlay) {
    const settings = (typeof et !== "undefined" && et) || (typeof window !== "undefined" && window.et);
    if (settings && settings.sfx_boss_cues === false) return;
  }

  const b = typeof bossType === "number" ? bossType : (parseInt(bossType, 10) || 0);
  const v = (variantIndex !== null && variantIndex !== undefined) ? Math.max(0, Math.min(2, parseInt(variantIndex, 10) || 0)) : getBossCueVariant(b);
  const key = "bossWarn_" + b + "_" + v;

  window.addTrigger && window.addTrigger("SFX", key);

  const buf = sfxBuffers[key];
  const f = Gn();
  if (buf && f) {
    try {
      const src = f.createBufferSource();
      src.buffer = buf;
      src.connect(Rn(f));
      src.onended = () => {
        if (activeBossWarnSource === src) activeBossWarnSource = null;
        try { src.disconnect(); } catch (e) {}
      };
      src.start(0);
      activeBossWarnSource = src;
      return;
    } catch (e) {}
  }

  const ctx = Gn();
  if (ctx && bossAudioVariants[b] && bossAudioVariants[b][v]) {
    try {
      bossAudioVariants[b][v](ctx, ctx.currentTime, Rn(ctx));
      addBossBulletFireSfx(ctx, ctx.currentTime + 1.2, Rn(ctx), b, v);
    } catch (e) {
      console.warn("Failed procedural boss warn sfx:", e);
    }
  }
}

function renderSfxBuffers(){if(!Fe||sfxBuffers.hit)return;const sr=Fe.sampleRate||44100;const renderOne=(dur,setupFn,key)=>{try{const OCtx=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!OCtx)return;const ctx=new OCtx(1,Math.ceil(sr*dur),sr);setupFn(ctx);ctx.startRendering().then(buf=>{sfxBuffers[key]=buf;}).catch(()=>{});}catch{}};renderOne(0.08,c=>{const r=c.createOscillator(),d=c.createGain(),h=c.createBiquadFilter();r.type="triangle";r.frequency.setValueAtTime(380,0);r.frequency.exponentialRampToValueAtTime(70,0.05);d.gain.setValueAtTime(0.22,0);d.gain.exponentialRampToValueAtTime(0.001,0.06);h.type="highpass";h.frequency.value=120;r.connect(h);h.connect(d);d.connect(c.destination);r.start(0);r.stop(0.08);},"hit");renderOne(0.14,c=>{const r=c.createOscillator(),d=c.createGain();r.type="square";r.frequency.setValueAtTime(1200,0);r.frequency.exponentialRampToValueAtTime(150,0.12);d.gain.setValueAtTime(0.08,0);d.gain.exponentialRampToValueAtTime(0.001,0.12);r.connect(d);d.connect(c.destination);r.start(0);r.stop(0.14);},"shoot");renderOne(0.11,c=>{const r=c.createOscillator(),d=c.createBiquadFilter(),h=c.createGain();r.type="triangle";r.frequency.setValueAtTime(1000,0);r.frequency.exponentialRampToValueAtTime(120,0.1);d.type="lowpass";d.frequency.value=1000;h.gain.setValueAtTime(0.1,0);h.gain.exponentialRampToValueAtTime(0.001,0.1);r.connect(d);d.connect(h);h.connect(c.destination);r.start(0);r.stop(0.11);},"enemyDeath");renderOne(0.25,c=>{const r=c.createOscillator(),d=c.createGain();r.type="sine";r.frequency.setValueAtTime(990,0);r.frequency.setValueAtTime(1490,0.04);d.gain.setValueAtTime(0.12,0);d.gain.exponentialRampToValueAtTime(0.001,0.15);const h=c.createOscillator(),g=c.createGain();h.type="sine";h.frequency.setValueAtTime(1485,0);h.frequency.setValueAtTime(2235,0.04);g.gain.setValueAtTime(0.05,0);g.gain.exponentialRampToValueAtTime(0.001,0.12);r.connect(d);d.connect(c.destination);h.connect(g);g.connect(c.destination);r.start(0);r.stop(0.25);h.start(0);h.stop(0.25);},"xp");renderOne(0.6,c=>{[440,554.37,659.25,880].forEach((u,r)=>{const d=c.createOscillator(),h=c.createGain();d.type="triangle";d.frequency.value=u;const g=r*0.1;h.gain.setValueAtTime(0,g);h.gain.linearRampToValueAtTime(0.3,g+0.05);h.gain.exponentialRampToValueAtTime(0.001,g+0.5);d.connect(h);h.connect(c.destination);d.start(g);d.stop(g+0.5);});},"lvlup");renderOne(0.2,c=>{const u=c.createOscillator(),r=c.createOscillator(),d=c.createGain();u.type="sawtooth";r.type="square";u.frequency.setValueAtTime(400,0);u.frequency.exponentialRampToValueAtTime(50,0.2);r.frequency.setValueAtTime(405,0);r.frequency.exponentialRampToValueAtTime(50,0.2);d.gain.setValueAtTime(0.25,0);d.gain.exponentialRampToValueAtTime(0.001,0.2);u.connect(d);r.connect(d);d.connect(c.destination);u.start(0);r.start(0);u.stop(0.2);r.stop(0.2);},"playerHit");for(let b=0;b<10;b++){renderOne(0.38,c=>{try{addBossBulletFireSfx(c,0,c.destination,b,getBossCueVariant(b));}catch{}},"bossFire_"+b);for(let v=0;v<3;v++){renderOne(1.55,c=>{try{if(bossAudioVariants[b]&&bossAudioVariants[b][v]){bossAudioVariants[b][v](c,0,c.destination);}addBossBulletFireSfx(c,1.2,c.destination,b,v);}catch{}},"bossWarn_"+b+"_"+v);}}if(typeof sirenAudioSrc==="string"&&!sfxBuffers.siren){try{const raw=atob(sirenAudioSrc.split(",")[1]||sirenAudioSrc),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);try{Fe.decodeAudioData(bytes.buffer).then(buf=>{sfxBuffers.siren=buf;}).catch(()=>{});}catch(e){Fe.decodeAudioData(bytes.buffer,buf=>{sfxBuffers.siren=buf;},()=>{});}}catch(e){}}}const _lastSfxTimes={};function playBufferSfx(key){const now=performance.now();if(_lastSfxTimes[key]&&(now-_lastSfxTimes[key])<22&&key!=="lvlup"&&key!=="siren")return false;_lastSfxTimes[key]=now;window.addTrigger&&window.addTrigger("SFX",key);const buf=sfxBuffers[key];if(!buf)return false;const f=Gn();if(!f)return false;try{const src=f.createBufferSource();src.buffer=buf;src.connect(Rn(f));src.onended=()=>{try{src.disconnect();}catch(e){}};src.start(0);return true;}catch{return false;}}function fo(){if(Fe)return;try{Fe=new(window.AudioContext||window.webkitAudioContext)}catch{return}window.Fe=Fe;On=Fe.createGain();const a=et.sfxVolume!==void 0?et.sfxVolume:.5;On.gain.setValueAtTime(a,Fe.currentTime),On.connect(Fe.destination);renderSfxBuffers();}function U0(){if(fo(),!!Fe){if(Fe.state==="suspended")Fe.resume().catch(()=>{});try{const a=Fe.createOscillator(),f=Fe.createGain(),p=Fe.createBiquadFilter();f.gain.value=0,p.type="lowpass",a.connect(p),p.connect(f),f.connect(Fe.destination),a.start(),a.stop(Fe.currentTime+.01),w.isWarming=!0;try{J0()}catch{}try{W0()}catch{}try{$0()}catch{}try{F0()}catch{}try{x0()}catch{}try{eu()}catch{}try{prewarmGraphics()}catch{}bl=0,w.isWarming=!1}catch{}}else{try{prewarmGraphics()}catch{}}}function Ph(a){et.sfxVolume=a,K0(),Fe||fo(),On&&Fe&&On.gain.setValueAtTime(a,Fe.currentTime)}function Uh(){Fe&&Fe.state==="running"&&Fe.suspend().catch(()=>{})}function Nh(){if(Fe&&Fe.state!=="closed")Fe.resume().catch(()=>{})}function Gn(){if(Fe||fo(),!Fe)return null;const a=Fe;if(a.state==="suspended")a.resume().catch(()=>{});return a}function Rn(a){return w.isWarming?(w.silentWarmGain||(w.silentWarmGain=a.createGain(),w.silentWarmGain.gain.setValueAtTime(0,a.currentTime)),w.silentWarmGain):On||a.destination}let Th=0;function J0(){window.addTrigger&&window.addTrigger("SFX","hit");if(!et.sfx_hit&&!w.isWarming)return;const a=performance.now();if(a-Th<30&&!w.isWarming)return;Th=a;if(playBufferSfx("hit"))return;const f=Gn();if(f)try{const p=f.currentTime,u=Rn(f),r=f.createOscillator(),d=f.createGain();r.type="triangle",r.frequency.setValueAtTime(380,p),r.frequency.exponentialRampToValueAtTime(70,p+.05),d.gain.setValueAtTime(.22,p),d.gain.exponentialRampToValueAtTime(.001,p+.06);const h=f.createBiquadFilter();h.type="highpass",h.frequency.value=120,r.connect(h),h.connect(d),d.connect(u),r.start(p),r.stop(p+.08)}catch{}}let _h=0;function W0(){window.addTrigger&&window.addTrigger("SFX","shoot");if(!et.sfx_shoot&&!w.isWarming)return;const a=performance.now();if(a-_h<40&&!w.isWarming)return;_h=a;if(playBufferSfx("shoot"))return;const f=Gn();if(f)try{const p=Rn(f),u=f.currentTime,r=f.createOscillator(),d=f.createGain();r.type="square",r.frequency.setValueAtTime(1200,u),r.frequency.exponentialRampToValueAtTime(150,u+.12),d.gain.setValueAtTime(.08,u),d.gain.exponentialRampToValueAtTime(.001,u+.12),r.connect(d),d.connect(p),r.start(u),r.stop(u+.14)}catch{}}let Ch=0;function $0(){window.addTrigger&&window.addTrigger("SFX","enemyDeath");if(!et.sfx_enemy_death&&!w.isWarming)return;const a=performance.now();if(a-Ch<50&&!w.isWarming)return;Ch=a;if(playBufferSfx("enemyDeath"))return;const f=Gn();if(f)try{const p=f.currentTime,u=Rn(f),r=f.createOscillator(),d=f.createBiquadFilter(),h=f.createGain();r.type="triangle",r.frequency.setValueAtTime(1e3,p),r.frequency.exponentialRampToValueAtTime(120,p+.1),d.type="lowpass",d.frequency.value=1e3,h.gain.setValueAtTime(.1,p),h.gain.exponentialRampToValueAtTime(.001,p+.1),r.connect(d),d.connect(h),h.connect(u),r.start(p),r.stop(p+.11)}catch{}}function F0(){window.addTrigger&&window.addTrigger("SFX","xp");if(!et.sfx_xp&&!w.isWarming)return;if(playBufferSfx("xp"))return;const a=Gn();if(a)try{const f=a.currentTime,p=Rn(a),u=Math.random()*80,r=a.createOscillator(),d=a.createGain();r.type="sine",r.frequency.setValueAtTime(950+u,f),r.frequency.setValueAtTime(1450+u,f+.04),d.gain.setValueAtTime(.12,f),d.gain.exponentialRampToValueAtTime(.001,f+.15);const h=a.createOscillator(),g=a.createGain();h.type="sine",h.frequency.setValueAtTime((950+u)*1.5,f),h.frequency.setValueAtTime((1450+u)*1.5,f+.04),g.gain.setValueAtTime(.05,f),g.gain.exponentialRampToValueAtTime(.001,f+.12),r.connect(d),d.connect(p),h.connect(g),g.connect(p),r.start(f),r.stop(f+.25),h.start(f),h.stop(f+.25)}catch{}}function x0(){window.addTrigger&&window.addTrigger("SFX","lvlup");if(!et.sfx_lvlup&&!w.isWarming)return;if(playBufferSfx("lvlup"))return;const a=Gn();if(a)try{const f=Rn(a);[440,554.37,659.25,880].forEach((u,r)=>{const d=a.createOscillator(),h=a.createGain();d.type="triangle",d.frequency.value=u;const g=a.currentTime+r*.1;h.gain.setValueAtTime(0,g),h.gain.linearRampToValueAtTime(.3,g+.05),h.gain.exponentialRampToValueAtTime(.001,g+.5),d.connect(h),h.connect(f),d.start(g),d.stop(g+.5)})}catch{}}function eu(){window.addTrigger&&window.addTrigger("SFX","playerHit");if(!et.sfx_player_hit&&!w.isWarming)return;if(playBufferSfx("playerHit"))return;const a=Gn();if(a)try{const f=a.currentTime,p=Rn(a),u=a.createOscillator(),r=a.createOscillator(),d=a.createGain();u.type="sawtooth",r.type="square",u.frequency.setValueAtTime(400,f),u.frequency.exponentialRampToValueAtTime(50,f+.2),r.frequency.setValueAtTime(405,f),r.frequency.exponentialRampToValueAtTime(50,f+.2),d.gain.setValueAtTime(.25,f),d.gain.exponentialRampToValueAtTime(.001,f+.2),u.connect(d),r.connect(d),d.connect(p),u.start(f),r.start(f),u.stop(f+.2),r.stop(f+.2)}catch{}}let sirenSource=null,sirenGain=null,bl=0,isSirenPaused=!1;function _startSirenBuffer(){window.addTrigger&&window.addTrigger("SFX","siren");const buf=sfxBuffers.siren,ctx=Gn();if(!ctx||!buf)return;try{if(!sirenGain){sirenGain=ctx.createGain();sirenGain.gain.setValueAtTime(0,ctx.currentTime);sirenGain.connect(Rn(ctx));}if(sirenSource){try{sirenSource.stop();sirenSource.disconnect();}catch(e){}sirenSource=null;}sirenSource=ctx.createBufferSource();sirenSource.buffer=buf;sirenSource.loop=!0;const a=et.sfxVolume!==void 0?et.sfxVolume:.5,vol=.55*a,curVol=bl<1500&&bl>0?vol*(bl/1500):vol;sirenGain.gain.setValueAtTime(curVol,ctx.currentTime);sirenSource.connect(sirenGain);sirenSource.start(0);}catch(e){console.warn("Failed to play WebAudio siren:",e);}}function pauseSiren(){if(sirenSource){try{sirenSource.stop();sirenSource.disconnect();}catch(e){}sirenSource=null;}if(sirenGain){try{sirenGain.disconnect();}catch(e){}sirenGain=null;}if(bl>0){isSirenPaused=!0;}}function tu(){if(w.isWarming)return;const f=w.G;if(!f||!f.running||f.over||f.paused||!et.sfx_siren){lu();return;}lu();bl=5500;isSirenPaused=!1;_startSirenBuffer();}function Yh(a){if(bl<=0)return;const f=w.G;if(!f||!f.running||f.over||!et.sfx_siren){lu();return;}if(f.paused){if(sirenSource&&!isSirenPaused){pauseSiren();}return;}if(isSirenPaused){isSirenPaused=!1;_startSirenBuffer();}else if(!sirenSource&&sfxBuffers.siren){_startSirenBuffer();}const ctx=Gn();if(sirenGain&&ctx){const r=.55*(et.sfxVolume!==void 0?et.sfxVolume:.5);bl<1500&&bl>0?sirenGain.gain.setValueAtTime(r*(bl/1500),ctx.currentTime):sirenGain.gain.setValueAtTime(r,ctx.currentTime);}bl-=a;if(bl<=0)lu();}function lu(){bl=0;isSirenPaused=!1;if(sirenSource){try{sirenSource.stop();sirenSource.disconnect();}catch(e){}sirenSource=null;}if(sirenGain){try{sirenGain.gain.setValueAtTime(0,Gn()?Gn().currentTime:0);sirenGain.disconnect();}catch(e){}sirenGain=null;}}

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
window.playBossWarnSfx = playBossWarnSfx;
window.stopBossWarnSfx = stopBossWarnSfx;
window.playBossFireSfx = playBossFireSfx;
window.addBossBulletFireSfx = addBossBulletFireSfx;
window.bossAudioSynthesizers = bossAudioSynthesizers;
window.bossAudioVariants = bossAudioVariants;
window.bossAudioVariantNames = bossAudioVariantNames;
window.getBossCueVariant = getBossCueVariant;
window.setBossCueVariant = setBossCueVariant;
window.isSirenPlaying = () => bl > 0 && !!sirenSource;
window.isSirenPaused = () => isSirenPaused;
window.getSirenRemainingTime = () => bl;
window.activeBossWarnSource = () => activeBossWarnSource;
window.DEFAULT_BOSS_CUES = DEFAULT_BOSS_CUES;

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
  Fe,
  playBossWarnSfx,
  stopBossWarnSfx,
  playBossFireSfx,
  addBossBulletFireSfx,
  bossAudioSynthesizers,
  bossAudioVariants,
  bossAudioVariantNames,
  getBossCueVariant,
  setBossCueVariant,
  DEFAULT_BOSS_CUES
};
