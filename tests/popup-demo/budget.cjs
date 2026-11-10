// Measures the popup's two budgets in headless Chromium, five runs each.
//   node tests/popup-demo/budget.cjs
// Main view: complete within 100 ms of opening. Font view: first opening (nothing cached) complete within
// 1.5 s with every font name installed on this PC, later openings within 200 ms; the popup keeps answering
// keys meanwhile. Needs the playwright package; set PLAYWRIGHT_BROWSERS_PATH if its browser lives elsewhere.
const { chromium } = require("playwright")
const path = require("path")
const { pathToFileURL } = require("url")

const page = state => pathToFileURL(path.resolve(__dirname, "index.html")).href + "#" + state
const RUNS = 5
const watch = () => {
  window.__long = []
  new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__long.push(Math.round(entry.duration)) }).observe({ type: "longtask", buffered: true })
  window.__events = []
  new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__events.push(Math.round(entry.duration)) }).observe({ type: "event", durationThreshold: 16, buffered: true })
}

async function open(browser, state, seed, typing) {
  const context = await browser.newContext({ viewport: { width: 320, height: 440 } })
  const tab = await context.newPage()
  await tab.addInitScript(watch)
  if (seed) await tab.addInitScript(`window.__seed = ${JSON.stringify(seed)}`)
  await tab.goto(page(state))
  await tab.waitForFunction(() => document.documentElement.dataset.mainAt)
  if (state.startsWith("font")) {
    if (typing) {
      await tab.waitForSelector('[data-view="font"] input')
      await tab.keyboard.type("ari", { delay: 20 })
    }
    await tab.waitForFunction(() => window.__fontAt, null, { timeout: 20000 })
  }
  await tab.waitForTimeout(300)
  const result = await tab.evaluate(() => ({
    main: window.__mainAt,
    font: window.__fontAt - window.__clickedAt,
    rows: document.querySelectorAll(".frow").length,
    longTasks: window.__long,
    events: window.__events,
    store: window.__store.persianFonts
  }))
  await context.close()
  return result
}

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] })
  const verdict = []
  const report = (name, limit, values) => {
    const pass = values.every(value => value <= limit)
    verdict.push(pass)
    console.log(`${name}: ${values.map(value => Math.round(value)).join(", ")} ms (limit ${limit}) ${pass ? "PASS" : "FAIL"}`)
  }
  await open(browser, "on") // the first start of the browser is slower than any later one

  const main = []
  for (let i = 0; i < RUNS; i++) main.push((await open(browser, "on")).main)
  report("main view complete", 100, main)

  const first = []
  const longs = []
  const events = []
  let store
  for (let i = 0; i < RUNS; i++) {
    const fresh = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] }) // a popup opens in a renderer that has loaded no font yet
    const result = await open(fresh, "font", null, true)
    await fresh.close()
    first.push(result.font)
    longs.push(Math.max(0, ...result.longTasks))
    events.push(Math.max(0, ...result.events))
    store = result.store
    console.log(`  run ${i + 1}: rows ${result.rows} (only the checked ones; the filter "ari" was typed meanwhile)`)
  }
  report("font view, first opening", 1500, first)
  console.log(`  longest task on the page thread while checking: ${longs.join(", ")} ms; slowest key response: ${events.join(", ")} ms`)

  const later = []
  for (let i = 0; i < RUNS; i++) later.push((await open(browser, "font", { persianFonts: store })).font)
  report("font view, later opening", 200, later)

  await browser.close()
  process.exit(verdict.every(Boolean) ? 0 : 1)
})()
