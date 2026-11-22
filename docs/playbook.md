# Playbook: music-driven visuals that land on the beat

A method for building visuals driven by music, whether from audio we listen to, from MIDI, or from inside a DAW as a plug-in, held to the standard of a pre-programmed laser or lighting show. The evidence is in [findings.md](findings.md) and [research/](research/); the sys0 route is in [guide.md](guide.md). Night Stall (`apps/night-stall/`) is the reference implementation, and file names below point into it.

## 0. The architecture in one picture

```
 sources                        score                     clock                         choreography          render
 ───────                        ─────                     ─────                         ────────────          ──────
 MIDI file ──parse────────┐
 audio file ─analyse──────┤
 DAW notes + transport ───┼──▶  cues on a time line  ──▶  "what is heard when   ──▶  pure function     ──▶  one frame
 live audio ─onsets+PLL───┤     (role, time, vel,         this frame is shown"       f(t, score, show)       per rAF
 OSC / timecode ──────────┘      pitch, duration)          = audio clock +            → poses, lights,
                                 + beat grid + sections     output latency +            rings, palette
                                                            display lag + offset
```

Four rules hold it together:

1. **Everything becomes a score.** A cue is `{time, role, velocity, pitch, duration}` on one time line, with a beat grid and a list of sections. Every source, however good or poor, produces the same thing, so the choreography is written once ([cues.ts](../../apps/night-stall/views/cues.ts)).
2. **The audio clock is the only master.** Sound is scheduled on `AudioContext` time with lookahead; visuals never run on timers. Each frame asks: *what moment of the music will be audible when this frame reaches the screen?* ([player.ts](../../apps/night-stall/views/player.ts) `heard()`).
3. **Each component is modelled on its own and composed.** A component's geometry and rig are baked; its behaviour is an actor: idle life, actions that are pure clips of the time since their cue, and reactions binding actions to cues, the beat grid or other actors. A stage composes them each frame, with no per-frame state, so seek, loop and dropped frames can never put an element out of step ([stage/](../../apps/night-stall/views/stage/), [actors/](../../apps/night-stall/views/actors/), [guide §3](guide.md#3-components-and-actors)).
4. **The renderer only applies.** Poses, light levels, rings and palette are inputs; it holds no musical logic.

## 1. Sources, from best to worst

Prefer the highest source available; fall back gracefully.

| Source | Knows the future | Knows what each event is | Timing | Use for |
|---|---|---|---|---|
| A MIDI score we play | yes, all of it | yes (channel, GM drum note, program) | exact, scheduled | demos, generated music, MIDI files |
| An audio file we play | yes, after offline analysis | roughly (band classes) | exact on the grid, onsets ±10 ms | anything the user owns as a file |
| A DAW through a plug-in | transport: yes (tempo, bar phase); notes: only as played, unless the clips are read ahead | yes for notes | a block (≈3–11 ms) | performing, producing |
| Timecode (SMPTE/MTC/LTC, Art-Net TC) against a pre-programmed show | yes | yes (it was programmed) | a frame (33–40 ms), smoothed | concerts, lasers, theatre |
| Live audio (radio, microphone) | only predicted beats | band classes, guessed | detection latency, compensated | ambient listening |

### 1.1 MIDI we play

- Parse the Standard MIDI File once ([midi-file.ts](../../apps/night-stall/views/midi-file.ts)): header and `MTrk` chunks, variable-length delta times, running status, note-on velocity 0 = note-off, tempo meta `FF 51` (µs per quarter, default 500,000 = 120 BPM), time signature `FF 58`, SMPTE division if the high bit is set. Build one tempo map across all tracks and convert ticks to seconds.
- Pair note-ons with note-offs per channel and pitch (first in, first out); give hanging notes a default length.
- Classify roles: channel 10 by the GM drum map (35/36 kick, 37–40 snare/rim/clap, 42/44/46 closed/pedal/open hat, 49/52/55/57 crashes, 51/53/59 ride, 41–50 toms); melodic parts by program family (32–39 bass) and by how they are played (mean pitch, how often notes start together, mean length) into bass, pad, keys and lead.
- Sections per bar from what is happening: no drums is quiet, snare density strictly rising is a build, a kick on every beat at high energy is a drop, otherwise groove. Markers (`FF 06`) in the file, when present, beat any inference.
- Schedule with lookahead ([A Tale of Two Clocks](https://web.dev/articles/audio-scheduling)): a 25 ms timer schedules every note due in the next 100–150 ms at its exact `AudioContext` time. Loop on a whole bar after the last note, scheduling the next pass ahead like any other notes.
- Synthesize it ([synth.ts](../../apps/night-stall/views/synth.ts)): a sine kick dropping 160→42 Hz with a 3 kHz click, a noise and triangle snare, high-passed noise hats, subtractive voices by program family, a glue compressor. Or a SoundFont player (check the licence: WebAudioFont is GPL-3.0).

### 1.2 Audio files we play: analyse before playing

([analyze.ts](../../apps/night-stall/views/analyze.ts)) Decode, then before the first sample plays:

1. STFT: 1024-point Hann, hop 256 (5.8 ms at 44.1 kHz), magnitude compressed with `log(1 + 100·m)`.
2. Per-band spectral flux (sum of positive differences from the previous frame): kick 40–130 Hz, snare 180–320 Hz plus 1.8–5 kHz, hats 7–16 kHz, click 2–6 kHz.
3. Peak picking: a local maximum over ±30 ms, above 1.5 × the moving median over ±200 ms plus a margin, with a per-band minimum gap (low 120 ms, snare 100 ms, hats 60 ms).
4. Every low onset is a **bass** cue with the strongest low bin as its pitch and a duration while the low band stays up; those with a 2–6 kHz click within ±12 ms and a low-band jump of 1.8× are also **kicks**.
5. Tempo: autocorrelation of a band-normalised onset envelope (each band's flux divided by its own 95th percentile), a comb over 1–4× the lag, a log-Gaussian prior centred on 120 BPM.
6. Beats: dynamic programming over the envelope with a penalty on departures from the period (Ellis 2007).
7. Chord roots: the strongest pitch class per beat between 110 Hz and 1.8 kHz, as pad cues.
8. Sections per bar from the cues, as for MIDI.

Then play the buffer on the audio clock and draw exactly as for MIDI. Quality bar: tempo within 1 %, beats on the grid, onsets within ±10 ms. Measure against a rendered score (§6).

### 1.3 Live audio

([live.ts](../../apps/night-stall/views/live.ts)) Use only when nothing better exists, and know its limits.

- **Analyse in an AudioWorklet**, not an `AnalyserNode` on a timer: Linkwitz-Riley band splits (two cascaded Butterworth biquads, Q 0.707) and asymmetric envelope followers (attack 1–3 ms, release a fraction of a beat). An `AnalyserNode` with `fftSize` 2048 cannot see a kick for 12–15 ms and reaches half height at 21 ms; its `smoothingTimeConstant` is applied per read, so its time constant changes with the polling rate.
- Trigger on **rises in dB** per band, normalised by each band's own running mean (MilkDrop: instant ÷ 1.5 × mean over ~80 frames), with a refractory gap.
- **Stamp each cue with the audio time it happened**, not the time it was noticed.
- **Predict the beat**: tempo from inter-onset intervals or autocorrelation, phase from a PLL (gain 0.1–0.2 on phase, 0.01–0.02 on period, a ±0.15-beat capture window). Once confident, put the next one or two beats on the time line ahead of time as predicted cues, so the scene can wind up and land on them; replace a prediction with the real onset when it arrives.
- **Use the output latency as lookahead**: the analysis taps the graph before the speaker, so with 30 ms wired or 150–300 ms Bluetooth it is ahead of what is heard. Delay the picture to the heard time instead of drawing as soon as analysis finishes.
- Downbeats are unreliable live (F ≈ 0.45 on GTZAN): keep bar-level effects subtle.
- Sections live: loudness over the last bar against the last 30 s (rising sharply with a confident beat is a drop; falling well below is quiet).

### 1.4 Inside a DAW: plug-ins

The sys0 Bridge (`native/vst-bridge/`, see ARCHITECTURE "sys0 Bridge") is a VST3 effect that shows a page and hands it the track's audio, the transport, MIDI notes and eight macros. The general pattern for any plug-in (JUCE, VST3, CLAP, iPlug2, AU):

1. **Audio thread** (per block, no allocation, no locks): read the host transport (`AudioPlayHead::getPosition()` → `ppqPosition`, `bpm`, `timeSignature`, `isPlaying`, `ppqPositionOfLastBarStart`; CLAP `clap_event_transport`; VST3 `ProcessContext`). For each MIDI event, compute its beat position `ppq + sampleOffset / sampleRate * bpm / 60`. Push `{ppq, pitch, velocity, channel}` and the transport into a lock-free single-producer, single-consumer ring.
2. **Sender thread or UI timer** (60–200 Hz): drain the ring and send a frame to the renderer (WebKit `postMessage`, WebView2 `chrome.webview`, a WebSocket or OSC). Never block the audio thread waiting for it.
3. **Renderer**: keep a *beat clock*: `ppqNow = ppqAtFrame + (now − frameArrival) · bpm / 60`, smoothed between frames (as timecode readers smooth and freewheel through dropouts). Cue times are beat positions converted with the current tempo.
4. **Look ahead**: notes as played arrive on time but with no future. For real anticipation, send the notes of the clips that will play: in Live, Max for Live's `Clip.get_notes_extended` gives a playing clip's notes. With them the page has a score, exactly like a MIDI file.
5. **Macros** are the busking layer: map them to palette, energy, camera, intensity masters. The score drives hits; a human drives mood.
6. **Sync between processes and machines**: Ableton Link for tempo and phase (needs a native helper; browsers cannot join it), MIDI clock (24 ppqn, jittery, about 7 ms) as a fallback, MTC or LTC for absolute position, OSC for named parameters.

### 1.5 Timecode and pre-programmed shows (lighting, lasers)

When the music is known in advance, do what laser and lighting designers do:

- Load the track on a **timeline**, place beat markers (tap or analysis, then correct by hand), and program **cues** against bars and beats. Section markers drive looks; individual hits drive accents.
- Run the show from **timecode** (SMPTE/LTC from the playback rig, MTC, Art-Net timecode) with a **time-smoothing filter** and **freewheel** through dropouts. Make the media the master and let the show generate timecode for other systems.
- Fire cue stacks with MIDI Show Control (`F0 7F <device> 02 <format> <command> <cue> F7`; GO = 01) or console executors.
- Output: DMX512 (512 channels per universe, 250 kbit/s, about 44 Hz per full universe), Art-Net 4 (32,768 universes) or sACN/E1.31 (1–63,999) over UDP. Watch the off-by-one universe numbering.
- Lasers: content is ILDA frames (IDTF formats 0–5; format 5 is 2D true colour). A scanner is rated in kpps on the ILDA test pattern at about 8° optical; fewer points and smaller jumps per frame read sharper. **Audience scanning must stay below MPE** (ANSI Z136, IEC 60825), with working scan-fail detection; in the US it needs an FDA variance. Lasers are the part pros always timecode, never busk.
- Previsualise before the show (Depence R4 simulates scanner inertia and beam divergence; Capture, WYSIWYG for fixtures).
- Hybrid: a timecoded base for lasers and big moments, busked washes and blinders on top, and an "autopilot" look at the average BPM with blackout and accent hot keys for the unexpected.

A browser diorama is the same thing at a smaller scale: the score is the cue list, the audio clock is the timecode, the choreography is the programmed show, and the controls are the busking wing.

## 2. The clock

The moment to draw for a frame with `requestAnimationFrame` time `T`:

```
heard(T) = stamp.contextTime + (T + present + offset − stamp.performanceTime) / 1000      // stamp = ctx.getOutputTimestamp()
fallback = ctx.currentTime − (ctx.outputLatency || ctx.baseLatency) + (present + offset) / 1000
songTime = heard(T) − startAt
```

- `present` is the time from the rAF callback to the frame being on screen: about one frame (16.7 ms at 60 Hz). **Add half a frame more** so the frame *nearest* a hit takes it (error within ±8 ms) instead of the first frame *after* it (0 to +17 ms). Night Stall uses 24 ms.
- `offset` is the person's **Sync** control, −150 to +150 ms: Bluetooth, a TV's processing or external speakers. Rhythm games calibrate with a few taps in 5–25 ms steps.
- Sanity-check `getOutputTimestamp()` (both fields above zero, monotonic); some platforms have returned bad values.
- For one-shot effects use Tone.Draw's policy: fire up to 8 ms early, drop if more than 250 ms late. Pure functions of time (below) make this automatic.

## 3. The choreography

### 3.1 Write the mapping table first

One row per element: what it listens to, how it moves, when it changes structure. This is Night Stall's:

| Element | Rank | Listens to | Motion | Decay |
|---|---|---|---|---|
| Lamps (lantern, bulbs, sign box, street lamp) | hero | kick, crash, drop downbeat; chords for level | flash toward white on the kick while the haze **ducks** 22 %; big flare on crashes and the drop's first beat | flash ⅓ beat, flare 2 beats, duck recovers ¾ beat |
| Puddles | hero | kick and every bass-note onset; held bass | simulated water (damped wave equation, reflecting shores): each hit jolts the basin so waves leave every shore and interfere; held bass shakes it at 3–9 Hz with a parametric term that grows standing (Faraday-like) patterns. Shown only as the reflection bent by the slope and lamp glints off tilted water: never drawn rings (a first version drew crest outlines and read as lines, not water) | physical damping, 4/s |
| Sign | hero | downbeats; crashes and the drop's first beat | always 面 (it is the stall's sign: changing what it says broke the fiction); swings from its rail on each bar's downbeat, harder in a drop; the neon blinks out for two frames after a crash | swing settles over half a bar |
| Table | physical | kick; bass and hats as texture | contact pose held 34 ms, then a damped bounce (period 0.55 beat, decay 0.3 beat), tilt alternating per beat; a small crouch 90 ms before each kick; fine rattle from held bass and hats | bounce in beats |
| Bottle, glass, chopsticks | secondary | the table's kick | the same spring delayed 50 ms, with a longer period: follow-through | 0.45 beat |
| Cat | physical | snare (backbeat); bar phase; crashes | chin lifts in the 120 ms before each snare, then a nod held two frames and sprung back, tipping to alternate sides every two snares; tail sways twice a bar; ears flick on crashes and drops; ignores hats; nods less in quiet sections | 0.35 beat |
| Bulbs under the awning | physical | lead and keys notes | each note pops the bulb its pitch falls on (low on the left), ×1.45 | ⅓ beat |
| Steam | physical | section energy; bass and lead held; build tension | amount and swell | over beats |
| Broth (pot, bowl) | physical | hats (fizz), held bass (heave), kick (spatter) | bubbles as domes above the surface; the broth heaves toward the rim with the bass; each kick knocks it down and throws bright droplets above the rim on ballistic arcs (a first version's 2-pixel bubbles inside the pot could not be seen at all) | gravity; 1 beat |
| Rain, wind, mist | ambient | sections; build tension | rain heavier in drops, lighter when quiet; wind and mist rise through a build; mist dips on the kick | bars |
| Palette | structure | the chord on each section's downbeat; the bar's chord | one hue per section (circle of fifths from the section's chord, then section colour: drop pink, build cold blue), each bar's chord leans it | changes on downbeats |

Rules behind the table:

- **Stay in the world.** Music changes how things move and shine, never what they are: the sign's text, the stall's props and the cat stay themselves (a first version swapped the sign's 面 for notes and a cat's face, and read as wrong).
- **Hierarchy.** Two or three heroes are hard-locked to the slow, salient events; the rest are pushed; ambient things follow sections. Not every sound gets a visual: the cat ignores the hats (Chion: sync points work because they are punctuation).
- **Only events slower than about 4 Hz are discrete.** Hats are texture (rattle, bubbles), never flashes.
- **Crossmodal**: low and loud drive heavy, low, big things; high notes drive small, bright, high things; the bulbs read left to right as pitch rises.

### 3.2 Envelope shapes (all in beats)

Written as functions of the time since a cue (`age`) and since or until the next one:

```
impact(age, hold, release) = age < 0 ? 0 : age < hold ? 1 : exp(−(age − hold) / release)   // a held contact pose, then decay
spring(age, period, decay) = age < 0 ? 0 : exp(−age / decay) · cos(2π · age / period)        // a struck spring: overshoot and settle
windup(next, lead)         = smoothstep(1 − (next.time − t) / lead) · next.velocity           // anticipation, only with a known future
held(role, release)        = the loudest note sounding, then exp(−(t − end) / release)       // sustain for pads and bass
```

- Attack is **instant** for hits (no ease-in); hold the contact pose 1–2 frames (34 ms).
- Release: kick ⅓ beat, snare ½, afterglow 1, steam puff 2; section crossfades 1–2 bars.
- Overshoot 5–15 % (a spring with a damping ratio around 0.5–0.7); secondary motion 2–4 frames behind the primary.
- Wind-up lead: about ¼ beat, at most 90–120 ms, capped when notes are close together.

### 3.3 Sections, tension and the drop

- A **build** pulls the light down (up to −40 %), raises mist and wind and steam toward its last downbeat.
- The **drop's first downbeat** fires everything at once: the crash flare, the full ring set, the palette change, the sign. That moment is the show's biggest sync point; keep the rest of the show below it.
- **Quiet** sections are genuinely calm: lower base light, the cat barely nods, few rings. "Dark in the dark bits."
- Palette: one or two colours per section, switched only on section boundaries, leaned per bar.

### 3.4 Light that lights things

A lamp that brightens only its own pixels reads as a sticker. Light the scene from the lamps live:

- Keep per-surface normals from the bake and render a data pass (normal and distance per pixel) alongside the colour pass; reconstruct each pixel's position from the eye ray.
- Model each lamp as a light: position, colour, intensity, reach; spots with a cone. Shade with a windowed inverse square and a wrapped Lambert term.
- **Light the difference.** When the colours are already baked with the lamps at rest, scale each pixel by `ambient + fill·now + strength·(now − rest)`. At rest the art is untouched; only what the music changes (flash, flare, colour, a single bulb's note) spills onto the surroundings.
- Make it tunable (strength, fill, reach, softness, ambient, palette snap) and settle lit colour back into pixel art with ordered dithering, or onto the palette.

### 3.5 Pixel-art specifics

- Sub-pixel motion is invisible and slow ramps read as late: use displacements of at least 1–3 art pixels and held poses.
- Highlights are steps, not washes: a glint either catches the lamp or does not (two hard levels).
- Simulate what has physics (water, falling droplets) and show it only the way it is seen: a liquid shows as a bent reflection and glints, never as outlines.
- Make reactions visible from the camera: an effect inside a pot the camera barely sees into does not exist; throw it above the rim.
- Keep every colour on the palette except deliberate emissive tints (lamplight hue turns).

## 4. Controls (the busking wing)

Few, named for the thing, each an **amount** for one element (Table, Cat, Steam, Bubbles, Lamps, Color, Puddles, Sign), a **Sensitivity** master, **weather** (Rain, Wind, Mist), and **Sync** in ms. No per-route attack and release sliders: decays come from the tempo. A cue monitor (Kick, Snare, Hats, Bass, Chords, Lead) shows what the choreography is hearing, so a person can tell detection from design.

## 5. Performance

- Hold 60 fps without jitter: a constant offset is absorbed, jitter is not.
- Budget the frame: Night Stall's 287k splats and mirror pass take about 8 ms on an M1 Max; the choreography is microseconds; per-frame allocation is avoided in the hot path.
- Never let the scheduler depend on rendering: audio is scheduled on its own timer, ahead.

## 6. Verification

Do not trust a feeling. Measure.

1. **Score vs frames.** In the page, log for each rAF: the rAF time, `heard()`, and each element's output. For each kick in the score, find the first frame whose heard time is at or past it and check the error is within ±8 ms and the element is at its peak there (Night Stall's probe: `kick 34.2857 → first frame +3.2 ms, meter 1.00, previous 0.00`).
2. **Analysis vs truth.** Render a known score through the synth with `OfflineAudioContext`, analyse the audio, and score detected onsets against the notes: recall, precision and median error per role, and the tempo. Also test a generated loop at another tempo (124 BPM) to catch octave errors.
3. **Frame rate.** Median and p95 frame interval over a few seconds of playback.
4. **Look.** Screenshots on a hit and 140 ms later, in a quiet section, a build and a drop.
5. **End to end, with sound.** Record the screen and the audio together (a phone filming the screen works) and step through frames: the peak frame should sit on the transient or one frame before it. Do it once on wired output and once on Bluetooth with Sync set.
6. Tune at two tempos (a 70 BPM and a 128 BPM track): experts are more sensitive at slow tempos.

## 7. Checklist

- [ ] Every source becomes cues on one time line, with a beat grid and sections.
- [ ] Audio scheduled with lookahead; visuals drawn at the heard time with present-lag, half-frame bias and a Sync offset.
- [ ] Choreography is a pure function of time; no lerps on hits.
- [ ] A written mapping table: one listener per element; heroes, physical, ambient.
- [ ] Hits from onsets, moods from levels and sections; nothing from full-mix RMS.
- [ ] Decays in beats; contact poses held; springs for follow-through.
- [ ] Wind-ups only from known futures (scores, analysis, predicted beats).
- [ ] Duck on the kick; dark in the dark bits; the drop's downbeat is the biggest moment.
- [ ] Structure changes on downbeats; one or two colours per section.
- [ ] Events over 4 Hz are texture.
- [ ] Verified: frame errors within ±8 ms, analysis scored against truth, 60 fps steady, screenshots, and one recording with sound.

## 8. Where Night Stall still falls short of the bar

- Radio and microphone levels still come from the desktop's shared `AnalyserNode` path (`display/audio-levels.ts`, polled at 30 Hz), which Deadwater shares. Moving it to an AudioWorklet with biquad bands and per-band flux (research/dsp.md §7) would take about 60 ms off every live source in sys0.
- The Bridge sends notes only as they play. Reading Live's clips ahead (`Clip.get_notes_extended` from Max for Live, or the plug-in reading the next bar's notes) would give DAW performances full anticipation.
- Kick detection inside a bass-heavy mix is limited without a learned model (madmom-class); the scene deliberately treats every low onset as bass so it degrades gracefully.
- Web MIDI input (a live keyboard or pad controller) and Ableton Link need permission and a native helper respectively.
