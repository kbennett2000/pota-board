# Logging your contacts to HamLog (optional)

pota-board can save the POTA contacts you make straight into a logbook called
**HamLog**. This is **completely optional** — pota-board works fully without it. If
you already keep your log somewhere else (or don't log at all), you can ignore this
page.

---

## What is HamLog?

**HamLog** is a free, self-hosted **ham radio logbook** — a web app where you keep a
record of every contact (QSO) you make. It's a separate project by the same author
as pota-board, and like pota-board it runs on your own computer or home server.

- HamLog project page: **https://github.com/kbennett2000/HamLog**

If you don't have HamLog, that's fine — skip this page. If you'd like a logbook, the
HamLog repo has its own setup instructions.

## What the integration does

When it's connected, the **Re-spot** window grows one extra option:

> ☐ **Also log this contact to HamLog**

Tick it before you re-spot someone you actually worked, and pota-board will add that
contact to your HamLog logbook — the activator's callsign, the frequency, band,
mode, the park, and the time. That's it. One tick, one logged contact.

A few deliberate safety choices:

- **It's off by default and per-contact.** A re-spot isn't proof you made a contact
  (you might re-spot someone you worked an hour ago), so logging is always a
  conscious tick, never automatic.
- **Self-spots are never logged.** The **＋ Spot** (you're the activator) flow has no
  logging option — that's you calling CQ, not working someone.
- **No duplicates.** HamLog skips a contact that's already in your log, so you can't
  accidentally log the same QSO twice.
- **The checkbox only appears if HamLog is actually connected** — no dead options.

## How to connect HamLog

pota-board talks to HamLog **through its own small server** so your HamLog password
is never exposed to the browser. You point pota-board at your HamLog instance with
three settings:

| Setting | What it is |
|---|---|
| `HAMLOG_URL`  | The web address of your HamLog, e.g. `http://192.168.1.50:8050` |
| `HAMLOG_USER` | Your HamLog username |
| `HAMLOG_PASS` | Your HamLog password |

The easiest way is a **`.env` file** next to `docker-compose.yml`. Copy the example:

```bash
cp .env.example .env
```

Open `.env` in a text editor and fill in the three `HAMLOG_*` values, then restart:

```bash
docker compose up -d
```

> In `docker-compose.yml`, the HamLog settings already read from your environment,
> so a `.env` file is all you need.

Once that's set, open a re-spot window and you'll see the **"Also log this contact to
HamLog"** checkbox appear.

## Is it working?

You can check the connection from your browser by visiting:

> http://localhost:8075/api/hamlog/health

- `{"ok":true}` → pota-board can reach and sign in to HamLog. 🎉
- `{"ok":false,"error":"HamLog not configured"}` → the `HAMLOG_*` values aren't set.
- `{"ok":false,"error":"HamLog unreachable"}` → HamLog isn't running or the URL is
  wrong.

## A note on your data

HamLog holds your real contact history, so pota-board treats it carefully: it never
writes anything you didn't explicitly ask it to, and it relies on HamLog's built-in
duplicate protection. As with any logbook, **keep a backup of HamLog** before bulk
imports — HamLog's own docs cover backups.

---

*Curious about the technical details (the API, the proxy, data formats)? The
developer reference is in [HAMLOG-INTEGRATION.md](HAMLOG-INTEGRATION.md).*
