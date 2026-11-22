// The moment an actor acts on: where the music is (time heard, beat, bar, section, tension) with its score, the scene's
// own clock for idle life, the person's amounts, and the environment earlier actors have set (wind, light level).
import { Timeline, type Section } from "../cues.ts";
import type { Link } from "./actor.ts";

/** A piece of music as the stage reads it: its cues, beat length, beats a bar, sections, and where bar 1 starts. */
export type Score = { timeline: Timeline; beat: number; barBeats: number; sections: Section[]; origin?: number };

export type Show = Record<"sensitivity" | "table" | "cat" | "steam" | "bubbles" | "glow" | "color" | "puddle" | "sign" | "rain" | "wind" | "mist", number>;

export type Moment = {
  /** song time being heard (seconds); Infinity-free even when silent */
  t: number;
  /** the scene's own clock (seconds), for idle life that runs whatever the music does */
  clock: number;
  timeline: Timeline;
  beat: number; bar: number; barBeats: number; barIndex: number; barPhase: number; barStart: number;
  section: Section | null; nextSection: Section | null; energy: number;
  /** when the current section began (its first bar's start) */
  sectionStart: number;
  /** rising through a build toward a drop, 0–1 */
  tension: number;
  /** seconds since a drop began (Infinity outside its first bar) */
  dropAge: number;
  /** whether any music is playing */
  playing: boolean;
  show: Show;
  /** sensitivity as a gain around 1 */
  gain: number;
  reduced: boolean;
  /** what earlier actors put on the environment bus */
  env: Record<string, number>;
  /** the song's sections, bar by bar */
  sections: Section[];
  /** what each performer plays this frame (resolved by the stage from the person's links and the performer's defaults) */
  links: Record<string, Link>;
};

const silence = new Timeline([], Infinity);

export function momentOf(t: number | null, clock: number, score: Score | null, show: Show, reduced: boolean): Moment {
  const playing = t !== null && !!score;
  const tl = playing ? score!.timeline : silence, beat = score?.beat ?? 0.5, barBeats = score?.barBeats ?? 4, bar = beat * barBeats;
  const time = t ?? 0, origin = score?.origin ?? 0, sections = score?.sections ?? [];
  const barIndex = Math.floor((time - origin) / bar + 1e-6), barPhase = (time - origin) / bar - barIndex;
  const section = playing && sections.length ? sections[Math.min(sections.length - 1, Math.max(0, barIndex))]! : null;
  const nextSection = playing && sections.length ? sections[Math.min(sections.length - 1, Math.max(0, barIndex + 1))]! : null;
  const ease = (v: number) => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
  const tension = section?.kind === "build" ? ease(barPhase * 0.5 + (nextSection?.kind === "drop" ? 0.5 : 0)) : 0;
  let first = barIndex; while (first > 0 && sections[first - 1]?.kind === section?.kind) first--;
  const dropAge = section?.kind === "drop" && sections[barIndex - 1]?.kind !== "drop" ? time - origin - barIndex * bar : Infinity;
  return {
    t: time, clock, timeline: tl, beat, bar, barBeats, barIndex, barPhase, barStart: origin + barIndex * bar,
    section, nextSection, energy: section?.energy ?? (playing ? 0.6 : 0), sectionStart: origin + first * bar, tension, dropAge, playing,
    show, gain: show.sensitivity / 0.65, reduced, env: {}, sections, links: {},
  };
}

/** How strongly a performer's link is sounding now: a lane's held notes, or the song's energy for the grid. */
export function linkedLevel(m: Moment, id: string, release: number): number {
  const link = m.links[id];
  if (!m.playing || !link || link === "free") return 0;
  if (link.startsWith("lane:")) return m.timeline.held(link.slice(5), m.t, release);
  return m.energy;
}
/** The lane a performer is linked to, if it is linked to one. */
export const linkedLane = (m: Moment, id: string) => (m.links[id]?.startsWith("lane:") ? m.links[id]!.slice(5) : null);
/** Whether a performer is linked to anything (not left free). */
export const linked = (m: Moment, id: string) => m.playing && !!m.links[id] && m.links[id] !== "free";
