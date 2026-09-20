# Xteink X4 Agenda

Generate a reusable, static daily agenda for the **Xteink X4 and X4 Pro**. The output is a portrait **480 × 800, uncompressed 24-bit BMP** designed for a sleep screen: date, schedule, today’s calendar events, and a small monthly calendar with event dots.

## Try it without installing anything

Open the [browser generator](docs/index.html) from GitHub Pages (or serve `docs/` as a static folder). Pick a date, optionally select a local `.ics` export, preview the screen, and download the BMP. Calendar data stays in the browser; no account or server is required. The URL field is advanced because browser CORS rules may block remote calendars.

Read the friendly [Start Here guide](docs/guide.md) for SD card setup, calendar exports, troubleshooting, privacy, and customization.

## Command line

Requires Node.js 18 or newer:

```sh
npm install
npm run generate
```

This reads `agenda.json`, writes the device-ready BMP to `.sleep/`, and writes SVG/PNG previews to `agenda-preview/`. Use a custom config and output folders with:

```sh
node bin/x4-agenda.mjs path/to/agenda.json output/.sleep output/preview
```

The original `generate-daily-agenda.cjs` command remains as a compatibility entry point.

## Development checks

```sh
npm test
npm run generate:examples
```

Tests cover BMP dimensions and format, ICS parsing and regional filtering, monthly event dots, and the absence of interactive checkbox/note affordances. Representative September 19, 2026 and Thanksgiving examples are kept in `examples/`.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/agenda-core.mjs` | Shared date, ICS, schedule, and SVG layout logic |
| `src/bmp.mjs` | Uncompressed 24-bit BMP encoder |
| `bin/x4-agenda.mjs` | Node CLI entry point |
| `docs/` | Browser-first GitHub Pages generator and user guide |
| `examples/` | Local ICS fixture, configs, and generated outputs |
| `.agents/skills/x4-agenda/SKILL.md` | Machine-oriented Agent Skill |

## License

MIT. See [LICENSE](LICENSE).
