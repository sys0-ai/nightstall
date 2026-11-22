// The weather: rain, wind and mist. Each section sets how much: a drop rains harder, a quiet passage less; wind and
// mist rise through a build; a crash gusts. Puts `wind` on the environment bus for whatever hangs.
import { actor } from "../stage/actor.ts";
import { impact } from "../stage/clips.ts";

export const weather = () => actor({
  id: "weather", title: "Weather", plays: ["lane:crash", "grid:section"],
  actions: {
    // a gust: the wind rises on what the weather is linked to (crashes, unless linked otherwise) and falls over two beats
    gust: (age, cue, m) => ({ env: { gust: Math.max(m.env.gust ?? 0, cue.velocity * impact(age, 0.05, m.beat * 2)) }, state: age < m.beat ? "gusting" : undefined }),
  },
  reactions: [{ when: { plays: true, count: 1 }, play: "gust" }],
  idle(m) {
    const s = m.show, kind = m.section?.kind;
    const kick = m.timeline.since("kick", m.t), kickHit = m.playing ? (kick.cue?.velocity ?? 0) * impact(kick.age, 0.034, m.beat / 3) : 0;
    const pads = m.playing ? m.timeline.held("pad", m.t, m.beat * 2) : 0;
    const wind = s.wind * (1 + 0.8 * m.tension);
    return {
      fx: { rain: s.rain * (kind === "drop" ? 1.25 : kind === "quiet" ? 0.8 : 1) },
      light: { mist: 2 * s.mist * (1 + 0.5 * m.tension + 0.25 * pads - 0.3 * kickHit * s.glow) },
      env: { wind },
      state: kind === "drop" ? "downpour" : m.tension > 0.3 ? "wind rising" : "raining",
    };
  },
});
