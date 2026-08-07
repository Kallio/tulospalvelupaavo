const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/25manna_joukkuesuunnittelija.html', 'utf8');
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

function buildPool(lines) {
  const L = [];
  const add = (c, n) => { for (let i = 0; i < n; i++) L.push(`${c}:${c}-${i}`); };
  lines.forEach(([c, n]) => add(c, n));
  return L.join('\n');
}

// pool designed so 2 teams are clearly feasible (with slack in scarce classes)
const POOL_62 = buildPool([
  ['H14', 6], ['H16', 4], ['H21', 12], ['H60', 3], ['H50', 2], ['H55', 2],
  ['D14', 4], ['D16', 4], ['D18', 4], ['D20', 2], ['D40', 4], ['D45', 3], ['D21', 12],
]);

// 25-runner minimal pool, 1 team + slack
const POOL_28 = buildPool([
  ['D21', 9], ['D16', 1], ['D18', 1], ['D45', 1], ['D20', 1],
  ['H21', 8], ['H14', 2], ['H16', 2], ['H60', 2], ['H50', 1],
]);

// ── parseSarja ──
assert('parseSarja: H21 → M/21', JSON.stringify(parseSarja('H21')) === '{"gender":"M","num":21}');
assert('parseSarja: D16 → N/16', JSON.stringify(parseSarja('D16')) === '{"gender":"N","num":16}');
assert('parseSarja: H-50 with dash → M/50', JSON.stringify(parseSarja('H-50')) === '{"gender":"M","num":50}');
assert('parseSarja: junk → null/null', JSON.stringify(parseSarja('Foo')) === '{"gender":null,"num":null}');

// ── legEligible ──
const M21 = parsePool('H21:X')[0], M16 = parsePool('H16:X')[0], M14 = parsePool('H14:X')[0],
      M50 = parsePool('H50:X')[0], M60 = parsePool('H60:X')[0], M55 = parsePool('H55:X')[0], M35 = parsePool('H35:X')[0];
const W21 = parsePool('D21:X')[0], W16 = parsePool('D16:X')[0], W14 = parsePool('D14:X')[0],
      W18 = parsePool('D18:X')[0], W20 = parsePool('D20:X')[0], W45 = parsePool('D45:X')[0], W40 = parsePool('D40:X')[0];
assert('leg: osuus1 woman only (M no, W yes)', !legEligible(M21, 1) && legEligible(W21, 1));
assert('leg: osuus15/16/17/18/24 woman only', [15,16,17,18,24].every(o => legEligible(W21, o) && !legEligible(M21, o)));
assert('leg: osuus2/11/25 all', [2,11,12,13,14,19,20,21,22,25].every(o => legEligible(M21, o) && legEligible(W21, o)));
assert('leg: osuus3-6 H≤16/H≥50 or woman', legEligible(M16, 3) && legEligible(M50, 3) && legEligible(W21, 3) && !legEligible(M21, 3) && !legEligible(M35, 3));
assert('leg: osuus7-10 H≤14/H≥60 or D≤18/D≥45', legEligible(M14, 7) && legEligible(M60, 7) && legEligible(W18, 7) && legEligible(W45, 7) && !legEligible(M16, 7) && !legEligible(W21, 7));
assert('leg: osuus23 H≤16/H≥55 or D≤20/D≥40', legEligible(M16, 23) && legEligible(M55, 23) && legEligible(W20, 23) && legEligible(W40, 23) && !legEligible(M21, 23) && !legEligible(W21, 23));

// ── teamRequirements (full-team style inputs: 9 men + 9 women) ──
const mk = (cls, n) => parsePool(Array.from({ length: n }, (_, i) => `${cls}:${cls}-${i}`).join('\n'));
const men9 = mk('H16', 1).concat(mk('H21', 8));
const women9 = mk('D16', 1).concat(mk('D21', 8));
const fullTeam = men9.concat(women9);
assert('req: 9 men + 1 H≤16 and 9 women + 1 D≤16 ok', teamRequirements(fullTeam).length === 0, teamRequirements(fullTeam).join(';'));
assert('req: 8 men flagged', teamRequirements(men9.slice(0, 8).concat(women9)).some(p => p.includes('8/9')));
assert('req: no young man flagged', teamRequirements(mk('H21', 9).concat(women9)).some(p => p.includes('H16')));
assert('req: 9 H21 flagged over limit', teamRequirements(mk('H21', 9).concat(women9)).some(p => p.includes('9/8')));
assert('req: 8 women flagged', teamRequirements(men9.concat(women9.slice(0, 8))).some(p => p.includes('8/9')));

// ── SLOTS structure ──
const slots = __SLOTS();
assert('SLOTS: 25 slots', slots.length === 25);
assert('SLOTS: slot 0 osuus1', slots[0].osuus === 1 && slots[0].alaosuus === '');
assert('SLOTS: slot 2 osuus3 ala1', slots[2].osuus === 3 && slots[2].alaosuus === '1');
assert('SLOTS: slot 5 osuus3 ala4', slots[5].osuus === 3 && slots[5].alaosuus === '4');
assert('SLOTS: slot 6 osuus7 ala1', slots[6].osuus === 7 && slots[6].alaosuus === '1');
assert('SLOTS: slot 14 osuus15 ala1', slots[14].osuus === 15 && slots[14].alaosuus === '1');
assert('SLOTS: slot 22 osuus23, 23 osuus24, 24 osuus25', slots[22].osuus === 23 && slots[23].osuus === 24 && slots[24].osuus === 25);

// ── generation: minimal 1-team pool ──
const pool28 = parsePool(POOL_28);
const g1 = generateTeams(pool28, 1);
assert('gen 28: 1 team generated', g1.count === 1 && g1.teams.length === 1, JSON.stringify(g1));
assert('gen 28: team valid', validateTeam(g1.teams[0], slots).length === 0, validateTeam(g1.teams[0], slots).join(';'));
assert('gen 28: leftovers 3', g1.leftovers.length === 3, String(g1.leftovers.length));

// ── generation: 2-team pool ──
const pool62 = parsePool(POOL_62);
const g2 = generateTeams(pool62, 2);
assert('gen 62: 2 teams generated', g2.count === 2 && g2.teams.length === 2, JSON.stringify({ count: g2.count, len: g2.teams.length, err: g2.error }));
assert('gen 62: both teams valid', g2.teams.every(t => validateTeam(t, slots).length === 0), validateTeam(g2.teams[0], slots).concat(validateTeam(g2.teams[1], slots)).join(';'));
assert('gen 62: leftovers 12', g2.leftovers.length === 12, String(g2.leftovers.length));
assert('gen 62: no runner appears twice', new Set(g2.teams.flat().map(r => r.nimi)).size === 50);
assert('gen 62: each team 25 runners', g2.teams.every(t => t.filter(Boolean).length === 25));

// ── pref-first ordering ──
const poolPref = POOL_62.split('\n').map(l => (/^D21:D21-[0-2]$/.test(l) ? l + ':1' : l)).join('\n');
const gp = generateTeams(parsePool(poolPref), 2);
const prefNames = ['D21-0', 'D21-1', 'D21-2'];
assert('gen pref: team1 contains all 3 toive=1 runners', prefNames.every(n => gp.teams[0].some(r => r && r.nimi === n)), gp.teams[0].filter(Boolean).map(r => r.nimi).join(','));

// ── DOM flow: readPool + generateAll ──
getEl('poolText').value = POOL_62;
getEl('toiveFirst').checked = true;
getEl('wSpeed').value = '0.7';
generateAll();
const S = __S();
assert('DOM generateAll: 2 teams', S.teams.length === 2, String(S.teams.length));
assert('DOM generateAll: teams valid after optimize', S.teams.every(t => validateTeam(t, slots).length === 0));
assert('DOM generateAll: statusBar has 2 teams + ok line', getEl('statusBar').innerHTML.includes('2</b> joukkuetta') && getEl('statusBar').innerHTML.includes('Kaikki joukkuelistat kelvollisia'), getEl('statusBar').innerHTML.slice(0, 200));
assert('DOM renderTeams: pool table rendered', getEl('poolWrap').innerHTML.includes('Juoksijat ja pisteet'));
assert('DOM renderPanel: strength rows', getEl('statusPanel').innerHTML.includes('vahvuudet') || getEl('statusPanel').innerHTML.includes('Vahvuudet'));

// ── sick replacement (pool-first fill) ──
const extra = { nimi: 'Extra Woman', sarja: 'D21', gender: 'N', num: 21, toive: 1, nopeus: 8, luotettavuus: 8, kipea: false, locked: false };
S.runners.push(extra);
const victim = S.teams[0][0];
setSick(S.runners.indexOf(victim), true);
assert('sick: victim flagged', victim.kipea === true);
assert('sick: victim removed from team', !S.teams[0].includes(victim) && !S.teams[1].includes(victim));
assert('sick: slot0 refilled with Extra Woman (toive-prioritised)', S.teams[0][0] === extra, S.teams[0][0] && S.teams[0][0].nimi);
assert('sick: team0 still valid', validateTeam(S.teams[0], slots).length === 0, validateTeam(S.teams[0], slots).join(';'));
assert('sick: teams length unchanged', S.teams.length === 2);
assert('sick: sick runner excluded from pool candidates', unassignedRunners().includes(victim));

// ── performMove: valid pool → team (occupant to pool) ──
const mover = { nimi: 'Move Man', sarja: 'H21', gender: 'M', num: 21, toive: null, nopeus: 5, luotettavuus: 5, kipea: false, locked: false };
S.runners.push(mover);
const backupN = S.teams[1][1]; // osuus 2 slot (kaikki) in team 2
performMove(S.runners.indexOf(mover), 1, 1);
assert('move: mover in team2 slot1', S.teams[1][1] === mover, S.teams[1][1] && S.teams[1][1].nimi);
assert('move: previous occupant went to pool', unassignedRunners().includes(backupN));
assert('move: both teams still valid', validateTeam(S.teams[0], slots).length === 0 && validateTeam(S.teams[1], slots).length === 0);

// ── performMove: invalid move rejected ──
const mover2 = { nimi: 'Move Man 2', sarja: 'H21', gender: 'M', num: 21, toive: null, nopeus: 5, luotettavuus: 5, kipea: false, locked: false };
S.runners.push(mover2);
const slot0Before = S.teams[0][0];
performMove(S.runners.indexOf(mover2), 0, 0); // man → women-only slot 1
assert('move: man to women-only slot rejected', S.teams[0][0] === slot0Before && !S.teams[0].includes(mover2), S.teams[0][0] && S.teams[0][0].nimi);
assert('move: rejection warned', getEl('statusBar').innerHTML.includes('estetty'), getEl('statusBar').innerHTML.slice(0, 160));
assert('move: rejected mover stays in pool', unassignedRunners().includes(mover2));

// ── move from another team into an empty slot (gap stays in source team) ──
const removedFromSlot = S.teams[0][24];
removeFromTeam(0, 24);
const t1Count0 = S.teams[1].filter(Boolean).length;
const gapRunner = S.teams[1].find(r => r && r.gender === removedFromSlot.gender && !isH21(r));
assert('gap: same-gender replacement available in team1', !!gapRunner);
performMove(S.runners.indexOf(gapRunner), 0, 24);
assert('gap: runner from team1 landed in empty slot', S.teams[0][24] === gapRunner, S.teams[0][24] && S.teams[0][24].nimi);
assert('gap: target team back to 25', S.teams[0].filter(Boolean).length === 25, String(S.teams[0].filter(Boolean).length));
assert('gap: source team left with a gap (not auto-refilled)', S.teams[1].filter(Boolean).length === t1Count0 - 1, String(S.teams[1].filter(Boolean).length));
assert('gap: target team still valid', validateTeam(S.teams[0], slots).length === 0, validateTeam(S.teams[0], slots).join(';'));

// ── fillGaps: refill gaps from varamiehet ──
const gapsBefore = S.teams.reduce((n, tm) => n + tm.filter(x => !x).length, 0);
assert('fillGaps: exactly one gap to fill', gapsBefore === 1, String(gapsBefore));
fillGaps();
const gapsAfter = S.teams.reduce((n, tm) => n + tm.filter(x => !x).length, 0);
assert('fillGaps: gap refilled from pool', gapsAfter === 0, String(gapsAfter));
assert('fillGaps: both teams 25/25', S.teams.every(t => t.filter(Boolean).length === 25));
assert('fillGaps: feedback message shown', /Täytettiin|täytetty/.test(getEl('statusBar').innerHTML), getEl('statusBar').innerHTML.slice(0, 160));

// ── removeFromTeam: removes to pool, slot left empty ──
const victim2 = S.teams[0][1];
removeFromTeam(0, 1);
assert('remove: slot left empty', S.teams[0][1] === null, String(S.teams[0][1]));
assert('remove: victim moved to pool', unassignedRunners().includes(victim2));
assert('remove: team0 incomplete (24/25)', validateTeam(S.teams[0], slots)[0].startsWith('keskeneräinen'), validateTeam(S.teams[0], slots).join(';'));
const filler = unassignedRunners().find(r => !r.kipea);
assert('remove: non-sick filler available in pool', !!filler);
performMove(S.runners.indexOf(filler), 0, 1);
assert('remove: refilled by dragging pool runner, team valid again', S.teams[0][1] === filler && validateTeam(S.teams[0], slots).length === 0, validateTeam(S.teams[0], slots).join(';'));
assert('remove: statusBar has no Joukkku typo', !getEl('statusBar').innerHTML.includes('Joukkku'));

// ── CSV ──
const csv = toCSV();
assert('csv: BOM', csv.charCodeAt(0) === 0xFEFF);
const rows = parseCSV(csv, ',');
assert('csv: rows = teams + 1', rows.length === S.teams.length + 1, String(rows.length));
assert('csv: header 25 blocks', rows[0].includes('Nimi-25') && rows[0].includes('Osuus-25') && rows[0].includes('Lähtöaika-25') && !rows[0].includes('Nimi-26'));
assert('csv: data row width 205', rows[1].length === 205, String(rows[1].length));
const r = rows[1];
assert('csv: base cells', r[0] === '1' && r[1] === '25-manna' && r[2].includes(' 1') && r[4] === S.klubi, JSON.stringify(r.slice(0, 5)));
assert('csv: slot0 Nimi + osuus 1', r[5 + 0 * 8 + 1] === S.teams[0][0].nimi && r[5 + 0 * 8 + 4] === '1' && r[5 + 0 * 8 + 5] === '');
assert('csv: slot2 osuus3 ala1 rata Oranssi', r[5 + 2 * 8 + 4] === '3' && r[5 + 2 * 8 + 5] === '1' && r[5 + 2 * 8 + 6] === 'Oranssi 4,7 km');
assert('csv: slot14 osuus15, slot23 osuus24, slot24 osuus25', r[5 + 14 * 8 + 4] === '15' && r[5 + 23 * 8 + 4] === '24' && r[5 + 24 * 8 + 4] === '25');
assert('csv: every slot Nimi present', [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24].every(b => r[5 + b * 8 + 1] !== ''));
assert('csv: Lainakortti empty', r[5 + 3 * 8 + 3] === '');

// ── serialize/restore round-trip ──
const snap = serializeState();
const orig0 = S.teams[0][0];
S.teams = [];
assert('serialize: teams stored as indices', Number.isInteger(snap.teams[0][0]));
assert('restore: returns true', restoreState(JSON.parse(JSON.stringify(snap))) === true);
assert('restore: teams rebuilt', S.teams.length === 2 && S.teams[0][0] && S.teams[0][0].nimi === orig0.nimi, S.teams[0][0] && S.teams[0][0].nimi);
assert('restore: gender/num round-trip keeps eligibility', S.teams[0].filter(r => r && legEligible(r, 7)).length >= 3, String(S.teams[0].filter(r => r && legEligible(r, 7)).length));
assert('restore: sick flag round-trips', S.runners.find(r => r.nimi === victim.nimi).kipea === true);

// ── generateTeams failure path ──
const bad = generateTeams(parsePool(['D21:A', 'D21:B', 'D21:C'].join('\n')), 1);
assert('gen: impossible pool → error message', !!bad.error && bad.error.includes('vähintään'), bad.error);

// ── loadExamplePool: must terminate and produce a 55-line pool ──
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
loadExamplePool();
Math.random = origRandom;
const exLines = getEl('poolText').value.split('\n').filter(Boolean);
assert('example pool: 55 lines (no infinite loop)', exLines.length === 55, String(exLines.length));
assert('example pool: every line is Sarja:Nimi', exLines.every(l => /^[HD]\d+:[A-ZÄÖa-zäö]+ [A-ZÄÖa-zäö]+/.test(l)), exLines.slice(0, 3).join(' | '));
assert('example pool: S.runners loaded', __S().runners.length === 55, String(__S().runners.length));
const exGen = generateTeams(__S().runners, 2);
assert('example pool: generates 2 valid teams', exGen.count === 2 && exGen.teams.every(t => validateTeam(t, __SLOTS()).length === 0), String(exGen.count) + ' ' + (exGen.error || ''));

// ── example pools 80 and 105 ──
Math.random = mulberry32(7);
loadExamplePool(80);
Math.random = origRandom;
assert('example pool 80: 80 runners', __S().runners.length === 80, String(__S().runners.length));
const exGen80 = generateTeams(__S().runners, 3);
assert('example pool 80: generates 3 valid teams', exGen80.count === 3 && exGen80.teams.every(t => validateTeam(t, __SLOTS()).length === 0), String(exGen80.count) + ' ' + (exGen80.error || ''));
Math.random = mulberry32(11);
loadExamplePool(105);
Math.random = origRandom;
assert('example pool 105: 105 runners', __S().runners.length === 105, String(__S().runners.length));
const exGen105 = generateTeams(__S().runners, 4);
assert('example pool 105: generates 4 valid teams', exGen105.count === 4 && exGen105.teams.every(t => validateTeam(t, __SLOTS()).length === 0), String(exGen105.count) + ' ' + (exGen105.error || ''));

// ── sequential display numbering (1..25) with real osuus kept in CSV ──
const d = [];
for (let i = 0; i < 25; i++) d.push(dispLeg(i));
assert('dispLeg: sequential 1..25 labels', JSON.stringify(d) === JSON.stringify(['1','2','3.1','3.2','3.3','3.4','4.1','4.2','4.3','4.4','5.1','5.2','5.3','5.4','6.1','6.2','6.3','6.4','7.1','7.2','7.3','7.4','8','9','10']), d.join(','));
assert('dispLeg: no jump 3.4 -> 7.1', d[5] === '3.4' && d[6] === '4.1', d[5] + ' -> ' + d[6]);
assert('grpTint: 25 classes in {0..3}', [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24].every(i => /^grp[0-3]$/.test(grpTint(i))));

// ── click-to-sort pool table ──
S.poolSort = 'order'; S.poolDir = 1;
renderPoolTable();
const hdr = getEl('poolWrap').innerHTML;
assert('sort: header onclick handlers present', hdr.includes("sortPool('nimi')") && hdr.includes("sortPool('vahvuus')") && hdr.includes("sortPool('tilanne')"));
assert('sort: Lajittelu select removed', !hdr.includes('Lajittelu:'));
sortPool('nimi');
assert('sort: active header shows ▲', getEl('poolWrap').innerHTML.includes('Nimi ▲'), getEl('poolWrap').innerHTML.slice(0, 300));
const byName = poolRows().map(x => x.r.nimi);
assert('sort: nimi asc', byName.every((n, i) => i === 0 || byName[i - 1] <= n), byName.slice(0, 5).join(','));
sortPool('nimi');
assert('sort: second click toggles desc', S.poolDir === -1 && poolRows().map(x => x.r.nimi).every((n, i, a) => i === 0 || a[i - 1] >= n), String(S.poolDir));
sortPool('vahvuus');
const byV = poolRows().map(x => strengthOf(x.r));
assert('sort: vahvuus default desc', byV.every((s, i) => i === 0 || byV[i - 1] >= s));
sortPool('toive');
const tvals = poolRows().map(x => x.r.toive);
const firstNull = tvals.findIndex(v => v == null);
assert('sort: toive nulls last', firstNull === -1 || tvals.slice(firstNull).every(v => v == null), JSON.stringify(tvals));
assert('sort: toive asc values', tvals.filter(v => v != null).every((v, i, a) => i === 0 || a[i - 1] <= v));
const snapSort = serializeState();
assert('sort: poolSort/poolDir persisted', snapSort.poolSort === 'toive' && snapSort.poolDir === 1, snapSort.poolSort + '/' + snapSort.poolDir);
S.poolSort = 'order'; S.poolDir = 1;
restoreState(JSON.parse(JSON.stringify(snapSort)));
assert('sort: poolSort/poolDir restored', S.poolSort === 'toive' && S.poolDir === 1, S.poolSort + '/' + S.poolDir);
S.poolSort = 'order'; S.poolDir = 1;

// ── state merge: kipeä/vahvuudet/toive survive re-generate ──
Math.random = mulberry32(42);
loadExamplePool();
Math.random = origRandom;
const S2 = __S();
const mark = S2.runners[3];
mark.kipea = true;
mark.nopeus = 7; mark.luotettavuus = 6; mark.toive = 2;
getEl('poolText').value = S2.runners.map(r => r.sarja + ':' + r.nimi + (r.toive ? ':' + r.toive : '')).join('\n');
generateAll();
const S3 = __S();
const carried = S3.runners.find(r => r.nimi === mark.nimi && r.sarja === mark.sarja);
assert('merge: kipeä carried over after generate', carried && carried.kipea === true, carried && JSON.stringify({ k: carried.kipea }));
assert('merge: nopeus carried over after generate', carried && carried.nopeus === 7, carried && String(carried.nopeus));
assert('merge: toive carried over after generate', carried && carried.toive === 2, carried && String(carried.toive));
assert('merge: sick runner excluded from teams', !S3.teams.some(t => t.some(r => r && r.kipea)));

// ── optimize: feedback message, no throw ──
S3.teams = [];
optimize();
assert('optimize: warns when no teams', getEl('statusBar').innerHTML.includes('Generoi ensin'));
generateAll();
optimize();
assert('optimize: feedback shown with strengths', getEl('statusBar').innerHTML.includes('Optimoitu') && getEl('statusBar').innerHTML.includes('#1'), getEl('statusBar').innerHTML.slice(0, 200));

// ── JSON export/import round-trip reflects current inputs ──
const S4 = __S();
getEl('klubi').value = 'Kajo Team';
getEl('firstNum').value = '7';
getEl('wSpeed').value = '0.4';
getEl('toiveFirst').checked = false;
const snap2 = serializeState();
assert('json: export reflects current klubi input', snap2.klubi === 'Kajo Team', snap2.klubi);
assert('json: export reflects current firstNum input', snap2.firstNum === 7, String(snap2.firstNum));
assert('json: export reflects current wSpeed input', snap2.wSpeed === 0.4, String(snap2.wSpeed));
assert('json: export reflects toiveFirst checkbox', snap2.toiveFirst === false, String(snap2.toiveFirst));
assert('json: runners exported', Array.isArray(snap2.runners) && snap2.runners.length === S4.runners.length);
assert('json: teams exported as indices', Array.isArray(snap2.teams) && snap2.teams.length === S4.teams.length && Number.isInteger(snap2.teams[0][0]));
S.teams = [];
assert('json: restore returns true', restoreState(JSON.parse(JSON.stringify(snap2))) === true);
assert('json: restore rebuilds teams', S.teams.length === S4.teams.length && S.teams[0][0] && S.teams[0][0].nimi === S4.teams[0][0].nimi);
assert('json: restore keeps klubi', S.klubi === 'Kajo Team', S.klubi);
assert('json: restore keeps firstNum', S.firstNum === 7, String(S.firstNum));
assert('json: restore keeps wSpeed', S.wSpeed === 0.4, String(S.wSpeed));
assert('json: restore keeps toiveFirst', S.toiveFirst === false, String(S.toiveFirst));
assert('json: restore keeps view prefs', S.showPool === true && S.poolSort === 'order' && S.showRules === true);
const csv2 = toCSV();
assert('json: after restore club/number appear in CSV', csv2.includes('Kajo Team 1') && csv2.includes('"7"'), csv2.slice(0, 120));

// ── empty (null) slots survive round-trip ──
const S5 = __S();
const removedR = S5.teams[0][2];
removeFromTeam(0, 2);
const snap3 = serializeState();
assert('json: empty slot stored as null', snap3.teams[0][2] === null, String(snap3.teams[0][2]));
S.teams = [];
restoreState(JSON.parse(JSON.stringify(snap3)));
assert('json: empty slot restored as null', S.teams[0][2] === null, String(S.teams[0][2]));
assert('json: restored team 24/25', S.teams[0].filter(Boolean).length === 24, String(S.teams[0].filter(Boolean).length));
assert('json: removed runner back in pool after load', unassignedRunners().some(r => r.nimi === removedR.nimi && r.sarja === removedR.sarja));

// ── fillGaps cascade: steal from later team when pool lacks an eligible runner ──
const Sc = __S();
const s7 = Sc.teams[1].find(r => r && legEligible(r, 7));
assert('cascade: team1 has an osuus7-eligible runner', !!s7);
const s7slot = Sc.teams[1].indexOf(s7);
const slot1R = Sc.teams[1][1];
Sc.teams[1][1] = s7;
Sc.teams[1][s7slot] = slot1R;
removeFromTeam(0, 6);
for (const r of unassignedRunners()) if (legEligible(r, 7)) r.kipea = true;
fillGaps();
assert('cascade: team0 osuus7 gap filled from team1', Sc.teams[0][6] === s7, Sc.teams[0][6] && Sc.teams[0][6].nimi);
assert('cascade: team1 still 25 (refilled from pool)', Sc.teams[1].filter(Boolean).length === 25, String(Sc.teams[1].filter(Boolean).length));
assert('cascade: feedback shows filled count', /Täytettiin|täytetty/.test(getEl('statusBar').innerHTML), getEl('statusBar').innerHTML.slice(0, 160));

// ── kipeä resets luotettavuus to 0 ──
const relRunner = unassignedRunners().find(r => !r.kipea && !legEligible(r, 7));
assert('kipea reset: runner available to test', !!relRunner);
relRunner.luotettavuus = 8;
setSick(S.runners.indexOf(relRunner), true);
assert('kipea reset: luotettavuus zeroed when marked sick', relRunner.kipea === true && relRunner.luotettavuus === 0, String(relRunner.luotettavuus));

// ── cascade steals even when the pool cannot refill the later team ──
const Sd = __S();
removeFromTeam(0, 24);
for (const r of unassignedRunners()) r.kipea = true;
fillGaps();
assert('cascade2: team0 gap filled from team1 despite empty pool', Sd.teams[0][24] !== null, String(Sd.teams[0][24] && Sd.teams[0][24].nimi));
assert('cascade2: team1 left with a gap', Sd.teams[1].filter(x => !x).length >= 1, String(Sd.teams[1].filter(x => !x).length));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
