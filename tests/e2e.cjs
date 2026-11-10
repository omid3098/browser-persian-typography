const assert = require("node:assert/strict")
const { start, fonts, chat } = require("./harness.cjs")
;(async () => {
  const h = await start("e2e")
  const { page, context, setting, open, settle, base } = h
  const css = (selector, prop) => page.locator(selector).evaluate((el, prop) => getComputedStyle(el)[prop], prop)
  const rtl = async selector => assert.equal(await css(selector, "direction"), "rtl", selector)
  const off = () => setting("setSite", { site: base, enabled: false })
  const on = () => setting("setSite", { site: base, enabled: true })
  try {
    await setting("setFont", { font: { type: "bundled" } }); await on()
    await open("tweet")
    await rtl("#tweet")
    const used = await fonts(context, page, "#letters")
    assert(used.some(font => /Vazirmatn/.test(font.familyName) && font.isCustomFont), JSON.stringify(used))
    assert(used.some(font => /Arial/.test(font.familyName) && !font.isCustomFont), JSON.stringify(used))
    assert.equal(await css("#tweet", "textAlign"), "start")
    console.log("PASS a: strict CSP tweet direction and actual Persian/Latin fonts", JSON.stringify(used))

    await open("linkedin"); await rtl("#post"); await rtl("#wrapper")
    console.log("PASS b: authored LTR inline wrapper")
    await open("chat"); await rtl("h2"); await rtl("#list"); await rtl("#data")
    assert.equal(await css("#englishItem", "direction"), "ltr")
    assert.equal(await css("#englishCell", "direction"), "ltr")
    assert.equal(await css("#pre", "direction"), "ltr")
    assert.equal(await css("#code", "direction"), "ltr")
    assert(!/PersianTypography/.test(await css("#code", "fontFamily")))
    await open("stream")
    await page.locator("#stream").evaluate((el, html) => { el.innerHTML = html }, chat)
    await settle(); await rtl("#list")
    await page.locator("#mixed").evaluate(async el => {
      el.textContent = ""
      for (const chunk of ["Hello", " امروز", " خوبه"]) {
        el.firstChild ? el.firstChild.appendData(chunk) : el.append(chunk)
        await new Promise(resolve => requestAnimationFrame(resolve))
      }
    }); await settle(); await rtl("#mixed")
    await page.locator("#mixed").evaluate(el => { el.textContent = "English only" }); await settle()
    assert.equal(await css("#mixed", "direction"), "ltr")
    console.log("PASS c: chat, lists, table, code, streamed insertion and replacement")
    await off(); await open("groups")
    const cells = () => page.locator("#files th,#files td").evaluateAll(els => els.map(el => el.getBoundingClientRect().x))
    const columns = await cells(); await on(); await settle()
    assert.deepEqual(await cells(), columns, "GitHub-shaped table keeps every column")
    for (const selector of ["#files", "#tie", "#nested", "#layout", "#noHeaders"]) {
      assert.equal(await page.locator(selector).getAttribute("dir"), null, selector)
    }
    // Crossing the majority in either direction must re-evaluate the whole list.
    await page.locator("#tie li").nth(1).evaluate(el => el.textContent = "فارسی دوم"); await settle(); await rtl("#tie")
    await page.locator("#tie li").nth(1).evaluate(el => el.textContent = "English"); await settle()
    assert.equal(await page.locator("#tie").getAttribute("dir"), null)
    console.log("PASS D6: GitHub columns, strict majority, nested own items, layout exclusions, live threshold changes")

    for (const fixture of ["native", "shell"]) {
      await off(); await open(fixture)
      const snapshot = () => page.locator(fixture === "native" ? "nav, #english" : "#icon,#neighbor,#sideIcon,#center").evaluateAll(els => els.map(el => {
        const r = el.getBoundingClientRect(); return [el.id, r.x, getComputedStyle(el).direction, getComputedStyle(el).textAlign]
      }))
      const before = await snapshot(); await on(); await settle()
      const after = await snapshot()
      // Glyph widths can change; direction and alignment cannot change.
      assert.deepEqual(after.map(row => [row[0], row[0] === "center" ? "rtl" : row[2], row[3]]), before.map(row => [row[0], row[0] === "center" ? "rtl" : row[2], row[3]]))
      assert.equal(after[0][1], before[0][1])
      if (fixture === "shell") assert(after[1][1] > after[0][1])
      else assert.equal(await page.locator("#nativeInput").getAttribute("dir"), null)
    }
    console.log("PASS d,f: native RTL and shell order/alignment unchanged")

    await off(); await open("latin")
    const original = await page.content(); await on(); await settle()
    assert.equal(await page.content(), original)
    console.log("PASS e: Latin page receives zero DOM writes")
    await page.locator("#latinInput").fill("فارسی"); await settle()
    assert.equal(await page.locator("#latinInput").getAttribute("dir"), "auto")
    assert(/PersianTypography/.test(await css("#latinInput", "fontFamily")))
    await open("edit")
    await rtl("#editor")
    assert.equal(await page.locator("#inner").getAttribute("dir"), null)
    assert.equal(await page.locator("#inner").getAttribute("style"), null)
    assert.equal(await page.locator("#input").getAttribute("dir"), "auto")
    assert.equal(await page.locator("#textarea").getAttribute("dir"), "auto")
    await page.locator("#editor").evaluate(el => el.textContent = ""); await settle()
    assert.equal(await page.locator("#editor").getAttribute("dir"), "auto")
    console.log("PASS g: editable root only, empty editor and fields")

    await off(); await open("chat")
    const baseline = await page.content()
    const second = await context.newPage(); await open("chat", second)
    await on(); await settle(); await settle(second); await rtl("#list")
    assert.equal(await second.locator("#list").getAttribute("dir"), "rtl")
    await off(); await settle(); await settle(second)
    assert.equal(await page.content(), baseline)
    assert.equal(await second.content(), baseline)
    await on(); await settle(); await rtl("#list")
    // Changes by the site while enabled survive switching off.
    await page.locator("#mixed").evaluate(el => el.style.color = "red"); await settle(); await off(); await settle()
    assert.equal(await page.locator("#mixed").evaluate(el => el.style.color), "red")
    await second.close()
    console.log("PASS h: exact restoration, re-enable, second tab and page style changes")
    await on(); await open("frame")
    const child = page.frames()[1]
    await child.waitForFunction(() => document.querySelector("#tweet")?.getAttribute("dir") === "rtl")
    await off()
    await child.waitForFunction(() => !document.querySelector("#tweet").style.fontFamily)
    assert.equal(await child.locator("#tweet").getAttribute("dir"), "auto")
    await setting("setSite", { site: "localhost", enabled: false })
    await on(); await child.waitForFunction(() => document.querySelector("#tweet")?.getAttribute("dir") === "rtl")
    console.log("PASS i: cross-host frame follows address-bar site")

    await open("tweet")
    await setting("setFont", { font: { type: "system", family: "Tahoma" } }); await settle()
    const system = await fonts(context, page, "#letters")
    assert(system.some(font => font.familyName === "Tahoma"), JSON.stringify(system))
    assert(system.some(font => font.familyName === "Arial"), JSON.stringify(system))
    const weights = await page.evaluate(() => {
      const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d")
      canvas.width = 256; canvas.height = 80
      const ink = weight => {
        ctx.clearRect(0, 0, 256, 80)
      ctx.font = `${weight} 32px ${getComputedStyle(document.querySelector('#letters')).fontFamily.split(',')[0]}`
        ctx.fillText("فارسی", 0, 45)
        const data = ctx.getImageData(0, 0, 256, 80).data
        let alpha = 0
        for (let i = 3; i < data.length; i += 4) alpha += data[i]
        return alpha
      }
      return [ink(400), ink(700)]
    })
    assert(weights[1] > weights[0], `System bold must differ from regular: ${weights}`)
    await setting("setFont", { font: { type: "system", family: "A font that is not installed 93719" } }); await settle()
    const fallback = await fonts(context, page, "#letters")
    assert(fallback.some(font => /Vazirmatn/.test(font.familyName)), JSON.stringify(fallback))
    console.log("PASS j: actual Tahoma/Arial fonts and missing-family fallback", JSON.stringify(system))
    await setting("setFont", { font: { type: "bundled" } })
  } finally { await h.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
