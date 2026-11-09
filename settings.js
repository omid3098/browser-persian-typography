// The interface imports this module; all writes go through the worker's queue.
export function siteKey(value) {
  return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, "")
}
const call = (operation, args = {}) => chrome.runtime.sendMessage({ type: "settings", operation, ...args }).then(result => {
  if (result.error) throw new Error(result.error)
  return result.value
})
export const readSite = site => call("readSite", { site })
export const setSite = (site, enabled) => call("setSite", { site, enabled })
export const switchSite = site => call("switchSite", { site })
export const readFont = () => call("readFont")
export const setFont = font => call("setFont", { font })
export function subscribe(listener) {
  const changed = (changes, area) => {
    if (area === "local" && (changes.disabledSites || changes.font)) listener()
  }
  chrome.storage.onChanged.addListener(changed)
  return () => chrome.storage.onChanged.removeListener(changed)
}

let queue = Promise.resolve()
export function handleSettings(message) {
  const work = queue.then(async () => {
    const { disabledSites = [], font = { type: "bundled" } } = await chrome.storage.local.get(["disabledSites", "font"])
    const key = message.site ? siteKey(message.site) : null
    switch (message.operation) {
      case "readFont": return font
      case "readSite": return !disabledSites.includes(key)
      case "setFont": {
        const next = message.font
        if (next?.type !== "bundled" && !(next?.type === "system" && typeof next.family === "string" && next.family.trim().length > 0 && next.family.length <= 200)) throw new Error("Choose bundled, or a system font family")
        const value = next.type === "bundled" ? { type: "bundled" } : { type: "system", family: next.family.trim() }
        await chrome.storage.local.set({ font: value })
        return value
      }
      case "setSite":
      case "switchSite": {
        if (!key || (message.operation === "setSite" && typeof message.enabled !== "boolean")) throw new Error("A site and enabled state are required")
        const enabled = message.operation === "switchSite" ? disabledSites.includes(key) : message.enabled
        await chrome.storage.local.set({ disabledSites: enabled ? disabledSites.filter(site => site !== key) : [...new Set([...disabledSites, key])] })
        return enabled
      }
      default: throw new Error("Unknown settings operation")
    }
  })
  queue = work.catch(() => {})
  return work
}
