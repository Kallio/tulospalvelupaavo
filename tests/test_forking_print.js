const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/forking-print.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) throw new Error('no inline script');
const src = m[1];
const pdfExport = fs.readFileSync('/tulospalvelupaavo/map_merger/pdf-export.js', 'utf8');

// Extract a top-level function by exact name (full body up to the closing
// brace at column 0). The tool's script has no trailing init that touches the
// DOM at load, so the parsing/matching functions are Node-testable as-is.
function extract(name) {
  const re = new RegExp('function ' + name + '\\s*\\([\\s\\S]*?\\n}\\n');
  const mm = src.match(re);
  if (!mm) throw new Error('function not found: ' + name);
  return mm[0];
}

const JOUKKEE = 'joukee';

let pass = 0, fail = 0;
function assert(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

// ── pure parsing helpers ──
const pure = ['parseCSV', 'parseTeams', 'parseForkingCSV', 'norm', 'parseRanges', 'legText',
              'forkLabelFor', 'collectUsedLabels', 'autoMatch'].map(extract).join('\n');
eval(pure + '; global.__f = { parseCSV, parseTeams, parseForkingCSV, norm, parseRanges, legText, forkLabelFor, collectUsedLabels, autoMatch };');
const F = global.__f;

// ---- parseCSV (RFC-4180 quoting) ----
const rows = F.parseCSV('A,"B,""C"""\r\nD,"E"');
assert('csv rows', rows.length === 2 && rows[1][1] === 'E');
assert('csv escaped quote inside record', rows[0][1] === 'B,"C"');

// ---- parseTeams (relay format: team cols 0-4 + runner blocks from col 6) ----
const q = v => '"' + v + '"';
const S = q(' ');
const teamHdr = ['Kilpailunumero', 'Sarja', JOUKKEE + 'n nimi', 'Kansalaisuus', 'Seura'].map(q).join(',');
const rHdr = n => [S, 'Nimi-' + n, 'Kilpailukortti-' + n, 'Lainakortti-' + n, 'Osuus-' + n, 'Alaosuus-' + n, 'Rata-' + n, 'Lähtöaika-' + n].map((v, i) => i === 0 ? v : q(v)).join(',');
const r = (nimi, chip, osuus, alaosuus, rata, aika) => [S, nimi, chip, '', osuus, (alaosuus || ''), rata, aika].map((v, i) => i === 0 ? v : q(v)).join(',');
const hdr = teamHdr + ',' + [1, 2, 3].map(rHdr).join(',');
const d1 = ['101', 'Jukola', 'Team A', 'FIN', 'Club A'].map(q).join(',') + ',' +
  r('Astra', '12345', '1', '', 'A', '10:00:00') + ',' +
  r('Anna', '12346', '2', '', 'B', '') + ',' +
  r('Jone', '12347', '3', '', 'A', '');
const d2 = ['102', 'Venlat', 'Team B', 'FIN', 'Club B'].map(q).join(',') + ',' +
  r('Leo', '23456', '1', '', 'B', '10:01:00');
const teams = F.parseTeams(F.parseCSV(hdr + '\r\n' + d1 + '\r\n' + d2));
assert('teams count = 2', teams.length === 2, String(teams.length));
assert('team A '+JOUKKEE, teams[0][JOUKKEE] === 'Team A', String(teams[0][JOUKKEE]));
assert('team B '+JOUKKEE, teams[1][JOUKKEE] === 'Team B', String(teams[1][JOUKKEE]));
assert('runner1 osuus = 1', teams[0].runners[0].osuus === '1');
assert('runner3 osuus = 3', teams[0].runners[2].osuus === '3');
assert('runner1 nimi', teams[0].runners[0].nimi === 'Astra');
assert('runner2 rata = B', teams[0].runners[1].rata === 'B');
assert('runner2 alaosuus empty', teams[0].runners[1].alaosuus === '');
assert('team B has 1 runner', teams[1].runners.length === 1, String(teams[1].runners.length));

// ---- parseForkingCSV: column discovery by header regex, order-independent ----
const frows = [['Virhe', 'Kilpailunumero', 'Osuus 2', 'Osuus 1', 'Osuus 3'],
               ['x', '101', 'B', 'A', 'A'],
               ['y', '102', 'A', 'C', 'B']];
const fd = F.parseForkingCSV(frows);
assert('forking order-independent', fd['101'].osuus1 === 'A' && fd['101'].osuus2 === 'B' && fd['102'].osuus1 === 'C');

// ---- forkLabelFor / collectUsedLabels / legText / norm / parseRanges ----
let forkingData = fd, csvTeams = [
  { kilpailunumero: '101', runners: [{ osuus: '1' }, { osuus: '3' }] },
  { kilpailunumero: '999', runners: [{ osuus: '2' }] },
];
assert('forkLabelFor A', F.forkLabelFor(csvTeams[0], csvTeams[0].runners[0]) === 'A');
assert('forkLabelFor empty without forking row', F.forkLabelFor(csvTeams[1], csvTeams[1].runners[0]) === '');
const labels = F.collectUsedLabels();
assert('collectUsedLabels unique used labels', labels.length === 1 && labels[0] === 'A');
assert('legText plain', F.legText({ osuus: '2' }) === '2');
assert('legText 2\u20133', F.legText({ osuus: '2', alaosuus: '3' }) === '2\u20133');
assert('norm strips punctuation/ext', F.norm('Route_A_Map.pdf') === 'routeamappdf');
assert('parseRanges 1-3,5', JSON.stringify([...F.parseRanges('1-3, 5')].sort()) === JSON.stringify([1, 2, 3, 5]));
assert('parseRanges empty -> null', F.parseRanges('') === null);

// ---- autoMatch: shortest/most-specific filename first, page reuse allowed
//      only across distinct labels, unmatched labels stay unset ----
let mapPages = [
  { id: 1, srcName: 'route_A_map.pdf', pageNo: 1 },
  { id: 2, srcName: 'route_B_map.pdf', pageNo: 1 },
  { id: 3, srcName: 'kartta_C_v2.pdf', pageNo: 1 },
  { id: 4, srcName: 'route_A_map.pdf', pageNo: 2 },
  { id: 5, srcName: 'A_map.pdf', pageNo: 1 },
];
const a = F.autoMatch(['A', 'B', 'C']);
assert('auto A picks shortest filename page', a['A'] === '5', 'got ' + a['A']);
assert('auto B', a['B'] === '2', 'got ' + a['B']);
assert('auto C', a['C'] === '3', 'got ' + a['C']);
assert('no duplicate page kept for distinct labels', new Set(['A', 'B', 'C'].map(l => a[l])).size === 3);
assert('unmatched label stays unset', !F.autoMatch(['X-nort'])['X-nort']);

// ── fold/half geometry (paper comes from the map, number in a half) ──
const geom = ['halfDims', 'numberHalf', 'halfRect'].map(extract).join('\n');
eval(geom + '; global.__g = { halfDims, numberHalf, halfRect };');
const G = global.__g;

const pd = G.halfDims(210, 297, 'portrait');
assert('halfDims portrait → vertical fold, portrait halves', pd.dir === 'v' && pd.halfW === 105 && pd.halfH === 297, JSON.stringify(pd));
const ld = G.halfDims(210, 297, 'landscape');
assert('halfDims landscape → horizontal fold, landscape halves', ld.dir === 'h' && ld.halfW === 210 && ld.halfH === 148.5, JSON.stringify(ld));
assert('halfDims unknown fold falls back to portrait', G.halfDims(100, 200, 'x').dir === 'v');

assert('numberHalf portrait left', G.numberHalf('portrait', 'left') === 'left');
assert('numberHalf portrait right', G.numberHalf('portrait', 'right') === 'right');
assert('numberHalf portrait clamps top → left (portrait default)', G.numberHalf('portrait', 'top') === 'left');
assert('numberHalf landscape top', G.numberHalf('landscape', 'top') === 'top');
assert('numberHalf landscape bottom', G.numberHalf('landscape', 'bottom') === 'bottom');
assert('numberHalf landscape clamps left → top (landscape default)', G.numberHalf('landscape', 'left') === 'top');

const fr = G.halfRect(210, 297, 'portrait', 'left');
assert('halfRect portrait-left at origin', fr.x === 0 && fr.y === 0 && fr.w === 105 && fr.h === 297, JSON.stringify(fr));
const rr = G.halfRect(210, 297, 'portrait', 'right');
assert('halfRect portrait-right on the right', rr.x === 105 && rr.y === 0, JSON.stringify(rr));
const tr = G.halfRect(210, 297, 'landscape', 'top');
assert('halfRect landscape-top at top', tr.x === 0 && tr.y === 0 && tr.w === 210 && tr.h === 148.5, JSON.stringify(tr));
const br = G.halfRect(210, 297, 'landscape', 'bottom');
assert('halfRect landscape-bottom below', br.y === 148.5, JSON.stringify(br));
assert('halfRect clamps stray position', G.halfRect(100, 100, 'portrait', 'bottom').pos === 'left');

// ── buildModel: original-page sheets, front/back pairing, no mirroring ──
const model = ['getFilteredEntries', 'forkLabelFor', 'buildEntries', 'buildModel'].map(extract).join('\n');
const scope =
  'const DEF_PAGE_W = 210, DEF_PAGE_H = 297;\n' +
  'let csvTeams = [], forkingData = {}, mapPages = [], assignments = {};\n' +
  'let state = { options: { frontSide: "map", fold: "portrait", halfPos: "left", showTeam: true, marginMm: 5 } };\n' +
  'function el(id) { return global.document.getElementById(id); }\n' +
  'global.document = { getElementById: id => ({ value: "" }) };\n' +
  'global.__b = { buildModel, buildEntries, setCsv: t => { csvTeams = t; }, setFork: f => { forkingData = f; }, setPages: p => { mapPages = p; }, setAssign: a => { assignments = a; }, setOptions: o => Object.assign(state.options, o) };\n';
eval(scope + model);
const B = global.__b;
const fakePage = { id: 1, srcName: 'route_A_map.pdf', pageNo: 1, original: { px: 'canvas' }, wmm: 297, hmm: 210 };
B.setPages([fakePage]);
B.setCsv([{ kilpailunumero: '101', sarja: 'H14', [JOUKKEE]: 'Team A', runners: [{ nimi: 'X', osuus: '1' }] }]);
B.setFork({ '101': { osuus1: 'A', osuus2: 'B', osuus3: 'C' } });
B.setAssign({ A: '1' });

B.setOptions({ frontSide: 'map', fold: 'portrait', halfPos: 'left' });
let sheets = B.buildModel();
assert('buildModel: 2 sheets', sheets.length === 2, String(sheets.length));
assert('sheet0 = front map at original page size',
  sheets[0].side === 'front' && sheets[0].kind === 'map' && sheets[0].wmm === 297 && sheets[0].hmm === 210, JSON.stringify(sheets[0]));
assert('sheet1 = back bib at original page size, portrait fold left',
  sheets[1].side === 'back' && sheets[1].kind === 'bib' && sheets[1].wmm === 297 && sheets[1].hmm === 210 && sheets[1].fold === 'portrait' && sheets[1].halfPos === 'left', JSON.stringify(sheets[1]));

B.setOptions({ fold: 'landscape', halfPos: 'bottom' });
sheets = B.buildModel();
assert('fold/halfPos flow into sheets', sheets[1].fold === 'landscape' && sheets[1].halfPos === 'bottom');

B.setOptions({ frontSide: 'bib', fold: 'portrait' });
sheets = B.buildModel();
assert('front=bib: sheet0 kind bib, sheet1 kind map',
  sheets[0].side === 'front' && sheets[0].kind === 'bib' && sheets[1].side === 'back' && sheets[1].kind === 'map');

// runner without an assigned map → sheets sized DEF (A4 portrait), still emitted
B.setCsv([{ kilpailunumero: '777', sarja: 'H14', [JOUKKEE]: 'NoMap', runners: [{ nimi: 'Y', osuus: '2' }] }]);
B.setFork({}); B.setAssign({});
B.setOptions({ frontSide: 'map', fold: 'portrait' });
sheets = B.buildModel();
assert('unmatched entry emits full-size sheets with a NULL page',
  sheets.length === 2 && sheets[0].kind === 'map' && sheets[0].wmm === 210 && sheets[0].hmm === 297 && sheets[0].entry.page === null, JSON.stringify(sheets[0]));

// ── static structure: removed options gone, new UI + pdf-export present ──
['optMirrorBack', 'mirrorBack', 'optAutoCrop', 'optAutoRotate', 'optBleed', 'flipCanvasH', 'redoCrops', 'Peilaa']
  .forEach(word => assert('removed option/feature absent: ' + word, !html.includes(word)));
assert('pdf-export.js: createMapPdf (page-per-sheet, 1:1)',
  pdfExport.includes('function createMapPdf') && pdfExport.includes('createMapPdf: createMapPdf') && pdfExport.includes('keepOriginal: true'));
assert('html: pdfjs 3.11.174 worker-compatible lib', html.includes('pdfjs-dist@3.11.174'));
assert('html: pdf-lib', html.includes('pdf-lib'));
assert('html: reuses map_merger crop.js', html.includes('map_merger/crop.js'));
assert('html: reuses map_merger pdf-export.js', html.includes('map_merger/pdf-export.js'));
['csvFile', 'forkCsvFile', 'mapPdfInput', 'mappingList', 'previewList', 'downloadBtn', 'optShowTeam', 'frontSide', 'summary',
 'foldSel', 'halfSel', 'langBtn', 'editBtn', 'autoFitChk', 'resetLayoutBtn', 'toolbar']
  .forEach(id => assert('html has #' + id, html.includes('id="' + id + '"')));
assert('i18n: fi + en tables and t()', html.includes('const I18N = {') && html.includes('  fi: {') && html.includes('  en: {') && /function t\(/.test(src));
assert('i18n: langBtn defaults to Finnish label set', html.includes("langBtn: 'EN / FI'"));
assert('portrait fold is the default', /fold:\s*'portrait'/.test(html));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);