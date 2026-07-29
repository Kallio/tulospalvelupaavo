# Tulospalvelupaavo — Orienteering & adventure race toolkit

Finnish orienteering runs on results systems whose roots trace back to 8-bit DOS
era software from the 1980s and 90s. Those old tools are stubbornly reliable but
hard to integrate with modern workflows — web publishing, live streaming,
real-time data, and self-service race management.

**Tulospalvelupaavo** ("Paavo's timing service") is a collection of tools that
bridge that gap. Not a single product, but a growing box of helpers that sit
between legacy data formats and modern services (Navisport, OBS, IOF XML,
WordPress, CSV). Some are quick one-off scripts, others are full HTML
applications. All of them exist because the old DOS tools still do the hard work
— and these tools help translate the result to where it needs to go next.

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
