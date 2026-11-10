// The interface imports this module; all writes go through the worker's queue.
export function siteKey(value) {
  return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, "")
}
const call = (operation, args = {}) => chrome.runtime.sendMessage({ type: "settings", operation, ...args }).then(result => {
  if (result.error) throw new Error(result.error)
  return result.value
})
export const readSite = site => call("readSite", { site })
export const readSiteParts = site => call("readSiteParts", { site })
export const setSitePart = (site, part, enabled) => call("setSitePart", { site, part, enabled })
export const setSite = (site, enabled) => call("setSite", { site, enabled })
export const switchSite = site => call("switchSite", { site })
export const readFont = () => call("readFont")
export const setFont = font => call("setFont", { font })
export function subscribe(listener) {
  const changed = (changes, area) => {
    if (area === "local" && (changes.disabledSites || changes.siteParts || changes.font)) listener()
  }
  chrome.storage.onChanged.addListener(changed)
  return () => chrome.storage.onChanged.removeListener(changed)
}

// Keep the old off-list for the existing popup; only mixed states need an entry.
export function sitePartsFor(site, { disabledSites = [], siteParts = {} }) {
  if (disabledSites.includes(site)) return { font: false, direction: false }
  return Object.hasOwn(siteParts, site) ? { ...siteParts[site] } : { font: true, direction: true }
}

let queue = Promise.resolve()
export function handleSettings(message) {
  const work = queue.then(async () => {
    const { disabledSites = [], siteParts = {}, font = { type: "bundled" } } = await chrome.storage.local.get(["disabledSites", "siteParts", "font"])
    const key = message.site ? siteKey(message.site) : null
    const parts = sitePartsFor(key, { disabledSites, siteParts })
    switch (message.operation) {
      case "readFont": return font
      case "readSite": return parts.font || parts.direction
      case "readSiteParts": return parts
      case "setFont": {
        const next = message.font
        if (next?.type !== "bundled" && !(next?.type === "system" && typeof next.family === "string" && next.family.trim().length > 0 && next.family.length <= 200)) throw new Error("Choose bundled, or a system font family")
        const value = next.type === "bundled" ? { type: "bundled" } : { type: "system", family: next.family.trim() }
        await chrome.storage.local.set({ font: value })
        return value
      }
      case "setSite":
      case "setSitePart":
      case "switchSite": {
        if (!key || (message.operation !== "switchSite" && typeof message.enabled !== "boolean")) throw new Error("A site and enabled state are required")
        if (message.operation === "setSitePart") {
          if (!["font", "direction"].includes(message.part)) throw new Error("Choose font or direction")
          parts[message.part] = message.enabled
        } else {
          const enabled = message.operation === "switchSite" ? !(parts.font || parts.direction) : message.enabled
          parts.font = parts.direction = enabled
        }
        const enabled = parts.font || parts.direction
        const nextParts = { ...siteParts }
        delete nextParts[key]
        if (parts.font !== parts.direction) nextParts[key] = parts
        await chrome.storage.local.set({
          disabledSites: enabled ? disabledSites.filter(site => site !== key) : [...new Set([...disabledSites, key])],
          siteParts: nextParts
        })
        return message.operation === "setSitePart" ? parts : enabled
      }
      default: throw new Error("Unknown settings operation")
    }
  })
  queue = work.catch(() => {})
  return work
}
