# Tests (not published)

Everything in `tests/` is excluded from the live site by forced 404 rules in
`netlify.toml` (as are `tools/` and `.github/`). The publish directory is still the repo root.

```
cd tests && npm ci          # once
tests/run                   # jsdom suites against the repo root
tests/run --browser         # + strict axe/tap-target/h-scroll/screenshots/Lighthouse
tests/run --browser --ci    # the PR gates only (same as .github/workflows/checks.yml)
SITE=/other/checkout tests/run
node tests/lib/browser-checks.js --ci --url=https://<preview>.netlify.app   # against a deployed preview
```

Page copy for search (titles, descriptions, "How it's calculated", FAQ, JSON-LD) is generated:
edit `tools/og-images/pages.json` or `tools/seo/content.js`, then run `node tools/seo/build.js`
(seo-meta fails if you forget).

Suites (`tests/suites/*.js`, each skips itself when not applicable):

| suite | checks |
|---|---|
| skins-regression | standard example Alex 0, Blake 4, Casey 8, Drew 12, $5: -75/-75/-35/+185 (legacy or v2 Skins) |
| p1-parity | calculator behaviour identical to the live source (`tests/baseline` = main @ c54e467) |
| p1-trust | /privacy wording + contact, footer link, favicon, sitemap, robots, GA tag |
| ga-gate | GA4 loads only on golfcalculators.com / www (skips on branches without the gate); on pages with `gaStrip`, a `#r=` share fragment never reaches GA (page_location is origin+path on load and on hashchange) |
| og-tags | every page's static OG/Twitter tags, og:url = canonical, each og:image 200 image/png 1200×630 ≤ 300 KB (local server, or `OG_BASE=<url>`) |
| skins-v2 | Skins rebuild: engine cross-check vs legacy, flow, escaping, share, storage, SI dupes (skips on legacy Skins) |
| skins-share-pin | Skins share text for the standard example pinned to `skins-share-link-12nov.json` (moved on purpose twice: ASCII/GSM-7, then the result link as the last line "Settled at <link>", no separate url); the link reopens −75/−75/−35/+185; GSM-7 for 60 varied rounds; the per-player balance line only for 2–5 players |
| seo-meta | P3 search: titles ≤ 60 / descriptions ≤ 155, unique, primary query kept; og: and twitter: title/description = title/description; canonical; one JSON-LD @graph (WebApplication, FAQPage = visible FAQ, BreadcrumbList), no ratings/reviews; 5–8 FAQs ≤ 60 words; "How it's calculated" + rules source; nav, body and next-step links; sitemap lastmod; calculator before any search content; `tools/seo/build.js --check` in sync (skips without JSON-LD) |
| worked-examples | every `data-ex` number in the "How it's calculated" examples equals what that page's own calculator code produces (Skins engine, Stableford `calc()`, Daily Handicap `calculate()`, men and women) |
| skins-9hole-dh | Skins on 9 holes uses each player's own 9-hole Daily Handicap (not half the 18-hole one); 18- and 9-hole DHs remembered separately; players saved before (no 9-hole DH) prefilled with half the 18-hole DH plus a one-line "please check" note, 18-hole DH never overwritten; labels, per-player DH link placement and href, the DH round trip (from=skins … &p=), FAQ copy; the 18-hole example still −75/−75/−35/+185 |
| skins-plus-hcp | Skins handicap field is plain text (type=text, no inputmode) so + and − can be typed, stepper kept; "+2", "-2" and "−2" all store plus 2 and show +2; Stableford's inline plus note word for word (aria-live=polite, aria-describedby, also with the 9-hole check note); stepper, reload, 9-hole DH, clamp, gross; static rows = rendered rows; mutation checks |
| skins-dh-return-ask | A DH coming back to Skins follows Stableford: a 9-hole DH (`&holes=9`, or an old link without `&holes=`) onto a saved 18-hole round asks "…switch this round to 9 holes?" (Switch to front 9 / back 9 / Keep 18 holes, focus on the question, nothing set or switched before a choice); `&holes=18` sets only the 18-hole DH and never switches; `?dh=` without `&p=` is ignored; question text, choices, button styles and toasts match Stableford word for word; mutation checks |
| stableford-9hole-split | Stableford keeps each player's 18-hole (`hcp`) and 9-hole (`hcp9`) Daily Handicap separately, as Skins does: the missing one is prefilled (half / twice) with a one-line "please check" note and not stored; players saved before the split migrated (the one number was the 9-hole DH if saved on a 9-hole round); the DH page says which DH it worked out (`&holes=9|18`); a 9-hole DH coming back onto an 18-hole round asks (front 9 / back 9 / keep 18) and never switches silently; 18-hole DH onto a 9-hole round sets the 18-hole DH only; mutation checks |
| share-link-skins | Skins result links through the same gc-share component (inlined verbatim in both pages; viewer CSS block, banner and actions markup identical in both): 600 random round trips (2–8 players, all hole/scoring modes, allowance, carry, playoff, 18/9-hole DHs); link length (8 long names ≤486); GSM-7 text without the balance line for 6+ players; read-only viewer (no storage reads incl. the legacy key), Start your own round directly under the result with Share result / Copy link as secondary links, compact payment lines for 4+ payments; 33 hostile links → amber error card; no history call while #r= is in the URL; mutation checks |
| skins-result-compact | Your own Skins result uses the same compact payment lines as the shared viewer at 4+ payments (3 keep the big lines); the browser checks measure Share result on the first screen at 375x812 for the example, 8 long names, 8 long names with 7 payments, and 4 long names with 3 big lines |
| share-link-stableford | Stableford share links (`#r=1z.` deflate-raw+base64url, `#r=1.` plain): the inlined `gc-share.js` matches the source file; 600 random round trips; link-length guards (example ≤288, long names ≤420); GSM-7 share text; read-only viewer ("Shared result", no sharer name) never reads or writes localStorage; Start your own round / hashchange in and out; 22 hostile links land on the error card (one sr-only h1); prototype keys / unknown keys ignored; /privacy sentence; history in viewer mode (pushState/replaceState wrapped: no call while #r= is in the URL, Start your own round clears it first); amber error card with AA contrast; mutation checks |
| stableford-v2 | Stableford rebuild (P4): 9-hole DH label and per-player DH link (and the ?p= return), remembered players/course on a later visit, 10th-tee "last six (holes 4–9)" wording and FAQ; hand-calculated 4-player 18-hole round entered with the steppers; countback at each stage (last 9, 6, 3, hole 18, hole by hole, joint, 10th-tee start, three-way); 9-hole countback (front, back, 9-hole card); plus handicaps and DH 24+/40; pickup; duplicate-SI warning; quick-fill; saved courses; reload; New round; plus-handicap note; DH round trip; share text; engine = live page for ordinary rounds; 0 type=number (skips on the legacy page) |
| stableford-fixes | (legacy page only; skips on the P4 rebuild) Stableford plus-handicap note beside the field (aria-describedby, aria-live), 9-hole strokes by ranking the 18-hole stroke indexes; "+2" (or −2) is a plus handicap giving strokes back from SI 18; hand-written expected strokes (skips on the legacy page) |

CI gates (`--ci`): axe serious/critical at 375 and 320 px on every page; no sideways scroll;
no `input[type=number]` on rebuilt pages (Stableford is no longer allowlisted); calculator first at 375×812 on skins, stableford and
daily-handicap (H1 and first control in the first viewport, search content below; screenshots
`fold-<page>-375x812.png` and `full-<page>-375.png`); on 9 holes each Stableford player's
"Work out 9-hole DH" link sits right under their handicap stepper (375 and 320); the Daily Handicap
"(effective 2 Oct 2025)" phrase stays on one line without sideways scroll (375 and 320); the Skins setup Start bar never covers its controls at any scroll position (375×812 and 320×568: fresh,
8 long names, 8 long names on the front 9; Start on the first screen fresh at 375×812) and each Skins player's
9-hole DH link sits under their stepper; the Stableford
setup Start bar never covers the hole-count radios, 10th-tee switch, Edit course or the last 9-hole
DH link at any scroll position (375×812 and 320×568, fresh and 4 long names on the front 9); every
course-card par/SI value field is at least 44×44 (375 and 320); Lighthouse mobile Performance >= 95,
Accessibility >= 95, LCP <= 2.5 s and CLS <= 0.1 on home, skins, stableford, privacy,
daily-handicap. Reports go to `tests/out/<label>/` (git-ignored) and are uploaded
as the `lighthouse-reports` artifact.
