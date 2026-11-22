# Linking performers to tracks: routing, recording, stems and ensemble behaviour

Research for an "animatronic band" scene in the browser. Every object in a pixel-art scene (a cat, a table, lamps, a sign, puddles, steam, bubbles) is a performer. Each one can be linked to a song track (a MIDI track or audio stem), to another performer (follow it), to song properties (beat, bar, section, energy, chord), to a newly recorded control track (programmed by tapping or puppeteering), or left independent.

Compiled 2026-11-22 from about 50 web sources (list at the end). Each part has a **"Sources say"** section, which reports or quotes what the sources state with attribution, and a **"Synthesis"** section with my reading. Numbers are as published. Where a source is a community page or a forum post rather than official documentation, the text says so.

---

## Part 1. Routing and mapping UIs

### 1.1 DAW track routing (Ableton, Bitwig, Reaper, Logic)

**Sources say**

- **Ableton Live** routes signals with two choosers on each track. The manual calls the mixer's In/Out section "Live's 'patchbay'": each track that can play clips has an upper "Audio/MIDI From" pair and a lower "Audio/MIDI To" pair. In each pair, the first chooser picks a *type* (a track or an input) and the second picks a *channel* within it. A Monitor switch (Auto/In/Off) sits between them. A MIDI track can take another track's MIDI "at the latest possible stage", after that track's MIDI effects and just before its instrument. Several MIDI tracks can drive one multitimbral instrument by pointing their Output Type at the host track and choosing a MIDI channel. "Resampling" in an audio track's Input Type routes the Main output back in. Some devices "have their own sidechain controls with integrated routing choosers" (Ableton Live 12 manual, Routing and I/O).
- Ableton users report a limit here: when MIDI is routed between tracks, channels 1–16 merge into one, and one user complained this "still isn't addressed in Live 12" (Ableton forum; user reports, not documentation).
- **Bitwig** has a dedicated **Note Receiver** device, "a router with note inputs and outputs" that "imports note signals from any designated project source", plus an **Audio Receiver** (Bitwig user guide, Routing). Among its modulators are **Note Sidechain** ("use any note input as a modulation source") and **Audio Sidechain** ("use any audio input (in the track or external) as a modulation source") (Bitwig modulators page).
- **REAPER** offers a **Routing Matrix** (View > Routing matrix, Alt+R): a grid of every track against every track and hardware I/O, where you "Click to add send, click again to remove. Right-click to adjust" (Cockos wiki). REAPER also has **Parameter Modulation / MIDI Link** on *every* FX parameter, opened from the FX window's Param menu or a per-parameter "Mod" button. Its sources are:
  - *Audio control signal (sidechain)*, with Input dB threshold, attack, release and a signed Strength. "A setting of 100% negative means that as the incoming audio signal increases, the parameter being controlled will decrease."
  - *LFO*.
  - *Link from MIDI or FX parameter*, which covers MIDI CC, another plugin's parameter, or a "Keytrack generator: Midi Note Value".
  - A "baseline value" that offsets the result.

  (Sound On Sound "Parameter Modulation"; Admiral Bumblebee; Cockos ParamMod PDF.)
- **Logic Pro** automation modes are Off, Read, Touch, Latch, Write and Trim. They are covered in Part 2.

**Synthesis**

DAWs offer two kinds of routing, and the scene needs both:
1. **Signal routing**, where a track's notes or audio *feed* a destination. Ableton's From/To choosers and Bitwig's Note Receiver work this way. For the scene, this means "the cat plays the drum stem."
2. **Parameter modulation**, where a signal derived from some source *moves a parameter*. Bitwig's sidechain modulators and REAPER's per-parameter Mod dialog work this way. For the scene, this means "lamp brightness follows the kick envelope."

Ableton's **type then channel** pattern (pick "Track: Drums", then "Post FX / channel 10") is a good model for a performer's source picker: choose a *category* (Track, Performer, Song, Recorded, None), then the specific item.

### 1.2 Modulation matrices and "anything modulates anything"

**Sources say**

- **Bitwig's Unified Modulation System.** According to Bitwig's user guide, you "assign and edit modulations without being locked into fixed routings", and the current modulated value stays visible. The steps:
  1. Load a modulator into a device's modulator slot.
  2. Click the modulator's small routing button. "The button itself begins flashing."
  3. Click a target parameter and drag to set the *maximum* modulation depth. Because depth is relative, you can "twist the modulation range past the parameter's normal range."
  4. Read the feedback. Assigned targets turn brightly coloured, potential targets are shaded, and amounts appear in orange in the Inspector.

  Each connection has a **transfer function**: Linear (bipolar, the default), Positives (unipolar, "Proportional response to positive values"), Negatives, Absolute, Toward Zero, Exponential and Logarithmic. While in mapping mode, clicking a connection with another source such as Velocity makes that source **scale the depth** of the connection. Blue marks monophonic sources and green marks polyphonic (per-voice) ones. Modulators can modulate other modulators, for example an LFO moving an ADSR's decay (Bitwig "Introduction to Modulators"). Sound On Sound notes that Bitwig 2 "replaced the fixed, device-bound LFOs with a universal modulation system". In Bitwig 5, "the modulators are no longer limited to devices — they can grab the mixer and project controls as well."
- **Serum.** "To apply it, drag the modulation handle to another control." "By Alt-dragging, we can reduce the amount of modulation applied" (MusicRadar). The Matrix tab lists every route, and an **Aux Source** scales a route's depth. Forum users use it to put an LFO's depth on a macro. Curves are bent by dragging the curve slope in the matrix (Cymatics, Xfer forum; community sources).
- **Vital** works the same way, by dragging a source onto a slider. A KVR poster says all of Vital's modulation sources are visible in the GUI and none are hidden. A macro dropped onto a route's *amount* in the MATRIX tab becomes "a regular modulation assignment" (Vital forum, KVR; community sources).
- **HALion and Ultra.** HALion shows a drag icon on draggable sources and a green overlay on valid drop targets, and drag assignment stops once all 16 matrix rows are used. Ultra keeps both a list view and a per-source view of connections (Steinberg docs, Ultra docs).

**Synthesis**

The pattern that recurs across these tools:
- **Drag from source to target.** The gesture is the link.
- **A visible ring or arc on the target** showing the depth and the live value.
- **A matrix view** listing every route as a row: source, depth, curve, target, plus an optional depth-scaler.

The drag is the fast way to *create* a link. The matrix is where a person *audits* links. Serum and Vital have both, and their users treat the matrix as the cure for "what is moving this knob?"

### 1.3 MIDI learn and map modes

**Sources say**

- **Ableton.** "Enter MIDI Map Mode by pressing the MIDI switch in Live's upper right-hand corner." Mappable controls turn blue and a **Mapping Browser** opens. You click a parameter, then move a hardware control. The browser lists each mapping with **Min and Max**, which "can be edited at any time, and can be quickly inverted with a context menu command". Key Map Mode (Cmd+K) does the same for computer keys, which are on or off only. **Takeover modes** decide what happens when a hardware control and its parameter disagree:
  - *None* jumps.
  - *Pick-Up*: "Moving the physical control has no effect until it reaches the value of its destination parameter."
  - *Value Scaling* "calculates a smooth convergence of the two as the control is moved."

  The manual also contrasts absolute controllers (0–127) with relative ones (increment and decrement) (Ableton manual, MIDI and Key Remote Control).
- **Max for Live modulators.** LFO, Envelope Follower, Shaper and Envelope MIDI share one workflow: "activate the Map button and click a parameter to assign it as a mapping target", and "You can map up to eight parameters in total". Unmap is a button beside Map, and Min/Max sliders "scale the modulation range". Each device has its own shaping controls:
  - LFO has **Jitter** ("adds randomness") and **Smooth** ("softens any sharp changes"), with Hz or tempo-synced rates.
  - Envelope Follower has **Rise** and **Fall** ("Rise … smooths the attack … Fall … smooths the release") and a sync-able Delay.
  - **Expression Control** maps incoming Velocity, Modwheel, Pitchbend, Aftertouch or Keytrack to "any automatable parameter", with Output Range Min/Max and "Smoothing Rise and Fall sliders" of 0–1000 ms.

  (Ableton Live 12 manual, Max for Live Devices; Sound On Sound.)

**Synthesis**

"Learn" is a mode of the *whole screen*. You enter it, every eligible target lights up, you make one pick, and you leave. It is the clearest pattern for "link this performer to that thing in the scene", because the scene itself is the picker. Ableton's **Min/Max per mapping with invert** and its **Rise/Fall smoothing** are the two per-link controls people reach for most. Everything else is optional.

### 1.4 VJ tools: Resolume, VDMX, Synesthesia, TouchDesigner, Notch

**Sources say**

- **Resolume.** Every parameter has its own animation menu: "Click the grey cogwheel next to a parameter name", or "Right click to reveal its animation menu!" for toggles. The sources available per parameter are:
  - **Timeline**, with direction, speed, in/out points and loop, ping-pong, random or one-shot.
  - **BPM Sync**, with the same controls but time measured in beats.
  - **Dashboard**, a dial shared by many parameters.
  - **Clip Position**: "It lets you sync a parameter to the playhead of the clip."
  - **Crossfader Phase**.
  - **Audio FFT** from External, Composition, or Clip/Layer/Group audio. The FFT controls are L/M/H band buttons, in/out points on the spectrum, **Gain**, and **Fall** ("sets how quickly the value falls back from a peak"). Direction buttons drive the value up ">" or down "<", or use "-"/"+" so the audio sets the *speed* of movement.
  - An **Envelope** can be applied over any of them.

  Dropdowns and palettes can be animated too; they step through their options (Resolume manual, Parameter Animation). Version 7.3 added start settings so BPM animations can run out of the global phase and retrigger (Resolume blog 7.3.0). Dashboard dials accept many parameters by drag, but users report a parameter's *speed* slider can't be linked to a dial (Resolume forum).
- **VDMX** names its control sources "data-sources": Audio Analysis, Clock, Control Surface, LFO, Step Sequencer, layer opacity, movie time (normalised 0–1 or seconds), mouse position and more. Most UI items take one: right-click a slider, then "Use Data-Source" (VDMX tutorials). Values are scaled to the slider's min/max. **Number FX chains** reshape a source before it arrives, for example a "Fall" on audio level (VDMX tutorial "Creating a 'Falling' audio level data-source").
- **Synesthesia** gives scene authors a set of audio variables that is unusually well thought out (official SSF Audio Uniforms page):
  - **Level** (`syn_Level`, `syn_BassLevel`, `syn_MidLevel`, `syn_MidHighLevel`, `syn_HighLevel`), "smoothed to reduce jitter".
  - **Hits** (`syn_Hits`, `syn_BassHits` …), "spiking in value during the isolated transients" and suited to drums.
  - **Time** (`syn_Time`, `syn_BassTime` …), clocks "that advance faster when a band is loud". `syn_CurvedTime` accelerates more sharply.
  - **Presence**, which tracks rising or falling activity "without reacting to each individual sound".
  - **Beat**: `syn_OnBeat` ("Returns 1.0 immediately when a beat is detected"), `syn_ToggleOnBeat`, `syn_RandomOnBeat`, `syn_BeatTime`.
  - **BPM**: `syn_BPM` (50–220), `syn_BPMConfidence`, `syn_BPMTwitcher`, and `syn_BPMSin`/`syn_BPMTri` at 1, 2, 4 and 8× rates.
  - **Large features**: `syn_FadeInOut` and `syn_Intensity`, which "builds toward 1.0 based on how intense the song is".

  The docs pair each family with a use: Hits for kicks, Time for "a camera that pushes forward on each kick", Presence for mood, OnBeat for flashes, and a check of `syn_BPMConfidence` before relying on tempo-locked motion.
- **TouchDesigner** has four parameter modes: Constant, Expression (Python), **Export** (CHOP channels drive the value; "think green for CHOPs!") and **Bind** (two-way). Channels can be mass-exported by naming them `opname:parname`. Custom parameters are exposed on a component's front panel through "Customize Component…" (Derivative docs).
- **Notch.** "Exposed Parameters allow external applications to control data in a Notch Block." "Once a property is exposed, the data it represents will be completely overwritten by the data from the Media Server." Exposed parameters have names, unique IDs, Min/Max, an optional read-only setting, a CSV export for the media-server operator, and an HTTP `/control` JSON manifest (Notch manual).

**Synthesis**

The VJ tools converge on a **per-target source picker**: every animatable property carries a small menu of drivers, and each driver has two or three shaping knobs (gain, fall, direction). Synesthesia's contribution is a **vocabulary of derived signals**. Most visual objects should not react to raw level. They want *hits* (events), *presence* (slow energy), *beat-locked waves* (groove) or a *speed-modulated clock* (motion that accelerates with the music). That list maps almost one-to-one onto the scene's "song properties."

Notch's rule that "once exposed, the external value overwrites" is a useful *ownership* rule: a linked property belongs to its link, and the scene shows that.

### 1.5 Lighting consoles: effect engines, phasers, speed masters, pixel maps

**Sources say**

- **grandMA3 phasers** are "the effects and chasers of grandMA3". Holding Step and tapping presets builds steps. Their layers are:
  - **Width** ("total amount of time from the beginning of a step to the beginning of the next step").
  - **Transition** ("how much of the step width is used to adjust values").
  - **Accel/Decel**, set to -100% for sine-like motion.
  - **Measure** ("number of beats in the repeating phaser loop").
  - **Phase** ("timing offset of each fixture's attributes", in degrees).
  - **Speed** (BPM, Hz or seconds per beat).
  - **SpeedMaster** assignment per attribute.

  With no speed assigned, a phaser runs at 60 BPM. "A phaser with a measure of 4 beats and a speed of 120 BPM will repeat every 2 seconds." Speed masters range 0–225 BPM, and Speed Scale applies multipliers. Master 16 is a **BPM master** "controlled by incoming audio" (grandMA3 manual 2.1–2.5).
- **MagicQ** lets a soft button "tap to set the speed of an FX". Audio can set BPM on a cue stack so chase speed follows audio peaks. Release 1.9.7 fixed "DJ BPM … not used … for Speed Masters, FX and Beat Step". Audio pixel effects need the MagicQ USB audio interface (ChamSys manual and change notes).
- **Busking vs timecode.** Timecode syncs "lighting cues to a timeline or track in advance" and "can run like clockwork", but breaks if the set changes. Busking means "controlling the light show live, in real-time". One LD keeps "two or three hours of material on my busking pages", and most sources recommend a hybrid (Ticket Fairy, Chauvet "Art of Busking", ETC blog, PLSN).

**Synthesis**

The lighting console has the closest model to a *group* of scene performers. Six lamps or a row of puddles are a fixture group. One effect with a **Phase spread** across the group gives a chase, and the chase follows a **speed master** that is tapped, set to a BPM, or slaved to audio. **Measure** in beats and **Width/Transition** within a step make "beat-locked motion" two numbers rather than a curve editor. Busking, which means pre-built *looks* on pages fired live, fits a "perform a control track" mode better than a free-form puppeteer would.

### 1.6 What makes routing understandable, and what overwhelms

**Sources say**

- Patch cables are praised for directness: "the patch does what it's patched to do" (CDM on VCV Rack). Reviewers also say modular UIs "can quickly turn into a complete visual mess", and users rely on a cable-tension slider, colour coding and MULTs to cope (Bedroom Producers Blog; Medium "Cabling conventions in VCV Rack"). One forum user said that without cables, "as in Bitwig's grid, I'm completely lost"; another argued "you could modulate everything with everything and … ports aren't needed" (VCV forum; community opinion).
- Users complain about invisible coupling. Ableton's Re-Enable Automation light "keeps lighting up" because of a stray MIDI mapping that was hard to find (Ableton help and forum).
- Synesthesia's docs pair every variable family with a *use*, which works as onboarding.

**Synthesis**

*What helps:*
1. Link by gesture from the target's own context, through a cogwheel (Resolume), a right-click "Use Data-Source" (VDMX), Map mode (Ableton) or a drag (Bitwig, Serum).
2. Always show that something is linked and what its value is now (Bitwig's coloured ring, TouchDesigner's green export).
3. Keep one place that lists every link (a matrix or mapping browser).
4. Offer a small set of semantic sources (Synesthesia) instead of raw FFT bins.
5. Give each link two or three shaping controls (min/max/invert, rise/fall).

*What overwhelms:*
1. Cables everywhere.
2. Links that change behaviour from elsewhere without a visible mark.
3. Unbounded chains, where a modulator modulates a modulator that is itself modulated.
4. Raw spectral data offered as the default source.
5. Mapping modes that disagree on value ranges (the takeover problem).

---

## Part 2. Recording control tracks by performance

### 2.1 Automation recording modes

**Sources say**

- **Logic Pro** modes:
  - **Read** plays automation back.
  - **Touch** writes while a control is held. "After the fader or knob is released, the parameter follows existing automation", with a return Ramp Time set in preferences.
  - **Latch** behaves like Touch but keeps the last value after release.
  - **Write** "erases existing automation … rarely used". The standard write modes are Touch and Latch.
  - **Trim** "offsets the value of the existing automation … by the amount you move the fader".

  (Apple Logic Pro help.)
- **Pro Tools** has Off, Read, Touch, Latch and Write, plus Touch/Latch and Trim in Ultimate. "The difference between Touch and Latch is what happens when you let go." "Latch is particularly useful for switched controls." AutoMatch time sets the glide back. Pro Tools Expert recommends setting "After Write Pass Switch To" to Latch or Touch to avoid accidental overwrites (Pro Tools Expert; Sound On Sound).
- **Ableton Live 12.** Automation Arm must be on. In Session View, "When using the mouse, recording stops immediately when you let go of the mouse button" (touch). With a MIDI controller, recording continues and will "punch out" at the loop end (latch). The first recording into a Session clip always latches. Moving an automated control while not recording overrides it: the LED turns grey and **Re-Enable Automation** lights. Draw Mode paints steps "as wide as the visible grid". Predefined **automation shapes** (sine, triangle, saw, square, ramps, ADSR) fit a time selection (Ableton manual, Automation).
- **Quantise and humanise.** Ableton's Record Quantization quantises notes as they are recorded. Its Quantize tool has an **Amount** that moves notes only partway to the grid. The **Groove Pool** applies timing and velocity templates, with a Global Amount of 0–130% (Ableton manual, Using Grooves). Sound On Sound lists "a random offset to each event (aka humanise)" as a Groove Pool feature.

**Synthesis**

For a tap or puppeteer recorder in the scene:
- **Touch** is the right default for continuous controls. A person holds the cat's paw and moves it, and when they let go it glides back to what was recorded or to the link's base value.
- **Latch** is the right default for switches: lamp on, sign lit.
- **Write**, which overwrites everything, should be rare.
- **Trim**, which shifts an existing curve by a delta, is the elegant edit for "same move, but bigger."

**Partial quantise**, with an amount control, beats a binary snap. Ableton's override-then-re-enable flow is the model for "I grabbed a linked performer by hand; now give it back to the song."

### 2.2 Puppeteering and animatronic programming

**Sources say**

- **Bottango** "works like 3D animation software". Keyframes sit on a timeline with curves in a graph editor. For live puppeteering, you open **Live Input Control Scheme**, pick a USB gamepad, assign axes to joints (in the Adafruit example, left stick X drives `lower_bracket_joint` and right stick Y drives `tilt_servo_joint`), and test with **Practice** before pressing record. When the take ends, "the capture is fit to sparse keypoints, which you can then edit in the graph editor" (Adafruit "Animating Animatronics"). Make calls it "live recording of puppeteering on a gamepad which automatically converts to editable keyframes". The Bottango manual has a "Recording Live Input into Animation" chapter.
- **Henson.** The "Waldo C. Graphic" (1988, Henson with Pacific Data Images) was "a custom 8 DOF hand-held input device". Henson's London Creature Shop has used the "Big1" control computer since about 1989, which won a 1992 technical Academy award. The later Henson Performance Control System ran on RTLinux. The Henson Digital Performance System has hand controls "still called a 'Waldo'", a control computer and a render workstation. Its authors say "Henson input devices are not motion-capture technologies" (befores & afters; HDPS wiki; Linux Journal; US patent 6377281).
- **Disney DACS** (1969) moved show data "from magnetic tape to computer disks". DACS Playback "simultaneously relays data and cues to speakers, lights, special effects and Audio-Animatronics figures", alongside the **Anicon** animation console. A show was compressed to "a single 2MB disk file for repetitive playback" (Wikipedia; Theme Park Tourist; US patent 3898438A; fan and secondary sources).
- **Chuck E. Cheese and ShowBiz.** "Two-track synchronized audio tapes, one for the sound and one for the data signals, controlled the characters", with "more than 200 movements happening at once". Programming "took approximately three hours of programming for every minute of animation" (IEEE Spectrum). Fan wikis describe a "SMPTE Synchronization Program" used for "offsetting the bits in a showtape to account for user error and reaction times" (Cheeseepedia; fan source). For the Rock-afire Explosion, a 2006 fan reprogram of one song took "a 24-hour nonstop no-sleep binge" (Spin).

**Synthesis**

The animatronic tradition has three properties the scene can borrow:
1. **Control tracks sit beside the audio on one timeline.** ShowBiz used a two-track tape; DACS played back audio, lights and figures from one clock.
2. **Recording is a performance in real time**, followed by cleanup into sparse keys (Bottango).
3. **Reaction-time offset is a known, named correction.** A person tapping along is late by a consistent amount, so the recorder should subtract a measured latency.

The "3 hours per minute" figure is the warning: per-channel hand programming does not scale. Links to song tracks and properties should do the bulk of the work, and recorded tracks should be the accent.

### 2.3 Rhythm-game charting editors

**Sources say**

- **osu!** snap divisors and their tick colours are 1/1 white, 1/2 red, 1/3 purple, 1/4 blue, 1/6 purple, 1/8 yellow, 1/12 and 1/16 grey (also 1/5, 1/7 and 1/9). "1/1, 1/2, and 1/4 are the most common." 1/3 and 1/6 are for triplet feels. "A rare divisor such as 1/5 or 1/16 is typically a sign of incorrect beatmap timing." Audio rate can be set to 25/50/75/100%. "Resnap Current Section" re-quantises existing objects to the current divisor (osu! wiki).
- **ArrowVortex** has "Find BPM" autosync, which returns one or more candidates ("sometimes it's two with one being 3/4ths of the other"), and the guide warns the offset is unreliable. A high-pass waveform overlay makes beats visible. The arrow keys change snap; "Hold down Shift then use the left/right arrow keys to adjust the speed." Notes are placed with number keys: "You cannot place notes with your mouse in this editor" (Over the Frail Dream guide).
- **Beat Saber's official editor** has a Beat Subdivision control, a playback **Speed** slider, and a waveform with a red playhead. A "Notes Tick … plays any time a note passes the play head", and Scale sets the beat spacing. The **BPM tool** aligns the grid by dragging beat markers onto waveform spikes, with region splits for tempo changes. "You can revisit the BPM tool after mapping has started, and your notes and lighting will update to match" (beatsaber.com docs).
- **Beat Saber's group lighting system** puts light events in **groups** containing **event boxes**, where boxes "override eachother, in order from top to bottom". **Index filters** select lights by section, step and offset, or reverse them. **Wave/step distribution** spreads timing across lights "so effects travel through the group". Brightness and rotation distributions make gradients. Strobe rates go down to 1/32 beat, and easings are None, Linear, InQuad, OutQuad and InOutQuad (beatsaber.com docs). Version 1.45.3 raised the official editor's light-event cap from 120 to 10,000 per map (Mixed News).

**Synthesis**

Charting tools all do four things:
1. Fix the **beat grid** first, with tap or autodetect plus manual drag.
2. Place events at a **snap divisor**, with 1/1, 1/2 and 1/4 as the defaults and triplets as a toggle.
3. Author at **reduced playback speed** with a **tick** on each placed event.
4. Allow **resnapping** later.

Beat Saber's group/filter/distribution system is the lighting-console phaser again, recast for authors who think in beats. It is a strong model for "the six lamps do a wave on every bar."

---

## Part 3. Getting per-instrument tracks from mixed audio

### 3.1 Source separation

**Sources say**

- **Demucs v4 (Hybrid Transformer, `htdemucs`)** is the default model. It was "trained on MusDB plus 800 songs" and separates four stems: **drums, bass, other, vocals**. It scores 9.00 dB SDR on MUSDB HQ, and a sparse fine-tuned variant reaches 9.20 dB. **`htdemucs_ft`** takes about "four times longer" and "might be a bit better". **`htdemucs_6s`** adds **guitar and piano**, but piano is "not working great at the moment". The maximum segment for transformer models is **7.8 s**. GPU use is "at least 3GB … about 7GB … with default settings". On CPU, processing takes "roughly 1.5 times the track's duration". Licences: "Demucs code is released under the MIT license", but "The license of the weights is not clear", and the 6-source model "was trained only on Meta's internal dataset", where CC-BY-NC likely applies. On maintenance, the author says: "I'm not actively working on Demucs anymore" (Demucs README).
- **Size.** A GGUF port lists about 42 M parameters, 81 MB at F16 and 53 MB at Q8_0. Single-file ONNX exports are around 316 MB (Hugging Face model cards, community).
- **In the browser:**
  - A WebGPU build (`monteslu/htdemucs-web-onnx`) uses mixed fp16/fp32 at "126MB total instead of 173MB", "~2.4x faster than fp32". It is split into **21 pieces** of "~10-30ms GPU submission" each, so the UI keeps "a steady 30fps through the entire separation". A monolithic session had "330ms freezes" and ran at 12–18 fps. Throughput is "~22x realtime run back-to-back, ~8x with compositor-friendly pacing" on a Radeon RX 7600.
  - A WASM-only build: "A 4-minute song takes roughly 3-5 minutes on a modern laptop" (dev.to, aralroca).
  - demucs-js: WebGPU gives "about 3x realtime", and without WebGPU it is "much, much slower".
  - The `demucs-onnx` package on an Apple M4 Pro CPU reports about 22 s per 3-minute song (RTF 0.20) for one specialist model.
- **Spleeter (Deezer)** has 2-stem (vocals/accompaniment), 4-stem (vocals/drums/bass/other) and 5-stem (+piano) models. It runs "100 times faster than real-time on a single GPU" with the 4-stem model (JOSS paper), but it is older and lower quality.
- **Open-Unmix (UMX-L)** is a three-layer BiLSTM per target with a Wiener filter. Its code is MIT, but the weights are "only licensed for non-commercial use (CC BY-NC-SA 4.0)" (PyPI, Zenodo).
- **BS-RoFormer and Mel-RoFormer** are the 2023–24 state of the art. Vocal SDR on MUSDB18HQ is BS-RoFormer 10.78–11.02 dB and Mel-RoFormer 11.21–11.60 dB. Sizes are BS-RoFormer 72.2–82.8 M parameters and Mel-RoFormer 84.2–94.8 M. BS-RoFormer with 500 extra songs reaches an 11.99 dB average (arXiv 2310.01809; 2409.04702).

### 3.2 Transcription, beats, chords, structure

**Sources say**

- **Spotify Basic Pitch** is "<20 MB peak memory and <17K parameters" and "able to run faster than real time on most modern computers". It is polyphonic and instrument-agnostic (Spotify Engineering). The TypeScript package `@spotify/basic-pitch` is Apache-2.0. It resamples to 22,050 Hz mono and returns frames, onsets and pitch contours, which `outputToNotesPoly` and `addPitchBendsToNoteEvents` convert to notes (basic-pitch-ts README). ONNX copies exist for onnxruntime-web (`daserge/basic-pitch-onnx`).
- **ADTOF** is a CRNN drum transcriber with five classes: **bass drum, snare, toms, hi-hat, crash/ride**. It was trained on 359 hours, and there is a PyTorch-only variant that loses about 0.2% F-measure. A 2025 paper notes it "struggle[s] with generalisation as MP3 encoding can negatively affect" results, and that pairing it with drum-stem separation helps (GitHub; arXiv 2509.24853).
- **Omnizart** covers multi-instrument (11 orchestral classes), drums, vocal melody, and chords with a Harmony Transformer over 25 classes. Its own README warns the drum model has "unknown bugs" in training (arXiv 2106.00497; GitHub).
- **Beat This!** (JKU Linz, ISMIR 2024) has about 20 M parameters (a small variant has about 2 M) and runs at 50 fps. GTZAN beat F1 is 89.1 and downbeat F1 is 78.3, without a DBN. The authors "argue that the DBN is a problematic component because it is inherently bound to fail for several music pieces" (arXiv 2407.21658). A WebGPU ONNX build is 190.6 MB in fp32 with MIT weights. It takes 30 s windows of 1500 × 128 log-mel frames; WASM is "roughly 12× the wall clock" of WebGPU. Its end-to-end parity with the Python CLI is a beat F-measure mean of 0.998. The card warns that a known Adreno WebGPU defect returned "silently wrong logits" before a static rewrite (Hugging Face `musetric/beat-this-onnx`).
- **madmom**: "source code files are published under the BSD license, while model and data files are distributed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 license" (madmom README).
- **BeatNet** (ISMIR 2021) is a causal CRNN with two particle filters, one for beats and one for downbeats and meter. Its online results are comparable to offline baselines (arXiv 2108.03576).
- **All-In-One** (Kim & Nam, 2023, `allin1`) predicts BPM, beats, downbeats, beat positions and **segments** with labels: start, end, intro, outro, break, bridge, inst, solo, verse, chorus. It works on demixed audio, was trained on the Harmonix Set with 8-fold cross-validation, and is MIT. It "processed 10 songs (33 minutes) in 73 seconds" on an RTX 4090, and needs PyTorch, madmom and NATTEN (GitHub mir-aidj/all-in-one).
- **Chords in the browser.** ChordMini ChordNet ONNX is about 2.3 M parameters and 17 MB, with **170 chord classes**, log-CQT input at 22,050 Hz, hop 2048, MIT. Sixteen 10-second windows take about 21 ms on an RTX 3060 laptop and about 98 ms on a Galaxy S24 Ultra over WebGPU. "The model is gain-sensitive" (Hugging Face `musetric/chordmini-onnx`). Essentia.js (WASM) exposes Essentia algorithms, including tonal and rhythm descriptors, and runs TF.js models for tagging (Essentia.js docs). The npm `chord-recognition` package is a rule-based chromagram port whose author says it is "not meant to be efficient".

### 3.3 Practicality for a 3-minute song on a laptop browser

**Synthesis**

| Task | Browser-feasible? | Evidence and estimate |
|---|---|---|
| 4-stem separation (htdemucs) | **Yes with WebGPU**, slow on WASM | About 8–22× realtime on a mid GPU, so roughly 10–25 s for 3 minutes. On WASM, roughly 2–4 minutes. 126–173 MB download. Weight licence unclear. |
| 6-stem (guitar/piano) | Yes (WebGPU builds exist) | Piano is weak per the author. Non-commercial licence likely. |
| SOTA vocals (RoFormer) | Server | 70–95 M parameters, no mature browser builds found. |
| Beat + downbeat | **Yes** | Beat This! on WebGPU (190 MB, MIT). A 2 M-parameter small model would be about 10× smaller if exported. |
| Chords | **Yes** | ChordMini, 17 MB, milliseconds per window. |
| Audio → MIDI notes per stem | **Yes** | Basic Pitch, under 17K parameters, faster than realtime. Run it on the bass and "other" stems. |
| Drum hits (kick/snare/hat) | Probably | ADTOF is small, but no browser build was found. A spectral-flux onset detector on the drum stem, banded into low/mid/high, is a cheap fallback. |
| Sections (verse/chorus) | Server, or a heuristic | All-In-One needs NATTEN and PyTorch. In the browser, use novelty on chroma and energy, or let the human mark sections. |
| Energy / intensity | **Yes, trivially** | RMS and onset density per stem, smoothed over bars. This is Synesthesia's Presence and Intensity. |

Analysis is offline and runs once per song. Its output is a **sidecar analysis file** (beats, downbeats, sections, chords, per-stem onset and energy envelopes, per-stem notes) that playback reads, so no model runs during performance. In sys0 terms this is a derived artifact of the song, cached and stored as the song's companion file, keyed by the audio hash.

---

## Part 4. Inter-performer relationships

### 4.1 Rock Band and Guitar Hero: animation driven by charts

**Sources say**

- **VENUE track.** The VENUE track "controls camera placement/effects and venue lighting/effects". It contains:
  - **Spotlights** on each player (RB3 notes 37–41: bass, drums, guitar, vocals, keys).
  - **Sing-alongs** (notes 85–87), where the guitarist, drummer or bassist sings with the vocalist for the note's duration.
  - **Camera cuts** (RB3: `[coop_g_closeup_hand]`, `[coop_bv_near]` …). They are "stacked on the same point" because only four members are on stage, and the game picks by priority and falls back to generic cuts.
  - **Directed cuts** ("placed at the animation's hit point"). `[do_optional_cut]` plays "only if the player is doing well".
  - **Lighting cues**. Keyframed cues (`verse`, `chorus`, `manual_cool`, `stomp`) are stepped through with `[first]`/`[next]`/`[prev]`. Automatic cues include `strobe_fast` ("every 32nd note"), `strobe_slow` (16th), `blackout_fast` (0.2 s), `searchlights`, `sweep`, `frenzy` and `silhouettes`.
  - **Post-processing** (`[film_16mm.pp]`, `[video_security.pp]` …), which changes only at camera cuts, with note length as transition time.
  - **Fog** on and off, and `[bonusfx]`.

  (GuitarGame_ChartFormats wiki, Venue.)
- **BEAT track.** Note 12 marks a strong beat (the downbeat) and note 13 a weak beat. It "drives character animations, lighting, the crowd, and how quickly Overdrive depletes" (wiki, Beat).
- **Drum animation notes** are separate from gameplay notes and record limb and dynamics: kick 24, hi-hat L/R 30/31, open hat 25, snare L/R hard 26/27 and soft 28/29, crash L/R hard and soft, chokes 40/41, ride 42/43, toms L/R 46–51. **Mood text events** are `[idle]` ("Character idles during a part with no notes"), `[idle_realtime]` ("not synced to the beat"), `[play]`, `[mellow]` and `[intense]` (wiki, Drums). Forum authors note that the animation notes usually match the expert chart rhythmically (Rhythm Gaming World).
- **Guitar and bass.** **Left-hand position** notes 40–59 give 20 fret positions. Hand maps (`HandMap_Default`: "Single notes use single fingers, sustains use vibrato, chords use multiple fingers"; `HandMap_NoChords`; `HandMap_Solo`) and strum maps (`StrumMap_Pick`, `StrumMap_SlapBass`) are switched by `[map …]` events. `[play_solo]` means "Character plays fast while showing off". Keys "animations are separate tracks" (wiki, Guitar).
- Community tools such as **venuegen** let authors "enter notes on a piano roll and this script will map the notes to the proper text events", removing "digging through a mess of text events … or misspelling names". RB-Tools splits the venue into lights, camera and post-processing tracks.
- **Guitar Hero.** Neversoft's note trackers "decide where to plot the notes, and they also assign animation commands for the onscreen characters and light shows … using commands to trigger animations created by Neversoft's animation department" (GH3 developer diary, via search summary).
- **Disney Research (2026)** synthesises full-body drummer motion from audio with a diffusion model. The authors argue that motion matching or MIDI-driven approaches "struggle with generalizing to diverse real-world audio", and they propose an impact-to-target distance and a Percussive Alignment Score (arXiv 2608.19055).

### 4.2 Ensembles that fill and rest: Wii Music, Fantasia, adaptive game music, Continuator

**Sources say**

- **Wii Music** splits each song into six parts: melody, harmony, chord, bass and two percussion. Unfilled parts are played by computer "Tute" characters, and players may remove instruments. In Jam/Improvise, "a backing band will try to match whatever motions and buttons you're using". Iwata Asks describes the design as "a basic rhythm and a melody built on simple chord progressions, with room to do whatever you want within that framework" (Wikipedia; Nintendo Iwata Asks).
- **Fantasia: Music Evolved** (Harmonix, 2014) lets players swap layers between song versions ("pairing a drum line from one song with an orchestral section") and unlock "composition spells", which lead designer Jonathan Mince described as "solo instruments for recording your own parts" (Fortune, Game Informer).
- **Adaptive game music.** **Vertical layering** is "layering of assets to add, subtract, replace, or alter the current musical material". **Horizontal resequencing** is "slicing music assets into short segments which can loop, branch, or transition". FMOD projects use an **intensity parameter** to pick sections and an area parameter to set the volume of each layer. Winifred Phillips's Sackboy score combined seven horizontal segments with a choir layer added and removed (Game Developer, GDC 2021; White Rose thesis).
- **The Continuator** (Pachet, Sony CSL, 2000–03) runs in a **question/answer mode**: it "detects phrase endings using a dynamical threshold and produces a continuation". One rule is that "user-generated music never overlaps system-generated music". A separate collaboration mode plays along continuously (Pachet, JNMR 2003; SIGGRAPH 2003).
- **Rive** gives designers state-machine **inputs** as a contract: booleans, numbers, and triggers ("a boolean set to true for one frame"). The editor now marks inputs as legacy in favour of data binding (Rive docs).

**Synthesis: relationships worth supporting**

From Rock Band, Wii Music, Fantasia, game music and the Continuator, the useful inter-performer relations are:

1. **Follow (mirror).** B copies A's control value with a delay, gain or invert. This is a modulator modulating a modulator, but restricted to one hop.
2. **Echo / response.** B plays A's events back after a fixed musical delay, such as one beat or one bar. Call and response is "follow with a delay of N beats, only during A's rests."
3. **Rest-when-busy (ducking).** B's activity is scaled by 1 − (A's activity). This is a sidechain, and the musical name for it is "the singer rests while the drummer fills."
4. **Take-over / solo focus.** When A is marked solo (Rock Band `[play_solo]`, spotlight notes), others drop to an idle or mellow state and A gets the spotlight. It is a scene-level state, not a per-performer link.
5. **Sing-along / join.** For a span, B joins A's track (Rock Band notes 85–87). It is a timed link override.
6. **Fill-in (Tute).** An unlinked or independent performer plays a default behaviour derived from song properties, as computer players do in Wii Music.
7. **Mood states.** `idle`, `play`, `mellow` and `intense`, from Rock Band, are a four-state intensity ladder per performer. They are driven by the section and energy and can be overridden per section.

Rock Band separates **what is played** (gameplay notes), **how the body plays it** (animation notes: limb, hard or soft), **how the performer feels** (mood events) and **what the stage does** (VENUE: lights, camera, post, spotlights, sing-alongs). The scene's model should keep those four layers apart too.

---

## Part 5. A model for "performer ↔ track" in a small browser app

This part is synthesis throughout. It distils the above into a concrete data and UI model.

### 5.1 Every performer has a few channels, and every channel has one link

A performer exposes a few named **channels**, which are its animatable properties:
- **Cat**: paw (0–1), head (−1..1), tail (0–1), ears (trigger).
- **Lamp**: brightness (0–1), hue (0–1), flicker (trigger).
- **Puddle**: ripple (trigger), shimmer (0–1).
- **Steam**: puff (trigger), density (0–1).
- **Bubbles**: emit (trigger), size (0–1).

Channels come in three types, following Rive's booleans, numbers and triggers:
- **value**: continuous, 0..1 or −1..1.
- **trigger**: events.
- **state**: a small enum such as idle, play, mellow or intense.

Each channel has exactly **one link**, which comes from one of five kinds and passes through one small shaper.

| Link kind | Sources (from Parts 1–4) | Output for value channels | Output for triggers |
|---|---|---|---|
| **Track** | MIDI track or audio stem | stem envelope (Rise/Fall), note pitch → value, velocity | note-ons, onsets in band |
| **Performer** | another performer's channel | follow (delay, gain, invert), duck | echo after N beats |
| **Song** | beat, bar, section, energy, chord | beat-wave (Sin/Tri ×1/2/4/8), bar ramp, presence, chord root → hue | beat, downbeat, section change, chord change |
| **Recorded** | a control track made by tapping or puppeteering | recorded curve | recorded taps |
| **None** | independent | idle loop at the performer's own rate | random at rate |

The **shaper** is the same for every link: **range** (min/max, with min > max meaning invert), **smooth** (rise/fall in ms, or in beats), and for song-wave links, **rate** in beats and **phase**. That covers Ableton's Min/Max/invert, the Envelope Follower's Rise/Fall, Resolume's Gain/Fall and grandMA's Measure/Phase in about four controls.

### 5.2 Three views, not ten

1. **The scene in link mode.** Press Link (like Ableton's MIDI Map). Every performer shows a small badge in the colour of its link kind. Click a performer, then click its source: a lane in the track strip, another performer, a song-property chip, or Record. This is Learn mode with the scene as the picker.
2. **The performer card** (Resolume's cogwheel). Its channels are listed, each with one source picker using Ableton's two-step type-then-item chooser, the shaper, and a live meter.
3. **The link table** (Serum's matrix). One row per link: performer · channel · kind · source · range · smooth. It is the audit view and answers "what is moving the lamp?"

### 5.3 Groups

Lamps, puddles and bubbles come in multiples. A **group link** gives the group one link plus a **spread**, in grandMA's Phase or Beat Saber's wave/step distribution: a beat offset or phase per member, with an order (left→right, random, reverse). "The lamps chase across the bar" is then one link with spread = 1 bar / 6.

---

## Part 6. Recommendations

1. **One link per channel, five kinds.** Track, Performer, Song, Recorded and None. Do not allow sums of several sources on one channel in v1; use one optional *depth-scaler* (point 9) instead. The matrix-overwhelm problem comes from many-to-many routes.
2. **Link by Learn mode in the scene itself.** Press Link, click the performer, click its source. Valid sources light up and invalid ones dim (Bitwig's shading, HALion's green overlay). Esc leaves the mode.
3. **Type-then-item source picker on the performer card.** Use Ableton's From chooser: first Track / Performer / Song / Recorded / None, then the specific stem, performer or property. Show at most about 8 items per step.
4. **Always show link state on the performer.** Draw a coloured badge per link kind and a thin live meter of the channel's current value, like Bitwig's ring and TouchDesigner's "green for CHOPs".
5. **A link table as the single audit view.** Each row is performer · channel · source · range · smooth, sortable and filterable by source. Deleting a row unlinks; clicking a row selects the performer in the scene.
6. **Ship semantic song signals, not FFT bins.** Use Synesthesia's families: **Hits** (per stem or band), **Level**, **Presence** (slow energy), **Beat** (OnBeat, Toggle, Random), **beat-waves** at ×1/2/4/8 and **speed clocks**. Name them in plain words ("kick hits", "bass energy", "every beat", "every bar").
7. **Four shaper controls, the same everywhere.** Range (min/max; swapping them inverts), Smooth (rise/fall), Rate (beats) and Phase. Hide rate and phase unless the source is periodic.
8. **Measure smoothing in beats as well as milliseconds.** "Fall over 1/2 beat" stays musical when the tempo changes. Resolume Fall and Ableton Rise/Fall are in time; a beat option is an improvement.
9. **One optional depth-scaler per link.** Bitwig's "source scales the connection" and Serum's Aux Source both do this. The common case is "the cat's paw follows the snare, *scaled by section energy*." It gives depth without a matrix.
10. **Follow links get delay, gain and invert, and nothing else.** Delay is in beats (0, 1/4, 1/2, 1, 2, 4) and is how call-and-response and echo happen. Forbid cycles. Allow chains, but show the chain on hover.
11. **Add "rest when busy" as a first-class relation.** It is a Performer link with *duck* mode: the target's activity × (1 − source activity), with its own rise and fall. Name it in the UI ("rests while the cat plays").
12. **Give every performer a four-state mood channel.** Use Rock Band's idle / play / mellow / intense. Default it to Song → section + energy. Let a section row override it ("chorus: intense"). Unlinked performers fall back to `idle_realtime`, an independent loop not synced to the beat.
13. **Keep stage events apart from performer channels.** Spotlight, solo focus and sing-along are scene-level **cues** on their own lane, as in Rock Band's VENUE track, and they override links for their duration. A "solo: cat" cue for 4 bars dims the others to mellow and spotlights the cat.
14. **Groups with spread.** One link drives N members, with a phase or beat offset and an order (left→right, outside-in, random), like grandMA's Phase and Beat Saber's wave distribution. This is how lamps chase and puddles ripple in sequence.
15. **Fix the beat grid before anything is authored.** Run beat and downbeat analysis on import (Beat This! on WebGPU). Then show a grid the person can correct by dragging one beat marker or tapping along, as in Beat Saber's BPM tool. When the grid changes, all beat-based links and recordings follow, as Beat Saber's notes and lighting do.
16. **Record with Touch by default, Latch for triggers and states, and Write only on request.** On release, the channel glides back to its link over a short ramp, as in Logic's Ramp Time and Pro Tools' AutoMatch. Add a Trim mode later ("same move, bigger").
17. **Record at reduced speed, with a count-in and a tick.** Offer 50% and 75% playback for authoring, as in osu!, ArrowVortex and Beat Saber, plus a one-bar count-in. Play a soft tick on recorded taps.
18. **Partial quantise plus latency compensation.** Snap taps to 1/4 by default, with 1/2, 1/8 and 1/3 (triplet) as choices and an **Amount** of 0–100% (Ableton). Before snapping, subtract the person's measured tap latency, which a calibration tap test sets once (ShowBiz's "offsetting the bits … for reaction times"). Keep the raw taps so the take can be re-quantised.
19. **Puppeteer, then thin.** Pointer drag, keys or a gamepad axis drive one channel live. After the take, fit the samples to sparse keys, as Bottango does, so the curve is editable and small. Store the dense take beside it only if the human asks to.
20. **Override and give back.** Grabbing a linked performer by hand overrides its link (Ableton's grey LED). A visible "back to song" control re-enables it, per performer or for all. Never silently reclaim a performer someone is holding.
21. **Recorded tracks are just another source.** A recorded control track appears in the Track list (as "Recorded · Paw take 3") and can be linked to *other* performers too. A tapped "steam puff" track can then also drive the bubbles.
22. **Analyse once on import, then play from a sidecar.** Separation (htdemucs on WebGPU in pieces, so the UI holds 30 fps), beats and downbeats, chords (ChordMini), notes per melodic stem (Basic Pitch), and per-stem onset and energy envelopes go into one analysis file keyed by the audio hash. Playback never runs a model. Show progress per stage, and allow the analysis to be skipped when MIDI is supplied.
23. **Stems: four by default, six optional, and say what each covers.** Name the default stems drums, bass, vocals and other (htdemucs). Offer guitar and piano with a "rough" label, because the author says piano is "not working great". Split the drum stem into kick/snare/hat by band onsets (low/mid/high). Use ADTOF-style class models only if a browser build exists.
24. **Licences.** Demucs weights have an "unclear" licence, and the 6-stem model is likely non-commercial. UMX-L and madmom models are CC BY-NC-SA. Beat This!, All-In-One and ChordMini are MIT, and Basic Pitch is Apache-2.0. Prefer the MIT and Apache models and record the licence of each model in the analysis file.
25. **Sections: detect, but let the human name and move them.** Section detection in the browser is weak (All-In-One needs a server stack). Propose boundaries from novelty in chroma and energy, snapped to downbeats, and make the section strip editable. Sections drive mood, per-section link overrides and cues.
26. **Default links on first import.** An "auto-band" pass gives every performer a plausible link: the cat to drums, the lamps to bass energy with a spread, steam to downbeats, bubbles to vocal onsets, the sign to the chord root as hue, the puddles to kick hits, the table to `idle_realtime`. This is the Tute principle: nothing stands still unless asked. The human then changes links one at a time instead of building from empty.
27. **Cap the visible complexity.** At most about 4 channels per performer, one depth-scaler per link, follow chains shown on hover, and no cables drawn by default. A temporary "show links" overlay can draw lines from performers to their sources while held.

---

## Sources

Routing, modulation and mapping
1. Ableton Live 12 manual — Routing and I/O. https://www.ableton.com/en/live-manual/12/routing-and-i-o
2. Ableton Live manual — MIDI and Key Remote Control. https://www.ableton.com/en/manual/midi-and-key-remote-control/
3. Ableton Live 12 manual — Max for Live Devices. https://www.ableton.com/en/live-manual/12/max-for-live-devices
4. Ableton Live 12 manual — Automation and Editing Envelopes. https://www.ableton.com/en/live-manual/12/automation-and-editing-envelopes/
5. Ableton manual — Using Grooves. https://www.ableton.com/en/live-manual/12/using-grooves/
6. Ableton help — Re-enable Automation keeps lighting up. https://help.ableton.com/hc/en-us/articles/209069409-Re-enable-Automation-keeps-lighting-up
7. Ableton forum — MIDI channel merging between tracks. https://forum.ableton.com/viewtopic.php?p=1766866
8. Bitwig user guide — The Unified Modulation System. https://www.bitwig.com/userguide/latest/the_unified_modulation_system/
9. Bitwig — Modulators ("A new class of devices"). https://www.bitwig.com/en/bitwig-studio/devices/modulators.html
10. Bitwig — Introduction to Modulators. https://www.bitwig.com/learnings/cross-modulation-76/
11. Bitwig user guide — Routing (Note Receiver). https://www.bitwig.com/userguide/latest/routing
12. Sound On Sound — Bitwig Studio 2 review. https://www.soundonsound.com/reviews/bitwig-studio-2
13. Cockos wiki — Routing Matrix. https://www.cockos.com/wiki/index.php/Routing_Matrix
14. Sound On Sound — REAPER Parameter Modulation. https://www.soundonsound.com/techniques/parameter-modulation
15. Cockos — ParamMod guide (PDF). https://user.cockos.com/%7Eglazfolk/ParamMod.pdf
16. Admiral Bumblebee — Keytrack any parameter in REAPER. https://www.admiralbumblebee.com/music/2017/08/06/keytrack-any-parameter-in-reaper-with-this-script
17. MusicRadar — Understanding Serum's modulation setup. https://www.musicradar.com/how-to/how-to-understand-xfer-records-serums-modulation-setup
18. Cymatics — 25 Serum tips. https://cymatics.fm/blogs/production/serum-tutorial-25-tips
19. Vital forum — Controlling LFO amount with a macro. https://forum.vital.audio/t/controlling-lfos-opacity-with-a-macro/7057
20. Steinberg HALion — drag-and-drop modulation. https://steinberg.help/padshop/v2/en/halion/topics/_shared/modulation_source_and_destination_combining_using_drag_and_drop_c.html
21. Ultra — Mod Matrix. https://ultra.audio/help/synth/matrix/matrix
22. Resolume — Parameter Animation. https://resolume.com/article/62
23. Resolume — 7.3.0 release (start settings for parameter animation). https://www.resolume.com/blog/20144/resolume-7-3-0-released-start-settings-for-parameter-animation-new-effects-amp-generators
24. Resolume — Dashboard. https://resolume.com/article/64 ; forum on speed linking https://resolume.com/forum/viewtopic.php?p=98735
25. VDMX — Overview of available data-sources. https://vdmx.vidvox.net/tutorials/overview-of-available-data-sources-in-vdmx
26. VDMX — Syncing a slider to a data-source. https://vdmx.vidvox.net/tutorials/syncing-a-slider-to-a-data-source
27. VDMX — Falling audio level with number FX chains. https://vdmx.vidvox.net/tutorials/creating-a-falling-audio-level-data-source-using-number-fx-chains-in-vdmx
28. Synesthesia — SSF Audio Uniforms. https://app.synesthesia.live/docs/ssf/audio_uniforms.html
29. TouchDesigner — Parameter. https://derivative.ca/UserGuide/Parameter ; Export https://docs.derivative.ca/Export ; Binding https://derivative.ca/UserGuide/Binding
30. Notch — Exposed Parameters. https://manual.notch.one/1.0/en/docs/workflows/working-with-media-servers/exposed-parameters/
31. grandMA3 — Phaser. https://help.malighting.com/grandMA3/2.1/HTML/phaser.html ; Speed masters https://help.malighting.com/grandMA3/2.4/HTML/masters_speed.html
32. ChamSys MagicQ change notes 1.9.7. https://docs.chamsys.co.uk/magicq-change-notes/stable/version1-9-7/v1.9.7-change-notes.html ; MagicQ manual https://www.manualsdir.com/manuals/760818/chamsys-magicq-user-manual.html
33. Ticket Fairy — Lighting for BPM festivals: timecode vs busking. https://www.ticketfairy.com/blog/lighting-for-bpm-festivals-timecode-vs-busking
34. Chauvet — How to master the art of busking. https://chauvetprofessional.com/tech-talk-how-to-master-the-art-of-busking/
35. ETC — Live concert busking with Eos. https://blog.etcconnect.com/2017/04/organized-improvisation-live-concert-busking-with-eos
36. VCV Rack reviews and cabling UX: CDM https://cdm.link/introduction-vcv-rack-free-open-modular-computer/ ; Medium https://medium.com/modular-synthesis/cabling-conventions-in-vcv-rack-a-user-interface-note-a13e7453d957 ; Bedroom Producers Blog https://bedroomproducersblog.com/?p=30885

Recording and authoring
37. Apple Logic Pro — Automation modes. https://help.apple.com/logicpro/mac/10.2.1/en.lproj/lgcpb1a6ab26.html
38. Pro Tools Expert — Pro Tools automation. https://www.pro-tools-expert.com/production-expert-1/pro-tools-automation-everything-you-need-to-know ; Sound On Sound https://www.soundonsound.com/techniques/pro-tools-automation
39. Adafruit — Animating Animatronics (Bottango). https://learn.adafruit.com/animating-animatronics
40. Make — Animatronic singing spooks (Bottango). https://makezine.com/projects/animatronic-singing-spooks-building-musical-ghosts-with-free-software
41. Bottango documentation PDF. https://s3.us-west-1.amazonaws.com/bottango.com/version+0.6.1/Documentation/BottangoDocumentation.pdf
42. befores & afters — Re-visiting Waldo. https://beforesandafters.com/2019/08/24/re-visiting-waldo/ ; Linux Journal — Controlling Creatures with Linux https://www.linuxjournal.com/node/6216 ; HDPS wiki https://hdps.fandom.com/wiki/Henson_Digital_Performance_Studio
43. Audio-Animatronics (Wikipedia, DACS). https://en.wikipedia.org/wiki/Audio-Animatronics ; Theme Park Tourist https://www.themeparktourist.com/features/20150702/30395/evolution-audio-animatronics-project-little-man-through-today?page=4
44. IEEE Spectrum — Chuck E. Cheese animatronics. https://spectrum.ieee.org/chuck-e-cheese-animatronics
45. Cheeseepedia — Animation Programming System. https://cheeseepedia.org/wiki/animation-programming-system ; Spin — Masters of Puppets https://www.spinmagazine.com/2008/10/masters-puppets-rock-afire-explosion-story/
46. osu! wiki — Beat snap divisor. https://osu.ppy.sh/wiki/en/Client/Beatmap_editor/Beat_snap_divisor ; Compose/Timelines https://osu.ppy.sh/wiki/en/Client/Beatmap_editor/Compose
47. ArrowVortex guide (Over the Frail Dream). https://overthefraildream.net/writings/arrowvortex-guide
48. Beat Saber docs — Editor interface. https://beatsaber.com/documentation/editor-interface/index.html ; BPM tool https://beatsaber.com/documentation/preparing-the-grid-alignment/index.html ; Group lighting https://beatsaber.com/documentation/the-group-lighting-event-system/index.html
49. Mixed News — Beat Saber editor 10,000 light events. https://mixed-news.com/en/?p=36797

Separation, transcription, analysis
50. Demucs README. https://raw.githubusercontent.com/adefossez/demucs/main/README.md
51. htdemucs for the browser (WebGPU, 21-piece). https://huggingface.co/monteslu/htdemucs-web-onnx
52. dev.to — Neural network in a browser tab to split a song. https://dev.to/aralroca/i-ran-a-neural-network-in-a-browser-tab-to-split-a-song-into-stems-10mk
53. demucs-js. https://github.com/bakkot/demucs-js ; demucs-onnx https://pypi.org/project/demucs-onnx/ ; HTDemucs GGUF https://huggingface.co/cstr/htdemucs-GGUF
54. Spleeter JOSS paper. https://joss.theoj.org/papers/10.21105/joss.02154.pdf
55. Open-Unmix. https://sigsep.github.io/open-unmix ; https://pypi.org/project/openunmix/
56. Mel-Band RoFormer. https://arxiv.org/abs/2310.01809 ; Mel-RoFormer vocals https://arxiv.org/abs/2409.04702
57. Spotify — Meet Basic Pitch. https://engineering.atspotify.com/meet-basic-pitch/ ; basic-pitch-ts https://github.com/spotify/basic-pitch-ts ; ONNX https://huggingface.co/daserge/basic-pitch-onnx
58. ADTOF. https://github.com/MZehren/ADTOF ; Drum stem separation for ADT https://arxiv.org/html/2509.24853v1
59. Omnizart. https://arxiv.org/abs/2106.00497
60. Beat This! paper. https://arxiv.org/abs/2407.21658 ; ONNX/WebGPU https://huggingface.co/musetric/beat-this-onnx
61. madmom (licence). https://github.com/pkmital/madmom
62. BeatNet. https://arxiv.org/abs/2108.03576
63. All-In-One music structure analyzer. https://github.com/mir-aidj/all-in-one ; arXiv https://arxiv.org/abs/2307.16425
64. ChordMini ONNX. https://huggingface.co/musetric/chordmini-onnx ; chord-recognition npm https://npmjs.com/package/chord-recognition
65. Essentia.js. https://mtg.github.io/essentia.js/docs

Ensembles, games, choreography
66. GuitarGame_ChartFormats — Rock Band VENUE. https://thenathannator.github.io/GuitarGame_ChartFormats/Implementation-Specific/Rock-Band/MIDI-Tracks/Venue
67. — BEAT track. https://thenathannator.github.io/GuitarGame_ChartFormats/Implementation-Specific/Rock-Band/MIDI-Tracks/Beat
68. — Drums. https://thenathannator.github.io/GuitarGame_ChartFormats/Implementation-Specific/Rock-Band/MIDI-Tracks/Drums
69. — Guitar. https://thenathannator.github.io/GuitarGame_ChartFormats/Implementation-Specific/Rock-Band/MIDI-Tracks/Guitar
70. venuegen. https://github.com/kueller/venuegen ; RB-Tools https://github.com/AddyMills/RB-Tools
71. Rhythm Gaming World — Percussion animation in the drum part. https://rhythmgamingworld.com/?p=397218
72. GameSpot — Guitar Hero III developer diary #1. https://www.gamespot.com/articles/guitar-hero-iii-developer-diary-1/1100-6177993
73. Disney Research — Audio-driven synthesis of precise drummer motion. https://arxiv.org/pdf/2608.19055
74. Wii Music (Wikipedia). https://en.wikipedia.org/wiki/Wii_Music ; Iwata Asks https://nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Wii-Music/Volume-1-The-Joy-Of-Playing-Music-For-All/3-The-Joy-of-Playing-Music/3-The-Joy-of-Playing-Music-237081.html
75. Fortune — Fantasia: Music Evolved. https://fortune.com/2014/10/27/disney-fantasia-music-evolved/ ; Game Informer https://gameinformer.com/games/fantasia_music_evolved/b/xboxone/archive/2014/10/20/harmonix-s-concept-album
76. Game Developer — Vertical layering (GDC 2021, Phillips). https://www.gamedeveloper.com/game-platforms/pure-vertical-layering-for-game-music-composers-from-spyder-to-sackboy-gdc-2021- ; Hybrid structure https://www.gamedeveloper.com/game-platforms/hybrid-horizontal-vertical-structure-for-game-music-composers-from-spyder-to-sackboy-gdc-2021-
77. White Rose thesis — Contemporary dynamic music techniques. https://etheses.whiterose.ac.uk/27365/1/Chapters/Chapter%203/Chapter%203.html
78. Pachet — The Continuator (JNMR 2003). https://www.francoispachet.fr/?p=4360 ; SIGGRAPH paper https://www.francoispachet.fr/wp-content/uploads/2021/01/pachet-03-siggraph.pdf
79. Rive — State machine inputs. https://rive.app/docs/editor/state-machine/inputs

Caveats on sourcing: Synesthesia, Bitwig, Ableton, Resolume, grandMA3, Beat Saber, Demucs, Beat This! and Rock Band chart formats come from official or primary documentation (the Rock Band wiki is community-maintained but is the standard reference). Serum and Vital details, the ShowBiz offset correction, and the user complaints about VCV Rack and Ableton come from forums, fan wikis and reviews. Browser timing numbers come from the model cards' own benchmarks on the named hardware and were not reproduced here.
