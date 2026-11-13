const fs = require("node:fs")
const path = require("node:path")
const http = require("node:http")
const root = path.resolve(__dirname, "..")
const work = process.env.PERSIAN_TYPOGRAPHY_WORK || path.join(root, ".agent-work/engine")
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(work, "browsers")
process.env.TEMP = process.env.TMP = path.join(work, "tmp")
fs.mkdirSync(process.env.TEMP, { recursive: true })
const { chromium } = require("playwright")

// Invented names and text; keep the Latin opening, embedded names and punctuation.
const tweet = `Pebble Loom امروز آماده شد.\nاین یه ابزار Wisp هست که چندتا از طرح‌های دفترک رو می‌چینه. دارم یه برگه با Loom رنگ می‌کنم تا ببینم چطور می‌شه و اگه جا شد چاپش کنم؛ چندتا از برگ‌ها هنوز توی Pebble هست و برای تمرین بهتره اندازه‌ها هم یکسان بمونه.\nطرح تازه رو می‌کشم.`
// X markup from the captured post, with extension styles removed and a local emoji.
const emojiPost = `<div dir="auto" lang="fa" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-4hwcpe r-a023e6 r-16dba41 r-bnwqim" id="emojiPersian" data-testid="tweetText" style="color: rgb(231, 233, 234); line-height: 1.55;"><span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3">این یک متن ساختگی برای آزمون است </span><img alt="🚨" draggable="false" title="Police cars revolving light" class="r-4qtqp9 r-dflpy8 r-1kpi4qh r-k4bwe5 r-pp5qcn r-h9hxbl" src="/emoji.svg"><span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3"> این جمله هم ساختگی است و فقط برای آزمون Sample و Demo نوشته شده است </span>...</div>`
const chat = `<h2>پاسخ Claude</h2><p id="mixed">Hello امروز خوبه <code id="code">const فارسی = 1</code></p><ul id="list"><li>گزینه اول</li><li>گزینه دوم</li><li id="englishItem">English only</li></ul><ol><li>اول</li><li>second</li></ol><table id="data"><tr><th>نام</th><th>Name</th></tr><tr><td>داده</td><td>مقدار</td></tr><tr><td>۱۲۳</td><td id="englishCell">Data</td></tr></table><pre id="pre">const فارسی = 1</pre><p>یه خط English وسط متن</p>`
const pages = {
  blockSpans: '<div id="rows"><span id="en" style="display:block">English only</span><span id="fa" style="display:block">متن فارسی</span></div>',
  latinGroups: '<ul id="list"><li>فارسی</li><li>فارسی</li><li><h2 id="enheading">English heading</h2><p id="enpara">English para</p><div id="endiv">English div</div><span id="enspan" style="display:block">English span</span></li></ul><table><tr><th>فارسی</th><th>فارسی</th><td><h3 id="tableheading">English heading</h3></td></tr></table>',
  groups: '<table id="files"><tr><th>Name</th><th>Last commit message</th><th>Last commit date</th></tr><tr><td><div><a>README.md</a></div></td><td>Update docs</td><td>Yesterday</td></tr><tr><td><div><a>راهنما.txt</a></div></td><td>Add file</td><td>Today</td></tr></table><ul id="tie"><li>فارسی</li><li>English</li><li>123</li></ul><ul id="nested"><li>English<ul><li>فارسی</li><li>فارسی</li></ul></li><li>English</li></ul><ul id="layout" style="display:flex;list-style:none"><li>فارسی</li></ul><table id="noHeaders"><tr><td>فارسی</td></tr></table>',
  tweet: `<div style="display:flex;flex-direction:column"><div id="tweet" dir="auto" lang="en" data-testid="tweetText"><span id="letters">${tweet}</span></div></div>`,
  tweetEmoji: `<div class="emoji-posts">${emojiPost}${emojiPost.replace('id="emojiPersian"', 'id="emojiLatin"').replace('این یک متن ساختگی برای آزمون است ', 'Sample Post 1.0؛ این هم یک متن ساختگی است! ')}</div>`,
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
pages.shadow = '<div id="chatHost"></div><script src="/shadow-fixture.js"></script>'
pages.shadowLatin = '<div id="latinHost"></div><script src="/shadow-latin-fixture.js"></script>'
async function start(name, { extension = true } = {}) {
  const server = http.createServer((req, res) => {
    if (req.url === '/shadow-latin-fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(`
      const outer = document.querySelector('#latinHost').attachShadow({ mode: 'open' });
      outer.innerHTML = '<div id="nestedLatin"></div><div id="lateLatin"></div>';
      outer.querySelector('#nestedLatin').attachShadow({ mode: 'open' }).innerHTML = ${JSON.stringify('<input id="emptyInput"><textarea id="emptyTextarea" style="font-family:Arial"></textarea><div id="emptyEditor" contenteditable="true"></div>' + pages.big)};
      window.addEventListener('load', () => {
        outer.querySelector('#lateLatin').attachShadow({ mode: 'open' }).innerHTML = '<p id="lateLatinText">English after load</p>';
      });
    `); return }
    if (req.url === '/shadow-fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(path.join(__dirname, 'shadow-fixture.js'))); return }
    if (req.url === "/page.css") { res.setHeader("Content-Type", "text/css"); res.end('body{font-family:Arial,sans-serif;margin:20px}#tweet{white-space:pre-line}.emoji-posts{display:flex;flex-direction:column;background:#000}.emoji-posts [data-testid="tweetText"]{display:block;font-family:Vazirmatn,Tahoma,Arial,sans-serif}.emoji-posts span{display:inline;position:relative}.emoji-posts img{display:inline-block;width:1em;height:1em}'); return }
    if (req.url === "/emoji.svg") { res.setHeader("Content-Type", "image/svg+xml"); res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="red" d="M4 12V6a4 4 0 0 1 8 0v6z"/></svg>'); return }
    const key = req.url.slice(1).split("?")[0]
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    if (key.startsWith("tweet") || key === 'shadow') res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self'; font-src 'self'; script-src 'self'; frame-src *")
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
    const result = await control.evaluate(async ({ operation, args }) => {
      const api = await import(chrome.runtime.getURL("settings.js"))
      if (operation === "setSite") return api.setSite(args.site, args.enabled)
      if (operation === "setSitePart") return api.setSitePart(args.site, args.part, args.enabled)
      if (operation === "setFont") return api.setFont(args.font)
      return api[operation](args.site)
    }, { operation, args })
    if (["setSite", "setSitePart", "switchSite", "setFont"].includes(operation)) {
      for (const p of context.pages().filter(p => /^https?:/.test(p.url()))) {
        const expected = operation === "setFont" ? { font: result } : { parts: await control.evaluate(async url => {
          const api = await import(chrome.runtime.getURL("settings.js"))
          return api.readSiteParts(url)
        }, p.url()) }
        await settle(p, expected)
      }
    }
    return result
  }
  const page = await context.newPage()
  async function settle(p = page, expected = {}) {
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
      expression: `new Promise((resolve, reject) => {
        const expected = ${JSON.stringify(expected)}; let n = 0
        function check() {
          const metrics = globalThis.__persianTypographyMetrics, state = metrics?.state
          if (++n > 600) return reject(new Error('Engine did not become idle: ' + JSON.stringify({ expected, metrics })))
          const matches = (!('enabled' in expected) || state?.enabled === expected.enabled) &&
            (!expected.parts || (state?.parts?.font === expected.parts.font && state?.parts?.direction === expected.parts.direction)) &&
            (!expected.font || (state?.font?.type === expected.font.type && state?.font?.family === expected.font.family))
          if (metrics?.idle && n > 3 && matches) resolve()
          else requestAnimationFrame(check)
        }
        requestAnimationFrame(check)
      })`,
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
async function fonts(context, page, selector, shadow = false) {
  await page.evaluate(() => document.fonts.ready)
  const client = await context.newCDPSession(page)
  await client.send("DOM.enable"); await client.send("CSS.enable")
  const { root } = await client.send("DOM.getDocument", shadow ? { depth: -1, pierce: true } : {})
  function find(node) {
    const attrs = node.attributes || []
    if (attrs.some((attr, i) => i % 2 === 0 && attr === 'id' && attrs[i + 1] === selector.slice(1))) return node
    for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) { const found = find(child); if (found) return found }
  }
  const { nodeId } = shadow ? find(root) : await client.send("DOM.querySelector", { nodeId: root.nodeId, selector })
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
