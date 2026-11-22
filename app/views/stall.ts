// The night stall, drawn live. Adapted from pixel-dioramas' night-stall/page.js (github.com/cola5939/pixel-dioramas).
//
// Ink Studio's WebGL renderer draws the baked scene: the sculpt, the rain and steam, what swings. One small pass over
// its picture then adds the lit mist (each lamp's halo, the street lamp's cone) and lays the wet ground's mirror into
// road and pools. For that Ink notes, in the low bits of each pixel's colour, what kind of splat it shows and how far
// off it is. The actors reach the picture in two places: each joint's pose and each emitter's amount, which the scene's
// puppet and emitters read (`world.pose`, `world.fx`), and the
// pass's uniforms, which set the lamps' glow and hue, the mist, and how hard the puddles shake.
import * as engine from "./engine.ts";
import { layout, packed, plain } from "./world.ts";
import { createWater, type Drive } from "./water.ts";

// (the engine is generated JavaScript: its own types say nothing useful)
const { createRenderer, scene, toolkit } = engine as any;

export type View = { target: number[]; yaw: number; pitch: number; dist: number };
/** A joint's pose: rotation in degrees about its pivot, offset in units, scale, and whether it shows. */
export type Pose = { rot?: number[]; pos?: number[]; scale?: number[]; show?: number };
/** A joint of the baked scene: where it turns, what it rides, and how it hangs if it hangs. */
export type Joint = { name: string; pivot: number[]; parent?: string; group?: string; swing?: { length: number; amp: number; hinged?: boolean; tassel?: boolean } };
/** The emitters' amounts (0–1): how much rain falls, how much steam and how big it swells, how many bubbles and how hard
 * it boils, and the last jolt to the broth (how hard, and how many seconds ago) that throws spatter up. */
export type Fx = { rain: number; steam: number; steamLevel: number; bubbles: number; boil: number; burst: number; burstAge: number };
/**
 * What the music does to light and water this frame: the lamps' level, flash and hue, the mist, the rain, and the
 * puddles' drive (low hits and the held bass's shaking, which water.ts turns into waves) with how brightly their
 * tilted surfaces may catch the lamps.
 */
export type Light = { glow: number; pulse: number; hue: number; mist: number; rain: number; water: Drive; sparkle: number; lamps: Record<string, number>; lighting: Lighting };
/** A lamp of the scene as a light: where, what colour, how bright at rest, how far it reaches, and a cone if it is a spot. */
export type Lamp = { id: string; at: number[]; color: string; intensity: number; radius: number; direction?: number[]; inner?: number; outer?: number };
/**
 * The lighting model's controls, each 0–1: `strength` how strongly changes in the lamps' light show on what they light,
 * `fill` how much the lamps light beyond what was baked, `reach` how far their light carries, `softness` how far light
 * wraps round a surface turned away, `ambient` the level of everything else, `snap` how strictly the lit picture keeps
 * the scene's own palette (0: smooth dithered colour, 1: only the palette's colours).
 */
export type Lighting = { strength: number; fill: number; reach: number; softness: number; ambient: number; snap: number };

const { LOOP, GLOW, camera: filmCamera } = scene;
export { LOOP };
/** The film's picture in art pixels at the scene's detail, and its lens (half its angle of view, as a tangent). */
/** The film's frame in art pixels at Classic size; Fine (the default) draws twice as many each way. */
const FRAME_W = 640, FRAME_H = 360, LENS = Math.tan((19 * Math.PI) / 180);
export const NEAR = 5.5, FAR = 13, LOW = 0.1, HIGH = 1.25;
const REACH = 5.5, STEPS = 64, DEEP = 256, ROAD = 1, POOL = 2, GLOWS = 3;
const bytes = (hex: string | number) => (typeof hex === "number" ? [hex >> 16, (hex >> 8) & 255, hex & 255] : [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
const rgb = (hex: string | number) => bytes(hex).map(v => v / 255);
/** Turn a colour about the grey axis by `degrees`. */
export function turnHue([r, g, b]: number[], degrees: number): number[] {
  const a = (degrees * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), k = (1 - c) / 3, q = Math.sqrt(1 / 3) * s;
  return [r! * (c + k) + g! * (k - q) + b! * (k + q), r! * (k + q) + g! * (c + k) + b! * (k - q), r! * (k - q) + g! * (k + q) + b! * (c + k)];
}

export function homeView(): View {
  const home = filmCamera(0);
  // (lower and a little forward of the film's opening shot, so the front puddle is in the picture)
  return { target: [home.target[0], home.target[1] - 0.4, home.target[2] + 0.45], yaw: home.yaw, pitch: home.pitch, dist: home.dist * 1.1 };
}

async function unsqueeze() {
  const text = atob(packed), zipped = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) zipped[i] = text.charCodeAt(i);
  // (a view's Response takes only text, so the gunzipped stream is read here a chunk at a time)
  const reader = new Blob([zipped]).stream().pipeThrough(new DecompressionStream("gzip")).getReader(), pieces: Uint8Array[] = [];
  let size = 0;
  for (let read = await reader.read(); !read.done; read = await reader.read()) { pieces.push(read.value); size += read.value.length; }
  const all = new Uint8Array(size);
  for (let i = 0, at = 0; i < pieces.length; at += pieces[i]!.length, i++) all.set(pieces[i]!, at);
  const arrays: Record<string, any> = {};
  let at = 0;
  for (const { name, type, length, stride } of layout) {
    const array = new (globalThis as any)[type](length), width = array.BYTES_PER_ELEMENT, rows = length / stride, to = new Uint8Array(array.buffer);
    for (let b = 0; b < width; b++) for (let k = 0; k < stride; k++)
      for (let i = 0, write = k * width + b; i < rows; i++, write += stride * width) to[write] = all[at++]!;
    arrays[name] = array;
  }
  return arrays;
}

/**
 * Per-stage timings for tuning (set `globalThis.__nsProfile = {}`): each stage's wall time with its GPU work finished,
 * so a stage's cost is its own. Off, it costs nothing.
 */
function profiler() {
  const out = (globalThis as { __nsProfile?: Record<string, number[]> }).__nsProfile;
  if (!out) return (_stage: string, _canvas?: HTMLCanvasElement) => {};
  let last = performance.now();
  return (stage: string, canvas?: HTMLCanvasElement) => {
    if (canvas) (canvas.getContext("webgl2") as WebGL2RenderingContext | null)?.finish();
    const now = performance.now();
    if (stage !== "start") (out[stage] ??= []).push(now - last);
    last = now;
  };
}

export async function createStall(canvas: HTMLCanvasElement) {
  const tk = toolkit(), KIT = tk.KIT;
  const world = scene.unpack({ KIT }, { plain, arrays: await unsqueeze() });
  const ink = document.createElement("canvas"), under = document.createElement("canvas"), wet = world.web.mirror;
  const notes: Record<string, Uint8Array> = { kind: new Uint8Array(world.count + 1), "far-low": new Uint8Array(world.count + 1), "far-high": new Uint8Array(world.count + 1) };
  const named = (name: string) => (wet ? KIT.renderGraph.selection(world, { material: name }) : notes.kind);
  const road = named("road"), pool = named("pool");
  for (let i = 0; i < world.count; i++)
    notes.kind![i + 1] = 85 * (Math.round(world.data[i * 16 + 11]) & 32 ? GLOWS : wet && road[i + 1] ? ROAD : wet && pool[i + 1] ? POOL : 0);
  const kit = Object.create(KIT);
  kit.renderGraph = { ...KIT.renderGraph, selection: (_w: unknown, select: { tag: string }) => notes[select.tag] };
  const renderer = createRenderer(ink, { toolkit: { ...tk, KIT: kit } });
  let below: any, mirror: any;
  if (wet) {
    const data = world.data.slice(), { first, count } = world.web.rows, floor = wet.at + 0.02;
    for (let i = 0; i < world.count; i++) if (data[i * 16 + 1] < floor || (i >= first && i < first + count)) data[i * 16 + 3] = 0;
    below = { ...world, data, effectParticles: undefined };
    mirror = createRenderer(under, { toolkit: tk });
  }
  // the data pass: the same scene again, every colour black, with each pixel's surface direction (two bytes,
  // octahedral) and a fine distance (one byte) added by the render graph, for lighting it live in the finish pass
  notes["n-u"] = new Uint8Array(world.count + 1); notes["n-v"] = new Uint8Array(world.count + 1); notes.deep = new Uint8Array(world.count + 1);
  const normals: Int8Array = world.splatNormals;
  for (let i = 0; i < world.count; i++) {
    let x = normals[i * 3]! / 127, y = normals[i * 3 + 1]! / 127, z = normals[i * 3 + 2]! / 127;
    const l1 = Math.abs(x) + Math.abs(y) + Math.abs(z) || 1;
    x /= l1; y /= l1;
    if (z < 0) { const ox = x; x = (1 - Math.abs(y)) * (ox >= 0 ? 1 : -1); y = (1 - Math.abs(ox)) * (y >= 0 ? 1 : -1); }
    notes["n-u"]![i + 1] = 1 + Math.round((x * 0.5 + 0.5) * 253); notes["n-v"]![i + 1] = 1 + Math.round((y * 0.5 + 0.5) * 253);
  }
  const dataCanvas = document.createElement("canvas"), dataRenderer = createRenderer(dataCanvas, { toolkit: { ...tk, KIT: kit } });
  const dark = { ...world, pal: world.pal.map(() => 0) };
  const finish = createFinish(canvas, GLOW, world.web, world.pal, world.lamps as Lamp[]);
  const add = (tag: string, most: number[]) => ({ id: tag, type: "composite", select: { tag }, layer: { source: { w: 1, h: 1, rgba: new Uint8Array([...most, 255]) }, blend: "add" } });
  const frameOptions = { stepAnimation: false, damp: false, renderGraph: { passes: [add("kind", [3, 0, 0]), add("far-low", [0, 3, 0]), add("far-high", [0, 0, 15])] } };
  const dataOptions = { stepAnimation: false, damp: false, outline: false, clean: false, renderGraph: { passes: [add("n-u", [255, 0, 0]), add("n-v", [0, 255, 0]), add("deep", [0, 0, 255])] } };
  const changedRows: number[] = [], { first, count } = world.web.rows;
  if (count) for (let r = Math.floor(first / 512); r <= Math.floor((first + count - 1) / 512); r++) changedRows.push(r);
  let drawn = false, noted = "", dataView = "", dataFrame = 0;

  function noteDistances({ target, yaw, pitch, dist }: View) {
    const key = [target, yaw, pitch, dist].join();
    if (key === noted) return;
    noted = key;
    const bx = Math.cos(pitch) * Math.sin(yaw), by = Math.sin(pitch), bz = Math.cos(pitch) * Math.cos(yaw);
    const base = REACH + target[0]! * bx + target[1]! * by + target[2]! * bz, k = STEPS / (2 * REACH);
    const data = world.data, low = notes["far-low"]!, high = notes["far-high"]!, deep = notes.deep!, fine = DEEP / (2 * REACH);
    for (let i = 1, o = 0, n = world.count; i <= n; i++, o += 16) {
      const along = base - (data[o] * bx + data[o + 1] * by + data[o + 2] * bz);
      let q = (along * k) | 0;
      q = q < 0 ? 0 : q >= STEPS ? STEPS - 1 : q;
      low[i] = (q & 3) * 85; high[i] = (q >> 2) * 17;
      const f = (along * fine) | 0;
      deep[i] = f < 0 ? 0 : f >= DEEP ? DEEP - 1 : f;
    }
  }

  return {
    /** every joint of the scene, from the bake */
    rig: world.rig as Joint[],
    /** every lamp of the scene, as a light */
    lamps: world.lamps as Lamp[],
    /** set this frame's poses and emitter amounts (read when the frame is drawn) */
    set(pose: Record<string, Pose>, fx: Fx) { world.pose = pose; world.fx = fx; },
    /** Draw the scene at `time` seconds into its loop, `width` × `height` device pixels on screen. */
    /**
     * Draw the scene at `time` seconds into its loop, `width` × `height` device pixels on screen. `pixels` is the art
     * pixel size (fine: half the classic size each way); `scale` (0.6–1) is the dynamic resolution, which a machine that
     * cannot hold 60 frames a second lowers smoothly and raises again.
     */
    draw(time: number, view: View, light: Light, width: number, height: number, pixels: "fine" | "classic" = "fine", scale = 1) {
      const quality = (pixels === "fine" ? 2 : 1) * scale;
      // an art pixel takes in as much of the scene as it does in the film: a wider window sees more to either side
      // (the film's whole frame, 640 × 360 art pixels, fits the canvas each way, with a little room)
      // (`quality` below 1 draws fewer, larger art pixels over the same view, for a machine that cannot keep up)
      const fw = FRAME_W * quality, fh = FRAME_H * quality;
      const px = Math.max(1, Math.min(width / (0.92 * fw), height / (0.92 * fh)));
      const w = Math.max(16, Math.min(1400, Math.round(width / px))), h = Math.max(16, Math.round(height / px));
      const lens = (LENS * h) / fh, fov = 2 * Math.atan(lens);
      Object.assign(world.cam, view);
      const mark = profiler(); mark("start");
      world.anim.update(1 / 60, time);
      mark("animate");
      noteDistances(view);
      const { target, yaw, pitch, dist } = view;
      renderer.render(world, { width: w, height: h, time, ...(drawn && { changedRows }), camera: { target, yaw, pitch, dist, fov }, ...frameOptions });
      mark("scene", ink);
      // reflections and the lighting data are drawn at half the art resolution and upsampled by the finish pass: the
      // reflection is bent by the water and the lighting is smooth, so neither shows it, and each costs a quarter
      const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2);
      if (below) mirror.render(below, {
        width: hw, height: hh, time, ...(drawn && { changedRows: [] }), outline: false, clean: false, stepAnimation: false, damp: false,
        camera: { target: [target[0], 2 * world.web.mirror.at - target[1]!, target[2]], yaw, pitch: -pitch, dist, fov },
      });
      mark("mirror", under);
      // the data pass changes only with the camera and with what moves, so between camera moves it is drawn every third frame
      const viewKey = [target, yaw, pitch, dist, hw, hh].join();
      const freshData = viewKey !== dataView || ++dataFrame % 3 === 0;
      if (freshData) { dataRenderer.render(dark, { width: hw, height: hh, time, ...(drawn && { changedRows }), camera: { target, yaw, pitch, dist, fov }, ...dataOptions }); dataView = viewKey; }
      mark("data", dataCanvas);
      finish.draw(ink, below && under, freshData ? dataCanvas : null, w, h, hw, hh, view, lens, time, light);
      mark("finish", canvas);
      drawn = true;
    },
    /** the puddles' wave grids (for tests and the console) */
    get water() { return finish.water; },
    dispose() { renderer.dispose?.(); mirror?.dispose?.(); finish.dispose(); },
  };
}

/** The pass that finishes Ink's picture: the lit mist, the wet ground, and the lamps' colour and glow. */
function createFinish(target: HTMLCanvasElement, mist: any, web: any, inked: number[], lamps: Lamp[]) {
  const gl = target.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) throw new Error("Night Stall needs WebGL 2.");
  const P = mist.points.length, R = mist.ramp.colors.length, N = web.colours.length, spot = mist.spots[0], LAMPS = Math.max(1, lamps.length);
  const wet = web.mirror, rings = wet?.rings, DROPS = 256, kept = bytes(web.bits);
  // the lamplight's own colours, which the hue control turns: the lamps' paper, bulbs, sign and glow
  const tinted = new Set([0xff9a3c, 0xffd070, 0xfff3c2, 0xcd362a, 0xf26a3a]);
  const tint = web.colours.map((c: number) => (tinted.has(c) ? 1 : 0));
  const f = (v: number) => (Number.isInteger(v) ? v + ".0" : String(v));
  const fragment = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_scene, u_under;
uniform highp sampler2D u_drops;
uniform int u_dropCount;
uniform vec2 u_size, u_lens, u_far, u_half;   // (u_half: the size of the reflection and data pictures)
uniform vec3 u_eye, u_right, u_up, u_back;
uniform float u_drift, u_density, u_hue, u_glowPulse, u_sparkle, u_time;
uniform sampler2D u_data;                       // the data pass: surface direction (r, g) and fine distance (b)
uniform vec2 u_deep;                            // the fine distance's zero and steps per unit along the eye's axis
uniform vec4 u_lampAt[${LAMPS}];                 // each lamp: where, and how far its light reaches
uniform vec3 u_lampNow[${LAMPS}], u_lampRest[${LAMPS}];   // its light now (colour × intensity), and as it was baked
uniform vec4 u_lampCone[${LAMPS}];               // a spot's axis and the cosine of its edge (w < -1: no cone)
uniform float u_lampCore[${LAMPS}];              // a spot's cosine at the edge of its full core
uniform vec4 u_lighting;                        // strength, fill, softness (wrap), ambient
uniform float u_snap;
uniform highp sampler2D u_water;              // the puddles' heights (water.ts), one grid after another
uniform vec4 u_waterBox[${wet ? wet.pools.length : 1}];    // each grid: x0, z0, cell, first row
uniform vec2 u_waterSize[${wet ? wet.pools.length : 1}];   // and its columns and rows
uniform vec4 u_lamp[${P}], u_lampLight[${P}];
uniform vec4 u_beam, u_beamAxis, u_beamLight;
uniform vec3 u_ramp[${R}], u_night, u_mist;
uniform ivec3 u_inked[${N}];
uniform vec3 u_colour[${N}];
uniform float u_tint[${N}];
${wet ? `uniform int u_weather[${wet.weather.length}]; uniform vec3 u_roadTint, u_poolTint;` : ""}
out vec4 o;
const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
const vec3 LUMA = vec3(0.30, 0.55, 0.15);

vec3 turn(vec3 c, float degrees) {
  float a = radians(degrees), co = cos(a), s = sin(a), k = (1.0 - co) / 3.0, q = 0.57735027 * s;
  return mat3(co + k, k + q, k - q, k - q, co + k, k + q, k + q, k - q, co + k) * c;
}
float thick(vec3 p) {
  return clamp((${f(mist.reach)} - length(p.xz)) * 0.6, 0.0, 1.0) * clamp((${f(mist.top)} - p.y) * 0.8, 0.0, 1.0) * step(0.0, p.y) *
    (0.8 + 0.2 * sin(0.9 * p.x + 1.3 * p.z + u_drift) * sin(1.7 * p.y - 0.6 * p.z));
}
float phase(float c) { return ${f(1 - mist.anisotropy ** 2)} / pow(${f(1 + mist.anisotropy ** 2)} - ${f(2 * mist.anisotropy)} * c, 1.5); }
bool within(vec3 eye, vec3 d, vec2 stretch, vec3 c, float r, out float t0, out float t1) {
  vec3 u = c - eye; float tc = dot(u, d), b = dot(u, u) - tc * tc;
  if (b >= r * r) return false;
  float h = sqrt(r * r - b); t0 = max(stretch.x, tc - h); t1 = min(stretch.y, tc + h);
  return t1 > t0;
}
vec4 haze(vec3 eye, vec3 d, float stop) {
  vec2 span = vec2(0.0, stop);
  if (abs(d.y) > 1e-5) { vec2 t = vec2(-eye.y, ${f(mist.top)} - eye.y) / d.y; span = vec2(max(span.x, min(t.x, t.y)), min(span.y, max(t.x, t.y))); }
  else if (eye.y < 0.0 || eye.y > ${f(mist.top)}) return vec4(0.0);
  float qa = dot(d.xz, d.xz), qb = dot(eye.xz, d.xz), qc = dot(eye.xz, eye.xz) - ${f(mist.reach * mist.reach)};
  if (qa > 1e-8) {
    float disc = qb * qb - qa * qc;
    if (disc <= 0.0) return vec4(0.0);
    span = vec2(max(span.x, (-qb - sqrt(disc)) / qa), min(span.y, (-qb + sqrt(disc)) / qa));
  } else if (qc > 0.0) return vec4(0.0);
  if (span.y <= span.x) return vec4(0.0);
  float t0, t1, depth = 0.0, whole = (span.y - span.x) / 16.0;
  for (int k = 0; k < 16; k++) depth += thick(eye + d * (span.x + (float(k) + 0.5) * whole)) * whole;
  vec3 lit = vec3(0.0);
  for (int i = 0; i < ${P}; i++) if (within(eye, d, span, u_lamp[i].xyz, u_lamp[i].w, t0, t1)) {
    float dt = (t1 - t0) / 12.0, sum = 0.0;
    for (int k = 0; k < 12; k++) {
      vec3 p = eye + d * (t0 + (float(k) + 0.5) * dt), to = u_lamp[i].xyz - p;
      float r = length(to), fall = 1.0 - r / u_lamp[i].w;
      if (p.y < u_lampLight[i].w) sum += thick(p) * fall * fall * phase(dot(d, to / r));
    }
    lit += u_lampLight[i].rgb * (sum * dt);
  }
  if (within(eye, d, span, u_beam.xyz, u_beam.w, t0, t1)) {
    float dt = (t1 - t0) / 28.0, sum = 0.0;
    for (int k = 0; k < 28; k++) {
      vec3 p = eye + d * (t0 + (float(k) + 0.5) * dt), to = u_beam.xyz - p;
      float r = length(to), fall = 1.0 - r / u_beam.w, c = -dot(to / r, u_beamAxis.xyz);
      sum += thick(p) * fall * fall * phase(dot(d, to / r)) * smoothstep(u_beamAxis.w, u_beamLight.w, c);
    }
    lit += u_beamLight.rgb * (sum * dt);
  }
  return vec4(lit * u_mist, 1.0 - exp(-u_density * depth));
}
float glow(vec3 eye, vec3 d) {
  vec4 h = haze(eye, d, 1e9);
  if (h.a < ${f(mist.ramp.threshold)} * min(1.0, u_density / ${f(mist.density)})) return -1.0;
  return clamp((dot(u_night * (1.0 - h.a) + h.rgb, LUMA) - ${f(mist.ramp.range[0])}) / ${f(mist.ramp.range[1] - mist.ramp.range[0])}, 0.0, 1.0) * ${f(R - 1)};
}
int colourOf(ivec3 texel) {
  ivec3 key = texel & ivec3(${kept.join(", ")});
  for (int i = 1; i < ${N}; i++) if (u_inked[i] == key) return i;
  return 0;
}
vec3 nearest(vec3 c) {
  vec3 pick = c; float best = 1e9;
  for (int i = 1; i < ${N}; i++) {
    vec3 df = c - u_colour[i]; float dist = dot(df * df, LUMA);
    if (dist < best) { best = dist; pick = u_colour[i]; }
  }
  return pick;
}
${wet ? `
// the rain's rings: their slope at a place on the ground
vec2 tilt(vec2 g) {
  vec2 slope = vec2(0.0);
  for (int i = 0; i < u_dropCount; i++) {
    vec4 drop = texelFetch(u_drops, ivec2(i, 0), 0);
    vec2 u = g - drop.xy; float r = length(u), travel = r - drop.z;
    if (r < 1e-6 || abs(travel) >= ${f(rings.width)}) continue;
    slope += u * (sin(6.2831853 * travel / ${f(rings.scale)}) * (1.0 - smoothstep(0.0, 1.0, (abs(travel) / ${f(rings.width)} - 0.2) / 0.8)) *
      smoothstep(0.0, 1.0, drop.z / ${f(rings.scale * 0.25)}) * exp(-${f(rings.damping)} * r) / r * drop.w);
  }
  return ${f(rings.amplitude)} * slope;
}
// a puddle's height at a place on the ground, read from its grid with bilinear filtering (0 off the grid)
float heightAt(vec2 g) {
  for (int i = 0; i < ${wet.pools.length}; i++) {
    vec4 box = u_waterBox[i]; vec2 size = u_waterSize[i];
    vec2 q = (g - box.xy) / box.z - 0.5;
    if (q.x < 0.0 || q.y < 0.0 || q.x > size.x - 1.0 || q.y > size.y - 1.0) continue;
    ivec2 a = ivec2(floor(q)); vec2 k = q - vec2(a); int row = int(box.w);
    float h00 = texelFetch(u_water, ivec2(a.x, row + a.y), 0).r, h10 = texelFetch(u_water, ivec2(min(a.x + 1, int(size.x) - 1), row + a.y), 0).r;
    float h01 = texelFetch(u_water, ivec2(a.x, row + min(a.y + 1, int(size.y) - 1)), 0).r, h11 = texelFetch(u_water, ivec2(min(a.x + 1, int(size.x) - 1), row + min(a.y + 1, int(size.y) - 1)), 0).r;
    return mix(mix(h00, h10, k.x), mix(h01, h11, k.x), k.y);
  }
  return 0.0;
}
// the surface's slope there (rise per unit along x and z)
vec2 gradientAt(vec2 g) {
  float e = 0.03;
  return vec2(heightAt(g + vec2(e, 0.0)) - heightAt(g - vec2(e, 0.0)), heightAt(g + vec2(0.0, e)) - heightAt(g - vec2(0.0, e))) / (2.0 * e);
}
vec4 mirrored(ivec2 p) {
  ivec2 q = ivec2((vec2(clamp(p, ivec2(0), ivec2(u_size) - 1)) + 0.5) * u_half / u_size);
  ivec3 texel = ivec3(texelFetch(u_under, ivec2(q.x, int(u_half.y) - 1 - q.y), 0).rgb * 255.0 + 0.5);
  int i = colourOf(texel);
  return i > 0 ? vec4(u_tint[i] > 0.5 ? turn(u_colour[i], u_hue) : u_colour[i], 1.0) : vec4(0.0);
}` : ""}
// the light falling on a point with a normal: each lamp's colour, softened by distance (an inverse square, windowed to
// its reach), turned by the angle (wrapped by \`softness\`) and, for a spot, its cone
vec3 lampLight(vec3 p, vec3 n, bool now) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${LAMPS}; i++) {
    vec3 l = u_lampAt[i].xyz - p; float dist = max(1e-3, length(l)); l /= dist;
    float x = dist / u_lampAt[i].w, window = clamp(1.0 - x * x * x * x, 0.0, 1.0);
    float fall = window * window / (1.0 + 1.6 * dist * dist);
    float facing = clamp((dot(n, l) + u_lighting.z) / (1.0 + u_lighting.z), 0.0, 1.0);
    float cone = u_lampCone[i].w < -1.0 ? 1.0 : smoothstep(u_lampCone[i].w, u_lampCore[i], dot(-l, u_lampCone[i].xyz));
    sum += (now ? u_lampNow[i] : u_lampRest[i]) * fall * facing * cone;
  }
  return sum;
}
vec3 decodeNormal(vec2 e) {
  vec2 q = (e - 1.0) / 253.0 * 2.0 - 1.0;
  vec3 n = vec3(q, 1.0 - abs(q.x) - abs(q.y));
  if (n.z < 0.0) n.xy = (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
  return normalize(n);
}
// how a lit colour settles back into pixel art: dithered to a few levels a channel, or onto the palette itself
vec3 settle(vec3 c, ivec2 at) {
  if (u_snap > 0.92) return nearest(c);
  float levels = mix(36.0, 7.0, u_snap), rank = (BAYER[(at.x & 3) + ((at.y & 3) << 2)] + 0.5) / 16.0 - 0.5;
  return clamp(floor(c * levels + 0.5 + rank * 0.9) / levels, 0.0, 1.0);
}
void main() {
  ivec2 at = ivec2(gl_FragCoord.xy);
  ivec3 seen = ivec3(texelFetch(u_scene, at, 0).rgb * 255.0 + 0.5);
  vec3 d = normalize(u_right * ((gl_FragCoord.x / u_size.x * 2.0 - 1.0) * u_lens.x) + u_up * ((gl_FragCoord.y / u_size.y * 2.0 - 1.0) * u_lens.y) - u_back);
  if (seen == ivec3(0)) {
    float rank = (BAYER[(at.x & 3) + (((int(u_size.y) - 1 - at.y) & 3) << 2)] + 0.5) / 16.0, g = glow(u_eye, d);
    o = vec4(g < 0.0 ? u_night : turn(u_ramp[int(clamp(floor(g + (rank - 0.5) * ${f(mist.ramp.dither)} + 0.5), 0.0, ${f(R - 1)}))], u_hue), 1.0);
    return;
  }
  int kind = seen.r & 3, far = ((seen.b & 15) << 2) | (seen.g & 3), index = colourOf(seen);
  vec3 c = index > 0 ? u_colour[index] : vec3(seen) / 255.0;
  o = vec4(c, 1.0);
  // what glows keeps its colour, mist or no mist: lamplight takes the hue and brightens on a hit
  if (kind == ${GLOWS} || index == 0) {
    if (index > 0 && u_tint[index] > 0.5) o.rgb = clamp(mix(turn(c, u_hue), vec3(1.0), u_glowPulse), 0.0, 1.0);
    return;
  }
  bool changed = false, lit = false;
  // live lighting: this pixel's surface, from the data pass, lit by the lamps as they are now against how they were baked
  ivec3 datum = ivec3(texelFetch(u_data, ivec2((vec2(at) + 0.5) * u_half / u_size), 0).rgb * 255.0 + 0.5);
  if (datum.r > 0 && datum.g > 0) {
    vec3 n = decodeNormal(vec2(datum.rg));
    float onAxis = u_deep.x - (float(datum.b) + 0.5) / u_deep.y;           // the point's projection on the eye's axis
    vec3 p = u_eye + d * ((onAxis - dot(u_eye, u_back)) / dot(d, u_back));
    vec3 now = lampLight(p, n, true), rest = lampLight(p, n, false);
    vec3 f = u_lighting.w + u_lighting.y * now + u_lighting.x * (now - rest);
    if (max(abs(f.r - 1.0), max(abs(f.g - 1.0), abs(f.b - 1.0))) > 0.02) { c = c * f; changed = true; lit = true; }
  }
${wet ? `  bool plain = true;
  for (int i = 0; i < ${wet.weather.length}; i++) if (index == u_weather[i]) plain = false;
  if ((kind == ${ROAD} || kind == ${POOL}) && plain && d.y < -0.001) {
    vec4 shown; vec2 surface = vec2(0.0); vec3 ground = vec3(0.0);
    if (kind == ${POOL}) {
      // the mirrored scene, bent by the water's slope: the rain's rings and the music's waves
      ground = u_eye + d * ((${f(wet.at)} - u_eye.y) / d.y);
      surface = gradientAt(ground.xz);
      vec2 slope = tilt(ground.xz) * ${f(wet.pool.distortion)} + surface * 10.0;
      shown = mirrored(at + ivec2(floor(vec2(dot(slope, u_right.xz), dot(slope, u_up.xz)) + 0.5)));
    } else {
      shown = 0.4 * mirrored(at) + 0.15 * (mirrored(at + ivec2(${Math.round(wet.road.blur)}, 0)) + mirrored(at - ivec2(${Math.round(wet.road.blur)}, 0)) +
        mirrored(at + ivec2(0, ${Math.round(wet.road.blur)})) + mirrored(at - ivec2(0, ${Math.round(wet.road.blur)})));
    }
    if (shown.a <= 0.0) {
      float g = glow(vec3(u_eye.x, ${f(2 * wet.at)} - u_eye.y, u_eye.z), vec3(d.x, -d.y, d.z));
      if (g >= 0.75) {
        int i = int(min(g, ${f(R - 1.001)}));
        shown = vec4(turn(mix(u_ramp[i], u_ramp[i + 1], g - float(i)), u_hue), 1.0) * smoothstep(0.75, 2.5, g);
      }
    }
    if (shown.a > 0.0) {
      float graze = 1.0 - clamp(-d.y, 0.0, 1.0);
      float share = kind == ${POOL} ? (${f(wet.pool.f0)} + ${f(1 - wet.pool.f0)} * pow(graze, ${f(wet.pool.power ?? 5)})) * ${f(wet.pool.strength)}
                                : (${f(wet.road.f0)} + ${f(1 - wet.road.f0)} * pow(graze, ${f(wet.road.power ?? 5)})) * ${f(wet.road.strength)};
      c = mix(c, shown.rgb / shown.a * (kind == ${POOL} ? u_poolTint : u_roadTint), share * shown.a);
      changed = true;
    }
    // moving water catches the lamps: reflect the eye's ray off the surface's normal and compare how much lamplight it
    // meets with what flat water meets. Where a ripple tilts toward a lamp the water brightens, where it tilts away it
    // darkens: bands of light that move with the waves, as on a glass of water on a speaker. Still water is unchanged;
    // a sharp alignment adds a glint.
    if (kind == ${POOL} && dot(surface, surface) > 1e-4) {
      vec3 n = normalize(vec3(-surface.x, 1.0, -surface.y)), r = reflect(d, n), still = reflect(d, vec3(0.0, 1.0, 0.0));
      vec3 sheen = vec3(0.0); float best = 0.0; vec3 tint = vec3(0.0);
      for (int i = 0; i < ${P}; i++) {
        vec3 to = normalize(u_lamp[i].xyz - ground);
        vec3 lampTint = u_lampLight[i].rgb / max(1e-3, max(u_lampLight[i].r, max(u_lampLight[i].g, u_lampLight[i].b)));
        float near = clamp(1.0 - length(u_lamp[i].xyz - ground) / (u_lamp[i].w * 3.5), 0.0, 1.0);
        sheen += lampTint * near * (pow(max(0.0, dot(r, to)), 8.0) - pow(max(0.0, dot(still, to)), 8.0));
        float s = pow(max(0.0, dot(r, to)), 400.0);
        if (s > best) { best = s; tint = lampTint; }
      }
      c = max(vec3(0.0), c + sheen * 2.6 * u_sparkle);
      changed = true;
      float glint = best * u_sparkle;
      if (glint > 0.25) c += tint * (glint > 0.6 ? 0.85 : 0.45);
    }
  }` : ""}
  vec4 h = haze(u_eye, d, (u_far.x + (float(far) + 0.5) * u_far.y) / -dot(d, u_back));
  float glare = dot(h.rgb, LUMA);
  if (glare > 0.003) {
    if (glare > 0.3) h.rgb *= (0.3 + 0.2 * (1.0 - exp((0.3 - glare) / 0.2))) / glare;
    c = c * (1.0 - h.a) + h.rgb;
    changed = true;
  }
  if (changed) o.rgb = lit ? settle(c, at) : nearest(c);
}`;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, "#version 300 es\nvoid main() { gl_Position = vec4(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0, 0.0, 1.0); }"));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "program");
  gl.useProgram(program);
  const U = (name: string) => gl.getUniformLocation(program, name);
  gl.bindVertexArray(gl.createVertexArray());
  const textures: WebGLTexture[] = [];
  const texture = (unit: number) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    const made = gl.createTexture()!;
    textures.push(made);
    gl.bindTexture(gl.TEXTURE_2D, made);
    for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
      gl.texParameteri(gl.TEXTURE_2D, key!, value!);
  };
  texture(0); texture(1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  texture(2);
  const drops = new Float32Array(DROPS * 4);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, DROPS, 1, 0, gl.RGBA, gl.FLOAT, drops);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.uniform1i(U("u_scene"), 0); gl.uniform1i(U("u_under"), 1); gl.uniform1i(U("u_drops"), 2);
  gl.uniform3fv(U("u_ramp"), mist.ramp.colors.flatMap(rgb));
  gl.uniform3fv(U("u_night"), rgb(mist.night));
  gl.uniform4fv(U("u_lamp"), mist.points.flatMap((p: any) => [...p.at, p.radius]));
  const unit = (v: number[]) => { const l = Math.hypot(...v); return v.map(n => n / l); }, cos = (deg: number) => Math.cos((deg * Math.PI) / 180);
  gl.uniform4fv(U("u_beam"), [...spot.at, spot.radius]);
  gl.uniform4fv(U("u_beamAxis"), [...unit(spot.direction), cos(spot.outerAngle)]);
  gl.uniform3iv(U("u_inked"), inked.slice(0, N).flatMap(bytes));
  gl.uniform3fv(U("u_colour"), web.colours.flatMap(rgb));
  gl.uniform1fv(U("u_tint"), tint);
  if (wet) {
    gl.uniform1iv(U("u_weather"), wet.weather);
    gl.uniform3fv(U("u_roadTint"), rgb(wet.road.color));
    gl.uniform3fv(U("u_poolTint"), rgb(wet.pool.color));
  }
  const at = {
    size: U("u_size"), lens: U("u_lens"), far: U("u_far"), eye: U("u_eye"), right: U("u_right"), up: U("u_up"), back: U("u_back"),
    drift: U("u_drift"), light: U("u_lampLight"), drops: U("u_dropCount"), density: U("u_density"), mist: U("u_mist"), hue: U("u_hue"),
    pulse: U("u_glowPulse"), sparkle: U("u_sparkle"), time: U("u_time"), beamLight: U("u_beamLight"),
  };
  // the puddles' wave grids, on texture unit 3
  const water = wet ? createWater(wet.pools) : null;
  if (water) {
    texture(3);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, water.width, water.height, 0, gl.RED, gl.FLOAT, water.atlas);
    gl.uniform1i(U("u_water"), 3);
    gl.uniform4fv(U("u_waterBox"), water.boxes.flatMap(([x0, z0, cell, row]) => [x0!, z0!, cell!, row!]));
    gl.uniform2fv(U("u_waterSize"), water.boxes.flatMap(([, , , , n, m]) => [n!, m!]));
  }
  let lastDraw = performance.now();
  // the data pass's picture, on texture unit 4
  texture(4);
  gl.uniform1i(U("u_data"), 4);
  const lampAt = U("u_lampAt"), lampNow = U("u_lampNow"), lampRest = U("u_lampRest"), lampCone = U("u_lampCone"), lampCore = U("u_lampCore");
  const rest = lamps.flatMap(l => rgb(l.color).map(v => v * l.intensity));
  gl.uniform3fv(lampRest, rest.length ? rest : [0, 0, 0]);
  gl.uniform4fv(lampCone, lamps.length ? lamps.flatMap(l => l.direction ? [...unit(l.direction), cos(l.outer ?? 30)] : [0, -1, 0, -2]) : [0, -1, 0, -2]);
  gl.uniform1fv(lampCore, lamps.length ? lamps.map(l => cos(l.inner ?? 15)) : [1]);
  return {
    draw(scene: HTMLCanvasElement, underneath: HTMLCanvasElement | undefined, data: HTMLCanvasElement | null, w: number, h: number, hw: number, hh: number, { target: aim, yaw, pitch, dist }: View, lens: number, t: number, light: Light) {
      if (target.width !== w) target.width = w;
      if (target.height !== h) target.height = h;
      gl.viewport(0, 0, w, h);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
      if (underneath) {
        gl.activeTexture(gl.TEXTURE1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, underneath);
        // the puddles: step their waves by the time since the last frame under this frame's drive
        if (water) {
          const now = performance.now(), dt = Math.min(0.05, (now - lastDraw) / 1000);
          lastDraw = now;
          water.step(dt, light.water);
          gl.activeTexture(gl.TEXTURE3);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, water.width, water.height, gl.RED, gl.FLOAT, water.atlas);
        }
        let n = 0;
        for (const field of rings.fields) {
          const frame = field.frame(t);
          const take = Math.min(frame.count, DROPS - n);
          for (let i = 0; i < take; i++) {
            drops.set(frame.drops.subarray(i * 4, i * 4 + 3), (n + i) * 4);
            drops[(n + i) * 4 + 3] = frame.drops[i * 4 + 3] * light.rain;
          }
          n += take;
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.activeTexture(gl.TEXTURE2);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, DROPS, 1, gl.RGBA, gl.FLOAT, drops);
        gl.uniform1i(at.drops, n);
      }
      const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
      const back = [cp * sy, sp, cp * cy];
      gl.uniform2f(at.size, w, h);
      gl.uniform2f(U("u_half"), hw, hh);
      gl.uniform2f(at.lens, (lens * w) / h, lens);
      gl.uniform2f(at.far, dist - REACH, (2 * REACH) / STEPS);
      gl.uniform3f(at.eye, aim[0]! + dist * back[0]!, aim[1]! + dist * back[1]!, aim[2]! + dist * back[2]!);
      gl.uniform3f(at.right, cy, 0, -sy);
      gl.uniform3f(at.up, -sp * sy, cp, -sp * cy);
      gl.uniform3fv(at.back, back);
      gl.uniform1f(at.drift, t * mist.drift);
      gl.uniform1f(at.time, t);
      const density = mist.density * light.mist;
      gl.uniform1f(at.density, density);
      gl.uniform3fv(at.mist, rgb(mist.color).map(v => v * density));
      gl.uniform1f(at.hue, light.hue);
      gl.uniform1f(at.pulse, light.pulse);
      gl.uniform1f(at.sparkle, light.sparkle);
      // the lamps as lights: their reach scaled by the control, their light now turned by the hue and driven by the music
      // (a frame that drew no new data keeps the picture it has)
      if (data) {
        gl.activeTexture(gl.TEXTURE4);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
      }
      const L = light.lighting, reach = 0.5 + 1.5 * L.reach;
      if (lamps.length) {
        gl.uniform4fv(lampAt, lamps.flatMap(l => [...l.at, l.radius * reach]));
        gl.uniform3fv(lampNow, lamps.flatMap(l => turnHue(rgb(l.color), light.hue).map(v => v * l.intensity * Math.max(0, light.lamps[l.id] ?? 1) * light.glow)));
      }
      gl.uniform4f(U("u_lighting"), 2 * L.strength, 0.6 * L.fill, L.softness, 0.4 + 1.2 * L.ambient);
      gl.uniform1f(U("u_snap"), L.snap);
      gl.uniform2f(U("u_deep"), REACH + aim[0]! * back[0]! + aim[1]! * back[1]! + aim[2]! * back[2]!, DEEP / (2 * REACH));
      gl.uniform4fv(at.light, mist.points.flatMap((p: any) =>
        [...turnHue(rgb(p.color), light.hue).map(v => v * p.intensity * light.glow * (p.flame ? mist.flame(t) : 1)), p.under ?? 1e9]));
      gl.uniform4fv(at.beamLight, [...rgb(spot.color).map(v => v * spot.intensity * (0.6 + 0.4 * light.glow)), cos(spot.innerAngle)]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    /** the puddles' wave grids (for tests and the console) */
    water,
    dispose() {
      for (const made of textures) gl.deleteTexture(made);
      gl.deleteProgram(program);
    },
  };
}
