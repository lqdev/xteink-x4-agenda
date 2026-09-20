import {
  buildSvg,
  defaultAgenda,
  loadCalendarData,
  prepareAgenda,
} from "./agenda-core.js";
import { encodeBmp } from "./bmp.js";

const form = document.querySelector("#agenda-form");
const dateInput = document.querySelector("#agenda-date");
const fileInput = document.querySelector("#calendar-file");
const urlInput = document.querySelector("#calendar-url");
const regionalInput = document.querySelector("#include-regional");
const planInput = document.querySelector("#daily-plan");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const downloadButton = document.querySelector("#download-button");
let lastSvg = "";
let lastFilename = "daily-agenda.bmp";

function currentLocalDate() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

dateInput.value = currentLocalDate();

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`.trim();
}

function parsePlan(value) {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return defaultAgenda.schedule;
  return lines.map((line, index) => {
    const separator = line.indexOf("|");
    if (separator < 0) {
      throw new Error(`Plan line ${index + 1} needs a "|" between time and label.`);
    }
    const time = line.slice(0, separator).trim();
    const label = line.slice(separator + 1).trim();
    if (!time || !label) throw new Error(`Plan line ${index + 1} needs both a time and label.`);
    return { time, label };
  });
}

async function readCalendarSource(source, uploadedText) {
  if (source === "uploaded.ics") return uploadedText;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Calendar URL returned HTTP ${response.status}.`);
  return response.text();
}

async function calendarFromForm() {
  const file = fileInput.files[0];
  const url = urlInput.value.trim();
  if (file && url) throw new Error("Choose an uploaded file or a URL, not both.");
  if (!file && !url) return { calendar: null, eventCount: 0 };

  const uploadedText = file ? await file.text() : "";
  const source = file ? "uploaded.ics" : url;
  const calendar = {
    source,
    includeRegional: regionalInput.checked,
  };
  const data = await loadCalendarData(
    calendar,
    dateInput.value,
    (calendarSource) => readCalendarSource(calendarSource, uploadedText),
  );
  return { calendar, data };
}

async function renderAgenda() {
  if (!dateInput.value) throw new Error("Choose a date first.");
  const plan = parsePlan(planInput.value);
  const { data = { today: [], monthEvents: [] } } = await calendarFromForm();
  const agenda = prepareAgenda({
    date: dateInput.value,
    schedule: plan,
    scheduleLimit: 8,
    footer: "STATIC PLAN / LIVE CALENDAR",
  }, data);
  lastSvg = buildSvg(agenda);
  lastFilename = `daily-agenda-${dateInput.value}.bmp`;
  preview.innerHTML = lastSvg;
  downloadButton.disabled = false;
  const count = data.today.length;
  setStatus(count ? `Preview ready with ${count} calendar event${count === 1 ? "" : "s"}.` : "Preview ready. No events were found for this day.", "success");
}

async function downloadBmp() {
  if (!lastSvg) return;
  const blob = new Blob([lastSvg], { type: "image/svg+xml" });
  const image = new Image();
  const objectUrl = URL.createObjectURL(blob);
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("The preview could not be converted to BMP."));
      image.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 800;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, 480, 800);
    const pixels = context.getImageData(0, 0, 480, 800).data;
    const bmp = encodeBmp(pixels, 480, 800);
    const download = document.createElement("a");
    download.href = URL.createObjectURL(new Blob([bmp], { type: "image/bmp" }));
    download.download = lastFilename;
    download.click();
    setStatus("BMP downloaded. Copy it to the device as sleep.bmp.", "success");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  downloadButton.disabled = true;
  setStatus("Reading the calendar and drawing the preview…");
  try {
    await renderAgenda();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

downloadButton.addEventListener("click", () => {
  downloadBmp().catch((error) => setStatus(error.message, "error"));
});
