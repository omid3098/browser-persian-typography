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
    await check('S2 assigned text and block boundaries', async () => {
      await h.page.evaluate(() => {
        for (const [id, html] of [['slotText', 'Sample متن فارسی'], ['slotInline', '<span>Sample متن فارسی</span>'], ['slotBlocks', '<p>Sample متن فارسی</p><p>English only</p>']]) {
          const host = document.body.appendChild(document.createElement('div')); host.id = id; host.innerHTML = html
          host.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>'
        }
      }); await h.settle()
      for (const id of ['slotText', 'slotInline']) assert.equal(await css(id, 'direction'), 'rtl', id)
      assert.equal(await h.page.locator('#slotBlocks').getAttribute('dir'), null, 'block host must not mirror its block children')
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
