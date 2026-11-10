const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { start, fonts, pages, work } = require('./harness.cjs')

// Real markup shapes, with invented text and local images only.
pages.mixedResult = '<div id="result"><h2 id="title"><a>عنوان ساختگی</a></h2><div style="display:flex">example.test</div><a id="snippet">Sample این توضیح ساختگی برای آزمون جهت متن است و با یک نام لاتین شروع می‌شود.</a><div>Footer</div></div>'
pages.citationChip = '<div id="answer" style="display:flow-root">Sample این پاسخ ساختگی است <a id="chip" style="display:inline-block"><img src="/emoji.svg" style="width:16px;height:16px"><span>example.test</span></a><span id="flexChip" style="display:inline-flex"><img src="/emoji.svg" style="width:16px;height:16px">Latin site</span><span id="gridChip" style="display:inline-grid;grid-template-columns:16px auto"><img src="/emoji.svg" style="width:16px;height:16px">Latin grid</span></div>'
pages.hiddenLogo = '<header><div style="display:flex"><div><h1><a id="logo" style="display:block;font:0 a;width:220px;height:80px;background:navy">نام ساختگی</a></h1><p id="visibleLogo">نام نمایشی ساختگی</p></div></div></header>'
pages.addressLines = '<div id="addressBlock">https://example.test › lessons › درس-ساختگی-ab123</div><div style="display:flex"><span id="addressRun" dir="ltr"><span>https://<span>example.test</span></span><span> › lessons › درس-ساختگی-ab123</span></span></div><p id="addressProse">https://example.test این جمله ساختگی است</p>'
pages.addressBreaks = '<p id="breakBlock">https://example.test<br>ممنون</p><div style="display:flex"><span id="breakRun" dir="ltr"><a>https://<span>example.test</span></a><br>ممنون</span></div><p id="breakSentence">https://example.test<br>این جمله ساختگی است</p>'
pages.fieldStyles = '<style>textarea,input{font:16px Arial,sans-serif}</style><p>متن ساختگی</p><div dir="rtl" style="display:flex"><textarea id="bareTextarea"></textarea><input id="bareInput"><input id="emptyStyle" style=""><input id="authoredStyle" style="color:navy"><input id="changedStyle"></div>'
pages.svgSpacing = '<style>html{direction:rtl}svg{display:block;width:16px;height:16px;margin-inline-end:8px}button{display:inline-flex}button>span{display:block}</style><article><div dir="rtl">متن ساختگی <button><svg viewBox="0 0 16 16"><path d="M0 0h16v16H0z"/></svg><span><span id="svgLabel">برچسب ساختگی</span></span></button></div></article>'
pages.svgTurn = pages.svgSpacing.replace('html{direction:rtl}', '').replace('dir="rtl"', 'id="svgBlock"')

;(async () => {
  const h = await start('real-page-repairs')
  const { page, context, open, setting, settle } = h
  const failures = []
  fs.mkdirSync(path.join(work, 'shots'), { recursive: true })
  const test = async (name, run) => {
    try { await run(); console.log('PASS', name) }
    catch (e) { failures.push(name); console.error('FAIL', name, e.message) }
  }
  const enable = enabled => setting('setSite', { site: h.base, enabled })
  const css = (selector, key) => page.locator(selector).evaluate((el, key) => getComputedStyle(el)[key], key)
  try {
    await setting('setFont', { font: { type: 'bundled' } })
    await test('R9 SVG keeps its original direction and RTL icon gap', async () => {
      await enable(false); await open('svgSpacing'); const off = await page.content()
      const gap = () => page.locator('button').evaluate(el => {
        const icon = el.querySelector('svg').getBoundingClientRect(), label = el.querySelector('#svgLabel').getBoundingClientRect()
        return Math.max(icon.left - label.right, label.left - icon.right)
      })
      const before = await gap()
      assert.equal(before, 8)
      await enable(true); await settle()
      assert.equal(await gap(), before, 'Native RTL SVG keeps the gap on the label side')
      assert.equal(await css('svg', 'direction'), 'rtl')
      assert.equal(await page.locator('svg').evaluate(el => el.style.direction), '', 'Native RTL SVG gets no direction write')
      await enable(false); await settle()
      assert.equal(await gap(), before); assert.equal(await page.content(), off)
      await open('svgTurn'); const ltrOff = await page.content()
      assert.equal(await css('svg', 'direction'), 'ltr')
      await enable(true); await settle()
      assert.equal(await css('#svgBlock', 'direction'), 'rtl', 'The surrounding LTR block actually turns')
      assert.equal(await css('svg', 'direction'), 'ltr', 'Originally LTR SVG stays LTR inside a turned block')
      await enable(false); await settle(); assert.equal(await page.content(), ltrOff)
    })
    await test('R8 address followed by a line break and Persian follows D1', async () => {
      await enable(false); await open('addressBreaks'); const off = await page.content()
      await enable(true); await settle()
      for (const selector of ['#breakBlock', '#breakRun', '#breakSentence']) {
        assert.equal(await css(selector, 'direction'), 'rtl', selector)
      }
      await enable(false); await settle(); assert.equal(await page.content(), off)
    })
    await test('R6 address breadcrumbs keep page direction', async () => {
      await enable(false); await open('addressLines'); const off = await page.content()
      const bidi = await page.locator('#addressBlock,#addressRun').evaluateAll(els => els.map(el => getComputedStyle(el).unicodeBidi))
      await enable(true); await settle()
      for (const [i, selector] of ['#addressBlock', '#addressRun'].entries()) {
        assert.equal(await css(selector, 'direction'), 'ltr', selector)
        assert.equal(await css(selector, 'unicodeBidi'), bidi[i], selector)
        assert.equal(await page.locator(selector).evaluate(el => el.style.direction), '')
      }
      assert.equal(await css('#addressProse', 'direction'), 'rtl', 'An address followed by prose is still decided by its text')
      await enable(false); await settle(); assert.equal(await page.content(), off)
    })
    await test('R7 field style attributes restore exactly', async () => {
      await enable(false); await open('fieldStyles')
      const styles = () => page.locator('textarea,input').evaluateAll(els => els.map(el => el.getAttribute('style')))
      const before = await styles()
      await enable(true); await open('fieldStyles')
      assert((await styles()).every(style => /font-family:.*__PersianTypography/.test(style)), `Fields must actually receive our font: ${JSON.stringify(await styles())}`)
      await fonts(context, page, '#bareTextarea'); await fonts(context, page, '#bareInput')
      await page.locator('#bareTextarea').fill('متن تایپ‌شده'); await page.locator('#bareInput').fill('متن تایپ‌شده'); await settle()
      // Playwright's default caret hiding adds empty style attributes even while off.
      await page.screenshot({ path: path.join(work, 'shots', 'fixture-field-styles.png'), fullPage: true, caret: 'initial' })
      await page.locator('#changedStyle').evaluate(el => el.style.color = 'red'); await settle()
      await enable(false); await settle()
      assert.deepEqual(await styles(), [...before.slice(0, -1), 'color: red;'], 'Absent, empty and authored styles return; page edits survive')
    })
    await test('R1 mixedResult', async () => {
      await enable(false); await open('mixedResult'); const off = await page.content()
      await enable(true); await settle()
      assert.equal(await css('#snippet', 'direction'), 'rtl')
      assert.equal(await css('#snippet', 'unicodeBidi'), 'isolate')
      assert.equal(await page.locator('#result').getAttribute('dir'), null)
      assert.equal(await css('#result', 'direction'), 'ltr')
      console.log('R1 line positions', await page.locator('#snippet,#title').evaluateAll(els => els.map(el => {
        const range = document.createRange(); range.selectNodeContents(el)
        const r = range.getBoundingClientRect(); return { id: el.id, x: r.x, right: r.right }
      })))
      await page.screenshot({ path: path.join(work, 'shots', 'fixture-mixed-result.png'), fullPage: true })
      await enable(false); await settle(); assert.equal(await page.content(), off)
      await enable(true)
    })
    await test('R2 citationChip', async () => {
      await enable(false); await open('citationChip'); const off = await page.content()
      const layout = () => page.locator('#chip,#flexChip,#gridChip').evaluateAll(els => els.map(el => ({
        dir: getComputedStyle(el).direction,
        iconOffset: el.querySelector('img').getBoundingClientRect().x - el.getBoundingClientRect().x,
        width: el.getBoundingClientRect().width
      })))
      const before = await layout()
      await enable(true); await settle()
      assert.equal(await css('#answer', 'direction'), 'rtl')
      assert.deepEqual(await layout(), before, 'Latin inline boxes keep their internal layout')
      await page.screenshot({ path: path.join(work, 'shots', 'fixture-citation-chip.png'), fullPage: true })
      await enable(false); await settle(); assert.equal(await page.content(), off)
      await enable(true)
    })
    await test('R5 hiddenLogo', async () => {
      await enable(false); await open('hiddenLogo')
      const originalFont = await css('#logo', 'fontFamily')
      const box = await page.locator('#logo').boundingBox()
      await enable(true); await settle()
      assert.equal(await css('#logo', 'fontFamily'), originalFont, 'Zero-size image-replacement text keeps its own stack')
      assert.deepEqual(await page.locator('#logo').boundingBox(), box)
      await page.screenshot({ path: path.join(work, 'shots', 'fixture-hidden-logo.png'), fullPage: true })
      assert((await fonts(context, page, '#visibleLogo')).some(f => /Vazirmatn/.test(f.familyName)))
      await page.locator('#logo').evaluate(el => el.style.fontSize = '24px'); await settle()
      assert((await fonts(context, page, '#logo')).some(f => /Vazirmatn/.test(f.familyName)), 'Logo text gets the font if the page makes it visible')
    })
    await test('S3 delayed state reply', async () => {
      await enable(false); await open('tweet')
      const client = await context.newCDPSession(page), worlds = []
      client.on('Runtime.executionContextCreated', ({ context }) => worlds.push(context))
      await client.send('Runtime.enable')
      const world = worlds.find(w => w.origin.startsWith('chrome-extension://'))
      const evaluate = expression => client.send('Runtime.evaluate', { contextId: world.id, expression, awaitPromise: true, returnByValue: true })
      await evaluate(`(() => {
        const send = chrome.runtime.sendMessage.bind(chrome.runtime)
        globalThis.releaseState = null
        chrome.runtime.sendMessage = async (...args) => {
          const reply = await send(...args)
          if (args[0]?.type === 'state') await new Promise(resolve => globalThis.releaseState = resolve)
          return reply
        }
      })()`)
      let settingsReturned = false
      const requested = enable(true).then(() => { settingsReturned = true })
      let returned = false
      const waiting = settle().then(() => { returned = true })
      try {
        const held = await evaluate(`new Promise((resolve,reject) => { let n=0; function check() { if(globalThis.releaseState) resolve(__persianTypographyMetrics.idle); else if(++n>120) reject(new Error('No state request')); else requestAnimationFrame(check) } check() })`)
        await page.evaluate(() => new Promise(resolve => { let n=0; function check() { if(++n===12) resolve(); else requestAnimationFrame(check) } check() }))
        assert.equal(returned, false, 'settle returned before the requested settings applied')
        assert.equal(settingsReturned, false, 'setting returned before the requested settings applied')
        assert.equal(held.result.value, false, 'Pending state request must not be idle')
      } finally { await evaluate('releaseState?.()'); await requested; await waiting; await client.detach() }
      assert((await fonts(context, page, '#letters')).some(f => /Vazirmatn/.test(f.familyName)))
    })
  } finally { await h.close() }
  assert.deepEqual(failures, [])
})().catch(e => { console.error(e); process.exitCode = 1 })
