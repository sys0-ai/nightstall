// Rain: drops that fall down the wind from above the island to whatever the sculpt puts in their way, wait a moment out
// of sight, and fall again; where one lands a flat disc opens for an instant, and if that is in a pool a ring spreads
// from the spot each time round. Each drop is three dabs (as it is in the dark, where lamplight catches it, and close to
// a lamp), one shown at a time by how near a lamp it is. Solid dabs, not soft: over the dark a soft dab is a smear.
// Driven by fx.rain (0–1: the share of drops that fall).
const { TAU, LOOP, C, norm } = require('../kit.cjs');

const WIND = norm([0.15, -1, 0.05]), STREAK = 0.1, TOP = 7.6;   // the way a drop falls; how far a streak's middle trails its leading end
const cycle = v => ((v % 1) + 1) % 1;

/** Lay the drops down. `shelter` is what they land on; `pools` the puddles (rings are scheduled in them). */
function bake({ B }, shelter, pools, rnd, count = 640) {
  const drops = [], rings = pools.map(() => []), dab = { nd: true, em: true };
  for (let i = 0; i < count; i++) {
    // aim at a spot on the ground, and start that far back up the wind
    const a = rnd() * TAU, r = Math.sqrt(rnd()) * 5.2, reach = TOP / -WIND[1];
    const from = [Math.cos(a) * r - WIND[0] * reach, TOP, Math.sin(a) * r - WIND[2] * reach];
    const hit = shelter.hitDistance(from[0], from[1], from[2], WIND, reach + 1.6);
    const lands = hit !== Infinity, len = lands ? hit : reach + 1.6;
    const speed = 8.6 + 2 * rnd(), fall = len / speed, phase = rnd();
    const period = LOOP / Math.floor(LOOP / (fall + 0.08 + 0.55 * rnd()));   // its fall, a wait, and a whole number of them to the loop
    const at = from.map((v, k) => v + WIND[k] * len);
    const cool = rnd() < 0.18 ? C.rain[2] : rnd() < 0.5 ? C.rain[1] : C.rain[0], row = B.count();
    for (const c of [cool, C.cream[3], C.cream[4]]) B.stick(from[0], from[1], from[2], WIND, 0.08, 0.004, B.P[c], 1.1, dab);
    B.disc(at[0], at[1] + 0.012, at[2], [0, 1, 0], 0.03, 0.005, B.P[C.rain[2]], 1.1, dab);
    drops.push({ row, from, speed, fall, period, phase, lands, rank: rnd() });
    if (lands && at[1] < 0.06) for (const [k, p] of pools.entries())
      if (rings[k].length < 60 && p.blobs.some(([x, z, rx, rz]) => ((at[0] - x) / rx) ** 2 + ((at[2] - z) / rz) ** 2 < 0.8)) {
        // it lands when its own clock reads `fall`: the ring starts then, every time round
        rings[k].push({ at: [at[0], 0, at[2]], start: fall - (phase + 1) * period, repeat: period });
        break;
      }
  }
  return { drops, rings };
}

/** Put every drop where it is at time t. `warms` are [lamp, reach] pairs; `rest` the world's splat rows. */
function clock({ drops }, warms) {
  return (rest, t, fx) => {
    for (const d of drops) {
      const u = cycle(t / d.period + d.phase) * d.period, q = d.row * 16;
      let shown = -1, x = 0, y = 0, z = 0;
      if (u < d.fall) {
        const s = Math.max(0, d.speed * u - STREAK);
        x = d.from[0] + WIND[0] * s; y = d.from[1] + WIND[1] * s; z = d.from[2] + WIND[2] * s;
        let warm = 0;
        for (const [p, reach] of warms) { const k = 1 - Math.hypot(x - p[0], y - p[1], z - p[2]) / reach; if (k > 0) warm += k * k; }
        shown = warm > 0.3 ? 2 : warm > 0.06 ? 1 : 0;
      }
      const falls = d.rank < (fx.rain ?? 0.6);
      if (!falls) shown = -1;
      for (let k = 0; k < 3; k++) {
        const o = q + k * 16;
        rest[o + 3] = k === shown ? 1.1 : 0;
        if (k === shown) { rest[o] = x; rest[o + 1] = y; rest[o + 2] = z; }
      }
      const v = (u - d.fall) / 0.13, o = q + 48;
      if (falls && d.lands && v >= 0 && v < 1) { const s = 0.02 + 0.045 * v; rest[o + 3] = 1.1; rest[o + 4] = rest[o + 10] = s * s; }
      else rest[o + 3] = 0;
    }
  };
}

module.exports = { bake, clock, colours: [...C.rain, C.cream[3], C.cream[4]] };
