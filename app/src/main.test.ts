import { expect, init, test } from "test";
import { actions, view } from "./main.ts";

test("a control saves its value alone, and reset restores every control", () => {
  const state = actions.setShow({ state: init.state, input: { control: "cat", value: 1 } }).state;
  expect(state.show.cat).toBe(1);
  expect(state.show.table).toBe(init.state.show.table);
  expect(view({ state }).sections[0]!.channels.find(ch => ch.key === "cat")?.readout).toBe("100%");
  expect(actions.resetShow({ state }).state.show).toEqual(init.state.show);
});

test("controls refuse values outside zero to one and unknown names", () => {
  for (const value of [-0.1, 1.1, NaN]) expect(() => actions.setShow({ state: init.state, input: { control: "rain", value } })).toThrow();
  expect(() => actions.setShow({ state: init.state, input: { control: "constructor" as never, value: 0.5 } })).toThrow();
});

test("external cues set the signal and leave the controls alone", () => {
  const signal = { bass: 1, mid: 0, treble: 0.4, beat: 0.9 };
  const state = actions.cue({ state: init.state, input: signal }).state;
  expect(state.signal).toEqual(signal);
  expect(state.show).toEqual(init.state.show);
  expect(() => actions.cue({ state: init.state, input: { ...signal, beat: 2 } })).toThrow();
});

test("sync takes whole milliseconds from −150 to 150", () => {
  expect(actions.setSync({ state: init.state, input: { ms: -40 } }).state.sync).toBe(-40);
  expect(view({ state: actions.setSync({ state: init.state, input: { ms: 25 } }).state }).syncReadout).toBe("+25 ms");
  for (const ms of [151, -151, 2.5]) expect(() => actions.setSync({ state: init.state, input: { ms } })).toThrow();
});

test("lighting controls take 0–1 and reset with the rest", () => {
  const state = actions.setLighting({ state: init.state, input: { control: "fill", value: 0.9 } }).state;
  expect(state.lighting.fill).toBe(0.9);
  expect(state.lighting.reach).toBe(init.state.lighting.reach);
  expect(() => actions.setLighting({ state: init.state, input: { control: "fill", value: 2 } })).toThrow();
  expect(actions.resetShow({ state }).state.lighting).toEqual(init.state.lighting);
});

test("performers link to lanes, the grid, each other or nothing, and recorded tracks belong to a song", () => {
  let state = actions.setLink({ state: init.state, input: { performer: "cat", link: "lane:kick" } }).state;
  state = actions.setLink({ state, input: { performer: "sign", link: "follow:table" } }).state;
  expect(state.band).toEqual({ cat: "lane:kick", sign: "follow:table" });
  expect(() => actions.setLink({ state, input: { performer: "cat", link: "lane:../x" } })).toThrow();
  state = actions.saveTrack({ state, input: { id: "t1", name: "Cat track 1", song: "midi:Night Market:1257", hits: [1.5, 0.9, 2, 0.5] } }).state;
  state = actions.setLink({ state, input: { performer: "bubbles", link: "lane:control:t1" } }).state;
  expect(() => actions.saveTrack({ state, input: { id: "t2", name: "x", song: "s", hits: [1] } })).toThrow();
  state = actions.deleteTrack({ state, input: { id: "t1" } }).state;
  expect(state.tracks).toEqual([]);
  expect(state.band.bubbles).toBeUndefined();
  expect(actions.setLink({ state, input: { performer: "cat", link: "" } }).state.band.cat).toBeUndefined();
});
