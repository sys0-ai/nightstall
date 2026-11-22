import type { State } from "./app.ts";

type Control = keyof State["show"];
type Ctx<T> = { state: State; input: T };

const defaults: State["show"] = {
  sensitivity: .65, table: .6, cat: .7, steam: .6, bubbles: .6, glow: .6, color: .35, puddle: .6, sign: .5, rain: .6, wind: .4, mist: .5,
};
const sections: { name: string; channels: [Control, string, string][] }[] = [
  { name: "Music", channels: [
    ["sensitivity", "Sensitivity", "All input bands"],
    ["table", "Table", "Kick: hop and bounce · bass and hats: rattle"],
    ["cat", "Cat", "Snare: nods, chin up just before · bar: tail"],
    ["steam", "Steam", "Section energy · bass and melody swell it"],
    ["bubbles", "Bubbles", "Hats fizz · kick and bass boil"],
    ["glow", "Lamps", "Kick: flash, haze ducks · chords: glow · drop: flare"],
    ["color", "Color", "One hue per section, from its chord · each bar leans it"],
    ["puddle", "Puddles", "Kick and bass notes: rings · held bass: standing waves"],
    ["sign", "Sign", "Downbeats swing it · crashes blink its neon"],
  ] },
  { name: "Weather", channels: [
    ["rain", "Rain", "Dry to downpour"],
    ["wind", "Wind", "How much what hangs swings"],
    ["mist", "Mist", "Haze around the lamps"],
  ] },
];

const lightingDefaults: State["lighting"] = { strength: .5, fill: .25, reach: .5, softness: .5, ambient: .5, snap: .6 };
const lightingControls: [keyof State["lighting"], string, string][] = [
  ["strength", "Strength", "How strongly the lamps' changing light shows on what it lights"],
  ["fill", "Fill", "Extra lamplight beyond what is baked into the scene"],
  ["reach", "Reach", "How far each lamp's light carries"],
  ["softness", "Softness", "How far light wraps round surfaces turned away"],
  ["ambient", "Ambient", "The level of everything the lamps do not light"],
  ["snap", "Pixel snap", "Smooth dithered colour, or only the scene's own palette"],
];

const LINK = /^(free|grid:(beat|bar|section)|follow:[a-z.]{1,40}|lane:(kick|snare|hat|open|crash|tom|low|bass|pad|keys|lead|part:\d{1,3}:\d{1,2}|control:[\w-]{1,40}))$/;

export const actions = {
  setLink({ state, input: { performer, link } }: Ctx<{ performer: string; link: string }>) {
    if (!/^[a-z.]{1,60}$/.test(performer)) throw Error("Name a performer.");
    if (link && !LINK.test(link)) throw Error("Link it to a lane, the grid, another performer, or free.");
    const band = { ...state.band };
    if (link) band[performer] = link; else delete band[performer];
    return { state: { ...state, band } };
  },
  saveTrack({ state, input: { id, name, song, hits } }: Ctx<State["tracks"][number]>) {
    if (!/^[\w-]{1,40}$/.test(id) || !name.trim() || !song) throw Error("A track needs an id, a name and its song.");
    if (hits.length % 2 || hits.some((v, i) => !Number.isFinite(v) || (i % 2 ? v < 0 || v > 1 : v < 0))) throw Error("Hits are pairs of seconds and a velocity from 0 to 1.");
    const tracks = [...state.tracks.filter(t => t.id !== id), { id, name: name.trim(), song, hits }];
    if (tracks.length > 64) throw Error("Delete a track first: there can be 64.");
    return { state: { ...state, tracks } };
  },
  deleteTrack({ state, input: { id } }: Ctx<{ id: string }>) {
    const band = Object.fromEntries(Object.entries(state.band).filter(([, link]) => link !== "lane:control:" + id));
    return { state: { ...state, tracks: state.tracks.filter(t => t.id !== id), band } };
  },
  setLighting({ state, input: { control, value } }: Ctx<{ control: keyof State["lighting"]; value: number }>) {
    if (!Object.hasOwn(state.lighting, control) || !Number.isFinite(value) || value < 0 || value > 1)
      throw Error("Choose a lighting control and a value between zero and one.");
    return { state: { ...state, lighting: { ...state.lighting, [control]: value } } };
  },
  setShow({ state, input: { control, value } }: Ctx<{ control: Control; value: number }>) {
    if (!Object.hasOwn(state.show, control) || !Number.isFinite(value) || value < 0 || value > 1)
      throw Error("Choose a control and a value between zero and one.");
    return { state: { ...state, show: { ...state.show, [control]: value } } };
  },
  resetShow({ state }: { state: State }) {
    return { state: { ...state, show: defaults, lighting: lightingDefaults } };
  },
  setSync({ state, input: { ms } }: Ctx<{ ms: number }>) {
    if (!Number.isInteger(ms) || ms < -150 || ms > 150) throw Error("Choose a whole number of milliseconds from −150 to 150.");
    return { state: { ...state, sync: ms } };
  },
  cue({ state, input: { bass, mid, treble, beat } }: Ctx<State["signal"]>) {
    if (![bass, mid, treble, beat].every(x => Number.isFinite(x) && x >= 0 && x <= 1))
      throw Error("Each cue level must be between 0 and 1.");
    return { state: { ...state, signal: { bass, mid, treble, beat } } };
  },
};

export function view({ state }: { state: State }) {
  return {
    ...state,
    lightingControls: lightingControls.map(([key, label, note]) => ({ key, label, note, value: state.lighting[key], readout: Math.round(state.lighting[key] * 100) + "%" })),
    syncReadout: (state.sync > 0 ? "+" : state.sync < 0 ? "−" : "") + Math.abs(state.sync) + " ms",
    sections: sections.map(({ name, channels }) => ({
      name,
      channels: channels.map(([key, label, note]) => ({ key, label, note, value: state.show[key], readout: Math.round(state.show[key] * 100) + "%" })),
    })),
  };
}
