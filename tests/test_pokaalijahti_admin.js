const fs = require('fs');
const path = require('path');

// ── minimal DOM stub (same shape as test_pokaalijahti.js, plus listeners/values) ──
function makeEl(tag) {
  const el = {
    tag, _html: '', textContent: '', className: '', id: '', type: '', href: '',
    target: '', rel: '', value: '', checked: false, disabled: false,
    style: {}, children: [], _listeners: {},
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    fire(type, ev) { (this._listeners[type] || []).slice().forEach(fn => fn(ev || { preventDefault() {} })); },
    remove() {},
    select() { return true; },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) { el._html = String(v); el.children = []; },
  });
  return el;
}
const store = {};
function getEl(id) {
  if (!store[id]) { store[id] = makeEl('#' + id); store[id].id = id; }
  return store[id];
}
global.document = {
  getElementById: id => store[id] || null,
  createElement: tag => makeEl(tag),
  querySelectorAll: () => [],
  body: makeEl('body'),
  execCommand: () => true,
};

// elements the settings page markup provides (created BEFORE the script runs)
['pa-search-form', 'pa-q', 'pa-from', 'pa-to', 'pa-status', 'pa-results',
 'pa-results-body', 'pa-more', 'pa-picked', 'pa-shortcode', 'pa-slugs',
 'pa-copy', 'pa-copy-table', 'pa-table', 'pa-noclublimit', 'pa-notrophy'].forEach(getEl);
getEl('pa-from').value = '2026-09-28';
getEl('pa-to').value = '';
getEl('pa-q').value = '';
getEl('pa-results').style.display = 'none';

global.PokaaliAdmin = { ajaxUrl: '/wp-admin/admin-ajax.php', nonce: 'abc' };
// fetch stub: script only calls it from paSearch
let lastUrl = null, lastOpts = null, nextResponse = null;
global.fetch = (url, opts) => { lastUrl = url; lastOpts = opts; return Promise.resolve(nextResponse); };

// ── load the real admin script ──
const src = fs.readFileSync(
  path.join(__dirname, '..', 'pokaalijahti-wp-plugin', 'js', 'admin-settings.js'), 'utf8');
let api = null;
eval(src + '\n;api = { paState, paBuildSearchUrl, paFormatDate, paSearch, paAdd, paRemove, ' +
  'paClearPicked, paIsPicked, paShortcode, paSlugList, paRenderResults, paRenderOutput, ' +
  'paBuildTable, paCopy, paCopyTable, paIsPast, paEventLinks };');

let pass = 0, fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}
function okJson(data) {
  return { ok: true, status: 200, json: () => Promise.resolve({ success: true, data }) };
}
function dump(el) {
  let out = el._html || '';
  if (el.textContent) out += el.textContent;
  (el.children || []).forEach(c => { out += dump(c); });
  return out;
}
function tags(el, acc) {
  acc.push(el.tag);
  (el.children || []).forEach(c => tags(c, acc));
  return acc;
}
function findTag(el, tag) {
  if (el.tag === tag) return el;
  for (const c of (el.children || [])) {
    const hit = findTag(c, tag);
    if (hit) return hit;
  }
  return null;
}
function rows() { return getEl('pa-results-body').children; }
function reset() {
  api.paState.events = [];
  api.paState.picked = [];
  api.paState.total = 0;
  api.paState.skip = 0;
  api.paState.places = {};
  api.paState.eventData = {};
  api.paClearPicked();
}

const evA = {
  id: '0729473e', name: 'Espoo Sprintticup, Sinimäki',
  slug: 'espoo-sprintti-cup-2026-espoo-sprintticup-sinimaki-10-12',
  begin: '2026-10-12T15:30:00.000Z', state: 'Online', org: 'Espoon Suunta',
  url: 'https://navisport.com/tapahtumat/espoo-sprintti-cup-2026-espoo-sprintticup-sinimaki-10-12/tulokset/',
};
const evXss = {
  id: 'x1', name: '<img src=x onerror=alert(1)>', slug: 'xss-event',
  begin: '2026-11-02T15:30:00.000Z', state: 'Online', org: 'OK 77',
  url: 'https://navisport.com/tapahtumat/xss-event/tulokset/',
};

(async function main() {

  // ── 1. URL construction ──
  const url = api.paBuildSearchUrl(global.PokaaliAdmin,
    { q: 'sprintticup espoo', dateFrom: '2026-09-28', dateTo: '2026-12-31', skip: 0 });
  assert('URL has action + nonce',
    url === '/wp-admin/admin-ajax.php?action=pokaalijahti_search_events&nonce=abc&q=sprintticup%20espoo' +
             '&dateFrom=2026-09-28&dateTo=2026-12-31&skip=0');
  const urlNoDates = api.paBuildSearchUrl(global.PokaaliAdmin, { q: '', dateFrom: '', dateTo: '', skip: 40 });
  assert('empty q/dates are omitted, skip kept',
    urlNoDates === '/wp-admin/admin-ajax.php?action=pokaalijahti_search_events&nonce=abc&q=&skip=40');
  assert('fi date formatting', api.paFormatDate('2026-09-28T15:00:00.000Z') === '28.09.2026');
  assert('empty date formatting', api.paFormatDate('') === '');

  // ── 2. search renders rows (incl. hostile name) ──
  reset();
  getEl('pa-q').value = 'sprintticup espoo';
  getEl('pa-from').value = '2026-09-28';
  getEl('pa-to').value = '2026-12-31';
  nextResponse = okJson({ events: [evA, evXss], totalCount: 2 });
  let n = await api.paSearch(true);
  assert('search returns count', n === 2);
  assert('fetch URL carries q + date range', lastUrl.includes('q=sprintticup%20espoo') && lastUrl.includes('dateFrom=2026-09-28') && lastUrl.includes('dateTo=2026-12-31'));
  assert('fetch uses same-origin credentials', lastOpts && lastOpts.credentials === 'same-origin');
  assert('two rows rendered', rows().length === 2);
  const out = dump(getEl('pa-results-body'));
  assert('event name rendered', out.includes('Espoo Sprintticup, Sinimäki'));
  assert('slug rendered', out.includes('espoo-sprintti-cup-2026-espoo-sprintticup-sinimaki-10-12'));
  assert('date formatted fi', out.includes('12.10.2026'));
  assert('status shows totals', getEl('pa-status').textContent === '2 / 2 tapahtumaa');
  assert('hostile name is plain text, no element created',
    out.includes('<img src=x onerror=alert(1)>') && tags(getEl('pa-results-body'), []).indexOf('img') === -1);
  assert('result link points to new URL style',
    findTag(rows()[0], 'a') !== null &&
    findTag(rows()[0], 'a').href ===
      'https://navisport.com/tapahtumat/espoo-sprintti-cup-2026-espoo-sprintticup-sinimaki-10-12/tulokset/');
  assert('more button hidden when all shown', getEl('pa-more').style.display === 'none');

  // ── 3. pagination ──
  nextResponse = okJson({ events: [{ ...evA, name: 'Jatkoa', slug: 'jatkoa-1' }], totalCount: 42 });
  n = await api.paSearch(false);
  assert('pagination appends instead of resetting', n === 3 && lastUrl.includes('skip=2'));
  assert('more button shown when more available', getEl('pa-more').style.display === '');
  assert('status updated', getEl('pa-status').textContent === '3 / 42 tapahtumaa');

  // ── 4. picking + shortcode output ──
  reset();
  nextResponse = okJson({ events: [evA, evXss], totalCount: 2 });
  await api.paSearch(true);
  const addButtons = rows().map(r => r.children[5].children[0]);
  assert('first row offers Lisää', addButtons[0].textContent === 'Lisää');
  addButtons[0].fire('click');
  addButtons[1].fire('click');
  assert('both picked', api.paState.picked.length === 2);
  assert('shortcode exact',
    api.paShortcode() === '[pokaalijahti eventid="espoo-sprintti-cup-2026-espoo-sprintticup-sinimaki-10-12,xss-event"]');
  assert('slug list is comma joined',
    api.paSlugList() === 'espoo-sprintti-cup-2026-espoo-sprintticup-sinimaki-10-12,xss-event');
  assert('shortcode field shows it', getEl('pa-shortcode').textContent === api.paShortcode());
  assert('slug field shows it', getEl('pa-slugs').textContent === api.paSlugList());
  assert('picked list has remove buttons',
    (getEl('pa-picked').children[0].children.length === 2) && dump(getEl('pa-picked')).includes('Poista'));
  assert('row buttons switch to Lisätty', dump(getEl('pa-results-body')).includes('Lisätty'));

  // duplicate pick is ignored (double click)
  assert('duplicate pick ignored', api.paAdd('xss-event') === false && api.paState.picked.length === 2);

  // optional attributes
  getEl('pa-notrophy').checked = true;
  api.paRenderOutput();
  assert('notrophy appended when checked', api.paShortcode().endsWith(' notrophy="1"]'));
  assert('rendered shortcode field includes it',
    getEl('pa-shortcode').textContent === api.paShortcode());
  getEl('pa-notrophy').checked = false;
  getEl('pa-noclublimit').checked = true;
  api.paRenderOutput();
  assert('noclublimit appended when checked', api.paShortcode().includes(' noclublimit="1"]'));
  getEl('pa-noclublimit').checked = false;
  api.paRenderOutput();

  // remove
  api.paRemove('xss-event');
  assert('remove drops slug', api.paSlugList() === 'espoo-sprintti-cup-2026-espoo-sprintticup-sinimaki-10-12');
  assert('remove updates shortcode field', getEl('pa-shortcode').textContent === api.paShortcode());

  // ── 5. empty selection hint ──
  api.paClearPicked();
  assert('empty hint instead of empty shortcode',
    getEl('pa-shortcode').textContent === 'Valitse ensin tapahtumia listalta.');
  assert('empty slug list', getEl('pa-slugs').textContent === '');

  // ── 6. form submit wiring ──
  lastUrl = null;
  getEl('pa-search-form').fire('submit');
  await new Promise(r => setTimeout(r, 0));
  assert('submit triggers search', lastUrl !== null && lastUrl.includes('action=pokaalijahti_search_events'));
  assert('submit reads current inputs', lastUrl.includes('q=sprintticup%20espoo'));

  // ── 7. error handling ──
  nextResponse = { ok: false, status: 502, json: () => Promise.resolve({ success: false, data: 'fetch_failed' }) };
  n = await api.paSearch(true);
  assert('HTTP error → null', n === null);
  assert('HTTP error message shown', getEl('pa-status').textContent.startsWith('Hakua ei voitu suorittaa'));

  nextResponse = { ok: true, status: 200, json: () => Promise.resolve({ success: false, data: 'forbidden' }) };
  n = await api.paSearch(true);
  assert('wp error payload handled', n === null && getEl('pa-status').textContent.includes('forbidden'));

  nextResponse = okJson({ events: [], totalCount: 0 });
  n = await api.paSearch(true);
  assert('no results', n === 0 && getEl('pa-status').textContent === 'Ei tuloksia.');
  assert('table hidden on no results', getEl('pa-results').style.display === 'none');

  // ── 8. hostile URL in proxy payload is not turned into a link ──
  nextResponse = okJson({
    events: [{ id: 'x2', name: 'Paha linkki', slug: 'paha', begin: '2026-12-01T10:00:00.000Z',
               state: 'Online', org: '', url: 'javascript:alert(1)' }],
    totalCount: 1,
  });
  n = await api.paSearch(true);
  const badRow = rows()[0];
  assert('non-navisport URL rendered as plain text',
    n === 1 && findTag(badRow, 'a') === null && dump(badRow).includes('Paha linkki'));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
