'use strict';

// Feature: website-animation-ux-polish, Property 4: Movement and fade animate only compositor-friendly, non-reflow properties
// For all keyframes, transitions, and animated declarations introduced by the Motion_System,
// every property used for movement/fade is drawn exclusively from {transform, opacity}, no
// micro-interaction transitions a layout-affecting property, and non-layout polish is limited to
// {box-shadow, color, border-color, outline}.
// Validates: Requirements 4.4, 11.1

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const css = require('../utils/css');

const root = css.parse(css.readReferenceCss());
const tokens = css.extractRootTokens(root);
const keyframes = css.extractKeyframes(root);

const ALLOWED = new Set([...css.MOVEMENT_FADE_PROPS, ...css.POLISH_PROPS]);

test('Property 4: every keyframe animates only transform/opacity (movement & fade)', () => {
  const names = Object.keys(keyframes);
  assert.ok(names.length > 0);
  names.forEach((name) => {
    const props = css.keyframeAnimatedProps(keyframes[name]);
    props.forEach((p) => {
      assert.ok(css.MOVEMENT_FADE_PROPS.has(p),
        'keyframe ' + name + ' animates non-compositor property: ' + p);
    });
  });
});

test('Property 4: no transition animates a layout-affecting property', () => {
  const transitions = css.extractTransitions(root, tokens);
  assert.ok(transitions.length > 0);
  fc.assert(
    fc.property(fc.nat({ max: transitions.length - 1 }), (i) => {
      const prop = transitions[i].property;
      if (prop === 'all' || prop === 'none') { return false; } // never blanket-animate
      return !css.LAYOUT_PROPS.has(prop) && ALLOWED.has(prop);
    }),
    { numRuns: 100 }
  );
});

test('Property 4: every transitioned property is compositor-friendly or non-layout polish', () => {
  const transitions = css.extractTransitions(root, tokens);
  const seen = new Set();
  transitions.forEach((t) => {
    seen.add(t.property);
    assert.ok(ALLOWED.has(t.property),
      'transition property "' + t.property + '" on ' + t.selector + ' is not in the allowed set');
    assert.ok(!css.LAYOUT_PROPS.has(t.property), 'layout prop transitioned: ' + t.property);
  });
  // movement/fade must be represented
  assert.ok(seen.has('transform') && seen.has('opacity'));
});

test('Property 4: raw CSS contains no animation/transition of width/height/top/left/margin/padding', () => {
  // Defensive scan over the whole layer for accidental layout animation.
  const cssText = css.readReferenceCss();
  const badTransition = /transition[^;{}]*\b(width|height|top|left|right|bottom|margin|padding)\b/i;
  assert.ok(!badTransition.test(cssText), 'found a transition on a layout-affecting property');
  // keyframes already validated above; assert no keyframe step names a layout prop
  Object.keys(keyframes).forEach((name) => {
    css.keyframeAnimatedProps(keyframes[name]).forEach((p) => {
      assert.ok(!css.LAYOUT_PROPS.has(p), 'keyframe ' + name + ' animates layout prop ' + p);
    });
  });
});
