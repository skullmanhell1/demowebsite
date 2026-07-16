'use strict';

// Feature: website-animation-ux-polish, Property 15: Ambient motion is bounded and seamless
// For all atmosphere-enabled sections, each ambient animation cycle has a duration within [4,30]s,
// loops seamlessly (first and last keyframes coincide), and changes any element's position or
// opacity by no more than 5% of that element's rendered dimension or opacity value per cycle.
// Validates: Requirements 5.1, 5.2

const test = require('node:test');
const assert = require('node:assert');
const css = require('../utils/css');

const cssRoot = css.parse(css.readReferenceCss());
const tokens = css.extractRootTokens(cssRoot);
const keyframes = css.extractKeyframes(cssRoot);

// Ambient animations are the looping (infinite) ones.
const ambientAnimations = css.extractAnimations(cssRoot, tokens).filter((a) => a.loops && a.name);
const AMBIENT_KF = ['moDrift', 'moFloat'];

test('Property 15: ambient cycle duration token and every ambient animation is within [4,30]s', () => {
  const cycleMs = css.timeToMs(css.resolveValue(tokens['--mo-ambient-cycle'], tokens));
  assert.ok(cycleMs >= 4000 && cycleMs <= 30000, 'ambient cycle token = ' + cycleMs + 'ms');
  assert.ok(ambientAnimations.length >= 1, 'expected at least one looping ambient animation');
  ambientAnimations.forEach((a) => {
    assert.ok(a.durationMs >= 4000 && a.durationMs <= 30000,
      'ambient animation ' + a.name + ' duration ' + a.durationMs + 'ms out of [4000,30000]');
  });
});

test('Property 15: ambient keyframes loop seamlessly (0% and 100% steps coincide)', () => {
  AMBIENT_KF.forEach((name) => {
    const steps = keyframes[name];
    assert.ok(steps, 'keyframe ' + name + ' exists');
    const first = steps.find((s) => /(^|[,\s])0%/.test(s.selector) || /\bfrom\b/.test(s.selector));
    const last = steps.find((s) => /(^|[,\s])100%/.test(s.selector) || /\bto\b/.test(s.selector));
    assert.ok(first && last, name + ' has 0% and 100% steps');
    // Seamless: identical declarations at start and end.
    assert.deepStrictEqual(first.decls, last.decls, name + ' first and last keyframes must coincide');
  });
});

test('Property 15: ambient displacement/opacity delta never exceeds 5% per cycle', () => {
  // The ambient shift token caps displacement; keyframes use var(--mo-ambient-shift) (5%) or a
  // calc negation of it, and opacity dips are >= 0.95 (<=5% delta).
  const shift = css.resolveValue(tokens['--mo-ambient-shift'], tokens);
  const shiftPct = parseFloat(shift);
  assert.ok(shiftPct <= 5, 'ambient shift token <= 5%, got ' + shift);

  AMBIENT_KF.forEach((name) => {
    keyframes[name].forEach((step) => {
      // transform translate percentages must resolve to <= 5%
      if (step.decls.transform) {
        const resolved = css.resolveValue(step.decls.transform, tokens);
        const pcts = resolved.match(/-?\d+(?:\.\d+)?%/g) || [];
        pcts.forEach((p) => {
          assert.ok(Math.abs(parseFloat(p)) <= 5, name + ' transform displacement ' + p + ' exceeds 5%');
        });
      }
      // opacity must stay within 5% of 1.0 (i.e. >= 0.95)
      if (step.decls.opacity) {
        const o = parseFloat(step.decls.opacity);
        assert.ok(o >= 0.95 && o <= 1, name + ' opacity ' + o + ' delta exceeds 5%');
      }
    });
  });
});
