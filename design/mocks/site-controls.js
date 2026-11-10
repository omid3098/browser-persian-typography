(() => {
  const HOST = "khabaronline.ir";
  const LONG = "news.very-long-site-name-example.co.uk";
  const FONT = "وزیرمتن";
  const OFF3 = [{ h: "digikala.com" }, { h: "docs.google.com" }, { h: "web.whatsapp.com" }];
  // part: which part is off on that site
  const OFF5 = [
    { h: "aparat.com", part: "font" }, { h: "digikala.com" }, { h: "docs.google.com" },
    { h: LONG, part: "font" }, { h: "web.whatsapp.com", part: "dir" }
  ];
  const PART_OFF = { font: "فونت خاموش", dir: "جهت متن خاموش" };
  const MODE_NAME = { both: "فونت و جهت متن", dir: "فقط جهت متن", font: "فقط فونت" };

  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    chev: ic('<path d="M15 5l-7 7 7 7"/>'),
    down: ic('<path d="M6 9l6 6 6-6"/>'),
    back: ic('<path d="M4 12h16M14 6l6 6-6 6"/>'),
    check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>')
  };
  const fa = n => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);

  // one popup: the variant, and what the site is set to
  const PRESETS = {
    both: {}, dir: { mode: "dir" }, font: { mode: "font" }, off: { on: 0 },
    long: { host: LONG }, "long-dir": { host: LONG, mode: "dir" }, "long-off": { host: LONG, on: 0 },
    open: { open: 1 }, "open-dir": { open: 1, mode: "dir" },
    sites: { view: "sites", others: OFF5 }, "sites-first": { view: "sites", others: OFF5.slice(0, 1) }
  };
  const make = (v, preset) => Object.assign({ v, on: 1, mode: "both", open: 0, view: "main", host: HOST, others: OFF3 }, PRESETS[preset] || {});

  const modeOf = s => s.mode;
  const hasFont = s => s.mode !== "dir";
  const hasDir = s => s.mode !== "font";

  function mainView(s) {
    const showParts = s.on && s.v !== "c";
    const stateText = s.on ? "روشن" : "خاموش";
    let state;
    if (s.v === "c" && s.on) {
      state = `<div class="state c"><button class="st" type="button" data-act="open" aria-haspopup="true" aria-expanded="${!!s.open}"><span>${s.mode === "both" ? "روشن" : MODE_NAME[s.mode]}</span>${I.down}</button></div>`;
    } else state = `<div class="state">${stateText}</div>`;

    let parts = "";
    if (showParts && s.v === "a") {
      parts = `<div class="parts a">
        <div class="pt"><span class="k">فونت</span><button class="sw s" type="button" role="switch" aria-checked="${hasFont(s)}" aria-label="فونت در این سایت" data-act="font"><i></i></button></div>
        <div class="pt"><span class="k">جهت متن</span><button class="sw s" type="button" role="switch" aria-checked="${hasDir(s)}" aria-label="جهت متن در این سایت" data-act="dir"><i></i></button></div></div>`;
    }
    if (showParts && s.v === "b") {
      parts = `<div class="parts b"><div class="seg" role="radiogroup" aria-label="در این سایت">
        ${[["both", "فونت و جهت"], ["dir", "فقط جهت"], ["font", "فقط فونت"]].map(([m, t]) => `<button type="button" role="radio" aria-checked="${s.mode === m}" data-act="mode" data-mode="${m}">${t}</button>`).join("")}
        </div></div>`;
    }
    if (s.v === "c" && s.on && s.open) {
      parts = `<div class="opts" role="radiogroup" aria-label="در این سایت">
        ${["both", "dir", "font"].map(m => `<button class="frow" type="button" role="radio" aria-checked="${s.mode === m}" data-act="mode" data-mode="${m}"><span class="l"><span class="nm">${MODE_NAME[m]}</span></span><span class="ck">${s.mode === m ? I.check : ""}</span></button>`).join("")}
        </div>`;
    }
    const n = s.others.length;
    return `<main class="pop" data-view="main">
      <div class="b-site"><div class="who"><div class="host" dir="ltr">${s.host}</div>${state}</div>
        <button class="sw" type="button" role="switch" aria-checked="${!!s.on}" aria-label="${s.host}" data-act="site"><i></i></button></div>
      ${parts}
      <div class="b-rows"><button class="brow" type="button" data-act="fontrow"><span class="k">فونت</span><span class="v">${FONT}</span><span>${I.chev}</span></button>
        ${n ? `<button class="brow" type="button" data-act="sites"><span class="k">سایت‌های خاموش</span><span class="v">${fa(n)}</span><span>${I.chev}</span></button>` : ""}</div></main>`;
  }

  function sitesView(s) {
    return `<div class="pop" data-view="sites"><div class="hd"><button class="ib" type="button" data-act="back" aria-label="برگشت">${I.back}</button><h1 class="tt">سایت‌های خاموش</h1></div>
      <ul class="sites" data-scroll="list">${s.others.map(o => `<li class="srow"><div class="who"><span class="host" dir="ltr">${o.h}</span>${o.part ? `<div class="sub">${PART_OFF[o.part]}</div>` : ""}</div><button class="btn" type="button" data-act="siteon" data-host="${o.h}" aria-label="روشن کن: ${o.h}">روشن کن</button></li>`).join("")}</ul></div>`;
  }

  // the popup's own host-name fit, copied from popup.js
  function fitHost(frame) {
    const host = frame.querySelector(".b-site .host");
    if (!host) return;
    const name = host.textContent;
    for (const [size, line] of [[32, 40], [24, 32], [20, 28]]) {
      host.style.fontSize = size + "px";
      host.style.lineHeight = line + "px";
      if (host.scrollWidth <= host.clientWidth) return;
    }
    host.style.fontSize = "";
    host.style.lineHeight = "";
    host.closest(".b-site").classList.add("long");
    host.innerHTML = name.split(/(?<=[.-])/).map((p, i) => (i ? "<wbr>" : "") + p).join("");
  }

  const insts = [];
  function paint(s) {
    s.frame.innerHTML = s.view === "sites" ? sitesView(s) : mainView(s);
    if (s.view === "main") fitHost(s.frame);
  }
  function add(parent, v, preset) {
    const s = make(v, preset);
    s.frame = document.createElement("div");
    s.frame.className = "frame";
    s.frame.dataset.v = v;
    parent.append(s.frame);
    insts.push(s);
    paint(s);
    return s;
  }

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act]");
    const s = t && insts.find(i => i.frame.contains(t));
    if (!s) return;
    switch (t.dataset.act) {
      case "site": s.on = s.on ? 0 : 1; s.open = 0; break;
      // a switch turned off leaves the other one; turning off the last one is the same as switching the site off
      case "font": case "dir": {
        const f = t.dataset.act === "font" ? !hasFont(s) : hasFont(s);
        const d = t.dataset.act === "dir" ? !hasDir(s) : hasDir(s);
        if (!f && !d) { s.on = 0; s.mode = "both"; } else s.mode = f && d ? "both" : f ? "font" : "dir";
        break;
      }
      case "mode": s.mode = t.dataset.mode; s.open = 0; break;
      case "open": s.open = s.open ? 0 : 1; break;
      case "sites": s.view = "sites"; break;
      case "back": s.view = "main"; break;
      case "siteon":
        s.others = s.others.filter(o => o.h !== t.dataset.host);
        if (!s.others.length) s.view = "main";
        break;
      default: return;
    }
    paint(s);
  });

  const page = document.body.dataset.v;
  const root = document.getElementById("app");
  const CMP = [
    ["a", "A", "دو کلید کوچیک", [["both", "پیش‌فرض: هر دو روشن"], ["dir", "فقط جهت متن"]]],
    ["b", "B", "یه انتخاب سه‌قسمتی", [["both", "پیش‌فرض: هر دو روشن"], ["dir", "فقط جهت متن"]]],
    ["c", "C", "کلمهٔ «روشن» توی نوار بالا", [["both", "پیش‌فرض: هر دو روشن"], ["dir", "فقط جهت متن"]]]
  ];

  function init() {
    root.replaceChildren();
    insts.length = 0;
    let h = location.hash.slice(1);
    const bare = h.startsWith("bare-");
    if (bare) h = h.slice(5);
    document.body.classList.toggle("bare", bare);
    if (page === "cmp") {
      document.body.classList.add("cmp");
      for (const [v, letter, title, pair] of CMP) {
        const row = document.createElement("section");
        row.className = "row";
        row.innerHTML = `<div class="head"><span class="letter">${letter}</span><b>${title}</b></div><div class="pair"></div>`;
        root.append(row);
        for (const [preset, cap] of pair) {
          const col = document.createElement("div");
          col.innerHTML = `<div class="cap">${cap}</div>`;
          row.querySelector(".pair").append(col);
          add(col, v, preset);
        }
      }
    } else {
      add(root, page, PRESETS[h] ? h : "both");
    }
    document.documentElement.dataset.ready = "1";
  }
  window.addEventListener("hashchange", init);
  Promise.all([document.fonts.load('600 32px "Vazirmatn"'), document.fonts.load('400 16px "Vazirmatn"'), document.fonts.load('700 18px "Vazirmatn"')]).catch(() => {}).then(init);
})();
