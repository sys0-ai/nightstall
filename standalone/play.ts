// Night Stall with no host: the scene, its stage of actors and the MIDI player, full window.
// Space plays or pauses the built-in song, drop a .mid file to play it instead, P switches Fine/Classic pixels,
// arrow keys turn the camera. Everything the sys0 window adds (controls, band panel, live inputs) is in app/views/main.ts.
import { createStall, homeView, LOOP } from "../app/views/stall.ts";
import { nightMarket } from "../app/views/song.ts";
import { readMidi, type Song } from "../app/views/midi-file.ts";
import { cuesFromSong } from "../app/views/cues.ts";
import { createPlayer } from "../app/views/player.ts";
import { momentOf, type Score } from "../app/views/stage/moment.ts";
import { compose } from "../app/views/stage/compose.ts";
import { nightStallStage } from "../app/views/stage.ts";

/** one frame to the screen and half a frame of bias, so the frame nearest a hit takes it */
const PRESENT_MS = 24;
const canvas = document.querySelector("canvas")!, status = document.querySelector("#status")!;
const say = (text: string) => { status.textContent = text; };

const stall = await createStall(canvas);
const actors = nightStallStage(stall.rig), lampIds = stall.lamps.map(l => l.id);
// every amount 0–1: how strongly each performer answers the music (the sys0 app saves these per person)
const show = { sensitivity: .65, table: .6, cat: .7, steam: .6, bubbles: .6, glow: .6, color: .35, puddle: .6, sign: .5, rain: .6, wind: .4, mist: .5 };
const lighting = { strength: .5, fill: .25, reach: .5, softness: .5, ambient: .5, snap: .6 };
const view = homeView();

let audio: AudioContext | undefined, player: ReturnType<typeof createPlayer> | undefined, score: Score | null = null, name = "";
function use(song: Song) {
  audio ??= new AudioContext({ latencyHint: "interactive" });
  player ??= createPlayer(audio, audio.destination, state => say(name + " · " + state + " · Space to play/pause · drop a .mid · P pixels"));
  player.load(song);
  const made = cuesFromSong(song), m = song.meters[0]!;
  score = { timeline: made.timeline, beat: made.beat, barBeats: (m.numerator * 4) / m.denominator, sections: made.sections };
  name = song.name;
}
async function toggle() {
  if (!player) use(nightMarket());
  if (player!.playing) player!.pause(); else await player!.play();
}
let pixels: "fine" | "classic" = "fine";
addEventListener("keydown", e => {
  if (e.code === "Space") { e.preventDefault(); void toggle(); }
  if (e.key === "p" || e.key === "P") pixels = pixels === "fine" ? "classic" : "fine";
  if (e.key === "ArrowLeft") view.yaw -= 0.05;
  if (e.key === "ArrowRight") view.yaw += 0.05;
  if (e.key === "ArrowUp") view.pitch += 0.03;
  if (e.key === "ArrowDown") view.pitch -= 0.03;
});
addEventListener("pointerdown", () => { if (!player) void toggle(); });
addEventListener("dragover", e => e.preventDefault());
addEventListener("drop", async e => {
  e.preventDefault();
  const f = e.dataTransfer?.files[0]; if (!f) return;
  use(readMidi(new Uint8Array(await f.arrayBuffer()), f.name.replace(/\.midi?$/i, "")));
  await player!.play();
});

let last = performance.now(), clock = 0, sceneTime = 2;
function frame(now: number) {
  const dt = Math.min(.1, (now - last) / 1000); last = now; clock += dt; sceneTime = (sceneTime + dt) % LOOP;
  const t = player?.heard(now, PRESENT_MS) ?? null;
  const f = compose(actors, momentOf(t, clock, score, show, matchMedia("(prefers-reduced-motion: reduce)").matches), lighting, lampIds, {});
  stall.set(f.pose, f.fx);
  const dpr = devicePixelRatio || 1;
  stall.draw(sceneTime, view, f.light, innerWidth * dpr, innerHeight * dpr, pixels);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
say("Click or press Space to play Night Market · drop a .mid file · P switches pixel size · arrows turn");
