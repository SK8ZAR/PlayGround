/* ══════════════════════════════════════════════════════════════
   TERRAIN — the island, its cliff face, and the ledges you cling to
   ══════════════════════════════════════════════════════════════ */

import {
  TAU, clamp, lerp, hashStr, mulberry32, rr, poly, blob,
  TYPE_STYLE, withA,
} from './paint.js';

/* ── prep ──────────────────────────────────────────────────── */

/** Build an organic, seed-stable silhouette that still has a perfectly
 *  flat walkable top (physics stays a rectangle). */
function buildLedgeShape(p, rand) {
  const L = p.len, T = p.t;
  const pts = [];
  const topN = Math.max(3, Math.round(L / 90));
  for (let i = 0; i <= topN; i++) {
    const x = -L / 2 + (i / topN) * L;
    const y = -T / 2 + (i === 0 || i === topN ? 0 : (rand() - .5) * 1.1);
    pts.push({ x, y });
  }
  // near-vertical ends keep the shelf reading as a shelf
  const side = Math.min(14, T * .16);
  pts.push({ x: L / 2 - 1, y: -T / 2 + T * .26 });
  pts.push({ x: L / 2 - side, y: T / 2 });
  const botN = Math.max(4, Math.round(L / 70));
  for (let i = botN; i >= 0; i--) {
    const u = i / botN;
    const x = -L / 2 + (.01 + u * .98) * L;
    const extra = T * (.02 + rand() * .28);
    const tooth = rand() > .72 ? 12 + rand() * 24 : 0;
    pts.push({ x, y: T / 2 + extra + tooth });
  }
  pts.push({ x: -L / 2 + side, y: T / 2 });
  pts.push({ x: -L / 2 + 1, y: -T / 2 + T * .26 });
  return pts;
}

export function preparePlatforms(level) {
  for (const p of level.platforms) {
    const rand = mulberry32(hashStr(p.id + p.type));
    const L = p.len, T = p.t;
    const tex = {
      specks: [], cracks: [], tufts: [], seams: [], nails: [], joints: [],
      veins: [], facets: [], blocks: [], boulders: [], lichen: [], vines: [],
    };
    const n = Math.min(54, Math.max(16, Math.floor(L / 10)));
    for (let i = 0; i < n; i++) {
      tex.specks.push({ x: (rand() - .5) * L, y: (rand() - .5) * T, r: .6 + rand() * 2.1, a: .08 + rand() * .28 });
    }
    const cracks = Math.min(9, Math.max(2, Math.floor(L / 58)));
    for (let i = 0; i < cracks; i++) {
      const x = (rand() - .5) * L * .86;
      const y = (rand() - .5) * T * .5;
      const seg = [{ x, y }];
      let cx = x, cy = y;
      for (let j = 0; j < 4; j++) {
        cx += (rand() - .5) * T * .9;
        cy += (rand() - .25) * T * .5;
        seg.push({ x: cx, y: cy });
      }
      tex.cracks.push(seg);
    }
    const tufts = Math.max(4, Math.floor(L / 26));
    for (let i = 0; i < tufts; i++) {
      tex.tufts.push({ x: (rand() - .5) * L * .96, h: 5 + rand() * 13, lean: (rand() - .5) * 7, a: rand() });
    }
    const seams = Math.max(2, Math.floor(L / 58));
    for (let i = 0; i < seams; i++) tex.seams.push((rand() - .5) * L * .9);
    for (let i = 0; i < Math.max(4, Math.floor(L / 46)); i++) {
      tex.nails.push({ x: (rand() - .5) * L * .92, y: (rand() - .5) * T * .4, o: rand() });
    }
    const joints = Math.max(2, Math.floor(L / 70));
    for (let i = 0; i < joints; i++) tex.joints.push((rand() - .5) * L);
    for (let i = 0; i < Math.max(3, Math.floor(L / 55)); i++) {
      tex.veins.push({ x0: (rand() - .5) * L, x1: (rand() - .5) * L, y: (rand() - .5) * T * .6, w: .5 + rand() * 1.5 });
    }
    // rock facets: chunky planes that break up the box silhouette
    const facets = Math.max(3, Math.floor(L / 70));
    for (let i = 0; i < facets; i++) {
      const x = (rand() - .5) * L * .92;
      const w = 26 + rand() * Math.min(90, L * .22);
      const h = T * (.35 + rand() * .7);
      const y = -T * .2 + rand() * T * .5;
      tex.facets.push({ x, y, w, h, a: .018 + rand() * .035, warm: rand() > .5 });
    }
    // sediment bands and embedded boulders
    tex.strata = [];
    const bands = Math.max(2, Math.floor(T / 26));
    for (let i = 0; i < bands; i++) {
      tex.strata.push({ y: -T / 2 + (i + .5) * (T / bands) + (rand() - .5) * 6, h: 3 + rand() * 9, a: .05 + rand() * .09 });
    }
    tex.embedded = [];
    for (let i = 0; i < Math.max(2, Math.floor(L / 100)); i++) {
      tex.embedded.push({ x: (rand() - .5) * L * .8, y: -T * .05 + rand() * T * .35, r: 6 + rand() * Math.min(22, T * .3), a: rand() });
    }
    // masonry courses for temple stone
    const rows = Math.max(2, Math.floor(T / 26));
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * 26 + rand() * 10;
      for (let x = -L / 2 + off; x < L / 2; x += 52 + rand() * 12) {
        tex.blocks.push({ x, y: -T / 2 + (r / rows) * T, h: T / rows, w: 46 + rand() * 18 });
      }
    }
    // loose stones that sit on broad shoulders
    for (let i = 0; i < Math.min(7, Math.max(2, Math.floor(L / 90))); i++) {
      tex.boulders.push({ x: (rand() - .5) * L * .9, r: 3.5 + rand() * 8, a: rand() });
    }
    for (let i = 0; i < Math.floor(L / 34); i++) {
      tex.lichen.push({ x: (rand() - .5) * L * .94, y: (rand() - .5) * T * .7, r: 4 + rand() * 14, a: .04 + rand() * .1 });
    }
    for (let i = 0; i < Math.max(2, Math.floor(L / 10)); i++) {
      tex.vines.push({ x: (rand() - .5) * L * .95, len: 14 + rand() * 70, lean: (rand() - .5) * 8, a: rand() });
    }
    p.tex = tex;
    p.shape = buildLedgeShape(p, rand);
    p.seed = rand();
  }
}

/** Unused large silhouette, kept for compatibility. */
export function drawIslandBackdrop(ctx, game, time) {
  if (!game._island) {
    const rand = mulberry32(99181);
    const pts = [];
    for (let y = 520; y >= -10520; y -= 260) {
      const k = (520 - y) / 11040;
      const cx = 170 * Math.sin(y / 1180) + 120 * Math.sin(y / 430 + 1.2) + 120;
      const w = 760 + 230 * Math.sin(y / 840 + .6) + 120 * Math.sin(y / 330) + lerp(120, -80, k);
      pts.push({ y, left: cx - w / 2 + (rand() - .5) * 90, right: cx + w / 2 + (rand() - .5) * 90, cx });
    }
    game._island = pts;
  }
  const pts = game._island;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].left, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    ctx.quadraticCurveTo(a.left, (a.y + b.y) / 2, (a.left + b.left) / 2, (a.y + b.y) / 2);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const b = pts[i], a = pts[Math.max(0, i - 1)];
    if (i === pts.length - 1) ctx.lineTo(b.right, b.y);
    else ctx.quadraticCurveTo(b.right, (a.y + b.y) / 2, (b.right + a.right) / 2, (a.y + b.y) / 2);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 500, 0, -10600);
  g.addColorStop(0, '#3b2f21');
  g.addColorStop(.15, '#2a3025');
  g.addColorStop(.35, '#23352b');
  g.addColorStop(.55, '#252f2c');
  g.addColorStop(.78, '#2b2d2b');
  g.addColorStop(1, '#24282c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/* ── distant coast ─────────────────────────────────────────── */

export function drawUndercliffs(ctx, game) {
  if (!game._distant) {
    const rand = mulberry32(70731);
    // Little sister stacks on the open-water side of the isle.
    game._distant = [];
    for (let i = 0; i < 5; i++) {
      const x = -1720 - i * 210 + rand() * 90;
      const w = 120 + rand() * 220;
      const h = 120 + rand() * 360;
      const lean = (rand() - .5) * 40;
      game._distant.push({ x, w, h, lean, a: .22 + rand() * .16, seed: rand() });
    }
  }
  const sea = game.level.seaY;
  ctx.save();
  for (const d of game._distant) {
    // they sit far out in the haze, so they read flat and pale
    const g = ctx.createLinearGradient(d.x, sea - d.h, d.x, sea);
    g.addColorStop(0, `rgba(98,130,126,${d.a})`);
    g.addColorStop(.7, `rgba(74,108,108,${d.a * 1.1})`);
    g.addColorStop(1, `rgba(56,88,92,${d.a * 1.2})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(d.x - d.w / 2, sea);
    ctx.quadraticCurveTo(d.x - d.w * .42, sea - d.h * .45, d.x - d.w * .28 + d.lean, sea - d.h * .78);
    ctx.lineTo(d.x - d.w * .12 + d.lean, sea - d.h);
    ctx.lineTo(d.x + d.w * .08 + d.lean, sea - d.h * .93);
    ctx.quadraticCurveTo(d.x + d.w * .34, sea - d.h * .5, d.x + d.w / 2, sea);
    ctx.closePath();
    ctx.fill();
    // a pale rim facing the sunset
    ctx.strokeStyle = 'rgba(240,206,150,.12)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(d.x - d.w * .12 + d.lean, sea - d.h);
    ctx.quadraticCurveTo(d.x - d.w * .42, sea - d.h * .45, d.x - d.w / 2, sea);
    ctx.stroke();
  }
  ctx.restore();

  // rock roots that tie every shelf into the cliff face
  for (const p of game.level.platforms) {
    if (p.id === 'beach' || p.ship || p.log) continue;
    if (p.type === 'wood') continue;
    const rand = mulberry32(hashStr(p.id + 'root'));
    const bx = p.cx + p.ux * p.len * .18 + p.nx * p.t * .42;
    const by = p.cy + p.uy * p.len * .18 + p.ny * p.t * .42;
    const w = Math.min(140, p.len * .26) * (.7 + rand() * .5);
    const h = 140 + rand() * 280;
    const drift = 30 + rand() * 100;
    const pts = [
      { x: bx - w * .5, y: by - 8 },
      { x: bx + w * .55, y: by - 8 },
      { x: bx + w * .35 + drift * .3, y: by + h * .5 },
      { x: bx + w * .12 + drift, y: by + h },
      { x: bx - w * .2 + drift * .8, y: by + h * .82 },
      { x: bx - w * .42 + drift * .2, y: by + h * .35 },
    ];
    poly(ctx, pts);
    const rg = ctx.createLinearGradient(bx - w, by, bx + w, by + h);
    rg.addColorStop(0, 'rgba(65,77,60,.8)');
    rg.addColorStop(.45, 'rgba(43,56,50,.85)');
    rg.addColorStop(1, 'rgba(17,28,29,.92)');
    ctx.fillStyle = rg;
    ctx.fill();
    // lit seaward edge of the root
    ctx.strokeStyle = 'rgba(255,196,128,.2)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx - w * .5, by - 8);
    ctx.quadraticCurveTo(bx - w * .55, by + h * .4, bx - w * .2 + drift * .8, by + h * .82);
    ctx.stroke();
    // strata crossing the root
    ctx.strokeStyle = 'rgba(5,10,10,.18)';
    ctx.lineWidth = 1.4;
    for (let i = 1; i < 5; i++) {
      const yy = by + (h * i) / 5;
      ctx.beginPath();
      ctx.moveTo(bx - w, yy);
      ctx.quadraticCurveTo(bx, yy + 8, bx + w + drift, yy - 4);
      ctx.stroke();
    }
  }

  // The beach's supporting cliff, kept dark so the sand reads bright.
  for (const p of game.level.platforms) {
    if (p.id !== 'beach') continue;
    const rand = mulberry32(hashStr(p.id + 'cliff'));
    const depth = 820;
    const x1 = p.x1, y1 = p.y1, x2 = p.x2, y2 = p.y2;
    const midx = (x1 + x2) / 2, midy = (y1 + y2) / 2;
    const spread = 240;
    const left = { x: x1 - spread + (rand() - .5) * 40, y: y1 + depth * .55 };
    const middle = { x: midx + (rand() - .5) * 80, y: midy + depth };
    const right = { x: x2 + spread + (rand() - .5) * 40, y: y2 + depth * .62 };
    const pts = [
      { x: x1 + 2, y: y1 + 8 }, { x: x2 - 2, y: y2 + 8 },
      { x: x2 + 120, y: y2 + depth * .3 }, right, middle, left,
      { x: x1 - 120, y: y1 + depth * .3 },
    ];
    poly(ctx, pts);
    const g = ctx.createLinearGradient(0, y1, 0, midy + depth);
    g.addColorStop(0, '#6e5636');
    g.addColorStop(.3, '#4b3a25');
    g.addColorStop(.72, '#2d2418');
    g.addColorStop(1, '#17140f');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    poly(ctx, pts);
    ctx.clip();
    const r2 = mulberry32(hashStr(p.id + 'strata'));
    for (let i = 0; i < 24; i++) {
      const yy = y1 + 30 + i * 34 + r2() * 18;
      ctx.strokeStyle = `rgba(12,10,7,${.1 + r2() * .16})`;
      ctx.lineWidth = 1 + r2() * 4;
      ctx.beginPath();
      ctx.moveTo(x1 - 220, yy);
      ctx.bezierCurveTo(midx - 300, yy + 18, midx + 200, yy - 14, x2 + 260, yy + 8);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const bx = x1 - 100 + r2() * (x2 - x1 + 220);
      const by = y1 + 80 + r2() * depth * .7;
      const r = 22 + r2() * 70;
      ctx.fillStyle = i % 2 ? 'rgba(255,226,180,.03)' : 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(bx, by, r, r * .55, r2() * 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // boulders at the tide line
    const br = mulberry32(hashStr(p.id + 'boulders'));
    for (let i = 0; i < 9; i++) {
      const bx = x1 - 140 + br() * (x2 - x1 + 280);
      const by = y1 + 44 + br() * 80;
      const r = 18 + br() * 44;
      ctx.fillStyle = i % 3 === 0 ? '#3b3226' : '#453a2b';
      blob(ctx, bx, by, r, r * .55, br, 7, .22);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,225,175,.06)';
      ctx.beginPath();
      ctx.ellipse(bx - r * .15, by - r * .3, r * .5, r * .18, -.2, 0, TAU);
      ctx.fill();
    }
  }
}

/* ── ledge drawing ─────────────────────────────────────────── */

function drawBeach(ctx, p, time) {
  const L = p.len, T = p.t;
  const rand = mulberry32(hashStr(p.id + 'beachart'));

  // dunes behind the walkable line (drawn first, so the pirate stands in front)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-L / 2, -T / 2 + 2);
  let x = -L / 2;
  let i = 0;
  while (x < L / 2) {
    const w = 110 + rand() * 190;
    const h = 7 + rand() * 28;
    ctx.quadraticCurveTo(x + w * .5, -T / 2 - h, x + w, -T / 2 + 2);
    x += w;
    i++;
  }
  ctx.lineTo(L / 2, -T / 2 + 4);
  ctx.lineTo(-L / 2, -T / 2 + 4);
  ctx.closePath();
  const dg = ctx.createLinearGradient(0, -T / 2 - 34, 0, -T / 2 + 4);
  dg.addColorStop(0, '#c6a066');
  dg.addColorStop(1, '#b08a54');
  ctx.fillStyle = dg;
  ctx.fill();
  ctx.restore();

  // beach body: a bright dune lip over a dark, eroded sand cliff
  const top = -T / 2;
  const g = ctx.createLinearGradient(0, top, 0, top + 330);
  g.addColorStop(0, '#efd9a2');
  g.addColorStop(.035, '#dcbb7d');
  g.addColorStop(.1, '#c49a61');
  g.addColorStop(.24, '#a87c4a');
  g.addColorStop(.48, '#88633d');
  g.addColorStop(.75, '#654a2e');
  g.addColorStop(1, '#443120');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-L / 2 + 2, top);
  ctx.lineTo(L / 2 - 2, top);
  ctx.lineTo(L / 2 - 22, top + T * .82);
  ctx.quadraticCurveTo(L / 2 - 90, top + T * 1.08, L / 2 - 240, top + T);
  ctx.lineTo(-L / 2 + 260, top + T);
  ctx.quadraticCurveTo(-L / 2 + 90, top + T * 1.04, -L / 2 + 26, top + T * .8);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.clip();
  // shadow cast by the lip onto the cliff face
  const cast = ctx.createLinearGradient(0, top + 2, 0, top + 90);
  cast.addColorStop(0, 'rgba(26,18,10,.3)');
  cast.addColorStop(1, 'rgba(26,18,10,0)');
  ctx.fillStyle = cast;
  ctx.fillRect(-L / 2, top + 2, L, 92);
  // eroded sand strata
  for (let i = 0; i < 22; i++) {
    const y = top + 24 + i * 13 + Math.sin(i * 2.7) * 7;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,232,186,.09)' : 'rgba(52,36,20,.14)';
    ctx.lineWidth = .8 + (i % 4) * .6;
    ctx.beginPath();
    ctx.moveTo(-L / 2, y);
    for (let xx = -L / 2; xx < L / 2; xx += 130) {
      ctx.quadraticCurveTo(xx + 65, y + Math.sin(xx * .013 + i) * 5, xx + 130, y);
    }
    ctx.stroke();
  }
  // dry sand runs off the lip in fine vertical veins
  const sr = mulberry32(7788);
  for (let i = 0; i < 26; i++) {
    const sx = -L / 2 + sr() * L;
    const len = 30 + sr() * 130;
    ctx.strokeStyle = sr() > .5 ? 'rgba(228,197,144,.13)' : 'rgba(74,50,28,.16)';
    ctx.lineWidth = .8 + sr() * 1.6;
    ctx.beginPath();
    ctx.moveTo(sx, top + 4);
    ctx.bezierCurveTo(sx + 5, top + len * .4, sx - 6, top + len * .7, sx + 2, top + len);
    ctx.stroke();
  }
  // roots and vines let go of the dune lip
  const vr = mulberry32(2321);
  for (let i = 0; i < 12; i++) {
    const vx = -L / 2 + vr() * L;
    const len = 36 + vr() * 140;
    ctx.strokeStyle = 'rgba(79,58,34,.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(vx, top + 1);
    ctx.bezierCurveTo(vx + 10, top + len * .3, vx - 8, top + len * .65, vx + 5, top + len);
    ctx.stroke();
  }
  // wet sand / surf zone at the bottom
  const wet = ctx.createLinearGradient(0, top + T * .7, 0, top + T);
  wet.addColorStop(0, 'rgba(60,84,74,0)');
  wet.addColorStop(.55, 'rgba(58,80,72,.22)');
  wet.addColorStop(1, 'rgba(45,68,67,.38)');
  ctx.fillStyle = wet;
  ctx.fillRect(-L / 2, top + T * .62, L, T * .4);
  // pebbles / shells / footprints on the dry sand
  for (let i = 0; i < 70; i++) {
    const px = (rand() - .5) * L;
    const py = top + 6 + rand() * 36;
    if (i % 11 === 0) {
      ctx.fillStyle = 'rgba(244,236,214,.5)';
      ctx.beginPath();
      ctx.ellipse(px, py, 2.2 + rand() * 2.4, 1.2 + rand() * 1.2, rand() * 3, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,240,205,.2)' : 'rgba(88,64,38,.3)';
      ctx.beginPath();
      ctx.ellipse(px, py, .7 + rand() * 1.8, .4 + rand() * 1, rand() * 3, 0, TAU);
      ctx.fill();
    }
  }
  // faint footprints leading toward the sign
  const fr = mulberry32(8812);
  for (let i = 0; i < 9; i++) {
    const fx = -520 + i * 80 + fr() * 30;
    const fy = top + 5 + i * 1.6;
    ctx.fillStyle = 'rgba(94,66,38,.16)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 3.2, 5.4, .2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(fx + 12, fy + 7, 3.0, 5.0, .1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // sparse dune grass on the walkable lip
  const gr = mulberry32(3391);
  for (let i = 0; i < 46; i++) {
    const gx = -L / 2 + gr() * L;
    const h = 6 + gr() * 18;
    const lean = (gr() - .5) * 9;
    ctx.strokeStyle = `rgba(${110 + Math.floor(gr() * 40)},${132 + Math.floor(gr() * 30)},${70 + Math.floor(gr() * 30)},.72)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, top + 1);
    ctx.quadraticCurveTo(gx + lean * .4, top - h * .6, gx + lean, top - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx, top + 1);
    ctx.quadraticCurveTo(gx - lean * .5, top - h * .45, gx - lean * 1.1, top - h * .7);
    ctx.stroke();
  }

  // bright sunlit dune lip
  ctx.strokeStyle = 'rgba(255,238,196,.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-L / 2 + 4, top + 1);
  ctx.lineTo(L / 2 - 4, top + 1);
  ctx.stroke();
  // tide foam where the sea meets the sand
  const foam = ctx.createLinearGradient(0, top + T * .84, 0, top + T);
  foam.addColorStop(0, 'rgba(214,236,222,0)');
  foam.addColorStop(1, 'rgba(214,236,222,.28)');
  ctx.fillStyle = foam;
  ctx.fillRect(-L / 2, top + T * .84, L, T * .16);

  // beach rocks at both ends
  const er = mulberry32(6161);
  for (const side of [-1, 1]) {
    const ex = side * (L / 2 - 60);
    for (let i = 0; i < 4; i++) {
      const r = 14 + er() * 26;
      const bx = ex + side * (er() * 40 - 10);
      const by = top + 8 + er() * 40;
      ctx.fillStyle = i % 2 ? '#53483a' : '#443b30';
      blob(ctx, bx, by, r, r * .6, er, 7, .28);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,230,180,.12)';
      ctx.beginPath();
      ctx.ellipse(bx - r * .2, by - r * .35, r * .55, r * .2, 0, 0, TAU);
      ctx.fill();
    }
  }
  void time;
}
function rhash(rand) { return rand(); }

function drawLedge(ctx, p, st, time) {
  const L = p.len, T = p.t;
  const tex = p.tex;
  const shape = p.shape;

  // cast shadow on the cliff behind, thrown down and inland
  ctx.save();
  ctx.translate(16, 20);
  poly(ctx, shape);
  ctx.fillStyle = 'rgba(3,9,11,.18)';
  ctx.fill();
  ctx.restore();

  // soft contact shadow under the ledge
  ctx.save();
  ctx.fillStyle = 'rgba(4,9,10,.18)';
  ctx.beginPath();
  ctx.ellipse(0, T * .58, L * .46, T * .22, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  poly(ctx, shape);
  const g = ctx.createLinearGradient(0, -T / 2, 0, T * .82);
  g.addColorStop(0, st.top);
  g.addColorStop(.16, st.base);
  g.addColorStop(.62, st.base);
  g.addColorStop(1, st.dark);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  poly(ctx, shape);
  ctx.clip();

  // ambient shade under the walkable lip
  const ao = ctx.createLinearGradient(0, -T / 2, 0, -T / 2 + Math.min(T * .5, 46));
  ao.addColorStop(0, 'rgba(12,15,15,.28)');
  ao.addColorStop(1, 'rgba(12,15,15,0)');
  ctx.fillStyle = ao;
  ctx.fillRect(-L / 2, -T / 2, L, Math.min(T * .5, 46));

  // broad rock planes, kept subtle so they describe form rather than crumple
  for (const f of tex.facets) {
    ctx.fillStyle = f.warm ? `rgba(255,224,170,${f.a})` : `rgba(0,0,0,${f.a})`;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x + f.w, f.y + f.h * .14);
    ctx.lineTo(f.x + f.w * .66, f.y + f.h);
    ctx.lineTo(f.x - f.w * .12, f.y + f.h * .68);
    ctx.closePath();
    ctx.fill();
  }
  // sedimentary bands
  for (const s of tex.strata) {
    ctx.fillStyle = `rgba(12,14,12,${s.a})`;
    ctx.beginPath();
    ctx.moveTo(-L / 2, s.y);
    ctx.bezierCurveTo(-L * .2, s.y - 3, L * .2, s.y + 4, L / 2, s.y);
    ctx.lineTo(L / 2, s.y + s.h);
    ctx.bezierCurveTo(L * .2, s.y + 4 + s.h, -L * .2, s.y - 3 + s.h, -L / 2, s.y + s.h);
    ctx.closePath();
    ctx.fill();
  }

  if (p.type === 'sand') {
    // (the beach uses its own painter)
  } else if (p.type === 'wood' || p.type === 'deck') {
    ctx.strokeStyle = withA(st.texture, .65);
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 10; i++) {
      const y = -T / 2 + (i + .5) * (T / 10.4);
      ctx.beginPath();
      ctx.moveTo(-L / 2, y);
      ctx.bezierCurveTo(-L / 4, y - 2.5, L / 4, y + 2.5, L / 2, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(30,17,7,.5)';
    for (const s of tex.seams) {
      ctx.beginPath();
      ctx.moveTo(s, -T / 2);
      ctx.lineTo(s + (p.seed - .5) * 6, T / 2);
      ctx.stroke();
    }
    for (const n of tex.nails) {
      ctx.fillStyle = 'rgba(38,30,22,.8)';
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(210,190,150,.22)';
      ctx.beginPath(); ctx.arc(n.x - .4, n.y - .5, .7, 0, TAU); ctx.fill();
    }
    if (p.type === 'deck') {
      for (const sx of [-L * .36, L * .36]) {
        ctx.fillStyle = 'rgba(38,36,32,.72)';
        ctx.fillRect(sx - 3, -T / 2, 6, T);
        ctx.fillStyle = 'rgba(160,155,140,.16)';
        ctx.fillRect(sx - 3, -T / 2, 1.4, T);
      }
    }
  } else if (p.type === 'moss') {
    // dark stone splits
    ctx.strokeStyle = 'rgba(18,28,16,.4)';
    ctx.lineWidth = 1.2;
    for (const c of tex.cracks) {
      ctx.beginPath();
      ctx.moveTo(c[0].x, c[0].y);
      for (let i = 1; i < c.length; i++) ctx.lineTo(c[i].x, c[i].y);
      ctx.stroke();
    }
    // mossy top cap with a ragged lower edge
    const capH = Math.min(24, T * .3);
    ctx.fillStyle = 'rgba(92,118,60,.95)';
    ctx.beginPath();
    ctx.moveTo(-L / 2, -T / 2);
    ctx.lineTo(L / 2, -T / 2);
    let cx = L / 2;
    while (cx > -L / 2) {
      const w = 26 + Math.abs(Math.sin(cx * .07)) * 26;
      ctx.quadraticCurveTo(cx - w * .5, -T / 2 + capH * (1.1 + Math.sin(cx * .13) * .35), cx - w, -T / 2 + capH * .5);
      cx -= w;
    }
    ctx.closePath();
    ctx.fill();
    // bright moss highlight
    ctx.fillStyle = 'rgba(168,196,104,.18)';
    ctx.fillRect(-L / 2, -T / 2, L, Math.min(10, T * .16));
  } else if (p.type === 'stone' || p.type === 'gold') {
    // masonry courses, chipped and stained
    for (const b of tex.blocks) {
      ctx.fillStyle = 'rgba(22,20,17,.16)';
      ctx.fillRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
      ctx.fillStyle = p.type === 'gold' ? 'rgba(196,164,96,.05)' : 'rgba(220,212,186,.04)';
      ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h * .34);
    }
    ctx.strokeStyle = 'rgba(26,24,20,.36)';
    ctx.lineWidth = 1.2;
    for (const c of tex.cracks) {
      ctx.beginPath();
      ctx.moveTo(c[0].x, c[0].y);
      for (let i = 1; i < c.length; i++) ctx.lineTo(c[i].x, c[i].y);
      ctx.stroke();
    }
    if (p.type === 'gold') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const v of tex.veins) {
        ctx.strokeStyle = 'rgba(255,208,108,.36)';
        ctx.lineWidth = 1.6 + v.w;
        ctx.beginPath();
        ctx.moveTo(v.x0, v.y);
        ctx.bezierCurveTo(v.x0 + 10, v.y - 6, v.x1 - 10, v.y + 6, v.x1, v.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    // craggy rock
    ctx.strokeStyle = withA(st.texture, .75);
    ctx.lineWidth = 1.2;
    for (const c of tex.cracks) {
      ctx.beginPath();
      ctx.moveTo(c[0].x, c[0].y);
      for (let i = 1; i < c.length; i++) ctx.lineTo(c[i].x, c[i].y);
      ctx.stroke();
    }
    for (const l of tex.lichen) {
      ctx.fillStyle = l.a > .09 ? `rgba(139,158,102,${l.a})` : `rgba(226,214,180,${l.a})`;
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, l.r, l.r * .45, l.x * .02, 0, TAU);
      ctx.fill();
    }
  }

  // boulders embedded in the face
  if (p.type === 'rock' || p.type === 'moss' || p.type === 'stone') {
    for (const b of tex.embedded) {
      const bg = ctx.createLinearGradient(0, b.y - b.r, 0, b.y + b.r);
      bg.addColorStop(0, 'rgba(255,226,176,.09)');
      bg.addColorStop(.55, 'rgba(30,32,28,.06)');
      bg.addColorStop(1, 'rgba(0,0,0,.2)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * .58, b.a * .6 - .3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * .58, b.a * .6 - .3, 0, TAU);
      ctx.stroke();
    }
  }

  // speckle grain
  ctx.fillStyle = withA(st.texture, .35);
  for (const s of tex.specks) {
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // deep shadow along the broken underside
  const sh = ctx.createLinearGradient(0, T * .3, 0, T);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,.4)');
  ctx.fillStyle = sh;
  ctx.fillRect(-L / 2, T * .3, L, T * .8);

  // thick lit shelf along the walkable top
  const capH = Math.min(9, T * .18);
  const capG = ctx.createLinearGradient(0, -T / 2, 0, -T / 2 + capH);
  capG.addColorStop(0, st.top);
  capG.addColorStop(.65, st.base);
  capG.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = capG;
  ctx.fillRect(-L / 2, -T / 2, L, capH);
  ctx.strokeStyle = 'rgba(255,232,182,.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-L / 2, -T / 2 + 1);
  ctx.lineTo(L / 2, -T / 2 + 1);
  ctx.stroke();

  ctx.restore();

  // hanging vines from mossy rock
  if (p.type === 'moss' || p.type === 'stone') {
    for (const v of tex.vines) {
      if (v.a < .45) continue;
      const len = v.len;
      ctx.strokeStyle = p.type === 'moss' ? 'rgba(68,92,50,.62)' : 'rgba(66,78,52,.4)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(v.x, T * .7);
      ctx.bezierCurveTo(v.x + v.lean, T * .7 + len * .35, v.x - v.lean, T * .7 + len * .7, v.x + v.lean * .5, T * .7 + len);
      ctx.stroke();
    }
  }

  // grass / weed silhouettes above the lip
  if (p.type === 'moss' || p.id === 'beach') {
    ctx.strokeStyle = p.type === 'moss' ? 'rgba(140,170,96,.95)' : 'rgba(126,142,78,.7)';
    ctx.lineWidth = 1.5;
    for (const t of tex.tufts) {
      ctx.beginPath();
      ctx.moveTo(t.x, -T / 2 + 1);
      ctx.quadraticCurveTo(t.x + t.lean * .4, -T / 2 - t.h * .6, t.x + t.lean, -T / 2 - t.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(t.x, -T / 2 + 1);
      ctx.quadraticCurveTo(t.x - t.lean * .6, -T / 2 - t.h * .5, t.x - t.lean * 1.2, -T / 2 - t.h * .7);
      ctx.stroke();
    }
  }

  // small boulders on the shoulder
  for (const b of tex.boulders) {
    ctx.fillStyle = p.type === 'moss' ? '#4c583a' : (p.type === 'gold' ? '#6e5a32' : '#4c473c');
    ctx.beginPath();
    ctx.ellipse(b.x, -T / 2 - b.r * .25, b.r, b.r * .55, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,205,.12)';
    ctx.beginPath();
    ctx.ellipse(b.x - b.r * .2, -T / 2 - b.r * .45, b.r * .5, b.r * .24, 0, 0, TAU);
    ctx.fill();
  }

  // sunlit lip + warm rim light from the sunset side
  ctx.lineCap = 'round';
  ctx.strokeStyle = st.edge;
  ctx.lineWidth = p.type === 'gold' ? 3.4 : 2.2;
  ctx.globalAlpha = p.type === 'gold' ? .95 : .68;
  ctx.beginPath();
  ctx.moveTo(-L / 2 + 3, -T / 2 + 1);
  ctx.lineTo(L / 2 - 3, -T / 2 + 1);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,226,166,.34)';
  ctx.lineWidth = .8;
  ctx.beginPath();
  ctx.moveTo(-L / 2 + 5, -T / 2 + .2);
  ctx.lineTo(L / 2 - 5, -T / 2 + .2);
  ctx.stroke();

  // outline keeps the silhouette crisp against the cliff
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.lineWidth = 1;
  poly(ctx, shape);
  ctx.stroke();
}

export function drawPlatforms(ctx, game, cam) {
  const z = cam.zoom;
  const viewW = game.renderer.w / z, viewH = game.renderer.h / z;
  const cullL = cam.x - viewW / 2 - 320, cullR = cam.x + viewW / 2 + 320;
  const cullT = cam.y - viewH / 2 - 320, cullB = cam.y + viewH / 2 + 320;

  for (const p of game.level.platforms) {
    if (p.cx < cullL || p.cx > cullR || p.cy < cullT || p.cy > cullB) continue;
    const st = TYPE_STYLE[p.type] || TYPE_STYLE.rock;
    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.rotate(p.angle);

    if (p.id === 'beach') {
      drawBeach(ctx, p, game.time);
    } else {
      drawLedge(ctx, p, st, game.time);
    }

    // fallen log: extra bark, knots and end grain
    if (p.log) {
      const L = p.len, T = p.t;
      ctx.save();
      rr(ctx, -L / 2, -T / 2, L, T, Math.min(10, T * .4));
      ctx.clip();
      ctx.strokeStyle = 'rgba(43,26,12,.62)';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 7; i++) {
        const y = -T / 2 + 2 + i * (T / 7);
        ctx.beginPath();
        ctx.moveTo(-L / 2, y);
        ctx.bezierCurveTo(-L * .2, y - 3, L * .2, y + 3, L / 2, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(193,146,92,.32)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = -T / 2 + 3 + i * (T / 5.5);
        ctx.beginPath();
        ctx.moveTo(-L / 2, y);
        ctx.bezierCurveTo(-L * .2, y - 2, L * .2, y + 2, L / 2, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(77,101,58,.4)';
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.ellipse(-L / 2 + 20 + i * (L / 8), T / 2 - 4, 9, 2.4, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#7a552f';
      ctx.beginPath();
      ctx.ellipse(-L / 2 + 5, 0, 5, T / 2 - 1, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(52,33,16,.7)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(-L / 2 + 5, 0, 1.6 * i, (T / 2 - 2) * (i / 3.4), 0, 0, TAU);
        ctx.stroke();
      }
    }

    // rope wraps on wreck timber
    if (p.ship && p.type === 'wood') {
      ctx.strokeStyle = 'rgba(168,140,92,.5)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const x = -p.len / 2 + 14 + i * 5;
        ctx.beginPath();
        ctx.moveTo(x, -p.t / 2);
        ctx.lineTo(x + 3, p.t / 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

/* ── the great sea-stack ───────────────────────────────────── */

export function drawSeaStack(ctx, game, time) {
  if (!game._stack) {
    const rand = mulberry32(91827);
    const pts = [];
    for (let y = 620; y >= -10800; y -= 58) {
      const k = clamp((620 - y) / 11420, 0, 1);
      const ease = k * k * (3 - 2 * k);
      const cx = 250 + 180 * Math.sin(y / 1350) + 80 * Math.sin(y / 460 + 1.2);
      const half = lerp(1180, 650, ease) + Math.sin(y / 230) * 58 + (rand() - .5) * 34;
      // occasional buttress juts out of the sunset-facing edge
      const jut = (rand() > .82 ? 34 + rand() * 90 : 0) + (rand() > .94 ? 40 : 0);
      const left = cx - half - jut + (rand() - .5) * 16;
      const right = cx + half + (rand() - .5) * 18;
      pts.push({ y, cx, half, left, right, jut, k });
    }
    game._stack = pts;

    // large features, generated once
    const r2 = mulberry32(55231);
    game._stackDetail = {
      facets: Array.from({ length: 120 }, () => {
        const y = 500 - r2() * 11000;
        const p = pts[clamp(Math.round((620 - y) / 58), 0, pts.length - 1)];
        const x = p ? p.left + r2() * (p.right - p.left) : -400 + r2() * 1200;
        return {
          x, y, w: 110 + r2() * 460, h: 180 + r2() * 720,
          a: .028 + r2() * .06, warm: r2() > .55,
        };
      }),
      strata: Array.from({ length: 90 }, () => ({
        y: 560 - r2() * 11200,
        w: 1.5 + r2() * 9,
        a: .06 + r2() * .12,
        bend: 20 + r2() * 70,
      })),
      buttresses: Array.from({ length: 11 }, (_, i) => ({
        y: 380 - i * 980 - r2() * 420,
        w: 90 + r2() * 260,
        h: 300 + r2() * 820,
        a: .18 + r2() * .2,
      })),
      caves: Array.from({ length: 6 }, () => ({
        y: 200 - r2() * 10200,
        w: 34 + r2() * 90,
        h: 20 + r2() * 54,
        a: .5 + r2() * .3,
      })),
      moss: Array.from({ length: 170 }, () => {
        const y = 300 - r2() * 10800;
        const p = pts[clamp(Math.round((620 - y) / 58), 0, pts.length - 1)];
        const x = p ? p.left + r2() * (p.right - p.left) : -300 + r2() * 1000;
        return { x, y, r: 10 + r2() * 70, a: .035 + r2() * .09, green: r2() > .35 };
      }),
      shelves: Array.from({ length: 38 }, () => {
        const y = 480 - r2() * 11200;
        return {
          y,
          len: 120 + r2() * 420,
          drop: 18 + r2() * 80,
          a: .12 + r2() * .14,
        };
      }),
      boulders: Array.from({ length: 40 }, () => {
        const y = 420 - r2() * 11000;
        const p = pts[clamp(Math.round((620 - y) / 58), 0, pts.length - 1)];
        const x = p ? p.left + 60 + r2() * Math.max(120, p.right - p.left - 120) : -300 + r2() * 1000;
        return { x, y, rx: 14 + r2() * 58, ry: 9 + r2() * 32, a: .06 + r2() * .12, rot: r2() * 3 };
      }),
      wide: Array.from({ length: 30 }, () => {
        const y = 450 - r2() * 11100;
        const p = pts[clamp(Math.round((620 - y) / 58), 0, pts.length - 1)];
        const left = p ? p.left : -800;
        const right = p ? p.right : 1200;
        return {
          y,
          x: left + 80 + r2() * Math.max(80, right - left - 260),
          len: 160 + r2() * 460,
          drop: 28 + r2() * 90,
          a: .13 + r2() * .16,
        };
      }),
      gullies: Array.from({ length: 14 }, () => {
        const y = 380 - r2() * 10700;
        const p = pts[clamp(Math.round((620 - y) / 58), 0, pts.length - 1)];
        const left = p ? p.left : -800;
        const right = p ? p.right : 1200;
        return {
          x: left + 100 + r2() * Math.max(100, right - left - 300),
          y,
          w: 40 + r2() * 120,
          h: 300 + r2() * 700,
          a: .08 + r2() * .12,
        };
      }),
      pillars: Array.from({ length: 24 }, (_, i) => {
        const y = 420 - i * 470 - r2() * 220;
        const p = pts[clamp(Math.round((620 - y) / 58), 0, pts.length - 1)];
        const left = p ? p.left : -800;
        const right = p ? p.right : 1200;
        return {
          x: left + 70 + r2() * Math.max(80, right - left - 380),
          y,
          w: 100 + r2() * 210,
          h: 420 + r2() * 900,
          a: .1 + r2() * .14,
        };
      }),
      cracks: Array.from({ length: 30 }, () => {
        const y = 420 - r2() * 10800;
        const p = pts[clamp(Math.round((620 - y) / 58), 0, pts.length - 1)];
        return {
          x: p ? p.left + 30 + r2() * 320 : -600 + r2() * 400,
          y,
          h: 120 + r2() * 520,
          lean: (r2() - .5) * 90,
          a: .1 + r2() * .12,
        };
      }),
      spurs: Array.from({ length: 36 }, (_, i) => {
        const y = 480 - i * 322 - r2() * 160;
        return { y, len: 45 + r2() * 170, drop: 18 + r2() * 54, a: .55 + r2() * .4 };
      }),
      vines: Array.from({ length: 54 }, () => {
        const idx = Math.floor(r2() * (pts.length - 30));
        const p = pts[idx];
        return {
          x: p.left + 20 + r2() * (p.right - p.left),
          y: p.y,
          len: 30 + r2() * 190,
          lean: (r2() - .5) * 18,
        };
      }),
    };
  }

  const pts = game._stack;
  const D = game._stackDetail;

  /* far, hazy sister cliff behind and to the right */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].left - 260, pts[0].y + 40);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].left - 260 + Math.sin(i * .7) * 40, pts[i].y + 40);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].right + 300, pts[i].y + 40);
  ctx.closePath();
  ctx.fillStyle = 'rgba(87,120,116,.3)';
  ctx.fill();
  ctx.restore();

  /* main mass */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].left, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].left, pts[i].y);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].right, pts[i].y);
  ctx.closePath();

  const g = ctx.createLinearGradient(-500, 600, 800, -10800);
  g.addColorStop(0, '#4b4c38');
  g.addColorStop(.14, '#37463a');
  g.addColorStop(.32, '#2d3f3d');
  g.addColorStop(.55, '#26383f');
  g.addColorStop(.78, '#1f3040');
  g.addColorStop(1, '#293b4c');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();

  // warm sunset bounce on the seaward flank
  const warm = ctx.createLinearGradient(-980, 0, 340, 0);
  warm.addColorStop(0, 'rgba(255,178,104,.24)');
  warm.addColorStop(.24, 'rgba(238,150,86,.1)');
  warm.addColorStop(.6, 'rgba(200,120,80,.03)');
  warm.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(-1100, -10900, 2000, 11600);

  // cross-light: lit seaward edge, deep shadow inland
  const cross = ctx.createLinearGradient(-760, 0, 1000, 0);
  cross.addColorStop(0, 'rgba(255,186,112,.1)');
  cross.addColorStop(.18, 'rgba(24,34,34,0)');
  cross.addColorStop(.55, 'rgba(8,16,20,.16)');
  cross.addColorStop(1, 'rgba(2,8,13,.42)');
  ctx.fillStyle = cross;
  ctx.fillRect(-1100, -10900, 2200, 11600);

  // chunky facets
  for (const f of D.facets) {
    ctx.fillStyle = f.warm
      ? `rgba(255,220,164,${f.a})`
      : `rgba(3,9,11,${f.a + .05})`;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x + f.w, f.y + f.h * .11);
    ctx.lineTo(f.x + f.w * .7, f.y + f.h);
    ctx.lineTo(f.x - f.w * .1, f.y + f.h * .62);
    ctx.closePath();
    ctx.fill();
  }

  // massive shadowed buttresses along the face
  for (const b of D.buttresses) {
    const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    bg.addColorStop(0, `rgba(2,7,9,${b.a * .5})`);
    bg.addColorStop(.65, `rgba(2,7,9,${b.a})`);
    bg.addColorStop(1, 'rgba(2,7,9,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-700, b.y);
    ctx.lineTo(-700 + b.w * .4, b.y + b.h * .18);
    ctx.lineTo(-700 + b.w, b.y + b.h);
    ctx.lineTo(-700 - b.w * .2, b.y + b.h * .86);
    ctx.closePath();
    ctx.fill();
    // lit edge of the buttress
    ctx.strokeStyle = `rgba(255,205,140,${b.a * .7})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-700, b.y);
    ctx.quadraticCurveTo(-700 + b.w * .35, b.y + b.h * .35, -700 + b.w, b.y + b.h);
    ctx.stroke();
  }

  // vertical erosion gullies
  for (const g of D.gullies) {
    const gg = ctx.createLinearGradient(g.x, 0, g.x + g.w, 0);
    gg.addColorStop(0, 'rgba(3,8,10,0)');
    gg.addColorStop(.45, `rgba(3,8,10,${g.a})`);
    gg.addColorStop(.7, `rgba(3,8,10,${g.a * .8})`);
    gg.addColorStop(1, 'rgba(3,8,10,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = `rgba(255,198,132,${g.a * .5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.x + g.w * .82, g.y);
    ctx.quadraticCurveTo(g.x + g.w * .92, g.y + g.h * .5, g.x + g.w * .7, g.y + g.h);
    ctx.stroke();
  }

  // fluted pillars: the cliff's vertical architecture
  for (const p of D.pillars) {
    const pg = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    pg.addColorStop(0, `rgba(255,200,138,${p.a * .45})`);
    pg.addColorStop(.16, 'rgba(28,38,36,0)');
    pg.addColorStop(.55, `rgba(5,12,14,${p.a})`);
    pg.addColorStop(1, `rgba(3,9,12,${p.a * 1.15})`);
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.w * .82, p.y + 24);
    ctx.lineTo(p.x + p.w, p.y + p.h);
    ctx.lineTo(p.x + p.w * .3, p.y + p.h * .92);
    ctx.lineTo(p.x - 12, p.y + p.h * .65);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,198,130,${p.a * .5})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x - 8, p.y + p.h * .4, p.x - 12, p.y + p.h * .65);
    ctx.stroke();
    // horizontal notches
    ctx.strokeStyle = 'rgba(3,9,10,.3)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 6; i++) {
      const yy = p.y + (p.h * i) / 6;
      ctx.beginPath();
      ctx.moveTo(p.x - 4, yy);
      ctx.quadraticCurveTo(p.x + p.w * .5, yy + 10, p.x + p.w, yy - 4);
      ctx.stroke();
    }
  }

  // broad shelves inside the face give the wall its scale
  for (const s of D.wide) {
    ctx.fillStyle = `rgba(3,9,10,${s.a})`;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.len, s.y + 9);
    ctx.lineTo(s.x + s.len * .88, s.y + s.drop);
    ctx.lineTo(s.x + s.len * .2, s.y + s.drop * .7);
    ctx.lineTo(s.x + 4, s.y + s.drop * .4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,196,128,${s.a * .55})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.len, s.y + 9);
    ctx.stroke();
  }

  // horizontal rock shelves pushing out of the seaward face
  for (const s of D.shelves) {
    const idx = clamp(Math.round((620 - s.y) / 58), 0, pts.length - 1);
    const p = pts[idx];
    if (!p) continue;
    const x0 = p.left + 5;
    const y0 = p.y;
    ctx.fillStyle = `rgba(3,9,10,${s.a})`;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + s.len, y0 + 9);
    ctx.lineTo(x0 + s.len * .82, y0 + s.drop);
    ctx.lineTo(x0 + 8, y0 + s.drop * .68);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255,200,130,${s.a * .8})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + s.len, y0 + 9);
    ctx.stroke();
  }

  // boulders and overhangs embedded in the face
  for (const b of D.boulders) {
    const bg = ctx.createLinearGradient(0, b.y - b.ry, 0, b.y + b.ry);
    bg.addColorStop(0, `rgba(255,214,164,${b.a * .8})`);
    bg.addColorStop(.5, `rgba(60,72,62,${b.a * .35})`);
    bg.addColorStop(1, `rgba(0,0,0,${b.a * 1.2})`);
    ctx.fillStyle = bg;
    const br = mulberry32(Math.round(b.x * 7 + b.y));
    blob(ctx, b.x, b.y, b.rx, b.ry, br, 8, .24);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,206,148,${b.a * .8})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.rx * .86, b.ry * .82, b.rot, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }

  // deep vertical fractures
  for (const c of D.cracks) {
    ctx.strokeStyle = `rgba(2,7,9,${c.a})`;
    ctx.lineWidth = 2 + c.a * 12;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.bezierCurveTo(c.x + c.lean * .3, c.y + c.h * .3, c.x - c.lean * .4, c.y + c.h * .65, c.x + c.lean, c.y + c.h);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,210,150,${c.a * .28})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x + 2, c.y);
    ctx.bezierCurveTo(c.x + c.lean * .3 + 2, c.y + c.h * .3, c.x - c.lean * .4 + 2, c.y + c.h * .65, c.x + c.lean + 2, c.y + c.h);
    ctx.stroke();
  }

  // horizontal strata
  for (const s of D.strata) {
    ctx.strokeStyle = `rgba(4,9,10,${s.a})`;
    ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(-1000, s.y);
    ctx.bezierCurveTo(-380, s.y + s.bend, 300, s.y - s.bend * .65, 1200, s.y + s.bend * .4);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,226,180,${s.a * .16})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-1000, s.y - s.w * .6);
    ctx.bezierCurveTo(-380, s.y + s.bend - s.w * .6, 300, s.y - s.bend * .65 - s.w * .6, 1200, s.y + s.bend * .4 - s.w * .6);
    ctx.stroke();
  }

  // moss and lichen bands clinging to ledges
  for (const m of D.moss) {
    ctx.fillStyle = m.green
      ? `rgba(92,120,62,${m.a})`
      : `rgba(188,178,140,${m.a * .8})`;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.r, m.r * .32, Math.sin(m.x) * .4, 0, TAU);
    ctx.fill();
  }

  // cave mouths
  for (const c of D.caves) {
    const p = pts[clamp(Math.round((620 - c.y) / 58), 0, pts.length - 1)];
    if (!p) continue;
    const cx2 = p.left + (p.right - p.left) * .3;
    const cg = ctx.createRadialGradient(cx2, c.y, 2, cx2, c.y, c.w);
    cg.addColorStop(0, `rgba(1,4,6,${c.a})`);
    cg.addColorStop(.7, `rgba(2,7,9,${c.a * .55})`);
    cg.addColorStop(1, 'rgba(2,7,9,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx2, c.y, c.w, c.h, 0, 0, TAU);
    ctx.fill();
  }

  // a thin waterfall fed by the high springs
  const wfY = -4380;
  const wf = ctx.createLinearGradient(0, wfY, 0, wfY + 620);
  wf.addColorStop(0, 'rgba(196,224,216,.24)');
  wf.addColorStop(.5, 'rgba(176,212,206,.13)');
  wf.addColorStop(1, 'rgba(176,212,206,0)');
  ctx.fillStyle = wf;
  ctx.fillRect(-120, wfY, 7, 620);
  ctx.fillStyle = 'rgba(214,236,226,.16)';
  ctx.fillRect(-118, wfY, 2, 580);
  ctx.beginPath();
  ctx.ellipse(-117, wfY + 620, 26, 9, 0, 0, TAU);
  ctx.fill();

  // top fog / altitude haze
  const fog = ctx.createLinearGradient(0, -10800, 0, -7600);
  fog.addColorStop(0, 'rgba(168,178,184,.28)');
  fog.addColorStop(1, 'rgba(168,178,184,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(-1200, -10800, 2600, 3200);

  // bright edge gradient inside the clip
  const rim = ctx.createLinearGradient(-760, 0, -380, 0);
  rim.addColorStop(0, 'rgba(255,190,110,.3)');
  rim.addColorStop(.45, 'rgba(255,205,140,.12)');
  rim.addColorStop(1, 'rgba(255,210,150,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(-800, -10900, 460, 11600);

  ctx.restore();

  // projecting rock spurs break the silhouette and catch the sunset
  for (const s of D.spurs) {
    const idx = clamp(Math.round((620 - s.y) / 58), 0, pts.length - 1);
    const p = pts[idx];
    if (!p) continue;
    const x0 = p.left + 6;
    const y0 = p.y;
    const shape = [
      { x: x0 + 2, y: y0 - 4 },
      { x: x0 - s.len * .35, y: y0 + s.drop * .1 },
      { x: x0 - s.len, y: y0 + s.drop * .55 },
      { x: x0 - s.len * .82, y: y0 + s.drop },
      { x: x0 - s.len * .28, y: y0 + s.drop * .92 },
      { x: x0 + 2, y: y0 + s.drop * .6 },
    ];
    poly(ctx, shape);
    const sg = ctx.createLinearGradient(0, y0 - 6, 0, y0 + s.drop);
    sg.addColorStop(0, `rgba(53,66,60,${s.a})`);
    sg.addColorStop(.55, `rgba(27,39,40,${s.a})`);
    sg.addColorStop(1, `rgba(8,16,18,${s.a})`);
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,192,120,${s.a * .5})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0 + 2, y0 - 4);
    ctx.quadraticCurveTo(x0 - s.len * .5, y0 + s.drop * .05, x0 - s.len, y0 + s.drop * .55);
    ctx.stroke();
    // underside shadow
    ctx.strokeStyle = 'rgba(2,7,9,.5)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x0 - s.len * .82, y0 + s.drop);
    ctx.lineTo(x0 - s.len * .28, y0 + s.drop * .92);
    ctx.stroke();
  }

  // hanging vines, drawn on top of the wall
  for (const v of D.vines) {
    ctx.strokeStyle = 'rgba(55,80,46,.42)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.bezierCurveTo(v.x + v.lean, v.y + v.len * .35, v.x - v.lean, v.y + v.len * .7, v.x + v.lean * .5, v.y + v.len);
    ctx.stroke();
  }

  // the sunset-facing contour: a dark cut then a burning rim
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(16,24,24,.75)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(pts[0].left, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].left, pts[i].y);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,192,112,.8)';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = 'rgba(255,166,82,.7)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(pts[0].left, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].left, pts[i].y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // the open-sea edge stays in cool shadow, with only a breath of sky light
  ctx.strokeStyle = 'rgba(8,17,20,.72)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(pts[0].right, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].right, pts[i].y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(158,196,204,.18)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(pts[0].right, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].right, pts[i].y);
  ctx.stroke();

  // little sunlit shelves and vegetation on the contour
  const er = mulberry32(4732);
  for (let i = 2; i < pts.length - 4; i += 3) {
    const p = pts[i];
    if (er() < .4) continue;
    const r = 3 + er() * 8;
    ctx.fillStyle = 'rgba(255,206,140,.32)';
    ctx.beginPath();
    ctx.ellipse(p.left + 1, p.y + er() * 22, r, r * .4, er(), 0, TAU);
    ctx.fill();
    if (er() > .6) {
      ctx.strokeStyle = 'rgba(116,140,82,.4)';
      ctx.lineWidth = 1;
      const lx = p.left + 6 + er() * 22;
      const ly = p.y + er() * 40;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.quadraticCurveTo(lx + 5, ly + 12, lx + 2, ly + 24 + er() * 22);
      ctx.stroke();
    }
  }

  // mist bands drifting across the face
  const mr = mulberry32(8791);
  for (let i = 0; i < 16; i++) {
    const y = 360 - i * 720 + mr() * 220;
    const mg = ctx.createLinearGradient(-1000, y, 1200, y);
    mg.addColorStop(0, 'rgba(198,206,198,0)');
    mg.addColorStop(.25, `rgba(196,208,200,${.04 + mr() * .05})`);
    mg.addColorStop(.55, `rgba(218,218,200,${.06 + mr() * .07})`);
    mg.addColorStop(1, 'rgba(198,206,198,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(-120 + Math.sin(i) * 320, y, 760, 45 + mr() * 65, 0, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
  void time;
}
