# Tulospalvelupaavo — Orienteering & adventure race toolkit

**Tulospalvelupaavo** is a collection of tools  — just a growing box of helpers that
extend what Navisport can offer, making data equally accessible to organisers,
broadcasters, and participants. Some are full HTML applications, others are
quick one-off scripts. 
---

## Main tools

### [`stopthelegacypress.html`](stopthelegacypress.html)
Press results formatter for Navisport events. Loads data via Navisport public API
or pasted JSON, then renders class-filterable, printable results in traditional
newspaper-style layout with district (area) filtering. Supports plain-text export
for copy/paste into publishing systems. Loads club→area mapping from
[`clubs_with_districts.json`](clubs_with_districts.json).

### [`bibgenerator.html`](bibgenerator.html)
Bib number card generator for running races, adventure races, and orienteering.
Imports CSV (ESP/IRMA format) or loads from Navisport API. Generates individual
competitor cards with barcodes, sponsor logos, colour-coded classes, and fully
drag-and-drop configurable layout (A5 landscape). Supports relay legs,
multi-stage events, and sticker sheets.

### [`rastilippu_parallel_legs_to_navisport.html`](rastilippu_parallel_legs_to_navisport.html)
Converts a Rastilippu relay-registration CSV into a Navisport start-list CSV
with per-leg `Osuus`/`Alaosuus` columns. Teams are mapped onto configurable leg
profiles (e.g. Kompassi-viesti 3-leg, Halikko-viesti 7-leg): first runner → leg 1,
last runner → final leg, middle runners fill left-to-right. Avoimet sarjat allow
only 3 names. Per-profile competition number ranges are supported (tyhjä = no
numbers); overlapping numbers across profiles block saving.

**Hidden URL parameters (advanced users):**
- `?teams=N` — generates a randomised example with N teams and loads it on open
  (example names are drawn from built-in pools, surname-first).
- `?ex=halikko` — use the Halikko-viesti profile/preset instead of the default
  Kompassi one (with `?teams=`, applies the preset).
- `?seed=123` — fixed random seed so a generated example is reproducible.

Example: `rastilippu_parallel_legs_to_navisport.html?teams=40&ex=halikko&seed=123`

### [`25manna_joukkuesuunnittelija.html`](25manna_joukkuesuunnittelija.html)
25-manna team planner. Reads a runner pool (`Sarja:Nimi`, optional team wish as a
third field, e.g. `D16:Virtanen Aino:1`) and generates as many valid 25-runner
teams as fit, optimising strength distribution (team 1 strongest) and honouring
team wishes ("Toiveet ensin / Vahvuus ensin" toggle). Teams can be adjusted by
drag-and-drop; marking a runner as sick (kipeä) auto-replaces them from the
spares or another team. Exports a Navisport start-list CSV (parallel legs as
`Alaosuus` sub-numbers, matching the Rastilippu converter), a print-ready PDF
via the browser, and JSON save/load with `localStorage` autosave. 25-manna
eligibility rules (women-only legs, restricted age/gender legs 3–10/23, ≥9 men
with ≥1 H≤16, ≥9 women with ≥1 D≤16, ≤8 H21) are built in.

### [`nuorten_jukola_joukkuesuunnittelija.html`](nuorten_jukola_joukkuesuunnittelija.html)
Nuorten Jukola team planner. Reads a runner pool (`Sarja:Nimi`, optional team
wish as a third field) and generates as many valid 7-runner teams as fit,
optimising strength distribution (team 1 strongest) and honouring team wishes.
The 2026 Nuorten Jukola profile is built in: 7 legs with per-leg age/gender
restrictions (D16/H-D16 os. 1–2, H/D14 os. 3–5, D18/H-D18 os. 6–7; "s. 20XX–"
means born that year or later, so younger runners qualify for older legs, and
os. 1/4/6 are women-only). Supports drag-and-drop adjustment, sick-runner
auto-replacement (with cascade steal from later teams), per-runner scores and
team wishes, Navisport start-list CSV export (7 blocks matching the Rastilippu
converter), JSON save/load and `localStorage` autosave, plus built-in example
pools of 21/28/35 runners.

### [`halikkoviesti_joukkuesuunnittelija.html`](halikkoviesti_joukkuesuunnittelija.html)
Halikko-viesti team planner. Reads a runner pool (`Sarja:Nimi`, optional team
wish as a third field) and automatically splits the runners into as many valid
**Kilpasarja** teams as possible, forming **Avoin** teams from the rest. Halikko-viesti
2026 rules are built in: 15 runners per team (leg 1 single, legs 2–5 triple,
legs 14–15 single), Kilpasarja requires ≥5 women, a leg-1 runner
(D / -H16 / H50-), a leg-15 D-sarjalainen, and legs 2–5 quotas (2 D, 2
(-H18/H45-/D), 3 (-H15/H55-/-D18/D40-), 2 (-H13/H65-/-D15/D50-)); Avoin has
only the leg-1 restriction. Supports drag-and-drop adjustment, sick-runner
auto-replacement, per-runner scores and team wishes, Navisport start-list CSV
export (15 blocks with `Osuus`/`Alaosuus`, matching the Rastilippu Halikko
profile), JSON save/load and `localStorage` autosave, plus built-in example
pools of 45/60/75 runners.

### [`fetch_irma_clubs.bash`](fetch_irma_clubs.bash)
Downloads the public club registry from the Finnish Orienteering Federation's
IRMA system (`irma.suunnistusliitto.fi`). Outputs the full club list as JSON.
Used by multiple other tools for club name normalisation.

### [`fetch_irma_clubs_with_districts.py`](fetch_irma_clubs_with_districts.py)
Extends the basic club list with district (area) mapping from IRMA's
ClubEndpoint/viewClub API. Fetches each club's area and produces
[`clubs_with_districts.json`](clubs_with_districts.json) (also pre-built in this
repo). Supports resuming — only fetches clubs missing from an existing output
file. The data is gathered from IRMA's public API but is not an official IRMA
export; use at your own risk.

### [`ppen_to_iof.py`](ppen_to_iof.py)
Converts Purple Pen (`.ppen`) course design files to IOF 3.0 CourseData XML
format — control positions, course layouts, and leg lengths.

### [`OBS_helper/`](OBS_helper/)
Tools for live orienteering broadcast overlays in OBS (Browser Source) and vMix
(JSON endpoints). Connects to Navisport live Socket.IO data and renders finish
results, checkpoint passings, and start lists. Includes a URL generator UI and a
Python vMix server. Designed for TV and streaming production.

### [`pokaalijahti-wp-plugin/`](pokaalijahti-wp-plugin/)
WordPress plugin ("Pokaalijahti" / Trophy Hunt) for multi-event tournament
scoring from Navisport events. Tracks points across several events, displays
trophy standings, and includes club name normalisation. A standalone version
([`pokaalijahti.html`](pokaalijahti.html)) works outside WordPress.

## AM tools (Suunnistava Uusimaa)

These tools target the Uusimaa district ("AM" = AlueMestaruus / area
championship). They help merge club-level results from separate Navisport
exports into a combined district view with AM-participant marking:

- **[`fetch_AM_seurat.sh`](fetch_AM_seurat.sh)** — Fetches the Uusimaa district club list from
  `suunnistavauusimaa.fi`
- **[`map_AM_status_to_navisport_csv_export.bash`](map_AM_status_to_navisport_csv_export.bash)** — Marks individual runners
  from Uusimaa clubs with `(AM)` in CSV exports
- **[`map_relay_AM_status_to_navisport_csv_export.bash`](map_relay_AM_status_to_navisport_csv_export.bash)** — Same for relay
  events, marks team names
- **[`top_filtering_from_results.html`](top_filtering_from_results.html)** — Result summary viewer with AM-only
  filtering and club highlighting

## Other

| File | Purpose |
|------|---------|
| [`seuroittain.html`](seuroittain.html) | Startlist viewer filtered by club, with live clocks, CSV export |
| [`lahtoaikasort.js`](lahtoaikasort.js) | Bookmarklet to sort old Pirilä style start list tables by time ([asenna](#lahtoaikasortjs-bookmarklet)) |
| [`fetch_seikkailusprintti_teams.py`](fetch_seikkailusprintti_teams.py) | Scrapes team data from seikkailusprintti.com into CSV for bibgenerator |
| [`clubs_with_districts.json`](clubs_with_districts.json) | Pre-built club→area mapping (322 clubs, 14 districts). Generated by [`fetch_irma_clubs_with_districts.py`](fetch_irma_clubs_with_districts.py) |

## Bookmarkletit

### lahtoaikasort.js bookmarklet

1. Kopioi alla oleva koodi
2. Luo uusi kirjanmerkki selaimeesi (nimeksi esim. `Aikajärjestys`)
3. Muokkaa kirjanmerkkiä ja liitä koodi URL-osoite-kenttään

```javascript
javascript:(function(){function sortTableByTime(){const tables=document.querySelectorAll("table");tables.forEach(table=>{const rows=Array.from(table.querySelectorAll("tr"));rows.sort((a,b)=>{const timeA=a.cells[1]?.textContent.trim();const timeB=b.cells[1]?.textContent.trim();return parseTime(timeA)-parseTime(timeB);});const parent=table.tBodies[0]||table;rows.forEach(row=>parent.appendChild(row));});}function parseTime(time){if(!time)return Infinity;const cleaned=time.replace(/[^\d.]/g,"");const parts=cleaned.split(".");if(parts.length!==2)return Infinity;const hours=parseInt(parts[0],10);const minutes=parseInt(parts[1],10);return hours*60+minutes;}sortTableByTime();})();
```

Käyttö: navigoi vanhan Pirilä-tyyliselle lähtölistasivulle ja klikkaa kirjanmerkkiä — taulukot järjestyvät kellonajan mukaan.

## Links

| Service | URL | Purpose |
|---------|-----|---------|
| **Navisport** | [navisport.com](https://navisport.com) | Event results & live timing |
| **OBS** | [obsproject.com](https://obsproject.com) | Live streaming & broadcast software |
| **IRMA** | [irma.suunnistusliitto.fi](https://irma.suunnistusliitto.fi) | Finnish Orienteering Federation club registry |
| **Suunnistava Uusimaa** | [suunnistavauusimaa.fi](https://suunnistavauusimaa.fi) | Uusimaa district orienteering |
| **Purple Pen** | [purplepen.com](https://purplepen.com) | Course design software (.ppen) |
| **Suunnistusliitto** | [suunnistusliitto.fi](https://suunnistusliitto.fi) | Finnish Orienteering Federation |

## Licence

MIT — see [LICENSE](LICENSE).
