;(function () {
  "use strict"
  const bootStart = performance.now()
  const { dominantDirection } = PersianDirection
  const ARABIC = /\p{Script=Arabic}/u
  const SKIP = 'pre,code,kbd,samp,svg,math,.katex,mjx-container,.MathJax,.xterm,.cm-editor,.monaco-editor,bdo,script,style,noscript,template'
  const CODE = 'pre,code,kbd,samp,svg,math,.katex,mjx-container,.MathJax,.xterm,.cm-editor,.monaco-editor'
  const PROSE = /^(P|H[1-6]|LI|BLOCKQUOTE|DT|DD|TD|TH|SUMMARY)$/
  const INLINE_DISPLAY = /^(?:inline(?:$|[- ])|contents$)/
  const INPUT = 'textarea,input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="url"],input[type="tel"]'
  const EDIT = '[contenteditable]:not([contenteditable="false"])'
  const RANGES = 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'
  const originals = new Map()
  const dirty = new Set()
  const shadowRoots = new Set()
  const scans = []
  let config, frame = 0, walker = null, fontPromise, pendingFonts = 0, pendingStates = 0
  let previewFont = null, previewPort = null, updateVersion = 0
  const fontProfiles = new Map()
  let fontCanvas
  let pageHasPersian = false
  // Read-only diagnostics live in the isolated extension world, never in the page.
  const metrics = { total: 0, longest: 0, flushes: 0 }
  Object.defineProperty(metrics, "idle", { enumerable: true, get: () => Boolean(config) && !frame && !walker && !pendingFonts && !pendingStates })
  Object.defineProperty(metrics, "state", { enumerable: true, get: () => config && ({ enabled: config.enabled, font: config.font }) })
  globalThis.__persianTypographyMetrics = metrics

  function remember(el) {
    if (!originals.has(el)) originals.set(el, { attrs: new Map(), props: new Map(), style: el.getAttribute("style") })
    return originals.get(el)
  }
  function attr(el, name, value) {
    if (el.getAttribute(name) === value) return
    const saved = remember(el).attrs
    if (!saved.has(name)) saved.set(name, { before: el.getAttribute(name) })
    el.setAttribute(name, value)
    saved.get(name).after = value
  }
  function prop(el, name, value) {
    if (el.style.getPropertyValue(name) === value && el.style.getPropertyPriority(name) === "important") return
    const saved = remember(el).props
    if (!saved.has(name)) saved.set(name, { before: el.style.getPropertyValue(name), priority: el.style.getPropertyPriority(name) })
    el.style.setProperty(name, value, "important")
    saved.get(name).after = el.style.getPropertyValue(name)
    originals.get(el).lastStyle = el.getAttribute("style")
  }
  function restore(el) {
    const saved = originals.get(el)
    if (!saved) return
    for (const [name, value] of saved.attrs) {
      if (el.getAttribute(name) === value.after) {
        if (value.before === null) el.removeAttribute(name)
        else el.setAttribute(name, value.before)
      }
    }
    const unchangedStyle = el.getAttribute("style") === saved.lastStyle
    for (const [name, value] of saved.props) {
      if (el.style.getPropertyValue(name) === value.after && el.style.getPropertyPriority(name) === "important") {
        if (value.before) el.style.setProperty(name, value.before, value.priority)
        else el.style.removeProperty(name)
      }
    }
    if (unchangedStyle) {
      if (saved.style === null) el.removeAttribute("style")
      else el.setAttribute("style", saved.style)
    } else if (saved.style === null && !el.style.length) el.removeAttribute("style")
    originals.delete(el)
  }
  function editable(el) {
    const root = el.closest(EDIT)
    return root?.isContentEditable ? root : null
  }
  function closestAcrossRoots(el, selector) {
    for (let current = el; current; current = current.getRootNode().host) {
      const match = current.closest(selector)
      if (match) return match
    }
    return null
  }
  function containsAcrossRoots(root, el) {
    for (let current = el; current; current = current.getRootNode().host) {
      if (root === current || root.contains(current)) return true
    }
    return false
  }
  function skipped(el) {
    return !el || closestAcrossRoots(el, SKIP) || /monospace/i.test(getComputedStyle(el).fontFamily)
  }
  function blockFor(el) {
    let current = el
    while (current && !/^(HTML|BODY)$/.test(current.tagName)) {
      const display = getComputedStyle(current).display
      if (!INLINE_DISPLAY.test(display)) {
        if (/(?:flex|grid)/.test(display)) return current === el ? null : el
        if (current !== el && !textBlock(current)) return el
        return current
      }
      el = current
      current = current.parentElement
    }
    return el && !/^(HTML|BODY)$/.test(el.tagName) ? el : null
  }
  function readable(el, ownItem = false) {
    const walk = document.createTreeWalker(el.shadowRoot || el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === 1) return node.matches(SKIP) || (node !== el && node.matches(EDIT)) || (ownItem && node.matches("ul,ol,table")) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP
        return NodeFilter.FILTER_ACCEPT
      }
    })
    let text = ""
    for (let node; (node = walk.nextNode());) text += node.data + " "
    return text
  }
  function textBlock(el) {
    if (!el || /^(HTML|BODY)$/.test(el.tagName)) return false
    if (/(?:flex|grid)/.test(getComputedStyle(el).display)) return false
    // A container of other blocks is never made into a direction boundary.
    return !Array.from((el.shadowRoot || el).children).some(child => !child.matches(SKIP) && !INLINE_DISPLAY.test(getComputedStyle(child).display))
  }
  function direction(el, dir) {
    if (el.getAttribute("dir") !== "rtl") attr(el, "dir", dir)
    // Author CSS (including !important rules) must not defeat a block's dir.
    prop(el, "direction", el.getAttribute("dir") === "rtl" ? "rtl" : dir)
    prop(el, "unicode-bidi", "isolate")
    if (PROSE.test(el.tagName) && ["start", "left"].includes(getComputedStyle(el).textAlign)) prop(el, "text-align", "start")
  }
  function font(el) {
    if (skipped(el)) return
    const css = getComputedStyle(el)
    // Image-replacement logos hide their text at zero size; no font is drawn.
    if (parseFloat(css.fontSize) === 0) return
    const stack = css.fontFamily.replace(/"?__PersianTypography(?:Bundled|System)\d*"?\s*,?\s*/g, "") || "sans-serif"
    const original = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${stack}`
    let profile = fontProfiles.get(original)
    if (!profile) {
      fontCanvas ||= document.createElement("canvas").getContext("2d")
      fontCanvas.font = original
      const sample = "گچ‌پژ کِ لُ"
      const before = fontCanvas.measureText(sample)
      const size = parseFloat(css.fontSize)
      const id = fontProfiles.size
      const faces = []
      const families = []
      function add(kind, source, weight) {
        const family = `__PersianTypography${kind}${id}`
        families.push(JSON.stringify(family))
        const overrides = {
          unicodeRange: RANGES, weight, style: css.fontStyle, display: "swap",
          ascentOverride: `${before.fontBoundingBoxAscent / size * 100}%`,
          descentOverride: `${before.fontBoundingBoxDescent / size * 100}%`, lineGapOverride: "0%"
        }
        pendingFonts++
        Promise.resolve(source).then(data => {
          const face = new FontFace(family, data, overrides)
          faces.push(face)
          if (config.enabled && fontProfiles.get(original) === profile) document.fonts.add(face)
          return face.load().then(() => {
            // Keep ink whole when the replacement cannot fit the original measures.
            fontCanvas.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${JSON.stringify(family)}`
            const ink = fontCanvas.measureText(sample)
            const descent = Math.ceil(ink.actualBoundingBoxDescent)
            const height = Math.max(before.fontBoundingBoxAscent + before.fontBoundingBoxDescent, Math.ceil(ink.actualBoundingBoxAscent) + descent)
            const ascent = Math.min(Math.max(before.fontBoundingBoxAscent, ink.actualBoundingBoxAscent), height - descent)
            face.ascentOverride = `${ascent / size * 100}%`
            face.descentOverride = `${(height - ascent) / size * 100}%`
          })
        }).catch(() => {}).finally(() => pendingFonts--)
      }
      if (config.font.type === "system") add("System", `local(${JSON.stringify(config.font.family)})`, "400")
      // One shared binary fetch bypasses page font/style CSP; profiles only change metrics.
      fontPromise ||= fetch(chrome.runtime.getURL("fonts/Vazirmatn.woff2")).then(response => response.arrayBuffer())
      add("Bundled", fontPromise, "100 900")
      profile = { faces, families: families.join(", ") }
      fontProfiles.set(original, profile)
    }
    prop(el, "font-family", `${profile.families}, ${stack}`)
  }
  function collect(root, holders, blocks, groups, fields) {
    function candidate(el) {
      if (skipped(el)) return
      pageHasPersian = true
      const editor = editable(el)
      if (editor) { fields.add(editor); return }
      holders.add(el)
      const block = blockFor(el)
      if (block && textBlock(block)) blocks.add(block)
      for (let inline = el; inline && inline !== block; inline = inline.parentElement) {
        if (["auto", "ltr"].includes(inline.getAttribute("dir")) && textBlock(inline)) blocks.add(inline)
      }
      for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (parent.matches("ul,ol")) {
          const css = getComputedStyle(parent)
          if (css.listStyleType !== "none" && !/(?:flex|grid)/.test(css.display)) groups.add(parent)
        } else if (parent.matches("table") && parent.querySelector("th")) groups.add(parent)
        else if (parent.matches("blockquote") && textBlock(parent)) groups.add(parent)
      }
    }
    if (root.nodeType === 3) {
      if (ARABIC.test(root.data)) candidate(root.parentElement || root.getRootNode().host)
      return
    }
    if (root.nodeType !== 1 && root.nodeType !== 11 && root !== document) return
    if (root.nodeType === 1 && root.matches(`${INPUT},${EDIT}`)) fields.add(editable(root) || root)
    for (const field of root.querySelectorAll(`${INPUT},${EDIT}`)) {
      if (!editable(field) || editable(field) === field) fields.add(field)
    }
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node; (node = walk.nextNode());) if (ARABIC.test(node.data)) candidate(node.parentElement || node.getRootNode().host)
    const elements = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
    function shadow(el) {
      if (!el.shadowRoot) return
      shadowRoots.add(el.shadowRoot)
      collect(el.shadowRoot, holders, blocks, groups, fields)
    }
    if (root.nodeType === 1) shadow(root)
    for (let el; (el = elements.nextNode());) shadow(el)
  }
  function apply(roots) {
    const holders = new Set(), blocks = new Set(), groups = new Set(), fields = new Set()
    // Restore before reading computed styles; don't read our own earlier font stack.
    for (const el of originals.keys()) {
      if (!el.isConnected || roots.some(root => containsAcrossRoots(root, el))) restore(el)
    }
    for (const root of roots) collect(root, holders, blocks, groups, fields)
    const inlineDirections = new Map()
    for (const el of new Set([...blocks, ...groups])) {
      for (const box of el.querySelectorAll("*")) {
        if (/^inline-(?:block|flex|grid|table)$/.test(getComputedStyle(box).display) && !skipped(box) && !editable(box) && dominantDirection(readable(box)) !== "rtl") inlineDirections.set(box, getComputedStyle(box).direction)
      }
    }
    const turned = new Set()
    for (const group of groups) {
      if (group.matches("ul,ol,table")) {
        const selector = group.matches("table") ? "td,th" : "li"
        const items = [...group.querySelectorAll(selector)].filter(item => item.closest("ul,ol,table") === group)
        const directions = items.map(item => dominantDirection(readable(item, true))).filter(Boolean)
        if (directions.filter(dir => dir === "rtl").length <= directions.length / 2) continue
      } else if (dominantDirection(readable(group)) !== "rtl") continue
      direction(group, "rtl")
      turned.add(group)
      for (const item of group.querySelectorAll("*")) {
        if (!skipped(item) && !editable(item) && blockFor(item) === item && textBlock(item)) blocks.add(item)
      }
    }
    for (const el of blocks) {
      const dir = dominantDirection(readable(el))
      if (dir === "rtl" || (dir === "ltr" && Array.from(turned).some(group => group.contains(el)))) direction(el, dir)
      if (dir === "rtl") {
        for (const code of el.querySelectorAll(CODE)) {
          prop(code, "direction", "ltr")
          prop(code, "unicode-bidi", "isolate")
          if (/^(PRE|CODE|KBD|SAMP)$/.test(code.tagName)) prop(code, "text-align", "left")
        }
      }
    }
    for (const [box, dir] of inlineDirections) {
      if (getComputedStyle(box).direction !== dir) {
        prop(box, "direction", dir)
        prop(box, "unicode-bidi", "isolate")
      }
    }
    for (const el of holders) font(el)
    for (const el of fields) {
      if (closestAcrossRoots(el, SKIP)) continue
      if (!pageHasPersian && !ARABIC.test(el.value || el.textContent)) continue
      if (el.matches(INPUT)) {
        if (!el.hasAttribute("dir") && getComputedStyle(el).direction !== "rtl") attr(el, "dir", "auto")
      } else if (!skipped(el)) direction(el, dominantDirection(el.textContent) || "auto")
      font(el)
    }
  }
  const observation = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["dir", "style", "class", "contenteditable"] }
  function observe() {
    observer.observe(document, observation)
    for (const root of shadowRoots) {
      if (root.host.isConnected) observer.observe(root, observation)
      else shadowRoots.delete(root)
    }
  }
  function scan(root) {
    for (const field of root.querySelectorAll(`${INPUT},${EDIT}`)) dirty.add(field)
    return { elements: document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT), text: document.createTreeWalker(root, NodeFilter.SHOW_TEXT) }
  }
  function mark(node) {
    let el = node.nodeType === 1 || node.nodeType === 11 || node === document ? node : node.parentElement
    if (!el) return
    for (let parent = el; parent; parent = parent.parentElement) if (originals.has(parent)) el = parent
    // Include the nearest list so Latin siblings follow a streaming Persian item.
    el = el.closest?.("ul,ol,table,blockquote") || el
    for (let parent = el; parent; parent = parent.parentElement) if (dirty.has(parent)) return
    dirty.add(el)
    if (!frame && config?.enabled) frame = requestAnimationFrame(flush)
  }
  const observer = new MutationObserver(records => {
    const start = performance.now()
    for (const record of records) {
      if (record.type === "childList") {
        mark(record.target)
      } else mark(record.target)
    }
    const time = performance.now() - start
    metrics.total += time; metrics.longest = Math.max(metrics.longest, time)
  })
  function flush() {
    const start = performance.now()
    frame = 0
    observer.disconnect()
    if (walker) {
      // Pure Latin pages need only a cheap text scan, sliced across frames.
      const roots = []
      let node, scanned = 0
      while (walker) {
        if (walker.elements) {
          node = walker.elements.nextNode()
          if (!node) { walker.elements = null; continue }
          if (node.shadowRoot) {
            shadowRoots.add(node.shadowRoot)
            scans.push(scan(node.shadowRoot))
          }
        } else {
          node = walker.text.nextNode()
          if (!node) { walker = scans.shift() || null; continue }
          if (ARABIC.test(node.data)) roots.push(node.parentElement || node.getRootNode().host)
        }
        if (++scanned % 128 === 0 && performance.now() - start > 4) break
      }
      apply(roots)
      if (!walker && pageHasPersian) {
        for (const root of [document, ...shadowRoots]) for (const field of root.querySelectorAll(`${INPUT},${EDIT}`)) dirty.add(field)
      }
    }
    const roots = Array.from(dirty).filter(el => el.isConnected)
    dirty.clear()
    const rootSet = new Set(roots)
    const minimal = roots.filter(el => {
      for (let parent = el.parentElement; parent; parent = parent.parentElement) if (rootSet.has(parent)) return false
      return true
    })
    if (minimal.length) apply(minimal)
    observe()
    const time = performance.now() - start
    metrics.total += time; metrics.longest = Math.max(metrics.longest, time); metrics.flushes++
    if (walker && !frame) frame = requestAnimationFrame(flush)
  }
  async function update() {
    const version = ++updateVersion
    pendingStates++
    const next = await chrome.runtime.sendMessage({ type: "state" }).finally(() => pendingStates--)
    if (!next || next.error) return
    // Scan the completed parse once; parser mutations otherwise rescan the same page.
    if (document.readyState === "loading") await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }))
    if (version !== updateVersion) return
    if (previewFont) next.font = previewFont
    const start = performance.now()
    observer.disconnect()
    if (frame) cancelAnimationFrame(frame)
    frame = 0; walker = null; scans.length = 0; dirty.clear(); shadowRoots.clear()
    pageHasPersian = false
    for (const el of originals.keys()) restore(el)
    for (const profile of fontProfiles.values()) for (const face of profile.faces) document.fonts.delete(face)
    fontProfiles.clear()
    config = next
    if (!config.enabled) {
      const time = performance.now() - start
      metrics.total += time; metrics.longest = Math.max(metrics.longest, time)
      return
    }
    walker = scan(document)
    observe()
    frame = requestAnimationFrame(flush)
    const time = performance.now() - start
    metrics.total += time; metrics.longest = Math.max(metrics.longest, time)
  }
  chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && (changes.disabledSites || changes.font)) update() })
  chrome.runtime.onConnect.addListener(port => {
    if (port.name !== "preview" || port.sender?.id !== chrome.runtime.id) return
    previewPort = port
    port.onMessage.addListener(message => {
      if (previewPort !== port) return
      const font = message.font
      if (font !== null && font?.type !== "bundled" && !(font?.type === "system" && typeof font.family === "string" && font.family.trim() && font.family.length <= 200)) return
      previewFont = font
      update()
    })
    port.onDisconnect.addListener(() => {
      if (previewPort !== port) return
      previewPort = null
      previewFont = null
      update()
    })
  })
  document.addEventListener("input", event => {
    const el = event.composedPath()[0]
    if (!(el instanceof Element)) return
    const field = editable(el) || (el.matches(INPUT) ? el : null)
    if (field && (ARABIC.test(field.value || field.textContent) || originals.has(field))) mark(field)
  }, true)
  document.addEventListener('__persianTypographyShadow', event => {
    if (!config?.enabled) return
    const target = event.composedPath()[0]
    // The page can send this event too; only inspect actual connected DOM.
    if (target instanceof Element || target instanceof ShadowRoot) mark(target)
  }, true)
  metrics.total += performance.now() - bootStart
  update()
})()
