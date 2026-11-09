const assert = require("node:assert/strict")
const { start } = require("./harness.cjs")
;(async () => {
  const h = await start("latin")
  try {
    await h.page.addInitScript(() => {
      // Ignore parser writes: observe only after the document has been parsed.
      document.addEventListener("DOMContentLoaded", () => {
        window.writes = 0
        new MutationObserver(records => window.writes += records.length).observe(document, { attributes: true, childList: true, characterData: true, subtree: true })
      })
    })
    for (let run = 1; run <= 5; run++) {
      const client = await h.context.newCDPSession(h.page)
      const worlds = []
      client.on("Runtime.executionContextCreated", ({ context }) => worlds.push(context))
      await client.send("Runtime.enable")
      await h.open("big")
      const world = worlds.filter(world => world.origin.startsWith("chrome-extension://")).at(-1)
      const { result } = await client.send("Runtime.evaluate", { contextId: world.id, expression: "JSON.stringify(__persianTypographyMetrics)", returnByValue: true })
      const metrics = JSON.parse(result.value)
      const writes = await h.page.evaluate(() => window.writes)
      console.log(`Run ${run}/5: total ${metrics.total.toFixed(3)} ms / 50; longest ${metrics.longest.toFixed(3)} ms / 16; DOM writes ${writes}`)
      assert(metrics.idle && metrics.flushes > 0)
      assert(metrics.total <= 50 && metrics.longest <= 16 && writes === 0, "Latin page exceeds its budget")
      await client.detach()
    }
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
