/* Pokaalijahti – hallinnon tapahtumahaku (Navisport getEvents-trpc).
   Kaikki kutsut tehdään admin-ajaxin kautta palvelimelta (ei CORSia).
   Tulokset rakennetaan DOM-elementteinä (textContent), ei innerHTML:llä. */

var paState = { events: [], picked: [], total: 0, skip: 0, take: 20, places: {}, eventData: {} };

function paCfg() {
  return (typeof PokaaliAdmin !== 'undefined' && PokaaliAdmin)
    ? PokaaliAdmin
    : { ajaxUrl: '', nonce: '' };
}

function paBuildSearchUrl(cfg, params) {
  var url = (cfg.ajaxUrl || '') + '?action=pokaalijahti_search_events&nonce=' + encodeURIComponent(cfg.nonce || '');
  url += '&q=' + encodeURIComponent(params.q || '');
  if (params.dateFrom) url += '&dateFrom=' + encodeURIComponent(params.dateFrom);
  if (params.dateTo) url += '&dateTo=' + encodeURIComponent(params.dateTo);
  url += '&skip=' + (params.skip ? (parseInt(params.skip, 10) || 0) : 0);
  return url;
}

function paVal(id) {
  var el = document.getElementById(id);
  return (el && typeof el.value !== 'undefined' && el.value !== null) ? String(el.value) : '';
}

function paFormatDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (m) return m[3] + '.' + m[2] + '.' + m[1];
  return iso ? String(iso) : '';
}

function paText(id, msg) {
  var el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function paTd(value) {
  var td = document.createElement('td');
  td.textContent = (value === null || value === undefined) ? '' : String(value);
  return td;
}

function paIsPicked(slug) {
  return paState.picked.indexOf(slug) !== -1;
}

// Merkkijono HTML-kenttään turvalliseksi
function paEsc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paEventBySlug(slug) {
  return paState.eventData[slug] || { slug: slug };
}

// Tapahtuma on mennyt, kun päättymisaika (tai alku) on ohitettu
function paIsPast(event) {
  var end = (event && (event.ending || event.begin)) || '';
  var t = Date.parse(end);
  return isNaN(t) ? false : t < Date.now();
}

// Linkit samalla tapaan kuin lyhytkoodi käyttää: /tapahtumat/<slug>/…
function paEventLinks(event) {
  var base = 'https://navisport.com/tapahtumat/' + encodeURIComponent(event.slug || '');
  return {
    register: base + '/ilmoittautuminen',
    results: (event.url || base + '/tulokset/')
  };
}

// Linkki vain jos se on Navisportin oma https-osoite (suojaa javascript:-osoitteilta)
function paEventUrl(event) {
  var u = event && typeof event.url === 'string' ? event.url : '';
  return u.indexOf('https://navisport.com/') === 0 ? u : '';
}

function paRenderResults() {
  var body = document.getElementById('pa-results-body');
  if (!body) return;
  body.innerHTML = '';
  paState.events.forEach(function (e) {
    var slug = e.slug || '';
    paState.eventData[slug] = e;
    var tr = document.createElement('tr');
    tr.appendChild(paTd(paFormatDate(e.begin)));

    var nameTd = document.createElement('td');
    var link = paEventUrl(e);
    if (link) {
      var a = document.createElement('a');
      a.href = link;
      a.textContent = e.name || slug;
      a.target = '_blank';
      a.rel = 'noopener';
      nameTd.appendChild(a);
    } else {
      nameTd.textContent = e.name || '';
    }
    tr.appendChild(nameTd);
    tr.appendChild(paTd(e.org));
    tr.appendChild(paTd(e.state));
    tr.appendChild(paTd(slug));

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'button button-small';
    btn.textContent = paIsPicked(slug) ? 'Lisätty' : 'Lisää';
    if (paIsPicked(slug)) btn.disabled = true;
    btn.addEventListener('click', function () { paAdd(slug); });
    var btnTd = document.createElement('td');
    btnTd.appendChild(btn);
    tr.appendChild(btnTd);

    body.appendChild(tr);
  });

  var table = document.getElementById('pa-results');
  if (table) table.style.display = paState.events.length ? '' : 'none';
  var more = document.getElementById('pa-more');
  if (more) more.style.display = (paState.total > paState.events.length) ? '' : 'none';
}

function paRenderPicked() {
  var ul = document.getElementById('pa-picked');
  if (!ul) return;
  ul.innerHTML = '';
  paState.picked.forEach(function (slug) {
    var li = document.createElement('li');
    var span = document.createElement('span');
    span.textContent = slug;
    li.appendChild(span);
    var place = document.createElement('input');
    place.type = 'text';
    place.className = 'pa-place';
    place.placeholder = 'Tapahtumapaikka';
    place.value = paState.places[slug] || '';
    place.addEventListener('input', function () {
      paState.places[slug] = place.value;
      paRenderOutput();
    });
    li.appendChild(place);
    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'button button-small';
    rm.textContent = 'Poista';
    rm.addEventListener('click', function () { paRemove(slug); });
    li.appendChild(rm);
    ul.appendChild(li);
  });
}

function paShortcode() {
  var attrs = 'eventid="' + paState.picked.join(',') + '"';
  var nc = document.getElementById('pa-noclublimit');
  var nt = document.getElementById('pa-notrophy');
  if (nc && nc.checked) attrs += ' noclublimit="1"';
  if (nt && nt.checked) attrs += ' notrophy="1"';
  return '[pokaalijahti ' + attrs + ']';
}

function paSlugList() {
  return paState.picked.join(',');
}

// WP-lohko (wp:table) sisältö: Päivä, Järjestäjä, Tapahtumapaikka, Rekisteröidy/Tulokset.
// Rivijärjestys on valintasi mukainen; meneviin tulee ilmoittautumislinkki, menneisiin tulokset.
function paBuildTable() {
  if (!paState.picked.length) return '';
  var rows = paState.picked.map(function (slug) {
    var ev = paEventBySlug(slug);
    return { ev: ev, slug: slug, past: paIsPast(ev) };
  });
  var header = rows.some(function (r) { return !r.past; }) ? 'Rekisteröidy' : 'Tulokset';
  var html = '<!-- wp:table {"className":"is-style-stripes"} -->\n' +
    '<figure class="wp-block-table is-style-stripes"><table class="has-fixed-layout"><tbody>' +
    '<tr><td><strong>Päivä</strong></td><td><strong>Järjestäjä</strong></td>' +
    '<td><strong>Tapahtumapaikka</strong></td><td><strong>' + paEsc(header) + '</strong></td></tr>';
  rows.forEach(function (r) {
    var links = paEventLinks(r.ev);
    var href = r.past ? links.results : links.register;
    var label = r.past ? 'Tulokset' : 'Rekisteröidy';
    html += '<tr><td><strong>' + paEsc(paFormatDate(r.ev.begin)) + '</strong></td>' +
      '<td>' + paEsc(r.ev.org) + '</td>' +
      '<td>' + paEsc(paState.places[r.slug]) + '</td>' +
      '<td><a href="' + paEsc(href) + '">' + label + '</a></td></tr>';
  });
  html += '</tbody></table></figure>\n<!-- /wp:table -->';
  return html;
}

function paRenderOutput() {
  var sc = document.getElementById('pa-shortcode');
  if (sc) sc.textContent = paState.picked.length ? paShortcode() : 'Valitse ensin tapahtumia listalta.';
  var sl = document.getElementById('pa-slugs');
  if (sl) sl.textContent = paSlugList();
  var tb = document.getElementById('pa-table');
  if (tb) tb.textContent = paState.picked.length ? paBuildTable() : 'Valitse ensin tapahtumia listalta.';
}

function paAdd(slug) {
  if (!slug || paIsPicked(slug)) return false;
  if (!Object.prototype.hasOwnProperty.call(paState.places, slug)) {
    var ev = paEventBySlug(slug);
    paState.places[slug] = ev.address || '';
  }
  paState.picked.push(slug);
  paRenderPicked();
  paRenderOutput();
  paRenderResults();
  return true;
}

function paRemove(slug) {
  var before = paState.picked.length;
  paState.picked = paState.picked.filter(function (s) { return s !== slug; });
  if (paState.picked.length !== before) {
    paRenderPicked();
    paRenderOutput();
    paRenderResults();
  }
  return paState.picked.length;
}

function paClearPicked() {
  paState.picked = [];
  paRenderPicked();
  paRenderOutput();
  paRenderResults();
}

function paReadParams(skip) {
  return {
    q: paVal('pa-q').trim(),
    dateFrom: paVal('pa-from').trim(),
    dateTo: paVal('pa-to').trim(),
    skip: skip || 0
  };
}

function paSearch(reset) {
  if (reset) {
    paState.events = [];
    paState.skip = 0;
  }
  var params = paReadParams(paState.skip);
  paText('pa-status', 'Haetaan…');
  return fetch(paBuildSearchUrl(paCfg(), params), { credentials: 'same-origin' })
    .then(function (res) {
      if (!res.ok) throw new Error('http ' + res.status);
      return res.json();
    })
    .then(function (json) {
      if (!json || json.success !== true || !json.data) {
        throw new Error(json && json.data ? String(json.data) : 'virhe');
      }
      var data = json.data;
      var events = (data.events && data.events.length) ? data.events : [];
      paState.events = paState.events.concat(events);
      paState.total = (typeof data.totalCount === 'number') ? data.totalCount : paState.events.length;
      paState.skip = paState.events.length;
      paRenderResults();
      paText('pa-status', events.length
        ? (paState.events.length + ' / ' + paState.total + ' tapahtumaa')
        : 'Ei tuloksia.');
      return paState.events.length;
    })
    .catch(function (err) {
      paText('pa-status', 'Hakua ei voitu suorittaa' + (err && err.message ? ': ' + err.message : '.'));
      paRenderResults();
      return null;
    });
}

function paCopy() {
  if (!paState.picked.length) {
    paText('pa-status', 'Valitse ensin tapahtumia.');
    return Promise.resolve(false);
  }
  return paCopyText(paShortcode(), 'Shortcode kopioitu.');
}

function paCopyTable() {
  var table = paBuildTable();
  if (!table) {
    paText('pa-status', 'Valitse ensin tapahtumia.');
    return Promise.resolve(false);
  }
  return paCopyText(table, 'WP-taulukko kopioitu.');
}

function paCopyText(text, okMsg) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(function () {
      paText('pa-status', okMsg);
      return true;
    }).catch(function () {
      return paCopyFallback(text, okMsg);
    });
  }
  return Promise.resolve(paCopyFallback(text, okMsg));
}

function paCopyFallback(text, okMsg) {
  var ok = false;
  var ta = document.createElement('textarea');
  ta.value = text;
  if (document.body && document.body.appendChild) document.body.appendChild(ta);
  if (ta.select && document.execCommand) {
    try { ta.select(); ok = document.execCommand('copy'); } catch (e) { ok = false; }
  }
  if (ta.parentNode && ta.parentNode.removeChild) ta.parentNode.removeChild(ta);
  paText('pa-status', ok ? okMsg : 'Kopiointi epäonnistui – kopioi teksti käsin.');
  return ok;
}

function paInit() {
  var form = document.getElementById('pa-search-form');
  if (!form) return false;
  form.addEventListener('submit', function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    paSearch(true);
  });
  var more = document.getElementById('pa-more');
  if (more) more.addEventListener('click', function () { paSearch(false); });
  var copy = document.getElementById('pa-copy');
  if (copy) copy.addEventListener('click', paCopy);
  var copyTable = document.getElementById('pa-copy-table');
  if (copyTable) copyTable.addEventListener('click', paCopyTable);
  ['pa-noclublimit', 'pa-notrophy'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', paRenderOutput);
  });
  paRenderPicked();
  paRenderOutput();
  paRenderResults();
  return true;
}

if (typeof document !== 'undefined' && document.getElementById) paInit();
