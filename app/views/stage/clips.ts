// Clip shapes: how a motion unfolds over the time since its cue (`age`, seconds; negative before the cue). Every actor
// builds its actions from these, so an impact feels the same on a table, a lamp or a cat. See
// docs/music-visuals/playbook.md §3.2.

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (v: number) => { v = clamp(v); return v * v * (3 - 2 * v); };

/** An impact: full for `hold` seconds (the contact pose), then an exponential fall over `release`. */
export const impact = (age: number, hold: number, release: number) => age < 0 ? 0 : age < hold ? 1 : Math.exp(-(age - hold) / release);

/** A struck spring: full displacement at the cue, swinging through and settling (period and decay in seconds). */
export const spring = (age: number, period: number, decay: number) => age < 0 ? 0 : Math.exp(-age / decay) * Math.cos((2 * Math.PI * age) / period);

/** A wind-up: 0 until `lead` seconds before the cue, easing to 1 as it lands (for negative ages). */
export const windup = (age: number, lead: number) => age >= 0 || -age > lead ? 0 : smooth(1 + age / lead);

/** One rise and fall over `length` seconds after the cue (a blink, a flick). */
export const once = (age: number, length: number) => age > 0 && age < length ? Math.sin((Math.PI * age) / length) : 0;

/** 1 from a to b on a clock, eased in and out over e. */
export const held = (t: number, a: number, b: number, e: number) => smooth((t - a) / e) * (1 - smooth((t - b + e) / e));

/** Hue of a pitch class round the circle of fifths: related keys sit near each other on the colour wheel. */
export const fifths = (pitch: number) => (((pitch % 12) * 7) % 12) * 30;
export const wrapDegrees = (d: number) => ((d + 540) % 360) - 180;
