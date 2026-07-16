'use strict';

// Feature: website-animation-ux-polish, Property 8: Reduced-motion yields immediate, static, fully accessible content on every page
// For all 13 Target_Pages, when prefers-reduced-motion:reduce is active, every element that
// otherwise carries a motion initial-state is presented at opacity:1 in final position with no
// transform/looping, any residual essential animation <=100ms, and 100% of content/controls remain
// visible in the viewport flow and operable.
// Validates: Requirements 2.4, 3.4, 4.6, 5.4, 6.1, 6.2, 6.3, 10.6

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const css = require('../utils/css');
const dom = require('../utils/dom');
const { PAGES, readPageHtml, pageIsEnhanced } = require('../utils/pages');
const { applyReferenceLayers } = require('../utils/fixture');
const { runMotionSystem, motionSupported } = dom.motionJs;

const cssRoot = css.parse(css.readReferenceCss());

test('Property 8: the reduced-motion @media block neutralizes animation, transition, opacity, transform', () => {
  const blocks = css.extractReducedMotionRules(cssRoot);
  assert.strictEqual(blocks.length, 1, 'exactly one prefers-reduced-motion:reduce block');
  const rules = blocks[0].rules;
  assert.ok(rules.length >= 1);
  // Every rule in the block must force the static, visible, motionless state with !important.
  rules.forEach((rule) => {
    const d = rule.decls;
    ['animation', 'transition', 'opacity', 'transform'].forEach((prop) => {
      assert.ok(d[prop], 'reduced-motion rule missing ' + prop + ' override');
      assert.ok(d[prop].important, prop + ' override must be !important');
    });
    assert.strictEqual(d.animation.value, 'none');
    assert.strictEqual(d.transition.value, 'none');
    assert.strictEqual(d.opacity.value, '1');
    assert.strictEqual(d.transform.value, 'none');
  });
});

test('Property 8: JS gate reports motion NOT supported under reduced-motion', () => {
  const h = dom.buildWindow('<div class="reveal">x</div>', { reducedMotion: true, withObserver: true });
  assert.strictEqual(motionSupported(h.window), false);
});

test('Property 8: for every page under reduced-motion, no motion-on gate is added and reveals are visible', () => {
  fc.assert(
    fc.property(fc.nat({ max: PAGES.length - 1 }), (i) => {
      const page = PAGES[i];
      const baseHtml = readPageHtml(page);
      const html = pageIsEnhanced(page) ? baseHtml : applyReferenceLayers(baseHtml);
      const h = dom.buildWindowFromDocument(html, { reducedMotion: true, withObserver: true });
      runMotionSystem(h.window);
      const root = h.window.document.documentElement;
      // Gate class must NOT be added -> the html.motion-on hidden states never apply,
      // so all content is visible by default (fail-safe resting state).
      if (root.classList.contains('motion-on')) { return false; }
      // Any .reveal elements are explicitly marked visible (defensive in-view).
      const reveals = h.window.document.querySelectorAll('.reveal');
      for (let k = 0; k < reveals.length; k++) {
        if (!reveals[k].classList.contains('in-view')) { return false; }
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

test('Property 8: no residual essential animation exceeds 100ms in the reduced-motion block', () => {
  // The block sets animation/transition to none, so residual duration is 0ms (<=100ms).
  const blocks = css.extractReducedMotionRules(cssRoot);
  blocks[0].rules.forEach((rule) => {
    assert.strictEqual(rule.decls.animation.value, 'none');
    assert.strictEqual(rule.decls.transition.value, 'none');
  });
});
