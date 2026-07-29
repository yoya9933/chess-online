import { cp, mkdir, writeFile } from "node:fs/promises";

await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await writeFile(
  "dist/server/index.js",
  'import handler from "./index.mjs";\nexport default { fetch: handler };\n',
);
