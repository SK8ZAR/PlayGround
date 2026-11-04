/* ══════════════════════════════════════════════════════════════
   PROPS — palms, wrecks, ruins, torches and the hoard
   ══════════════════════════════════════════════════════════════ */

import {
  TAU, clamp, lerp, hashStr, mulberry32, rr, ellipse, poly, blob, shadowBlob,
} from './paint.js';

function glow(ctx, x, y, r, color, alpha = .5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', String(alpha)));
  g.addColorStop(.4, color.replace('A', String(alpha * .45)));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export function drawProp(ctx, prop, time, game) {
  ctx.save();
  const s = prop.s || 1;
  ctx.translate(prop.x, prop.y);
  if (prop.tilt) ctx.rotate(prop.tilt);
  ctx.scale(prop.flip ? -s : s, s);
  const rand = mulberry32(hashStr(prop.type + prop.x + prop.y));
  switch (prop.type) {
    case 'palm': palm(ctx, time, rand, prop); break;
    case 'fern': fern(ctx, time, rand); break;
    case 'sign': sign(ctx, time); break;
    case 'skeleton': skeleton(ctx, rand); break;
    case 'barrel': barrel(ctx, rand); break;
    case 'crate': crate(ctx, rand); break;
    case 'driftwood': driftwood(ctx, rand); break;
    case 'seagull': seagull(ctx, time, rand); break;
    case 'hull': hull(ctx, time, rand); break;
    case 'mast': brokenMast(ctx, time, rand); break;
    case 'sail': sail(ctx, time, rand); break;
    case 'lantern': lantern(ctx, time); break;
    case 'ropehang': ropeHang(ctx, time, rand); break;
    case 'waterfall': waterfall(ctx, time, rand); break;
    case 'vine': vine(ctx, time, rand); break;
    case 'skull': skull(ctx, rand); break;
    case 'torch': torch(ctx, time); break;
    case 'column': column(ctx, rand, prop.broken); break;
    case 'arch': arch(ctx, rand); break;
    case 'statue': statue(ctx, rand); break;
    case 'skullgate': skullGate(ctx, time); break;
    case 'goldpile': goldPile(ctx, time, rand); break;
    case 'bones': bones(ctx, rand); break;
    default: break;
  }
  ctx.restore();
}

/* ── jungle ─────────────────────────────────────────────── */
function palm(ctx, time, rand) {
  const h = 130 + rand() * 70;
  const sway = Math.sin(time * .7 + rand() * 9) * 3;
  shadowBlob(ctx, 4, 3, 42, 10, .28);
  // base rocks
  ctx.fillStyle = '#3c3a2b';
  blob(ctx, 0, 0, 24, 8, rand, 7, .2); ctx.fill();
  // trunk
  ctx.strokeStyle = '#5e4428';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(2, -h * .35, 12, -h * .7, 8 + sway, -h);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(176,134,82,.4)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-2, -6);
  ctx.bezierCurveTo(0, -h * .35, 10, -h * .7, 6 + sway, -h);
  ctx.stroke();
  // trunk rings
  ctx.strokeStyle = 'rgba(48,31,16,.55)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const x = lerp(0, 8 + sway, t) + Math.sin(t * 3) * 5;
    const y = -h * t;
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.quadraticCurveTo(x, y + 2, x + 4, y);
    ctx.stroke();
  }
  // fronds
  const topX = 8 + sway, topY = -h;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * .95 + (i / (n - 1)) * Math.PI * 1.9 + Math.sin(time * .8 + i) * .04;
    const len = 46 + (i % 3) * 14;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * .55 + 12;
    const mx = topX + Math.cos(a) * len * .55;
    const my = topY + Math.sin(a) * len * .55 - 10;
    const px = -Math.sin(a) * 9, py = Math.cos(a) * 4;
    ctx.fillStyle = i % 3 === 0 ? '#496b37' : i % 3 === 1 ? '#3d5c2e' : '#557a3e';
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx + px, my + py, ex, ey);
    ctx.quadraticCurveTo(mx - px, my - py, topX, topY);
    ctx.fill();
    ctx.strokeStyle = 'rgba(24,38,18,.5)';
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    // leaf notches
    for (let j = 1; j < 5; j++) {
      const t = j / 5;
      const lx = lerp(topX, ex, t) + Math.cos(a + 1.57) * 4;
      const ly = lerp(topY, ey, t) + Math.sin(a + 1.57) * 4;
      ctx.beginPath();
      ctx.moveTo(lx, ly - 2);
      ctx.lineTo(lx + Math.cos(a + 1.2) * 9, ly + Math.sin(a + 1.2) * 9 + 2);
      ctx.stroke();
    }
  }
  // coconuts
  ctx.fillStyle = '#4a3520';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(topX + (rand() - .5) * 10, topY + 4 + (rand() - .5) * 6, 3.2, 0, TAU);
    ctx.fill();
  }
}

function fern(ctx, time, rand) {
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * .9 + (i / (n - 1)) * Math.PI * 1.8;
    const len = 26 + rand() * 26;
    const sway = Math.sin(time * 1.1 + i) * 2;
    const ex = Math.cos(a) * len + sway, ey = Math.sin(a) * len * .5 - len * .4;
    ctx.strokeStyle = '#4b6b39';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * len * .5, -len * .55, ex, ey);
    ctx.stroke();
    for (let j = 1; j < 6; j++) {
      const t = j / 6;
      const x = lerp(0, ex, t), y = lerp(0, ey, t);
      ctx.strokeStyle = j % 2 ? '#5f8345' : '#426132';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a + 1.2) * 7, y + Math.sin(a + 1.2) * 7 - 2);
      ctx.stroke();
    }
  }
}

function vine(ctx, time, rand) {
  const len = 120 + rand() * 180;
  const x0 = 0;
  ctx.strokeStyle = 'rgba(53,76,42,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, 0);
  ctx.bezierCurveTo(12, len * .3, -10, len * .65, 4, len);
  ctx.stroke();
  const n = Math.floor(len / 18);
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n;
    const x = x0 + Math.sin(t * 5 + rand()) * 7;
    const y = len * t;
    const side = i % 2 ? 1 : -1;
    const sway = Math.sin(time * .9 + i) * 1.4;
    ctx.fillStyle = i % 3 === 0 ? '#557a40' : '#436331';
    ctx.beginPath();
    ctx.ellipse(x + side * 5 + sway, y, 4.5, 2.2, side * .5, 0, TAU);
    ctx.fill();
  }
}

function waterfall(ctx, time, rand) {
  const h = 260;
  const w = 34;
  ctx.save();
  // rock lip
  ctx.fillStyle = '#414438';
  blob(ctx, 0, 0, 34, 12, rand, 7, .2); ctx.fill();
  // fall
  for (let i = 0; i < 8; i++) {
    const x = -w / 2 + (i / 7) * w;
    const phase = (time * .8 + i * .13) % 1;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(198,227,214,.06)');
    g.addColorStop(.4, `rgba(190,224,212,${.18 + .1 * Math.sin(time * 2 + i)})`);
    g.addColorStop(1, 'rgba(160,205,196,.02)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 4, h * .3, x - 5 + Math.sin(time + i) * 2, h * .7, x + 2, h);
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,240,232,.22)';
    ctx.beginPath();
    ctx.arc(x + Math.sin(i * 4) * 4, h * phase, 1.6, 0, TAU);
    ctx.fill();
  }
  // mist
  glow(ctx, 0, h - 10, 40, 'rgba(180,220,210,A)', .12);
  ctx.restore();
}

/* ── beach ──────────────────────────────────────────────── */
function sign(ctx, time) {
  shadowBlob(ctx, 0, 2, 24, 5, .25);
  ctx.fillStyle = '#4b3520';
  ctx.fillRect(-2.5, -46, 5, 48);
  ctx.save();
  ctx.translate(0, -40);
  ctx.rotate(Math.sin(time * .4) * .012 - .03);
  ctx.fillStyle = '#6b4a29';
  rr(ctx, -34, -16, 68, 30, 2); ctx.fill();
  ctx.strokeStyle = '#3d2a16'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#d4b378';
  ctx.font = "12px 'Pirata One', serif";
  ctx.textAlign = 'center';
  ctx.fillText('THE HOARD', 0, -3);
  ctx.font = "9px 'IM Fell English', serif";
  ctx.fillText('↑ that way ↑', 0, 9);
  ctx.fillStyle = 'rgba(30,20,10,.6)';
  ctx.beginPath(); ctx.arc(-28, -12, 1.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(28, -12, 1.4, 0, TAU); ctx.fill();
  ctx.restore();
}

function skeleton(ctx, rand) {
  shadowBlob(ctx, 0, 1, 30, 6, .25);
  ctx.save();
  ctx.rotate(-.25);
  ctx.strokeStyle = '#d8cba6';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  // ribs
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(0, -6 + i * 2, 9 + i * 2, .3, Math.PI - .3);
    ctx.stroke();
  }
  // spine
  ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(12, -4); ctx.stroke();
  // arm
  ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-18, -18, -26, -12); ctx.stroke();
  // skull
  ctx.fillStyle = '#e3d6b0';
  ctx.beginPath(); ctx.ellipse(17, -6, 7, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a2418';
  ctx.beginPath(); ctx.arc(19, -8, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(14, -8, 1.8, 0, TAU); ctx.fill();
  // hat
  ctx.fillStyle = '#3c3428';
  ctx.beginPath(); ctx.ellipse(17, -13, 11, 3, -.1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(17, -16, 6, 4, -.1, 0, TAU); ctx.fill();
  // bottle
  ctx.fillStyle = 'rgba(88,120,98,.65)';
  ctx.fillRect(-32, -10, 4, 10);
  ctx.fillRect(-31, -14, 2, 5);
  ctx.restore();
}

function barrel(ctx, rand) {
  shadowBlob(ctx, 0, 1, 18, 4, .28);
  const g = ctx.createLinearGradient(-16, 0, 16, 0);
  g.addColorStop(0, '#4a301a');
  g.addColorStop(.45, '#8d602f');
  g.addColorStop(1, '#3f2916');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.bezierCurveTo(-19, -14, -15, -28, -13, -32);
  ctx.lineTo(13, -32);
  ctx.bezierCurveTo(15, -28, 19, -14, 15, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2b1b0d'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(35,35,32,.85)';
  ctx.lineWidth = 2.6;
  for (const y of [-7, -25]) {
    ctx.beginPath();
    ctx.moveTo(-17, y); ctx.quadraticCurveTo(0, y + 1, 17, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(166,130,80,.25)';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5, -1);
    ctx.lineTo(i * 4, -31);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a2715';
  ctx.beginPath(); ctx.ellipse(0, -32, 13, 3.4, 0, 0, TAU); ctx.fill();
}

function crate(ctx, rand) {
  shadowBlob(ctx, 0, 1, 19, 4, .28);
  const g = ctx.createLinearGradient(-17, -34, 17, 0);
  g.addColorStop(0, '#8b6136');
  g.addColorStop(1, '#5a3c20');
  ctx.fillStyle = g;
  ctx.fillRect(-17, -32, 34, 32);
  ctx.strokeStyle = '#392512'; ctx.lineWidth = 1.6; ctx.strokeRect(-17, -32, 34, 32);
  ctx.strokeStyle = 'rgba(60,40,20,.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-17, -32); ctx.lineTo(17, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(17, -32); ctx.lineTo(-17, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(196,158,104,.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-15, -30); ctx.lineTo(-15, -2); ctx.stroke();
}

function driftwood(ctx, rand) {
  ctx.save();
  ctx.rotate(-.08);
  ctx.fillStyle = '#6a5338';
  ctx.beginPath();
  ctx.moveTo(-50, 0);
  ctx.bezierCurveTo(-30, -10, 30, -12, 55, -2);
  ctx.lineTo(52, 6);
  ctx.bezierCurveTo(20, -3, -20, 4, -52, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,28,16,.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-40 + i * 20, -1 - i);
    ctx.lineTo(-20 + i * 20, 3 - i);
    ctx.stroke();
  }
  ctx.restore();
}

function seagull(ctx, time, rand) {
  const flap = Math.sin(time * 4 + rand() * 9);
  ctx.strokeStyle = 'rgba(238,232,210,.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(-3, -4 - flap * 4, 0, 0);
  ctx.quadraticCurveTo(3, -4 - flap * 4, 7, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(238,232,210,.85)';
  ctx.beginPath(); ctx.ellipse(0, .5, 2, 1, 0, 0, TAU); ctx.fill();
}

/* ── wreck ──────────────────────────────────────────────── */
function hull(ctx, time, rand) {
  ctx.save();
  ctx.rotate(-.16);
  const g = ctx.createLinearGradient(0, -140, 0, 220);
  g.addColorStop(0, '#3c2a1b');
  g.addColorStop(.55, '#2c1f14');
  g.addColorStop(1, '#1c1510');
  // hull body
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-250, -80);
  ctx.bezierCurveTo(-120, -130, 110, -110, 240, -40);
  ctx.bezierCurveTo(280, 60, 240, 180, 160, 230);
  ctx.lineTo(-180, 210);
  ctx.bezierCurveTo(-270, 130, -290, 20, -250, -80);
  ctx.closePath();
  ctx.fill();
  // planks
  ctx.strokeStyle = 'rgba(120,88,52,.2)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = -70 + i * 32;
    ctx.beginPath();
    ctx.moveTo(-265, y);
    ctx.bezierCurveTo(-80, y + 14, 120, y + 8, 260, y - 10);
    ctx.stroke();
  }
  // ribs
  ctx.strokeStyle = 'rgba(14,10,7,.7)';
  ctx.lineWidth = 7;
  for (let i = -6; i <= 6; i++) {
    const x = i * 36;
    ctx.beginPath();
    ctx.moveTo(x, -100);
    ctx.quadraticCurveTo(x + i * 3, 40, x + i * 10, 222);
    ctx.stroke();
  }
  // broken side opening
  ctx.fillStyle = 'rgba(6,9,9,.82)';
  ctx.beginPath();
  ctx.moveTo(30, -90);
  ctx.bezierCurveTo(105, -75, 150, -20, 140, 60);
  ctx.bezierCurveTo(100, 90, 40, 80, 10, 30);
  ctx.closePath();
  ctx.fill();
  // rib tips
  ctx.strokeStyle = '#5a4128';
  ctx.lineWidth = 5;
  for (let i = 0; i < 7; i++) {
    const x = -220 + i * 70;
    ctx.beginPath();
    ctx.moveTo(x, -95);
    ctx.quadraticCurveTo(x + 12, -150 - (i % 3) * 18, x + 26, -168 - (i % 3) * 22);
    ctx.stroke();
  }
  // seaweed
  ctx.strokeStyle = 'rgba(57,83,48,.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const x = -230 + rand() * 470;
    const y = 190 + rand() * 40;
    const sw = Math.sin(time * .8 + i) * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + sw, y + 30, x - sw, y + 60, x + 4, y + 90);
    ctx.stroke();
  }
  ctx.restore();
  // tattered sail remnants
  ctx.save();
  ctx.globalAlpha = .5;
  ctx.fillStyle = '#9d8a69';
  ctx.beginPath();
  ctx.moveTo(-40, -120);
  ctx.quadraticCurveTo(-10, -60, -60, 10);
  ctx.quadraticCurveTo(-100, -40, -130, -100);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#14201c';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(-60 + i * 12, -80 + i * 18, 8, 4, .4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function brokenMast(ctx, time, rand) {
  ctx.save();
  ctx.rotate(.22);
  ctx.fillStyle = '#3c2a19';
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-7, -300);
  ctx.lineTo(3, -306);
  ctx.lineTo(9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(155,118,74,.25)'; ctx.lineWidth = 1.6;
  for (let i = 1; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(-9, -i * 40);
    ctx.lineTo(-2, -i * 40 + 1);
    ctx.stroke();
  }
  // yardarm
  ctx.strokeStyle = '#332415'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-92, -238); ctx.lineTo(100, -256); ctx.stroke();
  // rigging
  ctx.strokeStyle = 'rgba(190,168,124,.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-90, -240); ctx.lineTo(-30, -10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(98, -258); ctx.lineTo(30, -10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-88, -240); ctx.lineTo(-48, -150); ctx.stroke();
  ctx.restore();
}

function sail(ctx, time, rand) {
  ctx.save();
  const w = 150, h = 120;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(185,166,128,.62)');
  g.addColorStop(1, 'rgba(120,105,80,.35)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.bezierCurveTo(-w / 2 + 20, h * .4, -w / 2 + 10, h * .8, -w / 2 + 34 + Math.sin(time) * 4, h);
  ctx.lineTo(w / 2 - 20, h - 16);
  ctx.bezierCurveTo(w / 2 - 10, h * .6, w / 2 + 8, h * .2, w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(22,30,25,.9)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse((rand() - .5) * w * .7, h * (.25 + rand() * .6), 5 + rand() * 8, 2 + rand() * 4, rand(), 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(70,56,38,.5)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-w / 2, 2); ctx.lineTo(w / 2, 2); ctx.stroke();
  ctx.restore();
}

function lantern(ctx, time) {
  ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke();
  ctx.fillStyle = '#2d2113';
  ctx.fillRect(-5, -7, 10, 8);
  ctx.fillStyle = 'rgba(255,181,91,.9)';
  ctx.fillRect(-4, -19, 8, 11);
  ctx.strokeStyle = '#241a0f'; ctx.lineWidth = 1.4;
  ctx.strokeRect(-5.5, -20, 11, 13);
  ctx.strokeStyle = '#3a2a18';
  ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(0, -26); ctx.lineTo(6, -20); ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, -14, 34, 'rgba(255,170,80,A)', .24 + Math.sin(time * 5) * .04);
  ctx.restore();
}

function ropeHang(ctx, time, rand) {
  const len = 170;
  ctx.strokeStyle = 'rgba(160,136,94,.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(10, len * .3, -8, len * .7, 2, len);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(70,55,34,.8)'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(0 + Math.sin(i) * 2, 20 + i * 32, 3, 0, TAU);
    ctx.stroke();
  }
  // anchor
  ctx.save();
  ctx.translate(2, len + 8);
  ctx.strokeStyle = '#47504e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 14); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 14, 10, .2, Math.PI - .2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(0, -11); ctx.lineTo(6, -4); ctx.stroke();
  ctx.restore();
}

/* ── ruins ──────────────────────────────────────────────── */
function torch(ctx, time) {
  ctx.fillStyle = '#3b2a17';
  ctx.fillRect(-2.5, -46, 5, 48);
  ctx.fillStyle = '#5b4326';
  ctx.fillRect(-4, -48, 8, 6);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const flick = Math.sin(time * 9) * .12 + Math.sin(time * 13.7) * .08;
  glow(ctx, 0, -56, 46, 'rgba(255,166,70,A)', .26 + flick);
  glow(ctx, 0, -54, 14, 'rgba(255,235,170,A)', .5 + flick);
  ctx.restore();
  // flame
  const f = Math.sin(time * 7) * 2;
  ctx.fillStyle = 'rgba(255,186,84,.9)';
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(8, -58, 7, -70 + f, 2, -78 - f);
  ctx.bezierCurveTo(-2, -70 - f, -8, -60, 0, -48);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,192,.9)';
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.bezierCurveTo(3, -58, 2, -64, 0, -68 + f * .5);
  ctx.bezierCurveTo(-2, -62, -3, -56, 0, -50);
  ctx.fill();
}

function column(ctx, rand, broken = .5) {
  const h = 90 + rand() * 60;
  shadowBlob(ctx, 2, 2, 26, 5, .25);
  // base
  ctx.fillStyle = '#5c5a4e';
  ctx.fillRect(-18, -8, 36, 8);
  ctx.fillStyle = '#7f7c6b';
  ctx.fillRect(-14, -12, 28, 5);
  // shaft
  const g = ctx.createLinearGradient(-12, 0, 12, 0);
  g.addColorStop(0, '#46443a');
  g.addColorStop(.4, '#8b8978');
  g.addColorStop(1, '#4e4c41');
  ctx.fillStyle = g;
  ctx.fillRect(-11, -h, 22, h - 12);
  // flutes
  ctx.strokeStyle = 'rgba(40,38,32,.4)'; ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(i * 4, -h); ctx.lineTo(i * 4, -10); ctx.stroke();
  }
  // broken top
  if (broken > .3) {
    ctx.fillStyle = '#292720';
    ctx.beginPath();
    ctx.moveTo(-11, -h);
    ctx.lineTo(-4, -h + 8 + broken * 10);
    ctx.lineTo(2, -h + 2);
    ctx.lineTo(8, -h + 12);
    ctx.lineTo(11, -h);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#8d8a78';
    ctx.fillRect(-14, -h - 6, 28, 7);
  }
  // moss
  ctx.fillStyle = 'rgba(91,116,68,.35)';
  ctx.fillRect(-11, -h + 20, 22, 12);
}

function arch(ctx, rand) {
  ctx.save();
  // pillars
  for (const side of [-1, 1]) {
    const x = side * 94;
    const g = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
    g.addColorStop(0, '#3d3b32');
    g.addColorStop(.45, '#777566');
    g.addColorStop(1, '#413f36');
    ctx.fillStyle = g;
    ctx.fillRect(x - 20, -150, 40, 150);
    ctx.strokeStyle = 'rgba(30,29,24,.5)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(x - 20, -150 + i * 30); ctx.lineTo(x + 20, -150 + i * 30); ctx.stroke();
    }
    ctx.fillStyle = '#4f4d42';
    ctx.fillRect(x - 25, -12, 50, 12);
  }
  // arch
  ctx.strokeStyle = '#6e6c5d';
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.arc(0, -150, 94, Math.PI + .18, -.18);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(34,32,27,.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -150, 111, Math.PI + .18, -.18);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -150, 77, Math.PI + .18, -.18);
  ctx.stroke();
  // keystone
  ctx.fillStyle = '#918e7c';
  ctx.beginPath();
  ctx.moveTo(-10, -258); ctx.lineTo(10, -258); ctx.lineTo(7, -240); ctx.lineTo(-7, -240);
  ctx.closePath(); ctx.fill();
  // hanging vines
  ctx.strokeStyle = 'rgba(70,92,55,.7)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const x = -70 + i * 35;
    const len = 20 + rand() * 50;
    ctx.beginPath(); ctx.moveTo(x, -238); ctx.quadraticCurveTo(x + 6, -238 + len * .5, x + 2, -238 + len); ctx.stroke();
  }
  ctx.restore();
}

function statue(ctx, rand) {
  shadowBlob(ctx, 0, 2, 30, 6, .28);
  ctx.fillStyle = '#5c5a4e';
  ctx.fillRect(-26, -14, 52, 14);
  const g = ctx.createLinearGradient(-20, 0, 20, 0);
  g.addColorStop(0, '#45443a'); g.addColorStop(.45, '#898674'); g.addColorStop(1, '#4a483d');
  ctx.fillStyle = g;
  // coat body
  ctx.beginPath();
  ctx.moveTo(-16, -14);
  ctx.lineTo(-18, -74);
  ctx.quadraticCurveTo(0, -86, 18, -74);
  ctx.lineTo(16, -14);
  ctx.closePath();
  ctx.fill();
  // head
  ctx.beginPath(); ctx.arc(0, -92, 12, 0, TAU); ctx.fill();
  // tricorn
  ctx.beginPath();
  ctx.moveTo(-22, -98); ctx.quadraticCurveTo(0, -116, 22, -98);
  ctx.quadraticCurveTo(0, -104, -22, -98);
  ctx.fill();
  // arm + cutlass
  ctx.strokeStyle = '#6f6c5c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(12, -65); ctx.quadraticCurveTo(30, -55, 36, -36); ctx.stroke();
  ctx.strokeStyle = '#85826f'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(36, -36); ctx.lineTo(48, -8); ctx.stroke();
  // weathering
  ctx.strokeStyle = 'rgba(40,40,32,.4)'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-12 + i * 8, -70 + rand() * 20);
    ctx.lineTo(-16 + i * 9, -30 + rand() * 10);
    ctx.stroke();
  }
  // moss
  ctx.fillStyle = 'rgba(91,116,68,.4)';
  ctx.fillRect(-18, -74, 10, 20);
}

function skullGate(ctx, time) {
  ctx.save();
  // giant skull carved into the rock
  const g = ctx.createRadialGradient(0, -150, 30, 0, -150, 280);
  g.addColorStop(0, '#4a4639');
  g.addColorStop(.65, '#34322a');
  g.addColorStop(1, 'rgba(30,29,24,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -160, 260, 210, 0, 0, TAU);
  ctx.fill();
  // bone color
  ctx.fillStyle = '#5b5748';
  ctx.beginPath();
  ctx.ellipse(0, -175, 150, 135, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#6c6754';
  ctx.beginPath();
  ctx.ellipse(0, -210, 115, 92, 0, 0, TAU);
  ctx.fill();
  // eye sockets
  for (const side of [-1, 1]) {
    const ex = side * 52, ey = -214;
    const eg = ctx.createRadialGradient(ex, ey, 2, ex, ey, 46);
    eg.addColorStop(0, 'rgba(255,206,96,.45)');
    eg.addColorStop(.55, 'rgba(18,16,12,.95)');
    eg.addColorStop(1, '#151410');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 40, 35, side * .12, 0, TAU);
    ctx.fill();
    // inner glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, ex, ey, 40, 'rgba(255,180,60,A)', .24 + Math.sin(time * 2 + side) * .06);
    ctx.restore();
  }
  // nose
  ctx.fillStyle = '#24221b';
  ctx.beginPath();
  ctx.moveTo(0, -160); ctx.lineTo(18, -126); ctx.lineTo(-18, -126); ctx.closePath();
  ctx.fill();
  // teeth
  ctx.fillStyle = '#7a7460';
  for (let i = -4; i <= 4; i++) {
    const x = i * 22;
    ctx.fillRect(x - 8, -100, 16, 26 - Math.abs(i) * 2);
  }
  ctx.fillStyle = '#1b1913';
  ctx.fillRect(-98, -88, 196, 14);
  // vines
  ctx.strokeStyle = 'rgba(80,105,62,.6)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const x = -160 + i * 64;
    const len = 50 + (i % 3) * 40;
    ctx.beginPath();
    ctx.moveTo(x, -300);
    ctx.bezierCurveTo(x + 14, -300 + len * .4, x - 10, -300 + len * .8, x + 4, -300 + len);
    ctx.stroke();
  }
  ctx.restore();
}

function goldPile(ctx, time, rand) {
  shadowBlob(ctx, 0, 1, 26, 5, .2);
  ctx.fillStyle = '#6b4d1b';
  blob(ctx, 0, -6, 28, 12, rand, 8, .2); ctx.fill();
  const g = ctx.createRadialGradient(-6, -16, 2, 0, -8, 30);
  g.addColorStop(0, '#ffe9a8');
  g.addColorStop(.4, '#e8bb56');
  g.addColorStop(1, '#8b6321');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -8, 24, 13, 0, Math.PI, 0);
  ctx.fill();
  // coins
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI, r = rand() * 23;
    const x = Math.cos(Math.PI + a) * r, y = -4 - Math.sin(a) * r * .5;
    ctx.fillStyle = i % 3 ? '#d9a844' : '#f3d17a';
    ctx.beginPath(); ctx.ellipse(x, y, 2.5, 1.3, rand(), 0, TAU); ctx.fill();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, -12, 34, 'rgba(255,206,96,A)', .1 + Math.sin(time * 3) * .03);
  ctx.restore();
}

function bones(ctx, rand) {
  ctx.strokeStyle = '#cfc19c'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x = -12 + i * 8, y = -2 - (i % 2) * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10, y - 3);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 1, y, 1.6, 0, TAU); ctx.stroke();
  }
  ctx.fillStyle = '#d8cba6';
  ctx.beginPath(); ctx.ellipse(14, -6, 5.5, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a2418';
  ctx.beginPath(); ctx.arc(15, -7, 1.2, 0, TAU); ctx.fill();
}

function skull(ctx, rand) {
  ctx.save();
  ctx.fillStyle = '#cfc3a0';
  ctx.beginPath();
  ctx.ellipse(0, -10, 13, 12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#201d15';
  ctx.beginPath(); ctx.ellipse(-5, -12, 3.2, 3.8, .2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, -12, 3.2, 3.8, -.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#a89c7c';
  ctx.beginPath();
  ctx.moveTo(-7, -3); ctx.lineTo(7, -3); ctx.lineTo(4, 3); ctx.lineTo(-4, 3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d8cba6'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(-19, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, 2); ctx.lineTo(19, 8); ctx.stroke();
  ctx.restore();
}

/* ── treasure ───────────────────────────────────────────── */
export function drawChest(ctx, x, y, time, open, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  shadowBlob(ctx, 0, 3, 52, 10, .35);
  // glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, -30, 110, 'rgba(255,190,70,A)', .12 + open * .28);
  ctx.restore();
  const bodyG = ctx.createLinearGradient(0, -34, 0, 4);
  bodyG.addColorStop(0, '#8a5a26');
  bodyG.addColorStop(1, '#4c2d10');
  ctx.fillStyle = bodyG;
  rr(ctx, -44, -34, 88, 38, 3); ctx.fill();
  ctx.strokeStyle = '#2a1707'; ctx.lineWidth = 2.4; ctx.stroke();
  // bands
  ctx.fillStyle = '#c79b45';
  for (const bx of [-26, 26]) ctx.fillRect(bx - 3, -34, 6, 38);
  ctx.fillStyle = '#e3ba62';
  // lid
  ctx.save();
  ctx.translate(0, -34);
  ctx.rotate(-open * 1.12);
  const lidG = ctx.createLinearGradient(0, -26, 0, 0);
  lidG.addColorStop(0, '#a06c2e');
  lidG.addColorStop(1, '#6d4519');
  ctx.fillStyle = lidG;
  ctx.beginPath();
  ctx.moveTo(-44, 0);
  ctx.quadraticCurveTo(-44, -28, -22, -30);
  ctx.lineTo(22, -30);
  ctx.quadraticCurveTo(44, -28, 44, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a1707'; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.fillStyle = '#c79b45';
  for (const bx of [-26, 26]) ctx.fillRect(bx - 3, -28, 6, 28);
  ctx.restore();
  // gold interior
  if (open > .05) {
    ctx.fillStyle = 'rgba(255,224,140,.9)';
    ctx.fillRect(-40, -36, 80, 6 + open * 6);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.ellipse(0, -34, 36, 6, 0, 0, TAU); ctx.fill();
  }
  // lock
  ctx.fillStyle = '#e6c168';
  rr(ctx, -8, -30, 16, 16, 2); ctx.fill();
  ctx.fillStyle = '#3a2509';
  ctx.beginPath(); ctx.arc(0, -23, 2.6, 0, TAU); ctx.fill();
  ctx.fillRect(-1, -23, 2, 6);
  // gold spilling
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI * .9 + (i / 11) * Math.PI * .8;
    ctx.fillStyle = i % 2 ? '#f3d17a' : '#d9a844';
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 48, -4 + Math.sin(a) * 6, 3.2, 1.8, a, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
