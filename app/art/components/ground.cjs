// The ground: a slab of wet street cut out of the night, its kerb and pavement, its puddles (whose materials the scene
// makes, since they mirror), a lane line, a manhole and a drain, and broken stone round the rim. Set dressing: it has
// no joints and no behaviour of its own; the puddles' response to music is the view's (views/actors/puddles.ts).
const { TAU } = require('../kit.cjs');

/** place: { RAD, KERB, WATER }; ctx.pools are the puddles, each { blobs, mat } */
module.exports = place => ({
  id: 'ground',
  sculpt(ctx) {
    const { RAD, KERB, WATER } = place;
    const { S, B, M } = ctx;
    S.lathe([0, -0.75, 0], 0.75, t => RAD * (0.86 + 0.14 * t), M.road, { res: 0.07 });
    const chord = z => Math.sqrt(Math.max(0, RAD * RAD * 0.97 - z * z));
    S.solid([0, 0.07, 0], RAD + 0.2, (x, y, z) => Math.max(Math.hypot(x, z) - RAD * 0.985, z - KERB, Math.abs(y) - 0.07),
      (res, f) => {
        for (let x = -RAD; x <= RAD; x += res) for (let z = -RAD; z <= KERB; z += res) if (Math.hypot(x, z) < RAD * 0.985) f(x, 0.07, z);
      }, M.paving, { res: 0.055, reach: 0.1 });
    S.box([0, 0.07, KERB + 0.07], [chord(KERB), 0.085, 0.08], M.kerb, { res: 0.045, rd: 0.02 });
    for (const p of ctx.pools) for (const [x, z, rx, rz] of p.blobs) S.ball([x, WATER - 0.01, z], [rx, 0.012, rz], p.mat, { res: 0.055 });
    // two dashes of a worn lane line, a manhole, and a drain against the kerb
    for (const x of [-1.5, 0.75]) S.box([x, 0.004, 3.78], [0.5, 0.008, 0.06], M.line, { res: 0.04 });
    S.lathe([3.3, 0, 2.05], 0.016, [0.4, 0.4], M.iron, { res: 0.035 });
    S.torus([3.3, 0.014, 2.05], 0.3, 0.012, M.black, { res: 0.024 });
    for (const a of [0, 1, 2]) S.box([3.3, 0.016, 2.05], [0.26, 0.008, 0.016], M.black, { res: 0.022, ax: B.frame((a * Math.PI) / 3, 0, 0) });
    S.box([2.2, 0.01, KERB + 0.32], [0.42, 0.016, 0.17], M.iron, { res: 0.035 });
    for (let i = 0; i < 6; i++) S.box([1.86 + i * 0.136, 0.022, KERB + 0.32], [0.022, 0.012, 0.13], M.black, { res: 0.025 });
    // broken stone round the rim, so the edge is not a compass line
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + B.rr(-0.08, 0.08), r = RAD * B.rr(0.9, 0.99), s = B.rr(0.3, 0.6);
      S.rock([Math.cos(a) * r, -0.48 + B.rr(-0.12, 0.08), Math.sin(a) * r], [s, s * B.rr(0.5, 0.8), s * 0.8], M.rock, { res: 0.075 });
    }
  }
});
