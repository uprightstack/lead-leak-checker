# Site Leak Score

A free Chrome extension that checks a service business website for lead leaks. Open any site, click the icon, and get a score out of 100 with a short list of what is working and what is not.

Built by [Upright Stack](https://uprightstack.com), a CRM automation agency for local service businesses.

## What it checks

The popup lists the problems first, with a count (for example "6 of 8 checks need attention"), and tucks what is fine under "Looking good". Each check says why it matters, in plain English. You can copy the results to share them with a colleague, a client or the business owner.

| Check | Weight | What counts as a pass |
| --- | --- | --- |
| Contact form | 15 | A contact form is on the page |
| Short form | 10 | Five fields or fewer (half credit up to eight) |
| Tap-to-call number | 15 | A phone number you can tap on mobile (half credit if it is plain text) |
| Chat or text option | 15 | A chat widget or a text-us link |
| Online booking | 15 | A booking tool such as Calendly, Acuity or Cal.com |
| Clear next step up top | 10 | A call to action in the first screen |
| Lead tool connected | 10 | A CRM or form tool behind the page (half credit if none is detected) |
| Loads fast | 10 | Main content in 2.5 seconds or less (half credit up to 4 seconds) |

The score is the points earned out of the points possible. Checks that cannot be measured on a page are left out instead of counted as a fail. 80 or more reads "Few leaks found", 55 or more "Some leaks found", and anything lower "Leads could be slipping away".

## Private by design

- It runs entirely in your browser, and only when you click the icon.
- It does not send the page, the address or your results anywhere.
- No account, no tracking, no data stored.
- Permissions: `activeTab` and `scripting`, nothing else. No remote code is loaded.

## Install

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/site-leak-score-by-uprigh/dlmckldjbdjofmodmokojnchnaimnkcc).** Or, to load the source yourself:

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Open any website and click the Site Leak Score icon.

## How it works

- `scan.js` runs inside the page you are checking. It only reads the page: forms, phone links, chat and booking tools, the first screen and load timing.
- `score.js` turns that scan into checks and a score. It is plain functions with no DOM access, so it is easy to test.
- `popup.html`, `popup.css` and `popup.js` show the result.
- `test/fixtures/` has two sample pages, one strong and one weak, for trying it out. Serve them with `python3 -m http.server` and open them in Chrome.

## Limits

This is a quick read of what a page shows. It cannot see phone systems, inboxes, or how fast a business follows up after a lead comes in. Those are where most leads actually leak, and they take a person looking at the whole path.

## Want the full picture?

Upright Stack offers a free Lead Leak Audit: a 30 minute call, then a written Leak Map within 48 hours showing where your leads slip away and what it costs you. [uprightstack.com/audit](https://uprightstack.com/audit)

## Contributing

Issues and pull requests are welcome. If a chat, booking or form tool is not detected, open an issue with the site address or the script name and we will add it.

## Licence

MIT, see [LICENSE](LICENSE). The Geist font in `fonts/` is under the SIL Open Font License, see [fonts/GEIST-LICENSE.txt](fonts/GEIST-LICENSE.txt).
