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
- **F3. Code fonts stay.** `pre`, `code`, `kbd`, `samp` and any element whose
  own font is monospace are not touched.
- **F4. The user's font.** The default is the bundled Vazirmatn. The user may
  pick a font installed on their system instead; it is used under F1 to F3 the
  same way (Persian letters only, bold stays bold), and Vazirmatn stands behind
  it when the system no longer has it.
- **F5. Strict pages.** The font must load on a page whose Content Security
  Policy allows fonts and styles only from itself, as x.com does.

## Direction

- **D1. One test for text.** `dominantDirection` of the T3 runtime, unchanged:
  URLs, paths, email addresses and hashes are ignored; then one Arabic-script
  letter makes the text `rtl`, Latin letters alone make it `ltr`, anything else
  gives no direction.
- **D2. Block by block.** The unit is a text block: the nearest ancestor of a
  text node that lays its text out as lines (a paragraph, heading, list item,
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
  table or quote that this extension turned RTL, a Latin-only item gets
  `dir="ltr"`. Differs from T3, which also sets `ltr` on every Latin-only
  block of a chat: on an unknown page that would move English labels of a
  Persian site to the other side.
- **D6. Lists and tables.** A list that draws markers and holds Persian text
  becomes RTL as a whole, so bullets and numbers sit on the right. A data
  table (one with header cells) that holds Persian text becomes RTL as a whole.
  A `ul` used for layout (no markers, flex or grid) and a table without header
  cells are not turned: only their text blocks are decided. Differs from T3,
  where every list and table of a chat is prose.
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
- **Idle.** With a static Persian page open, a headless browser with the
  extension stays under 1% of one core:
  `python C:\Users\Omid\.agents\tools\cpu_budget.py --pid <browser> --max 1.0`
  (five windows; all five pass).

## Not decided yet

The toolbar behaviour, the popup, the font picker and the list of sites are
being designed with Omid from the mocks in `design/mocks/`. Until one is
chosen the build carries only a plain click-to-switch on the toolbar icon, so
the engine can be tried.

Not in the first version: text inside shadow DOM, Firefox, mobile browsers.
