const fs = require("node:fs")
const path = require("node:path")
const { start, work } = require("./harness.cjs")
;(async () => {
  const h = await start("live")
  const shots = path.join(work, "shots")
  fs.mkdirSync(shots, { recursive: true })
  const results = []
  try {
    for (const [name, url] of [
      ["wikipedia", "https://fa.wikipedia.org/wiki/ایران"],
      ["github", "https://github.com/rastikerdar/vazirmatn"],
      ["x", "https://x.com/sorithecreator"]
    ]) {
      try {
        await h.setting("setSite", { site: url, enabled: false })
        const response = await h.page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 })
        if (name === "github") {
          await h.page.locator('article.markdown-body').first().scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {})
        }
        await h.settle()
        const before = await h.page.locator("body").innerText()
        await h.page.screenshot({ path: path.join(shots, `${name}-off.png`) })
        await h.setting("setSite", { site: url, enabled: true })
        await h.settle()
        await h.page.screenshot({ path: path.join(shots, `${name}-on.png`) })
        const changed = await h.page.evaluate(() => ({
          fonts: [...document.querySelectorAll('[style*="__PersianTypography"]')].length,
          rtl: [...document.querySelectorAll('[style*="direction: rtl"]')].length,
          title: document.title, body: document.body.innerText.slice(0, 700),
          tables: [...document.querySelectorAll('table[dir="rtl"]')].map(el => ({ role: el.getAttribute("role"), html: el.outerHTML.slice(0, 2000), arabic: [...el.querySelectorAll("*")].filter(node => [...node.childNodes].some(n => n.nodeType === 3 && /\p{Script=Arabic}/u.test(n.data))).map(node => node.textContent.slice(0, 180)) }))
        }))
        results.push({ name, url: h.page.url(), status: response.status(), ...changed,
          textUnchanged: before === await h.page.locator("body").innerText(),
          postRendered: name === "x" ? await h.page.locator('[data-testid="tweetText"]').count() : undefined })
      } catch (error) { results.push({ name, url, error: error.message }) }
    }
    fs.writeFileSync(path.join(shots, "observations.json"), JSON.stringify(results, null, 2))
    console.log(JSON.stringify(results, null, 2))
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
