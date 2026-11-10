import { findPersianFonts } from "./font-list.js"
import { siteKey, sitePartsFor, setSite, setSiteParts, setFont, subscribe } from "../settings.js"

const app = document.getElementById("app")
const BUNDLED = { type: "bundled" }
const BUNDLED_NAME = "وزیرمتن"
const state = { tabId: null, host: null, off: [], mixed: {}, font: BUNDLED }
let view = "main"
let leavePreview = () => {}

const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`
const ICON = {
  chev: svg('<path d="M15 5l-7 7 7 7"/>'),
  back: svg('<path d="M4 12h16M14 6l6 6-6 6"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>')
}
const fa = n => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d])

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value
    else if (key === "html") node.innerHTML = value
    else node.setAttribute(key, value)
  }
  node.append(...children)
  return node
}

// ---------- the tab and the stored settings ----------

function siteOf(url) {
  let parsed
  try { parsed = new URL(url) } catch { return null }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
  const { hostname, pathname } = parsed
  if (hostname === "chromewebstore.google.com") return null
  if (hostname === "chrome.google.com" && pathname.startsWith("/webstore")) return null
  if (hostname === "microsoftedge.microsoft.com" && pathname.startsWith("/addons")) return null
  return siteKey(url)
}

async function readStored() {
  const { disabledSites = [], siteParts = {}, font = BUNDLED } = await chrome.storage.local.get(["disabledSites", "siteParts", "font"])
  state.off = [...disabledSites].sort()
  state.mixed = siteParts
  state.font = font
}

const partsOf = host => sitePartsFor(host, { disabledSites: state.off, siteParts: state.mixed })
const siteOn = () => { const { font, direction } = partsOf(state.host); return font || direction }
// Same rule as the settings module, so the popup can show a change before it is saved.
function applyLocal(host, parts) {
  const on = parts.font || parts.direction
  state.off = on ? state.off.filter(site => site !== host) : [...new Set([...state.off, host])].sort()
  const { [host]: _, ...mixed } = state.mixed
  state.mixed = parts.font === parts.direction ? mixed : { ...mixed, [host]: parts }
}
// The switch already shows this site; the list holds the other sites with a part off, and says which.
const others = () => [
  ...state.off.map(host => ({ host, note: "" })),
  ...Object.entries(state.mixed).map(([host, parts]) => ({ host, note: parts.font ? "جهت متن خاموش" : "فونت خاموش" }))
].filter(site => site.host !== state.host).sort((a, b) => a.host.localeCompare(b.host))
const MODES = [["both", "فونت و جهت", true, true], ["direction", "فقط جهت", false, true], ["font", "فقط فونت", true, false]]
const modeOf = ({ font, direction }) => font && direction ? "both" : direction ? "direction" : "font"
const fontName = font => font.type === "system" ? font.family : BUNDLED_NAME
const sameFont = (a, b) => a.type === b.type && a.family === b.family

async function refresh() {
  await readStored()
  repaint()
}

function repaint() {
  if (view === "main") paintMain()
  else if (view === "font") markChosen()
  else syncSites()
}

// ---------- main view ----------

let main = null

function showMain(focus) {
  leavePreview()
  view = "main"
  main = {}
  const root = h("main", { class: "pop", "data-view": "main" })
  if (state.host) {
    main.sw = h("button", { class: "sw", type: "button", role: "switch", "aria-label": state.host, html: "<i></i>" })
    main.state = h("div", { class: "state" })
    main.host = h("div", { class: "host", dir: "ltr" }, state.host)
    root.append(h("div", { class: "b-site" }, h("div", { class: "who" }, main.host, main.state), main.sw))
    main.sw.addEventListener("click", toggleSite)
    main.parts = h("div", { class: "parts" }, h("div", { class: "seg", role: "radiogroup", "aria-label": "در این سایت" },
      ...MODES.map(([mode, label]) => h("button", { class: "opt", type: "button", role: "radio", "data-mode": mode }, label))))
    main.parts.addEventListener("click", event => {
      const option = event.target.closest(".opt")
      if (option) chooseMode(option.dataset.mode)
    })
    main.parts.addEventListener("keydown", event => {
      const step = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 }[event.key]
      if (!step) return
      event.preventDefault()
      const options = [...main.parts.querySelectorAll(".opt")]
      const next = options[(options.indexOf(document.activeElement) + step + options.length) % options.length]
      next.focus()
      chooseMode(next.dataset.mode)
    })
    root.append(main.parts)
  }
  main.font = h("button", { class: "brow", type: "button" }, h("span", { class: "k" }, "فونت"), h("span", { class: "v" }), h("span", { html: ICON.chev }))
  main.fontValue = main.font.querySelector(".v")
  main.sites = h("button", { class: "brow", type: "button" }, h("span", { class: "k" }, "سایت‌های خاموش"), h("span", { class: "v" }), h("span", { html: ICON.chev }))
  main.sitesValue = main.sites.querySelector(".v")
  main.font.addEventListener("click", showFont)
  main.sites.addEventListener("click", showSites)
  root.append(h("div", { class: state.host ? "b-rows with-site" : "b-rows" }, main.font, main.sites))
  app.replaceChildren(root)
  paintMain()
  if (state.host) fitHost()
  if (focus) main[focus].focus()
}

function paintMain() {
  if (state.host) {
    const on = siteOn()
    main.sw.setAttribute("aria-checked", String(on))
    main.state.textContent = on ? "روشن" : "خاموش"
    main.parts.hidden = !on
    const mode = modeOf(partsOf(state.host))
    for (const option of main.parts.querySelectorAll(".opt")) {
      option.setAttribute("aria-checked", String(option.dataset.mode === mode))
      option.tabIndex = option.dataset.mode === mode || !on ? 0 : -1
    }
  }
  main.fontValue.textContent = fontName(state.font)
  main.sitesValue.textContent = fa(others().length)
  main.sites.hidden = others().length === 0
}

// A host name that does not fit at 32 px steps down; if even 20 px is too wide it takes the
// full width above the state and the switch, and may break after a dot or a hyphen.
function fitHost() {
  for (const [size, line] of [[32, 40], [24, 32], [20, 28]]) {
    main.host.style.fontSize = `${size}px`
    main.host.style.lineHeight = `${line}px`
    if (main.host.scrollWidth <= main.host.clientWidth) return
  }
  main.host.style.fontSize = ""
  main.host.style.lineHeight = ""
  main.host.closest(".b-site").classList.add("long")
  main.host.replaceChildren(...state.host.split(/(?<=[.-])/).flatMap((part, i) => i ? [h("wbr"), part] : [part]))
}

async function toggleSite() {
  const next = !siteOn()
  applyLocal(state.host, { font: next, direction: next })
  paintMain()
  try { await setSite(state.host, next) } catch { await refresh() }
}

async function chooseMode(mode) {
  const [, , font, direction] = MODES.find(entry => entry[0] === mode)
  if (modeOf(partsOf(state.host)) === mode) return
  applyLocal(state.host, { font, direction })
  paintMain()
  try { await setSiteParts(state.host, font, direction) } catch { await refresh() }
}

// ---------- font view ----------

let fontPromise = null
const persianFonts = () => fontPromise ??= findPersianFonts()

const normalize = text => text.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک")
const stackOf = family => `"${family.replace(/["\\]/g, "")}","Vazirmatn",sans-serif`

let fontToken = 0
let fontView = null

async function showFont() {
  view = "font"
  const token = ++fontToken
  const back = h("button", { class: "ib", type: "button", "aria-label": "برگشت", html: ICON.back })
  const input = h("input", { type: "text", dir: "rtl", placeholder: "جست‌وجوی فونت", "aria-label": "جست‌وجوی فونت", autocomplete: "off", spellcheck: "false" })
  const list = h("ul", { class: "flist", "data-scroll": "list", "aria-busy": "true" })
  const none = h("li", { class: "none", hidden: "" }, "فونتی پیدا نشد")
  const root = h("div", { class: "pop tall", "data-view": "font" },
    h("div", { class: "hd" }, back, h("h1", { class: "tt" }, "فونت")),
    h("label", { class: "search", html: ICON.search }, input),
    list)
  const rows = []

  function addRow(font, label, tag) {
    const family = font.type === "system" ? font.family : "Vazirmatn"
    const button = h("button", { class: "frow", type: "button", tabindex: "-1", "aria-pressed": "false" },
      h("span", { class: "l" }, h("span", { class: "nm" }, label), ...(tag ? [h("span", { class: "tag" }, tag)] : [])),
      ...(tag ? [] : [h("span", { class: "smp" }, "نمونه")]),
      h("span", { class: "ck" }))
    const sample = button.querySelector(".smp")
    if (sample) sample.style.fontFamily = stackOf(family)
    const li = h("li", {}, button)
    li.dataset.search = normalize(`${label} ${family}`)
    rows.push({ font, button, li })
    list.insertBefore(li, none)
  }

  const rowOf = target => target.closest?.(".frow") ?? null
  const fontOfRow = row => rows.find(entry => entry.button === row).font
  const visibleRows = () => rows.filter(entry => !entry.li.hidden).map(entry => entry.button)

  // The page behind shows the font under the pointer or the keyboard focus, without saving it.
  let port = null
  let pointerRow = null
  let focusRow = null
  let active = null
  let sent = "null"
  const post = font => {
    const key = font ? JSON.stringify(font) : "null"
    if (key === sent || !state.tabId || !state.host) return
    sent = key
    try {
      if (!port) {
        port = chrome.tabs.connect(state.tabId, { name: "preview" })
        port.onDisconnect.addListener(() => { void chrome.runtime.lastError; port = null })
      }
      port.postMessage({ font })
    } catch { port = null }
  }
  const point = row => {
    active?.classList.remove("pointed")
    active = row
    row?.classList.add("pointed")
    post(row ? fontOfRow(row) : null)
  }
  leavePreview = () => {
    point(null)
    try { port?.disconnect() } catch {}
    port = null
    leavePreview = () => {}
  }

  list.addEventListener("mouseover", event => {
    const row = rowOf(event.target)
    if (row) { pointerRow = row; point(row) }
  })
  list.addEventListener("mouseout", event => {
    if (rowOf(event.target) === rowOf(event.relatedTarget || {})) return
    pointerRow = rowOf(event.relatedTarget || {})
    point(pointerRow ?? focusRow)
  })
  list.addEventListener("focusin", event => {
    const row = rowOf(event.target)
    if (!row) return
    focusRow = row
    for (const entry of rows) entry.button.tabIndex = entry.button === row ? 0 : -1
    point(row)
  })
  list.addEventListener("focusout", event => {
    if (list.contains(event.relatedTarget)) return
    focusRow = null
    point(pointerRow)
  })
  list.addEventListener("click", event => {
    const row = rowOf(event.target)
    if (row) choose(fontOfRow(row))
  })
  list.addEventListener("keydown", event => {
    const row = rowOf(event.target)
    if (!row) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const visible = visibleRows()
      const next = visible[visible.indexOf(row) + (event.key === "ArrowDown" ? 1 : -1)]
      if (next) next.focus()
      else if (event.key === "ArrowUp") input.focus()
    } else if (event.key === "Backspace" || (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey)) {
      input.focus()
    }
  })
  input.addEventListener("keydown", event => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      visibleRows()[0]?.focus()
    }
  })
  const filter = () => {
    const query = normalize(input.value.trim())
    let shown = 0
    for (const entry of rows) {
      entry.li.hidden = query !== "" && !entry.li.dataset.search.includes(query)
      if (!entry.li.hidden) shown++
    }
    none.hidden = shown > 0
    if (pointerRow?.closest("li").hidden) pointerRow = null
    if (focusRow?.closest("li").hidden) focusRow = null
    point(focusRow ?? pointerRow)
  }
  input.addEventListener("input", filter)
  back.addEventListener("click", () => showMain("font"))

  fontView = { rows, list }
  app.replaceChildren(root)
  list.append(none)
  addRow(BUNDLED, BUNDLED_NAME, "پیش‌فرض")
  markChosen()
  input.focus()

  const items = await persianFonts()
  if (view !== "font" || token !== fontToken) return
  for (const item of items) addRow({ type: "system", family: item.family }, item.label)
  list.removeAttribute("aria-busy")
  filter()
  markChosen()
  const chosen = rows.find(entry => entry.button.getAttribute("aria-pressed") === "true")
  if (chosen && chosen !== rows[0]) chosen.li.scrollIntoView({ block: "center" })
}

function markChosen() {
  if (!fontView) return
  const tabStop = fontView.rows.find(entry => entry.button === document.activeElement) ?? fontView.rows.find(entry => sameFont(entry.font, state.font)) ?? fontView.rows[0]
  for (const entry of fontView.rows) {
    const chosen = sameFont(entry.font, state.font)
    entry.button.setAttribute("aria-pressed", String(chosen))
    entry.button.querySelector(".ck").innerHTML = chosen ? ICON.check : ""
    entry.button.tabIndex = entry === tabStop ? 0 : -1
  }
}

async function choose(font) {
  state.font = font
  markChosen()
  try { await setFont(font) } catch { await refresh() }
}

// ---------- sites view ----------

let sitesView = null

function showSites() {
  leavePreview()
  view = "sites"
  const back = h("button", { class: "ib", type: "button", "aria-label": "برگشت", html: ICON.back })
  back.addEventListener("click", () => showMain("sites"))
  const list = h("ul", { class: "sites", "data-scroll": "list" })
  list.addEventListener("click", event => {
    const button = event.target.closest(".btn")
    if (button) switchOn(button.closest("li"), button.dataset.host)
  })
  sitesView = { list, back }
  app.replaceChildren(h("div", { class: "pop", "data-view": "sites" }, h("div", { class: "hd" }, back, h("h1", { class: "tt" }, "سایت‌های خاموش")), list))
  syncSites()
  back.focus()
}

function syncSites() {
  const sites = others()
  if (sites.length === 0) return showMain("font")
  const { list } = sitesView
  const shown = [...list.children].map(li => `${li.dataset.host} ${li.dataset.note}`)
  if (shown.join("\n") === sites.map(site => `${site.host} ${site.note}`).join("\n")) return
  list.replaceChildren(...sites.map(({ host, note }) => {
    const li = h("li", { class: "srow" }, h("div", { class: "who" }, h("span", { class: "host", dir: "ltr" }, host), ...(note ? [h("div", { class: "sub" }, note)] : [])),
      h("button", { class: "btn", type: "button", "aria-label": `روشن کن: ${host}` }, "روشن کن"))
    li.dataset.host = host
    li.dataset.note = note
    li.querySelector(".btn").dataset.host = host
    return li
  }))
}

async function switchOn(li, host) {
  const next = li.nextElementSibling ?? li.previousElementSibling
  applyLocal(host, { font: true, direction: true })
  if (others().length === 0) showMain("font")
  else {
    li.remove()
    ;(next?.querySelector(".btn") ?? sitesView.back).focus()
  }
  try { await setSite(host, true) } catch { await refresh() }
}

// ---------- keyboard and start ----------

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return
  if (view === "main") window.close()
  else showMain(view === "font" ? "font" : "sites")
})

async function start() {
  // An extension-page test can name its target without changing the browser's active tab.
  const target = new URL(location.href).searchParams.get("tabId")
  const [tabs] = await Promise.all([
    target ? chrome.tabs.get(Number(target)).then(tab => [tab]) : chrome.tabs.query({ active: true, currentWindow: true }),
    readStored(),
    document.fonts.load('600 32px "Vazirmatn"').catch(() => {})
  ])
  const tab = tabs[0]
  state.tabId = tab?.id ?? null
  state.host = tab?.url ? siteOf(tab.url) : null
  showMain()
  subscribe(refresh)
  requestAnimationFrame(() => setTimeout(persianFonts))
}

start()
