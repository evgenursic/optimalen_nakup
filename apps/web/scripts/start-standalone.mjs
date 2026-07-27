import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDirectory = path.resolve(scriptDirectory, "..");
const standaloneDirectory = path.join(webDirectory, ".next", "standalone");
const runtimeDirectory = path.join(standaloneDirectory, "apps", "web");

await mkdir(path.join(runtimeDirectory, ".next"), { recursive: true });
await Promise.all([
  cp(path.join(webDirectory, ".next", "static"), path.join(runtimeDirectory, ".next", "static"), {
    force: true,
    recursive: true,
  }),
  cp(path.join(webDirectory, "public"), path.join(runtimeDirectory, "public"), {
    force: true,
    recursive: true,
  }),
]);

const server = spawn(process.execPath, [path.join(runtimeDirectory, "server.js")], {
  cwd: standaloneDirectory,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.kill(signal);
  });
}

server.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
