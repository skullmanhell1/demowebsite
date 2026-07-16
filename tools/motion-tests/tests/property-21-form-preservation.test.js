'use strict';

// Feature: website-animation-ux-polish, Property 21: Contact form shape and handler binding are preserved and untouched by motion
// For all contact/booking forms on every Target_Page, the form's markup structure, complete field
// set (count, names, types, required), submit-handler binding, and destination are identical before
// and after enhancement; and the Motion_System binds no event listeners to any form or its controls
// and mutates none of their functional attributes (only presentation may differ).
// Validates: Requirements 8.1, 8.4, 8.5

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { PAGES, readPageHtml, readBaselineSnapshot, pageIsEnhanced } = require('../utils/pages');
const { applyReferenceLayers, representativeBody } = require('../utils/fixture');
const { buildSnapshotFromHtml, diffForms } = require('../utils/snapshot-diff');
const dom = require('../utils/dom');
const { runMotionSystem } = dom.motionJs;

function enhancedHtmlFor(page) {
  const html = readPageHtml(page);
  return pageIsEnhanced(page) ? html : applyReferenceLayers(html);
}

test('Property 21: FormShape is identical before/after enhancement for every page', () => {
  fc.assert(
    fc.property(fc.nat({ max: PAGES.length - 1 }), (i) => {
      const page = PAGES[i];
      const baseForms = readBaselineSnapshot(page).snapshot.forms;
      const enhForms = buildSnapshotFromHtml(enhancedHtmlFor(page)).forms;
      const violations = diffForms(baseForms, enhForms);
      if (violations.length) { console.error('[Property 21] ' + page.id + ':', violations); }
      return violations.length === 0;
    }),
    { numRuns: 100 }
  );
});

test('Property 21: explicit per-page FormShape equality (field count/names/types/required, handler, destination)', () => {
  PAGES.forEach((page) => {
    const baseForms = readBaselineSnapshot(page).snapshot.forms;
    const enhForms = buildSnapshotFromHtml(enhancedHtmlFor(page)).forms;
    assert.deepStrictEqual(enhForms, baseForms, page.id + ' FormShape changed');
  });
});

test('Property 21: motion layer binds NO listeners to any form or its controls (formFence)', () => {
  fc.assert(
    fc.property(fc.constant(null), () => {
      const h = dom.buildWindow(representativeBody(), { reducedMotion: false, withObserver: true });
      const win = h.window;
      const form = win.document.querySelector('form');
      const controls = form.querySelectorAll('input, select, textarea, button');

      let formBinds = 0;
      let controlBinds = 0;
      const wrap = (el, counter) => {
        const orig = el.addEventListener.bind(el);
        el.addEventListener = function () { counter(); return orig.apply(el, arguments); };
      };
      wrap(form, () => { formBinds++; });
      controls.forEach((c) => wrap(c, () => { controlBinds++; }));

      // Snapshot functional attributes to detect mutation.
      const before = form.outerHTML;

      runMotionSystem(win);

      const after = form.outerHTML;
      return formBinds === 0 && controlBinds === 0 && before === after;
    }),
    { numRuns: 20 }
  );
});

test('Property 21: motion layer never reassigns form.onsubmit nor mutates control functional attrs', () => {
  const h = dom.buildWindow(representativeBody(), { reducedMotion: false, withObserver: true });
  const win = h.window;
  const form = win.document.querySelector('form');
  const onsubmitBefore = form.onsubmit;
  const fieldSig = Array.from(form.querySelectorAll('input,select,textarea')).map((el) => ({
    name: el.getAttribute('name'), type: (el.getAttribute('type') || el.tagName.toLowerCase()),
    required: el.hasAttribute('required')
  }));
  runMotionSystem(win);
  assert.strictEqual(form.onsubmit, onsubmitBefore, 'onsubmit must not be reassigned');
  const fieldSigAfter = Array.from(form.querySelectorAll('input,select,textarea')).map((el) => ({
    name: el.getAttribute('name'), type: (el.getAttribute('type') || el.tagName.toLowerCase()),
    required: el.hasAttribute('required')
  }));
  assert.deepStrictEqual(fieldSigAfter, fieldSig, 'form control functional attributes must be unchanged');
});
