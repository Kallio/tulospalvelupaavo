/* crop.js — whitespace detection & cropping helpers for map-merger.
 *
 * Pure pixel functions with no DOM dependencies so they run identically in the
 * browser and under Node tests. Exposed as MapMergerCrop on the global object.
 *
 * White definition (matches the tool spec): a pixel is "background" when it is
 * transparent (alpha === 0) or when R, G and B are all above the threshold
 * (default 245, i.e. RGB > 245). Everything else counts as map content.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MapMergerCrop = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_THRESHOLD = 245;

  /* isWhite(data, i, threshold) — RGBA pixel test, i is the byte offset. */
  function isWhite(data, i, threshold) {
    if (data[i + 3] === 0) return true;                 // transparent = background
    return data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold;
  }

  /* detectContentBBox(data, w, h, threshold)
   *
   * data: Uint8ClampedArray of RGBA pixels (canvas getImageData().data)
   * w, h: canvas dimensions in px
   * threshold: 0–255, pixels with R,G,B all > threshold count as white
   *
   * Returns { x0, y0, x1, y1 } where (x0,y0) is the top-left and (x1,y1) the
   * bottom-right (exclusive) of the tight content box, or null when the whole
   * page is blank.
   */
  function detectContentBBox(data, w, h, threshold) {
    threshold = threshold === undefined ? DEFAULT_THRESHOLD : threshold;
    var minX = w, minY = h, maxX = -1, maxY = -1, found = false;
    var y, x, i;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = (y * w + x) * 4;
        if (!isWhite(data, i, threshold)) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return null;
    return { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 };
  }

  /* expandBBox(bbox, padL, padT, padR, padB, w, h)
   *
   * Grows the box by the given pixel amounts on each side, clamped to the page
   * bounds (0..w, 0..h). Missing pads default to 0. Returns a new bbox object.
   */
  function expandBBox(bbox, padL, padT, padR, padB, w, h) {
    padL = padL || 0; padT = padT || 0; padR = padR || 0; padB = padB || 0;
    var x0 = clamp(Math.floor(bbox.x0 - padL), 0, w);
    var y0 = clamp(Math.floor(bbox.y0 - padT), 0, h);
    var x1 = clamp(Math.ceil(bbox.x1 + padR), 0, w);
    var y1 = clamp(Math.ceil(bbox.y1 + padB), 0, h);
    if (x1 - x0 < 1) x1 = x0 + 1;
    if (y1 - y0 < 1) y1 = y0 + 1;
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  /* pixelsToMm(box, pxPerMm) — convert a pixel box to mm (keeps fractional mm). */
  function pixelsToMm(box, pxPerMm) {
    return {
      x: box.x0 / pxPerMm,
      y: box.y0 / pxPerMm,
      w: (box.x1 - box.x0) / pxPerMm,
      h: (box.y1 - box.y0) / pxPerMm,
    };
  }

  /* pixelBoxFromMm(x, y, w, h, pxPerMm) — mm → pixel box (for canvas crops). */
  function pixelBoxFromMm(x, y, w, h, pxPerMm) {
    return {
      x0: Math.max(0, Math.floor(x * pxPerMm)),
      y0: Math.max(0, Math.floor(y * pxPerMm)),
      x1: Math.ceil((x + w) * pxPerMm),
      y1: Math.ceil((y + h) * pxPerMm),
    };
  }

  /* cropCanvasTo(source, box) — draw the boxed region of source onto a fresh
   * canvas (same pixels, no scaling). Returns the new canvas.
   */
  function cropCanvasTo(source, box) {
    var out = document.createElement('canvas');
    out.width = Math.max(1, box.x1 - box.x0);
    out.height = Math.max(1, box.y1 - box.y0);
    var ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(source, box.x0, box.y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  /* rotateCanvas90(source, clockwise) — rotate the canvas by 90°, returning a
   * new canvas of swapped dimensions.
   */
  function rotateCanvas90(source, clockwise) {
    var out = document.createElement('canvas');
    out.width = source.height;
    out.height = source.width;
    var ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    if (clockwise) {
      ctx.translate(source.height, 0);
      ctx.rotate(Math.PI / 2);
    } else {
      ctx.translate(0, source.width);
      ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(source, 0, 0);
    return out;
  }

  /* flipCanvasH(source) — horizontally mirrored copy (for duplex shine-through). */
  function flipCanvasH(source) {
    var out = document.createElement('canvas');
    out.width = source.width;
    out.height = source.height;
    var ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.translate(source.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, 0);
    return out;
  }

  /* downscale(source, maxDim) — copy scaled so the longest side ≤ maxDim. */
  function downscale(source, maxDim) {
    var scale = Math.min(1, maxDim / Math.max(source.width, source.height));
    var out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(source.width * scale));
    out.height = Math.max(1, Math.round(source.height * scale));
    out.getContext('2d').drawImage(source, 0, 0, out.width, out.height);
    return out;
  }

  return {
    DEFAULT_THRESHOLD: DEFAULT_THRESHOLD,
    isWhite: isWhite,
    detectContentBBox: detectContentBBox,
    expandBBox: expandBBox,
    pixelsToMm: pixelsToMm,
    pixelBoxFromMm: pixelBoxFromMm,
    cropCanvasTo: cropCanvasTo,
    rotateCanvas90: rotateCanvas90,
    flipCanvasH: flipCanvasH,
    downscale: downscale,
  };
});
