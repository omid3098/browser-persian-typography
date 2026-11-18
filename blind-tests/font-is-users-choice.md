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
