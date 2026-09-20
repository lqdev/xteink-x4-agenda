import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import {
  buildSvg,
  loadCalendarData,
  prepareAgenda,
} from "../src/agenda-core.mjs";
import { encodeBmp } from "../src/bmp.mjs";

export async function run(configPath = "agenda.json", sleepDir = ".sleep", previewDir = path.join(path.dirname(sleepDir), "agenda-preview")) {
  const config = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, "utf8"))
    : {};
  const readSource = async (source) => {
    if (/^https?:\/\//i.test(source)) {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return response.text();
    }
    return fs.promises.readFile(source, "utf8");
  };
  const calendarData = await loadCalendarData(config.calendar, config.date, readSource);
  const agenda = prepareAgenda(config, calendarData);
  const svg = buildSvg(agenda);
  const baseName = config.filename || "daily-agenda";

  fs.mkdirSync(sleepDir, { recursive: true });
  fs.mkdirSync(previewDir, { recursive: true });
  const svgPath = path.join(previewDir, `${baseName}.svg`);
  const pngPath = path.join(previewDir, `${baseName}.png`);
  const bmpPath = path.join(sleepDir, `${baseName}.bmp`);
  fs.writeFileSync(svgPath, svg);

  const rendered = new Resvg(svg, { fitTo: { mode: "original" } }).render();
  fs.writeFileSync(pngPath, rendered.asPng());
  fs.writeFileSync(bmpPath, encodeBmp(rendered.pixels, rendered.width, rendered.height));

  console.log(`Wrote ${svgPath}`);
  console.log(`Wrote ${pngPath}`);
  console.log(`Wrote ${bmpPath}`);
  if (calendarData.today.length) {
    console.log(`Added ${calendarData.today.length} calendar event(s) for ${config.date || "today"}.`);
  }
  return { svgPath, pngPath, bmpPath, calendarData };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [, , configPath = "agenda.json", sleepDir = ".sleep", previewDir = path.join(path.dirname(sleepDir), "agenda-preview")] = process.argv;
  run(configPath, sleepDir, previewDir).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
