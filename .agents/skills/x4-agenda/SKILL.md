---
name: x4-agenda
description: Generate and validate static 480x800 Xteink X4/X4 Pro agenda BMP sleep screens from JSON and optional ICS calendars.
---

# X4 Agenda

## Activate when

- The user asks for an Xteink X4/X4 Pro sleep screen, agenda BMP, or calendar wallpaper.
- A date-specific static agenda must be generated from a JSON plan or `.ics` file.

## Generate

From the repository root:

```sh
npm install
npm run generate
```

The default command reads `agenda.json`, writes `.sleep/daily-agenda-*.bmp`, and writes SVG/PNG previews to `agenda-preview/`. For a custom config:

```sh
node bin/x4-agenda.mjs path/to/agenda.json output/.sleep output/preview
```

## Output requirements

- 480x800 portrait.
- Uncompressed 24-bit BMP (`BI_RGB`, 54-byte header, bottom-up rows).
- Static, non-interactive layout: no checkboxes, note fields, or touch controls.
- Calendar event dots appear in the month grid; events for the selected date also join the schedule.

## ICS gotchas

- Use RFC 5545 line folding; the parser unfolds continuation lines.
- `DTSTART;VALUE=DATE:YYYYMMDD` creates an `ALL DAY` event.
- UTC timestamps end in `Z`; local timestamps are kept in their calendar date/time.
- Regional events are filtered by default when `LOCATION` is not `USA` or the summary contains `(Regional Holiday)`.
- Browser uploads are local-only. Remote URLs are an advanced CLI option and can fail in browsers because of CORS.

## Validate

```sh
npm test
npm run generate:examples
```

Tests cover BMP headers, ICS parsing/filtering, month markers, and the absence of interactive affordances. Read [README.md](../../../README.md) and [the GitHub Pages guide](../../../docs/guide.md) for user-facing setup and troubleshooting.
