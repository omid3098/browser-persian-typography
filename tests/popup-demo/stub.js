// A stand-in for the browser's extension API, so the popup runs from a plain page.
// States are chosen by the address: #on  #off  #first  #nosite  #font  #sites
// Simulated delays: storage and tabs 5 ms, the font list 30 ms, the settings worker 15 ms.
import { handleSettings } from "../../settings.js"

const OTHERS = ["digikala.com", "docs.google.com", "web.whatsapp.com"]
const STATES = {
  on: { url: "https://x.com/home", off: OTHERS },
  off: { url: "https://x.com/home", off: [...OTHERS, "x.com"] },
  first: { url: "https://x.com/home", off: [] },
  nosite: { url: "chrome://newtab/", off: OTHERS },
  font: { url: "https://x.com/home", off: OTHERS },
  sites: { url: "https://x.com/home", off: OTHERS },
  long: { url: "https://very-long-subdomain.example-company.co.uk/a", off: [...OTHERS, "very-long-subdomain.example-company.co.uk"] }
}
const name = location.hash.slice(1).split("-")[0] || "on"
const setup = STATES[name] ?? STATES.on
const later = (ms, value) => new Promise(resolve => setTimeout(resolve, ms, value))

const cached = location.hash.includes("-") ? { persianFonts: window.DEMO_FONT_CACHE } : {}
const store = { disabledSites: [...setup.off], ...cached, ...(window.__seed ?? {}) }
const listeners = []
window.__store = store
window.__previewLog = []

const pick = keys => {
  if (keys == null) return { ...store }
  const wanted = typeof keys === "string" ? [keys] : keys
  return Object.fromEntries(wanted.filter(key => key in store).map(key => [key, structuredClone(store[key])]))
}

window.chrome = {
  runtime: {
    lastError: undefined,
    sendMessage: message => later(15).then(() => handleSettings(message)).then(value => ({ value }), error => ({ error: error.message }))
  },
  storage: {
    local: {
      get: keys => later(5).then(() => pick(keys)),
      set: values => later(5).then(() => {
        const changes = {}
        for (const [key, value] of Object.entries(values)) {
          changes[key] = { oldValue: store[key], newValue: value }
          store[key] = structuredClone(value)
        }
        for (const listener of listeners) listener(changes, "local")
      })
    },
    onChanged: {
      addListener: listener => listeners.push(listener),
      removeListener: listener => listeners.splice(listeners.indexOf(listener), 1)
    }
  },
  tabs: {
    query: () => later(5, [{ id: 7, url: setup.url }]),
    connect: (tabId, info) => {
      const port = {
        name: info.name,
        postMessage: message => window.__previewLog.push(message),
        disconnect: () => window.__previewLog.push("closed"),
        onDisconnect: { addListener() {} }
      }
      return port
    }
  },
  fontSettings: {
    getFontList: () => later(30, window.DEMO_FONTS.map(font => ({ fontId: font, displayName: font })))
  }
}
