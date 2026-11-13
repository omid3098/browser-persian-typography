// Persian letters, Persian digits and the Arabic forms of ی and ک that people still type.
const PROBE = "ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیيكءآأؤئ۰۱۲۳۴۵۶۷۸۹"

function hash(text) {
  let a = 0xdeadbeef, b = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    a = Math.imul(a ^ code, 2654435761)
    b = Math.imul(b ^ code, 1597334677)
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909)
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909)
  return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36)
}

// Four workers checked this machine's real font list faster than one, two or eight.
export function fontsThatDrawPersian(families) {
  // Service workers cannot spawn the canvas workers; an offscreen page hosts them.
  if (typeof Worker === "undefined") return (async () => {
    await chrome.offscreen.createDocument({
      url: "popup/font-check.html", reasons: ["WORKERS"],
      justification: "Check installed fonts for Persian before the popup opens"
    })
    try {
      const result = await chrome.runtime.sendMessage({ type: "check-persian-fonts", families })
      if (result.error) throw new Error(result.error)
      return new Set(result.families)
    } finally { await chrome.offscreen.closeDocument() }
  })()
  const count = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 4))
  const fontUrl = new URL("../fonts/Vazirmatn.woff2", import.meta.url).href
  const parts = Array.from({ length: count }, (_, i) => families.filter((_, j) => j % count === i))
  return Promise.all(parts.map(part => new Promise((resolve, reject) => {
    const worker = new Worker(new URL("persian-check.js", import.meta.url))
    worker.onmessage = ({ data }) => {
      worker.terminate()
      if (data.error) reject(new Error(data.error))
      else resolve(data)
    }
    worker.onerror = event => { worker.terminate(); reject(new Error(event.message)) }
    worker.postMessage({ probe: PROBE, families: part, fontUrl })
  }))).then(lists => new Set(lists.flat()))
}

export async function findPersianFonts() {
  let raw = []
  try { raw = await chrome.fontSettings.getFontList() } catch { raw = [] }
  const seen = new Set()
  const all = []
  for (const { fontId, displayName } of raw) {
    if (!fontId || seen.has(fontId)) continue
    seen.add(fontId)
    all.push({ family: fontId, label: displayName || fontId })
  }
  all.sort((a, b) => a.label.localeCompare(b.label, "en"))
  const signature = hash(all.map(item => item.family).join("\n"))
  const { persianFonts: cached } = await chrome.storage.local.get("persianFonts")
  if (cached?.signature === signature) {
    const known = new Set(cached.families)
    return all.filter(item => known.has(item.family))
  }
  let ok
  try {
    const drawn = await fontsThatDrawPersian(all.map(item => item.family))
    ok = all.filter(item => drawn.has(item.family))
  } catch {
    return []
  }
  await chrome.storage.local.set({ persianFonts: { signature, families: ok.map(item => item.family) } })
  return ok
}

