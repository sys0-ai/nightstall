// A small General MIDI synthesizer in Web Audio, enough to hear a MIDI file: drums on channel 10 by the GM drum map,
// other channels by the family of their GM program (piano, organ, guitar, bass, strings, lead, pad...). Every voice is
// scheduled at an exact AudioContext time, so the scene can be drawn against the same clock.
import type { Note } from "./midi-file.ts";

const hz = (pitch: number) => 440 * 2 ** ((pitch - 69) / 12);

export function createSynth(context: AudioContext, destination: AudioNode) {
  const master = context.createGain();
  master.gain.value = 0.55;
  const glue = context.createDynamicsCompressor();
  glue.threshold.value = -14; glue.knee.value = 8; glue.ratio.value = 3; glue.attack.value = 0.004; glue.release.value = 0.14;
  master.connect(glue).connect(destination);
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const n = noise.getChannelData(0);
  for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  const live = new Set<AudioScheduledSourceNode>();
  const own = (node: AudioScheduledSourceNode, stop: number) => { live.add(node); node.onended = () => live.delete(node); node.stop(stop); return node; };

  function env(at: number, peak: number, attack: number, decay: number, sustain: number, release: number, end: number) {
    const g = context.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + attack);
    g.gain.setTargetAtTime(peak * sustain, at + attack, decay / 3);
    g.gain.setValueAtTime(peak * sustain, Math.max(at + attack, end));
    g.gain.setTargetAtTime(0, Math.max(at + attack, end), release / 3);
    return g;
  }
  function burst(at: number, length: number, gain: number, type: BiquadFilterType, frequency: number, q = 0.7, pan = 0) {
    const src = context.createBufferSource();
    src.buffer = noise;
    const f = context.createBiquadFilter(); f.type = type; f.frequency.value = frequency; f.Q.value = q;
    const g = context.createGain();
    g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    const p = context.createStereoPanner(); p.pan.value = pan;
    src.connect(f).connect(g).connect(p).connect(master);
    src.start(at, Math.random() * 0.5);
    own(src, at + length + 0.02);
  }
  function tone(at: number, type: OscillatorType, from: number, to: number, glide: number, gain: number, length: number) {
    const o = context.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + glide);
    const g = context.createGain();
    g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    o.connect(g).connect(master);
    o.start(at); own(o, at + length + 0.02);
  }
  function drum(at: number, pitch: number, v: number) {
    if (pitch === 35 || pitch === 36) { tone(at, "sine", 160, 42, 0.11, 1.1 * v, 0.5); burst(at, 0.012, 0.35 * v, "highpass", 3000); }
    else if (pitch === 38 || pitch === 40) { tone(at, "triangle", 210, 160, 0.05, 0.45 * v, 0.12); burst(at, 0.2, 0.55 * v, "bandpass", 2400, 0.6); }
    else if (pitch === 37) burst(at, 0.04, 0.5 * v, "bandpass", 3200, 2);
    else if (pitch === 39) for (const d of [0, 0.011, 0.023]) burst(at + d, d ? 0.03 : 0.16, 0.5 * v, "bandpass", 1300, 1.2);
    else if (pitch === 42 || pitch === 44) burst(at, 0.045, 0.28 * v, "highpass", 8000, 0.7, 0.25);
    else if (pitch === 46) burst(at, 0.32, 0.24 * v, "highpass", 7500, 0.7, 0.25);
    else if (pitch === 49 || pitch === 57 || pitch === 52 || pitch === 55) burst(at, 1.6, 0.3 * v, "highpass", 5200, 0.5, -0.2);
    else if (pitch === 51 || pitch === 59 || pitch === 53) burst(at, 0.5, 0.14 * v, "bandpass", 6500, 1.5, -0.2);
    else if (pitch >= 41 && pitch <= 50) { const f = 70 + (pitch - 41) * 14; tone(at, "sine", f * 1.6, f, 0.08, 0.6 * v, 0.35); }
    else burst(at, 0.06, 0.25 * v, "bandpass", 1000 + pitch * 40, 1);
  }
  function voice(at: number, note: Note) {
    const f = hz(note.pitch), v = note.velocity, end = at + note.duration;
    const filter = context.createBiquadFilter(); filter.type = "lowpass";
    let shape: [OscillatorType[], number, number, number, number, number, number, number] =   // waves, detune, attack, decay, sustain, release, cutoff × f, peak
      [["triangle"], 0, 0.004, 0.35, 0.25, 0.25, 8, 0.32];
    if (note.program >= 16 && note.program < 24) shape = [["sine", "triangle"], 3, 0.01, 0.1, 0.9, 0.06, 10, 0.24];         // organ
    else if (note.program >= 24 && note.program < 32) shape = [["sawtooth"], 0, 0.003, 0.25, 0.4, 0.15, 6, 0.2];        // guitar
    else if (note.program >= 32 && note.program < 40) shape = [["sawtooth", "square"], 4, 0.004, 0.18, 0.55, 0.08, 3.2, 0.42];   // bass
    else if (note.program >= 40 && note.program < 56) shape = [["sawtooth", "sawtooth"], 8, 0.09, 0.5, 0.85, 0.4, 4.5, 0.14]; // strings, ensembles
    else if (note.program >= 56 && note.program < 64) shape = [["sawtooth"], 0, 0.02, 0.2, 0.7, 0.12, 5, 0.18];              // brass
    else if (note.program >= 80 && note.program < 88) shape = [["square", "sawtooth"], 6, 0.006, 0.15, 0.65, 0.12, 7, 0.16];  // lead
    else if (note.program >= 88 && note.program < 96) shape = [["sawtooth", "sawtooth", "triangle"], 11, 0.35, 0.8, 0.8, 0.9, 3, 0.11]; // pad
    else if (note.program >= 8 && note.program < 16) shape = [["sine", "triangle"], 0, 0.002, 0.5, 0.05, 0.4, 12, 0.3];       // bells
    const [waves, detune, attack, decay, sustain, release, cutoff, peak] = shape;
    filter.frequency.setValueAtTime(Math.min(16000, f * cutoff * 1.8), at);
    filter.frequency.setTargetAtTime(Math.min(16000, f * cutoff), at, 0.08);
    filter.Q.value = 1.2;
    const g = env(at, peak * (0.35 + 0.65 * v) / Math.sqrt(waves.length), attack, decay, sustain, release, end);
    filter.connect(g).connect(master);
    waves.forEach((w, i) => {
      const o = context.createOscillator(); o.type = w; o.frequency.value = f;
      o.detune.value = (i - (waves.length - 1) / 2) * detune;
      o.connect(filter); o.start(at); own(o, end + release * 2 + 0.05);
    });
  }
  return {
    output: master,
    /** Sound one note at AudioContext time `at`. */
    play(note: Note, at: number) { if (note.channel === 9) drum(at, note.pitch, note.velocity); else voice(at, note); },
    /** Silence everything scheduled. */
    stop() { for (const node of live) { try { node.stop(); } catch {} } live.clear(); },
    dispose() { this.stop(); master.disconnect(); glue.disconnect(); },
  };
}
