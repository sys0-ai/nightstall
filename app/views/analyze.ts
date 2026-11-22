// An audio file analysed in full before it plays, so the scene knows every hit in advance, as it does with MIDI.
// Short-time Fourier transform (1024-point Hann window, 256-sample hop: 5.8 ms at 44.1 kHz), then per band:
//   kick    40–130 Hz      snare  180–320 Hz with 1.8–5 kHz noise      hats   7–16 kHz
// Each band's onset strength is spectral flux: the half-wave rectified rise of log-magnitude from the previous frame,
// summed over the band's bins. A peak is an onset when it is the largest within ±30 ms and exceeds the moving median
// over ±0.2 s by a margin, with a minimum gap per band. Tempo comes from the autocorrelation of the whole-spectrum
// flux (weighted toward 120 BPM), beats from dynamic programming over it (Ellis 2007). The bass line is the strongest
// low bin at each low-band onset; chord roots, the strongest pitch class per beat between 110 Hz and 1.8 kHz.
import { Timeline, sectionsOf, type Cue } from "./cues.ts";

const N = 1024, HOP = 256;

function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j]!, re[i]!]; [im[i], im[j]] = [im[j]!, im[i]!]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const p = i + k, q = p + len / 2;
        const tr = re[q]! * cr - im[q]! * ci, ti = re[q]! * ci + im[q]! * cr;
        re[q] = re[p]! - tr; im[q] = im[p]! - ti; re[p] = re[p]! + tr; im[p] = im[p]! + ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

export type Analysis = { timeline: Timeline; beat: number; bpm: number; beats: number[] };

export async function analyse(buffer: AudioBuffer, progress: (fraction: number) => void): Promise<Analysis> {
  const rate = buffer.sampleRate, length = buffer.length, mono = new Float32Array(length);
  for (let c = 0; c < buffer.numberOfChannels; c++) { const d = buffer.getChannelData(c); for (let i = 0; i < length; i++) mono[i]! += d[i]! / buffer.numberOfChannels; }
  const frames = Math.max(1, Math.floor((length - N) / HOP)), bins = N / 2, binHz = rate / N, dt = HOP / rate;
  const bin = (f: number) => Math.max(1, Math.min(bins - 1, Math.round(f / binHz)));
  const bands = { kick: [bin(40), bin(130)], snareBody: [bin(180), bin(320)], snareNoise: [bin(1800), bin(5000)], hat: [bin(7000), bin(16000)], click: [bin(2000), bin(6000)], all: [1, bins - 1] };
  const flux = { click: new Float32Array(frames), kick: new Float32Array(frames), snare: new Float32Array(frames), hat: new Float32Array(frames), all: new Float32Array(frames) };
  const lowEnergy = new Float32Array(frames), lowPeak = new Int16Array(frames);
  const chroma = new Float32Array(frames * 12);
  const window = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const re = new Float32Array(N), im = new Float32Array(N);
  let previous = new Float32Array(bins), current = new Float32Array(bins);
  const pitchClass = new Int8Array(bins).map((_, k) => { const f = k * binHz; return f < 110 || f > 1800 ? -1 : ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12; });
  const rise = (from: number, to: number) => { let s = 0; for (let k = from; k <= to; k++) { const d = current[k]! - previous[k]!; if (d > 0) s += d; } return s / (to - from + 1); };
  for (let f = 0; f < frames; f++) {
    const at = f * HOP;
    for (let i = 0; i < N; i++) { re[i] = mono[at + i]! * window[i]!; im[i] = 0; }
    fft(re, im);
    let lowMax = 0, lowAt = 0, energy = 0;
    for (let k = 0; k < bins; k++) {
      const m = Math.hypot(re[k]!, im[k]!);
      current[k] = Math.log1p(100 * m);   // compressed magnitude: a log scale that stays finite in silence
      if (k >= bands.kick[0]! && k <= bin(250)) { energy += m * m; if (m > lowMax) { lowMax = m; lowAt = k; } }
      const pc = pitchClass[k]!; if (pc >= 0) chroma[f * 12 + pc]! += m;
    }
    lowEnergy[f] = Math.sqrt(energy); lowPeak[f] = lowAt;
    flux.kick[f] = rise(bands.kick[0]!, bands.kick[1]!);
    flux.snare[f] = 0.5 * rise(bands.snareBody[0]!, bands.snareBody[1]!) + rise(bands.snareNoise[0]!, bands.snareNoise[1]!);
    flux.hat[f] = rise(bands.hat[0]!, bands.hat[1]!);
    flux.click[f] = rise(bands.click[0]!, bands.click[1]!);
    flux.all[f] = rise(1, bins - 1);
    [previous, current] = [current, previous];
    if (f % 1500 === 0) { progress(0.85 * f / frames); await new Promise(r => setTimeout(r, 0)); }
  }
  // onsets: local maxima over ±30 ms above the moving median over ±0.2 s by a margin, at least `gap` seconds apart
  const peaks = (x: Float32Array, margin: number, gap: number, scale: number) => {
    const out: { frame: number; strength: number }[] = [], w = Math.round(0.03 / dt), m = Math.round(0.2 / dt);
    const sorted = [...x].sort((a, b) => a - b), top = sorted[Math.floor(sorted.length * 0.98)] || 1;
    let last = -Infinity;
    for (let f = w; f < x.length - w; f++) {
      const v = x[f]!;
      let peak = true; for (let j = f - w; j <= f + w && peak; j++) if (x[j]! > v) peak = false;
      if (!peak) continue;
      const near: number[] = []; for (let j = Math.max(0, f - m); j < Math.min(x.length, f + m); j += 2) near.push(x[j]!);
      near.sort((a, b) => a - b);
      const median = near[near.length >> 1]!;
      if (v > median * 1.5 + margin * top && (f - last) * dt >= gap) { out.push({ frame: f, strength: Math.min(1, (v - median) / top * scale) }); last = f; }
    }
    return out;
  };
  const cues: Cue[] = [];
  const to = (frame: number) => frame * dt + (N / 2) / rate * 0.5;   // a frame's onset sits a quarter-window into it
  // a kick, unlike a bass note, has a beater click: broadband rise at 2–6 kHz within ±12 ms, and its low band jumps
  // from well below where it lands (a bass line re-attacking over its own tail does not)
  const reach = Math.round(0.012 / dt), clickTop = [...flux.click].sort((a, b) => a - b)[Math.floor(frames * 0.9)] || 1;
  for (const p of peaks(flux.kick, 0.18, 0.12, 1.3)) {
    let click = 0; for (let j = Math.max(0, p.frame - reach); j <= Math.min(frames - 1, p.frame + reach); j++) click = Math.max(click, flux.click[j]!);
    const before = lowEnergy[Math.max(0, p.frame - 3)]!, after = Math.max(lowEnergy[Math.min(frames - 1, p.frame + 2)]!, lowEnergy[Math.min(frames - 1, p.frame + 4)]!);
    // the bass note under every low onset: the strongest low bin, as a MIDI pitch, held while the low band stays up
    const f0 = lowPeak[p.frame]! * binHz, pitch = f0 > 0 ? Math.round(69 + 12 * Math.log2(f0 / 440)) : 40;
    let end = p.frame; const floor = lowEnergy[p.frame]! * 0.35; while (end < frames - 1 && lowEnergy[end]! > floor && (end - p.frame) * dt < 2) end++;
    cues.push({ time: to(p.frame), role: "bass", velocity: 0.4 + 0.6 * p.strength, duration: (end - p.frame) * dt, pitch });
    if (click > 0.5 * clickTop && after > 1.8 * before) cues.push({ time: to(p.frame), role: "kick", velocity: 0.45 + 0.55 * p.strength, duration: 0.1, pitch: 36 });
  }
  for (const p of peaks(flux.snare, 0.15, 0.1, 1.2)) cues.push({ time: to(p.frame), role: "snare", velocity: 0.4 + 0.6 * p.strength, duration: 0.1, pitch: 38 });
  for (const p of peaks(flux.hat, 0.1, 0.06, 1.2)) cues.push({ time: to(p.frame), role: "hat", velocity: 0.3 + 0.6 * p.strength, duration: 0.05, pitch: 42 });
  progress(0.9);
  // tempo: autocorrelation of the whole-spectrum flux, 60–180 BPM, weighted by a log-Gaussian around 120 BPM
  // the tempo envelope: the three bands' flux, each scaled by its own 95th percentile, so a kick counts as much as the
  // broadband noise of a snare or hat (the whole-spectrum flux alone lets noisy hits pull the period to 2/3 or 3/2)
  const top95 = (x: Float32Array) => [...x].sort((p, q) => p - q)[Math.floor(x.length * 0.95)] || 1;
  const [k95, s95, h95] = [top95(flux.kick), top95(flux.snare), top95(flux.hat)];
  const env = flux.kick.map((k, f) => k / k95 + flux.snare[f]! / s95 + 0.6 * flux.hat[f]! / h95), mean = env.reduce((s, v) => s + v, 0) / env.length;
  const centred = env.map(v => Math.max(0, v - mean));
  // (a comb over the lag's multiples: a beat period also lines up at two, three and four beats, where a dotted or
  // triplet period that happens to catch a kick and a hat does not; this keeps the tempo out of 2/3 and 3/2 errors)
  const maxLag = Math.round((60 / 60) / dt) * 4, acf = new Float32Array(maxLag + 1);
  for (let lag = Math.round(60 / 180 / dt); lag <= maxLag; lag++) { let s = 0; for (let f = lag; f < centred.length; f++) s += centred[f]! * centred[f - lag]!; acf[lag] = s / (centred.length - lag); }
  let best = 0, bestLag = Math.round(0.5 / dt);
  for (let lag = Math.round(60 / 180 / dt); lag <= Math.round(60 / 60 / dt); lag++) {
    let s = 0; for (let k = 1; k <= 4; k++) s += acf[Math.min(maxLag, lag * k)]! / k;
    const bpm = 60 / (lag * dt), weight = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    if (s * weight > best) { best = s * weight; bestLag = lag; }
  }
  const period = bestLag * dt, bpm = 60 / period;
  // beats: dynamic programming that rewards onset strength and penalises departures from the period (Ellis 2007)
  const score = new Float32Array(frames), back = new Int32Array(frames).fill(-1);
  for (let f = 0; f < frames; f++) {
    let top = 0, from = -1;
    for (let p = f - Math.round(bestLag * 2); p <= f - Math.round(bestLag / 2); p++) {
      if (p < 0) continue;
      const v = score[p]! - 100 * Math.log((f - p) / bestLag) ** 2 * (mean || 1);
      if (v > top || from < 0) { top = v; from = p; }
    }
    score[f] = centred[f]! + Math.max(0, top); back[f] = top > 0 ? from : -1;
  }
  let f = 0; for (let i = frames - Math.round(bestLag); i < frames; i++) if (i >= 0 && score[i]! > score[f]!) f = i;
  const beatFrames: number[] = []; while (f >= 0) { beatFrames.unshift(f); f = back[f]!; }
  const beats = beatFrames.map(to);
  // chord roots: per beat, the strongest pitch class, as a pad cue across the beat
  for (let i = 0; i + 1 < beatFrames.length; i++) {
    const sum = new Float32Array(12);
    for (let g = beatFrames[i]!; g < beatFrames[i + 1]!; g++) for (let p = 0; p < 12; p++) sum[p]! += chroma[g * 12 + p]!;
    let root = 0; for (let p = 1; p < 12; p++) if (sum[p]! > sum[root]!) root = p;
    const total = sum.reduce((s, v) => s + v, 0);
    cues.push({ time: beats[i]!, role: "pad", velocity: Math.min(1, 0.3 + 2 * sum[root]! / (total || 1)), duration: beats[i + 1]! - beats[i]!, pitch: 60 + root });
  }
  progress(1);
  const duration = buffer.duration;
  return { timeline: new Timeline(cues, duration), beat: period, bpm, beats };
}

export { sectionsOf };
