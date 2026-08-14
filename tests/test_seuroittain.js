const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/seuroittain.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl(tag) {
  const q = {};
  const el = {
    tag, value: '', textContent: '', className: '', options: [], selectedIndex: 0,
    children: [], style: {}, files: [], _q: q, checked: false, disabled: false,
    dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    append(...args) { this.children.push(...args); },
    prepend(c) { this.children.unshift(c); },
    addEventListener() {}, remove() {}, removeChild() {}, select() {},
    querySelector(sel) { if (!q[sel]) q[sel] = makeEl(sel); return q[sel]; },
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
  querySelector(sel) { return makeEl(sel); },
  querySelectorAll() { return []; },
  createElement: tag => makeEl(tag),
  body,
  addEventListener() {},
};
global.location = { search: '', href: 'http://localhost/seuroittain.html', pathname: '/seuroittain.html', origin: 'http://localhost' };
global.window = { history: { replaceState() {} }, location: global.location };
global.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
global.Blob = class Blob { constructor(parts, opts) { this.parts = parts; this.opts = opts; } };
global.URL = { createObjectURL() { return 'blob:fake'; }, revokeObjectURL() {} };
global.setInterval = () => 0;

let threw = null;
try {
  eval(code + '; global.__p = { parseName, parseStartTime, formatTime, parseDurationToSeconds, formatSeconds, mapResultsWithClubs, loadClubs, prepareRows, prepareRowsMultistage, rowsToCsv, normalize, makeKey, stageResultsCount, showValue }; global.__state = { rows: () => rows, setRows: r => rows = r, clubsCache: () => clubsCache, setClubsCache: c => clubsCache = c, rawData: () => rawData, setRawData: r => rawData = r, stageCount: () => stageCount, setStageCount: n => stageCount = n, selectedClass: () => selectedClass, setSelectedClass: c => selectedClass = c, filterTop: () => filterTop, setFilterTop: f => filterTop = f, sortState: () => sortState, setSortState: s => sortState = s };');
} catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }

let pass = 0, fail = 0;
const assert = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
};

const P = global.__p;
const S = global.__state;

// ── parseName ──
assert('parseName: "Virtanen Eino"', JSON.stringify(P.parseName('Virtanen Eino')) === JSON.stringify({ surname: 'Virtanen', givenName: 'Eino' }));
assert('parseName: single word', JSON.stringify(P.parseName('Virtanen')) === JSON.stringify({ surname: 'Virtanen', givenName: '' }));
assert('parseName: multi-part given name', JSON.stringify(P.parseName('Virtanen Maija-Stiina')) === JSON.stringify({ surname: 'Virtanen', givenName: 'Maija-Stiina' }));
assert('parseName: empty', JSON.stringify(P.parseName('')) === JSON.stringify({ surname: '', givenName: '' }));
assert('parseName: null', JSON.stringify(P.parseName(null)) === JSON.stringify({ surname: '', givenName: '' }));
assert('parseName: trims', JSON.stringify(P.parseName('  Virtanen Eino  ')) === JSON.stringify({ surname: 'Virtanen', givenName: 'Eino' }));

// ── parseStartTime (regex is `^(\d{1,2}).:$` — only matches "H?" malformed strings) ──
const begin = new Date(2026, 7, 14, 8, 0);
assert('parseStartTime: "10:30" → null (no match)', P.parseStartTime('10:30', begin) === null);
assert('parseStartTime: no eventBegin → null', P.parseStartTime('10:30', null) === null);
assert('parseStartTime: empty → null', P.parseStartTime('', begin) === null);
assert('parseStartTime: "12:5" → invalid date (regex quirk)', P.parseStartTime('12:5', begin) === null || Number.isNaN(P.parseStartTime('12:5', begin).getTime()));

// ── formatTime ──
assert('formatTime: local 20:05', P.formatTime(new Date(2026, 7, 14, 20, 5)) === '20:05', P.formatTime(new Date(2026, 7, 14, 20, 5)));
assert('formatTime: null → ""', P.formatTime(null) === '');
assert('formatTime: falsy 0 → ""', P.formatTime(0) === '');

// ── parseDurationToSeconds ──
assert('dur: "10:30" → 630', P.parseDurationToSeconds('10:30') === 630);
assert('dur: "1:02:03" → 3723', P.parseDurationToSeconds('1:02:03') === 3723);
assert('dur: number 630 → 630', P.parseDurationToSeconds(630) === 630);
assert('dur: "30" → 30', P.parseDurationToSeconds('30') === 30);
assert('dur: " 12:00 " trims → 720', P.parseDurationToSeconds(' 12:00 ') === 720);
assert('dur: "" → null', P.parseDurationToSeconds('') === null);
assert('dur: null → null', P.parseDurationToSeconds(null) === null);
assert('dur: "abc" → null', P.parseDurationToSeconds('abc') === null);
assert('dur: "NaN" → null', P.parseDurationToSeconds('NaN') === null);
assert('dur: Infinity number → null', P.parseDurationToSeconds(Infinity) === null);

// ── formatSeconds ──
assert('fmt: 630 → 10:30', P.formatSeconds(630) === '10:30', P.formatSeconds(630));
assert('fmt: 59 → 00:59', P.formatSeconds(59) === '00:59');
assert('fmt: 0 → 00:00', P.formatSeconds(0) === '00:00');
assert('fmt: 3601 → 01:00:01', P.formatSeconds(3601) === '01:00:01', P.formatSeconds(3601));
assert('fmt: rounds 630.6 → 10:31', P.formatSeconds(630.6) === '10:31');
assert('fmt: null → ""', P.formatSeconds(null) === '');
assert('fmt: Infinity → ""', P.formatSeconds(Infinity) === '');

// ── normalize / showValue ──
assert('normalize: strips non-alpha', P.normalize('Espoon Suunta 2') === 'espoonsuunta2');
assert('normalize: keeps åäö', P.normalize('ÅÄÖ') === 'åäö');
assert('showValue: empty → -', P.showValue('') === '-');
assert('showValue: null → -', P.showValue(null) === '-');
assert('showValue: 0 → 0', P.showValue(0) === 0);
assert('showValue: value passes', P.showValue('x') === 'x');

// ── makeKey / stageResultsCount ──
assert('makeKey: bib||chip||name', P.makeKey({ bibNumber: 7, chip: '111', name: 'Virtanen Eino' }) === '7||111||virtanen eino');
assert('stageResultsCount: 2 stages', P.stageResultsCount([1, 2]) === 2);
assert('stageResultsCount: empty → 1', P.stageResultsCount([]) === 1);

// ── prepareRows (single-stage) ──
const single = {
  results: [
    { name: 'Virtanen Eino', className: 'H14', resultTime: '10:30', status: 'Ok', rank: 2, bibNumber: 7, chip: '111', club: 'ES', startTime: '2026-08-14T10:00:00Z' },
    { name: 'Nurmo Maija', className: 'H14', resultTime: '12:00', status: 'Ok', rank: 3 },
    { name: 'Kallio Aino', className: 'H14', resultTime: '10:30', status: 'DNS', rank: 1 },
    { name: 'Laine Pekka', classId: 'c1', resultTime: 500, status: 'Ok' },
    { name: 'Seppä Juha', className: 'H16', result: { time: '8:00', rank: 4 }, status: 'Ok' },
  ],
};
const mainCourseClasses = { c1: 'H14' };
P.prepareRows(single, mainCourseClasses);
const pRows = S.rows();
assert('prepareRows: 5 rows', pRows.length === 5, String(pRows.length));
assert('prepareRows: name split', pRows[0].surname === 'Virtanen' && pRows[0].givenName === 'Eino');
assert('prepareRows: classId fallback', pRows[3].className === 'H14');
assert('prepareRows: time parsed', pRows[0].totalSeconds === 630 && pRows[0].totalTime === '10:30' && pRows[0].stageSeconds[0] === 630 && pRows[0].stageTimes[0] === '10:30');
assert('prepareRows: numeric raw time', pRows[3].totalSeconds === 500 && pRows[3].stageTimes[0] === '08:20');
assert('prepareRows: result.time fallback', pRows[4].totalSeconds === 480 && pRows[4].stageTimes[0] === '08:00');
assert('prepareRows: bib/chip/club kept', pRows[0].bibNumber === 7 && pRows[0].chip === '111' && pRows[0].club === 'ES');
assert('prepareRows: start time formatted', pRows[0].startTimes[0] === '10:00', pRows[0].startTimes[0]);
assert('prepareRows: rank only when Ok', pRows[2].resultRank === '' && pRows[2].status === 'DNS');
assert('prepareRows: class ranking (500,630,720) → 1,2,3', pRows[3].resultRank === 1 && pRows[0].resultRank === 2 && pRows[1].resultRank === 3, pRows.map(r => r.resultRank).join(','));
assert('prepareRows: rank classes', pRows[3].resultRankClass === 'rank-1' && pRows[0].resultRankClass === 'rank-2' && pRows[1].resultRankClass === 'rank-3');
assert('prepareRows: stageRankClass[0] set', pRows[0].stageRankClass[0] === 'rank-2');
assert('prepareRows: existing stageRank kept', pRows[0].stageRanks[0] === 2 && pRows[4].stageRanks[0] === 4, pRows[0].stageRanks[0] + ',' + pRows[4].stageRanks[0]);
assert('prepareRows: empty stageRank filled', pRows[3].stageRanks[0] === 1);
assert('prepareRows: DNS excluded from ranking', pRows[2].resultRankClass === '');

// ── rowsToCsv ──
const csv = P.rowsToCsv(pRows);
const csvLines = csv.split('\n');
assert('csv: header', csvLines[0] === 'Sarja luokka,Lähtö 1,Aika 1,Sija 1,Tila 1,Nro,Emit,Sukunimi,Etunimi,Seura,Yhteisaika,Yhteissija,Tila', csvLines[0]);
assert('csv: data row', csvLines[1] === 'H14,10:00,10:30,2,Ok,7,111,Virtanen,Eino,ES,10:30,2,Ok', csvLines[1]);
assert('csv: escape quotes', P.rowsToCsv([{ className: 'H14', startTimes: [''], stageTimes: [''], stageRanks: [''], stageStatuses: ['Ok'], bibNumber: '', chip: '', surname: 'A"B', givenName: 'C,D', club: '', totalTime: '', resultRank: '', status: '' }]).split('\n')[1] === 'H14,,,,Ok,,,"A""B","C,D",,,,', P.rowsToCsv([{ className: 'H14', startTimes: [''], stageTimes: [''], stageRanks: [''], stageStatuses: ['Ok'], bibNumber: '', chip: '', surname: 'A"B', givenName: 'C,D', club: '', totalTime: '', resultRank: '', status: '' }]).split('\n')[1]);

// ── mapResultsWithClubs ──
(async () => {
  S.setClubsCache([{ abbreviation: 'ES', name: 'Espoon Suunta' }, { abbreviation: 'JRV', name: 'Jämsän Retki-Veikot' }]);
  const mapped = await P.mapResultsWithClubs([
    { club: 'es', abbreviation: 'x', name: 'A' },
    { club: 'Jämsän Retki-Veikot', name: 'B' },
    { club: 'Tuntematon', abbreviation: 'T' },
  ]);
  assert('mapClubs: abbreviation matched', mapped[0].club === 'Espoon Suunta' && mapped[0].abbreviation === 'Espoon Suunta');
  assert('mapClubs: full name matched', mapped[1].club === 'Jämsän Retki-Veikot');
  assert('mapClubs: unknown club unchanged', mapped[2].club === 'Tuntematon' && mapped[2].abbreviation === 'T');

  S.setClubsCache([]);
  const unmapped = await P.mapResultsWithClubs([{ club: 'es', name: 'A' }]);
  assert('mapClubs: empty cache → unchanged', unmapped[0].club === 'es');

  S.setClubsCache(null);
  const fetched = await P.mapResultsWithClubs([{ club: 'ES', name: 'A' }]);
  assert('mapClubs: fetch 404 → unchanged + cache []', fetched[0].club === 'ES' && S.clubsCache().length === 0);
  assert('loadClubs: returns cache', Array.isArray(await P.loadClubs()) && S.clubsCache().length === 0);

  // ── prepareRowsMultistage (2 stages) ──
  S.setRawData(null);
  S.setStageCount(2);
  const stages = [
    { stageNumber: 1, results: [
      { id: 101, bibNumber: 101, name: 'Virtanen Eino', className: 'H14', resultTime: '10:00', status: 'Ok' },
      { id: 102, bibNumber: 102, name: 'Nurmo Maija', className: 'H14', resultTime: '12:00', status: 'Ok' },
      { id: 103, bibNumber: 103, name: 'Kallio Aino', className: 'H14', resultTime: '9:00', status: 'Ok' },
    ] },
    { stageNumber: 2, results: [
      { id: 101, bibNumber: 101, name: 'Virtanen Eino', className: 'H14', resultTime: '9:30', status: 'Ok' },
      { id: 102, bibNumber: 102, name: 'Nurmo Maija', className: 'H14', resultTime: '8:30', status: 'Ok' },
    ] },
  ];
  P.prepareRowsMultistage(stages, {});
  const ms = S.rows();
  const r101 = ms.find(r => r.bibNumber === 101);
  const r102 = ms.find(r => r.bibNumber === 102);
  const r103 = ms.find(r => r.bibNumber === 103);
  assert('multistage: 3 rows', ms.length === 3, String(ms.length));
  assert('multistage: stage seconds', JSON.stringify(r101.stageSeconds) === '[600,570]', JSON.stringify(r101.stageSeconds));
  assert('multistage: totals only when all stages OK', r101.totalSeconds === 1170 && r101.totalTime === '19:30' && r101.status === 'Ok | Ok', JSON.stringify({ ts: r101.totalSeconds, tt: r101.totalTime, st: r101.status }));
  assert('multistage: 102 total', r102.totalSeconds === 1230 && r102.totalTime === '20:30', r102.totalTime);
  assert('multistage: 103 no total (missing stage)', r103.totalSeconds === null && r103.resultRank === '', JSON.stringify({ ts: r103.totalSeconds, tt: r103.totalTime, st: r103.status }));
  assert('multistage: 103 partial time shown', r103.totalTime === '09:00 | ', r103.totalTime);
  assert('multistage: stage ranks stage0 (9:00,10:00,12:00)', r103.stageRanks[0] === 1 && r101.stageRanks[0] === 2 && r102.stageRanks[0] === 3, r103.stageRanks.join(','));
  assert('multistage: stage ranks stage1 (8:30,9:30)', r102.stageRanks[1] === 1 && r101.stageRanks[1] === 2, r101.stageRanks.join(','));
  assert('multistage: stage rank classes', r101.stageRankClass[0] === 'rank-2' && r101.stageRankClass[1] === 'rank-2');
  assert('multistage: total ranks 101,102', r101.resultRank === 1 && r102.resultRank === 2, r101.resultRank + ',' + r102.resultRank);
  assert('multistage: 103 stageRankClass[1] empty', r103.stageRankClass[1] === '' || r103.stageRankClass[1] === undefined);

  // main-event total merge (by id)
  S.setRawData({ results: [{ id: 101, resultTime: '20:00', status: 'Ok', rank: 5 }] });
  P.prepareRowsMultistage(stages, {});
  const r101m = S.rows().find(r => r.bibNumber === 101);
  assert('multistage: main totals merged by id', r101m.totalSeconds === 1200 && r101m.totalTime === '20:00' && r101m.status === 'Ok', JSON.stringify({ ts: r101m.totalSeconds, tt: r101m.totalTime, st: r101m.status }));
  assert('multistage: merged total re-ranked', r101m.resultRank === 1);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
