// Steam: round puffs that swell as they leave their source, drift, cool from cream to grey and shrink away. Each puff is
// three pairs (warm, cooler, cold; a body and a lighter cap on the side the eye sees), one pair shown by how far it has
// risen. Sources come from components (a pot, a steamer, a bowl). Driven by fx.steam (0–1: how many puffs show) and
// fx.steamLevel (0–1: how big they swell).
const { TAU, C, every } = require('../kit.cjs');

const ease = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
const cycle = v => ((v % 1) + 1) % 1;

function bake({ B }, sources, rnd) {
  const puffs = [], dab = { nd: true, em: true };
  for (const { at: [x, y, z], count, rise, size } of sources)
    for (let j = 0; j < count; j++) {
      const row = B.count();
      for (const c of [C.cream[4], C.glow[2], C.cream[3], C.cream[4], C.cream[2], C.cream[3]]) B.iso(x, y, z, size, B.P[c], 1.1, dab);
      puffs.push({ row, x: x + (rnd() - 0.5) * 0.24, y, z: z + (rnd() - 0.5) * 0.24, rise: rise * (0.8 + 0.4 * rnd()),
        size: size * (0.75 + 0.5 * rnd()), period: every(1.7 + 1.1 * rnd()), phase: (j + 0.5 * rnd()) / count, turn: rnd() * TAU, rank: rnd() });
    }
  return { puffs };
}

function clock({ puffs }) {
  return (rest, t, fx, eye) => {
    const amount = fx.steam ?? 0.6, swell = fx.steamLevel ?? 0;
    for (const p of puffs) {
      const k = cycle(t / p.period + p.phase), q = p.row * 16;
      const s = p.rank < 0.12 + 0.88 * amount ? p.size * (0.45 + 1.25 * ease(k / 0.4)) * (1 - ease((k - 0.5) / 0.5)) * (0.75 + 0.25 * amount + 0.55 * swell) : 0;
      const x = p.x + 0.35 * k * k + 0.07 * Math.sin(k * 6 + p.turn), y = p.y + p.rise * k, z = p.z + 0.1 * k * k + 0.07 * Math.cos(k * 5 + p.turn);
      const shown = k < 0.3 ? 0 : k < 0.62 ? 1 : 2;
      // the cap sits a little up and towards the eye, so that it is drawn over its body
      const e = [eye[0] - x, eye[1] - y, eye[2] - z], el = Math.hypot(e[0], e[1], e[2]) || 1;
      for (let c = 0; c < 6; c++) {
        const o = q + c * 16, cap = c & 1, f = cap ? 0.45 * s : 0, r = cap ? 0.62 * s : s;
        rest[o + 3] = c >> 1 === shown && s > 0.012 ? 1.1 : 0;
        rest[o] = x + (e[0] / el) * f - 0.25 * f; rest[o + 1] = y + (e[1] / el) * f + 0.75 * f; rest[o + 2] = z + (e[2] / el) * f;
        rest[o + 4] = rest[o + 8] = rest[o + 10] = r * r;
      }
    }
  };
}

module.exports = { bake, clock, colours: [C.cream[2], C.cream[3], C.cream[4], C.glow[2]] };
