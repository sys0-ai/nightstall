# Signal processing for tight music-reactive visuals

Research report, 2026-11-21. Scope: onset detection, drum-specific detectors, beat and tempo tracking with prediction, end-to-end latency in the browser, feature conditioning, and music structure. The report covers both Web Audio and native code.

Conventions. **[S]** marks a claim taken from a cited source; the bracketed number refers to the source list at the end. **[Syn]** marks my own synthesis, arithmetic or recommendation. I computed the numbers marked [Syn] myself, mostly in a short Python check of the Blackman window and the IIR time constants, and they can be re-derived. Sample rate is 48 kHz unless stated otherwise.

---

## 0. Diagnosis of the current chain

[Syn] I read the current code (`display/music-levels.ts` and `display/audio-levels.ts` in the night-stall checkout). It does the following:

- `AnalyserNode` with `fftSize = 2048`, `smoothingTimeConstant = 0.45`, `minDecibels = -78`, `maxDecibels = -14`, read with `getByteFrequencyData` from `setInterval(…, 33)`.
- Each band takes the **maximum byte** over its bins, quantised to 1/64. Low is 0–250 Hz, mid is 250–2000 Hz, high is 2–16 kHz, and there are 12 log bands from 40 Hz to 16 kHz.
- Changed values are sent across to the view. The view calls `detectBeats()`, which computes `energy = 0.8·low + 0.2·mid` and `beat = max(beat·e^{-9·dt}, 3·(energy − baseline − 0.045))`. The baseline follows energy with a rate of 6/s (τ ≈ 167 ms). A 40 ms timer redraws between messages.

These choices explain both complaints.

1. **The FFT window itself lags.** A 2048-point Blackman window at 48 kHz is 42.7 ms long. The spec says the analyser uses a Blackman window with α = 0.16 [1]. I integrated the window to see how a sudden onset at the newest sample grows. Visible amplitude is 0.5 % of its final value after 5 ms, 4.9 % after 10 ms (−26 dB), 18.5 % after 15 ms, 50 % only at 21.3 ms (−6 dB), and 89 % after 30 ms. **A kick is effectively invisible to this analyser for about 12–15 ms and reaches half height at about 21 ms.**
2. **The smoothing runs per call, not per unit of time.** Chromium only runs a new FFT when `getFloatFrequencyData` or `getByteFrequencyData` is called with a later `current_time`. It then applies `k·prev + (1−k)·|X|` with k = `smoothingTimeConstant` [2][1]. The effective time constant is therefore τ = −T_call / ln k. For k = 0.45 and T = 33.3 ms, τ = 41.7 ms. For the spec default k = 0.8: τ = 149 ms at 30 Hz, 75 ms at 60 Hz, and 48 ms if polled every render quantum. Changing the poll rate silently changes the smoothing.
3. **Sampling and hops.** A 33 ms `setInterval` adds a uniform 0–33 ms wait (mean about 17 ms) plus main-thread jitter. Change-only messages plus a 40 ms redraw timer in the view add another frame or two. On top of that come the `requestAnimationFrame` wait (0–16.7 ms) and presentation, measured at 1–2 frames at 60 Hz in Chrome [3].
4. **The bass is weak because of the representation, not the speakers.**
   - The levels are max-of-bins in a dB-to-byte mapping over a 64 dB range. A kick that raises the 50–100 Hz band by 6 dB moves the value by only 6/64 ≈ 0.09.
   - A sustained bass line holds "low" near its ceiling, so the kick barely changes it.
   - At 23.4 Hz per bin, 40–65 Hz is one or two bins. The Blackman main lobe is ±3 bins wide, about ±70 Hz, so sub, kick and bass-line energy smear together.
   - The beat detector thresholds the **level** against a slow baseline. It does not look at the **rise** of the level (flux). It also mixes in mid (0.2), where vocals and pads leak.
5. **No prediction.** Everything reacts after detection. Nothing uses a tempo or phase model to fire on the next beat.

[Syn] Here is a rough lag estimate for a kick, from the sound being rendered to the visual reaching the eye, on wired output:

| Stage | ms |
|---|---|
| Window to half height | 21 |
| Smoothing (τ 42 ms, partial) | 15–25 |
| `setInterval` wait | 17 |
| Message and view timer | 5–20 |
| rAF wait plus presentation | 25–35 |
| **Total** | **≈ 85–120** |
| Head start: output latency, since the analyser taps the graph before the speaker | −10 to −40 |

The net result is roughly **50–100 ms late**. ITU-R BT.1359 puts the detectability threshold at **+45 ms of sound leading picture** and −125 ms of sound lagging picture [4]. Viewers are much more sensitive to "picture late" than to "picture early". **The current chain sits on the bad side of the threshold.**

---

## 1. Latency: the full chain and how to beat it

### 1.1 Source facts

- **Render quantum.** The AudioContext render quantum is 128 frames by default (2.67 ms at 48 kHz). A `"hardware"` size hint exists [1]. Chrome's AudioWorklet guide says the processor adds no internal buffering. Code that needs bigger blocks should use a ring buffer, and they recommend SharedArrayBuffer for efficiency [5]. Mozilla notes that MessagePort traffic allocates memory [5].
- **`baseLatency`** covers the latency from the AudioDestinationNode to the audio subsystem only [1].
- **`outputLatency`** is the estimated time from the browser handing a buffer to the OS until the first sample is processed by the output device. It varies with hardware and can change while the context runs, so it should be queried often [1][6].
  - Supported in Chrome 102, Edge 102, Firefox 70 and Safari 18.4 [7].
  - web.dev uses it to schedule video frame paint against what the listener actually hears, with Bluetooth earbuds as the motivating case [7].
  - Firefox's fingerprinting-resistance mode coarsens it, which leaves Bluetooth A/V sync off [8].
- **`getOutputTimestamp()`** returns `{contextTime, performanceTime}` [9].
  - `contextTime` is the context-clock time of the sample frame the output device is rendering now.
  - `performanceTime` estimates when that frame was rendered, on the `performance.now()` clock.
  - The same note says `currentTime − contextTime` is not a reliable latency estimate and points to `outputLatency` instead [1].
- **Bluetooth.** Measured A2DP latency varies widely:
  - one headset measured wired 7 ms, SBC 173 ms, aptX 166 ms;
  - an Android survey averaged SBC 308 ms, aptX 316 ms and AAC 369 ms;
  - aptX LL is about 38 ms [10].
- **Display.** A photodiode test of Chrome on Windows at 60 Hz found presentation delay "between one and two frames" after rAF drawing [3]. Chromium's compositor starts a frame at each vsync and waits up to a deadline for main-thread work [11].
- **A/V perception.** BT.1359-1 gives:
  - detectability at about +45 ms (sound early) to −125 ms (sound late);
  - acceptability at about +90 to −185 ms;
  - a film target of +22.5/−30 ms [4].

### 1.2 Latency budget (wired output, 60 Hz display)

[Syn] The table compares the current design (A), an AudioWorklet analyser that posts frames (B), and B plus output-clock alignment and beat prediction (C).

| Stage | A: current | B: AudioWorklet | C: B + alignment + prediction |
|---|---|---|---|
| Analysis window to onset visible | 21 (2048 Blackman) | 3–6 (biquad band + 1–3 ms envelope) or 5–11 (1024 FFT at 5.3 ms hop) | same as B, and beats are predicted, so 0 |
| Temporal smoothing | 42+ (per-call EMA) | 0 on attack (asymmetric follower) | 0 |
| Sampling wait | 0–33 | 2.7–5.3 (quantum or hop) | 2.7–5.3 |
| Hop to main thread or iframe | 1–5, plus 0–40 timer | 0.5–2 (SAB) or 1–4 (postMessage) | same |
| rAF wait | 0–16.7 | 0–16.7 | 0, because the frame renders "audio time at presentation" |
| Presentation | 16.7–33 | 16.7–33 | compensated, since the target time is the predicted present time |
| Head start from output latency | −(baseLatency + outputLatency), about −10 to −40 wired, −150 to −350 BT | same | used deliberately as lookahead |
| **Net visual lag** | **≈ +50 to +100** | **≈ +10 to +40** | **≈ −5 to +10 (wired), ≈ 0 (BT)** |

How to read it:

- With B alone, analysis is usually done *before* the sound reaches the ear, because output latency is a head start. The remaining lag is display latency. Rendering each frame for the audio time that will be audible when the frame is *presented* removes that too.
- With Bluetooth the head start is 150–300 ms. The analysis is always ahead, so the visual can be **delayed** to match exactly, with no prediction needed. That only works if `outputLatency` reports the Bluetooth path. Verify this per platform; I have not confirmed it for every browser and OS pair.

### 1.3 Two clocks, one timeline

[S] Chris Wilson's "A Tale of Two Clocks" schedules audio events on the Web Audio clock. A `setTimeout` loop wakes every 25 ms and schedules anything in the next 100 ms of `currentTime`. Visuals are driven by a queue of scheduled note times that `requestAnimationFrame` compares against `audioContext.currentTime` [12].

[Syn] The modern version of that idea has one rule: every feature frame carries the **context time of its newest sample**. The renderer converts a display time into an *audible context time* and looks up or extrapolates features at that time.

```ts
// main thread, once per rAF
function audibleContextTime(ctx: AudioContext, rafNow: number, displayLagMs: number): number {
  const ts = ctx.getOutputTimestamp();              // {contextTime s, performanceTime ms}
  const presentAt = rafNow + displayLagMs;          // predicted photon time (≈ 1–2 frames)
  return ts.contextTime! + (presentAt - ts.performanceTime!) / 1000;
}
// features[] is a ring of {t: contextTime of frame end, ...}. Sample it at
// A = audibleContextTime(...). If A <= newest.t: interpolate (exact sync).
// If A > newest.t: hold continuous features; take beat impulses from the
// predicted beat grid (section 3), never from a not-yet-seen onset.
```

- `displayLagMs` should start at 1.5 frame periods, so 25 ms at 60 Hz. Expose a user offset slider of ±50 ms, as rhythm games do. Treat it as a calibration constant per output device.
- **A file or MIDI player we control** needs no detection to sync. Every note-on or sample has a known context time `T`. Schedule the visual at `performanceTime + (T − contextTime)·1000`.
  - For decoded files, run the **offline** analysis once in a worker at decode time. Use non-causal peak picking, Ellis DP or a madmom-style beat grid, downbeats and section novelty (sections 2–6).
  - Then play the timeline back against the output clock. This is the single biggest quality win available: offline beat tracking reaches F ≈ 0.89–0.94 on standard sets [13][14], and onsets can be placed with ±5 ms accuracy.
- **Live, opaque audio** (radio, mic, another tab) needs the causal path below.

---

## 2. Onset detection

### 2.1 Detection functions

The source definitions are as follows. X(n,k) is the STFT, H(x) = (x+|x|)/2 is half-wave rectification, and n is the frame.

- **Energy / local energy** [S]: the energy of the frame smoothed by a short kernel. Its difference works only for "strong percussive transients against a quiet background" [15].
- **HFC** [S]: HFC(n) = Σ_k k·|X(n,k)|. This is aubio's code, which weights by (j+1) [16]. It gives sharp peaks on percussive attacks but is "less robust at detecting the onsets of low-pitched and non-percussive events" because it de-emphasises low frequencies [15].
  - It is aubio's default method [17].
  - A hard real-time percussion detector picked aubio HFC as the most accurate of the Pure Data options it tested, with a 30 ms refractory period [18].
  - [Syn] **Do not use HFC for kicks.** It is deliberately blind to them.
- **Spectral flux** [S]: SF(n) = Σ_k H(|X(n,k)| − |X(n−1,k)|) [19][20].
- **Log-filtered spectral flux (LogFiltSpecFlux)** [S]:
  - Filter |X| with a semitone-spaced triangular filterbank. Böck's version has B = 82 bands, 27.5 Hz–16 kHz, filters **not** area-normalised, which tilts emphasis upward much as HFC does.
  - Compress with X_log = log(λ·X_filt + 1), then take SF on that [20].
  - The log makes the difference a ratio, so it is robust to volume. Online F-measure rose from 74.5 (plain SF) to 76.1 (SF log) to **80.3 (SF log filtered)**, close to the RNN OnsetDetector.LL at 81.7 [20].
  - Adaptive whitening P_{n,k} = max(|X|, r, m·P_{n−1,k}) with m = 10 and r = 0.005 helped every detection function at lower volumes [20].
- **SuperFlux** (Böck & Widmer 2013) [S] [19]:
  - N = 2048 Hann window and **200 fps**, i.e. a hop of 220.5 samples at 44.1 kHz.
  - Filterbank: 138 quarter-tone triangular filters, 27.5 Hz–16 kHz, not normalised. X_log = log10(X·F + 1).
  - Maximum filter across frequency: X^max(n,m) = max(X_log(n, m−1 : m+1)).
  - SF*(n) = Σ_m H(X_log(n,m) − X^max(n−μ, m)).
  - μ = max(1, ⌊(N/2 − min{n : w(n) > r})/h + 0.5⌋) with r = 0.5, which gives **μ = 2 at 200 fps**. Differencing frames further apart makes the peaks larger and *closer to the true onset*, which "renders lag compensation in the final peak-picking unnecessary."
  - It cuts vibrato false positives by up to 60 %. Online F on the Böck set is 0.820, against 0.801 for LogFiltSpecFlux and 0.821 for the RNN OnsetDetectorLL [19].
  - librosa implements it as `onset_strength(lag=μ, max_size=3)` using `maximum_filter1d` along frequency [21].
- **Complex domain** [S]:
  - Predict the current bin from the previous two frames, assuming constant amplitude and constant phase advance: X_T = |X(n−1,k)|·e^{j(2φ(n−1,k) − φ(n−2,k))}. Then CD(n) = Σ_k |X(n,k) − X_T(n,k)| [20][16].
  - The rectified form counts only bins whose magnitude grew [22]. librosa computes it only where mag ≥ ref_mag [21].
  - BTrack's default detection function is complex spectral difference with half-wave rectification on 1024-sample frames at hop 512 [23].
  - Böck found CD and weighted phase deviation worse than SF-log-filtered online: 71.1 and 69.7 against 80.3 [20].
- **Weighted phase deviation** [S]: WPD(n) = (2/N) Σ_k |X(n,k)·φ″(n,k)| [20][22].
- **Mel flux** [S]: Ellis's beat tracker resamples to 8 kHz and uses a 32 ms window with a 4 ms hop. It maps to 40 Mel bands, converts to dB, takes the first-order difference, half-wave rectifies, sums across bands, then high-passes at about 0.4 Hz [24]. Essentia's `melflux` is the same idea [25].

[Syn] **The detection function to use for live visuals** combines these:

- log magnitude, log(1 + λX) with λ ≈ 1–10 on linear magnitudes;
- a log-spaced filterbank of 3–4 bands per octave for visuals (Böck's 12 bands per octave is overkill);
- a SuperFlux 3-band maximum filter and μ ≈ 10 ms back;
- half-wave rectification;
- a sum per **region** (sub, low, mid, high) rather than a single global sum.

Scheirer showed that rhythm survives as amplitude envelopes in a handful of bands but is destroyed if the bands are summed before analysis. "A rhythmic processing algorithm should treat frequency bands separately, combining results at the end" [26].

### 2.2 Thresholding and peak picking

[S] **Böck online peak picking** [20][19]. Frame n is an onset if all three hold:
1. ODF(n) = max(ODF(n − w1 … n + w2));
2. ODF(n) ≥ mean(ODF(n − w3 … n + w4)) + δ;
3. n − n_last > w5.

- Online settings: w2 = w4 = 0. At 100 fps the best values were w1 = 3, w3 = 4–12, w5 = 3 [20].
- SuperFlux in time units: pre_max 30 ms, post_max 30 ms (0 online), pre_avg 100 ms, post_avg 70 ms (0 online), combination width 30 ms [19].
- Online detections arrived *one frame early* relative to the perceptual annotation, so the authors reported one frame later [20]. Detection is not the bottleneck: the signal change precedes perception.

[S] **librosa `onset_detect` defaults** are "found by large-scale search" [21]:
- pre_max = 30 ms, post_max = 0 ms + 1 frame;
- pre_avg = 100 ms, post_avg = 100 ms + 1 frame;
- wait = 30 ms, delta = 0.07 on an envelope normalised to [0,1].
- The defaults are 22.05 kHz, n_fft 2048 and hop 512, so 23 ms frames [21].

[S] **aubio** [17][27][16]:
- The peak picker low-passes the ODF with a 2nd-order Butterworth (cutoff 0.34 of Nyquist, run as filtfilt over a short buffer).
- Threshold = median + mean·threshold over a window of win_post = 5 future and win_pre = 1 past frames, then a 3-point local-max test. **The 5-frame look-ahead is real latency**: 5 hops, 26.7 ms at hop 256 and 48 kHz.
- Defaults: buffer 512, hop 256, minioi 50 ms in code (the CLI doc says 20 ms), silence −70 dB (CLI doc −90), threshold 0.3. Method-specific values: hfc 0.058, complex 0.15, specflux 0.18 with log compression 10 and adaptive whitening.
- A constant `delay = 4.3·hop` is subtracted from reported onset times to compensate the window and peak-picker lag.

[S] **Bello et al.** recommend a percentile threshold over a mean, because a mean is dragged up by large peaks and masks the smaller peaks next to them: δ̃(n) = δ + λ·median|d(n−M … n+M)|. They normalised the detection function (subtract mean, divide by max absolute deviation) and low-passed it first [15]. **BTrack** subtracts a moving mean over [i−8, i+7] and clips at zero [23].

[Syn] Real-time recipe at 200 fps (5 ms hop):
- `pre_max` = 30 ms, `post_max` = 0–5 ms (one frame buys large precision gains at a 5 ms cost);
- `pre_avg` = 100–150 ms;
- threshold = mean or median of the window + δ, plus a slow floor (below);
- `min_ioi` = 30 ms for hats, 60–80 ms for kick and snare (a kick roll at 32nds at 180 BPM is 41 ms);
- quadratic interpolation of the peak position for sub-frame timing, as aubio does with `fvec_quadratic_peak_pos` [27].

### 2.3 Frame, hop and resulting latency

| Setting | Window | Hop | Detection latency (window centre + hop + post_max) | Source |
|---|---|---|---|---|
| Böck online | 2048 at 44.1k = 46 ms, right-aligned | 10 ms | ~23 + 10 | [S][20] |
| SuperFlux | 2048 = 46 ms | 5 ms | μ-differencing pulls peaks to the onset; ≈ 10–20 | [S][19] |
| Böck RNN onset | 512, 1024, 2048 right-aligned, 100 fps | 10 ms | the shortest window reacts in ~6 ms | [S][28] |
| aubio default | 512 | 256 | 5.3 + 5×5.3 (peak-picker look-ahead) ≈ 32 | [S][27] |
| Essentia complex | 1024 at 44.1k | 512 (11.6 ms) | ~23 | [S][25] |
| Hard RT percussive | 256-sample window, at least 5.8 ms after the ODF peak | — | ~6 + fusion deadline | [S][18] |
| **Proposed** (48k) | 1024 Hann (21 ms) for flux; biquad bands for kick | 240 (5 ms) | flux ≈ 8–13; kick band ≈ 4–8 | [Syn] |

[S] Böck's online RNN uses three STFTs at once, 11.6, 23.2 and 46.4 ms, with the windows' right edges aligned to "now". Differences are taken τ = 1, 2 and 4 frames back, so successive frames overlap by 0.5 [28]. [Syn] This is the cleanest trick in the literature for latency without losing bass resolution: **short windows for timing, long windows for frequency, both ending at the current sample.**

### 2.4 Real-time versus offline

[S]
- Offline peak picking can use future frames (w2 = 3, w4 = 1). Böck found only about a 0.25 % F gain offline for simple detection functions [20].
- The bidirectional RNN gains much more: 86.6 offline against 81.7 online, mainly in recall [20].
- Offline SuperFlux is 0.836 against 0.820 online [19].

[Syn] For live visuals the causal penalty is small. The real costs are window length and smoothing, not causality.

---

## 3. Kick, snare and hat detectors

### 3.1 Bands

[S]
- Drum transcription reviews describe the kick's energy concentrated low. Around 55 Hz "the initial transient is followed by a slow decay spread over several hundred milliseconds". Tzanetakis-style systems band-pass the kick at **30–280 Hz** and the hi-hat at **2.7–5.5 kHz** [29].
- Mixing references put:
  - kick fundamental at 40–150 Hz with the core at 50–80 Hz;
  - beater click at 2–5 kHz (up to about 7–8 kHz);
  - snare body at 150–250 Hz, with crack variously 2–3.5 kHz or around 8 kHz;
  - hi-hat harshness at 3–7 kHz [30].

[Syn] Proposed visual bands (48 kHz):

| Detector | Band(s) | Filter | Envelope attack / release | min IOI |
|---|---|---|---|---|
| Sub | 25–60 Hz | LR4 HP 25 + LR4 LP 60 | 5 / 120 ms | — (continuous) |
| **Kick** | body 45–120 Hz **AND** click 2–5 kHz | LR4 band 45–120; BP 2–5k | 0.5–1 / 30–50 ms (peak), log | 70 ms |
| Bass line (to subtract) | 60–250 Hz, sustained | from the same LR4 tree | 30 / 300 ms | — |
| **Snare** | body 150–250 Hz + noise 2–8 kHz, with spectral flatness gating | LR4 band; BP 2–8k | 1 / 60 ms | 80 ms |
| **Hat / cymbal** | 7–16 kHz (closed hats are short, under 50 ms) | LR4 HP 7k | 0.3 / 20 ms | 30 ms |
| Vocal / lead "presence" | 1–4 kHz | band | 10 / 200 ms | — |

[Syn] Discriminating rules, all cheap. Each band has a log envelope L_b and a rectified rise D_b(n) = H(L_b(n) − max_{j∈[n−μ, n−1]} L_b(j)) with μ ≈ 8–12 ms, which is SuperFlux's max filter in time.

- **Kick** = D_sub+body crosses its adaptive threshold, and within ±10 ms D_click > 0 *or* the rise is at least 6 dB, *and* the 150–250 Hz rise is smaller than the 45–120 Hz rise. That last condition rejects snare and tom bleed.
- **Snare** = D_noise(2–8 kHz) rise, plus body energy, plus high spectral flatness. Snares are noise and hats are noise too, but snares also carry 150–250 Hz energy.
- **Hat** = D(7–16 kHz) with *no* simultaneous low rise.
- **Bass-line suppression.** Sustained bass notes do not rise like a kick. Using flux (rise) instead of level, and log ratios instead of linear values, already subtracts the bass line. A note change in the bass is rejected by the "must also show click or ≥ 6 dB rise in under 15 ms" rule, because kicks attack in 1–5 ms and bass notes in 10–50 ms.

### 3.2 Filterbank: biquads or FFT bins

[S]
- LR4 is two cascaded 2nd-order Butterworth sections, Q = 1/√2 each, giving 24 dB/octave. Each output is −6 dB at crossover and the pair sums flat with outputs in phase [31][32].
- The RBJ cookbook gives the biquad coefficients [33].
- Scheirer used six bands with sixth-order elliptic filters: < 200, 200–400, 400–800, 800–1600, 1600–3200, > 3200 Hz. He rectified and smoothed each with a 200 ms half-Hanning window, then took the derivative and half-wave rectified it [26].

[Syn] Trade-off:

| | Biquad (time domain) | FFT bins |
|---|---|---|
| Latency | group delay only. LR4 at 120 Hz ≈ 2√2/(2π·120) = **3.75 ms** at DC; LR4 at 150 Hz ≈ 3.0 ms; plus the envelope attack (≤ 1 ms) | window centre: 1024 → 10.7 ms, 2048 → 21.3 ms |
| Bass resolution | arbitrary (a 45–120 Hz band is exact) | 2048 at 48k = 23.4 Hz per bin, Blackman lobe ±70 Hz |
| Cost | about 10 biquads × 48k = trivial in an AudioWorklet | one FFT per hop |
| Best for | kick, sub, snare body, hat triggers; level meters | flux across many bands, timbre, centroid, flatness |

**Use both.** Biquads give the drum triggers and band levels at about 5 ms latency. A 1024-point FFT at a 5 ms hop gives broadband flux, centroid and flatness. Never compute low-band levels from a 2048 analyser.

### 3.3 Envelope followers

[Syn]
- **Asymmetric one-pole on |x| or x²**: y += (x − y)·(1 − e^{−T/τ}), with τ = τ_att when x > y and τ_rel otherwise.
  - Kick peak follower: τ_att 0.5–1 ms, τ_rel 30–50 ms. A 50 Hz cycle is 20 ms, so the release must exceed one cycle to avoid ripple.
  - Alternatively use RMS over 5 ms, which ripples at 2·f0 for low tones, then the peak follower.
- Run it at sample rate inside the worklet and decimate to the control rate (every 128-frame quantum, or every 64 frames) for the onset logic.
- **Sidechain-style ducking signal.** The "kick envelope" that drives visuals should be shaped like a compressor's sidechain:
  - instant attack (≤ 1 ms);
  - hold of about 20 ms;
  - release of about 120–250 ms, depending on tempo, ideally ~0.4 × beat period.
  - Driving it from **detected kick events** (a triggered envelope) instead of from the raw band level gives the same punch on every kick, regardless of mix level.

### 3.4 Drum transcription for reference

[S] The review lists NMF and NMFD (template decomposition) and RNN systems. RNNs give the best F-measure on several sets and NMFD is competitive. Real-time variants exist (Dittmar & Gärtner 2014, Miron et al.), but bidirectional RNNs "are generally unsuitable for real-time applications" [29]. [Syn] For visuals, band triggers plus flux rules are enough. A small causal ML model, such as a GRU at 100 fps on 3 stacked log-mel frames, is the next step if false triggers remain a problem.

---

## 4. Tempo, beat phase and prediction

### 4.1 Tempo estimation

[S] **Ellis 2007** [24]:
- Tempo period strength TPS(τ) = W(τ)·Σ_t O(t)O(t−τ), with a log-Gaussian prior W(τ) = exp(−½(log2(τ/τ0)/σ_τ)²).
- Best fit to human tapping: **τ0 = 0.5 s (120 BPM), σ_τ = 1.4 octaves**.
- A secondary tempo is chosen from {0.33, 0.5, 2, 3}× the primary.
- The tempo pick was later improved by adding TPS resampled to ½ and ⅓ before taking the peak.

[S] **BTrack** (Stark), from source [23]:
- Detection-function buffer of 512·512/hop samples at hop 512, i.e. 512 frames ≈ 5.9 s.
- The function is resampled to 512 points, adaptive-thresholded and autocorrelated (via FFT).
- A **comb-filter bank** sums the ACF at multiples a = 1…4 of each candidate lag with spread (2a−1), weighted by a **Rayleigh** curve with parameter 43 (in lag units, peaking near 120 BPM).
- 41 tempo states with a Gaussian tempo-transition matrix (σ = 41/8) are decoded Viterbi-style.
- Tempo is re-estimated **once per beat**.

[S] **Scheirer 1998** [26]: a bank of comb-filter resonators per band, on 200 Hz envelopes. Each resonator's gain gives a half-energy time of 1500–2000 ms, which "seems to give results most like" humans. The phase is read from the resonator delay lines, which also give a **prediction vector** whose peak is the next beat. He ran it in real time at 75 Hz envelopes with 50 resonators per band [26].

[S] **madmom DBN** [34][35]:
- Bar-pointer HMM over (position in beat, tempo). min_bpm 55, max_bpm 215.
- Tempo transitions P ∝ exp(−λ·|τ_new/τ_old − 1|) with **λ = 100**, so changes are rare.
- observation_lambda = 16: the first 1/16 of each beat period is "beat" states.
- The online mode uses the forward algorithm instead of Viterbi and reports only beats more than 60/max_bpm apart.
- RNN input: online = one 2048 frame, 12 bands per octave, 30 Hz–17 kHz, log(1+x), positive differences at diff_ratio 0.5, 100 fps.

[S] **Online accuracy** on GTZAN [36]:

| System | Beat F | Downbeat F | Compute (s) |
|---|---|---|---|
| Aubio | 57.1 | — | 0.1 |
| IBT | 69.0 | — | 4.9 |
| Böck ACF | 64.6 | — | 7.0 |
| Böck FF | 74.2 | — | 2.2 |
| DLB | 73.8 | — | 21.3 |
| BeatNet | 75.4 | 46.5 | 8.9 |
| 1-D state space | 76.5 | 42.6 | 0.29 |

Offline comparison: Böck 2016 joint beat and downbeat reaches beat F 0.938 and downbeat 0.863 on Ballroom [14]. Beat This (2024) reaches F1 89.1 and downbeat 78.3 averaged over sets, with no DBN, using 22.05 kHz input, 128 mel bands from 30 Hz to 10 kHz, hop 441 (50 fps) and ln(1+1000x) [13].

### 4.2 Phase and prediction

[S] **Ellis DP** [24]:
- C*(t) = O(t) + max_{τ∈[t−2τp, t−τp/2]} {α·F(t−τ, τp) + C*(τ)}, with F(Δt, τ) = −(log(Δt/τ))².
- α = 680 was best on MIREX-06, and scores barely changed over three orders of magnitude of α.
- It assumes one tempo, so it is "not suitable for material containing large variations."
- librosa: `beat_track(start_bpm=120, tightness=100)`, local score = onset envelope convolved with a Gaussian of width fpb/32 [37].

[S] **BTrack makes the DP causal and predictive** [23]:
- Cumulative score per frame: CS(n) = (1−α)·O(n) + α·max_{v∈[−2P, −P/2]} W1(v)·CS(n+v), with **α = 0.9**, W1(v) = exp(−(tightness·log(−v/P))²/2) and **tightness = 5**.
- At the mid-point between beats it **synthesises the future**: CS is extended over one beat period with O = 0 and α = 1.
- The future CS is multiplied by a Gaussian expectation window W2 centred P/2 ahead, and the argmax gives `timeToNextBeat`.
- The next prediction is scheduled at `timeToNextBeat + P/2`.
- `beatDueInFrame` fires when the counter reaches zero. That is a *prediction made half a beat in advance*, not a detection.

[S] **Oscillator / PLL view.**
- Large & Kolen's nonlinear oscillator adjusts its phase and period whenever an onset falls inside its expectation pulse [38].
- Sethares & Arora formalise adaptive wavetable oscillators:
  - phase β ← β + μ·LPF{x·dw/dβ};
  - frequency α ← α + μ_α·LPF{x·dw/ds}, with μ_α ≪ μ.
  - A pulse-shaped table (Gaussian or Large–Kolen) is insensitive to events between pulses.
  - Locking converges in a few seconds from a 10 % period error, but can lock at 2:1, 1:2 or 3:2 [39].

[Syn] **A tracker that fits visuals.** It is a hybrid: periodicity from autocorrelation, phase from a PLL, and BTrack-style prediction.

1. ODF at 100–200 Hz: the sum of the band rises, weighting low bands up (kick and snare carry the beat).
2. Every 0.5 s, compute the ACF of the last 6–8 s, multiply by Ellis's log-Gaussian prior (120 BPM, 1.4 octaves) and apply a comb-sum over 4 multiples (BTrack). Pick the period with hysteresis: switch only if the new peak beats the current one by 15 % for two consecutive estimates.
3. **PLL for phase.** Keep φ ∈ [0,1) and period P. Each frame, φ += Δt/P. At a detected onset of strength s, phase error e = wrap(φ_onset − round(φ_onset)) in [−0.5, 0.5].
   - If |e| < 0.15 (inside the expectation window): φ −= k_φ·s·e and P −= k_P·s·e·P.
   - Use k_φ ≈ 0.1–0.2 and k_P ≈ 0.01–0.02, a 2nd-order loop with a critically damped feel.
   - Ignore onsets outside the window, which is the pulse-shaped wavetable idea [39].
4. **Confidence** = the ratio of the ACF peak to the median, times the fraction of recent beats that had a matching onset. When it is low, fall back to reactive onsets and fade out predicted pulses.
5. **Output for the renderer**: `{period, phase at contextTime t0, confidence, nextBeatContextTime = t0 + (1−φ)·P, barPhase}`. The renderer computes phase at the audible time A as φ(A) = φ0 + (A − t0)/P. **The visual fires exactly on the beat, with zero detection lag, even through Bluetooth or a slow display.**
6. **Tempo changes.**
   - A sudden change shows up as consistent phase errors of the same sign, or the ACF winner changing. Reset P and keep the phase at the latest strong onset.
   - A gradual change is absorbed by the k_P loop.
   - Breakdowns with no drums: the PLL free-runs at the last P (Sethares: "continues at the adapted frequency even after the input ceases" [39]). Decay confidence with τ ≈ 4 beats.

### 4.3 Downbeats and bars

[S]
- madmom's bar tracker and the 1-D state space track bar position jointly with beats [14][36].
- Joint models reach downbeat F ≈ 0.86 offline on Ballroom [14] but only 0.43–0.47 online on GTZAN [36].
- For EDM, Yadati et al. note that the drop is "the re-introduction of the full bassline" after a build [40].

[Syn] Cheap online downbeat heuristic for 4/4 dance music:
- Keep 4 phase hypotheses (beat index mod 4).
- Score each by accumulating kick strength on that beat, minus snare strength on it (kick on 1 and 3, snare on 2 and 4 in rock and pop; four-on-the-floor needs other cues).
- Add bass-note-change and chroma-change novelty at that beat, plus big crash or cymbal onsets, which favour beat 1.
- Pick with hysteresis over 8–16 bars. Expect it to be wrong regularly, so keep bar-level visuals subtle unless confidence is high or the track is file-based with an offline downbeat grid.

---

## 5. Feature conditioning

### 5.1 Perceptual scales and weighting

[S]
- Mel, Bark and constant-Q filterbanks all beat linear SF by similar amounts at similar band counts [20].
- Meyda exposes 24-band Bark specific loudness plus total, perceptual sharpness (0 = bass drum, 1 = snare), spectral flux, centroid and RMS. The values are unnormalised; the docs suggest normalising to the loudest value seen so far [41].
- BS.1770 K-weighting is a high-shelf pre-filter of about +4 dB above ~1.5 kHz followed by an RLB high-pass at ~38 Hz. At 48 kHz:
  - shelf: b = [1.53512486, −2.69169619, 1.19839281], a = [1, −1.69065929, 0.73248077];
  - high-pass: b = [1, −2, 1], a = [1, −1.99004745, 0.99007225] [42].
- EBU Tech 3341 defines:
  - **momentary loudness** on a sliding 0.4 s rectangular window and **short-term** on a 3 s window, both ungated;
  - live meters updating at ≥ 10 Hz and no extra ballistics allowed;
  - integrated loudness gated absolutely at −70 LUFS and relatively at −10 LU.
  - BS.1771-1's IIR variant uses τ = 0.4 s, and EBU has "indications that a time-constant smaller than 0.4 s might be preferable" [43].

[Syn]
- Use **K-weighted momentary loudness (400 ms)** as the "overall intensity" feature. Use short-term (3 s) as the reference for structure. Do *not* use K-weighting for bass visuals: it cuts below 60 Hz by design.
- For bass, visualise the **sub/kick band in dB relative to its own running statistics** (5.2), not on an absolute scale.

### 5.2 Adaptive normalisation (AGC per band)

[S] MilkDrop's audio variables are relative: "bass … 1 is normal; below ~0.7 is quiet; above ~1.3 is loud", and `bass_att` is a time-damped version. Presets use `bass_att > 1` as "spiking" [44]. That is per-band normalisation to a long-term level, the approach that made MilkDrop feel punchy on any mix.

[Syn] A robust version in dB:

```
L_b(n)  = 10·log10(e_b(n) + 1e-10)                    // band energy in dB
floor_b = running P10 of L_b over 8 s (or slow min-follower: rise τ 4 s, fall τ 0.3 s)
ceil_b  = running P95 of L_b over 8 s (or peak follower: rise τ 0.05 s, fall τ 3 s)
span_b  = max(ceil_b − floor_b, 12 dB)                 // never expand noise into full scale
v_b     = clamp((L_b − floor_b) / span_b, 0, 1)
v_b'    = v_b^γ, γ ≈ 1.5–2.5 for punch (expansion), 0.6–0.8 for smooth fills
gate:   if ceil_b < −60 dBFS (or momentary < −70 LUFS) → v_b = 0 with a 300 ms fade
```

- Running percentiles can be done cheaply with a 64-bin histogram per band over a ring of the last ~8 s at 50 Hz.
- The 12 dB minimum span stops a quiet intro or a compressed master from turning noise into strobing.
- The expansion exponent is the "bass punch" knob. It restores the contrast that heavy mastering removes.

### 5.3 Attack and release choices

[Syn] Grounded in the source time constants above (Scheirer's 200 ms envelope, EBU 400 ms, BTrack's per-beat cadence):

| Visual role | Attack | Release | Drive from |
|---|---|---|---|
| Kick flash, scale pop, camera kick | 0 (event) to 1 ms | 80–150 ms, or ~0.3–0.4 × beat period | kick **events**, strength = rise in dB |
| Snare / clap flash | 0–2 ms | 60–120 ms | snare events |
| Hat sparkle / particles | 0–1 ms | 20–50 ms | hat events |
| Bass "weight" (size, glow) | 10–20 ms | 150–300 ms | normalised sub band |
| Overall energy, colour saturation | 50–100 ms | 400–800 ms | K-weighted momentary loudness |
| Brightness / hue drift | 200–500 ms | 1–2 s | spectral centroid (log Hz) |
| Section / scene changes | — | — | novelty plus bar grid (section 6) |

Rules:

- **Never put a symmetric EMA on a trigger feature.** A symmetric EMA adds lag on attack equal to its τ.
- Use asymmetric followers, fast up and slow down, applied **in dB**. A linear-domain release looks like a sudden drop followed by a long tail. A dB-domain linear release looks like a steady fade and reads as musical decay.
- For events, draw an envelope triggered from the event time: `env(t) = s·exp(−(A − t_event)/τ_rel)`. Evaluate it at the audible time A, so it starts exactly on the event's audible time.

### 5.4 Flicker and hysteresis

[Syn]
- Trigger on at v > θ_on (0.6) and re-arm only after v < θ_off (0.4), plus a min-IOI refractory period (sections 2.2 and 3.1).
- Rate-limit full-screen flashes to ≤ 3 per second. Photosensitivity guidelines such as WCAG 2.3.1 limit general flashes to 3 per second.
- At 16th-note hats (8 per second at 120 BPM), use small localised elements, not full-field luminance.
- Quantise visual "cuts" to the beat grid when confidence is high. Scene changes on a bar line look intentional; mid-bar changes look like errors.

---

## 6. Music structure: novelty, builds, drops, silence

[S]
- **Foote novelty**: compute a self-similarity matrix of features and slide a checkerboard kernel (often Gaussian-tapered) along the diagonal. Peaks mark transitions between homogeneous blocks. The kernel width sets the time scale, and a raw novelty curve over-segments without smoothing [45].
- **EDM drops** (Yadati et al. 2014): segment, then classify the boundaries.
  - Chroma-based segmentation (Foote-style) put a boundary on average **2.5 s** from the true drop and missed fewer than 8 % of drops. Segments averaged 16.5 s.
  - The classifier used spectrogram statistics, MFCC with 50 ms windows and 50 % overlap, and rhythm features.
  - The build is clearly visible in the spectrogram before the drop [40].
- Short-term loudness on a 3 s window and absolute silence gating at −70 LUFS come from EBU and ITU [43].

[Syn] Real-time structure features for visuals, all computed at 10–20 Hz:

| Feature | Computation | Use |
|---|---|---|
| Energy trend | slope of short-term (3 s) loudness over the last 4–8 s; also the ratio of momentary (0.4 s) to a 30 s average | intensity arc, camera distance |
| Build / riser | rising spectral centroid (log Hz) over ≥ 2 bars, **plus** rising flatness (noise sweeps), **plus** onset density rising (snare rolls double), **plus** a sub band dropping out (v_sub falls below 0.2 for ≥ 1 bar while total loudness holds) | build-up tension: tighten, accelerate, desaturate |
| Drop | after a build, v_sub returns to above 0.7 within ±1 frame of a predicted downbeat; confirm by a kick event | the big moment: fire on the **predicted** downbeat if build confidence is high |
| Breakdown | kick events absent for ≥ 2 bars while loudness stays above the gate | free-run the PLL, switch visuals to swell mode |
| Section change | Foote novelty on beat-synchronous chroma + MFCC + band energies, kernel ±4–8 bars (in beats, not seconds); online it is delayed by half the kernel | scene change on the next bar line after the confirmed novelty peak; for file playback use offline novelty |
| Silence | momentary loudness < −60 LUFS (or band max < −70 dBFS) for 300 ms; resume on the first onset | fade to idle; reset AGC slowly, not instantly |

Notes:

- Online novelty cannot see a section boundary until half a kernel after it.
- In dance music, phrases are 8, 16 or 32 bars. A novelty peak can be snapped back to the nearest phrase boundary of the bar grid, and the *next* boundary can be anticipated.
- **For file playback, do all of this offline in a worker at decode time.** Every section, build and drop then becomes a timeline event scheduled on the audio clock.

---

## 7. Proposed real-time architecture

### 7.1 Data flow

[Syn]

```
AudioNode (master) ──► AudioWorkletNode "rhythm" (side branch, outputs nothing)
   inside the worklet, per 128-frame quantum:
     • biquad tree (LR4): sub, kick-body, bass, snare-body, presence, click, snare-noise, hat
     • per-band asymmetric peak envelope (at sample rate), decimated to 375 Hz
     • ring buffer → every 240 samples (5 ms): Hann-1024 FFT → log-filtered SuperFlux,
       centroid, flatness, K-weighted momentary loudness (400 ms running sum)
     • per-band onset detectors (rise + adaptive threshold + min-IOI)
     • ODF → tempo (ACF every 0.5 s) + PLL phase + prediction
     • writes frames into a SharedArrayBuffer ring {t_ctx, bands[8] dB, rises[8], events bits,
       loudness, centroid, phase, period, confidence, nextBeat_t}
     (postMessage fallback: batch 4 frames = one message per 20 ms, transferables)
Main thread / view iframe, per rAF:
     A = audibleContextTime(ctx, rafNow, displayLag)   // section 1.3
     read ring frames up to newest; interpolate continuous features at A;
     events with t_event ≤ A since last frame → trigger envelopes at their t_event;
     beat pulses from phase model at A (predictive);
     AGC / curves / hysteresis → visual parameters
```

Cross-origin iframe hop. SharedArrayBuffer needs cross-origin isolation (COOP/COEP); I took this from general knowledge, so verify it against the sandboxed view host. If the view is sandboxed without it:

- Forward frames over `MessagePort` in batches.
- Send the **context-clock timestamps** and the latest `getOutputTimestamp()` pair with them, so the view can compute A itself.
- Never add a timer between source and render. The view renders on its own rAF from the latest data.

### 7.2 AudioWorklet pseudocode

```js
// rhythm-processor.js  (AudioWorkletGlobalScope; sampleRate, currentFrame are globals)
const HOP = 240;                     // 5 ms at 48 kHz → 200 fps control rate
const FFT_N = 1024;                  // 21.3 ms Hann window, right-aligned at "now"
const MU = 2;                        // SuperFlux frame distance (10 ms at 200 fps)
const BANDS = ['sub','kick','bass','snareBody','presence','click','snareNoise','hat'];

class Biquad { /* RBJ cookbook DF2T; process(x) */ }
function lr4(type, f){ return [new Biquad(type,f,Math.SQRT1_2), new Biquad(type,f,Math.SQRT1_2)]; }

class Follower {                     // asymmetric one-pole on |x|, tau in seconds
  constructor(att, rel){ this.a=Math.exp(-1/(att*sampleRate)); this.r=Math.exp(-1/(rel*sampleRate)); this.y=0; }
  step(x){ x=Math.abs(x); const c = x>this.y ? this.a : this.r; this.y = x + c*(this.y - x); return this.y; }
}

class OnsetDetector {                // causal Böck/SuperFlux-style picking on a per-band rise
  constructor({preMax=6, preAvg=24, delta=1.5 /*dB*/, minIoi=14 /*frames*/, mu=2}){
    Object.assign(this,{preMax,preAvg,delta,minIoi,mu});
    this.hist=new Float32Array(64); this.odf=new Float32Array(64); this.i=0; this.last=-1e9;
  }
  push(LdB, frame){                  // LdB: band level in dB at this control frame
    const h=this.hist, n=this.i++, M=h.length;
    h[n%M]=LdB;
    let ref=-Infinity;               // max over [n-mu-1, n-mu+1]: SuperFlux max filter in time
    for(let j=n-this.mu-1;j<=n-this.mu+1;j++) if(j>=0) ref=Math.max(ref,h[j%M]);
    const d=Math.max(0, LdB-ref);    // half-wave-rectified log rise (a ratio, volume-invariant)
    this.odf[n%M]=d;
    let mx=0, avg=0;
    for(let j=1;j<=this.preMax;j++) mx=Math.max(mx,this.odf[(n-j+M)%M]);
    for(let j=1;j<=this.preAvg;j++) avg+=this.odf[(n-j+M)%M]; avg/=this.preAvg;
    const fire = d>=mx && d>=avg+this.delta && (frame-this.last)>this.minIoi;
    if(fire){ this.last=frame; return d; }  // strength in dB of rise
    return 0;
  }
}

class BeatPLL {
  constructor(){ this.P=0.5; this.phi=0; this.conf=0; this.odf=new Float32Array(1600); this.n=0; }
  step(dt, onsetStrength){
    this.phi += dt/this.P; if(this.phi>=1) this.phi-=1;
    this.odf[this.n++%this.odf.length]=onsetStrength;
    if(onsetStrength>0){
      const e = this.phi<0.5 ? this.phi : this.phi-1;       // error to nearest beat, in beats
      if(Math.abs(e)<0.15){
        const s=Math.min(1,onsetStrength/12);               // 12 dB rise = full weight
        this.phi -= 0.15*s*e;                               // phase correction
        this.P   *= 1 - 0.015*s*e;                          // period correction (slow)
        this.conf = Math.min(1,this.conf+0.1*s);
      }
    }
    this.conf *= Math.exp(-dt/(4*this.P));                  // decays over ~4 beats w/o support
  }
  retune(){                                                 // every 0.5 s
    // ACF of last 8 s of odf (200 fps) for lags 60/215..60/55 s; comb-sum 4 multiples (BTrack);
    // weight W(τ)=exp(-0.5*(log2(τ/0.5)/1.4)^2) (Ellis); switch P only if new peak > 1.15× current
    // for 2 consecutive estimates; on switch keep phase anchored at the latest strong onset.
  }
}

class Rhythm extends AudioWorkletProcessor {
  constructor(opts){
    super();
    this.ring = new Float32Array(opts.processorOptions.sab); // shared frames ring (or null → port)
    this.filters = /* LR4 tree per BANDS: e.g. kick = HP 45 · LP 120; hat = HP 7000 … */ null;
    this.env = BANDS.map(b => new Follower(b==='hat'?0.0003:0.001, b==='sub'?0.12:b==='hat'?0.02:0.04));
    this.det = BANDS.map(b => new OnsetDetector({ minIoi: b==='hat'?6:14 }));
    this.pll = new BeatPLL(); this.acc=0; this.frame=0;
    this.fftBuf = new Float32Array(FFT_N); this.w=0;
  }
  process(inputs){
    const x = inputs[0]?.[0]; if(!x) return true;           // mono downmix assumed upstream
    for(let i=0;i<x.length;i++){
      const s=x[i];
      for(let b=0;b<BANDS.length;b++) this.env[b].step(this.filters[b](s));
      this.fftBuf[this.w++%FFT_N]=s;
      if(++this.acc===HOP){ this.acc=0; this.controlFrame(currentFrame+i+1); }
    }
    return true;
  }
  controlFrame(endFrame){
    const t = endFrame/sampleRate;                          // context time of newest sample
    const LdB = this.env.map(e => 20*Math.log10(e.y+1e-6));
    const rise = this.det.map((d,b) => d.push(LdB[b], this.frame));
    const kick = rise[1]>0 && (rise[5]>0 || rise[1]>=6) && rise[3] < rise[1] ? rise[1] : 0;
    const snare = rise[6]>0 && LdB[3] > -50 ? rise[6] : 0;   // + flatness gate from FFT path
    const hat = rise[7]>0 && rise[1]===0 ? rise[7] : 0;
    // FFT path (every frame): Hann window over fftBuf ending now, log-filtered SuperFlux,
    // centroid, flatness, K-weighted 400 ms loudness.  (omitted)
    this.pll.step(HOP/sampleRate, Math.max(kick, snare*0.7));
    if(this.frame % 100 === 0) this.pll.retune();
    const nextBeat = t + (1-this.pll.phi)*this.pll.P;
    this.write({ t, LdB, kick, snare, hat, phase:this.pll.phi, period:this.pll.P,
                 conf:this.pll.conf, nextBeat });
    this.frame++;
  }
  write(f){ /* SAB ring with an Atomics-published write index; or batch 4 frames → port.postMessage */ }
}
registerProcessor('rhythm', Rhythm);
```

Implementation notes:

- [Syn] Cost is about 10 biquads per sample plus a 1024 FFT every 5 ms, well within budget in a worklet. To halve the FFT cost, run the FFT path every 10 ms (100 fps, the madmom and Böck rate) and keep the biquad path at 5 ms.
- [Syn] Envelope dB values from a peak follower on a 50 Hz kick ripple slightly. Feed the detector min(LdB, LdB smoothed by 3 ms), or use an RMS of the squared band over 5 ms.
- [Syn] Calibrate the thresholds δ (in dB of rise) on a small labelled set. A sensible starting range is 1.5–3 dB for kick and snare and 3–6 dB for hats, then sweep for F-measure as Böck did [19].

---

## 8. Parameter cheat-sheet

| Parameter | Value | Basis |
|---|---|---|
| Control rate | 200 fps (5 ms) for triggers, 100 fps for ODF/tempo | [S] SuperFlux 200 fps [19]; Böck/madmom 100 fps [20][34] |
| FFT for flux | 1024 Hann at 48k (21 ms), right-aligned | [Syn]; multi-window idea [S][28] |
| Log compression | log10(1 + λX), λ ≈ 1–10 | [S][19][20] |
| Filterbank | log-spaced, 3–6 per octave for visuals, unnormalised | [S][19][20], [Syn] band count |
| Max filter | ±1 band; μ = 10 ms | [S][19] |
| Peak pick (online) | pre_max 30 ms, post_max 0–5 ms, pre_avg 100 ms, wait 30 ms | [S][19][21] |
| Kick band | 45–120 Hz (+ 2–5 kHz click) | [S][29][30], [Syn] |
| Snare | 150–250 Hz + 2–8 kHz noise | [S][30] |
| Hat | 7–16 kHz | [Syn]; [S] 2.7–5.5k in Tzanetakis [29] |
| Crossovers | LR4 (2× Butterworth, Q 0.707) | [S][31][32] |
| Tempo prior | log-Gaussian, 120 BPM, σ 1.4 octaves | [S][24] |
| Tempo range | 55–215 BPM | [S][34] |
| Tempo stickiness | λ = 100 (madmom); ACF switch only at +15 % | [S][34], [Syn] |
| BTrack CS | α = 0.9, tightness 5, predict at mid-beat | [S][23] |
| PLL gains | k_φ 0.1–0.2, k_P 0.01–0.02, window ±0.15 beat | [Syn], [S] structure [39] |
| AGC | P10/P95 over 8 s, min span 12 dB, γ 1.5–2.5 | [Syn], [S] relative levels [44] |
| Loudness | momentary 0.4 s, short-term 3 s, gate −70 LUFS | [S][43] |
| Sync target | visual within −5…+20 ms of sound; never later than +45 ms | [S][4], [Syn] |
| Display lag guess | 1.5 frames (25 ms at 60 Hz) + user offset | [S][3], [Syn] |

---

## 9. Priorities

[Syn] Ordered by impact for effort.

1. **Remove the analyser path from rhythm.** Move to an AudioWorklet with biquad bands and asymmetric followers. This cuts about 60 ms (window plus EMA) immediately and makes bass a separate, exact band.
2. **Trigger on rises in dB, not levels.** Add per-band adaptive normalisation and expansion. This fixes "weak bass" and makes kicks punch even under a sustained bass line.
3. **Timestamp every frame with context time.** Render at the audible time (`getOutputTimestamp` + `outputLatency` + display lag). Delete the timers between source and paint. This removes another 20–40 ms and fixes Bluetooth.
4. **Add the tempo/PLL model and drive beat visuals from prediction.** This takes beat-locked visuals to zero lag.
5. **For files and MIDI we play, do it all offline and schedule on the audio clock.** This gives perfect sync plus downbeats and sections.
6. Add structure features (build, drop, breakdown) once the beat grid is solid.

---

## Sources

1. W3C Web Audio API specification (AnalyserNode smoothing formula, Blackman α = 0.16, fftSize 32–32768 default 2048, min/maxDecibels −100/−30, render quantum 128, baseLatency/outputLatency, getOutputTimestamp): https://webaudio.github.io/web-audio-api/
2. Chromium `realtime_analyser.cc` (lazy FFT only when the getter's time advances; per-call smoothing): https://github.com/chromium/chromium/blob/HEAD/third_party/blink/renderer/modules/webaudio/realtime_analyser.cc
3. A. Forrence, "External Validation of Display Latency in Chrome" (1–2 frames at 60 Hz): https://aforren1.github.io/chrome-lag-test/index.md.html
4. ITU-R BT.1359-1, Relative timing of sound and vision for broadcasting (+45/−125 ms detectability, +90/−185 ms acceptability): https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf
5. H. Choi, "Audio worklet design pattern" (Chrome; ring buffers, SharedArrayBuffer): https://developer.chrome.com/blog/audio-worklet-design-pattern ; Mozilla, "High Performance Web Audio with AudioWorklet in Firefox": https://hacks.mozilla.org/?p=46115
6. MDN, AudioContext.outputLatency: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency
7. web.dev, "Synchronize audio and video playback on the web" (outputLatency, Chrome 102 / Firefox 70 / Safari 18.4): https://web.dev/articles/audio-output-latency
8. Mozilla bug 1564422 (outputLatency under resistFingerprinting): https://bugzilla.mozilla.org/show_bug.cgi?id=1564422
9. MDN, AudioContext.getOutputTimestamp(): https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp
10. Bluetooth latency: RTINGS latency test page https://www.rtings.com/headphones/learn/research/latency ; Android Authority survey https://androidauthority.com/smartphone-bluetooth-latency-973198/ ; Digital Trends on codecs https://www.digitaltrends.com/home-theater/what-are-bluetooth-codecs/
11. Chromium, "Life of a frame": https://chromium.googlesource.com/chromium/src/+/HEAD/docs/life_of_a_frame.md
12. C. Wilson, "A Tale of Two Clocks / Scheduling web audio with precision": https://web.dev/articles/audio-scheduling
13. Foscarin, Schlüter, Widmer, "Beat This! Accurate beat tracking without DBN postprocessing" (ISMIR 2024): https://arxiv.org/pdf/2407.21658
14. Böck, Krebs, Widmer, "Joint beat and downbeat tracking with recurrent neural networks" (ISMIR 2016): https://archives.ismir.net/ismir2016/paper/000186.pdf
15. Bello et al., "A Tutorial on Onset Detection in Music Signals" (IEEE TSAP 2005): https://www.cs.bu.edu/fac/snyder/cs583/Literature%20and%20Resources/bello_onset_tutorial.pdf
16. aubio `specdesc.c` (HFC, complex domain): https://github.com/aubio/aubio/blob/master/src/spectral/specdesc.c
17. aubio CLI manual (onset methods, defaults): https://aubio.org/manual/latest/cli.html
18. Turchet et al., "Hard real-time onset detection of percussive sounds" (DAFx-18): https://iris.unitn.it/retrieve/e3835195-2e2d-72ef-e053-3705fe0ad821/HARD%20REAL-TIME%20ONSET%20DETECTION%20OF%20PERCUSSIVE%20SOUNDS.pdf
19. Böck & Widmer, "Maximum Filter Vibrato Suppression for Onset Detection" (SuperFlux, DAFx-13): https://dafx.de/paper-archive/2013/papers/09.dafx2013_submission_12.pdf ; reference code https://github.com/CPJKU/SuperFlux
20. Böck, Krebs, Schedl, "Evaluating the Online Capabilities of Onset Detection Methods" (ISMIR 2012): https://archives.ismir.net/ismir2012/paper/000049.pdf
21. librosa `onset.py` (onset_strength lag/max_size, onset_detect defaults): https://github.com/librosa/librosa/blob/main/librosa/onset.py
22. S. Dixon, "Onset Detection Revisited" (DAFx-06): https://dafx.de/paper-archive/details/_kscRgr98aSFW4l-j1YJuA
23. A. Stark, BTrack source (`BTrack.cpp`, `OnsetDetectionFunction.cpp`): https://github.com/adamstark/BTrack ; Stark, Davies, Plumbley, "Real-time beat-synchronous analysis of musical audio" (DAFx-09): https://dafx.de/paper-archive/details/XiEJjIc0a2Hb_KTJon0SaA
24. D. Ellis, "Beat Tracking by Dynamic Programming" (JNMR 2007): https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf
25. Essentia OnsetDetection reference: https://essentia.upf.edu/reference/std_OnsetDetection.html
26. E. Scheirer, "Tempo and beat analysis of acoustic musical signals" (JASA 1998): https://www.ee.columbia.edu/~dpwe/papers/Schei98-beats.pdf
27. aubio `peakpicker.c` and `onset.c` (median+mean threshold, win_post 5, delay 4.3·hop, method defaults): https://github.com/aubio/aubio/tree/master/src/onset
28. Böck, Arzt, Krebs, Schedl, "Online real-time onset detection with recurrent neural networks" (DAFx-12): https://www.dafx.de/paper-archive/2012/papers/dafx12_submission_4.pdf
29. Wu et al., "A Review of Automatic Drum Transcription" (IEEE/ACM TASLP 2018): https://musicinformatics.gatech.edu/wp-content_nondefault/uploads/2018/05/Wu-et-al.-2018-A-review-of-automatic-drum-transcription.pdf
30. Drum EQ references: iZotope "How to EQ drums" https://www.izotope.com/en/learn/how-to-eq-drums ; Music Guy Mixing drum EQ chart https://www.musicguymixing.com/drum-eq-chart/ ; Native Instruments kick EQ https://blog.native-instruments.com/kick-drum-eq/
31. Rane, "Linkwitz-Riley Crossovers: A Primer" (RaneNote 160): https://www.ranecommercial.com/legacy/pdf/ranenotes/Linkwitz_Riley_Crossovers_Primer.pdf
32. Wikipedia, Linkwitz–Riley filter: https://en.wikipedia.org/wiki/Linkwitz%E2%80%93Riley_filter
33. R. Bristow-Johnson, Audio EQ Cookbook (W3C): https://www.w3.org/TR/audio-eq-cookbook/
34. madmom `features/beats.py` and `beats_hmm.py` (RNNBeatProcessor, DBNBeatTrackingProcessor defaults, online forward decoding): https://github.com/CPJKU/madmom/tree/main/madmom/features
35. Krebs, Böck, Widmer, "An efficient state-space model for joint tempo and meter tracking" (ISMIR 2015): https://www.ismir2015.uma.es/articles/239_Paper.pdf
36. Heydari, Duan et al., "A Novel 1D State Space for Efficient Music Rhythmic Analysis" (online GTZAN comparison table): https://arxiv.org/pdf/2111.00704 ; Heydari, Cwitkowitz, Duan, "BeatNet" (ISMIR 2021): https://arxiv.org/pdf/2108.03576
37. librosa `beat.py` (beat_track start_bpm 120, tightness 100, DP): https://github.com/librosa/librosa/blob/main/librosa/beat.py
38. Large & Kolen, oscillator beat tracking (US patent 5,751,899): https://patentimages.storage.googleapis.com/e8/ba/de/c2ee01a391d901/US5751899.pdf
39. Sethares & Arora, "Equilibria of adaptive wavetable oscillators with applications to beat tracking" (ICASSP 2007): https://sethares.engr.wisc.edu/paperspdf/ICASSP2007.pdf
40. Yadati, Larson, Liem, Hanjalic, "Detecting Drops in Electronic Dance Music" (ISMIR 2014): https://archives.ismir.net/ismir2014/paper/000297.pdf
41. Meyda audio features: https://meyda.js.org/audio-features
42. BS.1770 K-weighting 48 kHz coefficients (ITU-R BS.1770; implementations e.g. oximedia-metering): https://docs.rs/crate/oximedia-metering/latest/source/src/filters.rs ; ITU-R BS.1770 text mirror https://www.scribd.com/doc/48764388/R-REC-BS-1770-1-200709-I-PDF-E
43. EBU Tech 3341, "EBU Mode" loudness metering: https://tech.ebu.ch/docs/tech/tech3341.pdf
44. R. Geiss, MilkDrop preset authoring guide (bass/mid/treb relative levels, *_att): https://www.geisswerks.com/milkdrop/milkdrop_preset_authoring.html
45. Müller, FMP notebooks, novelty-based segmentation (Foote checkerboard kernel): https://audiolabs-erlangen.de/resources/MIR/FMP/C4/C4S4_NoveltySegmentation.html
46. Oliveira, Gouyon, Martins, Reis, "IBT: A real-time tempo and beat tracking system" (ISMIR 2010): https://zenodo.org/record/1416470
47. Repp & Su, "Sensorimotor synchronization: A review of recent research (2006–2012)" (context on human anticipatory tapping): https://link.springer.com/article/10.3758/s13423-012-0371-2
