// The street's furniture: the lamp post on the pavement (its head is a light, and its cone lights the mist), flyers
// and a broom against it, bin bags at the kerb, a gas bottle with its hose, crates, a water butt, a traffic cone and a
// plant in a pot. Set dressing in the scene's own coordinates.

/** place: { head: [x, y, z] } the lamp's head */
module.exports = place => ({
  id: 'street',
  sculpt(ctx) { street(ctx, place.head); },
  /** the lamp's light in the bake, and its cone in the mist */
  light: () => ({ p: place.head, r: 9, s: 1.5, sh: true }),
  spot: () => ({ at: [place.head[0], place.head[1] - 0.1, place.head[2]], direction: [0.05, -1, 0.1], innerAngle: 15, outerAngle: 32, radius: 6.5, intensity: 44, color: '#ffd9a0' }),
  /** where rain catches its light (the drop clock colours drops near lamps lighter) */
  warms: () => [[[place.head[0], place.head[1] - 0.4, place.head[2]], 3.2]],
  /** the lamp as a spot the view can drive: a cone down onto the pavement */
  lamps: () => [{ id: 'street', at: [place.head[0], place.head[1] - 0.1, place.head[2]], color: '#ffd9a0', intensity: 1.2, radius: 6.5, direction: [0.05, -1, 0.1], inner: 15, outer: 32 }]
});

function street({ S, K, B, M }, head) {
  // lamp post on the pavement, with a few flyers pasted to it and a broom against it
  const x0 = -3.05, z0 = head[2], [hx, hy] = head;
  S.lathe([x0, 0.14, z0], 0.34, [0.17, 0.085], M.iron, { res: 0.035 });
  S.tube([[x0, 0.45, z0], [x0, hy + 0.1, z0]], 0.065, 0.05, M.iron, { res: 0.035 });
  S.torus([x0, 2.5, z0], 0.06, 0.02, M.iron, { res: 0.024 });
  S.tube([[x0, hy + 0.05, z0], [x0 + 0.08, hy + 0.42, z0], [x0 + 0.4, hy + 0.5, z0], [hx, hy + 0.38, z0]], 0.04, 0.034, M.iron, { res: 0.03 });
  S.lathe([hx, hy + 0.06, z0], 0.2, [0.27, 0.07], M.iron, { res: 0.03 });
  S.ball([hx, hy + 0.03, z0], [0.15, 0.07, 0.15], M.bulb, { res: 0.026, ghost: true });
  S.box([x0 + 0.075, 1.85, z0 + 0.02], [0.01, 0.2, 0.15], M.cream, { res: 0.026 });
  S.box([x0 + 0.075, 1.38, z0 - 0.04], [0.01, 0.15, 0.12], M.red, { res: 0.026 });
  S.box([x0 - 0.01, 1.6, z0 + 0.075], [0.13, 0.17, 0.01], M.cream, { res: 0.026 });
  S.tube([[x0 + 0.5, 0.3, z0 - 0.45], [x0 + 0.1, 2.5, z0 - 0.1]], 0.02, 0.02, M.wood, { res: 0.024 });
  S.tube([[x0 + 0.54, 0.14, z0 - 0.49], [x0 + 0.5, 0.36, z0 - 0.45]], 0.13, 0.045, M.bamboo, { res: 0.026 });
  // bin bags against the kerb
  for (const [x, z, s] of [[-3.5, -0.85, 1], [-3.0, -0.72, 0.74]]) {
    S.ball([x, 0.32 * s, z], [0.36 * s, 0.32 * s, 0.34 * s], M.black, { res: 0.04 });
    S.lathe([x + 0.03, 0.56 * s, z], 0.16 * s, [0.1 * s, 0.03 * s], M.black, { res: 0.024 });
  }
  // gas bottle with its hose, crates, a water butt, a traffic cone, a plant in a pot
  S.lathe([2.55, 0, -0.5], 0.8, t => 0.21 * (t < 0.07 ? 0.85 : t > 0.84 ? Math.sqrt(Math.max(0, 1 - ((t - 0.84) / 0.16) ** 2)) : 1), M.steel, { res: 0.035 });
  S.torus([2.55, 0.84, -0.5], 0.1, 0.02, M.iron, { res: 0.022 });
  S.torus([2.55, 0.42, -0.5], 0.212, 0.012, M.red, { res: 0.022 });
  S.tube([[2.55, 0.86, -0.5], [2.3, 1.1, -0.45], [1.9, 0.9, -0.5], [1.75, 1.2, -0.6]], 0.016, 0.016, M.black, { res: 0.022 });
  S.crate({ at: [3.0, 0.14, -2.1], size: [0.36, 0.28, 0.3], mat: M.planks, edge: M.wood });
  S.crate({ at: [3.05, 0.7, -2.15], size: [0.3, 0.22, 0.26], mat: M.planks, edge: M.wood });
  S.crate({ at: [2.25, 0.14, -2.45], size: [0.3, 0.2, 0.26], mat: M.planks, edge: M.wood });
  S.lathe([0.55, 0.14, -2.35], 1.0, t => 0.36 * (0.86 + 0.14 * Math.sin(Math.PI * t)), M.blue, { res: 0.035 });
  for (const yy of [0.4, 0.9]) S.torus([0.55, yy, -2.35], 0.365, 0.014, M.black, { res: 0.022 });
  S.lathe([0.55, 1.14, -2.35], 0.03, [0.38, 0.38], M.blue, { res: 0.03 });
  S.box([3.3, 0.02, 1.2], [0.2, 0.02, 0.2], M.cone, { res: 0.03 });
  S.lathe([3.3, 0.04, 1.2], 0.58, [0.15, 0.035], M.cone, { res: 0.028 });
  S.lathe([3.3, 0.3, 1.2], 0.1, [0.1, 0.082], M.cream, { res: 0.024 });
  S.lathe([-1.5, 0.14, -2.75], 0.34, [0.2, 0.27], M.wood, { res: 0.03 });
  S.canopy({ at: [-1.5, 0.82, -2.75], size: [0.44, 0.42, 0.44], lobes: 4, mat: M.green, cluster: 5, bump: 1.5, seed: 4 });
}
