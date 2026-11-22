// The noodle tricycle: a teal counter box on two wheels with guards, a third wheel, saddle and handlebars in front, a
// menu board, a shelf for bowls, a cloth over the end rail, a basket of greens and a lamp on the bars, and a furled
// umbrella hung off the back. Set dressing in the scene's own coordinates; the worktop is counter.cjs.

const { C } = require('../kit.cjs');

module.exports = () => ({
  id: 'cart',
  sculpt(ctx) { cart(ctx); }
});

/* the tricycle: a counter box on two wheels, a third wheel, saddle and handlebars out in front of it */
function cart({ S, K, B, M }) {
  const at = (x, y, z) => [x + 0.35, y, z];
  S.box(at(0, 0.98, 0), [1.35, 0.5, 0.74], M.teal, { res: 0.045, rd: 0.03 });
  // a frame round every panel
  for (const sz of [-1, 1]) {
    for (const y of [1.44, 0.52]) S.box(at(0, y, sz * 0.755), [1.385, 0.05, 0.03], M.tealDark, { res: 0.03 });
    for (const x of [-1.34, -0.45, 0.45, 1.34]) S.box(at(x, 0.98, sz * 0.755), [0.045, 0.47, 0.03], M.tealDark, { res: 0.03 });
  }
  for (const sx of [-1, 1]) for (const z of [-0.71, 0.71]) S.box(at(sx * 1.365, 0.98, z), [0.03, 0.47, 0.045], M.tealDark, { res: 0.03 });
  // the menu board on the front: a cream card with a few lines of red writing
  S.box(at(0, 1.0, 0.79), [0.36, 0.3, 0.02], M.cream, { res: 0.03 });
  for (let j = 0; j < 4; j++) for (const [x, len] of [[-0.2, 0.09], [0.0, 0.07], [0.2, 0.05]])
    S.box(at(x + (j % 2) * 0.03, 1.2 - j * 0.13, 0.815), [len * (j === 3 ? 0.6 : 1), 0.025, 0.008], { r: [C.red[2]] }, { res: 0.022 });
  // a shelf below the front edge of the worktop, where bowls are put down
  S.box(at(-0.85, 1.25, 0.98), [0.45, 0.025, 0.2], M.planks, { res: 0.035 });
  for (const x of [-1.2, -0.5]) S.tube([at(x, 1.24, 1.14), at(x, 0.95, 0.78)], 0.02, 0.02, M.iron, { res: 0.028 });
  S.lathe(at(-0.95, 1.28, 1.0), 0.09, [0.1, 0.17], M.cream, { res: 0.028 });
  // a cloth over the rail at the far end
  S.box(at(1.39, 1.22, 0.3), [0.02, 0.2, 0.16], M.cream, { res: 0.03 });
  S.box(at(1.39, 1.12, 0.3), [0.024, 0.03, 0.165], M.red, { res: 0.03 });
  // back wheels on one axle, with guards
  for (const sz of [-1, 1]) {
    wheel(S, M, at(0.75, 0.42, sz * 0.88), 0.42);
    S.solid(at(0.75, 0.42, sz * 0.88), 0.6, (x, y, z) => Math.max(Math.abs(Math.hypot(x, y) - 0.5) - 0.02, Math.abs(z) - 0.11, -y - 0.06),
      (res, f) => { for (let a = -0.1; a <= Math.PI + 0.1; a += res / 0.5) for (let z = -0.1; z <= 0.1; z += res) f(Math.cos(a) * 0.52, Math.sin(a) * 0.52, z); },
      M.tealDark, { res: 0.035, reach: 0.06 });
  }
  S.tube([at(0.75, 0.42, -0.9), at(0.75, 0.42, 0.9)], 0.035, 0.035, M.iron, { res: 0.035 });
  // the front end
  const fx = -2.25;
  wheel(S, M, at(fx, 0.42, 0), 0.42);
  for (const sz of [-1, 1]) S.tube([at(fx, 0.42, sz * 0.1), at(fx + 0.22, 1.55, sz * 0.1)], 0.03, 0.03, M.steel, { res: 0.03 });
  S.tube([at(fx + 0.2, 1.5, 0), at(fx + 0.24, 1.74, 0)], 0.04, 0.04, M.steel, { res: 0.03 });
  S.tube([at(fx + 0.24, 1.74, -0.42), at(fx + 0.24, 1.74, 0.42)], 0.028, 0.028, M.steel, { res: 0.028 });
  for (const sz of [-1, 1]) S.tube([at(fx + 0.24, 1.74, sz * 0.3), at(fx + 0.24, 1.74, sz * 0.45)], 0.04, 0.04, M.black, { res: 0.028 });
  S.tube([at(fx + 0.22, 1.25, 0), at(-1.35, 0.8, 0)], 0.045, 0.045, M.teal, { res: 0.035 });
  S.tube([at(fx + 0.15, 0.75, 0), at(-1.35, 0.6, 0)], 0.035, 0.035, M.teal, { res: 0.035 });
  S.tube([at(-1.62, 0.78, 0), at(-1.6, 1.42, 0)], 0.035, 0.035, M.steel, { res: 0.03 });
  S.ball(at(-1.6, 1.47, 0), [0.21, 0.06, 0.14], M.black, { res: 0.03 });
  S.solid(at(fx, 0.42, 0), 0.6, (x, y, z) => Math.max(Math.abs(Math.hypot(x, y) - 0.5) - 0.02, Math.abs(z) - 0.09, -y - 0.02, -x - 0.25),
    (res, f) => { for (let a = 0; a <= Math.PI * 0.72; a += res / 0.5) for (let z = -0.08; z <= 0.08; z += res) f(Math.cos(a) * 0.52, Math.sin(a) * 0.52, z); },
    M.teal, { res: 0.035, reach: 0.06 });
  // a basket of greens and a lamp on the bars
  S.box(at(fx + 0.02, 1.52, 0), [0.17, 0.13, 0.2], M.iron, { res: 0.03, rd: 0.02 });
  S.box(at(fx + 0.02, 1.57, 0), [0.14, 0.11, 0.17], M.green, { res: 0.03, rd: 0.02 });
  S.lathe(at(fx - 0.1, 1.74, 0), 0.1, [0.07, 0.05], M.steel, { res: 0.025, ax: [[0, 1, 0], [-1, 0, 0], [0, 0, 1]] });
  // an umbrella, furled, hung by its crook over the back edge of the worktop: clear of the panel, the wheel and the kerb
  const ux = -0.82, uz = -0.95;
  S.tube([[ux, 1.36, uz], [ux + 0.02, 0.2, uz - 0.02]], 0.07, 0.03, M.red, { res: 0.026 });
  S.tube([[ux + 0.02, 0.2, uz - 0.02], [ux + 0.022, 0.08, uz - 0.022]], 0.014, 0.01, M.steel, { res: 0.018 });
  S.torus([ux + 0.008, 0.9, uz - 0.008], 0.052, 0.014, M.cream, { res: 0.02 });
  S.tube([[ux, 1.38, uz], [ux, 1.62, uz], [ux, 1.69, uz + 0.07], [ux, 1.67, uz + 0.15], [ux, 1.6, uz + 0.17]], 0.016, 0.016, M.wood, { res: 0.02 });
}

function wheel(S, M, c, r) {
  S.torus(c, r - 0.07, 0.07, M.black, { res: 0.035, ax: S.AZ });
  S.torus(c, r - 0.15, 0.02, M.steel, { res: 0.028, ax: S.AZ });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + 0.3, dx = Math.cos(a) * (r - 0.15), dy = Math.sin(a) * (r - 0.15);
    S.tube([[c[0] - dx, c[1] - dy, c[2]], [c[0] + dx, c[1] + dy, c[2]]], 0.012, 0.012, M.steel, { res: 0.024 });
  }
  S.ball(c, [0.07, 0.07, 0.1], M.steel, { res: 0.028 });
}
