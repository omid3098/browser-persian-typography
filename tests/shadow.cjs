const assert = require('node:assert/strict')
const { start, fonts } = require('./harness.cjs')
;(async () => {
  const h = await start('shadow')
  const { page, setting, base, settle } = h
  const off = async () => { await setting('setSite', { site: base, enabled: false }); await settle() }
  const on = async () => { await setting('setSite', { site: base, enabled: true }); await settle() }
  const css = (id, prop) => page.locator(`#${id}`).evaluate((el, prop) => getComputedStyle(el)[prop], prop)
  const snapshot = () => page.evaluate(() => {
    function tree(root) { return [root.innerHTML, [...root.querySelectorAll('*')].filter(el => el.shadowRoot).map(el => tree(el.shadowRoot))] }
    return tree(document.body)
  })
  try {
    await setting('setFont', { font: { type: 'bundled' } })
    await setting('setSite', { site: base, enabled: false })
    await h.open('shadow')
    const before = await snapshot()
    await on()
    for (const id of ['shape1', 'shape2', 'shape3', 'shape4', 'auto', 'editor', 'list', 'table']) assert.equal(await css(id, 'direction'), 'rtl', id)
    for (const id of ['letters', 'inline', 'shape4', 'shadowTextarea', 'shadowInput', 'editor']) assert.match(await css(id, 'fontFamily'), /__PersianTypography/, id)
    assert.equal(await css('shape1', 'unicodeBidi'), 'isolate')
    assert.equal(await css('shape1', 'textAlign'), 'start')
    assert.equal(await css('center', 'textAlign'), 'center')
    for (const id of ['english', 'englishCell', 'code']) assert.equal(await css(id, 'direction'), 'ltr', id)
    assert.doesNotMatch(await css('code', 'fontFamily'), /__PersianTypography/)
    for (const id of ['bdo', 'editorInner']) assert.equal(await page.locator(`#${id}`).getAttribute('style'), null, id)
    assert.equal(await page.locator('#chatHost').getAttribute('dir'), null)
    const used = await fonts(h.context, page, '#letters', true)
    assert(used.some(font => /Vazirmatn/.test(font.familyName) && font.isCustomFont), JSON.stringify(used))
    assert(used.some(font => /Arial/.test(font.familyName) && !font.isCustomFont), JSON.stringify(used))
    console.log('PASS shadow: three nested adopted-sheet roots, all four chat shapes, CSP and actual Persian/Latin fonts', JSON.stringify(used))
    await off(); assert.deepEqual(await snapshot(), before, 'off restores all shadow markup exactly')
    await on()
    await page.evaluate(() => {
      makeChatRoot(chatRoot.querySelector('#lateHost'), '<p id="late">Sample ریشه دیرهنگام</p>')
      const host = document.createElement('div')
      makeChatRoot(host, '<p id="detached">Sample جدا</p>')
      chatRoot.append(host)
      chatRoot.querySelector('#stream').innerHTML = '<p id="message">Sample پیام تازه</p>'
    })
    await settle()
    for (const id of ['late', 'detached', 'message']) assert.equal(await css(id, 'direction'), 'rtl', id)
    await page.evaluate(() => chatRoot.querySelector('#declarativeHost').setHTMLUnsafe('<div><template shadowrootmode="open"><p id="declarative">Sample ریشه اعلانی</p></template></div>'))
    await settle(); assert.equal(await css('declarative', 'direction'), 'rtl')
    await page.locator('#message').evaluate(el => { el.firstChild.data = 'English only' }); await settle()
    assert.equal(await css('message', 'direction'), 'ltr')
    for (const id of ['shadowTextarea', 'shadowInput', 'editor']) {
      await page.locator(`#${id}`).fill('تایپ فارسی Sample'); await settle()
      assert.match(await css(id, 'fontFamily'), /__PersianTypography/)
      assert.equal(await css(id, 'direction'), 'rtl')
    }
    await page.locator('#editor').fill(''); await settle()
    assert.equal(await page.locator('#editor').getAttribute('dir'), 'auto')
    await off()
    const changed = await snapshot()
    await on(); await off(); assert.deepEqual(await snapshot(), changed)
    await page.evaluate(() => makeChatRoot(chatRoot.appendChild(document.createElement('div')), '<p id="whileOff">Sample خاموش</p>'))
    await settle(); assert.equal(await page.locator('#whileOff').getAttribute('style'), null)
    await on(); assert.equal(await css('whileOff', 'direction'), 'rtl')
    await page.evaluate(() => {
      const host = document.createElement('div')
      chatRoot.append(host)
      makeChatRoot(host, '<p id="ancestorSkip">Sample متن ساختگی</p>')
      host.id = 'skipHost'
    })
    await settle(); assert.equal(await css('ancestorSkip', 'direction'), 'rtl')
    await page.locator('#skipHost').evaluate(el => el.className = 'monaco-editor'); await settle()
    assert.equal(await page.locator('#ancestorSkip').getAttribute('style'), null, 'code-editor host skips and restores its shadow text')
    await page.evaluate(() => {
      const host = chatRoot.appendChild(document.createElement('div'))
      host.id = 'directHost'
      makeChatRoot(host, 'Sample متن مستقیم')
    })
    await settle()
    assert.equal(await css('directHost', 'direction'), 'rtl')
    assert.match(await css('directHost', 'fontFamily'), /__PersianTypography/)
    await setting('setFont', { font: { type: 'system', family: 'Tahoma' } }); await settle()
    const system = await fonts(h.context, page, '#letters', true)
    assert(system.some(font => font.familyName === 'Tahoma'), JSON.stringify(system))
    await setting('setFont', { font: { type: 'bundled' } }); await settle()
    console.log('PASS shadow: late connected/detached roots, streaming changes, typing, editable root, immediate off/on')
    // No Persian anywhere: empty fields must activate only when Persian is typed.
    await h.open('shadowLatin')
    for (const id of ['emptyTextarea', 'emptyInput', 'emptyEditor']) {
      await page.locator(`#${id}`).fill('متن ساختگی'); await settle()
      assert.match(await css(id, 'fontFamily'), /__PersianTypography/)
      assert.equal(await css(id, 'direction'), 'rtl')
    }
    console.log('PASS shadow: typing activates fields on a Latin-only shadow page')
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
