// "Night Market", an original 42-bar piece written for Night Stall's demo, 112 BPM in A minor. It is generated here
// as MIDI notes, written as a Standard MIDI File and read back through the same reader a loaded file goes through, so
// the demo exercises the whole MIDI path. Its form is the one a show is designed around:
//   bars 1–4 intro (pads, sparse hats)   5–12 groove   13–16 build (snare roll, riser)   17–24 drop
//   25–28 breakdown (pads and lead)   29–32 build   33–40 drop   41–42 outro, ending on a hit
import { readMidi, writeMidi, type Song } from "./midi-file.ts";

const PPQ = 480, BAR = PPQ * 4, BPM = 112;
type Out = { tick: number; ticks: number; pitch: number; velocity: number; channel: number; program?: number };

export const SECTIONS = [
  { bar: 1, name: "Intro" }, { bar: 5, name: "Groove" }, { bar: 13, name: "Build" }, { bar: 17, name: "Drop" },
  { bar: 25, name: "Breakdown" }, { bar: 29, name: "Build" }, { bar: 33, name: "Drop" }, { bar: 41, name: "Outro" },
];

export function nightMarket(): Song {
  const out: Out[] = [];
  const add = (bar: number, beat: number, ticks: number, pitch: number, velocity: number, channel: number, program?: number) =>
    out.push({ tick: Math.round((bar - 1) * BAR + beat * PPQ), ticks: Math.max(1, Math.round(ticks)), pitch, velocity, channel, program });
  // i – VI – III – VII: Am7, Fmaj7, Cmaj7, G6, one chord a bar
  const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 60, 64, 71], [55, 59, 62, 64]];
  const roots = [45, 41, 48, 43];
  const lead: [number, number, number][][] = [   // a two-bar phrase in A minor pentatonic, [beat, length, pitch], answered by a variation
    [[0, 0.75, 76], [0.75, 0.25, 74], [1, 0.5, 72], [1.5, 1, 69], [3, 0.5, 72], [3.5, 0.5, 74]],
    [[0, 1.5, 76], [1.5, 0.5, 79], [2, 0.75, 81], [2.75, 0.25, 79], [3, 1, 76]],
    [[0, 0.75, 72], [0.75, 0.25, 74], [1, 0.5, 76], [1.5, 1, 74], [3, 0.5, 72], [3.5, 0.5, 69]],
    [[0, 2, 69], [2, 0.5, 67], [2.5, 0.5, 69], [3, 1, 72]],
  ];
  const drop = (b: number) => (b >= 17 && b <= 24) || (b >= 33 && b <= 40);
  const groove = (b: number) => b >= 5 && b <= 12;
  const build = (b: number) => (b >= 13 && b <= 16) || (b >= 29 && b <= 32);
  for (let bar = 1; bar <= 42; bar++) {
    const c = (bar - 1) % 4, chord = chords[c]!, root = roots[c]!;
    // pads everywhere but the end; stabs on the off-beats in the drops
    if (bar <= 40) for (const p of chord) add(bar, 0, BAR * 0.98, p, drop(bar) ? 0.5 : 0.62, 0, 89);
    if (drop(bar)) for (const beat of [0.5, 1.5, 2.5, 3.5]) for (const p of chord) add(bar, beat, PPQ * 0.22, p + 12, 0.55, 3, 4);
    // bass: syncopated roots in the groove, eighth-note octaves pumping in the drops, held roots in the builds
    if (groove(bar)) for (const [beat, len, oct, v] of [[0, 0.75, 0, 0.9], [1.5, 0.5, 0, 0.7], [2, 0.5, 12, 0.6], [2.75, 1, 0, 0.8]] as const) add(bar, beat, PPQ * len, root + oct, v, 1, 38);
    if (drop(bar)) for (let e = 0; e < 8; e++) add(bar, e / 2, PPQ * 0.42, root + (e % 2 ? 12 : 0), e % 2 ? 0.7 : 0.95, 1, 38);
    if (build(bar)) add(bar, 0, BAR * 0.95, root, 0.6 + 0.08 * ((bar - 1) % 4), 1, 38);
    // lead: the phrase over the groove's second half, the drops and the breakdown
    if ((bar >= 9 && bar <= 12) || drop(bar) || (bar >= 25 && bar <= 28))
      for (const [beat, len, p] of lead[(bar - 1) % 4]!) add(bar, beat, PPQ * len * 0.95, p, bar >= 25 && bar <= 28 ? 0.55 : 0.8, 2, 81);
    // drums (channel 10, GM map: 36 kick, 38 snare, 39 clap, 42 closed hat, 46 open hat, 49 crash)
    const d = (beat: number, pitch: number, v: number, len = 0.1) => add(bar, beat, PPQ * len, pitch, v, 9);
    if (bar <= 4) for (let e = 0; e < 8; e++) if (bar > 2 || e % 2 === 0) d(e / 2, 42, e % 2 ? 0.35 : 0.5);
    if (groove(bar)) {
      for (const beat of [0, 1.75, 2.5]) d(beat, 36, beat ? 0.8 : 1);
      for (const beat of [1, 3]) d(beat, 38, 0.9);
      for (let e = 0; e < 8; e++) d(e / 2 + (e % 2 ? 0.08 : 0), 42, e % 2 ? 0.45 : 0.7);   // a little swing
      if (bar % 4 === 0) { d(3.5, 38, 0.6); d(3.75, 38, 0.75); }
    }
    if (build(bar)) {
      const k = (bar - 1) % 4, step = k < 2 ? 1 : k < 3 ? 0.5 : 0.25;     // quarters, eighths, then sixteenths
      for (let beat = 0; beat < 4; beat += step) d(beat, 38, 0.45 + 0.13 * k + 0.1 * (beat / 4));
      d(0, 36, 0.9);
      if (k === 3) for (let s = 0; s < 4; s++) d(3 + s / 4, 39, 0.6 + s * 0.1);
    }
    if (drop(bar)) {
      for (let beat = 0; beat < 4; beat++) d(beat, 36, 1);
      for (const beat of [1, 3]) { d(beat, 38, 0.95); d(beat, 39, 0.6); }
      for (let beat = 0; beat < 4; beat++) { d(beat + 0.5, 46, 0.6, 0.3); d(beat + 0.25, 42, 0.35); d(beat + 0.75, 42, 0.35); }
      if (bar === 17 || bar === 33 || bar === 21 || bar === 37) d(0, 49, 1, 2);
    }
    if (bar >= 25 && bar <= 28) d(0, 51, 0.3, 1);
    if (bar === 41) { d(0, 36, 1); d(0, 49, 1, 3); for (const p of chords[0]!) add(bar, 0, BAR * 1.9, p, 0.7, 0, 89); add(bar, 0, BAR * 1.9, 33, 0.9, 1, 38); }
  }
  return readMidi(writeMidi(out, { ppq: PPQ, bpm: BPM, name: "Night Market" }), "Night Market");
}
