# Share images (og:image)

`render.js` renders `template.html` (gc.css tokens, the site logo) once per entry in
`pages.json` into `/og/<page>.png` (1200×630, PNG, ≤ 300 KB). The PNGs are committed
and published at `https://golfcalculators.com/og/<page>.png`; this folder is not
published (`/tools/*` is a forced 404 in netlify.toml).

```
cd tests && npm ci && cd ..
node tools/og-images/render.js
```

`pages.json` is also the source of truth for each page's `og:title`, `og:description`,
`og:url` and image text; `tests/suites/og-tags.js` checks the static HTML against it.
Each image shows only the tool name, a one-line description and the site name (no results).
