# pota-board

A self-hosted [Parks on the Air](https://pota.app) spotting dashboard — the
whole UI is one self-contained HTML file, served over your LAN in a small
container. Live spot board with the same filters as pota.app (band, mode,
program, QRT, hunted), per-spot mini-maps, an overview map, operator profiles,
local-time handling, light/dark, re-spot, and self-spot.

Optionally integrates with a local [HamLog](https://github.com/kbennett2000/HamLog)
instance to log contacts and backfill your POTA Hunter Log.

## Run it (LAN, Docker)

```bash
cp .env.example .env        # adjust PORT / HamLog vars if you want
docker compose up -d --build
```

Open `http://<server-ip>:8075/`. Set your callsign via the ⚙ gear (it's stored
in your browser, not the repo).

### Without Docker

```bash
npm install
npm start          # serves on PORT (default 8075)
```

## Features

- **Spot board** with live filter dropdowns + counts, sorting, auto-refresh.
- **Maps:** per-spot mini-maps with hover preview and a zoomable modal; a
  collapsible overview map of everything on the board.
- **Operator profiles** on callsign hover (POTA stats).
- **Re-spot** an activator you've hunted, and **Add Spot** to self-spot at a park
  you're activating. Both post to POTA's public spot API.
- **Light/dark**, UTC + local clocks, reduced-motion friendly.

POTA's public API is read and written directly from the browser (it's CORS-open
and the spot endpoint is unauthenticated), so the core dashboard needs no backend
beyond static serving.

## HamLog integration

Built in phases via Claude Code — see `docs/CLAUDE-CODE-KICKOFF.md`. The server
grows a small same-origin `/api` proxy that holds the HamLog JWT server-side
(your HamLog credentials never reach the browser), enabling:

- opt-in "log this contact to HamLog" on re-spot, and
- backfilling your POTA **Hunter Log** into HamLog via ADIF.

See `docs/HAMLOG-INTEGRATION.md` for the HamLog API shapes and data formats.

## Hunter Log → ADIF (backfill tool)

POTA's Hunter Log page has no clean export. Copy the page, save it, and convert:

```bash
python3 scripts/hunterlog_to_adif.py data/private/hunter-log.txt \
    -o data/private/hunter-log.adi --my-call AE9S
```

Then import the `.adi` into HamLog. **Back up HamLog first** — writes are
load-bearing. HamLog de-dupes on import (same call + time-to-the-minute + band +
mode), so re-importing an overlapping file won't create exact-duplicate contacts;
duplicates are skipped. See `docs/HAMLOG-INTEGRATION.md` for the exact dedup key
and the n-fer caveat.

## Layout

```
public/index.html   the dashboard (single file)
src/server.js       Express static server; /api proxy mounts here
scripts/            hunterlog_to_adif.py + synthetic test fixtures
docs/               Claude Code kickoff prompt + HamLog integration notes
data/private/       your gitignored operating data (Hunter Log, ADIF, backups)
```

## License

MIT — see `LICENSE`.

## Credits

Spot data and park info from [pota.app](https://pota.app). Maps © OpenStreetMap
contributors, © CARTO, © Esri. Built for AE9S's LAN; shared in the POTA spirit.
