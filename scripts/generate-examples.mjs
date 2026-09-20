import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../bin/x4-agenda.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examples = [
  ["examples/daily-agenda-current/agenda.json", "examples/daily-agenda-current/.sleep", "examples/daily-agenda-current/preview"],
  ["examples/daily-agenda-ics-demo/agenda.json", "examples/daily-agenda-ics-demo/.sleep", "examples/daily-agenda-ics-demo/preview"],
];

for (const [config, sleepDir, previewDir] of examples) {
  await run(
    path.join(root, config),
    path.join(root, sleepDir),
    path.join(root, previewDir),
  );
}
