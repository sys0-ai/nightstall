export type Levels = { bass: number; mid: number; treble: number; beat: number };

export type MeasuredLevels = Levels & {spectrum:Float32Array};
export const quietLevels:MeasuredLevels = {bass:0,mid:0,treble:0,beat:0,spectrum:new Float32Array(12)};

export type Measure = (node: AudioNode) => { read(): MeasuredLevels; close(): void };

export function loadFile(file: File, measure: Measure, changed: (state: "playing" | "paused" | "ended") => void, failed: (error: string) => void) {
  const context = new AudioContext();
  const output = context.createGain();
  output.connect(context.destination);
  const meter = measure(output);
  let disposed = false, ended = false, paused = false;
  let buffer: AudioBuffer | undefined, node: AudioBufferSourceNode | undefined;
  const start = () => {
    if (!buffer || disposed) return;
    node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(output);
    node.onended = () => { ended = true; node?.disconnect(); changed("ended"); };
    node.start();
    ended = paused = false;
    changed("playing");
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (node) { node.onended = null; if (!ended) node.stop(); node.disconnect(); }
    meter.close();
    output.disconnect();
    void context.close();
  };
  void Promise.all([context.resume(), file.arrayBuffer().then(bytes => disposed ? undefined : context.decodeAudioData(bytes))])
    .then(([,audio]) => { buffer = audio; start(); })
    .catch(error => { if (!disposed) { dispose(); failed(error instanceof Error ? error.message : "Could not play this file."); } });
  return {
    dispose,
    sample: () => disposed || ended || paused ? quietLevels : meter.read(),
    async toggle() {
      if (!buffer || disposed) return;
      if (ended) return start();
      if (paused) await context.resume();
      else await context.suspend();
      if (disposed) return;
      paused = !paused;
      changed(paused ? "paused" : "playing");
    },
  };
}
