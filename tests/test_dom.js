const fs = require('fs');
const html = fs.readFileSync('/tulospalvelupaavo/rastilippu_parallel_legs_to_navisport.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Functional-ish DOM stub
function makeEl(tag) {
  const q = {};
  const el = {
    tag, value: '', textContent: '', innerHTML: '', className: '', options: [], selectedIndex: 0,
    children: [], style: {}, files: [], _q: q,
    appendChild(c) { this.children.push(c); return c; },
    addEventListener() {}, remove() {},
    querySelector(sel) { if (!q[sel]) q[sel] = makeEl(sel); return q[sel]; },
    querySelectorAll() { return []; },
  };
  return el;
}
const store = {};
function getEl(id) { if (!store[id]) store[id] = makeEl('#' + id); return store[id]; }
global.document = {
  getElementById: getEl,
  querySelectorAll(sel) {
    if (sel === '.profile-block') return store['profiles'] ? store['profiles'].children : [];
    return [];
  },
  createElement: tag => makeEl(tag),
};

let threw = null;
try {
  eval(code);
} catch (e) { threw = e; }
console.log('init eval threw:', threw ? threw.stack : 'no');

// Verify editor state after init
const src = getEl('src').value;
console.log('src populated:', src.split('\n').length + ' lines, header: ' + src.split('\n')[0].slice(0, 60) + '…');
const blocks = store['profiles'] ? store['profiles'].children.length : 0;
console.log('profile blocks after init:', blocks);
const firstLegs = blocks ? getEl('profiles').children[0].querySelector('.p-legs').value : '';
console.log('first profile legs:\n' + firstLegs);

// Read profiles back through the DOM (exercises readProfilesFromDOM/parseProfileText)
const readProfs = eval('readProfilesFromDOM')();
console.log('readProfilesFromDOM:', readProfs.profiles.length + ' profiles, errors:', readProfs.errors.length);
for (const p of readProfs.profiles) console.log('  -', p.name, '->', p.legs.map(l => l.osuus + ':' + l.lkm).join(', '), 'sarjat:', JSON.stringify(p.sarjat));
