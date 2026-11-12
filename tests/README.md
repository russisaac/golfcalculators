# Tests (not published)

Everything in `tests/` is excluded from the live site by forced 404 rules in
`netlify.toml` (as is `.github/`). The publish directory is still the repo root.

```
cd tests && npm ci          # once
tests/run                   # jsdom suites against the repo root
tests/run --browser         # + strict axe/tap-target/h-scroll/screenshots/Lighthouse
tests/run --browser --ci    # the PR gates only (same as .github/workflows/checks.yml)
SITE=/other/checkout tests/run
node tests/lib/browser-checks.js --ci --url=https://<preview>.netlify.app   # against a deployed preview
```

Suites (`tests/suites/*.js`, each skips itself when not applicable):

| suite | checks |
|---|---|
| skins-regression | standard example Alex 0, Blake 4, Casey 8, Drew 12, $5: -75/-75/-35/+185 (legacy or v2 Skins) |
| p1-parity | calculator behaviour identical to the live source (`tests/baseline` = main @ c54e467) |
| p1-trust | /privacy wording + contact, footer link, favicon, sitemap, robots, GA tag |
| ga-gate | GA4 loads only on golfcalculators.com / www (skips on branches without the gate) |
| skins-v2 | Skins rebuild: engine cross-check vs legacy, flow, escaping, share, storage, SI dupes (skips on legacy Skins) |

CI gates (`--ci`): axe serious/critical at 375 and 320 px on every page; Lighthouse
mobile accessibility >= 95 and LCP <= 2.5 s on home, skins, stableford, privacy,
daily-handicap. Reports go to `tests/out/<label>/` (git-ignored) and are uploaded
as the `lighthouse-reports` artifact.
