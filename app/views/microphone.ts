import type { MeasuredLevels } from "./file-audio.ts";
import type { HostFrame } from "./live.ts";

export function listenMicrophone(levels: (v: MeasuredLevels, host: HostFrame | null) => void, status: (error: string) => void): () => void {
  // on a sys0 desktop the desktop holds the microphone (and the app must declare it); on a generated site the page does
  const shell = document.querySelector<HTMLMetaElement>('meta[name="sys0-shell"]')?.content ?? "";
  const declared = document.querySelector<HTMLMetaElement>('meta[name="sys0-audio-input"]')?.content.split(",").includes("microphone");
  if (parent === window || (shell && !declared)) {
    queueMicrotask(() => status("Open Night Stall on the System Zero desktop to use a microphone."));
    return () => {};
  }
  const origin = shell || "*";
  const id = Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-");
  const receive = (event: MessageEvent) => {
    const message = event.data;
    if (event.source !== parent || (shell && event.origin !== shell) || message?.type !== "mic-levels" || message.id !== id) return;
    if (typeof message.status === "string") {
      if (message.status) detach();
      status(message.status);
    }
    else if (message.levels) levels(message.levels, message.host ?? null);
  };
  addEventListener("message", receive);
  function detach() {
    removeEventListener("message", receive);
    removeEventListener("pagehide", stop);
  }
  function stop() {
    detach();
    parent.postMessage({ type: "mic-levels-stop", id }, origin);
  }
  addEventListener("pagehide", stop);
  parent.postMessage({ type: "mic-levels-start", id }, origin);
  return stop;
}
