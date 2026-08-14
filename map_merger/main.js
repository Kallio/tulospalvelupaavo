'use strict';

const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const RENDER_DPI = 300;
const MAX_RENDER_PX = 4000;
const MM_PER_PT = 25.4 / 72;
// Paper formats for bitmap imports (portrait dims, mm). The image's longest
// side is matched to the format's long edge; scale follows the pixel count.
const IMAGE_FORMATS = {
  A5: { w: 148, h: 210 },
  A6: { w: 105, h: 148 },
  A7: { w: 74, h: 105 },
};

let fileSeq = 0;
let pageSeq = 0;

const state = {
  pages: [],
  files: [],
  options: {
    autoCrop: true,
    bleedMm: 0,
    autoRotate: true,
    keepOriginal: false,
    mirror: false,
    mirrorOnly: false,
    repeat: false,
    repeatN: 4,
    marginMm: 5,
  },
  selectedId: null,
  lang: 'fi',
  busy: false,
};

const I18N = {
  fi: {
    title: 'Map Merger — karttalehtien yhdistäjä',
    filesHdr: '1. Tiedostot',
    filesHint: 'Valitse PDF-karttoja ja/tai kuvia. Jokainen PDF-sivu tai kuva tulee yhdeksi kartaksi A4-arkille.',
    loadBtn: 'Valitse tiedostot',
    dropHint: 'tai raahaa tästä',
    optionsHdr: '2. Asetukset',
    autoCrop: 'Automaattinen rajaus (valkoinen >245)',
    bleed: 'Lisää leikkuuvara (mm)',
    bleedHint: 'Laajentaa rajatun alueen joka sivulta annetun marginaalin verran.',
    margin: 'Tulostimien reunamarginaali (mm)',
    marginHint: 'Ei vaikuta skaalaukseen — leikkaa vain pois kartan osan, joka menee tulostimen tulostumattoman reunan (yleensä n. 5 mm) yli.',
    autoRotate: 'Käännä kartta automaattisesti (sisällön mukaan)',
    autoRotateHint: 'Kiertää kartan 90°, jos rajatun sisällön suunta on pystysuuntainen, jotta se täyttää vaaka-A5-arkin skaalaamisen sijaan. Päätös perustuu sisällön suuntaan, ei sivun mittoihin.',
    keepOriginal: 'Säilytä alkuperäinen koko (1:1)',
    keepOriginalHint: 'Sijoittaa kartan alkuperäisessä koossaan arkin keskelle. Reunamarginaali ei skaalaa, vaan leikkaa vain reunoja.',
    mirror: 'Duplex-valoläpäisy (peilaa taustasivut)',
    mirrorHint: 'Easter egg: lisää jokaisen A4-sivun jälkeen peilatun kopion, jotta kaksipuolisesti tulostettuna takapuoli näkyy läpi ja kohdistuu etusivun kanssa.',
    mirrorOnly: 'Tulosta vain peilatut (tausta)sivut',
    mirrorOnlyHint: 'Easter egg, "lapsille": tulostaa vain peilatut taustasivut ilman etusivuja.',
    repeat: 'Toista kartat: jokainen kartta kopioina omalla A4-arkilla',
    repeatHint: 'Ruuduttaa jokaisen sivun erikseen 1:1-kopioina omalle arkeilleen (esim. jokainen sivu 4 × A6). Määrä rajataan niin, että jokainen kopio mahtuu arkille (esim. enintään 2 × A5).',
    repeatN: 'Kopioiden määrä',
    repeatCap: '{n} kopiota · {cols}×{rows} ruudukko',
    repeatMax: 'Arkille mahtuu tässä koossa enintään {max} kopiota (1:1).',
    warnBig: 'Kartta on A4-arkkia suurempi ja leikkaantuu reunoista 1:1-tilassa.',
    imageFormat: 'Kuvan alkuperäinen koko',
    easterEggRevealed: 'Easter eggit paljastettu ✓ (klikkaa otsikkoa 5× piilottaaksesi)',
    easterEggHidden: 'Easter eggit piilotettu.',
    summaryHdr: '3. Yhteenveto',
    downloadHdr: '4. Lataa PDF',
    downloadBtn: 'Lataa A4-PDF',
    clearBtn: 'Tyhjennä',
    langBtn: 'EN / FI',
    statusIdle: 'Odottamassa tiedostoja…',
    statusProcessing: 'Käsitellään…',
    statusReady: 'Valmis',
    pagesHdr: 'Sivut (alkuperäinen + rajaus)',
    sheetsHdr: 'A4-arkit (2 × A5)',
    sheetCaption: 'Arkki {n}/{total}',
    sheetBack: ' · takapuoli (peilattu)',
    pageCaption: '{file} · sivu {no} · {ow}×{oh} → {w}×{h} mm',
    pageCaptionImg: '{file} · kuva · {fmt} · {ow}×{oh} → {w}×{h} mm',
    emptyHint: 'Lataa PDF- tai kuvatiedostoja aloittaaksesi.',
    pdfLibMissing: 'pdf-lib ei latautunut (tarkista verkkoyhteys).',
    pdfjsMissing: 'pdf.js ei latautunut (tarkista verkkoyhteys).',
    noPages: 'Ei sivuja ladattuna.',
    sheets: '{n} arkkia',
    pages: '{n} sivua',
    errFile: 'Tiedoston käsittely epäonnistui: ',
    removeFile: 'Poista tiedosto',
    removePage: 'Poista sivu',
    pdfLoaded: 'PDF',
    imgLoaded: 'kuva',
  },
  en: {
    title: 'Map Merger — map sheet combiner',
    filesHdr: '1. Files',
    filesHint: 'Pick PDF maps and/or images. Every PDF page or image becomes one map on an A4 sheet.',
    loadBtn: 'Choose files',
    dropHint: 'or drag here',
    optionsHdr: '2. Options',
    autoCrop: 'Auto-crop whitespace (white >245)',
    bleed: 'Add bleed margin (mm)',
    bleedHint: 'Expands the cropped area by the given margin on every side.',
    margin: 'Unprintable printer margin (mm)',
    marginHint: 'Does not affect scaling — it only cuts away the part of the map that extends past the printer\'s unprintable edge (usually ~5 mm).',
    autoRotate: 'Auto-rotate map (by content)',
    autoRotateHint: 'Rotates the map 90° when the cropped content is portrait so it fills the landscape A5 cell instead of being scaled down. The decision is based on the content orientation, not the page dimensions.',
    keepOriginal: 'Keep original size (1:1)',
    keepOriginalHint: 'Places the map at its original size, centered. The margin does not scale it — it only cuts away the edges.',
    mirror: 'Duplex shine-through (mirror back pages)',
    mirrorHint: 'Easter egg: appends a mirrored copy after every A4 page so that when printed double-sided the back shows through and aligns with the front.',
    mirrorOnly: 'Print only the mirrored (back) pages',
    mirrorOnlyHint: 'Easter egg, "for kids": prints only the mirrored back pages, without the fronts.',
    repeat: 'Repeat maps: each map as copies on its own A4 sheet',
    repeatHint: 'Tiles every page separately as 1:1 copies on its own A4 sheet (e.g. each page 4 × A6). The count is capped so every copy fits at 1:1 (e.g. at most 2 × A5).',
    repeatN: 'Number of copies',
    repeatCap: '{n} copies · {cols}×{rows} grid',
    repeatMax: 'At this size an A4 sheet fits at most {max} copies (1:1).',
    warnBig: 'A map is larger than an A4 sheet and will be clipped at the edges in 1:1 mode.',
    imageFormat: 'Original image size',
    easterEggRevealed: 'Easter eggs revealed ✓ (click the heading 5× to hide)',
    easterEggHidden: 'Easter eggs hidden.',
    summaryHdr: '3. Summary',
    downloadHdr: '4. Download PDF',
    downloadBtn: 'Download A4 PDF',
    clearBtn: 'Clear',
    langBtn: 'FI / EN',
    statusIdle: 'Waiting for files…',
    statusProcessing: 'Processing…',
    statusReady: 'Done',
    pagesHdr: 'Pages (original + crop)',
    sheetsHdr: 'A4 sheets (2 × A5)',
    sheetCaption: 'Sheet {n}/{total}',
    sheetBack: ' · back (mirrored)',
    pageCaption: '{file} · page {no} · {ow}×{oh} → {w}×{h} mm',
    pageCaptionImg: '{file} · image · {fmt} · {ow}×{oh} → {w}×{h} mm',
    emptyHint: 'Load PDF or image files to begin.',
    pdfLibMissing: 'pdf-lib failed to load (check network).',
    pdfjsMissing: 'pdf.js failed to load (check network).',
    noPages: 'No pages loaded.',
    sheets: '{n} sheets',
    pages: '{n} pages',
    errFile: 'Failed to process file: ',
    removeFile: 'Remove file',
    removePage: 'Remove page',
    pdfLoaded: 'PDF',
    imgLoaded: 'image',
  },
};

function t(key, vars) {
  let s = (I18N[state.lang] || I18N.fi)[key] || I18N.fi[key] || key;
  if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

function el(id) { return document.getElementById(id); }

function applyLang() {
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.getAttribute('data-i18n')); });
  el('filesHint').textContent = t('filesHint');
  el('loadBtn').textContent = t('loadBtn');
  el('dropHint').textContent = t('dropHint');
  el('bleedHint').textContent = t('bleedHint');
  el('marginHint').textContent = t('marginHint');
  el('autoRotateHint').textContent = t('autoRotateHint');
  el('keepOriginalHint').textContent = t('keepOriginalHint');
  el('mirrorHint').textContent = t('mirrorHint');
  el('mirrorOnlyHint').textContent = t('mirrorOnlyHint');
  el('repeatHint').textContent = t('repeatHint');
  renderFileList();
  renderAll();
  updateSummary();
}

async function processFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;
  let anyError = false;
  if (files.some(f => f.name.toLowerCase().endsWith('.pdf'))) {
    if (!window.pdfjsLib) { setStatus(t('pdfjsMissing'), 'err'); return; }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  }
  state.busy = true;
  el('downloadBtn').disabled = true;
  try {
    for (const file of files) {
      const lower = file.name.toLowerCase();
      let ok = false;
      if (lower.endsWith('.pdf')) {
        ok = await processPdf(file);
      } else if (/\.(png|jpe?g|gif|bmp|webp)$/.test(lower)) {
        ok = await processImage(file);
      } else {
        setStatus(t('errFile') + file.name, 'err');
      }
      if (!ok) anyError = true;
    }
  } finally {
    state.busy = false;
    el('downloadBtn').disabled = false;
    renderAll();
    updateSummary();
    if (!state.pages.length && !anyError) setStatus(t('statusIdle'));
  }
}

async function processPdf(file) {
  const srcId = addFile(file.name, 'pdf');
  try {
    const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const numPages = doc.numPages;
    for (let i = 1; i <= numPages; i++) {
      setStatus(t('statusProcessing') + ' ' + file.name + ' … ' + i + '/' + numPages);
      const page = await doc.getPage(i);
      const vp1 = page.getViewport({ scale: 1 });
      const ptW = vp1.width, ptH = vp1.height;
      const scale = Math.min(RENDER_DPI / 72, MAX_RENDER_PX / Math.max(ptW, ptH, 1));
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(vp.width));
      canvas.height = Math.max(1, Math.floor(vp.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, background: 'rgb(255,255,255)' }).promise;
      const wmm = ptW * MM_PER_PT;
      const hmm = ptH * MM_PER_PT;
      processRenderedCanvas(canvas, wmm, hmm, { srcId, srcName: file.name, pageNo: i, kind: 'pdf' });
    }
    renderFileList();
    return true;
  } catch (e) {
    removeFile(srcId);
    setStatus(t('errFile') + file.name + ' — ' + e.message, 'err');
    return false;
  }
}

async function processImage(file) {
  const srcId = addFile(file.name, 'image');
  try {
    const bmp = await loadBitmap(file);
    const fmt = IMAGE_FORMATS.A5;
    const scale = Math.max(fmt.w, fmt.h) / Math.max(bmp.width, bmp.height, 1);
    const origWmm = bmp.width * scale;
    const origHmm = bmp.height * scale;
    const renderScale = Math.min(1, MAX_RENDER_PX / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * renderScale));
    canvas.height = Math.max(1, Math.round(bmp.height * renderScale));
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    processRenderedCanvas(canvas, origWmm, origHmm, { srcId, srcName: file.name, pageNo: 1, kind: 'image', pxW: bmp.width, pxH: bmp.height, imageFormat: 'A5' });
    renderFileList();
    return true;
  } catch (e) {
    removeFile(srcId);
    setStatus(t('errFile') + file.name + ' — ' + e.message, 'err');
    return false;
  }
}

function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const done = ok => { URL.revokeObjectURL(url); ok ? resolve(img) : reject(new Error('image load failed')); };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

function addFile(name, kind) {
  const f = { id: ++fileSeq, name, kind };
  state.files.push(f);
  return f.id;
}

function removeFile(fileId) {
  state.files = state.files.filter(f => f.id !== fileId);
  state.pages = state.pages.filter(p => p.srcId !== fileId);
  renderFileList();
  renderAll();
  updateSummary();
}

function processRenderedCanvas(canvas, wmm, hmm, meta) {
  const p = {
    id: ++pageSeq,
    srcId: meta.srcId,
    srcName: meta.srcName,
    pageNo: meta.pageNo,
    kind: meta.kind,
    original: canvas,
    wmm,
    hmm,
  };
  if (meta.kind === 'image') {
    p.pxW = meta.pxW;
    p.pxH = meta.pxH;
    p.imageFormat = meta.imageFormat || 'A5';
  }
  state.pages.push(p);
  recomputePage(p);
}

function recomputePage(p) {
  let canvas = p.original;
  let wmm = p.wmm, hmm = p.hmm;
  // Detect content once on the original canvas; the rotation decision is based
  // on the content's orientation (not the raw page dimensions) so that e.g. a
  // portrait page holding a landscape map with side margins is not rotated.
  const data0 = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const content0 = MapMergerCrop.detectContentBBox(data0, canvas.width, canvas.height);
  let rotated = false;
  if (state.options.autoRotate) {
    const cw = content0 ? (content0.x1 - content0.x0) : canvas.width;
    const ch = content0 ? (content0.y1 - content0.y0) : canvas.height;
    if (cw < ch) {
      canvas = MapMergerCrop.rotateCanvas90(canvas, true);
      const tmp = wmm; wmm = hmm; hmm = tmp;
      rotated = true;
    }
  }
  const pxPerMm = canvas.width / wmm;
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let base;
  if (state.options.autoCrop) {
    base = rotated ? MapMergerCrop.detectContentBBox(data, canvas.width, canvas.height) : content0;
    if (!base) base = { x0: 0, y0: 0, x1: canvas.width, y1: canvas.height };
  } else {
    base = { x0: 0, y0: 0, x1: canvas.width, y1: canvas.height };
  }
  const bleedPx = Math.round((Number(state.options.bleedMm) || 0) * pxPerMm);
  const finalBox = MapMergerCrop.expandBBox(base, bleedPx, bleedPx, bleedPx, bleedPx, canvas.width, canvas.height);
  const cropCanvas = MapMergerCrop.cropCanvasTo(canvas, finalBox);
  p.rotated = rotated;
  p.canvasW = canvas.width;
  p.canvasH = canvas.height;
  p.origWmm = wmm;
  p.origHmm = hmm;
  p.cropBox = base;
  p.finalBox = finalBox;
  p.cropCanvas = cropCanvas;
  p.cropWmm = (finalBox.x1 - finalBox.x0) / pxPerMm;
  p.cropHmm = (finalBox.y1 - finalBox.y0) / pxPerMm;
  p.thumb = MapMergerCrop.downscale(canvas, 320);
}

function redoCrops() {
  if (!state.pages.length) return;
  state.pages.forEach(recomputePage);
  renderAll();
  updateSummary();
}

function setImageFormat(p, format) {
  p.imageFormat = format;
  const fmt = IMAGE_FORMATS[format] || IMAGE_FORMATS.A5;
  const scale = Math.max(fmt.w, fmt.h) / Math.max(p.pxW, p.pxH, 1);
  p.wmm = p.pxW * scale;
  p.hmm = p.pxH * scale;
  recomputePage(p);
  renderAll();
  updateSummary();
}

function renderFileList() {
  updateSteps();
  const box = el('fileList');
  box.innerHTML = '';
  if (!state.files.length) return;
  state.files.forEach(f => {
    const row = document.createElement('div');
    row.className = 'file-row';
    const count = state.pages.filter(p => p.srcId === f.id).length;
    const label = document.createElement('span');
    label.textContent = f.name + ' · ' + count + ' ' + (f.kind === 'pdf' ? t('pdfLoaded') : t('imgLoaded')).toLowerCase();
    const rm = document.createElement('button');
    rm.className = 'bg btn-sm';
    rm.textContent = '×';
    rm.title = t('removeFile');
    rm.addEventListener('click', () => removeFile(f.id));
    row.appendChild(label);
    row.appendChild(rm);
    box.appendChild(row);
  });
}

function isOversized(p) {
  const oneToOne = state.options.keepOriginal || state.options.repeat;
  return oneToOne && (p.cropWmm > MapMergerExport.A4.w + 0.001 || p.cropHmm > MapMergerExport.A4.h + 0.001);
}

function mirrorSheet(sheet) {
  return {
    cells: sheet.cells.map(c => c ? Object.assign({}, c, { canvas: MapMergerCrop.flipCanvasH(c.canvas), mirrored: true }) : null),
    layout: sheet.layout,
    count: sheet.count,
    aspect: sheet.aspect,
    mapW: sheet.mapW,
    mapH: sheet.mapH,
  };
}

function maxRepeatN() {
  if (!state.options.repeat || !state.pages.length) return 24;
  return Math.min(...state.pages.map(p => MapMergerExport.maxRepeatCopies(p.cropWmm, p.cropHmm)));
}

function buildSheetModel() {
  if (!state.pages.length) return [];
  if (state.options.repeat) {
    const sheets = [];
    state.pages.forEach(p => {
      const maxN = MapMergerExport.maxRepeatCopies(p.cropWmm, p.cropHmm);
      const n = Math.min(maxN, Math.max(1, Math.floor(Number(state.options.repeatN)) || 1));
      const cell = { canvas: p.cropCanvas, wmm: p.cropWmm, hmm: p.cropHmm, pageId: p.id, mirrored: false };
      const cells = [];
      for (let i = 0; i < n; i++) cells.push(cell);
      const front = { cells, layout: 'grid', count: n, aspect: p.cropWmm / p.cropHmm, mapW: p.cropWmm, mapH: p.cropHmm };
      if (state.options.mirror && state.options.mirrorOnly) sheets.push(mirrorSheet(front));
      else if (state.options.mirror) sheets.push(front, mirrorSheet(front));
      else sheets.push(front);
    });
    return sheets;
  }
  const pairs = MapMergerExport.chunkPages(state.pages, 2);
  const sheets = [];
  pairs.forEach(pair => {
    const front = {
      cells: pair.cells.map(p => p ? { canvas: p.cropCanvas, wmm: p.cropWmm, hmm: p.cropHmm, pageId: p.id, mirrored: false } : null),
      layout: 'stack',
      count: 2,
    };
    if (state.options.mirror) {
      if (state.options.mirrorOnly) sheets.push(mirrorSheet(front));
      else sheets.push(front, mirrorSheet(front));
    } else {
      sheets.push(front);
    }
  });
  return sheets;
}

function sheetSourceLabel(pageId) {
  const p = state.pages.find(p => p.id === pageId);
  if (!p) return '';
  return p.kind === 'pdf' ? p.srcName + ' · ' + p.pageNo : p.srcName;
}

function countSheets() {
  const n = state.pages.length;
  if (!n) return 0;
  if (state.options.repeat) return n * (state.options.mirror && !state.options.mirrorOnly ? 2 : 1);
  const pairs = Math.ceil(n / 2);
  if (state.options.mirror) return pairs * (state.options.mirrorOnly ? 1 : 2);
  return pairs;
}

function renderAll() {
  renderPages();
  renderSheets();
}

function renderPages() {
  const box = el('pageList');
  box.innerHTML = '';
  if (!state.pages.length) {
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.textContent = t('emptyHint');
    box.appendChild(hint);
    return;
  }
  state.pages.forEach(p => {
    const wrap = document.createElement('div');
    wrap.className = 'page-item' + (p.id === state.selectedId ? ' selected' : '');
    const cv = document.createElement('canvas');
    cv.width = p.thumb.width;
    cv.height = p.thumb.height;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(p.thumb, 0, 0);
    const sc = p.thumb.width / p.canvasW;
    const crop = p.cropBox, fin = p.finalBox;
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = Math.max(1.5, 2 * sc);
    ctx.strokeRect(crop.x0 * sc, crop.y0 * sc, (crop.x1 - crop.x0) * sc, (crop.y1 - crop.y0) * sc);
    if (fin.x0 !== crop.x0 || fin.x1 !== crop.x1 || fin.y0 !== crop.y0 || fin.y1 !== crop.y1) {
      ctx.strokeStyle = '#27ae60';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(fin.x0 * sc, fin.y0 * sc, (fin.x1 - fin.x0) * sc, (fin.y1 - fin.y0) * sc);
    }
    const cap = document.createElement('div');
    cap.className = 'page-cap' + (isOversized(p) ? ' warn' : '');
    const key = p.kind === 'pdf' ? 'pageCaption' : 'pageCaptionImg';
    cap.textContent = t(key, {
      file: p.srcName,
      no: p.pageNo,
      fmt: p.imageFormat || '',
      ow: Math.round(p.origWmm * 10) / 10,
      oh: Math.round(p.origHmm * 10) / 10,
      w: Math.round(p.cropWmm * 10) / 10,
      h: Math.round(p.cropHmm * 10) / 10,
    });
    if (isOversized(p)) cap.textContent = '⚠ ' + cap.textContent;
    if (p.kind === 'image') {
      const frow = document.createElement('div');
      frow.style.display = 'flex';
      frow.style.alignItems = 'center';
      frow.style.gap = '4px';
      const lbl = document.createElement('span');
      lbl.textContent = t('imageFormat') + ':';
      const sel = document.createElement('select');
      ['A5', 'A6', 'A7'].forEach(f => {
        const o = document.createElement('option');
        o.value = f;
        o.textContent = f;
        if (f === p.imageFormat) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('click', ev => ev.stopPropagation());
      sel.addEventListener('change', ev => { ev.stopPropagation(); setImageFormat(p, ev.target.value); });
      frow.appendChild(lbl);
      frow.appendChild(sel);
      wrap.appendChild(frow);
    }
    const rm = document.createElement('button');
    rm.className = 'page-remove';
    rm.textContent = '×';
    rm.title = t('removePage');
    rm.addEventListener('click', ev => {
      ev.stopPropagation();
      removePage(p.id);
    });
    wrap.appendChild(cv);
    wrap.appendChild(cap);
    wrap.appendChild(rm);
    wrap.addEventListener('click', () => {
      state.selectedId = state.selectedId === p.id ? null : p.id;
      renderPages();
      renderSheets();
    });
    box.appendChild(wrap);
  });
}

function removePage(pageId) {
  state.pages = state.pages.filter(p => p.id !== pageId);
  if (state.selectedId === pageId) state.selectedId = null;
  const live = new Set(state.pages.map(p => p.srcId));
  state.files = state.files.filter(f => live.has(f.id));
  renderFileList();
  renderAll();
  updateSummary();
}

function renderSheets() {
  const box = el('sheetList');
  box.innerHTML = '';
  if (!state.pages.length) {
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.textContent = t('emptyHint');
    box.appendChild(hint);
    return;
  }
  const sheets = buildSheetModel();
  const pxPerMm = 2;
  const w = Math.round(MapMergerExport.A4.w * pxPerMm);
  const h = Math.round(MapMergerExport.A4.h * pxPerMm);
  const pRect = MapMergerExport.printableRect(state.options.marginMm);
  const margin = Math.round(pRect.x * pxPerMm);
  const oneToOne = state.options.keepOriginal || state.options.repeat;
  sheets.forEach((sheet, si) => {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-item';
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ececec';
    ctx.fillRect(0, 0, w, margin);
    ctx.fillRect(0, h - margin, w, margin);
    ctx.fillRect(0, 0, margin, h);
    ctx.fillRect(w - margin, 0, margin, h);
    sheet.cells.forEach((cell, ci) => {
      const g = MapMergerExport.cellGeom(ci, sheet.layout, sheet.count, sheet.aspect, sheet.mapW, sheet.mapH);
      const gx = g.x * pxPerMm, gy = g.y * pxPerMm, gw = g.w * pxPerMm, gh = g.h * pxPerMm;
      ctx.strokeStyle = '#d0d0d0';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(gx, gy, gw, gh);
      if (!cell) return;
      const clip = MapMergerExport.clipRectFor(g, state.options.marginMm);
      const r = MapMergerExport.computeCellPlacement(cell.wmm, cell.hmm, { w: clip.w, h: clip.h }, { keepOriginal: oneToOne });
      ctx.save();
      ctx.beginPath();
      ctx.rect(clip.x * pxPerMm, clip.y * pxPerMm, clip.w * pxPerMm, clip.h * pxPerMm);
      ctx.clip();
      ctx.drawImage(cell.canvas, (clip.x + r.x) * pxPerMm, (clip.y + r.y) * pxPerMm, r.w * pxPerMm, r.h * pxPerMm);
      ctx.restore();
      if (cell.pageId === state.selectedId) {
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(gx, gy, gw, gh);
      }
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = '#999';
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    const cap = document.createElement('div');
    cap.className = 'sheet-cap';
    let gridInfo = '';
    if (sheet.layout === 'grid' && sheet.count > 1) {
      const gd = MapMergerExport.gridDims(sheet.count, sheet.aspect, sheet.mapW, sheet.mapH);
      gridInfo = ' · ' + t('repeatCap', { n: sheet.count, cols: gd.cols, rows: gd.rows });
    }
    cap.textContent = t('sheetCaption', { n: si + 1, total: sheets.length }) +
      (sheet.layout === 'grid' && sheet.cells[0] ? ' · ' + sheetSourceLabel(sheet.cells[0].pageId) : '') +
      gridInfo +
      (sheet.cells.some(c => c && c.mirrored) ? t('sheetBack') : '');
    wrap.appendChild(cv);
    wrap.appendChild(cap);
    box.appendChild(wrap);
  });
}

function updateSummary() {
  const pages = state.pages.length;
  const sheets = countSheets();
  const oversize = state.pages.some(isOversized);
  el('summary').textContent = pages ? (t('pages', { n: pages }) + ' · ' + t('sheets', { n: sheets })) : '';
  el('summary').className = oversize ? 'warn' : '';
  if (oversize) el('summary').textContent += ' ⚠ ' + t('warnBig');
  el('optRepeatN').max = String(maxRepeatN());
  el('downloadBtn').disabled = pages === 0 || state.busy;
  updateSteps();
}

function updateSteps() {
  const hasFiles = state.files.length > 0;
  const hasPages = state.pages.length > 0;
  el('stepOptions').style.display = hasFiles ? '' : 'none';
  el('stepSummary').style.display = hasPages ? '' : 'none';
  el('stepDownload').style.display = hasPages ? '' : 'none';
  el('mainSheets').style.display = hasPages ? '' : 'none';
}

function setStatus(msg, cls) {
  const s = el('status');
  s.textContent = msg;
  s.className = cls || '';
}

async function exportPdf() {
  if (!state.pages.length || state.busy) return;
  if (!window.PDFLib) { setStatus(t('pdfLibMissing'), 'err'); return; }
  state.busy = true;
  el('downloadBtn').disabled = true;
  setStatus(t('statusProcessing') + '…');
  try {
    const sheets = buildSheetModel();
    const converted = [];
    for (const sheet of sheets) {
      const row = [];
      for (const cell of sheet.cells) {
        if (!cell) { row.push(null); continue; }
        const png = await MapMergerExport.canvasToPngBytes(cell.canvas);
        row.push({ png, wmm: cell.wmm, hmm: cell.hmm });
      }
      converted.push({ cells: row, layout: sheet.layout, count: sheet.count, aspect: sheet.aspect });
    }
    const bytes = await MapMergerExport.createA4Pdf(converted, {
      keepOriginal: state.options.keepOriginal || state.options.repeat,
      marginMm: state.options.marginMm,
    });
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    a.href = url;
    a.download = 'kartat_merge_A4_' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + '.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setStatus(t('statusReady') + ' ✓');
  } catch (e) {
    console.error(e);
    setStatus(t('errFile') + e.message, 'err');
  } finally {
    state.busy = false;
    el('downloadBtn').disabled = false;
  }
}

function clearAll() {
  state.pages = [];
  state.files = [];
  state.selectedId = null;
  renderFileList();
  renderAll();
  updateSummary();
  setStatus(t('statusIdle'));
}

const easterEgg = { shown: false, clicks: 0, timer: null };

function showEasterEgg(on) {
  easterEgg.shown = on;
  el('easterEggBlock').hidden = !on;
  setStatus(on ? t('easterEggRevealed') : t('easterEggHidden'), 'warn');
}

function secretClick() {
  easterEgg.clicks += 1;
  clearTimeout(easterEgg.timer);
  easterEgg.timer = setTimeout(() => { easterEgg.clicks = 0; }, 3000);
  if (easterEgg.clicks >= 5) {
    easterEgg.clicks = 0;
    showEasterEgg(!easterEgg.shown);
  }
}

function init() {
  const fileInput = el('fileInput');
  const drop = el('dropZone');

  fileInput.addEventListener('change', () => {
    processFiles(fileInput.files);
    fileInput.value = '';
  });

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files) processFiles(e.dataTransfer.files);
  });

  el('optAutoCrop').addEventListener('change', e => { state.options.autoCrop = e.target.checked; redoCrops(); });
  el('optBleed').addEventListener('change', e => { state.options.bleedMm = Number(e.target.value) || 0; redoCrops(); });
  el('optMargin').addEventListener('change', e => { state.options.marginMm = Number(e.target.value); renderSheets(); updateSummary(); });
  el('optAutoRotate').addEventListener('change', e => { state.options.autoRotate = e.target.checked; redoCrops(); });
  el('optKeepOriginal').addEventListener('change', e => { state.options.keepOriginal = e.target.checked; renderAll(); updateSummary(); });
  el('optMirror').addEventListener('change', e => {
    state.options.mirror = e.target.checked;
    el('optMirrorOnly').disabled = !e.target.checked;
    renderSheets();
    updateSummary();
  });
  el('optMirrorOnly').addEventListener('change', e => { state.options.mirrorOnly = e.target.checked; renderSheets(); updateSummary(); });
  el('optRepeat').addEventListener('change', e => {
    state.options.repeat = e.target.checked;
    el('optRepeatN').disabled = !e.target.checked;
    renderAll();
    updateSummary();
  });
  el('optRepeatN').addEventListener('change', e => {
    let n = Math.max(1, Math.floor(Number(e.target.value)) || 1);
    const maxN = maxRepeatN();
    if (n > maxN) {
      n = maxN;
      e.target.value = String(maxN);
      setStatus(t('repeatMax', { n: maxN, max: maxN }), 'warn');
    }
    state.options.repeatN = n;
    renderSheets();
    updateSummary();
  });

  el('clearBtn').addEventListener('click', clearAll);
  el('downloadBtn').addEventListener('click', exportPdf);
  el('langBtn').addEventListener('click', () => { state.lang = state.lang === 'fi' ? 'en' : 'fi'; applyLang(); });

  el('optMirrorOnly').disabled = !state.options.mirror;
  el('optRepeatN').disabled = !state.options.repeat;

  el('optionsHdr').addEventListener('click', secretClick);
  if (new URLSearchParams(location.search).get('easteregg') === '1') showEasterEgg(true);

  applyLang();
}

init();

window.__mapMerger = { state, buildSheetModel, t, get statePages() { return state.pages; } };

