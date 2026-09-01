<p align="center">
  <img src="docs/images/banner.svg" alt="pota-board — self-hosted Parks on the Air spot board" width="100%">
</p>

<p align="center">
  A self-hosted <a href="https://parksontheair.com/">Parks on the Air</a> spotting
  dashboard you run on your own computer.<br>
  Live spot board, maps, operator profiles, one-click re-spotting, and optional
  logging — all in one small app.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-4ee787" alt="MIT license">
  <img src="https://img.shields.io/badge/runs%20in-Docker-2496ED" alt="Runs in Docker">
  <img src="https://img.shields.io/badge/no%20build%20step-vanilla%20JS-f5b13d" alt="Vanilla JS">
</p>

![The pota-board dashboard](docs/screenshots/01-board-dark.png)

---

## 🚀 Set it up in a few minutes

You don't need to be technical. Pick your computer and follow the guide — each one is
written step-by-step, no experience assumed:

| | Guide |
|---|---|
| 🪟 **Windows** | **[Install on Windows →](docs/install/windows.md)** |
| 🍎 **macOS** | **[Install on macOS →](docs/install/macos.md)** |
| 🐧 **Linux** | **[Install on Linux →](docs/install/linux.md)** |

In short: install **Docker**, download this project, run **`docker compose up -d`**,
and open **http://localhost:8075**.

> **One extra minute:** the maps need a free CARTO API key. Without it the board
> works fine, but the maps are stamped with a watermark — see
> **[Configuration](#-configuration)** below.

> Prefer to run it directly with Node.js instead of Docker?
> See **[Run without Docker](docs/install/without-docker.md)**.

---

## 🔑 Configuration

pota-board reads its settings from a **`.env`** file sitting next to
`docker-compose.yml`. Copy the example and edit it:

```bash
cp .env.example .env
```

| Setting | What it is |
|---|---|
| `CARTO_API_KEY` | Free key for the map tiles — see below |
| `PORT` | Port the dashboard is served on (default `8075`) |
| `HAMLOG_URL` | Your HamLog address, if you use it — [HamLog guide](docs/hamlog.md) |
| `HAMLOG_USER` | Your HamLog username |
| `HAMLOG_PASS` | Your HamLog password |

Then apply the changes with **`docker compose up -d`**.

### The map key

CARTO, which supplies the **Color** and **Dark** basemaps, now requires an API key.
Without one the maps still work — they're just stamped with an "API KEY REQUIRED"
watermark. (The **Satellite** basemap comes from Esri and needs no key.)

Getting one takes about a minute and needs no account:

1. Request a key at **[carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/)**.
2. Put it in your `.env`, e.g. `CARTO_API_KEY=cb1_your_key_here`.
3. Run `docker compose up -d`, then **force-refresh** your browser — both it and
   CARTO's CDN cache map tiles, so an old watermarked one can linger for a moment.

The free tier covers 5,000,000 tiles a month, far more than a personal board will
use. The key is read from `.env`, which is gitignored and kept out of the Docker
image, so it never ends up committed. Do keep the CARTO and OpenStreetMap
attribution visible on your maps — that's what the free tier is in exchange for.

---

## 📡 What you can do

A quick tour — the full walkthrough is in the **[usage guide](docs/usage.md)**.

**See who's on the air, live.** A self-refreshing board of every activator currently
spotted — callsign, frequency, mode, park, comments, and how long ago they were
heard. Fresh spots glow; old ones fade.

**Filter to exactly what you want.** One-tap pills for band, mode, region, QRT, and
"hide parks I've already worked," each showing live counts.

![Filters](docs/screenshots/03-filters.png)

**See where every park is.** Each spot has a mini-map; hover for a preview, click for
a full zoomable map, or open the **overview map** to see the whole board at once.

![Overview map](docs/screenshots/07-overview-map.png)

**Know who you're working.** Hover any callsign for that operator's POTA profile —
parks, activations, contacts, and awards.

![Operator profile](docs/screenshots/05-operator-card.png)

**Re-spot and self-spot.** Bump a fading activator back up the list with one click,
or post your own spot when *you're* the one at the park. Both post straight to the
POTA network — no login required.

![Re-spot window](docs/screenshots/09-respot-modal.png)

**Make it yours.** Dark or light theme, adjustable refresh rate, satellite/dark map
styles, your callsign for hunted-tracking — all saved in your browser.

---

## 📓 Optional: log your contacts to HamLog

If you keep a logbook with **[HamLog](https://github.com/kbennett2000/HamLog)** — a
free, self-hosted ham radio logbook by the same author — pota-board can log the parks
you hunt straight into it. When connected, the re-spot window gains an opt-in
**"Also log this contact to HamLog"** checkbox.

It's entirely optional, off by default, and deliberately careful with your log. Full
details (and how to connect it) are in the **[HamLog guide](docs/hamlog.md)**.

---

## 🛠️ Under the hood

- The whole dashboard is a **single self-contained HTML file** (`public/index.html`)
  — vanilla JavaScript, no framework, no build step.
- A tiny **Node/Express** server (`src/server.js`) serves it and provides the small,
  same-origin `/api/hamlog` proxy so your HamLog password never reaches the browser.
- Spot data comes straight from **[pota.app](https://pota.app)**'s public API.
- Map tiles come from **[CARTO](https://carto.com/basemaps/)** (Color, Dark, needs a
  free key) and **Esri** (Satellite); [Leaflet](https://leafletjs.com/) draws the
  zoomable maps.
- Ships as one small Docker image on port **8075**.

Developer notes live in [`docs/HAMLOG-INTEGRATION.md`](docs/HAMLOG-INTEGRATION.md).
The doc screenshots are generated from synthetic data — see
[`scripts/screenshots/`](scripts/screenshots/).

## License

MIT — see [`LICENSE`](LICENSE).

## Credits

Spot data and park info from [pota.app](https://pota.app). Maps © OpenStreetMap
contributors, © CARTO, © Esri. Built in the POTA spirit — 73!
