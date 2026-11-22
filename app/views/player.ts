// Plays a Song through the synth with a lookahead scheduler ("A Tale of Two Clocks"): a 25 ms timer schedules every
// note due in the next 150 ms at its exact AudioContext time, so timer jitter never reaches the sound. The scene asks
// `heard()` where in the song the listener is at a given animation frame, which maps the audio clock through the
// output's own latency (getOutputTimestamp, else outputLatency) to the frame's presentation time. Drawn against that,
// a hit's brightest frame reaches the screen when its sound reaches the ear.
import type { Note, Song } from "./midi-file.ts";
import { createSynth } from "./synth.ts";

const LOOKAHEAD = 0.15, TICK_MS = 25;

export function createPlayer(context: AudioContext, destination: AudioNode, changed: (state: "playing" | "paused" | "ended") => void) {
  const synth = createSynth(context, destination);
  let song: Song | null = null, startAt = 0, previousStart: number | null = null, pausedAt = 0, playing = false, next = 0, timer = 0, loop = true;

  function schedule() {
    if (!playing || !song) return;
    const horizon = context.currentTime + LOOKAHEAD;
    const notes = song.notes;
    while (next < notes.length && startAt + notes[next]!.time < horizon) {
      const note = notes[next++]!, at = startAt + note.time;
      if (at >= context.currentTime - 0.01) synth.play(note, Math.max(at, context.currentTime));
    }
    // the song comes round on a whole bar after its last note; the next pass is scheduled ahead like any other notes
    const length = Math.ceil((song.duration + 0.05) / bar(song)) * bar(song);
    if (next >= notes.length) {
      if (loop && startAt + length < horizon) { previousStart = startAt; startAt += length; next = 0; schedule(); }
      else if (!loop && context.currentTime > startAt + song.duration + 0.4) { playing = false; pausedAt = 0; changed("ended"); }
    }
  }
  const bar = (s: Song) => { const q = s.tempos[s.tempos.length - 1]!.secondsPerQuarter, m = s.meters[s.meters.length - 1]!; return q * m.numerator * 4 / m.denominator; };
  function seekIndex(t: number) { let i = 0; while (song && i < song.notes.length && song.notes[i]!.time < t) i++; return i; }

  return {
    get song() { return song; },
    get playing() { return playing; },
    load(next_: Song) { this.stop(); song = next_; pausedAt = 0; },
    async play() {
      if (!song) return;
      await context.resume();
      startAt = context.currentTime + 0.08 - pausedAt; previousStart = null;
      next = seekIndex(pausedAt);
      playing = true;
      clearInterval(timer);
      timer = window.setInterval(schedule, TICK_MS);
      schedule();
      changed("playing");
    },
    pause() {
      if (!playing) return;
      pausedAt = Math.max(0, context.currentTime - startAt);
      playing = false; clearInterval(timer); synth.stop(); changed("paused");
    },
    stop() { playing = false; pausedAt = 0; clearInterval(timer); synth.stop(); },
    /** Jump to `t` seconds into the song, playing on if it was playing. */
    async seek(t: number) {
      const was = playing;
      playing = false; clearInterval(timer); synth.stop();
      pausedAt = Math.max(0, t);
      if (was) await this.play();
    },
    set loop(on: boolean) { loop = on; },
    /**
     * The song time being heard when a frame drawn now reaches the screen. `frameAt` is the frame's
     * requestAnimationFrame time; `ahead` is how long until it is shown (about one frame) plus any manual offset.
     */
    heard(frameAt: number, ahead: number): number | null {
      if (!song) return null;
      if (!playing) return pausedAt || null;
      const stamp = context.getOutputTimestamp?.();
      let audio: number;
      if (stamp && stamp.contextTime! > 0 && stamp.performanceTime! > 0) audio = stamp.contextTime! + (frameAt + ahead - stamp.performanceTime!) / 1000;
      else audio = context.currentTime - (context.outputLatency || context.baseLatency || 0) + ahead / 1000;
      let t = audio - startAt;
      if (t < 0 && previousStart !== null) t = audio - previousStart;   // still hearing the end of the last pass
      return t < 0 ? null : t;
    },
    /** Upcoming notes are known: the scene uses them to wind up before a hit lands. */
    notes(): Note[] { return song?.notes ?? []; },
    dispose() { this.stop(); clearInterval(timer); synth.dispose(); },
  };
}
