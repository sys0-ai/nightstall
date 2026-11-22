// The awning: four poles, rafters and a ridge, a front rail that runs on past the cloth (braced from the corner pole) for
// a sign to hang from, and a striped cloth over two slopes with a scalloped valance. Each valance tongue is a joint that
// hangs from the cloth's edge and can only swing fore and aft (hinged), so wind and music can move it.

/** place: { id, x0, x1, zf, zb, ridgeZ, ridgeY, frontY, backY, over, stripes, railTo } (railTo: the rail's far x) */
module.exports = place => {
  const A = place, id = place.id ?? 'awning', half = (A.x1 - A.x0) / 2;
  const wide = (2 * half + 2 * A.over) / A.stripes, x00 = A.x0 - A.over;
  const flap = (side, i) => `${id}.flap${side}${i}`;
  return {
    id,
    /** the rail the sign and the ladles hang from: its height and depth */
    rail: [A.frontY - 0.03, A.zf - 0.05],
    sculpt({ S, B, M }) {
      for (const x of [A.x0, A.x1]) {
        S.tube([[x, 1.5, 0.72], [x, A.frontY - 0.02, 0.72]], 0.035, 0.035, M.steel, { res: 0.03 });
        S.tube([[x, 1.5, -0.72], [x, A.backY + 0.1, -0.72]], 0.035, 0.035, M.steel, { res: 0.03 });
        // rafters
        S.tube([[x, A.frontY, A.zf - 0.04], [x, A.ridgeY - 0.05, A.ridgeZ]], 0.028, 0.028, M.steel, { res: 0.028 });
        S.tube([[x, A.ridgeY - 0.05, A.ridgeZ], [x, A.backY, A.zb + 0.04]], 0.028, 0.028, M.steel, { res: 0.028 });
      }
      S.tube([[A.x0 - 0.4, A.ridgeY - 0.05, A.ridgeZ], [A.x1 + 0.4, A.ridgeY - 0.05, A.ridgeZ]], 0.03, 0.03, M.steel, { res: 0.028 });
      const rail = [A.frontY - 0.03, A.zf - 0.05];
      S.tube([[A.x0 - 0.4, rail[0], rail[1]], [A.railTo + 0.52, rail[0], rail[1]]], 0.03, 0.03, M.steel, { res: 0.028 });
      S.tube([[A.x1, A.frontY - 0.8, 0.72], [A.railTo - 0.1, rail[0], rail[1]]], 0.022, 0.022, M.steel, { res: 0.026 });
      // the cloth: stripes running over the ridge, each stripe a slab on either slope
      const slope = (zA, yA, zB, yB) => {
        const len = Math.hypot(zB - zA, yB - yA), tilt = Math.atan2(yB - yA, zB - zA);
        return { c: [(zA + zB) / 2, (yA + yB) / 2], len, ax: B.frame(0, -tilt, 0) };
      };
      const front = slope(A.ridgeZ, A.ridgeY, A.zf, A.frontY), back = slope(A.zb, A.backY, A.ridgeZ, A.ridgeY);
      for (let i = 0; i < A.stripes; i++) {
        const x = x00 + (i + 0.5) * wide, m = i % 2 ? M.cream : M.red;
        for (const s of [front, back]) S.box([x, s.c[1], s.c[0]], [wide / 2 + 0.004, 0.03, s.len / 2 + 0.02], m, { res: 0.045, ax: s.ax });
        // the valance: a flat tongue of cloth to each stripe, front and back, each free to swing
        for (const [side, y, z, dz] of [['F', A.frontY, A.zf, 1], ['B', A.backY, A.zb, -1]]) {
          S.box([x, y - 0.08, z + dz * 0.012], [wide / 2 - 0.006, 0.09, 0.012], m, { res: 0.03, tag: flap(side, i) });
          S.lathe([x, y - 0.16, z + (dz > 0 ? 0 : -0.024)], 0.024, [wide / 2 - 0.006, wide / 2 - 0.006], m, { res: 0.03, ax: S.AZ, tag: flap(side, i) });
        }
      }
    },
    rig: () => {
      const joints = [];
      for (let i = 0; i < A.stripes; i++) {
        const x = x00 + (i + 0.5) * wide;
        joints.push({ name: flap('F', i), pivot: [x, A.frontY, A.zf], swing: { length: 0.3, amp: 9, hinged: true }, group: 'valance' });
        joints.push({ name: flap('B', i), pivot: [x, A.backY, A.zb], swing: { length: 0.3, amp: 8, hinged: true }, group: 'valance' });
      }
      return joints;
    }
  };
};
