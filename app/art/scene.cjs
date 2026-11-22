/* The night stall: a street-food cart on a wet night, composed from components (components/*.cjs).

   Vendored and reorganised from github.com/cola5939/pixel-dioramas (night-stall/scene.js) for sys0's Night Stall app.
   Each component sculpts its own geometry at the place given here and declares its rig (the joints that can move, with
   their pivots and how they hang), the lights it adds and the steam or bubbles it gives off. This file only places them,
   lights the mist, bakes the rain, steam and bubble emitters, and sets the world moving. It holds no behaviour: every
   joint's pose comes from `world.pose` and every emitter's amount from `world.fx`, which the view's actors
   (views/actors/*.ts, composed by views/stage.ts) set each frame. The detail is raised from 48 to 64 art pixels a
   unit. art/build.ts bakes it.

   One unit is about half a metre. Nothing here remembers the frame before: rain, splashes, steam, bubbles, mist and the
   camera are worked out from the clock, so any frame can be drawn on its own. `web: true` is for a page that draws it
   live with Ink Studio's WebGL renderer, which has no mirroring materials and no lit mist: the page does those two
   itself, from `world.web` and GLOW. */
const { DETAIL, TAU, LOOP, pace, PALETTE, C, hex, WEB_BITS, norm, materials } = require('./kit.cjs');
const rain = require('./components/rain.cjs'), steam = require('./components/steam.cjs'), bubbles = require('./components/bubbles.cjs');

/* where things stand and hang */
const KERB = -1.3, RAD = 4.3;
const AWN = { x0: -1.05, x1: 1.75, zf: 1.42, zb: -1.2, ridgeZ: 0.0, ridgeY: 3.78, frontY: 3.28, backY: 3.4, over: 0.43, stripes: 11 };
const SIGN_AT = [2.8, 2.61, 1.37], TABLE = { at: [-2.3, 2.25], top: 1.18 };
/* standing water: each pool is a few flat blobs [x, z, rx, rz] run together */
const POOLS = [
  { id: 'pool-front', blobs: [[0.75, 3.0, 1.2, 0.5], [1.6, 3.3, 0.7, 0.36], [-0.1, 3.3, 0.6, 0.3]] },
  { id: 'pool-lantern', blobs: [[-1.55, 1.45, 0.62, 0.34], [-1.1, 1.2, 0.4, 0.22]] },
  { id: 'pool-sign', blobs: [[2.8, 0.25, 0.5, 0.72], [3.1, -0.5, 0.4, 0.38]] }
];
const WATER = 0.012;
/* how the wet ground mirrors: the road faintly and a little blurred, a pool nearly everything, bent by its rings */
const MIRROR = {
  road: { f0: 0.28, power: 4, strength: 0.9, distortion: 0, blur: 1.5, color: '#ffffff' },
  pool: { f0: 0.85, strength: 0.98, distortion: 6, blur: 0.3, color: '#dde4f2' }
};
const RINGS = { amplitude: 0.3, scale: 0.2, speed: 0.85, width: 0.28, damping: 1.1 };

/* the components, in the order they are sculpted (the builder's random draws follow this order) */
const awning = require('./components/awning.cjs')({ id: 'awning', ...AWN, railTo: SIGN_AT[0] });
const COMPONENTS = [
  require('./components/ground.cjs')({ RAD, KERB, WATER }),
  require('./components/cart.cjs')(),
  awning,
  require('./components/lantern.cjs')({ id: 'lantern', at: [-1.72, 2.62, 1.5], hook: AWN.frontY - 0.1, from: [AWN.x0, AWN.frontY - 0.12, 0.72] }),
  require('./components/bulbs.cjs')({ id: 'bulbs', x0: AWN.x0 - 0.3, x1: AWN.x1 + 0.3, y: AWN.frontY - 0.42, z: AWN.zf - 0.16, sag: 0.14, roof: AWN.frontY, light: [0.35, 2.95, 1.2] }),
  require('./components/ladles.cjs')({ id: 'ladles', y: AWN.frontY - 0.06, z: AWN.zf - 0.06, hooks: [[0.95, 0.5, 'steel'], [1.2, 0.42, 'steel'], [1.45, 0.56, 'wood']] }),
  require('./components/sign.cjs')({ id: 'sign', at: SIGN_AT, rail: awning.rail }),
  require('./components/counter.cjs')(),
  require('./components/table.cjs')({ id: 'table', ...TABLE }),
  require('./components/stools.cjs')({ stools: [[[TABLE.at[0] - 1.0, 0, TABLE.at[1] - 0.25], 0.2, 'red'], [[TABLE.at[0] + 0.1, 0, TABLE.at[1] + 1.0], -0.3, 'teal'], [[TABLE.at[0] + 1.45, 0, TABLE.at[1] + 0.95], 0.7, 'red', true]], crate: { at: [-3.3, 0, 0.75] } }),
  require('./components/cat.cjs')({ id: 'cat', at: [0.3, 0.36, 1.3] }),
  require('./components/street.cjs')({ head: [-2.3, 4.25, -1.75] })
];

/* the scene: sculpted and baked, then set moving */
function build(kit, seed, o) {
  const made = sculpt(kit, seed, o);
  return animate(kit.KIT, made.world, made.moves, made.opt, made.rings);
}

/* The sculpting and the baking: ten seconds' work. It gives the world as it stands still, and what `animate` needs to
   set it moving: `moves` (plain data: which splats each joint carries, the rig, and the emitters), the options it was
   made with, and the pools' ripple fields. */
function sculpt(kit, seed, o = {}) {
  const { makeBuilder, makeSculpt, KIT: K } = kit;
  const opt = { rain: true, steam: true, wet: true, fog: true, web: false, ...(o.controls || {}) };
  /* (the WebGL renderer has room for 64 colours: there the last, the burner's blue, goes without. Its backdrop is pure
     black, a colour nothing else in the picture comes out as, so the page can tell the backdrop from the scene; and the
     low bits of every colour are left clear (WEB_BITS), for the page to have each pixel say what it shows and how far
     off. What the page puts on the screen are the colours as they are written in kit.cjs) */
  const B = makeBuilder(seed, opt.web ? [0x000000, ...PALETTE.slice(1, 64).map(c => c & WEB_BITS)] : PALETTE), S = K.sculpt(makeSculpt(B)), tags = K.deform.tags(S);
  S.pixel = true;
  S.pixelSize(DETAIL);
  // a moon somewhere behind and to the left, kept low so that the lamps make the picture
  S.sun = norm([-0.5, 0.72, -0.48]);
  S.amb = 0.15; S.sky = 0.12; S.sunK = 0.24; S.wob = 0.012;
  for (const c of COMPONENTS) if (c.light) S.lights.push(c.light());
  const n = C.night, w = C.warm, M = materials(K, opt);
  /* The road is wet: it mirrors, faintly, what stands on it. Pools are flat sheets over it that mirror cleanly, and
     ring where the rain lands in them. One mirrored view serves both. */
  const mirror = K.reflection.plane({ id: 'street', at: [0, WATER, 0], select: i => i < mirror.upTo });
  mirror.upTo = Infinity;
  const road = { r: [n[0], n[0], n[1], n[2], n[3]], g: [n[1], w[0], w[1], w[2], w[3], w[4], w[5]], materialId: 'road' };
  const mirrors = opt.wet && !opt.web;   // (in the browser the page does the mirroring: it is given MIRROR and the rings)
  M.road = !mirrors ? road : K.reflection.material(road, 'street', MIRROR.road);
  const pools = POOLS.map(p => ({ ...p, rings: K.ripple.field(RINGS) }));
  for (const p of pools)
    p.mat = !mirrors ? (opt.web ? { r: [n[0], n[1], n[2], n[3]], materialId: 'pool' } : { r: [n[1], n[2], n[3]] }) : K.reflection.material(K.surface.material({ r: [n[0], n[1], n[2], n[3]], materialId: p.id }, {
      normal: p.rings.normal,
      layers: { glint: { type: 'specular', color: hex(C.rain[2]), roughness: [0.12, 0.18], strength: 0.35 } }
    }), 'street', MIRROR.pool);

  const ctx = { S, K, B, M, opt, pools };
  for (const c of COMPONENTS) c.sculpt(ctx);
  // what the rain lands on: the sculpt itself, asked before it is baked into dabs
  const shelter = K.atmosphere.occluder(S.modelSource().field.sdf, { bias: 0.02, step: 0.03, steps: 220 });
  S.bake();
  // the emitters, baked after the sculpt as dabs the clock moves: rain, then each component's steam, then its bubbles
  let state = 7;
  const rnd = () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
  const sources = COMPONENTS.flatMap(c => c.emitters?.() ?? []), first = B.count();
  const fx = {
    rain: opt.rain ? rain.bake(ctx, shelter, POOLS, rnd) : { drops: [], rings: POOLS.map(() => []) },
    steam: steam.bake(ctx, opt.steam ? sources.filter(s => s.kind === 'steam') : [], rnd),
    bubbles: bubbles.bake(ctx, opt.steam ? sources.filter(s => s.kind === 'bubbles') : [], rnd)
  };
  fx.first = first; fx.count = B.count() - first;
  fx.rain.rings.forEach((starts, i) => starts.forEach(start => pools[i].rings.add(start)));
  mirror.upTo = first;   // rain and steam are left out of the mirrored view: in it they are only noise

  const world = B.finish({
    cam: { ...camera(0), sway: 0 },
    radius: 7.5, detail: DETAIL, dither: 0,
    look: { pixel: true, outline: true, clean: true, ...(opt.fog && !opt.web && { effectPalettes: MIST_COLOURS }) },
    ...(mirrors && { reflections: [mirror] }),
    ...(opt.fog && !opt.web && mist(K, shelter))
  });
  // rain and steam are drawn a pixel or two wide: they are not specks for the clean-up to take away
  if (fx.count) (world.effectParticles ||= []).push({ first: fx.first, count: fx.count });
  const rig = COMPONENTS.flatMap(c => c.rig?.() ?? []), lamps = COMPONENTS.flatMap(c => c.lamps?.() ?? []);
  return { world, moves: { tags: Object.fromEntries(Object.entries(tags)), fx, rig, lamps }, opt, rings: pools.map(p => p.rings) };
}

/* What sets a baked world moving: the puppet, whose every joint takes its pose from `world.pose`, and the emitters on
   their clocks, whose amounts come from `world.fx`. It serves a world just sculpted and one taken out of store alike.
   (The puppet marks the splats it carries, in the world's own rows: so a world is stored as it is before this.) */
function animate(K, world, moves, opt, rings) {
  /** the joints, each { name, pivot, parent?, swing?, group? }, for the view's actors */
  world.rig = moves.rig;
  /** the lamps as lights the view drives: { id, at, color, intensity, radius, direction?, inner?, outer? } */
  world.lamps = moves.lamps;
  /** each joint's pose this frame: { rot: [x, y, z] degrees, pos: [x, y, z], scale: [x, y, z], show: 0 | 1 } */
  world.pose = {};
  /** the emitters' amounts this frame: rain, steam, steamLevel, bubbles, boil (0–1) */
  world.fx = { rain: 0.6, steam: 0.6, steamLevel: 0, bubbles: 0.5, boil: 0 };
  const parts = {};
  for (const j of moves.rig) if (moves.tags[j.name]) parts[j.name] = { ids: moves.tags[j.name], pivot: j.pivot, ...(j.parent && parts[j.parent] && { parent: j.parent }) };
  const still = { rot: [0, 0, 0] };
  world.swing = K.puppet(world, {
    parts,
    pose(t, dt, pup) { const P = pup.pose; for (const name in parts) P[name] = world.pose[name] || still; }
  });
  const warms = COMPONENTS.flatMap(c => c.warms?.() ?? []);
  const clocks = [rain.clock(moves.fx.rain, warms), steam.clock(moves.fx.steam), bubbles.clock(moves.fx.bubbles)];
  const rest = world.data, puppet = world.anim.update;
  const weather = t => { const eye = eyeOf(world.cam); for (const tick of clocks) tick(rest, t, world.fx, eye, world.pose); };
  world.anim.update = function (dt, t) {
    puppet.call(this, dt, t);
    if (!opt.still) Object.assign(world.cam, camera(t));
    weather(t);
  };
  weather(0);
  /* what a page drawing this live needs besides the world: the colours to show (the world's own have their low bits
     cleared), which rows change every frame (rain and steam), and the wet ground's mirror, which it lays in itself:
     the plane, how the road and the pools mirror, the pools' rings, and which colours rain and steam are drawn in
     (a dab of those over the road is not road) */
  if (opt.web) world.web = {
    colours: PALETTE.slice(0, 64), bits: WEB_BITS,
    rows: { first: moves.fx.first, count: moves.fx.count },
    mirror: opt.wet && { at: WATER, ...MIRROR, rings: { ...RINGS, fields: rings }, pools: POOLS.map(p => ({ blobs: p.blobs })),
      weather: [...C.rain, ...C.cream.slice(2), C.glow[2]] }
  };
  return world;
}

/* The film: once round the island in LOOP seconds, slower past the front, closing in as it passes each end of the cart
   and standing back for the front and the back, a little higher behind than before */
function camera(t) {
  const u = (t / LOOP) * TAU;
  return {
    target: [0.1, 1.78 + 0.1 * Math.sin(u) ** 2, 0.1],
    yaw: 0.22 + u - 0.34 * Math.sin(u),
    pitch: 0.335 - 0.055 * Math.cos(u),
    dist: 8.95 + 0.65 * Math.cos(2 * u)
  };
}

const eyeOf = ({ target, yaw, pitch, dist }) =>
  [target[0] + dist * Math.cos(pitch) * Math.sin(yaw), target[1] + dist * Math.sin(pitch), target[2] + dist * Math.cos(pitch) * Math.cos(yaw)];

/* The wet air: a thin mist over the island that only shows where a lamp lights it, so each lamp wears a halo and the
   street lamp throws a cone. Against the night it is drawn in its own few colours, dithered from one to the next. */
const MIST = {
  reach: 6, top: 6.4, density: 0.025, anisotropy: 0.15, color: '#8fa0c0',
  drift: pace(0.5),                                                                  // how fast its thin patches wander
  flame: t => 1 + 0.07 * Math.sin(t * pace(2.3)) + 0.04 * Math.sin(t * pace(5.3) + 1),   // the lantern breathes, as a flame does
  // (`under`, for a page that draws the glow itself: the roof over that lamp, above which it lights no mist. The film's
  // renderer needs no telling: it shadows the mist with the sculpt)
  // each lamp's glow, from the components that are lamps, and the street lamp's cone
  points: COMPONENTS.flatMap(c => c.glow?.() ?? []),
  spots: COMPONENTS.flatMap(c => (c.spot ? [c.spot()] : []))
};
function mist(K, shelter) {
  const D = K.procedural.density, clamp = K.clamp, { reach, top } = MIST;
  const field = D.bounded({
    bounds: { min: [-reach, 0, -reach], max: [reach, top, reach] },
    sample: (x, y, z, t) => clamp((reach - Math.hypot(x, z)) * 0.6, 0, 1) * clamp((top - y) * 0.8, 0, 1) * (0.8 + 0.2 * Math.sin(0.9 * x + 1.3 * z + t * MIST.drift) * Math.sin(1.7 * y - 0.6 * z))
  });
  return {
    atmosphere: [K.atmosphere.field({ id: 'mist', field, density: MIST.density, step: 0.3, anisotropy: MIST.anisotropy, color: MIST.color })],
    volumeLighting: {
      ambient: 0, shadow: shelter,
      points: MIST.points.map(({ flame, intensity, ...light }) => ({ ...light, intensity: flame ? t => intensity * MIST.flame(t) : intensity })),
      spots: MIST.spots
    },
    volumeQuality: { steps: 20, scale: 2 }
  };
}
const MIST_COLOURS = {
  fog: { colors: ['#0a0810', '#170d14', '#28141a', '#40201f', '#613324', '#8a4d2c', '#b86e38'], threshold: 0.04, range: [0.02, 0.35], dither: 0.6 },
  // what glows keeps the colour it has, mist or no mist: the lamps, and the rain and steam, which are drawn as glowing
  emission: { colors: [...C.rain, ...C.cream.slice(2), ...C.glow, C.red[2], C.red[3], C.red[4], C.warm[1], C.warm[3], ...C.eye, ...C.flame].map(hex), mode: 'nearest', threshold: 0.05 }
};


const SEED = 23;
module.exports = kit => ({
  id: 'night-stall',
  name: 'Night stall',
  seed: SEED,
  build: (seed, o) => build(kit, seed, o)
});
module.exports.PALETTE = PALETTE;
module.exports.DETAIL = DETAIL;
module.exports.LOOP = LOOP;
module.exports.camera = camera;
/* for a page that draws the mist's glow itself: the mist and its lamps, the colours it is drawn in, and the night behind */
module.exports.GLOW = { ...MIST, ramp: MIST_COLOURS.fog, night: hex(0) };
/* For a page that is to open at once and not sculpt and bake for ten seconds first: `pack` does the sculpting (the
   `web` variant, for a page that turns the view itself) and gives the world that makes as data, { plain, arrays }:
   `plain` survives JSON, `arrays` are the big typed arrays, for the page's builder to store as it likes. `unpack` is
   given the same back, wants only KIT, and returns the world set moving, as `build` would have. */
const PACKED = ['count', 'ramps', 'rampOff', 'pats', 'bg', 'seed', 'pal', 'palName', 'dither', 'fog', 'outline', 'radius', 'cam', 'detail', 'look', 'effectParticles'];
module.exports.pack = kit => {
  const { world, moves, opt } = sculpt(kit, SEED, { controls: { web: true, still: true } });
  return {
    plain: { world: Object.fromEntries(PACKED.map(key => [key, world[key]])), materials: world.renderMetadata.materials, controls: opt, moves },
    // (each splat's surface direction, for lighting it live: three signed bytes)
    arrays: { data: world.data, pix: world.pix, materialIds: world.renderMetadata.materialIds, normals: Int8Array.from(world.renderMetadata.normals, v => Math.round(Math.max(-1, Math.min(1, v)) * 127)) }
  };
};
module.exports.unpack = ({ KIT: K }, { plain, arrays }) => {
  const world = { ...plain.world, data: arrays.data, pix: arrays.pix, moving: new Int32Array(0), back: new Int32Array(0),
    renderMetadata: { materialIds: arrays.materialIds, materials: plain.materials } };
  /** each splat's surface direction, three signed bytes (for the view's live lighting) */
  world.splatNormals = arrays.normals;
  const rings = plain.moves.fx.rain.rings.map(starts => { const field = K.ripple.field(RINGS); for (const start of starts) field.add(start); return field; });
  return animate(K, world, plain.moves, plain.controls, rings);
};
