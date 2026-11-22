// The Band panel: the stall as an animatronic band. Each row is a performer and what it plays: a lane of the song (a
// drum, a part, the chords), the beat grid, another performer it follows, a control track recorded for this song, or
// nothing (free: it lives its own life). "Record a new track…" programs a performer the way animatronic shows were
// programmed: play the song and tap the performer's hits in real time (Space, Enter or the Tap button); the taps snap to
// 16ths if asked, preview live as you tap, and loop round with the song so a part can be built over several passes.
import type { Cue, Lane, Timeline } from "./cues.ts";
import type { Link } from "./stage/actor.ts";

type Ctx = { el: Element; props(path: string): unknown; act(method: string, input: Record<string, unknown>): Promise<unknown> };
export type Track = { id: string; name: string; song: string; hits: number[] };
export type BandHooks = {
  /** the lanes of the music now playing */
  lanes(): Lane[];
  /** which song is loaded (control tracks belong to one), or null when listening live */
  song(): string | null;
  /** the song time being heard right now, or null when nothing plays */
  now(): number | null;
  /** the beat length and where bar 1 starts, for snapping */
  grid(): { beat: number; origin: number };
  /** the current time line, to show the tracks in it */
  timeline(): Timeline | null;
  /** what each performer is doing this frame, and what it plays */
  states(): Record<string, string>;
  playing(): Record<string, Link>;
  say(message: string): void;
};

const GRID: [Link, string][] = [["grid:beat", "Every beat"], ["grid:bar", "Every bar"], ["grid:section", "Section changes"]];
const TITLES: Record<string, string> = {
  lamps: "the lamps", lighting: "the colour", puddles: "the puddles", table: "the table", "table.bottle": "the things on the table",
  cat: "the cat", sign: "the sign", bulbs: "the bulbs", steam: "the steam", bubbles: "the bubbles", weather: "the wind",
};

/** A link in words: the lane's name, the grid, who it follows. */
function describe(link: Link, lanes: Lane[]): string {
  if (!link) return "…";
  if (link === "free") return "free";
  if (link.startsWith("follow:")) return "follows " + (TITLES[link.slice(7)] ?? link.slice(7));
  const grid = GRID.find(([l]) => l === link); if (grid) return grid[1].toLowerCase();
  return lanes.find(l => "lane:" + l.id === link)?.label ?? link.replace("lane:", "");
}

export function mountBand(ctx: Ctx, signal: AbortSignal, hooks: BandHooks) {
  const rows = Array.from(ctx.el.querySelectorAll<HTMLSelectElement>("select[data-plays]")).map(select => ({
    select, ids: select.dataset.plays!.split(","), doing: ctx.el.querySelector<HTMLElement>(`[data-doing="${select.dataset.plays!.split(",")[0]}"]`),
  }));
  const recorder = ctx.el.querySelector<HTMLElement>("[data-recorder]")!, note = recorder.querySelector<HTMLElement>("[data-recording]")!;
  const snap = recorder.querySelector<HTMLInputElement>("[data-snap]")!;
  let recording: { ids: string[]; hits: Cue[]; song: string } | null = null;
  let drawn = "";
  const tracks = () => (ctx.props("tracks") as Track[]) ?? [];
  const links = () => (ctx.props("band") as Record<string, Link>) ?? {};

  /** The control tracks of the song now loaded, as lanes. */
  const programmed = (): Lane[] => tracks().filter(t => t.song === hooks.song()).map(t => ({ id: "control:" + t.id, label: t.name, group: "Programmed" }));

  function render() {
    const lanes = [...hooks.lanes(), ...programmed()], saved = links();
    const playing = hooks.playing();
    const key = JSON.stringify([lanes.map(l => l.id + l.label), saved, !!recording, rows.map(r => playing[r.ids[0]!])]);
    if (key === drawn) return;
    drawn = key;
    for (const { select, ids } of rows) {
      const current = saved[ids[0]!] ?? "";
      select.replaceChildren();
      select.add(new Option("Its own part: " + describe(saved[ids[0]!] ? "" : playing[ids[0]!] ?? "", lanes), ""));
      for (const group of ["Drums", "Parts", "Programmed"] as const) {
        const own = lanes.filter(l => l.group === group);
        if (!own.length) continue;
        const g = document.createElement("optgroup"); g.label = group === "Programmed" ? "Recorded tracks" : group;
        for (const lane of own) g.append(new Option(lane.label, "lane:" + lane.id));
        select.append(g);
      }
      const song = document.createElement("optgroup"); song.label = "The song";
      for (const [link, label] of GRID) song.append(new Option(label, link));
      select.append(song);
      const follow = document.createElement("optgroup"); follow.label = "Follow";
      for (const other of rows) if (other.ids[0] !== ids[0] && other.ids[0] !== "lighting" && other.ids[0] !== "weather") follow.append(new Option("Follow " + TITLES[other.ids[0]!], "follow:" + other.ids[0]));
      select.append(follow);
      const more = document.createElement("optgroup"); more.label = "More";
      if (hooks.song()) more.append(new Option("Record a new track…", "record"));
      if (current.startsWith("lane:control:")) more.append(new Option("Delete this recorded track", "delete"));
      more.append(new Option("Free: its own life", "free"));
      select.append(more);
      select.value = current;
      if (select.value !== current) select.value = "";
      select.disabled = !!recording;
    }
  }

  function start(ids: string[]) {
    const song = hooks.song();
    if (!song) return hooks.say("Recording needs a song playing in the MIDI player or an audio file");
    recording = { ids, hits: [], song };
    recorder.hidden = false;
    note.textContent = "Recording " + TITLES[ids[0]!] + ": play the song and tap each hit with Space, Enter or Tap. It loops, so you can add more on the next pass.";
    render();
  }
  function tap(velocity: number) {
    if (!recording) return;
    let t = hooks.now();
    if (t === null) return hooks.say("Press Play first, then tap along");
    if (snap.checked) { const { beat, origin } = hooks.grid(), step = beat / 4; t = origin + Math.round((t - origin) / step) * step; }
    if (recording.hits.some(c => Math.abs(c.time - t!) < 0.03)) return;
    recording.hits.push({ time: t, role: "tap", velocity, duration: 0.1, pitch: 0, lane: "control:recording" });
    hooks.timeline()?.setLane("control:recording", recording.hits);
  }
  async function stop(save: boolean) {
    const done = recording; recording = null; recorder.hidden = true;
    hooks.timeline()?.setLane("control:recording", []);
    if (save && done && done.hits.length) {
      const id = "t" + Date.now().toString(36), n = tracks().filter(t => t.song === done.song).length + 1;
      const name = (TITLES[done.ids[0]!] ?? "track").replace(/^the /, "").replace(/^./, c => c.toUpperCase()) + " track " + n;
      const hits = [...done.hits].sort((a, b) => a.time - b.time).flatMap(c => [Math.round(c.time * 1000) / 1000, c.velocity]);
      try {
        await ctx.act("saveTrack", { id, name, song: done.song, hits });
        for (const performer of done.ids) await ctx.act("setLink", { performer, link: "lane:control:" + id });
        hooks.say("Saved " + name + " · " + done.hits.length + " hits");
      } catch (error) { hooks.say(String(error)); }
    }
    drawn = ""; render();
  }

  for (const { select, ids } of rows) select.addEventListener("change", () => {
    const value = select.value;
    if (value === "record") { select.value = links()[ids[0]!] ?? ""; start(ids); return; }
    if (value === "delete") {
      const id = (links()[ids[0]!] ?? "").replace("lane:control:", "");
      void ctx.act("deleteTrack", { id }).catch(error => hooks.say(String(error)));
      return;
    }
    for (const performer of ids) void ctx.act("setLink", { performer, link: value }).catch(error => hooks.say(String(error)));
  }, { signal });
  recorder.querySelector("[data-tap]")!.addEventListener("pointerdown", e => { e.preventDefault(); tap(0.9); }, { signal });
  recorder.querySelector("[data-stop]")!.addEventListener("click", () => void stop(true), { signal });
  recorder.querySelector("[data-cancel]")!.addEventListener("click", () => void stop(false), { signal });
  window.addEventListener("keydown", e => {
    if (!recording || e.repeat || (e.key !== " " && e.key !== "Enter")) return;
    if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    e.preventDefault(); tap(e.shiftKey ? 0.5 : 0.9);
  }, { signal });

  let lastDoing = 0;
  return {
    /** the person's links, with a performer being recorded linked to its recording */
    links(): Record<string, Link> {
      const saved = links();
      if (!recording) return saved;
      return { ...saved, ...Object.fromEntries(recording.ids.map(id => [id, "lane:control:recording"])) };
    },
    /** load this song's recorded tracks into its time line */
    load(timeline: Timeline, song: string | null) {
      for (const t of tracks()) if (t.song === song) {
        const cues: Cue[] = [];
        for (let i = 0; i + 1 < t.hits.length; i += 2) cues.push({ time: t.hits[i]!, role: "tap", velocity: t.hits[i + 1]!, duration: 0.1, pitch: 0, lane: "control:" + t.id });
        timeline.setLane("control:" + t.id, cues);
      }
    },
    /** keep the rows in step with the song and the saved links, and say what each performer is doing */
    tick(now: number) {
      render();
      if (now - lastDoing < 120) return;
      lastDoing = now;
      const states = hooks.states();
      for (const { ids, doing } of rows) if (doing) { const s = states[ids[0]!] ?? ""; if (doing.textContent !== s) doing.textContent = s; }
      if (recording) note.dataset.count = String(recording.hits.length);
    },
    get recording() { return !!recording; },
  };
}
