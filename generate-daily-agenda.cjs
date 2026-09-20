// Compatibility entry point for the original seeded generator command.
import("./bin/x4-agenda.mjs").then(({ run }) => {
  const [, , configPath = "agenda.json", sleepDir = ".sleep", previewDir] = process.argv;
  return run(configPath, sleepDir, previewDir);
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
