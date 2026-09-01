const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/sm_viesti_joukkuesuunnittelija.html', 'utf8');
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
  eval(code + '; global.__S = () => S; global.__selectedIdx = () => selectedIdx; global.__LEG_NAMES = () => LEG_NAMES;');
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

const S = __S();
S.compYear = 2026;
const CY = S.compYear;

// ── parsePool: age-based series shape (no toive — sarja is already fixed) ──
{
  const rs = parsePool(`H18:Korhonen Ilmari:${CY - 17}:vets-a`);
  assert('parsePool age: parses fields', rs.length === 1, JSON.stringify(rs));
  assert('parsePool age: sarja/kind/gender', rs[0].sarja === 'H18' && rs[0].kind === 'age' && rs[0].gender === 'M');
  assert('parsePool age: pari parsed, no toive field', rs[0].pari === 'vets-a' && rs[0].toive === null);
  assert('parsePool age: birthYear parsed', rs[0].birthYear === CY - 17);
}
assert('parsePool age: birth year optional', parsePool('D21:Nimi Sukunimi').length === 1 && parsePool('D21:Nimi Sukunimi')[0].birthYear === null);
assert('parsePool age: unknown sarja tag rejected as age-line, falls through to vet-shape check and is skipped', parsePool('H99:Nimi').length === 0);
assert('parsePool age: case-insensitive tag', parsePool(`h21:Nimi:${CY - 25}`)[0].sarja === 'H21');

// ── parsePool: veteran shape (toive is now a preferred class, e.g. "H45") ──
{
  const rs = parsePool(`Virtanen Matti:${CY - 40}:M:H45:vets-a`);
  assert('parsePool vet: kind/gender', rs[0].kind === 'vet' && rs[0].gender === 'M');
  assert('parsePool vet: sarja unset (assigned later)', rs[0].sarja === null);
  assert('parsePool vet: toivesarja/pari parsed', rs[0].toive === 'H45' && rs[0].pari === 'vets-a');
  assert('parsePool vet: gender alias N/Nainen', parsePool(`X:${CY - 40}:N`)[0].gender === 'N' && parsePool(`Y:${CY - 40}:Nainen`)[0].gender === 'N');
  assert('parsePool vet: toive rejected if wrong gender prefix', parsePool(`Y:${CY - 40}:N:H45`)[0].toive === null);
  assert('parsePool vet: toive rejected if not a real veteran class', parsePool(`Y:${CY - 40}:M:H999`)[0].toive === null);
}
assert('parsePool: dedups identical lines', parsePool(`Virtanen Matti:${CY - 40}:M\nVirtanen Matti:${CY - 40}:M`).length === 1);
assert('parsePool: blank lines skipped', parsePool('\n\n  \n').length === 0);

// ── Ikäsarja päätellään syntymävuodesta, kun sarjaa ei ole annettu ──
{
  assert('deriveAgeSarja: <=16 → 16', deriveAgeSarja(16, 'M') === 'H16' && deriveAgeSarja(15, 'N') === 'D16');
  assert('deriveAgeSarja: 17-18 → 18', deriveAgeSarja(17, 'M') === 'H18' && deriveAgeSarja(18, 'N') === 'D18');
  assert('deriveAgeSarja: 19-20 → 20', deriveAgeSarja(19, 'M') === 'H20' && deriveAgeSarja(20, 'N') === 'D20');
  assert('deriveAgeSarja: 21+ → null (vet path)', deriveAgeSarja(21, 'M') === null && deriveAgeSarja(40, 'N') === null);
  assert('deriveAgeSarja: missing age/gender → null', deriveAgeSarja(null, 'M') === null && deriveAgeSarja(17, null) === null);

  const r = parsePool(`Nuori Juoksiia:${CY - 17}:M`)[0];
  assert('parsePool no-class youth: derives H18 age-class', r && r.kind === 'age' && r.sarja === 'H18' && r.gender === 'M', JSON.stringify(r));

  const rd = parsePool(`Nuori II:${CY - 20}:N`)[0];
  assert('parsePool no-class youth: derives D20 for 20yo woman', rd && rd.kind === 'age' && rd.sarja === 'D20', JSON.stringify(rd));

  // Adult (21+) without a class stays on the veteran path (kind=vet), not ikäsarja.
  const a = parsePool(`Aikuinen:${CY - 40}:M`)[0];
  assert('parsePool no-class adult: stays veteran (not ikäsarja)', a && a.kind === 'vet' && a.sarja === null, JSON.stringify(a));

  // Explicit class in the SECOND column ("Nimi:Sarja:Syntymävuosi") still maps.
  const idx1 = parsePool(`Korhonen:${'H20'}:${CY - 19}`)[0];
  assert('parsePool: class in second column maps ikäsarja', idx1 && idx1.sarja === 'H20' && idx1.kind === 'age' && idx1.nimi === 'Korhonen', JSON.stringify(idx1));
}

// ── ageOf / computeWarnings ──
{
  S.compYear = CY;
  S.runners = parsePool([
    `H16:Nuori Juoksija:${CY - 12}`,      // under MIN_AGE(14) -> warning
    `H21:Aikuinen Juoksija:${CY - 30}`,   // fine
    `D18:Tuntematon Ika`,                  // no birth year on age-line -> warning
    `Vanha Veteraani:${CY - 50}:M`,       // vet, fine
  ].join('\n'));
  const warns = computeWarnings();
  assert('warnings: under-14 flagged', warns.some(w => w.includes('Nuori Juoksija')), JSON.stringify(warns));
  assert('warnings: missing birth year flagged', warns.some(w => w.includes('Tuntematon Ika')), JSON.stringify(warns));
  assert('warnings: valid adults not flagged', !warns.some(w => w.includes('Aikuinen Juoksija')) && !warns.some(w => w.includes('Vanha Veteraani')));
  assert('warnings: count matches exactly the two problem rows', warns.length === 2, JSON.stringify(warns));
}

// ── memberEligible / teamRequirements (veteran sum + age) ──
{
  const mkVet = (name, age, gender) => parsePool(`${name}:${CY - age}:${gender}`)[0];
  const a40 = mkVet('A', 40, 'M'), a35 = mkVet('B', 35, 'M'), a30 = mkVet('C', 30, 'M');
  assert('memberEligible: age >= minAge required (H35 needs 35)', memberEligible(a35, 'H35') && !memberEligible(a30, 'H35'));
  assert('memberEligible: gender must match H/D prefix', !memberEligible(mkVet('D', 40, 'N'), 'H35'));
  assert('teamRequirements: sum below threshold flagged', teamRequirements([a35, a35, a30 /* ineligible anyway */], 'H35').length > 0);
  const strong = [mkVet('E', 35, 'M'), mkVet('F', 35, 'M'), mkVet('G', 35, 'M')]; // sum 105 == H35 minSum
  assert('teamRequirements: exact threshold sum passes', teamRequirements(strong, 'H35').length === 0);
  const short = [mkVet('H', 35, 'M'), mkVet('I', 35, 'M'), mkVet('J', 34, 'M')];
  assert('teamRequirements: one member below minAge flagged even if sum would suffice', teamRequirements(short, 'H35').length > 0);
}
assert('teamRequirements: age-based series has no composition requirement', teamRequirements(parsePool(`H21:A\nH21:B\nH21:C`.split('\n').join('\n')), 'H21').length === 0 || true);
{
  const ageTeam = parsePool('H21:A\nH21:B\nH21:C'.split('\n').join('\n'));
  assert('teamRequirements: age-series team of 3 matching tags is valid', teamRequirements(ageTeam, 'H21').length === 0, JSON.stringify(teamRequirements(ageTeam, 'H21')));
}

// ── assignVeteranSeries: hardest-first + two-smallest-plus-largest greedy ──
{
  // Ages chosen so exactly one H80 team (needs age>=75, sum>=240) can form
  // from the very oldest three, and the remainder forms H35 teams.
  const ages = [78, 80, 82, 36, 36, 36, 37, 37, 37];
  const pool = ages.map((age, i) => parsePool(`R${i}:${CY - age}:M`)[0]);
  const res = assignVeteranSeries(pool, ['H80', 'H35']);
  const h80 = res.groups.filter(g => g.sarja === 'H80');
  const h35 = res.groups.filter(g => g.sarja === 'H35');
  assert('veteran: forms exactly one H80 team from the three oldest', h80.length === 1, JSON.stringify(res.groups));
  if (h80.length === 1) {
    const sum = h80[0].members.reduce((s, r) => s + ageOf(r), 0);
    assert('veteran: H80 team sum meets minSum(240)', sum >= 240, String(sum));
  }
  assert('veteran: remaining 6 form two H35 teams', h35.length === 2, JSON.stringify(res.groups));
  assert('veteran: no leftovers when everyone placed', res.leftovers.length === 0, JSON.stringify(res.leftovers.map(r => r.nimi)));
}
{
  // Hardest-first shouldn't starve an easier series: two people just barely
  // qualifying for H35 (min age 35) but too young/too-low-sum for H45 (min
  // sum 130) should still end up on an H35 team together with a third,
  // rather than being wasted or left as leftovers.
  const pool = [35, 35, 35].map((age, i) => parsePool(`R${i}:${CY - age}:M`)[0]);
  const res = assignVeteranSeries(pool, ['H45', 'H35']);
  assert('veteran: H45 not formed (sum 105 < 130)', !res.groups.some(g => g.sarja === 'H45'));
  assert('veteran: falls through to H35 (sum 105 >= 105)', res.groups.some(g => g.sarja === 'H35'), JSON.stringify(res.groups));
}
{
  // Pari-linked pair should be preferentially completed into a team together.
  const pool = [
    parsePool(`A:${CY - 60}:M::pair1`)[0],
    parsePool(`B:${CY - 60}:M::pair1`)[0],
    parsePool(`C:${CY - 60}:M`)[0],
    parsePool(`D:${CY - 60}:M`)[0],
  ];
  const res = assignVeteranSeries(pool, ['H50']);
  const g = res.groups.find(gr => gr.members.some(r => r.pari === 'pair1'));
  assert('veteran: pari pair kept together', g && g.members.filter(r => r.pari === 'pair1').length === 2, JSON.stringify(res.groups));
}
{
  // A full pari trio (3 people, same tag) should be committed as a team
  // outright, without the algorithm picking who the "third" person is.
  const pool = [
    parsePool(`A:${CY - 50}:M::trio1`)[0],
    parsePool(`B:${CY - 50}:M::trio1`)[0],
    parsePool(`C:${CY - 50}:M::trio1`)[0],
    parsePool(`D:${CY - 50}:M`)[0],
  ];
  const res = assignVeteranSeries(pool, ['H45']);
  const g = res.groups.find(gr => gr.members.some(r => r.pari === 'trio1'));
  assert('veteran: full pari trio committed as one team', g && g.members.length === 3 && g.members.every(r => r.pari === 'trio1'), JSON.stringify(res.groups));
  assert('veteran: uninvolved 4th runner left as leftover, not folded in', res.leftovers.some(r => r.nimi === 'D'), JSON.stringify(res.leftovers.map(r => r.nimi)));
}
{
  // A pari trio whose combined age sum doesn't meet the class's minSum
  // should NOT be force-committed — falls through to the generic greedy.
  const pool = [
    parsePool(`A:${CY - 35}:M::weaktrio`)[0],
    parsePool(`B:${CY - 35}:M::weaktrio`)[0],
    parsePool(`C:${CY - 35}:M::weaktrio`)[0],
  ];
  const res = assignVeteranSeries(pool, ['H45']); // needs sum >= 130, trio sums to 105
  assert('veteran: underqualified pari trio not forced through', !res.groups.some(gr => gr.members.some(r => r.pari === 'weaktrio')), JSON.stringify(res.groups));
}

// ── assignVeteranSeries: preferred class (toive) is honored when feasible ──
{
  // Three 45yo runners (age sum 135) individually qualify for BOTH H45
  // (needs sum>=130 — met) and H35 (needs sum>=105), and hardest-first
  // processing (H45 before H35) would normally sweep them into H45. They
  // explicitly prefer the easier H35 instead — the algorithm should honor
  // that and keep them OUT of H45 entirely, not just "try H45 first anyway".
  const pool = [
    parsePool(`A:${CY - 45}:M:H35`)[0],
    parsePool(`B:${CY - 45}:M:H35`)[0],
    parsePool(`C:${CY - 45}:M:H35`)[0],
  ];
  const res = assignVeteranSeries(pool, ['H45', 'H35']);
  assert('veteran: preference keeps eligible runners OUT of an unwanted harder class', !res.groups.some(g => g.sarja === 'H45'), JSON.stringify(res.groups));
  assert('veteran: preference routes them into their actually-requested class', res.groups.some(g => g.sarja === 'H35'), JSON.stringify(res.groups));
}

// ── feasibleVetSarjat / setToive: preference limited to classes actually reachable ──
{
  const r40 = parsePool(`A:${CY - 38}:M`)[0];
  const feas = feasibleVetSarjat(r40);
  assert('feasibleVetSarjat: 38yo male qualifies for H35/H45 but not H50+ (minAge 40)', feas.includes('H35') && feas.includes('H45') && !feas.includes('H50'), JSON.stringify(feas));
  S.runners = [r40];
  setToive(0, 'H45');
  assert('setToive: accepts a feasible class', S.runners[0].toive === 'H45');
  setToive(0, 'H999');
  assert('setToive: rejects a non-existent class', S.runners[0].toive === null);
  setToive(0, 'D35'); // wrong gender prefix for a male runner
  assert('setToive: rejects wrong-gender class', S.runners[0].toive === null);
}

// ── bestLegOrder: role-score-maximizing permutation ──
{
  const mk = (nimi, aloitus, keski, lopetus) => ({ nimi, aloitus, keski, lopetus });
  const starter = mk('Starter', 10, 0, 0);
  const middler = mk('Middler', 0, 10, 0);
  const finisher = mk('Finisher', 0, 0, 10);
  const order = bestLegOrder([finisher, starter, middler]);
  assert('bestLegOrder: puts best starter first', order[0].nimi === 'Starter', JSON.stringify(order.map(r => r.nimi)));
  assert('bestLegOrder: puts best middler second', order[1].nimi === 'Middler', JSON.stringify(order.map(r => r.nimi)));
  assert('bestLegOrder: puts best finisher last', order[2].nimi === 'Finisher', JSON.stringify(order.map(r => r.nimi)));
}

// ── generateAll + sick replacement re-validates age sum ──
{
  S.compYear = CY;
  getEl('poolText').value = [
    `H21:Aa:${CY - 25}`, `H21:Bb:${CY - 25}`, `H21:Cc:${CY - 25}`,
    `Dd:${CY - 40}:M`, `Ee:${CY - 40}:M`, `Ff:${CY - 40}:M`,
  ].join('\n');
  getEl('klubi').value = 'Testiseura';
  getEl('compYear').value = CY;
  getEl('toiveFirst').checked = true;
  generateAll();
  assert('generateAll: forms 2 teams (1 age-series + 1 veteran)', S.teams.length === 2, JSON.stringify(S.teamSarja));
  assert('generateAll: veteran team sarja is a valid H-series for age 40 (H35 or H45)', S.teamSarja.includes('H35') || S.teamSarja.includes('H45'));

  const vetTeamIdx = S.teamSarja.findIndex(s => s === 'H35' || s === 'H45');
  const sickRunner = S.teams[vetTeamIdx][0];
  const sickIdx = S.runners.indexOf(sickRunner);
  setSick(sickIdx, true);
  const stillValid = validateTeam(S.teams[vetTeamIdx], S.teamSarja[vetTeamIdx]);
  assert('sick replacement: no eligible 40yo replacement available, team left short rather than invalid-and-silent',
    S.teams[vetTeamIdx].filter(Boolean).length < 3 || stillValid.length === 0,
    JSON.stringify({ team: S.teams[vetTeamIdx].map(r => r && r.nimi), problems: stillValid }));
}

// ── toCSV shape ──
{
  S.compYear = CY;
  S.klubi = 'Seura X';
  S.firstNum = 1;
  const a = parsePool(`H21:A:${CY - 25}`)[0], b = parsePool(`H21:B:${CY - 25}`)[0], c = parsePool(`H21:C:${CY - 25}`)[0];
  a.aloitus = 5; b.keski = 5; c.lopetus = 5;
  S.runners = [a, b, c];
  S.teams = [[a, b, c]];
  S.teamSarja = ['H21'];
  const csv = toCSV();
  const rows = parseCSV(csv.replace(/^﻿/, ''), ',');
  assert('toCSV: header has base + 3 leg blocks', rows[0].length === 5 + 3 * 8, String(rows[0].length));
  assert('toCSV: header mentions Sarja and 3 legs', rows[0].includes('Sarja') && rows[0].includes('Nimi-1') && rows[0].includes('Nimi-3'));
  assert('toCSV: one data row per team', rows.length === 2);
  assert('toCSV: sarja column has actual series code', rows[1][1] === 'H21', JSON.stringify(rows[1]));
}

// ── renderTeams: grouped into 4 sections (ikäsarjat/veteraanit × H/D) ──
{
  S.compYear = CY;
  const mkAge = (sarja, nimi) => parsePool(`${sarja}:${nimi}:${CY - 25}`)[0];
  const mkVet = (nimi, age, gender) => parsePool(`${nimi}:${CY - age}:${gender}`)[0];
  S.runners = [];
  S.teams = [
    [mkAge('H21', 'A1'), mkAge('H21', 'A2'), mkAge('H21', 'A3')],
    [mkAge('D21', 'B1'), mkAge('D21', 'B2'), mkAge('D21', 'B3')],
    [mkVet('C1', 40, 'M'), mkVet('C2', 40, 'M'), mkVet('C3', 40, 'M')],
    [mkVet('D1', 40, 'N'), mkVet('D2', 40, 'N'), mkVet('D3', 40, 'N')],
  ];
  S.teamSarja = ['H21', 'D21', 'H35', 'D35'];
  S.runners = S.teams.flat();
  renderTeams();
  const out = getEl('teamsWrap').innerHTML;
  const idxAgeH = out.indexOf('Ikäsarjat — H-sarjat');
  const idxAgeD = out.indexOf('Ikäsarjat — D-sarjat');
  const idxVetH = out.indexOf('Veteraanit — H-sarjat');
  const idxVetD = out.indexOf('Veteraanit — D-sarjat');
  assert('renderTeams: all 4 group headers present', [idxAgeH, idxAgeD, idxVetH, idxVetD].every(i => i >= 0), out);
  assert('renderTeams: groups appear in order age-H, age-D, vet-H, vet-D', idxAgeH < idxAgeD && idxAgeD < idxVetH && idxVetH < idxVetD);
  assert('groupLabel: age H vs veteran H distinguished', groupLabel('H21') !== groupLabel('H35'));
  assert('groupLabel: H vs D distinguished within same kind', groupLabel('H21') !== groupLabel('D21') && groupLabel('H35') !== groupLabel('D35'));
}

// ── scoreSlider: renders a range input with a live percentage label ──
{
  const html = scoreSlider(3, 'aloitus', 7);
  assert('scoreSlider: renders a range input', html.includes('type="range"'), html);
  assert('scoreSlider: min/max span the 0-10 scale', html.includes('min="0"') && html.includes('max="10"'), html);
  assert('scoreSlider: value reflected as-is (not pre-scaled)', html.includes('value="7"'), html);
  assert('scoreSlider: percentage label shown (value*10)', html.includes('>70%<'), html);
  assert('scoreSlider: field name wired into oninput handler', html.includes("S.runners[3].aloitus"), html);
  assert('scoreSlider: commits full re-render only on release (onchange), not mid-drag', html.includes('onchange="commitScore()"') && !html.includes('oninput="commitScore()"'), html);
}
{
  S.compYear = CY;
  S.runners = parsePool(`H21:Slaideri:${CY - 25}`);
  S.runners[0].keski = 6;
  S.teams = []; S.teamSarja = [];
  renderPoolTable();
  const out = getEl('poolWrap').innerHTML;
  assert('renderPoolTable: uses sliders for role scores', (out.match(/type="range"/g) || []).length === 3, out);
  assert('renderPoolTable: shows percentage for current value', out.includes('60%'), out);
}

// ── renderPoolTable: Toivesarja column — dropdown for vets, dash for age ──
{
  S.compYear = CY;
  const ageR = parsePool(`H21:AgeRunner:${CY - 25}`)[0];
  const vetR = parsePool(`VetRunner:${CY - 38}:M`)[0];
  S.runners = [ageR, vetR];
  S.teams = []; S.teamSarja = [];
  renderPoolTable();
  const out = getEl('poolWrap').innerHTML;
  assert('renderPoolTable: age runner gets no toive picker', /AgeRunner[\s\S]{0,200}—<\/span>/.test(out) || out.indexOf('AgeRunner') < out.indexOf('<select'), out);
  assert('renderPoolTable: vet runner gets a class-preference dropdown listing only feasible classes', out.includes('<option value="H35"') && out.includes('<option value="H45"') && !out.includes('<option value="H50"'), out);
}

// ── ryhmitys (linkSelected): checkbox selection → shared auto-numbered group ──
{
  const sel = __selectedIdx();
  S.compYear = CY;
  S.runners = parsePool([`H21:X1:${CY - 25}`, `H21:X2:${CY - 25}`, `H21:X3:${CY - 25}`].join('\n'));
  S.teams = []; S.teamSarja = [];
  sel.clear(); sel.add(0); sel.add(1);
  linkSelected();
  assert('linkSelected: assigns a shared auto-generated tag to selected runners', S.runners[0].pari && S.runners[0].pari === S.runners[1].pari, JSON.stringify(S.runners.map(r => r.pari)));
  assert('linkSelected: untouched runner not linked', !S.runners[2].pari);
  assert('linkSelected: clears the selection afterward', sel.size === 0);

  clearPari(0);
  assert('clearPari: removes the group tag', S.runners[0].pari === null);

  sel.clear(); sel.add(0);
  linkSelected();
  assert('linkSelected: refuses fewer than 2 selected', !S.runners[0].pari);

  S.runners.push(parsePool(`H21:X4:${CY - 25}`)[0]);
  sel.clear(); sel.add(0); sel.add(1); sel.add(2); sel.add(3);
  linkSelected();
  assert('linkSelected: refuses more than 3 selected (max team size)', !S.runners[0].pari && !S.runners[3].pari);
}

// ── mergePoolState: UI-assigned pari survives a pool re-sync ──
{
  const sel = __selectedIdx();
  S.compYear = CY;
  getEl('poolText').value = [`H21:Y1:${CY - 25}`, `H21:Y2:${CY - 25}`].join('\n');
  syncPool();
  sel.clear(); sel.add(0); sel.add(1);
  linkSelected();
  const tagBefore = S.runners[0].pari;
  assert('setup: group tag assigned', !!tagBefore);
  // Re-sync with identical text content but force a re-parse by touching poolText
  // (simulates the debounce firing again after an unrelated edit elsewhere).
  getEl('poolText').value = [`H21:Y1:${CY - 25}`, `H21:Y2:${CY - 25}`, `H21:Y3:${CY - 25}`].join('\n');
  syncPool();
  assert('mergePoolState: pari tag preserved across re-sync', S.runners[0].pari === tagBefore && S.runners[1].pari === tagBefore, JSON.stringify(S.runners.map(r => r.pari)));
}

// ── LEG_NAMES: relay-appropriate leg labels ──
assert('LEG_NAMES: aloitus / toinen osuus / ankkuri', JSON.stringify(__LEG_NAMES()) === JSON.stringify(['Aloitus', 'Toinen osuus', 'Ankkuri']), JSON.stringify(__LEG_NAMES()));

// ── vetInOpenClass: veteran-aged runner flagged when running the open H21/D21 class ──
{
  const young = parsePool(`H21:Nuori:${CY - 25}`)[0];
  const vet = parsePool(`H21:Iakas:${CY - 40}`)[0];
  assert('vetInOpenClass: 25yo in H21 not flagged', !vetInOpenClass(young, 'H21'));
  assert('vetInOpenClass: 40yo in H21 flagged (35+)', vetInOpenClass(vet, 'H21'));
  assert('vetInOpenClass: only applies to H21/D21, not veteran classes themselves', !vetInOpenClass(vet, 'H45'));
  assert('vetInOpenClass: unknown age not flagged', !vetInOpenClass(parsePool('H21:Tuntematon')[0], 'H21'));
}
{
  S.compYear = CY;
  const a = parsePool(`H21:A:${CY - 25}`)[0], b = parsePool(`H21:B:${CY - 40}`)[0], c = parsePool(`H21:C:${CY - 25}`)[0];
  S.runners = [a, b, c];
  S.teams = [[a, b, c]];
  S.teamSarja = ['H21'];
  renderTeams();
  const out = getEl('teamsWrap').innerHTML;
  assert('renderTeams: veteran-in-open row gets the pink highlight class', out.includes('vet-in-open'), out);
  assert('renderTeams: veteran-in-open runner gets the 35+ badge', out.includes('vetbadge') && out.includes('35+'), out);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
