// Standard MIDI Files (SMF format 0 and 1, PPQ or SMPTE division), read into notes on a time line in seconds.
// Notes are paired on/off per channel and pitch (a note-on of velocity 0 is an off). Tempo changes anywhere in any track
// form one tempo map, which turns ticks into seconds. Running status is honoured; SysEx and unknown metas are skipped.

export type Note = { time: number; duration: number; pitch: number; velocity: number; channel: number; track: number; program: number };
export type Control = { time: number; channel: number; controller: number; value: number };
export type Song = {
  name: string;
  notes: Note[];
  controls: Control[];
  /** Seconds at each tempo change, with the quarter-note length that starts there. */
  tempos: { time: number; tick: number; secondsPerQuarter: number }[];
  /** Time-signature changes: numerator and denominator from that second on. */
  meters: { time: number; numerator: number; denominator: number }[];
  duration: number;
  ppq: number;
  trackNames: string[];
};

class Reader {
  at = 0;
  constructor(readonly bytes: Uint8Array) {}
  byte() { if (this.at >= this.bytes.length) throw new Error("The MIDI file ends early."); return this.bytes[this.at++]!; }
  u16() { return (this.byte() << 8) | this.byte(); }
  u32() { return ((this.byte() << 24) >>> 0) + (this.byte() << 16) + (this.byte() << 8) + this.byte(); }
  text(n: number) { let s = ""; for (let i = 0; i < n; i++) s += String.fromCharCode(this.byte()); return s; }
  /** A variable-length quantity: seven bits a byte, the top bit set on all but the last. At most four bytes. */
  vlq() { let v = 0; for (let i = 0; i < 4; i++) { const b = this.byte(); v = (v << 7) | (b & 127); if (!(b & 128)) return v; } throw new Error("A MIDI length is too long."); }
}

type Raw = { tick: number; track: number; kind: "on" | "off" | "cc" | "program" | "tempo" | "meter" | "name"; channel: number; a: number; b: number; text?: string };

export function readMidi(bytes: Uint8Array, name = "MIDI file"): Song {
  const r = new Reader(bytes);
  if (r.text(4) !== "MThd") throw new Error("This is not a Standard MIDI File (no MThd header).");
  const headerLength = r.u32(), format = r.u16(), tracks = r.u16(), division = r.u16();
  r.at += headerLength - 6;
  if (format > 2) throw new Error("Unknown MIDI file format " + format + ".");
  // SMPTE division: frames per second (negative, in the high byte) times ticks per frame. Read as a fixed tick length.
  const smpte = division & 0x8000 ? (256 - (division >> 8)) * (division & 255) : 0;
  const ppq = smpte ? 0 : division;
  const raws: Raw[] = [], trackNames: string[] = [];
  for (let t = 0; t < tracks && r.at < bytes.length; t++) {
    const id = r.text(4), length = r.u32(), end = r.at + length;
    if (id !== "MTrk") { r.at = end; t--; continue; }
    let tick = 0, status = 0;
    while (r.at < end) {
      tick += r.vlq();
      let first = r.byte();
      if (first === 0xff) {
        const type = r.byte(), n = r.vlq(), start = r.at;
        if (type === 0x51 && n === 3) raws.push({ tick, track: t, kind: "tempo", channel: 0, a: (r.byte() << 16) | (r.byte() << 8) | r.byte(), b: 0 });
        else if (type === 0x58 && n >= 2) raws.push({ tick, track: t, kind: "meter", channel: 0, a: r.byte(), b: 2 ** r.byte() });
        else if (type === 0x03) trackNames[t] = r.text(n);
        r.at = start + n;
        if (type === 0x2f) break;
        continue;
      }
      if (first === 0xf0 || first === 0xf7) { r.at += r.vlq(); continue; }
      if (first & 0x80) { status = first; first = r.byte(); }
      else if (!status) throw new Error("A MIDI event has no status.");
      const kind = status >> 4, channel = status & 15;
      const second = kind === 0xc || kind === 0xd ? 0 : r.byte();
      if (kind === 0x9) raws.push({ tick, track: t, kind: second ? "on" : "off", channel, a: first, b: second });
      else if (kind === 0x8) raws.push({ tick, track: t, kind: "off", channel, a: first, b: 0 });
      else if (kind === 0xb) raws.push({ tick, track: t, kind: "cc", channel, a: first, b: second });
      else if (kind === 0xc) raws.push({ tick, track: t, kind: "program", channel, a: first, b: 0 });
    }
    r.at = end;
  }
  // events in tick order; at one tick, tempo first and note-offs before note-ons (so a repeated note re-strikes)
  const order = { tempo: 0, meter: 1, name: 2, program: 3, cc: 4, off: 5, on: 6 };
  raws.sort((x, y) => x.tick - y.tick || order[x.kind] - order[y.kind]);
  const tempos: Song["tempos"] = [{ time: 0, tick: 0, secondsPerQuarter: 0.5 }];
  const seconds = (tick: number) => {
    if (smpte) return tick / smpte;
    const at = tempos[tempos.length - 1]!;
    return at.time + ((tick - at.tick) / ppq) * at.secondsPerQuarter;
  };
  const notes: Note[] = [], controls: Control[] = [], meters: Song["meters"] = [], programs = new Array(16).fill(0);
  const held = new Map<number, { time: number; velocity: number; track: number; program: number }[]>();
  for (const e of raws) {
    const time = seconds(e.tick);
    if (e.kind === "tempo") {
      if (!smpte) { if (tempos.length === 1 && e.tick === 0) tempos[0] = { time: 0, tick: 0, secondsPerQuarter: e.a / 1e6 }; else tempos.push({ time, tick: e.tick, secondsPerQuarter: e.a / 1e6 }); }
    } else if (e.kind === "meter") meters.push({ time, numerator: e.a, denominator: e.b });
    else if (e.kind === "program") programs[e.channel] = e.a;
    else if (e.kind === "cc") controls.push({ time, channel: e.channel, controller: e.a, value: e.b / 127 });
    else {
      const key = e.channel * 128 + e.a, stack = held.get(key) ?? [];
      if (e.kind === "on") { stack.push({ time, velocity: e.b / 127, track: e.track, program: programs[e.channel] }); held.set(key, stack); }
      else {
        const start = stack.shift();
        if (start) notes.push({ time: start.time, duration: Math.max(0.01, time - start.time), pitch: e.a, velocity: start.velocity, channel: e.channel, track: start.track, program: start.program });
      }
    }
  }
  for (const [key, stack] of held) for (const start of stack)
    notes.push({ time: start.time, duration: 0.25, pitch: key & 127, velocity: start.velocity, channel: key >> 7, track: start.track, program: start.program });
  notes.sort((a, b) => a.time - b.time || a.pitch - b.pitch);
  if (!meters.length || meters[0]!.time > 0) meters.unshift({ time: 0, numerator: 4, denominator: 4 });
  const duration = notes.reduce((end, n) => Math.max(end, n.time + n.duration), 0);
  return { name, notes, controls, tempos, meters, duration, ppq, trackNames };
}

/** Write notes as a format-1 Standard MIDI File (one track per channel used, plus a tempo track). */
export type Written = { tick: number; ticks: number; pitch: number; velocity: number; channel: number; program?: number };
export function writeMidi(notes: Written[], { ppq = 480, bpm = 120, numerator = 4, name = "" } = {}): Uint8Array {
  const out: number[] = [];
  const u32 = (v: number) => out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
  const vlq = (v: number, to: number[]) => { const b = [v & 127]; while ((v >>= 7)) b.unshift((v & 127) | 128); to.push(...b); };
  const track = (events: { tick: number; data: number[] }[]) => {
    events.sort((a, b) => a.tick - b.tick || (a.data[0]! >> 4 === 8 ? -1 : 0) - (b.data[0]! >> 4 === 8 ? -1 : 0));
    const body: number[] = [];
    let last = 0;
    for (const e of events) { vlq(e.tick - last, body); last = e.tick; body.push(...e.data); }
    body.push(0, 0xff, 0x2f, 0);
    out.push(0x4d, 0x54, 0x72, 0x6b); u32(body.length); out.push(...body);
  };
  const channels = [...new Set(notes.map(n => n.channel))].sort((a, b) => a - b);
  out.push(0x4d, 0x54, 0x68, 0x64); u32(6); out.push(0, 1, 0, channels.length + 1, (ppq >> 8) & 255, ppq & 255);
  const tempo = Math.round(60e6 / bpm), title = [...name].map(c => c.charCodeAt(0) & 127);
  track([{ tick: 0, data: [0xff, 0x03, title.length, ...title] }, { tick: 0, data: [0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255] }, { tick: 0, data: [0xff, 0x58, 4, numerator, 2, 24, 8] }]);
  for (const ch of channels) {
    const own = notes.filter(n => n.channel === ch), events: { tick: number; data: number[] }[] = [];
    const program = own.find(n => n.program !== undefined)?.program;
    if (program !== undefined && ch !== 9) events.push({ tick: 0, data: [0xc0 | ch, program] });
    for (const n of own) {
      events.push({ tick: n.tick, data: [0x90 | ch, n.pitch, Math.max(1, Math.min(127, Math.round(n.velocity * 127)))] });
      events.push({ tick: n.tick + n.ticks, data: [0x80 | ch, n.pitch, 0] });
    }
    track(events);
  }
  return new Uint8Array(out);
}
