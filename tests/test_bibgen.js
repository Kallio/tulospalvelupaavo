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
    addEventListener() {}, remove() {}, removeChild() {}, select() {}, click() {},
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
const created = [];
global.document = {
  getElementById: getEl,
  querySelectorAll() { return []; },
  createElement: tag => { const el = makeEl(tag); created.push(el); return el; },
  body,
  addEventListener() {},
};
global.window = { history: { replaceState() {} }, location: { search: '' }, addEventListener() {}, print() {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.requestAnimationFrame = cb => cb();
global.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL() {} };

let threw = null;
try {
  eval(code + '; global.__p = { deepClone, parseCSV, parseTeams, parseRanges, sanitizeForBarcode, buildClassPrefixes, getFilteredEntries, getBarcodeValue, navLoadIndividual, navLoadRelay, navName, navTime, makePosDiv, createBib, esc, escA, sortTeams, SPONSOR_SLOT, ensureSponsorSlots, sponsorApplies, orderZ, setPos, mimeToExt, dataURLInfo, sanitizeFileName, buildBundleContent, exportBundle, extToMime, parseBundle, applyImportedBundle, importBundleFromZip, applyStateData, buildStateData, applyPos }; global.__state = { csvTeams: () => csvTeams, setCsvTeams: t => csvTeams = t, rawCsvText: () => rawCsvText, setRawCsvText: v => rawCsvText = v, classPrefixMap: () => classPrefixMap, setClassPrefixMap: m => classPrefixMap = m, useClassPrefix: () => useClassPrefix, setUseClassPrefix: v => useClassPrefix = v, showBarcode: () => showBarcode, setShowBarcode: v => showBarcode = v, colorLegs: () => colorLegs, setColorLegs: v => colorLegs = v, showClub: () => showClub, setShowClub: v => showClub = v, showStickerName: () => showStickerName, setShowStickerName: v => showStickerName = v, sponsorLogos: () => sponsorLogos, setSponsorLogos: v => sponsorLogos = v, eventLogoSrc: () => eventLogoSrc, setEventLogoSrc: v => eventLogoSrc = v, eventLogoName: () => eventLogoName, setEventLogoName: v => eventLogoName = v, customFont: () => customFont, setCustomFont: v => customFont = v, stickerLayout: () => stickerLayout, stickerGroupPos: () => stickerGroupPos, setStickerGroupPos: v => stickerGroupPos = v, stickerConfig: () => stickerConfig, setStickerConfig: v => stickerConfig = v,   LEG_COLORS: () => LEG_COLORS, layout: () => layout, setLayout: l => layout = l, setSelected: (k, r) => { selectedKey = k; selectedRef = r; } };');
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

// ── sponsor slots: one layout slot per sponsor logo ──
const dA = 'data:image/png;base64,QUE=', dB = 'data:image/png;base64,QkI=', dC = 'data:image/png;base64,Q0M=';
S.setSponsorLogos([
  { src: dA, name: 'a.png', parts: null },
  { src: dB, name: 'b.png', parts: null },
  { src: dC, name: 'c.png', parts: new Set(['2']) },
]);
assert('sponsorSlot: index keys', P.SPONSOR_SLOT(0) === 'sponsorLogo' && P.SPONSOR_SLOT(1) === 'sponsorLogo2' && P.SPONSOR_SLOT(2) === 'sponsorLogo3');
assert('sponsorApplies: default fits any leg', P.sponsorApplies({ parts: null }, '2') && P.sponsorApplies({ parts: null }, ''));
assert('sponsorApplies: leg filter', P.sponsorApplies({ parts: new Set(['1']) }, '1') && !P.sponsorApplies({ parts: new Set(['1']) }, '2') && !P.sponsorApplies({ parts: new Set(['1']) }, ''));

// Legacy saved layouts contain only the first slot — it must be left untouched,
// missing slots stack below it (y = prev.y + prev.h + 1).
S.setLayout(Object.assign(P.deepClone(S.layout()), { sponsorLogo: { cx: 20, y: 60, w: 30, h: 10 } }));
P.ensureSponsorSlots();
let L = S.layout();
assert('slots: legacy slot untouched', L.sponsorLogo.cx === 20 && L.sponsorLogo.y === 60);
assert('slots: new slots stacked', L.sponsorLogo2 && L.sponsorLogo2.y === 71 && L.sponsorLogo3 && L.sponsorLogo3.y === 82, JSON.stringify([L.sponsorLogo2, L.sponsorLogo3]));
P.ensureSponsorSlots();
assert('slots: idempotent', S.layout().sponsorLogo2.y === 71);

// createBib renders one positioned img per applicable sponsor
const cardLeg2 = P.createBib({ kilpailunumero: '101', sarja: '', joukkue: 'T' }, { nimi: 'x', osuus: '2', alaosuus: '', rata: '', lahtöaika: '' });
const sl2 = cardLeg2.children.filter(c => c.dataset.lk && String(c.dataset.lk).startsWith('sponsorLogo'));
assert('createBib: all applicable sponsors on matching leg', sl2.length === 3 && sl2.map(c => c.dataset.lk).join(',') === 'sponsorLogo,sponsorLogo2,sponsorLogo3', JSON.stringify(sl2.map(c => c.dataset.lk)));
assert('createBib: per-slot srcs', sl2[0].innerHTML.includes(dA) && sl2[1].innerHTML.includes(dB) && sl2[2].innerHTML.includes(dC));
const cardLeg1 = P.createBib({ kilpailunumero: '101', sarja: '', joukkue: 'T' }, { nimi: 'x', osuus: '1', alaosuus: '', rata: '', lahtöaika: '' });
const sl1 = cardLeg1.children.filter(c => c.dataset.lk && String(c.dataset.lk).startsWith('sponsorLogo'));
assert('createBib: leg-specific skipped on other legs', sl1.length === 2 && sl1.every(c => c.innerHTML !== dC) && !sl1.some(c => c.innerHTML.includes(dC)));

// bundle round-trip keeps extra sponsor slots
S.setSponsorLogos([{ src: dA, name: 'a.png', parts: null }, { src: dB, name: 'b.png', parts: null }]);
const bcSlots = P.buildBundleContent();
const rtSlotFiles = Object.fromEntries(bcSlots.files.map(v => [v.path, v.text !== undefined ? { text: v.text } : { base64: v.base64 }]));
P.applyImportedBundle(P.parseBundle(rtSlotFiles));
assert('bundle: sponsor slots survive round-trip', S.layout().sponsorLogo2 && S.layout().sponsorLogo3 && S.sponsorLogos().length === 2, JSON.stringify(S.layout()));

// ── toolbar: editable position + stacking order ──
S.setSelected('sponsorLogo2', S.layout().sponsorLogo2);
P.setPos('cx', '123');
assert('setPos: cx clamped to 100', S.layout().sponsorLogo2.cx === 100, String(S.layout().sponsorLogo2.cx));
P.setPos('y', '-5');
assert('setPos: y clamped to 0', S.layout().sponsorLogo2.y === 0, String(S.layout().sponsorLogo2.y));
P.setPos('cx', '33.3'); P.setPos('y', '44.4');
assert('setPos: writes parsed values', S.layout().sponsorLogo2.cx === 33.3 && S.layout().sponsorLogo2.y === 44.4);
P.setPos('cx', 'junk');
assert('setPos: junk ignored', S.layout().sponsorLogo2.cx === 33.3);

S.layout().sponsorLogo2.z = 7;
const zd = P.makePosDiv(S.layout(), 'sponsorLogo2');
assert('makePosDiv: z applied', String(zd.style.zIndex) === '7', String(zd.style.zIndex));
delete S.layout().sponsorLogo2.z;
P.applyPos(zd, 'sponsorLogo2');
assert('applyPos: z cleared when missing', zd.style.zIndex === '', String(zd.style.zIndex));

// orderZ math — DOM stub querySelectorAll returns [], so the baseline is [0]
P.orderZ('front');
assert('orderZ: front above baseline', S.layout().sponsorLogo2.z === 1, String(S.layout().sponsorLogo2.z));
P.orderZ('front');
assert('orderZ: repeated front keeps rising', S.layout().sponsorLogo2.z === 2, String(S.layout().sponsorLogo2.z));
P.orderZ('back');
assert('orderZ: back below baseline', S.layout().sponsorLogo2.z === -1, String(S.layout().sponsorLogo2.z));

// z persists through the bundle round-trip
S.layout().sponsorLogo2.z = 5;
const bcZ = P.buildBundleContent();
const rtZFiles = Object.fromEntries(bcZ.files.map(v => [v.path, v.text !== undefined ? { text: v.text } : { base64: v.base64 }]));
P.applyImportedBundle(P.parseBundle(rtZFiles));
assert('bundle: z survives round-trip', S.layout().sponsorLogo2 && S.layout().sponsorLogo2.z === 5, JSON.stringify(S.layout().sponsorLogo2));

// esc / escA
assert('esc: basic', typeof P.esc('x') === 'string');
assert('escA: quotes escaped', P.escA('a"b') === 'a&quot;b');

// ── HTML: bundle feature present ──
assert('html: JSZip CDN script tag', /jszip/i.test(html), 'no JSZip tag');
assert('html: Download ZIP button', html.includes('onclick="exportBundle()"'));

// ── mimeToExt ──
assert('mimeToExt: png', P.mimeToExt('image/png') === 'png');
assert('mimeToExt: jpeg', P.mimeToExt('image/jpeg') === 'jpg');
assert('mimeToExt: svg', P.mimeToExt('image/svg+xml') === 'svg');
assert('mimeToExt: webp/gif/bmp/avif', P.mimeToExt('image/webp') === 'webp' && P.mimeToExt('image/gif') === 'gif' && P.mimeToExt('image/bmp') === 'bmp' && P.mimeToExt('image/avif') === 'avif');
assert('mimeToExt: unknown → bin', P.mimeToExt('application/pdf') === 'bin' && P.mimeToExt('') === 'bin');

// ── dataURLInfo ──
const dPng = 'data:image/png;base64,aGVsbG8=';
const dSvg = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
assert('dataURLInfo: png', P.dataURLInfo(dPng).mime === 'image/png' && P.dataURLInfo(dPng).ext === 'png' && P.dataURLInfo(dPng).base64 === 'aGVsbG8=');
assert('dataURLInfo: svg ext', P.dataURLInfo(dSvg).ext === 'svg');
assert('dataURLInfo: non-data URL → null', P.dataURLInfo('https://x/y.png') === null);
assert('dataURLInfo: non-base64 data → null', P.dataURLInfo('data:text/plain,hello') === null);
assert('dataURLInfo: non-string → null', P.dataURLInfo(null) === null && P.dataURLInfo(undefined) === null);

// ── sanitizeFileName ──
assert('sanitizeFileName: strips slashes/spaces', P.sanitizeFileName('a/b\\c:d.png', 'x', 'png') === 'a_b_c_d.png');
assert('sanitizeFileName: empty → fallback', P.sanitizeFileName('', 'event-logo', 'png') === 'event-logo.png');
assert('sanitizeFileName: missing ext appended', P.sanitizeFileName('logo', 'x', 'jpg') === 'logo.jpg');
assert('sanitizeFileName: keeps existing ext', P.sanitizeFileName('logo.svg', 'x', 'jpg') === 'logo.svg');

// ── buildBundleContent: empty state ──
S.setEventLogoSrc(null); S.setSponsorLogos([]); S.setCustomFont(null);
const bc0 = P.buildBundleContent();
assert('bundle: file list = 2 layouts + data + manifest', bc0.files.length === 4, String(bc0.files.length));
assert('bundle: data.json present', bc0.files.some(f => f.path === 'data.json'));
assert('bundle: bib-layout.json text matches layout', bc0.files.find(f => f.path === 'bib-layout.json').text === JSON.stringify(S.layout(), null, 2));
assert('bundle: sticker-layout.json text matches bundle', bc0.files.find(f => f.path === 'sticker-layout.json').text === JSON.stringify({ template: S.stickerLayout(), groupPos: S.stickerGroupPos() }, null, 2));
assert('bundle: empty images + no font', JSON.stringify(bc0.manifest.images) === '[]' && bc0.manifest.font === null);
assert('bundle: manifest layouts', JSON.stringify(bc0.manifest.layouts) === '["bib-layout.json","sticker-layout.json"]');
assert('bundle: manifest exportedAt ISO', /^\d{4}-\d{2}-\d{2}T/.test(bc0.manifest.exportedAt), bc0.manifest.exportedAt);
assert('bundle: generator', bc0.manifest.generator === 'bibgenerator.html');

// ── buildBundleContent: with event logo + sponsors ──
S.setEventLogoSrc(dPng); S.setEventLogoName('my logo.png');
S.setSponsorLogos([
  { src: dSvg, name: 'sponsor-a.svg', parts: new Set(['1', '2']) },
  { src: dPng, name: '', parts: null },
]);
const bc1 = P.buildBundleContent();
const bc1Paths = bc1.files.map(f => f.path);
assert('bundle: event logo file', bc1Paths.includes('images/my_logo.png'), JSON.stringify(bc1Paths));
const ev = bc1.files.find(f => f.path === 'images/my_logo.png');
assert('bundle: event logo is base64 entry', ev.base64 === 'aGVsbG8=' && ev.opts && ev.opts.base64 === true);
assert('bundle: sponsor named file', bc1Paths.includes('images/sponsor-a.svg'));
assert('bundle: sponsor unnamed fallback', bc1Paths.includes('images/sponsor-2.png'));
const sp = bc1.files.find(f => f.path === 'images/sponsor-a.svg');
assert('bundle: sponsor svg base64', sp.base64 === 'PHN2Zz48L3N2Zz4=');
const evM = bc1.manifest.images.find(i => i.role === 'event-logo');
const spM = bc1.manifest.images.find(i => i.role === 'sponsor' && i.file === 'images/sponsor-a.svg');
const spM2 = bc1.manifest.images.find(i => i.role === 'sponsor' && i.file === 'images/sponsor-2.png');
assert('bundle: manifest event-logo role', evM && evM.file === 'images/my_logo.png');
assert('bundle: manifest sponsor parts array', spM && JSON.stringify(spM.parts) === '["1","2"]');
assert('bundle: manifest default sponsor parts []', spM2 && JSON.stringify(spM2.parts) === '[]');

// ── buildBundleContent: with custom font ──
S.setCustomFont({ fileName: 'Fancy Font.ttf', family: 'Fancy_Font', src: 'data:font/ttf;base64,dGZmb250' });
const bc2 = P.buildBundleContent();
assert('bundle: font file added', bc2.files.some(f => f.path === 'fonts/Fancy_Font.ttf'), JSON.stringify(bc2.files.map(f => f.path)));
assert('bundle: font base64', bc2.files.find(f => f.path === 'fonts/Fancy_Font.ttf').base64 === 'dGZmb250');
assert('bundle: manifest font', bc2.manifest.font.file === 'fonts/Fancy_Font.ttf' && bc2.manifest.font.family === 'Fancy_Font');

// ── buildStateData / data.json: full working state capture ──
getEl('navisportUrl').value = 'https://navisport.com/events/test-event';
getEl('eventTitle').value = 'Test Event';
getEl('eventSubtitle').value = '12.8.2026';
getEl('filterNumbers').value = '1-3';
getEl('filterParts').value = '1';
getEl('filterSarja').value = 'H21';
getEl('pageSize').value = 'A4 portrait';
getEl('fontFamilySelect').value = 'Impact, sans-serif';
S.setShowBarcode(false); S.setColorLegs(false); S.setUseClassPrefix(true); S.setShowClub(true); S.setShowStickerName(false);
S.setStickerConfig({ cols: 4, rows: 6, marginTop: 5, marginLeft: 8 });
S.setRawCsvText('a,b\n1,2\n3,4');
const sd = P.buildStateData();
assert('state: source=csv when rawCsvText', sd.source === 'csv' && sd.csv === 'a,b\n1,2\n3,4');
assert('state: navisportUrl captured', sd.navisportUrl === 'https://navisport.com/events/test-event');
assert('state: title/subtitle captured', sd.eventTitle === 'Test Event' && sd.eventSubtitle === '12.8.2026');
assert('state: filters captured', sd.filters.numbers === '1-3' && sd.filters.parts === '1' && sd.filters.sarja === 'H21');
assert('state: options captured', sd.options.showBarcode === false && sd.options.colorLegs === false && sd.options.useClassPrefix === true && sd.options.showClub === true && sd.options.showStickerName === false);
assert('state: pageSize/font captured', sd.pageSize === 'A4 portrait' && sd.fontFamily === 'Impact, sans-serif');
assert('state: stickerConfig captured', JSON.stringify(sd.stickerConfig) === '{"cols":4,"rows":6,"marginTop":5,"marginLeft":8}');
const bcD = P.buildBundleContent();
assert('bundle: manifest data entry', bcD.manifest.data === 'data.json');
assert('bundle: data.json matches buildStateData', JSON.parse(bcD.files.find(f => f.path === 'data.json').text).csv === sd.csv && JSON.parse(bcD.files.find(f => f.path === 'data.json').text).options.showBarcode === false);
const rtD = P.parseBundle(Object.fromEntries(Object.entries(bcD.files).map(([, v]) => [v.path, v.text !== undefined ? { text: v.text } : { base64: v.base64 }])));
assert('parseBundle: data round-trips', JSON.stringify(rtD.data) === JSON.stringify(sd));

// ── buildStateData: source logic ──
S.setRawCsvText(null); S.setCsvTeams([{ kilpailunumero: '1', sarja: 'X', joukkue: '', seura: '', runners: [] }]);
assert('state: source=navisport when URL + teams, no csv', P.buildStateData().source === 'navisport');
S.setCsvTeams([]);
assert('state: source=null without data', P.buildStateData().source === null);

// ── applyStateData: CSV restores teams offline ──
const csvStr = [header.join(','), t1.join(','), t2.join(',')].join('\r\n');
S.setCsvTeams([]); S.setRawCsvText(null);
P.applyStateData({ csv: csvStr, eventTitle: 'Imported Title', filters: { numbers: '101' }, options: { showBarcode: false } });
assert('applyStateData: csv → csvTeams', S.csvTeams().length === 2 && S.csvTeams()[0].runners.length === 3, String(S.csvTeams().length));
assert('applyStateData: rawCsvText set', S.rawCsvText() === csvStr);
assert('applyStateData: bibCount updated', /2 teams/.test(getEl('bibCount').textContent), getEl('bibCount').textContent);
assert('applyStateData: sarja filter populated', getEl('filterSarja').innerHTML.split('<option').length - 1 === 3, getEl('filterSarja').innerHTML);
assert('applyStateData: title + filter inputs restored', getEl('eventTitle').value === 'Imported Title' && getEl('filterNumbers').value === '101');
assert('applyStateData: checkbox restored', getEl('showBarcode').checked === false && S.showBarcode() === false);
P.applyStateData({ navisportUrl: 'my-url', source: 'navisport', csv: null });
assert('applyStateData: navisportUrl input restored', getEl('navisportUrl').value === 'my-url');
P.applyStateData({ pageSize: 'A5 landscape', fontFamily: 'Arial, sans-serif', stickerConfig: { cols: 2 } });
assert('applyStateData: pageSize applied', getEl('pageSize').value === 'A5 landscape' && getEl('page-style').textContent.includes('210mm'));
assert('applyStateData: font applied', getEl('font-style').textContent.includes('Arial'));
assert('applyStateData: stickerConfig merged', S.stickerConfig().cols === 2 && S.stickerConfig().rows === 8, JSON.stringify(S.stickerConfig()));
assert('applyStateData: no data → no-op', (() => { const before = S.csvTeams().length; P.applyStateData(null); return S.csvTeams().length === before; })());

// ── applyImportedBundle: data + needsNavisport flag ──
const resCsv = P.applyImportedBundle({ layout: null, stickerLayout: null, stickerGroupPos: null, images: [], font: null, data: { source: 'csv', csv: csvStr } });
assert('applyImportedBundle: csv source → needsNavisport false', resCsv.needsNavisport === false && S.csvTeams().length === 2);
const resNav = P.applyImportedBundle({ layout: null, stickerLayout: null, stickerGroupPos: null, images: [], font: null, data: { source: 'navisport', navisportUrl: 'https://navisport.com/events/foo', csv: null } });
assert('applyImportedBundle: navisport source → needsNavisport true', resNav.needsNavisport === true);

// ── extToMime ──
assert('extToMime: round-trips mimeToExt', P.extToMime('png') === 'image/png' && P.extToMime('jpg') === 'image/jpeg' && P.extToMime('svg') === 'image/svg+xml' && P.extToMime('webp') === 'image/webp' && P.extToMime('avif') === 'image/avif');
assert('extToMime: dotted + case-insensitive', P.extToMime('.JPG') === 'image/jpeg');
assert('extToMime: unknown → octet-stream', P.extToMime('pdf') === 'application/octet-stream' && P.extToMime('') === 'application/octet-stream');

// ── parseBundle: round-trip from buildBundleContent ──
S.setEventLogoSrc(dPng); S.setEventLogoName('my logo.png');
S.setSponsorLogos([
  { src: dSvg, name: 'sponsor-a.svg', parts: new Set(['1', '2']) },
  { src: dPng, name: '', parts: null },
]);
S.setCustomFont({ fileName: 'Fancy Font.ttf', family: 'Fancy_Font', src: 'data:font/ttf;base64,dGZmb250' });
const rtFiles = {};
P.buildBundleContent().files.forEach(f => {
  rtFiles[f.path] = f.text !== undefined ? { text: f.text } : { base64: f.base64 };
});
const rt = P.parseBundle(rtFiles);
assert('parseBundle: has manifest', rt.hasManifest === true);
assert('parseBundle: layout parsed', JSON.stringify(rt.layout) === JSON.stringify(S.layout()));
assert('parseBundle: sticker parsed', JSON.stringify(rt.stickerLayout) === JSON.stringify(S.stickerLayout()) && JSON.stringify(rt.stickerGroupPos) === JSON.stringify(S.stickerGroupPos()));
assert('parseBundle: event logo', rt.images[0].role === 'event-logo' && rt.images[0].name === 'my_logo.png' && rt.images[0].src === dPng, JSON.stringify(rt.images));
assert('parseBundle: sponsors with parts', rt.images[1].role === 'sponsor' && JSON.stringify(rt.images[1].parts) === '["1","2"]', JSON.stringify(rt.images));
assert('parseBundle: default sponsor parts []', JSON.stringify(rt.images[2].parts) === '[]');
assert('parseBundle: font from manifest', rt.font.fileName === 'Fancy_Font.ttf' && rt.font.family === 'Fancy_Font' && rt.font.src === 'data:font/ttf;base64,dGZmb250', JSON.stringify(rt.font));

// ── parseBundle: no-manifest heuristic fallback ──
const noManifest = {
  'images/event-logo.png': { base64: 'aGVsbG8=' },
  'images/sponsor-a.png': { base64: 'aGVsbG8=' },
  'bib-layout.json': { text: '{}' },
  'sticker-layout.json': { text: '{"template":{},"groupPos":{"1-1":{"cx":50}}}' },
  'fonts/MyFont.otf': { base64: 'dHlwZW9mZg==' },
};
const hm = P.parseBundle(noManifest);
assert('parseBundle fallback: no manifest flag', hm.hasManifest === false);
assert('parseBundle fallback: event-logo name heuristic', hm.images[0].role === 'event-logo' && hm.images[0].name === 'event-logo.png');
assert('parseBundle fallback: remaining images are sponsors', hm.images[1].role === 'sponsor' && JSON.stringify(hm.images[1].parts) === '[]');
assert('parseBundle fallback: sticker groupPos', JSON.stringify(hm.stickerGroupPos) === '{"1-1":{"cx":50}}');
assert('parseBundle fallback: font from fonts/ dir', hm.font.fileName === 'MyFont.otf' && hm.font.src === 'data:font/otf;base64,dHlwZW9mZg==', JSON.stringify(hm.font));

// ── parseBundle: malformed JSON tolerated ──
const bad = P.parseBundle({ 'bib-layout.json': { text: '{nope' }, 'manifest.json': { text: '[' }, 'images/x.png': { base64: 'a' } });
assert('parseBundle: malformed layout → null', bad.layout === null);
assert('parseBundle: malformed manifest → heuristic fallback', bad.hasManifest === false && bad.images.length === 1 && bad.images[0].role === 'event-logo');

// ── applyImportedBundle ──
S.setEventLogoSrc(null); S.setEventLogoName(null); S.setSponsorLogos([]); S.setCustomFont(null);
const parsedForApply = {
  layout: { eventTitle: { cx: 60, y: 2 } },
  stickerLayout: { stickerName: { fontSize: 3.2 } },
  stickerGroupPos: { '1-1': { cx: 45 } },
  images: [
    { role: 'event-logo', name: 'ev.png', src: dPng, parts: null },
    { role: 'sponsor', name: 'sp.svg', src: dSvg, parts: ['1', '3'] },
  ],
  font: { fileName: 'F.ttf', family: 'F', src: 'data:font/ttf;base64,Zm9udA==' },
};
const fontRet = P.applyImportedBundle(parsedForApply);
assert('applyImportedBundle: returns font', fontRet.font.fileName === 'F.ttf' && fontRet.needsNavisport === false, JSON.stringify(fontRet));
assert('applyImportedBundle: layout merged', S.layout().eventTitle.cx === 60 && S.layout().eventTitle.y === 2 && S.layout().eventLogo && S.layout().eventLogo.cx === 50, JSON.stringify(S.layout().eventTitle));
assert('applyImportedBundle: sticker layout merged', S.stickerLayout().stickerName.fontSize === 3.2 && S.stickerLayout().stickerBarcode.h === 46);
assert('applyImportedBundle: sticker groupPos', JSON.stringify(S.stickerGroupPos()) === '{"1-1":{"cx":45}}');
assert('applyImportedBundle: event logo applied', S.eventLogoSrc() === dPng && S.eventLogoName() === 'ev.png');
assert('applyImportedBundle: sponsors applied', S.sponsorLogos().length === 1 && S.sponsorLogos()[0].name === 'sp.svg' && S.sponsorLogos()[0].parts.has('1') && S.sponsorLogos()[0].parts.has('3') && !S.sponsorLogos()[0].parts.has('2'), JSON.stringify([...S.sponsorLogos()[0].parts]));

// ── numberArea survives bundle export → import, and edit mode shows true width ──
S.setLayout(P.deepClone(S.layout()));
S.layout().numberArea = { cx: 41, y: 27, fontSize: 51, w: 92, maxW: 55, letterSpacing: 1.5 };
const naBundle = P.buildBundleContent();
const naFiles = {};
naBundle.files.forEach(f => { naFiles[f.path] = f.text !== undefined ? { text: f.text } : { base64: f.base64 }; });
P.applyImportedBundle(P.parseBundle(naFiles));
assert('import: numberArea round-trips', JSON.stringify(S.layout().numberArea) === '{"cx":41,"y":27,"fontSize":51,"w":92,"maxW":55,"letterSpacing":1.5}', JSON.stringify(S.layout().numberArea));
const naEl = makeEl('div');
P.applyPos(naEl, 'numberArea');
assert('edit mode: numberArea renders at true w, no maxW cap', naEl.style.width === '92%' && (naEl.style.maxWidth === undefined || naEl.style.maxWidth === ''), JSON.stringify(naEl.style));


(async () => {
  // ── exportBundle end-to-end with mocked JSZip ──
  class MockZip {
    constructor() { this.files = {}; MockZip.instances.push(this); }
    file(path, content, opts) { this.files[path] = { content, opts }; return this; }
    async generateAsync(opts) { this.opts = opts; return { __mock: true, files: this.files }; }
  }
  MockZip.instances = [];
  global.JSZip = MockZip;

  S.setEventLogoSrc(dPng); S.setEventLogoName('my logo.png');
  S.setSponsorLogos([{ src: dSvg, name: 'sponsor-a.svg', parts: new Set(['1']) }]);
  S.setCustomFont(null);
  const before = created.length;
  await P.exportBundle();
  const inst = MockZip.instances[0];
  assert('exportBundle: did not throw', true);
  assert('exportBundle: downloaded bib-design-bundle.zip', created.slice(before).some(el => el.download === 'bib-design-bundle.zip'), JSON.stringify(created.slice(before).map(el => el.download)));
  assert('exportBundle: generateAsync blob type', inst.opts && inst.opts.type === 'blob');

  const paths = Object.keys(inst.files);
  assert('exportBundle: zip contains layouts + data + manifest', paths.includes('bib-layout.json') && paths.includes('sticker-layout.json') && paths.includes('data.json') && paths.includes('manifest.json'), JSON.stringify(paths));
  assert('exportBundle: zip contains event logo', paths.includes('images/my_logo.png'), JSON.stringify(paths));
  assert('exportBundle: zip contains sponsor logo', paths.includes('images/sponsor-a.svg'), JSON.stringify(paths));
  const mf = JSON.parse(inst.files['manifest.json'].content);
  assert('exportBundle: manifest images roles', mf.images.length === 2 && mf.images[0].role === 'event-logo' && mf.images[1].role === 'sponsor' && JSON.stringify(mf.images[1].parts) === '["1"]', JSON.stringify(mf.images));
  assert('exportBundle: event logo base64 in zip', inst.files['images/my_logo.png'].content === 'aGVsbG8=' && inst.files['images/my_logo.png'].opts.base64 === true);

  // exportBundle without any assets still works (layout-only bundle)
  S.setEventLogoSrc(null); S.setSponsorLogos([]); S.setCustomFont(null);
  await P.exportBundle();
  const inst2 = MockZip.instances[1];
  assert('exportBundle: layout-only bundle ok', Object.keys(inst2.files).length === 4, JSON.stringify(Object.keys(inst2.files)));

  // ── importBundleFromZip end-to-end with mocked JSZip.loadAsync ──
  MockZip.loadAsync = async file => ({
    files: Object.fromEntries(Object.entries(file).map(([path, entry]) => [path, { dir: false, async: async type => entry[type] }])),
  });
  S.setEventLogoSrc(dPng); S.setEventLogoName('my logo.png');
  S.setSponsorLogos([
    { src: dSvg, name: 'sponsor-a.svg', parts: new Set(['1', '2']) },
    { src: dPng, name: '', parts: null },
  ]);
  S.setCustomFont({ fileName: 'Fancy Font.ttf', family: 'Fancy_Font', src: 'data:font/ttf;base64,dGZmb250' });
  S.setCsvTeams([]); S.setRawCsvText(null);
  const impFiles = {};
  P.buildBundleContent().files.forEach(f => { impFiles[f.path] = f.text !== undefined ? { string: f.text } : { base64: f.base64 }; });
  const impParsed = await P.importBundleFromZip(impFiles);
  assert('importBundleFromZip: parsed returned', impParsed.hasManifest === true && impParsed.images.length === 3, JSON.stringify(impParsed.images));
  assert('importBundleFromZip: event logo applied', S.eventLogoSrc() === dPng && S.eventLogoName() === 'my_logo.png');
  assert('importBundleFromZip: sponsors applied', S.sponsorLogos().length === 2 && S.sponsorLogos()[0].name === 'sponsor-a.svg' && JSON.stringify([...S.sponsorLogos()[0].parts]) === '["1","2"]', JSON.stringify(S.sponsorLogos().map(s => s.name)));
  assert('importBundleFromZip: font returned', impParsed.font && impParsed.font.fileName === 'Fancy_Font.ttf', JSON.stringify(impParsed.font));

  // importBundleFromZip throws on missing JSZip
  const savedJ = global.JSZip;
  global.JSZip = undefined;
  let threwMissing = false;
  try { await P.importBundleFromZip({}); } catch (e) { threwMissing = /JSZip/.test(e.message); }
  global.JSZip = savedJ;
  assert('importBundleFromZip: no JSZip → throws', threwMissing === true);

  // ── importBundleFromZip: navisport source reloads from the API ──
  S.setEventLogoSrc(dPng); S.setEventLogoName('my logo.png'); S.setSponsorLogos([]); S.setCustomFont(null);
  S.setCsvTeams([{ kilpailunumero: '1', sarja: 'X', joukkue: '', seura: '', runners: [] }]); // marks source=navisport on export
  S.setRawCsvText(null);
  getEl('navisportUrl').value = 'test-event';
  getEl('eventTitle').value = 'Bundle Title';
  const navFiles = {};
  P.buildBundleContent().files.forEach(f => { navFiles[f.path] = f.text !== undefined ? { string: f.text } : { base64: f.base64 }; });
  const navSavedFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => [{ result: { data: {
      name: 'API Title', begin: '2026-08-15T08:00:00Z', raceType: 'Individual',
      courseClasses: [{ id: 'c1', name: 'H21' }],
      results: [
        { bibNumber: 101, classId: 'c1', name: 'Virtanen Eino', club: 'ES', chip: '111' },
        { bibNumber: 102, classId: 'c1', name: 'Nurmo Maija', club: 'ES' },
      ],
    } } }],
  });
  const navParsed = await P.importBundleFromZip(navFiles);
  global.fetch = navSavedFetch;
  assert('importBundleFromZip navisport: teams loaded', S.csvTeams().length === 2, String(S.csvTeams().length));
  assert('importBundleFromZip navisport: logo kept from bundle', S.eventLogoSrc() === dPng && S.eventLogoName() === 'my_logo.png');
  assert('importBundleFromZip navisport: bundle title wins over API', getEl('eventTitle').value === 'Bundle Title');
  assert('importBundleFromZip navisport: navisportUrl input restored', getEl('navisportUrl').value === 'test-event');
  assert('importBundleFromZip navisport: no navisportError', !navParsed.navisportError, String(navParsed.navisportError));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
