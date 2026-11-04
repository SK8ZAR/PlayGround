/* ══════════════════════════════════════════════════════════════
   PAINT — shared drawing helpers and palettes
   ══════════════════════════════════════════════════════════════ */

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}

export function withA(color, a) {
  if (color.startsWith('#')) {
    const [r, g, b] = rgb(color);
    return `rgba(${r},${g},${b},${a})`;
  }
  if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${a})`);
  return color;
}

export function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot, 0, TAU);
}

export function poly(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (close) ctx.closePath();
}

export function vgrad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [p, c] of stops) g.addColorStop(p, c);
  return g;
}

export const SKY = {
  low: { top: '#0b2b3c', mid: '#16515d', low: '#4a8780', hor: '#e2b47c', under: '#a06a47' },
  mid: { top: '#0a2a3a', mid: '#1a4c5a', low: '#6f9b8e', hor: '#e0b182', under: '#93694b' },
  high: { top: '#040b17', mid: '#0a1c30', low: '#273b4e', hor: '#6f6266', under: '#3a3039' },
};

export const TYPE_STYLE = {
  sand: { base: '#a9834f', top: '#e3c58a', edge: '#f2dbaa', dark: '#6e502e', texture: '#7a5a33' },
  wood: { base: '#5d3d22', top: '#8d6038', edge: '#b3814d', dark: '#33200f', texture: '#3e2814' },
  deck: { base: '#67452a', top: '#94673c', edge: '#bd8b55', dark: '#3a2616', texture: '#442c19' },
  rock: { base: '#565248', top: '#7a7362', edge: '#948c78', dark: '#34322b', texture: '#403e36' },
  moss: { base: '#4d5c3e', top: '#7f9a5b', edge: '#a4b97a', dark: '#2c3724', texture: '#38452c' },
  stone: { base: '#6d6a5d', top: '#938e7a', edge: '#aca68f', dark: '#45433a', texture: '#514e43' },
  gold: { base: '#6f5b32', top: '#c9a34e', edge: '#f4d488', dark: '#3f2f17', texture: '#5d4a27' },
};

/** Add a soft rounded shadow beneath an object. */
export function shadowBlob(ctx, x, y, rx, ry, alpha = .3) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(4,8,8,${alpha})`);
  g.addColorStop(.65, `rgba(4,8,8,${alpha * .55})`);
  g.addColorStop(1, 'rgba(4,8,8,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A wobbly organic polygon from a center, radius and seed. */
export function blob(ctx, x, y, rx, ry, rand, points = 9, jag = .18) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * TAU;
    const j = 1 + (rand() - .5) * jag * 2;
    pts.push({ x: x + Math.cos(a) * rx * j, y: y + Math.sin(a) * ry * j });
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], n = pts[(i + 1) % pts.length];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + n.x) / 2, (p.y + n.y) / 2);
  }
  ctx.closePath();
  return pts;
}
