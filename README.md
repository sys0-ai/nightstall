# Night Stall

A rainy night-market noodle stall that plays along with music: a pixel-art diorama (282k baked splats, rendered live in
WebGL) whose lamps, table, cat, sign, bulbs, steam, bubbles, puddles and weather each perform a part of the song.
It is driven by a **score** (cues on a time line), so every hit lands on the frame it is heard, within ±8 ms.

Live: <https://nightstall.sys0.ai/>

```sh
bun run dev        # build and serve the standalone page at http://localhost:4600/
                   # click or Space: play the built-in song · drop a .mid · P: pixel size · arrows: turn
bun run build      # dist/index.html + dist/play.js, a static page you can host anywhere
```

Needs [Bun](https://bun.sh) and a browser with WebGL2. No server, no network: everything runs in the page.

## What is here

| Path | What |
|---|---|
| `standalone/` | a host-free page: the scene, its actors and the MIDI player, full window (start here) |
| `app/views/` | the scene and the music engine (renderer, stage, actors, MIDI, synth, audio analysis, live listening) |
| `app/views/main.ts`, `main.html` | the full window as a sys0 app: inputs, sliders, band panel, live inputs |
| `app/art/` | the diorama's source: components sculpted with Ink Studio and baked into `app/views/world*.ts` |
| `app/app.json`, `band.json`, `src/` | the sys0 app's saved state, methods and actions (only needed inside sys0) |
| `docs/` | the research, playbook and guide for music-driven scenes |

**Agents: read [AGENTS.md](AGENTS.md)** for how the pieces fit and how to adapt them.

## Credits

The diorama started from [cola5939/pixel-dioramas](https://github.com/cola5939/pixel-dioramas) (its night-stall
scene), which declares no licence; ask its author before publishing a derivative. Rendering and baking use
[Ink Studio](https://github.com/siliconjungle/shapeshift-labs-ink-studio) (MIT), bundled into `app/views/engine.ts`.
The demo song *Night Market* is original and generated in code (`app/views/song.ts`).
