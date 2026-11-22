// Ladles and a strainer hung from a bar: each a joint that swings at its own length's pace.

/** place: { id, y, z, hooks: [[x, length, 'steel' | 'wood'], ...] } */
module.exports = place => {
  const id = place.id ?? 'ladles';
  return {
    id,
    sculpt({ S, M }) {
      place.hooks.forEach(([x, len, mat], i) => {
        S.tube([[x, place.y, place.z], [x, place.y - len, place.z]], 0.012, 0.012, M[mat], { res: 0.02, tag: `${id}.${i}` });
        S.ball([x, place.y - 0.04 - len, place.z], [0.075, 0.045, 0.075], M.steel, { res: 0.022, tag: `${id}.${i}` });
      });
    },
    rig: () => place.hooks.map(([x, len], i) => ({ name: `${id}.${i}`, pivot: [x, place.y, place.z], swing: { length: len, amp: 6 }, group: id }))
  };
};
