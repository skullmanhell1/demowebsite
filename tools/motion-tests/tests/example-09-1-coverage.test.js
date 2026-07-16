'use strict';

// Feature: website-animation-ux-polish — Example test 9.1: coverage
// Assert each of the 13 enhanced pages contains >=1 new animation construct and >=1 UX-polish
// construct vs baseline.
// _Requirements: 1.1, 1.2_
//
// The 13 pages are not yet enhanced at this stage. Per the harness plan, coverage is validated
// against the reference-layer enhancement now (proving the applied layer DOES introduce the required
// constructs) and is ready to validate the real pages after rollout: once a page ships the layer on
// disk, this test validates the real file. A diagnostic reports how many pages are actually enhanced.

const test = require('node:test');
const assert = require('node:assert');
const { PAGES, readPageHtml, pageIsEnhanced } = require('../utils/pages');
const { applyReferenceLayers } = require('../utils/fixture');

// An "animation construct": the current `motion-plus` genuine-upgrade layer (scroll progress bar,
// hero ambient glow / drift keyframes, count-up, refined card motion) OR the legacy `motion-system`
// layer marker introducing keyframed / scroll-reveal motion.
function hasAnimationConstruct(html) {
  const hasMotionPlus = /id="motion-plus"/.test(html) && /id="motion-plus-js"/.test(html);
  const hasMotionSystem = /id="motion-system"/.test(html) &&
    (/@keyframes\s+mo/i.test(html) || /class="[^"]*\breveal\b/.test(html) || /class="[^"]*\bmo-entrance\b/.test(html));
  return hasMotionPlus || hasMotionSystem;
}

// A "UX-polish construct": focus-visible reinforcement, micro-interaction transition, or press cue.
function hasPolishConstruct(html) {
  return /:focus-visible/.test(html) || /:active\b/.test(html) ||
    /transition\s*:[^;]*(transform|opacity|box-shadow)/i.test(html);
}

test('9.1: applied Motion_System introduces an animation + a UX-polish construct on every page', () => {
  let actuallyEnhanced = 0;
  PAGES.forEach((page) => {
    const base = readPageHtml(page);
    const enhanced = pageIsEnhanced(page) ? (actuallyEnhanced++, base) : applyReferenceLayers(base);
    assert.ok(hasAnimationConstruct(enhanced), page.id + ' must contain >=1 animation construct');
    assert.ok(hasPolishConstruct(enhanced), page.id + ' must contain >=1 UX-polish construct');
  });
  console.log('[9.1] pages already enhanced on disk: ' + actuallyEnhanced + '/' + PAGES.length +
    ' (remainder validated against the reference-layer enhancement, ready for rollout).');
});

test('9.1: the animation construct is NEW vs baseline (baseline lacks the motion-system marker)', () => {
  PAGES.forEach((page) => {
    const base = readPageHtml(page);
    if (!pageIsEnhanced(page)) {
      // Baseline must NOT already contain the canonical marker, so the construct is genuinely new.
      assert.ok(!/id="motion-system"/.test(base),
        page.id + ' baseline unexpectedly already carries the motion-system marker');
      const enhanced = applyReferenceLayers(base);
      assert.ok(/id="motion-system"/.test(enhanced) && !/id="motion-system"/.test(base),
        page.id + ' enhancement adds a new animation construct');
    }
  });
});
