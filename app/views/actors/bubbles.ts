// Broth on the boil. Fast events are texture: the hats keep it fizzing. The bass heaves it: a held low note lifts the
// broth and rocks it at the note's rate, so the surface visibly rises toward the rim. Every kick jolts it, throwing a
// spatter of bright droplets up out of the pot and the bowl, above the rims where they can be seen, falling back under
// gravity. Joints: the broths it heaves (art/components/counter.cjs and table.cjs).
import { actor } from "../stage/actor.ts";
import { clamp, impact, spring } from "../stage/clips.ts";
import { linked } from "../stage/moment.ts";

export const bubbles = (broths: string[]) => actor({
  id: "bubbles", title: "Bubbles", amount: "bubbles", plays: ["lane:open", "lane:hat", "lane:snare"],
  actions: {
    spatter: (age, cue, m) => {
      if (age < 0 || age > 1) return {};
      const k = cue.velocity * m.show.bubbles * m.gain * (m.reduced ? 0.35 : 1);
      // the jolt also knocks the broth down and lets it slosh back
      const slosh = -0.02 * k * spring(age, m.beat * 0.5, m.beat * 0.4);
      return { fx: { burst: clamp(k), burstAge: age }, pose: Object.fromEntries(broths.map(b => [b, { pos: [0, slosh, 0] }])), state: age < 0.4 ? "spattering" : undefined };
    },
  },
  reactions: [{ when: { plays: true, count: 1 }, play: "spatter" }],
  idle(m) {
    const s = m.show.bubbles;
    if (!linked(m, "bubbles")) return { fx: { bubbles: s, boil: 0.1 } };
    const tl = m.timeline, kick = tl.since("kick", m.t);
    const hats = Math.max(tl.held("hat", m.t, m.beat * 0.75) * 0.7, tl.hit("hat", m.t, m.beat), tl.hit("open", m.t, m.beat * 1.2));
    const bass = tl.held("bass", m.t, m.beat), note = tl.sounding("bass", m.t)[0];
    const boil = clamp(hats * 0.9 + 0.5 * bass + 0.8 * (kick.cue?.velocity ?? 0) * impact(kick.age, 0.034, m.beat / 3));
    // the heave: up to 0.025 units (about 1.6 art pixels) at full bass, rocking at a rate set by the note
    const rate = note ? 4 + (note.pitch % 12) * 0.4 : 5;
    const heave = s * (m.reduced ? 0.35 : 1) * bass * (0.016 + 0.009 * Math.sin(m.clock * rate * 2 * Math.PI));
    return { fx: { bubbles: s, boil }, pose: Object.fromEntries(broths.map(b => [b, { pos: [0, heave, 0] }])), state: bass > 0.4 ? "heaving" : boil > 0.6 ? "boiling" : "simmering" };
  },
});
