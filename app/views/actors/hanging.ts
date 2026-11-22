// Things that hang (valance flaps, a lantern and its tassel, bulbs on a wire, ladles, a sign): each a pendulum at its
// own length's pace, pushed by the wind on the environment bus. A breath of wind comes and goes, so everything moves a
// little more now and then. Hinged things (hung from two points) only swing fore and aft. Reusable for any joint the
// bake marks with `swing`.
import type { Joint } from "../stall.ts";
import { actor } from "../stage/actor.ts";

export function hanging(joints: Joint[], id = "hanging") {
  const hung = joints.filter(j => j.swing).map((j, i) => {
    const w = Math.sqrt(9.8 / Math.max(0.08, j.swing!.length)) * 0.55;
    return { name: j.name, w, w2: w * 0.83, amp: j.swing!.amp, ph: i * 1.7, hinged: !!j.swing!.hinged, tassel: !!j.swing!.tassel };
  });
  return actor({
    id, title: "Things that hang",
    idle(m) {
      const c = m.clock, wind = (m.env.wind ?? 0.5) + 0.6 * (m.env.gust ?? 0) * m.show.wind;
      const gust = (0.55 + 0.45 * Math.sin(c * 0.7) * Math.sin(c * 0.23 + 1)) * (0.15 + 1.7 * wind);
      const pose: Record<string, { rot: number[] }> = {};
      for (const s of hung) {
        if (s.tassel) { pose[s.name] = { rot: [7 * gust * Math.sin(c * 3.1 + 1), 0, 6 * gust * Math.sin(c * 2.6)] }; continue; }
        const a = s.amp * gust * Math.sin(c * s.w + s.ph), b = s.amp * 0.5 * gust * Math.sin(c * s.w2 + s.ph * 1.3);
        pose[s.name] = { rot: s.hinged ? [a, 0, 0] : [a * 0.6, 0, b] };
      }
      return { pose, state: gust > 1.1 ? "gusting" : "swaying" };
    },
  });
}
