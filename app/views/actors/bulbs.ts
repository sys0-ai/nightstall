// A string of bulbs that plays the melody: each lead or keys note swells the bulb its pitch falls on (low on the left,
// two octaves across the string from middle C), and it shrinks back over a third of a beat.
import { actor } from "../stage/actor.ts";
import { clamp, impact } from "../stage/clips.ts";

export const bulbs = (joints: string[]) => actor({
  id: "bulbs", title: "Bulbs", amount: "glow", plays: ["lane:lead", "lane:keys", "lane:pad"],
  actions: {
    pop: (age, cue, m, n) => {
      if (age < 0) return {};
      // a pitched note picks its bulb by pitch; an unpitched hit (a drum, a beat) walks along the string
      const k = cue.pitch > 24 && cue.role !== "kick" && cue.role !== "snare" ? clamp(Math.floor(((cue.pitch - 60) / 24) * joints.length), 0, joints.length - 1) : n % joints.length;
      const q = 1 + 0.45 * Math.max(0.3, m.show.glow) * cue.velocity * impact(age, 0.03, m.beat / 3) * (m.reduced ? 0.35 : 1);
      // the bulb swells, and its light floods its own patch of awning and worktop
      return { pose: { [joints[k]!]: { scale: [q, q, q] } }, lamps: { [joints[k]!]: 5 * (q - 1) }, state: age < m.beat / 3 ? "playing the melody" : undefined };
    },
  },
  reactions: [{ when: { plays: true, count: 4 }, play: "pop" }],
});
