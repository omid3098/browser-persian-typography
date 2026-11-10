import { siteKey, sitePartsFor, handleSettings } from "./settings.js"
import { findPersianFonts } from "./popup/font-list.js"

let fontWarmup
async function warmFonts() {
  if (fontWarmup) return fontWarmup
  fontWarmup = (async () => {
    const started = performance.now()
    await chrome.storage.local.remove("persianFonts")
    await findPersianFonts()
    globalThis.__persianFontWarmupMs = performance.now() - started
  })()
  try { await fontWarmup } finally { fontWarmup = null }
}
chrome.runtime.onInstalled.addListener(() => { warmFonts().catch(() => {}) })
chrome.runtime.onStartup.addListener(() => { warmFonts().catch(() => {}) })

async function state(tab) {
  const site = siteKey(tab.url)
  const stored = await chrome.storage.local.get(["disabledSites", "siteParts", "font"])
  const parts = sitePartsFor(site, stored)
  return { site, enabled: parts.font || parts.direction, parts, font: stored.font || { type: "bundled" } }
}
const toolbarIcon = enabled => ({ 16: `icons/toolbar-${enabled ? "on" : "off"}-16.png`, 32: `icons/toolbar-${enabled ? "on" : "off"}-32.png` })
async function icon(tab) {
  if (!tab.id || !/^https?:/.test(tab.url || "")) return
  const { enabled } = await state(tab)
  await chrome.action.setIcon({ tabId: tab.id, path: toolbarIcon(enabled) })
  await chrome.action.setTitle({ tabId: tab.id, title: `Persian Typography: ${enabled ? "on" : "off"}` })
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const result = message.type === "state" && sender.tab ? state(sender.tab)
    : message.type === "settings" ? handleSettings(message).then(value => ({ value })) : null
  if (!result) return
  result.then(respond, error => respond({ error: error.message }))
  return true
})
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (change.url || change.status === "complete") icon(tab).catch(() => {})
})
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local" && (changes.disabledSites || changes.siteParts)) for (const tab of await chrome.tabs.query({})) icon(tab).catch(() => {})
})
