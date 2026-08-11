const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/halikkoviesti_joukkuesuunnittelija.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('no inline script');
let code = m[1];
code = code.replace(/\(function init\(\)[\s\S]*$/, '');

function makeEl(tag) {
  return {
    tag, value: '', textContent: '', className: '', options: [], selectedIndex: -1,
    children: [], _html: '', checked: false, disabled: false, style: {}, files: [],
    _cls: [],
    classList: {
      add(c) { if (!this._cls.includes(c)) this._cls.push(c); },
      remove(c) { this._cls = this._cls.filter(x => x !== c); },
      toggle(c, on) { if (on === undefined ? !this._cls.includes(c) : on) this.add(c); else this.remove(c); },
      contains(c) { return this._cls.includes(c); },
    },
    appendChild(el) { this.children.push(el); return el; },
    addEventListener() {}, remove() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    set innerHTML(v) { this._html = v; if (v === '') this.children = []; },
    get innerHTML() { return this._html; },
  };
}
const store = {};
function getEl(id) { if (!store[id]) store[id] = makeEl('#' + id); return store[id]; }
global.document = {
  getElementById: getEl,
  querySelectorAll() { return []; },
  createElement: tag => makeEl(tag),
  addEventListener() {},
};

let threw = null;
try {
  eval(code + '; global.__S = () => S; global.__SLOTS = () => SLOTS;');
} catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }

let pass = 0, fail = 0;
function assert(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

function parseCSV(text, sep) {
  const rows = []; let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); cur = ''; rows.push(row); row = []; }
    else if (c === '\r') {}
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

let poolCounter = 0;
function buildPool(classes, prefix) {
  const L = [];
  const add = (c, n) => { for (let i = 0; i < n; i++) L.push(`${c}:${c}-${prefix ? prefix + '-' : ''}${poolCounter++}`); };
  classes.forEach(([c, n]) => add(c, n));
  return L.join('\n');
}

const KILPA_BLOCK = [
  ['H16',1], ['D21',4], ['D16',1], ['D14',1], ['H13',1], ['H65',1], ['H55',1], ['H14',1], ['H21',2], ['H35',1], ['H18',1],
];
const AVOIN_BLOCK = [
  ['H16',1], ['D21',1], ['H21',4], ['H35',3], ['H40',2], ['H45',2], ['H18',2],
];
function kilpaPool(nBlocks) {
  const classes = [];
  for (let i = 0; i < nBlocks; i++) classes.push(...KILPA_BLOCK.map(([c, n]) => [c, n]));
  return buildPool(classes, 'k');
}
function avoinPool(nBlocks) {
  const classes = [];
  for (let i = 0; i < nBlocks; i++) classes.push(...AVOIN_BLOCK.map(([c, n]) => [c, n]));
  return buildPool(classes, 'a');
}
function mixedPool(k, a) {
  const classes = [];
  for (let i = 0; i < k; i++) classes.push(...KILPA_BLOCK.map(([c, n]) => [c, n]));
  for (let i = 0; i < a; i++) classes.push(...AVOIN_BLOCK.map(([c, n]) => [c, n]));
  return buildPool(classes, 'm');
}

// ── parseSarja ──
assert('parseSarja: H21 → M/21', JSON.stringify(parseSarja('H21')) === '{"gender":"M","num":21}');
assert('parseSarja: D16 → N/16', JSON.stringify(parseSarja('D16')) === '{"gender":"N","num":16}');
assert('parseSarja: H-50 → M/50', JSON.stringify(parseSarja('H-50')) === '{"gender":"M","num":50}');
assert('parseSarja: junk → null/null', JSON.stringify(parseSarja('Foo')) === '{"gender":null,"num":null}');

// ── birth-year input "Suku- ja etunimi:Vuosi:Sukupuoli[:Toive]" → sarja ──
const YY = new Date().getFullYear();
assert('sarjaByYear: 27v M → H21', parsePool(`Virtanen Matti:${YY - 27}:M`)[0].sarja === 'H21');
assert('sarjaByYear: 27v M → gender/num', JSON.stringify(parsePool(`Virtanen Matti:${YY - 27}:M`)[0].gender) === '"M"' && parsePool(`Virtanen Matti:${YY - 27}:M`)[0].num === 21);
assert('sarjaByYear: 13v N → D14', parsePool(`Korhonen Elina:${YY - 13}:N`)[0].sarja === 'D14');
assert('sarjaByYear: 35v M → H35', parsePool(`Lehtonen Juha:${YY - 35}:M`)[0].sarja === 'H35');
assert('sarjaByYear: 60v N → D60', parsePool(`Mäkelä Anna:${YY - 60}:N`)[0].sarja === 'D60');
assert('sarjaByYear: 75v M → H75', parsePool(`Salmi Ahti:${YY - 78}:M`)[0].sarja === 'H75');
assert('sarjaByYear: gender alias H/N/Mies/Nainen', parsePool(`A:${YY - 27}:H`)[0].gender === 'M' && parsePool(`B:${YY - 27}:N`)[0].gender === 'N' && parsePool(`C:${YY - 27}:Mies`)[0].gender === 'M' && parsePool(`D:${YY - 27}:Nainen`)[0].gender === 'N');
assert('sarjaByYear: optional toive part', parsePool(`Virtanen Matti:${YY - 27}:M:2`)[0].toive === 2);
assert('sarjaByYear: old sarja:nimi format unchanged', parsePool('H21:Pesonen Antti')[0].sarja === 'H21' && parsePool('H21:Pesonen Antti')[0].toive === null);
assert('sarjaByYear: derived key dedups with explicit sarja', parsePool(`H21:Virtanen Matti\nVirtanen Matti:${YY - 27}:M`).length === 1);
assert('sarjaByYear: empty sarja still skipped', parsePool(':Nimi').length === 0);

// ── SLOTS structure ──
const slots = __SLOTS();
assert('SLOTS: 15 slots', slots.length === 15, String(slots.length));
assert('SLOTS: osuus seq 1,2,2,2,3,3,3,4,4,4,5,5,5,14,15',
  JSON.stringify(slots.map(s => s.osuus)) === JSON.stringify([1,2,2,2,3,3,3,4,4,4,5,5,5,14,15]));
assert('SLOTS: alaosuudet 2.1..5.3, 14/15 empty',
  slots[1].alaosuus === '1' && slots[3].alaosuus === '3' && slots[4].alaosuus === '1' &&
  slots[12].alaosuus === '3' && slots[13].alaosuus === '' && slots[14].alaosuus === '');
assert('SLOTS: ratas', slots[0].rata.includes('violetti') && slots[4].rata.includes('oranssi') && slots[13].rata.includes('musta'));

// ── legEligible (kilpa) ──
const M21 = parsePool('H21:X')[0], M16 = parsePool('H16:X')[0], M14 = parsePool('H14:X')[0],
      M50 = parsePool('H50:X')[0], M35 = parsePool('H35:X')[0], M55 = parsePool('H55:X')[0];
const W21 = parsePool('D21:X')[0], W16 = parsePool('D16:X')[0], W14 = parsePool('D14:X')[0],
      W40 = parsePool('D40:X')[0], W50 = parsePool('D50:X')[0];
assert('leg kilpa: 1 = D/-H16/H50-', legEligible(W21, 1, 'kilpa') && legEligible(M16, 1, 'kilpa') && legEligible(M50, 1, 'kilpa') && !legEligible(M21, 1, 'kilpa') && !legEligible(M35, 1, 'kilpa'));
assert('leg kilpa: 15 = nainen', legEligible(W21, 15, 'kilpa') && !legEligible(M21, 15, 'kilpa'));
assert('leg kilpa: 2-5 ja 14 = kaikki', [2,3,4,5,14].every(o => legEligible(M21, o, 'kilpa') && legEligible(W21, o, 'kilpa')));
assert('leg avoin: vain 1 rajoitettu', !legEligible(M21, 1, 'avoin') && legEligible(W21, 1, 'avoin') && legEligible(M16, 1, 'avoin') && legEligible(M21, 15, 'avoin') && legEligible(M21, 2, 'avoin') && legEligible(M21, 14, 'avoin'));

// ── sarjaluokat ──
assert('cat: D-sarjalainen = nainen', catB(W21) && catB(W50) && !catB(M21));
assert('catC: -H18/H45-/D', catC(M18 = parsePool('H18:X')[0]) && catC(M45 = parsePool('H45:X')[0]) && catC(W21) && !catC(M21) && !catC(M35));
assert('catD: -H15/H55-/-D18/D40-', catD(M14) && catD(M55) && catD(W16) && catD(W40) && !catD(M16) && !catD(W21) && !catD(M21));
assert('catE: -H13/H65-/-D15/D50-', catE(parsePool('H13:X')[0]) && catE(parsePool('H65:X')[0]) && catE(W14) && catE(W50) && !catE(M14) && !catE(W16) && !catE(M55));

// ── teamRequirements ──
const mkTeam = (arr, mode) => validateTeam(arr, slots, mode || 'kilpa');
function fullTeam(lines) {
  const arr = new Array(15).fill(null);
  parsePool(lines.join('\n')).slice(0, 15).forEach((r, i) => { arr[i] = r; });
  return arr;
}
// leg1 nainen, legit 2-13: 5 naista + H16/H13/H65/H55/H14/H21/H35, leg15 nainen → OK
const okTeam = fullTeam(['D21:A','D21:B','D21:C','D21:D','H16:E','D16:F','D14:G','H13:H','H65:I','H55:J','H14:K','H21:L','H35:M','H18:N','D21:O']);
// 4 naista yhteensä (leg1 H16, leg15 D21) → 'naisia 4/5'
const w4 = fullTeam(['H16:A','D21:B','D21:C','D21:D','H13:E','H65:F','H55:G','H14:H','H21:I','H35:J','H18:K','H21:L','H21:M','H21:N','D21:O']);
// catD = H13+D14 = 2/3 (leg1 D21, legit2-13: D21,D21,D21,H16,H13,D14,H21,H35,H18,H45,H21, leg15 D21)
const d2 = fullTeam(['D21:A','D21:B','D21:C','D21:D','H16:E','H13:F','D14:G','H21:H','H35:I','H18:J','H45:K','H21:L','H21:M','H21:N','D21:O']);
// catE = H65 only = 1/2 (leg1 D21, legit2-13: D21,D21,D21,H16,H65,H21,H35,H18,H45,H55,H14, leg15 D21)
const e1 = fullTeam(['D21:A','D21:B','D21:C','D21:D','H16:E','H65:F','H21:G','H35:H','H18:I','H45:J','H55:K','H14:L','H21:M','H21:N','D21:O']);
assert('req kilpa: valid team ok', mkTeam(okTeam).length === 0, mkTeam(okTeam).join(';'));
assert('req kilpa: 4 women flagged', mkTeam(w4).some(p => p.includes('naisia 4/5')));
assert('req kilpa: catE 1/2 flagged', mkTeam(e1).some(p => p.includes('-H13/H65-/-D15/D50-')));
assert('req kilpa: catD 2/3 flagged', mkTeam(d2).some(p => p.includes('-H15/H55-/-D18/D40-')));
assert('req avoin: no team constraints', validateTeam(fullTeam(['H16:A','H21:B','H21:C','H21:D','H21:E','H21:F','H21:G','H21:H','H21:I','H21:J','H21:K','H21:L','H21:M','H21:N','H21:O']), slots, 'avoin').length === 0, validateTeam(fullTeam(['H16:A','H21:B','H21:C','H21:D','H21:E','H21:F','H21:G','H21:H','H21:I','H21:J','H21:K','H21:L','H21:M','H21:N','H21:O']), slots, 'avoin').join(';'));
assert('req: incomplete flagged', mkTeam(new Array(15).fill(null)).some(p => p.includes('keskeneräinen')));

// ── generation: 1 kilpa team from minimal 15 pool ──
const pool15 = kilpaPool(1);
const g1 = generateTeams(parsePool(pool15), 1, 'kilpa');
assert('gen 15: 1 team', g1.count === 1 && g1.teams.length === 1, JSON.stringify(g1));
assert('gen 15: valid', validateTeam(g1.teams[0], slots, 'kilpa').length === 0, validateTeam(g1.teams[0], slots, 'kilpa').join(';'));
assert('gen 15: no leftovers', g1.leftovers.length === 0, String(g1.leftovers.length));

// ── generation: 2 kilpa teams from 30 pool ──
const g2 = generateTeams(parsePool(kilpaPool(2)), 2, 'kilpa');
assert('gen 30: 2 teams', g2.count === 2 && g2.teams.length === 2, JSON.stringify({ count: g2.count, err: g2.error }));
assert('gen 30: both valid', g2.teams.every(t => validateTeam(t, slots, 'kilpa').length === 0));
assert('gen 30: no duplicate runners', new Set(g2.teams.flat().map(r => r.nimi)).size === 30);

// ── generation: avoin team from men-only pool (leg1 = H16) ──
const menOnly = ['H16:X1','H50:X2','H21:X3','H21:X4','H21:X5','H21:X6','H21:X7','H21:X8','H21:X9','H21:X10','H21:X11','H21:X12','H21:X13','H21:X14','H21:X15'].join('\n');
const ga = generateTeams(parsePool(menOnly), 1, 'avoin');
assert('gen avoin: 1 team without women', ga.count === 1 && ga.teams.length === 1, JSON.stringify(ga));
assert('gen avoin: valid', validateTeam(ga.teams[0], slots, 'avoin').length === 0, validateTeam(ga.teams[0], slots, 'avoin').join(';'));
assert('gen kilpa: men-only pool infeasible', !!generateTeams(parsePool(menOnly), 1, 'kilpa').error);

// ── wizard: steps 2 & 3 stay collapsed until a pool is loaded ──
renderAll();
assert('wizard initial: gen step collapsed', getEl('psBodyGen').style.display === 'none', String(getEl('psBodyGen').style.display));
assert('wizard initial: save step collapsed', getEl('psBodySave').style.display === 'none', String(getEl('psBodySave').style.display));
assert('wizard initial: pool step open', getEl('psBodyPool').style.display !== 'none', String(getEl('psBodyPool').style.display));

// ── generateAll: mixed pool → kilpa first, then avoin ──
getEl('poolText').value = mixedPool(2, 1);
getEl('toiveFirst').checked = true;
getEl('wSpeed').value = '0.7';
generateAll();
const S = __S();
assert('DOM gen: 2 kilpa + 1 avoin', S.teams.length === 3 && S.kilpaCount === 2, JSON.stringify({ n: S.teams.length, k: S.kilpaCount }));
assert('DOM gen: all valid', S.teams.every((t, i) => validateTeam(t, slots, i < S.kilpaCount ? 'kilpa' : 'avoin').length === 0));
assert('DOM gen: statusBar has kilpa/avoin', getEl('statusBar').innerHTML.includes('2 kilpa') && getEl('statusBar').innerHTML.includes('1 avoin'), getEl('statusBar').innerHTML.slice(0, 200));
assert('DOM gen: teams rendered with badges', getEl('teamsWrap').innerHTML.includes('Kilpa 1') && getEl('teamsWrap').innerHTML.includes('Avoin 1'));
assert('DOM gen: legend present', getEl('rulesLegend').innerHTML.includes('Kilpasarja'));
assert('DOM gen: sick button on every runner line', (getEl('teamsWrap').innerHTML.match(/onclick="setSick\(/g) || []).length === 45, String((getEl('teamsWrap').innerHTML.match(/onclick="setSick\(/g) || []).length));

assert('wizard after gen: pool step collapsed', getEl('psBodyPool').style.display === 'none', String(getEl('psBodyPool').style.display));
assert('wizard after gen: gen step open', getEl('psBodyGen').style.display !== 'none', String(getEl('psBodyGen').style.display));
assert('pool list minimized after gen', S.showPool === false && getEl('poolWrap').innerHTML.includes('display:none'), String(S.showPool));
toggleStep('pool');
assert('wizard toggle: pool step reopened manually', getEl('psBodyPool').style.display !== 'none', String(getEl('psBodyPool').style.display));
toggleStep('pool');
assert('wizard toggle: pool step collapsed again', getEl('psBodyPool').style.display === 'none', String(getEl('psBodyPool').style.display));
getEl('showPool').checked = true;
togglePool();
assert('pool list: manual reopen works after gen', S.showPool === true && getEl('poolTableWrap').style.display === '', String(S.showPool));
getEl('showPool').checked = false;
togglePool();
assert('pool list: re-minimized manually', S.showPool === false, String(S.showPool));

// ── score steppers: bumpScore clamps 0–10, pool table shows % readouts ──
const Sst = __S();
Sst.runners = parsePool('H21:Steppi Mies\nD21:Steppi Nainen');
Sst.teams = [];
Sst.runners.forEach(r => { r.nopeus = 0; r.luotettavuus = 0; });
renderPoolTable();
assert('stepper: 0% readout shown', getEl('poolWrap').innerHTML.includes('0%'), getEl('poolWrap').innerHTML.slice(0, 300));
bumpScore(0, 'nopeus', 1);
assert('stepper: bump +1 → 1', Sst.runners[0].nopeus === 1, String(Sst.runners[0].nopeus));
bumpScore(0, 'nopeus', -5);
assert('stepper: clamps at 0', Sst.runners[0].nopeus === 0, String(Sst.runners[0].nopeus));
Sst.runners[0].nopeus = 10;
bumpScore(0, 'nopeus', 1);
assert('stepper: clamps at 10', Sst.runners[0].nopeus === 10, String(Sst.runners[0].nopeus));
Sst.runners[1].nopeus = 7; Sst.runners[1].luotettavuus = 10;
renderPoolTable();
const poolHtml = getEl('poolWrap').innerHTML;
assert('stepper: 70% and 100% readouts shown', poolHtml.includes('70%') && poolHtml.includes('100%'), poolHtml.slice(0, 400));
assert('stepper: type=number inputs removed', !poolHtml.includes('type="number"'), poolHtml.slice(0, 200));

// ── team rows show sarja after nimi (like reserve pool chips) ──
Sst.teams = [Sst.runners.slice()];
renderAll();
const tHtml = getEl('teamsWrap').innerHTML;
assert('teams: runner row shows sarja after nimi', tHtml.includes('Steppi Mies (H21)') && tHtml.includes('Steppi Nainen (D21)'), tHtml.slice(0, 400));

// ── generateAll: no kilpa possible → avoin only ──
getEl('poolText').value = menOnly;
generateAll();
const S2 = __S();
assert('DOM avoin-only: kilpaCount 0, 1 avoin', S2.teams.length === 1 && S2.kilpaCount === 0, JSON.stringify({ n: S2.teams.length, k: S2.kilpaCount }));
assert('DOM avoin-only: valid avoin team', validateTeam(S2.teams[0], slots, 'avoin').length === 0);

// ── sick replacement (kilpa team) ──
getEl('poolText').value = mixedPool(2, 1);
generateAll();
const S3 = __S();
const extra = { nimi: 'Extra Nainen', sarja: 'D21', gender: 'N', num: 21, toive: 1, nopeus: 8, luotettavuus: 8, kipea: false, locked: false };
S3.runners.push(extra);
const victim = S3.teams[0][0];
setSick(S3.runners.indexOf(victim), true);
assert('sick: victim flagged', victim.kipea === true);
assert('sick: victim removed from teams', !S3.teams.some(t => t.includes(victim)));
assert('sick: slot0 refilled', S3.teams[0][0] && S3.teams[0][0] !== victim, S3.teams[0][0] && S3.teams[0][0].nimi);
assert('sick: team0 still valid', validateTeam(S3.teams[0], slots, 'kilpa').length === 0, validateTeam(S3.teams[0], slots, 'kilpa').join(';'));
assert('sick: kilpa/avoin split intact', S3.teams.length === 3 && S3.kilpaCount === 2);

// ── performMove: invalid move rejected (man → leg15 of kilpa team) ──
const mover = { nimi: 'Move Man', sarja: 'H21', gender: 'M', num: 21, toive: null, nopeus: 5, luotettavuus: 5, kipea: false, locked: false };
S3.runners.push(mover);
const slot14Before = S3.teams[0][14];
performMove(S3.runners.indexOf(mover), 0, 14);
assert('move: man to kilpa leg15 rejected', S3.teams[0][14] === slot14Before && !S3.teams[0].includes(mover));
assert('move: rejection warned', getEl('statusBar').innerHTML.includes('estetty'), getEl('statusBar').innerHTML.slice(0, 160));

// ── performMove: valid pool → avoin team free slot ──
const slot13Before = S3.teams[2][13];
performMove(S3.runners.indexOf(mover), 2, 13);
assert('move: mover into avoin leg14', S3.teams[2][13] === mover, S3.teams[2][13] && S3.teams[2][13].nimi);
assert('move: previous occupant to pool', unassignedRunners().some(r => r === slot13Before));
assert('move: avoin team still valid', validateTeam(S3.teams[2], slots, 'avoin').length === 0, validateTeam(S3.teams[2], slots, 'avoin').join(';'));

// ── removeFromTeam + fillGaps ──
removeFromTeam(0, 3);
assert('remove: slot empty', S3.teams[0][3] === null);
assert('remove: team incomplete', validateTeam(S3.teams[0], slots, 'kilpa')[0].startsWith('keskeneräinen'));
fillGaps();
assert('fillGaps: gap refilled', S3.teams[0][3] !== null && S3.teams.every(t => t.filter(Boolean).length === 15));
assert('fillGaps: teams valid after fill', S3.teams.every((t, i) => validateTeam(t, slots, i < S3.kilpaCount ? 'kilpa' : 'avoin').length === 0));
assert('fillGaps: feedback', /Täytettiin|täytetty/.test(getEl('statusBar').innerHTML), getEl('statusBar').innerHTML.slice(0, 160));

// ── removeFromTeam + setSick: sick runner must not reappear via fillGaps ──
const sickGap = S3.teams[0][3];
removeFromTeam(0, 3);
assert('sick-gap: runner back in reserve pool', unassignedRunners().includes(sickGap));
setSick(S3.runners.indexOf(sickGap), true);
assert('sick-gap: runner flagged kipeä', sickGap.kipea === true);
fillGaps();
assert('sick-gap: gap filled with non-sick runner', S3.teams[0][3] && S3.teams[0][3] !== sickGap, S3.teams[0][3] && S3.teams[0][3].nimi);
assert('sick-gap: sick runner stays out of all teams', !S3.teams.some(t => t.includes(sickGap)));
assert('sick-gap: teams full after fill', S3.teams.every(t => t.filter(Boolean).length === 15));

// ── CSV ──
const csv = toCSV();
assert('csv: BOM', csv.charCodeAt(0) === 0xFEFF);
const rows = parseCSV(csv, ',');
assert('csv: rows = teams + 1', rows.length === S3.teams.length + 1, String(rows.length));
assert('csv: 15 blocks only', rows[0].includes('Nimi-15') && rows[0].includes('Osuus-15') && !rows[0].includes('Nimi-16'));
assert('csv: data row width 125', rows[1].length === 125, String(rows[1].length));
const r = rows[1];
assert('csv: base cells', r[0] === '1' && r[1] === 'Kilpasarja' && r[2].includes(' 1') && r[4] === S.klubi, JSON.stringify(r.slice(0, 5)));
assert('csv: slot0 Nimi + osuus 1', r[6] === S3.teams[0][0].nimi && r[9] === '1' && r[10] === '');
assert('csv: slot1 osuus2 ala1 rata violetti', r[5 + 1 * 8 + 4] === '2' && r[5 + 1 * 8 + 5] === '1' && r[5 + 1 * 8 + 6].includes('violetti'));
assert('csv: slot13 osuus14, slot14 osuus15', r[5 + 13 * 8 + 4] === '14' && r[5 + 14 * 8 + 4] === '15');
assert('csv: avoin row sarja', rows[3][1] === 'Avoin', rows[3][1]);

// ── serialize/restore round-trip ──
const snap = serializeState();
const orig0 = S3.teams[0][0];
S3.teams = [];
assert('serialize: teams as indices', Number.isInteger(snap.teams[0][0]));
assert('serialize: kilpaCount saved', snap.kilpaCount === 2, String(snap.kilpaCount));
assert('restore: returns true', restoreState(JSON.parse(JSON.stringify(snap))) === true);
assert('restore: teams rebuilt', S3.teams.length === 3 && S3.teams[0][0] && S3.teams[0][0].nimi === orig0.nimi, S3.teams[0][0] && S3.teams[0][0].nimi);
assert('restore: kilpaCount restored', S3.kilpaCount === 2, String(S3.kilpaCount));
assert('restore: avoin team mode preserved', validateTeam(S3.teams[2], slots, 'avoin').length === 0);

// ── packTeam: first-legs-first repacking (kilpa) ──
// front-packing check: no empty slot before a filled one, excluding os15 (slot 14,
// joka on naiselle varattu ja voi jäädä täytetyksi vaikka os14 olisi tyhjä).
function frontPacked(t) {
  let gap = false;
  for (let s = 0; s < 14; s++) { if (!t[s]) gap = true; else if (gap) return false; }
  return true;
}
S3.teams = [okTeam.slice()]; S3.kilpaCount = 1;
S3.teams[0][0] = null; S3.teams[0][4] = null;
packTeam(0);
const pk = S3.teams[0];
assert('packTeam kilpa: no empty slot before filled', frontPacked(pk), pk.map(x => x ? 1 : 0).join(''));
assert('packTeam kilpa: all 13 runners kept', pk.filter(Boolean).length === 13, String(pk.filter(Boolean).length));
assert('packTeam kilpa: os15 woman', pk[14] && legEligible(pk[14], 15, 'kilpa'), pk[14] && pk[14].nimi);
assert('packTeam kilpa: os1 eligible', pk[0] && legEligible(pk[0], 1, 'kilpa'), pk[0] && pk[0].nimi);

// ── packTeam: first-legs-first repacking (avoin) ──
const avTeam = new Array(15).fill(null);
parsePool('H16:A\nH21:B\nH21:C\nH21:D\nH21:E\nH21:F\nH21:G\nH21:H\nH21:I\nH21:J\nH21:K\nH21:L\nH21:M\nH21:N\nH21:O').forEach((r, i) => { avTeam[i] = r; });
S3.teams = [avTeam]; S3.kilpaCount = 0;
avTeam[5] = null; avTeam[7] = null;
packTeam(0);
const packedAvoin = S3.teams[0];
assert('packTeam avoin: no empty slot before filled', frontPacked(packedAvoin), packedAvoin.map(x => x ? 1 : 0).join(''));
assert('packTeam avoin: os1 eligible', packedAvoin[0] && legEligible(packedAvoin[0], 1, 'avoin'), packedAvoin[0] && packedAvoin[0].nimi);
assert('packTeam avoin: all 13 runners kept', packedAvoin.filter(Boolean).length === 13, String(packedAvoin.filter(Boolean).length));

// ── regression: fillGaps may borrow one runner from a full later team (the
//    Avoin team) when the pool is empty, but must never drain it further and
//    must keep first legs filled. (45-runner pool from the saved plan that
//    originally exposed the bug)
const REGRESS_POOL = [
  'H16:Pesonen Esa','D21:Laine Minna:3','D21:Pesonen Maija','D21:Hakala Pauliina','D21:Laine Marja',
  'D16:Nurmi Tuuli','D14:Heinonen Katja','H13:Mäkelä Aapo:1','H65:Heikkinen Jouni:1','H55:Lehtonen Teemu',
  'H14:Hakala Esa','H21:Lehtonen Aleksi','H35:Salmi Eino','H18:Helenius Teemu:3','H21:Miettinen Juha',
  'H16:Helenius Olli:3','D21:Salmi Minna','D21:Järvinen Katariina','D21:Salminen Hanna','D21:Pesonen Päivi',
  'D16:Toivonen Emma','D14:Aho Satu','H13:Koskela Kaapo','H65:Mäkelä Pekka','H55:Heikkinen Niilo',
  'H14:Salmi Niilo:2','H21:Lehtonen Sami','H35:Sipilä Seppo:1','H18:Salminen Olli:2','H21:Räsänen Kalle',
  'H16:Kivelä Seppo','D21:Hakala Outi:1','H21:Kivelä Aapo','H21:Ranta Esa','H21:Nurmi Pasi:1',
  'H21:Hakala Juha','H35:Toivonen Vesa','H35:Nieminen Teemu','H35:Aho Teemu:1','H40:Virtanen Paavo',
  'H40:Mäkelä Vesa','H45:Virtanen Seppo:1','H45:Nieminen Aapo:3','H18:Aaltonen Teemu:2','H18:Koskela Lauri'
].join('\n');
getEl('poolText').value = REGRESS_POOL;
generateAll();
const S7 = __S();
const sickA = S7.runners.find(r => r.nimi === 'Hakala Pauliina');
const sickB = S7.runners.find(r => r.nimi === 'Nurmi Tuuli');
assert('regress: pool → 3 teams (2 kilpa + 1 avoin)', S7.teams.length === 3 && S7.kilpaCount === 2, JSON.stringify({ n: S7.teams.length, k: S7.kilpaCount }));
assert('regress: avoin team complete after generation', S7.teams[2].filter(Boolean).length === 15 && S7.teams[2][0] && S7.teams[2][1], S7.teams[2].map(x => x && x.nimi).slice(0, 3).join(','));
assert('regress: sick runners found', !!sickA && !!sickB, String(!!sickA) + ',' + String(!!sickB));
setSick(S7.runners.indexOf(sickA), true);
setSick(S7.runners.indexOf(sickB), true);
fillGaps();
assert('regress: all teams front-packed (os15 reservation exempt)', S7.teams.every(frontPacked), JSON.stringify(S7.teams.map(t => t.map(x => x ? 1 : 0).join(''))));
assert('regress: avoin team first legs filled', S7.teams[2][0] && S7.teams[2][1], S7.teams[2].map(x => x && x.nimi).slice(0, 2).join(','));
assert('regress: kilpa gap filled via relaxed steal from later team', S7.teams[0].filter(Boolean).length === 15, String(S7.teams[0].filter(Boolean).length));
assert('regress: first kilpa team complete and valid', validateTeam(S7.teams[0], slots, 'kilpa').length === 0, validateTeam(S7.teams[0], slots, 'kilpa').join(';'));
assert('regress: avoin team untouched and complete', S7.teams[2].filter(Boolean).length === 15 && validateTeam(S7.teams[2], slots, 'avoin').length === 0, validateTeam(S7.teams[2], slots, 'avoin').join(';'));
assert('regress: lending kilpa team partial (13/15)', S7.teams[1].filter(Boolean).length === 13 && validateTeam(S7.teams[1], slots, 'kilpa').every(e => /^keskeneräinen/.test(e)), validateTeam(S7.teams[1], slots, 'kilpa').join(';'));
assert('regress: all runners distinct', new Set(S7.teams.flat().filter(Boolean)).size === 43, String(new Set(S7.teams.flat().filter(Boolean)).size));
assert('regress: kilpa teams keep their 5+ women', S7.teams.slice(0, S7.kilpaCount).every(t => validateTeam(t, slots, 'kilpa').every(p => !p.includes('naisia 4/5'))));

// ── example pools ──
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const origRandom = Math.random;
Math.random = mulberry32(42);
loadExamplePool(45);
Math.random = origRandom;
const ex45 = getEl('poolText').value.split('\n').filter(Boolean);
assert('example 45: 45 lines', ex45.length === 45, String(ex45.length));
assert('example 45: Sarja:Nimi format', ex45.every(l => /^[HD]\d+:[A-ZÄÖa-zäö]+ [A-ZÄÖa-zäö]+/.test(l)), ex45.slice(0, 3).join(' | '));
assert('example 45: runners loaded', __S().runners.length === 45, String(__S().runners.length));
generateAll();
const S4 = __S();
assert('example 45: kilpa + avoin teams, all valid', S4.teams.length >= 3 && S4.kilpaCount >= 1 && S4.teams.length > S4.kilpaCount && S4.teams.every((t, i) => validateTeam(t, slots, i < S4.kilpaCount ? 'kilpa' : 'avoin').length === 0), JSON.stringify({ n: S4.teams.length, k: S4.kilpaCount }));

// ── live pool sync ──
getEl('poolText').value = S4.runners.map(r => r.sarja + ':' + r.nimi + (r.toive ? ':' + r.toive : '')).join('\n');
const teamsBefore = S4.teams.length;
syncPool();
assert('syncPool: unchanged text does not wipe teams', S4.teams.length === teamsBefore, String(S4.teams.length));
getEl('poolText').value += '\nH21:Uusi Juoksija';
syncPool();
assert('syncPool: new line adds runner', S4.runners.some(r => r.nimi === 'Uusi Juoksija'), String(S4.runners.length));
assert('syncPool: real change clears teams', S4.teams.length === 0, String(S4.teams.length));
assert('syncPool: pool list back on when teams cleared', S4.showPool === true, String(S4.showPool));
getEl('poolText').value = '';
syncPool();
assert('syncPool: cleared text empties pool', S4.runners.length === 0 && S4.teams.length === 0, String(S4.runners.length));

Math.random = mulberry32(7);
loadExamplePool(60);
Math.random = origRandom;
generateAll();
const S5 = __S();
assert('example 60: teams generated & valid', S5.teams.length >= 4 && S5.teams.every((t, i) => validateTeam(t, slots, i < S5.kilpaCount ? 'kilpa' : 'avoin').length === 0), JSON.stringify({ n: S5.teams.length, k: S5.kilpaCount }));

Math.random = mulberry32(11);
loadExamplePool(75);
Math.random = origRandom;
generateAll();
const S6 = __S();
assert('example 75: teams generated & valid', S6.teams.length >= 4 && S6.teams.every((t, i) => validateTeam(t, slots, i < S6.kilpaCount ? 'kilpa' : 'avoin').length === 0), JSON.stringify({ n: S6.teams.length, k: S6.kilpaCount }));

// ── error paths ──
getEl('poolText').value = 'H21:A\nH21:B\nH21:C';
generateAll();
assert('err: <15 runners → vähintään 15', getEl('statusBar').innerHTML.includes('vähintään 15'), getEl('statusBar').innerHTML.slice(0, 120));
assert('err: <15 runners keeps previous teams (kuten 25-mannassa)', __S().teams.length === 5, String(__S().teams.length));
getEl('poolText').value = new Array(15).fill('H21').map((s, i) => s + ':Mies' + i).join('\n');
generateAll();
assert('err: no formable team → teams cleared', __S().teams.length === 0, String(__S().teams.length));
assert('err: infeasible message shown', /ei voitu muodostaa/.test(getEl('statusBar').innerHTML), getEl('statusBar').innerHTML.slice(0, 160));

// ── cascade regression (25-manna (6b) -vastine): joukkuussa 0 on KAKSI aukkoa
//    ja piilopuutos (osuudet 2-5: -H13/H65- 1/2), poolissa ei ole terveitä
//    varamiehiä. Yhden ryöstön kerrallaan validointi ei korjaa joukkuetta 0;
//    peräkkäisryöstö täyttää molemmat aukot (ensimmäinen lisää tarvitun H65:n)
//    ja joukkuu 0 tulee validiksi 15/15, joukkuu 1 jää vajaaksi. ──
const CASC_POOL = [
  'H50:Virtanen Matti', 'D21:Laine Katri', 'D21:Pesonen Mari', 'H21:Nurmi Kalle', 'D16:Aho Eeva',
  'H16:Salmi Jussi', 'H65:Heikkinen Unto', 'D20:Hakala Tuula', 'H21:Lehtonen Pekka', 'H55:Mäkelä Arvo',
  'D18:Järvinen Satu', 'H18:Virtanen Juha', 'D45:Toivonen Lea',
  'H65:Heikkinen Olavi', 'D16:Nurmi Ulla', 'H21:Hakala Heikki', 'H21:Salmi Olli', 'H21:Laine Aarne',
  'D14:Pesonen Riitta', 'H21:Kivelä Tauno', 'H13:Aho Mikko', 'D18:Järvinen Anja', 'D20:Toivonen Sirpa',
  'H55:Mäkelä Reino', 'H16:Virtanen Saku', 'H65:Heikkinen Paavo', 'H18:Laine Jorma', 'D45:Hakala Kaarina',
].join('\n');
const CASC_TEAMS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, null, null, 12],
  [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
];
function loadCasc() {
  const runners = parsePool(CASC_POOL);
  const st = __S();
  st.runners = runners;
  st.kilpaCount = 2;
  st.teams = CASC_TEAMS.map(t => t.map(i => (Number.isInteger(i) && runners[i]) ? runners[i] : null));
  return st;
}
const Sc = loadCasc();
assert('casc: initial state (13/15 + 15/15)', Sc.teams[0].filter(Boolean).length === 13 && Sc.teams[1].filter(Boolean).length === 15);
assert('casc: no healthy spares in pool', Sc.runners.filter(r => !r.kipea && !Sc.teams.some(t => t.includes(r))).length === 0);
fillGaps();
assert('casc fillGaps: team0 complete 15/15', Sc.teams[0].filter(Boolean).length === 15, String(Sc.teams[0].filter(Boolean).length));
assert('casc fillGaps: team0 valid (hidden catE fixed)', validateTeam(Sc.teams[0], slots, 'kilpa').length === 0, validateTeam(Sc.teams[0], slots, 'kilpa').join(';'));
assert('casc fillGaps: source team partial (13/15)', Sc.teams[1].filter(Boolean).length === 13 && validateTeam(Sc.teams[1], slots, 'kilpa').every(e => /^keskeneräinen/.test(e)), validateTeam(Sc.teams[1], slots, 'kilpa').join(';'));
assert('casc fillGaps: all runners distinct', new Set(Sc.teams.flat().filter(Boolean)).size === 28, String(new Set(Sc.teams.flat().filter(Boolean)).size));
assert('casc fillGaps: feedback shows filled count', /Täytettiin/.test(getEl('statusBar').innerHTML), getEl('statusBar').innerHTML.slice(0, 160));
const Scc = loadCasc();
optimize();
assert('casc optimize: team0 complete and valid', Scc.teams[0].filter(Boolean).length === 15 && validateTeam(Scc.teams[0], slots, 'kilpa').length === 0, validateTeam(Scc.teams[0], slots, 'kilpa').join(';'));
assert('casc optimize: source team partial (13/15)', Scc.teams[1].filter(Boolean).length === 13, String(Scc.teams[1].filter(Boolean).length));
assert('casc optimize: feedback shows Optimoidu', getEl('statusBar').innerHTML.includes('Optimoitu'), getEl('statusBar').innerHTML.slice(0, 160));

// ── XSS / CSV-injection: user input must never become live markup or formulas ──
assert('xss: esc neutralizes angle-bracket payload', esc('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;');
assert('xss: esc neutralizes quote/script payload', esc('"><script>alert(1)</script>') === '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
assert('xss: esc escapes single quote', esc("It's") === 'It&#39;s');
assert('xss: esc & ordering avoids double-escape', esc('&') === '&amp;' && esc('&lt;') === '&amp;lt;');

const XSS_NM = 'Virtanen<img src=x onerror=alert(1)>';
const XSS_MALE = 'Niemi"><script>alert(1)</script>';
const XSS_SR = 'H21"><svg onload=alert(1)>';
const POOL_XSS = mixedPool(2, 1)
  .replace(/^H21:H21-m-\d+$/m, 'H21:' + XSS_MALE)
  .replace(/^D21:D21-m-\d+$/m, 'D21:' + XSS_NM)
  .replace(/^H16:H16-m-\d+$/m, XSS_SR + ':X');
const Sx = __S();
getEl('poolText').value = POOL_XSS;
generateAll();
const pPool = getEl('poolWrap').innerHTML;
assert('xss: teams generated', Sx.teams.length === 3, String(Sx.teams.length));
assert('xss: pool accepts payload names', Sx.runners.some(r => r.nimi === XSS_NM) && Sx.runners.some(r => r.nimi === XSS_MALE) && Sx.runners.some(r => r.sarja === XSS_SR), Sx.runners.map(r => r.sarja + ':' + r.nimi).join('|'));
assert('xss: pool table name escaped', pPool.includes('&lt;img src=x onerror=alert(1)&gt;') && !pPool.includes('<img'), pPool.slice(0, 220));
assert('xss: payload sarja escaped in table', pPool.includes('&lt;svg onload=alert(1)&gt;') && !pPool.includes('<svg'), pPool.slice(0, 220));
assert('xss: statusBar no raw markup', !getEl('statusBar').innerHTML.includes('<img') && !getEl('statusBar').innerHTML.includes('<svg'), getEl('statusBar').innerHTML.slice(0, 160));

const xr = Sx.runners.find(r => r.nimi === XSS_NM);
Sx.teams[0][0] = xr;
renderAll();
assert('xss: team slot name escaped', getEl('teamsWrap').innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;') && !getEl('teamsWrap').innerHTML.includes('<img'), getEl('teamsWrap').innerHTML.slice(0, 220));
const xssMale = Sx.runners.find(r => r.nimi === XSS_MALE);
const xssOrig0 = Sx.teams[0][0];
Sx.teams[0][0] = xssMale;
renderStatus();
assert('xss: validateTeam problem line escaped', getEl('statusBar').innerHTML.includes('&lt;script&gt;') && !getEl('statusBar').innerHTML.includes('<script'), getEl('statusBar').innerHTML.slice(0, 200));
Sx.teams[0][0] = xssOrig0;

const XSS_EXTRA = { nimi: 'Extra<img src=x onerror=alert(2)>', sarja: 'H21', gender: 'M', num: 21, toive: null, nopeus: 0, luotettavuus: 0, kipea: false, locked: false };
Sx.runners.push(XSS_EXTRA);
renderChips();
assert('xss: reserve chips escaped', getEl('chipsWrap').innerHTML.includes('&lt;img') && !getEl('chipsWrap').innerHTML.includes('<img'), getEl('chipsWrap').innerHTML.slice(0, 160));
showWarn('Varoitus <img src=x onerror=alert(3)>');
assert('xss: showWarn escaped', getEl('statusBar').innerHTML.includes('&lt;img') && !getEl('statusBar').innerHTML.includes('<img'), getEl('statusBar').innerHTML.slice(0, 120));

const t0 = Sx.teams[0];
t0[0].nimi = '=HYPERLINK("http://evil",1)';
t0[1].nimi = '+SUM(1,1)';
t0[2].nimi = '@cmd|calc!A1';
t0[4].nimi = 'Aho "Kurre" Kalle';
Sx.klubi = '+SUM(1,1)';
const xssCsv = toCSV();
const xssRows = parseCSV(xssCsv, ',');
const xssR = xssRows[1];
assert('csv-inj: = name guarded', xssR[6].startsWith("'="), xssR[6]);
assert('csv-inj: + name guarded', xssR[14].startsWith("'+"), xssR[14]);
assert('csv-inj: @ name guarded', xssR[22].startsWith("'@"), xssR[22]);
assert('csv-inj: klubi guarded', xssR[4].startsWith("'+"), xssR[4]);
assert('csv-inj: plain quote name still round-trips', xssR[38] === 'Aho "Kurre" Kalle', xssR[38]);
assert('csv-inj: guarded cells still valid CSV (row width)', xssRows[1].length === 125, String(xssRows[1].length));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
