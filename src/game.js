/* ══════════════════════════════════════════════════════════════
   HOOK & POLE — game core
   Physics: Matter.js. The pirate is a barrel. The barrel is not
   built for this. The pole is.
   ══════════════════════════════════════════════════════════════ */

import { buildLevel, castRay, ZONES, CHECKPOINTS, START, SUMMIT, NARRATION } from './level.js';
import { Renderer } from './render.js';
import { AudioEngine } from './audio.js';

const M = window.Matter;
const { Engine, Composite, Bodies, Body, Constraint, Events, Vector } = M;

const STEP = 1000 / 60;
const PLAYER_R = 34;
const PLAYER_MASS = 13;
const POLE_LEN = 318;
const POLE_HALF = POLE_LEN / 2;
const HOOK_RANGE = 560;
const SEA_LIMIT = 360;
const PX_PER_M = 10;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const wrapAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);

const FALL_LINES = NARRATION.fall;

class Game {
  constructor() {
    this.canvas = $('#game');
    this.renderer = new Renderer(this.canvas, this);
    this.audio = new AudioEngine();
    this.level = buildLevel();
    this.mode = 'title';
    this.time = 0;
    this.displayTime = 0;
    this.elapsed = 0;
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, wx: 0, wy: 0 };
    this.keys = { left: false, right: false };
    this.grip = false;
    this.rightMouseDown = false;
    this.reeling = false;
    this.running = false;

    this.stats = { falls: 0, resets: 0, hooks: 0 };
    this.checkpointIndex = 0;
    this.visitedZones = new Set();
    this.zone = ZONES[0];
    this.peakY = START.y;
    this.fellThisDrop = false;
    this.lastFallNarration = -999;
    this.tutorialStage = 0;
    this.tutorialClock = 0;
    this.hintKey = '';
    this.hintUntil = 0;
    this.toastTimer = 0;
    this.bannerTimer = 0;
    this.narrationTimer = 0;
    this.camera = {
      x: START.x, y: START.y, zoom: 1, baseZoom: .8, userZoom: 1,
      shake: 0, shakeTime: 0, shakeX: 0, shakeY: 0,
    };
    this.splashFlash = 0;
    this.endTimer = 0;
    this.chestOpen = 0;
    this.waterTime = 0;
    this.particles = [];
    this.lastPoleKnock = 0;
    this.lastDust = 0;
    this.aimSwing = 0;
    this.lastSave = 0;
    this.debug = params.has('debug');
    this.startIndex = 0;
    if (params.has('cp')) {
      const idx = parseInt(params.get('cp'), 10);
      if (!Number.isNaN(idx)) this.startIndex = clamp(idx, 0, CHECKPOINTS.length - 1);
    }
    if (params.has('summit')) this.startIndex = CHECKPOINTS.length - 1;

    this.save = this.loadSave();
    this.setupPhysics();
    this.setupInput();
    this.setupUI();
    this.buildTrack();

    this.renderer.resize();
    this.renderer.preload();
    this.resetToStart(this.startIndex, false);
    this.state = 'loading';
    this.stateClock = 0;
    this.loop = this.loop.bind(this);

    window.__HP = this;
  }

  /* ── physics setup ─────────────────────────────────────── */
  setupPhysics() {
    this.engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
      enableSleeping: false,
      positionIterations: 8,
      velocityIterations: 6,
      constraintIterations: 6,
    });
    this.world = this.engine.world;
    Composite.add(this.world, this.level.bodies);

    this.player = Bodies.circle(START.x, START.y, PLAYER_R, {
      mass: PLAYER_MASS,
      friction: 0.62,
      frictionStatic: 3.2,
      frictionAir: 0.006,
      restitution: 0.02,
      label: 'player',
      slop: 0.02,
    });
    Body.setInertia(this.player, Infinity);
    this.player.collisionFilter.group = -1;
    Composite.add(this.world, this.player);

    this.pole = Bodies.rectangle(START.x + 160, START.y - 40, POLE_LEN, 17, {
      mass: 6,
      friction: 0.98,
      frictionStatic: 4,
      frictionAir: 0.0025,
      restitution: 0.01,
      angle: -0.32,
      label: 'pole',
      slop: 0.02,
    });
    this.pole.collisionFilter.group = -1;
    Composite.add(this.world, this.pole);

    this.joint = Constraint.create({
      bodyA: this.player,
      pointA: { x: 18, y: -18 },
      bodyB: this.pole,
      pointB: { x: -POLE_HALF, y: 0 },
      length: 0,
      stiffness: 0.95,
      damping: 0.12,
    });
    Composite.add(this.world, this.joint);

    this.hook = {
      state: 'ready', // ready | flying | attached | retracting
      pos: { x: 0, y: 0 }, from: { x: 0, y: 0 }, to: { x: 0, y: 0 },
      anchor: null, ropeLen: 0, t: 0, dur: .1, miss: false,
      cooldown: 0, attachedFor: 0, reeled: 0,
    };

    Events.on(this.engine, 'collisionStart', (ev) => this.onCollision(ev));
    Events.on(this.engine, 'collisionActive', (ev) => this.onCollisionActive(ev));
  }

  onCollision(ev) {
    if (this.mode !== 'playing') return;
    for (const pair of ev.pairs) {
      const a = pair.bodyA, b = pair.bodyB;
      const rel = Vector.magnitude(Vector.sub(a.velocity, b.velocity));
      const poleHit = a === this.pole || b === this.pole;
      const playerHit = a === this.player || b === this.player;
      if (!poleHit && !playerHit) continue;
      const other = poleHit ? (a === this.pole ? b : a) : (a === this.player ? b : a);
      const type = other.plugin?.type || 'rock';
      if (poleHit && rel > 0.35) {
        this.audio.knock(type, rel * .8);
        this.addCameraShake(clamp(rel * 2.2, 0, 7));
        if (rel > 0.8) this.spawnImpact(this.pole.position, type, rel);
      }
      if (playerHit && rel > 0.65) {
        this.audio.thud(rel * .7);
        this.addCameraShake(clamp(rel * 3.4, 1, 12));
        this.spawnImpact(this.player.position, type, rel * .7);
      }
    }
  }

  onCollisionActive(ev) {
    if (this.mode !== 'playing') return;
    for (const pair of ev.pairs) {
      const a = pair.bodyA, b = pair.bodyB;
      if (a !== this.pole && b !== this.pole) continue;
      const other = a === this.pole ? b : a;
      const tip = this.poleTip();
      if (this.pole.angularVelocity !== 0 && this.time - this.lastDust > .09) {
        const speed = Math.abs(this.pole.angularVelocity) * POLE_HALF;
        if (speed > .75) {
          this.lastDust = this.time;
          this.spawnDust(tip, other.plugin?.type || 'rock', speed);
        }
      }
    }
  }

  /* ── setup helpers ─────────────────────────────────────── */
  setupInput() {
    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'playing') return;
      this.audio.init();
      if (e.button === 0) this.grip = true;
      if (e.button === 2) {
        this.rightMouseDown = true;
        if (this.hook.state === 'attached') this.reeling = true;
        else this.fireHook();
      }
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.grip = false;
      if (e.button === 2) {
        this.rightMouseDown = false;
        this.reeling = false;
        if (this.mode === 'playing' && this.hook.state === 'attached') this.releaseHook();
      }
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => {
      if (this.mode !== 'playing') return;
      e.preventDefault();
      const c = this.camera;
      c.userZoom = clamp(c.userZoom * (e.deltaY > 0 ? .94 : 1.06), .62, 1.5);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') this.keys.left = true;
      if (k === 'd' || k === 'arrowright') this.keys.right = true;
      if (k === 'm') this.toggleSound();
      if (k === 'r' && this.mode === 'playing') this.returnToCheckpoint(false);
      if (k === 'escape' || k === 'p') {
        if (this.mode === 'playing') this.pause();
        else if (this.mode === 'paused') this.resume();
      }
      if (k === 'h') {
        if (this.mode === 'title' || this.mode === 'paused') this.openHow();
      }
      if (this.debug && ['1', '2', '3', '4', '5'].includes(k)) {
        this.teleport(parseInt(k, 10) - 1);
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') this.keys.left = false;
      if (k === 'd' || k === 'arrowright') this.keys.right = false;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'playing') this.pause();
    });
  }

  setupUI() {
    $('#begin-btn').addEventListener('click', () => { this.audio.init(); this.beginRun(); });
    $('#how-btn').addEventListener('click', () => this.openHow());
    $('#how-close').addEventListener('click', () => this.closeHow());
    $('#how-begin').addEventListener('click', () => { this.closeHow(); this.beginRun(); });
    $('#resume-btn').addEventListener('click', () => this.resume());
    $('#restart-btn').addEventListener('click', () => { this.resume(); this.returnToCheckpoint(false); });
    $('#quit-btn').addEventListener('click', () => this.backToTitle());
    $('#again-btn').addEventListener('click', () => { this.hide('#end-screen'); this.beginRun(); });
    $('#end-title-btn').addEventListener('click', () => this.backToTitle());

    this.updateSaveUI();
    $('#sound-lbl').textContent = this.audio.muted ? 'off' : 'on';
  }

  buildTrack() {
    const marks = $('#track-marks');
    const labels = $('#track-labels');
    marks.innerHTML = '';
    labels.innerHTML = '';
    const span = START.y - SUMMIT.y;
    for (const z of ZONES) {
      const lowY = Math.min(z.top, -10300);
      const highY = Math.max(z.bottom, SUMMIT.y);
      const lowP = clamp((START.y - lowY) / span, 0, 1) * 100;
      const highP = clamp((START.y - highY) / span, 0, 1) * 100;
      const m = document.createElement('span');
      m.className = 'track-mark';
      m.style.bottom = `${lowP}%`;
      marks.appendChild(m);
      const l = document.createElement('span');
      l.className = 'track-label';
      l.dataset.zone = z.id;
      l.textContent = z.name.replace('Wreck of the ', '').replace('Temple of the ', '');
      l.style.bottom = `${(lowP + highP) / 2}%`;
      if (l.style.bottom === '0%') l.style.bottom = '4%';
      labels.appendChild(l);
    }
  }

  /* ── game flow ─────────────────────────────────────────── */
  async boot() {
    try { await document.fonts.ready; } catch {}
    this.renderer.preload();
    this.mode = 'title';
    this.state = 'title';
    $('#loading').classList.add('gone');
    this.running = true;
    requestAnimationFrame(this.loop);
    setTimeout(() => { if (this.mode === 'title') this.showTitleIdle = true; }, 100);
  }

  beginRun() {
    this.hide('#title-screen');
    this.hide('#how-screen');
    this.hide('#pause-screen');
    this.hide('#end-screen');
    this.setHUD(true);
    this.mode = 'playing';
    this.stats = { falls: 0, resets: 0, hooks: 0 };
    this.elapsed = 0;
    this.checkpointIndex = this.startIndex;
    this.visitedZones = new Set([this.zone?.id]);
    this.tutorialStage = 0;
    this.tutorialClock = 0;
    this.endTimer = 0;
    this.chestOpen = 0;
    this.resetToStart(this.startIndex, false);
    this.audio.init();
    this.audio.setZone(this.level.zoneAt(this.player.position.y).id);
    const z = this.level.zoneAt(this.player.position.y);
    this.zone = z;
    this.visitedZones = new Set([z.id]);
    this.showZone(z, false);
    this.setHint('mouse', 'Move the mouse — the pole follows. Plant the tip. Pull.', 0);
    setTimeout(() => {
      if (this.mode === 'playing') this.say(NARRATION.start, 8000);
    }, 900);
    this.updateHUD();
  }

  backToTitle() {
    this.hide('#pause-screen');
    this.hide('#end-screen');
    this.hide('#how-screen');
    this.show('#title-screen');
    this.setHUD(false);
    this.mode = 'title';
    this.resetToStart(0, false);
    this.camera.x = START.x;
    this.camera.y = START.y - 30;
    this.camera.userZoom = 1;
    this.updateSaveUI();
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.grip = false;
    this.releaseHook(true);
    $('#pause-alt').textContent = `${this.altitude()} m`;
    $('#pause-cp').textContent = CHECKPOINTS[this.checkpointIndex].name;
    $('#pause-falls').textContent = this.stats.falls;
    $('#pause-time').textContent = this.formatTime(this.elapsed);
    $('#pause-quote').textContent = [
      '“Even the sea takes a breath.”',
      '“A moment’s rest is just a fall that hasn’t started.”',
      '“The gold is not going anywhere. Unfortunately, neither are you.”',
      '“Consider your grip. Consider your life choices.”',
    ][Math.floor(Math.random() * 4)];
    $('#sound-lbl').textContent = this.audio.muted ? 'off' : 'on';
    this.show('#pause-screen');
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.hide('#pause-screen');
    this.mode = 'playing';
    this.last = performance.now();
    this.audio.init();
  }

  openHow() {
    this.wasMode = this.mode;
    this.show('#how-screen');
    this.mode = 'how';
  }

  closeHow() {
    this.hide('#how-screen');
    this.mode = this.wasMode === 'playing' ? 'playing' : (this.wasMode || 'title');
    if (this.mode === 'title') this.show('#title-screen');
  }

  toggleSound() {
    this.audio.init();
    this.audio.setMuted(!this.audio.muted);
    $('#sound-lbl').textContent = this.audio.muted ? 'off' : 'on';
    if (!this.audio.muted) this.audio.uiClick();
  }

  resetToStart(cpIndex, toast = true) {
    const cp = CHECKPOINTS[clamp(cpIndex, 0, CHECKPOINTS.length - 1)];
    this.checkpointIndex = clamp(cpIndex, 0, CHECKPOINTS.length - 1);
    Body.setPosition(this.player, { x: cp.spawnX, y: cp.spawnY });
    Body.setVelocity(this.player, { x: 0, y: 0 });
    Body.setAngularVelocity(this.player, 0);
    this.placePole(-0.42);
    this.detachHook(true);
    this.peakY = this.player.position.y;
    this.fellThisDrop = false;
    this.lastFallNarration = -999;
    this.camera.x = this.player.position.x;
    this.camera.y = this.player.position.y - 40;
    if (toast) this.toast(`CHECKPOINT — ${cp.name}`);
    this.updateHUD();
  }

  placePole(angle = -0.3) {
    const px = this.player.position.x + Math.cos(angle) * POLE_HALF;
    const py = this.player.position.y + Math.sin(angle) * POLE_HALF;
    Body.setPosition(this.pole, { x: px, y: py });
    Body.setAngle(this.pole, angle);
    Body.setVelocity(this.pole, { x: 0, y: 0 });
    Body.setAngularVelocity(this.pole, 0);
  }

  returnToCheckpoint(silent = false) {
    if (this.mode !== 'playing' && !silent) return;
    this.stats.resets++;
    if (!silent) {
      this.audio.hookMiss();
      this.toast('RETURNED TO CHECKPOINT');
    }
    this.resetToStart(this.checkpointIndex, false);
    this.fellThisDrop = false;
    this.updateHUD();
  }

  seaRespawn() {
    this.stats.falls++;
    this.stats.resets++;
    this.audio.splash(1.2);
    this.splashFlash = 1;
    this.addFallParticles();
    this.resetToStart(this.checkpointIndex, false);
    this.toast('THE SEA RETURNS YOU');
    this.say('The sea is a generous host, and a terrible landlord.', 4500);
    this.updateHUD();
    this.saveProgress();
  }

  teleport(index) {
    this.checkpointIndex = clamp(index, 0, CHECKPOINTS.length - 1);
    this.resetToStart(this.checkpointIndex, true);
    this.mode = 'playing';
  }

  /* ── main loop ─────────────────────────────────────────── */
  loop(now) {
    if (!this.running) return;
    if (!this.last) this.last = now;
    let delta = now - this.last;
    this.last = now;
    if (delta > 90) delta = 90;
    const dt = delta / 1000;
    this.time += dt;

    if (this.mode === 'playing') {
      this.elapsed += dt;
      this.acc = (this.acc || 0) + delta;
      let steps = 0;
      while (this.acc >= STEP && steps < 4) {
        this.fixedUpdate(STEP / 1000);
        this.acc -= STEP;
        steps++;
      }
      if (steps === 4) this.acc = 0;
      this.frameUpdate(dt);
    } else if (this.mode === 'title' || this.mode === 'ending' || this.mode === 'how' || this.mode === 'paused') {
      // Keep the world gently alive on menus, but do not simulate play.
      if (this.mode === 'title') this.updateTitle(dt);
      if (this.mode === 'ending') this.updateEnding(dt);
    }

    this.updateCamera(dt);
    this.updateParticles(dt);
    this.updateUI(dt);
    this.audio.update(dt, this.poleSpeed(), this.altitude());

    this.renderer.draw(now / 1000, dt);
    requestAnimationFrame(this.loop);
  }

  poleSpeed() {
    return Math.abs(this.pole.angularVelocity) * POLE_HALF + Vector.magnitude(this.pole.velocity) * 60;
  }

  fixedUpdate(dt) {
    const p = this.player.position;
    this.mouse.wx = (this.mouse.x - this.renderer.w / 2) / this.camera.zoom + this.camera.x;
    this.mouse.wy = (this.mouse.y - this.renderer.h / 2) / this.camera.zoom + this.camera.y;

    const shoulder = this.shoulder();
    const aim = this.mouse;
    let target = Math.atan2(aim.wy - shoulder.y, aim.wx - shoulder.x);
    if (!Number.isFinite(target)) target = this.pole.angle;
    const diff = wrapAngle(target - this.pole.angle);

    // PD angular control — the pole has weight and fights back.
    const kP = this.grip ? 12.5 : 8.4;
    const kD = this.grip ? 690 : 520;
    const maxT = this.grip ? 20 : 15;
    let torque = diff * kP - this.pole.angularVelocity * kD;
    torque = clamp(torque, -maxT, maxT);
    this.pole.torque = torque;

    // Waddle assist
    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    if (dir && this.grounded()) {
      Body.applyForce(this.player, p, { x: dir * 0.00115 * PLAYER_MASS, y: 0 });
      const maxV = 0.24;
      if (Math.abs(this.player.velocity.x) > maxV) {
        Body.setVelocity(this.player, { x: Math.sign(this.player.velocity.x) * maxV, y: this.player.velocity.y });
      }
    }

    // Hook physics
    if (this.hook.state === 'attached') this.applyHook(dt);

    Engine.update(this.engine, STEP);

    // Keep the player's barrel upright (the body inertia is locked; safety).
    Body.setAngle(this.player, 0);
    Body.setAngularVelocity(this.player, 0);

    // Guardrails: if something goes horribly right, recover.
    if (p.y > SEA_LIMIT + 100 && this.mode === 'playing') {
      this.seaRespawn();
    }
    const out = !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.y > 5000 || Math.abs(p.x) > 5000;
    if (out) this.returnToCheckpoint(true);
  }

  frameUpdate(dt) {
    const p = this.player.position;
    const y = p.y;

    // altitude progress and falls
    const alt = (START.y - y) / PX_PER_M;
    if (y < this.peakY - 2) this.peakY = y;
    if (this.save.bestAlt < alt) {
      this.save.bestAlt = alt;
      if (this.time - this.lastSave > 4) {
        this.lastSave = this.time;
        this.saveProgress();
      }
    }
    if (!this.fellThisDrop && y > this.peakY + 430) {
      this.fellThisDrop = true;
      this.stats.falls++;
      this.audio.fallSting();
      if (this.time - this.lastFallNarration > 12) {
        this.lastFallNarration = this.time;
        this.say(FALL_LINES[Math.floor(Math.random() * FALL_LINES.length)], 4200);
      }
      this.updateHUD();
    }
    if (this.fellThisDrop && y < this.peakY - 120) this.fellThisDrop = false;

    // checkpoints
    const cp = CHECKPOINTS[this.checkpointIndex + 1];
    if (cp) {
      const near = Math.hypot(p.x - cp.x, p.y - cp.y) < 270;
      if (near && this.grounded()) {
        this.checkpointIndex++;
        this.audio.checkpoint();
        this.toast(`CHECKPOINT — ${cp.name}`);
        this.say(NARRATION.checkpoint, 4200);
        this.spawnGoldBurst({ x: cp.x, y: cp.y - 20 }, 18, false);
        this.saveProgress();
        this.updateHUD();
      }
    }

    // Zones
    const z = this.level.zoneAt(y);
    if (z && z.id !== this.zone.id) {
      this.zone = z;
      this.audio.setZone(z.id);
      this.showZone(z, true);
      if (!this.visitedZones.has(z.id)) {
        this.visitedZones.add(z.id);
        setTimeout(() => {
          if (this.mode === 'playing' && this.zone.id === z.id) this.say(z.quote, 7500);
        }, 1100);
      }
    }

    // tutorial hint stages
    this.tutorialClock += dt;
    if (this.tutorialStage === 0 && (this.tutorialClock > 7 || alt > 2)) this.tutorialStage = 1;
    if (this.tutorialStage === 1 && alt > 16) this.tutorialStage = 2;
    if (this.tutorialStage === 2 && this.stats.hooks > 0) this.tutorialStage = 3;
    if (this.tutorialStage === 0) {
      this.setHint('mouse', 'Move the mouse — the pole follows. Plant the tip. Pull.', 0);
    } else if (this.tutorialStage === 1) {
      this.setHint('lmb', 'Hold left mouse to grip. Lever the pole against a ledge.', 0);
    } else if (this.tutorialStage === 2) {
      this.setHint('rmb', 'Right mouse throws your hook. Hold to reel in.', 0);
    } else if (this.hook.state === 'attached') {
      this.setHint('reel', 'HOLD RIGHT MOUSE to haul in. Release to let go.', 0);
    } else {
      this.setHint('r', 'R returns you to the last checkpoint flag.', 0);
    }

    // hook aim / cooldown
    const h = this.hook;
    if (h.cooldown > 0) h.cooldown = Math.max(0, h.cooldown - dt);
    if (h.state === 'flying') {
      h.t += dt;
      const t = clamp(h.t / h.dur, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      h.pos.x = lerp(h.from.x, h.to.x, e);
      h.pos.y = lerp(h.from.y, h.to.y, e);
      if (h.miss && Math.random() < .55) this.addParticle({
        x: h.pos.x, y: h.pos.y, vx: (Math.random() - .5) * 80, vy: (Math.random() - .5) * 80,
        life: .4, max: .4, size: 1.6, color: 'rgba(230,210,170,.5)', type: 'spark', grav: 0,
      });
      if (t >= 1) {
        if (h.miss) {
          h.state = 'retracting'; h.t = 0; h.dur = .16;
          this.audio.hookMiss();
        } else {
          h.state = 'attached';
          h.anchor = { x: h.to.x, y: h.to.y };
          h.ropeLen = Math.max(40, Math.hypot(p.x - h.anchor.x, p.y - h.anchor.y));
          h.attachedFor = 0;
          this.reeling = this.rightMouseDown;
          this.stats.hooks++;
          this.audio.hookLatch();
          this.spawnImpact(h.anchor, 'stone', 1.2);
          this.addCameraShake(2);
        }
      }
    } else if (h.state === 'attached') {
      h.attachedFor += dt;
      h.pos.x = h.anchor.x; h.pos.y = h.anchor.y;
      if (this.reeling) {
        h.ropeLen = Math.max(38, h.ropeLen - 170 * dt);
        if (Math.random() < .4) this.audio.reel();
        if (Math.random() < .5) this.addParticle({
          x: h.anchor.x, y: h.anchor.y, vx: (Math.random() - .5) * 50, vy: Math.random() * 40,
          life: .5, max: .5, size: 1.3, color: 'rgba(220,205,170,.45)', type: 'spark', grav: 120,
        });
      }
      if (h.attachedFor > 9 || Math.hypot(p.x - h.anchor.x, p.y - h.anchor.y) > 760) {
        this.releaseHook();
        this.toast('THE ROPE SLIPS');
      }
    } else if (h.state === 'retracting') {
      h.t += dt;
      const t = clamp(h.t / h.dur, 0, 1);
      const hand = this.hand();
      h.pos.x = lerp(h.pos.x, hand.x, t * .35);
      h.pos.y = lerp(h.pos.y, hand.y, t * .35);
      if (t >= 1) { h.state = 'ready'; h.cooldown = .35; h.anchor = null; }
    } else {
      const hand = this.hand();
      h.pos.x = hand.x; h.pos.y = hand.y;
    }

    // victory
    if (Math.hypot(p.x - SUMMIT.x, p.y - SUMMIT.y) < 150) this.startEnding();

    // splash flash decay
    this.splashFlash = Math.max(0, this.splashFlash - dt * 1.6);
    this.updateHUD();
  }

  updateTitle(dt) {
    const z = this.camera.baseZoom * 1.1;
    const targetX = START.x - (this.renderer.w * .095) / z;
    const targetY = START.y - 20;
    this.camera.x = damp(this.camera.x, targetX + Math.sin(this.time * .09) * 10, 1.4, dt);
    this.camera.y = damp(this.camera.y, targetY + Math.sin(this.time * .13) * 6, 1.4, dt);
    this.camera.zoom = damp(this.camera.zoom, z, 1.4, dt);
    this.player.torque = 0;
  }

  updateEnding(dt) {
    this.endTimer += dt;
    this.chestOpen = clamp(this.chestOpen + dt * .7, 0, 1);
    const target = { x: SUMMIT.x, y: SUMMIT.y - 40 };
    this.camera.x = damp(this.camera.x, target.x, 1.8, dt);
    this.camera.y = damp(this.camera.y, target.y, 1.8, dt);
    this.camera.zoom = damp(this.camera.zoom, this.camera.baseZoom * 1.18, 1.3, dt);
    if (this.endTimer > .3 && this.endTimer < 2.6 && Math.random() < .7) {
      this.spawnGoldBurst({ x: SUMMIT.x + (Math.random() - .5) * 160, y: SUMMIT.y - 20 }, 1, false);
    }
  }

  startEnding() {
    if (this.mode !== 'playing') return;
    this.mode = 'ending';
    this.endTimer = 0;
    this.chestOpen = 0;
    this.releaseHook(true);
    this.grip = false;
    this.save.summits = (this.save.summits || 0) + 1;
    this.save.bestAlt = Math.max(this.save.bestAlt || 0, 1000);
    this.saveProgress();
    this.audio.treasure();
    this.say(NARRATION.summit, 6000);
    this.setHint('', '', 0);
    this.spawnGoldBurst({ x: SUMMIT.x, y: SUMMIT.y - 30 }, 60, true);
    setTimeout(() => {
      if (this.mode !== 'ending') return;
      $('#end-time').textContent = this.formatTime(this.elapsed);
      $('#end-falls').textContent = this.stats.falls;
      $('#end-resets').textContent = this.stats.resets;
      $('#end-hooks').textContent = this.stats.hooks;
      $('#end-line').textContent = this.stats.falls === 0
        ? 'Not a single fall. That is either extraordinary skill or a deeply suspicious lack of ambition.'
        : this.stats.falls < 8
          ? 'The treasure was the friends you made along the way. It is also, it turns out, a great deal of gold.'
          : 'You fell, repeatedly, with the dedication of a professional. The gold is yours. So is the view.';
      this.show('#end-screen');
      this.setHUD(false);
    }, 2600);
  }

  /* ── hook ──────────────────────────────────────────────── */
  fireHook() {
    const h = this.hook;
    if (h.state === 'flying' || h.state === 'attached' || h.state === 'retracting') return;
    if (h.cooldown > 0) return;
    this.audio.init();
    this.updateMouseWorld();
    const p = this.player.position;
    const hand = this.hand();
    let dx = this.mouse.wx - p.x, dy = this.mouse.wy - p.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const hit = castRay(this.level.segments, hand.x, hand.y, hand.x + dx * HOOK_RANGE, hand.y + dy * HOOK_RANGE, HOOK_RANGE);
    h.state = 'flying';
    h.miss = !hit;
    h.from = { x: hand.x, y: hand.y };
    h.to = hit ? { x: hit.x, y: hit.y } : { x: hand.x + dx * HOOK_RANGE, y: hand.y + dy * HOOK_RANGE };
    h.pos = { ...h.from };
    h.t = 0;
    h.attachedFor = 0;
    h.anchor = null;
    h.dur = hit ? clamp(Math.hypot(hit.x - hand.x, hit.y - hand.y) / 3400, .07, .2) : .19;
    this.reeling = true;
    this.audio.hookFire();
    if (hit) this.toast('');
  }

  applyHook(dt) {
    const h = this.hook;
    if (!h.anchor) return;
    const p = this.player.position;
    const dx = h.anchor.x - p.x, dy = h.anchor.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    if (dist > h.ropeLen) {
      const nx = dx / dist, ny = dy / dist;
      const stretch = dist - h.ropeLen;
      const rv = this.player.velocity.x * nx + this.player.velocity.y * ny;
      const accel = clamp(stretch * 0.00009 + Math.max(0, rv) * 0.012, 0, 0.02);
      Body.applyForce(this.player, p, { x: nx * accel * PLAYER_MASS, y: ny * accel * PLAYER_MASS });
      if (stretch > 220) {
        // rope rescue cap so a bad catch does not fling you into orbit
        const v = this.player.velocity;
        const sp = Math.hypot(v.x, v.y);
        if (sp > 1.9) Body.setVelocity(this.player, { x: v.x / sp * 1.9, y: v.y / sp * 1.9 });
      }
    }
  }

  releaseHook(silent = false) {
    const h = this.hook;
    this.rightMouseDown = false;
    this.reeling = false;
    // Let a thrown hook finish its flight; releasing only lets go after it latches.
    if (h.state === 'attached') {
      if (!silent) this.toast('');
      h.state = 'retracting';
      h.t = 0;
      h.dur = .18;
      h.anchor = null;
    }
  }

  detachHook(silent = true) {
    this.reeling = false;
    this.hook.state = 'ready';
    this.hook.anchor = null;
    this.hook.cooldown = .3;
    const hand = this.hand();
    this.hook.pos = { ...hand };
  }

  /* ── geometry helpers ──────────────────────────────────── */
  shoulder() {
    return { x: this.player.position.x + 18, y: this.player.position.y - 18 };
  }
  hand() {
    return { x: this.player.position.x - 26, y: this.player.position.y + 4 };
  }
  poleTip() {
    const a = this.pole.angle;
    return {
      x: this.pole.position.x + Math.cos(a) * POLE_HALF,
      y: this.pole.position.y + Math.sin(a) * POLE_HALF,
    };
  }
  grounded() {
    const p = this.player.position;
    for (let i = -2; i <= 2; i++) {
      const x = p.x + i * 16;
      const hit = castRay(this.level.segments, x, p.y, x, p.y + PLAYER_R + 18);
      if (hit && hit.dist <= PLAYER_R + 20) return true;
    }
    return false;
  }
  altitude() {
    return Math.max(0, Math.round((START.y - this.player.position.y) / PX_PER_M));
  }
  progress() {
    return clamp((START.y - this.player.position.y) / (START.y - SUMMIT.y), 0, 1);
  }
  formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }
  updateMouseWorld() {
    this.mouse.wx = (this.mouse.x - this.renderer.w / 2) / this.camera.zoom + this.camera.x;
    this.mouse.wy = (this.mouse.y - this.renderer.h / 2) / this.camera.zoom + this.camera.y;
  }

  /* ── camera / particles ────────────────────────────────── */
  updateCamera(dt) {
    if (this.mode === 'playing') {
      const p = this.player.position;
      const v = this.player.velocity;
      const targetX = clamp(p.x + 30, -720, 780);
      const targetY = p.y - 138 + clamp(v.y * 42, -130, 180);
      this.camera.x = damp(this.camera.x, targetX, 5.2, dt);
      this.camera.y = damp(this.camera.y, targetY, 5.2, dt);
      const targetZoom = this.camera.baseZoom * this.camera.userZoom;
      this.camera.zoom = damp(this.camera.zoom, targetZoom, 3.2, dt);
    } else if (this.mode === 'title' || this.mode === 'ending') {
      // handled elsewhere
    } else {
      this.camera.zoom = damp(this.camera.zoom, this.camera.baseZoom * this.camera.userZoom, 3, dt);
    }
    this.camera.shakeTime += dt;
    this.camera.shake = Math.max(0, this.camera.shake - dt * 15);
    const s = this.camera.shake;
    this.camera.shakeX = Math.sin(this.camera.shakeTime * 93) * s + Math.sin(this.camera.shakeTime * 47) * s * .5;
    this.camera.shakeY = Math.cos(this.camera.shakeTime * 81) * s + Math.cos(this.camera.shakeTime * 53) * s * .5;
  }

  addCameraShake(n) {
    this.camera.shake = Math.min(16, this.camera.shake + n);
  }

  updateParticles(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.life -= dt;
      if (q.life <= 0) { ps.splice(i, 1); continue; }
      q.vy += (q.grav || 0) * dt;
      q.vx *= (1 - (q.drag || 0) * dt);
      q.vy *= (1 - (q.drag || 0) * dt);
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.rot !== undefined) q.rot += (q.spin || 0) * dt;
    }
    if (ps.length > 620) ps.splice(0, ps.length - 620);
  }

  addParticle(o) {
    this.particles.push(o);
  }

  spawnDust(pos, type, speed) {
    const color = type === 'sand' ? 'rgba(214,186,132,.5)'
      : type === 'moss' ? 'rgba(116,146,84,.5)'
        : type === 'stone' ? 'rgba(170,168,150,.42)'
          : 'rgba(150,120,82,.5)';
    for (let i = 0; i < 3; i++) {
      this.addParticle({
        x: pos.x + (Math.random() - .5) * 10,
        y: pos.y + (Math.random() - .5) * 10,
        vx: (Math.random() - .5) * 90,
        vy: -Math.random() * 50,
        life: .45 + Math.random() * .35, max: .8,
        size: 1.5 + Math.random() * 2.6,
        color, type: 'dust', grav: 160, drag: 1.4,
      });
    }
  }

  spawnImpact(pos, type, power) {
    const colors = {
      sand: 'rgba(226,199,144,.8)', wood: 'rgba(168,121,70,.8)', deck: 'rgba(168,121,70,.8)',
      rock: 'rgba(190,184,160,.75)', moss: 'rgba(133,166,96,.8)', stone: 'rgba(205,200,180,.8)', gold: 'rgba(255,220,130,.9)',
    };
    const c = colors[type] || colors.rock;
    const n = Math.min(18, 4 + Math.floor(power * 7));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 180 * Math.min(1.6, power);
      this.addParticle({
        x: pos.x, y: pos.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        life: .35 + Math.random() * .6, max: .95,
        size: 1 + Math.random() * 2.8, color: c, type: type === 'stone' || type === 'gold' ? 'spark' : 'dust',
        grav: 300, drag: .8,
      });
    }
  }

  spawnGoldBurst(pos, n, big) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = big ? 80 + Math.random() * 400 : 40 + Math.random() * 160;
      this.addParticle({
        x: pos.x + (Math.random() - .5) * 30, y: pos.y + (Math.random() - .5) * 30,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 180,
        life: 1 + Math.random() * 1.8, max: 2.8,
        size: 1.2 + Math.random() * 3.2, color: Math.random() < .35 ? 'rgba(255,247,214,.95)' : 'rgba(255,206,94,.95)',
        type: 'gold', grav: 210, drag: .35, rot: Math.random() * 6, spin: (Math.random() - .5) * 8,
      });
    }
  }

  addFallParticles() {
    const p = this.player.position;
    for (let i = 0; i < 30; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 2.4;
      const sp = 60 + Math.random() * 320;
      this.addParticle({
        x: p.x + (Math.random() - .5) * 50, y: this.level.seaY + (Math.random() - .5) * 10,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: .6 + Math.random() * .8, max: 1.4,
        size: 1.5 + Math.random() * 3.5, color: 'rgba(185,224,216,.75)', type: 'splash',
        grav: 500, drag: .4,
      });
    }
  }

  /* ── UI ────────────────────────────────────────────────── */
  show(sel) { $(sel)?.classList.remove('hidden'); }
  hide(sel) { $(sel)?.classList.add('hidden'); }
  setHUD(on) {
    if (on) this.show('#hud'); else this.hide('#hud');
  }
  toast(text) {
    if (!text) return;
    $('#toast-text').textContent = text;
    const el = $('#toast');
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 2200);
  }
  say(text, dur = 6000) {
    if (!text) return;
    const el = $('#narration');
    $('#narration-text').textContent = text;
    el.classList.add('show');
    clearTimeout(this._sayT);
    this._sayT = setTimeout(() => el.classList.remove('show'), dur);
  }
  showZone(z, announce = true) {
    $('#zone-name').textContent = z.name;
    const el = $('#zone-banner');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._zoneT);
    this._zoneT = setTimeout(() => el.classList.remove('show'), 3600);
    document.querySelectorAll('.track-label').forEach((n) => {
      n.classList.toggle('now', n.dataset.zone === z.id);
    });
  }
  setHint(key, text, dur = 0) {
    if (this.hintKey === key) return;
    this.hintKey = key;
    $('#hint-key').textContent = key.toUpperCase();
    $('#hint-text').textContent = text;
    $('#hint').classList.remove('dim');
    if (dur) {
      clearTimeout(this._hintT);
      this._hintT = setTimeout(() => $('#hint').classList.add('dim'), dur);
    }
  }
  updateHUD() {
    const alt = this.altitude();
    $('#altitude').textContent = alt;
    $('#falls').textContent = this.stats.falls;
    const best = Math.max(this.save.bestAlt || 0, alt);
    $('#best-alt').textContent = Math.round(best);
    $('#timer').textContent = this.formatTime(this.elapsed);
    const p = this.progress();
    $('#track-fill').style.height = `${p * 100}%`;
    $('#track-you').style.bottom = `${p * 100}%`;
    document.querySelectorAll('.track-mark').forEach((m, i) => {
      m.classList.toggle('done', p * 100 >= parseFloat(m.style.bottom));
    });
    const hs = this.hook.state;
    const stateEl = $('#hook-state');
    const labels = { ready: 'READY', flying: 'THROWN', attached: 'BITES', retracting: 'RETURNING' };
    stateEl.textContent = labels[hs] || 'READY';
    stateEl.classList.toggle('live', hs === 'attached');
    stateEl.classList.toggle('miss', hs === 'retracting');
    const fill = hs === 'attached'
      ? clamp(1 - (this.hook.attachedFor / 9), 0, 1)
      : hs === 'ready' ? 1 - this.hook.cooldown / .4 : .55;
    $('#hook-meter-fill').style.transform = `scaleX(${clamp(fill, 0, 1)})`;
    const dist = this.hook.state === 'attached'
      ? Math.round(Math.hypot(this.player.position.x - this.hook.anchor.x, this.player.position.y - this.hook.anchor.y))
      : Math.round(Math.hypot(this.mouse.wx - this.player.position.x, this.mouse.wy - this.player.position.y));
    $('#hook-dist').textContent = this.hook.state === 'attached' ? `${dist}px ROPE` : `${Math.min(dist, HOOK_RANGE)} / ${HOOK_RANGE}`;
  }
  updateUI(dt) {
    if (this.mode !== 'playing') return;
    // hide hints after the opening once the player is moving well
    if (this.progress() > .55 && this.hintKey === 'r') {
      // leave it; it fades into the scenery
    }
    if (this.narrationTimer > 0) this.narrationTimer -= dt;
  }

  /* ── persistence ───────────────────────────────────────── */
  loadSave() {
    try {
      const raw = localStorage.getItem('hookpole_save_v1');
      if (raw) return { bestAlt: 0, summits: 0, ...JSON.parse(raw) };
    } catch {}
    return { bestAlt: 0, summits: 0 };
  }
  saveProgress() {
    try {
      localStorage.setItem('hookpole_save_v1', JSON.stringify({
        bestAlt: Math.round(this.save.bestAlt || 0),
        summits: this.save.summits || 0,
      }));
    } catch {}
    this.updateSaveUI();
  }
  updateSaveUI() {
    const best = Math.round(this.save.bestAlt || 0);
    $('#title-best').textContent = best > 0 ? `${best} m` : '—';
    $('#title-summits').textContent = this.save.summits || 0;
    if ($('#best-alt')) $('#best-alt').textContent = best;
  }
}

/* ── boot ─────────────────────────────────────────────────── */
const game = new Game();
game.boot();
