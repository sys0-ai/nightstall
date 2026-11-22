# Design craft for music-reactive visuals

Research brief for the rainy-night noodle-cart diorama (table, cat, steam, bubbles, lamps, puddles, sign). The reported problems are that it feels "behind the beat", is "not well-attuned", has mushy reactions, and its water ignores the bass. This report gathers what working visualists, lighting designers, animators, game developers and perception researchers say, then turns it into rules.

The report has five parts:

1. What practitioners say: VJ, concert-visual and lighting practice.
2. Why naive audio-reactivity looks bad and laggy, and the signal-processing practice that fixes it.
3. Perception: audiovisual synchrony numbers.
4. Motion design for reactive visuals.
5. Synthesis and rules (my own reasoning, marked as such).

Sections 1–4 report sources. Where I add interpretation inside them, it is marked **[Synthesis]**.

---

## 1. What practitioners say

### 1.1 The top shows are mostly *not* driven by live FFT

The big touring productions are usually cued: by timecode, by MIDI from the performer's rig, or by a human "busking" from prepared palettes. Raw audio analysis plays a smaller part than people expect.

- **Timecode, MIDI and on-the-fly.** DJ TechTools' survey of touring VJ rigs (Michael Fullman, 2015) names three methods. The first is MIDI/OSC from Ableton triggering clips in Resolume; Flume's Infinity Prism "was driven entirely by Flume's performance". The second is SMPTE timecode from the DJ's CDJs: Armin van Buuren, and Linkin Park, whose visuals the author ran. The third is on-the-fly operation following a rehearsed timeline, as in Kaskade's show. Timecode is "very unforgiving if you want to change or rearrange the set". On-the-fly is "absolutely … more difficult than either of the other styles".
- **Max Cooper.** "It all comes from MIDI going into Ableton and OSC coming out." He has "macros in Ableton which are set up to control visual parameters", and drum pads fire visuals. He can control lasers, lights, projectors and visual settings "just by looking at Ableton" (Ableton blog, *Speaking the Unspoken*). In the Resolume blog he warns that mapping data straight to music "invariably make[s] a non-musical mess". For one chapter of his show he chose "to minimize and simplify the visual form to its basics".
- **deadmau5 (Cube).** More than 800 OSC data tags run between him, front-of-house and the back of the stage. A TDAbleton bridge connects Ableton to TouchDesigner. He says "there are just some moments in a show that really need to be sequenced". He also wants video playback that can "stretch the playback rate of the video to fit a certain number of beats or bars" (Derivative interview). The visuals lock to the musical grid, not to an envelope follower.
- **Amon Tobin, ISAM (V Squared Labs / Leviathan).** A "Show Sequencing System" was "really the heart of the show". Much of the content was pre-rendered per track. Live real-time layers (Kinect point cloud, noise, scan lines) let the team "tune into the audio to create something tightly coordinated" (Derivative behind-the-scenes).
- **Moment Factory, Phish at Sphere (68 songs, 12 h, 16K).** Video cues were launched from a GrandMA lighting console "as a VJ would do with a MIDI board". Exposed parameters were played live: saturation, animation speed, particle emitters. The content was meant to act as a "fifth member" of the band while the musicians stayed the focal point. The team balanced intense moments with negative space so visuals and audience could "breathe" (SIGGRAPH blog, 2024).
- **GMUNK / Moment Factory, Billie Eilish 2024.** The content was pre-rendered and choreographed to the music, with light pulses "perfectly synchronized to the music". The stated ethos was restraint: one concept "whispered rather than shouted".
- **Lighting: busk versus timecode.** Bonobo's LD Will Thomas says "The show is busked." He gives each song ten faders "because I only have the standard ten fingers": bumps, intensity, colour, position, beams, chases, keys, blinders and video. He uses "one or maybe two colours per song" and starts simple, so that "as it builds more and more fixtures and looks are combined". His test of a good show: "If I was able to make it dark in the dark bits and light in the light bits then I know I've had a good show" (Chauvet interview). Ticket Fairy's festival guide describes the common hybrid: a timecoded base with manual overrides, or lasers on timecode while washes and blinders are busked.
- **Consumer automation does pre-analysis.** rekordbox Lighting mode needs *phrase analysis* (Intro / Up / Down / Chorus / Bridge / Verse / Outro). Its FAQ says that without it "you cannot perform lighting in sync with the tracks". SoundSwitch Autoloops run 8–128-bar loops locked to the DJ software's beatgrid. Its documentation stresses accurate beatgrids and says not to "assume automatic analysis is always correct".

**[Synthesis]** The professional default is to know the music's structure ahead of time (beats, bars, sections) and schedule visuals against a clock. Live analysis adds texture on top. "Everything driven by RMS in real time" is the beginner's architecture.

### 1.2 Where live analysis *is* used, it is split, routed and gated

- **Synnack and 0xf8 (Ableton interview).** "The kick drum, snare, and drum loop tracks send their amplitude as numerical values over OSC" and "ambient clips send just their high-end frequency information". The visualist keeps "a significant amount of manual control": "the audio data determines the timing and the speed of the effect parameter changes", while a human decides which effects respond and by how much. She also sets the input ranges.
- **Weirdcore (Aphex Twin).** "Some react to the bass, some the mids, others the highs" (Dazed). He says the reactive settings need constant re-tuning because the sets vary so much, and he calls the sync "hard". He works front-of-house "like an extension to [the lighting] desk" (It's Nice That).
- **Strangeloop (Flying Lotus).** He maps "music responsive geometries, sampled video clips, my own 3d graphics, all mapped to midi-controllers", so he can "play the visuals" like an instrument. "I try to keep it simple these days" (Resolume interview). In Layer 3, two operators each owned one scrim, building depth in foreground, mid-ground and background layers (CDM).
- **Bileam Tschepe (elekktronaut).** His Derivative workshop "Advanced Audio Reactivity" is pitched on keeping "creative control at all times". The point is to avoid mechanically flickering visuals that "become boring quickly".
- **A practitioner's retrospective (Olivia Ema).** "Simply making visuals respond to the whole song resulted in a chaotic mess." The fix was to tie each element to a specific band or detector and to decide per element what is "reactive, looped, or static". Getting that right "creates visual harmony".
- **Festival lighting (Ticket Fairy).** Avoid "randomly flashing lights on every drum beat". "Less is louder." Of 200 movers, perhaps 50 carry the base look and the rest are held for accents. Keep the static or dimmed look through a quiet intro, then fire the sweep "right as the bass drops". Before a drop, "cutting all lights for a split second of silence and then hitting a single dazzling flash on the drop" beats continuous effects. Program "breathers" and reset cues after heavy moments.

### 1.3 Artists on meaning, restraint and synchronisation

- **Ryoji Ikeda (FACT).** "For me, there's no separation on one level between sounds and visuals." On *data-verse*: "Everything is perfectly synchronised", and "The sound is not a slave in this work, but it's kind of a navigator of the visuals." On restraint: "If the sound is too rich with this kind of work, it's simply too much so I tried to be as minimal as possible." Ikeda's sync is at the level of *events*: hard cuts and flashes on transients, not wobble on loudness.
- **Max Cooper (Resolume blog).** He writes through an "emotive-optimization process": he holds an image in mind and refines the music until the feeling matches. Mapping is about emotion first, data second.
- **Robert Hodgin (Magnetosphere, which became the iTunes 8 visualizer).** He gave "each particle a specific frequency to pay attention to", and "this audio data can then influence the particles' charge and strength of the forces applied". The audio modulates *forces* in a physical system, and the system's dynamics produce the motion. Audio does not set position directly. The Eye magazine profile describes him as building a "machine that can surprise". He says: "I get bored looking at the ocean, but I'm fascinated when someone can model the ocean."
- **Jon Hopkins.** For "Collider" he imagined "industrial bulbs that went off completely in time with the riff": one strong, literal sync object per track (Creative Review). Dan Tombs runs the show live with "different visuals for every track" (Under the Radar).
- **Michel Chion (film theory).** *Synchresis* is the "spontaneous and irresistible weld" between a sound and an image that occur together. A *point of synchronization* is a salient moment where the two are matched, and its effect depends on how those points are placed: "predictably or not, variously or monotonously". Sync points read as meaningful *because* they are punctuation, not constant.
- **"Mickey Mousing".** The term comes from cartoon scoring that follows every motion. It is usually criticised as over-literal: a counterpart that "is unable to create any kind of counterpoint". Wikipedia notes it still works "if used imaginatively".

**[Synthesis]** The good shows share a hierarchy. A few elements are hard-locked to strong musical events. Most elements are physical systems that the music only *pushes*. Sections change the palette and the density. Silence and darkness are reserved so that the hits read.

---

## 2. Why naive reactivity looks bad and laggy, and what to do instead

### 2.1 The anatomy of lag in a typical web visualiser

**[Synthesis, with sourced constants]**

- **FFT window.** The Web Audio `AnalyserNode` defaults to `fftSize = 2048` (MDN). At 48 kHz that is a 42.7 ms window. An onset inside it is averaged with up to 40 ms of earlier signal, so the energy centroid of the window sits about 21 ms behind "now".
- **`smoothingTimeConstant` default 0.8.** MDN describes it as averaging with the last analysis frame, a first-order low-pass. If you read it once per animation frame at 60 fps, a step input reaches 90 % after ln(0.1)/ln(0.8) ≈ 10.3 reads, which is **about 170 ms**. That alone is past the ITU *acceptability* limit for picture-behind-sound (§3).
- **Extra smoothing on top.** Many scenes add their own lerp (`v += (target − v) * 0.1`). That is another time constant of roughly 160 ms at 60 fps.
- **Output latency.** `AudioContext.currentTime` is the time being *rendered*, not the time being *heard*. MDN documents `outputLatency`, the delay between handing a buffer to the OS and the device playing it. Wired output is typically a few to tens of ms, Bluetooth often 150–300 ms (MDN context; measure on the device). The Rhythm Quest devlog: "usually, audio latency is the largest of the three latencies."
- **Symmetric smoothing destroys attacks.** One filter constant for both rise and fall makes hits mushy, because the attack is slowed as much as the decay.
- **RMS of the full mix.** A kick, a sustained 808 sub, a pad swell and a vocal all raise broadband RMS. The response is therefore a blur of everything, and it peaks *late*, at the energy maximum rather than the onset.

Stacked, these give roughly 150–300 ms from transient to visual peak. That matches "behind the beat" exactly.

### 2.2 What the tools of the trade expose (and why)

- **Separate up and down lag (TouchDesigner Lag CHOP).** It has separate `lag1` (rising) and `lag2` (falling) values, each roughly the time to reach 90 % of a change, plus *overshoot* up and down and slope clamps. A short rise with a long fall gives a quick attack and slow release. A community recipe: "Higher (0.2) = smooth, liquid transitions; Lower (0.01) = sharp, snappy response to beats." Another suggests 0.05 s lag for organic movement.
- **Asymmetric envelopes as a named feature.** The Audio Analysis 2.0 TouchDesigner components ship an "Asymmetric Lag: fast attack for impact, slower decay for visual flow". They split kick and snare triggers into 4th, 8th and 16th counts. They add an "Express" mode that holds a value for a full beat, and "Jumper" and "Zig_Zagger" modes that step a parameter to a new value on each trigger rather than following amplitude.
- **TouchDesigner audioAnalysis palette.** It outputs low, mid and high (each with smooth, gain and threshold), spectral centroid, slow- and fast-moving partial densities, and kick, snare and rhythm detectors with thresholds. A tutorial notes that kick and snare give clean 1/0 pulses, "great for hard on and off switching, but if you want something more fluid … the kick and snare alone will not get you there". Another: "if your reactivity is … jittery or uncontrolled, raising the threshold will calm it down and give you more intentional hits."
- **Envelope CHOP.** It outputs the maximum amplitude near each sample, by exponential decay or a local-max window (Derivative docs). That is a peak follower, not an RMS average.
- **Resolume FFT.** Each parameter gets its own *Gain* and *Fall*. Fall "determines how fast the value drops back after a peak". Resolume deliberately exposes only the release; the attack is immediate.
- **MilkDrop / projectM: auto-gain by history.** `bass = instant / (1.5 × rolling mean of the last 80 frames)`. Each band is normalised against its own recent average, so the values mean "louder than usual for this song" rather than an absolute level. The smoothed `_att` variants use `0.6·prev + 0.4·new` per frame, which reaches 90 % in about 4.5 frames (≈75 ms at 60 fps). Preset authors pick the fast or slow variant per parameter. Ryan Geiss's original Geiss plug-in swapped its warp map only on "a good beat", so structural changes land on beats.
- **Unreal Audio Synesthesia.** Its *non-real-time* analysers (Loudness, Constant-Q, Onset with timestamps and strength) run in the editor. "During gameplay, the results of the analysis are read from a file." The engine's answer to "reactive but on time" is pre-analysis.
- **Onset detection literature.** Bello et al. (2005), *A Tutorial on Onset Detection in Music Signals*, says energy-based detectors suit percussive material. Spectral-flux-type features (rectified frame-to-frame increases in spectral magnitude) are the standard better detector. Böck, Krebs and Schedl (ISMIR 2012) evaluate *online* onset detectors and propose a spectral-flux detector with peak-picking for real time. Real-time onset work targets latency "generally less than 10 ms". One system reports two buffer sizes (≈23 ms at 44.1 kHz) total.
- **After Effects practitioners.** "Convert Audio to Keyframes" output is jittery and needs `smooth()`. They put beat markers by hand (tap `*` while previewing) and snap keyframes to them. They also warn that MP3 encoder padding shifts sync. Hand-placed markers beat automatic amplitude for anything that must land.

### 2.3 Pre-programmed versus live

- Timecode gives precision and repeatability. Busking gives flexibility. The hybrid is the norm (Ticket Fairy; DJ TechTools; Chauvet interviews with Steve Lieberman, who has "programmed thousands of hours of timecode", and with Will Thomas).
- Weirdcore tunes visuals per country and track, and Moment Factory gives each song its own pipeline. The pros treat *per-song tuning* as normal.

**[Synthesis]** A diorama that plays known tracks can do what Unreal, rekordbox and SoundSwitch do. Analyse each track once: beat grid, downbeats, onsets per band with strength, sections and energy curve. Store the result as a cue sheet, then schedule against the audio clock. Live analysis then only supplies continuous texture.

---

## 3. Perception: the synchrony numbers

### 3.1 Broadcast lip-sync tolerances (ITU-R BT.1359-1, 1998)

Sign convention: + means sound *before* picture (picture late), − means sound *after* picture (picture early). Source: TV Technology's summary of the Recommendation.

| Measure | Sound leads (picture late) | Sound lags (picture early) |
|---|---|---|
| Detectability threshold | **+45 ms** | **−125 ms** |
| Acceptability threshold | **+90 ms** | **−185 ms** |
| Bell Labs, 1940s (detectability) | +35 ms | −100 ms |
| Film rule (24 fps) | 1 frame (≈42 ms) | 2 frames (≈84 ms) |
| ATSC encoder-input tolerance | +15 ms | −45 ms |

The asymmetry runs one way. People are about **3× more tolerant of the picture arriving early than late**. Picture late by more than ~45 ms is detectable, and by ~90 ms it is objectionable.

### 3.2 Laboratory work on rhythm and music

- **Arrighi, Alais & Burr (2006, *J. Vision*), conga drumming video.** For perceived simultaneity, "the auditory stream needs to be delayed". The best delay ran from about **100 ms at 1 Hz to about 30 ms at 4 Hz** drumming rate. Disks with the drummer's motion profile gave nearly the same result. With natural rhythmic motion, the most synchronous-feeling alignment has the visual event slightly *ahead* of the sound.
- **Cecere, Gross & Thut (2016).** The binding window is "typically 200–250 ms for VA [visual-leading] pairs and 100–150 ms for AV [audio-leading] pairs". Audiovisual pairs "tend to be judged more synchronous when the visual stimulus leads". The suggested reason is physical: light outruns sound, so visual-first pairs are what the brain usually meets.
- **Petrini et al. (2009), cited in a 2015 study.** The integration window for drumming is **≈200 ms at 60 bpm and ≈150 ms at 120 bpm**. Drummers detect asynchrony better than novices, especially at slow tempos. Faster music needs tighter sync.
- **The same 2015 study (PMC4451240).** Across speech, drums and chess, the window (FWHM) averaged 432 ms for 1 s clips and 317 ms for 13 s clips. Individual PSS values ranged from about 100 ms audio lead to about 250 ms audio lag.
- **Fujisaki & Nishida (2005, *Exp. Brain Res.*).** Synchrony versus asynchrony discrimination for *repetitive* audio-visual pulse trains falls to chance **above ~4 Hz**, even at lags that were easy to detect with single pulses. Synchrony is judged by matching "salient temporal features" that each sense individuates. Arrighi et al. confirmed the limit.
- **Fujisaki et al. (2004, *Nature Neuroscience*), recalibration.** After exposure to a constant lag, the point of subjective simultaneity shifts toward it. A *constant* small offset is partly absorbed; a jittery one is not. **[Synthesis]** Variable latency (frame drops, varying analysis delay) is worse than a fixed one.
- **Physics and neural latency.** Neural processing is slower for vision than for audition. At roughly 10–15 m from the observer, sound and light arrive at the primary cortices at about the same time (*The Neural Bases of Multisensory Processes*, NCBI chapter). Sound travels at about 2.9 ms per metre. A McGill study found that the brain schedules visual "time slots" slightly later than auditory ones, and that this adapts to recent exposure.
- **Temporal ventriloquism (Morein-Zamir, Soto-Faraco & Kingstone, 2003; Vroomen & de Gelder).** An abrupt sound pulls the perceived onset of a slightly asynchronous flash toward itself. A crisp visual onset that is *near* the beat gets captured by the beat. A smeared ramp has no onset to capture.
- **The P-center.** The perceived moment of a sound lies "somewhere between the perceptual onset and the energy peak". Longer rise times push it later (Vos & Rasch 1981; Vos, Mates & Kruysbergen 1995). **[Synthesis]** The beat a listener feels is at the attack, not at the RMS maximum, which can be tens of ms later for a bass note.
- **Interactive "instant".** Nielsen's 0.1 s limit is the point at which a response feels directly caused. Rhythm-game work cites just-noticeable audio-latency differences of about 27–49 ms (Schmid et al., 2024, secondhand). Rhythm Quest keeps calibration to a few taps because "the human eye is very keen at determining slight differences in timing". Later versions step the audio offset in 25 ms increments.

### 3.3 What this means in numbers

**[Synthesis]**

- **Target.** The *peak frame* of a hit should sit between **one frame (17 ms) early and 20 ms late** relative to the audible transient. Never more than ~40 ms late. Being 10–40 ms *early* is safe and often feels tighter (Arrighi; Cecere; animators below).
- **Budget.** At 60 fps one frame is 16.7 ms. A 45 ms detectability budget is under three frames. Any reactive path with a ≥100 ms smoother is already outside acceptability.
- **4 Hz ceiling.** Discrete flashes on events faster than ~4 Hz (16th hats at any tempo, 8ths above 120 bpm) cannot be *perceived* as in or out of sync. Map those to continuous texture (shimmer, rain density, grain) instead of discrete events. Spend precise sync on quarter-note-and-slower events: kick, snare, downbeats, section changes.

---

## 4. Motion design for reactive elements

### 4.1 Animators lead the sound

- **Lip sync rule of thumb.** Mouth shapes go **about two frames before** the sound. Escape Studios Animation blog: "lip sync should sit just slightly ahead of the audio", and for a heavily emphasised syllable "six to eight frames ahead". The Animation Apprentice blog gives the reason, the delay between a mouth shape and the sound it releases. Pluralsight: offset the jaw "one to two frames before". AWN (*Inspired 3D*): "at least two frames before the sound is heard."
- **Disney principles (Thomas & Johnston, *The Illusion of Life*, Wikipedia).** *Anticipation* prepares the viewer for an action. *Slow in / slow out* puts more frames near the start and end of a move. *Timing* sets speed by frame count. *Follow-through and overlapping action* keep parts moving after the main body stops. *Squash and stretch* conveys weight and elasticity while keeping volume.

**[Synthesis]** The beat is the *contact* frame. Anticipation (wind-up, squash, a held breath) happens *before* it. Overshoot, follow-through and settle happen *after* it. A real-time follower can only do the "after". Anticipation needs foreknowledge: pre-analysis, a beat grid, or delaying the audio.

### 4.2 Game-feel practice on impacts

- **Vlambeer, "The Art of Screenshake" (Jan Willem Nijman, 2013).** A plain shooter is made to feel good through about 30 small feedback layers: shake, hit-stop, kick-back and so on. Without them it looked like a student project (Game Developer write-up).
- **Hit-stop.** A guide puts it at **2–5 frames**, and says even 2 frames adds weight (secondhand blog). Shake amplitude should scale with force; "a tiny graze hit with a massive screen-filling shake feels absurd".
- **"Juice it or lose it" (Jonasson & Purho).** Juice is "maximum output for minimum input". Swapping teleports for elastic or overshooting tweens is the single biggest upgrade in that talk.

### 4.3 Envelopes, easing and tempo-relative decay

**[Synthesis]** These come from the sources above and from basic envelope practice. Logic's Env Follower and the Kurzweil follower both expose separate attack and release.

- **Impacts.** Use an instant or one-frame attack straight to peak (no ease-in), then a fast ease-out, exponential or critically-damped spring. Add an optional overshoot of 5–15 %, a spring with a damping ratio of about 0.5–0.7.
- **Swells (pads, builds, filter sweeps).** Use a slow, symmetric ease-in-out over bars. These follow the energy curve or section, not transients.
- **Release tied to tempo.** Express decays as fractions of a beat, for example `release = 0.35 × (60 / bpm)` s. At 120 bpm a beat is 500 ms, so a kick flash decays in about 150–250 ms and is gone before the next kick. Snare decays can run ⅓–½ beat. A lamp's afterglow can run 1 beat. Steam puffs can run 2 beats. With beat-relative values the scene "breathes" at the song's tempo and never smears hits together.
- **Visual sidechain or ducking.** Sidechain pumping lowers a sustained signal on each kick, and its release sets the audible "pump" (MusicRadar; Sweetwater). The visual equivalent: on the kick, dip ambient glow, rain brightness or sign hum by 10–30 %, then let it recover over about ¾ of a beat. The dip makes the hit read as *contrast* rather than more brightness. It also matches how dance music actually sounds, since the pads duck under the kick.
- **Squash and stretch on contact.** Bubbles, the cat's ear-flick and the lantern sway can squash on the beat frame and stretch on rebound, keeping volume constant. Pixel art cannot interpolate sub-pixel, so use held key poses: the contact pose for 1–2 frames, then the rebound pose. Hold frames read as snap; tweening reads as mush.

---

## 5. Synthesis: diagnosis of the diorama's symptoms

**"Behind the beat"**
- Almost certainly the stacked analysis latency in §2.1: FFT window, the 0.8 default smoothing, extra lerps, and possibly unaccounted `outputLatency`.
- All of these sit on the *late* side, the side people tolerate least.
- The fix is to remove symmetric smoothing on hit paths. Better still, schedule hits from pre-analysis against `audioContext.currentTime − outputLatency`, or delay audio output by a fixed look-ahead so the analyser sees the future.

**"Not well-attuned" or mushy**
- Every element listens to similar broadband energy, so everything moves together and nothing is a sync point.
- The fix has three parts:
  - Give each element its own feature and envelope.
  - Reserve hard sync for two or three elements.
  - Normalise each feature against its own history (MilkDrop's `instant / avg`), so quiet and loud songs both react.

**Water ignores bass**
- Sub-bass is often sustained (808 tails, sidechained subs), so the *level* in a low bin barely changes and gives no onset.
- Long FFT windows and heavy smoothing flatten it further.
- Water is an impulse-response medium, so drive it from *onsets* in the 40–120 Hz band: rectified spectral flux, or the kick detector. Each onset injects an impulse (a ripple ring, a puddle displacement) scaled by onset strength.
- Let the wave physics do the decay, as Hodgin let forces drive particles.
- Separately, the slow bass *energy* can raise ripple amplitude or rain-splash scale over bars, but never as the hit.

---

## 6. Rules for a music-reactive scene

1. **Put the peak frame on the beat, or up to one frame before it.** The window is −17 ms to +20 ms relative to the audible transient. Treat +45 ms late as a bug (ITU detectability) and +90 ms as broken (ITU acceptability).
2. **Measure and subtract output latency.** Use `currentTime − (baseLatency + outputLatency)`, or `getOutputTimestamp()`, for the audible time. Offer a one-time tap calibration of a few taps in 5–10 ms steps, as rhythm games do.
3. **Prefer pre-analysis for known tracks.** Precompute the beat grid, downbeats, per-band onsets with strength, sections and the energy curve, and schedule cues against the audio clock (Unreal Synesthesia NRT, rekordbox phrases, SoundSwitch grids).
4. **If analysing live, look ahead.** Delay the audio output by a fixed 30–60 ms while the analyser reads the undelayed signal. The visuals then lead slightly, which is the tolerated direction.
5. **Never use symmetric smoothing on a hit.** Attack ≤ 1 frame and release long. Set `AnalyserNode.smoothingTimeConstant` to 0 (or about 0.3) and do your own asymmetric envelopes.
6. **Use onsets for hits and levels for moods.** Kicks, snares and accents come from rectified spectral flux in a band, with an adaptive threshold. Swells, colour and density come from slow loudness or section.
7. **Normalise each feature against its own history.** Use `value / rolling mean` over about 1–2 s (MilkDrop's 80-frame mean with a 1.5 divisor), plus a noise gate. This is auto-gain per band, so every song "fills" the range.
8. **Give each element exactly one listener.** Choose one feature and one envelope per element, written down in a mapping table. No element listens to full-mix RMS.
9. **Rank the elements.** Two or three *hero* elements are hard-locked to kick, snare and downbeat; here, the lamps, the puddle impulse and the sign. Four or five *physical* elements are only pushed by the music: steam, bubbles, rain, cat. The rest are ambient and slow.
10. **Express decays in beats, not milliseconds.** Kick flash about ⅓ beat, snare ½ beat, lamp afterglow 1 beat, steam puff 2 beats, section crossfade 1–2 bars.
11. **Spend precise sync only on events slower than ~4 Hz.** Hats and 16ths become continuous texture (rain shimmer, bubble fizz), never discrete flashes. Their sync can't be perceived (Fujisaki & Nishida).
12. **Drive water with impulses.** On each low-band onset, inject a ripple scaled by onset strength and let the wave equation decay it. Bass *energy* can slowly scale ripple amplitude, but it is never the trigger.
13. **Duck on the kick.** Briefly dip rain brightness, ambient bloom or the sign's hum by 10–30 % and recover over about ¾ beat. Contrast reads louder than extra brightness.
14. **Reserve darkness and stillness.** Keep a calm base look, hold back elements in quiet sections, and spend them on the build and drop. "Less is louder" (Ticket Fairy). "Dark in the dark bits" (Will Thomas).
15. **Build anticipation before drops.** Pre-analysis can find the drop, so pull energy out over the last 1–2 bars, hold a near-still frame on the last beat, then fire everything on the downbeat.
16. **Change structure only on beats or downbeats.** Palette shifts, lamp colour changes and camera moves are quantised to the grid, as Geiss swapped warp maps only on a good beat.
17. **Limit the palette per section.** "One or maybe two colours per song" (Will Thomas). Switch the palette on section boundaries, not continuously.
18. **Use a held contact pose for pixel-art impacts.** Show the squash or contact key for 1–2 frames, then the rebound key, then settle. Tweened sub-pixel ramps read as mush. A 2–5-frame "hit-stop" on big accents adds weight.
19. **Add overshoot and follow-through after the hit.** Use a critically-damped or slightly underdamped spring (5–15 % overshoot) for lamp sway, sign flicker recovery and the cat's ear or tail. Secondary motion lags the primary by 2–4 frames.
20. **Anticipate only what you know is coming.** Wind-ups (the cat crouching, steam gathering, lamp dimming) need foreknowledge from the beat grid or pre-analysis. Never fake anticipation from a live follower.
21. **Make onsets crisp.** A step change in brightness or a pose on one frame is captured by the beat (temporal ventriloquism). Slow ramps have no onset to capture and always read as late.
22. **Keep latency constant.** A stable frame rate and fixed analysis hop matter more than raw speed, because the brain recalibrates to a constant offset but not to jitter (Fujisaki et al. 2004).
23. **Map size and brightness to loudness, and height and smallness to pitch.** Use crossmodal correspondences (Spence 2011) for intuitive mappings: higher-pitched content drives smaller, higher, brighter elements (bubbles, sparks); bass drives large, low, heavy ones (puddles, table, steam volume).
24. **Let physics do the motion.** Audio modulates forces, charges and spawn rates (Hodgin's Magnetosphere), not positions. The motion stays continuous and organic even when the input is spiky.
25. **Respect the song's sections.** Intro, verse, build, drop and breakdown each get a defined density level: how many elements are awake and how strongly they react. Sections are where the "conversation" happens, not individual frames (Moment Factory's modular show-flow; rekordbox phrase scenes).
26. **Keep a human-authored layer.** Per-song or per-genre presets of gains, thresholds and hero assignments reflect pro practice (Weirdcore re-tunes per set; Synnack and 0xf8 set input ranges by hand). Expose a small cue sheet per track if tracks are known.
27. **Avoid total Mickey-Mousing.** Not every sound gets a visual. Leave counterpoint, such as the cat ignoring the beat until a downbeat, so the sync points that remain feel meaningful (Chion).
28. **Test on the target output.** Bluetooth headphones can add 150–300 ms. Detect or let the user calibrate, and never assume zero output latency.
29. **Verify with a metronome and a flash.** Render a frame counter and a click track, and record the screen with the audio. Check offline that the peak frame lands within one frame of the transient. "The human eye is very keen" (Rhythm Quest).
30. **Tune at slow tempos too.** Windows are wider at 60 bpm but experts are more sensitive there (Petrini). Check both a 70 bpm lo-fi track and a 128 bpm house track.

---

## Sources

**Perception and synchrony**
- ITU-R BT.1359-1 (1998), *Relative timing of sound and vision for broadcasting*: https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf
- TV Technology, "A/V synchronization: how bad is bad?": https://www.tvtechnology.com/opinions/av-synchronization-how-bad-is-bad
- Cecere, Gross & Thut (2016), *Behavioural evidence for separate mechanisms of audiovisual temporal binding as a function of leading sensory modality*: https://pmc.ncbi.nlm.nih.gov/articles/PMC4915493
- Audiovisual asynchrony for speech, drums and chess (2015): https://pmc.ncbi.nlm.nih.gov/articles/PMC4451240
- Arrighi, Alais & Burr (2006), *Perceptual synchrony of audiovisual streams for natural and artificial motion sequences*: https://flore.unifi.it/handle/2158/250649
- Petrini et al. (2009), *Multisensory integration of drumming actions*: https://vbn.aau.dk/ws/files/65338241/PetriniDahlRocchessoWaadelandAvanziniPucePollick09_ExpBrRes.pdf
- Fujisaki & Nishida (2005), *Temporal frequency characteristics of synchrony–asynchrony discrimination*: https://link.springer.com/doi/10.1007/s00221-005-2385-8
- Fujisaki et al. (2004), *Recalibration of audiovisual simultaneity*: https://neuro.caltech.edu/publications/fujisaki-2004/
- Temporal ventriloquism and flash-lag (Vroomen & de Gelder; Morein-Zamir et al.): https://pmc.ncbi.nlm.nih.gov/articles/PMC3144727
- P-center and rise time: https://pmc.ncbi.nlm.nih.gov/articles/PMC3313478 and https://link.springer.com/content/pdf/10.3758/s13414-019-01747-y.pdf
- *The Neural Bases of Multisensory Processes*, chapter on timing: https://www.ncbi.nlm.nih.gov/books/NBK92837/
- Spence (2011), *Crossmodal correspondences: A tutorial review*: https://www.doi.org/10.3758/S13414-010-0073-7
- Nielsen, response time limits: https://www.nngroup.com/articles/response-times-3-important-limits/
- Rhythm Quest devlog 10, latency calibration: https://rhythmquestgame.com/devlog/10.html
- Rhythm Quest v0.39 calibration notes: https://ddrkirbyisq.itch.io/rhythm-quest/devlog/1087168/demo-v0390-released

**Signal processing and tools**
- MDN, `AnalyserNode.smoothingTimeConstant`: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/smoothingTimeConstant
- MDN, `AnalyserNode.fftSize`: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize
- MDN, `AudioContext.outputLatency`: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency
- projectM `BeatDetect.cpp` (MilkDrop-style beat values): https://sources.debian.org/src/libprojectm/1.2.0-1/BeatDetect.cpp/
- Ryan Geiss, "How Geiss worked": https://geisswerks.com/geiss/secrets.html
- TouchDesigner Lag CHOP: https://docs.derivative.ca/Lag_CHOP
- TouchDesigner Envelope CHOP: https://docs.derivative.ca/Envelope_CHOP
- TouchDesigner audioAnalysis palette: https://derivative.ca/UserGuide/Palette:audioAnalysis
- Audio Analysis 2.0 extended components: https://derivative.ca/community-post/asset/audio-analysis-20-extended-audio-reactive-components/73946
- Beat detection tutorial (Tschepe): https://derivative.ca/community-post/tutorial/beat-detection/62551
- Bileam Tschepe, Advanced Audio Reactivity workshop: https://derivative.ca/workshop/bileam-tschepe-%E2%80%93-advanced-audio-reactivity-ss23-%E2%80%93-14/67509
- TouchDesigner audio reactivity recipe (lag values): https://yuazi.github.io/_y_usagewiki/touchdesigner/05_Connectivity_and_Shaders/Audio-Reactivity
- Resolume parameter animation (Gain/Fall): https://resolume.com/support/en/6/parameter-animation
- Unreal Audio Synesthesia: https://dev.epicgames.com/documentation/en-us/unreal-engine/audio-synesthesia-in-unreal-engine
- Bello et al. (2005), *A Tutorial on Onset Detection in Music Signals*: https://www.cs.bu.edu/fac/snyder/cs583/Literature%20and%20Resources/bello_onset_tutorial.pdf
- Böck, Krebs & Schedl (2012), *Evaluating the online capabilities of onset detection methods*: https://archives.ismir.net/ismir2012/paper/000049.pdf
- Adobe Community, syncing beats in After Effects: https://community.adobe.com/questions-529/best-way-to-sync-spotify-style-music-beats-with-animations-in-after-effects-1652407
- rekordbox Lighting FAQ (phrase analysis): https://rekordbox.com/en/support/faq/lighting-7/
- SoundSwitch Autoloops: https://inmusicsupport.freshdesk.com/en/support/solutions/articles/69000847100-autoloops-explained
- Sidechaining explained: https://musicradar.com/news/sidechaining-explained

**Practitioners**
- DJ TechTools, how VJs build light shows for touring artists: https://djtechtools.com/2015/08/17/dj-visuals-how-vjs-build-lightshows-for-touring-artists/
- Ticket Fairy, kinetic lighting for drops: https://www.ticketfairy.com/blog/kinetic-festival-lighting-without-chaos-movement-cues-for-drops
- Ticket Fairy, timecode versus busking: https://www.ticketfairy.com/blog/lighting-for-bpm-festivals-timecode-vs-busking
- Chauvet, Will Thomas (Bonobo LD): https://chauvetprofessional.com/news/will-thomas-dancing-light/
- Chauvet, Steve Lieberman: https://chauvetprofessional.com/news/steve-lieberman-inspired-light/
- Max Cooper, Ableton blog: https://ableton.com/en/blog/max-cooper-speaking-the-unspoken
- Max Cooper, Resolume blog: https://resolume.com/blog/16844
- Weirdcore, It's Nice That: https://www.itsnicethat.com/features/weirdcore-aphex-twin-field-day-050617-miscellaneous
- Weirdcore, Dazed: https://www.dazeddigital.com/music/article/37384/1/weirdcore-aphex-twin-mia-visuals-interview
- Strangeloop / David Wexler, Resolume: https://www.resolume.com/blog/7686
- CDM, Flying Lotus Layer 3: https://cdm.link/2012/11/three-layers-of-live-visuals-flying-lotus-strangeloop-timeboy-in-immersive-scrims/
- V Squared Labs on Amon Tobin ISAM: https://derivative.ca/community-post/visualizing-amon-tobins-isam-v-squared-team/60785
- deadmau5 on TouchDesigner and the Cube: https://derivative.ca/community-post/made-love-touchdesigner-v99-cusersdeadmau5/60967
- Ryoji Ikeda, FACT interview: https://factmag.com/2023/04/13/ryoji-ikeda-interview
- Robert Hodgin, Magnetosphere: https://roberthodgin.com/project/magnetosphere
- Eye magazine, "The hero of Flight 404": https://eyemagazine.com/blog/post/the-hero-of-flight-404
- TidBITS on Magnetosphere becoming the iTunes visualizer: https://tidbits.com/2015/06/12/funbits-be-a-vj-with-the-itunes-visualizer/
- Synnack & 0xf8, Ableton interview: https://www.ableton.com/en/blog/audio-reactive-visuals-interview-synnack-0xf8/
- Moment Factory at Sphere, SIGGRAPH blog: https://blog.siggraph.org/2024/12/visually-jamming-at-the-sphere.html/
- GMUNK, Billie Eilish 2024 tour: https://gmunk.com/Billie-Eilish-2024-World-Tour
- Jon Hopkins, Creative Review: https://creativereview.co.uk/art-jon-hopkins
- Jon Hopkins, Under the Radar: https://www.undertheradar.co.nz/news/15442/Interview-Jon-Hopkins--Laneway-Festival-2019.utr
- Olivia Ema, audio-reactive visuals with TouchDesigner: https://oliviaema.substack.com/p/navigating-audio-reactive-visuals

**Film and animation theory, game feel**
- Chion, point of synchronization (USC Scalar): https://scalar.usc.edu/works/audiovisualities/point-of-synchronization
- Chion, synchresis: https://scalar.usc.edu/works/audiovisualities/synchresis
- Mickey Mousing: https://en.wikipedia.org/wiki/Mickey_Mousing
- Escape Studios, lip sync two frames ahead: https://escapestudiosanimation.blogspot.com/2022/04/lipsync-two-frames-ahead-of-audio.html
- Animation Apprentice, why lip sync should be two frames ahead: https://animationapprentice.blogspot.com/2022/04/why-lipsync-should-be-two-frames-ahead.html
- Pluralsight, lip sync tips: https://www.pluralsight.com/resources/blog/software-development/proven-tips-animating-believable-lip-sync
- AWN, *Inspired 3D* lip sync: https://www.awn.com/print/vfxworld/inspired-3d-lip-sync-and-facial-animation-part-2
- Twelve basic principles of animation: https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation
- Vlambeer / Nijman on action-game feel: https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games
- "Juice it or lose it": https://gamejuice.pages.dev/resources/juice-it-or-lose-it
- Screen shake guide: https://gamejuice.pages.dev/articles/screen-shake-guide

### Caveats

- Several quotes come through secondary summaries or abstracts rather than full papers: the Arrighi tempo endpoints, the Petrini 60/120 bpm windows, the hit-stop frame counts and the Schmid latency figures.
- A few pages could not be fetched (403 or paywall). These were the Resolume forum, the Moment Factory Live Design and Unreal spotlights, the Nature paper and the Böck PDF text, so those points rest on search abstracts.
- The ITU sign convention differs between secondary sources. The table uses ITU's own: + means sound advanced, that is, picture late.
