# Persian Typography

A Manifest V3 extension for Chromium. Persian letters use the bundled Vazirmatn
font. Latin letters, Latin digits, icons and emoji keep the page's fonts. Each
Persian text block gets a right-to-left direction, including posts beginning
with an English name. Page layout, centred headings and code keep their order.

The engine follows [docs/rules.md](docs/rules.md). It handles new and streaming
text, lists, data tables, editable roots and frames. It never rewrites text or
contacts a server. Fonts load from the extension even on pages with strict
Content Security Policy. Settings stay in `storage.local` on this computer.

## Load and try

1. In Chrome open `chrome://extensions`. In Edge open `edge://extensions`.
2. Turn on **Developer mode**, then click **Load unpacked**.
3. Select `E:\w\browser-persian-typography\dist` (the built folder containing `manifest.json`).
4. Reload an existing web tab once. Open a page with Persian text; it should
   use Vazirmatn and read from right to left block by block.
5. Pin **Persian Typography** from the extensions menu. Click its toolbar icon
   to open the popup. Its switch turns the current site off (grey icon) or on
   (coloured icon). Existing tabs and
   embedded frames follow immediately, without another reload. With it off,
   the engine restores the page's attributes and styles.

From the repository, run `npm run build` once to create `dist/`. Node.js is
needed to build; no dependency installation is needed. Load that folder in
Chrome. Editing source files does not alter the loaded copy. After an update,
run the command again and click **Reload** on the extension's card.
`scripts/build.cjs` lists the shipped files; development files, `.agent-work`,
`design` and `node_modules` are excluded. `npm run budget:size` measures `dist/`.

The popup has three views: the current site's switch, a searchable font list,
and switched-off sites with a button to enable each one again. The font list
comes from the browser's installed fonts and shows only Persian-capable fonts.
The background prepares this list on install, update and browser startup so
the first opening can read it immediately. Its offscreen page closes after the
check. The popup can still check fonts itself if that answer is not ready yet.
Hover or focus a font to preview it on the tab. Move away or close the popup
to restore the saved font; click or press Enter to save. Arrow keys move
through font rows. Font names stay readable in the popup's own font.

Browser internal pages and browser extension stores do not allow content
scripts, so the popup hides the site switch there. Shadow DOM and Firefox are outside this version.
Font widths can change line wrapping. The replacement font matches the page's
vertical measures, allowing room for whole letters if they cannot fit. Layout
containers are not mirrored. A page's explicit monospace fonts remain unchanged, including a
textarea that uses its browser's default monospace font.

## Interface settings module

An extension page can import `settings.js`. It exports:

```js
import { readSite, setSite, switchSite, readFont, setFont, subscribe } from './settings.js'
await readSite('https://www.example.com') // true by default
await setSite('example.com', false)
await switchSite('example.com')
await setFont({ type: 'bundled' })
await setFont({ type: 'system', family: 'Tahoma' })
const font = await readFont()
const unsubscribe = subscribe(() => { /* reread settings */ })
```

Only the hostname is stored. `www.` is removed; other subdomains are separate
sites. All writes go through the background worker's queue. A missing system
font falls back to the bundled Vazirmatn. Changes are delivered to open tabs
through the browser's storage change event.

## Checks (PowerShell, Windows)

Node.js and Python with `psutil` are needed for development checks only.
Every browser run is headless and uses its own profile under `.agent-work/engine`.

```powershell
$env:TEMP = "$PWD\.agent-work\engine\tmp"
$env:TMP = $env:TEMP
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.agent-work\engine\browsers"
$env:WAITFOR_SLOTS = '2'
New-Item -ItemType Directory -Force $env:TEMP | Out-Null
npm ci
npx playwright install chromium
npm run build
npm test
npm run budget:size
npm run budget:latin
npm run budget:idle
npm run test:popup
npm run check:live
```

For a bounded run with a retained log, prefix a command with
`python C:\Users\Omid\.agents\tools\waitfor.py --cap 6 --log .agent-work/engine/check.log -- cmd /c`.
`npm run budget:idle` needs `--cap 25`: it watches two browsers for about six
minutes each and took 19 minutes in one run.

Unit checks copy the T3 runtime's direction cases. The end-to-end checks load
the unpacked extension in real Chromium and serve their own HTTP fixtures.
They ask Chromium which fonts actually drew the letters, including under
strict page CSP. They check restoration, streaming, native RTL, app layout,
editors, multiple tabs, cross-host frames and a missing system font.
All extension checks load `dist/`. The popup check opens the real extension
page, with `?tabId=<id>` to identify the fixture tab while the popup page is
itself an active tab in headless Chromium. Normal toolbar opening uses the
active tab without this parameter. It checks the real fontSettings list,
previews and restoration, local saves, keyboard controls, site removal,
restricted pages, contrast and all five runs of each popup budget.
It saves the final real-popup and post screenshots in
`.agent-work/engine/shots/final/`. Headless Chromium cannot check the visible
toolbar's popup placement or closing when clicking outside it; the test closes
the extension page to exercise the same preview-port disconnect.

The size gate fails over 300,000 uncompressed shipped bytes. The Latin gate
checks all five 20,000-node runs: no DOM mutations, engine work at most 50 ms,
and no engine stretch above 16 ms. It measures script setup, settings
application, observer callbacks and frame work in the isolated content-script
world; it excludes waiting for browser messages or animation frames.
The font check compares native RTL and post line heights with bundled Vazirmatn
and selected Tahoma, and compares clipped/unclipped ink pixels (Python Pillow
is needed for that check).
The idle gate uses the shared `cpu_budget.py` process-tree accounting. It
compares Chromium without and with the extension, keeping six startup windows
and then checking five 30-second windows from 180 seconds after load, fonts and
network idle. Every checked window must be under 1% of one core, and the engine
must perform zero flushes. Per-process CPU is printed for every window.

Live-page screenshots (1440×900) and observations go to
`.agent-work/engine/shots`. X is skipped when no public post renders without
signing in; it is never treated as a verified post in that case.
