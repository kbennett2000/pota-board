#!/usr/bin/env python3
"""
hunterlog_to_adif.py — convert a POTA "Hunter Log" page paste into ADIF.

The POTA Hunter Log (pota.app -> Profile -> Hunter Log) lists individual
hunter QSOs but offers no clean per-QSO export. This parses a copy/paste of
that page into a standard ADIF file you can import into HamLog (or any logger).

Each record in the paste looks like:

    Hunter
    2024-07-19 21:46<TAB>K6ATY<TAB>K6ATY<TAB>
     AE9S<TAB>20M<TAB>PHONE (SSB)<TAB>US-NV<TAB>US-2631 Fort Churchill State Park

Columns: Date/Time (UTC) | Station | Operator | Worked(you) | Band | Mode | Location | Park(ref + name)

ADIF mapping (hunter perspective):
    CALL              = Station (the activator's station call you worked)
    QSO_DATE / TIME_ON= the UTC date/time, as-is (POTA shows UTC)
    BAND / MODE       = e.g. 20m / SSB  (PHONE (SSB)->SSB, PHONE (FM)->FM)
    STATION_CALLSIGN  = your call (the "Worked" column)
    SIG / SIG_INFO    = POTA / <their park reference>   <- HamLog links the park from these
    COMMENT           = "op <Operator>" when the operator differs from the station call

Records are de-duplicated on (date, time, station, park). An n-fer (same
station+time, different parks) yields one ADIF record per park, which is correct.

Usage:
    python3 hunterlog_to_adif.py INPUT.txt [-o OUTPUT.adi] [--my-call AE9S]
    cat paste.txt | python3 hunterlog_to_adif.py - --my-call AE9S > out.adi
"""
import argparse
import re
import sys
from datetime import datetime, timezone

REC_RE = re.compile(
    r"(?P<date>\d{4}-\d{2}-\d{2})\s+(?P<time>\d{2}:\d{2})\s+"
    r"(?P<station>[A-Z0-9/]+)\s+(?P<operator>[A-Z0-9/]+)\s+(?P<worked>[A-Z0-9/]+)\s+"
    r"(?P<band>\d+M)\s+"
    r"(?P<mode_outer>[A-Z0-9]+)(?:\s*\((?P<mode_inner>[A-Z0-9/]+)\))?\s+"
    r"(?P<loc>[A-Z0-9]{1,3}-[A-Z0-9]{1,3})\s+"
    r"(?P<ref>[A-Z]{1,3}-\d+)\s+(?P<park>.+)",
    re.IGNORECASE,
)


def split_records(text):
    """Yield raw record blocks, splitting on standalone 'Hunter' marker lines."""
    block = []
    for line in text.splitlines():
        if line.strip().lower() == "hunter":
            if block:
                yield " ".join(block)
                block = []
        else:
            if line.strip():
                block.append(line.strip())
    if block:
        yield " ".join(block)


def parse(text, my_call):
    my_call = my_call.upper()
    seen, rows, warnings = set(), [], []
    for raw in split_records(text):
        norm = re.sub(r"\s+", " ", raw).strip()
        if not norm:
            continue
        m = REC_RE.search(norm)
        if not m:
            warnings.append(f"unparsed: {norm[:80]}")
            continue
        g = m.groupdict()
        if g["worked"].upper() != my_call:
            warnings.append(f"worked={g['worked']} != {my_call}: {norm[:60]}")
            continue
        mode = (g["mode_inner"] or g["mode_outer"]).upper()
        key = (g["date"], g["time"], g["station"].upper(), g["ref"].upper())
        if key in seen:
            continue
        seen.add(key)
        rows.append({
            "call": g["station"].upper(),
            "qso_date": g["date"].replace("-", ""),
            "time_on": g["time"].replace(":", "") + "00",
            "band": g["band"].lower(),
            "mode": mode,
            "station_callsign": my_call,
            "sig": "POTA",
            "sig_info": g["ref"].upper(),
            "operator": g["operator"].upper(),
            "park_name": g["park"].strip(),
        })
    return rows, warnings


def f(tag, val):
    val = "" if val is None else str(val)
    return f"<{tag}:{len(val.encode('utf-8'))}>{val}"


def to_adif(rows):
    ts = datetime.now(timezone.utc).strftime("%Y%m%d %H%M%S")
    out = ["POTA Hunter Log export -> ADIF",
           f("ADIF_VER", "3.1.4"), f("PROGRAMID", "hunterlog_to_adif"),
           f("CREATED_TIMESTAMP", ts), "<EOH>", ""]
    for r in rows:
        parts = [f("CALL", r["call"]), f("QSO_DATE", r["qso_date"]),
                 f("TIME_ON", r["time_on"]), f("BAND", r["band"]),
                 f("MODE", r["mode"]), f("STATION_CALLSIGN", r["station_callsign"]),
                 f("SIG", r["sig"]), f("SIG_INFO", r["sig_info"])]
        if r["operator"] and r["operator"] != r["call"]:
            parts.append(f("COMMENT", f"op {r['operator']}"))
        parts.append("<EOR>")
        out.append(" ".join(parts))
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description="POTA Hunter Log paste -> ADIF")
    ap.add_argument("input", help="input text file, or - for stdin")
    ap.add_argument("-o", "--output", help="output .adi (default: stdout)")
    ap.add_argument("--my-call", default="AE9S", help="your callsign (the 'Worked' column)")
    a = ap.parse_args()

    text = sys.stdin.read() if a.input == "-" else open(a.input, encoding="utf-8").read()
    rows, warnings = parse(text, a.my_call)
    adif = to_adif(rows)

    if a.output:
        with open(a.output, "w", encoding="utf-8") as fh:
            fh.write(adif)
        print(f"Wrote {len(rows)} QSOs -> {a.output}", file=sys.stderr)
    else:
        sys.stdout.write(adif)
    for w in warnings:
        print(f"WARN  {w}", file=sys.stderr)
    if warnings:
        print(f"({len(warnings)} line(s) skipped — review above)", file=sys.stderr)


if __name__ == "__main__":
    main()
