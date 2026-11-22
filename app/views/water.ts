// Water that answers vibration as a real puddle does. Each puddle is a small height field (a grid of cells 0.035 units,
// about 2 cm, masked to the puddle's shape) run by the damped wave equation:
//
//     ∂²h/∂t² = c² ∇²h − γ ∂h/∂t + F
//
// with reflecting (no-flux) shores. Music reaches it the way a speaker's thump reaches water standing on the floor: the
// ground jolts, and since the water moves with its basin, waves are launched at the shore and run inward, crossing and
// interfering into the puddle's own standing patterns. A kick is one jolt; a held bass note shakes the basin steadily at
// a few hertz, and its parametric term (the surface's restoring force modulated at the shaking rate) lets the patterns
// lock into Faraday-like standing waves as it grows. The picture never draws the waves: the finish pass bends the
// mirrored scene by the surface's slope and lets lamps glint where the tilted water catches them (stall.ts).

export type Puddle = { blobs: number[][] };
/** What drives the water this frame: low hits (song time and strength), and the held bass's shaking (0–1) and rate (Hz). */
export type Drive = { t: number; hits: { time: number; strength: number }[]; hum: number; hz: number };

const CELL = 0.035, SPEED = 0.85, DAMPING = 4, SUBSTEP = 1 / 240;

export function createWater(puddles: Puddle[]) {
  const grids = puddles.map(p => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z, rx, rz] of p.blobs) { x0 = Math.min(x0, x! - rx!); x1 = Math.max(x1, x! + rx!); z0 = Math.min(z0, z! - rz!); z1 = Math.max(z1, z! + rz!); }
    x0 -= CELL; z0 -= CELL;
    const n = Math.ceil((x1 - x0) / CELL) + 2, m = Math.ceil((z1 - z0) / CELL) + 2, size = n * m;
    const wet = new Uint8Array(size), shore = new Float32Array(size), seed = new Float32Array(size);
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * CELL, z = z0 + (j + 0.5) * CELL;
      wet[j * n + i] = p.blobs.some(([bx, bz, rx, rz]) => ((x - bx!) / rx!) ** 2 + ((z - bz!) / rz!) ** 2 < 0.8) ? 1 : 0;
    }
    // the shore: wet cells within two cells of dry ground, where a jolt of the basin lifts the water first
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const k = j * n + i; if (!wet[k]) continue;
      let near = 3;
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= n || b >= m || !wet[b * n + a]) near = Math.min(near, Math.max(Math.abs(di), Math.abs(dj)));
      }
      shore[k] = near === 1 ? 1 : near === 2 ? 0.45 : 0;
      // a fixed small roughness, so a strong shake has something to grow standing patterns from
      seed[k] = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453 % 1;
    }
    return { x0, z0, n, m, wet, shore, seed, h: new Float32Array(size), v: new Float32Array(size) };
  });
  const width = Math.max(...grids.map(g => g.n)), height = grids.reduce((s, g) => s + g.m, 0);
  const atlas = new Float32Array(width * height);
  let row = 0;
  const boxes = grids.map(g => { const box = [g.x0, g.z0, CELL, row, g.n, g.m]; row += g.m; return box; });
  let last = -Infinity, clock = 0;

  function substep(dt: number, shake: number, parametric: number) {
    const c2 = (SPEED * SPEED) / (CELL * CELL);
    for (const g of grids) {
      const { n, m, wet, shore, h, v } = g;
      for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
        const k = j * n + i; if (!wet[k]) continue;
        const here = h[k]!;
        // no flux through the shore: a dry neighbour stands at this cell's height
        const l = i > 0 && wet[k - 1] ? h[k - 1]! : here, r = i < n - 1 && wet[k + 1] ? h[k + 1]! : here;
        const u = j > 0 && wet[k - n] ? h[k - n]! : here, d = j < m - 1 && wet[k + n] ? h[k + n]! : here;
        v[k] = v[k]! + (c2 * (l + r + u + d - 4 * here) * (1 + parametric) - DAMPING * v[k]! + shake * shore[k]!) * dt;
      }
      for (let k = 0; k < h.length; k++) if (wet[k]) h[k] = h[k]! + v[k]! * dt;
    }
  }

  return {
    boxes, width, height, atlas,
    /** Advance by `dt` seconds of the page's clock under this frame's drive. */
    step(dt: number, drive: Drive) {
      if (drive.t < last - 0.5) last = -Infinity;   // a seek back or a new song: forget which hits were spent
      for (const hit of drive.hits) if (hit.time > last && hit.time <= drive.t) {
        // a jolt: the shore is kicked up and the whole sheet takes a slight, uneven shove
        // (it moves water about without adding any: the shove has no mean)
        for (const g of grids) {
          let sum = 0, count = 0;
          for (let k = 0; k < g.h.length; k++) if (g.wet[k]) { sum += 0.6 * g.shore[k]! + 0.08 * g.seed[k]!; count++; }
          const mean = sum / Math.max(1, count);
          for (let k = 0; k < g.h.length; k++) if (g.wet[k]) g.v[k] = g.v[k]! + hit.strength * 0.22 * (0.6 * g.shore[k]! + 0.08 * g.seed[k]! - mean);
        }
      }
      last = Math.max(last, drive.t);
      const steps = Math.min(8, Math.max(1, Math.round(dt / SUBSTEP)));
      for (let s = 0; s < steps; s++) {
        clock += dt / steps;
        const phase = Math.sin(2 * Math.PI * drive.hz * clock);
        substep(dt / steps, drive.hum * 5 * phase, drive.hum * 0.3 * Math.sin(4 * Math.PI * drive.hz * clock));
      }
      let at = 0;
      for (const g of grids) {
        for (let j = 0; j < g.m; j++) atlas.set(g.h.subarray(j * g.n, (j + 1) * g.n), at + j * width);
        at += g.m * width;
      }
      return atlas;
    },
  };
}
