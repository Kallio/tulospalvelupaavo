<?php
/**
 * Plugin Name: Pokaalijahti - tuloslaskuri
 * Description: Shortcode [pokaalijahti] joka lataa tuloslaskurin ja proxyttää + cachettaa Navisport-API-kutsut.
 * Version: 1.1
 * Author: You
 */

if (!defined('ABSPATH')) exit;

define('POKAALIS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('POKAALIS_PLUGIN_URL', plugin_dir_url(__FILE__));

// Enqueue assets
function pokaalijahti_enqueue_assets() {
    wp_enqueue_style('pokaalijahti-style', POKAALIS_PLUGIN_URL . 'css/pokaalijahti.css', array(), '1.1');
    wp_enqueue_script('pokaalijahti-app', POKAALIS_PLUGIN_URL . 'js/app.js', array(), '1.1', true);

    wp_localize_script('pokaalijahti-app', 'PokaaliAjax',
        array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('pokaalijahti_nonce'),
        )
    );
}
add_action('wp_enqueue_scripts', 'pokaalijahti_enqueue_assets');

// Shortcode: hyväksyy attribuutit eventid, noclublimit, noserieslimit, series
function pokaalijahti_shortcode($atts){
    $a = shortcode_atts(array(
        'eventid' => '',
        'noclublimit' => '0',
        'noserieslimit' => '0',
        'series' => '',
    ), $atts, 'pokaalijahti');

    $data = array(
        'eventids' => $a['eventid'],
        'noclublimit' => $a['noclublimit'],
        'noserieslimit' => $a['noserieslimit'],
        'series' => $a['series'],
    );

    $data_attr = esc_attr(json_encode($data));

    return '<div id="pokaali-app" data-config="'. $data_attr .'">
      <h1>Pokaalijahti - tuloslaskuri</h1>
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
    $eventid = sanitize_text_field($_GET['eventid']);
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

    $filtered = array();
    foreach ($participants as $p) {
        $series = $classMap[$p['classId']] ?? '---';
        $p['series'] = $series;
        $p['eventUrl'] = 'https://navisport.com/events/' . esc_attr($eventid);
        $filtered[] = $p;
    }

    $payload = array(
        'name' => $data['name'] ?? '',
        'date' => $data['begin'] ?? '',
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
      <h1>Pokaalijahti</h1>
      <p>Täällä voit luoda demo-/ohjesivun jolla on valmiit shortcode-esimerkit.</p>
      <p><a class="button button-primary" href="<?php echo esc_url($page_url); ?>">Avaa demo-sivu</a></p>
      <h2>Shortcode-esimerkit</h2>
      <pre>
[pokaalijahti eventid="579dc02d-ef31-47aa-955d-6e55bcd6256b"]
[pokaalijahti eventid="id1,id2" noclublimit="1"]
[pokaalijahti eventid="id1" series="Beginner,Novice"]
      </pre>
    </div>
    <?php
}
