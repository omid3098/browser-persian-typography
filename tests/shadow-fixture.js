// Only structure comes from x-chat/case.md; all text here is made up.
(() => {
  const css = new CSSStyleSheet()
  css.replaceSync(`:host{font-family:Arial,sans-serif}p{margin:8px 0}#center{text-align:center}.flex{display:flex}.grid{display:grid}.flow{display:flow-root}.block{display:block}input,textarea{display:block;font:16px Arial,sans-serif}`)
  function root(host, html) {
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.adoptedStyleSheets = [css, new CSSStyleSheet()]
    shadow.innerHTML = html
    return shadow
  }
  const outer = root(document.querySelector('#chatHost'), '<div id="middleHost"></div>')
  const middle = root(outer.querySelector('#middleHost'), '<div id="innerHost"></div>')
  const inner = root(middle.querySelector('#innerHost'), `
    <div class="flex"><div class="flex"><div class="grid"><p id="shape1">Sample پیام ساختگی <b>درشت</b></p></div></div></div>
    <div class="block"><div class="flex"><div class="flow" id="shape2"><span id="letters">Sample متن آزمایشی</span></div></div></div>
    <div class="flex"><span class="block" id="shape3"><span dir="auto" id="auto"><span id="inline">Sample یک نمونه</span></span></span></div>
    <div class="flex"><div class="flow" id="shape4">Sample پیام دیگر</div></div>
    <div class="flex"><div><div class="flex"><textarea id="shadowTextarea"></textarea><input id="shadowInput"></div></div></div>
    <div id="editor" contenteditable="true"><p id="editorInner">Sample ویرایشگر</p></div>
    <p id="center">عنوان وسط</p><p dir="rtl" id="native">متن راست</p>
    <ul id="list"><li>اول</li><li>دوم</li><li id="english">English only</li></ul>
    <table id="table"><tr><th>نام</th><th>مقدار</th></tr><tr><td>فارسی</td><td id="englishCell">English</td></tr></table>
    <p id="codeBlock">متن <code id="code">const فارسی = 1</code></p><bdo id="bdo">فارسی</bdo>
    <div id="lateHost"></div><div id="declarativeHost"></div><section id="stream"></section>
  `)
  // Match the size of the largest captured root, without private messages.
  while (inner.querySelectorAll('*').length < 746) inner.append(document.createElement('div'))
  window.chatRoot = inner
  window.makeChatRoot = root
})()
