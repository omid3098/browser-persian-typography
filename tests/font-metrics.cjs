const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const { start, work, fonts } = require('./harness.cjs')
;(async () => {
  const h = await start('metrics')
  const results = []
  const shots = path.join(work, 'shots')
  fs.mkdirSync(shots, { recursive: true })
  const dimensions = () => h.page.evaluate(() => [...document.querySelectorAll('nav,p,#tweet')].map(el => {
    const range = document.createRange(); range.selectNodeContents(el)
    const lines = new Set([...range.getClientRects()].filter(r => r.width).map(r => r.top)).size
    return { block: el.id || el.tagName, height: el.getBoundingClientRect().height, lines }
  }))
  try {
    for (const family of ['bundled', 'Tahoma']) {
      await h.setting('setFont', { font: family === 'bundled' ? { type: 'bundled' } : { type: 'system', family } })
      for (const fixture of ['native', 'tweet']) {
        await h.setting('setSite', { site: h.base, enabled: false }); await h.open(fixture)
        const off = await dimensions()
        await h.setting('setSite', { site: h.base, enabled: true }); await h.settle()
        const rendered = await fonts(h.context, h.page, fixture === 'native' ? 'p:last-of-type' : '#letters')
        assert(rendered.some(font => family === 'bundled' ? /Vazirmatn/.test(font.familyName) : font.familyName === 'Tahoma'), JSON.stringify(rendered))
        const on = await dimensions()
        for (let i = 0; i < off.length; i++) {
          const delta = Math.abs(on[i].height / on[i].lines - off[i].height / off[i].lines)
          results.push({ family, fixture, off: off[i], on: on[i], deltaPerLine: delta })
          assert(delta <= 1, JSON.stringify(results.at(-1)))
        }
      }
      // Same box and pixels, with clipping as the only changed property.
      await h.page.evaluate(() => {
        document.body.innerHTML = '<div id="ink" dir="rtl" style="font:16px Arial;white-space:nowrap;width:240px;text-align:center;color:black;background:white;overflow:hidden">گچ‌پژ کِ لُ</div>'
      }); await h.settle()
      const box = await h.page.locator('#ink').boundingBox()
      const inkFonts = await fonts(h.context, h.page, '#ink')
      assert(inkFonts.some(font => family === 'bundled' ? /Vazirmatn/.test(font.familyName) : font.familyName === 'Tahoma'), JSON.stringify(inkFonts))
      console.log(`Ink box ${family}: ${box.height}px; fonts ${JSON.stringify(inkFonts)}`)
      const clip = { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 }
      const hidden = path.join(shots, `ink-${family}-hidden.png`)
      const visible = path.join(shots, `ink-${family}-visible.png`)
      await h.page.screenshot({ path: hidden, clip })
      await h.page.locator('#ink').evaluate(el => el.style.overflow = 'visible'); await h.settle()
      await h.page.screenshot({ path: visible, clip })
      const check = spawnSync('python', [path.join(__dirname, 'ink-check.py'), hidden, visible], { windowsHide: true, encoding: 'utf8' })
      console.log(check.stdout.trim()); assert.equal(check.status, 0, check.stderr || check.stdout)
    }
    fs.writeFileSync(path.join(shots, 'font-metrics.json'), JSON.stringify(results, null, 2))
    console.log('PASS F6:', JSON.stringify(results))
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
