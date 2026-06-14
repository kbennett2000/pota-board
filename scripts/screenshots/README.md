# Documentation screenshots

The images in [`docs/screenshots/`](../../docs/screenshots/) are generated, not
hand-captured, so they stay consistent and contain **no real operating data**.

`capture.mjs` boots the real server, feeds the browser a curated **synthetic**
POTA feed (`synthetic-feed.js` — example callsigns/parks, no live API calls),
drives the UI through each state, and saves the PNGs.

Playwright is a **dev-only tool** and is deliberately *not* a dependency in
`package.json` (this is a tiny LAN app; we don't ship a browser-automation dep).
Install it ad hoc to regenerate the shots:

```bash
npm i --no-save playwright        # installs into node_modules without touching package.json
npx playwright install chromium   # one-time browser download
node scripts/screenshots/capture.mjs
```

Re-run after any UI change so the docs match the app.
