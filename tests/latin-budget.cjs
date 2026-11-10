const assert = require("node:assert/strict")
const { start } = require("./harness.cjs")
;(async () => {
  const h = await start("latin")
  try {
    await h.page.addInitScript(() => {
      // Ignore parser writes: observe only after the document has been parsed.
      document.addEventListener("DOMContentLoaded", () => {
        window.writes = 0
        const observer = new MutationObserver(records => window.writes += records.length)
        function observe(root) {
          observer.observe(root, { attributes: true, childList: true, characterData: true, subtree: true })
        }
        observe(document)
        // These are the two roots in shadowLatin; don't add a second 20k-node
        // scan (and its GC) to the engine measurement.
        const outer = document.querySelector('#latinHost')?.shadowRoot
        if (outer) { observe(outer); observe(outer.querySelector('#nestedLatin').shadowRoot) }
      })
    })
    const failures = []
    for (const fixture of ['big', 'shadowLatin']) {
    for (let run = 1; run <= 5; run++) {
      const client = await h.context.newCDPSession(h.page)
      const worlds = []
      client.on("Runtime.executionContextCreated", ({ context }) => worlds.push(context))
      await client.send("Runtime.enable")
      await h.open(fixture)
      const world = worlds.filter(world => world.origin.startsWith("chrome-extension://")).at(-1)
      const { result } = await client.send("Runtime.evaluate", { contextId: world.id, expression: "JSON.stringify(__persianTypographyMetrics)", returnByValue: true })
      const metrics = JSON.parse(result.value)
      const writes = await h.page.evaluate(() => window.writes)
      console.log(`${fixture} run ${run}/5: total ${metrics.total.toFixed(3)} ms / 50; longest ${metrics.longest.toFixed(3)} ms / 16; DOM writes ${writes}`)
      assert(metrics.idle && metrics.flushes > 0)
      if (metrics.total > 50 || metrics.longest > 16 || writes !== 0) failures.push(`${fixture} run ${run}`)
      await client.detach()
    }
    }
    assert.deepEqual(failures, [], 'Latin page exceeds its budget')
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
