'use strict';

// Feature: website-animation-ux-polish, Property 5: Scroll-reveal fires exactly once per element
// For all observed elements and all sequences of intersection events (enter, exit, re-enter,
// direction reversals), the element transitions to revealed at most once and is unobserved
// after the first reveal, so no re-trigger occurs.
// Validates: Requirements 3.2

const test = require('node:test');
const fc = require('fast-check');
const dom = require('../utils/dom');
const { runMotionSystem } = dom.motionJs;

const RUNS = 150;

// A single .reveal element wrapped so the reveal controller observes it.
function buildRevealDoc() {
  const body = '<section><div class="reveal" id="t">Reveal me</div></section>';
  const h = dom.buildWindow(body, { reducedMotion: false, withObserver: true });
  runMotionSystem(h.window);
  const io = h.window.IntersectionObserver.__registry.instances[0];
  const el = h.window.document.getElementById('t');
  return { io, el, win: h.window };
}

test('Property 5: element reveals at most once across arbitrary enter/exit sequences', () => {
  fc.assert(
    fc.property(
      // arbitrary sequence of intersection booleans (true=enter, false=exit)
      fc.array(fc.boolean(), { minLength: 1, maxLength: 40 }),
      (events) => {
        const { io, el } = buildRevealDoc();
        let revealTransitions = 0;
        let wasInView = el.classList.contains('in-view');

        events.forEach((isIntersecting) => {
          // Only fire for still-observed targets, mirroring a real observer.
          if (io.observed.has(el)) {
            io.fire([el], isIntersecting);
          }
          const nowInView = el.classList.contains('in-view');
          if (nowInView && !wasInView) { revealTransitions++; }
          wasInView = nowInView;
        });

        // At most one reveal transition; once revealed it stays revealed & is unobserved.
        const revealedOnce = revealTransitions <= 1;
        const stableAfter = !el.classList.contains('in-view') || io.unobserved.includes(el);
        return revealedOnce && stableAfter;
      }
    ),
    { numRuns: RUNS }
  );
});

test('Property 5: after a positive intersection the element is unobserved (fire-once)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10 }), (extraEnters) => {
      const { io, el } = buildRevealDoc();
      io.fire([el], true); // first reveal
      const unobservedAfterFirst = io.unobserved.includes(el) && !io.observed.has(el);
      // Any further enters do nothing because it is no longer observed.
      for (let i = 0; i < extraEnters; i++) {
        if (io.observed.has(el)) { io.fire([el], true); }
      }
      return unobservedAfterFirst && el.classList.contains('in-view');
    }),
    { numRuns: RUNS }
  );
});
