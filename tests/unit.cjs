const assert = require("node:assert/strict")
const { dominantDirection, cleanTechnicalText } = require("../direction.js")
const cases = [
  ["T3 Code یک ابزار هوشمند برای برنامه‌نویسی است", "rtl"],
  ["T3 Code is a fast coding assistant", "ltr"],
  ["https://example.com/english/path این یک متن فارسی است", "rtl"],
  ["C:\\Users\\Name\\project این مسیر درست است", "rtl"],
  ["test@example.com این ایمیل معتبر است", "rtl"],
  ["commit 3f9a2c1d0b را بررسی کن", "rtl"],
  ["1234 — ...", null], ["ab اب", "rtl"],
  ["This paragraph is mostly English with one فارسی word.", "rtl"],
  ["Run npm test and check the output, then ب", "rtl"],
  ["Only English here, with a URL https://example.com/فارسی", "ltr"]
]
for (const [text, expected] of cases) assert.equal(dominantDirection(text), expected)
assert.equal(cleanTechnicalText("before https://example.com/a after").trim(), "before   after")
console.log("PASS: identical 11 T3 dominantDirection cases and technical-token cleaning")
