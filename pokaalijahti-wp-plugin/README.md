

# Pokaalijahti WordPress Plugin


**Pokaalijahti** is a WordPress plugin that allows you to display tournament results from multiple [Navisport](https://navisport.com) events on your WordPress site. The plugin isn’t limited to a single club, so you’re welcome to collaborate with other clubs in your area.

If you enjoy using the plugin, feel free to show your support—perhaps with a coffee or a kisamakkara at the next event, or simply cheering me on to the finish line!

## Installation

### 1. Download the Plugin

* Navigate to the [GitHub repository](https://github.com/Kallio/tulospalvelupaavo/tree/main/pokaalijahti-wp-plugin).
* Click on the green "Code" button and select "Download ZIP" to download the plugin files.

### 2. Install the Plugin in WordPress

#### Option 1: Manual Installation

1. Extract the downloaded ZIP file on your computer.
2. Connect to your website via FTP using a client like FileZilla.
3. Navigate to the `wp-content/plugins/` directory.
4. Upload the extracted plugin folder (e.g., `pokaalijahti-wp-plugin/`) to this directory.
5. Log in to your WordPress admin dashboard.
6. Go to **Plugins > Installed Plugins**.
7. Find **Pokaalijahti** in the list and click **Activate**.

#### Option 2: WordPress Dashboard Installation

1. Log in to your WordPress admin dashboard.
2. Go to **Plugins > Add New**.
3. Click on **Upload Plugin**.
4. Choose the downloaded ZIP file and click **Install Now**.
5. After installation, click **Activate**.

## Usage

### Accessing Plugin Settings

After activation, you can configure the plugin settings by navigating to **Settings > Pokaalijahti** in your WordPress admin dashboard.

To use these shortcodes:

1. Edit the page or post where you want to display the information.
2. Add the desired shortcode in the content area.
3. Save or update the page/post.


This will render the tournament results wherever the shortcode is placed.

### Shortcode

```
[pokaalijahti eventid="579dc02d-ef31-47aa-955d-6e55bcd6256b"]
[pokaalijahti eventid="event-one,event-two" noclublimit="1" notrophy="1"]
[pokaalijahti eventid="https://navisport.com/tapahtumat/espoo-sprintti-cup-2026-espoo-sprintticup-otaniemi-10-05/tulokset/"]
```

`eventid` takes a comma-separated list, and each entry may be:

* a Navisport UUID,
* an event slug (e.g. `espoo-sprintti-cup-2026-espoo-sprintticup-otaniemi-10-05`), or
* a full event URL — `navisport.com/events/…`, `navisport.com/tapahtumat/<slug>` or `…/<slug>/tulokset/` (the slug is extracted automatically).

Slugs are resolved to UUIDs server-side (the Navisport REST API only accepts UUIDs), and results links point at the current `navisport.com/tapahtumat/<slug>/tulokset/` style.

### Event search (admin)

**Settings > Pokaalijahti** has an event search that queries Navisport's event list server-side (no CORS, results cached 10 minutes):

1. Type a name (e.g. `sprintticup espoo`) and set a date range — **Alkaen** defaults to today, **Päättyy** is optional, so e.g. a summer and an autumn season can be listed separately.
2. Press **Hae** (**Näytä lisää** pages through the rest) and press **Lisää** on the events you want.
3. Tick `noclublimit="1"` / `notrophy="1"` if you need them, then **Kopioi shortcode** and paste it on the page.

The picked list lives only in the browser session — nothing is saved; the shortcode itself carries the slugs.

### Results table

* Each number in **Top pisteet** links to that event; hover it to see the event name and date.
* Points: winner 100, minus 1 per minute behind. DNF/DSQ = 10 points. Registering for an event (`Registered` status) or not starting (`DNS`) scores **nothing** and does not count as a participation. The top 3 scores are summed, and **Osallistumiset** equals the number of scores shown.

## Support

"If you choose to use this plugin, please note it is provided as-is. We do not take responsibility for its functionality or any issues that may arise. If you wish, you can report problems or ask questions on the [GitHub Issues page](https://github.com/Kallio/tulospalvelupaavo/issues), but support is not guaranteed."

If you need further assistance or have specific questions about the plugin's features, feel free to ask!
