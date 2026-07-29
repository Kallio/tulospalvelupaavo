# Tulospalvelupaavo — Orienteering & adventure race toolkit

Almost everything in Finnish orienteering — from timing to TV broadcasting —
relies on established systems that have been in use for decades. Navisport has
become the central hub for live results, but many workflows around it still
require manual bridging: CSV exports, club lookups, custom overlays, and
data transformations that each club or event organiser ends up solving on their
own.

**Tulospalvelupaavo** is a collection of tools that sit alongside Navisport to
fill those gaps. Not a single product — just a growing box of helpers that
extend what Navisport can offer, making data equally accessible to organisers,
broadcasters, and participants. Some are full HTML applications, others are
quick one-off scripts. They exist because the existing systems do the hard work
— these tools just help the data flow where it needs to go.

---

## Main tools

### `bibgenerator.html`
Bib number card generator for running races, adventure races, and orienteering.
Imports CSV (ESP/IRMA format) or loads from Navisport API. Generates individual
competitor cards with barcodes, sponsor logos, colour-coded classes, and fully
drag-and-drop configurable layout (A5 landscape). Supports relay legs,
multi-stage events, and sticker sheets.

### `fetch_irma_clubs.bash`
Downloads the public club registry from the Finnish Orienteering Federation's
IRMA system (`irma.suunnistusliitto.fi`). Outputs the full club list as JSON.
Used by multiple other tools for club name normalisation.

### `ppen_to_iof.py`
Converts Purple Pen (`.ppen`) course design files to IOF 3.0 CourseData XML
format — control positions, course layouts, and leg lengths.

### `OBS_helper/`
Tools for live orienteering broadcast overlays in OBS (Browser Source) and vMix
(JSON endpoints). Connects to Navisport live Socket.IO data and renders finish
results, checkpoint passings, and start lists. Includes a URL generator UI and a
Python vMix server. Designed for TV and streaming production.

### `pokaalijahti-wp-plugin/`
WordPress plugin ("Pokaalijahti" / Trophy Hunt) for multi-event tournament
scoring from Navisport events. Tracks points across several events, displays
trophy standings, and includes club name normalisation. A standalone version
(`pokaalijahti.html`) works outside WordPress.

## AM tools (Suunnistava Uusimaa)

These tools target the Uusimaa district ("AM" = AlueMestaruus / area
championship). They help merge club-level results from separate Navisport
exports into a combined district view with AM-participant marking:

- **`fetch_AM_seurat.sh`** — Fetches the Uusimaa district club list from
  `suunnistavauusimaa.fi`
- **`map_AM_status_to_navisport_csv_export.bash`** — Marks individual runners
  from Uusimaa clubs with `(AM)` in CSV exports
- **`map_relay_AM_status_to_navisport_csv_export.bash`** — Same for relay
  events, marks team names
- **`top_filtering_from_results.html`** — Result summary viewer with AM-only
  filtering and club highlighting

## Other

| File | Purpose |
|------|---------|
| `seuroittain.html` | Startlist viewer filtered by club, with live clocks, CSV export |
| `lahtoaikasort.js` | Bookmarklet to sort start list tables by time |
| `fetch_seikkailusprintti_teams.py` | Scrapes team data from seikkailusprintti.com into CSV for bibgenerator |
| `bibnumbeexample.csv` | Example CSV file for bibgenerator |

## Licence

MIT — see [LICENSE](LICENSE).
