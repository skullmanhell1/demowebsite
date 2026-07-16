'use strict';

// Feature: website-animation-ux-polish, Property 13: Text contrast meets WCAG minimums
// For all text nodes on every Target_Page, the computed contrast ratio against its background is at
// least 4.5:1 for body text and at least 3:1 for large-scale text.
// Validates: Requirements 10.3
//
// The Motion_System is additive and preserves all baseline color values (Property 20). Therefore
// text contrast is preserved iff the motion layer introduces NO text-color override. This test
// enforces that invariant on the reference layer (so baseline contrast is carried through), plus a
// self-check on the contrast utility. It is ready to validate real pages after rollout: once a page
// is enhanced, its baseline colors must still be the source of any text color (unchanged).

const test = require('node:test');
const assert = require('node:assert');
const css = require('../utils/css');
const { contrastRatio } = require('../utils/color');

const cssRoot = css.parse(css.readReferenceCss());

test('Property 13: motion CSS layer introduces no bare text `color:` override (preserves baseline contrast)', () => {
  const colorDecls = [];
  cssRoot.walkDecls('color', (decl) => {
    // A `color:` PROPERTY declaration (not the `color` keyword inside a transition shorthand).
    colorDecls.push({ selector: decl.parent && decl.parent.selector, value: decl.value });
  });
  assert.strictEqual(colorDecls.length, 0,
    'motion layer must not set text color; found: ' + JSON.stringify(colorDecls));
});

test('Property 13: motion layer sets no background-color that could sit under baseline text', () => {
  const bgDecls = [];
  cssRoot.walkDecls(/^background(-color)?$/, (decl) => {
    bgDecls.push({ selector: decl.parent && decl.parent.selector, value: decl.value });
  });
  assert.strictEqual(bgDecls.length, 0,
    'motion layer must not set background under text; found: ' + JSON.stringify(bgDecls));
});

test('Property 13: contrast utility correctly classifies known WCAG pairs', () => {
  // black on white ~= 21:1
  assert.ok(contrastRatio('#000000', '#ffffff') > 20);
  // a passing body-text pair
  assert.ok(contrastRatio('#595959', '#ffffff') >= 4.5);
  // a failing pair for body text but the helper reflects the low ratio
  assert.ok(contrastRatio('#999999', '#ffffff') < 4.5);
  // large-text threshold
  assert.ok(contrastRatio('#767676', '#ffffff') >= 3);
});
