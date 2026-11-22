// A hanging sign: it always says what it says. It swings from its rail when a bar's downbeat lands on a kick (harder in
// a drop; it rocks and settles over half a bar), and its neon glyph blinks out for two frames just after a crash or a
// drop's first beat. (Its wind sway is the hanging actor's.)
import { actor } from "../stage/actor.ts";
import { spring } from "../stage/clips.ts";

export const sign = (joint: string, glyph: string) => actor({
  id: joint, title: "Sign", amount: "sign", plays: ["grid:bar"],
  actions: {
    swing: (age, cue, m) => {
      const k = m.show.sign * (m.reduced ? 0.35 : 1) * (m.section?.kind === "drop" ? 7 : 4) * cue.velocity;
      return { pose: { [joint]: { rot: [k * spring(age, m.bar / 2, m.bar / 3), 0, 0] } }, state: age < m.bar / 2 ? "swinging" : undefined };
    },
    blink: (age, _cue, m) => (!m.reduced && m.show.sign > 0 && age > 0.03 && age < 0.065 ? { pose: { [glyph]: { show: 0 } }, state: "blink" } : {}),
  },
  reactions: [
    { when: { plays: true, count: 2 }, play: "swing" },
    { when: { on: "crash", count: 1 }, play: "blink" },
    { when: { every: "bar", where: (cue, m) => m.section?.kind === "drop" && Math.abs(cue.time - m.sectionStart) < 0.01 }, play: "blink" },
  ],
});
