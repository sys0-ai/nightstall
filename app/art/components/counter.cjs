// The worktop and what is on it: the stock pot on its burner with a ladle in the broth, three bamboo steamers and a lid,
// bowls, a jar of chopsticks, a board and knife, sauce bottles and a tray of dumplings. It declares where its steam
// rises and where its broth bubbles; the scene's emitters (steam.cjs, bubbles.cjs) bake those.
const { TAU } = require('../kit.cjs');

module.exports = () => ({
  id: 'counter',
  sculpt(ctx) { counterTop(ctx); },
  /** the broth in the pot, which heaves when it boils */
  rig: () => [{ name: 'counter.broth', pivot: [1.2, 2.07, -0.2] }],
  /** steam from the pot and the top steamer; bubbles and spatter on the pot's broth (its surface at y 2.105, radius 0.3) */
  emitters: () => [
    { kind: 'steam', at: [1.2, 2.12, -0.2], count: 13, rise: 1.45, size: 0.062 },
    { kind: 'steam', at: [0.2, 2.2, -0.3], count: 10, rise: 1.2, size: 0.052 },
    { kind: 'bubbles', at: [1.2, 2.105, -0.2], r: 0.3, count: 22, size: 0.05, spatter: 26, rides: 'counter.broth' }
  ]
});

function counterTop({ S, K, B, M }) {
  S.box([0.35, 1.52, 0], [1.46, 0.045, 0.86], M.planks, { res: 0.04, rd: 0.02 });
  // a stock pot on its burner, open, a ladle standing in the broth
  S.lathe([1.2, 1.56, -0.2], 0.07, [0.3, 0.3], M.iron, { res: 0.03 });
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; S.ball([1.2 + Math.cos(a) * 0.27, 1.61, -0.2 + Math.sin(a) * 0.27], [0.03, 0.035, 0.03], M.flame, { res: 0.02, ghost: true }); }
  S.lathe([1.2, 1.64, -0.2], 0.5, [0.36, 0.38], M.steel, { res: 0.035 });
  S.torus([1.2, 2.14, -0.2], 0.385, 0.022, M.steel, { res: 0.026 });
  S.lathe([1.2, 2.07, -0.2], 0.03, [0.345, 0.345], M.broth, { res: 0.03, tag: 'counter.broth' });
  for (const sz of [-1, 1]) S.box([1.2, 1.98, -0.2 + sz * 0.41], [0.07, 0.022, 0.03], M.steel, { res: 0.022, rd: 0.012 });
  S.tube([[1.08, 2.08, -0.12], [0.76, 2.52, 0.1]], 0.016, 0.016, M.steel, { res: 0.022 });
  // bamboo steamers, three high, the top one open on a ring of buns; its lid beside them
  for (let i = 0; i < 3; i++) {
    S.lathe([0.2, 1.56 + i * 0.19, -0.3], 0.16, [0.34, 0.34], M.bamboo, { res: 0.035 });
    S.torus([0.2, 1.575 + i * 0.19, -0.3], 0.343, 0.01, M.band, { res: 0.022 });
    S.torus([0.2, 1.705 + i * 0.19, -0.3], 0.343, 0.01, M.band, { res: 0.022 });
  }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; S.ball([0.2 + Math.cos(a) * 0.19, 2.13, -0.3 + Math.sin(a) * 0.19], [0.085, 0.06, 0.085], M.cream, { res: 0.025 }); }
  S.ball([0.2, 2.14, -0.3], [0.085, 0.065, 0.085], M.cream, { res: 0.025 });
  S.lathe([-0.5, 1.56, -0.5], 0.05, [0.33, 0.33], M.bamboo, { res: 0.03 });
  S.ball([-0.5, 1.61, -0.5], [0.3, 0.07, 0.3], M.bamboo, { res: 0.03 });
  S.ball([-0.5, 1.68, -0.5], [0.05, 0.03, 0.05], M.band, { res: 0.02 });
  // bowls in a stack, a jar of chopsticks, a board with a knife, sauce bottles, a tray of dumplings
  for (let i = 0; i < 6; i++) S.lathe([-0.62, 1.57 + i * 0.05, 0.38], 0.09, [0.11, 0.2], M.cream, { res: 0.028 });
  S.lathe([-0.98, 1.56, 0.52], 0.26, [0.085, 0.085], M.red, { res: 0.028 });
  for (let i = 0; i < 7; i++) S.tube([[-0.98 + B.rr(-0.04, 0.04), 1.7, 0.52 + B.rr(-0.04, 0.04)], [-0.98 + B.rr(-0.13, 0.13), 2.04, 0.52 + B.rr(-0.1, 0.1)]], 0.01, 0.01, M.wood, { res: 0.018 });
  S.box([-0.15, 1.58, 0.45], [0.26, 0.02, 0.19], M.wood, { res: 0.03, rd: 0.015 });
  S.box([-0.1, 1.61, 0.45], [0.16, 0.008, 0.035], M.steel, { res: 0.022, ax: B.frame(0.5, 0, 0) });
  S.ball([-0.3, 1.62, 0.36], [0.07, 0.03, 0.05], M.green, { res: 0.022 });
  [[0.5, M.green], [0.68, M.red], [0.86, M.black]].forEach(([x, m]) => {
    S.lathe([x, 1.56, 0.6], 0.22, [0.065, 0.065], m, { res: 0.025 });
    S.lathe([x, 1.78, 0.6], 0.11, [0.065, 0.024], m, { res: 0.022 });
    S.lathe([x, 1.89, 0.6], 0.04, [0.034, 0.034], M.cream, { res: 0.018 });
  });
  S.box([1.25, 1.585, 0.55], [0.3, 0.02, 0.2], M.steel, { res: 0.028, rd: 0.02 });
  for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) S.ball([1.04 + i * 0.14, 1.63, 0.47 + j * 0.16], [0.06, 0.04, 0.05], M.cream, { res: 0.02 });
}
