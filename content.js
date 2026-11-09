;(function () {
  "use strict"
  const bootStart = performance.now()
  const { dominantDirection } = PersianDirection
  const ARABIC = /\p{Script=Arabic}/u
  const SKIP = 'pre,code,kbd,samp,svg,math,.katex,mjx-container,.MathJax,.xterm,.cm-editor,.monaco-editor,bdo,script,style,noscript,template'
  const CODE = 'pre,code,kbd,samp,svg,math,.katex,mjx-container,.MathJax,.xterm,.cm-editor,.monaco-editor'
  const PROSE = /^(P|H[1-6]|LI|BLOCKQUOTE|DT|DD|TD|TH|SUMMARY)$/
  const INLINE = /^(A|ABBR|B|BDI|BR|CITE|DFN|EM|I|MARK|Q|S|SMALL|SPAN|STRONG|SUB|SUP|TIME|U|WBR)$/
  const INPUT = 'textarea,input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="url"],input[type="tel"]'
  const EDIT = '[contenteditable]:not([contenteditable="false"])'
  const BUNDLED = '"__PersianTypographyBundled"'
  const SYSTEM = '"__PersianTypographySystem"'
  const RANGES = 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'
  const originals = new Map()
  const dirty = new Set()
  let config, frame = 0, walker = null, fontPromise, bundledFace, systemFace
  let pageHasPersian = false
  // Read-only diagnostics live in the isolated extension world, never in the page.
  const metrics = { total: 0, longest: 0, flushes: 0 }
  Object.defineProperty(metrics, "idle", { enumerable: true, get: () => Boolean(config) && !frame && !walker })
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
  function skipped(el) {
    return !el || el.closest(SKIP) || /monospace/i.test(getComputedStyle(el).fontFamily)
  }
  function blockFor(el) {
    let current = el
    while (current && !/^(HTML|BODY)$/.test(current.tagName)) {
      const display = getComputedStyle(current).display
      if (/(?:flex|grid)/.test(display)) return current === el ? null : el
      if (!INLINE.test(current.tagName) && display !== "inline" && display !== "contents") return current
      el = current
      current = current.parentElement
    }
    return el && !/^(HTML|BODY)$/.test(el.tagName) ? el : null
  }
  function readable(el) {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === 1) return node.matches(SKIP) || (node !== el && node.matches(EDIT)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP
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
    return !Array.from(el.children).some(child => !child.matches(SKIP) && !INLINE.test(child.tagName) && !["inline", "contents"].includes(getComputedStyle(child).display))
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
    ensureFont()
    const stack = getComputedStyle(el).fontFamily.replace(/"?__PersianTypography(?:Bundled|System)"?\s*,?\s*/g, "")
    prop(el, "font-family", `${config.font.type === "system" ? SYSTEM + ", " : ""}${BUNDLED}, ${stack || "sans-serif"}`)
  }
  function ensureFont() {
    if (!fontPromise) {
      // A binary FontFace is not a page stylesheet or a CSP-controlled font URL.
      fontPromise = fetch(chrome.runtime.getURL("fonts/Vazirmatn.woff2"))
        .then(response => response.arrayBuffer())
        .then(data => {
          bundledFace = new FontFace("__PersianTypographyBundled", data, { unicodeRange: RANGES, weight: "100 900", display: "swap" })
          if (config.enabled) document.fonts.add(bundledFace)
          return bundledFace.load()
        }).catch(() => { fontPromise = null })
    } else if (bundledFace) document.fonts.add(bundledFace)
    if (config.font.type === "system" && !systemFace) {
      const family = JSON.stringify(config.font.family)
      // local() is a single face, not a variable font: allow normal bold synthesis.
      systemFace = new FontFace("__PersianTypographySystem", `local(${family})`, { unicodeRange: RANGES, weight: "400", display: "swap" })
      document.fonts.add(systemFace)
      systemFace.load().catch(() => {}) // The bundled face is next in the stack.
    }
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
      if (ARABIC.test(root.data)) candidate(root.parentElement)
      return
    }
    if (root.nodeType !== 1 && root !== document) return
    if (root.nodeType === 1 && root.matches(`${INPUT},${EDIT}`)) fields.add(editable(root) || root)
    for (const field of root.querySelectorAll(`${INPUT},${EDIT}`)) {
      if (!editable(field) || editable(field) === field) fields.add(field)
    }
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node; (node = walk.nextNode());) if (ARABIC.test(node.data)) candidate(node.parentElement)
  }
  function apply(roots) {
    const holders = new Set(), blocks = new Set(), groups = new Set(), fields = new Set()
    // Restore before reading computed styles; don't read our own earlier font stack.
    for (const el of originals.keys()) {
      if (!el.isConnected || roots.some(root => root === el || root.contains?.(el))) restore(el)
    }
    for (const root of roots) collect(root, holders, blocks, groups, fields)
    for (const group of groups) {
      if (dominantDirection(readable(group)) !== "rtl") continue
      direction(group, "rtl")
      const items = group.querySelectorAll("li,td,th,p,blockquote")
      for (const item of items) if (!skipped(item) && !editable(item) && textBlock(item)) blocks.add(item)
    }
    for (const el of blocks) {
      const dir = dominantDirection(readable(el))
      if (dir === "rtl" || (dir === "ltr" && Array.from(groups).some(group => group.contains(el)))) direction(el, dir)
      if (dir === "rtl") {
        for (const code of el.querySelectorAll(CODE)) {
          prop(code, "direction", "ltr")
          prop(code, "unicode-bidi", "isolate")
          if (/^(PRE|CODE|KBD|SAMP)$/.test(code.tagName)) prop(code, "text-align", "left")
        }
      }
    }
    for (const el of holders) font(el)
    for (const el of fields) {
      if (el.closest(SKIP)) continue
      if (!pageHasPersian && !ARABIC.test(el.value || el.textContent)) continue
      if (el.matches(INPUT)) {
        if (!el.hasAttribute("dir") && getComputedStyle(el).direction !== "rtl") attr(el, "dir", "auto")
      } else if (!skipped(el)) direction(el, dominantDirection(el.textContent) || "auto")
      font(el)
    }
  }
  function observe() {
    observer.observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["dir", "style", "class", "contenteditable"] })
  }
  function mark(node) {
    let el = node.nodeType === 1 || node === document ? node : node.parentElement
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
      while ((node = walker.nextNode())) {
        if (ARABIC.test(node.data)) roots.push(node.parentElement)
        if (++scanned % 128 === 0 && performance.now() - start > 4) break
      }
      if (!node) {
        walker = null
      }
      apply(roots)
      if (!walker && pageHasPersian) for (const field of document.querySelectorAll(`${INPUT},${EDIT}`)) dirty.add(field)
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
    const next = await chrome.runtime.sendMessage({ type: "state" })
    if (!next || next.error) return
    // Scan the completed parse once; parser mutations otherwise rescan the same page.
    if (document.readyState === "loading") await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }))
    const start = performance.now()
    observer.disconnect()
    if (frame) cancelAnimationFrame(frame)
    frame = 0; walker = null; dirty.clear()
    pageHasPersian = false
    for (const el of originals.keys()) restore(el)
    if (systemFace) document.fonts.delete(systemFace)
    systemFace = null
    config = next
    if (!config.enabled) {
      if (bundledFace) document.fonts.delete(bundledFace)
      const time = performance.now() - start
      metrics.total += time; metrics.longest = Math.max(metrics.longest, time)
      return
    }
    walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT)
    for (const field of document.querySelectorAll(`${INPUT},${EDIT}`)) dirty.add(field)
    observe()
    frame = requestAnimationFrame(flush)
    const time = performance.now() - start
    metrics.total += time; metrics.longest = Math.max(metrics.longest, time)
  }
  chrome.storage.onChanged.addListener((_changes, area) => { if (area === "local") update() })
  document.addEventListener("input", event => {
    const el = event.target
    if (el instanceof Element && el.matches(INPUT) && (ARABIC.test(el.value) || originals.has(el))) mark(el)
  }, true)
  metrics.total += performance.now() - bootStart
  update()
})()
