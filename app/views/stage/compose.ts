// The stage: actors composed into one frame. Each frame it builds the moment, then for each actor in order evaluates
// its idle life and every reaction (the recent cues that set an action off, and the next one when the reaction looks
// ahead), and merges what they give: poses add, scales multiply, lights fold by their rule, emitter amounts add, and the
// environment bus carries values to the actors after. It also records which cues set off which action, so one actor
// can react to another's ("after: table.hop"), and what each actor is doing, for the readout.
import type { Cue } from "../cues.ts";
import type { Fx, Light, Pose } from "../stall.ts";
import type { Actor, Link, Out, Trigger } from "./actor.ts";
import type { Moment } from "./moment.ts";
import { clamp } from "./clips.ts";

export type StageFrame = {
  pose: Record<string, Pose>;
  fx: Fx;
  light: Light;
  /** what each actor is doing */
  states: Record<string, string>;
  /** what each actor plays this frame */
  links: Record<string, Link>;
  meters: Record<"kick" | "snare" | "hat" | "bass" | "pad" | "lead", number>;
};

const HORIZON = 4;   // seconds: older cues are spent

/** A grid's cues around now: the beat or bar that has just begun, the one before, and with a lead the next. */
function gridCues(every: "beat" | "bar", m: Moment, lead: number): Cue[] {
  const step = every === "bar" ? m.bar : m.beat;
  const last = m.barStart + Math.floor((m.t - m.barStart) / step + 1e-9) * step;
  return [last - step, last, ...(lead ? [last + step] : [])].map(time => ({ time, role: "kick" as const, velocity: 1, duration: step, pitch: 0 }));
}

/** The cues a link answers to at this moment: recent ones and, with a lead, the next. */
function linkCues(link: Link, m: Moment, fired: Map<string, Cue[]>, lead: number, count: number): Cue[] {
  if (!m.playing || link === "free") return [];
  if (link.startsWith("follow:")) return (fired.get(link.slice(7) + ".plays") ?? []).slice(0, count);
  if (link === "grid:beat" || link === "grid:bar") return gridCues(link.slice(5) as "beat" | "bar", m, lead);
  if (link === "grid:section") {
    const out: Cue[] = [];
    for (let b = Math.max(0, m.barIndex - 1); b <= m.barIndex + (lead ? 1 : 0); b++)
      if (b === 0 || m.sections[b]?.kind !== m.sections[b - 1]?.kind) out.push({ time: m.barStart + (b - m.barIndex) * m.bar, role: "crash", velocity: 1, duration: m.bar, pitch: 0 });
    return out;
  }
  const lane = link.startsWith("lane:") ? link.slice(5) : link, out = [...m.timeline.recent(lane, m.t, count)];
  if (lead) { const next = m.timeline.upcoming(lane, m.t); if (next) out.push(next); }
  return out;
}

/** The cues a trigger answers to at this moment: recent ones (newest first) and, with a lead, the next one. */
function cuesFor(when: Trigger, m: Moment, fired: Map<string, Cue[]>, actor: Actor): Cue[] {
  if ("after" in when) return (fired.get(when.after) ?? []).slice(0, when.count ?? 3);
  const lead = when.lead ?? 0, keep = (c: Cue) => m.t - c.time < HORIZON && m.t - c.time > -lead - 1e-9 && (!when.where || when.where(c, m));
  if ("plays" in when) return linkCues(m.links[actor.id] ?? "free", m, fired, lead, when.count ?? 3).filter(keep).sort((a, b) => b.time - a.time);
  if ("every" in when) return gridCues(when.every, m, lead).filter(keep).reverse();
  const out: Cue[] = [];
  const roles = Array.isArray(when.on) ? when.on : [when.on];
  for (const role of roles) {
    for (const c of m.timeline.recent(role, m.t, when.count ?? 3)) if (keep(c)) out.push(c);
    if (lead) { const next = m.timeline.upcoming(role, m.t); if (next && keep(next)) out.push(next); }
  }
  return out.sort((a, b) => b.time - a.time);
}

/** What a performer plays: the person's link if there is one, else the first of its own defaults the song has. */
export function resolveLink(actor: Actor, chosen: Link | undefined, m: Moment): Link {
  if (chosen) return chosen;
  for (const link of actor.plays ?? []) {
    if (!link.startsWith("lane:") || m.timeline.has(link.slice(5)) || !m.playing) return link;
  }
  return actor.plays?.[0] ?? "free";
}

export function compose(actors: Actor[], m: Moment, lighting: Light["lighting"], lampIds: string[], links: Record<string, Link> = {}): StageFrame {
  for (const actor of actors) m.links[actor.id] = resolveLink(actor, links[actor.id], m);
  const pose: Record<string, Pose> = {}, fx: Fx = { rain: 0, steam: 0, steamLevel: 0, bubbles: 0, boil: 0, burst: 0, burstAge: Infinity };
  const bus = { glow: 0, duck: 0, pulse: 0, hue: 0, mist: 0, sparkle: 0 };
  const water: Light["water"] = { t: m.t, hits: [], hum: 0, hz: 6 };
  const lampGain: Record<string, number> = {}, states: Record<string, string> = {}, fired = new Map<string, Cue[]>();
  const take = (out: Out | undefined, actor: Actor) => {
    if (!out) return;
    for (const [name, p] of Object.entries(out.pose ?? {})) {
      const have = (pose[name] ??= {});
      if (p.rot) have.rot = (have.rot ?? [0, 0, 0]).map((v, i) => v + (p.rot![i] ?? 0));
      if (p.pos) have.pos = (have.pos ?? [0, 0, 0]).map((v, i) => v + (p.pos![i] ?? 0));
      if (p.scale) have.scale = (have.scale ?? [1, 1, 1]).map((v, i) => v * (p.scale![i] ?? 1));
      if (p.show !== undefined) have.show = Math.min(have.show ?? 1, p.show);
    }
    const l = out.light ?? {};
    bus.glow += l.glow ?? 0; bus.duck += l.duck ?? 0; bus.hue += l.hue ?? 0; bus.mist += l.mist ?? 0;
    bus.pulse = Math.max(bus.pulse, l.pulse ?? 0); bus.sparkle = Math.max(bus.sparkle, l.sparkle ?? 0);
    for (const [id, v] of Object.entries(out.lamps ?? {})) lampGain[id] = (lampGain[id] ?? 0) + v;
    if (out.water) { water.hits.push(...(out.water.hits ?? [])); water.hum += out.water.hum ?? 0; if (out.water.hz) water.hz = out.water.hz; }
    // (amounts add; an age is the most recent one's, with its strength)
    if (out.fx?.burstAge !== undefined && out.fx.burstAge < fx.burstAge) { fx.burstAge = out.fx.burstAge; fx.burst = out.fx.burst ?? 0; }
    for (const [k, v] of Object.entries(out.fx ?? {})) if (k !== "burstAge" && k !== "burst") fx[k as keyof Fx] += v ?? 0;
    Object.assign(m.env, out.env ?? {});
    if (out.state) states[actor.id] = out.state;
  };
  for (const actor of actors) {
    take(actor.idle?.(m), actor);
    for (const reaction of actor.reactions ?? []) {
      const action = actor.actions?.[reaction.play];
      if (!action) continue;
      const cues = cuesFor(reaction.when, m, fired, actor), key = actor.id + "." + ("plays" in reaction.when ? "plays" : reaction.play);
      fired.set(key, cues.filter(c => c.time <= m.t + 0.2));
      cues.forEach((cue, i) => {
        const age = m.t - cue.time;
        if (reaction.until !== undefined && age > reaction.until) return;
        take(action(age, cue, m, Math.round(cue.time / (m.beat / 2))), actor);
      });
    }
  }
  const tl = m.timeline, t = m.t, beat = m.beat;
  const meters = m.playing ? {
    kick: tl.hit("kick", t, beat / 3), snare: tl.hit("snare", t, beat / 2),
    hat: Math.max(tl.held("hat", t, beat * 0.75) * 0.7, tl.hit("hat", t, beat), tl.hit("open", t, beat * 1.2)),
    bass: tl.held("bass", t, beat), pad: Math.max(tl.held("pad", t, beat * 2), tl.hit("keys", t, beat / 2)), lead: tl.held("lead", t, beat / 2),
  } : { kick: 0, snare: 0, hat: 0, bass: 0, pad: 0, lead: 0 };
  const glow = clamp(1 + bus.glow - bus.duck, 0.35, 1.8);
  return {
    pose, states, meters, links: { ...m.links },
    fx: { rain: clamp(fx.rain), steam: clamp(fx.steam), steamLevel: clamp(fx.steamLevel), bubbles: clamp(fx.bubbles), boil: clamp(fx.boil), burst: clamp(fx.burst), burstAge: fx.burstAge },
    light: { glow, pulse: clamp(bus.pulse, 0, 0.75), hue: bus.hue, mist: Math.max(0, bus.mist), rain: fx.rain / 0.6, water: { ...water, hum: clamp(water.hum) }, sparkle: bus.sparkle, lighting,
      lamps: Object.fromEntries(lampIds.map(id => [id, Math.max(0, 1 + (lampGain["*"] ?? 0) + (lampGain[id] ?? 0) + (lampGain[id.split(".")[0]!] ?? 0) * (id.includes(".") ? 1 : 0))])) },
  };
}
