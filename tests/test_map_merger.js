const fs = require('fs');
const path = require('path');
const dir = '/tulospalvelupaavo/map_merger';
const C = require(path.join(dir, 'crop.js'));
const E = require(path.join(dir, 'pdf-export.js'));

let pass = 0, fail = 0;
const assert = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
};

// ── detectContentBBox ────────────────────────────────────────────────
function canvasFromGrid(w, h, isContent) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (isContent(x, y)) { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255; }
    else { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255; }
  }
  return data;
}

const blank = canvasFromGrid(100, 80, () => false);
assert('fully blank page → null', C.detectContentBBox(blank, 100, 80) === null);

const box = canvasFromGrid(100, 80, (x, y) => x >= 20 && x < 60 && y >= 10 && y < 40);
const bb = C.detectContentBBox(box, 100, 80);
assert('tight bbox x', bb.x0 === 20 && bb.x1 === 60, JSON.stringify(bb));
assert('tight bbox y', bb.y0 === 10 && bb.y1 === 40, JSON.stringify(bb));

const single = canvasFromGrid(50, 50, (x, y) => x === 0 && y === 0);
assert('content at origin → bbox starts 0', JSON.stringify(C.detectContentBBox(single, 50, 50)) === '{"x0":0,"y0":0,"x1":1,"y1":1}');

const edge = canvasFromGrid(50, 50, (x, y) => x === 49 && y === 49);
assert('content at bottom-right → bbox ends w,h', JSON.stringify(C.detectContentBBox(edge, 50, 50)) === '{"x0":49,"y0":49,"x1":50,"y1":50}');

const alpha = new Uint8ClampedArray(4 * 4 * 4);
for (let i = 0; i < alpha.length; i += 4) { alpha[i] = 0; alpha[i + 1] = 0; alpha[i + 2] = 0; alpha[i + 3] = 0; }
alpha[4 * 0 + 0] = 0; alpha[4 * 0 + 1] = 0; alpha[4 * 0 + 2] = 0; alpha[4 * 0 + 3] = 255; // opaque pixel at (0,0)
assert('transparent pixels count as white', JSON.stringify(C.detectContentBBox(alpha, 4, 4)) === '{"x0":0,"y0":0,"x1":1,"y1":1}');

const threshold = new Uint8ClampedArray(8 * 8 * 4);
for (let i = 0; i < threshold.length; i += 4) { threshold[i] = 246; threshold[i + 1] = 247; threshold[i + 2] = 248; threshold[i + 3] = 255; }
assert('rgb 246-248 (>245) counts as white', C.detectContentBBox(threshold, 8, 8) === null);

const nearly = new Uint8ClampedArray(8 * 8 * 4);
for (let i = 0; i < nearly.length; i += 4) { nearly[i] = 245; nearly[i + 1] = 245; nearly[i + 2] = 245; nearly[i + 3] = 255; }
assert('rgb 245 (not >245) counts as content', JSON.stringify(C.detectContentBBox(nearly, 8, 8)) === '{"x0":0,"y0":0,"x1":8,"y1":8}');

// ── expandBBox ───────────────────────────────────────────────────────
const ex = C.expandBBox({ x0: 10, y0: 10, x1: 20, y1: 20 }, 5, 3, 7, 2, 100, 100);
assert('expandBBox grows all sides', JSON.stringify(ex) === '{"x0":5,"y0":7,"x1":27,"y1":22}');
const clampEx = C.expandBBox({ x0: 0, y0: 0, x1: 100, y1: 100 }, 50, 50, 50, 50, 100, 100);
assert('expandBBox clamps to page', JSON.stringify(clampEx) === '{"x0":0,"y0":0,"x1":100,"y1":100}');

// ── pixelsToMm / pixelBoxFromMm round-trip ───────────────────────────
const pxPerMm = 300 / 25.4; // ≈11.811
const rt = C.pixelBoxFromMm(0, 0, 210, 148.5, pxPerMm);
assert('pixelBoxFromMm A5-cell → ~2480×1754 px (ceil, never undershoot)', rt.x1 === 2481 && rt.y1 === 1754, JSON.stringify(rt));
const mm = C.pixelsToMm({ x0: 0, y0: 0, x1: rt.x1, y1: rt.y1 }, pxPerMm);
assert('pixelsToMm round-trips ~A5 cell', Math.abs(mm.w - 210) < 0.1 && Math.abs(mm.h - 148.5) < 0.1, JSON.stringify(mm));

// ── computeCellPlacement (pure) ──────────────────────────────────────
const cell = { w: 210, h: 148.5 };
const a5l = C; void a5l;
const fitLandscape = E.computeCellPlacement(210, 148.5, cell, {});
assert('exact landscape A5 fills cell (contain)', Math.abs(fitLandscape.w - 210) < 1e-9 && Math.abs(fitLandscape.h - 148.5) < 1e-9 && Math.abs(fitLandscape.x) < 1e-9 && Math.abs(fitLandscape.y) < 1e-9, JSON.stringify(fitLandscape));

const fitPortrait = E.computeCellPlacement(148, 210, cell, {});
assert('portrait A5 contained in wide cell', Math.abs(fitPortrait.h - 148.5) < 1e-9 && Math.abs(fitPortrait.x - (210 - fitPortrait.w) / 2) < 1e-9, JSON.stringify(fitPortrait));

const ko = E.computeCellPlacement(148, 210, cell, { keepOriginal: true });
assert('keepOriginal → scale 1, centered (overflows cell)', ko.scale === 1 && ko.w === 148 && ko.h === 210 && Math.abs(ko.x - (210 - 148) / 2) < 1e-9 && Math.abs(ko.y - (148.5 - 210) / 2) < 1e-9, JSON.stringify(ko));

const small = E.computeCellPlacement(105, 148, cell, { keepOriginal: true });
assert('keepOriginal on small map stays 1:1, centered', small.scale === 1 && Math.abs(small.x - (210 - 105) / 2) < 1e-9 && Math.abs(small.y - (148.5 - 148) / 2) < 1e-9, JSON.stringify(small));

const guard = E.computeCellPlacement(0, 0, cell, {});
assert('zero-size guard returns full cell', guard.w === cell.w && guard.h === cell.h);

// ── printableRect / clipRectFor / gridDims / cellGeom (clip-only margin) ─
const pr0 = E.printableRect(0);
assert('printableRect(0) → full A4 210×297', pr0.x === 0 && pr0.y === 0 && pr0.w === 210 && pr0.h === 297, JSON.stringify(pr0));
const pr5 = E.printableRect(5);
assert('printableRect(5) → 200×287 at (5,5)', pr5.x === 5 && pr5.y === 5 && pr5.w === 200 && pr5.h === 287, JSON.stringify(pr5));
assert('normalizeMargin defaults to 5', E.normalizeMargin(undefined) === 5 && E.normalizeMargin(-1) === 5 && E.normalizeMargin(3.5) === 3.5);
assert('MARGIN_MM = 5', E.MARGIN_MM === 5);

const clipTop = E.clipRectFor({ x: 0, y: 0, w: 210, h: 148.5 }, 5);
assert('clipRectFor top cell = printable ∩ cell', clipTop.x === 5 && clipTop.y === 5 && clipTop.w === 200 && Math.abs(clipTop.h - 143.5) < 1e-9, JSON.stringify(clipTop));
const clipBot = E.clipRectFor({ x: 0, y: 148.5, w: 210, h: 148.5 }, 5);
assert('clipRectFor bottom cell starts below top cell', clipBot.x === 5 && Math.abs(clipBot.y - 148.5) < 1e-9 && Math.abs(clipBot.h - 143.5) < 1e-9, JSON.stringify(clipBot));
const clipFull = E.clipRectFor({ x: 0, y: 0, w: 210, h: 297 }, 0);
assert('clipRectFor margin 0 = full cell', clipFull.x === 0 && clipFull.y === 0 && clipFull.w === 210 && clipFull.h === 297, JSON.stringify(clipFull));

const gdA6 = E.gridDims(4, 105 / 148);
assert('gridDims(4, A6 portrait) → 2×2', gdA6.cols === 2 && gdA6.rows === 2, JSON.stringify(gdA6));
const gdA5 = E.gridDims(2, 210 / 148.5);
assert('gridDims(2, A5 landscape) → 1×2 (stack-like, exact aspect)', gdA5.cols === 1 && gdA5.rows === 2, JSON.stringify(gdA5));
const gd1 = E.gridDims(1, 1.4);
assert('gridDims(1, any) → 1×1', gd1.cols === 1 && gd1.rows === 1, JSON.stringify(gd1));
const gdDef = E.gridDims(2, NaN);
assert('gridDims bad aspect → defaults to CELL aspect', gdDef.cols === 1 && gdDef.rows === 2, JSON.stringify(gdDef));

// maxRepeatCopies: a 1:1 copy must fully fit its cell → ≤ floor(A4/map) per axis
assert('maxRepeatCopies(A5 landscape) = 2', E.maxRepeatCopies(210, 148.5) === 2);
assert('maxRepeatCopies(A6 portrait) = 4', E.maxRepeatCopies(105, 148) === 4);
assert('maxRepeatCopies(A5 portrait) = 1', E.maxRepeatCopies(148, 210) === 1);
assert('maxRepeatCopies(A7 landscape) = 4', E.maxRepeatCopies(74, 105) === 4);
assert('maxRepeatCopies(A4 landscape) = 1', E.maxRepeatCopies(297, 210) === 1);
assert('maxRepeatCopies(no size) = 1', E.maxRepeatCopies(0, 0) === 1);

// gridDims honors 1:1 fit when mapW/mapH given: 4 A5 can never fit (≥2 slices),
// 2 A5 → the exact 1×2 stack; 4 A6 → 2×2.
const gdFitA5 = E.gridDims(4, 210 / 148.5, 210, 148.5);
assert('gridDims(4, A5, fit) → fallback (no grid fits 4 A5)', gdFitA5.cols === 2 && gdFitA5.rows === 2, JSON.stringify(gdFitA5));
const gd2A5 = E.gridDims(2, 210 / 148.5, 210, 148.5);
assert('gridDims(2, A5, fit) → 1×2 exact fit', gd2A5.cols === 1 && gd2A5.rows === 2, JSON.stringify(gd2A5));
const gd4A6 = E.gridDims(4, 105 / 148, 105, 148);
assert('gridDims(4, A6, fit) → 2×2 fits', gd4A6.cols === 2 && gd4A6.rows === 2, JSON.stringify(gd4A6));

const g0 = E.cellGeom(0, 'stack', 2, undefined);
const g1 = E.cellGeom(1, 'stack', 2, undefined);
assert('cellGeom stack row0 at origin (margin ignored)', g0.x === 0 && g0.y === 0 && g0.w === 210 && g0.h === 148.5, JSON.stringify(g0));
assert('cellGeom stack row1 below row0', Math.abs(g1.y - 148.5) < 1e-9 && g1.h === 148.5, JSON.stringify(g1));
const gr0 = E.cellGeom(0, 'grid', 4, 105 / 148, 105, 148);
const gr1 = E.cellGeom(1, 'grid', 4, 105 / 148, 105, 148);
const gr2 = E.cellGeom(2, 'grid', 4, 105 / 148, 105, 148);
assert('cellGeom grid 2×2 cell size 105×148.5', gr0.x === 0 && gr0.y === 0 && gr0.w === 105 && Math.abs(gr0.h - 148.5) < 1e-9, JSON.stringify(gr0));
assert('cellGeom grid row-major order', gr1.x === 105 && gr1.y === 0 && gr2.x === 0 && Math.abs(gr2.y - 148.5) < 1e-9, JSON.stringify([gr1, gr2]));

// ── computeCellRect (clip-only margin, stack + grid) ─────────────────
const r00 = E.computeCellRect(210, 148.5, 0, { layout: 'stack', count: 2 }, 0, {});
assert('cellRect margin0 top: at origin, full cell', r00.x === 0 && r00.y === 0 && r00.w === 210 && r00.h === 148.5 && r00.clipX === 0 && r00.clipW === 210, JSON.stringify(r00));

const r05 = E.computeCellRect(210, 148.5, 0, { layout: 'stack', count: 2 }, 5, {});
assert('cellRect margin5: layout NOT inset (scale 1), only clip shrinks', r05.w === 210 && r05.h === 148.5 && r05.x === 0 && r05.y === 0 && r05.clipX === 5 && r05.clipW === 200 && Math.abs(r05.clipH - 143.5) < 1e-9, JSON.stringify(r05));

const r15 = E.computeCellRect(210, 148.5, 1, { layout: 'stack', count: 2 }, 5, {});
assert('cellRect margin5 bottom: y at row1, clip spans to printable bottom', Math.abs(r15.y - 148.5) < 1e-9 && Math.abs(r15.clipY - 148.5) < 1e-9 && Math.abs(r15.clipY + r15.clipH - (297 - 5)) < 1e-9, JSON.stringify(r15));

const rko = E.computeCellRect(148, 210, 0, { layout: 'stack', count: 2 }, 5, { keepOriginal: true });
assert('cellRect keepOriginal portrait: 1:1 centered, overflows top, clip at 5', rko.w === 148 && rko.h === 210 && rko.x === 31 && rko.y < 0 && rko.clipY === 5 && rko.clipX === 5, JSON.stringify(rko));

const rg = E.computeCellRect(148, 105, 0, { layout: 'grid', count: 4, aspect: 148 / 105 }, 5, { keepOriginal: true });
assert('cellRect grid keepOriginal A6: overflows cell left, clip cuts', Math.abs(rg.w - 148) < 1e-9 && rg.x < 0 && rg.clipX === 5 && rg.cell.w === 105, JSON.stringify(rg));

// ── chunkPages ───────────────────────────────────────────────────────
const two = E.chunkPages([1, 2, 3], 2);
assert('chunkPages 3 → [{cells:[1,2]},{cells:[3,null]}] (sheet objects)', two.length === 2 && two[0].layout === 'stack' && two[0].cells[0] === 1 && two[0].cells[1] === 2 && two[1].cells[0] === 3 && two[1].cells[1] === null, JSON.stringify(two));
const four = E.chunkPages([1, 2, 3, 4], 2);
assert('chunkPages 4 → 2 sheets of 2', four.length === 2 && four[1].cells[1] === 4, JSON.stringify(four));
const one = E.chunkPages([7], 2);
assert('chunkPages 1 → 1 sheet with null slot', one.length === 1 && one[0].cells[0] === 7 && one[0].cells[1] === null);

// ── A4 constants ─────────────────────────────────────────────────────
assert('A4 = 210×297mm', E.A4.w === 210 && E.A4.h === 297);
assert('CELL = 210×148.5mm', E.CELL.w === 210 && Math.abs(E.CELL.h - 148.5) < 1e-9);
assert('PT_PER_MM ≈ 2.83465', Math.abs(E.PT_PER_MM - 72 / 25.4) < 1e-12);
assert('A4 pt dims ≈ 595.28×841.89', Math.abs(E.A4.w * E.PT_PER_MM - 595.28) < 0.01 && Math.abs(E.A4.h * E.PT_PER_MM - 841.89) < 0.01);

// ── index.html / main.js wiring smoke checks ─────────────────────────
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
assert('index.html loads crop.js', html.includes('src="crop.js"'));
assert('index.html loads pdf-export.js', html.includes('src="pdf-export.js"'));
assert('index.html loads pdf-lib CDN', html.includes('pdf-lib'));
assert('index.html loads main.js as classic script', html.includes('src="main.js"') && !html.includes('type="module"'));
assert('index.html loads pdf.js CDN (classic/UMD)', html.includes('pdfjs-dist@3.11.174/build/pdf.min.js'));
assert('index.html lang button has data-i18n (visible text)', /id="langBtn"[^>]*data-i18n="langBtn"/.test(html));
['fileInput', 'dropZone', 'optAutoCrop', 'optBleed', 'optMargin', 'optRotate', 'optKeepOriginal', 'optMirror', 'optMirrorOnly', 'optRepeat', 'optRepeatN', 'clearBtn', 'downloadBtn', 'langBtn', 'fileList', 'summary', 'status', 'pageList', 'sheetList', 'stepOptions', 'stepSummary', 'stepDownload', 'mainSheets'].forEach(id => {
  assert('index.html has #' + id, html.includes('id="' + id + '"'));
});
assert('index.html new hints present', html.includes('id="keepOriginalHint"') && html.includes('id="mirrorOnlyHint"') && html.includes('id="repeatHint"'));
assert('index.html no longer references optFit', !html.includes('optFit'));

const main = fs.readFileSync(path.join(dir, 'main.js'), 'utf8');
assert('main.js not an ES module (file:// compatible)', !/\bimport\b|\bexport\b/.test(main.replace(/^\s*'use strict';/, '')));
assert('main.js sets pdf.js worker via GlobalWorkerOptions', main.includes('GlobalWorkerOptions.workerSrc'));
assert('main.js uses window.pdfjsLib', main.includes('window.pdfjsLib'));
assert('main.js uses MapMergerCrop', main.includes('MapMergerCrop.'));
assert('main.js uses MapMergerExport', main.includes('MapMergerExport.'));
assert('main.js uses window.PDFLib', main.includes('window.PDFLib'));
assert('main.js has per-page remove + original mm caption', /function removePage\(/.test(main) && main.includes("p.origWmm") && main.includes("'page-remove'") && main.includes('removePage'));
assert('main.js dropped fitExact', !main.includes('fitExact'));
assert('main.js uses keepOriginal/mirrorOnly/repeat/repeatN options', main.includes('keepOriginal') && main.includes('mirrorOnly') && main.includes('state.options.repeat') && main.includes('repeatN'));
assert('main.js has oversized warning', main.includes('isOversized') && main.includes('warnBig'));
assert('main.js has sheet-object buildSheetModel + mirrorSheet + countSheets', main.includes('function mirrorSheet') && main.includes('function countSheets') && main.includes("layout: 'grid'"));
assert('main.js uses IMAGE_FORMATS A5/A6/A7 for bitmap imports', main.includes('IMAGE_FORMATS') && main.includes("A5: { w: 148, h: 210 }") && main.includes("A6: { w: 105, h: 148 }") && main.includes("A7: { w: 74, h: 105 }") && main.includes('imageFormat'));
assert('main.js dropped the DPI tuning option', !main.includes('imageDpi') && !main.includes('optDpi'));
assert('global format select removed (per-image now)', !html.includes('id="optFormat"') && !main.includes('optFormat'));
assert('main.js has per-image format control', main.includes('function setImageFormat') && main.includes('p.pxW') && main.includes("IMAGE_FORMATS[format]") && main.includes("'A5', 'A6', 'A7'"));
assert('main.js has progressive step panels', main.includes('function updateSteps') && main.includes("el('stepOptions').style.display") && main.includes("el('mainSheets').style.display"));
assert('index.html easter-egg block exists and starts hidden', html.includes('<div id="easterEggBlock" hidden>') && html.includes('id="optMirror"') && html.includes('id="optMirrorOnly"'));
assert('index.html options heading has secret-click trigger id', /<h3 data-i18n="optionsHdr" id="optionsHdr">/.test(html));
assert('main.js has showEasterEgg + secretClick + URL param reveal', main.includes('function showEasterEgg') && main.includes('function secretClick') && main.includes("get('easteregg')") && main.includes('easterEggBlock'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
