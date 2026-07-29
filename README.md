# Tulospalvelupaavo — Orienteering & adventure race toolkit

A collection of tools for Finnish orienteering (suunnistus) and adventure race result processing, Navisport integration, and live broadcasting.

## Main tools

### `bibgenerator.html`
Bib number card generator for running races, adventure races, and orienteering. Imports CSV (ESP/IRMA format) or loads from Navisport API. Generates individual competitor cards with barcodes, sponsor logos, colour-coded classes, and configurable layout (A5 landscape cards). Supports relay legs, multi-stage events, and sticker sheets.

### `fetch_irma_clubs.bash`
Downloads the public club registry from the Finnish Orienteering Federation's IRMA system (`irma.suunnistusliitto.fi`). Outputs the full club list as JSON. Used by other tools for club name normalisation.

### `ppen_to_iof.py`
Converts Purple Pen (`.ppen`) course design files to IOF 3.0 CourseData XML format (control positions, course layouts, leg lengths).

### `OBS_helper/`
Tools for live orienteering broadcast overlays in OBS (Browser Source) and vMix (JSON endpoints). Connects to Navisport live Socket.IO data and renders finish results, checkpoint passings, and start lists. Includes a URL generator UI and a Python vMix server.

### `pokaalijahti-wp-plugin/`
WordPress plugin ("Pokaalijahti" / Trophy Hunt) for multi-event tournament scoring from Navisport events. Tracks points across several events and displays trophy standings. Includes a standalone version (`pokaalijahti.html`).

## AM tools (Suunnistava Uusimaa)

These tools target the Uusimaa district ("AM" = AlueMestaruus / area championship):

- **`fetch_AM_seurat.sh`** — Fetches the Uusimaa district club list from `suunnistavauusimaa.fi`
- **`map_AM_status_to_navisport_csv_export.bash`** — Marks individual runners from Uusimaa clubs with `(AM)` in CSV exports
- **`map_relay_AM_status_to_navisport_csv_export.bash`** — Same for relay events, marks team names
- **`top_filtering_from_results.html`** — Result summary viewer with AM-only filtering

## Other

| File | Purpose |
|------|---------|
| `seuroittain.html` | Startlist viewer filtered by club, with live clocks, CSV export |
| `lahtoaikasort.js` | Bookmarklet to sort start list tables by time |
| `fetch_seikkailusprintti_teams.py` | Scrapes team data from seikkailusprintti.com into CSV for bibgenerator |
| `bibnumbeexample.csv` | Example CSV file for bibgenerator |

## Licence

MIT — see [LICENSE](LICENSE).
