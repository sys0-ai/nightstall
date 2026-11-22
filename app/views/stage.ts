// Night Stall's stage: the actors that bring its components to life, in the order they act (environment first, then
// the light, then the things that read them). Each actor is a reusable behaviour (views/actors/) bound to the joints
// the bake made for its component (art/components/); another scene composes its own list from the same actors.
import type { Joint } from "./stall.ts";
import type { Actor } from "./stage/actor.ts";
import { weather } from "./actors/weather.ts";
import { lighting } from "./actors/lighting.ts";
import { hanging } from "./actors/hanging.ts";
import { lamps } from "./actors/lamps.ts";
import { puddles } from "./actors/puddles.ts";
import { table } from "./actors/table.ts";
import { rider } from "./actors/rider.ts";
import { cat } from "./actors/cat.ts";
import { sign } from "./actors/sign.ts";
import { bulbs } from "./actors/bulbs.ts";
import { steam } from "./actors/steam.ts";
import { bubbles } from "./actors/bubbles.ts";

export function nightStallStage(rig: Joint[]): Actor[] {
  const named = (group: string) => rig.filter(j => j.group === group).map(j => j.name);
  return [
    weather(),
    lighting(),
    hanging(rig),
    lamps(),
    puddles(),
    table("table"),
    rider("table.bottle", "table", { rot: [7, 0, -4] }),
    rider("table.glass", "table", { rot: [-5, 0, 4] }),
    rider("table.chopsticks", "table", { rot: [0, 5, 0], pos: [0, 0.035, 0] }),
    cat("cat"),
    sign("sign", "sign.glyph"),
    bulbs(named("bulbs")),
    steam(),
    bubbles(["counter.broth", "table.broth"]),
  ];
}
