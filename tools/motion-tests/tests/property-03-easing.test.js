'use strict';

// Feature: website-animation-ux-polish, Property 3: Interactive-feedback easing is always non-linear
// For all micro-interaction and interactive-feedback transitions/animations introduced by the
// Motion_System, the timing function is a non-linear curve (cubic-bezier / ease* family) and is
// never linear (nor a constant-rate steps equivalent).
// Validates: Requirements 7.2

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const css = require('../utils/css');

const root = css.parse(css.readReferenceCss());
const tokens = css.extractRootTokens(root);

// Interactive-feedback transitions are those on interactive selectors (.btn, .mo-hover,
// a.mo-link, [data-mo-card]) plus the reveal/entrance transitions. Ambient loops use
// ease-in-out (still non-linear) but are decorative; we include them and assert non-linear too.
test('Property 3: easing tokens are non-linear cubic-bezier curves', () => {
  const easeOut = css.resolveValue(tokens['--mo-ease-out'], tokens);
  const easeStd = css.resolveValue(tokens['--mo-ease-standard'], tokens);
  assert.ok(css.isNonLinearTimingFunction(easeOut), '--mo-ease-out is non-linear: ' + easeOut);
  assert.ok(css.isNonLinearTimingFunction(easeStd), '--mo-ease-standard is non-linear: ' + easeStd);
  assert.ok(/^cubic-bezier\(/.test(easeOut));
  assert.ok(/^cubic-bezier\(/.test(easeStd));
});

test('Property 3: every transition with an explicit timing function is non-linear', () => {
  const transitions = css.extractTransitions(root, tokens).filter((t) => t.timingFunction);
  assert.ok(transitions.length > 0, 'expected transitions with timing functions');
  fc.assert(
    fc.property(fc.nat({ max: transitions.length - 1 }), (i) => {
      return css.isNonLinearTimingFunction(transitions[i].timingFunction);
    }),
    { numRuns: 100 }
  );
});

test('Property 3: every keyframe animation with a timing function is non-linear (never linear/steps)', () => {
  const animations = css.extractAnimations(root, tokens).filter((a) => a.name && a.timingFunction);
  assert.ok(animations.length > 0, 'expected animations with timing functions');
  animations.forEach((a) => {
    assert.ok(css.isNonLinearTimingFunction(a.timingFunction),
      'animation ' + a.name + ' easing must be non-linear, got ' + a.timingFunction);
    assert.notStrictEqual(a.timingFunction, 'linear');
  });
});

test('Property 3: no interactive declaration uses linear or steps() timing', () => {
  const allTf = []
    .concat(css.extractTransitions(root, tokens).map((t) => t.timingFunction))
    .concat(css.extractAnimations(root, tokens).map((a) => a.timingFunction))
    .filter(Boolean);
  allTf.forEach((tf) => {
    assert.notStrictEqual(tf, 'linear', 'no linear easing allowed');
    assert.ok(!/^steps\(/.test(tf), 'no steps() easing allowed: ' + tf);
  });
});
