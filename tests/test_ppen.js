const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/ppen_to_iof.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl(tag) {
  const q = {};
  const el = {
    tag, value: '', textContent: '', className: '', options: [], selectedIndex: 0,
    children: [], style: {}, files: [], _q: q, checked: false, disabled: false,
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, remove() {},
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
global.document = {
  getElementById: getEl,
  querySelectorAll() { return []; },
  createElement: tag => makeEl(tag),
};
global.Blob = class Blob {};
global.URL = { createObjectURL: () => 'blob:x' };

let threw = null;
try {
  eval(code + '; global.__fn = { parsePpen, mergePpen, buildIofXml, traverseCourse, legLengthM, fmtCoord, miniParse, addPpenFile, files, convert, setInclude, loadDemo, setLang, toggleLang, clearAll, toggleArea, hiddenAreas, POKAALIJAHTI_DEMO }; global.__last = () => lastResult;');
} catch (e) { threw = e; }
if (threw) { console.log('eval threw:', threw.stack); process.exit(1); }
let pass = 0, fail = 0;
const assert = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
};

const F = global.__fn;
function reset() {
  F.files.splice(0);
  getEl('titleIn').value = '';
  getEl('boundsIn').value = '';
  ['imgL', 'imgT', 'imgR', 'imgB'].forEach(id => { getEl(id).value = ''; });
}

function makePpen({ title = 'Syn', scale = 15000, pa = null, controls = [], courses = [], ccs = [] } = {}) {
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', '<course-scribe-event>'];
  lines.push('  <event id="1">');
  lines.push('    <title>' + title + '</title>');
  lines.push('    ' + '<map kind="OCAD" scale="' + scale + '" />');
  if (pa) lines.push('    ' + '<print-area left="' + pa[0] + '" top="' + pa[1] + '" right="' + pa[2] + '" bottom="' + pa[3] + '" />');
  lines.push('  </event>');
  controls.forEach(([id, kind, code, x, y]) => {
    lines.push('  <control id="' + id + '" kind="' + kind + '">');
    if (code != null) lines.push('    <code>' + code + '</code>');
    lines.push('    <location x="' + x + '" y="' + y + '" />');
    lines.push('  </control>');
  });
  courses.forEach(([name, labelKind, first, cpa]) => {
    lines.push('  <course id="1" kind="normal" order="1">');
    lines.push('    <name>' + name + '</name>');
    if (labelKind) lines.push('    <labels label-kind="' + labelKind + '" />');
    lines.push('    <first course-control="' + first + '" />');
    if (cpa) lines.push('    <print-area left="' + cpa[0] + '" top="' + cpa[1] + '" right="' + cpa[2] + '" bottom="' + cpa[3] + '" />');
    lines.push('  </course>');
  });
  ccs.forEach(([id, control, next]) => {
    if (next != null) {
      lines.push('  <course-control id="' + id + '" control="' + control + '">');
      lines.push('    <next course-control="' + next + '" />');
      lines.push('  </course-control>');
    } else {
      lines.push('  <course-control id="' + id + '" control="' + control + '" />');
    }
  });
  lines.push('</course-scribe-event>');
  return lines.join('\n');
}

// Ground truth uses the demo data embedded in the HTML (same real-world data,
// obfuscated as a generic "Nuorten kisa" youth race) — no files on disk needed.
const real = Object.entries(F.POKAALIJAHTI_DEMO).map(([n, t]) => [n, t]);

// ── parser: real d16 file ──
const p = F.parsePpen(real[0][1], real[0][0]);
assert('parse d16: scale 15000', p.scale === 15000, String(p.scale));
assert('parse d16: title', p.title === 'Nuorten kisa', p.title);
assert('parse hd16: event print-area', p.bounds.present && p.bounds.left === -154.640259 && p.bounds.top === 25.4121246 && p.bounds.right === -14.601593 && p.bounds.bottom === -172.538544, JSON.stringify(p.bounds));
assert('parse hd16: 13 controls', Object.keys(p.controls).length === 13);
assert('parse hd16: start/finish no code, normals have code', p.controls['1'].kind === 'finish' && p.controls['2'].kind === 'start' && p.controls['2'].code === null && p.controls['3'].code === '109');
assert('parse d16: course + sequence labels + cc chain', p.courses.length === 1 && p.courses[0].name === 'D16' && p.courses[0].label_kind === 'sequence' && p.course_controls['1'].control === '2' && p.course_controls['1'].next === '3' && p.course_controls['5'].next === '14' && p.course_controls['2'].next === null);
assert('parse d16: course-level print-area', p.courses[0].bounds && p.courses[0].bounds.left === -145.316681, JSON.stringify(p.courses[0].bounds));

// ── merge all four real files ──
reset();
real.forEach(([n, t]) => F.addPpenFile(n, t));
let m = F.mergePpen(F.files);
assert('merge real: 33 control entries (1 start + 31 normals + 1 finish)', m.controls.size === 33, String(m.controls.size));
assert('merge real: starts/finishes collapsed to one each', [...m.controls.values()].filter(c => c.kind === 'start').length === 1 && [...m.controls.values()].filter(c => c.kind === 'finish').length === 1);
assert('merge real: code 100 deduped across 3 files', [...m.controls.values()].filter(c => c.code === '100').length === 1);
assert('merge real: code 78 deduped', [...m.controls.values()].filter(c => c.code === '78').length === 1);
assert('merge real: 6 courses, none skipped', m.courses.length === 6 && m.skipped.length === 0);
assert('merge real: title from biggest print-area', m.title === 'Nuorten kisa', m.title);
assert('merge real: bounds = biggest (hd16) print-area', m.bounds.left === -154.640259 && m.bounds.top === 25.4121246 && m.bounds.right === -14.601593 && m.bounds.bottom === -172.538544);
assert('merge real: scale 15000, no warnings', m.scale === 15000 && m.warnings.length === 0);

const lengths = {};
m.courses.forEach(c => { lengths[c.name] = F.traverseCourse(c.first_cc, m.courseControls, m.controls, m.scale).total; });
assert('merge real: per-course lengths match python ground truth',
  lengths.D16 === 3075 && lengths.D10 === 1249 && lengths.D12 === 1952 &&
  lengths.D14 === 2385 && lengths.D10RR === 1607 && lengths.D12TR === 1390, JSON.stringify(lengths));

const xml = F.buildIofXml(m.controls, m.courses, m.courseControls, m.scale, m.bounds, m.title, '2026-01-01T00:00:00Z', 'ppen_to_iof.html');
assert('serialize: xml declaration', xml.startsWith("<?xml version='1.0' encoding='UTF-8'?>\n"));
assert('serialize: root attrs order + creator', xml.includes('<CourseData xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="3.0" createTime="2026-01-01T00:00:00Z" creator="ppen_to_iof.html">'));
assert('serialize: empty element with attrs, single space', xml.includes('<MapPositionTopLeft x="-154.64" y="25.41" />'));
assert('serialize: MapPositionBottomRight', xml.includes('<MapPositionBottomRight x="-14.6" y="-172.54" />'));
const codes = [...xml.matchAll(/<Control type="Control">\s*<Id>([^<]*)<\/Id>/g)].map(x => x[1]);
assert('output: control order across files (python ground truth)',
  codes.join(',') === '109,48,60,100,130,117,116,122,127,133,40,58,72,62,56,129,34,32,113,78,143,64,46,75,74,114,79,87,90,93,94', codes.join(','));
const courseOrder = [...xml.matchAll(/<Course>\s*<Name>([^<]*)<\/Name>/g)].map(x => x[1]);
assert('output: course order', courseOrder.join(',') === 'D16,D10,D12,D14,D10RR,D12TR', courseOrder.join(','));
const d16Block = xml.match(/<Course>[\s\S]*?<Name>D16<\/Name>[\s\S]*?<\/Course>/)[0];
const d16Seq = [...d16Block.matchAll(/<Control>([^<]*)<\/Control>/g)].map(x => x[1]);
assert('output: D16 control sequence (start→finish)', d16Seq.join(',') === 'STA1,109,48,60,40,130,117,116,122,127,133,100,FIN1', d16Seq.join(','));
assert('output: STA1/FIN1 ids + positions', xml.includes('<Control type="Start">\n      <Id>STA1</Id>\n      <MapPosition x="-104.52" y="-142.08" />\n    </Control>') && xml.includes('<Id>FIN1</Id>'));
assert('output: MapText + LegLength counts (48 + 54)', (xml.match(/<MapText>/g) || []).length === 48 && (xml.match(/<LegLength>/g) || []).length === 54);
assert('output: 6 class assignments', (xml.match(/<ClassCourseAssignment>/g) || []).length === 6);
assert('output: Climb=0 for every course', (xml.match(/<Climb>0<\/Climb>/g) || []).length === 6);

// ── synthetic demo byte-parity vs python ppen_to_iof.py ──
reset();
F.addPpenFile('Demokisa_rataA.ppen', makePpen({
  title: 'Demokisa', pa: [0, 400, 400, 0],
  controls: [['1', 'start', null, 50, 100], ['2', 'finish', null, 250, 200], ['3', 'normal', '31', 120, 80], ['4', 'normal', '32', 180, 140], ['5', 'normal', '33', 230, 60]],
  courses: [['Rata A', 'sequence', '1', [50, 250, 300, 0]]],
  ccs: [['1', '1', '2'], ['2', '3', '3'], ['3', '4', '4'], ['4', '5', '5'], ['5', '2', null]],
}));
F.addPpenFile('Demokisa_rataB.ppen', makePpen({
  title: 'Demokisa', pa: [150, 300, 450, 0],
  controls: [['1', 'start', null, 200, 250], ['2', 'finish', null, 400, 100], ['3', 'normal', '41', 260, 200], ['4', 'normal', '42', 330, 150]],
  courses: [['Rata B', 'sequence', '1']],
  ccs: [['1', '1', '2'], ['2', '3', '3'], ['3', '4', '4'], ['4', '2', null]],
}));
const dm = F.mergePpen(F.files);
const DEMO_EXPECTED = `<?xml version='1.0' encoding='UTF-8'?>
<CourseData xmlns="http://www.orienteering.org/datastandard/3.0" iofVersion="3.0" createTime="2026-01-01T00:00:00Z" creator="ppen_to_iof.html">
  <Event>
    <Name>Demokisa</Name>
  </Event>
  <RaceCourseData>
    <Map>
      <Scale>15000</Scale>
      <MapPositionTopLeft x="0.0" y="400.0" />
      <MapPositionBottomRight x="400.0" y="0.0" />
    </Map>
    <Control type="Start">
      <Id>STA1</Id>
      <MapPosition x="50.0" y="100.0" />
    </Control>
    <Control type="Control">
      <Id>31</Id>
      <MapPosition x="120.0" y="80.0" />
    </Control>
    <Control type="Control">
      <Id>32</Id>
      <MapPosition x="180.0" y="140.0" />
    </Control>
    <Control type="Control">
      <Id>33</Id>
      <MapPosition x="230.0" y="60.0" />
    </Control>
    <Control type="Control">
      <Id>41</Id>
      <MapPosition x="260.0" y="200.0" />
    </Control>
    <Control type="Control">
      <Id>42</Id>
      <MapPosition x="330.0" y="150.0" />
    </Control>
    <Control type="Finish">
      <Id>FIN1</Id>
      <MapPosition x="250.0" y="200.0" />
    </Control>
    <Course>
      <Name>Rata A</Name>
      <Length>5901</Length>
      <Climb>0</Climb>
      <CourseControl type="Start">
        <Control>STA1</Control>
      </CourseControl>
      <CourseControl type="Control">
        <Control>31</Control>
        <MapText>1</MapText>
        <LegLength>1092</LegLength>
      </CourseControl>
      <CourseControl type="Control">
        <Control>32</Control>
        <MapText>2</MapText>
        <LegLength>1273</LegLength>
      </CourseControl>
      <CourseControl type="Control">
        <Control>33</Control>
        <MapText>3</MapText>
        <LegLength>1415</LegLength>
      </CourseControl>
      <CourseControl type="Finish">
        <Control>FIN1</Control>
        <LegLength>2121</LegLength>
      </CourseControl>
    </Course>
    <Course>
      <Name>Rata B</Name>
      <Length>6194</Length>
      <Climb>0</Climb>
      <CourseControl type="Start">
        <Control>STA1</Control>
      </CourseControl>
      <CourseControl type="Control">
        <Control>41</Control>
        <MapText>1</MapText>
        <LegLength>3489</LegLength>
      </CourseControl>
      <CourseControl type="Control">
        <Control>42</Control>
        <MapText>2</MapText>
        <LegLength>1290</LegLength>
      </CourseControl>
      <CourseControl type="Finish">
        <Control>FIN1</Control>
        <LegLength>1415</LegLength>
      </CourseControl>
    </Course>
    <ClassCourseAssignment>
      <ClassName>Rata A</ClassName>
      <CourseName>Rata A</CourseName>
    </ClassCourseAssignment>
    <ClassCourseAssignment>
      <ClassName>Rata B</ClassName>
      <CourseName>Rata B</CourseName>
    </ClassCourseAssignment>
  </RaceCourseData>
</CourseData>
`;
const dxml = F.buildIofXml(dm.controls, dm.courses, dm.courseControls, dm.scale, dm.bounds, dm.title, '2026-01-01T00:00:00Z', 'ppen_to_iof.html');
assert('demo: byte-identical to python ppen_to_iof.py output', dxml === DEMO_EXPECTED);
assert('demo: title from biggest (rata A area), both accepted', dm.title === 'Demokisa' && dm.courses.length === 2 && dm.skipped.length === 0);
F.convert();
const dprev = getEl('previewWrap').innerHTML;
assert('demo: zoom-proportional markers scaled (k≈2.86 → r="5.0")', dprev.includes('r="5.0"'));
assert('demo: symbols fill="none"', dprev.includes('<circle r="5.0" fill="none"'));
assert('demo: polyline scaled + translucent', dprev.includes('stroke-width="1.43"') && dprev.includes('opacity="0.6"'));
assert('demo: file-name print-area labels', dprev.includes('Demokisa_rataA.ppen') && dprev.includes('Demokisa_rataB.ppen'));

// ── label positions must lie inside the svg viewBox (k≠1 regression) ──
const dvb = dprev.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
const vbx0 = dvb[0], vby0 = dvb[1], vbw = dvb[2], vbh = dvb[3];
['Demokisa_rataA.ppen', 'Demokisa_rataB.ppen'].forEach(nm => {
  const tel = dprev.match(new RegExp('<text[^>]*>' + nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</text>'))[0];
  const lx = Number(tel.match(/ x="([^"]+)"/)[1]);
  const ly = Number(tel.match(/ y="([^"]+)"/)[1]);
  assert('demo: label ' + nm + ' inside viewBox',
    lx >= vbx0 && lx <= vbx0 + vbw && ly >= vby0 && ly <= vby0 + vbh, 'xy=' + lx + ',' + ly + ' vb=' + dvb.join(','));
});

// ── clickable areas: toggle show/hide, hidden stays clickable, XML unchanged ──
const areaCount = s => (s.match(/data-area="/g) || []).length;
const ghostCount = s => (s.match(/data-ghost="1"/g) || []).length;
const polyCount = s => (s.match(/<polyline/g) || []).length;
const xmlBefore = global.__last().xml;
const evtA = 'evt:' + F.files.find(f => f.name.indexOf('Demokisa_rataA') === 0).id;
assert('demo: 3 clickable areas (2 event + Rata A course)', areaCount(dprev) === 3, String(areaCount(dprev)));
assert('demo: area rects carry toggleArea onclick', (dprev.match(/onclick="toggleArea\('/g) || []).length === 3);
F.toggleArea(evtA);
let ap = getEl('previewWrap').innerHTML;
assert('demo: evt toggle hides rect fill + label', !ap.includes('Demokisa_rataA.ppen') && (ap.match(/fill="rgba\(150,150,150,0\.08\)"/g) || []).length === 1);
assert('demo: hidden area stays clickable as ghost rect', ghostCount(ap) === 1 && areaCount(ap) === 3);
assert('demo: evt toggle hides that file polyline + its controls', polyCount(ap) === 1 && !ap.includes('>31<') && ap.includes('>41<'));
assert('demo: toggle area leaves XML byte-identical', global.__last().xml === xmlBefore);
F.toggleArea(evtA);
ap = getEl('previewWrap').innerHTML;
assert('demo: evt toggle restored (ghost gone, label back)', ghostCount(ap) === 0 && areaCount(ap) === 3 && ap.includes('Demokisa_rataA.ppen') && polyCount(ap) === 2);
const crsA = dprev.match(/data-area="(crs:[^"]+)"/)[1];
F.toggleArea(crsA);
ap = getEl('previewWrap').innerHTML;
assert('demo: crs toggle hides course rect + line, keeps file rect', ghostCount(ap) === 1 && polyCount(ap) === 1 && ap.includes('Demokisa_rataA.ppen') && !ap.includes('>31<'));
assert('demo: course-area toggle leaves XML byte-identical', global.__last().xml === xmlBefore);
F.toggleArea(crsA);
assert('demo: crs toggle restored', ghostCount(getEl('previewWrap').innerHTML) === 0 && polyCount(getEl('previewWrap').innerHTML) === 2);
F.toggleArea(crsA);
assert('demo: hiddenAreas tracks toggles', F.hiddenAreas.size === 1, String(F.hiddenAreas.size));
F.addPpenFile('tmp.ppen', makePpen({ pa: [0, 100, 100, 0] }));
assert('demo: hiddenAreas cleared on new file load', F.hiddenAreas.size === 0);

// ── per-file include toggle ──
reset();
real.forEach(([n, t]) => F.addPpenFile(n, t));
F.setInclude(0, false);
let m2 = F.mergePpen(F.files);
assert('toggle: excluding d16 → 5 courses', m2.courses.length === 5, String(m2.courses.length));
assert('toggle: bounds = suorat print-area', m2.bounds.left === -147.606064 && m2.bounds.right === -73.56506);
F.setInclude(0, true);
assert('toggle: re-enabled → 6 courses again', F.mergePpen(F.files).courses.length === 6);

// ── embedded demo (obfuscated "Nuorten kisa", not Pokaalijahti) ──
reset();
F.loadDemo();
assert('pk demo: 4 embedded files loaded', F.files.length === 4, String(F.files.length));
assert('pk demo: titles generic', F.files.every(f => f.title === 'Nuorten kisa'));
assert('pk demo: no Pokaalijahti brand in demo data', F.files.every(f => !f.name.includes('Pokaalijahti') && !JSON.stringify(f.courses).includes('HD')));
F.convert();
const pprev = getEl('previewWrap').innerHTML;
assert('pk demo: symbols stay base-size (k≈1 → r="1.75")', pprev.includes('r="1.75"'));
assert('pk demo: obfuscated file-name labels', pprev.includes('nuorten_d16.ppen') && pprev.includes('nuorten_siimari.ppen'));

// ── steps 2-4 hidden without files (like joukkuesuunnittelu tools) ──
reset();
F.convert();
assert('steps: 2-4 hidden with no files', ['psStep2', 'psStep3', 'psStep4'].every(id => getEl(id).style.display === 'none'));
real.forEach(([n, t]) => F.addPpenFile(n, t));
assert('steps: 2-4 shown after loading files', ['psStep2', 'psStep3', 'psStep4'].every(id => getEl(id).style.display === ''));
reset();
F.convert();
assert('steps: 2-4 hidden again after reset', ['psStep2', 'psStep3', 'psStep4'].every(id => getEl(id).style.display === 'none'));

// ── convert() UI: title + map-bounds overrides, summary, preview, warnings ──
reset();
real.forEach(([n, t]) => F.addPpenFile(n, t));
getEl('titleIn').value = 'Testi & <kilpa> 2026';
getEl('boundsIn').value = '1 2 3 4';
F.convert();
const last = global.__last();
assert('convert: saveBtn enabled', getEl('saveBtn').disabled === false);
assert('convert: title override + XML escaping', last.xml.includes('<Name>Testi &amp; &lt;kilpa&gt; 2026</Name>'), last.xml.match(/<Name>[^<]*<\/Name>/)[0]);
assert('convert: bounds override in XML', last.xml.includes('<MapPositionTopLeft x="1.0" y="2.0" />') && last.xml.includes('<MapPositionBottomRight x="3.0" y="4.0" />'));
assert('convert: summary shows counts', getEl('summary').innerHTML.includes('rastia') && getEl('summary').innerHTML.includes('Testi &amp; &lt;kilpa&gt; 2026'), getEl('summary').innerHTML.slice(0, 200));
assert('convert: xmlOut populated', getEl('xmlOut').value === last.xml);
assert('convert: preview has svg + course legend', getEl('previewWrap').innerHTML.includes('<svg') && getEl('previewWrap').innerHTML.includes('D16') && getEl('previewWrap').innerHTML.includes('<polyline'));
const prev = getEl('previewWrap').innerHTML;
assert('preview: start drawn as triangle polygon', prev.includes('<polygon'));
assert('preview: file-name print-area labels', prev.includes('nuorten_d16.ppen') && prev.includes('nuorten_suorat.ppen'));
assert('preview: no S/F letter labels', !prev.includes('>S<') && !prev.includes('>F<'), prev.slice(0, 300));
assert('convert: no warnings → hidden', getEl('warnings').style.display !== 'block');
getEl('titleIn').value = '';
getEl('boundsIn').value = '';
F.convert();
const prev2 = getEl('previewWrap').innerHTML;
assert('preview: control drawn as small circle', prev2.includes('r="1.75"'));
assert('preview: finish drawn as double circle', prev2.includes('r="2.1"') && prev2.includes('r="1.3"'));
assert('preview: symbols fill="none"', prev2.includes('<circle r="1.75" fill="none"'));
assert('preview: code labels small font', prev2.includes('font-size="3.0"'));

// ── invalid bounds override → warning, not error ──
getEl('boundsIn').value = '1 2 3';
F.convert();
assert('convert: invalid bounds override warns', getEl('warnings').style.display === 'block' && global.__last().xml.includes('<MapPositionTopLeft x="-154.64" y="25.41" />'));
getEl('boundsIn').value = '';
F.convert();

// ── creator override ──
assert('convert: default creator', global.__last().xml.includes('creator="ppen_to_iof.html"'));
getEl('creatorIn').value = 'Test Club';
F.convert();
assert('convert: creator override in XML', global.__last().xml.includes('creator="Test Club"'));
getEl('creatorIn').value = '';
F.convert();

// ── language toggle ──
F.setLang('fi');
F.toggleLang();
assert('lang: toggleLang fi → en', document.title === 'Purple Pen → IOF (courses)', document.title);
assert('lang: summary English after toggle', getEl('summary').innerHTML.includes('files included'), getEl('summary').innerHTML.slice(0, 120));
F.toggleLang();
assert('lang: toggleLang en → fi', document.title === 'Purple Pen → IOF (radat)', document.title);

// ── clearAll resets files, options, view state ──
reset();
real.forEach(([n, t]) => F.addPpenFile(n, t));
getEl('titleIn').value = 'Custom title';
getEl('boundsIn').value = '1 2 3 4';
getEl('creatorIn').value = 'My Club';
F.toggleArea('evt:' + F.files[0].id);
getEl('imgL').value = '5';
F.clearAll();
assert('clear: files emptied', F.files.length === 0);
assert('clear: hiddenAreas cleared', F.hiddenAreas.size === 0);
assert('clear: options reset', getEl('titleIn').value === '' && getEl('boundsIn').value === '' && getEl('creatorIn').value === '' && getEl('imgL').value === '');
assert('clear: inputs cleared', getEl('filesInput').value === '' && getEl('mapImgInput').value === '');
assert('clear: lastResult null + save disabled', global.__last() === null && getEl('saveBtn').disabled === true);
assert('clear: preview shows empty-state hint', !getEl('previewWrap').innerHTML.includes('<svg'));
assert('clear: summary shows no-files message', getEl('summary').innerHTML.includes('Ei ladattuja tiedostoja') || getEl('summary').innerHTML.includes('No files loaded'));
F.setLang('fi');

// ── duplicate course name skip ──
reset();
const synCcs = [['1', '1', '2'], ['2', '3', '3'], ['3', '2', null]];
F.addPpenFile('d1.ppen', makePpen({ title: 'Dup', pa: [0, 100, 100, 0], controls: [['1', 'start', null, 0, 0], ['2', 'finish', null, 50, 0], ['3', 'normal', '31', 10, 10]], courses: [['Kisa A', 'sequence', '1']], ccs: synCcs }));
F.addPpenFile('d2.ppen', makePpen({ title: 'Dup', pa: [0, 100, 100, 0], controls: [['1', 'start', null, 0, 0], ['2', 'finish', null, 50, 0], ['3', 'normal', '41', 20, 20]], courses: [['Kisa A', 'sequence', '1']], ccs: synCcs }));
let md = F.mergePpen(F.files);
assert('dup name: one course + warning', md.courses.length === 1 && md.warnings.some(w => w.text.includes("duplicate course name 'Kisa A'")), JSON.stringify(md.warnings));

// ── non-overlapping files: only biggest kept ──
reset();
F.addPpenFile('n1.ppen', makePpen({ title: 'N1', pa: [0, 100, 100, 0], controls: [['1', 'start', null, 0, 0], ['2', 'finish', null, 50, 0], ['3', 'normal', '31', 10, 10]], courses: [['R1', 'sequence', '1']], ccs: synCcs }));
F.addPpenFile('n2.ppen', makePpen({ title: 'N2', pa: [500, 600, 600, 500], controls: [['1', 'start', null, 550, 550], ['2', 'finish', null, 570, 520], ['3', 'normal', '51', 560, 540]], courses: [['R2', 'sequence', '1']], ccs: synCcs }));
let mn = F.mergePpen(F.files);
assert('non-overlap: 1 accepted, 1 skipped with warning', mn.accepted.length === 1 && mn.skipped.length === 1 && mn.warnings.some(w => w.text.includes('does not overlap')), JSON.stringify(mn.warnings));
assert('non-overlap: bounds from accepted', mn.bounds.left === 0 && mn.courses.length === 1);

// ── file without print-area: fallback bounds ──
reset();
F.addPpenFile('np.ppen', makePpen({ title: 'NoPA', pa: null, controls: [['1', 'start', null, 0, 0], ['2', 'finish', null, 10, 0], ['3', 'normal', '61', 5, 5]], courses: [['R3', 'sequence', '1']], ccs: synCcs }));
let mp = F.mergePpen(F.files);
assert('no print-area: fallback bounds 0 600 200 0', mp.bounds.present === false && mp.bounds.left === 0 && mp.bounds.top === 600 && mp.bounds.right === 200 && mp.bounds.bottom === 0);
assert('no print-area alone: accepted, no skip', mp.skipped.length === 0 && mp.courses.length === 1);

// ── scale mismatch warning ──
reset();
F.addPpenFile('s1.ppen', makePpen({ title: 'S1', scale: 10000, pa: [0, 100, 100, 0], controls: [['1', 'start', null, 0, 0], ['2', 'finish', null, 50, 0], ['3', 'normal', '31', 10, 10]], courses: [['R1', 'sequence', '1']], ccs: synCcs }));
F.addPpenFile('s2.ppen', makePpen({ title: 'S2', scale: 15000, pa: [0, 100, 100, 0], controls: [['1', 'start', null, 0, 0], ['2', 'finish', null, 50, 0], ['3', 'normal', '41', 20, 20]], courses: [['R2', 'sequence', '1']], ccs: synCcs }));
let ms = F.mergePpen(F.files);
assert('scale mismatch: warning emitted, scale from first accepted', ms.scale === 10000 && ms.warnings.some(w => w.text.includes('scale 15000, using 10000')), JSON.stringify(ms.warnings));

// ── no labels → no MapText; duplicate code within one file ──
reset();
F.addPpenFile('nl.ppen', makePpen({ title: 'NL', pa: [0, 100, 100, 0], controls: [['1', 'start', null, 0, 0], ['2', 'finish', null, 50, 0], ['3', 'normal', '71', 10, 10], ['4', 'normal', '71', 20, 20]], courses: [['NoLabels', null, '1']], ccs: [['1', '1', '2'], ['2', '3', '3'], ['3', '4', '4'], ['4', '2', null]] }));
let ml = F.mergePpen(F.files);
const nlXml = F.buildIofXml(ml.controls, ml.courses, ml.courseControls, ml.scale, ml.bounds, ml.title);
assert('no labels + dup code: single 71 control, no MapText', !nlXml.includes('<MapText>') && (nlXml.match(/<Id>71<\/Id>/g) || []).length === 1);

// ── fmtCoord parity with python str(round(v,2)) ──
assert('fmtCoord: 0 → "0.0"', F.fmtCoord(0) === '0.0', F.fmtCoord(0));
assert('fmtCoord: integer → "400.0"', F.fmtCoord(400) === '400.0', F.fmtCoord(400));
assert('fmtCoord: 2 decimals', F.fmtCoord(-154.640259) === '-154.64', F.fmtCoord(-154.640259));
assert('fmtCoord: trailing-zero collapse', F.fmtCoord(-14.601593) === '-14.6', F.fmtCoord(-14.601593));

// ── miniParse handles self-closing, prolog, entities ──
const parsedMini = F.miniParse('<?xml version="1.0"?>\n<a x="1&amp;2"><b>hi</b><c /></a>');
assert('miniParse: prolog + attrs + entities', parsedMini.name === 'a' && parsedMini.attrs.x === '1&2' && parsedMini.children[0].name === 'b' && parsedMini.children[0].text === 'hi' && parsedMini.children[1].name === 'c');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
