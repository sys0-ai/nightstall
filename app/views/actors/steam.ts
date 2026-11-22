// Steam from the pot, the steamers and the bowl: how much follows the section's energy and the chords; how big it
// swells follows the bass and the melody, and rises through a build.
import { actor } from "../stage/actor.ts";
import { clamp } from "../stage/clips.ts";
import { linkedLevel } from "../stage/moment.ts";

export const steam = () => actor({
  id: "steam", title: "Steam", amount: "steam", plays: ["lane:pad", "lane:bass"],
  idle(m) {
    const s = m.show.steam, tl = m.timeline;
    if (!m.playing) return { fx: { steam: s * 0.5 } };
    const swell = clamp(0.9 * linkedLevel(m, "steam", m.beat) + 0.6 * m.tension);
    void tl;
    return { fx: { steam: s * clamp(0.35 + 0.65 * m.energy), steamLevel: s * swell }, state: swell > 0.5 ? "billowing" : "rising" };
  },
});
