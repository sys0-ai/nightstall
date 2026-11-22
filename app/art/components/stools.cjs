// Square plastic stools (a seat on four splayed legs with a rail round them; one can lie tipped on its side) and a
// crate of empty bottles. Set dressing, placed by the scene.

/** place: { stools: [[at, yaw, 'red' | 'teal', lying?], ...], crate?: { at } } */
module.exports = place => ({
  id: 'stools',
  sculpt({ S, M }) {
    for (const [at, yaw, mat, lying] of place.stools) stool(S, at, yaw, M[mat], lying);
    if (place.crate) {
      const [cx, , cz] = place.crate.at;
      S.crate({ at: place.crate.at, size: [0.3, 0.17, 0.22], mat: M.red, edge: M.red });
      for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) S.lathe([cx - 0.18 + i * 0.18, 0.28, cz - 0.09 + j * 0.18], 0.16, [0.05, 0.03], M.green, { res: 0.02 });
    }
  }
});

/* the square plastic stool: a seat on four splayed legs with a rail round them; `lying` tips it onto its side */
function stool(S, c, yaw, mat, lying) {
  const H = 0.6, cy = Math.cos(yaw), sy = Math.sin(yaw);
  const T = (x, y, z) => {
    const p = lying ? [x, 0.25 - z, y - H / 2] : [x, y, z];
    return [c[0] + p[0] * cy + p[2] * sy, c[1] + p[1], c[2] - p[0] * sy + p[2] * cy];
  };
  const O = T(0, 0, 0), axis = (x, y, z) => { const p = T(x, y, z); return [p[0] - O[0], p[1] - O[1], p[2] - O[2]]; };
  S.box(T(0, H - 0.03, 0), [0.21, 0.03, 0.21], mat, { res: 0.03, rd: 0.02, ax: [axis(1, 0, 0), axis(0, 1, 0), axis(0, 0, 1)] });
  const foot = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  foot.forEach(([a, b], i) => {
    S.tube([T(a * 0.16, H - 0.05, b * 0.16), T(a * 0.23, 0, b * 0.23)], 0.036, 0.03, mat, { res: 0.026 });
    const [a2, b2] = foot[(i + 1) % 4];
    S.tube([T(a * 0.2, 0.26, b * 0.2), T(a2 * 0.2, 0.26, b2 * 0.2)], 0.018, 0.018, mat, { res: 0.022 });
  });
}

