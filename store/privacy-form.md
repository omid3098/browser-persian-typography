# Chrome Web Store privacy form

## Single purpose description

Persian Typography has one purpose: to improve the presentation of Persian text on web pages. It draws Persian text in the bundled Vazirmatn font, or a Persian-capable font the user picks from their system, and adjusts text-block direction using local text rules. The user can turn this on or off for each site, or keep only the font or only the direction there. The extension does not change the words on a page and has no other function.

## Permission justification: storage

Saves settings in chrome.storage.local on this computer: host names and on/off settings for sites where the user disabled one or both parts, the chosen font, and a cache of font families that pass the Persian check. The cache includes a signature of the installed font-family list to detect changes. Host names omit a leading www.; other subdomains are separate sites. No page text, full URLs or visit log is stored. Nothing is written to chrome.storage.sync or transmitted.

## Permission justification: fontSettings

Uses chrome.fontSettings.getFontList() to list installed fonts. It calls this during background font preparation and when preparing the popup's font picker. A local font check filters the list for Persian support. The popup lets the user choose one of those fonts instead of bundled Vazirmatn. The list and cache stay on this computer and are never transmitted.

## Permission justification: offscreen

Uses the WORKERS reason to host the installed-font check when running from the background service worker, which cannot start Web Workers itself. On install, update and browser startup, it opens popup/font-check.html, checks font support with workers and OffscreenCanvas, and caches the result locally. The offscreen document stays open afterwards, so later checks need no new document and the popup opens without a delay. The document handles only font-check messages; it does not read web-page content or contact a server. The popup can run the check itself if the cache is not ready or the installed font list changed.

## Host permission justification: <all_urls>

Persian text can appear on any site. Packaged content scripts run automatically on permitted pages and their frames at document_start, including matching about:blank frames. They read page text and supported editable text locally to apply font and direction rules. Tab addresses are read to derive host names for per-site settings and toolbar icons; frames follow the top-level tab's site. No page text or full URL is stored or transmitted. The activeTab permission alone would require a user gesture to grant temporary access to a tab; it would not provide automatic coverage across sites and tabs. Browser-restricted pages remain outside this access.

## Remote code

No, I am not using remote code.

All executable files ship in the extension package, including the page-world shadow-root hook and the font-check workers. The bundled Vazirmatn font also ships in the package. The content script's fetch reads only that packaged font through chrome.runtime.getURL; the workers load that same local font. There are no remote scripts, remote imports, eval, new Function or importScripts calls.

## Data-use declaration — owner's choice; unresolved

Choose one interpretation before submitting. This file does not select either answer.

| | (a) Tick "Website content" and "Web history" | (b) Tick nothing |
| --- | --- | --- |
| Reading | Treat local reading and storage as data handling that must be declared. | Treat "collected" as data gathered for transmission to the developer or another party. |
| Facts supporting it | The engine reads page text, supported input values and content-editable text in memory. The extension reads tab URLs and stores the host names of sites with a non-default setting. | The extension has no server connection, telemetry or analytics. It transmits nothing, persists no page text or full URLs, and stores settings only in chrome.storage.local. |
| Facts against it or limiting it | There is no transmitted website content and no browsing-history log: stored site exceptions have host names and settings, without paths, visit times or visit counts. The two categories may also not describe every kind of text incidentally encountered on a page. | Local processing still occurs and host names are persisted. Google's FAQ says local-only processing or storage must be disclosed; no transmission alone does not remove that obligation. |

Page text and editable text can include personal communications or sensitive information displayed by a site. The engine does not classify or extract those topics, but it can read that text for presentation. Password-field values are excluded. It listens for input events to refresh presentation; it does not record keystrokes, clicks or mouse movements as an activity log. Neither reading should be taken as a claim that those kinds of text can never be encountered. The owner must check the form's current wording when making this one declaration choice.

Policy reference: [Chrome Web Store user-data FAQ, questions 2–4](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq). It explicitly includes local processing and storage in disclosure requirements. That is a concern for interpretation (b); it does not change the facts about transmission.

## Data-use certifications

Select all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

The extension transmits no user data and uses local data only for its font, direction and per-site presentation controls. It has no advertising or lending function.

## Privacy policy URL

https://github.com/omid3098/browser-persian-typography/blob/main/PRIVACY.md
