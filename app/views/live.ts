// Live listening (Radio, microphone, external cues, a DAW through the sys0 Bridge) turned into cues on a time line
// that runs on the page's clock, so the stage acts on it the same way as on a MIDI file.
//
// Onsets: each of three bands (low 40–110 Hz, mid 180 Hz–1.2 kHz, high 5–16 kHz, from the 12 measured log bands) is
// compared with its own recent past: the rise of its level over the last reading, divided by its running mean (auto-
// gain, as MilkDrop does), must clear a threshold and the band must have been quiet for a refractory gap. A low onset
// is a bass cue and a kick; mid is a snare; high is a hat. Levels arrive late (the analyser's window and the trip to
// the view), so each cue is stamped `latency` seconds before it was seen.
// Tempo: the intervals between kicks vote into a histogram (folded into 75–170 BPM); the beat phase follows the kicks
// like a phase-locked loop. Once it is confident, the next two beats are added ahead of time as predicted kicks, so
// the scene can wind up before them and land on them; a predicted beat that a real kick confirms is replaced by it.
// A DAW's transport replaces all of that guessing with its own tempo and bar position; its notes become cues as they come.
import { Timeline, type Cue, type Lane, type Role, type Section } from "./cues.ts";
import type { Score } from "./stage/moment.ts";

export type HostFrame = {
  transport: { playing: boolean; tempo: number; numerator: number; denominator: number; ppq: number; barPpq: number } | null;
  notes: { pitch: number; channel: number; on: boolean; velocity: number }[];
};
export type Reading = { bass: number; mid: number; treble: number; beat: number; spectrum?: Float32Array | null; host?: HostFrame | null };

const DRUMS: Record<number, Role> = { 35: "kick", 36: "kick", 37: "snare", 38: "snare", 39: "snare", 40: "snare", 42: "hat", 44: "hat", 46: "open", 49: "crash", 57: "crash", 51: "hat" };

export function createLive() {
  const timeline = new Timeline();
  const bands = [
    { role: "kick" as const, mean: 0.05, last: 0, quietUntil: 0, gap: 0.16, threshold: 0.9 },
    { role: "snare" as const, mean: 0.05, last: 0, quietUntil: 0, gap: 0.14, threshold: 1.0 },
    { role: "hat" as const, mean: 0.05, last: 0, quietUntil: 0, gap: 0.07, threshold: 1.1 },
  ];
  const votes = new Float32Array(96);   // tempo histogram, 75–170 BPM in 1 BPM steps
  let lastKick = -1, period = 0.5, phase = 0, confidence = 0, predictedUntil = 0, start = -1;
  let energyFast = 0, energySlow = 0.05;
  const sections: Section[] = [], channels = new Set<number>();
  let host: { tempo: number; barBeats: number; origin: number } | null = null;

  function vote(interval: number) {
    let bpm = 60 / interval;
    if (bpm < 40 || bpm > 400) return;
    while (bpm < 75) bpm *= 2;
    while (bpm >= 170) bpm /= 2;
    for (let i = 0; i < votes.length; i++) votes[i]! *= 0.97;
    for (let d = -2; d <= 2; d++) { const i = Math.round(bpm) - 75 + d; if (i >= 0 && i < votes.length) votes[i]! += Math.exp(-d * d / 2); }
    let best = 0; for (let i = 1; i < votes.length; i++) if (votes[i]! > votes[best]!) best = i;
    const total = votes.reduce((s, v) => s + v, 0) || 1;
    period = 60 / (75 + best);
    confidence = Math.min(1, (votes[best]! * 3) / total);
  }

  return {
    timeline,
    /** Take one reading of the levels, seen at page time `now` (seconds), arriving `latency` seconds after the sound. */
    read(r: Reading, now: number, latency: number, sensitivity: number) {
      if (start < 0) start = now;
      const t = now - latency;
      // a DAW through the Bridge: its notes are the cues and its transport is the clock
      if (r.host?.transport?.playing) {
        const tr = r.host.transport, beat = 60 / tr.tempo;
        host = { tempo: tr.tempo, barBeats: (tr.numerator * 4) / tr.denominator, origin: now - tr.ppq * beat };   // ppq counts quarter notes from the song's start
        period = beat; confidence = 1;
      } else host = null;
      for (const n of r.host?.notes ?? []) if (n.on) {
        const role: Role = n.channel === 9 ? DRUMS[n.pitch] ?? "hat" : n.pitch < 48 ? "bass" : "lead";
        // each DAW channel is a lane of its own, so a performer can be linked to one part of the set
        timeline.add({ time: now, role, velocity: n.velocity, duration: role === "bass" ? period : 0.15, pitch: n.pitch, lane: "part:0:" + n.channel });
        channels.add(n.channel);
        if (role === "kick") timeline.add({ time: now, role: "bass", velocity: n.velocity * 0.8, duration: period / 2, pitch: 36 });
      }
      // levels: low, mid and high from the measured spectrum where there is one, else the three broad bands
      const sp = r.spectrum;
      const low = sp ? Math.max(sp[0]!, sp[1]!, sp[2]!) : r.bass, mid = sp ? (sp[4]! + sp[5]! + sp[6]!) / 3 : r.mid, high = sp ? (sp[9]! + sp[10]! + sp[11]!) / 3 : r.treble;
      const gain = Math.max(0.2, sensitivity / 0.65);
      [low, mid, high].forEach((x, i) => {
        const b = bands[i]!, rise = Math.max(0, x - b.last), strength = rise / (b.mean + 0.02);
        b.last = x;
        b.mean += (x - b.mean) * 0.02;
        if (!r.host?.notes.length && strength * gain > b.threshold && t >= b.quietUntil && x > 0.06) {
          b.quietUntil = t + b.gap;
          const velocity = Math.min(1, 0.35 + 0.35 * strength * gain);
          timeline.unpredict(b.role, t - 0.06);
          timeline.add({ time: t, role: b.role, velocity, duration: b.role === "kick" ? period / 2 : 0.1, pitch: b.role === "kick" ? 36 : b.role === "snare" ? 38 : 42 });
          if (b.role === "kick") {
            timeline.add({ time: t, role: "bass", velocity: velocity * Math.min(1, low * 1.4), duration: period * 0.75, pitch: 33 + Math.round(12 * (1 - low)) });
            if (lastKick > 0 && !host) vote(t - lastKick);
            // phase: pull the predicted beat toward the kick that just landed
            const error = ((t - phase) / period) - Math.round((t - phase) / period);
            phase += error * period * 0.35;
            lastKick = t;
          }
        }
      });
      // a held, sustained bass with no attack: a pad-like cue on the low band keeps the water standing
      if (low > 0.25) timeline.add({ time: t, role: "pad", velocity: Math.min(1, low), duration: 0.08, pitch: 45 });
      // predicted beats: the next two, once the tempo is trusted (or always, from a DAW's transport)
      const grid = host ? { origin: host.origin, beat: 60 / host.tempo } : { origin: phase, beat: period };
      if ((confidence > 0.45 || host) && now + 2 * grid.beat > predictedUntil) {
        let next = grid.origin + Math.ceil((now - grid.origin) / grid.beat) * grid.beat;
        if (next <= predictedUntil + 0.01) next += grid.beat;
        for (; next < now + 2 * grid.beat; next += grid.beat) {
          if (!host) timeline.add({ time: next, role: "kick", velocity: 0.7, duration: 0.1, pitch: 36, predicted: true });
          predictedUntil = next;
        }
      }
      // sections: one per bar from how loud this bar is against the last half-minute
      const level = Math.hypot(r.bass, r.mid, r.treble) / Math.sqrt(3);
      energyFast += (level - energyFast) * 0.05; energySlow += (level - energySlow) * 0.002;
      const barLength = grid.beat * (host?.barBeats ?? 4), origin = host?.origin ?? start;
      const bar = Math.max(0, Math.floor((now - origin) / barLength));
      const ratio = energyFast / (energySlow + 1e-3);
      const kind: Section["kind"] = level < 0.04 ? "quiet" : ratio > 1.25 && confidence > 0.4 ? "drop" : ratio < 0.75 ? "quiet" : "groove";
      sections[bar] = { time: bar * barLength, energy: Math.min(1, ratio * 0.6), kind };
      for (let i = 0; i < bar; i++) sections[i] ??= sections[bar]!;
    },
    /** The score for the scene: the live time line, the estimated beat and bar, and sections so far. */
    score(): Score {
      return { timeline, beat: host ? 60 / host.tempo : period, barBeats: host?.barBeats ?? 4, sections, origin: host?.origin ?? start };
    },
    /** the DAW channels heard so far, as lanes */
    get channels(): Lane[] { return [...channels].sort((a, b) => a - b).map(c => ({ id: "part:0:" + c, label: "DAW channel " + (c + 1), group: "Parts" as const })); },
    get bpm() { return host ? host.tempo : 60 / period; },
    get confident() { return !!host || confidence > 0.45; },
  };
}

export type { Cue };
