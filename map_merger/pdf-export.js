/* pdf-export.js — A4 sheet layout & pdf-lib export for map-merger.
 *
 * Placement math (computeCellPlacement, cellGeom, clipRectFor, gridDims,
 * chunkPages) is pure and Node-testable. The PDF writing (createA4Pdf)
 * requires the pdf-lib global (loaded from CDN as a classic script) and only
 * runs in the browser. Exposed as MapMergerExport.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MapMergerExport = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PT_PER_MM = 72 / 25.4;          // pdf points per mm (2.8346…)
  var A4 = { w: 210, h: 297 };        // mm, portrait
  var CELL = { w: 210, h: 148.5 };    // mm, A4 portrait split into two stacked cells
  var MARGIN_MM = 5;                  // default unprintable printer margin (mm, all sides)

  /* normalizeMargin(m) — coerce to a sane mm value (undefined/NaN/negative
   * → MARGIN_MM, clamped so the printable area stays positive). */
  function normalizeMargin(m) {
    if (!(m >= 0)) m = MARGIN_MM;
    return Math.min(m, 99);
  }

  /* printableRect(marginMm) — { x, y, w, h } in mm from the page top-left of
   * the region the printer can actually mark. The margin never affects the
   * layout or scaling of the cells — it only clips (cuts away) whatever map
   * content extends past it. */
  function printableRect(marginMm) {
    var m = normalizeMargin(marginMm);
    return { x: m, y: m, w: A4.w - 2 * m, h: A4.h - 2 * m };
  }

  /* maxRepeatCopies(mapW, mapH) — how many 1:1 copies of a map of the given
   * mm size can sit on one A4 without overlapping. ceil is never used: a copy
   * must fully fit inside its grid cell (210/cols ≥ mapW and 297/rows ≥ mapH),
   * so cols ≤ floor(A4.w/mapW) and rows ≤ floor(A4.h/mapH). This makes it
   * impossible to request more than 2 A5 maps (210×148.5) on one A4. */
  function maxRepeatCopies(mapW, mapH) {
    if (!(mapW > 0) || !(mapH > 0)) return 1;
    var cols = Math.floor(A4.w / mapW);
    var rows = Math.floor(A4.h / mapH);
    return Math.max(1, cols * rows);
  }

  /* gridDims(count, aspect, mapW, mapH) — factor `count` copies into a
   * cols×rows grid covering the full A4 page whose cell aspect (w/h) is
   * closest to `aspect` (the repeated map's crop aspect). rows = ceil(count /
   * cols); the last row may have empty slots.
   *
   * When mapW/mapH are given, only grids whose cells are large enough to hold
   * the map at 1:1 are considered, so copies never overlap or get sliced.
   * count must be ≤ maxRepeatCopies(mapW, mapH) for such a grid to exist;
   * otherwise the aspect-closest grid is returned as a fallback. */
  function gridDims(count, aspect, mapW, mapH) {
    count = Math.max(1, Math.floor(count) || 1);
    aspect = isFinite(aspect) && aspect > 0 ? aspect : CELL.w / CELL.h;
    var fitW = isFinite(mapW) && mapW > 0;
    var fitH = isFinite(mapH) && mapH > 0;
    var best = null, bestScore = Infinity;
    for (var cols = 1; cols <= count; cols++) {
      var rows = Math.ceil(count / cols);
      var cw = A4.w / cols, ch = A4.h / rows;
      if (fitW && cw + 1e-6 < mapW) continue;
      if (fitH && ch + 1e-6 < mapH) continue;
      var score = Math.abs(cw / ch - aspect);
      if (score < bestScore) { bestScore = score; best = { cols: cols, rows: rows }; }
    }
    if (!best) {
      // Fallback (count > maxRepeatCopies): no grid fits 1:1, pick the grid
      // closest to the aspect ratio.
      bestScore = Infinity;
      for (var c2 = 1; c2 <= count; c2++) {
        var r2 = Math.ceil(count / c2);
        var s2 = Math.abs((A4.w / c2) / (A4.h / r2) - aspect);
        if (s2 < bestScore) { bestScore = s2; best = { cols: c2, rows: r2 }; }
      }
    }
    return best;
  }

  /* cellGeom(cellIdx, layout, count, aspect, mapW, mapH) — the full cell rect
   * in mm from the page top-left for one map slot.
   *   layout 'stack': two full-width CELL rows (A4.h / CELL.h = 2), cellIdx
   *     counts top → bottom (y = cellIdx * CELL.h).
   *   layout 'grid':  a gridDims grid across the full page (mapW/mapH keep the
   *     grid large enough for 1:1 copies).
   * The margin is NOT applied to the cell rect itself (the grid/stack is laid
   * out over the full page); it insets the placement target instead — see
   * clipRectFor. */
  function cellGeom(cellIdx, layout, count, aspect, mapW, mapH) {
    layout = layout || 'stack';
    if (layout === 'grid') {
      var g = gridDims(count, aspect, mapW, mapH);
      var cw = A4.w / g.cols, ch = A4.h / g.rows;
      return {
        x: (cellIdx % g.cols) * cw,
        y: Math.floor(cellIdx / g.cols) * ch,
        w: cw,
        h: ch,
      };
    }
    return { x: 0, y: cellIdx * CELL.h, w: CELL.w, h: CELL.h };
  }

  /* clipRectFor(cell, marginMm) — { x, y, w, h } in mm of the intersection
   * between a cell rect and the printable area. This is both the clipping
   * region AND the placement target: every map is scaled to fit inside it and
   * centered there, so maps are pulled toward the center of the sheet and the
   * unprintable edge margin stays clean — nothing is cut off (except 1:1 maps
   * physically larger than the printable area). */
  function clipRectFor(cell, marginMm) {
    var p = printableRect(marginMm);
    var x0 = Math.max(cell.x, p.x), y0 = Math.max(cell.y, p.y);
    var x1 = Math.min(cell.x + cell.w, p.x + p.w), y1 = Math.min(cell.y + cell.h, p.y + p.h);
    return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
  }

  /* computeCellPlacement(imgW, imgH, cell, opts)
   *
   * imgW, imgH: map size in mm (after crop/rotation)
   * cell: { w, h } target rect in mm (defaults to CELL) — callers pass the
   *   printable portion of the cell (printableRect ∩ cell) so maps are
   *   centered within the printable area, never in the unprintable margin.
   * opts.keepOriginal: place at original size (scale 1), centered.
   *   Default is contain: scale down to fit inside the cell preserving aspect,
   *   centered.
   *
   * Returns { x, y, w, h } in mm relative to the cell top-left.
   */
  function computeCellPlacement(imgW, imgH, cell, opts) {
    cell = cell || CELL;
    opts = opts || {};
    var cw = cell.w, ch = cell.h;
    if (!isFinite(imgW) || !isFinite(imgH) || imgW <= 0 || imgH <= 0) {
      return { x: 0, y: 0, w: cw, h: ch, scale: 1 };
    }
    var scale = opts.keepOriginal ? 1 : Math.min(cw / imgW, ch / imgH);
    var w = imgW * scale;
    var h = imgH * scale;
    return { x: (cw - w) / 2, y: (ch - h) / 2, w: w, h: h, scale: scale };
  }

  /* computeCellRect(imgW, imgH, cellIdx, sheet, marginMm, opts)
   *
   * Absolute placement of one map in mm from the page top-left, together with
   * its full cell rect and the target/clip rect (printable ∩ cell).
   * sheet: { layout, count, aspect, mapW, mapH } (stack | grid).
   * The map is centered within printable ∩ cell, so maps on one sheet are
   * pulled together toward the sheet center and never run into the
   * unprintable edge margin.
   * Returns { x, y, w, h, cell, clipX, clipY, clipW, clipH, marginMm }.
   */
  function computeCellRect(imgW, imgH, cellIdx, sheet, marginMm, opts) {
    sheet = sheet || {};
    var cell = cellGeom(cellIdx, sheet.layout, sheet.count, sheet.aspect, sheet.mapW, sheet.mapH);
    var target = clipRectFor(cell, marginMm);
    var place = computeCellPlacement(imgW, imgH, target, opts);
    return {
      x: target.x + place.x,
      y: target.y + place.y,
      w: place.w,
      h: place.h,
      cell: cell,
      clipX: target.x,
      clipY: target.y,
      clipW: target.w,
      clipH: target.h,
      marginMm: normalizeMargin(marginMm),
    };
  }

  /* chunkPages(layouts, perSheet) — group a flat page list into sheets of N
   * (default 2, top cell first). Short final sheet keeps its partial rows.
   * Returns sheet objects { cells, layout: 'stack', count: N }.
   */
  function chunkPages(layouts, perSheet) {
    perSheet = perSheet || 2;
    var sheets = [];
    for (var i = 0; i < layouts.length; i += perSheet) {
      var cells = [];
      for (var j = 0; j < perSheet; j++) cells.push(layouts[i + j] || null);
      sheets.push({ cells: cells, layout: 'stack', count: perSheet });
    }
    return sheets;
  }

  /* canvasToPngBytes(canvas) — Promise<Uint8Array> of the PNG blob. */
  function canvasToPngBytes(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('canvas.toBlob failed'));
        var fr = new FileReader();
        fr.onload = function () { resolve(new Uint8Array(fr.result)); };
        fr.onerror = reject;
        fr.readAsArrayBuffer(blob);
      }, 'image/png');
    });
  }

  /* createA4Pdf(sheets, opts) — build the output PDF with pdf-lib.
   *
   * sheets: array of sheet objects { cells, layout, count, aspect, mapW, mapH };
   *   each cell is either { png: Uint8Array, wmm, hmm } or null (empty slot).
   *   layout 'stack' → two stacked CELL rows; 'grid' → a gridDims grid.
   * opts.keepOriginal: place maps at original size (1:1), centered.
   * opts.marginMm: unprintable printer margin on all sides (default MARGIN_MM).
   *   Each map is scaled to fit and centered within the printable portion of
   *   its cell (printable ∩ cell), so maps on a sheet are pulled together
   *   toward the center and never extend into the unprintable edge margin —
   *   nothing is cut off (the clip operator is kept as a safety net for 1:1
   *   maps physically larger than the printable area).
   *
   * Note: bleed is handled at crop time (the crop box already includes the
   * bleed margin), so nothing extra is needed here.
   *
   * Returns a Promise resolving to the PDF as Uint8Array.
   */
  async function createA4Pdf(sheets, opts) {
    opts = opts || {};
    var PDFLib = (typeof window !== 'undefined' && window.PDFLib) ||
                 (typeof globalThis !== 'undefined' && globalThis.PDFLib);
    if (!PDFLib) throw new Error('pdf-lib not loaded');
    var doc = await PDFLib.PDFDocument.create();
    var pageW = A4.w * PT_PER_MM;               // 595.28 pt
    var pageH = A4.h * PT_PER_MM;               // 841.89 pt
    var marginMm = normalizeMargin(opts.marginMm);
    var keepOriginal = !!opts.keepOriginal;

    var embedAll = sheets.map(function (sheet) {
      return Promise.all(sheet.cells.map(function (cell) {
        if (!cell) return Promise.resolve(null);
        return doc.embedPng(cell.png).then(function (img) {
          return { img: img, wmm: cell.wmm, hmm: cell.hmm };
        });
      }));
    });

    var embeddedSheets = await Promise.all(embedAll);
    embeddedSheets.forEach(function (cells, si) {
      var sheet = sheets[si];
      var page = doc.addPage([pageW, pageH]);
      page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: PDFLib.rgb(1, 1, 1) });
      cells.forEach(function (cell, idx) {
        if (!cell) return;
        var g = cellGeom(idx, sheet.layout, sheet.count, sheet.aspect, sheet.mapW, sheet.mapH);
        // Target & clip: printable ∩ cell. Maps are centered inside this, so
        // they never run into the unprintable margin (pdf-lib y is measured
        // from the page bottom).
        var target = clipRectFor(g, marginMm);
        page.pushOperators(
          PDFLib.pushGraphicsState(),
          PDFLib.rectangle(
            target.x * PT_PER_MM,
            (A4.h - target.y - target.h) * PT_PER_MM,
            target.w * PT_PER_MM,
            target.h * PT_PER_MM
          ),
          PDFLib.clip(),
          PDFLib.endPath()
        );
        // Placement in mm from the page top-left, centered in the printable
        // portion of the cell.
        var r = computeCellPlacement(cell.wmm, cell.hmm, { w: target.w, h: target.h }, { keepOriginal: keepOriginal });
        var xPt = (target.x + r.x) * PT_PER_MM;
        var wPt = Math.max(1, r.w * PT_PER_MM);
        var hPt = Math.max(1, r.h * PT_PER_MM);
        var yPt = (A4.h - (target.y + r.y) - r.h) * PT_PER_MM;
        page.drawImage(cell.img, { x: xPt, y: yPt, width: wPt, height: hPt });
        page.pushOperators(PDFLib.popGraphicsState());
      });
    });
    return doc.save();
  }

  return {
    PT_PER_MM: PT_PER_MM,
    A4: A4,
    CELL: CELL,
    MARGIN_MM: MARGIN_MM,
    normalizeMargin: normalizeMargin,
    printableRect: printableRect,
    maxRepeatCopies: maxRepeatCopies,
    gridDims: gridDims,
    cellGeom: cellGeom,
    clipRectFor: clipRectFor,
    computeCellPlacement: computeCellPlacement,
    computeCellRect: computeCellRect,
    chunkPages: chunkPages,
    canvasToPngBytes: canvasToPngBytes,
    createA4Pdf: createA4Pdf,
  };
});
