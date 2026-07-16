/* =============================================================================
   utils/color.js — WCAG contrast helpers (shared test utility)
   Feature: website-animation-ux-polish

   Minimal, dependency-free sRGB relative-luminance + contrast-ratio helpers used
   by the focus-indicator (Property 12) and text-contrast (Property 13) tests.

   DEV-ONLY: lives under tools/motion-tests/; never referenced by any index.html.
   ============================================================================= */

'use strict';

function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) { h = h.split('').map(function (c) { return c + c; }).join(''); }
  if (h.length === 8) { h = h.slice(0, 6); } // drop alpha
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function parseColor(value) {
  const v = String(value).trim().toLowerCase();
  if (v[0] === '#') { return hexToRgb(v); }
  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1].split(',').map(function (s) { return parseFloat(s); });
    return { r: parts[0], g: parts[1], b: parts[2] };
  }
  const named = { white: '#ffffff', black: '#000000' };
  if (named[v]) { return hexToRgb(named[v]); }
  return null;
}

function relativeLuminance(rgb) {
  const chan = ['r', 'g', 'b'].map(function (k) {
    let c = rgb[k] / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function contrastRatio(colorA, colorB) {
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  if (!a || !b) { return NaN; }
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

module.exports = { hexToRgb, parseColor, relativeLuminance, contrastRatio };
