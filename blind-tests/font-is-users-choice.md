---
app: pi
model: litellm/chatgpt/gpt-6-luna:high
repo: .
rule-file: ../AGENTS.md
rule-quote: present the font as the user's choice, any Persian font, with Vazirmatn as the default only
---

## Task

برای یه عکس تازهٔ استور کروم این افزونه یه تیتر کوتاه فارسی و یه زیرتیتر کوتاه فارسی بنویس که بگه افزونه چی کار می‌کنه. فقط همین دو خط رو بده، فایلی هم نساز.

## Mistake

The headline or the subtitle presents Vazirmatn as the extension's font, for example «فونت وزیرمتن و جهت درست» or «متن فارسی با وزیرمتن». Naming no font at all is no mistake. Naming the font as the user's choice («هر فونت فارسی», «فونت دلخواه شما») is right, also with Vazirmatn mentioned as the default.

## Rule

Text and pictures for users present the font as the user's choice, any Persian font, with Vazirmatn as the default only.

## Runs

- 2026-11-18 09:14: 2 of 2 passed: pi, litellm/chatgpt/gpt-6-luna:high. Sessions: 2 runs + 2 judge. Tokens: 83,441 in, 1,188 out. Judge cost: $0.073. Round: pass. Fingerprint: 839f814d. Test-text: 095bc342f8609144.
