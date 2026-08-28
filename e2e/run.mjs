import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const baseUrl = "http://127.0.0.1:8787";
const env = { ...process.env, WRANGLER_SEND_METRICS: "false" };

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio || "inherit",
      env: options.env || env,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? signal}`));
    });
  });
}

console.log("[e2e] applying local D1 migrations");
await run(npx, ["--no-install", "wrangler", "d1", "migrations", "apply", "chuhe-xiangqi-db", "--local"]);

console.log("[e2e] starting local Wrangler server");
const dev = spawn(npx, ["--no-install", "wrangler", "dev", "--port", "8787"], {
  stdio: ["ignore", "pipe", "pipe"],
  env,
});
let devLog = "";
const appendLog = (chunk) => {
  const text = String(chunk);
  devLog = (devLog + text).slice(-16000);
  process.stdout.write(text);
};
dev.stdout.on("data", appendLog);
dev.stderr.on("data", appendLog);

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (dev.exitCode !== null) break;
    try {
      const response = await fetch(`${baseUrl}/`, { cache: "no-store" });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(250);
  }
  if (!ready) throw new Error(`Wrangler did not become ready.\n${devLog}`);

  console.log("[e2e] running two-player HTTP scenarios");
  await run(process.execPath, ["e2e/multiplayer.mjs"], {
    env: { ...env, E2E_BASE_URL: baseUrl },
  });
} finally {
  if (dev.exitCode === null) dev.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => dev.once("exit", resolve)),
    sleep(1500),
  ]);
}
