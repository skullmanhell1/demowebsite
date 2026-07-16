'use strict';

// Feature: website-animation-ux-polish — Example test 9.3: contact-form behavior equivalence guard (CRITICAL)
// Simulate valid and invalid submissions before and after enhancement; assert identical validation
// outcomes, identical destination, identical success/error indications, and no submission on invalid
// input. This is the "email thing still works" regression guard.
// Validates: Requirements 8.2, 8.3

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const dom = require('../utils/dom');
const { formFixtureBody, installSubmitHandler, simulateSubmit } = require('../utils/form-model');
const { applyReferenceLayers } = require('../utils/fixture');
const { runMotionSystem } = dom.motionJs;

// Build a BASELINE doc (form + its own handler, no motion).
function baselineDoc() {
  const h = dom.buildWindow(formFixtureBody(), { reducedMotion: false, withObserver: true });
  const state = installSubmitHandler(h.window);
  return { win: h.window, state: state };
}

// Build an ENHANCED doc: same form + same handler, PLUS the Motion_System layers, with
// runMotionSystem executed (motion is live). The full-document path exercises the fenced IIFE
// context the pages will ship.
function enhancedDoc() {
  const baseHtml = '<!DOCTYPE html><html><head></head><body>' + formFixtureBody() + '</body></html>';
  const enhancedHtml = applyReferenceLayers(baseHtml);
  const h = dom.buildWindowFromDocument(enhancedHtml, { reducedMotion: false, withObserver: true });
  const state = installSubmitHandler(h.window);
  runMotionSystem(h.window); // motion layer runs; must not touch the form
  return { win: h.window, state: state };
}

const VALID_INPUT = { nameInput: 'Ada', phoneInput: '0400000000', serviceSelect: 'gel', notesInput: 'hi' };

test('9.3: VALID submission behaves identically before and after enhancement', () => {
  const base = baselineDoc();
  const enh = enhancedDoc();
  const b = simulateSubmit(base.win, VALID_INPUT, base.state);
  const e = simulateSubmit(enh.win, VALID_INPUT, enh.state);
  assert.deepStrictEqual(e, b, 'valid submission outcome must be identical');
  assert.ok(b.sent && b.valid, 'valid input is sent in baseline');
  assert.ok(e.sent && e.valid, 'valid input is sent after enhancement');
  assert.strictEqual(e.destination, b.destination, 'same destination');
  assert.strictEqual(e.confirmationText, b.confirmationText, 'same success indication');
});

test('9.3: INVALID submissions are rejected identically and never sent (before == after)', () => {
  // Missing required fields in various combinations.
  const invalidInputs = [
    { nameInput: '', phoneInput: '', serviceSelect: '', notesInput: '' },
    { nameInput: 'Ada', phoneInput: '', serviceSelect: 'gel', notesInput: '' },
    { nameInput: '', phoneInput: '0400', serviceSelect: 'gel', notesInput: 'x' },
    { nameInput: 'Ada', phoneInput: '0400', serviceSelect: '', notesInput: 'x' }
  ];
  invalidInputs.forEach((input) => {
    const base = baselineDoc();
    const enh = enhancedDoc();
    const b = simulateSubmit(base.win, input, base.state);
    const e = simulateSubmit(enh.win, input, enh.state);
    assert.deepStrictEqual(e, b, 'invalid submission outcome identical for ' + JSON.stringify(input));
    assert.ok(!b.sent && !b.valid && b.rejected, 'baseline rejects invalid input without sending');
    assert.ok(!e.sent && !e.valid && e.rejected, 'enhanced rejects invalid input without sending');
    assert.strictEqual(e.confirmationText, '', 'no success indication on invalid input');
  });
});

test('9.3: property — for arbitrary field fills, validity/sent/destination match before vs after', () => {
  fc.assert(
    fc.property(
      fc.record({
        nameInput: fc.string({ maxLength: 12 }),
        phoneInput: fc.string({ maxLength: 12 }),
        serviceSelect: fc.constantFrom('', 'gel'),
        notesInput: fc.string({ maxLength: 12 })
      }),
      (input) => {
        const base = baselineDoc();
        const enh = enhancedDoc();
        const b = simulateSubmit(base.win, input, base.state);
        const e = simulateSubmit(enh.win, input, enh.state);
        return b.valid === e.valid && b.sent === e.sent &&
               b.rejected === e.rejected && b.destination === e.destination &&
               b.confirmationText === e.confirmationText;
      }
    ),
    { numRuns: 100 }
  );
});
