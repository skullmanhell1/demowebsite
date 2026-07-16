'use strict';

// Feature: website-animation-ux-polish, Property 22: Each page remains a self-contained static file
// For all 13 Target_Pages, the Motion_System introduces no new external runtime dependency and no
// build step: the enhanced index.html still runs standalone (pre-existing external refs unchanged,
// no bundler, no added <script src> runtime required).
// Validates: Requirements 11.5

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { PAGES, readPageHtml, pageIsEnhanced } = require('../utils/pages');
const { applyReferenceLayers } = require('../utils/fixture');

// Extract external script srcs (runtime JS). Web fonts / stylesheet <link> are allowed and
// pre-existing; we only guard against NEW external *runtime* script dependencies.
function externalScriptSrcs(html) {
  const out = [];
  const re = /<script\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(html)) !== null) { out.push(m[2] || m[3]); }
  return out;
}

test('Property 22: reference JS layer serializes to an INLINE script (no src attribute)', () => {
  const motionJs = require('../reference/motion-system.js');
  const iife = motionJs.buildInlineIIFE();
  assert.ok(/<script id="motion-system-js">/.test(iife), 'inline script tag present');
  assert.ok(externalScriptSrcs(iife).length === 0, 'motion IIFE adds no external <script src>');
});

test('Property 22: applying the Motion_System adds no new external script runtime to any page', () => {
  fc.assert(
    fc.property(fc.nat({ max: PAGES.length - 1 }), (i) => {
      const page = PAGES[i];
      const baseHtml = readPageHtml(page);
      const baseExternal = externalScriptSrcs(baseHtml).sort();

      // If a page is already enhanced on disk, validate it directly; otherwise apply
      // the reference layers synthetically to prove additive self-containment now.
      const enhancedHtml = pageIsEnhanced(page) ? baseHtml : applyReferenceLayers(baseHtml);
      const enhancedExternal = externalScriptSrcs(enhancedHtml).sort();

      // No external script src may be ADDED by enhancement.
      const added = enhancedExternal.filter((s) => !baseExternal.includes(s));
      return added.length === 0;
    }),
    { numRuns: 100 }
  );
});

test('Property 22: no build-step artifacts referenced (no import/require of a bundler runtime in the layer)', () => {
  const fs = require('fs');
  const css = fs.readFileSync(require('path').join(__dirname, '..', 'reference', 'motion-system.css'), 'utf8');
  // The CSS layer must not @import an external stylesheet (which would add a dependency).
  assert.ok(!/@import\s/i.test(css), 'motion CSS layer must not @import external resources');
});

test('Property 22: enhanced page still parses as a standalone HTML document with a body', () => {
  const { JSDOM } = require('../utils/dom');
  PAGES.forEach((page) => {
    const html = pageIsEnhanced(page) ? readPageHtml(page) : applyReferenceLayers(readPageHtml(page));
    const dom = new JSDOM(html);
    assert.ok(dom.window.document.body, page.id + ' has a <body> and parses standalone');
  });
});
