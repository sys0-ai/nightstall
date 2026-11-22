// A table that the music shakes: it crouches a little just before each kick, hops on it (the contact pose held two
// frames, then a damped bounce, tipping to alternate sides beat by beat), and rattles finely with held bass and hats.
// Other actors can follow it ("follow:<id>"). Left free, it stands still.
import { actor } from "../stage/actor.ts";
import { clamp, spring, windup } from "../stage/clips.ts";
import { linked } from "../stage/moment.ts";

export const table = (joint: string) => actor({
  id: joint, title: "Table", amount: "table", plays: ["lane:kick", "lane:low"],
  actions: {
    hop: (age, cue, m, n) => {
      const k = m.show.table * m.gain * (m.reduced ? 0.35 : 1) * cue.velocity;
      const bounce = spring(age, m.beat * 0.55, m.beat * 0.3);
      const lift = 0.07 * Math.max(0, bounce) + 0.01 * Math.min(0, bounce) - 0.012 * windup(age, Math.min(0.09, m.beat / 4));
      const side = Math.round(cue.time / m.beat) % 2 ? 1 : -1; void n;
      return { pose: { [joint]: { pos: [0, k * lift, 0], rot: [k * 2.2 * Math.max(0, bounce) * side, 0, 0] } }, state: age < 0 ? "crouching" : age < m.beat / 2 ? "hopping" : undefined };
    },
  },
  reactions: [{ when: { plays: true, count: 2, lead: 0.09 }, play: "hop" }],
  idle(m) {
    if (!linked(m, joint)) return {};
    const tl = m.timeline, hats = Math.max(tl.held("hat", m.t, m.beat * 0.75) * 0.7, tl.hit("hat", m.t, m.beat));
    const k = m.show.table * m.gain * (m.reduced ? 0.35 : 1) * clamp(tl.held("bass", m.t, m.beat) * 0.6 + hats * 0.3), c = m.clock;
    return { pose: { [joint]: { pos: [0.006 * k * Math.sin(c * 71), 0.003 * k * Math.abs(Math.sin(c * 53)), 0.005 * k * Math.sin(c * 61 + 1)], rot: [0, 0, 0.5 * k * Math.sin(c * 43)] } } };
  },
});
