const assert = require('node:assert/strict')
const { start } = require('./harness.cjs')
;(async () => {
  const h = await start('shadow-review')
  const failures = []
  async function check(name, test) {
    try { await test(); console.log('PASS', name) }
    catch (error) { failures.push(name + ': ' + error.message); console.error('FAIL', name, error.message) }
  }
  const css = (id, prop) => h.page.locator('#' + id).evaluate((el, prop) => getComputedStyle(el)[prop], prop)
  try {
    await h.open('latin')
    await check('S1 direct shadow text updates', async () => {
      await h.page.evaluate(() => {
        const host = document.body.appendChild(document.createElement('div')); host.id = 'directReview'; host.style.display = 'block'
        host.attachShadow({ mode: 'open' }).append('English only')
      }); await h.settle()
      await h.page.evaluate(() => document.querySelector('#directReview').shadowRoot.firstChild.data = 'Sample متن فارسی')
      await h.settle()
      assert.equal(await css('directReview', 'direction'), 'rtl')
      assert.match(await css('directReview', 'fontFamily'), /__PersianTypography/)
      await h.page.evaluate(() => document.querySelector('#directReview').shadowRoot.firstChild.data = 'English only')
      await h.settle()
      assert.equal(await css('directReview', 'direction'), 'ltr', 'direct text can return to Latin')
      assert.doesNotMatch(await css('directReview', 'fontFamily'), /__PersianTypography/)
      await h.page.evaluate(() => document.querySelector('#directReview').shadowRoot.textContent = 'دوباره فارسی')
      await h.settle()
      assert.equal(await css('directReview', 'direction'), 'rtl')
      await h.page.evaluate(() => document.querySelector('#directReview').shadowRoot.textContent = 'English replacement')
      await h.settle()
      assert.equal(await css('directReview', 'direction'), 'ltr', 'root child replacements restore the host')
    })
    for (const [name, light, shadow, lineBlock] of [
      ['1 direct slot', 'متن فارسی', '<slot></slot>', 'slotHostReview'],
      ['2 wrapped slot', 'Sample متن فارسی', '<p id="slotParagraphReview"><slot></slot></p>', 'slotParagraphReview'],
      ['3 nested light text', '<span><b>Sample متن فارسی</b></span>', '<p id="slotParagraphReview"><slot></slot></p>', 'slotParagraphReview'],
      ['4 light text becomes Latin', '<span id="slotSpanReview">متن فارسی</span>', '<p id="slotParagraphReview"><slot></slot></p>', 'slotParagraphReview'],
      ['5 light inline box', 'متن فارسی <a id="slotLinkReview" style="display:inline-flex"><b>+</b>Latin site</a>', '<slot></slot>', 'slotHostReview']
    ]) await check('separate trees: ' + name, async () => {
      await h.open('latin')
      await h.setting('setSite', { site: h.base, enabled: false })
      await h.page.evaluate(({ light, shadow }) => {
        for (const field of document.querySelectorAll('input,textarea')) field.remove()
        const host = document.body.appendChild(document.createElement('div')); host.id = 'slotHostReview'
        host.innerHTML = light
        host.attachShadow({ mode: 'open' }).innerHTML = shadow
      }, { light, shadow })
      const markup = () => h.page.evaluate(() => [document.body.innerHTML, document.querySelector('#slotHostReview').shadowRoot.innerHTML])
      const before = await markup()
      await h.setting('setSite', { site: h.base, enabled: true })
      assert.equal(await css(lineBlock, 'direction'), 'rtl', 'the element laying out the text as lines must turn')
      assert.equal(await h.page.locator('#slotHostReview').getAttribute('dir'), 'rtl', 'light text decides its host')
      if (await h.page.locator('#slotParagraphReview').count()) assert.equal(await h.page.locator('#slotParagraphReview').getAttribute('dir'), null, 'slot wrapper only inherits')
      if (name.startsWith('4 ')) {
        await h.page.locator('#slotSpanReview').evaluate(el => { el.firstChild.data = 'English only' }); await h.settle()
        assert.equal(await h.page.evaluate(() => {
          const host = document.querySelector('#slotHostReview')
          return [...document.querySelectorAll('*'), ...host.shadowRoot.querySelectorAll('*')].some(el => getComputedStyle(el).direction === 'rtl')
        }), false, 'no stale RTL in either tree')
        assert.deepEqual(await markup(), before.map(html => html.replace('متن فارسی', 'English only')), 'Latin edit leaves no extension markup')
      }
      if (name.startsWith('5 ')) {
        assert.equal(await css('slotLinkReview', 'direction'), 'ltr')
        assert.equal(await h.page.locator('#slotLinkReview').evaluate(el => {
          const text = document.createRange(); text.selectNode(el.lastChild)
          return el.firstChild.getBoundingClientRect().right <= text.getBoundingClientRect().left
        }), true, 'icon stays before the Latin label')
      }
      await h.setting('setSite', { site: h.base, enabled: false })
      assert.deepEqual(await markup(), name.startsWith('4 ') ? before.map(html => html.replace('متن فارسی', 'English only')) : before, 'B2 restores light and shadow markup exactly')
      await h.setting('setSite', { site: h.base, enabled: true })
    })
    await check('S4 native attach result survives page overrides', async () => {
      const result = await h.page.evaluate(() => {
        const host = document.body.appendChild(document.createElement('div'))
        host.dispatchEvent = () => { throw Error('page override') }
        const OriginalEvent = window.Event, OriginalMouseEvent = window.MouseEvent
        window.Event = window.MouseEvent = function () { throw Error('page constructor override') }
        try { return host.attachShadow({ mode: 'open' }) === host.shadowRoot }
        finally { window.Event = OriginalEvent; window.MouseEvent = OriginalMouseEvent }
      })
      assert.equal(result, true)
    })
    await check('S5 code directly in a shadow root stays LTR', async () => {
      await h.page.evaluate(() => {
        const host = document.body.appendChild(document.createElement('div')); host.style.display = 'block'
        host.attachShadow({ mode: 'open' }).innerHTML = 'متن فارسی <code id="directCodeReview">English code</code>'
      }); await h.settle()
      assert.equal(await css('directCodeReview', 'direction'), 'ltr')
    })
    await check('S7 direct shadow inline box keeps its order and restores exactly', async () => {
      await h.setting('setSite', { site: h.base, enabled: false })
      await h.page.evaluate(() => {
        const host = document.body.appendChild(document.createElement('div')); host.id = 'inlineBoxHostReview'; host.style.display = 'block'
        host.attachShadow({ mode: 'open' }).innerHTML = 'نوشته آزمایشی <a id="inlineBoxReview" style="display:inline-flex"><b>+</b>Demo link</a>'
      })
      const markup = () => h.page.locator('#inlineBoxHostReview').evaluate(el => [el.outerHTML, el.shadowRoot.innerHTML])
      const before = await markup()
      await h.setting('setSite', { site: h.base, enabled: true })
      assert.equal(await css('inlineBoxHostReview', 'direction'), 'rtl')
      assert.equal(await css('inlineBoxReview', 'direction'), 'ltr')
      assert.equal(await h.page.locator('#inlineBoxReview').evaluate(el => {
        const text = document.createRange(); text.selectNode(el.lastChild)
        return el.firstChild.getBoundingClientRect().right <= text.getBoundingClientRect().left
      }), true, 'icon stays before the Latin label')
      await h.setting('setSite', { site: h.base, enabled: false })
      assert.deepEqual(await markup(), before, 'B2 restores the host and inline box exactly')
      await h.setting('setSite', { site: h.base, enabled: true })
    })
    await check('announcements survive disconnected nesting and switching off', async () => {
      await h.setting('setSite', { site: h.base, enabled: false }); await h.settle()
      await h.page.evaluate(() => {
        const host = document.createElement('div'), root = host.attachShadow({ mode: 'open' })
        const child = root.appendChild(document.createElement('div'))
        child.attachShadow({ mode: 'open' }).innerHTML = '<p id="detachedReview">Sample متن فارسی</p>'
        window.reviewHost = host
      })
      await h.page.evaluate(() => document.body.append(window.reviewHost)); await h.settle()
      assert.equal(await h.page.evaluate(() => window.reviewHost.shadowRoot.firstChild.shadowRoot.firstChild.getAttribute('style')), null)
      await h.setting('setSite', { site: h.base, enabled: true }); await h.settle()
      assert.equal(await h.page.evaluate(() => getComputedStyle(window.reviewHost.shadowRoot.firstChild.shadowRoot.firstChild).direction), 'rtl')
      await h.page.evaluate(() => { window.reviewHost.remove(); window.reviewWeak = new WeakRef(window.reviewHost); delete window.reviewHost })
      await h.settle()
      const client = await h.context.newCDPSession(h.page)
      for (let i = 0; i < 3; i++) {
        await client.send('HeapProfiler.collectGarbage')
        await h.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      }
      await client.detach()
      assert.equal(await h.page.evaluate(() => !!window.reviewWeak.deref()), false, 'removed hosts must be collectible')
    })
    await check('S6 hook fixture includes roots attached after load', async () => {
      await h.open('shadowLatin')
      assert.equal(await h.page.evaluate(() => document.querySelector('#latinHost').shadowRoot.querySelector('#lateLatin').shadowRoot.textContent), 'English after load')
      await h.page.locator('#lateLatinText').evaluate(el => { el.firstChild.data = 'Sample متن فارسی' }); await h.settle()
      assert.equal(await css('lateLatinText', 'direction'), 'rtl')
    })
    assert.deepEqual(failures, [])
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
