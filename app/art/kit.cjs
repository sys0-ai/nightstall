/* The shared kit for Night Stall's components: the palette (laid down a ramp at a time, dark to light), the materials
   every component sculpts with, and the film loop's clocks. A component in components/ takes what it needs from here and
   nothing from another component, so it can be placed in another scene that uses the same kit. */
const DETAIL = 64, TAU = Math.PI * 2;
/* Everything that moves comes round again after this many seconds, so a film of it can be looped: `every` turns a
   period into the nearest one that divides the loop, `pace` does the same for an angular speed */
const LOOP = 36;
const every = period => LOOP / Math.max(1, Math.round(LOOP / period));
const pace = speed => (Math.max(1, Math.round((speed * LOOP) / TAU)) * TAU) / LOOP;

/* The palette is laid down a ramp at a time, dark to light; C holds each ramp's indices */
const PALETTE = [0x05060c];
const ramp = (...cols) => { const at = PALETTE.length; PALETTE.push(...cols); return cols.map((_, i) => at + i); };
const C = {
  night: ramp(0x0b0f1e, 0x12182c, 0x1c2540, 0x2a355a, 0x3f4e76, 0x62749b),          // asphalt, stone, every shadow side
  warm: ramp(0x2b2236, 0x46364a, 0x6b4549, 0x8a5a4c, 0xb07650, 0xcc8a55, 0xf3c27c), // the same where lamplight reaches
  teal: ramp(0x0b222c, 0x143b48, 0x215c66, 0x388686, 0x6fbaa6),                     // the cart's paint
  tealWarm: ramp(0x5a8a6a, 0xa8b46d, 0xe9d98c),
  red: ramp(0x24080e, 0x52111f, 0x931e26, 0xcd362a, 0xf26a3a),                      // awning stripes, lantern, stools
  glow: ramp(0xff9a3c, 0xffd070, 0xfff3c2),                                         // lamplight itself
  cream: ramp(0x282a44, 0x545376, 0x9c939e, 0xdbc7ad, 0xfff0d2),                    // awning stripes, bowls, paper
  steel: ramp(0x0f131e, 0x242d43, 0x4f5e7e, 0x8fa2ba, 0xd4dfea),
  steelWarm: ramp(0xae8d69, 0xe8c58a, 0xfff1c9),
  wood: ramp(0x170e14, 0x2e1c27, 0x55342e, 0x86563a, 0xbe8850),
  woodWarm: ramp(0xd9a15c, 0xf6d087),
  green: ramp(0x0a2016, 0x174527, 0x2c753a, 0x63b35a),                              // bottles, leaves
  black: ramp(0x04050a, 0x0c0e18, 0x181c2c, 0x282e45),                              // tyres, the cat, bin bags
  rain: ramp(0x475c8c, 0x7d99c6, 0xc7ddf1),                                         // rain, steam, glints
  eye: ramp(0xffe066),
  cone: ramp(0xd9571f, 0xff8b3d),
  flame: ramp(0x5aa2ff)
};
const hex = i => '#' + PALETTE[i].toString(16).padStart(6, '0');
/* for the `web` variant: the bits of a colour the picture keeps. Two colours above are the same in these bits (the
   warm glint on steel and the lightest of the lamplight): there steel takes the lamplight's */
const WEB_BITS = 0xfcfcf0;

const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/* the materials, made once per sculpt (a patterned material needs the toolkit, and the browser's variant leaves out the
   lamp-lit ramps the film's renderer would use) */
function materials(K, opt) {
  const n = C.night, w = C.warm;
  const stoneLit = [n[2], w[1], w[2], w[3], w[4], w[5]];
  /* (a patterned material's lamp-lit ramp: the film's renderer does not use it, the WebGL renderer does. The scene was
     made by looking at the first, so the second is not given one) */
  const lit = g => (opt.web ? {} : { g });
  const M = {
    paving: { ...K.pixel.masonry({ r: n.slice(1), stone: [13, 8], joint: 2, vary: 0.3, seed: 5 }), ...lit(stoneLit) },
    kerb: { r: n.slice(2), g: stoneLit },
    rock: { r: n.slice(0, 4) },
    line: { r: [C.cream[1], C.cream[2], C.cream[3]], g: [C.cream[2], C.cream[3], C.cream[4]] },
    teal: { r: C.teal, g: [C.teal[1], C.teal[2], C.tealWarm[0], C.tealWarm[0], C.tealWarm[1], C.tealWarm[2]] },
    tealDark: { r: C.teal.slice(0, 3), g: [C.teal[1], C.teal[2], C.tealWarm[0], C.tealWarm[1]] },
    red: { r: C.red, g: [C.red[1], C.red[2], C.red[2], C.red[3], C.red[3], C.red[4]] },
    cream: { r: C.cream, g: [C.cream[1], C.cream[2], C.cream[3], C.cream[3], C.cream[4], C.cream[4]] },
    steel: { r: C.steel, g: [C.steel[1], C.steel[2], C.steel[3], C.steel[3], C.steel[4], opt.web ? C.glow[2] : C.steelWarm[2]] },
    iron: { r: [C.steel[0], C.steel[0], C.steel[1], C.steel[2]], g: [C.steel[1], w[1], w[2], w[3]] },
    planks: { ...K.pixel.planks({ r: C.wood, width: 6, along: 'x', seed: 2 }), ...lit([C.wood[2], C.wood[3], C.woodWarm[0], C.woodWarm[1]]) },
    wood: { r: C.wood, g: [C.wood[2], C.wood[3], C.woodWarm[0], C.woodWarm[1]] },
    bamboo: { r: C.wood.slice(1), g: [C.wood[3], C.wood[4], C.woodWarm[0], C.woodWarm[1]] },
    band: { r: [C.wood[1], C.wood[2]], g: [C.wood[2], C.wood[3]] },
    black: { r: C.black },
    fur: { r: C.black, g: [C.black[1], C.black[2], C.black[3], w[0], w[1]] },     // black stays black under a lamp
    dusk: { r: [C.black[3], w[0]], g: [w[1], w[2]] },                              // the inside of an ear
    nose: { r: [C.red[2]] },
    collar: { r: [C.red[2], C.red[3]], g: [C.red[3], C.red[4]] },
    brass: { r: [C.wood[3], C.woodWarm[0]], g: [C.woodWarm[0], C.woodWarm[1]] },
    pupil: { r: [C.black[0]] },
    green: { r: C.green, g: [C.green[2], C.green[3], C.tealWarm[1], C.tealWarm[2]] },
    blue: { r: n.slice(2), g: [n[3], n[4], n[5], C.rain[1]] },
    cone: { r: [C.red[1], C.red[2], C.cone[0], C.cone[1]] },
    broth: { r: [w[4], w[5], w[6]], g: [w[5], w[6], C.glow[2]] },
    bulb: { r: [C.glow[2]], em: true },
    eye: { r: C.eye, em: true },
    flame: { r: opt.web ? [C.rain[1]] : C.flame, em: true }
  };
  return M;
}

module.exports = { DETAIL, TAU, LOOP, every, pace, PALETTE, ramp, C, hex, WEB_BITS, norm, materials };
