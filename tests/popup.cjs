const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { start, fonts, waitForFontCache, work } = require('./harness.cjs')
const shots = path.join(work, 'shots/final')
const bundled = { type: 'bundled' }
const system = { type: 'system', family: 'Tahoma' }
const probe = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیيكءآأؤئ۰۱۲۳۴۵۶۷۸۹'

;(async () => {
  fs.mkdirSync(shots, { recursive: true })
  const h = await start('popup')
  let popup
  const openPopup = async (tabId, scheme = 'light', browser = h) => {
    const p = await browser.context.newPage()
    await p.emulateMedia({ colorScheme: scheme })
    await p.setViewportSize({ width: 320, height: 440 })
    await p.addInitScript(() => {
      const started = performance.now()
      const observer = new MutationObserver(() => {
        if (!window.mainMs && document.querySelector('[data-view="main"]')) {
          document.fonts.ready.then(() => requestAnimationFrame(() => { window.mainMs = performance.now() - started }))
          observer.disconnect()
        }
      })
      observer.observe(document, { childList: true, subtree: true })
    })
    await p.goto(new URL(`popup/popup.html?tabId=${tabId}`, browser.worker.url()).href)
    await p.waitForFunction(() => window.mainMs > 0)
    return p
  }
  const targetId = await (async () => {
    await h.open('tweet')
    return h.worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, h.page.url())
  })()
  const stored = () => h.worker.evaluate(() => chrome.storage.local.get(['font', 'disabledSites']))
  const fontView = async p => {
    return p.evaluate(async () => {
      const start = performance.now()
      document.querySelector('.brow').click()
      await new Promise(resolve => {
        const check = () => {
          if (document.querySelector('.flist')?.getAttribute('aria-busy') === null) {
            document.fonts.ready.then(() => requestAnimationFrame(resolve))
          } else requestAnimationFrame(check)
        }
        check()
      })
      return performance.now() - start
    })
  }
  const row = family => popup.locator('.frow').filter({ has: popup.locator('.nm', { hasText: new RegExp(`^${family}$`) }) })
  const expectFont = async family => {
    await h.settle()
    const drawn = await fonts(h.context, h.page, '#letters')
    assert(drawn.some(f => f.familyName === family), JSON.stringify(drawn))
    assert(drawn.some(f => f.familyName === 'Arial' && !f.isCustomFont), 'Latin keeps Arial')
  }
  const shot = async (p, name) => {
    await p.evaluate(() => document.fonts.ready)
    const height = await p.locator('#app').evaluate(el => Math.ceil(el.getBoundingClientRect().height))
    if (p.viewportSize().height !== height) await p.setViewportSize({ width: 320, height })
    await p.screenshot({ path: path.join(shots, `${name}.png`) })
  }
  try {
    await h.setting('setSite', { site: h.base, enabled: true })
    await h.setting('setFont', { font: bundled })
    await h.worker.evaluate(() => {
      globalThis.iconCalls = []
      const set = chrome.action.setIcon.bind(chrome.action)
      chrome.action.setIcon = details => { iconCalls.push(details); return set(details) }
    })
    popup = await openPopup(targetId)
    const errors = []
    popup.on('pageerror', error => errors.push(String(error)))
    await popup.getByRole('switch').click()
    await h.settle()
    const without = await start('popup-absent', { extension: false })
    try { await without.open('tweet'); assert.equal(await h.page.content(), await without.page.content()) }
    finally { await without.close() }
    assert.equal(await popup.locator('.state').innerText(), 'خاموش')
    assert.equal(await h.worker.evaluate(id => iconCalls.filter(call => call.tabId === id).at(-1)?.path, targetId), 'icons/off.png')
    await popup.getByRole('switch').click(); await expectFont('Vazirmatn')
    assert.equal(await popup.locator('.state').innerText(), 'روشن')
    assert.equal(await h.worker.evaluate(id => iconCalls.filter(call => call.tabId === id).at(-1)?.path, targetId), 'icons/on.png')
    console.log('PASS switch: exact extension-free page restoration, words, grey/colour icon requests, on again')

    await fontView(popup)
    const raw = await popup.evaluate(() => chrome.fontSettings.getFontList())
    const labels = await popup.locator('.frow .nm').allTextContents()
    assert(labels.length > 1)
    for (const label of labels.slice(1)) assert(raw.some(font => (font.displayName || font.fontId) === label), label)
    assert(!labels.includes('Wingdings') && !labels.includes('Webdings'), 'Symbols must be filtered out')
    const supported = await popup.evaluate(() => chrome.storage.local.get('persianFonts'))
    // Chromium reports which face actually drew each Persian glyph; do not trust only the width filter.
    for (const family of supported.persianFonts.families) {
      await popup.evaluate(({ family, probe }) => {
        const el = document.createElement('span'); el.id = 'coverage'
        el.textContent = probe; el.style.font = `32px ${JSON.stringify(family)},Vazirmatn,serif`
        document.body.append(el)
      }, { family, probe })
      const drawn = await fonts(h.context, popup, '#coverage')
      assert(!drawn.some(f => f.isCustomFont && !/^Vazirmatn/.test(family)), `${family} fell back to Vazirmatn: ${JSON.stringify(drawn)}`)
      await popup.locator('#coverage').evaluate(el => el.remove())
    }
    assert.equal(await row('Tahoma').locator('.nm').evaluate(el => getComputedStyle(el).fontFamily), 'Vazirmatn, "Segoe UI", sans-serif')
    assert.match(await row('Tahoma').locator('.smp').evaluate(el => getComputedStyle(el).fontFamily), /^Tahoma,/)
    const before = await stored()
    const lineHeight = await h.page.locator('#tweet').evaluate(el => el.getBoundingClientRect().height)
    await row('Tahoma').hover(); await expectFont('Tahoma')
    assert.equal(await h.page.locator('#tweet').evaluate(el => el.getBoundingClientRect().height), lineHeight, 'F6 also holds during preview')
    assert.deepEqual(await stored(), before, 'Preview saves no preference')
    await popup.getByRole('textbox').fill('Tahoma')
    await row('Tahoma').hover(); await expectFont('Tahoma')
    await popup.mouse.move(160, 380); await expectFont('Vazirmatn')
    assert.equal(await popup.locator('.pointed').count(), 0, 'S4: blank list space clears pointer preview')
    await popup.keyboard.press('ArrowDown'); await expectFont('Tahoma')
    await row('Tahoma').hover(); await popup.mouse.move(160, 380); await expectFont('Tahoma')
    assert.equal(await row('Tahoma').evaluate(el => el === document.activeElement), true, 'S4: keyboard preview stays')
    await popup.keyboard.press('ArrowUp'); await expectFont('Vazirmatn')
    await popup.getByRole('textbox').fill('')
    console.log('PASS S4: leaving a font row for blank list space clears hover but keeps keyboard preview')
    await popup.locator('.hd').hover(); await expectFont('Vazirmatn')
    await row('Tahoma').hover(); await expectFont('Tahoma')
    await popup.close(); await expectFont('Vazirmatn')
    popup = await openPopup(targetId); await fontView(popup)
    await row('Tahoma').click()
    await popup.waitForFunction(() => document.querySelector('.frow[aria-pressed="true"] .nm')?.textContent === 'Tahoma')
    await popup.locator('.hd').hover(); await expectFont('Tahoma')
    assert.deepEqual((await stored()).font, system)
    await popup.close(); await expectFont('Tahoma')
    console.log(`PASS fonts: ${raw.length} real fontSettings entries, ${labels.length - 1} Persian-capable families; preview/leave/disconnect/save; readable names`)

    await h.setting('setFont', { font: bundled })
    popup = await openPopup(targetId)
    // Use only keys, from the first reachable control through both secondary views.
    await popup.keyboard.press('Tab'); assert.equal(await popup.locator(':focus').getAttribute('role'), 'switch')
    await popup.keyboard.press('Space'); await h.settle(); assert.equal(await popup.locator('.state').innerText(), 'خاموش')
    await popup.keyboard.press('Space'); await expectFont('Vazirmatn')
    await popup.keyboard.press('Tab'); assert.equal(await popup.locator(':focus').getAttribute('role'), 'radio')
    await popup.keyboard.press('Tab'); await popup.keyboard.press('Enter')
    await popup.locator('.flist:not([aria-busy])').waitFor()
    await popup.keyboard.type('Tahoma'); await popup.keyboard.press('ArrowDown'); await expectFont('Tahoma')
    await popup.keyboard.press('ArrowUp'); await expectFont('Vazirmatn')
    await popup.keyboard.press('ArrowDown'); await popup.keyboard.press('Enter')
    await popup.waitForFunction(async () => (await chrome.storage.local.get('font')).font?.family === 'Tahoma')
    await popup.keyboard.press('Tab'); await expectFont('Tahoma')
    await popup.keyboard.press('Escape'); assert.equal(await popup.locator(':focus .k').innerText(), 'فونت')
    await h.setting('setSite', { site: h.base, enabled: false })
    await h.setting('setSite', { site: 'example.com', enabled: false })
    await h.setting('setSite', { site: 'example.org', enabled: false })
    await popup.locator('.brow').nth(1).waitFor({ state: 'visible' })
    await popup.keyboard.press('Tab'); await popup.keyboard.press('Enter')
    await popup.keyboard.press('Tab'); await popup.keyboard.press('Enter')
    // The list holds the other switched-off sites; this tab's own site stays off and is not listed.
    assert.equal(await popup.locator('.srow').count(), 1)
    assert(!((await stored()).disabledSites.includes('example.com')))
    assert((await stored()).disabledSites.includes('127.0.0.1'))
    await popup.keyboard.press('Enter')
    await popup.locator('[data-view="main"]').waitFor()
    assert.equal(await popup.locator('.brow').nth(1).isVisible(), false)
    console.log('PASS keyboard/sites: Tab, Space, search, arrows with preview, Enter choice, Escape, site row removal and last-row return')
    assert.deepEqual(errors, [])
    await popup.close()

    // The three parts: each choice is stored and reaches the open tab, a new popup shows it,
    // and the sites list names a site with one part off and turns it fully on.
    for (const site of [h.base, 'example.com', 'example.org']) await h.setting('setSite', { site, enabled: true })
    await h.setting('setFont', { font: bundled })
    const storedParts = () => h.worker.evaluate(() => chrome.storage.local.get(['disabledSites', 'siteParts']))
    const direction = () => h.page.locator('#tweet').evaluate(el => getComputedStyle(el).direction)
    const waitParts = (p, expected) => p.waitForFunction(async ([host, expected]) => {
      const { siteParts = {}, disabledSites = [] } = await chrome.storage.local.get(['siteParts', 'disabledSites'])
      return expected === 'both' ? !(host in siteParts) && !disabledSites.includes(host) : JSON.stringify(siteParts[host]) === JSON.stringify(expected)
    }, ['127.0.0.1', expected])
    popup = await openPopup(targetId)
    const partErrors = []
    popup.on('pageerror', error => partErrors.push(String(error)))
    assert.equal(await popup.getByRole('radiogroup', { name: 'در این سایت' }).getByRole('radio').count(), 3)
    assert.equal(await popup.getByRole('radio', { checked: true }).innerText(), 'فونت و جهت')
    await popup.getByRole('radio', { name: 'فقط جهت' }).click()
    await waitParts(popup, { font: false, direction: true })
    await h.settle(h.page, { parts: { font: false, direction: true } })
    assert.equal(await direction(), 'rtl')
    assert(!(await fonts(h.context, h.page, '#letters')).some(f => f.familyName === 'Vazirmatn'), 'direction only: no Vazirmatn')
    await popup.close()
    popup = await openPopup(targetId)
    assert.equal(await popup.getByRole('radio', { checked: true }).innerText(), 'فقط جهت', 'a new popup shows the stored part')
    await popup.getByRole('radio', { name: 'فقط فونت' }).click()
    await waitParts(popup, { font: true, direction: false })
    await h.settle(h.page, { parts: { font: true, direction: false } })
    assert.equal(await direction(), 'ltr')
    assert((await fonts(h.context, h.page, '#letters')).some(f => f.familyName === 'Vazirmatn'), 'font only: Vazirmatn')
    // Keys: the focused part is the tab stop; an arrow moves to the next part and chooses it.
    await popup.getByRole('radio', { name: 'فقط فونت' }).focus()
    await popup.keyboard.press('ArrowLeft'); await waitParts(popup, 'both')
    assert.equal(await popup.locator(':focus').innerText(), 'فونت و جهت')
    await popup.keyboard.press('ArrowRight'); await waitParts(popup, { font: true, direction: false })
    // The site switch still turns the whole site off, then on with both parts.
    await popup.getByRole('switch').click(); await h.settle(h.page, { parts: { font: false, direction: false } })
    assert.equal(await popup.getByRole('radiogroup').isVisible(), false)
    assert(!('127.0.0.1' in ((await storedParts()).siteParts || {})) && (await storedParts()).disabledSites.includes('127.0.0.1'))
    await popup.getByRole('switch').click(); await waitParts(popup, 'both')
    assert.equal(await popup.getByRole('radio', { checked: true }).innerText(), 'فونت و جهت')
    await popup.close()
    await h.setting('setSitePart', { site: 'example.net', part: 'font', enabled: false })
    await h.setting('setSite', { site: 'example.com', enabled: false })
    popup = await openPopup(targetId)
    assert.equal(await popup.locator('.brow').nth(1).locator('.v').innerText(), '۲', 'the count includes a site with one part off')
    await popup.locator('.brow').nth(1).click()
    assert.deepEqual(await popup.locator('.srow').allInnerTexts(), ['example.com\nروشن کن', 'example.net\nفونت خاموش\nروشن کن'])
    await popup.getByRole('button', { name: 'روشن کن: example.net' }).click()
    await popup.waitForFunction(async () => !('example.net' in ((await chrome.storage.local.get('siteParts')).siteParts || {})))
    const after = await storedParts()
    assert(!('example.net' in (after.siteParts || {})) && !after.disabledSites.includes('example.net'), 'Turn-on gives both parts')
    assert.deepEqual(partErrors, [])
    await popup.close()
    console.log('PASS parts: each choice stored and drawn on the tab, stored state shown again, arrow keys, switch off/on, sites list note and turn-on')

    // Budgets include real API calls, fonts, complete list and the next paint, without mocks.
    const timing = { main: [], firstFonts: [], laterFonts: [], reopenedFonts: [] }
    const backgroundMs = []
    for (let run = 0; run < 5; run++) {
      const cold = await start(`popup-prewarmed-budget-${run}`)
      try {
        await waitForFontCache(cold)
        backgroundMs.push(await cold.worker.evaluate(() => __persianFontWarmupMs))
        // A warm popup must read the result without launching any font-check workers.
        await cold.context.addInitScript(() => { window.Worker = class { constructor() { throw new Error('Font check ran in a warmed popup') } } })
        await cold.open('tweet')
        const tabId = await cold.worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, cold.page.url())
        popup = await openPopup(tabId, 'light', cold)
        timing.main.push(await popup.evaluate(() => mainMs))
        timing.firstFonts.push(await fontView(popup))
        assert(await popup.locator('.frow').count() > 1, 'Warmed cache must supply real fonts')
        await popup.getByRole('button', { name: 'برگشت' }).click()
        timing.laterFonts.push(await fontView(popup))
        await popup.close()
        popup = await openPopup(tabId, 'light', cold)
        timing.reopenedFonts.push(await fontView(popup))
        await popup.close()
      } finally { await cold.close() }
    }
    fs.writeFileSync(path.join(work, 'repairs-popup-timing.json'), JSON.stringify({ ...timing, backgroundMs }, null, 2))
    console.log('Popup ms (five each):', JSON.stringify(timing))
    console.log('Background font check ms (five each):', JSON.stringify(backgroundMs))
    for (const [name, values] of Object.entries(timing)) assert(values.every(value => value <= (name === 'main' ? 100 : name === 'firstFonts' ? 1500 : 200)), `${name} exceeds budget`)

    await h.setting('setFont', { font: bundled })
    const restricted = await h.context.newPage(); await restricted.goto('chrome://extensions')
    await restricted.bringToFront()
    const restrictedId = await h.worker.evaluate(async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id)
    for (const scheme of ['light', 'dark']) {
      await h.setting('setSite', { site: h.base, enabled: true })
      await h.setting('setSite', { site: 'example.com', enabled: false })
      popup = await openPopup(targetId, scheme)
      await shot(popup, `main-on-${scheme}`)
      await popup.getByRole('switch').click(); await h.settle()
      await shot(popup, `main-off-${scheme}`)
      await popup.locator('.brow').nth(1).click()
      await shot(popup, `sites-${scheme}`)
      await popup.getByRole('button', { name: 'برگشت' }).click()
      await popup.getByRole('switch').click(); await expectFont('Vazirmatn')
      await fontView(popup)
      await popup.setViewportSize({ width: 320, height: 440 })
      await popup.evaluate(() => scrollTo(0, 0))
      await row('Tahoma').hover(); await expectFont('Tahoma')
      await shot(popup, `font-hover-${scheme}`)
      // Contrast for every muted label against the pointed row's actual background.
      const contrast = await popup.evaluate(() => {
        const luminance = color => {
          const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map(n => { const v = Number(n) / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 })
          return .2126 * r + .7152 * g + .0722 * b
        }
        const bg = luminance(getComputedStyle(document.querySelector('.pointed')).backgroundColor)
        return ['--ink2', '--ink3'].map(variable => {
          const el = document.querySelector('.pointed .smp'); el.style.color = `var(${variable})`
          const fg = luminance(getComputedStyle(el).color); el.style.color = ''
          return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05)
        })
      })
      assert(contrast.every(value => value >= 4.5), `${scheme} hover contrast ${contrast}`)
      console.log(`${scheme} pointed-row contrast: ${contrast.map(n => n.toFixed(3)).join(', ')}:1`)
      if (scheme === 'light') await h.page.screenshot({ path: path.join(shots, 'post-preview.png') })
      await popup.close(); await expectFont('Vazirmatn')
      popup = await openPopup(restrictedId, scheme)
      assert.equal(await popup.locator('.b-site').count(), 0)
      await shot(popup, `no-site-${scheme}`); await popup.close()
    }
    await restricted.close()
    await h.page.screenshot({ path: path.join(shots, 'post-on.png') })
    await h.setting('setSite', { site: h.base, enabled: false }); await h.settle()
    await h.page.screenshot({ path: path.join(shots, 'post-off.png') })
    await h.setting('setSite', { site: h.base, enabled: true })
    console.log('PASS screenshots: ten real-popup views at 320px and own height; three 1440x900 post states; restricted page hides site')
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
