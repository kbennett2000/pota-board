# CLAUDE.md

## Project

**pota-board** is a self-hosted [Parks on the Air](https://pota.app) spotting
dashboard. The whole UI is a single self-contained HTML file (`public/index.html`)
— no build step, no framework, vanilla JS. A thin Node/Express server serves it
over the LAN and, once the HamLog integration lands, exposes a small `/api`
surface that proxies authenticated calls to HamLog.

Runs on the home LAN (Ubuntu server, `192.168.1.62`), Dockerized, port **8075**.
Single operator (AE9S). Not multi-tenant, not internet-facing by default.

## Architecture

- **Frontend:** `public/index.html` — one file. Dark "rig panel" aesthetic,
  IBM Plex Mono + Inter. Talks to POTA's public API directly from the browser
  (it's CORS-open): spot board, hunted, operator stats, and spot/re-spot/self-spot
  POSTs all happen client-side. Do not add a build step or split this into a
  bundler project without asking — the single-file property is a feature.
- **Server:** `src/server.js` — Express, serves the static dashboard + `/healthz`.
  This is where `/api/*` gets added.
- **HamLog proxy (to be built):** HamLog requires a bearer JWT. That token must
  **never** reach the browser. The browser calls **same-origin** `/api/hamlog/*`;
  the server holds HamLog credentials (env), logs in, caches/refreshes the JWT,
  and forwards. Same-origin = **no CORS changes needed on HamLog**. This is the
  whole reason the server exists; honor it.
- **Container:** one `node:20-alpine` image, `docker-compose.yml`, port 8075.

HamLog API shapes, the Hunter Log paste format, and the POTA CSV findings are
documented in `docs/HAMLOG-INTEGRATION.md`. Read it before touching the integration.

## Tech stack

- Node.js 20, ESM (`"type": "module"`).
- Express 4. Keep dependencies minimal — this is a small LAN tool. Justify any
  new dependency in the PR.
- Frontend: vanilla JS in one HTML file. No React/Vue/bundler.
- Backfill tooling: Python 3 standard library only (`scripts/hunterlog_to_adif.py`).
- Docker for deployment.

## Working agreement

- **Spec first.** Use Plan Mode. Land the plan before writing code.
- **One PR per slice.** The smallest reviewable, load-bearing unit. If a change
  is genuinely atomic and splitting would create a broken intermediate state, say
  so and keep it whole — but default to small.
- **Bobby reviews and merges every PR.** You never self-merge and never force-push.
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Branch per slice off `main`, e.g. `feat/hamlog-proxy`. Open a PR; stop there.
- Don't reach for questions already answered in this file or the docs. If scope
  is ambiguous, make the smallest sensible cut and state the assumption inline.

## Coding conventions

- Keep the dashboard's existing structure and naming; match its terse style.
- Server code: small, readable, no clever abstractions for a single-operator tool.
- Validate any input that crosses the `/api` boundary. Never log secrets or JWTs.
- Errors the operator sees should be plain and actionable.
- All times from POTA are **UTC** (their timestamps carry no zone suffix — the
  dashboard already forces UTC parsing; preserve that).

## Data safety — read this before any HamLog write

HamLog holds real QSO history. Treat writes as load-bearing.

- **HamLog's ADIF import does NOT de-duplicate.** It only skips invalid records
  (missing call/date, bad callsign/freq) — it will happily insert a contact that
  already exists. Any bulk import path must de-dupe against existing HamLog QSOs
  **before** inserting, or it will create duplicate contacts.
- **Back up HamLog's database before any bulk import.** No exceptions.
- The "log to HamLog on re-spot" feature is **opt-in** and explicit. A re-spot is
  not proof of a new QSO (you can re-spot someone you worked an hour ago), so
  logging must be a deliberate per-action choice, never automatic.
- Private operating data (Hunter Log pastes, generated ADIF, DB dumps) lives in
  `data/private/` and is gitignored + dockerignored. Never commit it. Never bake
  it into an image.
- Synthetic fixtures only in tests/CI (see `scripts/fixtures/`). Never real QSOs.

## Repository / publishing

- This repo is intended to be **public**. No secrets in source. HamLog creds and
  any tokens come from env (`.env`, gitignored). `.env.example` documents them.
- The dashboard ships with a neutral default callsign — keep it neutral in the
  committed file so others can use it as-is.

## Out of scope (v1)

- Multi-user / auth on the dashboard itself.
- Internet exposure / TLS / reverse proxy (LAN only for now).
- Rewriting the dashboard into a framework or adding a frontend build step.
- Anything that writes to the live POTA network beyond the existing spot POSTs.

## Layout

```
public/index.html   the dashboard (single file)
src/server.js       Express static server; /api mounts here
scripts/            hunterlog_to_adif.py + synthetic fixtures
docs/               kickoff prompt + integration notes (HamLog API, formats)
data/private/       gitignored operator data (your Hunter Log, ADIF, backups)
.claude/            Claude Code local settings
```
