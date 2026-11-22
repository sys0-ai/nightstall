// A string of bulbs on a slack wire: six bulbs in black sockets, each a joint that hangs from the wire, so each can swing
// and swell on its own (Night Stall plays the melody on them). One light for the bake and one glow in the mist, under a
// roof that keeps the glow below it.

/** place: { id, x0, x1, y, z, sag, roof, light? } the wire's ends, height and depth, how far it sags, the roof over it, and where its light is */
module.exports = place => {
  const id = place.id ?? 'bulbs', wire = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; wire.push([place.x0 + t * (place.x1 - place.x0), place.y - place.sag * Math.sin(Math.PI * t), place.z]); }
  const hangs = [];
  for (let i = 2; i <= 13; i += 2) hangs.push(wire[i]);
  const middle = place.light ?? [(place.x0 + place.x1) / 2, place.y, place.z];   // where the string's light is taken to be
  return {
    id,
    sculpt({ S, M }) {
      S.tube(wire, 0.011, 0.011, M.black, { res: 0.022 });
      hangs.forEach((w, k) => {
        S.lathe([w[0], w[1] - 0.055, w[2]], 0.05, [0.03, 0.03], M.black, { res: 0.02, tag: `${id}.${k}` });
        S.ball([w[0], w[1] - 0.11, w[2]], 0.062, M.bulb, { res: 0.022, tag: `${id}.${k}`, ghost: true });
      });
    },
    /** each bulb hangs from where its socket meets the wire; left to right */
    rig: () => hangs.map((w, k) => ({ name: `${id}.${k}`, pivot: [w[0], w[1] - 0.005, w[2]], swing: { length: 0.14, amp: 7 }, group: id })),
    light: () => ({ p: middle, r: 4.4, s: 1.0 }),
    glow: () => [{ at: middle, radius: 2.0, intensity: 15, color: '#ffd070', under: place.roof }],
    warms: () => [[middle, 1.8]],
    /** each bulb a small light of its own, so one bulb can light its own patch */
    lamps: () => hangs.map((w, k) => ({ id: `${id}.${k}`, at: [w[0], w[1] - 0.11, w[2]], color: '#ffd070', intensity: 0.45, radius: 1.5 }))
  };
};
