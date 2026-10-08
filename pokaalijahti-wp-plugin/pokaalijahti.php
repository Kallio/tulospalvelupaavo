<?php
/**
 * Plugin Name: Pokaalijahti - tuloslaskuri
 * Description: Shortcode [pokaalijahti] joka lataa tuloslaskurin ja proxyttää + cachettaa Navisport-API-kutsut.
 * Version: 1.2
 * Author: Pietari Hyvärinen
 */

if (!defined('ABSPATH')) exit;

define('POKAALIS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('POKAALIS_PLUGIN_URL', plugin_dir_url(__FILE__));

// Enqueue assets
function pokaalijahti_enqueue_assets() {
    wp_enqueue_style('pokaalijahti-style', POKAALIS_PLUGIN_URL . 'css/pokaalijahti.css', array(), '1.3');
    wp_enqueue_script('pokaalijahti-app', POKAALIS_PLUGIN_URL . 'js/app.js', array(), '1.8', true);

    wp_localize_script('pokaalijahti-app', 'PokaaliAjax',
        array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('pokaalijahti_nonce'),
	    'clubsUrl' => POKAALIS_PLUGIN_URL . 'assets/data/clubs.json',
        )
    );
}
add_action('wp_enqueue_scripts', 'pokaalijahti_enqueue_assets');

function pokaalijahti_is_uuid($value){
    return is_string($value) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value) === 1;
}

// Jäsentää tapahtuman viitteen: UUID, slug tai Navisport-URL → UUID tai slug (null jos kelvoton)
function pokaalijahti_parse_event_ref($value){
    $value = trim((string)$value);
    if ($value === '') return null;

    if (pokaalijahti_is_uuid($value)) return $value;

    // navisport.com|fi URL → tunniste /events/, /tapahtumat/ tai /tulokset(-new)?/ -osan jälkeen
    if (preg_match('#/(?:events|tapahtumat|tulokset-new|tulokset)/([^/?#]+)#i', $value, $m)) {
        return pokaalijahti_parse_event_ref(rawurldecode($m[1]));
    }

    // Suora slug
    if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $value)) return $value;

    return null;
}

// Shortcode: hyväksyy attribuutit eventid, noclublimit, noserieslimit, series
function pokaalijahti_shortcode($atts){
    $a = shortcode_atts(array(
        'eventid' => '',
        'noclublimit' => '0',
        'noserieslimit' => '0',
        'series' => '',
        'notrophy' =>'',
    ), $atts, 'pokaalijahti');
     $series_safe = sanitize_text_field($a['series']);
     $valid_event_ids = array();


// Pilkotaan mahdolliset eventid:t pilkuilla
    $event_ids = array_map('trim', explode(',', $a['eventid']));
    $valid_event_ids = array();

    foreach ($event_ids as $id) {
        $parsed = pokaalijahti_parse_event_ref($id);
        if ($parsed !== null) {
            $valid_event_ids[] = $parsed;
        }
    }
    $data = array(
        'eventids' => $valid_event_ids,
        'noclublimit' => $a['noclublimit'],
        'noserieslimit' => $a['noserieslimit'],
        'notrophy' =>$a['notrophy'],
        'series' => $series_safe,
    );

    $data_attr = esc_attr(json_encode($data));

    return '<div id="pokaali-app" data-config="'. $data_attr .'">
      <div id="seriesLinks"></div>
      <div id="output"><p>Ladataan tuloksia…</p></div>
      <button id="exportCsvBtn">Vie CSV</button>
    </div>';
}
add_shortcode('pokaalijahti','pokaalijahti_shortcode');

// AJAX handler: proxy + cache (sama kuin aiemmin)
function pokaalijahti_fetch_event() {
    check_ajax_referer('pokaalijahti_nonce','nonce');

    if ( empty($_GET['eventid']) ) {
        wp_send_json_error('missing_eventid', 400);
    }
    $eventid = pokaalijahti_parse_event_ref(sanitize_text_field($_GET['eventid']));
    if ($eventid === null) {
        wp_send_json_error('invalid_eventid', 400);
    }

    // Slug → UUID käännös tRPC-rajapinnan kautta (REST /api/events/ vaatii UUID:n)
    if (!pokaalijahti_is_uuid($eventid)) {
        $slug_cache_key = 'pokaalijahti_slug_' . md5($eventid);
        $uuid = get_transient($slug_cache_key);
        if ($uuid === false) {
            $trpc_url = 'https://navisport.com/trpc/eventsTrpcRouter.getEvent?input=' . rawurlencode(json_encode($eventid));
            $tres = wp_remote_get($trpc_url, array('timeout'=>15));
            if (is_wp_error($tres) || wp_remote_retrieve_response_code($tres) !== 200) {
                wp_send_json_error('slug_not_found', 404);
            }
            $tj = json_decode(wp_remote_retrieve_body($tres), true);
            $uuid = is_array($tj) && isset($tj['result']['data']['id']) ? $tj['result']['data']['id'] : null;
            if (!pokaalijahti_is_uuid($uuid)) {
                wp_send_json_error('slug_resolve_failed', 502);
            }
            set_transient($slug_cache_key, $uuid, DAY_IN_SECONDS);
        }
        $eventid = $uuid;
    }

    $cache_key = 'pokaali_event_' . md5($eventid);
    $cache_ttl = 60 * 60; // 1 tunti

    if (!empty($_GET['clear_cache'])) {
        delete_transient($cache_key);
    }

    $cached = get_transient($cache_key);
    if ($cached !== false) {
        wp_send_json_success($cached);
    }

    $base = 'https://navisport.com/api/events/' . rawurlencode($eventid);
    $res = wp_remote_get($base, array('timeout'=>15));
    if (is_wp_error($res) || wp_remote_retrieve_response_code($res) !== 200) {
        wp_send_json_error('fetch_failed', 502);
    }
    $body = wp_remote_retrieve_body($res);
    $data = json_decode($body, true);
    if ($data === null) {
        wp_send_json_error('invalid_json', 502);
    }

    $res2 = wp_remote_get($base . '/results', array('timeout'=>20));
    if (is_wp_error($res2) || wp_remote_retrieve_response_code($res2) !== 200) {
        wp_send_json_error('fetch_results_failed', 502);
    }
    $body2 = wp_remote_retrieve_body($res2);
    $results = json_decode($body2, true);
    if ($results === null) {
        wp_send_json_error('invalid_results_json', 502);
    }

    $classes = is_array($data['courseClasses'] ?? null) ? $data['courseClasses'] : array();
    $classMap = array();
    foreach ($classes as $c) {
        if (isset($c['id']) && isset($c['name'])) $classMap[$c['id']] = $c['name'];
    }

    $participants = array();
    if (is_array($results)) {
        $participants = $results;
    } elseif (isset($results['participants']) && is_array($results['participants'])) {
        $participants = $results['participants'];
    }

    $slug = isset($data['slug']) ? trim((string)$data['slug']) : '';
    $event_url = $slug !== ''
        ? 'https://navisport.com/tapahtumat/' . rawurlencode($slug) . '/tulokset/'
        : 'https://navisport.com/events/' . rawurlencode($eventid);

    $filtered = array();
    foreach ($participants as $p) {
        $series = $classMap[$p['classId']] ?? '---';
        $p['series'] = $series;
        $p['eventUrl'] = $event_url;
        $filtered[] = $p;
    }

    $payload = array(
        'name' => $data['name'] ?? '',
        'date' => $data['begin'] ?? '',
        'slug' => $slug,
        'eventUrl' => $event_url,
        'participants' => $filtered,
    );

    set_transient($cache_key, $payload, $cache_ttl);
    wp_send_json_success($payload);
}
add_action('wp_ajax_pokaalijahti_fetch_event', 'pokaalijahti_fetch_event');
add_action('wp_ajax_nopriv_pokaalijahti_fetch_event', 'pokaalijahti_fetch_event');

// Admin-menu (vain admin)
function pokaalijahti_admin_menu(){
    add_options_page(
        'Pokaalijahti',          // sivun nimi
        'Pokaalijahti',          // valikon nimi
        'manage_options',        // capability
        'pokaalijahti-settings', // slug
        'pokaalijahti_settings_page'
    );
}
add_action('admin_menu','pokaalijahti_admin_menu');

function pokaalijahti_settings_page(){
    $page = get_option('pokaalijahti_demo_page_id');
    $page_url = $page ? get_permalink($page) : admin_url('options-general.php?page=pokaalijahti-settings');
    ?>
    <div class="wrap">
      <h1>Pokaalijahti - pistelasku plugin</h1>
käytössä oletuksena seuraavat säännöt:
Osakilpailun voittaja saa 100 pistettä. Seuraaviksi tulleet saavat 100 pistettä miinus aikaeroa vastaava vähennys, 1 min. = 1 piste. Keskeyttäneet ja hylätyt tulokset = 10 p. Ilmoittautuminen osakilpailuun = 10 p. ja osallistuminen. Yhteistuloksiin lasketaan 3 suurinta pistemäärää.
    Koodi otetaan käyttöön halutulla sivulla sijoittamalla shortcode sivulle.
    Eventid voi olla UUID, slug tai tapahtuman URL (muodossa navisport.com/tapahtumat/&lt;slug&gt;/tulokset/).
        <h2>Shortcode-esimerkit</h2>
      <pre>
[pokaalijahti eventid="579dc02d-ef31-47aa-955d-6e55bcd6256b"]
[pokaalijahti eventid="id1,id2" noclublimit="1" notrophy="1"]
[pokaalijahti eventid="id1" series="Beginner,Novice"]
[pokaalijahti eventid="https://navisport.com/tapahtumat/espoo-sprintti-cup-2026-espoo-sprintticup-otaniemi-10-05/tulokset/"]
[pokaalijahti eventid="espoo-sprintti-cup-2026-espoo-sprintticup-otaniemi-10-05"]
      </pre>
    </div>
    <?php
}