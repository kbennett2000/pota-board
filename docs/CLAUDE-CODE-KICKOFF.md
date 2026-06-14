# Claude Code — kickoff prompt

Paste the block below into Claude Code (Plan Mode) from the project root. It
assumes `gh` is authenticated and you're starting from this scaffold.

---

You are working in the **pota-board** repo. Read `CLAUDE.md` and
`docs/HAMLOG-INTEGRATION.md` in full before planning — they define the
architecture, the HamLog API, the data-safety rules, and the working agreement.
Do not restate them back to me; just follow them.

**Operating rules (from CLAUDE.md, summarized):** Plan Mode first; one PR per
smallest reviewable slice; conventional commits; branch per slice off `main`;
open the PR and stop — I review and merge every one; never self-merge, never
force-push. Keep `public/index.html` a single self-contained file. HamLog's JWT
stays server-side. HamLog import does **not** de-dupe — protect against duplicate
contacts and back up before any bulk write.

Plan the work as the following phases. Each phase is its own branch + PR. Land
the plan, then implement **Phase 1 only** and open its PR. Wait for me to merge
before the next phase.

**Phase 0 — Public repo (do first, no PR needed).**
Create a public GitHub repo `pota-board` and push this scaffold to `main`.
Confirm `.env` is gitignored and no secrets are tracked. Neutral default
callsign in `public/index.html`.

**Phase 1 — Serve over the LAN.**
Get `src/server.js` + Docker serving the dashboard on port 8075. `npm install`,
`docker compose build`, `docker compose up`. Verify `GET /healthz` returns ok and
the dashboard loads at `http://192.168.1.62:8075/`. No integration yet.
*Acceptance:* container runs, healthcheck green, board loads on the LAN.

**Phase 2 — HamLog proxy (server-side).**
Add `/api/hamlog/*` to the server. On first need, log in to HamLog using
`HAMLOG_URL`/`HAMLOG_USER`/`HAMLOG_PASS`, cache the JWT in memory, refresh on 401.
Expose:
- `GET /api/hamlog/health` → proxy can auth and reach HamLog (don't leak the token).
- `POST /api/hamlog/contact` → body `{ date, time, callsign, frequency, mode, band, parkRef?, rstSent?, rstRcvd?, notes? }`. Creates the contact (`POST /qsos/`) and, if `parkRef`, attaches it (`POST /qsos/:id/pota`). Returns the new id.
Never expose the JWT to the browser. Validate the body. Unit-test the mapping
with HamLog mocked — no live calls in CI.
*Acceptance:* with valid env, a test request creates one contact in HamLog;
with HamLog unreachable, the endpoint fails cleanly.

**Phase 3 — "Log to HamLog" on re-spot (opt-in).**
In the re-spot modal, add an explicit, off-by-default "Also log to HamLog"
checkbox. When checked and the spot succeeds, call `/api/hamlog/contact` with the
activator's call, freq, band, mode, and park reference, time = now (UTC). Surface
success/failure inline; a failed log must not blow up the spot. Remember the
checkbox state per session only. Do **not** touch the self-spot ("Add Spot") path
— that's you activating, not a hunter QSO.
*Acceptance:* re-spot with the box checked logs exactly one contact; unchecked
logs nothing; toggle is obvious and defaults off.

**Phase 4 — Hunter Log backfill + reconciliation.**
`scripts/hunterlog_to_adif.py` already converts a Hunter Log paste to ADIF
(tested against the synthetic fixture). Build the safe import path around it:
1. Read existing HamLog POTA QSOs (via the proxy / `GET /qsos/`).
2. Diff the parsed Hunter Log against them on `(date, time, callsign, park)` and
   emit **only the missing** records — because HamLog's import does not de-dupe.
3. Require a HamLog DB backup to exist/confirm before any bulk insert.
4. Import the missing-only ADIF and report imported/skipped counts.
Keep the operator's Hunter Log paste in `data/private/` (gitignored). Synthetic
fixtures only in CI.
*Acceptance:* running the backfill twice in a row imports the missing contacts
the first time and **zero** the second time (idempotent); no duplicates created.

After Phase 4, stop and check in before any polish/extra phases.

---

## Notes for Bobby (not part of the prompt)

- Phase 4's diff is the realistic version of "backfill from POTA": the Hunter Log
  paste is per-QSO and works; the park-summary CSVs don't (see integration notes).
- Want self-spot to also route through the proxy (atomic "spot + log") later?
  That's a clean Phase 5 once Phases 2–3 prove out — say the word.
- The converter runs today, standalone, no integration needed:
  save your Hunter Log paste to `data/private/hunter-log.txt`, then
  `python3 scripts/hunterlog_to_adif.py data/private/hunter-log.txt -o data/private/hunter-log.adi --my-call AE9S`
  and import the `.adi` via HamLog's UI — but back up first, since import won't de-dupe.
