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

// ── minimal DOM/canvas stub so main.js can init() and render in Node ──
function makeCtx() {
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1,
    setLineDash() {}, fillRect() {}, strokeRect() {}, drawImage() {},
    beginPath() {}, rect() {}, clip() {}, save() {}, restore() {},
    fill() {}, stroke() {}, translate() {}, scale() {}, rotate() {},
    getImageData() { return { data: new Uint8ClampedArray(1) }; },
  };
}
function makeEl(tag) {
  const el = {
    tag, value: '', checked: false, disabled: false, textContent: '', innerHTML: '',
    className: '', title: '', style: {}, files: [], children: [], hidden: true,
    width: 0, height: 0, __handlers: {},
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(type, fn) { (this.__handlers[type] = this.__handlers[type] || []).push(fn); },
    dispatch(type) { (this.__handlers[type] || []).forEach(fn => fn({ type, target: this })); },
    getContext() { return makeCtx(); }, toBlob() {},
    querySelectorAll() { return []; },
  };
  return el;
}
const store = {};
global.document = {
  getElementById(id) { if (!store[id]) store[id] = makeEl('#' + id); return store[id]; },
  createElement: tag => makeEl(tag),
  querySelectorAll() { return []; },
};
global.window = global;
global.self = global;
global.MapMergerCrop = C;
global.MapMergerExport = E;
global.location = { search: '' };

const mainSrc = fs.readFileSync(path.join(dir, 'main.js'), 'utf8');
let threw = null;
try { eval(mainSrc.replace("'use strict';", '')); } catch (e) { threw = e; }
assert('main.js init() evaluates without throwing', threw === null, threw && threw.stack);

const mm = global.__mapMerger;
assert('window.__mapMerger exposes state + buildSheetModel', mm && mm.state && typeof mm.buildSheetModel === 'function');

// progressive step panels: all hidden with no files/pages
eval('updateSteps')();
assert('updateSteps hides all step panels when empty',
  document.getElementById('stepOptions').style.display === 'none' &&
  document.getElementById('stepSummary').style.display === 'none' &&
  document.getElementById('stepDownload').style.display === 'none' &&
  document.getElementById('mainSheets').style.display === 'none',
  JSON.stringify({ o: document.getElementById('stepOptions').style.display, s: document.getElementById('stepSummary').style.display, d: document.getElementById('stepDownload').style.display, m: document.getElementById('mainSheets').style.display }));

function page(id, wmm, hmm, canvas) {
  return { id, srcId: 1, srcName: 'x.pdf', pageNo: 1, kind: 'pdf', cropCanvas: canvas || document.createElement('canvas'), cropWmm: wmm, cropHmm: hmm };
}

const st = mm.state;
st.options.repeat = false; st.options.mirror = false; st.options.mirrorOnly = false;
st.options.keepOriginal = false; st.options.repeatN = 4;
st.selectedId = null;
st.pages = [page(1, 210, 148.5), page(2, 148, 210), page(3, 105, 148)];
st.files = [{ id: 1, name: 'x.pdf', kind: 'pdf' }];
eval('updateSteps')();
assert('updateSteps shows options with files and later steps with pages',
  document.getElementById('stepOptions').style.display === '' &&
  document.getElementById('stepSummary').style.display === '' &&
  document.getElementById('stepDownload').style.display === '' &&
  document.getElementById('mainSheets').style.display === '');
st.files = [];

// stack default
let sheets = mm.buildSheetModel();
assert('default: 3 pages → 2 stack sheets', sheets.length === 2 && sheets.every(s => s.layout === 'stack'), JSON.stringify(sheets));
assert('stack sheet 0 has 2 cells, sheet 1 has [page3, null]', sheets[0].cells.length === 2 && sheets[1].cells[0] && sheets[1].cells[0].pageId === 3 && sheets[1].cells[1] === null);

// repeat grid
st.options.repeat = true;
st.selectedId = 3; // the A6 portrait page → 4 copies fit on A4
sheets = mm.buildSheetModel();
assert('repeat: 1 grid sheet of 4 copies', sheets.length === 1 && sheets[0].layout === 'grid' && sheets[0].count === 4 && sheets[0].cells.length === 4);
const gd = E.gridDims(4, 105 / 148);
assert('repeat grid is 2×2 for A6 portrait', gd.cols === 2 && gd.rows === 2, JSON.stringify(gd));

// repeat + mirror (interleaved front+back) and repeat + mirrorOnly
st.options.mirror = true; st.options.mirrorOnly = false;
sheets = mm.buildSheetModel();
assert('repeat + mirror → front + mirrored back (2 sheets)', sheets.length === 2 && sheets[1].cells[0].mirrored === true);
st.options.mirrorOnly = true;
sheets = mm.buildSheetModel();
assert('repeat + mirrorOnly → only the mirrored back (1 sheet)', sheets.length === 1 && sheets[0].cells[0].mirrored === true && sheets[0].cells.length === 4);

// stack + mirrorOnly
st.options.repeat = false; st.options.mirror = true; st.options.mirrorOnly = true;
sheets = mm.buildSheetModel();
assert('stack + mirrorOnly → one mirrored back per pair (2 sheets for 3 pages)', sheets.length === 2 && sheets.every(s => s.cells.some(c => c && c.mirrored)));
st.options.mirrorOnly = false;
sheets = mm.buildSheetModel();
assert('stack + mirror (interleaved) → front,back per pair', sheets.length === 4 && sheets[1].cells.some(c => c && c.mirrored) && !sheets[0].cells.some(c => c && c.mirrored));

// updateSummary warning for oversized maps in keepOriginal / repeat
st.options.mirror = false; st.options.repeat = false; st.options.keepOriginal = true;
st.pages = [page(1, 400, 300), page(2, 105, 148)];
const warnEl = global.document.getElementById('summary');
warnEl.textContent = ''; warnEl.className = '';
eval('updateSummary')();
assert('updateSummary flags oversized map with ⚠ + warn class', warnEl.textContent.includes('⚠') && warnEl.className === 'warn', JSON.stringify({ t: warnEl.textContent, c: warnEl.className }));

st.options.keepOriginal = false;
warnEl.textContent = ''; warnEl.className = '';
eval('updateSummary')();
assert('no warning without 1:1 mode', !warnEl.textContent.includes('⚠') && warnEl.className !== 'warn', JSON.stringify({ t: warnEl.textContent, c: warnEl.className }));

// repeat + grid: A5 maps can never exceed 2 copies on one A4 (clamped)
st.options.repeat = true; st.options.mirror = false;
st.options.repeatN = 4;
st.pages = [page(1, 210, 148.5)];
sheets = mm.buildSheetModel();
assert('repeat A5 landscape, repeatN=4 → clamped to 2 copies', sheets[0].count === 2 && sheets[0].cells.length === 2, JSON.stringify(sheets[0].count));
st.options.repeatN = 2;
sheets = mm.buildSheetModel();
assert('repeat A5 landscape, repeatN=2 → kept 2 copies', sheets[0].count === 2 && sheets[0].cells.length === 2);

st.pages = [page(1, 105, 148)];
st.options.repeatN = 4;
sheets = mm.buildSheetModel();
assert('repeat A6 portrait, repeatN=4 → kept 4 copies', sheets[0].count === 4 && sheets[0].cells.length === 4, JSON.stringify(sheets[0].count));
st.options.repeatN = 8;
sheets = mm.buildSheetModel();
assert('repeat A6 portrait, repeatN=8 → clamped to 4 copies', sheets[0].count === 4 && sheets[0].cells.length === 4);

// updateSummary keeps optRepeatN.max in sync with the source map
st.pages = [page(1, 210, 148.5)];
eval('updateSummary')();
assert('updateSummary sets optRepeatN.max = 2 for A5', global.document.getElementById('optRepeatN').max === '2');
st.pages = [page(1, 105, 148)];
eval('updateSummary')();
assert('updateSummary sets optRepeatN.max = 4 for A6 portrait', global.document.getElementById('optRepeatN').max === '4');

// renderSheets does not throw in repeat grid mode
st.options.repeat = true; st.options.mirror = false;
st.pages = [page(1, 148, 105)];
let rt = null;
try { eval('renderSheets')(); } catch (e) { rt = e; }
assert('renderSheets() no throw in repeat grid mode', rt === null, rt && rt.stack);

// per-image paper format (bitmap import): recomputes mm without reloading
st.options.autoCrop = false;
const ip = { id: 99, srcId: 2, srcName: 'photo.png', pageNo: 1, kind: 'image', pxW: 1600, pxH: 1200, imageFormat: 'A5', wmm: 210, hmm: 157.5, original: document.createElement('canvas') };
ip.original.width = 800; ip.original.height = 600;
st.pages = [ip];
eval('setImageFormat')(ip, 'A6');
assert('setImageFormat A6 landscape → 148×111 mm', Math.abs(ip.origWmm - 148) < 1e-9 && Math.abs(ip.origHmm - 111) < 1e-9, JSON.stringify({ w: ip.origWmm, h: ip.origHmm }));
eval('setImageFormat')(ip, 'A7');
assert('setImageFormat A7 landscape → 105×78.75 mm', Math.abs(ip.origWmm - 105) < 1e-9 && Math.abs(ip.origHmm - 78.75) < 1e-9, JSON.stringify({ w: ip.origWmm, h: ip.origHmm }));
let ipErr = null;
try { eval('renderPages')(); } catch (e) { ipErr = e; }
assert('renderPages() no throw with an image page + format select', ipErr === null, ipErr && ipErr.stack);

// ── easter-egg reveal: fresh isolated eval per scenario ──
function runMain(search) {
  const els = {};
  const doc = {
    getElementById(id) { if (!els[id]) els[id] = makeEl('#' + id); return els[id]; },
    createElement: tag => makeEl(tag),
    querySelectorAll() { return []; },
    body: makeEl('body'),
  };
  const win = { MapMergerCrop: C, MapMergerExport: E };
  const fn = new Function('window', 'document', 'location', 'URLSearchParams', mainSrc.replace("'use strict';", '') + '\n;return window.__mapMerger;');
  fn(win, doc, { search }, URLSearchParams);
  return doc;
}

const rDefault = runMain('');
assert('easter-egg block starts hidden', rDefault.getElementById('easterEggBlock').hidden === true);
const hdr = rDefault.getElementById('optionsHdr');
for (let i = 0; i < 5; i++) hdr.dispatch('click');
assert('5 quick clicks on the options heading reveal the block', rDefault.getElementById('easterEggBlock').hidden === false);
for (let i = 0; i < 5; i++) hdr.dispatch('click');
assert('5 more clicks hide the block again', rDefault.getElementById('easterEggBlock').hidden === true);

const rParam = runMain('?easteregg=1');
assert('?easteregg=1 URL param reveals the block on load', rParam.getElementById('easterEggBlock').hidden === false);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
