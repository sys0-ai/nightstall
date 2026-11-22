// A folding table set for one: a steel top on crossed legs, a finished bowl of broth with chopsticks across it, a green
// bottle and a steel glass. Joints: the table itself (pivot at the floor under its middle) and, riding it, the bottle,
// the glass and the chopsticks, each free to rock on its own. The bowl's broth is a bubble and steam source that rides
// the table.

/** place: { id, at: [x, z] the table's middle on the ground, top: the top's height } */
module.exports = place => {
  const id = place.id ?? 'table', [tx, tz] = place.at, top = place.top, y = top + 0.03;
  return {
    id,
    sculpt({ S, M }) {
      const on = { tag: id };
      S.box([tx, top, tz], [0.66, 0.03, 0.46], M.steel, { res: 0.035, rd: 0.02, ...on });
      for (const sz of [-1, 1]) {
        S.tube([[tx - 0.54, top - 0.02, tz + sz * 0.36], [tx + 0.44, 0, tz + sz * 0.36]], 0.022, 0.022, M.iron, { res: 0.026, ...on });
        S.tube([[tx + 0.54, top - 0.02, tz + sz * 0.36], [tx - 0.44, 0, tz + sz * 0.36]], 0.022, 0.022, M.iron, { res: 0.026, ...on });
      }
      S.lathe([tx - 0.18, y, tz + 0.05], 0.1, [0.12, 0.2], M.cream, { res: 0.026, ...on });
      S.lathe([tx - 0.18, y + 0.06, tz + 0.05], 0.02, [0.17, 0.17], M.broth, { res: 0.024, tag: id + '.broth' });
      for (const d of [-0.03, 0.03]) S.tube([[tx - 0.4, y + 0.11, tz + 0.1 + d], [tx + 0.06, y + 0.11, tz - 0.02 + d]], 0.008, 0.008, M.wood, { res: 0.016, tag: id + '.chopsticks' });
      S.lathe([tx + 0.33, y, tz - 0.14], 0.26, [0.055, 0.055], M.green, { res: 0.022, tag: id + '.bottle' });
      S.lathe([tx + 0.33, y + 0.26, tz - 0.14], 0.12, [0.055, 0.02], M.green, { res: 0.02, tag: id + '.bottle' });
      S.lathe([tx + 0.12, y, tz + 0.22], 0.11, [0.04, 0.05], M.steel, { res: 0.02, tag: id + '.glass' });
    },
    rig: () => [
      { name: id, pivot: [tx, 0, tz] },
      { name: id + '.bottle', pivot: [tx + 0.33, y, tz - 0.14], parent: id },
      { name: id + '.glass', pivot: [tx + 0.12, y, tz + 0.22], parent: id },
      { name: id + '.chopsticks', pivot: [tx - 0.17, top + 0.14, tz + 0.04], parent: id },
      { name: id + '.broth', pivot: [tx - 0.18, y + 0.06, tz + 0.05], parent: id }
    ],
    emitters: () => [
      { kind: 'steam', at: [tx - 0.18, 1.3, tz + 0.05], count: 4, rise: 0.55, size: 0.03 },
      { kind: 'bubbles', at: [tx - 0.18, top + 0.115, tz + 0.05], r: 0.13, count: 8, size: 0.03, spatter: 12, rides: [id + '.broth', id] }
    ]
  };
};
