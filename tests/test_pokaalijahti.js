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
// config comes from data-config (notrophy:0 → trophy list is rendered so it can be tested)
getEl('pokaali-app').dataset = {
  config: JSON.stringify({ noclublimit: '1', noserieslimit: '1', notrophy: '0' }),
};
global.window = { location: { search: '' }, addEventListener() {} };
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
function render(totals) {
  getEl('output').innerHTML = '';
  api.renderTableBySeries(totals);
  return htmlOf(getEl('output'));
}
function rowOf(html, name) { return html.split('<tr>').find(r => r.includes(name)) || ''; }
function url(slug) { return `https://navisport.com/tapahtumat/${slug}/tulokset/`; }

// ── 1. escaping (tooltips go into title="…" attributes) ──
assert('escapeHtml escapes double quotes', api.escapeHtml('a "b"') === 'a &quot;b&quot;');
assert('escapeHtml escapes single quotes', api.escapeHtml("a 'b'") === 'a &#39;b&#39;');
assert('escapeHtml escapes < > &', api.escapeHtml('<a & b>') === '&lt;a &amp; b&gt;');

// ── 2. scoring: no points for registering / not starting ──
const regEvent = {
  name: 'Testicup osa 1',
  date: '2026-05-10T15:00:00.000Z',
  participants: [
    { name: 'Voittaja Veera', club: 'EsSu', series: 'N21', time: 600, status: 'Ok', eventUrl: url('testicup-osa-1') },
    { name: 'Ilmoittautunut Ilsa', club: 'EsSu', series: 'N21', time: 0, status: 'Registered', eventUrl: url('testicup-osa-1') },
    { name: 'Ei lahtenyt Eero', club: 'EsSu', series: 'N21', time: null, status: 'Dns', eventUrl: url('testicup-osa-1') },
    { name: 'Hylatty Heli', club: 'EsSu', series: 'N21', time: 900, status: 'Dsq', eventUrl: url('testicup-osa-1') },
    { name: 'Keskeyttanyt Kaisa', club: 'EsSu', series: 'N21', time: null, status: 'Dnf', eventUrl: url('testicup-osa-1') },
  ],
};

const scored = api.scoreEvent(regEvent);
const n21 = scored.find(s => s.series === 'N21');
const runner = name => n21.list.find(p => p.name === name);
const pts = name => runner(name)._points;
assert('winner scores 100', pts('Voittaja Veera') === 100);
assert('registering scores NOTHING (null, not 10)', pts('Ilmoittautunut Ilsa') === null);
assert('DNS scores NOTHING (null)', pts('Ei lahtenyt Eero') === null);
assert('DSQ still scores 10', pts('Hylatty Heli') === api.MIN_POINTS_FOR_DNF);
assert('DNF still scores 10', pts('Keskeyttanyt Kaisa') === api.MIN_POINTS_FOR_DNF);
assert('registered/DNS never win the event',
  n21.list.filter(p => p._ok && p._timeSecs !== 0).every(p => p.name === 'Voittaja Veera'));
assert('registration is not a valid participation', runner('Ilmoittautunut Ilsa')._validParticipation === false);
assert('DNS is not a valid participation', runner('Ei lahtenyt Eero')._validParticipation === false);
assert('real result is a valid participation', runner('Voittaja Veera')._validParticipation === true);

// ── 3. standings: registration-only / DNS-only / DNF-only athletes do not appear ──
const totals = api.calculateTotals([regEvent]);
const names = totals.map(t => t.name);
assert('registered-only athlete absent from standings', !names.includes('Ilmoittautunut Ilsa'));
assert('DNS-only athlete absent from standings', !names.includes('Ei lahtenyt Eero'));
assert('DNF-only athlete absent from standings', !names.includes('Keskeyttanyt Kaisa'));
assert('DSQ-only athlete absent from standings', !names.includes('Hylatty Heli'));
assert('finisher present with 100', !!totals.find(t => t.name === 'Voittaja Veera' && t.topSum === 100));

// one real start + one registration → 1 participation, only the real score listed
const evOk = {
  name: 'Seka 1', date: '2026-08-01T15:00:00.000Z',
  participants: [
    { name: 'Nopea Nasse', club: 'EsSu', series: 'N35', time: 600, status: 'Ok', eventUrl: url('seka-1') },
    { name: 'Sekamaja Sanna', club: 'EsSu', series: 'N35', time: 720, status: 'Ok', eventUrl: url('seka-1') },
  ],
};
const evReg = {
  name: 'Seka 2', date: '2026-08-08T15:00:00.000Z',
  participants: [
    { name: 'Nopea Nasse', club: 'EsSu', series: 'N35', time: 600, status: 'Ok', eventUrl: url('seka-2') },
    { name: 'Sekamaja Sanna', club: 'EsSu', series: 'N35', time: 0, status: 'Registered', eventUrl: url('seka-2') },
  ],
};
const mixed = api.calculateTotals([evOk, evReg]);
const sanna = mixed.find(t => t.name === 'Sekamaja Sanna');
assert('registration adds no participation', sanna && sanna.participationCount === 1);
assert('registration adds no score', sanna && sanna.pointsList.length === 1 && sanna.pointsList[0] === 98);
assert('registration adds nothing to topSum', sanna && sanna.topSum === 98);

const mixedHtml = render(mixed);
const sannaRow = rowOf(mixedHtml, 'Sekamaja Sanna');
assert('registration row not rendered as a score',
  (sannaRow.match(/<a /g) || []).length === 1 && sannaRow.includes('>98</a>'));
assert('Osallistumiset column = number of scores shown',
  sannaRow.includes('<td>1</td>') && (sannaRow.match(/<a /g) || []).length === 1);
assert('registered event absent from the athlete row', !sannaRow.includes('seka-2'));

// ── 4. trophy list requires real finishes (registrations cannot earn it) ──
const trophyEvents = [1, 2, 3].map(i => ({
  name: `Trofficup ${i}`, date: `2026-07-0${i}T15:00:00.000Z`,
  participants: [
    { name: 'Koala Kari', club: 'EsSu', series: 'M45', time: 600 + i, status: 'Ok', eventUrl: url(`trofficup-${i}`) },
    { name: 'Ilmoittautunut Ilsa', club: 'EsSu', series: 'M45', time: 0, status: 'Registered', eventUrl: url(`trofficup-${i}`) },
  ],
}));
const trophyTotals = api.calculateTotals(trophyEvents);
assert('3 registrations alone earn nothing',
  !trophyTotals.find(t => t.name === 'Ilmoittautunut Ilsa'));
const trophyHtml = render(trophyTotals);
assert('trophy list rendered for exactly 1 athlete', trophyHtml.includes('Pokaalin ansainneita (1)'));
assert('trophy goes to 3 real finishes', trophyHtml.includes('Koala Kari'));
assert('registration-only athlete never in trophy list', !trophyHtml.includes('Ilmoittautunut Ilsa'));

// ── 5. points ↔ event pairing + hover tooltip ──
function mkEvent(name, slug, date, behindMin) {
  const winnerTime = 600;
  const eventUrl = url(slug);
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

const html = render(cup);
assert('98 links to event B with tooltip',
  html.includes('<a href="https://navisport.com/tapahtumat/bffa-sprintti-2026/tulokset/" title="Bffa-sprintti (2026-06-08)">98</a>'));
assert('60 links to event A with tooltip',
  html.includes('<a href="https://navisport.com/tapahtumat/affa-sprintti-2026/tulokset/" title="Affa-sprintti (2026-06-01)">60</a>'));
assert('both events hoverable in one cell', (html.match(/title="/g) || []).length >= 2);
assert('tooltip escaped for attribute safety', api.escapeHtml('X "Y"').indexOf('"') === -1);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
