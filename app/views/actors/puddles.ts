// Puddles: water standing on the street, shaken by the music the way a speaker's thump shakes water on the floor. Each
// low hit (a kick, or a bass note's attack) jolts the ground, so waves leave every shore at once and run inward,
// crossing into the puddle's own standing patterns; a held bass note shakes it steadily, faster for a higher note.
// The waves themselves are physics (water.ts); this actor only says when and how hard. Lamps glint in the tilted water.
import { actor } from "../stage/actor.ts";
import { clamp } from "../stage/clips.ts";
import { linkedLane, linkedLevel } from "../stage/moment.ts";

export const puddles = () => actor({
  id: "puddles", title: "Puddles", amount: "puddle", plays: ["lane:low", "lane:bass", "lane:kick"],
  actions: {
    jolt: (age, cue, m) => {
      const strength = (cue.role === "kick" ? 1 : 0.45) * cue.velocity * m.show.puddle * m.gain * (m.reduced ? 0.35 : 1);
      return { water: { hits: [{ time: cue.time, strength }] }, state: age < m.beat / 2 ? (cue.role === "kick" ? "jolted" : "trembling") : undefined };
    },
  },
  reactions: [
    { when: { plays: true, count: 3 }, play: "jolt" },
  ],
  idle(m) {
    const sparkle = (0.6 + 0.8 * m.show.puddle) * Math.min(1.3, m.env.glow ?? 1);
    if (!m.playing) return { light: { sparkle } };
    const lane = linkedLane(m, "puddles"), held = linkedLevel(m, "puddles", m.beat), note = lane ? (m.timeline.sounding(lane, m.t)[0] ?? m.timeline.recent(lane, m.t, 1)[0]) : undefined;
    // a low note shakes slowly, a higher one faster: 3–9 Hz across three octaves from E1 (what a 60 Hz picture can show)
    const hz = note && note.pitch > 0 ? 3 + clamp((note.pitch - 28) / 36) * 6 : 5;
    // (the bass holds the water shaking; the whole low end of the song keeps a little of it going between notes)
    const low = Math.max(held, 0.5 * m.timeline.held("bass", m.t, m.beat * 2));
    return { water: { hum: m.show.puddle * m.gain * (m.reduced ? 0.35 : 1) * clamp(low), hz }, light: { sparkle }, state: held > 0.3 ? "humming" : undefined };
  },
});
