# OBS Orienteering Passings Overlay

An OBS Browser Source overlay that displays live orienteering passings, finish results, and start lists via WebSocket.

Supports **[Navisport](https://navisport.com)** live data (Socket.IO) and a **legacy raw WebSocket** mode for custom servers.

## Quick Start

1. Open `generator.html` in a browser to configure and generate your OBS URL
2. Copy the generated URL
3. Add `overlay.html` as a **Browser Source** in OBS (set width/height per layout)

## URL Parameters

```
overlay.html?event=<slug>&mode=<mode>&relay=<relay>&layout=<layout>&rows=<n>&checkpoint=<id>&class=<name>&pageinterval=<sec>&transition=<type>
```

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `event` | slug or UUID | _(empty = demo)_ | Navisport event identifier |
| `mode` | `finish` / `passing` / `startlist` | `finish` | What to display |
| `relay` | `team` / `leg` | `team` | Relay display format |
| `layout` | `compact` / `full` | `compact` | `compact` = 800×250 two-column; `full` = fullscreen single-column |
| `rows` | 5–20 | `10` | Row count in fullscreen layout |
| `checkpoint` | checkpoint ID or `latest` | `latest` | For `mode=passing`: which checkpoint |
| `class` | class name | _(empty = all)_ | Filter to specific class |
| `pageinterval` | seconds | `0` | Auto-advance pages. Only for `mode=startlist` |
| `transition` | `fade` / `horizontal` / `vertical` | `fade` | Page transition animation |
| `demo` | `1` | _(hidden)_ | Show demo button permanently (hidden by default, hover to reveal) |

## Display Modes

### Finish Results (`mode=finish`)

Shows finish standings ranked by elapsed time. Computes rank and time-behind automatically from Navisport data.

- For relay events: shows team standings by default (`relay=team`), or individual leg results (`relay=leg`)
- If fewer results than rows, fills from bottom (shows most recent finishers)
- Use `?class=H21` to show only a specific class
- Use `?class=H21,D21` to show multiple specific classes

### Checkpoint Passings (`mode=passing`)

Shows intermediate checkpoint passings ranked by total elapsed time.

- `?checkpoint=latest` (default): shows each runner's most recent checkpoint
- `?checkpoint=<id>`: shows passings at a specific checkpoint
- Checkpoint IDs are available from the Navisport event data (use the generator)

### Start List (`mode=startlist`)

Shows the start list sorted by start time. Displays bib, name, club, and start time.

- Use `?class=H21` to show only a specific class
- Use `?class=H21,D21` to show multiple specific classes
- Pagination with `?pageinterval=10` auto-advances through pages (only mode with auto-pagination)
- Transitions between pages: `?transition=fade|horizontal|vertical`

## Layouts

### Compact (`layout=compact`)

Default 800×250 layout with two columns and 7 rows. Leader highlighted in gold. Suitable for corner overlay in OBS.

### Fullscreen (`layout=full`)

Single-column layout that fills the OBS source area. Configure row count with `?rows=10` (5–20).

Recommended OBS source size for fullscreen: match your canvas resolution (e.g. 1920×1080).

## Data Sources

### Navisport (primary)

Pass `?event=<slug-or-uuid>` to connect to a Navisport event via Socket.IO. The overlay:

1. Connects to `wss://navisport.com/socket.io/` with the event ID
2. Fetches initial results via Navisport's REST API
3. Receives live updates (result changes, new passings) in real time
4. Supports automatic reconnection

### Legacy WebSocket (backward compatible)

Without an `?event` parameter, connects to `ws://localhost:8080` expecting raw JSON messages:

```json
{
  "rank": 1,
  "bib": 142,
  "name": "A. Korhonen",
  "club": "AOK",
  "team": "AOK A",
  "time_behind": "1:23:45"
}
```

### Demo Mode

Hover over the top-right corner of the overlay to reveal the **DEMO** button, or make it permanently visible with `?demo=1`. Click to run a built-in simulation without any server.

## URL Generator

Open `generator.html` in a browser to access a visual configuration tool:

- Enter a Navisport event URL or slug
- Select mode, layout, class, checkpoint, and pagination options
- Generate and copy the OBS Browser Source URL

## Dependencies

- **Socket.IO client v4.7.5** — CDN loaded for Navisport connection
- **pako v2.1.0** — CDN loaded for compressed message decompression
- No build step required

## Files

| File | Description |
|------|-------------|
| `overlay.html` | The OBS Browser Source overlay |
| `generator.html` | URL generator tool |
| `README.md` | This file |
| `LICENSE` | MIT license |

## License

MIT License - Copyright (c) 2026 Espoon Suunta

See [LICENSE](LICENSE) for full text.
