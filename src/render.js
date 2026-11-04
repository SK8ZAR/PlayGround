/* ══════════════════════════════════════════════════════════════
   RENDERER — sky, sea, camera, particles, cursor, presentation
   ══════════════════════════════════════════════════════════════ */

import { START, SUMMIT, SEA_Y } from './level.js';
import {
  TAU, clamp, lerp, hashStr, mulberry32, SKY, mix, withA, ellipse, poly,
} from './paint.js';
import { preparePlatforms, drawSeaStack, drawUndercliffs, drawPlatforms } from './terrain.js';
import { drawProp, drawChest } from './props.js';
import { drawPole, drawPirate, drawRope, drawFlyingHook } from './character.js';
import { castRay } from './level.js';

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.game = game;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.ready = false;
    this.cam = game.camera || { x: 0, y: 0, zoom: .8, shakeX: 0, shakeY: 0 };
    this.resize();
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    if (this.game.camera) {
      const c = this.game.camera;
      c.baseZoom = clamp(Math.max(this.w / 1300, this.h / 820), .72, 1.25);
      if (!this.ready) c.zoom = c.baseZoom;
    }
  }

  preload() {
    if (this.ready) return;
    preparePlatforms(this.game.level);

    // stars
    const rand = mulberry32(77123);
    this.stars = [];
    for (let i = 0; i < 170; i++) {
      this.stars.push({
        x: rand(), y: rand() * .72, r: .4 + rand() * 1.7,
        a: .25 + rand() * .75, tw: rand() * TAU, big: rand() > .93,
      });
    }

    // clouds
    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      this.clouds.push({
        x: -2200 + rand() * 4400,
        y: 560 - rand() * 11200,
        s: .5 + rand() * 1.3,
        a: .08 + rand() * .16,
        v: .8 + rand() * 2.4,
        warm: rand(),
      });
    }
    this.cloudSprite = this.makeCloudSprite('#ffe4c0');
    this.cloudSpriteCool = this.makeCloudSprite('#cadfe4');

    // ambient motes
    this.motes = [];
    for (let i = 0; i < 150; i++) {
      const y = 300 - rand() * 10800;
      this.motes.push({
        x: -1200 + rand() * 2400,
        y,
        s: .6 + rand() * 1.8,
        ph: rand() * TAU,
        sp: .4 + rand() * 1.2,
      });
    }

    // checkpoint flag footings
    for (const cp of this.game.level.checkpoints) {
      const hit = castRay(this.game.level.segments, cp.x, cp.y, cp.x, cp.y + 220);
      cp.footY = hit ? hit.y : cp.y + 40;
    }

    // cached fog gradients
    this.ready = true;
  }

  makeCloudSprite(color) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 220;
    const g = c.getContext('2d');
    const rand = mulberry32(4312);
    for (let i = 0; i < 13; i++) {
      const x = 70 + rand() * 380;
      const y = 75 + rand() * 80;
      const r = 34 + rand() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, withA(color, .5));
      gr.addColorStop(.55, withA(color, .18));
      gr.addColorStop(1, withA(color, 0));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    return c;
  }

  screenTransform() {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  parallax(f = 1, mul = 1) {
    const { ctx, dpr, cam, w, h } = this;
    const z = cam.zoom * mul;
    ctx.setTransform(
      dpr * z, 0, 0, dpr * z,
      dpr * (w / 2 + cam.shakeX - cam.x * f * z),
      dpr * (h / 2 + cam.shakeY - cam.y * f * z),
    );
  }

  draw(t, dt) {
    const { ctx, w, h, game } = this;
    this.cam = game.camera;
    if (!this.ready) this.preload();
    this.screenTransform();
    ctx.clearRect(0, 0, w, h);

    const prog = game.progress ? game.progress() : 0;
    this.drawSky(prog, t);
    this.drawStars(prog, t);
    this.drawSun(prog, t);
    this.drawClouds(t, prog);
    this.drawHorizon(prog, t);

    this.parallax(1);
    drawSeaStack(ctx, game, t);
    drawUndercliffs(ctx, game, this.cam, t);
    this.drawBackProps(t);
    drawPlatforms(ctx, game, this.cam, t);
    this.drawWater(t);
    this.drawFrontProps(t);
    this.drawCheckpoints(t);
    this.drawChest(t);
    this.drawRopeAndPole(t);
    this.drawPirateLayer(t);
    this.drawParticles(t);
    this.drawMotes(t);

    this.screenTransform();
    this.drawScreenEffects(t);
    this.drawCursor(t);
    this.drawDebug();
  }

  /* ── sky ───────────────────────────────────────────────── */
  drawSky(prog, t) {
    const { ctx, w, h } = this;
    const low = prog < .52 ? SKY.low : SKY.mid;
    const high = prog < .52 ? SKY.mid : SKY.high;
    const tt = prog < .52 ? prog / .52 : (prog - .52) / .48;
    const top = mix(low.top, high.top, tt);
    const mid = mix(low.mid, high.mid, tt);
    const lowc = mix(low.low, high.low, tt);
    const hor = mix(low.hor, high.hor, tt);
    const under = mix(low.under, high.under, tt);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(.26, top);
    g.addColorStop(.5, mid);
    g.addColorStop(.72, lowc);
    g.addColorStop(.88, hor);
    g.addColorStop(1, under);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // the low sun is the whole scene's key light
    const sx = w * .23, sy = h * (.47 - prog * .52);
    const glow = ctx.createRadialGradient(sx, sy, 6, sx, sy, Math.max(w, h) * .78);
    glow.addColorStop(0, `rgba(255,235,194,${.6 * (1 - prog * .55)})`);
    glow.addColorStop(.08, `rgba(255,205,142,${.4 * (1 - prog * .55)})`);
    glow.addColorStop(.3, `rgba(238,158,98,${.15 * (1 - prog * .55)})`);
    glow.addColorStop(.62, `rgba(180,120,92,${.05 * (1 - prog * .55)})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // warm band sitting on the horizon
    const hz = ctx.createLinearGradient(0, h * .58, 0, h);
    hz.addColorStop(0, 'rgba(255,196,116,0)');
    hz.addColorStop(.55, `rgba(255,196,116,${.1 * (1 - prog * .85)})`);
    hz.addColorStop(1, 'rgba(120,72,50,0)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, 0, w, h);
  }

  drawStars(prog, t) {
    const { ctx, w, h } = this;
    const a = clamp((prog - .28) / .45, 0, 1);
    if (a <= .01) return;
    ctx.save();
    for (const s of this.stars) {
      const tw = .55 + .45 * Math.sin(t * 1.7 + s.tw);
      ctx.fillStyle = `rgba(225,236,236,${a * s.a * tw})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r * (s.big ? 1.5 : 1), 0, TAU);
      ctx.fill();
      if (s.big) {
        ctx.strokeStyle = `rgba(220,235,240,${a * .22 * tw})`;
        ctx.lineWidth = .7;
        ctx.beginPath();
        ctx.moveTo(s.x * w - 5, s.y * h);
        ctx.lineTo(s.x * w + 5, s.y * h);
        ctx.moveTo(s.x * w, s.y * h - 5);
        ctx.lineTo(s.x * w, s.y * h + 5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawSun(prog, t) {
    const { ctx, w, h } = this;
    const sunX = w * .23;
    const sunY = h * (.47 - prog * .52);
    const vis = clamp(1 - prog * .55, 0, 1);
    if (sunY > -240) {
      const warm = prog < .6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // broad bloom
      const R = Math.min(w, h) * .62;
      const g = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, R);
      g.addColorStop(0, warm ? `rgba(255,236,196,${.62 * vis})` : `rgba(210,230,240,${.2 * vis})`);
      g.addColorStop(.1, warm ? `rgba(255,205,138,${.28 * vis})` : `rgba(190,220,235,${.1 * vis})`);
      g.addColorStop(.38, warm ? `rgba(240,148,88,${.07 * vis})` : `rgba(150,190,220,${.025 * vis})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // crepuscular rays
      const rays = 9;
      for (let i = 0; i < rays; i++) {
        const a = -0.55 + i * .14 + Math.sin(t * .05 + i * 1.7) * .015;
        const len = h * (.42 + (i % 3) * .16);
        const rg = ctx.createLinearGradient(sunX, sunY, sunX + Math.cos(a) * len, sunY + Math.sin(a) * len);
        rg.addColorStop(0, `rgba(255,214,152,${.05 * vis})`);
        rg.addColorStop(.6, `rgba(255,196,130,${.018 * vis})`);
        rg.addColorStop(1, 'rgba(255,190,120,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + Math.cos(a - .035) * len, sunY + Math.sin(a - .035) * len);
        ctx.lineTo(sunX + Math.cos(a + .035) * len, sunY + Math.sin(a + .035) * len);
        ctx.closePath();
        ctx.fill();
      }

      // disc
      const disc = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 64);
      disc.addColorStop(0, `rgba(255,250,226,${.98 * vis})`);
      disc.addColorStop(.32, `rgba(255,221,150,${.86 * vis})`);
      disc.addColorStop(.62, `rgba(255,186,104,${.42 * vis})`);
      disc.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 66, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // moon at altitude
    if (prog > .55) {
      const ma = clamp((prog - .55) / .3, 0, 1);
      const mx = w * .17, my = h * .17;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createRadialGradient(mx, my, 2, mx, my, 120);
      rg.addColorStop(0, `rgba(220,235,235,${.16 * ma})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(mx - 120, my - 120, 240, 240);
      ctx.restore();
      ctx.fillStyle = `rgba(224,232,224,${.8 * ma})`;
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(170,185,183,${.4 * ma})`;
      ctx.beginPath(); ctx.arc(mx - 7, my - 4, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 6, my + 7, 3.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 4, my - 9, 2.4, 0, TAU); ctx.fill();
    }
  }

  drawClouds(t, prog) {
    const { ctx, w, h } = this;
    const z = this.cam.zoom;
    const sunX = w * .23;
    const sunY = h * (.47 - prog * .52);
    ctx.save();
    for (const c of this.clouds) {
      const f = .18;
      const sx = (c.x - this.cam.x * f) * z * .7 + w * .5 + Math.sin(t * .02 + c.y) * 14;
      const sy = (c.y - this.cam.y * f) * z * .7 + h * .5;
      if (sy < -220 * c.s || sy > h + 220 * c.s) continue;
      if (sx < -420 * c.s || sx > w + 420 * c.s) continue;
      const alpha = c.a * (1 - prog * .2) * 1.25;
      ctx.globalAlpha = alpha;
      const sprite = c.warm > prog * 1.2 ? this.cloudSprite : this.cloudSpriteCool;
      const cw = 512 * c.s * .7, ch = 220 * c.s * .7;
      ctx.drawImage(sprite, sx - cw / 2, sy - ch / 2, cw, ch);
    }
    ctx.restore();

    // lit cloud banks around the low sun
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const banks = [
      [0, -.09, 420, 30, .13],
      [.14, .04, 520, 24, .1],
      [-.13, .12, 360, 20, .08],
      [.05, -.2, 620, 34, .07],
    ];
    for (const [dx, dy, bw, bh, a] of banks) {
      const bx = sunX + w * dx, by = sunY + h * dy;
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, bw);
      bg.addColorStop(0, `rgba(255,214,158,${a * (1 - prog * .4)})`);
      bg.addColorStop(.55, `rgba(240,178,128,${a * .4 * (1 - prog * .4)})`);
      bg.addColorStop(1, 'rgba(240,178,128,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(bx, by, bw, bh, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // a few birds riding the warm air
    ctx.save();
    ctx.strokeStyle = `rgba(34,52,52,${.5 * (1 - prog * .5)})`;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const bx = w * (.3 + i * .1) + Math.sin(t * .18 + i) * 20;
      const by = h * (.23 + (i % 3) * .05) + Math.sin(t * .7 + i * 2) * 5;
      const fl = Math.sin(t * 3.2 + i) * 4;
      const s = 3 + (i % 2) * 2;
      ctx.beginPath();
      ctx.moveTo(bx - s, by + fl * .3);
      ctx.quadraticCurveTo(bx - s * .4, by - s * .5 - fl, bx, by);
      ctx.quadraticCurveTo(bx + s * .4, by - s * .5 - fl, bx + s, by + fl * .3);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHorizon(prog, t) {
    const { ctx, w, h } = this;
    const z = this.cam.zoom;
    const horizon = (SEA_Y - this.cam.y * .12) * z + h / 2;
    if (horizon < h * .18 || horizon > h * 1.3) return;
    ctx.save();
    // distant haze
    const hz = ctx.createLinearGradient(0, horizon - 90, 0, horizon + 30);
    hz.addColorStop(0, 'rgba(180,190,170,0)');
    hz.addColorStop(.7, `rgba(210,190,155,${.13 * (1 - prog)})`);
    hz.addColorStop(1, 'rgba(230,196,150,0)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, horizon - 90, w, 120);
    // far islands
    const drift = -this.cam.x * .02;
    for (let i = 0; i < 3; i++) {
      const ix = w * (.18 + i * .33) + drift;
      const s = [1.4, .9, 1.1][i];
      const iy = horizon + 4;
      ctx.fillStyle = i === 1 ? 'rgba(43,62,58,.55)' : 'rgba(37,56,55,.68)';
      ctx.beginPath();
      ctx.moveTo(ix - 170 * s, iy);
      ctx.bezierCurveTo(ix - 120 * s, iy - 55 * s, ix - 60 * s, iy - 34 * s, ix - 20 * s, iy - 74 * s);
      ctx.bezierCurveTo(ix + 10 * s, iy - 100 * s, ix + 34 * s, iy - 38 * s, ix + 74 * s, iy - 53 * s);
      ctx.bezierCurveTo(ix + 120 * s, iy - 32 * s, ix + 150 * s, iy - 20 * s, ix + 190 * s, iy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── world layers ──────────────────────────────────────── */
  drawBackProps(t) {
    const { ctx, game } = this;
    const back = new Set(['hull', 'mast', 'sail', 'arch', 'skullgate', 'waterfall']);
    for (const p of game.level.props) {
      if (!back.has(p.type)) continue;
      drawProp(ctx, p, t, game);
    }
  }

  drawFrontProps(t) {
    const { ctx, game } = this;
    const back = new Set(['hull', 'mast', 'sail', 'arch', 'skullgate', 'waterfall']);
    for (const p of game.level.props) {
      if (back.has(p.type)) continue;
      drawProp(ctx, p, t, game);
    }
  }

  drawWater(t) {
    const { ctx } = this;
    if (this.cam.y > SEA_Y + 900) return;
    ctx.save();
    const left = -6000, right = 6000, top = SEA_Y;
    const g = ctx.createLinearGradient(0, top, 0, top + 1500);
    g.addColorStop(0, 'rgba(58,110,108,.8)');
    g.addColorStop(.12, 'rgba(32,82,88,.9)');
    g.addColorStop(.5, 'rgba(14,48,57,.95)');
    g.addColorStop(1, 'rgba(7,29,37,.98)');
    ctx.fillStyle = g;
    ctx.fillRect(left, top, right - left, 2600);

    // reflection of the low sun
    const z = this.cam.zoom;
    const sunWX = (this.w * .23 - this.w / 2) / z + this.cam.x;
    const refl = ctx.createLinearGradient(sunWX - 180, top, sunWX + 180, top);
    refl.addColorStop(0, 'rgba(255,190,110,0)');
    refl.addColorStop(.5, 'rgba(255,206,140,.2)');
    refl.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(sunWX - 180, top, 360, 220);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top - 80, right - left, 260);
    ctx.clip();
    for (let i = 0; i < 26; i++) {
      const yy = top + i * 8;
      const a = .03 + .028 * Math.sin(i * 1.7 + t * .8);
      ctx.strokeStyle = `rgba(190,226,213,${a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const off = Math.sin(t * .4 + i) * 40;
      ctx.moveTo(left, yy + Math.sin(i) * 2);
      for (let x = left; x <= right; x += 300) {
        ctx.quadraticCurveTo(x + 150, yy + Math.sin(x * .01 + t + i) * 3, x + 300, yy + Math.sin(x * .013 + t * .7) * 2);
      }
      ctx.stroke();
      void off;
    }
    // warm sun glitter
    for (let i = 0; i < 90; i++) {
      const gx = sunWX + (Math.sin(i * 12.9898) * .5) * (50 + i * 2.2);
      const gy = top + 4 + ((i * 47) % 190);
      const a = .05 + .12 * Math.sin(t * 2.2 + i * 1.3);
      ctx.fillStyle = `rgba(255,218,150,${Math.max(0, a)})`;
      ctx.fillRect(gx, gy, 2 + (i % 4), 1);
    }
    // cool sparkle elsewhere
    for (let i = 0; i < 30; i++) {
      const x = -1500 + ((i * 733) % 3000);
      const y = top + 6 + ((i * 91) % 120);
      const a = .07 + .07 * Math.sin(t * 2 + i);
      ctx.fillStyle = `rgba(240,228,180,${a})`;
      ctx.fillRect(x, y, 2, 1);
    }
    ctx.restore();
    // foam line
    ctx.strokeStyle = 'rgba(220,232,210,.28)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = left; x <= right; x += 100) {
      const y = top + Math.sin(x * .01 + t * 1.1) * 2.5;
      if (x === left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawCheckpoints(t) {
    const { ctx, game } = this;
    const cps = game.level.checkpoints;
    cps.forEach((cp, i) => {
      const reached = i <= game.checkpointIndex;
      const current = i === game.checkpointIndex;
      const x = cp.x, base = cp.footY ?? cp.y + 40;
      const h = 60;
      ctx.save();
      // footing shadow
      ctx.fillStyle = 'rgba(4,8,8,.25)';
      ctx.beginPath();
      ctx.ellipse(x, base + 1, 14, 4, 0, 0, TAU);
      ctx.fill();
      // post
      ctx.strokeStyle = reached ? '#5c4327' : '#3d3020';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x, base - h);
      ctx.stroke();
      // lantern top
      ctx.fillStyle = reached ? '#f0c568' : '#8c7448';
      ctx.beginPath();
      ctx.arc(x, base - h - 2, 3.4, 0, TAU);
      ctx.fill();
      if (reached) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, base - h - 2, 0, x, base - h - 2, 36);
        g.addColorStop(0, `rgba(255,206,112,${current ? .35 : .18})`);
        g.addColorStop(1, 'rgba(255,190,80,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, base - h - 2, 36, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // flag
      const wave = Math.sin(t * 3 + i * 1.7) * 2;
      ctx.fillStyle = reached ? (current ? '#e9b95a' : 'rgba(208,164,82,.7)') : 'rgba(90,84,68,.6)';
      ctx.beginPath();
      ctx.moveTo(x + 2, base - h + 4);
      ctx.quadraticCurveTo(x + 20, base - h + 6 + wave, x + 31, base - h + 10 + wave);
      ctx.lineTo(x + 28, base - h + 22);
      ctx.quadraticCurveTo(x + 18, base - h + 17 + wave, x + 2, base - h + 20);
      ctx.closePath();
      ctx.fill();
      if (reached) {
        ctx.fillStyle = 'rgba(38,26,10,.65)';
        ctx.beginPath();
        ctx.arc(x + 15, base - h + 12, 2.4, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  drawChest(t) {
    const { ctx, game } = this;
    drawChest(ctx, SUMMIT.x, SUMMIT.y + 52, t, game.chestOpen || 0, 1.25);
    // treasure shine
    if (game.chestOpen > .1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const R = 180 + Math.sin(t * 2) * 20;
      const g = ctx.createRadialGradient(SUMMIT.x, SUMMIT.y, 0, SUMMIT.x, SUMMIT.y, R);
      g.addColorStop(0, `rgba(255,220,140,${.16 * game.chestOpen})`);
      g.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(SUMMIT.x, SUMMIT.y, R, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawRopeAndPole(t) {
    const { ctx, game } = this;
    drawRope(ctx, game, t);
    drawPole(ctx, game, t);
  }

  drawPirateLayer(t) {
    const { ctx, game } = this;
    drawPirate(ctx, game, t);
    drawFlyingHook(ctx, game, t);
  }

  /* ── particles ─────────────────────────────────────────── */
  drawParticles(t) {
    const { ctx, game } = this;
    ctx.save();
    for (const q of game.particles) {
      const life = clamp(q.life / (q.max || 1), 0, 1);
      ctx.globalAlpha = q.type === 'gold' ? Math.min(1, life * 1.6) : Math.min(.85, life * 1.5);
      if (q.type === 'gold') {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot || 0);
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, q.size * 1.6, q.size * .6, 0, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha *= .4;
        ctx.beginPath();
        ctx.arc(0, 0, q.size * 2.4, 0, TAU);
        ctx.fillStyle = 'rgba(255,205,100,.4)';
        ctx.fill();
        ctx.restore();
      } else if (q.type === 'spark') {
        ctx.fillStyle = q.color;
        const a = Math.atan2(q.vy, q.vx);
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(a);
        ctx.fillRect(-q.size * 2, -q.size * .35, q.size * 3.4, q.size * .7);
        ctx.restore();
      } else {
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (q.type === 'splash' ? 1.2 : 1), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawMotes(t) {
    const { ctx, game } = this;
    const cam = this.cam;
    const z = cam.zoom;
    const vw = this.w / z, vh = this.h / z;
    const l = cam.x - vw / 2, r = cam.x + vw / 2, tp = cam.y - vh / 2, bt = cam.y + vh / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      if (m.x < l - 40 || m.x > r + 40 || m.y < tp - 40 || m.y > bt + 40) continue;
      const zone = game.level.zoneAt(m.y);
      let color, a;
      if (zone.id === 'jungle') { color = '190,235,120'; a = .5; }
      else if (zone.id === 'summit') { color = '255,215,120'; a = .55; }
      else if (zone.id === 'ruins') { color = '215,205,175'; a = .28; }
      else if (zone.id === 'wreck') { color = '240,190,120'; a = .3; }
      else { color = '235,235,215'; a = .28; }
      const wob = Math.sin(t * m.sp + m.ph) * 14;
      const wob2 = Math.cos(t * m.sp * .7 + m.ph) * 10;
      const x = m.x + wob, y = m.y + wob2;
      const alpha = a * (.55 + .45 * Math.sin(t * 2.2 + m.ph));
      const g = ctx.createRadialGradient(x, y, 0, x, y, m.s * 5);
      g.addColorStop(0, `rgba(${color},${alpha})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, m.s * 5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── screen space ──────────────────────────────────────── */
  drawScreenEffects(t) {
    const { ctx, w, h, game } = this;

    if (game.splashFlash > 0) {
      const a = game.splashFlash;
      const g = ctx.createRadialGradient(w / 2, h * .7, 20, w / 2, h * .7, h);
      g.addColorStop(0, `rgba(170,225,215,${.28 * a})`);
      g.addColorStop(1, `rgba(40,95,105,${.55 * a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    if (game.mode === 'ending') {
      const a = clamp(game.endTimer / 2.6, 0, 1) * .4;
      const g = ctx.createRadialGradient(w / 2, h * .55, 20, w / 2, h * .55, h * .8);
      g.addColorStop(0, `rgba(255,220,140,${a * .3})`);
      g.addColorStop(1, `rgba(90,55,15,${a * .35})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // subtle top and bottom letterbox shading
    const topG = ctx.createLinearGradient(0, 0, 0, 110);
    topG.addColorStop(0, 'rgba(3,9,10,.36)');
    topG.addColorStop(1, 'rgba(3,9,10,0)');
    ctx.fillStyle = topG;
    ctx.fillRect(0, 0, w, 110);
    const botG = ctx.createLinearGradient(0, h - 150, 0, h);
    botG.addColorStop(0, 'rgba(3,9,10,0)');
    botG.addColorStop(1, 'rgba(3,9,10,.42)');
    ctx.fillStyle = botG;
    ctx.fillRect(0, h - 150, w, 150);

    // warm/cool grade
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const grade = ctx.createLinearGradient(0, 0, 0, h);
    const prog = game.progress ? game.progress() : 0;
    grade.addColorStop(0, `rgba(${prog > .5 ? '70,110,160' : '80,150,150'},.12)`);
    grade.addColorStop(1, 'rgba(210,150,80,.12)');
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    void t;
  }

  drawCursor(t) {
    const { ctx, game } = this;
    if (game.mode !== 'playing') return;
    const x = game.mouse.x, y = game.mouse.y;
    const grip = game.grip;
    const attached = game.hook.state === 'attached';
    const col = attached ? 'rgba(255,216,130,.9)' : 'rgba(235,214,176,.75)';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * .5);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, grip ? 7 : 9, .3, 1.1);
    ctx.arc(0, 0, grip ? 7 : 9, 1.8, 2.6);
    ctx.arc(0, 0, grip ? 7 : 9, 3.3, 4.1);
    ctx.arc(0, 0, grip ? 7 : 9, 4.8, 5.6);
    ctx.stroke();
    ctx.rotate(-t * .5);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, grip ? 2.2 : 1.3, 0, TAU);
    ctx.fill();
    if (attached) {
      ctx.strokeStyle = 'rgba(255,210,120,.28)';
      ctx.beginPath();
      ctx.arc(0, 0, 15 + Math.sin(t * 4) * 2, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    // faint pole reach marker
    const pole = game.pole;
    if (pole) {
      const tip = game.poleTip();
      const sx = (tip.x - this.cam.x) * this.cam.zoom + this.w / 2 + this.cam.shakeX;
      const sy = (tip.y - this.cam.y) * this.cam.zoom + this.h / 2 + this.cam.shakeY;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = 'rgba(230,190,110,.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-3, -3, 6, 6);
      ctx.restore();
    }
  }

  drawDebug() {
    const g = this.game;
    if (!g.debug) return;
    const { ctx } = this;
    const p = g.player.position;
    const lines = [
      `mode ${g.mode}  alt ${g.altitude()}m  prog ${(g.progress() * 100).toFixed(1)}%`,
      `player ${p.x.toFixed(0)}, ${p.y.toFixed(0)}  v ${g.player.velocity.x.toFixed(2)}, ${g.player.velocity.y.toFixed(2)}`,
      `pole a ${g.pole.angle.toFixed(2)} av ${g.pole.angularVelocity.toFixed(4)} tq ${(g.pole.torque || 0).toFixed(2)}`,
      `hook ${g.hook.state} len ${g.hook.ropeLen.toFixed(0)}  cam ${this.cam.zoom.toFixed(2)}`,
      `cp ${g.checkpointIndex}  falls ${g.stats.falls}`,
    ];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(12, 86, 330, 96);
    ctx.fillStyle = '#b9e6c8';
    ctx.font = '11px monospace';
    lines.forEach((l, i) => ctx.fillText(l, 22, 104 + i * 16));
    ctx.restore();
  }
}
