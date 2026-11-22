// The lamps (lantern, bulbs, sign box, street lamp), as one hero: they flash toward white on every kick while their haze
// ducks (a visual sidechain: contrast reads louder than more light), flare on a crash, and flare hardest on a drop's
// first beat. Decays in beats.
import { actor } from "../stage/actor.ts";
import { impact } from "../stage/clips.ts";

export const lamps = () => actor({
  id: "lamps", title: "Lamps", amount: "glow", plays: ["lane:kick", "lane:low"],
  actions: {
    flash: (age, cue, m) => {
      const k = cue.velocity * impact(age, 0.034, m.beat / 3), g = m.show.glow;
      // the lamps' light jumps on the kick and lights what is round them; their haze ducks
      return { light: { pulse: m.reduced ? 0 : 0.32 * g * k, duck: 0.22 * g * k }, lamps: { "*": 1.6 * g * k }, state: age < m.beat / 3 ? "flash" : undefined };
    },
    flare: (age, cue, m) => {
      const k = cue.velocity * impact(age, 0.05, m.beat * 2), g = m.show.glow;
      return { light: { pulse: m.reduced ? 0 : 0.5 * g * k, glow: 0.6 * g * k }, lamps: { "*": 2.5 * g * k }, state: age < m.beat ? "flare" : undefined };
    },
    drop: (age, _cue, m) => { const k = Math.max(0, 1 - age / m.beat); return { light: { pulse: m.reduced ? 0 : 0.6 * m.show.glow * k }, lamps: { "*": 3 * m.show.glow * k }, state: age < m.beat ? "drop flare" : undefined }; },
  },
  reactions: [
    { when: { plays: true, count: 2 }, play: "flash" },
    { when: { on: "crash", count: 1 }, play: "flare" },
    { when: { every: "bar", where: (cue, m) => m.section?.kind === "drop" && Math.abs(cue.time - m.sectionStart) < 0.01 }, play: "drop" },
  ],
});
