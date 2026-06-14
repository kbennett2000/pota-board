# HamLog integration notes

Reference for the integration work. Everything here was read off the current
HamLog repo (`github.com/kbennett2000/HamLog`) and the POTA exports — capture it
so the build doesn't have to re-discover it.

## HamLog API (all routes require `Authorization: Bearer <JWT>`)

Auth middleware rejects anything without a valid bearer token. The proxy must
obtain a JWT (login with `HAMLOG_USER` / `HAMLOG_PASS`), cache it, and refresh
on 401.

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| `POST` | `/qsos/` | `createQsoSchema`: `{ date, time, callsign, frequency, notes, received, sent, mode, band }` (only `date`, `callsign`, `frequency` are effectively required) | `{ id }` |
| `POST` | `/qsos/:id/pota` | `{ parkId, qsoType }` — `parkId` is the `US-####` **reference string**; `qsoType` e.g. `"1"` | `{ id }` |
| `POST` | `/qsos/import` | **multipart** file upload, field name `file`, ADIF body. Parses `SIG=POTA` / `SIG_INFO=<ref>` and auto-links the park | `{ imported, ids, skipped, skippedRecords }` |
| `GET`  | `/qsos/export` | optional `?park=US-####` | ADIF text |
| `GET`  | `/qsos/` | optional `?callsign=` or `?park=` | `{ Contacts: [...] }` |
| `GET`  | `/qsos/map` | `?from=&to=` | `{ markers, total }` |
| `DELETE` | `/qsos/:id` | — | `{ deleted }` |

A POTA contact = create the contact (`POST /qsos/`), then attach the park
(`POST /qsos/:id/pota`). The import route does both in one step from ADIF.

### Critical: import does not de-duplicate
`importAdif` skips only invalid records (missing callsign/date, invalid
callsign/frequency, insert failure). It does **not** check for existing
contacts. Re-importing an overlapping file creates duplicates. Any backfill
must diff against existing HamLog QSOs first.

### CORS
HamLog enables CORS only when `CORS_ORIGIN` is set (no `*` default). Because the
dashboard calls HamLog **through this server's same-origin `/api` proxy**, no
CORS change on HamLog is required. (If you ever call HamLog directly from the
browser instead, you'd have to set `CORS_ORIGIN` on HamLog — don't; keep the JWT
server-side.)

## POTA Hunter Log paste format (input to `scripts/hunterlog_to_adif.py`)

POTA's Hunter Log page lists individual hunter QSOs but has no clean export, so
the workflow is: copy the page, save to `data/private/hunter-log.txt`, run the
converter. One record looks like (whitespace is messy from the copy/paste):

```
Hunter
2024-07-19 21:46	K6ATY	K6ATY
 AE9S	20M	PHONE (SSB)	US-NV	US-2631 Fort Churchill State Park
```

Columns: `Date/Time (UTC) | Station | Operator | Worked(you) | Band | Mode | Location | Park(ref + name)`

Mapping to ADIF (hunter perspective):
- `CALL` = Station (the activator's call you worked)
- `QSO_DATE` / `TIME_ON` = the UTC date/time as shown
- `BAND` / `MODE` = e.g. `20m` / `SSB` (`PHONE (SSB)`→`SSB`, `PHONE (FM)`→`FM`)
- `STATION_CALLSIGN` = your call (the "Worked" column)
- `SIG` / `SIG_INFO` = `POTA` / `<their park ref>` — this is what HamLog links on
- `COMMENT` = `op <Operator>` only when operator ≠ station

Records de-dupe on `(date, time, station, park)`. An n-fer (same station+time,
different parks) correctly yields one record per park.

The converter is standalone and tested against `scripts/fixtures/sample-hunterlog.txt`.

## POTA park-summary CSVs — NOT usable for backfill

`hunter_parks.csv` and `activator_parks.csv` (the "Export CSV" from My Stats) are
**park-level aggregates**, not per-QSO logs:

- `hunter_parks.csv`: `DX Entity, Location, HASC, Reference, Park Name, First QSO Date, QSOs`
- `activator_parks.csv`: same + `Attempts, Activations`

One row per park with a QSO *count* — no worked callsign, no time, no freq, no
mode. You cannot build ADIF QSO records from these. They're only useful as a
reconciliation aid ("which parks am I missing in HamLog?"). The Hunter Log paste
(above) is the real per-QSO source.
