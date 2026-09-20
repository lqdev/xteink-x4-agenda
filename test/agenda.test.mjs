import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import {
  buildSvg,
  loadCalendarData,
  mergeSchedule,
} from "../src/agenda-core.mjs";
import { encodeBmp } from "../src/bmp.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = path.join(root, "examples", "fixtures", "usa.ics");
const fixture = await fs.readFile(fixturePath, "utf8");

test("encodes a 480x800 uncompressed 24-bit BMP", () => {
  const rendered = new Resvg(buildSvg({
    date: "2026-09-19",
    schedule: [],
    calendarToday: [],
    calendarMonthEvents: [],
  })).render();
  const bmp = encodeBmp(rendered.pixels, rendered.width, rendered.height);
  const header = new DataView(bmp.buffer, bmp.byteOffset, bmp.byteLength);
  assert.equal(String.fromCharCode(bmp[0], bmp[1]), "BM");
  assert.equal(header.getUint32(2, true), bmp.byteLength);
  assert.equal(header.getUint32(10, true), 54);
  assert.equal(header.getInt32(18, true), 480);
  assert.equal(header.getInt32(22, true), 800);
  assert.equal(header.getUint16(26, true), 1);
  assert.equal(header.getUint16(28, true), 24);
  assert.equal(header.getUint32(30, true), 0);
});

test("parses all-day and timed ICS events and filters regional events", async () => {
  const data = await loadCalendarData(
    { source: "fixture", includeRegional: false },
    "2026-11-26",
    async () => fixture,
  );
  assert.deepEqual(data.today.map(({ label, time }) => ({ label, time })), [
    { label: "Thanksgiving", time: "ALL DAY" },
  ]);
  assert.deepEqual(data.monthEvents.map(({ dateKey, label }) => ({ dateKey, label })), [
    { dateKey: "2026-11-26", label: "Thanksgiving" },
  ]);

  const regional = await loadCalendarData(
    { source: "fixture", includeRegional: true },
    "2026-11-26",
    async () => fixture,
  );
  assert.equal(regional.monthEvents.length, 2);
  assert.ok(regional.monthEvents.some((event) => event.label === "Local Day - California"));
});

test("sorts calendar events before the manual schedule", () => {
  const schedule = mergeSchedule(
    [{ time: "09:00", label: "Manual" }],
    [{ time: "ALL DAY", label: "Holiday" }, { time: "08:30", label: "Meeting" }],
    8,
  );
  assert.deepEqual(schedule.map((item) => item.time), ["ALL DAY", "08:30", "09:00"]);
});

test("renders monthly event dots and no interactive note or checkbox affordances", () => {
  const svg = buildSvg({
    date: "2026-09-19",
    schedule: [{ time: "09:00", label: "Focus" }],
    calendarToday: [],
    calendarMonthEvents: [{ dateKey: "2026-09-07", label: "Labor Day" }],
  });
  assert.match(svg, /<circle[^>]+cx="116\.57142857142858"[^>]+cy="643"/);
  assert.doesNotMatch(svg, /checkbox|textarea|input|note|contenteditable/i);
  assert.match(svg, /width="480" height="800"/);
});
