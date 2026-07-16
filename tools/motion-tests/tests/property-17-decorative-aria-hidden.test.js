'use strict';

// Feature: website-animation-ux-polish, Property 17: Decorative added elements are hidden from assistive technology
// For all purely decorative elements the Motion_System adds (ambient layers, sheens, overlays), the
// element is marked aria-hidden="true" (or a presentation role) and carries no readable content.
// Validates: Requirements 10.5

const test = require('node:test');
const assert = require('node:assert');
const dom = require('../utils/dom');
const { representativeBody, applyReferenceLayers } = require('../utils/fixture');
const { PAGES, readPageHtml, pageIsEnhanced } = require('../utils/pages');

// Selectors for decorative elements the Motion_System introduces.
const DECORATIVE_SELECTORS = ['.mo-ambient-drift', '.mo-ambient-float', '[data-mo-decor]'];

function assertDecorativeHidden(win) {
  const doc = win.document;
  DECORATIVE_SELECTORS.forEach((sel) => {
    const nodes = doc.querySelectorAll(sel);
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const hidden = el.getAttribute('aria-hidden') === 'true' ||
                     el.getAttribute('role') === 'presentation' ||
                     el.getAttribute('role') === 'none';
      assert.ok(hidden, sel + ' decorative element must be aria-hidden/presentation');
      assert.ok(!el.textContent || !el.textContent.trim(), sel + ' decorative element must carry no readable content');
    }
  });
}

test('Property 17: decorative ambient elements in the representative fixture are aria-hidden with no content', () => {
  const h = dom.buildWindow(representativeBody(), { reducedMotion: false, withObserver: true });
  assertDecorativeHidden(h.window);
});

test('Property 17: convention holds for every page after additive enhancement', () => {
  PAGES.forEach((page) => {
    const html = pageIsEnhanced(page) ? readPageHtml(page) : applyReferenceLayers(readPageHtml(page));
    const h = dom.buildWindowFromDocument(html, { reducedMotion: false, withObserver: true });
    // Any decorative motion element present must be hidden from AT.
    assertDecorativeHidden(h.window);
  });
});
