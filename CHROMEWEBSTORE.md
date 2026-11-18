# Chrome Web Store Listing — Persian Typography

> Last Updated: 2026-11-18

Everything the Chrome Developer Dashboard asks for, in one place. It follows Chrome's `chrome-extensions` skill. The upload package is built from `dist/` by `scripts/build.cjs`, which copies only the files the extension needs, so this file, the README and `store-assets/` never enter the ZIP.

## Store Listing

**Extension Name**

Persian Typography

**Short Description**

Comes from `description` in `manifest.json` (131 of 132 characters):

Any Persian font you choose (Vazirmatn by default), with the right direction for each text block, on any site. One switch per site.

**Detailed Description**

Paste the text between the two lines below into the dashboard's Description field. The store shows it as plain text.

---

نمایش درست متن فارسی در همهٔ سایت‌ها

این افزونه متن فارسی هر صفحه را با هر فونت فارسی که بخواهید نشان می‌دهد (پیش‌فرض وزیرمتن است) و برای هر بلوک متن جهت درست را می‌گذارد. سایت لازم نیست از فارسی پشتیبانی کند.

چه کار می‌کند
• فونتی که انتخاب کرده‌اید (پیش‌فرض وزیرمتن) روی حرف‌ها و رقم‌های فارسی می‌نشیند. کد و متن‌هایی که شکل کد دارند دست نمی‌خورند. حرف‌های لاتین، عددهای لاتین، آیکن‌ها و ایموجی همان فونت خود سایت را نگه می‌دارند.
• هر بلوک متن جهت خودش را می‌گیرد. بلوک متن با حرف فارسی از راست به چپ می‌شود، حتی اگر با واژهٔ انگلیسی شروع شود؛ نشانی وب، مسیر فایل، ایمیل و شناسه‌های فنی در این تصمیم کنار گذاشته می‌شوند. چیدمان صفحه، تیتر وسط‌چین و کد همان‌طور می‌مانند.
• متنی که بعداً می‌رسد هم درست می‌شود، مثل پاسخی که کم‌کم نوشته می‌شود. فهرست، جدول، کادر نوشتن و فریم هم پوشش داده می‌شوند. ویرایشگرهای متن جهت را از کل متنشان می‌گیرند؛ کادرهای سادهٔ نوشتن، اگر سایت جهتی برایشان نگذاشته باشد، جهت خودکار مرورگر را می‌گیرند.

برای هر سایت جدا
روی آیکن افزونه کلیک کنید. کلید بالای پنجره، سایت فعلی را روشن یا خاموش می‌کند. تا وقتی سایت روشن است، یک ردیف سه‌تایی می‌گوید افزونه در آن سایت چه کند:
• «فونت و جهت»: هر دو (حالت پیش‌فرض)
• «فقط جهت»: سایت فونت خودش را نگه می‌دارد
• «فقط فونت»: سایت جهت خودش را نگه می‌دارد
تغییر همان لحظه، بدون بارگذاری دوبارهٔ صفحه، در همهٔ تب‌های آن سایت اعمال می‌شود. وقتی بخشی را خاموش می‌کنید، هرچه آن بخش به صفحه اضافه کرده بود برداشته می‌شود. آیکن وقتی سایت خاموش باشد خاکستری است. سایت‌های دیگر که بخشی از آن‌ها خاموش است در بخش «سایت‌های خاموش» دیده می‌شوند و از همان‌جا دوباره روشن می‌شوند. www.example.com و example.com یک سایت حساب می‌شوند، ولی زیردامنه‌های دیگر، مثل mail.example.com، تنظیم جدا دارند.

فونت دیگر
در پنجره روی ردیف فونت بزنید. فهرست شامل وزیرمتن و فونت‌های نصب‌شده روی سیستم شماست که فارسی را کامل نمایش می‌دهند. با رفتن روی هر فونت، نمونه‌اش روی صفحهٔ باز دیده می‌شود. با کلیک روی آن، ذخیره می‌شود.

حریم خصوصی
• به هیچ سرور وصل نمی‌شود و چیزی نمی‌فرستد. کد از راه دور نمی‌گیرد. فونت پیش‌فرض همراه خود افزونه است.
• کلمه‌های صفحه را عوض نمی‌کند. فقط فونت و جهت (و تنظیم چند ویژگی ظاهری مثل تراز متن) را عوض می‌کند.
• برای تصمیم دربارهٔ جهت، متن صفحه و متنی را که در کادرها می‌نویسید روی همین رایانه می‌خواند. آن را ذخیره نمی‌کند و جایی نمی‌فرستد.
• فقط این‌ها را روی همین رایانه نگه می‌دارد: نام سایت‌هایی که تنظیمشان را عوض کرده‌اید، فونتی که انتخاب کرده‌اید، و فهرست فونت‌های نصب‌شده‌ای که فارسی را درست نشان می‌دهند، همراه با نشانه‌ای کوتاه از فهرست فونت‌ها تا نصب فونت تازه را بفهمد.

اجازه‌ها
کروم هنگام نصب می‌گوید افزونه داده‌های همهٔ سایت‌ها را می‌خواند و تغییر می‌دهد. این اجازه لازم است چون متن فارسی ممکن است در هر سایتی باشد و فونت و جهتش باید همان‌جا درست شود. افزونه فقط ظاهر متن را عوض می‌کند و چیزی از صفحه جایی نمی‌فرستد.

محدودیت‌ها
• صفحه‌های داخلی مرورگر و فروشگاه افزونه‌ها اجازهٔ اجرای افزونه نمی‌دهند.
• بعضی سایت‌ها بخش‌هایی از صفحه را طوری می‌سازند که افزونه‌ها به آن دسترسی ندارند؛ متن فارسی آن بخش‌ها ممکن است همان‌طور بماند.
• پس از کنار گذاشتن متن‌های فنی، یک حرف فارسی کافی است تا بلوک متن راست‌به‌چپ شود. خطی که فقط نشانی وب و اجزای مسیر آن با جداکنندهٔ › است تغییر جهت نمی‌دهد. برچسب انگلیسی که یک عبارت فارسی دارد هم کامل راست‌به‌چپ می‌شود.
• عرض حرف‌های فونت انتخابی با فونت سایت فرق دارد و ممکن است جای شکستن خط‌ها عوض شود.
• نسخهٔ فعلی برای مرورگرهای مبتنی بر کرومیوم است، نه فایرفاکس و موبایل.

پشتیبانی
مشکلی دیدید یا پیشنهادی دارید؟ در https://github.com/omid3098/browser-persian-typography/issues بنویسید.

نسخهٔ 0.1.2: پنجرهٔ افزونه بعد از باز شدن کروم بی‌معطلی باز می‌شود.

ایموجی‌های عکس‌های این صفحه از Twemoji است، اثر Twitter, Inc و دیگر مشارکت‌کنندگان، با مجوز CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)؛ اندازه‌شان تغییر کرده است.

────────────────────────────

Persian text that reads right on every site

This extension shows Persian text on any page in any Persian font you choose (Vazirmatn by default) and gives each block of text the right direction. The site does not need to support Persian.

What it does
• The chosen font (Vazirmatn by default) is used for Persian letters and digits. Code and code-style text are left alone. Latin letters, Latin digits, icons and emoji keep the site's own fonts.
• Each text block gets its own direction. A text block containing Persian letters reads right to left, even if it starts with an English word; web addresses, file paths, email addresses and technical IDs are left out of this decision. Page layout, centred headings and code keep their order.
• Text that arrives later is handled too, such as an answer that is written bit by bit. Lists, tables, text boxes and frames are covered. Text editors take their direction from all their text; simple text boxes use the browser's automatic direction when the site set none.

One setting for each site
Click the extension's icon. The switch at the top turns the current site on or off. While the site is on, a row of three choices sets what the extension does there:
• "فونت و جهت" (font and direction): both. This is the default.
• "فقط جهت" (direction only): the site keeps its own font.
• "فقط فونت" (font only): the site keeps its own direction.
A change reaches every open tab of that site at once, with no page reload. When you switch a part off, everything that part added to the page is taken back. The icon is grey when the site is off. Other sites with something switched off appear in a list ("سایت‌های خاموش") where you can turn them on again. www.example.com and example.com count as one site; other subdomains, such as mail.example.com, have their own setting.

Another font
Open the popup and click the font row. The list has Vazirmatn and the fonts installed on your computer that can draw Persian. Point at a font to see it on the open page. Click it to save it.

Privacy
• It does not connect to any server and sends nothing. It loads no code from the internet. The default font ships inside the extension.
• It does not rewrite the words on a page. It changes the font and the direction, and sets a few display properties such as text alignment.
• To decide a direction, it reads the text of the page, and the text you type into boxes, on this computer. It does not save that text or send it anywhere.
• It keeps only these on this computer: the names of the sites whose settings you changed, the font you chose, and a list of installed fonts that draw Persian correctly, with a short mark of the font list so it notices when you install a new font.

Permissions
Chrome says at install that the extension can read and change data on all sites. It needs this because Persian text can appear on any site, and its font and direction have to be set there. The extension changes only how text looks and sends nothing from the page anywhere.

Known limits
• Browser internal pages and the extension store do not allow extensions to run.
• Some sites build parts of a page in a way extensions cannot reach; Persian text there may stay as it was.
• After technical text is left out, one Persian letter is enough to make a text block right to left. A line containing only a web address and breadcrumb pieces separated by › keeps its direction. An English label that holds a Persian phrase turns right to left as a whole.
• The chosen font's letters have other widths than the site's font, so a line may break in another place.
• This version is for Chromium-based browsers. Firefox and mobile browsers are not supported.

Support
Found a bug or have an idea? Write it at https://github.com/omid3098/browser-persian-typography/issues.

Version 0.1.2: the popup opens without a wait after Chrome starts.

Emoji in the screenshots: Twemoji graphics, © Twitter, Inc and other contributors, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), resized.

---

**Category**

Tools

**Single Purpose**

Shows Persian text on web pages in a Persian font the user picks (Vazirmatn by default) and with the right direction for each block of text, without changing the words.

**Primary Language**

Persian (فارسی)

**Mature content**

No

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `store-assets/store-icon-128.png` |
| Screenshot 1 | 1280×800 | ✅ Ready | `store-assets/screenshot-1.png` |
| Screenshot 2 | 1280×800 | ✅ Ready | `store-assets/screenshot-2.png` |
| Screenshot 3 | 1280×800 | ✅ Ready | `store-assets/screenshot-3.png` |
| Screenshot 4 | 1280×800 | ✅ Ready | `store-assets/screenshot-4.png` |
| Screenshot 5 | 1280×800 | ✅ Ready | `store-assets/screenshot-5.png` |
| Small Promo Tile | 440×280 | ✅ Ready | `store-assets/small-promo-tile.png` |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes

All five come from real captures of the extension at work, unchanged; Omid picked them on 2026-11-18. Upload them in this order.

1. Headline «مرورگر شما حالا فارسی بلد است»: an X feed, a chat and search results, set right.
2. «فارسی در هر سایت، همان‌طور که باید»: one post with three labels: any Persian font, right-to-left start, English and emoji in place.
3. «فارسی از راست، در همهٔ سایت‌ها»: one line each from X, X messages, DuckDuckGo and Wikipedia.
4. «یک کلید؛ فارسی درست در همهٔ سایت‌ها.»: the popup beside an X feed.
5. «فارسی، هر جا که می‌خونی»: slices of three sites.

Text in pictures and listing presents the font as the user's choice, any Persian font, with Vazirmatn as the default only (`AGENTS.md`).

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | Saves settings on this computer only: the host names and on/off settings of sites where the user switched off one or both parts, the chosen font, and a cache of installed fonts that pass the Persian check, with a signature of the installed font list to notice changes. Host names drop a leading www.; other subdomains are separate sites. No page text, full URLs or visit log is stored. Nothing is written to synced storage or transmitted. |
| fontSettings | permissions | Lists the fonts installed on the computer so the user can choose one. The list is checked on this computer for Persian support, and the popup offers the fonts that pass instead of the bundled Vazirmatn. The list and its cache stay on this computer and are never transmitted. |
| offscreen | permissions | Runs the installed-font check from the background, which cannot start workers itself. On install and update, and at browser startup when the installed font list changed, it opens the extension's own font-check page, checks which fonts draw Persian, caches the result locally and closes the page. That page handles only font-check messages; it does not read web pages or contact a server. |
| `<all_urls>` | host_permissions | Persian text can appear on any site. The packaged content scripts run on every page and its frames as the page loads, read page text and supported editable text on this computer, and set font and direction. The tab address gives the host name for per-site settings and the toolbar icon. No page text or full URL is stored or transmitted. activeTab would need a click on each tab and could not cover pages as they load. Browser-restricted pages stay outside this access. |

### Remote code

No, I am not using remote code.

All executable files ship in the extension package, including the page-world shadow-root hook and the font-check workers. The bundled Vazirmatn font also ships in the package. The content script's fetch reads only that packaged font through chrome.runtime.getURL; the workers load that same local font. There are no remote scripts, remote imports, eval, new Function or importScripts calls.

## Privacy & Data Use

### Data Collection

The dashboard keeps the answer Omid gave for version 0.1.0; version 0.1.2 changes nothing about data, so it needs no new answer. These are the facts behind either reading of the form:

| | (a) Tick "Website content" and "Web history" | (b) Tick nothing |
| --- | --- | --- |
| Reading | Treat local reading and storage as data handling that must be declared. | Treat "collected" as data gathered for transmission to the developer or another party. |
| Facts supporting it | The engine reads page text, supported input values and content-editable text in memory. The extension reads tab URLs and stores the host names of sites with a non-default setting. | The extension has no server connection, telemetry or analytics. It transmits nothing, persists no page text or full URLs, and stores settings only in local extension storage. |
| Facts against it or limiting it | There is no transmitted website content and no browsing-history log: stored site exceptions have host names and settings, without paths, visit times or visit counts. | Local processing still occurs and host names are persisted. Google's FAQ says local-only processing or storage must be disclosed; no transmission alone does not remove that obligation. |

Page text and editable text can include personal communications or sensitive information displayed by a site. The engine does not classify or extract those topics, but it can read that text for presentation. Password-field values are excluded. It listens for input events to refresh presentation; it does not record keystrokes, clicks or mouse movements as an activity log.

Policy reference: [Chrome Web Store user-data FAQ, questions 2–4](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**

https://github.com/omid3098/browser-persian-typography/blob/main/PRIVACY.md

## Distribution

**Visibility**: Unlisted (only people with the link find it)
**Regions**: All regions

## Developer Info

**Publisher Name** and **Contact Email**: set in the dashboard's account page; not kept in this public file.

**Support URL**: https://github.com/omid3098/browser-persian-typography/issues

**Homepage URL**: https://github.com/omid3098/browser-persian-typography

**Official URL**: none. The field is optional and accepts only a site verified in Google Search Console; a github.com address cannot be verified.

**Store page**: https://chromewebstore.google.com/detail/persian-typography/ogoojppfonfekmklomnfklllehjnlfcf (item ID `ogoojppfonfekmklomnfklllehjnlfcf`)

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.2 | 2026-11-18 | The popup opens without a wait after Chrome starts. Store texts call the font the user's choice. New screenshots and promo tile. | Draft |
| 0.1.1 | 2026-11-18 | Startup fix: the popup no longer waits seconds after Chrome starts. 0.1.2 carries it too. | Upload not confirmed |
| 0.1.0 | 2026-11-10 | First version. | Published (unlisted) |

## Review Notes

### Known Issues / Limitations

The listing's "محدودیت‌ها" and "Known limits" sections cover them.

### Rejection History

None.
