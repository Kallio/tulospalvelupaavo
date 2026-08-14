const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/bibgenerator.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl(tag) {
  const q = {};
  const el = {
    tag, value: '', textContent: '', className: '', options: [], selectedIndex: 0,
    children: [], style: {}, files: [], _q: q, checked: false, disabled: false,
    dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
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
  querySelectorAll() { return []; },
  createElement: tag => makeEl(tag),
  body,
  addEventListener() {},
};
global.window = { history: { replaceState() {} }, location: { search: '' }, addEventListener() {}, print() {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.requestAnimationFrame = cb => cb();
global.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });

let threw = null;
try {
  eval(code + '; global.__p = { deepClone, parseCSV, parseTeams, parseRanges, sanitizeForBarcode, buildClassPrefixes, getFilteredEntries, getBarcodeValue, navLoadIndividual, navLoadRelay, navName, navTime, makePosDiv, createBib, esc, escA, sortTeams, getSponsor }; global.__state = { csvTeams: () => csvTeams, setCsvTeams: t => csvTeams = t, classPrefixMap: () => classPrefixMap, setClassPrefixMap: m => classPrefixMap = m, useClassPrefix: () => useClassPrefix, setUseClassPrefix: v => useClassPrefix = v, showBarcode: () => showBarcode, setShowBarcode: v => showBarcode = v, colorLegs: () => colorLegs, setColorLegs: v => colorLegs = v, showClub: () => showClub, setShowClub: v => showClub = v, sponsorLogos: () => sponsorLogos, setSponsorLogos: v => sponsorLogos = v, eventLogoSrc: () => eventLogoSrc, LEG_COLORS: () => LEG_COLORS, layout: () => layout };');
} catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }

let pass = 0, fail = 0;
const assert = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
};

const P = global.__p;
const S = global.__state;

// ── deepClone ──
const src = { a: 1, b: { c: [1, 2] } };
const cpy = P.deepClone(src);
assert('deepClone: equal + not same ref', JSON.stringify(cpy) === JSON.stringify(src) && cpy !== src && cpy.b !== src.b);

// ── parseCSV ──
assert('csv: simple', JSON.stringify(P.parseCSV('a,b\n1,2')) === JSON.stringify([['a', 'b'], ['1', '2']]));
assert('csv: quoted comma', JSON.stringify(P.parseCSV('"a,b",c\n')) === JSON.stringify([['a,b', 'c']]));
assert('csv: escaped quote', JSON.stringify(P.parseCSV('"say ""hi""",x')) === JSON.stringify([['say "hi"', 'x']]));
assert('csv: CRLF', JSON.stringify(P.parseCSV('a,b\r\nc,d\r\n')) === JSON.stringify([['a', 'b'], ['c', 'd']]));
assert('csv: quoted newline kept', JSON.stringify(P.parseCSV('"l1\nl2",x')) === JSON.stringify([['l1\nl2', 'x']]));
assert('csv: empty lines skipped', JSON.stringify(P.parseCSV('a\n\nb\n')) === JSON.stringify([['a'], ['b']]));
assert('csv: no trailing newline', JSON.stringify(P.parseCSV('a,b')) === JSON.stringify([['a', 'b']]));

// ── parseTeams ──
const header = ['Kilpailunumero', 'Sarja', 'Joukkueen nimi', 'Kansalaisuus', 'Seura', '', 'Nimi-1', 'Kilpailukortti-1', 'Lainakortti-1', 'Osuus-1', 'Alaosuus-1', 'Rata-1', 'Lähtöaika-1', '', 'Nimi-2', 'Kilpailukortti-2', 'Lainakortti-2', 'Osuus-2', 'Alaosuus-2', 'Rata-2', 'Lähtöaika-2', ''];
const t1 = ['101', 'Jukola', 'Piipsjärven Pihinä', 'FIN', 'Club A', '', 'Astra Hyvärinen', '12345', '', '1', '', 'A', '10:00:00', '', 'Anna Hyvärinen', '12346', '', '2', '', 'A', '', '', 'Ville Hyvärinen', '12347', '', '3', '', 'A', ''];
const t2 = ['102', 'Venlat', 'Luontaisesti vahvat', 'FIN', 'Club B', '', 'Leo Hyvärinen', '23456', '', '1', '', 'A', '10:01:00'];
const teams = P.parseTeams([header, t1, t2]);
assert('teams: two teams', teams.length === 2, String(teams.length));
assert('teams: fields', teams[0].kilpailunumero === '101' && teams[0].sarja === 'Jukola' && teams[0].joukkue === 'Piipsjärven Pihinä' && teams[0].seura === 'Club A');
assert('teams: runner blocks (base 6)', teams[0].runners[0].nimi === 'Astra Hyvärinen' && teams[0].runners[0].kilpailukortti === '12345' && teams[0].runners[0].osuus === '1' && teams[0].runners[0].rata === 'A' && teams[0].runners[0].lahtöaika === '10:00:00');
assert('teams: runner block 2 (base 14)', teams[0].runners[1].nimi === 'Anna Hyvärinen' && teams[0].runners[1].kilpailukortti === '12346' && teams[0].runners[1].osuus === '2');
assert('teams: runner block 3 (base 22)', teams[0].runners[2].nimi === 'Ville Hyvärinen' && teams[0].runners[2].osuus === '3');
assert('teams: second team one runner', teams[1].runners.length === 1 && teams[1].runners[0].nimi === 'Leo Hyvärinen');
assert('teams: empty rows skipped', P.parseTeams([header, ['', 'x']]).length === 0);
assert('teams: <2 rows → []', P.parseTeams([header]).length === 0 && P.parseTeams([]).length === 0);

// ── parseRanges ──
const r1 = P.parseRanges('1-5, 10, 20-30');
assert('ranges: 1-5,10,20-30', r1.has(1) && r1.has(5) && r1.has(10) && r1.has(20) && r1.has(30) && r1.size === 17, String(r1.size));
assert('ranges: empty → null', P.parseRanges('') === null && P.parseRanges('   ') === null);
assert('ranges: junk → empty set', P.parseRanges('abc').size === 0);
assert('ranges: single', P.parseRanges('3').has(3));
assert('ranges: descending range → empty', P.parseRanges('10-8').size === 0);

// ── sanitizeForBarcode ──
assert('barcode: strips space', P.sanitizeForBarcode('Espoon Suunta') === 'EspoonSuunta');
assert('barcode: strips non-ASCII', P.sanitizeForBarcode('Mäki') === 'Mki');
assert('barcode: "H 14" → H14', P.sanitizeForBarcode('H 14') === 'H14');
assert('barcode: strips punctuation', P.sanitizeForBarcode('A.B-C') === 'ABC');
assert('barcode: empty', P.sanitizeForBarcode('') === '');
assert('barcode: all junk', P.sanitizeForBarcode('---') === '');

// ── buildClassPrefixes ──
const bcp = P.buildClassPrefixes([
  { sarja: 'H21' }, { sarja: 'H21E' }, { sarja: 'D21' },
]);
assert('prefixes: H21 needs full', bcp.H21 === 'H21', bcp.H21);
assert('prefixes: H21E full', bcp.H21E === 'H21E', bcp.H21E);
assert('prefixes: D21 → D', bcp.D21 === 'D', bcp.D21);
assert('prefixes: single class → first char', P.buildClassPrefixes([{ sarja: 'H14' }]).H14 === 'H');
assert('prefixes: empty → {}', JSON.stringify(P.buildClassPrefixes([])) === '{}');

// ── getBarcodeValue ──
S.setClassPrefixMap({ H21: 'H21' });
const t101 = { kilpailunumero: '101', sarja: 'H21' };
assert('bc: single runner → prefix-num', P.getBarcodeValue(t101, { osuus: '', alaosuus: '' }) === 'H21-101', P.getBarcodeValue(t101, { osuus: '', alaosuus: '' }));
S.setClassPrefixMap({});
assert('bc: no prefix → num', P.getBarcodeValue(t101, { osuus: '', alaosuus: '' }) === '101');
S.setClassPrefixMap({ H21: 'H21' });
assert('bc: relay osuus', P.getBarcodeValue(t101, { osuus: '1', alaosuus: '' }) === 'H21-101-1');
assert('bc: alaosuus same as osuus → 2-part', P.getBarcodeValue(t101, { osuus: '1', alaosuus: '1' }) === 'H21-101-1');
assert('bc: alaosuus different → 3-part', P.getBarcodeValue(t101, { osuus: '1', alaosuus: '1A' }) === 'H21-101-1-1A', P.getBarcodeValue(t101, { osuus: '1', alaosuus: '1A' }));
assert('bc: no prefix relay', P.getBarcodeValue({ kilpailunumero: '101', sarja: '' }, { osuus: '2', alaosuus: '' }) === '101-2');

// ── getFilteredEntries ──
const ftTeams = [
  { kilpailunumero: '101', sarja: 'Jukola', runners: [
    { nimi: 'A', osuus: '1' }, { nimi: 'B', osuus: '2' }, { nimi: 'C', osuus: '' },
  ] },
  { kilpailunumero: '102', sarja: 'Venlat', runners: [{ nimi: 'D', osuus: '1' }] },
];
S.setCsvTeams(ftTeams);
getEl('filterNumbers').value = ''; getEl('filterParts').value = ''; getEl('filterSarja').value = '';
assert('entries: no filter → all 4', P.getFilteredEntries().length === 4, String(P.getFilteredEntries().length));
getEl('filterNumbers').value = '101';
assert('entries: number filter', P.getFilteredEntries().length === 3);
getEl('filterNumbers').value = '102';
assert('entries: other team', P.getFilteredEntries().length === 1 && P.getFilteredEntries()[0].team.kilpailunumero === '102');
getEl('filterNumbers').value = '';
getEl('filterParts').value = '2';
assert('entries: part filter keeps osuus 2 + unassigned', P.getFilteredEntries().length === 2 && P.getFilteredEntries().some(e => e.runner.nimi === 'B') && P.getFilteredEntries().some(e => e.runner.nimi === 'C'), P.getFilteredEntries().map(e => e.runner.nimi).join(','));
getEl('filterParts').value = '';
getEl('filterSarja').value = 'Venlat';
assert('entries: sarja filter', P.getFilteredEntries().length === 1 && P.getFilteredEntries()[0].team.kilpailunumero === '102');
getEl('filterSarja').value = '';

// ── navName / navTime ──
assert('navName: name preferred', P.navName({ name: ' Virtanen Eino ', surname: 'X', givenName: 'Y' }) === 'Virtanen Eino');
assert('navName: surname+givenName fallback', P.navName({ surname: 'Nurmo', givenName: 'Maija' }) === 'Nurmo Maija');
assert('navName: empty', P.navName({}) === '');
const tStart = new Date(2026, 7, 14, 8, 5);
assert('navTime: fi-FI HH.MM', P.navTime({ startTime: tStart.toISOString() }) === '08.05', P.navTime({ startTime: tStart.toISOString() }));
assert('navTime: no startTime → ""', P.navTime({}) === '');

// ── navLoadIndividual ──
const indJson = {
  courseClasses: [{ id: 'c1', name: 'H21' }],
  results: [
    { bibNumber: 103, classId: 'c1', surname: 'Nurmo', givenName: 'Maija', chip: '' },
    { bibNumber: null, name: 'skip me' },
    { bibNumber: 102, resultType: 'Team', name: 'Team', club: 'X' },
    { bibNumber: 101, classId: 'c1', name: 'Virtanen Eino', club: 'ES', chip: '111', startTime: tStart.toISOString() },
  ],
};
P.navLoadIndividual(indJson);
const ind = S.csvTeams();
assert('individual: Team + null-bib skipped', ind.length === 2, String(ind.length));
assert('individual: sorted by bib', ind[0].kilpailunumero === '101' && ind[1].kilpailunumero === '103', ind.map(t => t.kilpailunumero).join(','));
assert('individual: fields', ind[0].sarja === 'H21' && ind[0].joukkue === 'ES' && ind[0].seura === 'ES');
assert('individual: single runner, no osuus', ind[0].runners.length === 1 && ind[0].runners[0].nimi === 'Virtanen Eino' && ind[0].runners[0].kilpailukortti === '111' && ind[0].runners[0].osuus === '');
assert('individual: name fallback as joukkue', ind[1].joukkue === 'Nurmo Maija' && ind[1].runners[0].nimi === 'Nurmo Maija');
assert('individual: start time formatted', ind[0].runners[0].lahtöaika === '08.05', ind[0].runners[0].lahtöaika);

// ── navLoadRelay: legacy shape ──
const relayLegacy = {
  courseClasses: [{ id: 'c1', name: 'Miehet' }],
  results: [
    { resultType: 'Individual', bibNumber: 101, name: 'Astra Hyvärinen', club: 'Club A', leg: 1, classId: 'c1' },
    { resultType: 'Individual', bibNumber: 101, name: 'Anna Hyvärinen', club: 'Club A', leg: 2, classId: 'c1' },
    { resultType: 'Individual', bibNumber: 102, name: 'Leo Hyvärinen', club: 'Club B', leg: 1, classId: 'c1' },
  ],
};
P.navLoadRelay(relayLegacy);
const rel = S.csvTeams();
assert('relay legacy: two teams', rel.length === 2, String(rel.length));
assert('relay legacy: runners sorted by leg', rel[0].runners.map(r => r.osuus).join(',') === '1,2', rel[0].runners.map(r => r.osuus).join(','));
assert('relay legacy: team meta', rel[0].kilpailunumero === '101' && rel[0].joukkue === 'Club A' && rel[0].sarja === 'Miehet');
assert('relay legacy: runner osuus string', rel[0].runners[0].osuus === '1' && rel[0].runners[1].osuus === '2');

// ── navLoadRelay: parent/child shape ──
const relayParent = {
  courseClasses: [{ id: 'c1', name: 'Miehet' }, { id: 'c2', name: 'Naisten' }],
  results: [
    { resultType: 'Team', id: 't1', bibNumber: 101, name: 'Team A', classId: 'c1' },
    { resultType: 'Individual', parentId: 't1', name: 'Astra Hyvärinen', leg: 1, club: 'Club A', classId: 'c2' },
    { resultType: 'Individual', parentId: 't1', name: 'Anna Hyvärinen', leg: 2 },
    { resultType: 'Individual', bibNumber: 201, name: 'Ville Hyvärinen', leg: 1, club: 'Club B' },
  ],
};
P.navLoadRelay(relayParent);
const rel2 = S.csvTeams();
assert('relay parent: bib from Team row', rel2.length === 2 && rel2[0].kilpailunumero === '101' && rel2[1].kilpailunumero === '201', rel2.map(t => t.kilpailunumero).join(','));
const teamA = rel2.find(t => t.kilpailunumero === '101');
assert('relay parent: team name from parent', teamA.joukkue === 'Team A');
assert('relay parent: sarja from runner classId', teamA.sarja === 'Naisten', teamA.sarja);
assert('relay parent: two runners sorted', teamA.runners.length === 2 && teamA.runners.map(r => r.osuus).join(',') === '1,2');
assert('relay parent: standalone runner gets own club', rel2.find(t => t.kilpailunumero === '201').joukkue === 'Club B');

// ── makePosDiv ──
const d1 = P.makePosDiv(S.layout(), 'numberArea');
assert('makePosDiv: position + size', d1.dataset.lk === 'numberArea' && d1.style.left === '50%' && d1.style.top === '25%' && d1.style.width === '90%' && d1.style.fontSize === '42mm');
const d2 = P.makePosDiv(S.layout(), 'runnerInfo');
assert('makePosDiv: flipped', d2.style.transform.includes('rotate(180deg)'));
const d3 = P.makePosDiv({ hidden: { hidden: true, cx: 50, y: 5 } }, 'hidden');
assert('makePosDiv: hidden flag', d3.dataset.hidden === 'true');
assert('makePosDiv: extra style merge', P.makePosDiv(S.layout(), 'numberArea', { background: 'red' }).style.background === 'red');

// ── createBib smoke (relay runner) ──
const card = P.createBib({ kilpailunumero: '101', sarja: 'H21', joukkue: 'Team A' }, { nimi: 'Astra', osuus: '1', alaosuus: '', rata: '', lahtöaika: '' });
assert('createBib: card class', card.className.includes('bib-card'));
const numArea = card.children.find(c => c.dataset.lk === 'numberArea');
assert('createBib: leg color applied', numArea && numArea.style.background === '#FFF59D');
const bcDiv = card.children.find(c => c.dataset.lk === 'barcode');
assert('createBib: barcode data-val', bcDiv && bcDiv.innerHTML.includes('data-val="H21-101-1"'), bcDiv && bcDiv.innerHTML);
assert('createBib: teamInfo for relay', card.children.some(c => c.dataset.lk === 'teamInfo'));

// single runner: no leg color, runnerInfo present, no teamInfo
S.setClassPrefixMap({ H21: 'H21' });
const card2 = P.createBib({ kilpailunumero: '101', sarja: 'H21', joukkue: 'Team A' }, { nimi: 'Astra', osuus: '', alaosuus: '', rata: '', lahtöaika: '' });
const numArea2 = card2.children.find(c => c.dataset.lk === 'numberArea');
assert('createBib single: no leg color', numArea2.style.background === '' || numArea2.style.background === undefined);
assert('createBib single: runnerInfo', card2.children.some(c => c.dataset.lk === 'runnerInfo'));
assert('createBib single: no teamInfo', !card2.children.some(c => c.dataset.lk === 'teamInfo'));
assert('createBib single: barcode no leg suffix', card2.children.find(c => c.dataset.lk === 'barcode').innerHTML.includes('data-val="H21-101"'));

// esc / escA
assert('esc: basic', typeof P.esc('x') === 'string');
assert('escA: quotes escaped', P.escA('a"b') === 'a&quot;b');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
