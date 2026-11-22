// Broth that boils: bubbles that rise as domes above the surface, swell and pop on their own clocks, and spatter:
// droplets thrown up out of the broth (and above the rim, where they can be seen from the street) when something jolts
// it. A source may ride a joint (the broth itself, which heaves; the bowl, which rides the table): bubbles and spatter
// follow those joints' offsets. Driven by fx.bubbles (0–1: the amount), fx.boil (0–1: how hard it boils now), fx.burst
// (0–1: how hard the last jolt was) and fx.burstAge (seconds since it).
const { TAU, C, every } = require('../kit.cjs');

const cycle = v => ((v % 1) + 1) % 1;
const GRAVITY = 9.8 / 2;   // units are half a metre
/** the summed offset of the joints a source rides (a broth, and the table under its bowl) */
const offset = (rides, pose) => { const o = [0, 0, 0]; for (const j of rides ?? []) { const p = pose[j]?.pos; if (p) for (let i = 0; i < 3; i++) o[i] += p[i]; } return o; };

function bake({ B }, sources, rnd) {
  const bubbles = [], spatter = [], dab = { nd: true, em: true };
  for (const { at, r, count, size, rides } of sources)
    for (let j = 0; j < count; j++) {
      const row = B.count(), a = rnd() * TAU, d = Math.sqrt(rnd()) * r * 0.85;
      B.iso(at[0], at[1], at[2], size, B.P[C.warm[6]], 1.1, dab);
      B.iso(at[0], at[1], at[2], size, B.P[C.glow[2]], 1.1, dab);
      bubbles.push({ row, x: at[0] + Math.cos(a) * d, y: at[1], z: at[2] + Math.sin(a) * d, size: size * (0.6 + 0.8 * rnd()),
        period: every(0.45 + 0.7 * rnd()), phase: rnd(), rank: rnd(), rides: [].concat(rides ?? []) });
    }
  for (const { at, r, spatter: count = 0, rides } of sources)
    for (let j = 0; j < count; j++) {
      const row = B.count(), a = rnd() * TAU, d = Math.sqrt(rnd()) * r * 0.8;
      B.iso(at[0], at[1], at[2], 0.03, B.P[C.glow[2]], 1.1, dab);
      // each droplet leaves from its own spot, upward and a little outward, faster or slower
      spatter.push({ row, x: at[0] + Math.cos(a) * d, y: at[1], z: at[2] + Math.sin(a) * d, up: 1.1 + 1.3 * rnd(), out: [Math.cos(a) * 0.35 * rnd(), Math.sin(a) * 0.35 * rnd()], rank: rnd(), rides: [].concat(rides ?? []) });
    }
  return { bubbles, spatter };
}

/** `pose` is the world's current pose: a riding source follows its joint's `pos` */
function clock({ bubbles, spatter = [] }) {
  return (rest, t, fx, eye, pose) => {
    const boiling = (fx.bubbles ?? 0.5) * Math.min(1, 0.15 + (fx.boil ?? 0));
    for (const b of bubbles) {
      const k = cycle(t / b.period + b.phase), q = b.row * 16, up = b.rank < boiling;
      const r = up ? b.size * (0.6 + 0.6 * (fx.boil ?? 0)) * Math.sin(Math.PI * Math.min(1, k / 0.9)) : 0;
      const ride = offset(b.rides, pose);
      for (let c = 0; c < 2; c++) {
        const o = q + c * 16, cap = c === 1, on = up && r > 0.004 && (cap ? k > 0.72 : k <= 0.72);
        rest[o + 3] = on ? 1.1 : 0;
        // a dome standing proud of the broth: it rises as it swells
        rest[o] = b.x + ride[0]; rest[o + 1] = b.y + r * 0.7 + ride[1]; rest[o + 2] = b.z + ride[2];
        rest[o + 4] = rest[o + 10] = r * r; rest[o + 8] = r * r * 0.6;
      }
    }
    // spatter: a ballistic arc from the moment of the jolt; only as many droplets fly as the jolt was hard
    const age = fx.burstAge ?? Infinity, burst = fx.burst ?? 0;
    for (const s of spatter) {
      const o = s.row * 16, flies = s.rank < burst * (fx.bubbles ?? 0.5) * 1.6 && age >= 0 && age < 1;
      const v = s.up * Math.sqrt(Math.max(0.2, burst)), y = v * age - GRAVITY * age * age;
      const ride = offset(s.rides, pose);
      rest[o + 3] = flies && y > 0 ? 1.1 : 0;
      rest[o] = s.x + s.out[0] * age + ride[0]; rest[o + 1] = s.y + Math.max(0, y) + ride[1]; rest[o + 2] = s.z + s.out[1] * age + ride[2];
      rest[o + 4] = rest[o + 8] = rest[o + 10] = 0.03 * 0.03;
    }
  };
}

module.exports = { bake, clock };
