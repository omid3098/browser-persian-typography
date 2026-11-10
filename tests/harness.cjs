const fs = require("node:fs")
const path = require("node:path")
const http = require("node:http")
const root = path.resolve(__dirname, "..")
const work = path.join(root, ".agent-work/engine")
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(work, "browsers")
process.env.TEMP = process.env.TMP = path.join(work, "tmp")
fs.mkdirSync(process.env.TEMP, { recursive: true })
const { chromium } = require("playwright")

const tweet = `Claude Duet امروز برام باز شد.\nالان یه بات Grok هست که بخشی از کارهای سیب‌کده رو می‌کنه. می‌خوام همون رو با Duet تست کنم و اگه دربیاد جابه‌جا شم؛ بقیه‌ی کارهام همین الان روی Claude هست و ترجیح می‌دم همه‌چی یه جا باشه.\nنتیجه رو می‌نویسم.`
const chat = `<h2>پاسخ Claude</h2><p id="mixed">Hello امروز خوبه <code id="code">const فارسی = 1</code></p><ul id="list"><li>گزینه اول</li><li>گزینه دوم</li><li id="englishItem">English only</li></ul><ol><li>اول</li><li>second</li></ol><table id="data"><tr><th>نام</th><th>Name</th></tr><tr><td>داده</td><td>مقدار</td></tr><tr><td>۱۲۳</td><td id="englishCell">Data</td></tr></table><pre id="pre">const فارسی = 1</pre><p>یه خط English وسط متن</p>`
const pages = {
  blockSpans: '<div id="rows"><span id="en" style="display:block">English only</span><span id="fa" style="display:block">متن فارسی</span></div>',
  latinGroups: '<ul id="list"><li>فارسی</li><li>فارسی</li><li><h2 id="enheading">English heading</h2><p id="enpara">English para</p><div id="endiv">English div</div><span id="enspan" style="display:block">English span</span></li></ul><table><tr><th>فارسی</th><th>فارسی</th><td><h3 id="tableheading">English heading</h3></td></tr></table>',
  groups: '<table id="files"><tr><th>Name</th><th>Last commit message</th><th>Last commit date</th></tr><tr><td><div><a>README.md</a></div></td><td>Update docs</td><td>Yesterday</td></tr><tr><td><div><a>راهنما.txt</a></div></td><td>Add file</td><td>Today</td></tr></table><ul id="tie"><li>فارسی</li><li>English</li><li>123</li></ul><ul id="nested"><li>English<ul><li>فارسی</li><li>فارسی</li></ul></li><li>English</li></ul><ul id="layout" style="display:flex;list-style:none"><li>فارسی</li></ul><table id="noHeaders"><tr><td>فارسی</td></tr></table>',
  tweet: `<div style="display:flex;flex-direction:column"><div id="tweet" dir="auto" lang="en" data-testid="tweetText"><span id="letters">${tweet}</span></div></div>`,
  linkedin: '<p id="post"><span id="wrapper" dir="ltr">Hello امروز خوبه</span></p>',
  chat,
  native: '<nav><span id="nav">Home</span><span>خانه</span></nav><p id="english">English only</p><p>فارسی</p><input id="nativeInput" placeholder="جستجو">',
  latin: '<p>English only</p><div><span>nothing changes</span></div><input id="latinInput"><textarea></textarea>',
  shell: '<div id="toolbar" style="display:flex;gap:12px"><b id="icon">+</b><span id="label">عنوان فارسی</span><span id="neighbor">English</span></div><aside style="display:flex"><span id="sideIcon">*</span><span>تنظیمات</span></aside><h2 id="center" style="text-align:center">عنوان فارسی</h2>',
  edit: '<div id="editor" contenteditable="true"><p id="inner">Hello امروز خوبه</p></div><input id="input"><textarea id="textarea"></textarea>',
  frame: '<p>فارسی</p><iframe src="http://localhost:PORT/tweet"></iframe>',
  stream: '<section id="stream"></section>',
  big: Array.from({ length: 20000 }, (_, i) => `<span>English text ${i}</span>`).join("")
}
async function start(name, { extension = true } = {}) {
  const server = http.createServer((req, res) => {
    if (req.url === "/page.css") { res.setHeader("Content-Type", "text/css"); res.end('body{font-family:Arial,sans-serif;margin:20px}#tweet{white-space:pre-line}'); return }
    const key = req.url.slice(1).split("?")[0]
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    if (key === "tweet") res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self'; font-src 'self'; script-src 'self'; frame-src *")
    res.end(`<!doctype html><html${key === "native" ? ' dir="rtl"' : ""}><head><meta charset="utf-8"><link rel="stylesheet" href="/page.css"></head><body>${(pages[key] || pages.latin).replaceAll("PORT", server.address().port)}</body></html>`)
  })
  await new Promise(resolve => server.listen(0, "0.0.0.0", resolve))
  const profile = path.join(work, `profile-${name}`)
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium", headless: true, viewport: { width: 1440, height: 900 },
    args: [...(extension ? [`--disable-extensions-except=${path.join(root, 'dist')}`, `--load-extension=${path.join(root, 'dist')}`] : ["--disable-extensions"]), "--no-first-run", "--disable-background-networking", "--disable-gpu"]
  })
  const worker = extension ? context.serviceWorkers()[0] || await context.waitForEvent("serviceworker") : null
  const base = `http://127.0.0.1:${server.address().port}`
  const control = await context.newPage()
  if (extension) await control.goto(new URL("manifest.json", worker.url()).href)
  async function setting(operation, args = {}) {
    return control.evaluate(async ({ operation, args }) => {
      const api = await import(chrome.runtime.getURL("settings.js"))
      if (operation === "setSite") return api.setSite(args.site, args.enabled)
      if (operation === "setFont") return api.setFont(args.font)
      return api[operation](args.site)
    }, { operation, args })
  }
  const page = await context.newPage()
  async function settle(p = page) {
    if (!extension) { await p.evaluate(() => document.fonts.ready); return }
    // Wait for a concrete engine state in its isolated world, not a time guess.
    const client = await context.newCDPSession(p)
    const worlds = []
    client.on("Runtime.executionContextCreated", ({ context }) => worlds.push(context))
    await client.send("Runtime.enable")
    const world = worlds.find(world => world.origin.startsWith("chrome-extension://"))
    if (!world) throw new Error(`No extension world: ${JSON.stringify(worlds)}`)
    const result = await client.send("Runtime.evaluate", {
      contextId: world.id,
      expression: `new Promise((resolve, reject) => { let n = 0; function check() { if (++n > 600) return reject(new Error('Engine did not become idle')); if (globalThis.__persianTypographyMetrics?.idle && n > 3) resolve(); else requestAnimationFrame(check) } requestAnimationFrame(check) })`,
      awaitPromise: true, returnByValue: true
    })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    await p.evaluate(() => document.fonts.ready)
    await client.detach()
  }
  async function open(key, p = page) { await p.goto(`${base}/${key}`); await settle(p); return p }
  return { context, worker, page, base, setting, settle, open, server,
    async close() { await context.close(); await new Promise(resolve => server.close(resolve)) } }
}
async function fonts(context, page, selector) {
  await page.evaluate(() => document.fonts.ready)
  const client = await context.newCDPSession(page)
  await client.send("DOM.enable"); await client.send("CSS.enable")
  const { root } = await client.send("DOM.getDocument")
  const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector })
  const result = (await client.send("CSS.getPlatformFontsForNode", { nodeId })).fonts
  await client.detach()
  return result
}
async function waitForFontCache(h) {
  await h.worker.evaluate(() => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { chrome.storage.onChanged.removeListener(check); reject(new Error('Background font cache did not finish')) }, 15000)
    async function check() {
      const { persianFonts } = await chrome.storage.local.get('persianFonts')
      if (!persianFonts?.families.includes('Tahoma')) return
      if ((await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length) return
      clearTimeout(timer)
      chrome.storage.onChanged.removeListener(check)
      resolve()
    }
    chrome.storage.onChanged.addListener(check)
    check()
  }))
}
module.exports = { start, fonts, waitForFontCache, root, work, pages, chat }
