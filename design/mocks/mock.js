(() => {
  const V = document.body.dataset.v;
  const HOST = 'x.com';
  const BASE_OFF = ['digikala.com', 'docs.google.com', 'web.whatsapp.com'];
  const FONTS = [
    { name: 'وزیرمتن', css: 'Vazirmatn', def: true },
    ...['Arial', 'Calibri', 'Dubai', 'Microsoft Sans Serif', 'Segoe UI', 'Tahoma', 'Times New Roman'].map(n => ({ name: n, css: n }))
  ];
  const SAMPLE = 'نمونهٔ متن فارسی با English و ۱۲۳';
  const POST = [
    'Claude Duet امروز برام باز شد.',
    'الان یه بات Grok هست که بخشی از کارهای سیب‌کده رو می‌کنه. می‌خوام همون رو با Duet تست کنم و اگه دربیاد جابه‌جا شم؛ بقیه‌ی کارهام همین الان روی Claude هست و ترجیح می‌دم همه‌چی یه جا باشه.',
    'نتیجه رو می‌نویسم.'
  ];

  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    chevL: ic('<path d="M15 5l-7 7 7 7"/>'),
    chevDown: ic('<path d="M6 9l6 6 6-6"/>'),
    backR: ic('<path d="M4 12h16M14 6l6 6-6 6"/>'),
    search: ic('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
    check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    close: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    power: ic('<path d="M12 3v8"/><path d="M6.8 6.8a8 8 0 1 0 10.4 0"/>'),
    ban: ic('<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>'),
    back: ic('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    fwd: ic('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    reload: ic('<path d="M19 12a7 7 0 1 1-2.2-5.1"/><path d="M19 4v4h-4"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    puzzle: ic('<path d="M9 4h4v3a2 2 0 1 1 0 4h-0v3h3a2 2 0 1 1 4 0v5H5V4h4z" transform="translate(-1 0)"/>'),
    tabx: ic('<path d="M7 7l10 10M17 7L7 17"/>')
  };
  const CURSOR = '<span class="cursor"><svg viewBox="0 0 20 28"><path d="M3 2v19l5-4.5 3.5 7 3-1.5-3.5-6.8H18z"/></svg></span>';

  const PRESETS = {
    'a-on': {}, 'a-off': { on: 0, toast: 1 }, 'a-menu': { menu: 1 }, 'a-settings': { tab: 'set' },
    'b-on': { pop: 'main' }, 'b-off': { on: 0, pop: 'main' }, 'b-font': { pop: 'font', fake: 'Tahoma' },
    'b-sites': { pop: 'sites' }, 'b-on-first': { pop: 'main', others: [] },
    'c-on': { pop: 'main' }, 'c-off': { on: 0, pop: 'main' }, 'c-font': { pop: 'font', fake: 'Tahoma' }, 'c-sites': { pop: 'sites' }
  };

  const app = document.getElementById('app');
  let S, bare = false;
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function init() {
    let h = location.hash.slice(1);
    bare = h.startsWith('bare-');
    if (bare) h = h.slice(5);
    if (!PRESETS[h] || h[0] !== V) h = V + '-on';
    S = Object.assign({ on: 1, pop: null, menu: 0, toast: 0, tab: null, font: 'Vazirmatn', q: '', fake: null, hover: null, others: BASE_OFF.slice() }, PRESETS[h]);
    S.hover = S.fake;
    render();
  }

  const offList = () => S.others.concat(S.on ? [] : [HOST]).sort();
  const fontStack = css => css === 'Vazirmatn' ? '"Vazirmatn",sans-serif' : `"${css}","Vazirmatn",sans-serif`;

  /* ---------- pieces ---------- */
  function fontRows() {
    const q = S.q.trim().toLowerCase();
    const rows = FONTS.filter(f => !q || (f.name + ' ' + f.css).toLowerCase().includes(q));
    if (!rows.length) return '<li class="none">فونتی پیدا نشد</li>';
    return rows.map(f => {
      const chosen = f.css === S.font, pointed = S.hover === f.css;
      return `<li><button class="frow${chosen ? ' chosen' : ''}${pointed ? ' pointed' : ''}" data-act="pick" data-font="${f.css}" aria-pressed="${chosen}">
        <span class="l"><span class="nm" style="font-family:${fontStack(f.css)}">${f.name}</span>${f.def ? '<span class="tag">پیش‌فرض</span>' : ''}</span>
        <span class="ck">${chosen ? I.check : ''}</span></button>${pointed && S.fake && !bare ? CURSOR : ''}</li>`;
    }).join('');
  }
  const searchBox = () => `<label class="search">${I.search}<input class="q" type="text" dir="rtl" placeholder="جست‌وجوی فونت" aria-label="جست‌وجوی فونت" value="${esc(S.q)}"></label>`;
  const sitesRows = cls => offList().map(h => `<li class="srow"><span class="host" dir="ltr">${h}</span><button class="btn" data-act="siteon" data-host="${h}" aria-label="روشن کن: ${h}">روشن کن</button></li>`).join('');

  /* ---------- A ---------- */
  const toast = () => `<div class="toast" role="status"><span class="tx">روی <bdi dir="ltr">${HOST}</bdi> خاموش شد</span><button data-act="undo">برگردون</button></div>`;
  const menu = () => `<div class="menu" role="menu">
    <button class="mi ours" role="menuitem" data-act="open-settings">فونت و سایت‌ها…</button><hr>
    <button class="mi" role="menuitem">Pin</button><button class="mi" role="menuitem">Manage extension</button><button class="mi" role="menuitem">Remove from Chrome…</button></div>`;

  function settings() {
    const list = offList();
    return `<main class="set${list.length ? ' two' : ''}" dir="rtl">
      <section class="card"><h2>فونت</h2>
        <div class="sample" style="font-family:${fontStack(S.font)}">${SAMPLE}</div>
        ${searchBox()}
        <ul class="flist" data-scroll="list">${fontRows()}</ul></section>
      ${list.length ? `<section class="card"><h2>سایت‌های خاموش <span class="n">${fa(list.length)}</span></h2><ul class="sites" data-scroll="list">${sitesRows()}</ul></section>` : ''}
    </main>`;
  }

  /* ---------- B ---------- */
  function popB() {
    const n = offList().length;
    if (S.pop === 'font') return `<div class="pop b tall" role="dialog" aria-label="فونت"><div class="hd"><button class="ib" data-act="back" aria-label="برگشت">${I.backR}</button><span class="tt">فونت</span></div>${searchBox()}<ul class="flist" data-scroll="list">${fontRows()}</ul></div>`;
    if (S.pop === 'sites') return `<div class="pop b" role="dialog" aria-label="سایت‌های خاموش"><div class="hd"><button class="ib" data-act="back" aria-label="برگشت">${I.backR}</button><span class="tt">سایت‌های خاموش</span></div><ul>${sitesRows()}</ul></div>`;
    const fontName = FONTS.find(f => f.css === S.font).name;
    return `<div class="pop b" role="dialog" aria-label="Persian Typography">
      <div class="b-site"><div class="who"><div class="host">${HOST}</div><div class="state">${S.on ? 'روشن' : 'خاموش'}</div></div>
        <button class="sw${S.on ? ' on' : ''}" role="switch" aria-checked="${!!S.on}" aria-label="${HOST}" data-act="toggle"><i></i></button></div>
      <div class="b-rows">
        <button class="brow" data-act="font"><span class="k">فونت</span><span class="v">${fontName}</span>${I.chevL}</button>
        ${n ? `<button class="brow" data-act="sites"><span class="k">سایت‌های خاموش</span><span class="v">${fa(n)}</span>${I.chevL}</button>` : ''}
      </div></div>`;
  }

  /* ---------- C ---------- */
  function popC() {
    const n = offList().length;
    const fontName = FONTS.find(f => f.css === S.font).name;
    let sheet = '';
    if (S.pop === 'font') sheet = `<div class="scrim" data-act="back"></div><div class="sheet" role="dialog" aria-label="فونت"><div class="hd"><span class="tt">فونت</span><button class="ib" data-act="back" aria-label="بستن">${I.close}</button></div>${searchBox()}<ul class="flist" data-scroll="list">${fontRows()}</ul></div>`;
    if (S.pop === 'sites') sheet = `<div class="scrim" data-act="back"></div><div class="sheet" role="dialog" aria-label="سایت‌های خاموش"><div class="hd"><span class="tt">سایت‌های خاموش</span><button class="ib" data-act="back" aria-label="بستن">${I.close}</button></div><ul>${sitesRows()}</ul></div>`;
    return `<div class="pop c" role="dialog" aria-label="Persian Typography">
      <div class="c-main"><button class="pw${S.on ? '' : ' off'}" role="switch" aria-checked="${!!S.on}" aria-label="${HOST}" data-act="toggle">${I.power}</button>
        <div class="host">${HOST}</div><div class="state">${S.on ? 'روشن' : 'خاموش'}</div></div>
      <div class="c-bar"><button class="chip" data-act="font" aria-label="فونت: ${fontName}"><span>${fontName}</span>${I.chevDown}</button>
        ${n ? `<button class="ib" data-act="sites" aria-label="سایت‌های خاموش: ${fa(n)}">${I.ban}<span class="badge">${fa(n)}</span></button>` : ''}</div>
      ${sheet}</div>`;
  }

  /* ---------- scene ---------- */
  const extBtn = dis => `<button class="ext ${S.on ? 'on' : 'off'}${dis ? ' dis' : ''}${S.pop || S.menu ? ' open' : ''}" data-act="${dis ? '' : 'icon'}" aria-label="Persian Typography"><span class="mark">ف</span></button>`;
  const surface = () => {
    if (V === 'a') return S.menu ? menu() : S.toast ? toast() : '';
    return S.pop ? (V === 'b' ? popB() : popC()) : '';
  };
  function xcom() {
    const dir = S.on ? 'rtl' : 'ltr';
    const sk = '<div class="sk"><span class="av"></span><div class="bars"><i class="n"></i><i class="w"></i><i class="m"></i></div></div>';
    return `<div class="x"><nav class="rail">${'<i></i>'.repeat(6)}</nav>
      <main class="col"><article class="post"><span class="av"></span><div class="pb" id="pb"><div class="meta"><b>پارسا</b><span>@parsa · 1h</span></div>
        ${POST.map(t => `<p dir="${dir}">${t}</p>`).join('')}</div></article>${sk}${sk}</main>
      <aside class="side"><i class="s"></i><i class="b"></i><i class="c"></i></aside></div>`;
  }
  function scene() {
    const set = S.tab === 'set';
    return `<div class="win${S.on ? '' : ' is-off'}">
      <div class="tabs"><button class="tab${set ? '' : ' active'}" data-act="tab-x"><span class="fav">X</span><span class="t">Home / X</span><span class="cl">${I.tabx}</span></button>
        ${set ? `<div class="tab active"><span class="fav">ف</span><span class="t" dir="auto">فونت و سایت‌ها</span><span class="cl">${I.tabx}</span></div>` : ''}</div>
      <div class="toolbar"><span class="nb">${I.back}</span><span class="nb">${I.fwd}</span><span class="nb">${I.reload}</span>
        <div class="pill">${I.lock}<span>${set ? 'chrome-extension://persian-typography/settings' : `<b>${HOST}</b>/home`}</span></div>
        ${extBtn(set)}<span class="nb">${I.puzzle}</span><span class="prof"></span></div>
      <div class="vp">${set ? settings() : xcom()}</div>
      ${set ? '' : `<div class="anchor">${surface()}</div>`}
    </div>`;
  }
  function bareView() {
    if (S.tab === 'set') return `<div class="bare-page">${settings()}</div>`;
    const s = surface();
    document.body.classList.toggle('s-toast', V === 'a' && !S.menu && !!S.toast);
    document.body.classList.toggle('s-icon', !s);
    return `<div class="bare-wrap${s ? '' : ' icon'}">${s || extBtn(false)}</div>`;
  }

  function render() {
    document.body.classList.toggle('bare', bare);
    app.innerHTML = bare ? bareView() : scene();
    const bw = document.querySelector('.bare-wrap > *'); if (bw) { const b = bw.getBoundingClientRect(); document.documentElement.dataset.size = Math.ceil(b.width) + 'x' + Math.ceil(b.height); }
    paintPost();
    document.querySelectorAll('.flist').forEach(l => {
      const r = (l.querySelector('.pointed') || {}).parentElement; if (!r) return;
      const over = r.offsetTop + r.offsetHeight + 8 - l.clientHeight;
      if (over > 0) l.scrollTop = over;
    });
  }
  function paintPost() {
    const pb = document.getElementById('pb');
    if (!pb || !S.on) return;
    const f = S.hover || S.font;
    pb.style.setProperty('--pf', fontStack(f));
  }

  /* ---------- behaviour ---------- */
  function act(a, d) {
    switch (a) {
      case 'icon':
        if (V === 'a') { S.on = S.on ? 0 : 1; S.toast = S.on ? 0 : 1; S.menu = 0; }
        else { S.pop = S.pop ? null : 'main'; }
        break;
      case 'toggle': S.on = S.on ? 0 : 1; if (S.pop === 'sites' && !offList().length) S.pop = 'main'; break;
      case 'undo': S.on = 1; S.toast = 0; break;
      case 'font': S.pop = 'font'; S.q = ''; break;
      case 'sites': S.pop = 'sites'; break;
      case 'back': S.pop = 'main'; break;
      case 'pick': S.font = d.font; break;
      case 'siteon':
        if (d.host === HOST) S.on = 1; else S.others = S.others.filter(h => h !== d.host);
        if (!offList().length && S.pop === 'sites') S.pop = 'main';
        break;
      case 'open-settings': S.menu = 0; S.tab = 'set'; S.q = ''; break;
      case 'tab-x': S.tab = null; break;
      default: return;
    }
    render();
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (t) return act(t.dataset.act, t.dataset);
    if (!bare && !e.target.closest('.pop,.menu,.toast') && (S.pop || S.menu)) { S.pop = null; S.menu = 0; render(); }
  });
  document.addEventListener('contextmenu', e => {
    if (V === 'a' && e.target.closest('.ext:not(.dis)')) { e.preventDefault(); S.menu = 1; S.toast = 0; render(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && (S.pop || S.menu)) { S.pop = null; S.menu = 0; render(); } });
  document.addEventListener('input', e => {
    if (!e.target.classList.contains('q')) return;
    S.q = e.target.value;
    document.querySelectorAll('.flist').forEach(l => { if (l.querySelector('.frow, .none')) l.innerHTML = fontRows(); });
  });
  document.addEventListener('mouseover', e => {
    const r = e.target.closest('.pop .frow');
    if (!r || S.hover === r.dataset.font && !S.fake) return;
    S.fake = null; document.querySelectorAll('.cursor,.pointed').forEach(x => x.classList.contains('cursor') ? x.remove() : x.classList.remove('pointed'));
    S.hover = r.dataset.font; paintPost();
  });
  document.addEventListener('mouseout', e => {
    const l = e.target.closest('.pop .flist');
    if (l && !l.contains(e.relatedTarget) && S.hover) { S.hover = null; paintPost(); }
  });
  window.addEventListener('hashchange', init);
  init();
})();
