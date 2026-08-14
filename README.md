# Tulospalvelupaavo — Orienteering & adventure race toolkit

**English** · [Suomi](README.fi.md)

**Tulospalvelupaavo** is a collection of tools — just a growing box of helpers that
extend what [Navisport](#navisport) can offer, making data equally accessible to organisers,
broadcasters, and participants. Some are full HTML applications, others are
quick one-off scripts.
---

## Main tools

### Contents

- [Bib Number Generator](#bib-number-generator)
- [Rastilippu → Navisport Parallel-Leg Fixer](#rastilippu--navisport-parallel-leg-fixer)
- [25-manna Team Planner](#25-manna-team-planner)
- [Nuorten Jukola Team Planner](#nuorten-jukola-team-planner)
- [Halikko-viesti Team Planner](#halikko-viesti-team-planner)
- [IRMA Club Registry Fetcher](#irma-club-registry-fetcher)
- [IRMA Club Fetcher with Districts](#irma-club-fetcher-with-districts)
- [Purple Pen → IOF Converter](#purple-pen--iof-converter)
- [Map Merger](#map-merger)
- [OBS Broadcast Overlays](#obs-broadcast-overlays)
- [Pokaalijahti WordPress Plugin](#pokaalijahti-wordpress-plugin)
- [Press Results Formatter](#press-results-formatter)

### Bib Number Generator

File: [`bibgenerator.html`](bibgenerator.html)

Bib number card generator for running races, adventure races, and orienteering.
Imports CSV (ESP/IRMA format) or loads from [Navisport](#navisport) API. Generates individual
competitor cards with barcodes, sponsor logos, colour-coded classes, and fully
drag-and-drop configurable layout (A5 landscape). Supports relay legs,
multi-stage events, and sticker sheets.

### Rastilippu → Navisport Parallel-Leg Fixer

File: [`rastilippu_parallel_legs_to_navisport.html`](rastilippu_parallel_legs_to_navisport.html)

Converts a Rastilippu relay-registration CSV into a [Navisport](#navisport) start-list CSV
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

### 25-manna Team Planner

File: [`25manna_joukkuesuunnittelija.html`](25manna_joukkuesuunnittelija.html)

25-manna team planner. Reads a runner pool (`Sarja:Nimi`, optional team wish as a
third field, e.g. `D16:Virtanen Aino:1`) and generates as many valid 25-runner
teams as fit, optimising strength distribution (team 1 strongest) and honouring
team wishes ("Toiveet ensin / Vahvuus ensin" toggle). Teams can be adjusted by
drag-and-drop; marking a runner as sick (kipeä) auto-replaces them from the
spares or another team. Exports a [Navisport](#navisport) start-list CSV (parallel legs as
`Alaosuus` sub-numbers, matching the Rastilippu converter), a print-ready PDF
via the browser, and JSON save/load with `localStorage` autosave. 25-manna
eligibility rules (women-only legs, restricted age/gender legs 3–10/23, ≥9 men
with ≥1 H≤16, ≥9 women with ≥1 D≤16, ≤8 H21) are built in.

### Nuorten Jukola Team Planner

File: [`nuorten_jukola_joukkuesuunnittelija.html`](nuorten_jukola_joukkuesuunnittelija.html)

Nuorten Jukola team planner. Reads a runner pool (`Sarja:Nimi`, optional team
wish as a third field) and generates as many valid 7-runner teams as fit,
optimising strength distribution (team 1 strongest) and honouring team wishes.
The 2026 Nuorten Jukola profile is built in: 7 legs with per-leg age/gender
restrictions (D16/H-D16 os. 1–2, H/D14 os. 3–5, D18/H-D18 os. 6–7; "s. 20XX–"
means born that year or later, so younger runners qualify for older legs, and
os. 1/4/6 are women-only). Supports drag-and-drop adjustment, sick-runner
auto-replacement (with cascade steal from later teams), per-runner scores and
team wishes, [Navisport](#navisport) start-list CSV export (7 blocks matching the Rastilippu
converter), JSON save/load and `localStorage` autosave, plus built-in example
pools of 21/28/35 runners.

### Halikko-viesti Team Planner

File: [`halikkoviesti_joukkuesuunnittelija.html`](halikkoviesti_joukkuesuunnittelija.html)

Halikko-viesti team planner. Reads a runner pool (`Sarja:Nimi`, optional team
wish as a third field) and automatically splits the runners into as many valid
**Kilpasarja** teams as possible, forming **Avoin** teams from the rest. Halikko-viesti
2026 rules are built in: 15 runners per team (leg 1 single, legs 2–5 triple,
legs 14–15 single), Kilpasarja requires ≥5 women, a leg-1 runner
(D / -H16 / H50-), a leg-15 D-sarjalainen, and legs 2–5 quotas (2 D, 2
(-H18/H45-/D), 3 (-H15/H55-/-D18/D40-), 2 (-H13/H65-/-D15/D50-)); Avoin has
only the leg-1 restriction. Supports drag-and-drop adjustment, sick-runner
auto-replacement, per-runner scores and team wishes, [Navisport](#navisport) start-list CSV
export (15 blocks with `Osuus`/`Alaosuus`, matching the Rastilippu Halikko
profile), JSON save/load and `localStorage` autosave, plus built-in example
pools of 45/60/75 runners.

### IRMA Club Registry Fetcher

File: [`fetch_irma_clubs.bash`](fetch_irma_clubs.bash)

Downloads the public club registry from the Finnish Orienteering Federation's
IRMA system (`irma.suunnistusliitto.fi`). Outputs the full club list as JSON.
Used by multiple other tools for club name normalisation.

### IRMA Club Fetcher with Districts

File: [`fetch_irma_clubs_with_districts.py`](fetch_irma_clubs_with_districts.py)

Extends the basic club list with district (area) mapping from IRMA's
ClubEndpoint/viewClub API. Fetches each club's area and produces
[`clubs_with_districts.json`](clubs_with_districts.json) (also pre-built in this
repo). Supports resuming — only fetches clubs missing from an existing output
file. The data is gathered from IRMA's public API but is not an official IRMA
export; use at your own risk.

### Purple Pen → IOF Converter

File: [`ppen_to_iof.html`](ppen_to_iof.html) (browser) · CLI: [`ppen_to_iof.py`](ppen_to_iof.py)

Converts Purple Pen (`.ppen`) course design files to IOF 3.0 CourseData XML
format — control positions, course layouts, and leg lengths.

The HTML tool runs offline in any browser: load one or more `.ppen` files
(multiple files are merged into a single CourseData, chosen by print-area
overlap), inspect the courses on an SVG preview with an optional map image, and
download the XML — the XML is regenerated automatically as you change anything,
so there is no separate convert step, and the options/preview/download steps
stay hidden until files are loaded. Event title, map bounds, and the XML
`creator` attribute are settable in Options. Preview symbols scale with the
print-area size, use `fill="none"`, print-area rectangles are labeled with their
source file, and clicking an area rect toggles it (and its file's courses) in
the view — a hidden area stays clickable as a faint outline so it can always be
brought back. The XML output is never changed by view toggles. A clear button
resets files and options for a fresh start, and the FI/EN button toggles the UI
language. A built-in demo button loads an obfuscated "Nuorten kisa" (youth race)
example for testing without any files on disk. The Python CLI produces identical
output.

### Map Merger

Directory: [`map_merger/`](map_merger/) · open [`index.html`](map_merger/index.html)

Combines children's orienteering map PDFs/images into print-ready A4 sheets
for a printing service (e.g. Crano). Every PDF page or image becomes one map;
two maps are placed on each A4 page (210×297 mm, no gaps or margins) as two
stacked A5-landscape cells. Runs fully in the browser via pdf.js (pinned to
3.11.174) + pdf-lib, loaded from CDN as classic scripts — no build step, and
it works when opened straight from disk (`file://`).

- Whitespace detection removes surrounding white margins (pixels with
  R,G,B > 245 count as background), with the detected crop box previewed.
- Options: auto-crop, bleed margin (mm), an unprintable printer margin
  (default 5 mm — each map is scaled to fit and centered within the printable
  area of its cell, so maps on one sheet are pulled together toward the sheet
  center and never run into the unprintable edge margin; nothing is cut off
  except 1:1 maps physically larger than the printable area), content-aware
  auto-rotate (on by default — rotates a map 90° when its cropped content is
  portrait so it fills the landscape A5 cell instead of being scaled down;
  the decision is based on the content orientation, not the page dimensions,
  so e.g. a portrait page holding a landscape map is left alone),
  keep original size (1:1, placed centered — maps larger than the sheet are
  cut at the edges and flagged with a warning), and a per-image paper-size
  picker (A5/A6/A7) on every bitmap page — the image's longest side is matched
  to the chosen format's long edge, so its physical size is set without DPI
  tuning and can be changed per image without reloading.
  Preview shows original, crop box, the printable area, and the final
  A4 arrangement; the output PDF is generated client-side.
- The sidebar reveals each step only when its prerequisite is met: "2.
  Options" appears once files are loaded, and "3. Summary" / "4. Download PDF"
  (and the A4-sheet preview) once pages exist — matching the other tools in
  this repo.
- Repeat mode tiles **every** loaded page as 1:1 copies on its own A4 in the
  best-fitting grid (e.g. each page 4 × A6 → one A4 per page), instead of the
  default two stacked A5 cells. So with several maps you get one repeat sheet
  per map, and the sheet caption names the source map. The copy count is capped
  per map so every copy fits on the sheet at 1:1 — e.g. at most 2 A5 maps per
  A4 (the input field clamps and warns).
- Easter egg: "duplex shine-through" appends a horizontally mirrored copy of
  every A4 page, so that double-sided printing makes the back page align with
  the front when held up to a light (e.g. control points on one side, course
  lines on the other). Suited to short-edge/left-flip duplex binding. A
  "print only the mirrored pages" variant is available for kids.

  The mirror options are hidden by default (the options panel stays clean).
  Reveal them either by opening the page with `?easteregg=1` appended to the
  URL (e.g. `index.html?easteregg=1`), or by clicking the "2. Options"
  heading five times in quick succession (the same five clicks hide them
  again). They are not persisted — hidden again on the next load.

### OBS Broadcast Overlays

File: [`OBS_helper/`](OBS_helper/)

Tools for live orienteering broadcast overlays in OBS (Browser Source) and vMix
(JSON endpoints). Connects to [Navisport](#navisport) live Socket.IO data and renders finish
results, checkpoint passings, and start lists. Includes a URL generator UI and a
Python vMix server. Designed for TV and streaming production.

### Pokaalijahti WordPress Plugin

File: [`pokaalijahti-wp-plugin/`](pokaalijahti-wp-plugin/)

WordPress plugin ("Pokaalijahti" / Trophy Hunt) for multi-event tournament
scoring from [Navisport](#navisport) events. Tracks points across several events, displays
trophy standings, and includes club name normalisation. A standalone version
([`pokaalijahti.html`](pokaalijahti.html)) works outside WordPress.

### Press Results Formatter

File: [`stopthelegacypress.html`](stopthelegacypress.html)

Press results formatter for [Navisport](#navisport) events. Loads data via [Navisport](#navisport) public API
or pasted JSON, then renders class-filterable, printable results in traditional
newspaper-style layout with district (area) filtering. Supports plain-text export
for copy/paste into publishing systems. Loads club→area mapping from
[`clubs_with_districts.json`](clubs_with_districts.json).

## AM tools (Suunnistava Uusimaa)

These tools target the Uusimaa district ("AM" = AlueMestaruus / area
championship). They help merge club-level results from separate [Navisport](#navisport)
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
| [`lahtoaikasort.js`](lahtoaikasort.js) | Bookmarklet to sort old Pirilä style start list tables by time ([install](#lahtoaikasortjs-bookmarklet)) |
| [`fetch_seikkailusprintti_teams.py`](fetch_seikkailusprintti_teams.py) | Scrapes team data from seikkailusprintti.com into CSV for bibgenerator |
| [`clubs_with_districts.json`](clubs_with_districts.json) | Pre-built club→area mapping (322 clubs, 14 districts). Generated by [`fetch_irma_clubs_with_districts.py`](fetch_irma_clubs_with_districts.py) |

## Bookmarklets

### lahtoaikasort.js bookmarklet

1. Copy the code below
2. Create a new bookmark in your browser (name it e.g. `Aikajärjestys`)
3. Edit the bookmark and paste the code into the URL field

```javascript
javascript:(function(){function sortTableByTime(){const tables=document.querySelectorAll("table");tables.forEach(table=>{const rows=Array.from(table.querySelectorAll("tr"));rows.sort((a,b)=>{const timeA=a.cells[1]?.textContent.trim();const timeB=b.cells[1]?.textContent.trim();return parseTime(timeA)-parseTime(timeB);});const parent=table.tBodies[0]||table;rows.forEach(row=>parent.appendChild(row));});}function parseTime(time){if(!time)return Infinity;const cleaned=time.replace(/[^\d.]/g,"");const parts=cleaned.split(".");if(parts.length!==2)return Infinity;const hours=parseInt(parts[0],10);const minutes=parseInt(parts[1],10);return hours*60+minutes;}sortTableByTime();})();
```

Usage: navigate to an old Pirilä-style start list page and click the bookmark — the tables sort by time.

## Links

| Service | URL | Purpose |
|---------|-----|---------|
| **Navisport** <a id="navisport"></a> | [navisport.com](https://navisport.com) | Event results & live timing. Works with EMIT, SportIdent, Learnjoy and Huichang punching systems (all IOF-approved) |
| **IOF Electronic Punching** | [orienteering.sport/iof/it/electronic-punching](https://orienteering.sport/iof/it/electronic-punching/) | IOF-approved electronic punching systems |
| **OBS** | [obsproject.com](https://obsproject.com) | Live streaming & broadcast software |
| **IRMA** | [irma.suunnistusliitto.fi](https://irma.suunnistusliitto.fi) | Finnish Orienteering Federation's official orienteering portal — competitions and recreational orienteering events |
| **Suunnistava Uusimaa** | [suunnistavauusimaa.fi](https://suunnistavauusimaa.fi) | Uusimaa district orienteering |
| **Purple Pen** | [purplepen.com](https://purplepen.com) | Course design software (.ppen) |
| **Suunnistusliitto** | [suunnistusliitto.fi](https://suunnistusliitto.fi) | Finnish Orienteering Federation |
---

## 🛠 Behind the Name: Why "Tulospalvelupaavo"?

In Finnish event culture, a *"Someone"* (literally "everyplace Paavo") is the ultimate go-to handyman — the reliable helper who always has the right tool in their kit to fix any unexpected issue.

**Tulospalvelupaavo** (*Results Service Paavo*) is the digital counterpart to that trusty helper: a practical toolbox of offline-ready HTML apps and quick scripts designed to effortlessly expand timing systems, live stream overlays, and participant views right on location.

The name **P.A.A.V.O.** also serves as a fitting acronym for what the toolkit does:

* **P**ractical
* **A**uxiliary
* **A**pplication for
* **V**isualization and
* **O**perations

## Licence

MIT — see [LICENSE](LICENSE).
