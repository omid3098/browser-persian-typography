import { siteKey, handleSettings } from "./settings.js"

async function state(tab) {
  const site = siteKey(tab.url)
  const { disabledSites = [], font = { type: "bundled" } } = await chrome.storage.local.get(["disabledSites", "font"])
  return { site, enabled: !disabledSites.includes(site), font }
}
async function icon(tab) {
  if (!tab.id || !/^https?:/.test(tab.url || "")) return
  const { enabled } = await state(tab)
  await chrome.action.setIcon({ tabId: tab.id, path: enabled ? "icons/on.png" : "icons/off.png" })
  await chrome.action.setTitle({ tabId: tab.id, title: `Persian Typography: ${enabled ? "on (click to switch off)" : "off (click to switch on)"}` })
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const result = message.type === "state" && sender.tab ? state(sender.tab)
    : message.type === "settings" ? handleSettings(message).then(value => ({ value })) : null
  if (!result) return
  result.then(respond, error => respond({ error: error.message }))
  return true
})
chrome.action.onClicked.addListener(async tab => {
  if (!/^https?:/.test(tab.url || "")) return
  await handleSettings({ operation: "switchSite", site: tab.url })
})
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (change.url || change.status === "complete") icon(tab).catch(() => {})
})
chrome.storage.onChanged.addListener(async (_changes, area) => {
  if (area === "local") for (const tab of await chrome.tabs.query({})) icon(tab).catch(() => {})
})
