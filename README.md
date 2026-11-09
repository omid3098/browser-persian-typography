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
3. Select `E:\w\browser-persian-typography` (the folder containing `manifest.json`).
4. Reload an existing web tab once. Open a page with Persian text; it should
   use Vazirmatn and read from right to left block by block.
5. Pin **Persian Typography** from the extensions menu. Click its toolbar icon
   to switch the current site off (grey) or on (green). Existing tabs and
   embedded frames follow immediately, without another reload. With it off,
   the engine restores the page's attributes and styles.

The repository root loads directly: no build or dependency installation is
needed to use it. `tests/size.cjs` lists the files belonging in a distribution
folder; development files, `.agent-work`, `design` and `node_modules` are not
part of the extension package.
The size check also leaves a clean, ready-to-load distribution in
`.agent-work/engine/unpacked`, containing just those shipped files.

There is no popup yet. Browser internal pages and browser extension stores do
not allow content scripts. Shadow DOM and Firefox are outside this version.
Font metrics can change line wrapping and spacing; layout containers are not
mirrored. A page's explicit monospace fonts remain unchanged, including a
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
npm test
npm run budget:size
npm run budget:latin
npm run budget:idle
npm run check:live
```

For a bounded run with a retained log, prefix a command with
`python C:\Users\Omid\.agents\tools\waitfor.py --cap 6 --log .agent-work/engine/check.log -- cmd /c`.

Unit checks copy the T3 runtime's direction cases. The end-to-end checks load
the unpacked extension in real Chromium and serve their own HTTP fixtures.
They ask Chromium which fonts actually drew the letters, including under
strict page CSP. They check restoration, streaming, native RTL, app layout,
editors, multiple tabs, cross-host frames and a missing system font.

The size gate fails over 300,000 uncompressed shipped bytes. The Latin gate
checks all five 20,000-node runs: no DOM mutations, engine work at most 50 ms,
and no engine stretch above 16 ms. It measures script setup, settings
application, observer callbacks and frame work in the isolated content-script
world; it excludes waiting for browser messages or animation frames.
The idle gate calls the shared `cpu_budget.py` against the Chromium browser
process tree for five 30-second windows. Every window must stay at or below
1% of one core.

Live-page screenshots (1440×900) and observations go to
`.agent-work/engine/shots`. X is skipped when no public post renders without
signing in; it is never treated as a verified post in that case.
