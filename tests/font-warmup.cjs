const assert = require('node:assert/strict')
const { start, waitForFontCache } = require('./harness.cjs')

;(async () => {
  const profile = `font-warmup-${Date.now()}`
  for (const phase of ['install', 'startup']) {
    const h = await start(profile)
    try {
      // No popup has opened. Wait for a finished cache; the offscreen page stays open to keep the popup quick.
      await waitForFontCache(h)
      const ms = await h.worker.evaluate(() => __persianFontWarmupMs)
      assert(ms > 0)
      assert.equal(await h.worker.evaluate(async () => (await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length), 1)
      console.log(`PASS background ${phase}: cache ready before any popup, offscreen page open; ${ms.toFixed(1)} ms`)
      if (phase === 'startup') {
        // An absent cache still uses the popup's own check.
        await h.worker.evaluate(() => chrome.storage.local.remove('persianFonts'))
        await h.page.goto(new URL('popup/popup.html', h.worker.url()).href)
        await h.page.locator('.brow').first().click()
        await h.page.locator('.flist:not([aria-busy])').waitFor()
        assert(await h.page.locator('.frow').count() > 1)
        assert((await h.worker.evaluate(() => chrome.storage.local.get('persianFonts'))).persianFonts.families.includes('Tahoma'))
        console.log('PASS popup fallback: missing cache checked and stored')
      }
      await h.worker.evaluate(() => chrome.storage.local.remove('persianFonts'))
    } finally { await h.close() }
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
