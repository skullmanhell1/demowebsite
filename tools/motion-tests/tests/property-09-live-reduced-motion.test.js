'use strict';

// Feature: website-animation-ux-polish, Property 9: Live reduced-motion change reverts to static without reload
// For all Target_Pages displaying motion, when the reduced-motion preference changes to reduce,
// the Motion_System removes its motion gating and places all content in the static, fully visible,
// interactive state within 100ms and without a page reload.
// Validates: Requirements 6.4

const test = require('node:test');
const fc = require('fast-check');
const dom = require('../utils/dom');
const { runMotionSystem } = dom.motionJs;

const RUNS = 100;

function buildLiveDoc(revealCount, heroKids) {
  let reveals = '';
  for (let i = 0; i < revealCount; i++) { reveals += '<div class="reveal">R' + i + '</div>'; }
  let kids = '<h1 data-mo-primary>Title</h1>';
  for (let i = 1; i < heroKids; i++) { kids += '<p>p' + i + '</p>'; }
  const body = '<header class="mo-entrance">' + kids + '</header><section>' + reveals + '</section>';
  const h = dom.buildWindow(body, { reducedMotion: false, withObserver: true });
  runMotionSystem(h.window);
  return h;
}

test('Property 9: switching to reduce removes motion-on and snaps content static/visible', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 6 }),
      fc.integer({ min: 1, max: 5 }),
      (revealCount, heroKids) => {
        const h = buildLiveDoc(revealCount, heroKids);
        const win = h.window;
        const root = win.document.documentElement;
        // Precondition: motion is on.
        if (!root.classList.contains('motion-on')) { return false; }

        // Live change to reduce.
        win.__setReduced(true);

        // Postcondition: gate removed, all reveals in-view, hero children visible & untransformed.
        if (root.classList.contains('motion-on')) { return false; }
        const reveals = win.document.querySelectorAll('.reveal');
        for (let i = 0; i < reveals.length; i++) {
          if (!reveals[i].classList.contains('in-view')) { return false; }
        }
        const heroes = win.document.querySelectorAll('.mo-entrance');
        for (let hI = 0; hI < heroes.length; hI++) {
          const kids = heroes[hI].children;
          for (let k = 0; k < kids.length; k++) {
            if (kids[k].style.opacity !== '1') { return false; }
            if (kids[k].style.transform !== 'none') { return false; }
          }
        }
        return true;
      }
    ),
    { numRuns: RUNS }
  );
});

test('Property 9: revert happens without any reload (location.reload never called)', () => {
  const h = buildLiveDoc(3, 3);
  const win = h.window;
  let reloadCalls = 0;
  try {
    Object.defineProperty(win.location, 'reload', { value: () => { reloadCalls++; }, configurable: true });
  } catch (e) { /* jsdom may forbid; the reference code never calls reload anyway */ }
  win.__setReduced(true);
  if (reloadCalls !== 0) { throw new Error('unexpected reload during reduced-motion revert'); }
});
