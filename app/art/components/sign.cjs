// A hanging light box: a red box on two hangers from a rail, lit faces both sides, and a raised glyph on each face (面 by
// default; any bitmap of '#' and '.' rows). Two joints: the sign swings from the rail (hinged, fore and aft) and the
// glyph rides it, so the glyph can be hidden on its own (a neon blink). A light in the bake and two glows in the mist.
const { C } = require('../kit.cjs');

/* 面, eleven pixels square */
const MIAN = [
  '###########',
  '.....#.....',
  '###########',
  '#..#...#..#',
  '#..#...#..#',
  '#..#####..#',
  '#..#...#..#',
  '#..#####..#',
  '#..#...#..#',
  '#..#...#..#',
  '###########'
];

/** place: { id, at: [x, y, z] the box's middle, rail: [y, z] the rail it hangs from, glyph?: rows } */
module.exports = place => {
  const id = place.id ?? 'sign', [sx, sy, sz] = place.at, rows = place.glyph ?? MIAN;
  return {
    id,
    sculpt({ S, M }) {
      const sign = { tag: id };
      for (const dx of [-0.3, 0.3]) S.tube([[sx + dx, place.rail[0], sz], [sx + dx, sy + 0.44, sz]], 0.012, 0.012, M.iron, { res: 0.02, ...sign });
      S.box([sx, sy, sz], [0.46, 0.46, 0.1], M.red, { res: 0.03, rd: 0.03, ...sign });
      for (const s of [1, -1]) {
        S.box([sx, sy, sz + s * 0.095], [0.385, 0.385, 0.02], M.bulb, { res: 0.026, ghost: true, ...sign });
        glyph(S, rows, [sx, sy, sz + s * 0.122], 0.057, s, { r: [C.red[3]], em: true }, { tag: id + '.glyph' });
      }
    },
    rig: () => [
      { name: id, pivot: [sx, place.rail[0], sz], swing: { length: 0.64, amp: 3.2, hinged: true } },
      { name: id + '.glyph', pivot: [sx, place.rail[0], sz], parent: id }
    ],
    light: () => ({ p: place.at, r: 4.8, s: 1.1 }),
    glow: () => [-0.3, 0.3].map(dz => ({ at: [sx, sy, sz + dz], radius: 1.8, intensity: 18, color: '#ff8a4a', castsShadow: false })),
    warms: () => [[place.at, 2.0]],
    /** the light box: a light either side of it */
    lamps: () => [-0.25, 0.25].map((dz, k) => ({ id: k ? id + '.back' : id, at: [sx, sy, sz + dz], color: '#ff8a4a', intensity: 0.7, radius: 2.2 }))
  };
};

/* a bitmap raised on a face that looks along ±Z: each run of '#' in a row is one small slab (mirrored for the back, so that
   it reads the right way round from there too) */
function glyph(S, rows, c, cell, facing, mat, opts) {
  const h = rows.length, wd = rows[0].length;
  rows.forEach((row, j) => {
    for (let i = 0; i < wd; i++) {
      if (row[i] !== '#') continue;
      let k = i;
      while (k + 1 < wd && row[k + 1] === '#') k++;
      S.box([c[0] + facing * ((i + k + 1) / 2 - wd / 2) * cell, c[1] + (h / 2 - j - 0.5) * cell, c[2]], [((k - i + 1) * cell) / 2, cell / 2, 0.012], mat, { res: cell * 0.6, ...opts });
      i = k;
    }
  });
}
module.exports.MIAN = MIAN;
