# Run pota-board without Docker (advanced)

Docker is the easiest way to run pota-board, and it's what the
[Windows](windows.md) / [macOS](macos.md) / [Linux](linux.md) guides use. If you'd
rather run it directly with **Node.js**, you can — it's a tiny app.

## Requirements
- **Node.js 20 or newer** — https://nodejs.org/ (the "LTS" download).

## Run it
From the pota-board folder:

```bash
npm install      # one time — installs Express
npm start        # serves the dashboard
```

Then open **http://localhost:8075**.

## Change the port
The app reads the `PORT` environment variable (default `8075`):

```bash
PORT=9075 npm start      # macOS / Linux
```

On Windows (Command Prompt): `set PORT=9075 && npm start`.

## Notes
- `npm start` runs in the foreground — close the terminal (or press `Ctrl+C`) to
  stop it. For an always-on server, Docker (with `restart: unless-stopped`) is the
  better fit.
- HamLog logging still works the same way — set the `HAMLOG_*` variables (see the
  [HamLog guide](../hamlog.md)) in your environment or a `.env` file before
  `npm start`.

Everything else — using the board, settings, maps — is identical to the Docker
setup. Head to the [How to use the dashboard](../usage.md) guide.
