# Browser Persian Typography

A browser extension (Manifest V3, Chromium first) that applies Omid's Persian
typography rules on every web page: Vazirmatn for Persian letters and a smart
direction for each block of text.

- `docs/rules.md` is the reference for what the engine does and for its
  budgets. A change to behaviour changes that file in the same commit.
- The rules come from `E:\w\t3code-persian-typography` (`runtime/`); keep the
  shared text test (`dominantDirection`) identical to it.
- The popup's design is Omid's choice. Show him a change to its look, and build
  it after he picks it.
- Tests run headless, with a browser profile of their own under
  `.agent-work/`. Never open a visible browser window.
- The extension never rewrites page text, uses no network and loads no remote
  code.
