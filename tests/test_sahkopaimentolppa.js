const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/sahkopaimentolpparastinnumero.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl(tag) {
  const el = {
    tag, value: '', textContent: '', className: '', style: {}, checked: false,
    children: [], offsetWidth: 0, offsetHeight: 0,
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, removeChild() {}, remove() {},
  };
  return el;
}
const store = {};
function getEl(id) { if (!store[id]) store[id] = makeEl('#' + id); return store[id]; }
global.document = {
  getElementById: getEl,
  createElement: tag => makeEl(tag),
};
let printed = false;
global.window = { print() { printed = true; } };

let threw = null;
try {
  eval(code);
} catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }

const P = window.__sahkopaimentolppa;

let pass = 0, fail = 0;
const assert = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
};

// ── constants ──
assert('A4 = 210×297mm', P.A4_W === 210 && P.A4_H === 297);
assert('part = 150×67mm (15cm × 6,7cm)', P.PART_W === 150 && P.PART_H === 67);
assert('4 parts per A4 by default', P.DEFAULT_PER_SHEET === 4);

// ── parseNumbers ──
assert('parse: empty → []', P.parseNumbers('') === null || JSON.stringify(P.parseNumbers('')) === '[]');
assert('parse: whitespace only → []', JSON.stringify(P.parseNumbers('   \n  \n')) === '[]');
assert('parse: lines', JSON.stringify(P.parseNumbers('032\n010\n124\n139')) === '["032","010","124","139"]');
assert('parse: trims spaces', JSON.stringify(P.parseNumbers(' 032 \n 010 \n')) === '["032","010"]');
assert('parse: skips empty lines', JSON.stringify(P.parseNumbers('032\n\n010\n')) === '["032","010"]');
assert('parse: commas + semicolons', JSON.stringify(P.parseNumbers('32, 10;124\n139')) === '["32","10","124","139"]');
assert('parse: preserves order', JSON.stringify(P.parseNumbers('9\n1\n7')) === '["9","1","7"]');
assert('parse: null → []', JSON.stringify(P.parseNumbers(null)) === '[]');
assert('parse: keeps ≤3-digit numbers incl. leading zeros', JSON.stringify(P.parseNumbers('032\n010\n124\n139')) === '["032","010","124","139"]');
assert('parse: drops >3-digit numbers', JSON.stringify(P.parseNumbers('1001\n22')) === '["22"]');
assert('parse: drops >3-digit mixed with valid', JSON.stringify(P.parseNumbers('032\n10000\n124\n9999999')) === '["032","124"]');
assert('parse: non-string coerced', JSON.stringify(P.parseNumbers(123)) === '["123"]');

// ── chunkNumbers ──
assert('chunk: 4 → 1 page of 4', P.chunkNumbers(['1','2','3','4'], 4).length === 1 && P.chunkNumbers(['1','2','3','4'], 4)[0].length === 4);
assert('chunk: 5 → 2 pages (4 + 1)', JSON.stringify(P.chunkNumbers(['1','2','3','4','5'], 4)) === '[["1","2","3","4"],["5"]]');
assert('chunk: 8 → 2 full pages', P.chunkNumbers(['1','2','3','4','5','6','7','8'], 4).length === 2);
assert('chunk: 0 numbers → one empty page', P.chunkNumbers([], 4).length === 1 && P.chunkNumbers([], 4)[0].length === 0);
assert('chunk: partial last page', JSON.stringify(P.chunkNumbers(['1','2','3'], 4)) === '[["1","2","3"]]', JSON.stringify(P.chunkNumbers(['1','2','3'], 4)));
assert('chunk: custom perSheet 2', JSON.stringify(P.chunkNumbers(['1','2','3'], 2)) === '[["1","2"],["3"]]', JSON.stringify(P.chunkNumbers(['1','2','3'], 2)));
assert('chunk: perSheet 0 → default', P.chunkNumbers(['1','2'], 0)[0].length === 2);
assert('chunk: perSheet clamped ≥1', P.chunkNumbers(['1','2','3'], 1).length === 3);
assert('chunk: perSheet default when NaN', P.chunkNumbers(['1','2'], NaN)[0].length === 2);

// ── partOffsetY (2+2 groups with a scissors gap between) ──
assert('part0 at top margin', P.partOffsetY(0, 4, 0) === 0);
assert('top pair stacked at 67mm (no gap yet)', P.partOffsetY(1, 4, 0) === 67);
assert('part2 jumps over group 1 + cut gap', P.partOffsetY(2, 4, 0) === 2 * P.PART_H + P.CUT_GAP_MM);
assert('bottom pair stacked from there', P.partOffsetY(3, 4, 0) - P.partOffsetY(2, 4, 0) === P.PART_H);
assert('cut gap sits between the 2+2 groups', P.partOffsetY(2, 4, 0) - P.partOffsetY(1, 4, 0) === P.PART_H + P.CUT_GAP_MM);
assert('gap is positive and small', P.CUT_GAP_MM > 0 && P.CUT_GAP_MM < P.PART_H);
assert('2+2 block fits in 297mm', P.partOffsetY(3, 4, 0) + P.PART_H < P.A4_H);
assert('respects custom top margin', P.partOffsetY(0, 4, 14.5) === 14.5);
assert('negative top margin → default', P.partOffsetY(0, 4, -1) === P.TOP_MARGIN);
assert('no gap with perSheet ≤ GROUP_PARTS (single group)', P.partOffsetY(0, 2, 0) === 0 && P.partOffsetY(1, 2, 0) === P.PART_H);
assert('perSheet defaults when 0', P.partOffsetY(3, 0, 0) === P.partOffsetY(3, 4, 0));

// ── HTML wiring smoke checks ──
assert('input id=nums', html.includes('id="nums"'));
assert('no perSheet setting (4 is the fixed max per sheet)', !html.includes('id="perSheet"'));
assert('print button', html.includes('id="printBtn"'));
assert('print button calls window.print()', html.includes('window.print()'));
assert('number cell uses left/right flipped', html.includes("'left' : 'right'") && html.includes('rotate(-90deg)'));
assert('digits face the 67mm edge (rotate 90°)', html.includes('rotate(90deg)') && html.includes('rotate(-90deg)'));
assert('two dotted fold lines per part (thirds)', html.includes('.part .fold') && html.includes('border-left: 0.2mm dotted') && /\[PART_W \/ 3, \(2 \* PART_W\) \/ 3\]/.test(html));
assert('title typo: tolppa not töppä', html.includes('olppa') && !html.includes('öppä') && html.includes('Tolpparastinumero'));
assert('Arial Narrow font used', html.includes("'Arial Narrow'"));
assert('condensed fallback list for Windows (Arial Narrow may be missing)', html.includes('Roboto Condensed') && html.includes('Liberation Sans Narrow') && html.includes("'Helvetica Neue Condensed'"));
assert('130pt font size base', html.includes('130'));
assert('4-part fixed default', html.includes('DEFAULT_PER_SHEET = 4'));
assert('@page size A4 portrait', html.includes('@page { size: A4 portrait'));
assert('print resets #main sidebar offset (fixes right-side clipping)', /#main \{ margin: 0 !important; padding: 0 !important; \}/.test(html));
assert('print hides sheet captions', /\.sheet-cap \{ display: none !important; \}/.test(html));
assert('parts absolutely positioned in mm', html.includes("PART_LEFT + 'mm'") && html.includes("partOffsetY(index, DEFAULT_PER_SHEET) + 'mm'"));
assert('two number cells per part', /buildNumberCell\(number, PART_LEFT, true\)/ .test(html) && /buildNumberCell\(number, PART_LEFT, false\)/.test(html));
assert('logo file input present', html.includes('id="logoFile"') && html.includes('type="file"'));
assert('QR is the default (no remote logo dependency)', !html.includes('logoUrl') && !html.includes('espoonsuunta.fi'));
assert('QR fallback URL', html.includes('QR_SITE_URL = ' + "'https://kallio.github.io/tulospalvelupaavo/'"));
assert('embedded QR path (no runtime encoder)', html.includes("var QR_PATH = ") && html.includes('createElementNS') && html.includes("p.setAttribute('d', QR_PATH)"));
assert('QR path stroked not filled (segno uses line segments)', html.includes("p.setAttribute('stroke', '#000')") && html.includes("p.setAttribute('stroke-width', '1')"));
assert('logo built for every part', /buildLogo\(\)/.test(html));
assert('logo read from file via FileReader', html.includes('readAsDataURL') && html.includes('FileReader'));
assert('QR shown when no logo file selected', html.includes("!el('logoFile').files[0]") || html.includes('files[0]'));
assert('QR SVG gets explicit mm size (fixes invisible auto-height SVG)', html.includes('.part .logo svg') && html.includes('34mm'));
assert('numbers limited to 3 digits', html.includes('.filter(function (s) { return s.length <= 3; })'));
assert('over-long numbers warned in summary', html.includes('hylättiin (yli 3 merkkiä)') && html.includes('state.skipped'));
assert('custom font file input present', html.includes('id="fontFile"') && html.includes('accept=".ttf,.otf,.woff,.woff2"'));
assert('custom font style override element', html.includes('id="custom-font-style"'));
assert('custom font loaded via FontFace (ArrayBuffer from base64, no raw data URL)', html.includes('new FontFace(family, base64ToArrayBuffer(') && html.includes('document.fonts.add'));
assert('custom font reset available', html.includes('resetCustomFont'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
