const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/nuorten_jukola_joukkuesuunnittelija.html', 'utf8');
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

// One valid 7-runner team: D14×2, D12, H12, H14, D16, D18.
const POOL_7 = buildPool([
  ['D14', 2], ['D12', 1], ['H12', 1], ['H14', 1], ['D16', 1], ['D18', 1],
]);

// Two valid teams + slack in the scarce classes (D14 girls cover osuudet 1,4,6).
const POOL_16 = buildPool([
  ['D14', 5], ['D12', 2], ['H12', 2], ['H14', 2], ['D16', 3], ['D18', 2],
]);

// ── parseSarja ──
assert('parseSarja: H21 → M/21', JSON.stringify(parseSarja('H21')) === '{"gender":"M","num":21}');
assert('parseSarja: D16 → N/16', JSON.stringify(parseSarja('D16')) === '{"gender":"N","num":16}');
assert('parseSarja: H-14 with dash → M/14', JSON.stringify(parseSarja('H-14')) === '{"gender":"M","num":14}');
assert('parseSarja: junk → null/null', JSON.stringify(parseSarja('Foo')) === '{"gender":null,"num":null}');

// ── birth-year input → youth sarja ──
const YY = new Date().getFullYear();
assert('sarjaByYear: 13v N → D14', parsePool(`Korhonen Elina:${YY - 13}:N`)[0].sarja === 'D14');
assert('sarjaByYear: 15v N → D16', parsePool(`Korhonen Elina:${YY - 15}:N`)[0].sarja === 'D16');
assert('sarjaByYear: 17v N → D18', parsePool(`Korhonen Elina:${YY - 17}:N`)[0].sarja === 'D18');
assert('sarjaByYear: 11v M → H12', parsePool(`Virtanen Matti:${YY - 11}:M`)[0].sarja === 'H12');
assert('sarjaByYear: 14v M → H14', parsePool(`Virtanen Matti:${YY - 14}:M`)[0].sarja === 'H14');
assert('sarjaByYear: 12v N gender/num', parsePool(`Virtanen Aino:${YY - 12}:N`)[0].gender === 'N' && parsePool(`Virtanen Aino:${YY - 12}:N`)[0].num === 12);
assert('sarjaByYear: optional toive part', parsePool(`Virtanen Aino:${YY - 13}:N:2`)[0].toive === 2);
assert('sarjaByYear: sarja:nimi format unchanged', parsePool('D14:Pesonen Aino')[0].sarja === 'D14' && parsePool('D14:Pesonen Aino')[0].toive === null);
assert('sarjaByYear: empty sarja still skipped', parsePool(':Nimi').length === 0);

// ── input sanitisation: garbage lines (URLs, unknown sarja) must not become runners ──
assert('sanitize: http:// alone → nothing', parsePool('http://').length === 0, JSON.stringify(parsePool('http://')));
assert('sanitize: http://foo → nothing', parsePool('http://foo').length === 0);
assert('sanitize: https://x.y/z → nothing', parsePool('https://x.y/z').length === 0);
assert('sanitize: http:foo → nothing', parsePool('http:foo').length === 0);
assert('sanitize: foo:bar unknown sarja → nothing', parsePool('foo:bar').length === 0);
assert('sanitize: mixed garbage + valid keeps valid only', parsePool('http://\nD14:Virtanen Aino\nfoo:bar').length === 1, JSON.stringify(parsePool('http://\nD14:Virtanen Aino\nfoo:bar')));
assert('sanitize: parsePoolLines counts skipped', parsePoolLines('http://\nfoo:bar\nD14:Virtanen Aino').skipped === 2, String(parsePoolLines('http://\nfoo:bar\nD14:Virtanen Aino').skipped));
assert('sanitize: adult sarja still accepted', parsePool('H21:Pesonen Antti').length === 1);
assert('sanitize: birth-year line still accepted', parsePool(`Virtanen Matti:${YY - 14}:M`).length === 1);

// ── legEligible: floor model ("s. 20XX–" = syntynyt mainittuna tai sen jälkeen) ──
const D12 = parsePool('D12:X')[0], H12 = parsePool('H12:X')[0],
      D14 = parsePool('D14:X')[0], H14 = parsePool('H14:X')[0],
      D16 = parsePool('D16:X')[0], H16 = parsePool('H16:X')[0],
      D18 = parsePool('D18:X')[0], H18 = parsePool('H18:X')[0],
      D21 = parsePool('D21:X')[0], H21 = parsePool('H21:X')[0];
assert('leg: osuus1 D16 → nainen n≤16', legEligible(D14, 1) && legEligible(D16, 1) && !legEligible(H14, 1) && !legEligible(D18, 1));
assert('leg: osuus2 H/D16 → n≤16', legEligible(H16, 2) && legEligible(D14, 2) && !legEligible(D18, 2) && !legEligible(H18, 2));
assert('leg: osuus3 H/D14 → n≤14', legEligible(H12, 3) && legEligible(D14, 3) && !legEligible(H16, 3) && !legEligible(D16, 3));
assert('leg: osuus4 D14 → nainen n≤14', legEligible(D12, 4) && legEligible(D14, 4) && !legEligible(H14, 4) && !legEligible(D16, 4));
assert('leg: osuus5 H/D14 → n≤14', legEligible(D14, 5) && legEligible(H14, 5) && !legEligible(D18, 5));
assert('leg: osuus6 D18 → nainen n≤18', legEligible(D16, 6) && legEligible(D18, 6) && !legEligible(H18, 6) && !legEligible(D21, 6));
assert('leg: osuus7 H/D18 → n≤18', legEligible(D18, 7) && legEligible(H18, 7) && legEligible(D14, 7) && !legEligible(H21, 7) && !legEligible(D21, 7));
assert('leg: adults ineligible', [1,2,3,4,5,6,7].every(o => !legEligible(H21, o)) && [1,2,3,4,5,6,7].every(o => !legEligible(D21, o)));
const badSarja = { nimi: 'X', sarja: 'Foo', gender: null, num: null };
assert('leg: null num ineligible', [1,2,3,4,5,6,7].every(o => !legEligible(badSarja, o)));
assert('leg: full matrix D12', [1,2,3,4,5,6,7].every(o => legEligible(D12, o)));
assert('leg: full matrix H14 → 2,3,5,7', [2,3,5,7].every(o => legEligible(H14, o)) && [1,4,6].every(o => !legEligible(H14, o)));

// ── teamRequirements: Nuorten Jukolalla ei ole joukkuetason kiintiöitä ──
assert('teamRequirements: empty for any roster', teamRequirements([H14, D14, H16, D16, H18, D18]).length === 0, teamRequirements([H14, D14, H16, D16, H18, D18]).join(';'));

// ── SLOTS structure ──
const slots = __SLOTS();
assert('SLOTS: 7 slots', slots.length === 7, String(slots.length));
assert('SLOTS: osuudet 1..7, no alaosuus', slots.map(s => s.osuus).join(',') === '1,2,3,4,5,6,7' && slots.every(s => s.alaosuus === ''));
assert('SLOTS: rata fields', slots[0].rata === 'Oranssi 4,5 km' && slots[2].rata === 'Valkoinen 2,3 km' && slots[3].rata === 'Keltainen 3,0 km' && slots[6].rata === 'Violetti 6,3 km');
assert('SLOTS: leg info fields', slots[0].info === 'Nainen D16 (s. 2010–)' && slots[2].info === 'H/D14 (s. 2012–)' && slots[6].info === 'H/D18 (s. 2008–)');
assert('dispLeg: 1..7 labels', [0,1,2,3,4,5,6].map(i => dispLeg(i)).join(',') === '1,2,3,4,5,6,7');
assert('grpTint: all in {0..3}', [0,1,2,3,4,5,6].every(i => /^grp[0-3]$/.test(grpTint(i))));

// ── generation: minimal 1-team pool ──
const pool7 = parsePool(POOL_7);
const g1 = generateTeams(pool7, 1);
assert('gen 7: 1 team generated', g1.count === 1 && g1.teams.length === 1, JSON.stringify(g1));
assert('gen 7: team valid', validateTeam(g1.teams[0], slots).length === 0, validateTeam(g1.teams[0], slots).join(';'));
assert('gen 7: no leftovers', g1.leftovers.length === 0, String(g1.leftovers.length));
assert('gen 7: each runner exactly once', new Set(g1.teams.flat().map(r => r.nimi)).size === 7);

// ── generation: 2-team pool ──
const pool16 = parsePool(POOL_16);
const g2 = generateTeams(pool16, 2);
assert('gen 16: 2 teams generated', g2.count === 2 && g2.teams.length === 2, JSON.stringify({ count: g2.count, len: g2.teams.length, err: g2.error }));
assert('gen 16: both teams valid', g2.teams.every(t => validateTeam(t, slots).length === 0), validateTeam(g2.teams[0], slots).concat(validateTeam(g2.teams[1], slots)).join(';'));
assert('gen 16: leftovers 2', g2.leftovers.length === 2, String(g2.leftovers.length));
assert('gen 16: no runner appears twice', new Set(g2.teams.flat().map(r => r.nimi)).size === 14);
assert('gen 16: each team 7 runners', g2.teams.every(t => t.filter(Boolean).length === 7));

// ── generation: impossible pool (no girls) → error ──
const noGirls = parsePool(['H12:A', 'H12:B', 'H14:C', 'H14:D', 'H16:E', 'H18:F', 'H12:G'].join('\n'));
const bad = generateTeams(noGirls, 1);
assert('gen: no-girls pool → error message', !!bad.error && /osuud/.test(bad.error) && bad.error.includes('naisen'), bad.error);

// ── pref-first ordering ──
const poolPref = POOL_16.split('\n').map(l => (/^D14:D14-[0-1]$/.test(l) ? l + ':1' : l)).join('\n');
const gp = generateTeams(parsePool(poolPref), 2);
assert('gen pref: team1 contains toive=1 runners', ['D14-0', 'D14-1'].every(n => gp.teams[0].some(r => r && r.nimi === n)), gp.teams[0].filter(Boolean).map(r => r.nimi).join(','));

// ── wizard step behaviour ──
renderAll();
assert('wizard initial: gen step collapsed', getEl('psBodyGen').style.display === 'none', String(getEl('psBodyGen').style.display));
assert('wizard initial: save step collapsed', getEl('psBodySave').style.display === 'none', String(getEl('psBodySave').style.display));
assert('wizard initial: pool step open', getEl('psBodyPool').style.display !== 'none', String(getEl('psBodyPool').style.display));

// ── DOM flow: readPool + generateAll ──
getEl('poolText').value = POOL_16;
getEl('toiveFirst').checked = true;
getEl('wSpeed').value = '0.7';
generateAll();
const S = __S();
assert('DOM generateAll: 2 teams', S.teams.length === 2, String(S.teams.length));
assert('DOM generateAll: teams valid after optimize', S.teams.every(t => validateTeam(t, slots).length === 0));
assert('DOM generateAll: statusBar 2 teams + ok line', getEl('statusBar').innerHTML.includes('2</b> joukkuetta') && getEl('statusBar').innerHTML.includes('Kaikki joukkuelistat kelvollisia'), getEl('statusBar').innerHTML.slice(0, 200));
assert('DOM renderTeams: pool table rendered', getEl('poolWrap').innerHTML.includes('Juoksijat ja pisteet'));
assert('DOM renderTeams: sick button on every runner line', (getEl('teamsWrap').innerHTML.match(/onclick="setSick\(/g) || []).length === 14, String((getEl('teamsWrap').innerHTML.match(/onclick="setSick\(/g) || []).length));
assert('DOM renderTeams: 7 slot rows per team', (getEl('teamsWrap').innerHTML.match(/class="slot-row/g) || []).length === 14, String((getEl('teamsWrap').innerHTML.match(/class="slot-row/g) || []).length));
assert('wizard after gen: pool step collapsed', getEl('psBodyPool').style.display === 'none', String(getEl('psBodyPool').style.display));

// ── sick replacement (pool-first fill) ──
const extra = { nimi: 'Extra D14', sarja: 'D14', gender: 'N', num: 14, toive: 1, nopeus: 8, luotettavuus: 8, kipea: false, locked: false };
S.runners.push(extra);
const victim = S.teams[0][0];
setSick(S.runners.indexOf(victim), true);
assert('sick: victim flagged', victim.kipea === true);
assert('sick: victim removed from team', !S.teams[0].includes(victim) && !S.teams[1].includes(victim));
assert('sick: slot0 refilled with Extra D14 (toive-prioritised)', S.teams[0][0] === extra, S.teams[0][0] && S.teams[0][0].nimi);
assert('sick: team0 still valid', validateTeam(S.teams[0], slots).length === 0, validateTeam(S.teams[0], slots).join(';'));
assert('sick: teams length unchanged', S.teams.length === 2);

// ── performMove: valid pool → team (occupant to pool) ──
const mover = { nimi: 'Move H14', sarja: 'H14', gender: 'M', num: 14, toive: null, nopeus: 5, luotettavuus: 5, kipea: false, locked: false };
S.runners.push(mover);
const backupN = S.teams[1][1];
performMove(S.runners.indexOf(mover), 1, 1); // osuus 2 (n≤16) kelpaa H14:lle
assert('move: mover in team2 slot1', S.teams[1][1] === mover, S.teams[1][1] && S.teams[1][1].nimi);
assert('move: previous occupant went to pool', unassignedRunners().includes(backupN));
assert('move: both teams still valid', validateTeam(S.teams[0], slots).length === 0 && validateTeam(S.teams[1], slots).length === 0);

// ── performMove: invalid move rejected ──
const mover2 = { nimi: 'Move H18', sarja: 'H18', gender: 'M', num: 18, toive: null, nopeus: 5, luotettavuus: 5, kipea: false, locked: false };
S.runners.push(mover2);
const slot0Before = S.teams[0][0];
performMove(S.runners.indexOf(mover2), 0, 0); // mies → osuus 1 (vain nainen)
assert('move: man to women-only slot rejected', S.teams[0][0] === slot0Before && !S.teams[0].includes(mover2), S.teams[0][0] && S.teams[0][0].nimi);
assert('move: rejection warned', getEl('statusBar').innerHTML.includes('estetty'), getEl('statusBar').innerHTML.slice(0, 160));
performMove(S.runners.indexOf(mover2), 0, 2); // osuus 3 (n≤14) — H18 ei kelpaa
assert('move: H18 to osuus3 rejected', !S.teams[0].includes(mover2), S.teams[0][2] && S.teams[0][2].nimi);

// ── removeFromTeam + fillGaps ──
const victim2 = S.teams[0][1];
removeFromTeam(0, 1);
assert('remove: slot left empty', S.teams[0][1] === null, String(S.teams[0][1]));
assert('remove: victim moved to pool', unassignedRunners().includes(victim2));
assert('remove: team0 incomplete (6/7)', validateTeam(S.teams[0], slots)[0].startsWith('keskeneräinen'), validateTeam(S.teams[0], slots).join(';'));
const gapsBefore = S.teams.reduce((n, tm) => n + tm.filter(x => !x).length, 0);
assert('fillGaps: exactly one gap to fill', gapsBefore === 1, String(gapsBefore));
fillGaps();
const gapsAfter = S.teams.reduce((n, tm) => n + tm.filter(x => !x).length, 0);
assert('fillGaps: gap refilled', gapsAfter === 0, String(gapsAfter));
assert('fillGaps: both teams 7/7', S.teams.every(t => t.filter(Boolean).length === 7));
assert('fillGaps: feedback message shown', /Täytettiin|täytetty/.test(getEl('statusBar').innerHTML), getEl('statusBar').innerHTML.slice(0, 160));

// ── removeFromTeam + setSick: sick runner must not reappear via fillGaps ──
const sickGap = S.teams[0][1];
removeFromTeam(0, 1);
setSick(S.runners.indexOf(sickGap), true);
assert('sick-gap: runner flagged kipeä', sickGap.kipea === true);
fillGaps();
assert('sick-gap: gap filled with non-sick runner', S.teams[0][1] && S.teams[0][1] !== sickGap, S.teams[0][1] && S.teams[0][1].nimi);
assert('sick-gap: sick runner stays out of all teams', !S.teams.some(t => t.includes(sickGap)));
assert('sick-gap: teams full after fill', S.teams.every(t => t.filter(Boolean).length === 7));

// ── kipeä resets luotettavuus to 0 ──
const relRunner = unassignedRunners().find(r => !r.kipea);
assert('kipea reset: runner available to test', !!relRunner);
relRunner.luotettavuus = 8;
setSick(S.runners.indexOf(relRunner), true);
assert('kipea reset: luotettavuus zeroed when marked sick', relRunner.kipea === true && relRunner.luotettavuus === 0, String(relRunner.luotettavuus));

// ── CSV ──
const csv = toCSV();
assert('csv: BOM', csv.charCodeAt(0) === 0xFEFF);
const rows = parseCSV(csv, ',');
assert('csv: rows = teams + 1', rows.length === S.teams.length + 1, String(rows.length));
assert('csv: header 7 blocks', rows[0].includes('Nimi-7') && rows[0].includes('Osuus-7') && rows[0].includes('Lähtöaika-7') && !rows[0].includes('Nimi-8'));
assert('csv: data row width 61', rows[1].length === 61, String(rows[1].length));
const r = rows[1];
assert('csv: base cells', r[0] === '1' && r[1] === 'Nuorten Jukola' && r[2].includes(' 1') && r[4] === S.klubi, JSON.stringify(r.slice(0, 5)));
assert('csv: slot0 osuus1 + rata', r[5 + 0 * 8 + 1] === S.teams[0][0].nimi && r[5 + 0 * 8 + 4] === '1' && r[5 + 0 * 8 + 5] === '' && r[5 + 0 * 8 + 6] === 'Oranssi 4,5 km');
assert('csv: slot6 osuus7 + rata', r[5 + 6 * 8 + 4] === '7' && r[5 + 6 * 8 + 5] === '' && r[5 + 6 * 8 + 6] === 'Violetti 6,3 km');
assert('csv: osuus sequence 1..7', [0,1,2,3,4,5,6].every(b => r[5 + b * 8 + 4] === String(b + 1)));
assert('csv: every slot Nimi present', [0,1,2,3,4,5,6].every(b => r[5 + b * 8 + 1] !== ''));
assert('csv: Lainakortti empty', r[5 + 3 * 8 + 3] === '');

// ── serialize/restore round-trip ──
const snap = serializeState();
const orig0 = S.teams[0][0];
S.teams = [];
assert('serialize: teams stored as indices', Number.isInteger(snap.teams[0][0]));
assert('restore: returns true', restoreState(JSON.parse(JSON.stringify(snap))) === true);
assert('restore: teams rebuilt', S.teams.length === 2 && S.teams[0][0] && S.teams[0][0].nimi === orig0.nimi, S.teams[0][0] && S.teams[0][0].nimi);
assert('restore: gender/num round-trip keeps eligibility', S.teams[0].filter(r => r && legEligible(r, 4)).length >= 2, String(S.teams[0].filter(r => r && legEligible(r, 4)).length));
assert('restore: sick flag round-trips', S.runners.find(r => r.nimi === victim.nimi).kipea === true);

// ── generateTeams failure path ──
const bad2 = generateTeams(parsePool(['D14:A', 'D14:B', 'D14:C'].join('\n')), 1);
assert('gen: too-few pool → error message', !!bad2.error && /osuud/.test(bad2.error), bad2.error);

// ── generateAll requires ≥7 runners ──
getEl('poolText').value = 'D14:Virtanen Aino\nD14:Niemi Elsa';
S.runners = parsePool(getEl('poolText').value);
generateAll();
assert('generateAll: <7 runners warns', getEl('statusBar').innerHTML.includes('7 juoksijaa'), getEl('statusBar').innerHTML.slice(0, 120));

// ── loadExamplePool: must terminate and produce valid teams ──
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
loadExamplePool(21);
Math.random = origRandom;
const exLines = getEl('poolText').value.split('\n').filter(Boolean);
assert('example pool: 21 lines (no infinite loop)', exLines.length === 21, String(exLines.length));
assert('example pool: every line is Sarja:Nimi', exLines.every(l => /^[HD]\d+:[A-ZÄÖa-zäö]+ [A-ZÄÖa-zäö]+/.test(l)), exLines.slice(0, 3).join(' | '));
assert('example pool: S.runners loaded', __S().runners.length === 21, String(__S().runners.length));
const exGen = generateTeams(__S().runners, 3);
assert('example pool: generates 3 valid teams', exGen.count === 3 && exGen.teams.every(t => validateTeam(t, __SLOTS()).length === 0), String(exGen.count) + ' ' + (exGen.error || ''));
Math.random = mulberry32(7);
loadExamplePool(28);
Math.random = origRandom;
const exGen28 = generateTeams(__S().runners, 4);
assert('example pool 28: generates 4 valid teams', exGen28.count === 4 && exGen28.teams.every(t => validateTeam(t, __SLOTS()).length === 0), String(exGen28.count) + ' ' + (exGen28.error || ''));
Math.random = mulberry32(11);
loadExamplePool(35);
Math.random = origRandom;
const exGen35 = generateTeams(__S().runners, 5);
assert('example pool 35: generates 5 valid teams', exGen35.count === 5 && exGen35.teams.every(t => validateTeam(t, __SLOTS()).length === 0), String(exGen35.count) + ' ' + (exGen35.error || ''));

// ── click-to-sort pool table ──
S.poolSort = 'order'; S.poolDir = 1;
renderPoolTable();
const hdr = getEl('poolWrap').innerHTML;
assert('sort: header onclick handlers present', hdr.includes("sortPool('nimi')") && hdr.includes("sortPool('vahvuus')") && hdr.includes("sortPool('tilanne')"));
sortPool('nimi');
assert('sort: active header shows ▲', getEl('poolWrap').innerHTML.includes('Nimi ▲'), getEl('poolWrap').innerHTML.slice(0, 300));
const byName = poolRows().map(x => x.r.nimi);
assert('sort: nimi asc', byName.every((n, i) => i === 0 || byName[i - 1] <= n), byName.slice(0, 5).join(','));
sortPool('vahvuus');
const byV = poolRows().map(x => strengthOf(x.r));
assert('sort: vahvuus default desc', byV.every((s, i) => i === 0 || byV[i - 1] >= s));

// ── score steppers clamp 0–10 ──
const Sst = __S();
Sst.runners = parsePool('D14:Steppi Nainen\nH14:Steppi Mies');
Sst.teams = [];
Sst.runners.forEach(r => { r.nopeus = 0; r.luotettavuus = 0; });
bumpScore(0, 'nopeus', 1);
assert('stepper: bump +1 → 1', Sst.runners[0].nopeus === 1, String(Sst.runners[0].nopeus));
bumpScore(0, 'nopeus', -5);
assert('stepper: clamps at 0', Sst.runners[0].nopeus === 0, String(Sst.runners[0].nopeus));
Sst.runners[0].nopeus = 10;
bumpScore(0, 'nopeus', 1);
assert('stepper: clamps at 10', Sst.runners[0].nopeus === 10, String(Sst.runners[0].nopeus));

// ── state merge: kipeä/vahvuudet/toive survive re-generate ──
Math.random = mulberry32(42);
loadExamplePool(21);
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

// ── optimize: feedback, no throw ──
S3.teams = [];
optimize();
assert('optimize: warns when no teams', getEl('statusBar').innerHTML.includes('Generoi ensin'));
generateAll();
optimize();
assert('optimize: feedback with strengths', getEl('statusBar').innerHTML.includes('Optimoitu') && getEl('statusBar').innerHTML.includes('#1'), getEl('statusBar').innerHTML.slice(0, 200));

// ── JSON export reflects inputs + empty slots survive round-trip ──
const S4 = __S();
getEl('klubi').value = 'Kontiolahden Urheilijat';
getEl('wSpeed').value = '0.4';
getEl('toiveFirst').checked = false;
const snap2 = serializeState();
assert('json: export reflects klubi input', snap2.klubi === 'Kontiolahden Urheilijat', snap2.klubi);
assert('json: export reflects wSpeed input', snap2.wSpeed === 0.4, String(snap2.wSpeed));
assert('json: export reflects toiveFirst checkbox', snap2.toiveFirst === false, String(snap2.toiveFirst));
S.teams = [];
assert('json: restore returns true', restoreState(JSON.parse(JSON.stringify(snap2))) === true);
assert('json: restore rebuilds teams', S.teams.length === S4.teams.length && S.teams[0][0] && S.teams[0][0].nimi === S4.teams[0][0].nimi);
assert('json: restore keeps klubi', S.klubi === 'Kontiolahden Urheilijat', S.klubi);
assert('json: restore keeps wSpeed', S.wSpeed === 0.4, String(S.wSpeed));
const S5 = __S();
const removedR = S5.teams[0][2];
removeFromTeam(0, 2);
const snap3 = serializeState();
assert('json: empty slot stored as null', snap3.teams[0][2] === null, String(snap3.teams[0][2]));
S.teams = [];
restoreState(JSON.parse(JSON.stringify(snap3)));
assert('json: empty slot restored as null', S.teams[0][2] === null, String(S.teams[0][2]));
assert('json: removed runner back in pool after load', unassignedRunners().some(r => r.nimi === removedR.nimi && r.sarja === removedR.sarja));

// ── fillGaps cascade: steal from later team when pool lacks an osuus-4 girl ──
const T0 = ['D14:t0s0', 'H12:t0s1', 'D12:t0s2', 'H12:t0s4', 'D16:t0s5', 'D18:t0s6']; // team0 slots 0,1,2,4,5,6 (gap at osuus 4 = slot3)
const T1 = ['D14:t1s0', 'D14:t1s1', 'H12:t1s2', 'D12:t1s3', 'H12:t1s4', 'D16:t1s5', 'D18:t1s6'];
const poolC = parsePool(T0.concat(T1, ['H16:pool0']).join('\n'));
const byN = n => poolC.find(r => r.nimi === n);
const Sc = __S();
Sc.runners = poolC;
Sc.teams = [
  [byN('t0s0'), byN('t0s1'), byN('t0s2'), null, byN('t0s4'), byN('t0s5'), byN('t0s6')],
  poolC.slice(6, 13),
];
const spare = Sc.teams[1][1]; // extra D14 at osuus 2 slot
fillGaps();
assert('cascade: osuus4 gap filled from team1 spare', Sc.teams[0][3] === spare, Sc.teams[0][3] && Sc.teams[0][3].nimi);
assert('cascade: team0 valid', validateTeam(Sc.teams[0], slots).length === 0, validateTeam(Sc.teams[0], slots).join(';'));
assert('cascade: team1 still 7 (refilled from pool)', Sc.teams[1].filter(Boolean).length === 7, String(Sc.teams[1].filter(Boolean).length));
assert('cascade: team1 valid after refill', validateTeam(Sc.teams[1], slots).length === 0, validateTeam(Sc.teams[1], slots).join(';'));
assert('cascade: feedback shows filled count', /Täytettiin|täytetty/.test(getEl('statusBar').innerHTML), getEl('statusBar').innerHTML.slice(0, 160));

// ── cascade: steal allowed even when the later team cannot be refilled ──
const Sd = __S();
const sdPool = parsePool(T0.concat(T1).join('\n'));
const sByN = n => sdPool.find(r => r.nimi === n);
Sd.runners = sdPool;
Sd.teams = [
  [sByN('t0s0'), sByN('t0s1'), sByN('t0s2'), null, sByN('t0s4'), sByN('t0s5'), sByN('t0s6')],
  sdPool.slice(6, 13),
];
const sdStolen = Sd.teams[1][0];
for (const r of unassignedRunners()) r.kipea = true; // pool empty
fillGaps();
assert('cascade2: pool empty → gap filled via relaxed steal', Sd.teams[0][3] === sdStolen, Sd.teams[0][3] && Sd.teams[0][3].nimi);
assert('cascade2: team0 back to 7/7', Sd.teams[0].filter(Boolean).length === 7, String(Sd.teams[0].filter(Boolean).length));
assert('cascade2: team0 valid', validateTeam(Sd.teams[0], slots).length === 0, validateTeam(Sd.teams[0], slots).join(';'));
assert('cascade2: source team drained to 6/7', Sd.teams[1].filter(Boolean).length === 6, String(Sd.teams[1].filter(Boolean).length));
assert('cascade2: source valid except count', validateTeam(Sd.teams[1], slots).every(e => /^keskeneräinen/.test(e)), validateTeam(Sd.teams[1], slots).join(';'));

// ── live pool sync ──
const Sf = __S();
const teamsBefore = Sf.teams.length;
getEl('poolText').value = Sf.runners.map(r => r.sarja + ':' + r.nimi + (r.toive ? ':' + r.toive : '')).join('\n');
syncPool();
assert('syncPool: unchanged text does not wipe teams', Sf.teams.length === teamsBefore, String(Sf.teams.length));
getEl('poolText').value += '\nD14:Uusi Juoksija';
syncPool();
assert('syncPool: new line adds runner', Sf.runners.some(r => r.nimi === 'Uusi Juoksija'), String(Sf.runners.length));
assert('syncPool: real change clears teams', Sf.teams.length === 0, String(Sf.teams.length));
assert('syncPool: pool list back on when teams cleared', Sf.showPool === true, String(Sf.showPool));
getEl('poolText').value = 'http://\nD14:Virtanen Aino\nfoo:bar\nD14:Niemi Elsa';
syncPool();
assert('syncPool: garbage skipped, valid parsed', Sf.runners.length === 2, String(Sf.runners.length));
assert('syncPool: skipped lines warned in status bar', getEl('statusBar').innerHTML.includes('Ohitettiin 2 riviä'), getEl('statusBar').innerHTML.slice(0, 140));
Sf.runners = [];
Sf.teams = [];

// ── grid layout: all teams render, no nav ──
const Sp = __S();
Math.random = mulberry32(11);
loadExamplePool(35);
Math.random = origRandom;
const gen5 = generateTeams(Sp.runners, 5);
Sp.teams = gen5.teams;
Sp.showPool = false;
renderAll();
const teamCols = () => (getEl('teamsWrap').innerHTML.match(/class="team-col"/g) || []).length;
assert('grid: all 5 teams rendered at once', teamCols() === 5, String(teamCols()));
assert('grid: no pagination nav in markup', !html.includes('teamsNav') && !html.includes('teamsPage') && !html.includes('teamsPrev'), 'nav remnants found');
Sp.teams = gen5.teams.slice(0, 3);
renderTeams();
assert('grid: exactly 3 teams fills one row', teamCols() === 3, String(teamCols()));
Sp.teams = [];
renderTeams();
assert('grid: empty state shows placeholder', getEl('teamsWrap').innerHTML.includes('Generoi joukkuelistat'), getEl('teamsWrap').innerHTML.slice(0, 80));

// ── XSS / CSV-injection: user input must never become live markup or formulas ──
assert('xss: esc neutralizes angle-bracket payload', esc('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;');
assert('xss: esc neutralizes quote/script payload', esc('"><script>alert(1)</script>') === '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
assert('xss: esc escapes single quote', esc("It's") === 'It&#39;s');
assert('xss: esc & ordering avoids double-escape', esc('&') === '&amp;' && esc('&lt;') === '&amp;lt;');

const XSS_NM = 'Virtanen<img src=x onerror=alert(1)>';
const XSS_MALE = 'Niemi"><script>alert(1)</script>';
const XSS_SR = 'D14"><svg onload=alert(1)>';
const POOL_XSS = buildPool([
  ['D14', 2], ['D12', 1], ['H12', 1], ['H14', 1], ['D16', 1], ['D18', 1],
])
  .replace('D14:D14-0', 'D14:' + XSS_NM)
  .replace('H14:H14-0', 'H14:' + XSS_MALE)
  .replace('D16:D16-0', XSS_SR + ':X');
const Sx = __S();
getEl('poolText').value = POOL_XSS;
generateAll();
const pTeam = getEl('teamsWrap').innerHTML, pPool = getEl('poolWrap').innerHTML;
assert('xss: pool accepts payload names', Sx.runners.some(r => r.nimi === XSS_NM) && Sx.runners.some(r => r.nimi === XSS_MALE) && Sx.runners.some(r => r.sarja === XSS_SR), Sx.runners.map(r => r.sarja + ':' + r.nimi).join('|'));
assert('xss: team slot name escaped', pTeam.includes('&lt;img src=x onerror=alert(1)&gt;') && !pTeam.includes('<img'), pTeam.slice(0, 220));
assert('xss: pool table name escaped', pPool.includes('&lt;img src=x onerror=alert(1)&gt;') && !pPool.includes('<img'), pPool.slice(0, 220));
assert('xss: payload sarja escaped in table', pPool.includes('&lt;svg onload=alert(1)&gt;') && !pPool.includes('<svg'), pPool.slice(0, 220));
assert('xss: statusBar no raw markup', !getEl('statusBar').innerHTML.includes('<img') && !getEl('statusBar').innerHTML.includes('<svg'), getEl('statusBar').innerHTML.slice(0, 160));

const xssMale = Sx.runners.find(r => r.nimi === XSS_MALE);
const xssOrig0 = Sx.teams[0][0];
Sx.teams[0][0] = xssMale;
renderStatus();
assert('xss: validateTeam problem line escaped', getEl('statusBar').innerHTML.includes('&lt;script&gt;') && !getEl('statusBar').innerHTML.includes('<script'), getEl('statusBar').innerHTML.slice(0, 200));
Sx.teams[0][0] = xssOrig0;

const XSS_EXTRA = { nimi: 'Extra<img src=x onerror=alert(2)>', sarja: 'D14', gender: 'N', num: 14, toive: null, nopeus: 0, luotettavuus: 0, kipea: false, locked: false };
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
const csv2 = toCSV();
const rows2 = parseCSV(csv2, ',');
const r2 = rows2[1];
assert('csv-inj: = name guarded', r2[6].startsWith("'="), r2[6]);
assert('csv-inj: + name guarded', r2[14].startsWith("'+"), r2[14]);
assert('csv-inj: @ name guarded', r2[22].startsWith("'@"), r2[22]);
assert('csv-inj: klubi guarded', r2[4].startsWith("'+"), r2[4]);
assert('csv-inj: plain quote name still round-trips', r2[38] === 'Aho "Kurre" Kalle', r2[38]);
assert('csv-inj: guarded cells still valid CSV (row width)', rows2[1].length === 61, String(rows2[1].length));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
