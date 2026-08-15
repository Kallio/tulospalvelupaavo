const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/kilpailuanalyysi.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl(tag) {
  const q = {};
  const el = {
    tag, value: '', textContent: '', className: '', placeholder: '', style: {},
    children: [], checked: false, disabled: false, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, remove() {}, removeChild() {}, select() {}, click() {},
    querySelector(sel) { if (!q[sel]) q[sel] = makeEl(sel); return q[sel]; },
    querySelectorAll() { return []; },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._html || ''; },
    set(v) { this._html = v; if (v === '') this.children = []; },
  });
  return el;
}
const store = {};
function getEl(id) { if (!store[id]) store[id] = makeEl('#' + id); return store[id]; }
const body = makeEl('body');
const created = [];
global.document = {
  getElementById: getEl,
  querySelectorAll() { return []; },
  createElement: tag => { const el = makeEl(tag); created.push(el); return el; },
  body,
  addEventListener() {},
};
global.window = { history: { replaceState() {} }, location: { search: '' }, addEventListener() {}, print() {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL() {} };
global.Blob = function () {};

// ── fixtures ──────────────────────────────────────────────────────────
// Interval starts at 08:00 + 2 min per runner, UTC timestamps.
const indEvent = {
  id: 'e-ind-1', name: 'Testirastit 2026', begin: '2026-03-21T08:00:00.000Z',
  address: 'Testikatu 1', raceType: 'Individual', eventKind: 'Event', sport: 'OL',
  organisation: { id: 'o1', name: 'Test Club' },
  courseClasses: [
    { id: 'ca', name: 'A', type: 'Class', courses: [{ id: 'co1', legs: 1 }] },
    { id: 'cb', name: 'B', type: 'Class', courses: [{ id: 'co2', legs: 1 }] },
  ],
  courses: [
    { id: 'co1', name: 'A', distance: 3325, controls: [] },
    { id: 'co2', name: 'B', distance: 2500, controls: [] },
  ],
  results: [
    { id: 'r1', classId: 'ca', courseId: 'co1', bibNumber: 1, name: 'Matti Meikäläinen', club: 'Club A', status: 'Ok', time: 600, position: 1, startTime: '2026-03-21T08:00:00.000Z' },
    { id: 'r2', classId: 'ca', courseId: 'co1', bibNumber: 2, name: 'Liisa Virtanen', club: 'Club A', status: 'Ok', time: 700, position: 2, startTime: '2026-03-21T08:02:00.000Z' },
    { id: 'r3', classId: 'ca', courseId: 'co1', bibNumber: 3, name: 'Pekka Pouta', club: 'Club B', status: 'Ok', time: 800, position: 3, startTime: '2026-03-21T08:04:00.000Z' },
    { id: 'r4', classId: 'ca', courseId: 'co1', bibNumber: 4, name: 'Anna Kivi', club: 'Club B', status: 'Ok', time: 900, position: 4, startTime: '2026-03-21T08:06:00.000Z' },
    { id: 'r5', classId: 'ca', courseId: 'co1', bibNumber: 5, name: 'Juha Nurmi', club: 'Club C', status: 'Ok', time: 1000, position: 5, startTime: '2026-03-21T08:08:00.000Z' },
    { id: 'r6', classId: 'ca', courseId: 'co1', bibNumber: 6, name: 'Kaisa Lampi', club: 'Club C', status: 'Ok', time: 1100, position: 6, startTime: '2026-03-21T08:10:00.000Z' },
    { id: 'r7', classId: 'ca', courseId: 'co1', bibNumber: 7, name: 'Olli Joki', club: 'Club D', status: 'Ok', time: 1200, position: 7, startTime: '2026-03-21T08:12:00.000Z' },
    { id: 'r8', classId: 'ca', courseId: 'co1', bibNumber: 8, name: 'Sanna Koski', club: 'Club D', status: 'Ok', time: 1300, position: 8, startTime: '2026-03-21T08:14:00.000Z' },
    { id: 'r9', classId: 'ca', courseId: 'co1', bibNumber: 9, name: 'Teemu Mäki', club: 'Club E', status: 'Ok', time: 1400, position: 9, startTime: '2026-03-21T08:16:00.000Z' },
    { id: 'r10', classId: 'ca', courseId: 'co1', bibNumber: 10, name: 'Iida Kallio', club: 'Club E', status: 'Ok', time: 1500, position: 10, startTime: '2026-03-21T08:18:00.000Z' },
    { id: 'r11', classId: 'ca', courseId: 'co1', bibNumber: 11, name: 'Mikko Haapala', club: 'Club F', status: 'DNF', time: 0, startTime: '2026-03-21T08:20:00.000Z' },
    { id: 'r12', classId: 'ca', courseId: 'co1', bibNumber: 12, name: 'Pia Niemi', club: 'Club F', status: 'MP', time: 0, startTime: '2026-03-21T08:22:00.000Z' },
    { id: 'r13', classId: 'ca', courseId: 'co1', bibNumber: 13, name: 'Ville Aho', club: 'Club G', status: 'DNS', time: 0 },
    { id: 'r14', classId: 'cb', courseId: 'co2', bibNumber: 14, name: 'Arto Lehto', club: 'Club H', status: 'Ok', time: 2000, position: 1, startTime: '2026-03-21T08:24:00.000Z' },
    { id: 'r15', classId: 'cb', courseId: 'co2', bibNumber: 15, name: 'Riina Salo', club: 'Club H', status: 'No time', time: 0, startTime: '2026-03-21T08:26:00.000Z' },
    { id: 'r16', classId: 'cb', courseId: 'co2', bibNumber: 16, name: 'Team Only', club: 'Club X', status: 'Ok', time: 500, position: 99, resultType: 'Team' },
  ],
};

const relayEvent = {
  id: 'e-rel-1', name: 'Testiviesti', raceType: 'Relay', eventKind: 'Event',
  courseClasses: [
    { id: 'cls1', name: 'Kilpasarja', courses: [{ id: 'rc1', legs: 1 }, { id: 'rc2', legs: 1 }] },
    { id: 'cls2', name: 'Avoin', courses: [{ id: 'rc1', legs: 1 }, { id: 'rc2', legs: 1 }] },
  ],
  courses: [
    { id: 'rc1', name: 'Osuus 1', distance: 3000, controls: [] },
    { id: 'rc2', name: 'Osuus 2', distance: 3000, controls: [] },
  ],
  results: [
    { id: 't1', resultType: 'Team', bibNumber: 1, name: 'Team Alpha', club: 'Club X', classId: 'cls1', status: 'Ok', time: 1300, position: 1, startTime: '2026-03-21T08:00:00.000Z' },
    { id: 't2', resultType: 'Team', bibNumber: 2, name: 'Team Beta', club: 'Club Y', classId: 'cls1', status: 'Dnf', time: 800, position: 2, startTime: '2026-03-21T08:00:00.000Z' },
    { id: 't3', resultType: 'Team', bibNumber: 10, name: 'Team Gamma', club: 'Club Z', classId: 'cls2', status: 'Ok', time: 1500, position: 1, startTime: '2026-03-21T08:00:00.000Z' },
    { id: 'r1', resultType: 'Individual', parentId: 't1', bibNumber: 1, leg: 1, courseId: 'rc1', classId: 'cls1', name: 'A1', club: 'Club X', status: 'Ok', time: 600 },
    { id: 'r2', resultType: 'Individual', parentId: 't1', bibNumber: 1, leg: 2, courseId: 'rc2', classId: 'cls1', name: 'A2', club: 'Club X', status: 'Ok', time: 700 },
    { id: 'r3', resultType: 'Individual', parentId: 't2', bibNumber: 2, leg: 1, courseId: 'rc1', classId: 'cls1', name: 'B1', club: 'Club Y', status: 'Ok', time: 800 },
    { id: 'r4', resultType: 'Individual', parentId: 't2', bibNumber: 2, leg: 2, courseId: 'rc2', classId: 'cls1', name: 'B2', club: 'Club Y', status: 'Dnf', time: 500 },
    { id: 'r5', resultType: 'Individual', parentId: 't3', bibNumber: 10, leg: 1, courseId: 'rc1', classId: 'cls2', name: 'C1', club: 'Club Z', status: 'Ok', time: 650 },
  ],
};

const relayLegacyEvent = {
  id: 'e-rel-leg', name: 'Legacy viesti', raceType: 'Relay', eventKind: 'Event',
  courseClasses: [], courses: [],
  results: [
    { id: 'r1', bibNumber: 1, leg: 1, classId: 'cl1', name: 'A1', club: 'Team Old', status: 'Ok', time: 600 },
    { id: 'r2', bibNumber: 1, leg: 2, classId: 'cl2', name: 'A2', club: 'Team Old', status: 'Ok', time: 700 },
  ],
};

// Relay with a mass re-start: teams 6-10 sent out together at 08:12 although
// their leg-1 runner is still in the forest (finishes only at 08:20).
const relayRestartEvent = {
  id: 'e-rel-re', name: 'Restart viesti', raceType: 'Relay', eventKind: 'Event',
  courseClasses: [
    { id: 'cls1', name: 'Kilpasarja', courses: [{ id: 'rc1', legs: 1 }, { id: 'rc2', legs: 1 }] },
  ],
  courses: [
    { id: 'rc1', name: 'Osuus 1', distance: 3000, controls: [] },
    { id: 'rc2', name: 'Osuus 2', distance: 3000, controls: [] },
  ],
  results: (function () {
    const out = [];
    const natFin = [5, 6, 7, 8, 9];
    for (let i = 1; i <= 10; i++) {
      const pid = 't' + i;
      out.push({ id: pid, resultType: 'Team', bibNumber: i, name: 'Team ' + i, club: 'C', classId: 'cls1', status: 'Ok', time: 300, startTime: '2026-03-21T08:00:00.000Z' });
      const fin = i <= 5 ? '0' + natFin[i - 1] : '20';
      out.push({ id: pid + 'l1', resultType: 'Individual', parentId: pid, bibNumber: i, leg: 1, courseId: 'rc1', classId: 'cls1', name: 'L1-' + i, status: 'Ok', time: 300, startTime: '2026-03-21T08:00:00.000Z', finishTime: '2026-03-21T08:' + fin + ':00.000Z' });
      const l2start = i <= 5 ? '08:' + natFin[i - 1] + ':00.000Z' : '08:12:00.000Z';
      out.push({ id: pid + 'l2', resultType: 'Individual', parentId: pid, bibNumber: i, leg: 2, courseId: 'rc2', classId: 'cls1', name: 'L2-' + i, status: 'Ok', time: 300, startTime: '2026-03-21T' + l2start, finishTime: '2026-03-21T08:17:00.000Z' });
    }
    return out;
  })(),
};

// Relay with three known first-leg mass-start groups (3 teams at 08:00,
// 08:15 and 08:30 each), like classes starting in waves.
const relayGroupedEvent = {
  id: 'e-rel-g', name: 'Grouped viesti', raceType: 'Relay', eventKind: 'Event',
  courseClasses: [], courses: [], results: [],
};
[0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(i => {
  const start = i < 3 ? '08:00' : i < 6 ? '08:15' : '08:30';
  const s = new Date('2026-03-21T' + start + ':00.000Z');
  const f = new Date(s.getTime() + 300000);
  const pid = 'gt' + (i + 1);
  relayGroupedEvent.results.push({ id: pid, resultType: 'Team', bibNumber: i + 1, name: 'T' + (i + 1), classId: 'c', status: 'Ok', time: 300, startTime: s.toISOString() });
  relayGroupedEvent.results.push({ id: pid + 'l1', resultType: 'Individual', parentId: pid, bibNumber: i + 1, leg: 1, classId: 'c', name: 'L' + (i + 1), status: 'Ok', time: 300, startTime: s.toISOString(), finishTime: f.toISOString() });
});

const stage1 = {
  id: 's1', name: 'Päivä 1', begin: '2026-03-21T08:00:00.000Z', raceType: 'Individual', eventKind: 'Event',
  courseClasses: [{ id: 'sa', name: 'A', courses: [{ id: 'sco1', legs: 1 }] }],
  courses: [{ id: 'sco1', name: 'A', distance: 3000, controls: [] }],
  results: [
    { id: 's1r1', classId: 'sa', courseId: 'sco1', bibNumber: 1, name: 'X', status: 'Ok', time: 300, startTime: '2026-03-21T08:00:00.000Z' },
    { id: 's1r2', classId: 'sa', courseId: 'sco1', bibNumber: 2, name: 'Y', status: 'Ok', time: 360, startTime: '2026-03-21T08:02:00.000Z' },
    { id: 's1r3', classId: 'sa', courseId: 'sco1', bibNumber: 3, name: 'Z', status: 'DNS', time: 0 },
  ],
};
const stage2 = {
  id: 's2', name: 'Päivä 2', begin: '2026-03-22T08:00:00.000Z', raceType: 'Individual', eventKind: 'Event',
  courseClasses: [{ id: 'sa', name: 'A', courses: [{ id: 'sco1', legs: 1 }] }],
  courses: [{ id: 'sco1', name: 'A', distance: 3000, controls: [] }],
  results: [
    { id: 's2r1', classId: 'sa', courseId: 'sco1', bibNumber: 1, name: 'X', status: 'Ok', time: 320, startTime: '2026-03-22T08:00:00.000Z' },
    { id: 's2r2', classId: 'sa', courseId: 'sco1', bibNumber: 2, name: 'Y', status: 'DNF', time: 200, startTime: '2026-03-22T08:02:00.000Z' },
    { id: 's2r3', classId: 'sa', courseId: 'sco1', bibNumber: 3, name: 'Z', status: 'Ok', time: 380, startTime: '2026-03-22T08:04:00.000Z' },
  ],
};
const multiEvent = {
  id: 'e-multi', name: 'Testikolmas', raceType: 'Individual', eventKind: 'Multistage event',
  events: [{ id: 's1' }, { id: 's2' }], results: [], courseClasses: [], courses: [],
};

// ── mock fetch ────────────────────────────────────────────────────────
global.fetch = (url) => {
  if (url.includes('/trpc/eventsTrpcRouter.getEvent')) {
    let slug = '';
    try {
      const m = url.match(/input=([^&]*)/);
      if (m) slug = JSON.parse(decodeURIComponent(m[1]))['0'] || '';
    } catch (e) {}
    const data = slug === 'e-multi' ? multiEvent : { id: 'e-ind-1', name: 'via slug' };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ result: { data } }]) });
  }
  if (url.includes('/api/events/')) {
    const id = url.split('/api/events/')[1];
    let data = indEvent;
    if (id === 's1') data = stage1;
    else if (id === 's2') data = stage2;
    else if (id === 'e-multi') data = multiEvent;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
  }
  return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
};

let threw = null;
try {
  eval(code + `
    global.__p = {
      classifyStatus, parseTS, fmtTime, fmtClock, fmtMin,
      extractSlug, fetchEvent, fetchEventByUUID, isMultistageEvent,
      eventFlow, classPaces, classFlowSeries, finishPeak, stepEvents,
      legendInner, axisToggle, effectiveClasses, combineSelected, clearCombines, rebuildLegendItems,
      buildCSV, toCSV, addFlowRows, analyze, render, setLang, T,
      runnerRows, statusConst: STATUS_OK, CLASS_PALETTE, paceSection, paintPace, drawFlowChart,
    };
    global.__state = {
      event: () => state.event,
      stageEvents: () => state.stageEvents,
      lang: () => lang,
      setLang: l => setLang(l),
      setEvent: e => { state.event = e; },
    };
  `);
} catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }

let pass = 0, fail = 0;
const assert = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
};

const P = global.__p;
const S = global.__state;
const approx = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-6);

// ── classifyStatus ──
assert('status: Ok → OK', P.classifyStatus('Ok') === 'OK');
assert('status: ok lower → OK', P.classifyStatus('ok') === 'OK');
assert('status: MP', P.classifyStatus('MP') === 'MP');
assert('status: DNF', P.classifyStatus('DNF') === 'DNF');
assert('status: DNS', P.classifyStatus('DNS') === 'DNS');
assert('status: Dsq → DSQ', P.classifyStatus('Dsq') === 'DSQ');
assert('status: No time → OTHER', P.classifyStatus('No time') === 'OTHER');
assert('status: empty → empty', P.classifyStatus('') === '' && P.classifyStatus(undefined) === '');

// ── fmtTime / fmtMin / fmtClock ──
assert('time: 2033 → 33:53', P.fmtTime(2033) === '33:53');
assert('time: 3661 → 1:01:01', P.fmtTime(3661) === '1:01:01');
assert('time: 60 → 1:00', P.fmtTime(60) === '1:00');
assert('time: null → dash', P.fmtTime(null) === '—');
assert('min: 0 → 0:00', P.fmtMin(0) === '0:00');
assert('min: 42.5 → 42:30', P.fmtMin(42.5) === '42:30');
assert('min: 61.2 → 1:01:12', P.fmtMin(61.2) === '1:01:12');

// ── parseTS ──
const t0 = P.parseTS('2026-03-21T08:00:00.000Z');
assert('parseTS: valid', t0 != null && isFinite(t0));
assert('parseTS: null on empty', P.parseTS(null) === null && P.parseTS('') === null);

// ── eventFlow (individual) ──
const flow = P.eventFlow(indEvent);
assert('flow: starters 14', flow.starters === 14, String(flow.starters));
assert('flow: finishers 11', flow.finishers === 11, String(flow.finishers));
assert('flow: dnf 1, dns 1', flow.dnf === 1 && flow.dns === 1);
assert('flow: into forest 26 min', (flow.lastStart - flow.firstStart) / 60000 === 26);
assert('flow: first result 10 min', (flow.firstFinish - flow.firstStart) / 60000 === 10);
assert('flow: results wait 47:20', (flow.lastFinish - flow.firstFinish) / 1000 === 2840);
assert('flow: total 57:20', (flow.lastFinish - flow.firstStart) / 1000 === 3440);
assert('flow: 14 start minutes, 11 finish minutes', flow.startMinutes.length === 14 && flow.finishMinutes.length === 11);
assert('flow: first start minute 0', flow.startMinutes[0] === 0);

// ── eventFlow (relay: every leg punch counts) ──
const rflow = P.eventFlow(relayEvent);
assert('relay flow: 5 leg starts (3 teams, 2 legs)', rflow.starters === 5, String(rflow.starters));
assert('relay flow: 4 leg finishes, 1 dnf', rflow.finishers === 4 && rflow.dnf === 1, String(rflow.finishers) + '/' + rflow.dnf);
assert('relay flow: into forest 13:20', (rflow.lastStart - rflow.firstStart) / 1000 === 800);
assert('relay flow: wait 11:40', (rflow.lastFinish - rflow.firstFinish) / 1000 === 700);
assert('relay flow: last leg finish = team total', (rflow.lastFinish - rflow.firstStart) / 1000 === 1300);
assert('relay flow: startByClass covers cls1 4 + cls2 1', (rflow.startByClass.cls1 || []).length === 4 && (rflow.startByClass.cls2 || []).length === 1);

// ── eventFlow (no timestamps) ──
const nflow = P.eventFlow(relayLegacyEvent);
assert('flow: no timestamps → 0 starters', nflow.starters === 0 && nflow.finishers === 0);

// ── eventFlow (finishTime-only shape) ──
const ftOnly = JSON.parse(JSON.stringify(indEvent));
ftOnly.results = ftOnly.results.map(r => {
  const start = P.parseTS(r.startTime);
  if (start == null) return r;
  const copy = Object.assign({}, r);
  delete copy.startTime;
  copy.finishTime = new Date(start + (r.time > 0 ? r.time : 0) * 1000).toISOString();
  return copy;
});
const ftFlow = P.eventFlow(ftOnly);
assert('flow: finishTime-only derives starts', ftFlow.starters === 11, String(ftFlow.starters));
assert('flow: finishTime-only matches metrics', ftFlow.firstStart === flow.firstStart && ftFlow.lastFinish === flow.lastFinish);

// ── relay markers (mass start + first exchange) ──
const rmf = P.eventFlow(relayEvent);
assert('relay markers: mass start at 0', rmf.relayMarkers.some(m => m.kind === 'mass' && m.at === 0), JSON.stringify(rmf.relayMarkers));
assert('relay markers: first exchange at 10 min', rmf.relayMarkers.some(m => m.kind === 'exch' && Math.abs(m.at - 10) < 0.01), JSON.stringify(rmf.relayMarkers));
assert('relay markers: first exchange timestamp', rmf.firstExchange === Date.parse('2026-03-21T08:10:00.000Z'), String(rmf.firstExchange));
assert('relay markers: no first exchange for individual', P.eventFlow(indEvent).firstExchange === null);
assert('relay markers: no first exchange for legacy relay', P.eventFlow(relayLegacyEvent).firstExchange === null);
assert('relay markers: no markers for individual', P.eventFlow(indEvent).relayMarkers.length === 0);
assert('relay markers: none for legacy relay', P.eventFlow(relayLegacyEvent).relayMarkers.length === 0);
const fctx = new Proxy({}, { get: (t, k) => { if (k === 'measureText') return () => ({ width: 60 }); return () => {}; }, set: () => true });
let drewM = true;
try { P.drawFlowChart(fctx, 600, 280, { starts: [0, 0, 10], classes: [{ className: 'A', mins: [10], color: '#000' }], peak: null, markers: [{ kind: 'mass', at: 0, key: 'mMass' }, { kind: 'exch', at: 10, key: 'mExch' }], xMode: 'rel' }); } catch (e) { drewM = false; }
assert('relay markers: chart draws markers without error', drewM);

// ── mass re-start detection ──
const rrf = P.eventFlow(relayRestartEvent);
assert('restart: no restart marker on normal relay', !rmf.relayMarkers.some(m => m.kind === 'restart'));
assert('restart: mass+exch+restart markers', rrf.relayMarkers.map(m => m.kind + '@' + Math.round(m.at * 100) / 100).join(',') === 'mass@0,exch@5,restart@12', JSON.stringify(rrf.relayMarkers));

// ── first-leg mass-start groups ──
const rgf = P.eventFlow(relayGroupedEvent);
assert('groups: three known first-leg mass starts', rgf.relayMarkers.filter(m => m.kind === 'mass').map(m => Math.round(m.at)).join(',') === '0,15,30', JSON.stringify(rgf.relayMarkers));
assert('groups: first exchange also marked', rgf.relayMarkers.some(m => m.kind === 'exch' && Math.abs(m.at - 5) < 0.01));
assert('groups: mass starts still found for single group', rmf.relayMarkers.filter(m => m.kind === 'mass').map(m => Math.round(m.at)).join(',') === '0');

// ── classPaces (avg min/km per class, anonymized) ──
const paces = P.classPaces(relayEvent);
assert('paces: 2 classes, fastest first', paces.length === 2 && paces[0].className === 'Avoin' && paces[1].className === 'Kilpasarja', JSON.stringify(paces));
assert('paces: Avoin avg 3:37 (217 s/km)', paces[0].paceSec === 217 && paces[0].runners === 1, JSON.stringify(paces[0]));
assert('paces: Kilpasarja avg 3:53 (233 s/km)', paces[1].paceSec === 233 && paces[1].runners === 3, JSON.stringify(paces[1]));
assert('paces: DNF leg excluded', paces[1].runners === 3);
assert('paces: legacy relay has no distance data', P.classPaces(relayLegacyEvent).length === 0);
const indPaces = P.classPaces(indEvent);
assert('paces: individual per class', indPaces.length === 2 && indPaces[0].className === 'A' && indPaces[1].className === 'B', JSON.stringify(indPaces));
assert('paces: individual A avg 316 s/km (10 runners)', indPaces[0].paceSec === 316 && indPaces[0].runners === 10, JSON.stringify(indPaces[0]));
assert('paces: individual B avg 800 s/km', indPaces[1].paceSec === 800 && indPaces[1].runners === 1, JSON.stringify(indPaces[1]));
const ps = P.paceSection(relayEvent);
assert('paces: section renders canvas chart, no table', ps.includes('Keskivauhti sarjoittain') && ps.includes('data-chart-id') && ps.includes('chartcap') && !ps.includes('<table'));
assert('paces: no runner counts in section', !ps.includes('Juoksijat') && !ps.includes('Runners'));
assert('paces: empty section for legacy relay', P.paceSection(relayLegacyEvent) === '');
assert('paces: individual section renders too', P.paceSection(indEvent).includes('data-chart-id'));
const pctx = new Proxy({}, { get: (t, k) => { if (k === 'measureText') return () => ({ width: 42 }); return () => {}; }, set: () => true });
let drew = true;
try { P.paintPace(pctx, 600, 100, { paces: [{ className: 'Avoin', paceSec: 217 }, { className: 'Kilpasarja', paceSec: 233 }] }); } catch (e) { drew = false; }
assert('paces: chart draws without error', drew);

// ── classFlowSeries (per-class finish curves) ──
const cls = P.classFlowSeries(indEvent);
assert('class series: 2 classes, largest first', cls.length === 2 && cls[0].className === 'A' && cls[1].className === 'B');
assert('class series: A 10 finishers, B 1', cls[0].mins.length === 10 && cls[1].mins.length === 1);
assert('class series: minutes sorted', cls[0].mins.every((m, i) => i === 0 || m >= cls[0].mins[i - 1]));
assert('class series: A first finish 10:00', cls[0].mins[0] === 10);
assert('class series: B finishes at 57:20', Math.round(cls[1].mins[0] * 60) === 3440);
assert('class series: distinct colors', cls[0].color !== cls[1].color);
assert('class series: relay uses Team rows by class', P.classFlowSeries(relayEvent).map(c => c.className).join(',') === 'Kilpasarja,Avoin');
const many = Object.assign({}, indEvent, {
  courseClasses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({ id: 'c' + i, name: 'S' + i })),
  results: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({
    id: 'm' + i, classId: 'c' + i, bibNumber: i, name: 'N' + i, club: 'X',
    status: 'Ok', time: 100 + i, startTime: '2026-03-21T08:00:00.000Z',
  })),
});
const manyCls = P.classFlowSeries(many);
assert('class series: all classes shown, no Others', manyCls.length === 10 && !manyCls.some(c => c.className === 'Muut'), String(manyCls.length));
assert('class series: total finishers preserved', manyCls.reduce((s, c) => s + c.mins.length, 0) === 10);
assert('class series: Tableau 10 palette used', manyCls.map(c => c.color).join('|') === P.CLASS_PALETTE.join('|'));
assert('class series: palette has 10 distinct professional colors', new Set(P.CLASS_PALETTE).size === 10 && P.CLASS_PALETTE.length === 10);
const pal11 = P.classFlowSeries(Object.assign({}, many, {
  courseClasses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => ({ id: 'c' + i, name: 'S' + i })),
  results: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => ({
    id: 'm' + i, classId: 'c' + i, bibNumber: i, name: 'N' + i, club: 'X',
    status: 'Ok', time: 100 + i, startTime: '2026-03-21T08:00:00.000Z',
  })),
}));
assert('class series: colors cycle past palette length', pal11[0].color === pal11[10].color && pal11[1].color !== pal11[2].color);

// ── finishPeak (steepest finish climb) ──
assert('peak: window with most finishers', JSON.stringify(P.finishPeak([10, 11, 12, 13, 21, 30, 31, 32], 5)) === JSON.stringify({ from: 10, to: 15, count: 4 }));
assert('peak: empty → null', P.finishPeak([]) === null && P.finishPeak(null) === null);
const pk = P.finishPeak(flow.finishMinutes);
assert('peak: individual event window', pk.from === 10 && pk.to === 15 && pk.count === 2);

// ── stepEvents (stacking layer edges) ──
const se = P.stepEvents([2, 2, 5]);
assert('stepEvents: cumulative jumps', JSON.stringify(se) === JSON.stringify([
  { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 },
  { x: 5, y: 2 }, { x: 5, y: 3 }, { x: Infinity, y: 3 },
]));
assert('stepEvents: empty ends at 0', P.stepEvents([])[P.stepEvents([]).length - 1].y === 0);
assert('stepEvents: merged total height', (() => {
  const top = P.stepEvents([2, 5].concat([3]));
  return top[top.length - 1].y === 3;
})());

// ── isMultistageEvent ──
assert('multistage detect: eventKind', P.isMultistageEvent(multiEvent) === true);
assert('multistage detect: single event false', P.isMultistageEvent(indEvent) === false);

// ── extractSlug ──
assert('slug: full URL', P.extractSlug('https://navisport.com/events/hyvinkaan-talvirastit-2026') === 'hyvinkaan-talvirastit-2026');
assert('slug: /tapahtumat/ URL', P.extractSlug('navisport.com/tapahtumat/halikko-viesti-2026') === 'halikko-viesti-2026');
assert('slug: bare', P.extractSlug('stadin-sprintticup-2026') === 'stadin-sprintticup-2026');
assert('slug: UUID kept', P.extractSlug('9033345a-2223-482a-b510-9c03dbdd88c7') === '9033345a-2223-482a-b510-9c03dbdd88c7');
assert('slug: UUID from URL path', P.extractSlug('navisport.com/events/9033345a-2223-482a-b510-9c03dbdd88c7') === '9033345a-2223-482a-b510-9c03dbdd88c7');
assert('slug: junk → empty', P.extractSlug('!! not a slug !!') === '');
assert('slug: empty', P.extractSlug('  ') === '');

// ── CSV ──
const rows = [];
P.addFlowRows(rows, indEvent);
assert('csv: starters row', rows[0][0] === 'Lähteneet' && rows[0][1] === 14);
assert('csv: into forest seconds', rows[3][0] === 'Kaikki metsässä' && rows[3][1] === 1560, String(rows[3][1]));
assert('csv: results wait seconds', rows[5][0] === 'Tulosten odotus' && rows[5][1] === 2840);
assert('csv: total seconds', rows[6][0] === 'Koko kisa' && rows[6][1] === 3440);
assert('csv: peak window row', rows[7][0] === 'Suurin maaliruuhka' && rows[7][2] === 2, JSON.stringify(rows[7]));
assert('csv: class block header', rows[9][0] === 'Sarjat maaliin');
assert('csv: class A row', rows[11][0] === 'A' && rows[11][1] === 10 && rows[11][2] === '10:00' && rows[11][3] === '43:00', JSON.stringify(rows[11]));
assert('csv: class B row', rows[12][0] === 'B' && rows[12][1] === 1 && rows[12][3] === '57:20', JSON.stringify(rows[12]));
const csvStr = P.toCSV([['a;b', 'c'], ['1', '2']]);
assert('csv: quoting', csvStr === '"a;b";c\r\n1;2');
assert('csv: semicolon delimiter', P.toCSV([['x', 'y']]) === 'x;y');
S.setEvent(indEvent);
const indCsv = P.buildCSV();
assert('csv: individual includes pace block', indCsv.includes('Keskivauhti sarjoittain') && indCsv.includes('Sarja;min/km;Juoksijat') && indCsv.includes('A;316;10'), indCsv.split('\n').slice(-5).join(' | '));
S.setEvent(relayEvent);
const relCsv = P.buildCSV();
assert('csv: relay includes pace block', relCsv.includes('Keskivauhti sarjoittain') && relCsv.includes('Avoin;217;1') && relCsv.includes('Kilpasarja;233;3'));
assert('csv: relay first exchange row', relCsv.includes('Ensimmäinen vaihto'));

// ── legend / axis toggle ──
const lcfg = {
  id: 'ch1', legendPageSize: 8, xMode: 'rel',
  legendItems: [{ key: 'started', name: 'Lähteneet', color: '#2e5a8a' }],
};
assert('legend: clickable buttons with data-idx', P.legendInner(lcfg, 0).includes('data-idx="0"') && P.legendInner(lcfg, 0).includes('data-chart="ch1"'));
assert('legend: no pager for few items', !P.legendInner(lcfg, 0).includes('lgpager'));
const lcfgMany = Object.assign({}, lcfg, { legendItems: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({ key: 'c' + i, name: 'S' + i, color: '#000' })) });
assert('legend: pager when many classes', P.legendInner(lcfgMany, 0).includes('lgpager') && P.legendInner(lcfgMany, 0).includes('1/2'));
assert('legend: page 2 shows later classes', P.legendInner(lcfgMany, 1).includes('>S9<') && !P.legendInner(lcfgMany, 1).includes('>S1<'));
assert('legend: off class for hidden', P.legendInner(Object.assign({}, lcfgMany, { hiddenIds: ['c3'] }), 0).match(/class="lg off"[^>]*data-idx="2"/) !== null);
assert('legend: class rows have checkbox, started does not', P.legendInner(lcfgMany, 0).includes('<input type="checkbox"') && !P.legendInner(lcfg, 0).includes('<input'));
assert('legend: combine disabled until 2 selected', P.legendInner(lcfgMany, 0).includes('data-combine="1" disabled') && P.legendInner(Object.assign({}, lcfgMany, { selKeys: ['c1', 'c2'] }), 0).includes('data-combine="1"'));
const ax = P.axisToggle({ id: 'ch1', xMode: 'rel' });
assert('axis: rel+clock buttons', ax.includes('data-axis="rel"') && ax.includes('data-axis="clock"'));
assert('axis: buttons carry data-chart', ax.includes('data-chart="ch1"'));
assert('axis: rel active by default', ax.includes('data-axis="rel" class="on"'));
assert('axis: labels from lang', ax.includes('Kesto') && ax.includes('Kello'));
assert('axis: clock active when set', P.axisToggle({ id: 'ch1', xMode: 'clock' }).includes('data-axis="clock" class="on"'));

// ── combine / effective classes ──
const ccfg = {
  id: 'chx', xMode: 'rel', hiddenIds: [], selKeys: [],
  startByClass: { h10: [0, 5], d10: [2], h21: [3] },
  classes: [
    { id: 'h10', className: 'H10', color: '#e6194b', mins: [10, 11] },
    { id: 'd10', className: 'D10', color: '#3cb44b', mins: [12] },
    { id: 'h21', className: 'H21', color: '#4363d8', mins: [20] },
  ],
};
P.rebuildLegendItems(ccfg);
assert('combine: legend has started+3', ccfg.legendItems.length === 4);
ccfg.selKeys = ['h10', 'd10'];
P.combineSelected(ccfg);
assert('combine: merged name H10/D10', ccfg.legendItems.some(it => it.name === 'H10/D10' && it.combined), JSON.stringify(ccfg.legendItems.map(i => i.name)));
assert('combine: members removed', ccfg.legendItems.filter(it => it.name === 'H10' || it.name === 'D10').length === 0);
assert('combine: selection cleared', (ccfg.selKeys || []).length === 0);
const eff = P.effectiveClasses(ccfg);
const comb = eff.find(e => e.id === ccfg.combines[0].id);
assert('combine: aggregate mins merged', comb.mins.join(',') === '10,11,12', comb.mins.join(','));
assert('combine: aggregate starts merged', comb.starts.join(',') === '0,2,5', comb.starts.join(','));
assert('combine: h21 stays separate', eff.some(e => e.id === 'h21'));
assert('combine: clear button shown while combined', P.legendInner(ccfg, 0).includes('data-clear="1"'));
P.clearCombines(ccfg);
assert('combine: clear restores all classes', ccfg.legendItems.map(i => i.name).join(',') === 'Lähteneet,H10,D10,H21', ccfg.legendItems.map(i => i.name).join(','));
assert('combine: clear empties combines and selection', (ccfg.combines || []).length === 0 && (ccfg.selKeys || []).length === 0);
assert('combine: no clear button when nothing combined', !P.legendInner(ccfg, 0).includes('data-clear='));
const eff2 = P.effectiveClasses({ startByClass: { h10: [0] }, classes: [{ id: 'h10', className: 'H10', color: '#000', mins: [5] }] });
assert('effective: plain class carries starts', eff2[0].starts.join(',') === '0');

// ── language ──
assert('lang: default fi', S.lang() === 'fi');
assert('lang: T fi', P.T('btnAnalyze') === 'Analysoi');
P.setLang('en');
assert('lang: T en', P.T('btnAnalyze') === 'Analyze');
assert('lang: langBtn label EN→FI', document.getElementById('langBtn').textContent === 'FI');
P.setLang('fi');
assert('lang: back to fi', S.lang() === 'fi' && P.T('secFlow') === 'Kisapäivän kulku');

// ── fetch flow: slug → tRPC → REST → render ──
(async () => {
  await P.analyze('hyvinkaan-talvirastit-2026');
  assert('flow: event loaded', S.event() && S.event().name === 'Testirastit 2026');
  const out = document.getElementById('output').innerHTML;
  assert('flow: rendered header', out.includes('Testirastit 2026'));
  assert('flow: flow section', out.includes('Kisapäivän kulku'));
  assert('flow: into forest card', out.includes('Kaikki metsässä'));
  assert('flow: peak card before flow', out.includes('Maaliruuhkan huippu'));
  assert('flow: combine button present', out.includes('Yhdistä valitut'));
  assert('flow: single flow canvas only', (out.match(/<canvas/g) || []).length === 2, String((out.match(/<canvas/g) || []).length));
  assert('flow: individual pace section present', out.includes('Keskivauhti sarjoittain'));
  assert('flow: no distribution histograms', !out.includes('Lähtöjen jakauma') && !out.includes('Maalien jakauma'));
  assert('flow: per-class colors in legend', out.includes('background:#4e79a7') && out.includes('background:#f28e2c'));
  assert('flow: legend started label', out.includes('>Lähteneet<'));
  assert('flow: clickable legend buttons', out.includes('data-idx=') && out.includes('class="lg"'));
  assert('flow: axis toggle present', out.includes('data-axis="rel"') && out.includes('data-axis="clock"'));
  assert('flow: tooltip host present', out.includes('data-tip-for') && out.includes('chartwrap'));
  assert('flow: no personal names', !out.includes('Matti Meikäläinen') && !out.includes('Liisa Virtanen'));

  // UUID path
  await P.analyze('9033345a-2223-482a-b510-9c03dbdd88c7');
  assert('flow: uuid path loads', S.event() && S.event().name === 'Testirastit 2026');

  // relay render
  S.setEvent(relayEvent);
  P.render();
  const rOut = document.getElementById('output').innerHTML;
  assert('flow: relay pace section', rOut.includes('Keskivauhti sarjoittain') && rOut.includes('data-chart-id') && rOut.includes('chartcap'));
  assert('flow: relay first exchange card', rOut.includes('Ensimmäinen vaihto'));
  assert('flow: relay no runner names', !rOut.includes('A1') && !rOut.includes('Team Alpha'));
  assert('flow: relay flow cards', rOut.includes('Kaikki metsässä'));
  assert('flow: relay class colors', rOut.includes('Kilpasarja') && rOut.includes('Avoin'));

  // many-class legend pager
  S.setEvent(many);
  P.render();
  const manyOut = document.getElementById('output').innerHTML;
  assert('flow: pager shown for 10 classes', manyOut.includes('lgpager') && manyOut.includes('1/2'));
  assert('flow: page 1 truncated to 8 entries', manyOut.includes('>S7<') && !manyOut.includes('>S8<'));

  // legacy relay render (no Team rows, no timestamps)
  S.setEvent(relayLegacyEvent);
  P.render();
  const lOut = document.getElementById('output').innerHTML;
  assert('flow: legacy relay renders', lOut.includes('Aikaleimoja ei ole saatavilla') && !lOut.includes('Keskivauhti sarjoittain'));

  // multistage flow
  await P.analyze('e-multi'); // slug → tRPC returns multiEvent; stage fetches map s1/s2
  assert('flow: multistage stage load', S.stageEvents().length === 2, String(S.stageEvents().length));
  const mOut = document.getElementById('output').innerHTML;
  assert('flow: multistage rendered', mOut.includes('Päivä 1') && mOut.includes('Päivä 2'));
  assert('flow: multistage flow+pace canvas per stage', (mOut.match(/<canvas/g) || []).length === 4, String((mOut.match(/<canvas/g) || []).length));

  console.log('passed ' + pass + ' failed ' + fail);
  if (fail) process.exit(1);
})();
