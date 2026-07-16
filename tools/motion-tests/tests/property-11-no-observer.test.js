'use strict';

// Feature: website-animation-ux-polish, Property 11: Graceful fallback when visibility detection is unavailable
// For all reveal-targeted elements, when IntersectionObserver is unavailable, the Motion_System
// presents the element in its final, fully visible state (no lingering hidden reveal state).
// Validates: Requirements 3.6

const test = require('node:test');
const fc = require('fast-check');
const dom = require('../utils/dom');
const { runMotionSystem, setupReveal, motionSupported } = dom.motionJs;

test('Property 11: with no IntersectionObserver, motion is treated as unsupported (static path)', () => {
  const h = dom.buildWindow('<div class="reveal">x</div>', { reducedMotion: false, withObserver: false });
  if (motionSupported(h.window) !== false) { throw new Error('expected motion unsupported without observer'); }
});

test('Property 11: runMotionSystem reveals all elements when observer is missing', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10 }), (n) => {
      let items = '';
      for (let i = 0; i < n; i++) { items += '<div class="reveal">c' + i + '</div>'; }
      const h = dom.buildWindow('<section>' + items + '</section>', { reducedMotion: false, withObserver: false });
      runMotionSystem(h.window);
      const reveals = h.window.document.querySelectorAll('.reveal');
      for (let i = 0; i < reveals.length; i++) {
        if (!reveals[i].classList.contains('in-view')) { return false; }
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

test('Property 11: setupReveal directly falls back to revealing everything without an observer', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10 }), (n) => {
      let items = '';
      for (let i = 0; i < n; i++) { items += '<div class="reveal">c' + i + '</div>'; }
      const h = dom.buildWindow('<section>' + items + '</section>', { reducedMotion: false, withObserver: false });
      // Force the html.motion-on gate so the fallback path is the ONLY thing making them visible.
      h.window.document.documentElement.classList.add('motion-on');
      setupReveal(h.window);
      const reveals = h.window.document.querySelectorAll('.reveal');
      for (let i = 0; i < reveals.length; i++) {
        if (!reveals[i].classList.contains('in-view')) { return false; }
      }
      return true;
    }),
    { numRuns: 100 }
  );
});
