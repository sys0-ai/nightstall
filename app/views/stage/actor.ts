// The actor model. A scene component's behaviour is an Actor: named actions (pure clips of the time since their cue)
// and reactions that bind those actions to what can trigger them: cues on the score (a kick, a snare, a lead note),
// the beat grid (every beat, every bar), or another actor's action (the bottle follows the table's hop). An actor may
// also have idle life (what it does with no cue at all: breathing, blinking, swinging in the wind) and may put values
// on the environment bus for actors after it (wind, light level). Everything is a function of the moment: no actor
// keeps state between frames, so composing, seeking and looping are exact.
import type { Cue, Role } from "../cues.ts";
import type { Fx, Pose } from "../stall.ts";
import type { Moment, Show } from "./moment.ts";

/** What an actor contributes this frame. Poses add (rot, pos), scales multiply, `show` takes the least. */
export type Out = {
  pose?: Record<string, Pose>;
  /** light on the stage's bus: `glow` and `duck` add to a base of 1, `pulse` and `sparkle` take the most, `hue` and `mist` add */
  light?: Partial<Record<"glow" | "duck" | "pulse" | "hue" | "mist" | "sparkle", number>>;
  /** what shakes the puddles: low hits (song time, strength), and a steady shaking (0–1) at a rate (Hz) */
  water?: { hits?: { time: number; strength: number }[]; hum?: number; hz?: number };
  /** how much brighter each lamp shines as a light (by lamp id, or "*" for every lamp): they add to a base of 1 */
  lamps?: Record<string, number>;
  /** emitter amounts: they add */
  fx?: Partial<Fx>;
  /** values for later actors (wind, glow level) */
  env?: Record<string, number>;
  /** what the actor is doing, in a few words, for the stage readout */
  state?: string;
};

/**
 * What a performer can be linked to (it "plays" it): a lane of the score ("lane:kick", "lane:part:2:1", a recorded
 * "lane:control:<id>"), the grid ("grid:beat", "grid:bar", "grid:section"), another performer ("follow:table"), or
 * nothing ("free": it lives its own life and ignores the music).
 */
export type Link = string;

export type Trigger =
  /** whatever the performer is linked to; with `lead`, the next cue is acted on that many seconds before it lands */
  | { plays: true; lead?: number; count?: number; where?: (cue: Cue, m: Moment) => boolean }
  /** cues of these roles; with `lead`, the next one is also acted on that many seconds before it lands */
  | { on: Role | Role[]; lead?: number; count?: number; where?: (cue: Cue, m: Moment) => boolean }
  /** the beat grid */
  | { every: "beat" | "bar"; lead?: number; where?: (cue: Cue, m: Moment) => boolean }
  /** another actor's action, by "actor.action": the same cues that set it off */
  | { after: string; count?: number };

/** An action: what happens `age` seconds after (or, when negative, before) its cue. `n` counts its cues so far. */
export type Action = (age: number, cue: Cue, m: Moment, n: number) => Out;
export type Reaction = { when: Trigger; play: string; until?: number };

export type Actor = {
  id: string;
  /** what this is, for people */
  title: string;
  /** the control that scales it (its amount, 0–1), if any */
  amount?: keyof Show;
  /** what it plays unless linked otherwise: the first of these the song has */
  plays?: Link[];
  actions?: Record<string, Action>;
  reactions?: Reaction[];
  idle?: (m: Moment) => Out;
};

export function actor(spec: Actor): Actor { return spec; }
