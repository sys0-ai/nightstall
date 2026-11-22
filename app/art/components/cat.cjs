// The cat that has come in out of the rain: black, in a white bib and white socks, a red collar with a bell. It sits
// upright on a box facing forward, its tail held up beside it with the tip curled over. Its joints: the head on its
// neck, ears and eyes on the head, and the tail in three lengths, each turning where it joins the last. What it does
// (looks, blinks, ear flicks, tail swishes, nods to music) is its behaviour in views/actors/cat.ts.

/* where its joints are, measured from where it sits: x to its left, z the way it faces */
const CAT_AT = {
  neck: [0, 0.66, 0.1],
  ear: s => [s * 0.105, 0.9, 0.1],
  eye: s => [s * 0.085, 0.785, 0.266],
  tail: [[0.03, 0.07, -0.25], [0.2, 0.06, -0.3], [0.31, 0.14, -0.27], [0.35, 0.36, -0.24], [0.34, 0.58, -0.22], [0.3, 0.74, -0.2], [0.22, 0.8, -0.19]]
};

/** place: { id, at: [x, y, z] where it sits (the top of its box) } */
module.exports = place => {
  const id = place.id ?? 'cat', CAT = place.at, point = p => [CAT[0] + p[0], CAT[1] + p[1], CAT[2] + p[2]];
  return {
    id,
    sculpt(ctx) { sculptCat(ctx, id, CAT); },
    rig: () => [
      { name: id + '.head', pivot: point(CAT_AT.neck) },
      { name: id + '.earL', pivot: point(CAT_AT.ear(1)), parent: id + '.head' },
      { name: id + '.eyeL', pivot: point(CAT_AT.eye(1)), parent: id + '.head' },
      { name: id + '.earR', pivot: point(CAT_AT.ear(-1)), parent: id + '.head' },
      { name: id + '.eyeR', pivot: point(CAT_AT.eye(-1)), parent: id + '.head' },
      { name: id + '.tailA', pivot: point(CAT_AT.tail[0]) },
      { name: id + '.tailB', pivot: point(CAT_AT.tail[2]), parent: id + '.tailA' },
      { name: id + '.tailC', pivot: point(CAT_AT.tail[4]), parent: id + '.tailB' }
    ]
  };
};

function sculptCat({ S, B, M }, id, CAT) {
  const catPoint = p => [CAT[0] + p[0], CAT[1] + p[1], CAT[2] + p[2]];
  const at = (x, y, z) => catPoint([x, y, z]), fine = { res: 0.02 }, head = { res: 0.018, tag: id + '.head' };
  // the box it sits on
  S.crate({ at: [CAT[0], 0, CAT[2] - 0.04], size: [0.27, CAT[1] / 2, 0.31], mat: M.planks, edge: M.wood });
  // haunches, a slim body that narrows up to the chest, the bib on it
  S.ball(at(0, 0.19, -0.1), [0.185, 0.19, 0.225], M.fur, fine);
  S.tube([at(0, 0.22, -0.05), at(0, 0.53, 0.07)], 0.165, 0.105, M.fur, fine);
  S.ball(at(0, 0.44, 0.15), [0.062, 0.13, 0.04], M.cream, fine);
  for (const s of [-1, 1]) {
    // a hind foot tucked forward beside the body, and a straight foreleg down to its paw, each with a white toe
    S.ball(at(s * 0.135, 0.045, 0.1), [0.055, 0.045, 0.105], M.fur, fine);
    S.ball(at(s * 0.135, 0.04, 0.19), [0.046, 0.034, 0.04], M.cream, { res: 0.016 });
    S.tube([at(s * 0.066, 0.44, 0.12), at(s * 0.07, 0.07, 0.19)], 0.044, 0.037, M.fur, fine);
    S.ball(at(s * 0.07, 0.04, 0.215), [0.048, 0.038, 0.06], M.cream, { res: 0.016 });
  }
  // a long neck, collar and bell
  S.tube([at(0, 0.53, 0.07), at(0, 0.67, 0.1)], 0.1, 0.09, M.fur, fine);
  S.torus(at(0, 0.6, 0.086), 0.095, 0.014, M.collar, { res: 0.014 });
  S.ball(at(0, 0.568, 0.188), 0.024, M.brass, { res: 0.012 });
  // the head: skull, cheeks, a white muzzle with a pink nose
  S.ball(at(0, 0.79, 0.12), [0.175, 0.148, 0.16], M.fur, head);
  for (const s of [-1, 1]) S.ball(at(s * 0.105, 0.735, 0.19), [0.07, 0.058, 0.06], M.fur, head);
  S.ball(at(0, 0.722, 0.262), [0.058, 0.038, 0.035], M.cream, { ...head, res: 0.014 });
  S.ball(at(0, 0.746, 0.296), [0.013, 0.01, 0.008], M.nose, { ...head, res: 0.009 });
  for (const s of [-1, 1]) {
    // an ear, dusky inside
    const ear = { res: 0.014, tag: id + (s < 0 ? '.earR' : '.earL') };
    S.tube([at(s * 0.105, 0.885, 0.1), at(s * 0.15, 1.065, 0.085)], 0.068, 0.008, M.fur, ear);
    S.tube([at(s * 0.11, 0.91, 0.128), at(s * 0.143, 1.025, 0.108)], 0.036, 0.006, M.dusk, ear);
    // an eye: a big yellow almond lying on the skull, turned a little outward as the skull is there, its pupil on it
    const eye = { res: 0.011, tag: id + (s < 0 ? '.eyeR' : '.eyeL'), ghost: true, ax: B.frame(s * 0.47, 0, 0) };
    const [ex, ey, ez] = CAT_AT.eye(s), out = [s * 0.453, 0, 0.891];
    S.ball(at(ex, ey, ez), [0.05, 0.052, 0.014], M.eye, eye);
    S.ball(at(ex + out[0] * 0.012, ey, ez + out[2] * 0.012), [0.017, 0.042, 0.008], M.pupil, eye);
  }
  // the tail, in three lengths that each turn where they join: out from under it, up, and the curl at the top, which
  // is white at the very tip
  const T = CAT_AT.tail.map(catPoint);
  S.tube([T[0], T[1], T[2]], 0.05, 0.045, M.fur, { res: 0.02, tag: id + '.tailA' });
  S.tube([T[2], T[3], T[4]], 0.045, 0.04, M.fur, { res: 0.02, tag: id + '.tailB' });
  S.tube([T[4], T[5], T[6]], 0.04, 0.03, M.fur, { res: 0.018, tag: id + '.tailC' });
  S.ball(T[6], 0.035, M.cream, { res: 0.016, tag: id + '.tailC' });
}

