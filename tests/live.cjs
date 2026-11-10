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
      ["github", "https://github.com/rastikerdar/vazirmatn"]
    ]) {
      try {
        await h.setting("setSite", { site: url, enabled: false })
        const response = await h.page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 })
        if (name === "github") await h.page.waitForFunction(() => [...document.querySelectorAll('table tbody tr')].some(row => row.cells.length >= 3 && row.cells[row.cells.length - 2].textContent.trim()), null, { timeout: 30000 })
        await h.settle()
        await h.page.evaluate(() => window.scrollTo({ left: 0, top: 0, behavior: 'instant' }))
        const snapshot = () => h.page.evaluate(() => ({
          text: document.body.textContent,
          scroll: [scrollX, scrollY],
          boxes: [...document.querySelectorAll('header,main,nav,aside,#mw-panel-toc,#mw-panel,table')].map((el, index) => {
            const r = el.getBoundingClientRect()
            return { name: el.id || el.tagName + index, x: r.x, y: r.y, width: r.width, height: r.height, direction: getComputedStyle(el).direction }
          }),
          cells: [...document.querySelectorAll('table th,table td')].slice(0, 120).map(el => {
            const r = el.getBoundingClientRect()
            return { text: el.textContent.trim().slice(0, 60), x: r.x, y: r.y, width: r.width, direction: getComputedStyle(el).direction }
          })
        }))
        const before = await snapshot()
        await h.page.screenshot({ path: path.join(shots, `${name}-off.png`) })
        await h.setting("setSite", { site: url, enabled: true })
        await h.settle()
        await h.page.evaluate(() => window.scrollTo({ left: 0, top: 0, behavior: 'instant' }))
        await h.page.screenshot({ path: path.join(shots, `${name}-on.png`) })
        const after = await snapshot()
        const changed = await h.page.evaluate(() => ({
          fonts: [...document.querySelectorAll('[style*="__PersianTypography"]')].length,
          rtl: [...document.querySelectorAll('[style*="direction: rtl"]')].length,
          title: document.title
        }))
        results.push({ name, url: h.page.url(), status: response.status(), ...changed,
          textUnchanged: before.text === after.text, before: { ...before, text: undefined }, after: { ...after, text: undefined } })
        if (name === "github") {
          for (const enabled of [false, true]) {
            await h.setting("setSite", { site: url, enabled }); await h.settle()
            await h.page.locator('article.markdown-body').first().evaluate(el => window.scrollTo({ left: 0, top: el.getBoundingClientRect().top + scrollY - 20, behavior: 'instant' }))
            await h.page.screenshot({ path: path.join(shots, `github-readme-${enabled ? 'on' : 'off'}.png`) })
          }
        }
      } catch (error) { results.push({ name, url, error: error.message }) }
    }
    fs.writeFileSync(path.join(shots, "observations.json"), JSON.stringify(results, null, 2))
    console.log(JSON.stringify(results, null, 2))
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
