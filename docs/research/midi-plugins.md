# Driving music visuals from MIDI and from inside a DAW: a playbook

Research report, 2026-11-21. Scope: a browser pixel-art diorama that reacts to music. It gets a built-in Standard MIDI File (SMF) player with a small Web Audio synth, and its visuals are driven by scheduled note events rather than audio analysis. There is also an existing Ableton Live bridge (transport, notes, macros).

How to read this. Every section has two layers:

- **Sources say**: claims taken from a fetched or searched source. Numbered references such as [S3] point to the source list at the end.
- **Synthesis**: my own design conclusions, arithmetic and code. Where I rely on well-known spec details that the fetched pages did not confirm, I mark them *(spec knowledge, not re-verified)*.

---

## 0. The short version

1. **Never trust the main thread's clock for musical time.** The audio clock (`AudioContext.currentTime`) is the master. `setTimeout` can be tens of milliseconds late [S5]. Visuals read the audio clock on every animation frame and work out where they are in the song. They are never pushed by timers.
2. **Notes are a timeline, not a stream.** Parse the SMF once into an absolute-time event list (seconds, through a tempo map). Then the visual layer can *look ahead*: it knows when the next kick lands and can start a wind-up 150 ms early. Audio analysis can't do this. It is also the main reason pro laser and lighting shows are pre-programmed to a timeline instead of reacting to audio [S30][S33].
3. **Schedule audio about 100 ms ahead.** Use a 25 ms tick (Chris Wilson's lookahead scheduler [S5]) or let a library do it (smplr's defaults are 200 ms lookahead and a 50 ms interval [S12]). Draw from `requestAnimationFrame`, with times converted through `getOutputTimestamp()` [S9] so the visual lands when the sound reaches the ear, not when it was queued.
4. **The DAW path has the same shape.** A plugin (JUCE, CLAP, VST3) reads the host transport at the start of every block (`ppqPosition`, `bpm`, `isPlaying`) [S15][S17]. It pushes note and transport events through a lock-free SPSC FIFO to a non-realtime thread [S18], which forwards them to the page over WebSocket or OSC with *beat-time stamps*. The page then turns beat time back into its own clock. Ableton Link is the clean way to share beat and phase across machines [S20][S21].
5. **Map musical dimensions to visual ones on purpose.** Velocity sets intensity (on a curve, not linear). Pitch sets position or hue. Duration sets hold. CC drives continuous parameters. Channel or GM drum note picks the "instrument" that reacts. Lookahead drives anticipation.

---

## 1. Standard MIDI Files

### 1.1 Byte layout

**Sources say** [S1][S2][S3][S4]:

- A file is a sequence of chunks, each with a 4-byte ASCII type and a 4-byte big-endian length. All multi-byte numbers are big-endian (MSB first) [S1].
- **Header chunk `MThd`**: length is always 6, followed by three 16-bit fields [S1][S2]:
  - `format`: 0 = one track, 1 = several simultaneous tracks, 2 = several independent single-track patterns [S1].
  - `ntrks`: number of track chunks (always 1 for format 0) [S2].
  - `division`: if positive, ticks per quarter note (e.g. 96, 480, 960). If negative, delta times are in SMPTE-compatible units [S1][S2].
- **Track chunk `MTrk`**: a 4-byte length, then `<delta-time> <event>` pairs. An event is a MIDI channel event, a sysex event or a meta event [S1][S2].
- **Variable-length quantity (VLQ)**: 7 data bits per byte, MSB first. Bit 7 is set on every byte except the last. Examples: `7F` = 127, `81 7F` = 255, `82 80 00` = 32768, `81 00` = 0x80, `81 80 00` = 0x4000 [S1][S2].
- **Sysex**: `F0 <len> data… F7`, or the "escape" form `F7 <len> data` [S1].
- **Meta events**: `FF <type> <len:VLQ> <data>`. Types: `00` sequence number, `01`–`07` text/copyright/track name/instrument name/lyric/marker/cue point, `20` channel prefix, `2F` end of track, `51` set tempo, `54` SMPTE offset, `58` time signature, `59` key signature, `7F` sequencer-specific [S1].
- **Running status**: a channel event may leave out its status byte if it matches the previous channel event's status. The first event needs an explicit status. Running status carries across delta times, and any meta or sysex event cancels it [S3].
- **Tempo**: put it in the first track (the "tempo map" or conductor track in format 1). If no tempo is given, assume 120 BPM. Tempo events are ignored when division is SMPTE [S3][S4]. Implementations confirm that the default is 500,000 µs per quarter note, which is 120 BPM [S24].
- An SMPTE division word example: `E250` hex for 30-frame timecode [S3].

**Spec knowledge, not re-verified** (consistent with the above):

- `FF 51 03 tt tt tt`: tempo as 24-bit microseconds per quarter note. BPM = 60,000,000 / µsPerQuarter.
- `FF 58 04 nn dd cc bb`: numerator `nn`, denominator as a power of two `dd` (3 means /8), `cc` MIDI clocks per metronome click (24 = every quarter), `bb` 32nd notes per MIDI quarter note (normally 8).
- `FF 2F 00`: end of track (required).
- `FF 59 02 sf mi`: key signature. `sf` is -7..+7 (flats negative), `mi` is 0 for major, 1 for minor.
- `FF 21 01 pp`: MIDI port (not official, but common in multi-port files).
- SMPTE division: high byte = two's-complement negative frame rate (-24, -25, -29 meaning 29.97 drop, -30). Low byte = ticks per frame. `E2 50` = -30 fps × 80 ticks = 2400 ticks/s.
- Channel message data lengths: `8n`/`9n`/`An`/`Bn`/`En` take 2 data bytes, `Cn`/`Dn` take 1. **Note-on with velocity 0 means note-off** and must be handled.

### 1.2 Tempo maps: ticks to seconds

**Sources say**: The usual implementation keeps a list of tempo changes as (absolute tick, µs per quarter). It sums each span with that span's tempo and adds the remainder after the last change [S24]. mido's conversion is `seconds = ticks × tempo × 1e-6 / ticks_per_beat` [S24]. For format 1, take the tempo map from track 0, the conductor track [S24]. Live's own API uses `time = beats × 60 / tempo` for a constant tempo [S26].

**Synthesis**: precompute cumulative seconds at every tempo change, then binary search. That makes every lookup O(log n) and gives you the inverse (seconds to ticks) for free, which you need for seeking and for beat-phase visuals.

```ts
type TempoSeg = { tick: number; usPerQ: number; sec: number }; // sec = absolute seconds at seg.tick

function buildTempoMap(tempoEvents: {tick:number; usPerQ:number}[], ppq: number): TempoSeg[] {
  const ev = [...tempoEvents].sort((a,b) => a.tick - b.tick);
  if (!ev.length || ev[0].tick !== 0) ev.unshift({ tick: 0, usPerQ: 500_000 }); // 120 BPM default
  const segs: TempoSeg[] = [];
  let sec = 0;
  for (let i = 0; i < ev.length; i++) {
    if (i > 0) sec += (ev[i].tick - ev[i-1].tick) * ev[i-1].usPerQ / 1e6 / ppq;
    // A later event at the same tick wins:
    if (segs.length && segs[segs.length-1].tick === ev[i].tick) segs.pop();
    segs.push({ tick: ev[i].tick, usPerQ: ev[i].usPerQ, sec });
  }
  return segs;
}

function tickToSec(map: TempoSeg[], tick: number, ppq: number): number {
  let lo = 0, hi = map.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (map[mid].tick <= tick) lo = mid; else hi = mid - 1; }
  const s = map[lo];
  return s.sec + (tick - s.tick) * s.usPerQ / 1e6 / ppq;
}
// secToTick is the same search over s.sec.
// beat (quarter notes) = tick / ppq, which drives beat-phase visuals.
```

The parse pipeline:

1. Read every track. For each event, keep the *absolute tick* (running sum of deltas), the track index and the channel. Handle running status, and treat note-on with velocity 0 as note-off.
2. Gather all `FF 51` events from all tracks. Most files keep them in track 0, but merging is more robust. Gather `FF 58` the same way for the bar grid.
3. Pair note-on with note-off per (channel, key) using a FIFO stack, which handles overlapping same-pitch notes. You get `{key, ch, vel, tickOn, tickOff}`.
4. Convert to seconds once with `tickToSec`. Also keep `beatOn = tickOn/ppq` and bar/beat from the time-signature map.
5. Sort into one merged, immutable array per category (notes, CCs, program changes, markers). This array is the "score" that both the synth and the visuals read.

A ready-made parser: `@tonejs/midi` gives `header.tempos`, `header.timeSignatures` and `header.PPQ`, plus per-track `notes[]` with `midi`, `time` (seconds), `ticks`, `duration`, `velocity` (normalized 0–1), `controlChanges` keyed by CC number (with aliases such as `sustain`), and `instrument.percussion`. Channels 9/10 count as percussion [S25]. It does the tempo-map conversion for you. Writing your own is about 200 lines and avoids a dependency. Either way, keep both ticks and seconds.

### 1.3 General MIDI drum map (channel 10, index 9)

**Sources say** [S6]: Channel 10 is percussion, and the map covers notes 35–81. Confirmed entries: 35 Acoustic Bass Drum, 36 Bass Drum 1, 38 Acoustic Snare, 42 Closed Hi-Hat, 44 Pedal Hi-Hat, 46 Open Hi-Hat, 49 Crash Cymbal 1. GM1 was superseded by GM2 in 1999, but GM1 is still the common target.

**Spec knowledge, not re-verified** (the standard GM1 list): 37 Side Stick, 39 Hand Clap, 40 Electric Snare, 41 Low Floor Tom, 43 High Floor Tom, 45 Low Tom, 47 Low-Mid Tom, 48 Hi-Mid Tom, 50 High Tom, 51 Ride Cymbal 1, 52 Chinese Cymbal, 53 Ride Bell, 54 Tambourine, 55 Splash, 56 Cowbell, 57 Crash Cymbal 2, 59 Ride Cymbal 2, 60–64 bongos/congas, 69 Cabasa, 70 Maracas, 75 Claves.

**Synthesis**: a visual "voice" table for the diorama:

| Group | GM notes | Suggested visual role |
|---|---|---|
| kick | 35, 36 | ground thump: camera/scene shake, floor light pulse, dust puff |
| snare/clap | 38, 40, 39, 37 | mid-height flash, sprites hop |
| closed/pedal hat | 42, 44 | tiny sparkle, lamp flicker, ticking motion |
| open hat | 46 | longer shimmer. Choke it on the next 42/44 (GM hats share a choke group) |
| toms | 41, 43, 45, 47, 48, 50 | pitch-mapped left-to-right sweep (low tom left, high tom right) |
| crash/splash/china | 49, 57, 55, 52 | big wash, sky colour change, long decay (1–2 s) |
| ride/bell | 51, 59, 53 | steady glint on a fixed prop |
| shakers/percussion | 54, 56, 69, 70, 75 | ambient particles |

### 1.4 Velocity curves

**Sources say**: GM2 does *not* define velocity-to-volume. The MIDI spec only "prefers" an exponential response [S27]. DLS defines the attenuation as `dB = 20·log10(127²/v²)`, which equals `40·log10(127/v)` [S27]. So velocity 64 is about -11.9 dB and velocity 32 about -24 dB. Csound's `ampmidid` uses a dynamic-range plus exponent curve instead [S27].

**Synthesis**:

- Audio gain: `gain = (v/127)^2`. This is exactly the DLS 40·log curve, because `20·log10((v/127)^2) = 40·log10(v/127)`.
- Visual intensity: perception of brightness is closer to a power law, so a linear velocity-to-brightness mapping makes soft notes look too bright. Use `intensity = (v/127)^γ` with γ ≈ 1.5–2.2, plus a floor (e.g. `0.15 + 0.85·…`) so ghost notes still register.
- Normalise *per file and per voice*. Compute each voice's velocity percentiles (p10, p90) at load time and remap to 0..1. Some MIDI files hold every note at 100. Others span 20–127. You know the whole score in advance, so use that.

---

## 2. Scheduling in the browser

### 2.1 The two clocks

**Sources say** [S5]:

- `AudioContext.currentTime` exposes the audio hardware clock. Audio events scheduled on it run on a separate thread and keep their times even when the main thread stalls or sits at a breakpoint.
- `setTimeout` callbacks can be skewed "by tens of milliseconds or more" by layout, GC and XHR. In the article's measurement, a timer due near 270 ms fired around 320 ms.
- The pattern: a JS timer (25 ms interval in the demo) wakes up and schedules every note whose time is earlier than `currentTime + scheduleAheadTime` (about 100 ms suggested; raise it for heavy apps). The tradeoff is that control changes take that long to be heard.

```js
while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
  scheduleNote(current16thNote, nextNoteTime);
  nextNote();
}
```

- For visuals, the scheduler pushes `{note, time}` into `notesInQueue`. A `requestAnimationFrame` `draw()` pops entries whose `time` is at or before `audioContext.currentTime`. **Drawing uses the audio clock, not the rAF timestamp** [S5].
- OS output buffering adds from a few ms to about 50 ms [S5].
- IRCAM's tutorial uses lookahead 0.15 s and period 0.1 s, and notes that the period must be shorter than the lookahead [S7].

### 2.2 Mapping audio time to frame time

**Sources say**:

- `getOutputTimestamp()` returns `{contextTime, performanceTime}`. `contextTime` is "the time of the sample frame currently being rendered by the audio output device", on the `currentTime` timeline. `performanceTime` is the estimated `performance.now()` moment that frame was rendered. Baseline since April 2021 [S9].
- `outputLatency` estimates hardware output latency (Bluetooth earbuds, USB interfaces) and is used to paint video frames when audio "reaches the user's ears". Support: Chrome/Edge 102, Firefox 70, Safari 18.4 [S10].
- An Apple forum report says iOS 15.1+ returned `contextTime` values about 10,000× too small [S11]. Validate the values at runtime.

**Synthesis**: the frame-time conversion I recommend:

```ts
// Once per rAF frame:
function audibleNow(ctx: AudioContext, rafNowMs: number): number {
  const ts = ctx.getOutputTimestamp();
  const ok = ts.contextTime! > 0 && Math.abs(ts.contextTime! - ctx.currentTime) < 1.0; // sanity check (iOS bug)
  if (ok) {
    // contextTime is already the frame at the speaker. Extrapolate to this frame's paint time.
    return ts.contextTime! + (rafNowMs - ts.performanceTime!) / 1000;
  }
  // Fallback: currentTime is the frame being *rendered*. Subtract what is still in the pipe.
  return ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0);
}
```

Use `audibleNow` as the single "song clock" for every visual decision. Smooth it with a small one-pole low-pass or a PLL against `performance.now()`. `getOutputTimestamp` moves in render-quantum steps (128 frames ≈ 2.7 ms at 48 kHz), and sometimes in larger device-buffer steps. The same staircase shows up in Unity, where `dspTime` updates every 21–22 ms and people interpolate between updates [S39].

Add a user-adjustable **A/V offset** (default 0, range ±150 ms). Rhythm games expose one because display and audio paths differ (TV processing, Bluetooth) [S40]. ITU-R BT.1359 puts the detectability window at roughly sound 45 ms early to 125 ms late. The ear forgives late sound far more than early sound [S41]. So when in doubt, let visuals land on time or a frame *early*. Never let them land well after the sound.

### 2.3 Tone.js as a reference design

**Sources say** [S8][S13]:

- `Tone.Draw.schedule(cb, time)` is called inside a Transport/Part callback with that callback's `time` argument. Transport callbacks run *before* the scheduled time and are not frame-aligned, so DOM and canvas work belongs in `Draw`.
- Implementation (v15): `anticipation = 0.008` s (half a frame) and `expiration = 0.25` s. Each rAF tick runs every event with `time ≤ currentTime + anticipation`, skips any event more than 0.25 s overdue, and only keeps rAF running while events are queued [S13]. `Draw.cancel(after)` exists.

**Synthesis**: copy the policy, not necessarily the library. One-shot visual events (flash, hop) fire at most a half-frame early, and are *dropped* if they are badly late (after a tab was hidden, say) instead of firing in a burst. Continuous visuals (beat phase, held notes, CC curves) don't use events at all. They are *pure functions of song time* and are evaluated every frame from the score. Because pure-function visuals are reproducible, scrubbing and seeking come for free.

### 2.4 Web MIDI

**Sources say** [S14]:

- Each `MIDIMessageEvent` carries `data` (one complete message, so the browser has already expanded running status). Its DOM `timeStamp` is a DOMHighResTimeStamp of "when the event was received by the system". System Real-Time bytes (clock `F8`) may interleave, and normal messages are buffered until complete.
- `MIDIOutput.send(data, timestamp)`: `timestamp` is in ms on the `performance.now()` timeline. Zero or a past time means "as soon as possible". Same-timestamp sends keep their order. Running status is not allowed in sent data. `clear()` drops queued sends. Sysex needs `requestMIDIAccess({sysex:true})`.

**Synthesis**: for live input, convert with `ctxTime = ts.contextTime + (event.timeStamp - ts.performanceTime)/1000`. Schedule both the synth note and the visual at `ctxTime + jitterBuffer` (about 10–20 ms) for constant latency, or play immediately and accept jitter. For a MIDI-file player that also drives external gear, `send()` with future timestamps is the Web MIDI equivalent of Web Audio's `start(when)`.

### 2.5 AudioWorklet

**Sources say** [S16]: `process()` runs synchronously on the audio render thread in 128-frame blocks, which is about 3 ms of budget at 44.1 kHz. Overrunning it causes glitches. `port.postMessage` works in both directions. Chrome's WASM pattern ring-buffers between 128-frame quanta and a WASM engine that works in 512-frame blocks.

**Synthesis**: you do not need an AudioWorklet for a simple synth. Native nodes (`OscillatorNode`, `BiquadFilterNode`, `GainNode` with `setValueAtTime`/`exponentialRampToValueAtTime`) are sample-accurate when started with `start(when)`. Use a worklet when (a) you run a WASM SoundFont engine (FluidSynth or SpessaSynth), or (b) you want the sequencer *inside* the audio thread. In case (b), the worklet owns the score and posts `{type:'noteOn', key, vel, ctxTime}` messages back to the main thread for visuals, timestamped in context time. Never let a visual depend on when the message *arrives*.

### 2.6 Sample and SoundFont players

**Sources say**:

- **smplr** [S12]: `Soundfont` (MusyngKite or FluidR3_GM kits), `SplendidGrandPiano` (4 velocity layers), `DrumMachine` (e.g. "TR-808", with samples grouped as kick-1, kick-2), `Sampler`, `Soundfont2Sampler`. `start({note, velocity 0–127, time (ctx seconds), duration, onEnded})` returns a stop function. Its own scheduler defaults to `scheduleLookaheadMs: 200` and `scheduleIntervalMs: 50`. `onStart` fires slightly early. Default samples load from GitHub, which rate-limits, so self-host them. Pre-1.0 and unstable.
- **WebAudioFont** [S22]: `queueWaveTable(ctx, target, preset, when, pitch, duration, volume, slides)`. Drums pass the MIDI key as pitch. GPL-3.0, which matters for licensing.
- **SpessaSynth** [S23]: SF2/SF3/DLS synth in an AudioWorklet. `synth.eventHandler` emits `noteOn`/`noteOff` with `midiNote`, channel and velocity, and has a `timeDelay` property for delaying events. A built-in `Sequencer` plays SMF. The official visualizer example drives key lights from these events.
- **js-synthesizer**: FluidSynth compiled to WASM in an AudioWorklet (npm page not fetchable here, so there are no verified details).

**Synthesis**: SpessaSynth's or FluidSynth's sequencer emits events *as they are rendered*, so they arrive late and without lookahead. For anticipation you still want your own parsed score as the visual source of truth. The synth is then only a renderer that gets the same event list.

### 2.7 A minimal subtractive drum and bass kit

**Sources say** [S28]: A kick is a sine whose pitch falls fast under a decaying gain envelope (`frequency.exponentialRampToValueAtTime`). A snare is a noise burst (from a random-filled `AudioBuffer`, since Web Audio has no noise node) plus a tonal body oscillator. Hats are fiddly, and the usual recipe is filtered noise or several detuned square waves.

**Synthesis**: starting values that sound right in a pixel-art context:

```ts
function kick(ctx, t, vel) {           // vel 0..1
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(vel * vel, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.5);
}
function snare(ctx, t, vel, noiseBuf) {
  const n = ctx.createBufferSource(); n.buffer = noiseBuf;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1000;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(vel*vel*0.8, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  n.connect(hp).connect(ng).connect(ctx.destination); n.start(t); n.stop(t + 0.25);
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(180, t);
  const og = ctx.createGain(); og.gain.setValueAtTime(vel*vel*0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(og).connect(ctx.destination); o.start(t); o.stop(t + 0.15);
}
function hat(ctx, t, vel, noiseBuf, open = false) {
  const n = ctx.createBufferSource(); n.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 10000;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
  const g = ctx.createGain(); const d = open ? 0.35 : 0.05;
  g.gain.setValueAtTime(vel*vel*0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  n.connect(bp).connect(hp).connect(g).connect(ctx.destination); n.start(t); n.stop(t + d + 0.02);
  return g; // keep it so a closed hat can choke an open one: g.gain.cancelScheduledValues(t2); setTargetAtTime(0, t2, 0.005)
}
// Bass: sawtooth -> lowpass (cutoff env 2 kHz -> 300 Hz over 150 ms, Q 6) -> gain env (A 3 ms, D 200 ms, S 0.6, R 80 ms).
// Pad or lead: two detuned saws (±7 cents) -> lowpass driven by CC74 -> slow attack.
```

Route each GM program family (`program >> 3`) to one of four voices: bass (32–39), keys/plucked (0–31, 104–111), pad/strings (40–55, 88–95) and lead (56–87, 96–103). Route channel 10 to the drum kit. The 8-bit spirit fits pixel art. If a richer sound is wanted later, a SoundFont player can drop in behind the same event interface.

---

## 3. Visualizers inside a DAW

### 3.1 The plugin model: audio thread, then FIFO, then UI or network

**Sources say**:

- **JUCE**: `AudioPlayHead::getPosition()` returns `Optional<PositionInfo>` "at the start of the current processing block". Fields: `getBpm()`, `getPpqPosition()` (quarter notes), `getPpqPositionOfLastBarStart()` (Pro Tools may not provide it), `getTimeSignature()`, `getBarCount()`, `getIsPlaying()`, `getIsRecording()`, `getIsLooping()`, `getLoopPoints()`, `getTimeInSamples()`, `getTimeInSeconds()`, `getHostTimeNs()`, `getFrameRate()`, `getEditOriginTime()`. Most are `Optional`, and a default-constructed value is all `nullopt` [S15]. The deprecated `CurrentPositionInfo` is replaced by this [S15]. Standalone builds get no BPM [S15b].
- **JUCE threading**: the community pattern is `AbstractFifo` plus a ring buffer. The audio thread writes in `processBlock`, and the editor reads on a `Timer` (one shared timer, not one per parameter). `AbstractFifo` is safe for exactly one producer and one consumer. Calling `repaint()` from the audio callback crashes [S18]. The real-time rules: no locks, allocation, system calls or amortised-complexity algorithms on the audio thread [S19]. `VBlankAttachment` fires a callback on every vblank of the component's display. The advice is to update the model in the callback, call `repaint()` there, and keep drawing in `paint()`. Developers report it is smoother than a 60 Hz `Timer` [S34].
- **CLAP**: `clap_event_transport` carries `flags` (`HAS_TEMPO`, `HAS_BEATS_TIMELINE`, `HAS_SECONDS_TIMELINE`, `HAS_TIME_SIGNATURE`, `IS_PLAYING`, `IS_RECORDING`, `IS_LOOP_ACTIVE`, `IS_WITHIN_PRE_ROLL`), `song_pos_beats`/`song_pos_seconds` (fixed point), `tempo`, `tempo_inc` (per-sample tempo slope), loop bounds, `bar_start`, `bar_number` and `tsig_num/denom`. It arrives in `clap_process` per block, and the host can insert extra transport events at sample-accurate points inside the block. Every event header has `time`, a sample offset within the buffer. `clap_event_note` has `note_id`, `port_index`, `channel`, `key` and `velocity` as a *double* 0..1 [S17].
- **iPlug2**: `ITimeInfo` has `mPPQPos` (default -1), `mTempo`, `mTransportIsRunning`, `mSamplePos`, `mLastBar` and time-signature fields. The forum pattern for beat detection checks whether `floor(ppq)` changes between `mPPQPos` and `mPPQPos + blockLenInQuarters`. Some hosts (MuseScore) don't set the validity flags [S29].
- **VST3** *(spec knowledge, not re-verified)*: `ProcessData::processContext` → `ProcessContext` with `state` flags (`kPlaying`, `kTempoValid`, `kProjectTimeMusicValid`, `kBarPositionValid`, `kSystemTimeValid`, `kContTimeValid`), `tempo`, `projectTimeMusic` (quarters), `barPositionMusic`, `systemTime` (ns), `continousTimeSamples`, `timeSigNumerator/Denominator`.

**Synthesis**: the per-block algorithm every plugin visualizer needs. It is the same for JUCE, CLAP, VST3 and iPlug2.

```cpp
// Audio thread, per block (N samples, sr sample rate):
auto pos = getPlayHead()->getPosition();               // JUCE
double ppq0 = pos->getPpqPosition().orFallback(lastPpq + N * bpm / 60.0 / sr);
double bpm  = pos->getBpm().orFallback(lastBpm);
bool playing = pos->getIsPlaying();
uint64_t hostNs = pos->getHostTimeNs().orFallback(0);   // when the block was due

// 1. Transport snapshot: one per block, the latest wins.
fifo.push({Kind::Transport, ppq0, bpm, playing, hostNs, /*sampleOffset*/0});

// 2. Notes with sub-block timing.
for (const auto meta : midiMessages) {                  // juce::MidiBuffer
  auto m = meta.getMessage(); int off = meta.samplePosition;
  double ppq = ppq0 + off * bpm / 60.0 / sr;            // beat position of this note
  if (m.isNoteOn())  fifo.push({Kind::NoteOn,  ppq, bpm, playing, hostNs, off, m.getChannel(), m.getNoteNumber(), m.getFloatVelocity()});
  if (m.isNoteOff()) fifo.push({Kind::NoteOff, ppq, ... });
  if (m.isController()) fifo.push({Kind::CC, ppq, ..., m.getControllerNumber(), m.getControllerValue()/127.f});
}
// Push only trivially copyable PODs into a pre-allocated SPSC ring (AbstractFifo or a moodycamel-style queue).
// Never block. If it's full, drop and count the drops.
```

On the message thread, a `VBlankAttachment` or a 60 Hz timer drains the FIFO. It either paints the editor or serializes the events to the network (§3.4). The key point is to **stamp events with musical position (ppq) plus host time**, not with "now". The consumer can then rebuild exact timing whatever the transport jitter.

Also note:

- *Latency*: the block for a given ppq is rendered one buffer before it is heard. For visuals on the same machine, add `outputLatency ≈ bufferSize/sr + device latency`. JUCE's `AudioIODevice::getOutputLatencyInSamples()` gives it in a standalone app. In a plugin you can't see it directly, so expose a user offset.
- *Loops*: ppq jumps backwards on a loop wrap. Treat a backwards jump larger than one block as a discontinuity (a "seek") and resync the visual state.
- *Note-only instrument plugins* (an "instrument" whose only output is visuals) receive MIDI on their own track. That is the cleanest way to visualize a specific part in a DAW.

### 3.2 Ableton Live: Max for Live and the Live Object Model

**Sources say**:

- The LOM `Song` exposes `current_song_time` (beats, get/set/observe), `is_playing` and `tempo` (20–999). Observe them with `live.path` → `live.observer` [S26]. Forum users report drift around tempo changes and SMPTE-time properties that ignore tempo automation [S26].
- In a Live device, an unnamed Max `transport` follows Live's transport. A named one follows it only with `@clocksource live` [S35]. `plugsync~` reports bar, beat, tempo (samples per beat) and more, but users see bars and beats jump around time-signature changes. `phasor~ @lock 1` is recommended for staying phase-locked. Live does *not* latency-compensate beat-synced devices placed after latency-inducing devices, so put sync devices first in the chain [S36].
- **Clip lookahead**: `Clip.get_notes_extended(from_pitch, pitch_span, from_time, time_span)` (Live 11+) returns `note_id`, `pitch`, `start_time` (beats of clip time), `duration`, `velocity`, `mute`, `probability`, `velocity_deviation` and `release_velocity`. `Clip.playing_position` (observable), `loop_start/loop_end` and `looping` give the clip's current place [S37].
- **TDAbleton** (TouchDesigner) runs through a MIDI Remote Script that uses the LOM heavily, plus `TDA_` Max devices (`TDA Master`, `TDA MIDI`, `TDA_Rack_OSC`). It talks OSC over UDP and can cross machines. It exposes song bars/beats/sixteenths/time, track meters, clip data, MIDI notes (from a TDA MIDI device placed on a track) and parameters. Caveats: meters update only when visible in Live, big sets flood OSC, and values sent back create undo steps, so rack macros are recommended [S31].
- **Showsync LiveGrabber** sends OSC for plugin, track, scene and MIDI-note changes, plus audio envelopes and onsets [S38].

**Synthesis for the existing bridge**: the Live bridge can do *better than live notes* by sending the **upcoming notes of playing clips**. Every bar (or on `playing_position` loop wrap), call `get_notes_extended` for the next 1–2 bars of each playing MIDI clip. Convert clip-relative beats to song beats (`song_beat = clip_start_in_song + (note.start_time - loop_start) mod loop_length …`) and send them as a "forecast" message. The page then gets the same lookahead power as the SMF player. Live notes still arrive through the per-track device and act as *confirmation*: drop forecast notes that never sound (probability < 1, a muted track), and add notes played live that weren't forecast.

### 3.3 Other hosts and engines

**Sources say**:

- **Bitwig** controller API values update asynchronously ("when there is time"). Bitwig updates plugin transport position only while playing. TDBitwig exists alongside TDAbleton [S42].
- **Unreal Quartz**: audio commands are consumed only at buffer starts. At 2048 samples and 48 kHz a command can wait about 43 ms, and with 13 ms of game-thread latency up to 56 ms. Quartz queues commands ahead against a clock (bars/beats) so they render mid-buffer, sample-accurately. Game-thread delegates (`Subscribe to Quantization Event`) notify gameplay or visuals on beats, but the Blueprint side is only frame-accurate. Only commands on the audio render thread are sample-accurate [S43][S44].
- **Unity**: schedule with `AudioSource.PlayScheduled(dspTime + 0.1…0.2)`, derive song position from `AudioSettings.dspTime` every frame, and interpolate because it updates every ~21–22 ms. Visuals "should just be a reflection of" the timing data [S39].
- **Synesthesia** (VJ software): GLSL scenes get audio uniforms in families: Level (`syn_BassLevel`, smoothed 0–1), Hits (`syn_BassHits`, transient spikes), Presence (slow activity), Time clocks that run faster when loud (`syn_Time`), beat signals (`syn_OnBeat`, `syn_ToggleOnBeat`, `syn_RandomOnBeat`, `syn_BeatTime`, `syn_BPMTwitcher`), and BPM (`syn_BPM` 50–220, `syn_BPMConfidence`, `syn_BPMSin` with ½, ¼ and ⅛ variants) [S45]. Values go out over OSC (about 34 addresses) and controls come in over MIDI [S46].
- **Resolume Arena**: Link is the recommended tempo sync. MIDI clock gives "only an estimate" of BPM, because BPM is computed from the spacing between clock ticks and fluctuates. Arena (not Avenue) can lock a clip's playhead to SMPTE/LTC, and you can mix SMPTE clips and BPM-synced clips in one show [S47].
- **Notch**: exposed parameters can be driven or emitted over OSC/MIDI, and are often run through TouchDesigner/TDAbleton [S48].

**Synthesis**: the Synesthesia uniform families are a good *vocabulary* for the diorama's internal signal bus, even when the signals come from MIDI rather than audio. Hits become note-on impulses, Level becomes a velocity-weighted envelope follower over notes, Presence becomes note density over the last 4 bars, and the clocks become beat and phase from the tempo map. That lets shader- or sprite-authors write against one API whatever the source.

### 3.4 Sync protocols between processes and machines

**Sources say**:

- **MIDI beat clock**: `F8` clock at 24 ppqn, `FA` start, `FB` continue, `FC` stop. After Start/Continue, the receiver begins on the *next* `F8`. Song Position Pointer counts 16th notes (6 clocks each) [S49]. Measured jitter is anecdotal: about 6.85 ms (VCV→Max over loopMIDI) vs about 0.6 ms Max→Max [S49]. Resolume's BPM wobbles under MIDI clock for that reason [S47].
- **MTC**: quarter-frame `F1 0nnndddd`, eight pieces make a full time, so a full update arrives every 2 frames (96–120 messages/s). The full-frame sysex is `F0 7F 7F 01 01 hh mm ss ff F7`, with the rate in the top bits of `hh` (24 / 25 / 29.97 DF / 30) [S50]. MTC carries no tempo or meter. Live can be an MTC follower only, with an offset and "SMPTE All" auto-detect. Live's per-device *Sync Delay* is calibrated by ear [S51].
- **Ableton Link**: shares tempo, beat and phase (plus optional start/stop) on the LAN with auto-discovery. *Quantum* is the phase unit in beats: peers with quantum 4 agree on bar phase. Session state is a `(beat, time, tempo)` timeline that you capture and commit. There are separate realtime-safe capture/commit calls for the audio thread and blocking ones for app threads [S20]. The README says to add your output latency to host time before calling Link, so devices with different latencies line up. On non-Apple platforms, smooth system time with `HostTimeFilter`. License: GPLv2+ or proprietary [S21]. Live sends but cannot receive MIDI clock while Link is on [S51].
- **OSC 1.0**: transport-independent messages and bundles. A bundle carries a 64-bit NTP time tag (32 bits of seconds since 1900, 32 bits of fraction). A server must hold future-tagged bundles until their time and process a bundle's messages atomically. OSC has *no* clock sync, so it relies on NTP/SNTP [S52].

**Synthesis**: choosing a protocol for the diorama.

| Need | Best choice | Why |
|---|---|---|
| beat and phase lock with Live or other apps on the LAN | Ableton Link, through a native helper or the bridge | phase-accurate, no clock ticks to jitter. The browser can't join directly (UDP multicast), so a bridge process joins Link and streams `(beat, time, tempo)` snapshots over WebSocket |
| individual note events from a DAW | WebSocket JSON/CBOR, or OSC-over-WebSocket, from the plugin or M4L device, **stamped in beats** | the page rebuilds time through its local copy of the tempo/phase timeline |
| frame-locked video and lighting playback | LTC/MTC or Art-Net timecode | position only, rigid, standard in shows |
| legacy gear | MIDI clock | 24 ppqn is coarse and jittery. Smooth it with a PLL or a linear regression over the last 24–96 ticks |

The bridge message schema I'd use:

```jsonc
// Transport snapshot (≥ 10 Hz while playing, and on every change):
{"t":"tx","beat":128.0312,"bpm":124.0,"playing":true,"quantum":4,"hostUs":1732190000123456,"seq":812}
// Note (from the audio thread FIFO, stamped in song beats):
{"t":"on","beat":129.0,"ch":10,"key":36,"vel":0.86,"track":"Drums","id":"n4411"}
{"t":"off","beat":129.25,"ch":10,"key":36,"id":"n4411"}
// Forecast (future clip notes, from get_notes_extended):
{"t":"fc","from":132,"to":136,"notes":[{"b":132.0,"d":0.25,"k":36,"v":0.9,"ch":10,"p":1.0}]}
// Macro/CC:
{"t":"cc","beat":129.5,"name":"Macro 3","v":0.42}
```

On the page, keep a `BeatClock` estimated from `tx` snapshots: `beat(t) = beat0 + (t - t0) · bpm/60`. Re-anchor `(beat0, t0)` on every snapshot with slew limiting (slew, never jump, unless the error is over about 50 ms or a seek is flagged). Convert `hostUs` to page time with a one-time offset estimate (NTP-style ping exchange over the WebSocket: `offset = ((t1 - t0) + (t2 - t3))/2`). Then schedule each note's visuals at `pageTime(beat)`. Notes now render at the right beat even when WebSocket delivery jitters by 5–30 ms. If they arrive late, they can still be placed correctly in the past (an impulse that started 20 ms ago is drawn with 20 ms of decay already applied).

---

## 4. How pro lighting and laser shows sync

### 4.1 Timecode and show control

**Sources say**:

- **grandMA3** accepts SMPTE/LTC, MTC and Art-Net timecode, up to 8 external signals at once (2.0 manual), with 8 timecode slots. A *timecode show* lives in the Timecode pool, and each track targets a sequence, preset, sound, master or another show. You *record* a show by enabling record mode while the time signal runs and then pressing executor keys and moving faders. The console writes those actions into the tracks, and they can be edited afterwards [S53].
- **MIDI Show Control** (MSC): `F0 7F <deviceID 0–7F> 02 <commandFormat> <command> <data> F7`. Lighting format is `01` and 7F is all types. Commands: `01` GO, `02` STOP, `0A` RESET, `0B` GO_OFF. Cue numbers are ASCII digits with a `00` separator before the list (`F0 7F 01 02 01 01 31 00 32 F7` = GO cue 1 in list 2). Console support varies [S54].
- **DMX512**: 512 8-bit channels per universe over RS-485 at 250 kbit/s. A full universe refreshes at about 44 Hz (about 22.7 ms per packet). **Art-Net 4** addresses up to 32,768 universes (15-bit, starting at 0). **sACN/E1.31** (an ANSI/ESTA standard) addresses 1–63,999. Both carry DMX over UDP. Off-by-one universe numbering is a common bug [S55].

### 4.2 Pangolin BEYOND and QuickShow (lasers)

**Sources say**:

- Pre-programmed show workflow: load the song on a timeline (QuickShow allows one track, BEYOND several media files shown as waveforms). Place cues with markers and snapping, loop sections to rehearse, and tap in beat markers. Their stated big advantage is *preparation time*: the whole show is built before the event. They are standard when the music is known (concerts, theme parks, corporate shows). Live alternatives are tap BPM, AutoBPM from an audio input ("works best on music with a strong, clear beat"), a DJ-software plugin (VirtualDJ supplies timecode, BPM and track position) and SMPTE [S30][S56].
- BEYOND's beat engine always runs. Tap with the BPM label or space bar, re-sync with Backspace. Beats drive beat-based cue animations, effects and QuickTargets sequences [S57]. A timeline show runs on time. The cues it fires animate at system BPM. Hard Beat Sync makes all cues share one beat source [S58].
- BEYOND timecode: MTC in/out, MMC out, SMPTE through hardware readers (TC2000/Aquila/TC4000, which turns LTC into MTC over USB), Art-Net timecode in/out, and Syncronorm SNTC. One input source at a time. If "Keep running even though timecode stops" is off, playback stops after 1 s without timecode. A *time smooth filter* advances smoothly between timecode values. Pangolin recommends media events as the master and BEYOND *generating* timecode for other systems [S59][S58].
- BEYOND audio: an FFT spectrum (the wiki gives 256 bands on one page and 512 on another) with per-band peak detectors that generate events. FFT values can drive channels mixed with DMX and manual values [S60].
- Scanner speed: the ILDA test pattern defines kpps ratings. A "30K" scanner must draw the pattern correctly at 30,000 points/s (±1%) at about 8° optical. Higher rates "look" fine except the circle-in-square test. There's no simple kpps-to-points-per-frame rule, because large jumps between points stress the galvos [S61].
- ILDA IDTF (rev 011, 2014): 32-byte header, formats 0/1/2/4/5. Format 5 is 2D true colour (RGB per point) [S62].
- Safety: audience scanning must stay below MPE (ANSI Z136 / IEC 60825). Scanning counts as a safety factor only with working scan-fail detection (Pangolin PASS). Pangolin's Beam Attenuation Map defines safe zones. In the US the FDA requires a variance for audience scanning [S63].
- Previz: Depence R4 (Syncronorm, sold through Pangolin) simulates lasers in real time including scanner inertia and beam divergence, has a show-control module for real hardware, and works with BEYOND [S64].

### 4.3 Pre-programmed vs busked

**Sources say** [S33]: timecode shows (an SMPTE LTC feed from the playback rig to FOH) need the music in advance, every cue programmed and thorough testing. They are "unforgiving" if the set changes. Busking means live operation from pre-built palettes and cue snippets on fader wings and macro buttons. The usual festival practice is a *hybrid*: lasers timecoded for safety and precision, blinders and washes busked. With no timecode, consoles follow tempo through Ableton Link or Pioneer ShowKontrol. Fallbacks: an "auto-pilot" look at average BPM and hot keys for blackout and accents. Armin van Buuren reportedly sent SMPTE from his CDJs to his visuals operator [S32].

**Synthesis: why the pros pre-program instead of analysing audio, and what it means for us**:

1. **Anticipation**: a programmed cue can start *before* the hit. Moving heads need hundreds of ms to slew, lasers need a frame to build. Analysis only knows a hit after it happens, plus FFT window latency of 10–50 ms. Our SMF score is a pre-programmed timeline by construction.
2. **Semantics**: analysis can't tell a snare from a clap, or a verse from a chorus. MIDI channel and note number tell us exactly. The score's markers (`FF 06`) give sections.
3. **Determinism**: the same song gives the same show, so it can be reviewed, tuned and safety-checked. This is why lasers are the part they timecode.
4. **Busking stays valuable on top**. Our equivalent is "macros" from the Live bridge, or user controls, that shift palette, energy and camera live while the timeline drives the hits.
5. **Freewheel and smoothing**: timecode readers smooth between frames and keep running through dropouts (BEYOND's 1 s rule). Our BeatClock should do the same with bridge snapshots.

---

## 5. Mapping MIDI to visuals

### 5.1 The core mappings

| MIDI dimension | Visual dimension | Notes |
|---|---|---|
| note-on (impulse) | flash, hop, emitter burst, camera kick | an attack-decay envelope keyed on note time: `e(t)=I·exp(-(t-t0)/τ)`, τ about 80 ms for hats, 150 for snare, 250 for kick, 1.2 s for crash |
| velocity | intensity, size, particle count, shake amplitude | power curve γ≈1.5–2.2 after per-voice normalisation (§1.4) |
| pitch (melodic) | x position (piano-roll style), height, hue | pitch class → hue (12-step wheel, or circle of fifths for "harmonic" colour: `hue = (pc·7 mod 12)/12`). Octave → brightness or elevation |
| pitch (drums) | which object reacts | GM table (§1.3) |
| duration / sustain | hold: light stays lit, sprite holds a pose | ADSR-shaped, with release on note-off. CC64 sustain extends visual holds the same way it extends sound |
| CC1 mod, CC11 expression, CC74 brightness | continuous: wind, glow, filter-like blur, colour temperature | smooth with a one-pole low-pass (~30 ms) to avoid stair-steps from 7-bit values |
| pitch bend | wobble, horizontal sway | ±2 semitones standard range |
| program / channel | instrument identity, "who" in the diorama | one character or prop per channel |
| tempo map | global beat phase: idle bobbing, lamp sway, day/night pulse | `phase = fract(beat)`, `barPhase = fract(beat/beatsPerBar)` |
| markers / sections | scene state changes (palette, weather) | from `FF 06`, or derived from density changes |
| density (notes/s over 2–4 bars) | "energy": crowd size, particle rate | the MIDI equivalent of Synesthesia's Presence |

### 5.2 Anticipation: using the future

**Sources say**: rhythm games show notes about 1.5 s before the hit (approach time), and treat the audio clock as the only source of truth, placing notes from scheduled musical times rather than accumulated frame deltas [S40]. Quartz's design point is the same: schedule ahead so the effect lands on the boundary [S43].

**Synthesis**: the animation principle (anticipation, then action, then follow-through) maps onto the score directly.

```ts
// Per frame, for each visual voice, with now = audibleNow(...):
const next = score.nextNoteAfter(voice, now);          // binary search on a sorted array
const prev = score.lastNoteAtOrBefore(voice, now);
const lead = voice.windup;                             // seconds, e.g. 0.18 for the kick
// Wind-up: 0→1 over [next.t - lead, next.t]. Ease-in so it accelerates into the hit.
const w = next ? clamp01(1 - (next.t - now) / lead) : 0;
const windup = w * w * w;                              // easeInCubic
// Impact plus decay after the hit:
const hit = prev ? prev.velN * Math.exp(-(now - prev.t) / voice.tau) : 0;
// Follow-through overshoot (damped spring) after the hit:
const ft = prev ? Math.exp(-(now - prev.t) * 12) * Math.sin((now - prev.t) * 40) * 0.15 * prev.velN : 0;
voice.pose = { crouch: windup * (next?.velN ?? 0), pop: hit, wobble: ft };
```

Rules of thumb:

- **Lead time scales with mass and with the visual distance travelled.** Hat sparkles need none. A sprite hop needs about 120–180 ms (crouch, then leave the ground on the beat, so the *peak or the landing* is the beat, whichever your animator decides). A thrown object or a moving searchlight needs a lead equal to its travel time. A camera move to a new section starts 1 bar early.
- **Cap anticipation at the inter-onset interval.** If the next hit is closer than `lead`, shorten the wind-up to about 60% of the IOI, or merge rapid notes (16th hats) into a sustained "buzz" state instead of per-note wind-ups.
- **Pick the anticipating voice.** Only a few voices (kick, snare, crash, phrase starts) should anticipate. If every note anticipates, the scene reads as nervous.
- **Phrase-level lookahead**: scan the next 4–8 bars for density and velocity to pre-ramp "energy" (dimming before a drop, lights gathering on the crash at the top of a chorus). The pros pre-program exactly this. Analysis can't.
- **Handle seeks**: on seek or loop, recompute `prev` and `next` from the score. Pure-function visuals need no event replay.
- **Quantise for the pixel grid**: pixel art reads better with stepped animation (e.g. 12 fps sprite frames). Compute continuous values, then quantise *pose index* to frames, and keep the impact frame aligned to the exact audio frame (snap the nearest sprite frame to `t0`).

### 5.3 Per-instrument routing and live input

- Channel → visual actor. SMF channels are the obvious key. For format 1 files, a track name such as "Bass" or "Drums" (`FF 03`) is a useful hint for auto-assignment.
- From the Live bridge, track names come for free. Map each name to an actor with a fallback by GM-ish role.
- Live (non-forecast) notes have no lookahead. Their visuals skip the wind-up and use a stronger attack. Forecast notes (§3.2) and SMF notes get the wind-up.

---

## 6. Architecture for the diorama

```
                ┌──────────────── Page (main thread) ────────────────┐
 .mid file ──▶  │ SMF parser ─▶ Score (immutable, sorted arrays,     │
                │               ticks + seconds + beats, tempo map)  │
                │      │                       │                      │
                │      ▼                       ▼                      │
                │ Audio scheduler        Visual engine (rAF)          │
                │ (25 ms tick, 100 ms    now = audibleNow()           │
                │  lookahead, start(t))  per voice: prev/next note,   │
                │      │                 windup / hit / hold / CC,    │
                │      ▼                 beat phase, energy           │
                │ Web Audio graph  ◀── same Score ──▶ draw pixels     │
                │ (synth or smplr/Spessa)                             │
                └──────┼──────────────────────────────────────────────┘
                       ▼ speakers  (outputLatency + baseLatency)

 Ableton Live ─▶ M4L device / plugin (audio thread) ─SPSC FIFO─▶ sender thread
                 ppq, bpm, playing, notes(beat-stamped),            │ WebSocket
                 forecast via Clip.get_notes_extended                ▼
                 (optional: Link peer in the bridge) ───────▶ Page: BeatClock
                                                              (slewed beat↔time),
                                                              Score-like live buffer
                                                              → same Visual engine
```

The contract: the visual engine only ever asks two questions, "what time is it in beats or seconds?" (a clock) and "what notes are near this time?" (a sorted, queryable buffer). The SMF player and the Live bridge are two implementations of those two interfaces. Make that the single seam.

### 6.1 Checklist

1. Parse SMF: VLQ, running status, velocity-0 note-off, all meta tempos and time signatures, SMPTE division support (or a visible failure for it).
2. Build the tempo map with cumulative seconds and binary search, plus beat and bar lookups.
3. Write the audio scheduler: lookahead loop on a 25 ms `setInterval` (in a Worker, so background throttling doesn't starve it), 100–150 ms ahead, `start(when)` on every node.
4. Write the song clock: `getOutputTimestamp` mapping with a sanity check, smoothing and a user A/V offset.
5. Build the visual engine: pure functions of `(score, now)`, Tone.Draw-style late-drop policy for one-shots, wind-up and decay per voice.
6. Bridge: beat-stamped events, transport snapshots, forecast notes, BeatClock with slew and freewheel (keep running about 1 s on dropout, as timecode systems do).
7. Calibration: a clap-sync screen (flash + click at known times, adjust offset until they coincide).
8. Tests: a tempo-change SMF (120 → 90 → 140 BPM) where ticks-to-seconds must match an independent reference within 1 sample, running-status and velocity-0 fixtures, and a seek in the middle of a held note.

### 6.2 Numbers to keep handy

| Quantity | Value | Source |
|---|---|---|
| Lookahead scheduler | 25 ms tick, ~100 ms ahead | [S5] |
| smplr scheduler defaults | 200 ms lookahead, 50 ms interval | [S12] |
| Tone.Draw anticipation / expiration | 8 ms / 250 ms | [S13] |
| Render quantum | 128 frames (2.67 ms at 48 kHz) | [S16] |
| OS output buffering | a few ms to ~50 ms | [S5] |
| A/V detectability | ~45 ms audio-early to ~125 ms audio-late | [S41] |
| Default SMF tempo | 500,000 µs/q = 120 BPM | [S3][S24] |
| MIDI clock | 24 ppqn. SPP unit = 16th = 6 clocks | [S49] |
| MTC | 4 quarter-frames per frame, full time every 2 frames | [S50] |
| Quartz buffer wait example | 2048 @ 48 kHz → 43 ms, +13 ms thread → 56 ms | [S43] |
| Unity dspTime step | ~21–22 ms | [S39] |
| DMX | 512 ch, 250 kbit/s, ~44 Hz per full universe | [S55] |
| Art-Net 4 / sACN universes | 32,768 / 63,999 | [S55] |
| Laser scanner rating | ILDA 30K at ~8° optical, ±1% | [S61] |
| BEYOND timecode dropout | stops after 1 s unless freewheel is on | [S59] |
| Link audio test tolerance | 3 ms | [S20] |

---

## 7. Open questions and caveats

- `getOutputTimestamp` reliability on Safari/iOS has had bugs [S11]. Ship the sanity check and the fallback.
- The Web MIDI event timestamp is the DOM `timeStamp` (high-resolution, per the current TR). Older drafts used `receivedTime` [S14]. Code against `event.timeStamp`.
- JUCE's spectrum-analyser tutorial has an alleged data race on its ready flag [S18]. Don't copy that pattern. Use a real SPSC FIFO with acquire/release atomics.
- Browsers can't speak Link (UDP multicast) or raw OSC/UDP. A native bridge is required for both. The existing Ableton bridge is the natural place to add a Link peer.
- BEYOND's FFT band count is reported inconsistently (256 vs 512) on its own wiki [S60]. It's irrelevant to us, but don't quote it as fact.
- The MTC rate code 2 label varies between sources ("30 drop" vs 29.97 drop) [S50]. 29.97 DF is the correct reading.
- Not fetched or verified here: the VST3 `ProcessContext` page (404), the js-synthesizer npm page (403), the Ableton Link guidelines page (503) and Notch's own docs. The details given for those are marked as spec knowledge or community claims.

---

## Sources

- [S1] Craig Sapp, Standard MIDI File Structure (CCRMA): https://ccrma.stanford.edu/~craig/14q/midifile/MidiFileFormat.html
- [S2] McGill MUMT306, Standard MIDI File (SMF) Format 1.0: https://ich.music.mcgill.ca/classes/mumt306/SMFformat.html
- [S3] Kent State, MIDI file format (running status, tempo, SMPTE division E250): https://www.personal.kent.edu/~sbirch/Music_Production/MP-II/MIDI/midi_file_format.htm
- [S4] CCARH, Outline of the Standard MIDI File Structure: https://www.ccarh.org/courses/253/handout/smf
- [S5] Chris Wilson, "A tale of two clocks" (web.dev): https://web.dev/articles/audio-scheduling
- [S6] General MIDI percussion map (Wikipedia; Finale map table; midi-msg docs): https://en.wikipedia.org/wiki/General_MIDI , https://www.finalemusic.com/UserManuals/Finale2011Mac/Content/Finale/General_MIDI_Percussion_Map_Table.htm , https://docs.rs/midi-msg/0.9.0/midi_msg/enum.GMPercussionMap.html
- [S7] IRCAM, Web Audio timing and scheduling tutorial: https://ircam-ismm.github.io/webaudio-tutorials/scheduling/timing-and-scheduling.html
- [S8] Tone.js Draw docs: https://tonejs.github.io/docs/14.7.58/Draw , example https://tonejs.github.io/examples/animationSync
- [S9] MDN, AudioContext.getOutputTimestamp(): https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp
- [S10] web.dev, Synchronize audio and video playback (outputLatency): https://web.dev/articles/audio-output-latency
- [S11] Apple Developer Forums, Web Audio getOutputTimestamp on iOS: https://developer.apple.com/forums/thread/696356
- [S12] smplr README (v0.16.3): https://app.unpkg.com/smplr@0.16.3/files/README.md
- [S13] Tone.js Draw.ts source (v15.1.8): https://unpkg.com/tone@15.1.8/Tone/core/util/Draw.ts
- [S14] W3C Web MIDI API: https://www.w3.org/TR/webmidi/ ; history in https://www.w3.org/Bugs/Public/show_bug.cgi?id=20411 ; MDN send(): https://developer.mozilla.org/en-US/docs/Web/API/MIDIOutput/send
- [S15] JUCE AudioPlayHead::PositionInfo: https://docs.juce.com/master/classAudioPlayHead_1_1PositionInfo.html ; [S15b] JUCE forum, host BPM: https://forum.juce.com/t/getting-hosts-bpm-from-vst-plugin/6552 , partial PositionInfo: https://forum.juce.com/t/audioplayhead-how-to-handle-partial-positioninfo/62823
- [S16] Chrome, Audio Worklet design pattern / MDN process(): https://developer.chrome.com/blog/audio-worklet-design-pattern , https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process
- [S17] CLAP events.h: https://github.com/free-audio/clap/blob/main/include/clap/events.h
- [S18] JUCE forum threads on visualiser FIFOs: https://forum.juce.com/t/general-audio-visualiser-implementation/18696 , https://forum.juce.com/t/lock-free-queues-and-visualization-of-data/20659 , https://forum.juce.com/t/data-race-in-spectrum-analyser-tutorial/65715
- [S19] Timur Doumler: ACCU 2017 lock-free talk https://accu.org/video/spring-2017-day-1/doumler ; ADC21 real-time stdlib talk https://adc21.sched.com/event/ppKZ/replay-using-the-c-standard-library-for-real-time-audio ; JUCE thread https://forum.juce.com/t/timur-doumler-talks-on-c-audio-sharing-data-across-threads/26311
- [S20] Ableton Link concepts: https://ableton.github.io/link/
- [S21] Ableton Link README: https://github.com/Ableton/link
- [S22] WebAudioFont: https://github.com/surikov/webaudiofont , docs https://surikov.github.io/webaudiofont/npm/src/docs/index.html
- [S23] SpessaSynth docs: https://spessasus.github.io/spessasynth_lib/getting-started/visualizer-example , https://spessasus.github.io/spessasynth_lib/synthesizer/synth-event-handler/
- [S24] Tempo-map implementations: oxisound-smf timing.rs https://docs.rs/crate/oxisound-smf/latest/source/src/timing.rs ; mido units.py https://sources.debian.org/src/python-mido/1.3.3-0.2/mido/midifiles/units.py ; mtrack midi_tempo.rs https://docs.rs/crate/mtrack/0.12.0/source/src/audio/midi_tempo.rs
- [S25] @tonejs/midi: https://github.com/Tonejs/Midi
- [S26] Cycling '74, Live Object Model and Live API overview: https://docs.cycling74.com/max8/vignettes/live_object_model , https://docs.cycling74.com/max7/vignettes/live_api_overview ; drift reports https://forum.ableton.com/viewtopic.php?p=1017834
- [S27] MIDI.org forum, velocity curves (GM2/DLS): https://midi.org/community/midi-specifications/how-do-controllers-calculate-velocity ; Csound ampmidid https://sources.debian.org/src/csound/1:6.18.1+dfsg-4/Opcodes/ampmidid.cpp
- [S28] Drum synthesis: Chris Lowis (Opera, now moved) https://dev.opera.com/articles/drum-sounds-webaudio ; Sonoport https://sonoport.github.io/synthesising-sounds-webaudio.html ; Browser Beats II https://dev.to/kabisasoftware/browser-beats-ii-synthesizing-a-snare-drum-and-a-hi-hat-463h
- [S29] iPlug2 ITimeInfo and forum: https://iplug2.github.io/docs/group___i_plug_structs.html , https://iplug2.discourse.group/t/sample-accurate-host-beat-sync/383 , https://iplug2.discourse.group/t/musescore-studio/1001
- [S30] Pangolin, How to synchronize laser light shows to music: https://pangolin.com/blogs/news/synchronize-laser-light-shows-to-music
- [S31] Derivative, TDAbleton: https://docs.derivative.ca/TDAbleton
- [S32] DJ TechTools, DJ visuals (Armin SMPTE from CDJs): https://djtechtools.com/amp/tag/dj-visuals/
- [S33] Ticket Fairy, Lighting for BPM festivals: timecode vs busking: https://www.ticketfairy.com/blog/lighting-for-bpm-festivals-timecode-vs-busking
- [S34] JUCE VBlankAttachment threads: https://forum.juce.com/t/vblankattachment-and-how-does-it-work/62645 , https://forum.juce.com/t/how-to-synchronously-repaint-layered-components/54159
- [S35] Cycling '74, Timing and synchronization in Max for Live: https://docs.cycling74.com/api/latest/max5/vignettes/live_timing
- [S36] plugsync~ reference and forum: https://docs.cycling74.com/max8/refpages/plugsync~ , https://cycling74.com/forums/m4l-get-correct-barbeat-count-with-time-signature-changes , https://forum.ableton.com/viewtopic.php?p=1792159
- [S37] Cycling '74 LOM Clip reference: https://docs.cycling74.com/apiref/lom/clip/
- [S38] Showsync tools (LiveGrabber, Videosync, Beam): https://showsync.com/tools
- [S39] Unity dspTime/PlayScheduled and interpolation: https://docs.unity3d.com/ScriptReference/AudioSource.PlayScheduled.html , https://gamedeveloper.com/programming/music-syncing-in-rhythm-games , https://itch.io/blog/744936/the-right-way-to-interpolate-the-audio-playback-time-unity
- [S40] Rhythm-game timing: https://seanking11.github.io/gamebootcamp/modules/32-rhythm-game , https://dev.to/skywalker_2de7de5f97df567/building-fair-rhythm-game-judgement-windows-in-javascript-1og9 , https://eve-ning.github.io/2024/10/04/hitsounds.html
- [S41] ITU-R BT.1359 / A-V sync: https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf , https://en.wikipedia.org/wiki/Audio-to-video_synchronization , https://tvtechnology.com/opinions/av-synchronization-how-bad-is-bad
- [S42] Bitwig API forum notes and TDBitwig: https://www.kvraudio.com/forum/viewtopic.php?p=8084867 , https://forum.juce.com/t/playback-position-resolution-and-beats/36048 , https://derivative.ca/UserGuide/TDBitwig_User_Guide
- [S43] Epic, Overview of Quartz: https://dev.epicgames.com/documentation/unreal-engine/overview-of-quartz-in-unreal-engine
- [S44] Epic forums, Quartz accuracy; Fortnite Quartz blog: https://forums.unrealengine.com/t/the-quantified-events-of-quartz-clocks-sometimes-inaccurate/2011578/3 , https://www.unrealengine.com/tech-blog/procedural-music-generation-with-quartz
- [S45] Synesthesia SSF audio uniforms: https://app.synesthesia.live/docs/ssf/audio_uniforms.html
- [S46] Synesthesia OSC (Troikatronix forum) and API gist: https://community.troikatronix.com/topic/8089.rss , https://gist.github.com/mattorp/1e62915fff14685a88c13d095fddf189
- [S47] Resolume forum and article on BPM/Link/MIDI clock/SMPTE: https://resolume.com/forum/viewtopic.php?p=84352 , https://resolume.com/forum/viewtopic.php?p=78517 , https://resolume.com/article/46
- [S48] Notch forum, exposed parameters via OSC/MIDI/TouchDesigner: https://forum.notch.one/t/notch-with-generative-audio/3080
- [S49] MIDI beat clock: https://en.wikipedia.org/wiki/MIDI_beat_clock ; spec copy https://www.lim.di.unimi.it/IEEE/MIDI/SOT3.HTM ; jitter thread https://community.vcvrack.com/t/rack-v2-still-has-midi-clock-jitter-issue-from-other-daws/14209
- [S50] MIDI timecode: https://en.wikipedia.org/wiki/MIDI_timecode ; Apple coreaudio-api archive https://lists.apple.com/archives/coreaudio-api/2005/Feb/msg00043.html
- [S51] Ableton Live 12 manual, Synchronizing with Link, Tempo Follower and MIDI: https://www.ableton.com/en/live-manual/12/synchronizing-with-link-tempo-follower-and-midi
- [S52] OSC 1.0 spec and time tags: https://opensoundcontrol.stanford.edu/spec-1_0.html , https://hexdocs.pm/oscx/time_tags.html , CNMAT 2003 https://www.cnmat.berkeley.edu/sites/default/files/attachments/2003_Open_Sound_Control_State_of_the_Art_2003.pdf
- [S53] grandMA3 manual, timecode: https://help.malighting.com/grandMA3/2.0/HTML/timecode.html , https://help.malighting.com/grandMA3/2.1/HTML/timecode_record_external.html
- [S54] MIDI Show Control format: https://www.etcconnect.com/WebDocs/Controls/EosFamilyOnlineHelp/en/Content/23_Show_Control/05_MIDI_Show_Control/Hexadecimal_MIDI.htm , https://help.malighting.com/grandMA2/en/help/key_remote_control_msc.html , https://groups.google.com/g/qlab/c/bTTDs06nXho
- [S55] DMX/Art-Net/sACN: https://support.enttec.com/dmx/dmx-basics/what-is-dmx512 , https://support.enttec.com/dmx/edmx-art-net-sacn-networking/art-net-vs-sacn-which-should-you-use , https://en.wikipedia.org/wiki/Art-Net
- [S56] QuickShow timeline BPM: https://wiki.pangolin.com/quickshow:timeline_bpm
- [S57] BEYOND music and beats overview: https://wiki.pangolin.com/beyond:music_and_beats_overview
- [S58] Pangolin forum, timeline vs BPM: https://forums.pangolin.com/threads/time-line-syncing-to-beat-or-other-method.16238 , https://forums.pangolin.com/threads/bpm-beatsync-and-cues-timelines.30092/latest ; BEYOND timeline overview https://wiki.pangolin.com/beyond:timeline_overview
- [S59] BEYOND timecode: https://wiki.pangolin.com/beyond:timecode ; TC4000 https://pangolin.com/blogs/news/pangolins-new-tc4000-smpte-timecode-reader-writer
- [S60] BEYOND audio tab and realtime audio: https://wiki.pangolin.com/beyond:audio_tab , https://wiki.pangolin.com/beyond:realtime_audio
- [S61] ILDA test pattern and scanner ratings: https://pangolin.com/blogs/news/laser-scanners-the-ilda-test-pattern , https://k1.spdns.de/Develop/Projects/pico/Laseroids/ILDA%20files/ILDA_TestPattern95_rev002.pdf , https://forums.pangolin.com/threads/ilda-8%C2%B0-graphics-flicker-less.28899
- [S62] ILDA IDTF rev 011: https://k1.spdns.de/Develop/Projects/pico/Laseroids/ILDA%20files/ILDA_IDTF14_rev011.pdf , Paul Bourke notes https://paulbourke.net/dataformats/ilda/
- [S63] Laser audience-scanning safety: https://ilda.com/audiencescanningsafety.htm , https://pangolin.com/pages/laser-show-safety
- [S64] Depence R4 laser module: https://pangolin.com/products/depence-laser-module , https://www.syncronorm.com/products/depence2/visualization/laser
