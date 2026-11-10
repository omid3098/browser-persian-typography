const assert = require('node:assert/strict')
const { start, fonts, pages } = require('./harness.cjs')

const markup = `<style>input,textarea,[contenteditable]{font:16px Arial,sans-serif}</style>
  <p id="post" dir="auto" style="color:navy">Sample متن فارسی <code>const فارسی = 1</code></p>
  <ul id="list"><li>اول</li><li>دوم</li><li>English</li></ul>
  <div id="editor" contenteditable="true"><p id="inner">Sample متن فارسی</p></div>
  <input id="input"><textarea id="textarea" style=""></textarea><section id="stream"></section>
  <div id="host"></div><script>
    const root = document.querySelector('#host').attachShadow({mode:'open'});
    root.innerHTML = ${JSON.stringify('<p id="shadowPost" dir="auto" style="color:navy">Sample متن فارسی</p><input id="shadowInput" style="font:16px Arial"><div id="nested"></div>')};
    root.querySelector('#nested').attachShadow({mode:'open'}).innerHTML = '<p id="nestedPost">Sample متن فارسی</p>';
  </script>`
pages.siteControls = markup + '<iframe src="http://localhost:PORT/siteControlsChild"></iframe>'
pages.siteControlsChild = markup

;(async () => {
  const h = await start('site-controls')
  const { page, worker, setting, base } = h
  const part = (name, enabled) => setting('setSitePart', { site: base, part: name, enabled })
  const both = enabled => setting('setSite', { site: base, enabled })
  const snapshot = p => p.evaluate(() => {
    function tree(root) { return [root.innerHTML, [...root.querySelectorAll('*')].filter(el => el.shadowRoot).map(el => tree(el.shadowRoot))] }
    return tree(document.body)
  })
  // Compare the unchanged part with the page's original attrs/styles in every root.
  const presentation = (p, omitted) => p.evaluate(omitted => {
    const result = []
    function tree(root) {
      for (const el of root.querySelectorAll('*')) {
        result.push([el.id, omitted === 'direction' ? null : el.getAttribute('dir'),
          [...el.style].filter(name => omitted === 'font' ? name !== 'font-family' : !['direction', 'unicode-bidi', 'text-align'].includes(name))
            .map(name => [name, el.style.getPropertyValue(name), el.style.getPropertyPriority(name)])])
        if (el.shadowRoot) tree(el.shadowRoot)
      }
    }
    tree(document.body)
    return result
  }, omitted)
  async function settledFrame(p, parts) {
    await p.waitForFunction(parts => {
      const el = document.querySelector('#post')
      return el?.getAttribute('dir') === (parts.direction ? 'rtl' : 'auto') &&
        el.style.fontFamily.includes('__PersianTypography') === parts.font
    }, parts)
  }
  async function check(p, parts) {
    await settledFrame(p, parts)
    for (const id of ['post', 'shadowPost', 'nestedPost', 'editor']) {
      const el = p.locator(`#${id}`)
      assert.equal(await el.evaluate(el => el.style.fontFamily.includes('__PersianTypography')), parts.font, `${id} font`)
      assert.equal(await el.evaluate(el => el.style.direction), parts.direction ? 'rtl' : '', `${id} direction`)
    }
    for (const id of ['input', 'textarea', 'shadowInput']) {
      const el = p.locator(`#${id}`)
      assert.equal(await el.evaluate(el => el.style.fontFamily.includes('__PersianTypography')), parts.font, `${id} font`)
      assert.equal(await el.getAttribute('dir'), parts.direction ? 'auto' : null, `${id} direction`)
    }
    assert.equal(await p.locator('#inner').getAttribute('style'), null, 'Only the editable root is managed')
    assert.equal(await p.locator('#inner').getAttribute('dir'), null)
  }
  try {
    // Old settings read without a migration write; switching one part preserves all other old sites.
    await worker.evaluate(() => chrome.storage.local.remove('siteParts'))
    await worker.evaluate(() => chrome.storage.local.set({ disabledSites: ['127.0.0.1', 'legacy.example'], font: { type: 'bundled' } }))
    const old = await worker.evaluate(() => chrome.storage.local.get(['disabledSites', 'siteParts']))
    assert.deepEqual(await setting('readSiteParts', { site: base }), { font: false, direction: false })
    assert.equal(await setting('readSite', { site: 'https://www.legacy.example/path' }), false)
    assert.deepEqual(await setting('readSiteParts', { site: 'new.example' }), { font: true, direction: true })
    assert.deepEqual(await worker.evaluate(() => chrome.storage.local.get(['disabledSites', 'siteParts'])), old)
    await part('font', true)
    assert.deepEqual(await setting('readSiteParts', { site: base }), { font: true, direction: false })
    assert.equal(await setting('readSite', { site: 'legacy.example' }), false)
    assert.deepEqual(await worker.evaluate(() => chrome.storage.local.get(['disabledSites', 'siteParts'])), {
      disabledSites: ['legacy.example'], siteParts: { '127.0.0.1': { font: true, direction: false } }
    })
    await assert.rejects(part('layout', false), /Choose font or direction/)
    console.log('PASS old settings: no migration needed, disabled hosts retained, default both on, invalid part rejected')

    await both(false); await h.open('siteControls')
    const child = page.frames().find(frame => frame.url().includes('/siteControlsChild'))
    await child.waitForSelector('#post')
    const original = await snapshot(page), childOriginal = await snapshot(child)
    const originalFont = await presentation(page, 'direction'), originalDirection = await presentation(page, 'font')
    const originalChildFont = await presentation(child, 'direction'), originalChildDirection = await presentation(child, 'font')
    const second = await h.context.newPage(); await h.open('siteControlsChild', second)
    const secondOriginal = await snapshot(second)
    const tabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, page.url())
    await worker.evaluate(() => {
      globalThis.iconCalls = []
      const set = chrome.action.setIcon.bind(chrome.action)
      chrome.action.setIcon = details => { iconCalls.push(details); return set(details) }
    })
    const icon = expected => worker.evaluate(({ tabId, expected }) => new Promise((resolve, reject) => {
      let n = 0
      const check = () => {
        if (iconCalls.filter(call => call.tabId === tabId).at(-1)?.path === expected) return resolve()
        if (++n > 100) return reject(new Error('Wrong toolbar icon'))
        setTimeout(check, 10)
      }
      check()
    }), { tabId, expected })

    await part('direction', true)
    for (const p of [page, child, second]) await check(p, { font: false, direction: true })
    assert.deepEqual(await presentation(page, 'direction'), originalFont, 'Direction-only keeps every font property')
    assert.deepEqual(await presentation(child, 'direction'), originalChildFont)
    assert(!(await fonts(h.context, page, '#post')).some(f => f.isCustomFont), 'Page fonts actually draw direction-only text')
    await icon('icons/on.png')
    console.log('PASS direction-only: blocks, fields, editable roots, nested shadow roots, second tab and cross-host frame; native fonts')

    await part('font', true); await part('direction', false)
    for (const p of [page, child, second]) await check(p, { font: true, direction: false })
    assert.deepEqual(await presentation(page, 'font'), originalDirection, 'Font-only restores all direction, bidi and alignment writes')
    assert.deepEqual(await presentation(child, 'font'), originalChildDirection)
    assert((await fonts(h.context, page, '#post')).some(f => /Vazirmatn/.test(f.familyName) && f.isCustomFont))
    await icon('icons/on.png')
    console.log('PASS font-only: direction and authored auto restored everywhere; actual bundled font draws Persian')

    // Exercise new text and character-data streaming under each independent setting.
    for (const parts of [{ font: true, direction: false }, { font: false, direction: true }]) {
      await part('font', parts.font); await part('direction', parts.direction)
      for (const p of [page, child]) {
        await p.locator('#stream').evaluate(el => el.innerHTML = '<p id="live">Sample</p>')
        await p.locator('#live').evaluate(el => el.firstChild.appendData(' متن فارسی'))
        await p.locator('#shadowInput').fill('متن تایپ‌شده')
        await p.locator('#editor').fill('Sample متن تازه')
        await p.locator('#nested').evaluate(el => {
          const host = document.createElement('div')
          host.attachShadow({mode:'open'}).innerHTML = '<p id="late">Sample متن تازه</p>'
          el.shadowRoot.append(host)
        })
        await p.waitForFunction(parts => {
          const el = document.querySelector('#live')
          return el.style.fontFamily.includes('__PersianTypography') === parts.font && el.style.direction === (parts.direction ? 'rtl' : '')
        }, parts)
        for (const id of ['live', 'late', 'shadowInput', 'editor']) {
          const el = p.locator(`#${id}`).last()
          await el.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
          assert.equal(await el.evaluate(el => el.style.fontFamily.includes('__PersianTypography')), parts.font, `${id} live font`)
          assert.equal(await el.evaluate(el => el.getAttribute('dir') !== null), parts.direction, `${id} live direction`)
        }
      }
    }
    // Reset the streaming fixture; the settings transitions themselves never navigate.
    await both(false); await h.open('siteControls')
    const currentChild = page.frames().find(frame => frame.url().includes('/siteControlsChild'))
    await currentChild.waitForSelector('#post')
    await part('font', true); await part('direction', true)
    await part('font', false)
    for (const p of [page, currentChild, second]) await check(p, { font: false, direction: true })
    assert.deepEqual(await presentation(page, 'direction'), originalFont, 'Live font off removes all font writes')
    assert.equal(await page.evaluate(() => [...document.fonts].filter(face => face.family.startsWith('__PersianTypography')).length), 0, 'Font faces removed too')
    // Font preview must not turn the disabled font part back on.
    await worker.evaluate(tabId => {
      globalThis.testPreview = chrome.tabs.connect(tabId, { name: 'preview' })
      testPreview.postMessage({ font: { type: 'system', family: 'Tahoma' } })
    }, tabId)
    await h.settle()
    assert.deepEqual(await presentation(page, 'direction'), originalFont)
    await worker.evaluate(() => testPreview.disconnect()); await h.settle()
    await part('direction', false)
    await settledFrame(currentChild, { font: false, direction: false })
    assert.deepEqual(await snapshot(page), original, 'Both off restores exact light and shadow markup')
    assert.deepEqual(await snapshot(currentChild), childOriginal, 'Both off restores the frame')
    assert.deepEqual(await snapshot(second), secondOriginal, 'Both off restores other open tabs')
    await icon('icons/off.png')
    await both(true); await check(page, { font: true, direction: true })
    assert.equal(await setting('switchSite', { site: base }), false)
    assert.deepEqual(await snapshot(page), original)
    assert.equal(await setting('switchSite', { site: base }), true)
    await part('font', false)
    assert.equal(await setting('switchSite', { site: base }), false, 'Existing switch turns a mixed site fully off')
    assert.equal(await setting('switchSite', { site: base }), true, 'Existing switch turns both parts on')
    console.log('PASS live changes: streaming, typing and new roots in both modes; exact cleanup; preview respects disabled font; icon and one-switch semantics')
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
