// Build, then serve dist/ (PORT, default 4600). Open the printed address and press Space.
await import("./build.ts");
const dir = import.meta.dir + "/../dist", port = Number(process.env.PORT ?? 4600);
Bun.serve({ port, fetch(req) { const p = new URL(req.url).pathname; return new Response(Bun.file(dir + (p === "/" ? "/index.html" : p))); } });
console.log("http://localhost:" + port + "/");
