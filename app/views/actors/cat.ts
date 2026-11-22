// A cat sitting somewhere. Its idle life runs on the scene's clock whatever the music does: mostly it sits, breathes,
// now and then looks at something, tilts its head, flicks an ear, blinks (once twice over), and moves its tail (a slow
// wave up its three lengths, the tip flicking out, once curling right over). With music it nods on the backbeat
// (snare), lifting its chin just before, the nod held for two frames and sprung back, tipping to alternate sides every
// two snares; its ears flick on crashes and drops; its tail sways twice a bar. It ignores the hats, and barely nods in a
// quiet passage. Joints: `<id>.head`, `.earL/.earR`, `.eyeL/.eyeR`, `.tailA/B/C` (art/components/cat.cjs).
import { actor } from "../stage/actor.ts";
import { held, impact, once, spring, windup } from "../stage/clips.ts";
import { linked } from "../stage/moment.ts";

/* What it does in each 36-second round of the clock. Angles are degrees: +x tips the head down, +y turns it to its
   left; the tail's +z is in toward the cat. */
const DOES = {
  blinks: [3.1, 9.8, 15.9, 16.45, 23.5, 30.2],
  looks: [[4.0, 8.2, [-6, -24, 0]], [14.5, 17.8, [0, 20, 0]], [20.2, 23.4, [0, 9, 13]], [29.0, 31.2, [10, 0, 0]]] as [number, number, number[]][],
  flicks: [[9.3, "L"], [24.1, "R"], [33.0, "L"], [33.15, "R"]] as [number, "L" | "R"][],
  swishes: [1.5, 18.6], taps: [9.0, 26.0], curls: [[12.6, 16.6]] as [number, number][],
  round: 36,
};
const TAU = Math.PI * 2;

export const cat = (id = "cat") => actor({
  id, title: "Cat", amount: "cat", plays: ["lane:snare", "lane:low"],
  idle(m) {
    const t = ((m.clock % DOES.round) + DOES.round) % DOES.round;
    const head = [1.2 * Math.sin(m.clock * 1.1), 0, 0];
    for (const [a, b, to] of DOES.looks) { const k = held(t, a, b, 0.55); for (let i = 0; i < 3; i++) head[i]! += k * to[i]!; }
    const pose: Record<string, { rot?: number[]; scale?: number[]; show?: number }> = { [id + ".head"]: { rot: head } };
    let shut = 0; for (const a of DOES.blinks) shut = Math.max(shut, once(t - a, 0.3));
    for (const side of ["L", "R"] as const) {
      let flick = 0; for (const [a, which] of DOES.flicks) if (which === side) flick += once(t - a, 0.28);
      pose[id + ".ear" + side] = { rot: [-14 * flick, 0, (side === "L" ? -22 : 22) * flick] };
      pose[id + ".eye" + side] = shut > 0.8 ? { show: 0 } : { scale: [1, 1 - 0.85 * shut, 1] };
    }
    // the tail: a wave runs up it, each length a little later than the one below; never quite still
    const swish = (late: number) => { let v = 0; for (const a of DOES.swishes) v += Math.sin((TAU * (t - a - late)) / 1.3) * held(t, a + late, a + late + 2.6, 0.6); return v; };
    let tap = 0, curl = 0;
    for (const a of DOES.taps) tap += once(t - a, 0.7) - 0.4 * once(t - a - 0.7, 0.35);
    for (const [a, b] of DOES.curls) curl += held(t, a, b, 1.0);
    const still = Math.sin(m.clock * 0.9);
    // with music, the tail sways twice a bar, wider as the music fills
    const bar = linked(m, id) ? m.show.cat * (m.reduced ? 0.35 : 1) * (8 + 10 * m.energy) * Math.sin(TAU * m.barPhase * 2) : 0;
    pose[id + ".tailA"] = { rot: [0, 4 * swish(0), 0] };
    pose[id + ".tailB"] = { rot: [0, 0, 9 * swish(0.12) + 1.5 * still] };
    pose[id + ".tailC"] = { rot: [0, 0, 22 * swish(0.28) - 34 * tap + 42 * curl + 4 * still + bar] };
    const looking = DOES.looks.some(([a, b]) => t > a && t < b);
    return { pose, state: looking ? "looking about" : shut > 0.3 ? "blinking" : "sitting" };
  },
  actions: {
    nod: (age, cue, m, n) => {
      const k = m.show.cat * m.gain * (m.reduced ? 0.35 : 1) * (m.section?.kind === "quiet" ? 0.3 : 1) * cue.velocity;
      const nod = age < 0 ? 0 : age < 0.05 ? 1 : Math.max(0, spring(age - 0.05, m.beat * 0.8, m.beat * 0.35));
      const lift = windup(age, Math.min(0.12, m.beat / 3));
      return { pose: { [id + ".head"]: { rot: [k * (15 * nod - 6 * lift), 0, k * 8 * nod * (n % 4 < 2 ? 1 : -1)] } }, state: age < 0 ? "chin up" : age < m.beat / 2 ? "nodding" : undefined };
    },
    flick: (age, cue, m) => {
      const f = 0.8 * m.show.cat * (m.reduced ? 0.35 : 1) * cue.velocity * impact(age, 0.05, m.beat * 2);
      return { pose: { [id + ".earL"]: { rot: [-14 * f, 0, -22 * f] }, [id + ".earR"]: { rot: [-14 * f, 0, 22 * f] } }, state: age < m.beat ? "ears back" : undefined };
    },
  },
  reactions: [
    { when: { plays: true, count: 2, lead: 0.12 }, play: "nod" },
    { when: { on: "crash", count: 1 }, play: "flick" },
    { when: { every: "bar", where: (cue, m) => m.section?.kind === "drop" && Math.abs(cue.time - m.sectionStart) < 0.01 }, play: "flick" },
  ],
});
