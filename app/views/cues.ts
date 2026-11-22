// The show's score: every musical event as a typed cue on one time line, whatever produced it (a MIDI file, notes
// from a DAW through the sys0 Bridge, an audio file analysed in full before it plays, or live listening). The scene
// never reads levels directly: it asks the time line what has just happened and what is about to, at the moment
// being heard, and shapes each element's motion from that.
import type { Song, Note } from "./midi-file.ts";

export type Role = "kick" | "snare" | "hat" | "open" | "crash" | "tom" | "bass" | "pad" | "keys" | "lead" | "tap";
/** A cue: one event. `lane` names the track it came from as well (a MIDI part, a recorded control track). */
export type Cue = { time: number; role: Role; velocity: number; duration: number; pitch: number; predicted?: boolean; lane?: string };
/** A lane a performer can be linked to: every role, every part of a song, "low" (kick and bass together), control tracks. */
export type Lane = { id: string; label: string; group: "Drums" | "Parts" | "Song" | "Programmed" };
export type Section = { time: number; energy: number; kind: "quiet" | "groove" | "build" | "drop" };

const DRUMS: Record<number, Role> = {
  35: "kick", 36: "kick", 37: "snare", 38: "snare", 39: "snare", 40: "snare",
  42: "hat", 44: "hat", 46: "open", 49: "crash", 52: "crash", 55: "crash", 57: "crash", 51: "hat", 53: "hat", 59: "hat",
  41: "tom", 43: "tom", 45: "tom", 47: "tom", 48: "tom", 50: "tom",
};

/**
 * A time line of cues, searched by lane: each cue is filed under its role (kick, snare, lead...), under its own lane if
 * it has one (a MIDI part, a control track), and kicks and bass notes also under "low". Cues may be added live.
 */
export class Timeline {
  private lists = new Map<string, Cue[]>();
  constructor(cues: Cue[] = [], readonly length = Infinity) { for (const c of cues) this.add(c); for (const l of this.lists.values()) l.sort((a, b) => a.time - b.time); }
  add(cue: Cue) {
    const lanes = cue.lane?.startsWith("control:") ? [cue.lane] : [cue.role, ...(cue.lane ? [cue.lane] : []), ...(cue.role === "kick" || cue.role === "bass" ? ["low"] : [])];
    for (const lane of lanes) {
      const list = this.lists.get(lane) ?? [];
      if (list.length && list[list.length - 1]!.time > cue.time) { let i = list.length; while (i > 0 && list[i - 1]!.time > cue.time) i--; list.splice(i, 0, cue); }
      else list.push(cue);
      if (list.length > 4096 && this.length === Infinity) list.splice(0, 1024);   // a live time line keeps its recent past
      this.lists.set(lane, list);
    }
  }
  /** Replace every cue of one lane (a control track being recorded or erased). */
  setLane(lane: string, cues: Cue[]) { this.lists.set(lane, [...cues].sort((a, b) => a.time - b.time)); }
  /** Drop predicted cues of a role from `from` on (a live beat prediction that is being replaced). */
  unpredict(role: Role | string, from: number) { const l = this.lists.get(role); if (l) this.lists.set(role, l.filter(c => !(c.predicted && c.time >= from))); }
  private index(list: Cue[], t: number) { let lo = 0, hi = list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m]!.time <= t) lo = m + 1; else hi = m; } return lo; }
  /** The most recent cues of a role at or before `t` (newest first), looking back across a loop's seam. */
  recent(role: Role | string, t: number, count = 3): Cue[] {
    const list = this.lists.get(role); if (!list?.length) return [];
    const out: Cue[] = [];
    for (let i = this.index(list, t) - 1; i >= 0 && out.length < count; i--) out.push(list[i]!);
    if (out.length < count && this.length !== Infinity) for (let i = list.length - 1; i >= 0 && out.length < count; i--) out.push({ ...list[i]!, time: list[i]!.time - this.length });
    return out;
  }
  /** The next cue of a role after `t`, looking ahead across a loop's seam. */
  upcoming(role: Role | string, t: number): Cue | null {
    const list = this.lists.get(role); if (!list?.length) return null;
    const i = this.index(list, t);
    if (i < list.length) return list[i]!;
    return this.length !== Infinity ? { ...list[0]!, time: list[0]!.time + this.length } : null;
  }
  /** Cues of a role sounding at `t` (started, not yet ended). */
  sounding(role: Role | string, t: number): Cue[] {
    const list = this.lists.get(role); if (!list?.length) return [];
    const out: Cue[] = [];
    for (let i = this.index(list, t) - 1; i >= 0 && t - list[i]!.time < 16; i--) if (list[i]!.time + list[i]!.duration > t) out.push(list[i]!);
    return out;
  }
  has(lane: Role | string) { return !!this.lists.get(lane)?.length; }

  // ── shapes read from the time line ──
  /** An impact: full on the first frame at or after the hit, then an exponential fall over `release` seconds. */
  hit(role: Role | string, t: number, release: number): number {
    let v = 0;
    for (const c of this.recent(role, t, 3)) v = Math.max(v, c.velocity * Math.exp(-(t - c.time) / release));
    return v;
  }
  /** Seconds since the last cue of a role, and that cue. */
  since(role: Role | string, t: number): { age: number; cue: Cue | null } { const c = this.recent(role, t, 1)[0] ?? null; return { age: c ? t - c.time : Infinity, cue: c }; }
  /** A wind-up toward the next cue: 0 until `lead` seconds before it, easing to its velocity as it lands. */
  windup(role: Role | string, t: number, lead: number): number {
    const c = this.upcoming(role, t);
    if (!c || c.time - t > lead) return 0;
    const k = 1 - (c.time - t) / lead;
    return c.velocity * k * k * (3 - 2 * k);
  }
  /** A held level: the loudest note sounding, with a release of `release` seconds after notes end. */
  held(role: Role | string, t: number, release: number): number {
    let v = 0;
    for (const c of this.recent(role, t, 6)) {
      const end = c.time + c.duration;
      v = Math.max(v, t < end ? c.velocity : c.velocity * Math.exp(-(t - end) / release));
    }
    return v;
  }
}

/** Sort a song's notes into roles: drums by the GM map on channel 10, other parts by how they are played. */
const FAMILIES = ["Piano", "Bells", "Organ", "Guitar", "Bass", "Strings", "Ensemble", "Brass", "Reed", "Pipe", "Synth lead", "Synth pad", "Synth effects", "World", "Percussion", "Effects"];
const ROLE_LANES: [Role | "low", string, Lane["group"]][] = [
  ["kick", "Kick", "Drums"], ["snare", "Snare", "Drums"], ["hat", "Hats", "Drums"], ["open", "Open hat", "Drums"], ["crash", "Crash", "Drums"], ["tom", "Toms", "Drums"],
  ["low", "Low hits (kick and bass)", "Drums"], ["bass", "Bass", "Parts"], ["pad", "Chords", "Parts"], ["keys", "Keys", "Parts"], ["lead", "Lead", "Parts"],
];
/** The lanes a time line has: the roles present, then each named part. */
export function lanesOf(timeline: Timeline, parts: Lane[] = []): Lane[] {
  return [...ROLE_LANES.filter(([id]) => timeline.has(id)).map(([id, label, group]) => ({ id, label, group })), ...parts];
}

export function cuesFromSong(song: Song): { timeline: Timeline; beat: number; sections: Section[]; lanes: Lane[] } {
  const parts = new Map<string, Note[]>();
  for (const n of song.notes) if (n.channel !== 9) { const k = n.track + ":" + n.channel; (parts.get(k) ?? parts.set(k, []).get(k)!).push(n); }
  const beat = song.tempos[0]?.secondsPerQuarter ?? 0.5;
  const roleOf = new Map<string, Role>();
  for (const [k, notes] of parts) {
    const mean = notes.reduce((s, n) => s + n.pitch, 0) / notes.length;
    const meanLength = notes.reduce((s, n) => s + n.duration, 0) / notes.length;
    let chordal = 0;
    for (let i = 1; i < notes.length; i++) if (Math.abs(notes[i]!.time - notes[i - 1]!.time) < 0.02) chordal++;
    const chords = chordal / notes.length > 0.4, program = notes[0]!.program;
    roleOf.set(k, (program >= 32 && program < 40) || (mean < 50 && !chords) ? "bass"
      : chords && meanLength > beat * 1.5 ? "pad" : chords || (program >= 88 && program < 96) ? (meanLength > beat ? "pad" : "keys") : "lead");
  }
  const cues: Cue[] = [];
  for (const n of song.notes) {
    const role = n.channel === 9 ? DRUMS[n.pitch] : roleOf.get(n.track + ":" + n.channel);
    if (role) cues.push({ time: n.time, role, velocity: n.velocity, duration: n.duration, pitch: n.pitch, ...(n.channel !== 9 && { lane: "part:" + n.track + ":" + n.channel }) });
  }
  // each melodic part as a lane of its own, named from the file or from its instrument family and role
  const partLanes: Lane[] = [...parts.entries()].map(([k, notes]) => {
    const [track, channel] = k.split(":").map(Number), name = song.trackNames[track!]?.trim();
    return { id: "part:" + k, label: (name || FAMILIES[notes[0]!.program >> 3]) + " · " + roleOf.get(k) + " (ch " + (channel! + 1) + ")", group: "Parts" as const };
  });
  const bar = beat * 4;
  const length = Math.ceil((song.duration + 0.05) / bar) * bar;
  const timeline = new Timeline(cues, length);
  return { timeline, beat, sections: sectionsOf(cues, bar, length), lanes: lanesOf(timeline, partLanes) };
}

/**
 * The song's sections, bar by bar, from how much is happening: drums weigh most, a kick on every beat marks a drop,
 * snare density rising across bars marks a build, no drums marks a quiet passage.
 */
export function sectionsOf(cues: Cue[], bar: number, length: number): Section[] {
  const bars = Math.max(1, Math.round(length / bar));
  const kicks = new Array(bars).fill(0), snares = new Array(bars).fill(0), weight = new Array(bars).fill(0);
  for (const c of cues) {
    const b = Math.min(bars - 1, Math.floor(c.time / bar + 1e-6));
    if (c.role === "kick") kicks[b]++;
    if (c.role === "snare") snares[b]++;
    weight[b] += c.velocity * (c.role === "kick" ? 3 : c.role === "snare" ? 2 : c.role === "bass" ? 1.5 : c.role === "pad" ? 0.3 : 0.7);
  }
  const most = Math.max(1e-6, ...weight);
  return weight.map((w, b) => {
    const energy = w / most;
    const kind: Section["kind"] = kicks[b] === 0 && snares[b] === 0 ? "quiet"
      : snares[b] >= 6 && snares[b] > (snares[b - 1] ?? Infinity) ? "build"   // snare density strictly rising: a roll
      : kicks[b] >= 4 && energy > 0.6 ? "drop" : "groove";
    return { time: b * bar, energy, kind };
  });
}
