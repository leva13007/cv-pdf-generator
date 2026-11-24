# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Markdown → PDF generator for Oleh's CV: live A4 preview in the browser for tuning content/CSS, then a Puppeteer export. Plain CommonJS Node (>=22.12), no build step, no linter.

## Commands

```bash
npm install
npm run dev                     # preview http://localhost:3000 (cv.md), live-reloads on cv.md / style.css / template.html
npm run dev -- cv_FS.md         # preview another variant
npm run pdf                     # cv.md -> cv.pdf
node export-pdf.js cv_BE.md     # any variant -> <name>.pdf next to the source

npm test                        # node:test, all suites (launches headless Chrome)
npm run test:unit               # render + server only, no browser
node --test --test-name-pattern="one page" test/export-pdf.test.js   # single test
```

Tests live in `test/`; `test/fixtures/sample.md` is the canonical example of the CV markdown shape. `export-pdf.test.js` asserts every `cv*.md` in the repo root renders to exactly one page — editing a CV so it spills to page 2 fails the suite. Page count is read by regex over the raw PDF (`/Type /Page`), no PDF library.

Both `package-lock.json` and `yarn.lock` are present; README documents npm.

## Architecture

One render path, two consumers:

- `render.js` — `renderPage(mdPath, { printMode })` renders markdown with markdown-it (`html: false`, so raw HTML in the `.md` is escaped) and fills three placeholders in `template.html`: `<!--CONTENT-->`, `<!--BODY-CLASS-->`, `<!--RELOAD-SCRIPT-->`.
- `server.js` — dev server on fixed port 3000; serves `/`, `/style.css`, `/reload-client.js`; chokidar watches the chosen `.md`, `style.css`, `template.html` and pushes `"reload"` over a websocket (`ws`) on the same HTTP server.
- `export-pdf.js` — spins up its own throwaway HTTP server on a random port with `printMode: true` (adds `body.printing`, omits the reload script), loads it in headless Chrome with print media emulation, and writes an A4 PDF with **zero** Puppeteer margins.

`server.js` exports `createPreviewServer(mdPath)` and `export-pdf.js` exports `exportPdf(mdPath, outPath?)`; each only auto-runs its CLI under `require.main === module`, so tests can import them without side effects.

Any new asset referenced by the template (fonts, images) must be added to the routes in **both** servers — each only serves an explicit allow-list of URLs.

## Layout conventions (style.css ↔ markdown)

- Page margins live in CSS (`--page-margin`, `.page-content` padding), not in `page.pdf()`.
- `.page::after` draws a dashed red line at exactly one A4 height in preview — content below it spills onto page 2. It's hidden via `body.printing` and `@media print`. The goal is keeping each CV variant to one page.
- CSS relies on the markdown shape shared by all `cv*.md` variants:
  - `# Name`, then `## Title` as the **second child** (`h2:nth-child(2)` styles it as the subtitle) — don't insert anything between them.
  - `### Role — Company _dates_`: `h3` is flex `space-between`, so the trailing `_…_` (em) is pushed to the right edge.
- `*.pdf` is gitignored; outputs are written next to the source `.md`.

## Context

This lives inside a personal projects management layer (`~/projects/`); this repo's `README.md` carries the required frontmatter (`status`, `category`, `stack`) and is public-facing (published on GitHub). The "Roadmap" section is the project's single next step — keep it current, and keep personal notes out of the README.
