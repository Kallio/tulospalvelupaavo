const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/relaybackprint.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// ── minimal DOM stub (enough for the inline script to load + render sheets) ──
function makeEl(tag) {
  const el = {
    tag, value: '', title: '', textContent: '', checked: false, className: '', files: [],
    dataset: {}, style: {}, children: [], parent: null, options: [], selectedIndex: -1,
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) {
        const on = force === undefined ? !this._set.has(c) : !!force;
        if (on) this._set.add(c); else this._set.delete(c);
        return on;
      },
      contains(c) { return this._set.has(c); },
    },
    appendChild(c) { c.parent = el; el.children.push(c); return c; },
    closest(sel) {
      let n = el;
      while (n) { if (n.className.split(/\s+/).includes(sel.slice(1))) return n; n = n.parent; }
      return null;
    },
    addEventListener() {}, removeEventListener() {},
    querySelector(sel) {
      if (sel[0] === '.') { if (this.className.split(/\s+/).includes(sel.slice(1))) return this; }
      for (const ch of this.children) { const r = ch.querySelector(sel); if (r) return r; }
      if (sel === '.group' && this.classList.contains('group')) return this;
      return null;
    },
    querySelectorAll(sel) {
      const out = [];
      const walk = n => { for (const ch of n.children) { if (sel === '[data-lk]' && ch.dataset.lk) out.push(ch); walk(ch); } };
      walk(el);
      return out;
    },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html || ''; },
    set(v) { el._html = v; if (v === '') el.children = []; },
  });
  return el;
}

const store = {};
function getEl(id) { if (!store[id]) store[id] = makeEl('#' + id); return store[id]; }
const body = makeEl('body');

global.document = {
  getElementById: getEl,
  createElement: tag => makeEl(tag),
  querySelectorAll: () => [],
  body,
  addEventListener() {},
};
global.localStorage = {
  _s: {},
  getItem(k) { return k in this._s ? this._s[k] : null; },
  setItem(k, v) { this._s[k] = String(v); },
  removeItem(k) { delete this._s[k]; },
};
global.window = {
  addEventListener() {}, innerWidth: 1280, innerHeight: 900, print() {},
  location: { search: '', href: 'http://localhost/', pathname: '/' }, history: { replaceState() {} },
};
global.requestAnimationFrame = cb => cb();
global.alert = () => {};
global.FileReader = class { readAsText() {} readAsDataURL() {} };

let threw = null;
try {
  eval(code + `;
global.__p = {
  parseCSV, parseTeams, parseRanges, multiSelectValues, parseForkingCSV, forkLabelFor,
  collectForkLabels, splitForkCell, legText, buildSheet, buildListPages, applySheetLayout, applyPos,
  getLayoutRef, toggleTeamName, getFilteredEntries, generateBibs, syncLayout, saveLayout,
  DEF_LAYOUT, FOLDS, GROUP_KEY, GROUP_MEMBERS,
  populateSarjaFilter,
};
global.__state = {
  getLayout: () => layout,
  getVirtual: k => ({ csvTeams, forkingData, extraText }),
  setCsvTeams: t => { csvTeams = t; },
  setForkingData: f => { forkingData = f; },
  setFilter: (id, v) => { document.getElementById(id).value = v; },
};`);
} catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }

const P = global.__p;
const S = global.__state;
const JOUKKEE = 'joukk' + 'ue';

let pass = 0, fail = 0;
function assert(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

// ── defaults ──
assert('DEF_LAYOUT.teamName defaults hidden', P.DEF_LAYOUT.teamName.hidden === true);
assert('team-name checkbox starts UNchecked when hidden', getEl('teamNameChk').checked === false);
assert('FOLDS has 4 orientations', P.FOLDS.length === 4);

// ── csv parsing ──
const rows = P.parseCSV('A,"B,""C"""\r\nD,"E"');
assert('csv rows', rows.length === 2 && rows[1][1] === 'E');
assert('csv escaped quotes', rows[0][1] === 'B,"C"');

const q = v => '"' + v + '"';
const S_ = q(' ');
const teamHdr = ['Kilpailunumero', 'Sarja', JOUKKEE + 'n nimi', 'Kansalaisuus', 'Seura'].map(q).join(',');
const rHdr = n => [S_, 'Nimi-' + n, 'Kilpailukortti-' + n, 'Lainakortti-' + n, 'Osuus-' + n, 'Alaosuus-' + n, 'Rata-' + n, 'Lähtöaika-' + n].map((v, i) => i === 0 ? v : q(v)).join(',');
const r = (nimi, chip, osuus, alaosuus, rata, aika) => [S_, nimi, chip, '', osuus, (alaosuus || ''), rata, aika].map((v, i) => i === 0 ? v : q(v)).join(',');
const hdr = teamHdr + ',' + [1, 2, 3].map(rHdr).join(',');
const d1 = ['101', 'Jukola', 'Team A', 'FIN', 'Club A'].map(q).join(',') + ',' +
  r('Astra', '12345', '1', '', 'A', '10:00:00') + ',' +
  r('Anna', '12346', '2', '', 'B', '') + ',' +
  r('Jone', '12347', '3', '', 'A', '');
const teamsP = P.parseTeams(P.parseCSV(hdr + '\r\n' + d1));
assert('parseTeams 1 team', teamsP.length === 1);
assert('team name ' + JOUKKEE, teamsP[0][JOUKKEE] === 'Team A');
assert('runner2 osuus/alaosuus', teamsP[0].runners[1].osuus === '2' && teamsP[0].runners[1].alaosuus === '');

// ── legText ──
assert('legText plain', P.legText({ osuus: '2' }) === '2');
assert('legText with subleg', P.legText({ osuus: '2', alaosuus: '3' }) === '2\u20133');
assert('legText empty', P.legText({ osuus: '' }) === '');

// ── buildSheet + applySheetLayout team-name visibility ──
const dims = P.FOLDS[0];
const team = { kilpailunumero: '101', sarja: 'H14', [JOUKKEE]: 'Team A', runners: [{ nimi: 'X', osuus: '1' }] };
const sheet = P.buildSheet(team, team.runners[0], 0, 1, dims);
const lks = {};
sheet.querySelectorAll('[data-lk]').forEach(e => { lks[e.dataset.lk] = e; });
assert('teamName element rendered', !!lks.teamName, 'missing');
assert('teamName text = ' + JOUKKEE, lks.teamName.textContent === 'Team A');
assert('teamName visible before layout apply (named team)', !('hidden' in lks.teamName.dataset));
P.applySheetLayout(sheet);
assert('teamName hidden by default layout', lks.teamName.dataset.hidden === 'true');

// ── unnamed team always hidden at build time ──
const teamNo = { kilpailunumero: '999', sarja: 'H14', [JOUKKEE]: '', runners: [{ nimi: 'Y', osuus: '1' }] };
const sheetNo = P.buildSheet(teamNo, teamNo.runners[0], 0, 1, dims);
const lksNo = {};
sheetNo.querySelectorAll('[data-lk]').forEach(e => { lksNo[e.dataset.lk] = e; });
assert('unnamed team: teamName empty + hidden at build', lksNo.teamName.textContent === '' && lksNo.teamName.dataset.hidden === 'true');

// ── toggleTeamName + persistence ──
P.toggleTeamName({ checked: true });
assert('toggle on -> layout.teamName.hidden=false', S.getLayout().teamName.hidden === false);
assert('toggle on reflected on existing sheet', (P.applySheetLayout(sheet), !('hidden' in lks.teamName.dataset)));
assert('toggle persisted to localStorage', JSON.parse(global.localStorage.getItem('relayBackLayout')).teamName.hidden === false);
P.toggleTeamName({ checked: false });
assert('toggle off -> hidden=true again', S.getLayout().teamName.hidden === true);

// ── filters + generate end-to-end ──
const twoTeams = [
  { kilpailunumero: '101', sarja: 'H14', [JOUKKEE]: 'Team A', runners: [{ nimi: 'Astra', osuus: '1' }, { nimi: 'Anna', osuus: '2' }] },
  { kilpailunumero: '102', sarja: 'D16', [JOUKKEE]: 'Team B', runners: [{ nimi: 'Leena', osuus: '1' }] },
];
S.setCsvTeams(twoTeams);
P.toggleTeamName({ checked: true });
S.setFilter('filterLeg', '');
S.setFilter('filterNumbers', '101');
S.setFilter('filterParts', '');
S.setFilter('filterSarja', '');
const filtered = P.getFilteredEntries();
assert('filter by team number 101 -> 2 runners', filtered.length === 2, String(filtered.length));

P.generateBibs();
const area = getEl('print-area');
const sheetEls = area.children.filter(c => c.className.split(/\s+/).includes('sheet'));
assert('generate -> 2 sheets for filtered entries', sheetEls.length === 2, String(sheetEls.length));
const tn1 = sheetEls[0].querySelectorAll('[data-lk]').find(e => e.dataset.lk === 'teamName');
assert('generated sheet shows team name when enabled', tn1 && tn1.dataset.hidden === undefined && tn1.textContent === 'Team A');

P.toggleTeamName({ checked: false });
P.generateBibs();
const area2 = getEl('print-area');
const sheet2 = area2.children.filter(c => c.className.split(/\s+/).includes('sheet'))[0];
const tn2 = sheet2.querySelectorAll('[data-lk]').find(e => e.dataset.lk === 'teamName');
assert('generated sheet hides team name when disabled', tn2 && tn2.dataset.hidden === 'true');

// ── ranges helper ──
assert('parseRanges 1-5,10', P.parseRanges('1-5, 10') && P.parseRanges('1-5, 10').has(3) && P.parseRanges('1-5, 10').has(10));
assert('parseRanges empty = null', P.parseRanges('') === null);

// ── forking CSV + fork-label filtering ──
const frows = [['Virhe', 'Kilpailunumero', 'Osuus 2', 'Osuus 1', 'Osuus 3'],
               ['x', '101', 'B', 'A', 'A'],
               ['y', '102', 'A', 'C', 'B']];
const fd = P.parseForkingCSV(frows);
assert('parseForkingCSV order-independent', fd['101'].osuus1 === 'A' && fd['101'].osuus2 === 'B' && fd['102'].osuus1 === 'C');

S.setForkingData(fd);
const forkTeams = [
  { kilpailunumero: '101', sarja: 'H14', [JOUKKEE]: 'Team A', runners: [{ nimi: 'Astra', osuus: '1' }, { nimi: 'Anna', osuus: '2' }] },
  { kilpailunumero: '102', sarja: 'D16', [JOUKKEE]: 'Team B', runners: [{ nimi: 'Leena', osuus: '1' }] },
];
S.setCsvTeams(forkTeams);

assert('forkLabelFor maps 101/1 -> A', P.forkLabelFor(forkTeams[0], forkTeams[0].runners[0]) === 'A');
assert('forkLabelFor maps 101/2 -> B', P.forkLabelFor(forkTeams[0], forkTeams[0].runners[1]) === 'B');
assert('forkLabelFor no osuus -> empty', P.forkLabelFor({ kilpailunumero: '101' }, { osuus: '' }) === '');
assert('collectForkLabels unique+sorted', JSON.stringify(P.collectForkLabels()) === JSON.stringify(['A', 'B', 'C']));

S.setFilter('filterLeg', '');
S.setFilter('filterNumbers', '');
S.setFilter('filterParts', '');
S.setFilter('filterSarja', '');
S.setFilter('filterFork', '');

const fkSel = getEl('filterFork');
const sarjaSel = getEl('filterSarja');

fkSel.options.length = 0;
fkSel.options.push({ value: 'A', selected: true });
const onlyA = P.getFilteredEntries();
assert('fork filter A -> only label-A entry', onlyA.length === 1 && onlyA[0].team.kilpailunumero === '101' && onlyA[0].runner.osuus === '1', String(onlyA.length));

fkSel.options.length = 0;
fkSel.options.push({ value: 'B', selected: true });
const onlyB = P.getFilteredEntries();
assert('fork filter B -> 1 entry (101/2)', onlyB.length === 1 && onlyB[0].team.kilpailunumero === '101' && onlyB[0].runner.osuus === '2', String(onlyB.length));

fkSel.options.length = 0;
fkSel.options.push({ value: 'C', selected: true });
assert('fork filter C -> 1 entry (102/1)', P.getFilteredEntries().length === 1);
fkSel.options.length = 0;

sarjaSel.options.length = 0;
sarjaSel.options.push({ value: 'H14', selected: true }, { value: 'D16', selected: true });
assert('multi sarja H14+D16 -> 3 runners', P.getFilteredEntries().length === 3);
sarjaSel.options.length = 0;
sarjaSel.options.push({ value: 'H14', selected: true });
assert('sarja H14 -> 2 runners', P.getFilteredEntries().length === 2);

fkSel.options.length = 0;
fkSel.options.push({ value: 'B', selected: true });
const hb = P.getFilteredEntries();
assert('sarja H14 + fork B -> 1 entry (osuus2)', hb.length === 1 && hb[0].runner.osuus === '2', String(hb.length));
fkSel.options.length = 0;
sarjaSel.options.length = 0;

getEl('print-area').innerHTML = '';
const fSheet = P.buildSheet(forkTeams[0], forkTeams[0].runners[0], 0, 1, P.FOLDS[0]);
const fCap = getEl('print-area').children[0];
assert('caption preview shows fork A', /fork A/.test(fCap.textContent), fCap.textContent);

// ── parallel legs: one cell holds a fork map per parallel runner ──
const pf = P.parseForkingCSV([['Kilpailunumero', 'Osuus 1', 'Osuus 2', 'Osuus 3'],
                              ['500', 'HD 12_BBA', 'HD 12 2 osuus, HD 12 2 osuus', 'HD 12_AAB']]);
assert('parseForkingCSV keeps multi-map cell', pf['500'].osuus2 === 'HD 12 2 osuus, HD 12 2 osuus');

const parTeams = [
  { kilpailunumero: '500', sarja: 'D12', [JOUKKEE]: 'Par', runners: [
    { nimi: 'R1', osuus: '1' },
    { nimi: 'R2A', osuus: '2' },
    { nimi: 'R2B', osuus: '2' },
    { nimi: 'R3', osuus: '3' },
  ]},
];
S.setForkingData(pf);
S.setCsvTeams(parTeams);
S.setFilter('filterLeg', '');
S.setFilter('filterNumbers', '');
S.setFilter('filterParts', '');
S.setFilter('filterSarja', '');
S.setFilter('filterFork', '');

assert('parallel: each runner gets own map',
  P.forkLabelFor(parTeams[0], parTeams[0].runners[1]) === 'HD 12 2 osuus' &&
  P.forkLabelFor(parTeams[0], parTeams[0].runners[2]) === 'HD 12 2 osuus' &&
  P.forkLabelFor(parTeams[0], parTeams[0].runners[0]) === 'HD 12_BBA');

assert('parallel: collectForkLabels distinct', JSON.stringify(P.collectForkLabels()) === JSON.stringify(['HD 12 2 osuus', 'HD 12_AAB', 'HD 12_BBA']));

const pfkSel = getEl('filterFork');
pfkSel.options.length = 0;
pfkSel.options.push({ value: 'HD 12 2 osuus', selected: true });
const parMatch = P.getFilteredEntries();
assert('parallel: pick a fork -> all runners on it', parMatch.length === 2 && parMatch.every(e => e.runner.osuus === '2'), String(parMatch.length));
pfkSel.options.length = 0;
pfkSel.options.push({ value: 'HD 12_BBA', selected: true });
assert('parallel: different fork -> only that runner', P.getFilteredEntries().length === 1 && P.getFilteredEntries()[0].runner.osuus === '1');
pfkSel.options.length = 0;

// ── bib list page ──
S.setForkingData({});
const listTeams = [
  { kilpailunumero: '500', sarja: 'D12', [JOUKKEE]: 'Par', runners: [{ nimi: 'R1', osuus: '1' }] },
  { kilpailunumero: '501', sarja: 'D12', [JOUKKEE]: 'Par2', runners: [{ nimi: 'R2', osuus: '2' }] },
];
const listEntries = [
  { team: listTeams[0], runner: listTeams[0].runners[0] },
  { team: listTeams[1], runner: listTeams[1].runners[0] },
];
getEl('print-area').innerHTML = '';
const lp = P.buildListPages(listEntries, P.FOLDS[0]);
assert('list: one page for 2 bibs', lp.length === 1, String(lp.length));
const lTbl = lp[0].children[1];
assert('list: rows = entries', lTbl.children[1].children.length === 2, String(lTbl.children[1].children.length));
assert('list: sorted first row bib=500', lTbl.children[1].children[0].children[0].textContent === '500');
assert('list: row has fork col', lTbl.children[1].children[0].children[4].textContent === '');

const lpMany = P.buildListPages(listEntries.concat(listEntries), P.FOLDS[0]);
assert('list: single page still for 4', lpMany.length === 1);
const many = [];
for (let i = 0; i < 60; i++) many.push({ team: { kilpailunumero: String(600 + i), sarja: '', [JOUKKEE]: '', runners: [{ nimi: 'X', osuus: '' }] }, runner: { nimi: 'X', osuus: '' } });
getEl('print-area').innerHTML = '';
const lpBig = P.buildListPages(many, P.FOLDS[0]);
assert('list: splits to multiple pages', lpBig.length === 2, String(lpBig.length));

// generateBibs: list checkbox off keeps current behavior, on adds list page
getEl('listPageChk').checked = true;
S.setCsvTeams(listTeams);
S.setFilter('filterLeg', '');
S.setFilter('filterNumbers', '');
S.setFilter('filterParts', '');
S.setFilter('filterSarja', '');
S.setFilter('filterFork', '');
P.toggleTeamName({ checked: true });
getEl('print-area').innerHTML = '';
P.generateBibs();
const listArea = getEl('print-area');
const lpSheets = listArea.children.filter(c => c.className.split(/\s+/).includes('sheet'));
assert('generate with list: sheets still 2', lpSheets.length === 2, String(lpSheets.length));
const lpPages = listArea.children.filter(c => c.className.split(/\s+/).includes('list-page'));
assert('generate with list: list page present', lpPages.length === 1, String(lpPages.length));
const firstSheetIdx = listArea.children.findIndex(c => c.className.split(/\s+/).includes('sheet'));
const firstListIdx  = listArea.children.findIndex(c => c.className.split(/\s+/).includes('list-page'));
assert('generate with list: list page prints first', firstListIdx >= 0 && firstListIdx < firstSheetIdx, `list=${firstListIdx} sheet=${firstSheetIdx}`);
getEl('listPageChk').checked = false;
P.generateBibs();
assert('generate without list: no list page', getEl('print-area').children.filter(c => c.className.split(/\s+/).includes('list-page')).length === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);