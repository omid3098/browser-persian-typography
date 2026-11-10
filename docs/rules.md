# Rules of the engine

This extension brings the rules of
[t3code-persian-typography](https://github.com/omid3098/t3code-persian-typography)
(`runtime/runtime.js` and `runtime/runtime.css` there) to every web page. That
runtime knows T3 Code's markup; a web page has no such anchors, so each rule
below says how it is decided on an unknown page. Where a rule differs from the
T3 runtime, the reason is given.

The promise, in Omid's words (2026-11-09): «کار کردن با افزونه هم فوق‌العاده
راحت باشه طوری که کاربر اصلاً متوجه حضورش نشه ولی درعین حال به راحتی بتونه
سایتی رو فعال یا غیرفعال کنه.»

The case that started it: a post on x.com that begins with "Claude Duet" and
continues in Persian. X marks the post `dir="auto"`, the browser takes the
direction from the first letter, and the whole post is laid out left to right
with its words out of order, in the system's fallback font.

## Font

- **F1. Persian letters only.** One `@font-face` family, limited by
  `unicode-range` to the Arabic-script ranges of the T3 runtime, draws Persian
  text. Latin text, digits written in Latin, icons and emoji keep the page's
  own fonts.
- **F2. In front of the page's own stack.** Every element that directly holds
  Arabic-script text gets that family first, followed by the font stack the
  page gave it. Never a rule that replaces the page's fonts for other text.
  Text fields and editable areas get it too, so typed Persian shows in it.
  On a page without Persian, empty or Latin-only fields are left untouched;
  typing Persian activates the field. This keeps the no-write budget below.
- **F3. Code fonts stay.** `pre`, `code`, `kbd`, `samp` and any element whose
  own font is monospace are not touched. Known limit: a font stack that names
  only a monospace face, such as Consolas, without the generic `monospace` is
  not recognised and gets the Persian font.
- **F4. The user's font.** The default is the bundled Vazirmatn. The user may
  pick a font installed on their system instead; it is used under F1 to F3 the
  same way (Persian letters only, bold stays bold), and Vazirmatn stands behind
  it when the system no longer has it.
- **F5. Strict pages.** The font must load on a page whose Content Security
  Policy allows fonts and styles only from itself, as x.com does.
- **F6. Lines keep their height.** The font's vertical measures are overridden
  so a line of Persian text is as tall with the extension on as it was with
  the extension off, where the page leaves the line height to the font. This
  holds for the bundled font and for a font the user chose. Line breaks may
  still change, because letters have other widths.

## Direction

- **D1. One test for text.** `dominantDirection` of the T3 runtime, unchanged:
  URLs, paths, email addresses and hashes are ignored; then one Arabic-script
  letter makes the text `rtl`, Latin letters alone make it `ltr`, anything else
  gives no direction.
- **D2. Block by block.** The unit is a text block: the nearest ancestor of a
  text node that lays its text out as lines, decided by computed display rather
  than the tag name (a paragraph, heading, list item,
  table cell, quote, or a `div` that holds text directly). Each block is
  decided by its own readable text, so each line follows its own text.
- **D3. A block with Persian is RTL.** It gets `dir="rtl"` and is isolated
  from its surroundings (`unicode-bidi: isolate`).
- **D4. Alignment is written only for prose.** A paragraph, heading, list
  item, quote, definition, table cell or `summary` whose alignment is the
  page's plain default (`start`, or `left` on a left-to-right page) is aligned
  to its start, so it moves to the right. `center`, `right` and `justify` are
  kept. No other element gets an alignment from us: short labels in a toolbar,
  a menu or a sidebar keep the place the page gave them. This is the T3 rule
  for labels.
- **D5. Latin-only blocks are left alone,** with one exception: inside a list,
  table or quote that this extension turned RTL, every Latin-only text block gets
  `dir="ltr"`. Differs from T3, which also sets `ltr` on every Latin-only
  block of a chat: on an unknown page that would move English labels of a
  Persian site to the other side.
- **D6. Lists and tables.** A list that draws markers becomes RTL as a whole
  when more than half of its own items that have letters are Persian by D1.
  A data table (one with header cells) becomes RTL as a whole when more than
  half of its cells that have letters are Persian by D1. Otherwise the list
  or table keeps its direction and only the text blocks inside it are decided.
  A `ul` used for layout (no markers, flex or grid) and a table without header
  cells are never turned. Differs from T3, where every list and table of a chat
  is prose: on the web one Persian file name in an English table would mirror
  the table.
- **D7. A direction the page wrote.** `dir="rtl"` on an element is kept.
  `dir="auto"` and `dir="ltr"` on a text block, or on an inline wrapper around
  its text, are replaced when D1 says `rtl`: these two are the disease on the
  web (x.com writes `auto`, LinkedIn wraps post text in `dir="ltr"`). Differs
  from T3, which never touches an element that has a `dir`. `bdo` is never
  touched.
- **D8. What stays LTR.** `pre`, `code`, `kbd`, `samp`, `svg`, maths
  (`math`, `.katex`, MathJax), terminals and code editors (`.xterm`,
  `.cm-editor`, `.monaco-editor`) are skipped, and inside an RTL block they
  stay left to right.
- **D9. Editable areas.** Only the root of an editable area is managed: its
  direction comes from its whole text, and `auto` while it is empty. The
  editor's inner nodes belong to the editor. Plain text fields and `textarea`
  get `dir="auto"` when the page gave none.
  As with F2, fields on a page without Persian wait until they hold Persian.
  A plain field that already inherits RTL keeps that direction: `auto` on an
  empty input otherwise moves Persian Wikipedia's search placeholder left.
- **D10. Layout is never mirrored.** A direction is set only on a text block,
  a real list or a data table. Never on a container of other blocks, a flex or
  grid row, the page or its `body`.

## Behaviour

- **B1. Live.** Text that arrives or changes later (a streaming answer,
  infinite scroll, a page that swaps its content without a reload) is decided
  as it arrives. No polling and no timers: a `MutationObserver`, batched per
  frame.
- **B2. Off means untouched.** With the site switched off, or after it is
  switched off on an open page, the page is exactly as it was written: every
  `dir`, style and attribute the extension added is taken back, at once and
  without a reload. Switching on applies at once too.
- **B3. Presentation only.** The extension never rewrites text, sends
  nothing over the network, logs no content and loads no remote code.
- **B4. Frames.** Frames inside a page follow the switch of the site in the
  address bar.

## Sites and settings

- **S1.** On for every site by default.
- **S2.** The user switches a site off; the list of switched-off sites and the
  chosen font live in `storage.local`, on this computer only.
- **S3.** A site is the host name of the page in the address bar without a
  leading `www.`; subdomains are separate sites.
- **S4.** Every open tab of a site follows a change at once.

## Budgets

They come from the promise that the user does not notice the extension. A
result over a budget is a failure, not a cost to weigh.

- **Size.** The packaged extension is at most 300 KB (the font is 111 KB).
- **A page without Persian.** No write to the page at all: not one attribute,
  style or node. On a page of 20,000 Latin text nodes the extension's own work
  from load to idle is at most 50 ms in all, and no single stretch of it is
  longer than 16 ms. Measured five times; all five pass.
- **Idle.** Compare the same static Persian fixture in headless Chromium with
  the extension absent and present. Start both measurements 180 seconds after
  the fixture, fonts and network have finished loading (`networkidle`), after
  the extension-free browser's startup work has settled. Startup measurements
  are kept too: attribution observed another Chromium utility process starting
  in the 150–180 second window even without the extension. From that common point, every one of five
  30-second windows with the extension must be under 1% of one core, and the
  engine's flush count must not increase. Report all five windows for both
  browsers, plus per-process CPU deltas and flush deltas. The extension-free
  windows must also stay under 1% to confirm that point is settled. The check
  uses the shared `cpu_budget.py` process-tree accounting and 0.25-second polls
  through `tests/idle-sample.py`; run it with `npm run budget:idle`.

## Interface

The toolbar opens the chosen **B · پنجرهٔ آروم** popup. Its icon is coloured
when the current site is on and grey when it is off.

- **Main view.** The current host, its on/off switch and its state in words
  come first. The font row opens the font view. The switched-off-sites row
  appears only when there are sites to show. On browser internal pages and
  extension stores the site block is hidden.
- **Font view.** Search the bundled Vazirmatn and installed fonts from
  `chrome.fontSettings`; only fonts able to draw Persian are listed. Names
  use the popup font; only «نمونه» uses the row's font. Pointer hover or
  keyboard focus previews the font on the current tab under F1–F6, without
  saving it. Leaving the row or closing the popup restores the saved font.
  Clicking or pressing Enter saves the choice. Arrow keys move between rows.
- **Sites view.** Each switched-off host has «روشن کن». It enables that site
  and removes the row. Removing the last row returns to the main view.

Settings stay local. The background checks Persian-capable fonts on install,
update and browser startup, caches the answer locally, then closes its offscreen
worker host. The popup reads that cache, rechecking if the installed family list
changed or the answer is not ready yet. The complete main view
must appear within 100 ms of opening; the complete font view within 1.5 s
the first time and 200 ms later. Each budget must pass all five measurements.
The font view's budgets are measured after the background's check has ended.
Known limit: a font view opened before that, in the first seconds after the
extension is installed, runs the popup's own check; it took 2.9 and 4.7 s in
two measured runs.

`npm run build` copies only shipped files to the ignored `dist/` folder.
Source edits do not change that loadable copy; only another build does.
The size budget measures every file in `dist/`.

Not in the first version: text inside shadow DOM, Firefox, mobile browsers.
