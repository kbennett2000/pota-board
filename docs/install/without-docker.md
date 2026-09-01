# Run pota-board without Docker (advanced)

Docker is the easiest way to run pota-board, and it's what the
[Windows](windows.md) / [macOS](macos.md) / [Linux](linux.md) guides use. If you'd
rather run it directly with **Node.js**, you can — it's a tiny app.

## Requirements
- **Node.js 20 or newer** — https://nodejs.org/ (the "LTS" download).
- A **free CARTO API key** for the map tiles (optional but recommended) —
  https://carto.com/basemaps/apikey/. Without one the maps render with an
  "API KEY REQUIRED" watermark.

## Run it
From the pota-board folder:

```bash
npm install      # one time — installs Express
npm start        # serves the dashboard
```

Then open **http://localhost:8075**.

## Settings

Run directly, the app reads its settings from **environment variables** you set in the
shell. (`npm start` does *not* read a `.env` file — that's a Docker Compose feature.)

| Variable | What it does |
|---|---|
| `CARTO_API_KEY` | Free CARTO key so the maps aren't watermarked |
| `PORT` | Port to serve on (default `8075`) |
| `HAMLOG_URL` / `HAMLOG_USER` / `HAMLOG_PASS` | Optional HamLog logging — see the [HamLog guide](../hamlog.md) |

```bash
CARTO_API_KEY=cb1_xxxxxxxx PORT=9075 npm start        # macOS / Linux
```

On Windows (Command Prompt):

```bat
set CARTO_API_KEY=cb1_xxxxxxxx
set PORT=9075
npm start
```

To make them stick across sessions, add the `export` lines to your shell profile
(`~/.bashrc`, `~/.zshrc`) or use Windows' **Environment Variables** dialog.

If the key isn't set, `npm start` prints a reminder at boot and the maps fall back to
CARTO's watermarked tiles — nothing breaks.

## Notes
- `npm start` runs in the foreground — close the terminal (or press `Ctrl+C`) to
  stop it. For an always-on server, Docker (with `restart: unless-stopped`) is the
  better fit.
- HamLog logging still works the same way — set the `HAMLOG_*` variables (see the
  [HamLog guide](../hamlog.md)) in your environment before `npm start`.

Everything else — using the board, settings, maps — is identical to the Docker
setup. Head to the [How to use the dashboard](../usage.md) guide.
