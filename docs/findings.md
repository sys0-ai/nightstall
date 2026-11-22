# Music visuals: what we found

This is the write-up of a study of how professional sound-visualization designers, VJs, lighting and laser designers work, done to rebuild Night Stall after its first, level-driven version felt "behind the beat" and "not well-attuned", with water that ignored the bass. It summarises three research reports (about 23,000 words, roughly 170 sources, in [research/](research/)) and measurements made on Night Stall itself. The [playbook](playbook.md) turns it into a method; the [guide](guide.md) is the practical route through sys0.

- [research/design-craft.md](research/design-craft.md): practitioners (Max Cooper, deadmau5, Amon Tobin's ISAM, Moment Factory, Weirdcore, Strangeloop, Bonobo's LD, Robert Hodgin), lighting practice, perception research and motion design. Ends with 30 rules.
- [research/dsp.md](research/dsp.md): onset detection, drum-band detectors, tempo and beat tracking, the browser's latency chain, feature conditioning and structure. Ends with a parameter cheat-sheet and AudioWorklet pseudocode.
- [research/midi-plugins.md](research/midi-plugins.md): Standard MIDI Files, browser scheduling, DAW plug-ins (JUCE, CLAP, VST3, Max for Live), sync protocols (MIDI clock, MTC, Link, OSC), lighting and laser show control (grandMA timecode, MIDI Show Control, Pangolin BEYOND, ILDA, DMX/Art-Net/sACN).

## 1. The professionals rarely react to audio

The single most consistent finding. The shows people remember are **cued from a known score**, not analysed live.

- Max Cooper: "It all comes from MIDI going into Ableton and OSC coming out." Mapping data straight to music "invariably make[s] a non-musical mess."
- deadmau5's Cube runs on 800+ OSC tags; "there are just some moments in a show that really need to be sequenced."
- Amon Tobin's ISAM had a "Show Sequencing System"; Moment Factory fired Phish's Sphere cues from a grandMA; Billie Eilish's 2024 tour was pre-rendered and choreographed.
- Laser shows are programmed on a timeline against the song (Pangolin BEYOND, QuickShow) and run from SMPTE or MIDI timecode, because lasers are where precision and safety matter most.
- Even consumer automation pre-analyses: rekordbox Lighting needs phrase analysis ("you cannot perform lighting in sync with the tracks" without it); SoundSwitch runs loops on the DJ software's beat grid; Unreal's Audio Synesthesia analyses offline and reads the results during play.

Live analysis exists in these rigs, but as **texture on top of a known structure**, routed per element and gated by a human (Synnack and 0xf8; Weirdcore: "some react to the bass, some the mids, others the highs").

Why: a programmed cue can **start before the hit** (anticipation), it knows **what** each event is (a snare is not a clap, a verse is not a drop), and it is **deterministic** (the same song gives the same show, so it can be tuned and reviewed).

## 2. Timing: the numbers

- Broadcast lip-sync (ITU-R BT.1359): a picture **late** by 45 ms is detectable and by 90 ms unacceptable; a picture **early** is tolerated to −125 / −185 ms. People are about three times more forgiving of early pictures.
- Drumming studies: visuals that lead the sound slightly feel *most* in sync (best audio delay about 30 ms at 4 Hz, more at slower rates). Animators put mouth shapes about two frames ahead of the sound.
- Above about **4 Hz** (16th-note hats, eighths over 120 BPM) people cannot tell whether repeated flashes are in sync at all. Precise sync is only worth spending on kicks, snares, downbeats and section changes; faster events are texture.
- A **constant** offset is partly absorbed by the brain; **jitter** is not. A steady frame rate matters more than raw speed.
- The beat a listener feels (the P-centre) is at the attack, not at the energy peak, which for a bass note can be tens of ms later. Level followers peak late by construction.

Target: a hit's brightest or most extreme frame sits between one frame early and about 20 ms late against the **audible** transient. Never 45 ms late.

## 3. Why Night Stall 1 felt late and mushy

Measured and computed, not guessed ([research/dsp.md §0](research/dsp.md)):

| Stage (Radio input) | ms |
|---|---|
| `AnalyserNode` 2048-point Blackman window: a kick reaches half height only after | 21 |
| `smoothingTimeConstant` 0.45, applied per read at 30 Hz (τ ≈ 42 ms) | 15–25 |
| `setInterval(33)` sampling in the desktop | 0–33 |
| Change-only messages and the view's 40 ms timer | 5–20 |
| The view's own followers (attack 40–50 ms) on top | 20–40 |
| rAF wait and presentation | 25–35 |
| **Net, minus the output-latency head start** | **≈ 70–130 late** |

Every stage sits on the side people tolerate least. Beyond latency:

- **Everything listened to the same broadband levels**, so everything moved together and nothing read as a sync point ("simply making visuals respond to the whole song resulted in a chaotic mess").
- **The water was driven by level, not onsets.** A sustained bass line holds the low band near its ceiling, so a kick on top moves the byte-scaled level by about 0.09; the puddle trigger (a per-frame rise of 0.18) almost never fired. And a ring only bent the reflection, which over a dark reflection is invisible.
- **Symmetric smoothing on hits** (same constant up and down) blunted every attack.
- **No anticipation**: a follower can only react; it cannot wind up before a hit.

## 4. What makes it look attuned

From practitioners, animation and lighting ([research/design-craft.md §6](research/design-craft.md) has all 30 rules):

1. **One listener per element**, written down in a mapping table. Nothing listens to full-mix RMS.
2. **A hierarchy**: two or three *hero* elements hard-locked to the slow, salient events (kick, snare, downbeat); a few *physical* elements the music only pushes; the rest ambient.
3. **Onsets for hits, levels for moods.** Hits come from rectified spectral flux in a band; colour, density and swells from slow loudness or the section.
4. **Decays in beats**: kick flash ⅓ beat, snare ½, lamp afterglow 1, steam puff 2, section crossfade 1–2 bars. The scene then breathes at the song's tempo.
5. **Contrast beats brightness**: duck the ambient light 10–30 % on the kick and let it recover over ¾ beat (a visual sidechain); keep "dark in the dark bits"; black out before a drop and fire everything on its downbeat.
6. **Structure changes only on the grid**: palette, glyph, camera on downbeats and section boundaries; one or two colours per section.
7. **Pixel-art impacts are held poses**: the contact pose on the beat for one or two frames, then overshoot and settle. Tweened sub-pixel ramps read as mush.
8. **Anticipation needs foreknowledge**: wind-ups (the cat lifting its chin, the table crouching, the light pulling down through a build) only work when the next hit is known.
9. **Let physics decay the motion** (Robert Hodgin's Magnetosphere: audio changes forces, not positions). Water is an impulse-response medium: drive it with low-band onsets and let the rings spread and fade.
10. **Crossmodal correspondences**: low and loud drive big, heavy, low things (puddles, table); high pitch drives small, bright, high things (bulbs, bubbles). Pitch class maps naturally round the circle of fifths, so related chords get related hues.

## 5. Signal processing that works (when you must listen)

From [research/dsp.md](research/dsp.md):

- Detect **rises in dB** (log-magnitude spectral flux, half-wave rectified, SuperFlux-style), per band, against a moving median, with peak picking (±30 ms max, a minimum gap per band).
- Bands: kick 45–120 Hz plus a 2–5 kHz beater click; snare 150–250 Hz plus 2–8 kHz noise; hats 7–16 kHz. A kick differs from a bass note by its click and by jumping from well below its landing level.
- **Normalise each band against its own history** (MilkDrop: instant ÷ 1.5 × rolling mean; or P10/P95 over 8 s), so quiet and loud songs both fill the range.
- Analyse in an **AudioWorklet** with biquad bands and asymmetric followers (attack ≤ 1 frame), not an `AnalyserNode` polled on a timer.
- **Predict the beat**: tempo from autocorrelation (log-Gaussian prior around 120 BPM, with a comb over the lag's multiples to avoid 2/3 and 3/2 errors), phase from a phase-locked loop; fire beat visuals on the predicted beat.
- Stamp everything on the **audio clock** and draw each frame for the moment that will be audible when the frame is shown (`getOutputTimestamp()`, `outputLatency`, about one frame of display lag, a user offset for Bluetooth).
- For anything we play ourselves (files, MIDI), **do all of it offline before playing**. Offline beat tracking scores F ≈ 0.9 against ≈ 0.75 for the best online trackers.

## 6. What we measured in Night Stall 2

- **Render cost**: Ink Studio's renderer draws the 287k-splat stall plus its mirror pass in about 8 ms (median) on an M1 Max at the 640×360 art resolution, so rendering is not the latency.
- **Sync on the MIDI player**: with the audio-clock mapping and a half-frame bias, every kick's first lit frame lands within ±8 ms of the kick on the heard clock, at a steady 16.7 ms frame interval (60 fps, p95 16.7 ms). `outputLatency` read 32 ms on a wired output.
- **Offline analysis** of Night Market rendered through the synth: tempo 112.3 BPM (true 112), beats on the grid, hats found with recall 0.91 (precision 0.59) and snares with recall 0.94 (precision 0.35: claps, chord stabs and open hats also land in the snare bands), median timing error −4 ms. Low precision costs little visually, since a spurious snare cue is a small extra nod, but it is why the scene prefers a score whenever one exists. Kicks inside a bass-heavy drop are hard (recall about 0.55 when separated from bass notes), so every low onset is also a `bass` cue: the bass-tied elements move on bass notes as well as kicks, which is what the eye expects. A generated 124 BPM loop analysed to 124.5 BPM with kicks found 10 ms early.
- Kick-versus-bass separation, tempo octave errors and "build" detection were each wrong on the first attempt; the fixes (click coincidence, a comb over lag multiples, a band-normalised tempo envelope, builds requiring strictly rising snare density) are in `apps/night-stall/views/analyze.ts` and `cues.ts`.

## 7. Plug-ins, MIDI and show control

From [research/midi-plugins.md](research/midi-plugins.md):

- In a DAW plug-in (JUCE, VST3, CLAP, iPlug2), read the host transport at each block (`ppqPosition`, `bpm`, `isPlaying`), stamp notes with their beat position, and pass them through a lock-free single-producer, single-consumer queue to a non-audio thread that forwards them to the renderer (a web view, WebSocket or OSC). Never allocate or lock on the audio thread.
- The best upgrade for the sys0 Bridge is to send **upcoming** notes as well as played ones: Live 11+ exposes the playing clips' notes (`Clip.get_notes_extended`), which gives the page the same lookahead a MIDI file has.
- MIDI clock is 24 ppqn and jittery (about 7 ms measured); Ableton Link is the better tempo and phase source but needs a native helper (browsers cannot join Link or receive raw UDP OSC).
- Lighting and lasers run on timecode (SMPTE/LTC, MTC, Art-Net timecode) with freewheel through dropouts (BEYOND stops after 1 s unless set to keep running), cue stacks fired by MIDI Show Control, DMX512 at about 44 Hz per universe, Art-Net or sACN over the network. Laser content is ILDA frames; scanner speed is rated in kpps on the ILDA test pattern; audience scanning needs MPE compliance and scan-fail detection. Previsualisers (Depence, Capture, WYSIWYG) simulate the rig before the show.
- The common pro hybrid: **timecoded base, busked accents**. Our equivalent is a score-driven scene with live macros (the eight Bridge macros, or the app's controls) on top.
