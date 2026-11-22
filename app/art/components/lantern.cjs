// A paper lantern on an iron bracket off a pole: ribbed, glowing, with wooden caps and a red tassel. It is a light in
// the bake and in the mist (a flame, so it breathes), and two joints: the lantern swings from the bracket's hook, and the
// tassel swings from the lantern's foot.
const { C } = require('../kit.cjs');

/** place: { id, at: [x, y, z] the lantern's middle, hook: y of the hook, from: [x, y, z] the bracket's root } */
module.exports = place => {
  const id = place.id ?? 'lantern', [lx, ly, lz] = place.at, hang = [lx, place.hook, lz];
  return {
    id,
    sculpt({ S, M }) {
      S.tube([place.from, [place.from[0] - 0.3, place.hook + 0.08, 1.2], hang], 0.022, 0.022, M.iron, { res: 0.026 });
      const paper = { r: [C.red[4], C.glow[0], C.glow[1]], em: true, tex: (x, y) => { const v = Math.abs(y - ly) / 0.33; return v < 0.42 ? C.glow[1] : v < 0.8 ? C.glow[0] : C.red[4]; } };
      const body = { tag: id };
      S.tube([hang, [lx, ly + 0.33, lz]], 0.012, 0.012, M.black, { res: 0.022, ...body });
      S.ball([lx, ly, lz], [0.3, 0.33, 0.3], paper, { res: 0.03, ...body, ghost: true });
      for (const v of [-0.66, -0.33, 0, 0.33, 0.66])
        S.torus([lx, ly + v * 0.33, lz], 0.3 * Math.sqrt(1 - v * v) + 0.004, 0.008, { r: [C.red[3]], em: true }, { res: 0.018, ...body, ghost: true });
      for (const sy of [-1, 1]) S.lathe([lx, ly + sy * 0.3 - 0.035, lz], 0.07, [0.15, 0.15], M.wood, { res: 0.026, ...body });
      S.tube([[lx, ly - 0.34, lz], [lx, ly - 0.5, lz]], 0.018, 0.018, M.wood, { res: 0.022, ...body });
      S.tube([[lx, ly - 0.5, lz], [lx, ly - 0.78, lz]], 0.04, 0.02, M.red, { res: 0.024, tag: id + '.tassel' });
    },
    rig: () => [
      { name: id, pivot: hang, swing: { length: 0.75, amp: 5 } },
      { name: id + '.tassel', pivot: [lx, ly - 0.5, lz], parent: id, swing: { length: 0.28, amp: 7, tassel: true } }
    ],
    light: () => ({ p: place.at, r: 6.2, s: 1.6, sh: true }),
    glow: () => [{ at: place.at, radius: 2.6, intensity: 35, color: '#ff9a3c', castsShadow: false, flame: true }],
    warms: () => [[place.at, 2.6]],
    /** the lantern as a light the view can drive: a point, flame-coloured, reaching about three units */
    lamps: () => [{ id, at: place.at, color: '#ff9a3c', intensity: 1, radius: 3.2 }]
  };
};
