const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/rastilippu_parallel_legs_to_navisport.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl(tag) {
  const q = {};
  const el = {
    tag, value: '', textContent: '', className: '', options: [], selectedIndex: 0,
    children: [], style: {}, files: [], _q: q, checked: false, disabled: false,
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, remove() {},
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
global.document = {
  getElementById: getEl,
  querySelectorAll(sel) {
    if (sel === '.profile-block') return store['profiles'] ? store['profiles'].children : [];
    return [];
  },
  createElement: tag => makeEl(tag),
};

let threw = null;
try { eval(code + '; global.__lastResult = () => lastResult; global.__pools = NAME_POOLS;'); } catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }
let pass = 0, fail = 0;
const assert = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
};

// init must NOT prefill example data into src, and textarea must be small
assert('init: src textarea empty (no prefilled example)', getEl('src').value === '', JSON.stringify(getEl('src').value));
assert('html: src textarea rows=4', /<textarea id="src" rows="4"/.test(html), 'rows attr not found');
assert('html: tooltip help + example links present', html.includes('csv-help') && html.includes("pickExample('kompassi', this)") && html.includes("pickExample('halikko', this)") && html.includes('tip-closed'));

// ── Kompassi sample (3/4/5-runner teams) ──
getEl('src').value =
`Sarja;Joukkueen nimi;Seura;Osuuden 1 juoksija;Osuuden 2 juoksija;Osuuden 3 juoksija;Osuuden 4 juoksija;Osuuden 5 juoksija
H14;Parhaat;Espoon Suunta;Kauppi Vesa;Kauppi Paavo;Kauppi Esko;Kauppi Vili;Kauppi Pedro
H14;Parhaat 3;Espoon Suunta;Kauppila Pasi;Kauppi Kaapo;Kokko Eino;Kauppi Pedro;
D12;Parhaat 2;Espoon Suunta;Kauppinen Esa;Kauppinen Paavo;Ojapalo Elina;Kauppi Pedro;
H14;Parhaat 4;Espoon Suunta;Kaupp Anssi;Kauppi Kaapo;Kauppi Pedro;;;
Avoin Oranssi;Pikku Parhaat;Espoon Suunta;Nurmo Katariina;Nurmo Marjaana;Nurmo Pauliina;;;`;

convert();
assert('kompassi convert: no throw', true);
assert('kompassi convert: saveBtn enabled', getEl('saveBtn').disabled === false, String(getEl('saveBtn').disabled));
const sum = getEl('summary').innerHTML;
assert('kompassi convert: summary mentions 5 teams', /5 joukkuetta/.test(sum), sum.slice(0, 200));
const prev = getEl('previewWrap').innerHTML;
assert('kompassi convert: preview shows team', prev.includes('Kauppi Vesa'));
assert('kompassi convert: avoin sarja maps to its own profile (no fallback warning)', !sum.includes('oletusprofiilia'), sum.slice(0, 300));
assert('kompassi convert: no spurious hole warnings for trailing empty columns', !prev.includes('aukko') && !sum.includes('aukko'), (prev + sum).slice(0, 400));
assert('html: name pools present', html.includes('NAME_POOLS') && html.includes('boys: [') && html.includes('girls: [') && html.includes('surnames: ['));
const csv = __lastResult().csv;
assert('kompassi convert: csv starts with BOM', csv.charCodeAt(0) === 0xFEFF);
const rows = parseCSV(csv, ',');
assert('kompassi convert: 6 rows incl header', rows.length === 6, String(rows.length));
assert('kompassi convert: header 5 blocks', rows[0].includes('Nimi-5'));
assert('kompassi convert: row1 (5 runners) full', rows[1][38] === 'Kauppi Pedro');
assert('kompassi convert: row2 (4 runners) padded to 5 blocks, trailing empty', rows[2].length === 45 && rows[2][9] === '1' && rows[2][17] === '2' && rows[2][18] === '1' && rows[2][25] === '2' && rows[2][26] === '2' && rows[2][33] === '3' && rows[2][38] === '', JSON.stringify(rows[2].slice(6, 46)));
assert('kompassi convert: row4 (3 runners) padded to 5 blocks', rows[4][38] === '' && rows[4][41] === '');
assert('kompassi convert: row3 D12 alaosuudet 1,2 on osuus 2', rows[3][18] === '1' && rows[3][26] === '2' && rows[3][17] === '2' && rows[3][25] === '2');

// fillEmpty ON
getEl('fillEmpty').checked = true;
convert();
const csvF = __lastResult().csv;
const rowsF = parseCSV(csvF, ',');
assert('fillEmpty: saveBtn still enabled', getEl('saveBtn').disabled === false);
assert('fillEmpty: row2 (4 runners) → 5 blocks, leg2 ala 3 placeholder, Pedro on leg3', rowsF[2].length === 45 && rowsF[2][30] === '' && rowsF[2][33] === '2' && rowsF[2][34] === '3' && rowsF[2][38] === 'Kauppi Pedro' && rowsF[2][41] === '3', JSON.stringify(rowsF[2].slice(6, 46)));
assert('fillEmpty: preview shows placeholders', getEl('previewWrap').innerHTML.includes('tyhjä'));
getEl('fillEmpty').checked = false;

// ── randomised example names (gender-aware, surname-first) ──
loadExample('kompassi', { seed: 7 });
const kompEx = getEl('src').value.split('\n');
const d12Row = kompEx.find(l => l.startsWith('D12;'));
assert('example: D12 random names are girls only, surname-first',
  d12Row && d12Row.split(';').slice(3).filter(Boolean).every(n => /^[\S]+ [\S]+$/.test(n) && __pools.girls.includes(n.split(' ')[1])),
  String(d12Row));
assert('example: H14 random names are boys only',
  kompEx.filter(l => l.startsWith('H14;')).every(l => l.split(';').slice(3).filter(Boolean).every(n => __pools.boys.includes(n.split(' ')[1]))),
  kompEx.filter(l => l.startsWith('H14;')).join('\n'));

// ── unassigned sarja → default profile fallback warning ──
getEl('src').value =
`Sarja;Joukkueen nimi;Seura;Osuuden 1 juoksija;Osuuden 2 juoksija;Osuuden 3 juoksija;Osuuden 4 juoksija;Osuuden 5 juoksija
H21;Villi Kortti;X;A;B;C;;;`;
convert();
assert('unassigned sarja: fallback warning + still enabled', getEl('saveBtn').disabled === false && getEl('summary').innerHTML.includes('oletusprofiilia'), getEl('summary').innerHTML.slice(0, 200));

// ── error case: team larger than profile (Avoin profile has only 3 spots) ──
getEl('src').value =
`Sarja;Joukkueen nimi;Seura;Osuuden 1 juoksija;Osuuden 2 juoksija;Osuuden 3 juoksija;Osuuden 4 juoksija;Osuuden 5 juoksija
Avoin Oranssi;Liian Iso;X;A;B;C;D;E`;
convert();
assert('oversize: saveBtn disabled', getEl('saveBtn').disabled === true, String(getEl('saveBtn').disabled));
assert('oversize: error visible', getEl('previewWrap').innerHTML.includes('paikkaa'), getEl('previewWrap').innerHTML.slice(0, 300));

// ── bad header ──
getEl('src').value = 'Foo;Bar\nA;B';
convert();
assert('bad header: saveBtn disabled + error', getEl('saveBtn').disabled === true && getEl('summary').innerHTML.includes('Otsikkorivi'), getEl('summary').innerHTML.slice(0, 160));

// ── empty src ──
getEl('src').value = '';
convert();
assert('empty: saveBtn disabled', getEl('saveBtn').disabled === true);

// ── Halikko preset flow (two sarjat: Kilpasarja + Avoin) ──
loadPreset('halikko');
getEl('defaultProfile').value = '0';
(function() {
  const c = ['Sarja','Joukkueen nimi','Seura'];
  for (let i = 1; i <= 15; i++) c.push('Osuuden ' + i + ' juoksija');
  const n = Array.from({ length: 15 }, (_, i) => 'J' + (i + 1));
  getEl('src').value = c.join(';') + '\n' +
    ['Kilpasarja','Häjy','X'].concat(n).join(';') + '\n' +
    ['Avoin','Hölkkä','X'].concat(n.slice(0, 5), Array(10).fill('')).join(';');
})();
convert();
assert('halikko: saveBtn enabled', getEl('saveBtn').disabled === false, getEl('summary').innerHTML.slice(0, 200));
assert('halikko: Kilpasarja + Avoin mapped to profile, no fallback warning', !getEl('summary').innerHTML.includes('oletusprofiilia'), getEl('summary').innerHTML.slice(0, 200));
assert('halikko: 2 teams', parseCSV(__lastResult().csv, ',').length === 3);
const hcsv = __lastResult().csv;
const hrows = parseCSV(hcsv, ',');
const hRow = hrows[1];
assert('halikko: 15 runner blocks in header', hrows[0].includes('Nimi-15') && !hrows[0].includes('Nimi-16'));
assert('halikko: row padded to 15 blocks, all full', hRow.length === 125 && hRow[6 + 14 * 8] === 'J15');
assert('halikko: J14 on leg 14, J15 on leg 15', hRow[6 + 13 * 8] === 'J14' && hRow[9 + 13 * 8] === '14' && hRow[10 + 13 * 8] === '' && hRow[9 + 14 * 8] === '15');
assert('halikko: leg2 = 2.1,2.2,2.3 then leg3', hRow[14] === 'J2' && hRow[17] === '2' && hRow[18] === '1' && hRow[22] === 'J3' && hRow[26] === '2' && hRow[30] === 'J4' && hRow[34] === '3' && hRow[6 + 4 * 8] === 'J5', JSON.stringify(hRow.slice(6, 40)));

// ── Halikko example data: complete team + incomplete team with warnings ──
loadPreset('halikko');
getEl('defaultProfile').value = '0';
loadExample('halikko', { seed: 1 });
convert();
assert('halikko example: convert runs, saveBtn enabled', getEl('saveBtn').disabled === false, getEl('summary').innerHTML.slice(0, 200));
assert('halikko example: no fallback warning', !getEl('summary').innerHTML.includes('oletusprofiilia'), getEl('summary').innerHTML.slice(0, 200));
const ex = parseCSV(__lastResult().csv, ',');
assert('halikko example: 3 teams', ex.length === 4, String(ex.length));
const fullRow = ex[1];
assert('halikko example: Häjy 1 complete (15 named blocks, osuus 1 & 14 & 15 present)',
  fullRow[6] !== '' && fullRow[9] === '1' &&
  fullRow[6 + 12 * 8] !== '' && fullRow[6 + 13 * 8] !== '' && fullRow[9 + 13 * 8] === '14' &&
  fullRow[6 + 14 * 8] !== '' && fullRow[9 + 14 * 8] === '15' &&
  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].every(b => fullRow[6 + b * 8] !== ''),
  JSON.stringify(fullRow.slice(6, 46)));
assert('halikko example: names surname-first two-word', fullRow[6].split(' ').length === 2, fullRow[6]);
assert('halikko example: Häjy 2 incomplete team warns (Vain ... juoksijaa + aukko)',
  getEl('previewWrap').innerHTML.includes('Vain') && getEl('previewWrap').innerHTML.includes('aukko'),
  getEl('previewWrap').innerHTML.slice(0, 400));
assert('halikko example: Häjy 2 blocks still padded to 15 with empty trailing',
  ex[2][6] !== '' && ex[2][9] === '1' && ex[2][6 + 8 * 8] === '' && ex[2].length === 125,
  JSON.stringify(ex[2].slice(6, 46)));

// ── big generated example (?teams=N) ──
loadPreset('kompassi');
getEl('src').value = buildRandomExample('kompassi', 40, mulberry32(42));
convert();
assert('big kompassi: 40 teams → saveBtn enabled', getEl('saveBtn').disabled === false, getEl('summary').innerHTML.slice(0, 300));
const bigRows = parseCSV(__lastResult().csv, ',');
assert('big kompassi: 41 rows incl header', bigRows.length === 41, String(bigRows.length));
assert('big kompassi: every team got a kilpailunumero', bigRows.slice(1).every(r => r[0] !== ''), bigRows.slice(1, 3).map(r => r[0]).join(','));
assert('big kompassi: header has 5 blocks', bigRows[0].includes('Nimi-5') && !bigRows[0].includes('Nimi-6'));
assert('big kompassi: no spurious warnings (trailing empties only)', !getEl('summary').innerHTML.includes('aukko'), getEl('summary').innerHTML.slice(0, 300));

loadPreset('halikko');
getEl('src').value = buildRandomExample('halikko', 5, mulberry32(9));
convert();
assert('big halikko: 5 teams → saveBtn enabled', getEl('saveBtn').disabled === false, getEl('summary').innerHTML.slice(0, 300));
assert('big halikko: 6 rows incl header', parseCSV(__lastResult().csv, ',').length === 6);

// generateCSV without any teams → still produces header only, verifyOutput flags no teams
const emptyAssign = [];
const emptyCsv = generateCSV(emptyAssign, false);
const v = verifyOutput(emptyCsv);
assert('verifyOutput: no teams flagged', v.ok === false);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
