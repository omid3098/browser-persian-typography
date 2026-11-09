;(function (root) {
  "use strict"
  // Kept identical to the T3 runtime's text test.
  const HAS_RTL_LETTER = /\p{Script=Arabic}/u
  const LTR_LETTERS = /\p{Script=Latin}/u
  const TECHNICAL_TOKEN = /(?:https?:\/\/|www\.)\S+|(?:[A-Za-z]:[\\/]|\.{0,2}[\\/])\S+|\b\S+@\S+\.\S+\b|\b[0-9a-f]{7,}\b/giu
  function cleanTechnicalText(text) {
    return text.replace(TECHNICAL_TOKEN, " ")
  }
  function dominantDirection(text) {
    const readable = cleanTechnicalText(text)
    if (HAS_RTL_LETTER.test(readable)) return "rtl"
    return LTR_LETTERS.test(readable) ? "ltr" : null
  }
  const api = { cleanTechnicalText, dominantDirection }
  if (typeof module === "object" && module.exports) module.exports = api
  else root.PersianDirection = api
})(globalThis)
