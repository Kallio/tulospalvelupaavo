const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/stopthelegacypress.html', 'utf8');
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
global.location = { search: '', href: 'http://localhost/test.html', pathname: '/test.html' };
global.window = { history: { replaceState() {} }, location: global.location, print() {} };
global.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
global.FileReader = class FileReader { readAsText() {} };

let threw = null;
try {
  eval(code + '; global.__p = { extractEventId, isNuoretClass, classMatchesGroup, GROUPS, fmtTime, statusTxt, statusCls, fmtDist, eventToFlatArray, parseCompetitor, assignPositions, loadFromApi, applyGroupFilter, processAreaData, computeResultAreas, competitorInArea, filteredCompetitors, classHasClubMembers, getTopPlusClub, syncClubSelFromAreas, plainText, render }; global.__state = { D: () => D, sel: () => sel, clubSel: () => clubSel, areaSel: () => areaSel, areaData: () => areaData, clubToArea: () => clubToArea, allClubs: () => allClubs, activeGroups: () => activeGroups, O: () => O, setActive: s => activeGroups = s, setAreaSel: s => areaSel = s, setClubSel: s => clubSel = s };');
} catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }

let pass = 0, fail = 0;
const assert = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
};

const P = global.__p;
const S = global.__state;

// ── URL parsing ──
const UUID = '0f8e2c31-9f3a-4b5e-8d1a-2c9f0e6d7a11';
assert('url: plain UUID', P.extractEventId(UUID).type === 'uuid' && P.extractEventId(UUID).value === UUID);
assert('url: /events/{slug}', JSON.stringify(P.extractEventId('https://navisport.com/events/jukola-2025')) === JSON.stringify({ type: 'slug', value: 'jukola-2025' }));
assert('url: /tapahtumat/{slug}', P.extractEventId('https://navisport.com/tapahtumat/xyz').value === 'xyz');
assert('url: /tulokset-new/{id}', P.extractEventId('https://navisport.fi/tulokset-new/abc123').value === 'abc123');
assert('url: /tulokset/{id}', P.extractEventId('https://navisport.fi/tulokset/abc123').value === 'abc123');
assert('url: /events slug with query', P.extractEventId('https://navisport.com/events/foo?x=1').value === 'foo');
assert('url: plain slug', P.extractEventId('jukola-2025').value === 'jukola-2025');
assert('url: empty → null', P.extractEventId('') === null);
assert('url: unrelated host → null', P.extractEventId('https://example.com/foo') === null);
assert('url: junk → null', P.extractEventId('not a url!') === null);

// ── class groups ──
['H14', 'D16E', 'H9RR', 'D10TR', 'H20', 'H17-20'].forEach(n => assert('nuoret: ' + n, P.isNuoretClass(n)));
['D21', 'H40', 'D35', 'H14B', 'Avoin'].forEach(n => assert('nuoret not: ' + n, !P.isNuoretClass(n)));
assert('group: Miehet matches H14', P.classMatchesGroup('H14', P.GROUPS[0]));
assert('group: Miehet not D14', !P.classMatchesGroup('D14', P.GROUPS[0]));
assert('group: E-luokat matches H16E', P.classMatchesGroup('H16E', P.GROUPS[2]));
assert('group: Nuoret matches D10RR', P.classMatchesGroup('D10RR', P.GROUPS[4]));

// ── formatting ──
assert('fmtTime: 59 → 0:59', P.fmtTime(59) === '0:59', P.fmtTime(59));
assert('fmtTime: 60 → 1:00', P.fmtTime(60) === '1:00', P.fmtTime(60));
assert('fmtTime: 3661 → 1:01:01', P.fmtTime(3661) === '1:01:01', P.fmtTime(3661));
assert('fmtTime: null → –', P.fmtTime(null) === '–');
assert('fmtTime: negative → –', P.fmtTime(-5) === '–');
assert('statusTxt: 0 → OK', P.statusTxt(0) === 'OK');
assert('statusTxt: 1..5 map', [1, 2, 3, 4, 5].map(P.statusTxt).join(',') === 'DNS,DNF,MP,DSQ,OTL');
assert('statusTxt: 6 → S6', P.statusTxt(6) === 'S6');
assert('statusTxt: string uppercased', P.statusTxt('dnf') === 'DNF');
assert('statusCls: DNS/DNF/MP/DSQ', P.statusCls('DNS') === 's-dns' && P.statusCls('DNF') === 's-dnf' && P.statusCls('MP') === 's-mp' && P.statusCls('DSQ') === 's-dsq' && P.statusCls('OK') === '');
assert('fmtDist: 15000 → 15 km', P.fmtDist(15000) === '15 km', P.fmtDist(15000));
assert('fmtDist: 1250 → 1.3 km', P.fmtDist(1250) === '1.3 km', P.fmtDist(1250));
assert('fmtDist: "800m" → 0.8 km', P.fmtDist('800m') === '0.8 km', P.fmtDist('800m'));
assert('fmtDist: empty → ""', P.fmtDist('') === '');

// ── eventToFlatArray (tRPC shape) ──
const tRpcEvent = {
  name: 'Testikisa', begin: '2026-08-14T10:00:00Z', address: 'Helsinki',
  courseClasses: [{ id: 'c1', name: 'H14', distancesPerLeg: [{ distance: 3200 }] }],
  results: [
    { resultType: 'Individual', classId: 'c1', name: 'Virtanen Eino', club: 'Espoon Suunta', time: 1500, status: 'OK', position: 1 },
    { resultType: 'Team', classId: 'c1', name: 'Some Team', club: 'X', time: 5000, status: 'OK', position: 1 },
    { resultType: 'Individual', classId: 'c1', givenName: 'Maija', surname: 'Nurmo', club: 'Jämsä', time: 2000, status: 'DNF', position: 2 },
  ],
};
const flat = P.eventToFlatArray(tRpcEvent);
assert('eventToFlatArray: Team rows skipped', flat.length === 2, String(flat.length));
assert('eventToFlatArray: row mapping', flat[0].name === 'Virtanen Eino' && flat[0].className === 'H14' && flat[0].club === 'Espoon Suunta' && flat[0].time === 1500 && flat[0].status === 0 && flat[0].position === 1 && flat[0].distance === 3200);
assert('eventToFlatArray: given+surname assembled', flat[1].name === 'Maija Nurmo');
assert('eventToFlatArray: DNF status numeric', flat[1].status === 2);
assert('eventToFlatArray: event meta', flat[0].competitionName === 'Testikisa' && flat[0].competitionDate === '2026-08-14' && flat[0].competitionPlace === 'Helsinki');

// REST shape: distance from courses + "Ok" status
const restEvent = {
  name: 'REST', begin: '2026-08-14T10:00:00Z',
  courseClasses: [{ id: 'c1', name: 'H14' }],
  courses: [{ id: 'r1', distance: 3500 }],
  results: [{ resultType: 'Individual', classId: 'c1', name: 'X Y', club: 'Z', time: 900, status: 'Ok', courseId: 'r1', position: null }],
};
const rFlat = P.eventToFlatArray(restEvent);
assert('eventToFlatArray: REST distance from course', rFlat[0].distance === 3500);
assert('eventToFlatArray: REST "Ok" → 0', rFlat[0].status === 0);

// ── parseCompetitor ──
const pc = P.parseCompetitor({ firstName: 'Eino', lastName: 'Virtanen', club: 'ES', position: 1, time: 900, status: 0 });
assert('parseCompetitor: name + time + OK', pc.name === 'Eino Virtanen' && pc.time === '15:00' && pc.status === 'OK' && pc.pos === 1);
const pc2 = P.parseCompetitor({ etunimi: 'Satu', sukunimi: 'Nurmo', time: null, status: null });
assert('parseCompetitor: etunimi/sukunimi + no time', pc2.name === 'Satu Nurmo' && pc2.time === '–' && pc2.status === '–' && pc2.pos === null);
const pc3 = P.parseCompetitor({ status: 1 });
assert('parseCompetitor: DNS status text', pc3.status === 'DNS' && pc3.time === 'DNS');
const pc4 = P.parseCompetitor({ name: 'Virtanen Eino' });
assert('parseCompetitor: name fallback', pc4.name === 'Virtanen Eino');

// ── assignPositions (no positions given → sort OK by time) ──
const cls = { competitors: [
  { pos: null, status: 'OK', time: '30:00' },
  { pos: null, status: 'OK', time: '10:00' },
  { pos: null, status: 'DNF', time: 'DNS' },
] };
P.assignPositions([cls]);
assert('assignPositions: OK sorted by time, DNF last', cls.competitors[0].pos === 1 && cls.competitors[1].pos === 2 && cls.competitors[2].pos === null, JSON.stringify(cls.competitors));

// ── loadFromApi end-to-end ──
const rows = [
  { firstName: 'Eino', lastName: 'Virtanen', club: 'Espoon Suunta', className: 'H14', time: 1500, status: 0, position: 1, distance: 3200, competitionName: 'Testikisa', competitionDate: '2026-08-14T10:00:00Z', competitionPlace: 'Helsinki' },
  { firstName: 'Aino', lastName: 'Kallio', club: 'Jämsä', className: 'H14', time: 2000, status: 0, position: 2, distance: 3200 },
  { firstName: 'Maija', lastName: 'Nurmo', club: 'Espoon Suunta', className: 'D14', time: 1200, status: 0, position: 1, distance: 2800 },
  { firstName: 'Otto', lastName: 'Mäki', club: 'Rastihaukka', className: 'H21', time: 3000, status: 2, position: null, distance: 5000 },
];
P.loadFromApi(rows);
assert('loadFromApi: event name set', S.D().name === 'Testikisa');
assert('loadFromApi: 3 classes, sorted fi-alphabetically', S.D().classes.map(c => c.name).join(',') === 'D14,H14,H21', S.D().classes.map(c => c.name).join(','));
assert('loadFromApi: class dist formatting', S.D().classes.find(c => c.name === 'H14').dist === '3.2 km');
assert('loadFromApi: competitors parsed', S.D().classes.find(c => c.name === 'H14').competitors.length === 2);
assert('loadFromApi: sel has all classes', S.sel().size === 3);
assert('loadFromApi: allClubs unique', S.allClubs().join(',') === 'Espoon Suunta,Jämsä,Rastihaukka', S.allClubs().join(','));

// ── applyGroupFilter ──
S.setActive(new Set(['Miehet']));
P.applyGroupFilter();
assert('group filter: Miehet → H14,H21', S.sel().has('H14') && S.sel().has('H21') && !S.sel().has('D14'), [...S.sel()].join(','));
S.setActive(new Set(['Miehet', 'E-luokat']));
P.applyGroupFilter();
assert('group filter: Miehet AND E-luokat', S.sel().size === 0, [...S.sel()].join(','));
S.setActive(new Set(['Nuoret']));
P.applyGroupFilter();
assert('group filter: Nuoret → H14,D14 (nuortenluokat)', S.sel().has('H14') && S.sel().has('D14') && !S.sel().has('H21'), [...S.sel()].join(','));
S.setActive(new Set());
P.applyGroupFilter();
assert('group filter: cleared → all selected', S.sel().size === 3);

// ── area mapping + filtering ──
P.processAreaData({ disclaimer: 'x', clubMap: { 'espoon suunta': { areaName: 'Uusimaa' }, jämsä: { areaName: 'Keski-Suomi' } } });
assert('processAreaData: clubToArea populated', S.clubToArea()['espoon suunta'] === 'Uusimaa' && S.clubToArea().jämsä === 'Keski-Suomi');
assert('computeResultAreas: from competitors', S.areaData()._resultAreas.join(',') === 'Keski-Suomi,Uusimaa', S.areaData()._resultAreas.join(','));
S.setAreaSel(new Set(['Uusimaa']));
assert('competitorInArea: Uusimaa only', P.competitorInArea({ club: 'Espoon Suunta' }) && !P.competitorInArea({ club: 'Jämsä' }));
S.setAreaSel(new Set());
P.syncClubSelFromAreas();
assert('syncClubSelFromAreas: empty areaSel → empty clubSel', S.clubSel() && S.clubSel().size === 0);
S.setAreaSel(null); S.setClubSel(null);

// filteredCompetitors: status + club + max filters
S.setClubSel(null); S.setAreaSel(null);
const O = S.O();
O.pos = true; O.cnt = true; O.dist = true; O.dns = true; O.dnf = false; O.mp = false; O.top = false; O.topN = 0; O.max = 0;
let list = P.filteredCompetitors(S.D().classes.find(c => c.name === 'H21'));
assert('filtered: DNF excluded when off', list.length === 0, JSON.stringify(list));
O.dnf = true;
list = P.filteredCompetitors(S.D().classes.find(c => c.name === 'H21'));
assert('filtered: DNF included when on', list.length === 1 && list[0].status === 'DNF');
O.max = 1;
list = P.filteredCompetitors(S.D().classes.find(c => c.name === 'H14'));
assert('filtered: max=1 truncates', list.length === 1);
O.max = 0;

// club + area view, topN club expansion
S.setClubSel(new Set(['Espoon Suunta']));
S.setAreaSel(null);
O.top = true; O.topN = 3; O.dns = true; O.dnf = true; O.mp = true;
const h14c = S.D().classes.find(c => c.name === 'H14');
list = P.filteredCompetitors(h14c);
assert('filtered: club view (top+club) keeps both ES runners', list.length === 2, JSON.stringify(list.map(x => x.name)));
assert('classHasClubMembers: H14 has ES', P.classHasClubMembers(h14c));
assert('classHasClubMembers: H21 has no ES', !P.classHasClubMembers(S.D().classes.find(c => c.name === 'H21')));
S.setClubSel(null); S.setAreaSel(null); O.top = false; O.topN = 0;

// ── plainText export ──
const txt = P.plainText();
assert('plainText: uppercase event header', txt.startsWith('TESTIKISA'), txt.slice(0, 40));
assert('plainText: contains class + competitor', txt.includes('H14') && txt.includes('Eino Virtanen'), txt.slice(0, 200));

// ── render() smoke (paper body populated) ──
P.render();
const paperBody = getEl('paperBody').innerHTML;
assert('render: HTML contains name + classes', paperBody.includes('Eino Virtanen') && paperBody.includes('H14') && paperBody.includes('1'), paperBody.slice(0, 200));
assert('render: DNF row shown with O.dnf on', paperBody.includes('Otto Mäki'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
