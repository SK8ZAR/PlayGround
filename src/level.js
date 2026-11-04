/* ══════════════════════════════════════════════════════════════
   LEVEL — The Isle of the Hidden Hoard
   All geometry is defined as top-surface ledges. Coordinates are
   world pixels; +y points down, so the summit has large negative y.
   ══════════════════════════════════════════════════════════════ */

const M = window.Matter;

const DEG = Math.PI / 180;

/** A ledge defined by the two endpoints of its walkable top surface. */
function P(x1, y1, x2, y2, t, type, extra = {}) {
  return { x1, y1, x2, y2, t, type, ...extra };
}

export const PLATFORMS = [
  // ── The Shallows ─────────────────────────────────────────
  P(-1250, 20, 430, 20, 560, 'sand', { id: 'beach', mass: true }),
  P(-835, -62, -605, -212, 26, 'wood', { id: 'log', log: true }),
  P(-790, -302, -420, -274, 96, 'rock', { id: 'rock-a', mass: true }),
  P(-570, -452, -140, -428, 120, 'sand', { id: 'sand-a', mass: true }),
  P(-290, -592, 55, -560, 86, 'rock', { id: 'rock-b', mass: true }),
  P(-40, -688, 270, -856, 26, 'wood', { id: 'wreck-ramp', plank: true }),

  // ── Wreck of the Siren's Due ─────────────────────────────
  P(230, -982, 648, -960, 54, 'deck', { id: 'deck', ship: true }),
  P(588, -1092, 772, -1144, 22, 'wood', { id: 'rail', ship: true }),
  P(700, -1202, 505, -1446, 26, 'wood', { id: 'mast-ramp', ship: true }),
  P(278, -1572, 566, -1550, 44, 'deck', { id: 'nest', ship: true }),
  P(158, -1692, 386, -1724, 20, 'wood', { id: 'yardarm', ship: true }),
  P(452, -1882, 748, -1852, 104, 'rock', { id: 'rock-c', mass: true }),
  P(632, -2062, 910, -2092, 50, 'deck', { id: 'bow', ship: true }),
  P(826, -2242, 1136, -2272, 130, 'rock', { id: 'rock-d', mass: true }),

  // ── The Green Maw ────────────────────────────────────────
  P(764, -2432, 1086, -2462, 96, 'moss', { id: 'moss-a', mass: true }),
  P(524, -2642, 866, -2672, 106, 'moss', { id: 'moss-b', mass: true }),
  P(224, -2852, 588, -2882, 104, 'moss', { id: 'moss-c', mass: true }),
  P(-142, -3062, 232, -3032, 96, 'rock', { id: 'rock-e', mass: true }),
  P(-486, -3272, -102, -3242, 108, 'moss', { id: 'moss-d', mass: true }),
  P(-826, -3482, -442, -3452, 116, 'rock', { id: 'rock-f', mass: true }),
  P(-706, -3692, -322, -3662, 108, 'moss', { id: 'moss-e', mass: true }),
  P(-266, -3902, 104, -3872, 96, 'rock', { id: 'rock-g', mass: true }),
  P(158, -4112, 524, -4142, 108, 'moss', { id: 'moss-f', mass: true }),
  P(586, -4322, 928, -4352, 108, 'moss', { id: 'moss-g', mass: true }),
  P(504, -4532, 846, -4502, 104, 'rock', { id: 'rock-h', mass: true }),
  P(180, -4742, 524, -4772, 108, 'moss', { id: 'moss-h', mass: true }),
  P(-182, -4952, 162, -4922, 110, 'moss', { id: 'moss-i', mass: true }),
  P(-544, -5162, -198, -5132, 116, 'rock', { id: 'rock-i', mass: true }),
  P(-862, -5372, -518, -5342, 108, 'moss', { id: 'moss-j', mass: true }),

  // ── Temple of the Tide ───────────────────────────────────
  P(-772, -5582, -396, -5552, 92, 'stone', { id: 'stone-a', mass: true }),
  P(-326, -5792, 44, -5762, 92, 'stone', { id: 'stone-b', mass: true }),
  P(162, -6002, 526, -5972, 92, 'stone', { id: 'stone-c', mass: true }),
  P(622, -6212, 964, -6242, 100, 'stone', { id: 'stone-d', mass: true }),
  P(520, -6422, 884, -6392, 92, 'stone', { id: 'stone-e', mass: true }),
  P(242, -6632, 606, -6662, 92, 'stone', { id: 'stone-f', mass: true }),
  P(-122, -6842, 244, -6812, 92, 'stone', { id: 'stone-g', mass: true }),
  P(-462, -7052, -98, -7022, 92, 'stone', { id: 'stone-h', mass: true }),
  P(-802, -7262, -438, -7232, 92, 'stone', { id: 'stone-i', mass: true }),
  P(-652, -7472, -298, -7442, 92, 'stone', { id: 'stone-j', mass: true }),
  P(-262, -7682, 104, -7652, 92, 'stone', { id: 'stone-k', mass: true }),
  P(142, -7892, 506, -7862, 92, 'stone', { id: 'stone-l', mass: true }),
  P(562, -8102, 926, -8072, 100, 'stone', { id: 'stone-m', mass: true }),

  // ── The Gilded Summit ────────────────────────────────────
  P(782, -8312, 1128, -8282, 100, 'stone', { id: 'summit-a', mass: true }),
  P(602, -8522, 966, -8492, 100, 'stone', { id: 'summit-b', mass: true }),
  P(302, -8732, 666, -8702, 100, 'stone', { id: 'summit-c', mass: true }),
  P(-62, -8942, 302, -8912, 100, 'stone', { id: 'summit-d', mass: true }),
  P(-402, -9152, -38, -9122, 100, 'stone', { id: 'summit-e', mass: true }),
  P(-742, -9362, -378, -9332, 100, 'stone', { id: 'summit-f', mass: true }),
  P(-602, -9572, -238, -9542, 100, 'stone', { id: 'summit-g', mass: true }),
  P(-202, -9782, 162, -9752, 100, 'stone', { id: 'summit-h', mass: true }),
  P(222, -9992, 772, -9966, 150, 'gold', { id: 'treasure', mass: true, final: true }),
];

export const ZONES = [
  {
    id: 'shallows', name: 'The Shallows', top: 420, bottom: -640,
    color: '#d9b46a', quote: 'They said the treasure was at the top. They also said the rum was gone. Only one of those was a lie.',
    ambience: 'gulls',
  },
  {
    id: 'wreck', name: "Wreck of the Siren's Due", top: -640, bottom: -2240,
    color: '#c08a5a', quote: 'The sea gave up this wreck ages ago. It will not give you up so easily.',
    ambience: 'creak',
  },
  {
    id: 'jungle', name: 'The Green Maw', top: -2240, bottom: -5240,
    color: '#7fae68', quote: 'Green things grow best on the bones of better climbers. Try to be worse than them.',
    ambience: 'insects',
  },
  {
    id: 'ruins', name: 'Temple of the Tide', top: -5240, bottom: -8180,
    color: '#a8a08b', quote: 'The temple was built by people who never had to climb it. You can hear them laughing, faintly, in the stone.',
    ambience: 'wind',
  },
  {
    id: 'summit', name: 'The Gilded Summit', top: -8180, bottom: -10300,
    color: '#f0c96f', quote: 'Almost there. The last stretch is always the one that remembers your name.',
    ambience: 'gold',
  },
];

export const CHECKPOINTS = [
  { id: 'start', name: 'The Shallows', x: -900, y: -34, triggerY: -10, spawnX: -900, spawnY: -48, kind: 'start' },
  { id: 'wreck', name: "Siren's Deck", x: 420, y: -1032, triggerY: -1000, spawnX: 420, spawnY: -1034, kind: 'flag' },
  { id: 'jungle', name: 'The Green Maw', x: 880, y: -2502, triggerY: -2470, spawnX: 880, spawnY: -2504, kind: 'flag' },
  { id: 'ruins', name: 'The Tide Gate', x: -600, y: -5650, triggerY: -5620, spawnX: -600, spawnY: -5652, kind: 'flag' },
  { id: 'summit', name: 'The Last Step', x: -560, y: -9422, triggerY: -9390, spawnX: -560, spawnY: -9424, kind: 'flag' },
];

export const START = { x: -900, y: -48 };
export const SUMMIT = { x: 520, y: -10030 };
export const SEA_Y = 288;
export const WORLD = { left: -1500, right: 1500, top: -10600, bottom: 780 };

/** Hand-placed scenery. Renderer understands each `type`. */
export const PROPS = [
  // beach
  { type: 'palm', x: -1120, y: 18, s: 1.35, flip: false },
  { type: 'palm', x: 300, y: 16, s: 1.05, flip: true },
  { type: 'palm', x: -460, y: 16, s: .72, flip: true },
  { type: 'sign', x: -985, y: 18, s: 1.15 },
  { type: 'skeleton', x: -640, y: 18, s: 1, flip: true },
  { type: 'barrel', x: -330, y: 16, s: .85 },
  { type: 'barrel', x: 170, y: 16, s: .7, tilt: -.2 },
  { type: 'crate', x: 90, y: 15, s: .9, tilt: .08 },
  { type: 'driftwood', x: -760, y: 17, s: 1.2, flip: false },
  { type: 'seagull', x: -250, y: -420, s: 1 },

  // wreck
  { type: 'hull', x: 540, y: -1390, s: 1.25, flip: false },
  { type: 'mast', x: 690, y: -1450, s: 1.1 },
  { type: 'sail', x: 430, y: -1745, s: 1.1, flip: true },
  { type: 'crate', x: 310, y: -985, s: .75, tilt: .12 },
  { type: 'barrel', x: 590, y: -988, s: .8 },
  { type: 'lantern', x: 640, y: -1000, s: 1 },
  { type: 'lantern', x: 260, y: -1580, s: .9 },
  { type: 'skeleton', x: 800, y: -2275, s: .85, flip: false },
  { type: 'ropehang', x: 720, y: -1900, s: 1.4 },

  // jungle
  { type: 'palm', x: 1050, y: -2468, s: 1.2, flip: true },
  { type: 'palm', x: 560, y: -2678, s: .9, flip: false },
  { type: 'fern', x: 380, y: -2890, s: 1.2 },
  { type: 'fern', x: -100, y: -3040, s: .9, flip: true },
  { type: 'palm', x: -430, y: -3250, s: .8, flip: true },
  { type: 'waterfall', x: -700, y: -3670, s: 1.1 },
  { type: 'vine', x: 760, y: -2450, s: 1.7 },
  { type: 'vine', x: -240, y: -3890, s: 1.4 },
  { type: 'vine', x: 320, y: -4120, s: 1.9 },
  { type: 'vine', x: -120, y: -4930, s: 1.5 },
  { type: 'skull', x: 60, y: -3880, s: .7 },
  { type: 'torch', x: 1000, y: -2475, s: 1 },
  { type: 'torch', x: -730, y: -3455, s: 1 },

  // ruins
  { type: 'column', x: -700, y: -5575, s: 1.15, broken: 0.55 },
  { type: 'column', x: -430, y: -5575, s: .9, broken: 0.2 },
  { type: 'arch', x: 360, y: -6010, s: 1.3 },
  { type: 'column', x: 850, y: -6250, s: 1.1, broken: 0.8 },
  { type: 'statue', x: -200, y: -6845, s: 1.05, flip: true },
  { type: 'column', x: -740, y: -7280, s: 1.2, broken: 0.4 },
  { type: 'column', x: 420, y: -7910, s: .9, broken: 0.7 },
  { type: 'torch', x: -780, y: -5585, s: 1.1 },
  { type: 'torch', x: 60, y: -5985, s: 1 },
  { type: 'torch', x: -430, y: -7045, s: 1 },
  { type: 'torch', x: 460, y: -7895, s: .95 },
  { type: 'skull', x: 880, y: -6245, s: .9 },
  { type: 'bones', x: -500, y: -5575, s: 1 },

  // summit
  { type: 'skullgate', x: 520, y: -10020, s: 1.25 },
  { type: 'torch', x: 790, y: -8315, s: 1.1 },
  { type: 'torch', x: -720, y: -9368, s: 1.1 },
  { type: 'palm', x: 1040, y: -8290, s: .8, flip: true },
  { type: 'goldpile', x: 300, y: -9997, s: 1.1 },
  { type: 'goldpile', x: 720, y: -9997, s: .8 },
];

/** Decorative supporting cliff masses, drawn behind the ledges. */
export const UNDERCLIFF = [
  { x: -1200, y: 30, w: 720, h: 480, type: 'beach' },
  { x: 260, y: 30, w: 420, h: 500, type: 'beach' },
];

export const NARRATION = {
  start: 'The treasure is at the top. You are at the bottom. Between those two facts lies the entire game.',
  fall: [
    'Down is a direction, not a defeat. Probably.',
    'The island is not laughing at you. The island is laughing near you.',
    'Gravity remains undefeated.',
    'A brief lesson in humility, delivered at speed.',
    'You have discovered a new way down. There was already a way down.',
  ],
  checkpoint: 'A nail in the cliff. A promise to yourself.',
  hookMiss: 'The hook returns empty. So does the sea, most days.',
  summit: 'The chest is real. The climb was real. The gold is, regrettably, also real.',
};

/* ── geometry helpers ─────────────────────────────────────── */

export function platformGeometry(p) {
  const dx = p.x2 - p.x1;
  const dy = p.y2 - p.y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux; // downward normal
  const cx = (p.x1 + p.x2) / 2 + nx * p.t / 2;
  const cy = (p.y1 + p.y2) / 2 + ny * p.t / 2;
  const angle = Math.atan2(dy, dx);
  const top = [
    { x: p.x1, y: p.y1 },
    { x: p.x2, y: p.y2 },
    { x: p.x2 + nx * p.t, y: p.y2 + ny * p.t },
    { x: p.x1 + nx * p.t, y: p.y1 + ny * p.t },
  ];
  return { cx, cy, len, angle, nx, ny, ux, uy, top };
}

const FRICTION = {
  sand: 0.72, wood: 0.8, deck: 0.78, rock: 0.92, moss: 0.98,
  stone: 0.66, gold: 0.55,
};

export function buildLevel() {
  const bodies = [];
  const platforms = [];

  PLATFORMS.forEach((p, i) => {
    const g = platformGeometry(p);
    const body = M.Bodies.rectangle(g.cx, g.cy, g.len, p.t, {
      isStatic: true,
      angle: g.angle,
      friction: FRICTION[p.type] ?? .8,
      frictionStatic: 3,
      restitution: 0,
      label: 'terrain',
      chamfer: { radius: 2 },
    });
    body.plugin = { platform: p.id || `p${i}`, type: p.type };
    const item = {
      ...p,
      id: p.id || `p${i}`,
      ...g,
      body,
      index: i,
      friction: FRICTION[p.type] ?? .8,
    };
    bodies.push(body);
    platforms.push(item);
  });

  // Raycast segments from every static body's true world vertices.
  const segments = [];
  for (const plat of platforms) {
    const v = plat.body.vertices;
    for (let i = 0; i < v.length; i++) {
      const a = v[i], b = v[(i + 1) % v.length];
      segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, platform: plat });
    }
  }

  // Zone lookup helper
  const zoneAt = (y) => {
    for (const z of ZONES) if (y <= z.top && y > z.bottom) return z;
    return y > ZONES[0].top ? ZONES[0] : ZONES[ZONES.length - 1];
  };

  return {
    bodies, platforms, segments, zoneAt,
    checkpoints: CHECKPOINTS,
    props: PROPS,
    undercliff: UNDERCLIFF,
    start: START, summit: SUMMIT, seaY: SEA_Y, world: WORLD,
  };
}

/** Ray vs. terrain segments. Returns nearest hit or null. */
export function castRay(segments, x0, y0, x1, y1, maxDist = Infinity) {
  const rx = x1 - x0, ry = y1 - y0;
  const rlen = Math.hypot(rx, ry);
  if (rlen < 0.0001) return null;
  const dx = rx / rlen, dy = ry / rlen;
  let best = null;
  let bestT = maxDist;
  for (const s of segments) {
    const sx = s.bx - s.ax, sy = s.by - s.ay;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-9) continue;
    const qx = s.ax - x0, qy = s.ay - y0;
    const t = (qx * sy - qy * sx) / denom;
    const u = (qx * dy - qy * dx) / denom;
    if (t >= 0 && t < bestT && u >= 0 && u <= 1) {
      bestT = t;
      best = { x: x0 + dx * t, y: y0 + dy * t, dist: t, platform: s.platform, seg: s };
    }
  }
  return best;
}

export function isNearSurface(segments, x, y, radius) {
  let closest = null;
  let best = radius;
  for (const s of segments) {
    const vx = s.bx - s.ax, vy = s.by - s.ay;
    const wx = x - s.ax, wy = y - s.ay;
    const l2 = vx * vx + vy * vy;
    let t = l2 ? (wx * vx + wy * vy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = s.ax + vx * t, py = s.ay + vy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < best) { best = d; closest = { x: px, y: py, dist: d, platform: s.platform }; }
  }
  return closest;
}
