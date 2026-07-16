'use strict';

// Feature: website-animation-ux-polish, Property 2: All configured motion timings fall within their category bands
// For all motion timing tokens emitted by the Motion_System, the resolved value lies within the
// band mandated for its category: entrance in [200,1000]ms, scroll-reveal in [200,600]ms,
// hover/micro-interaction in [150,300]ms, and every interactive-feedback animation <= 500ms.
// Validates: Requirements 2.1, 3.1, 4.1, 7.1, 7.3

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const css = require('../utils/css');

const root = css.parse(css.readReferenceCss());
const tokens = css.extractRootTokens(root);

function ms(name) { return css.timeToMs(css.resolveValue(tokens[name], tokens)); }

test('Property 2: entrance token in [200,1000]ms', () => {
  assert.ok(ms('--mo-entrance') >= 200 && ms('--mo-entrance') <= 1000, 'entrance=' + ms('--mo-entrance'));
});

test('Property 2: scroll-reveal token in [200,600]ms', () => {
  assert.ok(ms('--mo-reveal') >= 200 && ms('--mo-reveal') <= 600, 'reveal=' + ms('--mo-reveal'));
});

test('Property 2: micro-interaction token in [150,300]ms and micro-max <=300ms', () => {
  assert.ok(ms('--mo-micro') >= 150 && ms('--mo-micro') <= 300, 'micro=' + ms('--mo-micro'));
  assert.ok(ms('--mo-micro-max') <= 300, 'micro-max=' + ms('--mo-micro-max'));
});

test('Property 2: interactive-feedback cap <=500ms', () => {
  assert.ok(ms('--mo-feedback-max') <= 500, 'feedback-max=' + ms('--mo-feedback-max'));
});

test('Property 2: entrance/reveal stagger tokens within their bands', () => {
  assert.ok(ms('--mo-entrance-delay') >= 50 && ms('--mo-entrance-delay') <= 300, 'entrance-delay=' + ms('--mo-entrance-delay'));
  assert.ok(ms('--mo-reveal-stagger') >= 50 && ms('--mo-reveal-stagger') <= 150, 'reveal-stagger=' + ms('--mo-reveal-stagger'));
});

// Every non-ambient transition/animation duration introduced by the layer must
// be <= 500ms (interactive-feedback hard cap, Req 7.3). Ambient loops (moDrift/
// moFloat) are intentionally long-running decorative cycles and excluded.
test('Property 2: all non-ambient animated durations are <= 500ms; band membership holds for every parsed segment', () => {
  const transitions = css.extractTransitions(root, tokens).filter((t) => !isNaN(t.durationMs));
  const animations = css.extractAnimations(root, tokens)
    .filter((a) => a.name && !isNaN(a.durationMs));

  // fast-check drives selection across all parsed declarations for coverage.
  const allDurations = []
    .concat(transitions.map((t) => ({ kind: 'transition', name: t.selector, ms: t.durationMs, loops: false })))
    .concat(animations.map((a) => ({ kind: 'animation', name: a.name, ms: a.durationMs, loops: a.loops })));

  assert.ok(allDurations.length > 0, 'expected some animated declarations');

  fc.assert(
    fc.property(fc.nat({ max: allDurations.length - 1 }), (i) => {
      const d = allDurations[i];
      const isAmbient = d.loops || /^moDrift$|^moFloat$/.test(d.name);
      if (isAmbient) {
        // ambient loop must sit in [4000,30000]ms (validated fully in Property 15)
        return d.ms >= 4000 && d.ms <= 30000;
      }
      // entrance animation may be up to 1000ms; all other interactive feedback <=500ms
      if (d.kind === 'animation' && /^moRise$|^moFade$/.test(d.name)) {
        return d.ms >= 200 && d.ms <= 1000;
      }
      return d.ms <= 500 && d.ms >= 0;
    }),
    { numRuns: 100 }
  );
});
