// Zero-dependency Node tests for karttatarpeet.html (map-count analyzer).
// Mirrors the DOM-stub + eval pattern of the other tool tests.
// Run: node tests/test_karttatarpeet.js   (empty output + exit 0 = pass)

process.env.TZ = 'UTC';

const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/karttatarpeet.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl(tag) {
  const el = {
    tag, value: '', textContent: '', className: '', placeholder: '', style: {},
    children: [], checked: false, disabled: false, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, remove() {}, removeChild() {}, select() {}, click() {},
    querySelector(sel) { return null; },
    querySelectorAll() { return []; },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._html || ''; },
    set(v) { this._html = v; if (v === '') this.children = []; },
  });
  return el;
}
const store = {};
function getEl(id) { if (!store[id]) store[id] = makeEl('#' + id); return store[id]; }
const body = makeEl('body');
global.document = {
  getElementById: getEl,
  querySelectorAll() { return []; },
  createElement: tag => makeEl(tag),
  body,
  addEventListener() {},
};
global.window = { addEventListener() {}, print() {} };
global.location = { search: '' };

// ── test data ─────────────────────────────────────────────────────────
// A fictional sprintticup-style individual event. Times are driven by
// finishTime − time (no explicit startTime), like the Navisport sprints.
const indEvent = {
  id: 'ev-1', name: 'Eteläinen Tapiola',
  begin: '2026-03-16T15:30:00.000Z', ending: '2026-03-16T20:00:00.000Z',
  raceType: 'Individual', eventKind: 'Event',
  courseClasses: [
    { id: 'cB', name: 'Beginner' },
    { id: 'cS', name: 'Elite Short' },
    { id: 'cL', name: 'Elite Long' },
  ],
  courses: [
    { id: 'coB', name: 'Beginner', distance: 1700, controls: [] },
    { id: 'coS', name: 'Elite Short', distance: 3000, controls: [] },
    { id: 'coL', name: 'Elite Long', distance: 4500, controls: [] },
  ],
  results: [
    { id: 'r1', classId: 'cB', courseId: 'coB', name: 'Anu Alku', status: 'Ok', time: 600, finishTime: '2026-03-16T16:05:00.000Z', registered: true },
    { id: 'r2', classId: 'cB', courseId: 'coB', name: 'Ville Viimeinen', status: 'Dsq', time: 500, finishTime: '2026-03-16T16:04:00.000Z' },
    { id: 'r3', classId: 'cS', courseId: 'coS', name: 'Kalle Kärkisija', status: 'Ok', time: 1000, finishTime: '2026-03-16T16:10:00.000Z' },
    { id: 'r4', classId: 'cS', courseId: 'coS', name: 'Dnf Dnf', status: 'Dnf' },
    { id: 'r5', classId: 'cS', courseId: 'coS', name: 'Niilo Nopea', status: 'Ok', time: 750, finishTime: '2026-03-16T16:08:00.000Z', registered: true },
    { id: 'r6', classId: 'cL', courseId: 'coL', name: 'Olli Ok', status: 'Ok', time: 1500, finishTime: '2026-03-16T16:12:00.000Z' },
    { id: 'r7', classId: 'cL', courseId: 'coL', name: 'Kessu Kilpailija', status: 'Competing' },
    // over the 3 h threshold → treated as a quitter ("went home")
    { id: 'r8', classId: 'cL', courseId: 'coL', name: 'Mököttäjä Martti', status: 'Ok', time: 13000, finishTime: '2026-03-16T19:10:00.000Z' },
    // no class / no timestamps (DNS)
    { id: 'r9', name: 'Ei Sarjaa', status: 'Dns' },
  ],
};

// Older-season naming: BEG / short / long must normalize to the current names.
const legacyEvent = {
  id: 'ev-2', name: 'Kauniaisten Kasavuori',
  begin: '2025-03-24T16:00:00.000Z', ending: '2025-03-24T20:00:00.000Z',
  raceType: 'Individual', eventKind: 'Event',
  courseClasses: [
    { id: 'ca', name: 'BEG' },
    { id: 'cb', name: 'short' },
    { id: 'cc', name: 'long' },
  ],
  courses: [
    { id: 'co1', name: 'BEG', distance: 1500, controls: [] },
    { id: 'co2', name: 'short', distance: 2900, controls: [] },
    { id: 'co3', name: 'long', distance: 4400, controls: [] },
  ],
  results: [
    { id: 'a1', classId: 'ca', courseId: 'co1', name: 'A A', status: 'Ok', time: 500, finishTime: '2025-03-24T16:06:00.000Z' },
    { id: 'a2', classId: 'ca', courseId: 'co1', name: 'B B', status: 'Ok', time: 520, finishTime: '2025-03-24T16:07:00.000Z' },
    { id: 'b1', classId: 'cb', courseId: 'co2', name: 'C C', status: 'Ok', time: 800, finishTime: '2025-03-24T16:09:00.000Z' },
    { id: 'c1', classId: 'cc', courseId: 'co3', name: 'D D', status: 'Ok', time: 1000, finishTime: '2025-03-24T16:10:00.000Z' },
  ],
};

const relayEvent = {
  id: 'ev-3', name: 'Viesti',
  begin: '2025-09-01T10:00:00.000Z', ending: '2025-09-01T14:00:00.000Z',
  raceType: 'Relay', eventKind: 'Event',
  courseClasses: [
    { id: 'cr', name: 'Elite Long' },
  ],
  courses: [
    { id: 'cor', name: 'Elite Long', distance: 5000, controls: [] },
  ],
  results: [
    { id: 't1', resultType: 'Team', classId: 'cr', courseId: 'cor', name: 'Joukkue 1', status: 'Ok', time: 4000, startTime: '2025-09-01T10:00:00.000Z', finishTime: '2025-09-01T11:06:40.000Z' },
    { id: 't2', resultType: 'Team', classId: 'cr', courseId: 'cor', name: 'Joukkue 2', status: 'Dnf' },
    { id: 't3', resultType: 'Team', classId: 'cr', courseId: 'cor', name: 'Joukkue 3', status: 'Ok', time: 4200, startTime: '2025-09-01T10:00:00.000Z', finishTime: '2025-09-01T11:10:00.000Z' },
    { id: 'l1', resultType: 'Individual', parentId: 't1', classId: 'cr', courseId: 'cor', name: 'Juoksija 1', status: 'Ok', time: 4000, finishTime: '2025-09-01T11:06:40.000Z' },
  ],
};

const archiveHtml = '<div class="evento"><a href="https://navisport.com/events/6efc07b8-74a4-4ef8-bc48-4a92060635db">Tulokset</a></div>' +
  '<a href="https://navisport.fi/events/b6b4fa1c-ec36-4206-b734-a8688e7ae27f/">Tulokset</a>' +
  '<a href="https://navisport.appspot.com/events/5f7d6f38-bdd7-438d-be73-ffa59f1a727c/">Tulokset</a>' +
  '<a href="https://irma.suunnistusliitto.fi/embed/viewEvent/22433#results">IRMA</a>';

// ── mock fetch: map event id → event JSON ─────────────────────────────
const eventsById = {
  'ev-1': indEvent,
  'ev-2': legacyEvent,
  'ev-3': relayEvent,
  '6efc07b8-74a4-4ef8-bc48-4a92060635db': indEvent, // live-resolution smoke
};
global.fetch = (url) => {
  if (url.indexOf('/api/events/') === -1) return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
  const id = url.split('/api/events/')[1].split('?')[0];
  const data = eventsById[id.toLowerCase()];
  if (!data) return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
};

// ── load the script and expose internals ──────────────────────────────
let threw = null;
let P = null;
try {
  eval(code + `
    global.KP = {
      T, esc, parseTS, fmtClock, fmtDur, dateStr, initials, median, percentile, recommend,
      extractIds, canonClass, classifyStatus, STATUS_OK, isMultistageEvent,
      rowsForCounting, rowTimes, perEventStats, aggregateSummaries, buildCSV, toCSV,
      shouldIncludeEvent, readOpts, DEFAULT_QUIT_H, analyzeAll,
      setLang, applyLangUI, renderStatus, sleep, politeDelayBounds, politeDelayMs,
    };
  `);
} catch (e) { threw = e; }

let pass = 0, fail = 0;
function assert(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL: ' + name + (detail !== undefined ? '\n  ' + JSON.stringify(detail) : '')); }
}

if (threw) {
  console.error('Script load threw: ' + threw.message);
  process.exit(1);
}
P = global.KP;

// ── extractIds ────────────────────────────────────────────────────────
{
  const ids = P.extractIds('https://navisport.com/events/6efc07b8-74a4-4ef8-bc48-4a92060635db');
  assert('url com: uuid found', ids.length === 1 && ids[0] === '6efc07b8-74a4-4ef8-bc48-4a92060635db', ids);

  assert('url fi: uuid found', P.extractIds('https://navisport.fi/events/b6b4fa1c-ec36-4206-b734-a8688e7ae27f/?ref=x')[0] === 'b6b4fa1c-ec36-4206-b734-a8688e7ae27f');

  assert('url appspot: uuid found', P.extractIds('https://navisport.appspot.com/events/5f7d6f38-bdd7-438d-be73-ffa59f1a727c/')[0] === '5f7d6f38-bdd7-438d-be73-ffa59f1a727c');

  const md = P.extractIds('[Tulokset](https://navisport.com/events/f1aa9ce7-0f79-4a5e-aad5-54b1010bb897) Livelox x');
  assert('markdown link: uuid found', md.length === 1 && md[0] === 'f1aa9ce7-0f79-4a5e-aad5-54b1010bb897', md);

  const htmlIds = P.extractIds(archiveHtml);
  assert('archive html: 3 navisport uuids, no irma', htmlIds.length === 3, htmlIds);
  assert('archive html: irma excluded', htmlIds.indexOf('22433') === -1 && !htmlIds.some(x => /irma|suunnistus/.test(x)), htmlIds);

  const lint = P.extractIds('6efc07b8-74a4-4ef8-bc48-4a92060635db\n6efc07b8-74a4-4ef8-bc48-4a92060635db,6EFC07B8-74A4-4EF8-BC48-4A92060635DB');
  assert('bare uuids: deduped and lowercased', lint.length === 1 && lint[0] === '6efc07b8-74a4-4ef8-bc48-4a92060635db', lint);

  assert('registration/results path markers ignored', P.extractIds('https://navisport.com/events/abc/registration').filter(x => x === 'registration').length === 0);

  assert('bare slug with hyphens picked up', P.extractIds('stadin-sprintticup-2026')[0] === 'stadin-sprintticup-2026');
  assert('prose words never treated as ids', P.extractIds('[Tulokset](https://navisport.com/events/f1aa9ce7-0f79-4a5e-aad5-54b1010bb897) Livelox x Race').length === 1);
}

// ── canonClass / classifyStatus ───────────────────────────────────────
{
  assert('canon: long→Elite Long', P.canonClass('long') === 'Elite Long');
  assert('canon: Long→Elite Long', P.canonClass('Long') === 'Elite Long');
  assert('canon: short→Elite Short', P.canonClass(' short ') === 'Elite Short');
  assert('canon: BEG→Beginner', P.canonClass('BEG') === 'Beginner');
  assert('canon: Beginner→Beginner', P.canonClass('Beginner') === 'Beginner');
  assert('canon: unknown passes through', P.canonClass('H16') === 'H16');

  assert('cls: Ok→OK', P.classifyStatus('Ok') === 'OK');
  assert('cls: Dnf', P.classifyStatus('Dnf') === 'DNF');
  assert('cls: Dsq', P.classifyStatus('Dsq') === 'DSQ');
  assert('cls: Dns', P.classifyStatus('Dns') === 'DNS');
  assert('cls: Competing', P.classifyStatus('Competing') === 'COMPETING');
  assert('cls: No time', P.classifyStatus('No time') === 'NOTIME');
}

// ── perEventStats (individual) ────────────────────────────────────────
{
  const s = P.perEventStats(indEvent, { quitH: 3 });
  assert('individual: name kept', s.name === 'Eteläinen Tapiola', s.name);
  assert('individual: date dd.mm.yyyy', s.date === '16.3.2026', s.date);

  const names = s.classes.map(c => c.name);
  assert('individual: classes in courseClasses order', JSON.stringify(names) === JSON.stringify(['Beginner', 'Elite Short', 'Elite Long', 'Ilman sarjaa']), names);

  const cls = {};
  s.classes.forEach(c => cls[c.name] = c);
  assert('Beginner total = 2 rows (Ok+Dsq)', cls['Beginner'].total === 2, cls['Beginner']);
  assert('Beginner ok = 1', cls['Beginner'].ok === 1, cls['Beginner']);
  assert('Beginner dsq = 1', cls['Beginner'].dsq === 1, cls['Beginner']);
  assert('Elite Short total = 3', cls['Elite Short'].total === 3, cls['Elite Short']);
  assert('Elite Short ok = 2', cls['Elite Short'].ok === 2, cls['Elite Short']);
  assert('Elite Short dnf = 1', cls['Elite Short'].dnf === 1, cls['Elite Short']);
  assert('Elite Long total = 3 (Ok + Competing + >3h Ok)', cls['Elite Long'].total === 3, cls['Elite Long']);
  // the >3h row has status Ok but must NOT be counted as OK (someone went home)
  assert('Elite Long ok = 1 (over-3h excluded)', cls['Elite Long'].ok === 1, cls['Elite Long']);
  assert('Elite Long competing = 1', cls['Elite Long'].competing === 1, cls['Elite Long']);
  assert('unknown-class row bucketed', (cls['Ilman sarjaa'] || {}).total === 1, cls);

  // flow facts
  assert('flow: firstResult clock', s.flow.firstResult && s.flow.firstResult.clock === '16:04', s.flow.firstResult);
  assert('flow: first starter initials (derived start)', s.flow.firstStart.who === 'MM', s.flow.firstStart);
  assert('flow: first starter at 15:33 (finish−time)', s.flow.firstStart.clock === '15:33', s.flow.firstStart);
  assert('flow: last starter clock', s.flow.lastStart.clock === '15:55', s.flow.lastStart);
  assert('flow: start window 22 min', s.flow.startWindowMin === 22, s.flow.startWindowMin);
  assert('flow: longest real time = 25 min', s.flow.longestSec === 1500, s.flow.longestSec);
  assert('flow: longest row belongs to elite long', s.flow.longest.cls === 'Elite Long', s.flow.longest);
  assert('flow: over-3h count = 1', s.flow.over3Count === 1, s.flow.over3Count);
  assert('flow: over-3h flagged', s.flow.over3.length === 1 && s.flow.over3[0].who === 'MM' && s.flow.over3[0].sec === 13000, s.flow.over3);
  assert('flow: last result = the >3h finish', s.flow.lastResult.clock === '19:10', s.flow.lastResult);
}

// ── legacy course naming normalizes ───────────────────────────────────
{
  const s = P.perEventStats(legacyEvent, { quitH: 3 });
  const names = s.classes.map(c => c.name);
  assert('legacy: BEG/short/long → Beginner/Elite Short/Elite Long', JSON.stringify(names) === JSON.stringify(['Beginner', 'Elite Short', 'Elite Long']), names);
  const total = {};
  s.classes.forEach(c => total[c.name] = c.total);
  assert('legacy: Beginner total 2', total['Beginner'] === 2, total);
  assert('legacy: Elite Short total 1', total['Elite Short'] === 1, total);
  assert('legacy: Elite Long total 1', total['Elite Long'] === 1, total);
}

// ── relay: teams counted, not legs ────────────────────────────────────
{
  const s = P.perEventStats(relayEvent, { quitH: 3 });
  assert('relay: isRelay true', s.isRelay === true, s.isRelay);
  const cls = s.classes[0];
  assert('relay: 3 teams counted', cls && cls.total === 3, s.classes);
  assert('relay: ok = 2 (Dnf excluded)', cls && cls.ok === 2, cls);
  assert('relay: longest = 4200s', s.flow.longestSec === 4200, s.flow.longestSec);
}

// ── aggregate + recommendation ────────────────────────────────────────
{
  const s1 = P.perEventStats(indEvent, { quitH: 3 });
  const s2 = P.perEventStats(legacyEvent, { quitH: 3 });
  const agg = P.aggregateSummaries([s1, s2], 20, 3);
  const byName = {};
  agg.rows.forEach(r => byName[r.name] = r);
  assert('agg: events counted', agg.events === 2, agg.events);
  assert('agg: Beginner total 4 max 2 avg 2', byName['Beginner'].total === 4 && byName['Beginner'].max === 2 && byName['Beginner'].avg === 2, byName['Beginner']);
  assert('agg: Beginner recommended 3 (max+buffer)', byName['Beginner'].recommended === 3, byName['Beginner']);
  // Elite Short: 3 and 1 → max 3, rec = ceil(3*1.2)=4
  assert('agg: Elite Short recommended 4', byName['Elite Short'].recommended === 4, byName['Elite Short']);
  // Elite Long: 3 and 1
  assert('agg: Elite Long total 4', byName['Elite Long'].total === 4, byName['Elite Long']);
  assert('agg: over3 total 1', agg.over3Count === 1, agg);

  assert('recommend: ceil semantics', P.recommend(101, 20) === 122, P.recommend(101, 20));
  assert('recommend: buffer 0', P.recommend(10, 0) === 10);
  assert('median single', P.median([5]) === 5);
  assert('median even', P.median([2, 4]) === 3);
  assert('percentile p90', P.percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90) === 9.1);
}

// ── most-common course highlight ──────────────────────────────────────
{
  const s1 = P.perEventStats(indEvent, { quitH: 3 });
  const s2 = P.perEventStats(legacyEvent, { quitH: 3 });
  const s3 = P.perEventStats(relayEvent, { quitH: 3 });
  const agg = P.aggregateSummaries([s1, s2, s3], 20, 3);
  const top = agg.rows.filter(r => r.isTop).map(r => r.name);
  assert('agg: only the course in all 3 events is highlighted', JSON.stringify(top) === JSON.stringify(['Elite Long']), top);
  assert('agg: rows carry isTop flag', agg.rows.every(r => typeof r.isTop === 'boolean'), agg.rows);
}

// ── gentle fetch pacing ───────────────────────────────────────────────
{
  assert('fetch: small batch uses brisk range [250,600]', JSON.stringify(P.politeDelayBounds(1)) === JSON.stringify({ lo: 250, hi: 600 }), P.politeDelayBounds(1));
  const big = P.politeDelayBounds(35);
  const small = P.politeDelayBounds(1);
  assert('fetch: more events → more polite (floor and ceiling rise)', big.lo > small.lo && big.hi > small.hi, big);
  assert('fetch: delay stays within bounds for sampled calls', (() => {
    for (let i = 0; i < 50; i++) {
      const d = P.politeDelayMs(35);
      if (d < P.politeDelayBounds(35).lo || d > P.politeDelayBounds(35).hi) return false;
    }
    return true;
  })());
  assert('fetch: sleep helper exists', typeof P.sleep === 'function', typeof P.sleep);
  assert('fetch: fetchEventJSON honours adaptive delay', /fetchEventJSON/.test(html) && /politeDelayMs\(/.test(html));
}

// ── csv ───────────────────────────────────────────────────────────────
{
  const s1 = P.perEventStats(indEvent, { quitH: 3 });
  const s2 = P.perEventStats(legacyEvent, { quitH: 3 });
  const csv = P.buildCSV([s1, s2], { bufferPct: 20, quitH: 3 });
  assert('csv: is a string', typeof csv === 'string', typeof csv);
  assert('csv: event rows present', csv.indexOf('Eteläinen Tapiola') !== -1 && csv.indexOf('Kauniaisten Kasavuori') !== -1);
  assert('csv: course headers', csv.indexOf('Beginner') !== -1 && csv.indexOf('Elite Short') !== -1 && csv.indexOf('Elite Long') !== -1);
  assert('csv: aggregate section', csv.indexOf('Yhteenveto ratoja kohti') !== -1);
  assert('csv: semicolon separated', csv.split('\r\n')[1].split(';').length > 5, csv.split('\r\n')[1]);
  assert('csv: participant vs pre-registered headers distinguished', csv.indexOf('Osallistujat (kaikki rivit)') !== -1 && csv.indexOf('Ennakkoilmoitt.') !== -1, csv);
}

// ── date filter ───────────────────────────────────────────────────────
{
  assert('filter: inside range', P.shouldIncludeEvent(indEvent, { filterOn: true, fromDate: '2026-01-01' }) === true);
  assert('filter: outside range', P.shouldIncludeEvent(legacyEvent, { filterOn: true, fromDate: '2026-01-01' }) === false);
  assert('filter: off includes all', P.shouldIncludeEvent(legacyEvent, { filterOn: false, fromDate: '2026-01-01' }) === true);
}

// ── end-to-end via analyzeAll on stubbed DOM ──────────────────────────
(async () => {
  const inp = getEl('idsInput');
  const out = getEl('output');
  inp.value = 'https://navisport.com/events/6efc07b8-74a4-4ef8-bc48-4a92060635db';
  (await global.KP.analyzeAll().catch(e => { console.error('e2e threw: ' + e.message); fail++; }));
  assert('e2e: output rendered for the event', typeof out.innerHTML === 'string' && out.innerHTML.indexOf('Eteläinen Tapiola') !== -1, out.innerHTML);
  assert('e2e: terms hint explains results vs pre-registration', out.innerHTML.indexOf('tuloslistan osallistuja') !== -1, out.innerHTML);
  global.KP.setLang('en');
  assert('lang: EN re-renders with English header', out.innerHTML.indexOf('Print recommendation per course') !== -1, out.innerHTML);
  assert('lang: EN status message in English', getEl('status').textContent.indexOf('Done') !== -1, getEl('status').textContent);
  global.KP.setLang('fi');
  assert('lang: FI re-renders with Finnish header', out.innerHTML.indexOf('Tulostussuositus per rata') !== -1, out.innerHTML);
  assert('lang: FI status message in Finnish', getEl('status').textContent.indexOf('Valmis') !== -1, getEl('status').textContent);
  assert('lang: tagline follows language', getEl('tagline').textContent.indexOf('osallistujamäärät') !== -1, getEl('tagline').textContent);
})().then(() => {
  console.log('karttatarpeet: ' + pass + ' passed, ' + fail + ' failed');
  if (fail) process.exit(1);
}).catch(e => { console.error('e2e fatal: ' + e.message); process.exit(1); });