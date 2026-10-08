const fs = require('fs');
const path = require('path');

// ── minimal DOM stub (enough for app.js to load and render tables) ──
function makeEl(tag) {
  const el = {
    tag, _html: '', textContent: '', className: '', id: '', style: {},
    children: [],
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, remove() {},
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) { el._html = String(v); el.children = []; },
  });
  return el;
}
const store = {};
function getEl(id) { if (!store[id]) store[id] = makeEl('#' + id); return store[id]; }
function htmlOf(el) { return (el.innerHTML || '') + (el.children || []).map(htmlOf).join(''); }

global.document = {
  getElementById: getEl,
  createElement: tag => makeEl(tag),
  querySelectorAll: () => [],
};
global.window = { location: { search: '?noclublimit=1&noserieslimit=1' }, addEventListener() {} };
global.PokaaliAjax = { ajaxUrl: '/wp-admin/admin-ajax.php', nonce: 'x', clubsUrl: 'clubs.json' };
global.fetch = () => Promise.reject(new Error('network disabled in tests'));

// ── load the real plugin script ──
const src = fs.readFileSync(path.join(__dirname, '..', 'pokaalijahti-wp-plugin', 'js', 'app.js'), 'utf8');
let api = null;
// direct eval: function declarations land in this scope, closures keep top-level consts
eval(src + '\n;api = { scoreEvent, calculateTotals, renderTableBySeries, escapeHtml, pointsPairs, MIN_POINTS_FOR_DNF, TOP_N_SCORES_TO_SUM };');

let pass = 0, fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

// ── 1. escaping (tooltips go into title="…" attributes) ──
assert('escapeHtml escapes double quotes', api.escapeHtml('a "b"') === 'a &quot;b&quot;');
assert('escapeHtml escapes single quotes', api.escapeHtml("a 'b'") === 'a &#39;b&#39;');
assert('escapeHtml escapes < > &', api.escapeHtml('<a & b>') === '&lt;a &amp; b&gt;');

// ── 2. registration counts as a participation ──
const url1 = 'https://navisport.com/tapahtumat/testicup-osa-1/tulokset/';
const regEvent = {
  name: 'Testicup osa 1',
  date: '2026-05-10T15:00:00.000Z',
  participants: [
    { name: 'Voittaja Veera', club: 'EsSu', series: 'N21', time: 600, status: 'Ok', eventUrl: url1 },
    { name: 'Ilmoittautunut Ilsa', club: 'EsSu', series: 'N21', time: 0, status: 'Registered', eventUrl: url1 },
    { name: 'Ei lahtenyt Eero', club: 'EsSu', series: 'N21', time: null, status: 'Dns', eventUrl: url1 },
    { name: 'Hylatty Heli', club: 'EsSu', series: 'N21', time: 900, status: 'Dsq', eventUrl: url1 },
  ],
};

const scored = api.scoreEvent(regEvent);
const n21 = scored.find(s => s.series === 'N21');
const pts = name => n21.list.find(p => p.name === name)._points;
assert('winner scores 100', pts('Voittaja Veera') === 100);
assert('registered scores 10 (MIN_POINTS_FOR_DNF)', pts('Ilmoittautunut Ilsa') === api.MIN_POINTS_FOR_DNF);
assert('DNS scores 10', pts('Ei lahtenyt Eero') === api.MIN_POINTS_FOR_DNF);
assert('DSQ scores 10', pts('Hylatty Heli') === api.MIN_POINTS_FOR_DNF);
assert('registered row never wins the event',
  n21.list.filter(p => p._ok && p._timeSecs !== 0).every(p => p.name === 'Voittaja Veera'));

const totals = api.calculateTotals([regEvent]);
const names = totals.map(t => t.name);
const ils = totals.find(t => t.name === 'Ilmoittautunut Ilsa');
assert('registered-only athlete appears in standings', !!ils);
assert('registration counts as participation', ils && ils.participationCount === 1);
assert('registered athlete totals 10 points', ils && ils.topSum === 10 && ils.pointsList[0] === 10);
assert('DNS athlete excluded from standings', !names.includes('Ei lahtenyt Eero'));
assert('DSQ athlete excluded from standings', !names.includes('Hylatty Heli'));
assert('winner athlete present', names.includes('Voittaja Veera'));

// registration is also visible in the rendered series table
getEl('output').innerHTML = '';
api.renderTableBySeries(totals);
const regHtml = htmlOf(getEl('output'));
assert('registered row rendered with 10 points',
  regHtml.includes('Ilmoittautunut Ilsa') && regHtml.includes('>10</a>'));

// ── 3. points ↔ event pairing + hover tooltip ──
function mkEvent(name, slug, date, behindMin) {
  const winnerTime = 600;
  const eventUrl = `https://navisport.com/tapahtumat/${slug}/tulokset/`;
  return {
    name, date,
    participants: [
      { name: 'Nopea Nasse', club: 'EsSu', series: 'H45', time: winnerTime, status: 'Ok', eventUrl },
      { name: 'Koala Kari', club: 'EsSu', series: 'H45', time: winnerTime + behindMin * 60, status: 'Ok', eventUrl },
    ],
  };
}
// event A first (60 pts), event B second (98 pts): descending points must not inherit event order
const evA = mkEvent('Affa-sprintti', 'affa-sprintti-2026', '2026-06-01T15:00:00.000Z', 40);
const evB = mkEvent('Bffa-sprintti', 'bffa-sprintti-2026', '2026-06-08T15:00:00.000Z', 2);
const cup = api.calculateTotals([evA, evB]);
const kari = cup.find(t => t.name === 'Koala Kari');

assert('kari topSum = 98 + 60', kari && kari.topSum === 158);
const pairs = api.pointsPairs(kari);
assert('pointsPairs sorted descending', pairs[0].pts === 98 && pairs[1].pts === 60);
assert('pointsPairs pairs 98 with event B', pairs[0].r.eventName === 'Bffa-sprintti');
assert('pointsPairs pairs 60 with event A', pairs[1].r.eventName === 'Affa-sprintti');

getEl('output').innerHTML = '';
api.renderTableBySeries(cup);
const html = htmlOf(getEl('output'));
assert('98 links to event B with tooltip',
  html.includes('<a href="https://navisport.com/tapahtumat/bffa-sprintti-2026/tulokset/" title="Bffa-sprintti (2026-06-08)">98</a>'));
assert('60 links to event A with tooltip',
  html.includes('<a href="https://navisport.com/tapahtumat/affa-sprintti-2026/tulokset/" title="Affa-sprintti (2026-06-01)">60</a>'));
assert('both events hoverable in one cell',
  (html.match(/title="/g) || []).length >= 2);
assert('tooltip escaped for attribute safety', api.escapeHtml('X "Y"').indexOf('"') === -1);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
