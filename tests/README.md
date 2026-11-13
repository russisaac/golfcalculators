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
| ga-gate | GA4 loads only on golfcalculators.com / www (skips on branches without the gate) |
| og-tags | every page's static OG/Twitter tags, og:url = canonical, each og:image 200 image/png 1200×630 ≤ 300 KB (local server, or `OG_BASE=<url>`) |
| skins-v2 | Skins rebuild: engine cross-check vs legacy, flow, escaping, share, storage, SI dupes (skips on legacy Skins) |
| skins-share-pin | Skins share payload for the standard example byte-identical to cbb93c8 (fixture in tests/baseline; skips on legacy Skins) |
| seo-meta | P3 search: titles ≤ 60 / descriptions ≤ 155, unique, primary query kept; og: and twitter: title/description = title/description; canonical; one JSON-LD @graph (WebApplication, FAQPage = visible FAQ, BreadcrumbList), no ratings/reviews; 5–8 FAQs ≤ 60 words; "How it's calculated" + rules source; nav, body and next-step links; sitemap lastmod; calculator before any search content; `tools/seo/build.js --check` in sync (skips without JSON-LD) |
| worked-examples | every `data-ex` number in the "How it's calculated" examples equals what that page's own calculator code produces (Skins engine, Stableford `calc()`, Daily Handicap `calculate()`, men and women) |
| stableford-fixes | Stableford plus-handicap note beside the field (aria-describedby, aria-live), 9-hole strokes by ranking the 18-hole stroke indexes; "+2" (or −2) is a plus handicap giving strokes back from SI 18; hand-written expected strokes (skips on the legacy page) |

CI gates (`--ci`): axe serious/critical at 375 and 320 px on every page; no sideways scroll;
no `input[type=number]` on rebuilt pages; calculator first at 375×812 on skins, stableford and
daily-handicap (H1 and first control in the first viewport, search content below; screenshots
`fold-<page>-375x812.png` and `full-<page>-375.png`); Lighthouse mobile Performance >= 95,
Accessibility >= 95, LCP <= 2.5 s and CLS <= 0.1 on home, skins, stableford, privacy,
daily-handicap. Reports go to `tests/out/<label>/` (git-ignored) and are uploaded
as the `lighthouse-reports` artifact.
