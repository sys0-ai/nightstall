// Something that rides another actor's motion and follows it a few frames late (follow-through): a bottle or a glass
// rocking on a table, chopsticks jumping on it. By default it follows its carrier, not the music; linked to a track
// itself, it rocks on that track's notes.
import { actor } from "../stage/actor.ts";
import { spring } from "../stage/clips.ts";

/** joint: what rides; carrier: the performer it follows by default; rot/pos: its motion at full follow-through; delay in seconds */
export const rider = (joint: string, carrier: string, motion: { rot?: number[]; pos?: number[]; delay?: number; period?: number; decay?: number }, amount: "table" = "table") => actor({
  id: joint, title: "Riding the " + carrier, amount, plays: ["follow:" + carrier],
  actions: {
    follow: (age, cue, m) => {
      const k = m.show[amount] * m.gain * (m.reduced ? 0.35 : 1) * cue.velocity;
      const r = k * spring(age - (motion.delay ?? 0.05), m.beat * (motion.period ?? 0.7), m.beat * (motion.decay ?? 0.45));
      return { pose: { [joint]: { ...(motion.rot && { rot: motion.rot.map(v => v * r) }), ...(motion.pos && { pos: motion.pos.map(v => v * Math.max(0, r)) }) } } };
    },
  },
  reactions: [{ when: { plays: true, count: 2 }, play: "follow" }],
});
