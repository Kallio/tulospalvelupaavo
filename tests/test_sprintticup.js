const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/sprintticup-event_logo.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// ── minimal DOM stub (enough for the inline script to load + first draw) ──
function make2dCtx() {
  const ctx = {
    fillStyle: '', font: '', textAlign: '', textBaseline: '', lineWidth: 0, strokeStyle: '',
    _w: 0,
    fillRect() {}, save() {}, restore() {}, translate() {}, scale() {}, drawImage() {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {},
    fillText() {}, strokeRect() {}, setLineDash() {},
    measureText() { return { width: ctx._w }; },
  };
  return ctx;
}
function makeEl(tag) {
  const el = {
    tag, value: '', textContent: '', className: '', style: {}, files: [], checked: false,
    ctx: make2dCtx(),
    addEventListener() {},
    getContext() { return el.ctx; },
  };
  return el;
}
const store = {};
function getEl(id) { if (!store[id]) store[id] = makeEl('#' + id); return store[id]; }
global.document = {
  getElementById: getEl,
  createElement: tag => makeEl(tag),
};
global.window = { addEventListener() {} };
global.localStorage = {
  _s: {},
  getItem(k) { return k in this._s ? this._s[k] : null; },
  setItem(k, v) { this._s[k] = String(v); },
  removeItem(k) { delete this._s[k]; },
};
global.Image = class {
  constructor() {
    this.onload = null;
    this.src = '';
    this.complete = false;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.width = 0;
    this.height = 0;
  }
};

let threw = null;
try {
  eval(code + `;
global.__p = {
  extractNavisportId, formatFinnishDate, clampScale, clampPct, drawFitText,
  deepDefault, DEFAULT_LAYOUT,
};`);
} catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }

const P = global.__p;

let pass = 0, fail = 0;
const assert = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
};

// ── extractNavisportId ──
assert('id: empty → ""', P.extractNavisportId('') === '');
assert('id: whitespace → ""', P.extractNavisportId('   \n ') === '');
assert('id: full URL event → slug', P.extractNavisportId('https://navisport.com/events/stadin-sprintticup-2026') === 'stadin-sprintticup-2026');
assert('id: full URL tapahtumat → slug', P.extractNavisportId('https://navisport.com/tapahtumat/stadin-sprintticup-2026') === 'stadin-sprintticup-2026');
assert('id: scheme-less URL → slug', P.extractNavisportId('navisport.com/events/stadin-sprintticup-2026') === 'stadin-sprintticup-2026');
assert('id: bare slug passes through', P.extractNavisportId('stadin-sprintticup-2026') === 'stadin-sprintticup-2026');
assert('id: UUID passes through', P.extractNavisportId('550e8400-e29b-41d4-a716-446655440000') === '550e8400-e29b-41d4-a716-446655440000');
assert('id: junk with spaces → ""', P.extractNavisportId('Hello World') === '');
assert('id: junk symbols → ""', P.extractNavisportId('$$$ ???') === '');
assert('id: non-string coerced', P.extractNavisportId(123) === '123');

// ── formatFinnishDate ──
assert('date: Helsinki noon → dd.m.yyyy', P.formatFinnishDate('2026-04-13T09:00:00Z', 'Europe/Helsinki') === '13.4.2026', P.formatFinnishDate('2026-04-13T09:00:00Z', 'Europe/Helsinki'));
assert('date: leading-zero day', P.formatFinnishDate('2026-03-05T09:00:00Z', 'Europe/Helsinki') === '5.3.2026', P.formatFinnishDate('2026-03-05T09:00:00Z', 'Europe/Helsinki'));
assert('date: invalid → ""', P.formatFinnishDate('not-a-date', 'Europe/Helsinki') === '');
assert('date: empty → ""', P.formatFinnishDate('', 'Europe/Helsinki') === '');
assert('date: undefined → ""', P.formatFinnishDate(undefined, 'Europe/Helsinki') === '');

// ── clampScale (0.05 … 20) ──
assert('scale: clamps low', P.clampScale(0.001) === 0.05);
assert('scale: clamps high', P.clampScale(50) === 20);
assert('scale: keeps middle', P.clampScale(2) === 2);
assert('scale: boundaries kept', P.clampScale(0.05) === 0.05 && P.clampScale(20) === 20);

// ── clampPct ──
assert('pct: clamps above hi', P.clampPct(150, 5, 95) === 95);
assert('pct: clamps below lo', P.clampPct(-10, 0, 95) === 0);
assert('pct: keeps middle', P.clampPct(50, 0, 100) === 50);
assert('pct: bound is exclusive', P.clampPct(97, 5, 95) === 95);

// ── layout defaults ──
assert('layout: has logo/date/place', ['logo', 'date', 'place'].every(k => k in P.DEFAULT_LAYOUT));
assert('layout: logo centered at 50', P.DEFAULT_LAYOUT.logo.cx === 50 && P.DEFAULT_LAYOUT.logo.type === 'logo');
assert('layout: logo 70×14.8%', P.DEFAULT_LAYOUT.logo.w === 70 && P.DEFAULT_LAYOUT.logo.h === 14.8);
assert('layout: date/place are text', P.DEFAULT_LAYOUT.date.type === 'text' && P.DEFAULT_LAYOUT.place.type === 'text');
const fresh = P.deepDefault();
assert('layout: deepDefault copies (mutation-safe)', fresh !== P.DEFAULT_LAYOUT && fresh.logo !== P.DEFAULT_LAYOUT.logo && JSON.stringify(fresh) === JSON.stringify(P.DEFAULT_LAYOUT));
fresh.logo.cx = 10;
assert('layout: mutating the copy leaves default', P.DEFAULT_LAYOUT.logo.cx === 50);

// ── drawFitText auto-shrink (measured against the script's real ctx stub) ──
{
  const ctx = getEl('cardCanvas').getContext('2d');
  ctx._w = 500;
  let s = P.drawFitText('short', 0, 0, 100, 940, 'bold');
  assert('fitText: fits → keeps 100', s === 100, 'got ' + s);
  ctx._w = 2000;
  s = P.drawFitText('very long text ss', 0, 0, 100, 940, 'bold');
  assert('fitText: overflow → shrinks to 47', s === 47, 'got ' + s);
  ctx._w = 100000;
  s = P.drawFitText('tiny', 0, 0, 30, 940, 'bold');
  assert('fitText: floor guard at 20', s === 20, 'got ' + s);
}

// ── HTML wiring smoke checks ──
assert('lang="fi"', html.includes('lang="fi"'));
assert('title = Sprintticup Generaattori', html.includes('<title>Sprintticup Generaattori</title>'));
assert('canvas id=cardCanvas (1080×1080)', html.includes('id="cardCanvas"') && html.includes('width="1080" height="1080"'));
assert('Navisport input', html.includes('id="navisportInput"'));
assert('date + place inputs', html.includes('id="dateInput"') && html.includes('id="locInput"'));
assert('map image file input', html.includes('id="mapInput"') && html.includes('type="file"'));
assert('logo file + URL inputs', html.includes('id="logoInput"') && html.includes('id="logoUrlInput"'));
assert('embedded default logo (base64), no network at start', html.includes('data:image/png;base64,'));
assert('official logo URL', html.includes('logo-kansikuva-transparent.png'));
assert('PNG download named sprintticup-…', html.includes("'sprintticup-' +") && html.includes('download'));
assert('layout persisted to localStorage', html.includes("getItem('sprintticup_layout')") && html.includes("setItem('sprintticup_layout'"));
assert('poster text without map', html.includes('Valitse karttakuva vasemmalta'));
assert('single inline script', (html.match(/<script>/g) || []).length === 1);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);