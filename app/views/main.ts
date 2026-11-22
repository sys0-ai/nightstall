// Night Stall's window. Every source becomes a score (cues on a time line); each frame asks the source what moment of
// the music is being heard as the frame reaches the screen, and composes what every actor on the stage (stage.ts) does
// at that moment.
//   MIDI player   the built-in song or a loaded MIDI file, synthesized here; the whole score is known
//   Audio file    analysed in full before it plays (analyze.ts); the whole score is known
//   Radio, Microphone, External cues   heard live (live.ts): hits as they are detected, beats predicted ahead;
//                 a DAW through the sys0 Bridge adds its transport and notes
import { createStall, homeView, LOOP, NEAR, FAR, LOW, HIGH, type Lighting, type View } from "./stall.ts";
import { listenMicrophone } from "./microphone.ts";
import { quietLevels, type Levels, type MeasuredLevels, type Measure } from "./file-audio.ts";
import { readMidi, type Song } from "./midi-file.ts";
import { nightMarket, SECTIONS } from "./song.ts";
import { cuesFromSong, lanesOf, sectionsOf, type Cue, type Lane, type Role } from "./cues.ts";
import { mountBand } from "./band.ts";
import { createPlayer } from "./player.ts";
import { analyse } from "./analyze.ts";
import { createLive, type HostFrame } from "./live.ts";
import { momentOf, type Moment, type Score, type Show } from "./stage/moment.ts";
import { compose, type StageFrame } from "./stage/compose.ts";
import type { Actor } from "./stage/actor.ts";
import { nightStallStage } from "./stage.ts";

type Ctx = {
  el: Element;
  props(path: string): unknown;
  act(method: string, input: Record<string, unknown>): Promise<unknown>;
  audioLevels?: { listen?(receive: (levels: MeasuredLevels) => void): () => void; measure: Measure };
};
/**
 * How far ahead of its requestAnimationFrame time a frame draws the music: one frame until it is on the screen, and
 * half a frame more, so the frame nearest a hit takes it (within ±8 ms) rather than the first one after it.
 */
const PRESENT_MS = 24;
/** How late live levels are: the analyser's window and the trip to this view. */
const LIVE_LATENCY = 0.045;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const signed = (ms: number) => (ms > 0 ? "+" : ms < 0 ? "−" : "") + Math.abs(ms) + " ms";

export function mount(ctx: Ctx) {
  const part = <T extends HTMLElement>(selector: string) => ctx.el.querySelector<T>(selector)!;
  const canvas = part<HTMLCanvasElement>(".street canvas");
  const loading = part(".loading");
  const input = part<HTMLSelectElement>("#ns-input");
  const songPick = part<HTMLSelectElement>("#ns-song");
  const audioFile = part<HTMLInputElement>("[data-audio-file]");
  const midiFile = part<HTMLInputElement>("[data-midi-file]");
  const connect = part<HTMLButtonElement>("[data-input-action]");
  const filePlay = part<HTMLButtonElement>("[data-file-play]");
  const pause = part<HTMLButtonElement>("[data-pause]");
  const status = part(".status");
  const lamps = Array.from(ctx.el.querySelectorAll<HTMLElement>(".meters i"));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const on = (el: EventTarget, kind: string, fn: EventListener) => el.addEventListener(kind, fn, { signal: events.signal });
  const say = (s: string) => { if (status.textContent !== s) { status.textContent = s; status.title = s; } };
  // a view only being drawn ahead of its window (the desktop's prepared first paint) cannot keep a WebGL canvas, and must
  // leave its markup exactly as the template drew it: it does nothing more, and the live view does the rest
  if (document.querySelector<HTMLMetaElement>('meta[name="sys0-render"]')?.content === "server") return () => {};
  // the public edition (a site that narrows the app's audio to the microphone, or a page generated from it with no
  // desktop) offers the MIDI player and the microphone
  const publicEdition = document.querySelector<HTMLMetaElement>('meta[name="sys0-audio-input"]')?.content === "microphone" || !document.querySelector('meta[name="sys0-shell"]');
  if (publicEdition) for (const option of Array.from(input.options)) if (option.value !== "midi" && option.value !== "microphone") option.remove();

  // ── the audio clock everything is scheduled on (made on the first press, as browsers require) ──
  let audio: AudioContext | undefined;
  const context = () => (audio ??= new AudioContext({ latencyHint: "interactive" }));
  let player: ReturnType<typeof createPlayer> | undefined;
  let score: Score | null = null, songName = "", songBars = 0, songKey: string | null = null, lanes: Lane[] = [];
  let file: { source: AudioBufferSourceNode | null; buffer: AudioBuffer; startAt: number; pausedAt: number; playing: boolean; name: string; bpm: number } | undefined;
  const live = { engine: createLive(), radio: quietLevels as MeasuredLevels, stream: quietLevels as MeasuredLevels, host: null as HostFrame | null, activeUntil: 0 };
  let stopMic: (() => void) | undefined, stopRadio: (() => void) | undefined, micConnected = false;

  function useSong(song: Song) {
    player ??= createPlayer(context(), context().destination, state => {
      connect.textContent = state === "playing" ? "Pause" : "Play";
      if (state === "ended") say(songName + " · ended");
    });
    player.load(song);
    const made = cuesFromSong(song), m = song.meters[0]!;
    score = { timeline: made.timeline, beat: made.beat, barBeats: (m.numerator * 4) / m.denominator, sections: made.sections };
    songName = song.name; songBars = made.sections.length;
    songKey = "midi:" + song.name + ":" + song.notes.length; lanes = made.lanes;
    band?.load(made.timeline, songKey);
    connect.textContent = "Play";
  }
  function clear() {
    player?.stop();
    if (player) connect.textContent = "Play";
    stopMic?.(); stopMic = undefined; stopRadio?.(); stopRadio = undefined; micConnected = false;
    if (file?.source) { file.source.onended = null; file.source.stop(); }
    file = undefined; filePlay.hidden = true;
    live.engine = createLive(); live.radio = live.stream = quietLevels; live.host = null; live.activeUntil = 0;
  }
  function select() {
    clear();
    const source = input.value;
    songPick.hidden = source !== "midi";
    connect.hidden = !["midi", "microphone", "file"].includes(source);
    score = null; songKey = null; lanes = [];
    if (source === "midi") { useSong(nightMarket()); songPick.value = "night-market"; say("Night Market · press Play"); }
    if (source === "file") { connect.textContent = "Choose file…"; say("Choose an audio file: it is analysed before it plays"); }
    if (source === "microphone") { connect.textContent = "Start mic"; say("Microphone off"); }
    if (source === "radio") {
      say(ctx.audioLevels?.listen ? "Waiting for audio · press Play in Radio" : "Open on the desktop to connect Radio");
      stopRadio = ctx.audioLevels?.listen?.(levels => {
        if (closed || input.value !== "radio") return;
        live.radio = levels;
        if (Math.max(levels.bass, levels.mid, levels.treble) > .001) live.activeUntil = performance.now() + 600;
      });
    }
    if (source === "program") say("Listening for cue calls");
  }
  function startMic() {
    say("Opening microphone… allow access in your browser");
    connect.textContent = "Stop mic";
    stopMic = listenMicrophone((v, host) => {
      live.stream = v;
      if (host) live.host = { ...host, notes: [...(live.host?.notes ?? []), ...host.notes] };
      if (Math.max(v.bass, v.mid, v.treble) > .015 || host?.notes.length) live.activeUntil = performance.now() + 600;
    }, error => {
      if (closed || input.value !== "microphone") return;
      micConnected = !error;
      if (error) { stopMic = undefined; live.stream = quietLevels; connect.textContent = "Start mic"; }
      say(error || "Microphone connected · waiting for sound");
    });
  }
  /** Every cue of some roles, in time order (for a file's sections). */
  function every(roles: Role[], from: Score["timeline"]) {
    const out: Cue[] = [];
    for (const role of roles) { let t = -1; for (;;) { const c = from.upcoming(role, t); if (!c || c.time <= t) break; out.push(c); t = c.time; } }
    return out;
  }
  async function playFile(chosen: File) {
    clear();
    const ac = context();
    say("Decoding " + chosen.name + "…");
    try {
      const buffer = await ac.decodeAudioData(await chosen.arrayBuffer());
      const analysis = await analyse(buffer, f => say("Analysing " + chosen.name + " · " + Math.round(f * 100) + "%"));
      if (input.value !== "file") return;
      const origin = analysis.beats[0] ?? 0;
      const sections = sectionsOf(every(["kick", "snare", "hat", "bass"], analysis.timeline).map(c => ({ ...c, time: c.time - origin })), analysis.beat * 4, buffer.duration);
      score = { timeline: analysis.timeline, beat: analysis.beat, barBeats: 4, sections, origin };
      songKey = "audio:" + chosen.name + ":" + buffer.duration.toFixed(1); lanes = lanesOf(analysis.timeline);
      band?.load(analysis.timeline, songKey);
      file = { source: null, buffer, startAt: 0, pausedAt: 0, playing: false, name: chosen.name, bpm: analysis.bpm };
      await toggleFile();
    } catch (error) { say("Audio file: " + (error instanceof Error ? error.message : String(error))); }
  }
  async function toggleFile() {
    if (!file) return;
    const ac = context();
    await ac.resume();
    if (file.playing) {
      file.pausedAt = ac.currentTime - file.startAt; file.playing = false;
      if (file.source) { file.source.onended = null; file.source.stop(); file.source = null; }
      filePlay.textContent = "Play audio";
      return;
    }
    const source = ac.createBufferSource();
    source.buffer = file.buffer; source.connect(ac.destination);
    const offset = file.pausedAt >= file.buffer.duration ? 0 : file.pausedAt;
    file.startAt = ac.currentTime + 0.05 - offset;
    source.start(ac.currentTime + 0.05, offset);
    source.onended = () => { if (file) { file.playing = false; file.pausedAt = file.buffer.duration; filePlay.textContent = "Replay"; } };
    file.source = source; file.playing = true;
    filePlay.hidden = false; filePlay.textContent = "Pause audio";
  }
  /** The moment of a file being heard when a frame drawn now is on the screen. */
  function fileHeard(frameAt: number, ahead: number) {
    if (!file || !audio) return null;
    if (!file.playing) return file.pausedAt || null;
    const stamp = audio.getOutputTimestamp?.();
    const now = stamp && stamp.contextTime! > 0 && stamp.performanceTime! > 0 ? stamp.contextTime! + (frameAt + ahead - stamp.performanceTime!) / 1000
      : audio.currentTime - (audio.outputLatency || audio.baseLatency || 0) + ahead / 1000;
    return now - file.startAt;
  }

  on(input, "change", e => { select(); if (input.value === "microphone" && e.isTrusted) startMic(); });
  on(songPick, "change", () => {
    if (songPick.value === "load") midiFile.click();
    else if (songPick.value === "night-market") { useSong(nightMarket()); say("Night Market · press Play"); }
  });
  on(midiFile, "change", async () => {
    const chosen = midiFile.files?.[0]; midiFile.value = "";
    if (!chosen) { songPick.value = songName === "Night Market" ? "night-market" : "loaded"; return; }
    try {
      const song = readMidi(new Uint8Array(await chosen.arrayBuffer()), chosen.name.replace(/\.midi?$/i, ""));
      if (!song.notes.length) throw new Error("it has no notes");
      useSong(song);
      let option = songPick.querySelector<HTMLOptionElement>('option[value="loaded"]');
      if (!option) { option = document.createElement("option"); option.value = "loaded"; songPick.insertBefore(option, songPick.lastElementChild); }
      option.textContent = song.name;
      songPick.value = "loaded";
      await player!.play();
    } catch (error) { say("MIDI file: " + (error instanceof Error ? error.message : String(error))); songPick.value = "night-market"; }
  });
  on(connect, "click", () => {
    if (input.value === "midi") { if (player?.playing) player.pause(); else void player?.play(); return; }
    if (input.value === "file") { audioFile.click(); return; }
    if (stopMic) select(); else startMic();
  });
  on(audioFile, "change", () => { const chosen = audioFile.files?.[0]; audioFile.value = ""; if (chosen && input.value === "file") void playFile(chosen); });
  on(filePlay, "click", () => { void toggleFile(); });

  // ── the controls: a drag previews here and saves when it is let go ──
  const edits = new Map<keyof Show, number>();
  let syncEdit: number | null = null;
  const lightEdits = new Map<keyof Lighting, number>();
  const panel = part(".controls");
  const edit = (e: Event) => {
    const field = e.target;
    if (!(field instanceof HTMLInputElement)) return;
    if (field.hasAttribute("data-sync")) {
      const ms = Math.round(field.valueAsNumber);
      syncEdit = ms;
      field.parentElement!.querySelector("output")!.textContent = signed(ms);
      field.setAttribute("aria-valuetext", signed(ms));
      if (e.type === "change") void ctx.act("setSync", { ms }).catch(error => say(String(error))).finally(() => { if (syncEdit === ms) syncEdit = null; });
      return;
    }
    if (field.dataset.lighting) {
      const control = field.dataset.lighting as keyof Lighting, value = field.valueAsNumber;
      lightEdits.set(control, value);
      const readout = Math.round(value * 100) + "%";
      field.parentElement!.querySelector("output")!.textContent = readout;
      field.setAttribute("aria-valuetext", readout);
      if (e.type === "change") void ctx.act("setLighting", { control, value }).catch(error => say(String(error))).finally(() => { if (lightEdits.get(control) === value) lightEdits.delete(control); });
      return;
    }
    if (!field.dataset.show) return;
    const control = field.dataset.show as keyof Show, value = field.valueAsNumber;
    edits.set(control, value);
    const readout = Math.round(value * 100) + "%";
    field.parentElement!.querySelector("output")!.textContent = readout;
    field.setAttribute("aria-valuetext", readout);
    if (e.type !== "change") return;
    void ctx.act("setShow", { control, value }).catch(error => say(String(error))).finally(() => { if (edits.get(control) === value) edits.delete(control); });
  };
  on(panel, "input", edit);
  on(panel, "change", edit);
  on(part("[data-reset-show]"), "click", () => { edits.clear(); lightEdits.clear(); void ctx.act("resetShow", {}).catch(error => say(String(error))); });
  const show = (): Show => { const saved = ctx.props("show") as Show; return edits.size ? { ...saved, ...Object.fromEntries(edits) } : saved; };
  const lighting = (): Lighting => { const saved = ctx.props("lighting") as Lighting; return lightEdits.size ? { ...saved, ...Object.fromEntries(lightEdits) } : saved; };
  const sync = () => syncEdit ?? ((ctx.props("sync") as number | undefined) ?? 0);

  // ── the camera: drag to turn, wheel or pinch to come closer, double-click, Home or Reset view to go back ──
  let view: View = homeView();
  const fingers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const resetView = () => { view = homeView(); };
  on(canvas, "contextmenu", e => e.preventDefault());
  on(canvas, "pointerdown", e => {
    const p = e as PointerEvent;
    canvas.setPointerCapture(p.pointerId);
    fingers.set(p.pointerId, { x: p.clientX, y: p.clientY });
    canvas.classList.add("navigating"); pinch = 0;
  });
  const lift = (e: Event) => { fingers.delete((e as PointerEvent).pointerId); pinch = 0; if (!fingers.size) canvas.classList.remove("navigating"); };
  on(canvas, "pointerup", lift);
  on(canvas, "pointercancel", lift);
  on(canvas, "pointermove", e => {
    const p = e as PointerEvent, f = fingers.get(p.pointerId);
    if (!f) return;
    const dx = p.clientX - f.x, dy = p.clientY - f.y;
    f.x = p.clientX; f.y = p.clientY;
    if (fingers.size === 2) {
      const [a, b] = [...fingers.values()], d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch) view.dist = clamp(view.dist * (pinch / d), NEAR, FAR);
      pinch = d;
    } else { view.yaw -= dx * 0.006; view.pitch = clamp(view.pitch + dy * 0.005, LOW, HIGH); }
  });
  on(canvas, "wheel", e => { const w = e as WheelEvent; w.preventDefault(); view.dist = clamp(view.dist * Math.exp(w.deltaY * 0.0012), NEAR, FAR); });
  on(canvas, "dblclick", resetView);
  on(canvas, "keydown", e => {
    const k = (e as KeyboardEvent).key;
    const turn: Record<string, () => void> = {
      ArrowLeft: () => { view.yaw += 0.08; }, ArrowRight: () => { view.yaw -= 0.08; },
      ArrowUp: () => { view.pitch = clamp(view.pitch + 0.05, LOW, HIGH); }, ArrowDown: () => { view.pitch = clamp(view.pitch - 0.05, LOW, HIGH); },
      "+": () => { view.dist = clamp(view.dist * 0.92, NEAR, FAR); }, "=": () => { view.dist = clamp(view.dist * 0.92, NEAR, FAR); },
      "-": () => { view.dist = clamp(view.dist / 0.92, NEAR, FAR); }, Home: resetView,
    };
    if (!turn[k]) return;
    e.preventDefault(); turn[k]();
  });
  on(part("[data-view-reset]"), "click", resetView);

  let paused = false;
  on(pause, "click", () => {
    paused = !paused;
    pause.textContent = paused ? "Resume scene" : "Pause scene";
    pause.setAttribute("aria-pressed", String(paused));
  });

  // ── each frame: where is the music, and what does each actor on the stage do there ──
  let closed = false, raf = 0, last = performance.now(), sceneTime = 2, clock = 0;
  // Dynamic resolution, as games do it: the art resolution is scaled (0.6–1) to hold 60 frames a second. It judges only
  // after four seconds of drawing (the first frames are slow while shaders compile), steps down a tenth when the smoothed
  // frame time has been over budget for 1.5 s, and up a tenth after 4 s under it; a step up that turns out too much is
  // undone and that level is not tried again for 20 s, so it never hunts.
  const pixels = part<HTMLSelectElement>("#ns-pixels");
  let scale = 1, ceiling = 1, ceilingUntil = 0, slowFor = 0, fastFor = 0, pace = 1 / 60, drawing = 0, raisedAt = -1;
  let stall: Awaited<ReturnType<typeof createStall>> | undefined;
  let actors: Actor[] = [], lampIds: string[] = [];
  let frame: StageFrame | null = null;

  /** The moment of music to draw: which score, and what time in it will be heard when this frame is on the screen. */
  function hearing(now: number, s: Show): { t: number | null; score: Score | null } {
    const ahead = PRESENT_MS + sync(), source = input.value;
    if (source === "midi" && score && player) {
      const t = player.heard(now, ahead);
      if (t === null) say(songName + " · press Play");
      return { t, score };
    }
    if (source === "file" && score && file) return { t: fileHeard(now, ahead), score };
    // live: read this frame's levels into the live time line, then draw the moment that will be on screen
    const reading: Levels = source === "radio" ? live.radio : source === "program" ? (ctx.props("signal") as Levels) : live.stream;
    const listening = source === "radio" ? now < live.activeUntil : source === "microphone" ? micConnected : source === "program";
    const tempo = live.engine.confident ? Math.round(live.engine.bpm) + " BPM" : "finding the beat";
    if (source === "radio" && stopRadio) say(listening ? "Radio live · " + tempo : "Waiting for audio · press Play in Radio");
    if (source === "microphone" && micConnected) say(now < live.activeUntil ? (live.host?.transport ? "DAW through sys0 Bridge · " : "Microphone live · ") + tempo : "Microphone connected · waiting for sound");
    if (!listening) return { t: null, score: null };
    live.engine.read({ ...reading, spectrum: (reading as MeasuredLevels).spectrum ?? null, host: source === "microphone" ? live.host : null }, now / 1000, LIVE_LATENCY, s.sensitivity);
    if (live.host) live.host = { ...live.host, notes: [] };
    return { t: now / 1000 + ahead / 1000, score: live.engine.score() };
  }

  function describe(m: Moment) {
    if (!m.playing) return;
    const kind = m.section?.kind ?? null, bar = Math.max(1, m.barIndex + 1);
    if (input.value === "midi" && player) {
      const at = clamp(bar, 1, songBars || bar), named = songName === "Night Market" ? [...SECTIONS].reverse().find(x => x.bar <= at)?.name : kind;
      say(songName + " · bar " + at + (songBars ? " of " + songBars : "") + (named ? " · " + named : "") + " · " + Math.round(60 / m.beat) + " BPM" + (player.playing ? "" : " · paused"));
    } else if (input.value === "file" && file)
      say(file.name + " · " + Math.round(file.bpm) + " BPM · bar " + bar + (kind ? " · " + kind : "") + (file.playing ? "" : " · paused"));
  }

  function tick(now: number) {
    if (closed) return;
    // a recorded track added or deleted: load this song's tracks into its time line again
    const tracks = ctx.props("tracks");
    if (tracks !== lastTracks) { lastTracks = tracks; if (score) band.load(score.timeline, songKey); }
    if (input.value !== "midi" && input.value !== "file" && now - lastLanes > 1000) { lastLanes = now; lanes = lanesOf(live.engine.score().timeline, live.engine.channels); }
    band.tick(now);
    const dt = Math.min(.1, Math.max(0, (now - last) / 1000));
    last = now;
    const s = show();
    if (!paused && stall) {
      clock += dt;
      sceneTime = (sceneTime + dt) % LOOP;
      const heard = hearing(now, s), m = momentOf(heard.t, clock, heard.score, s, reduced.matches);
      frame = compose(actors, m, lighting(), lampIds, band.links());
      describe(m);
    }
    const order = ["kick", "snare", "hat", "bass", "pad", "lead"] as const;
    lamps.forEach((lamp, i) => { lamp.style.transform = "scaleY(" + (.08 + .92 * clamp(frame?.meters[order[i]!] ?? 0, 0, 1)) + ")"; });
    if (stall && frame) {
      stall.set(frame.pose, frame.fx);
      const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
      drawing += dt; pace += (dt - pace) * 0.08;
      if (drawing > 4 && !document.hidden) {
        slowFor = pace > 1 / 52 ? slowFor + dt : 0; fastFor = pace < 1 / 57 ? fastFor + dt : 0;
        if (slowFor > 1.5 && scale > 0.6) {
          if (drawing - raisedAt < 3) { ceiling = scale - 0.1; ceilingUntil = drawing + 20; }
          scale = Math.max(0.6, +(scale - 0.1).toFixed(1)); slowFor = 0; pace = 1 / 60;
        }
        if (drawing > ceilingUntil) ceiling = 1;
        if (fastFor > 4 && scale < ceiling) { scale = Math.min(ceiling, +(scale + 0.1).toFixed(1)); fastFor = 0; raisedAt = drawing; }
      }
      if (r.width > 0 && r.height > 0) stall.draw(sceneTime, view, frame.light, r.width * dpr, r.height * dpr, pixels.value === "classic" ? "classic" : "fine", scale);
    }
    raf = requestAnimationFrame(tick);
  }

  let lastTracks: unknown = null, lastLanes = 0;
  const band = mountBand(ctx, events.signal, {
    lanes: () => lanes,
    song: () => songKey,
    now: () => {
      const at = performance.now();
      if (input.value === "midi" && player?.playing) return player.heard(at, sync());
      if (input.value === "file" && file?.playing) return fileHeard(at, sync());
      return null;
    },
    grid: () => ({ beat: score?.beat ?? 0.5, origin: score?.origin ?? 0 }),
    timeline: () => score?.timeline ?? null,
    states: () => frame?.states ?? {},
    playing: () => frame?.links ?? {},
    say,
  });
  select();
  raf = requestAnimationFrame(tick);
  createStall(canvas).then(made => {
    if (closed) { made.dispose(); return; }
    stall = made; actors = nightStallStage(made.rig); lampIds = made.lamps.map(l => l.id); loading.hidden = true;
  }, error => {
    loading.hidden = true;
    const message = part(".scene-error");
    message.textContent = error instanceof Error ? error.message : "The stall could not be drawn.";
    message.hidden = false;
  });

  const dispose = () => {
    if (closed) return;
    closed = true; cancelAnimationFrame(raf);
    events.abort(); clear(); player?.dispose(); stall?.dispose(); void audio?.close();
  };
  on(window, "pagehide", event => {
    if (!(event as PageTransitionEvent).persisted) return dispose();
    if (input.value === "microphone") select();
  });
  on(window, "pageshow", () => { last = performance.now(); });
  // (a test or the console can reach the clock and the score)
  (window as unknown as { __nightStall?: unknown }).__nightStall = { get player() { return player; }, get score() { return score; }, get frame() { return frame; }, get actors() { return actors; }, get scale() { return scale; }, context: () => audio };
  return dispose;
}
