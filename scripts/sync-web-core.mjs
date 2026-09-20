import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src", "agenda-core.mjs");
const target = path.join(root, "docs", "agenda-core.js");
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.copyFile(source, target);
console.log(`Synced ${path.relative(root, target)} from ${path.relative(root, source)}`);
await fs.copyFile(
  path.join(root, "src", "bmp.mjs"),
  path.join(root, "docs", "bmp.js"),
);
console.log("Synced docs/bmp.js from src/bmp.mjs");
