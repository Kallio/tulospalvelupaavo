const fs = require('fs');
const path = require('path');

const file = path.join('/tulospalvelupaavo', 'rastilippu_parallel_legs_to_navisport.html');
const html = fs.readFileSync(file, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('no inline script');
let code = m[1];
code = code.replace(/\(function init\(\)[\s\S]*?\}\)\(\);\s*$/, '');

function makeEl() {
  return {
    value: '', textContent: '', innerHTML: '', className: '', options: [], selectedIndex: -1,
    children: [],
    appendChild(el) { this.children.push(el); return el; },
    addEventListener() {}, remove() {},
    querySelector() { return makeEl(); },
    style: {},
  };
}
const doc = {
  getElementById(id) { return makeEl(); },
  querySelectorAll() { return []; },
  createElement() { return makeEl(); },
};
global.document = doc;
eval(code);

// ── profiles ──
const kompassiKilpa = { name: 'Kilpa', sarjat: [], legs: [
  { osuus: 1, lkm: 1, tieto: '' }, { osuus: 2, lkm: 3, tieto: '' }, { osuus: 3, lkm: 1, tieto: '' }] };
const halikko = { name: 'Halikko', sarjat: [], legs: [
  { osuus: 1, lkm: 1 }, { osuus: 2, lkm: 3 }, { osuus: 3, lkm: 3 },
  { osuus: 4, lkm: 3 }, { osuus: 5, lkm: 3 }, { osuus: 14, lkm: 1 }, { osuus: 15, lkm: 1 }] };

let pass = 0, fail = 0;
function assert(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

// ── test 1: parse Rastilippu CSV (self-contained 3-osainen fixture, latin-1 bytes) ──
const RL_CLUBS = ['Jämsän Retki-Veikot', 'Punkalaitumen Kunto', 'Espoon Suunta', 'Kalevan Rasti', 'Vaasan Suunnistajat'];
const RL_NAMES = ['Nurmo Katariina', 'Mäkelä Aapo', 'Virtanen Eino', 'Heikkinen Satu', 'Korhonen Pekka', 'Laine Anni', 'Salmi Jari', 'Nieminen Viivi'];
const rlRows = ['Sarja;Joukkueen nimi;Seura;Osuuden 1 juoksija;Osuuden 2 juoksija;Osuuden 3 juoksija'];
for (let i = 1; i <= 53; i++) {
  const club = i === 43 ? 'Punkalaitumen Kunto' : RL_CLUBS[(i - 1) % RL_CLUBS.length];
  const sarja = i % 2 ? 'H14' : 'D14';
  const names = i === 43
    ? ['Nurmo Katariina', 'Mäkelä Aapo', 'Virtanen Eino']
    : [RL_NAMES[(i * 3) % RL_NAMES.length], RL_NAMES[(i * 3 + 1) % RL_NAMES.length], i % 4 === 0 ? '' : RL_NAMES[(i * 3 + 2) % RL_NAMES.length]];
  rlRows.push([sarja, club + ' ' + i, club, ...names].join(';'));
}
const latin1 = Buffer.from(rlRows.join('\n'), 'latin1');
const decoded = new TextDecoder('latin1').decode(latin1);
const rows = parseCSV(decoded, ';');
const parsed = parseRastilippu(rows);
assert('parse fixture 3-osainen: no error', !parsed.error, parsed.error);
assert('parse fixture 3-osainen: teams = 53', parsed.teams.length === 53, String(parsed.teams.length));
assert('parse: 3 osuus columns found', parsed.osuudet.length === 3, String(parsed.osuudet.length));
assert('parse: runner count on Punkalaitumen row', parsed.teams[42].runners.length === 3 && parsed.teams[42].runners[0] === 'Nurmo Katariina', JSON.stringify(parsed.teams[42].runners));

// ── test 2: left-fill Kompassi 5-runner team ──
const team5 = { sarja: 'H14', joukkue: 'Parhaat', seura: 'X', slots: ['Vesa','Paavo','Esko','Vili','Pedro','',''], runners: ['Vesa','Paavo','Esko','Vili','Pedro'] };
const a5 = buildAssignment(team5, kompassiKilpa);
assert('5-runner: no error', !a5.error, a5.error);
assert('5-runner: osuus seq = 1,2,2,2,3', JSON.stringify(a5.used.map(b => b.osuus)) === JSON.stringify(['1','2','2','2','3']), JSON.stringify(a5.used.map(b => b.osuus)));
assert('5-runner: alaosuus seq = ,1,2,3,', JSON.stringify(a5.used.map(b => b.alaosuus)) === JSON.stringify(['','1','2','3','']), JSON.stringify(a5.used.map(b => b.alaosuus)));
assert('5-runner: full length = 5', a5.full.length === 5, String(a5.full.length));

// ── test 3: 3-runner team → osuus 1,2,3, no alaosuus ──
const team3 = { sarja: 'H14', joukkue: 'P3', seura: 'X', slots: ['A','B','C'], runners: ['A','B','C'] };
const a3 = buildAssignment(team3, kompassiKilpa);
assert('3-runner: osuus = 1,2,3', JSON.stringify(a3.used.map(b => b.osuus)) === JSON.stringify(['1','2','3']));
assert('3-runner: alaosuus empty', a3.used.every(b => b.alaosuus === ''));

// ── test 4: Halikko 13-runner team ──
const slots15 = ['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12','E13','',''];
const teamH = { sarja: 'H18', joukkue: 'Häjy', seura: 'X', slots: slots15, runners: slots15.filter(Boolean) };
const aH = buildAssignment(teamH, halikko);
assert('halikko 13: no error', !aH.error, aH.error);
assert('halikko 13: used = 13', aH.used.length === 13, String(aH.used.length));
assert('halikko 13: osuus seq (anchor: last runner -> leg 15)', JSON.stringify(aH.used.map(b => b.osuus)) === JSON.stringify(['1','2','2','2','3','3','3','4','4','4','5','5','15']), JSON.stringify(aH.used.map(b => b.osuus)));
assert('halikko 13: full=15, leg14 empty placeholder, leg15 anchored with E13', aH.full.length === 15 && aH.full[13].osuus === '14' && !aH.full[13].nimi && aH.full[14].osuus === '15' && aH.full[14].nimi === 'E13', JSON.stringify(aH.full.slice(13)));

// ── test 5: generate + round-trip (fillEmpty OFF) ──
const assignments = [
  Object.assign(a5, { team: team5, kilpailunumero: 101 }),
  Object.assign(a3, { team: team3, kilpailunumero: 102 }),
];
const csvOff = generateCSV(assignments, false);
const rtcOff = verifyOutput(csvOff);
assert('rtc fillEmpty off: ok', rtcOff.ok, rtcOff.msg);
assert('csvOff header has 5 blocks', parseCSV(csvOff, ',').length > 0);
const header = parseCSV(csvOff, ',')[0];
assert('csvOff header Nimi-5 present', header.includes('Nimi-5'));
const row1 = parseCSV(csvOff, ',')[1];
assert('csvOff row1 has 5 named runners', row1[6] === 'Vesa' && row1[38] === 'Pedro', JSON.stringify(row1.slice(6, 40)));
assert('csvOff row1 osuus = 1,2,2,2,3', row1[9] === '1' && row1[17] === '2' && row1[25] === '2' && row1[33] === '2' && row1[41] === '3');
assert('csvOff row1 alaosuus = ,1,2,3,', row1[10] === '' && row1[18] === '1' && row1[26] === '2' && row1[34] === '3' && row1[42] === '');
const row2 = parseCSV(csvOff, ',')[2];
assert('csvOff row2 (3-runner) padded to 5 blocks, trailing empty', row2.length === row1.length && row2[6] === 'A' && row2[9] === '1' && row2[14] === 'B' && row2[17] === '2' && row2[22] === 'C' && row2[25] === '3' && row2[30] === '' && row2[38] === '', JSON.stringify(row2.slice(6, 40)));

// ── test 6: generate + round-trip (fillEmpty ON) ──
const csvOn = generateCSV(assignments, true);
const rtcOn = verifyOutput(csvOn);
assert('rtc fillEmpty on: ok', rtcOn.ok, rtcOn.msg);
const row1on = parseCSV(csvOn, ',')[1];
assert('fillEmpty on: row1 still 5 blocks', row1on[6] === 'Vesa' && row1on[38] === 'Pedro');
const row2on = parseCSV(csvOn, ',')[2];
assert('fillEmpty on: 3-runner row has 5 blocks: A/1, B/2, ,/2, ,/2, C/3', row2on[6] === 'A' && row2on[9] === '1' && row2on[14] === 'B' && row2on[17] === '2' && row2on[22] === '' && row2on[30] === '' && row2on[38] === 'C' && row2on[41] === '3', JSON.stringify(row2on.slice(6, 46)));

// ── test 7: Halikko full structure round-trip ──
const aH2 = buildAssignment(teamH, halikko);
const csvH = generateCSV([Object.assign(aH2, { team: teamH, kilpailunumero: 200 })], true);
const rtcH = verifyOutput(csvH);
assert('halikko rtc ok', rtcH.ok, rtcH.msg);
const hrow = parseCSV(csvH, ',')[1];
assert('halikko full: 15 blocks, slot14 empty osuus 14', hrow[6 + 13 * 8] === '' && hrow[9 + 13 * 8] === '14', JSON.stringify(hrow.slice(6 + 13 * 8, 6 + 14 * 8)));

// ── test 8: warnings & errors ──
const holeTeam = { sarja: 'H14', joukkue: 'H', seura: '', slots: ['A', '', 'B', ''], runners: ['A','B'] };
const aHole = buildAssignment(holeTeam, kompassiKilpa);
assert('hole → warning', aHole.warnings.some(w => w.includes('aukko')));

const dupTeam = { sarja: 'H14', joukkue: 'D', seura: '', slots: ['A','A','A','B','C'], runners: ['A','A','A','B','C'] };
const aDup = buildAssignment(dupTeam, kompassiKilpa);
assert('duplicate → warning', aDup.warnings.some(w => w.includes('toistuu')));

const tooBig = { sarja: 'H14', joukkue: 'B', seura: '', slots: ['1','2','3','4','5','6'], runners: ['1','2','3','4','5','6'] };
const aBig = buildAssignment(tooBig, kompassiKilpa);
assert('6 runners > 5 slots → error', !!aBig.error);

// ── test 9: encode/latin-1 detection sanity (decodeBuffer needs ArrayBuffer-ish) ──
const buf = latin1.buffer.slice(latin1.byteOffset, latin1.byteOffset + latin1.byteLength);
const { text, enc } = decodeBuffer(buf);
assert('decodeBuffer detects latin-1', enc.startsWith('latin'), enc);
assert('decodeBuffer preserves ä', text.includes('Jämsän'));

// ── test 10: navisport example (embedded fixture) re-parses with our tokenizer ──
const NAVISPORT_CSV = [
  '\ufeff"Kilpailunumero","Sarja","Joukkueen nimi","Kansalaisuus","Seura"," ","Nimi-1","Kilpailukortti-1","Lainakortti-1","Osuus-1","Alaosuus-1","Rata-1","Lähtöaika-1","  ","Nimi-2","Kilpailukortti-2","Lainakortti-2","Osuus-2","Alaosuus-2","Rata-2","Lähtöaika-2","   ","Nimi-3","Kilpailukortti-3","Lainakortti-3","Osuus-3","Alaosuus-3","Rata-3","Lähtöaika-3","    ","Nimi-4","Kilpailukortti-4","Lainakortti-4","Osuus-4","Alaosuus-4","Rata-4","Lähtöaika-4","     ","Nimi-5","Kilpailukortti-5","Lainakortti-5","Osuus-5","Alaosuus-5","Rata-5","Lähtöaika-5"',
  '"101","H14","Parhaat","","Espoon Suunta"," ","Vesa","","","1","","","","  ","Paavo","","","2","1","","","   ","Esko","","","2","2","","","    ","Vili","","","2","3","","","     ","Pedro","","","3","","",""',
  '"102","H14","Parhaat 2","","Espoon Suunta"," ","Aino","","","1","","","","  ","Anni","","","2","1","","","   ","Annika","","","2","2","","","    ","Elina","","","2","3","","","     ","Emma","","","3","","",""',
  '"103","H14","Parhaat 3","","Espoon Suunta"," ","Hanna","","","1","","","","  ","Heidi","","","2","","","","   ","Iida","","","3","","","","    ","","","","","","","","     ","","","","","","",""',
  '"104","Avoin Oranssi","Pikku Parhaat","","Espoon Suunta"," ","Jenna","","","1","","","","  ","Kaisa","","","2","","","","   ","Karoliina","","","3","","","","    ","","","","","","","","     ","","","","","","",""',
  '"105","D12","Parhaat 5","","Kalevan Rasti"," ","Kerttu","","","1","","","","  ","Lotta","","","2","1","","","   ","Maija","","","2","2","","","    ","Marja","","","2","3","","","     ","Minna","","","3","","",""',
  '"106","H12","Parhaat 6","","Kalevan Rasti"," ","Niina","","","1","","","","  ","Outi","","","3","","","","   ","","","","","","","","    ","","","","","","","","     ","","","","","","",""',
].join('\r\n');
const nv = Buffer.from(NAVISPORT_CSV, 'utf8');
const { text: nvText } = decodeBuffer(nv.buffer.slice(nv.byteOffset, nv.byteOffset + nv.byteLength));
const nvRows = parseCSV(nvText, ',');
assert('navisport example: 7 rows', nvRows.length === 7, String(nvRows.length));
assert('navisport example: Parhaat row2 osuus/alaosuus 1/2.1/2.2/2.3/3', nvRows[1][9] === '1' && nvRows[1][17] === '2' && nvRows[1][18] === '1' && nvRows[1][25] === '2' && nvRows[1][26] === '2' && nvRows[1][33] === '2' && nvRows[1][34] === '3' && nvRows[1][41] === '3', JSON.stringify(nvRows[1].slice(6, 42)));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
