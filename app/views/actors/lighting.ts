// The lighting designer: the base level and the palette. Each section has a base (quiet is darker, a drop brighter)
// and one colour, set by the chord on the section's downbeat round the circle of fifths and turned toward the section's
// own colour (a drop pink, a build cold blue); each bar's chord leans it. A build pulls the light down toward its drop.
// Chords add a little glow. Puts `glow` (the light level so far) on the environment bus.
import { actor } from "../stage/actor.ts";
import { fifths, wrapDegrees } from "../stage/clips.ts";
import { linkedLane, linkedLevel } from "../stage/moment.ts";

const SECTION_HUE = { drop: -75, build: 185, quiet: 10, groove: 0 } as const;

export const lighting = () => actor({
  id: "lighting", title: "Colour", plays: ["lane:pad", "lane:keys", "lane:bass"],
  idle(m) {
    const s = m.show, kind = m.section?.kind, tl = m.timeline;
    if (!m.playing) return { env: { glow: 1 }, state: "resting" };
    const base = kind === "quiet" ? 0.85 : kind === "drop" ? 1.1 : 1;
    const pads = linkedLevel(m, "lighting", m.beat * 2);
    const level = base * (1 - 0.4 * m.tension) + s.glow * (0.35 * pads + 0.25 * (m.energy - 0.5));
    // the colour follows the pitch of what it is linked to (the chords, unless linked otherwise)
    const lane = linkedLane(m, "lighting"), chordAt = (time: number) => (lane ? tl.recent(lane, time + 1e-3, 1)[0] : undefined);
    const home = chordAt(m.sectionStart), lean = chordAt(m.barStart);
    const homeHue = home ? fifths(home.pitch) : 0, leanHue = lean ? fifths(lean.pitch) - homeHue : 0;
    // (the section's colour is a design decision, reached in full from 40 %; the slider scales how far chords lean it)
    const hue = Math.min(1, s.color * 2.5) * (kind ? SECTION_HUE[kind] : 0) + s.color * (wrapDegrees(homeHue) * 0.35 + wrapDegrees(leanHue) * 0.2);
    return { light: { glow: level - 1, hue }, env: { glow: level }, state: kind ? kind + " colour" : "warm" };
  },
});
