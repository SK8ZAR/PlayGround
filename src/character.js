/* ══════════════════════════════════════════════════════════════
   CHARACTER — the barrel, the beard, the pole and the hook
   ══════════════════════════════════════════════════════════════ */

import { TAU, clamp, lerp, rr, ellipse } from './paint.js';

export function drawPole(ctx, game, time) {
  const p = game.pole;
  if (!p) return;
  const L = 318, T = 17;
  ctx.save();
  ctx.translate(p.position.x, p.position.y);
  ctx.rotate(p.angle);

  // shadow
  ctx.fillStyle = 'rgba(4, 8, 8, .18)';
  rr(ctx, -L / 2 + 4, -T / 2 + 6, L, T, T / 2);
  ctx.fill();

  // shaft
  const g = ctx.createLinearGradient(0, -T / 2, 0, T / 2);
  g.addColorStop(0, '#c08b52');
  g.addColorStop(.24, '#a2703c');
  g.addColorStop(.62, '#7c5228');
  g.addColorStop(1, '#4a2e13');
  ctx.fillStyle = g;
  rr(ctx, -L / 2, -T / 2, L, T, T / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(38,23,9,.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // grain
  ctx.save();
  rr(ctx, -L / 2, -T / 2, L, T, T / 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(64,40,16,.4)';
  ctx.lineWidth = .9;
  for (let i = 0; i < 4; i++) {
    const y = -T / 2 + 3 + i * 3.4;
    ctx.beginPath();
    ctx.moveTo(-L / 2 + 4, y);
    ctx.bezierCurveTo(-70, y - 1.6, 60, y + 1.6, L / 2 - 4, y);
    ctx.stroke();
  }
  // knots
  for (const kx of [-120, -6, 104]) {
    ctx.strokeStyle = 'rgba(54,32,11,.45)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(kx, 1, 7, 3.2, .1, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(kx, 1, 3, 1.4, .1, 0, TAU);
    ctx.stroke();
  }
  // high light
  ctx.strokeStyle = 'rgba(255,222,166,.28)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-L / 2 + 8, -T / 2 + 3.5);
  ctx.lineTo(L / 2 - 10, -T / 2 + 3.5);
  ctx.stroke();
  ctx.restore();

  // leather grip wraps near base
  ctx.strokeStyle = 'rgba(66,39,17,.85)';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 6; i++) {
    const x = -L / 2 + 8 + i * 6;
    ctx.beginPath();
    ctx.moveTo(x, -T / 2 + 1);
    ctx.lineTo(x + 3, T / 2 - 1);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(156,110,62,.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const x = -L / 2 + 9 + i * 6;
    ctx.beginPath();
    ctx.moveTo(x, -T / 2 + 1);
    ctx.lineTo(x + 3, T / 2 - 1);
    ctx.stroke();
  }

  // iron bands
  for (const bx of [-L / 2 + 2, -42, 74, L / 2 - 2]) {
    ctx.fillStyle = '#2d3130';
    ctx.fillRect(bx - 3.4, -T / 2 - 1.2, 6.8, T + 2.4);
    ctx.fillStyle = 'rgba(180,190,180,.26)';
    ctx.fillRect(bx - 3.4, -T / 2 - 1.2, 1.6, T + 2.4);
    ctx.fillStyle = 'rgba(8,10,10,.6)';
    ctx.beginPath();
    ctx.arc(bx, -T / 2 + 2.6, 1.1, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, T / 2 - 2.6, 1.1, 0, TAU);
    ctx.fill();
  }

  // iron cap and spike at tip
  ctx.fillStyle = '#343938';
  ctx.beginPath();
  ctx.moveTo(L / 2 - 2, -T / 2 - .5);
  ctx.lineTo(L / 2 + 9, -3);
  ctx.lineTo(L / 2 + 14, 0);
  ctx.lineTo(L / 2 + 9, 3);
  ctx.lineTo(L / 2 - 2, T / 2 + .5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(215,225,215,.35)';
  ctx.beginPath();
  ctx.moveTo(L / 2, -T / 2 + 1);
  ctx.lineTo(L / 2 + 10, -1.5);
  ctx.lineTo(L / 2 + 3, 0);
  ctx.closePath();
  ctx.fill();

  // carved sigil
  ctx.strokeStyle = 'rgba(57,35,14,.55)';
  ctx.lineWidth = 1;
  const sx = 32;
  ctx.beginPath();
  ctx.moveTo(sx - 5, -4);
  ctx.lineTo(sx, 0);
  ctx.lineTo(sx + 5, -4);
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, 4);
  ctx.stroke();

  ctx.restore();
}

function barrelFront(ctx, time, vel) {
  const tilt = clamp(vel.x * .22, -.15, .15);
  ctx.save();
  ctx.rotate(tilt);
  // back half of barrel
  const g = ctx.createLinearGradient(-34, 0, 34, 0);
  g.addColorStop(0, '#4c2f18');
  g.addColorStop(.18, '#7c5129');
  g.addColorStop(.5, '#9a6838');
  g.addColorStop(.82, '#6d4522');
  g.addColorStop(1, '#3f2712');

  // barrel silhouette (round-ish)
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-30, -26);
  ctx.bezierCurveTo(-40, -10, -42, 22, -32, 44);
  ctx.quadraticCurveTo(0, 58, 32, 44);
  ctx.bezierCurveTo(42, 22, 40, -10, 30, -26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(35,19,7,.65)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // staves
  ctx.save();
  ctx.clip();
  for (let i = -3; i <= 3; i++) {
    const x = i * 9.4;
    ctx.strokeStyle = i % 2 ? 'rgba(48,28,12,.42)' : 'rgba(214,165,105,.14)';
    ctx.lineWidth = i % 2 ? 1.4 : 1;
    ctx.beginPath();
    ctx.moveTo(x * .82, -30);
    ctx.bezierCurveTo(x * 1.15, -4, x * 1.15, 24, x * .88, 56);
    ctx.stroke();
  }
  // wood grain
  ctx.strokeStyle = 'rgba(58,34,14,.25)';
  ctx.lineWidth = .8;
  for (let i = 0; i < 9; i++) {
    const y = -18 + i * 7.5;
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.bezierCurveTo(-14, y - 2, 14, y + 2, 40, y);
    ctx.stroke();
  }
  // barnacle specks
  ctx.fillStyle = 'rgba(180,175,150,.22)';
  for (let i = 0; i < 8; i++) {
    const a = (i * 2.399) % TAU, r = 5 + (i * 13) % 28;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, 10 + Math.sin(a) * r * .7, 1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // iron hoops
  for (const y of [-19, 34]) {
    ctx.strokeStyle = '#2c2e2b';
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(-36, y);
    ctx.quadraticCurveTo(0, y + 4, 36, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(185,195,180,.24)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-35, y - 1.2);
    ctx.quadraticCurveTo(0, y + 2.8, 35, y - 1.2);
    ctx.stroke();
    // rivets
    ctx.fillStyle = 'rgba(12,13,12,.8)';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * 13, y + 2 - Math.abs(i) * .35, .9, 0, TAU);
      ctx.fill();
    }
  }

  // rope coil & small hanging anchor charm
  ctx.strokeStyle = 'rgba(190,164,116,.6)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-19, 22, 6, -.4, 4.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-20, 23, 4.4, -.2, 4.2);
  ctx.stroke();

  // barrel rim
  ctx.fillStyle = '#3a2412';
  ctx.beginPath();
  ctx.ellipse(0, -26, 30, 7, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(209,162,102,.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, -27, 29, 6, 0, Math.PI, TAU);
  ctx.stroke();
  ctx.restore();
}

function torso(ctx, time) {
  // striped shirt body
  const g = ctx.createLinearGradient(-18, -30, 14, -2);
  g.addColorStop(0, '#c9b18b');
  g.addColorStop(1, '#9f8767');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-20, -14);
  ctx.quadraticCurveTo(-22, -36, -8, -40);
  ctx.lineTo(10, -40);
  ctx.quadraticCurveTo(24, -36, 22, -14);
  ctx.closePath();
  ctx.fill();
  // stripes
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-20, -14);
  ctx.quadraticCurveTo(-22, -36, -8, -40);
  ctx.lineTo(10, -40);
  ctx.quadraticCurveTo(24, -36, 22, -14);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(122, 49, 36, .75)';
  ctx.lineWidth = 3.4;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-26, -34 + i * 5.5);
    ctx.quadraticCurveTo(0, -31 + i * 5.5, 28, -34 + i * 5.5);
    ctx.stroke();
  }
  ctx.restore();
  // collar
  ctx.strokeStyle = '#6b2f24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -40);
  ctx.quadraticCurveTo(0, -34, 10, -40);
  ctx.stroke();
  // sash
  ctx.fillStyle = '#8f3429';
  ctx.save();
  ctx.translate(0, -10);
  ctx.rotate(-.12);
  ctx.fillRect(-23, -4, 46, 8);
  ctx.fillStyle = 'rgba(244,196,110,.5)';
  for (let i = -2; i <= 2; i++) ctx.fillRect(i * 9, -3, 2, 6);
  ctx.restore();
  // necklace
  ctx.strokeStyle = 'rgba(56,42,24,.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, -40);
  ctx.quadraticCurveTo(0, -30, 8, -40);
  ctx.stroke();
  ctx.fillStyle = '#e6bd62';
  ctx.beginPath();
  ctx.moveTo(0, -30); ctx.lineTo(3, -27); ctx.lineTo(0, -24); ctx.lineTo(-3, -27);
  ctx.closePath();
  ctx.fill();
}

function head(ctx, time, lookX, lookY) {
  ctx.save();
  ctx.translate(0, -50);
  // neck
  ctx.fillStyle = '#a76b46';
  ctx.fillRect(-6, 6, 12, 10);

  // face
  const g = ctx.createRadialGradient(-6, -8, 4, 0, 0, 26);
  g.addColorStop(0, '#d9a173');
  g.addColorStop(.6, '#c1875b');
  g.addColorStop(1, '#9e633d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 19, 0, 0, TAU);
  ctx.fill();
  // ears
  ctx.fillStyle = '#b97b50';
  ctx.beginPath(); ctx.ellipse(-17, 0, 3.6, 6.2, -.15, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(17, 0, 3.6, 6.2, .15, 0, TAU); ctx.fill();

  // beard
  ctx.fillStyle = '#c9c2ae';
  ctx.beginPath();
  ctx.moveTo(-17, 4);
  ctx.quadraticCurveTo(-20, 20, -9, 27);
  ctx.quadraticCurveTo(-2, 31, 0, 26);
  ctx.quadraticCurveTo(2, 31, 9, 27);
  ctx.quadraticCurveTo(20, 20, 17, 4);
  ctx.quadraticCurveTo(13, 14, 6, 15);
  ctx.quadraticCurveTo(0, 18, -6, 15);
  ctx.quadraticCurveTo(-13, 14, -17, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,250,235,.22)';
  ctx.beginPath();
  ctx.moveTo(-6, 15); ctx.quadraticCurveTo(0, 20, 5, 15);
  ctx.quadraticCurveTo(2, 24, 0, 25); ctx.quadraticCurveTo(-3, 22, -6, 15);
  ctx.fill();
  // moustache
  ctx.fillStyle = '#bdb5a1';
  ctx.beginPath();
  ctx.moveTo(-11, 10);
  ctx.quadraticCurveTo(-4, 6, 0, 10);
  ctx.quadraticCurveTo(4, 6, 11, 10);
  ctx.quadraticCurveTo(5, 14, 0, 12);
  ctx.quadraticCurveTo(-5, 14, -11, 10);
  ctx.closePath();
  ctx.fill();

  // mouth
  ctx.strokeStyle = '#4a2018';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, 17);
  ctx.quadraticCurveTo(0, 19, 4, 17);
  ctx.stroke();
  ctx.fillStyle = '#f0d27b';
  ctx.fillRect(1, 17, 2.2, 2);

  // nose
  ctx.fillStyle = '#bd7f52';
  ctx.beginPath();
  ctx.ellipse(1, 6, 5.2, 4.2, .1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(245,200,160,.4)';
  ctx.beginPath();
  ctx.ellipse(-1, 4.5, 2.2, 1.5, .2, 0, TAU);
  ctx.fill();

  // eyes: right open, left patch
  const ex = clamp(lookX, -1, 1) * 2.6;
  const ey = clamp(lookY, -1, 1) * 1.8;
  ctx.fillStyle = '#f3e7ce';
  ctx.beginPath();
  ctx.ellipse(7, -1, 4.6, 2.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2b1d12';
  ctx.beginPath();
  ctx.arc(7 + ex, -1 + ey, 1.9, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.arc(7.6 + ex, -1.7 + ey, .55, 0, TAU);
  ctx.fill();
  // brow
  ctx.strokeStyle = '#8a7a63';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -5.5);
  ctx.quadraticCurveTo(7, -7.5, 12, -5);
  ctx.stroke();

  // eyepatch
  ctx.fillStyle = '#221b15';
  ctx.beginPath();
  ctx.ellipse(-7, -1.6, 5.2, 4.2, -.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#2c2219';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-11, -5);
  ctx.lineTo(-16, -10);
  ctx.moveTo(-12, 1);
  ctx.lineTo(2, 6);
  ctx.stroke();

  // scar
  ctx.strokeStyle = 'rgba(150,80,58,.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(9, 8);
  ctx.lineTo(13, 13);
  ctx.stroke();

  // bandana
  ctx.fillStyle = '#8e2f27';
  ctx.beginPath();
  ctx.moveTo(-18, -8);
  ctx.quadraticCurveTo(-12, -24, 0, -23);
  ctx.quadraticCurveTo(13, -24, 18, -8);
  ctx.quadraticCurveTo(9, -14, 0, -14);
  ctx.quadraticCurveTo(-9, -14, -18, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(228,126,92,.25)';
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.quadraticCurveTo(-4, -22, 8, -19);
  ctx.quadraticCurveTo(-2, -18, -14, -14);
  ctx.fill();
  // knot & tails
  ctx.fillStyle = '#76231d';
  ctx.beginPath();
  ctx.ellipse(17, -12, 4, 3, -.3, 0, TAU);
  ctx.fill();
  const flap = Math.sin(time * 2.2) * 2;
  ctx.beginPath();
  ctx.moveTo(18, -12);
  ctx.quadraticCurveTo(28, -10 + flap, 31, -2 + flap);
  ctx.quadraticCurveTo(24, -6, 17, -9);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(15, -10);
  ctx.quadraticCurveTo(24, -4 - flap, 22, 4 - flap);
  ctx.quadraticCurveTo(19, -1, 13, -7);
  ctx.closePath();
  ctx.fill();
  // skull pin
  ctx.fillStyle = '#e0d5b6';
  ctx.beginPath();
  ctx.arc(0, -17, 2.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5a211b';
  ctx.beginPath(); ctx.arc(-.8, -17.4, .55, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(1.1, -17.4, .55, 0, TAU); ctx.fill();

  // earring
  ctx.strokeStyle = '#e0b45e';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(18, 5, 3.2, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#e0b45e';
  ctx.beginPath(); ctx.arc(18, 8.4, .9, 0, TAU); ctx.fill();

  ctx.restore();
}

function drawArm(ctx, x1, y1, x2, y2, width, stripe = true) {
  ctx.strokeStyle = '#a98f6c';
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  if (stripe) {
    ctx.strokeStyle = 'rgba(126,48,36,.55)';
    ctx.lineWidth = 2;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(mx - Math.cos(a) * 2, my - Math.sin(a) * 2);
    ctx.lineTo(mx + Math.cos(a) * 2, my + Math.sin(a) * 2);
    ctx.stroke();
  }
}

function drawHookShape(ctx, x, y, angle, scale, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  const g = ctx.createLinearGradient(-3, -6, 8, 8);
  g.addColorStop(0, '#9aa7a4');
  g.addColorStop(.35, '#d6dfda');
  g.addColorStop(.6, '#6f7a77');
  g.addColorStop(1, '#3d4645');
  ctx.strokeStyle = g;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  // shank
  ctx.beginPath();
  ctx.moveTo(-2, -10);
  ctx.lineTo(0, 5);
  ctx.stroke();
  // bill
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(12, 6, 16, 16, 7, 20);
  ctx.bezierCurveTo(-2, 23, -10, 16, -8, 9);
  ctx.stroke();
  // barb
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(-13, 6);
  ctx.stroke();
  // eyelet
  ctx.strokeStyle = '#c7d2cd';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-2, -11, 2.6, 0, TAU);
  ctx.stroke();
  // glint
  const gl = .4 + Math.sin(time * 3) * .3;
  ctx.fillStyle = `rgba(255,255,255,${gl})`;
  ctx.beginPath();
  ctx.arc(3, 8, 1.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawRope(ctx, game, time) {
  const h = game.hook;
  if (!h || h.state === 'ready') return;
  const hand = game.hand();
  const end = h.pos;
  const dist = Math.hypot(end.x - hand.x, end.y - hand.y);
  const slack = h.state === 'attached' ? clamp(h.ropeLen - dist, 0, 90) : 10;
  const nx = -(end.y - hand.y) / (dist || 1);
  const ny = (end.x - hand.x) / (dist || 1);
  const mx = (hand.x + end.x) / 2 + nx * slack * .55;
  const my = (hand.y + end.y) / 2 + ny * slack * .55 + slack * .25;
  ctx.save();
  ctx.strokeStyle = 'rgba(26,22,16,.75)';
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hand.x, hand.y);
  ctx.quadraticCurveTo(mx, my, end.x, end.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(196,168,116,.75)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hand.x, hand.y);
  ctx.quadraticCurveTo(mx, my, end.x, end.y);
  ctx.stroke();
  // twist dashes
  ctx.strokeStyle = 'rgba(90,70,40,.55)';
  ctx.lineWidth = 1;
  const steps = Math.max(4, Math.floor(dist / 16));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const it = 1 - t;
    const px = it * it * hand.x + 2 * it * t * mx + t * t * end.x;
    const py = it * it * hand.y + 2 * it * t * my + t * t * end.y;
    ctx.beginPath();
    ctx.moveTo(px - 2, py);
    ctx.lineTo(px + 2, py);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPirate(ctx, game, time) {
  const b = game.player;
  if (!b) return;
  const p = b.position;
  const cam = game.camera;
  const lookX = clamp((game.mouse.wx - p.x) / 180, -1, 1);
  const lookY = clamp((game.mouse.wy - p.y) / 180, -1, 1);
  const vel = b.velocity;
  const grounded = game.grounded();
  const bob = grounded ? Math.sin(time * 1.7) * .8 + Math.sin(time * 3.1) * .25 : Math.sin(time * 5) * 1.4;

  ctx.save();
  ctx.translate(p.x, p.y);

  // ground shadow
  if (grounded) {
    const sx = clamp(vel.x * 12, -10, 10);
    ctx.save();
    ctx.fillStyle = 'rgba(4,8,8,.28)';
    ctx.beginPath();
    ctx.ellipse(sx, 56, 38, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(4,8,8,.12)';
    ctx.beginPath();
    ctx.ellipse(sx, 58, 54, 12, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.translate(0, bob);
  torso(ctx, time);

  // left shoulder & arm toward hook hand
  const hand = { x: -25, y: 2 };
  const hookState = game.hook.state;
  if (hookState !== 'ready') {
    const ang = Math.atan2(game.hook.pos.y - p.y, game.hook.pos.x - p.x);
    hand.x = Math.cos(ang) * 30;
    hand.y = Math.sin(ang) * 24 - 4;
  }
  ctx.save();
  drawArm(ctx, -14, -20, hand.x, hand.y, 9);
  ctx.fillStyle = '#b97f54';
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 4.6, 0, TAU);
  ctx.fill();
  ctx.restore();

  // head
  head(ctx, time, lookX, lookY);

  // barrel
  barrelFront(ctx, time, vel);

  // right arm gripping the pole base
  const grip = game.shoulder();
  const gx = grip.x - p.x, gy = grip.y - p.y;
  ctx.save();
  drawArm(ctx, 16, -18, gx, gy, 10);
  // hand
  const ga = Math.atan2(gy - (-18), gx - 16);
  ctx.fillStyle = '#c1875b';
  ctx.beginPath();
  ctx.arc(gx, gy, 5.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,48,28,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(gx, gy, 3, ga + .3, ga + 2.4);
  ctx.stroke();
  ctx.restore();

  // held hook when idle
  if (hookState === 'ready') {
    const sway = Math.sin(time * 1.5) * .06;
    drawHookShape(ctx, hand.x + 2, hand.y + 7, sway, .8, time);
  }

  // little glints / breath
  if (!grounded && Math.abs(vel.y) > 1.2) {
    ctx.strokeStyle = 'rgba(240,232,210,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-18, -60);
    ctx.quadraticCurveTo(-26, -70, -32, -64);
    ctx.stroke();
  }

  ctx.restore();
  void cam;
}

export function drawFlyingHook(ctx, game, time) {
  const h = game.hook;
  if (!h || h.state === 'ready') return;
  if (h.state === 'attached') {
    const ang = Math.atan2(h.anchor.y - game.player.position.y, h.anchor.x - game.player.position.x);
    drawHookShape(ctx, h.pos.x, h.pos.y, ang - .4, 1, time);
    // sparks at contact
    if (Math.random() < .1) {
      ctx.fillStyle = 'rgba(255,230,170,.7)';
      ctx.beginPath();
      ctx.arc(h.pos.x + (Math.random() - .5) * 8, h.pos.y + (Math.random() - .5) * 8, 1, 0, TAU);
      ctx.fill();
    }
  } else if (h.state === 'flying') {
    const ang = Math.atan2(h.to.y - h.from.y, h.to.x - h.from.x);
    drawHookShape(ctx, h.pos.x, h.pos.y, ang + Math.sin(time * 20) * .3, .9, time);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,220,150,.14)';
    ctx.beginPath();
    ctx.arc(h.pos.x, h.pos.y, 10, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else {
    drawHookShape(ctx, h.pos.x, h.pos.y, .5, .8, time);
  }
}
