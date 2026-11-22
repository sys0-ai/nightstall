# Guide: building the next music-driven scene in sys0

The practical route, for the next agent or person. Read [playbook.md](playbook.md) for the method and [findings.md](findings.md) for why. Night Stall (`apps/night-stall/`) is the working reference: copy its modules rather than re-deriving them.

## 1. Before you write code

1. Read [findings.md](findings.md) (15 minutes) and the 30 rules at the end of [research/design-craft.md](research/design-craft.md).
2. Write the **mapping table** for your scene (playbook §3.1): every element, its rank (hero, physical, ambient), its one listener, its motion and its decay in beats. If an element has no row, it does not react.
3. Decide the **sources** in order of preference (playbook §1). Always include a built-in score (a MIDI song) so the scene can be shown perfectly with no input at all.

## 2. The modules to reuse (apps/night-stall/views)

| File | What it is | Reuse |
|---|---|---|
| `midi-file.ts` | Standard MIDI File reader (format 0/1, tempo map, running status, SMPTE division) and a format-1 writer | as is |
| `synth.ts` | General MIDI synthesizer in Web Audio: GM drum map, voices by program family, glue compressor | as is, or swap for samples |
| `player.ts` | lookahead scheduler (25 ms tick, 150 ms ahead), looping on whole bars, `seek`, and `heard(frameAt, ahead)` on the output clock | as is |
| `song.ts` | an original 42-bar demo song generated as MIDI notes (intro, groove, build, drop, breakdown, build, drop, outro) | write your own, keep the form |
| `cues.ts` | `Timeline` (cues by role; `hit`, `since`, `windup`, `held`, `sounding`, `upcoming`, loop-aware), role classification, sections | as is |
| `analyze.ts` | offline audio analysis: band flux onsets, kick/bass separation, tempo (comb + prior), DP beats, chord roots | as is |
| `live.ts` | live onsets from the measured 12-band levels, tempo votes, PLL phase, predicted beats; the Bridge's transport and notes | as is |
| `stage/` | the actor model, clip shapes, moment and composer | as is |
| `actors/` | behaviours: hanging, weather, lighting, lamps, puddles, table, rider, cat, sign, bulbs, steam, bubbles | reuse, bind to your joints |
| `stage.ts` | the scene's actor list, bound to its rig | write your own |
| `main.ts` | the window: sources, the per-frame `moment()`, controls, camera | adapt |

The rendering side (`stall.ts`, `engine.ts`, `world*.ts`, `art/`) is specific to an Ink Studio diorama; see the [Night Stall memory notes](#6-traps-that-cost-time) and `art/build.ts` for how a pixel-dioramas scene is baked.

## 3. Components and actors

Model every thing in a scene on its own, then compose. Night Stall is the reference.

**Art side** (`apps/night-stall/art/components/*.cjs`, baked in Node): a component is a factory `place => ({ id, sculpt(ctx), rig?(), light?(), glow?(), spot?(), warms?(), emitters?() })`.

- `sculpt({ S, B, M, K, opt })` draws its geometry at `place` with the shared kit (`art/kit.cjs`: palette, materials, clocks). Tag every joint's splats `<id>.<joint>` so two instances never collide.
- `rig()` returns its joints: `{ name, pivot, parent?, group?, swing?: { length, amp, hinged?, tassel? } }`. The bake exports the merged rig to the view (`stall.rig`), so behaviour never hard-codes pivots.
- `lamps()` declares its lights for live lighting: `{ id, at, color, intensity, radius, direction?, inner?, outer? }` (actors brighten them by id with `Out.lamps`; the finish pass lights every pixel from them using the bake's per-splat normals and a data pass).
- `light()` adds a light to the bake; `glow()` and `spot()` light the mist; `warms()` tell the rain where lamplight catches it; `emitters()` declare steam and bubble sources (`{ kind, at, …, rides? }`; `rides` names a joint whose offset the source follows).
- The scene file only lists components with their places, in sculpt order (the builder's random draws follow that order).

**View side** (`apps/night-stall/views/`): a component's behaviour is an actor (`stage/actor.ts`):

```ts
actor({
  id, title, amount: "table",                       // the control that scales it
  idle: m => Out,                                   // life with no cue: breathing, blinking, wind
  actions: { hop: (age, cue, m, n) => Out },        // pure clips of the time since (or, negative, before) a cue
  reactions: [
    { when: { on: "kick", lead: 0.09 }, play: "hop" },          // cues, with a wind-up lead
    { when: { every: "bar", where: … }, play: "swing" },        // the beat grid
    { when: { after: "table.hop" }, play: "follow" },           // another actor's action
  ],
})
```

`Out` is `{ pose: { joint: { rot, pos, scale, show } }, lamps: { lampId | "*": gain }, water: { hits, hum, hz }, light: { glow, duck, pulse, hue, mist, quake, wave, glint }, rings, fx, env, state }`. The composer (`stage/compose.ts`) evaluates actors in order and merges: poses add, scales multiply, `show` takes the least, `pulse` and `glint` take the most, `fx` adds, and `env` passes values (wind, light level) to later actors. `state` is a few words on what the actor is doing (the debug handle `window.__nightStall.frame.states` shows them all). Clip shapes are shared (`stage/clips.ts`: `impact`, `spring`, `windup`, `once`, `held`, `fifths`), so an impact feels the same on a lamp, a table or a cat.

**Links: performers play tracks.** An actor names what it plays by default (`plays: ["lane:snare", "lane:low"]`, the first the song has) and reacts to it with `{ when: { plays: true, lead }, play: "nod" }`; continuous motion reads `linkedLevel(m, id)`. The person can relink any performer (`state.band`): a lane (`lane:kick`, `lane:part:<track>:<channel>`, `lane:control:<id>` for a recorded track), the grid (`grid:beat`, `grid:bar`, `grid:section`), another performer (`follow:table`: the same cues that set the table off), or `free`. The stage resolves links each frame (`resolveLink`) and reports them in `frame.links`, so a panel can say what each performer is playing. Every song exposes its lanes (`cuesFromSong(...).lanes`, `lanesOf(timeline)`); recorded tracks are lanes too (`band.ts` records them by tapping along, snapped to 16ths, and stores them per song in `state.tracks`).

**Reusing in another scene.** Copy the component modules and actors it needs, place the components in the new scene file, and list the actors in its stage bound to the new joint names: `cat("cat2")`, `table("cafe.table")`, `rider("cafe.table.cup", "cafe.table.hop", { rot: [4, 0, 0] })`, `sign("bar.sign", "bar.sign.glyph")`, `hanging(rig)` for everything with `swing`. Generic actors (`hanging`, `rider`, `weather`, `lighting`) need no change; specific ones (`cat`) bring their own idle life. A rule from the first version: music changes how things move and shine, never what they are.

## 4. Wiring a new scene

1. `apps/<id>/app.json`: `"design": "artwork"` (it draws itself), `"audioInput": ["radio", "microphone"]` for Radio and the microphone or Bridge, `"personal": true`. State: one `show` object of amounts (0–1) per element plus weather, and top-level `sync` (integer ms, −150…150) and `signal` (external cues). Band methods: `setShow`, `resetShow`, `setSync`, `cue`.
2. Each frame in `main.ts`:
   ```ts
   const ahead = 24 + sync;                      // one frame to the screen, half a frame of bias, the person's offset
   const t = player.heard(rafTime, ahead);        // or fileHeard / live time
   const frame = compose(actors, momentOf(t, clock, score, show, reducedMotion));
   stall.set(frame.pose, frame.fx); stall.draw(sceneTime, view, frame.light, w, h);
   ```
3. Sources:
   - MIDI: `useSong(readMidi(bytes))` → `cuesFromSong` → `player.play()`.
   - Audio file: `decodeAudioData` → `analyse(buffer, progress)` → play an `AudioBufferSourceNode` at a known `startAt` → `heard = outputTime − startAt`.
   - Radio: `ctx.audioLevels.listen(levels => …)`; microphone or Bridge: `listenMicrophone((levels, host) => …)` (the Bridge's `host` carries transport, notes and macros) → `live.read(reading, now, LIVE_LATENCY, sensitivity)` each frame → `choreograph(now + ahead, live.score(), …)`.
   - External cues: the `cue` method's `signal` read through `live.read` too.
4. The window: an input selector (MIDI player first), a song picker with "MIDI file…", Play, the cue monitor lamps, the status line ("bar 17 of 42 · Drop · 112 BPM"), one slider per element, Weather, Sync. Follow `docs/design/apps.md` for the app's kind and use public tokens only in the view's `<style>`.

## 5. Testing (do all of it)

Keep probes outside the repo (for example a scratch directory).

1. **Unit**: actions in `src/main.test.ts` (setShow range, reset, sync, cue). Deliveries run these.
2. **Analysis vs truth**: a page that renders the demo song through `createSynth` on an `OfflineAudioContext`, runs `analyse`, and reports per-role recall, precision and median error, plus the tempo. Serve with `Bun.build` + `Bun.serve`, drive with Playwright (`node_modules/playwright` in the worktree; launch with `--use-angle=metal --ignore-gpu-blocklist` for WebGL on Apple Silicon). Also a generated WAV at a second tempo.
3. **Sync on a candidate**: sign in (`/people/invite` over the run socket with `{"admin": true}`, then `/join`), open the app with `POST /api/sys0/i0/open`, click Play inside the view's iframe, `seek` to a drop through the debug handle `window.__nightStall`, and log per rAF `{now, heard, meters}` for 3 s. Check each kick's first lit frame is within ±8 ms, and the median and p95 frame interval are 16.7 ms.
4. **Look**: screenshots of the window on a hit and 140 ms later, in each section kind.
5. **With sound**: once, film the screen with a phone while it plays; step through frames.

## 6. Shipping

- Work in a worktree from `origin/staging`, push to `staging` (CLAUDE.md "Ship").
- A **new** repo app goes live by a system publish (`bun run live:service swap` from the live checkout); `apps deploy` refuses apps that are not yet installed.
- An **installed** app's view and code change by `bun run apps deploy <id>`; adding a top-level state field needs `--initial` (rehearse it on a candidate first: boot the old version, then deploy with `--initial`, and check `adds`).
- Large generated views are fine: Night Stall's view bundle is about 9.8 MB (engine 2.6 MB, baked world 5.2 MB); delivery allows 8 MiB per file and 32 MiB per bundle, so split generated data into parts under 8 MiB.

## 7. Traps that cost time

- A view's `Response` only takes text: read a `DecompressionStream` with `getReader()`, not `new Response(stream)`.
- The app check type-checks imports of generated JavaScript even under `// @ts-nocheck`: import it as `* as engine` and cast to `any`.
- Bundling Ink Studio: its files offer themselves to `require` behind `typeof` checks; rewrite `require(` to a throwing stub before `Bun.build`, or the bundler tries to resolve them.
- `AnalyserNode.smoothingTimeConstant` applies per read, not per second: its lag changes with how often you poll.
- The whole-spectrum flux makes a poor tempo envelope: snares and hats outweigh kicks and pull the tempo to 2/3 or 3/2. Normalise each band to its own percentile and comb over the lag's multiples.
- Overlapping rings sum into blobs: cap them (the newest two kick and two bass cues per pool) and make highlights a hard step.
- A probe must use the same `ahead` the view uses, or its frame errors are off by the difference.
- When another session is swapping the live service, wait for it: `ps` the swap's parent shell to see whose it is, and never run a second swap over it.
