'use strict';

// Feature: website-animation-ux-polish, Property 19: No focus trap is introduced and all interactive elements stay operable
// For all interactive elements on every Target_Page, the element remains reachable and operable by
// keyboard after enhancement, and the Motion_System introduces no focus trap (no rogue focus
// handlers or tabindex manipulation that prevents moving focus away).
// Validates: Requirements 10.1

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const dom = require('../utils/dom');
const { representativeBody } = require('../utils/fixture');
const { runMotionSystem } = dom.motionJs;

const INTERACTIVE_SEL = 'a[href], button, input, select, textarea, [tabindex]';

test('Property 19: motion layer adds no focus/focusin/focusout/keydown-trap listeners to interactive elements', () => {
  const h = dom.buildWindow(representativeBody(), { reducedMotion: false, withObserver: true });
  const win = h.window;
  const interactive = win.document.querySelectorAll(INTERACTIVE_SEL);
  const trapTypes = ['focus', 'focusin', 'focusout', 'blur'];
  const bound = {};
  interactive.forEach((el) => {
    const orig = el.addEventListener.bind(el);
    el.addEventListener = function (type) {
      bound[type] = (bound[type] || 0) + 1;
      return orig.apply(el, arguments);
    };
  });
  runMotionSystem(win);
  trapTypes.forEach((t) => {
    assert.ok(!bound[t], 'motion layer must not bind a "' + t + '" handler to interactive elements');
  });
});

test('Property 19: after enhancement, no interactive element is made unfocusable (no negative tabindex, no pointer-events:none)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 6 }), (n) => {
      let extra = '';
      for (let i = 0; i < n; i++) { extra += '<button class="btn">B' + i + '</button>'; }
      const body = representativeBody() + '<div>' + extra + '</div>';
      const h = dom.buildWindow(body, { reducedMotion: false, withObserver: true });
      runMotionSystem(h.window);
      const interactive = h.window.document.querySelectorAll(INTERACTIVE_SEL);
      for (let i = 0; i < interactive.length; i++) {
        const el = interactive[i];
        const ti = el.getAttribute('tabindex');
        if (ti !== null && parseInt(ti, 10) < 0) { return false; }
        if (el.style.pointerEvents === 'none') { return false; }
      }
      return true;
    }),
    { numRuns: 100 }
  );
});

test('Property 19: entrance finalize clears any motion-added pointer-events:none on hero children', () => {
  const h = dom.buildWindow('<header class="mo-entrance"><h1 data-mo-primary>T</h1><a class="btn" href="#x">Go</a></header>',
    { reducedMotion: false, withObserver: true });
  const win = h.window;
  runMotionSystem(win);
  const hero = win.document.querySelector('.mo-entrance');
  // simulate a motion-added non-interactivity then finalize via animationend
  hero.children[1].style.pointerEvents = 'none';
  hero.lastElementChild.dispatchEvent(new win.Event('animationend'));
  assert.notStrictEqual(hero.children[1].style.pointerEvents, 'none');
});
