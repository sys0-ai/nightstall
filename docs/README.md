# Music visuals

How to make visuals that move to music the way a pre-programmed laser or lighting show does: on the beat, each element listening to one thing, with anticipation before the hits.

- [findings.md](findings.md): what professionals do, the timing numbers, why level-driven visuals feel late and mushy, and what was measured in Night Stall.
- [playbook.md](playbook.md): the method: score → audio clock → pure choreography → render; sources from MIDI, audio files, DAW plug-ins, timecode and live listening; mapping tables, envelopes in beats, verification.
- [guide.md](guide.md): building the next one in sys0: the modules to reuse, wiring, testing, shipping and traps.
- [research/](research/): the three source reports, about 170 sources: [design craft](research/design-craft.md), [signal processing](research/dsp.md), [MIDI, plug-ins and show control](research/midi-plugins.md), [routing performers to tracks, recording control tracks, stems](research/routing.md), [how animatronic bands were built and programmed](research/animatronics.md).

The reference implementation is Night Stall (`apps/night-stall/`, ARCHITECTURE "Night Stall").
