/* ══════════════════════════════════════════════════════════════
   AUDIO — procedural sea, wind, wood, iron and gold
   ══════════════════════════════════════════════════════════════ */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.zone = 'shallows';
    this.seaGain = null;
    this.windGain = null;
    this.swingGain = null;
    this.swingFilter = null;
    this.droneGain = null;
    this._swingTarget = 0;
    this._ambientTimer = 2;
    this._gullTimer = 5;
    this._pluckTimer = 7;
    this._lastKnock = 0;
    this._lastThud = 0;
  }

  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(ctx.destination);

    // shared noise buffer
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    this.noiseBuf = buf;

    // sea rumble
    this.seaGain = ctx.createGain();
    this.seaGain.gain.value = 0.16;
    const seaLP = ctx.createBiquadFilter();
    seaLP.type = 'lowpass';
    seaLP.frequency.value = 420;
    const sea = this.loopNoise();
    sea.connect(seaLP).connect(this.seaGain).connect(this.master);
    // slow swell
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.07;
    lfo.connect(lfoGain).connect(this.seaGain.gain);
    lfo.start();

    // wind
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.035;
    const windBP = ctx.createBiquadFilter();
    windBP.type = 'bandpass';
    windBP.frequency.value = 900;
    windBP.Q.value = 0.5;
    const wind = this.loopNoise();
    wind.connect(windBP).connect(this.windGain).connect(this.master);
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 0.13;
    const wlg = ctx.createGain();
    wlg.gain.value = 320;
    wlfo.connect(wlg).connect(windBP.frequency);
    wlfo.start();
    const wlfo2 = ctx.createOscillator();
    wlfo2.frequency.value = 0.07;
    const wlg2 = ctx.createGain();
    wlg2.gain.value = 0.018;
    wlfo2.connect(wlg2).connect(this.windGain.gain);
    wlfo2.start();

    // pole swing (continuous whoosh)
    this.swingGain = ctx.createGain();
    this.swingGain.gain.value = 0;
    this.swingFilter = ctx.createBiquadFilter();
    this.swingFilter.type = 'bandpass';
    this.swingFilter.frequency.value = 480;
    this.swingFilter.Q.value = 0.9;
    const sw = this.loopNoise();
    sw.connect(this.swingFilter).connect(this.swingGain).connect(this.master);

    // low drone
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.018;
    this.droneGain.connect(this.master);
    [55, 82.5, 110].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 1 : 0.35;
      const l = ctx.createOscillator();
      l.frequency.value = 0.03 + i * 0.017;
      const lg = ctx.createGain();
      lg.gain.value = 0.4;
      l.connect(lg).connect(g.gain);
      o.connect(g).connect(this.droneGain);
      o.start(); l.start();
    });

    this.ready = true;
  }

  loopNoise() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.start();
    return src;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(m ? 0 : 0.5, t + 0.25);
    }
  }

  setZone(zone) {
    this.zone = zone;
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const settings = {
      shallows: { sea: 0.2, wind: 0.03 },
      wreck: { sea: 0.16, wind: 0.05 },
      jungle: { sea: 0.07, wind: 0.035 },
      ruins: { sea: 0.05, wind: 0.075 },
      summit: { sea: 0.02, wind: 0.1 },
    }[zone] || { sea: 0.15, wind: 0.04 };
    this.seaGain.gain.cancelScheduledValues(t);
    this.seaGain.gain.linearRampToValueAtTime(settings.sea, t + 2);
    this.windGain.gain.cancelScheduledValues(t);
    this.windGain.gain.linearRampToValueAtTime(settings.wind, t + 2);
  }

  update(dt, swingSpeed, altitude) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;

    // swing whoosh follows pole tip speed
    const target = Math.min(0.16, Math.max(0, (swingSpeed - 240) / 4200));
    this._swingTarget += (target - this._swingTarget) * Math.min(1, dt * 10);
    this.swingGain.gain.setTargetAtTime(this._swingTarget, t, 0.06);
    this.swingFilter.frequency.setTargetAtTime(380 + Math.min(900, swingSpeed * 0.35), t, 0.08);

    // ambient one-shots
    this._ambientTimer -= dt;
    this._gullTimer -= dt;
    this._pluckTimer -= dt;

    if (this.zone === 'shallows' && this._gullTimer <= 0) {
      this._gullTimer = 7 + Math.random() * 12;
      this.gull();
    }
    if (this._ambientTimer <= 0) {
      this._ambientTimer = 2.5 + Math.random() * 4.5;
      if (this.zone === 'jungle') this.insect();
      else if (this.zone === 'ruins' || this.zone === 'summit') this.groan();
      else if (this.zone === 'wreck') this.creak();
    }
    if (this._pluckTimer <= 0) {
      this._pluckTimer = 9 + Math.random() * 13;
      this.pluck();
    }
  }

  env(node, gain, attack, hold, release) {
    const t = this.ctx.currentTime;
    const g = node.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    g.setValueAtTime(Math.max(0.0002, gain), t + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  noiseBurst(dur, freq, q, gain, type = 'bandpass') {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, gain, 0.004, Math.max(0.001, dur * 0.2), dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.1);
  }

  tone(freq, dur, gain, type = 'sine', slide = 0, delay = 0) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  knock(material, strength = 1) {
    if (!this.ready) return;
    const now = performance.now();
    if (now - this._lastKnock < 55) return;
    this._lastKnock = now;
    const s = Math.min(1.3, Math.max(0.12, strength));
    if (material === 'stone' || material === 'rock') {
      this.noiseBurst(0.1, 1300 + Math.random() * 700, 1.4, 0.11 * s, 'bandpass');
      this.tone(190 + Math.random() * 60, 0.09, 0.055 * s, 'triangle', 0.7);
    } else if (material === 'metal') {
      this.noiseBurst(0.16, 2600, 3, 0.08 * s);
      this.tone(880, 0.22, 0.035 * s, 'square', 0.5);
    } else {
      this.noiseBurst(0.09, 520 + Math.random() * 260, 1.1, 0.12 * s, 'lowpass');
      this.tone(150 + Math.random() * 40, 0.11, 0.06 * s, 'triangle', 0.6);
    }
  }

  thud(strength = 1) {
    if (!this.ready) return;
    const now = performance.now();
    if (now - this._lastThud < 120) return;
    this._lastThud = now;
    const s = Math.min(1.4, Math.max(0.15, strength));
    this.noiseBurst(0.22, 180, 0.7, 0.18 * s, 'lowpass');
    this.tone(64, 0.24, 0.16 * s, 'sine', 0.5);
  }

  splash(strength = 1) {
    if (!this.ready) return;
    const s = Math.min(1.5, strength);
    this.noiseBurst(0.7, 900, 0.5, 0.2 * s, 'lowpass');
    this.noiseBurst(0.35, 2200, 0.7, 0.08 * s);
    this.tone(90, 0.4, 0.06 * s, 'sine', 0.5);
  }

  hookFire() {
    if (!this.ready) return;
    this.noiseBurst(0.22, 1800, 0.8, 0.09);
    this.tone(420, 0.28, 0.05, 'triangle', 2.1);
  }

  hookLatch() {
    if (!this.ready) return;
    this.noiseBurst(0.12, 3200, 2.5, 0.07);
    this.tone(1400, 0.2, 0.04, 'square', 0.55);
    this.tone(2100, 0.14, 0.02, 'sine', 0.7, 0.02);
  }

  hookMiss() {
    if (!this.ready) return;
    this.noiseBurst(0.18, 900, 1.2, 0.05, 'highpass');
    this.tone(300, 0.16, 0.025, 'triangle', 0.6);
  }

  reel() {
    if (!this.ready) return;
    const now = performance.now();
    if (now - (this._lastReel || 0) < 180) return;
    this._lastReel = now;
    this.noiseBurst(0.06, 1600, 4, 0.02);
    this.tone(220 + Math.random() * 40, 0.04, 0.012, 'square');
  }

  checkpoint() {
    if (!this.ready) return;
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.5, 0.05, 'sine', 1, i * 0.09));
    this.tone(261.63, 0.7, 0.04, 'triangle', 1, 0);
  }

  fallSting() {
    if (!this.ready) return;
    this.tone(180, 0.5, 0.04, 'triangle', 0.6);
    this.tone(120, 0.8, 0.035, 'sine', 0.5, 0.1);
  }

  uiClick() {
    if (!this.ready) return;
    this.tone(660, 0.06, 0.03, 'triangle', 1.2);
  }

  gull() {
    if (!this.ready) return;
    const base = 780 + Math.random() * 300;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this.tone(base - i * 40, 0.1 + Math.random() * 0.08, 0.018, 'sine', 1.5, i * 0.15);
    }
  }

  insect() {
    if (!this.ready) return;
    const f = 3400 + Math.random() * 900;
    for (let i = 0; i < 3; i++) this.tone(f, 0.04, 0.006, 'sawtooth', 1.1, i * 0.07);
  }

  creak() {
    if (!this.ready) return;
    this.tone(70 + Math.random() * 30, 1.2, 0.012, 'sawtooth', 1.3);
    this.noiseBurst(0.7, 400, 3, 0.015);
  }

  groan() {
    if (!this.ready) return;
    this.tone(46, 1.8, 0.02, 'sine', 0.8);
    this.noiseBurst(1.2, 240, 0.8, 0.012, 'lowpass');
  }

  pluck() {
    if (!this.ready) return;
    const scale = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
    const f = scale[Math.floor(Math.random() * scale.length)];
    const o = this.ctx.createOscillator();
    const t = this.ctx.currentTime;
    o.type = 'triangle';
    o.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.028, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const d = this.ctx.createDelay();
    d.delayTime.value = 0.21;
    const fg = this.ctx.createGain();
    fg.gain.value = 0.25;
    o.connect(g).connect(this.master);
    g.connect(d).connect(fg).connect(this.master);
    o.start(t);
    o.stop(t + 1.7);
  }

  treasure() {
    if (!this.ready) return;
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.tone(f, 0.9, 0.055, 'triangle', 1, i * 0.13);
      this.tone(f / 2, 1.2, 0.03, 'sine', 1, i * 0.13);
    });
    this.noiseBurst(1.6, 5000, 0.8, 0.05, 'highpass');
  }
}
