# X4 Agenda — Start Here

This project makes a quiet, date-specific agenda image for an Xteink X4 or X4 Pro. The result is a **static 480 × 800 pixel BMP**: it is meant to be read, not tapped. The browser tool on the [home page](./) is the easiest way to try it.

## 1. Quick generation

1. Open the [browser generator](./).
2. Choose the date.
3. Optionally choose an exported `.ics` calendar file. Nothing is uploaded.
4. Click **Generate preview**, check the day and month dots, then click **Download BMP**.

The download is named something like `daily-agenda-2026-09-19.bmp`. If you use the command line instead, see [Advanced customization](#advanced-customization).

## 2. Put it on the X4

1. Insert the device’s microSD card into your computer.
2. Keep a backup of the existing sleep image.
3. Copy the downloaded BMP to the location your firmware uses for the sleep image. The common convention is `sleep.bmp`; this repository’s CLI also writes a `.sleep/` directory so it is easy to copy as a group.
4. Safely eject the card and wake or refresh the device.

The image must stay **480 × 800, portrait, uncompressed 24-bit BMP**. Do not open and resave it in an editor that changes the color depth or compression. X4/X4 Pro firmware and community builds can differ, so use the setup instructions that came with your firmware if they name a different folder or filename.

## 3. Calendar files

An `.ics` file is a portable calendar export. In Google Calendar, Outlook, Apple Calendar, and most calendar apps, look for **Export**, **Download**, or **Save calendar**. Select that file in the browser tool.

The generator understands all-day events (`DTSTART;VALUE=DATE`), local timed events, UTC timestamps, folded lines, escaped punctuation, and duplicate events. Events for the selected date appear in the “Today’s calendar” box and schedule. Events anywhere in that month get a small dot in the month grid.

Regional events are excluded by default when their location is not `USA` or the summary includes `(Regional Holiday)`. Turn on **Include regional events** when that is what you want. A public calendar URL is available under **Advanced**, but browser CORS rules may block it; downloading the `.ics` file first is more dependable.

## 4. AI-agent workflow

This repository includes an Agent Skill at `.agents/skills/x4-agenda/SKILL.md`. An AI coding agent can use it when you ask for a dated X4 agenda, an ICS import, or an output validation. A useful request is:

> Make an X4 agenda for 2026-11-26 using `my-calendar.ics`, include only national events, and validate the BMP.

The agent should run `npm test`, keep the output 480 × 800 and 24-bit uncompressed, and show you the preview before you copy it to the card. Never give an agent calendar credentials; provide an exported file or a sanitized fixture.

## 5. Troubleshooting

### The device rejects the image

Check the file extension, dimensions, and color depth. Use the generated BMP directly; do not convert it through a photo editor. Confirm whether your firmware expects `sleep.bmp`, a `.sleep/` directory, or another documented name.

### My event is missing

Make sure the event is in the selected date and that the `.ics` file actually contains it. Regional events are intentionally filtered unless you enable them. Recurring events are only included when your calendar application expands them in the exported file.

### The URL does not load in the browser

That is usually CORS: the calendar server does not allow a browser page to read it. Download the calendar as `.ics` and select the local file instead. The command-line generator can fetch URLs when the server permits it.

### The preview looks right but the BMP is not where I expected

Browser downloads go to your browser’s normal Downloads folder. The CLI writes the BMP to `.sleep/` and SVG/PNG previews to `agenda-preview/` unless you provide other output folders.

## 6. Privacy and limitations

- The browser generator processes uploaded calendar text locally. It does not require an account or a server.
- A URL entered in the Advanced field is requested by your browser and is subject to that server’s privacy policy and CORS rules.
- The image is static. There are no checkboxes, note fields, touch controls, or live updates on the X4.
- The layout is intentionally compact and English-only today. Long labels are shortened to fit the screen.
- Calendar timezone rules are necessarily limited when an ICS file has no timezone data. Review the preview before copying it.

## 7. Advanced customization

Technical users can install Node.js 18 or newer and run:

```sh
npm install
npm run generate
```

The CLI reads `agenda.json`. A minimal configuration looks like this:

```json
{
  "date": "2026-09-19",
  "calendar": {
    "source": "calendar.ics",
    "includeRegional": false
  },
  "schedule": [
    { "time": "08:00", "label": "Plan the day" },
    { "time": "13:00", "label": "Lunch / reset" }
  ],
  "filename": "daily-agenda-2026-09-19"
}
```

Use `node bin/x4-agenda.mjs config.json output/.sleep output/preview` for custom paths. The original `node generate-daily-agenda.cjs ...` entry point remains as a compatibility wrapper. The examples in `examples/` are reproducible with `npm run generate:examples`.

The core layout lives in `src/agenda-core.mjs`; BMP encoding is in `src/bmp.mjs`. Run `npm test` after changing either file. The GitHub Pages workflow publishes only `docs/`, so the browser app remains a static site with no backend.
