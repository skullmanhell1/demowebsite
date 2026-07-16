'use strict';

// Feature: website-animation-ux-polish — Example test 9.4: entrance-interrupt & no-observer edge cases
// Interrupt entrance -> assert final static/visible/interactive state; run with IntersectionObserver
// undefined -> assert content fully visible.
// _Requirements: 2.5, 3.6_

const test = require('node:test');
const assert = require('node:assert');
const dom = require('../utils/dom');
const { runMotionSystem } = dom.motionJs;

test('9.4: entrance interrupted by pointerdown resolves to static, visible, interactive hero', () => {
  const body = '<header class="mo-entrance"><h1 data-mo-primary>Title</h1><p>Sub</p><a class="btn" href="#x">Go</a></header>';
  const h = dom.buildWindow(body, { reducedMotion: false, withObserver: true });
  const win = h.window;
  runMotionSystem(win);
  // interrupt before any animationend
  win.dispatchEvent(new win.Event('pointerdown'));
  const hero = win.document.querySelector('.mo-entrance');
  assert.ok(hero.classList.contains('mo-entrance-done'));
  const kids = hero.children;
  for (let i = 0; i < kids.length; i++) {
    assert.strictEqual(kids[i].style.opacity, '1', 'child ' + i + ' visible');
    assert.strictEqual(kids[i].style.transform, 'none', 'child ' + i + ' untransformed');
    assert.notStrictEqual(kids[i].style.pointerEvents, 'none', 'child ' + i + ' interactive');
  }
});

test('9.4: entrance interrupted by keydown also resolves to terminal state', () => {
  const body = '<header class="mo-entrance"><h1 data-mo-primary>Title</h1><p>Sub</p></header>';
  const h = dom.buildWindow(body, { reducedMotion: false, withObserver: true });
  const win = h.window;
  runMotionSystem(win);
  win.dispatchEvent(new win.Event('keydown'));
  const hero = win.document.querySelector('.mo-entrance');
  assert.ok(hero.classList.contains('mo-entrance-done'));
  Array.from(hero.children).forEach((k) => {
    assert.strictEqual(k.style.opacity, '1');
    assert.strictEqual(k.style.transform, 'none');
  });
});

test('9.4: with IntersectionObserver undefined, all reveal content is fully visible', () => {
  const body = '<section><div class="reveal">One</div><div class="reveal">Two</div><div class="reveal">Three</div></section>';
  const h = dom.buildWindow(body, { reducedMotion: false, withObserver: false });
  const win = h.window;
  assert.strictEqual('IntersectionObserver' in win, false, 'observer removed for this test');
  runMotionSystem(win);
  const reveals = win.document.querySelectorAll('.reveal');
  reveals.forEach((el) => {
    assert.ok(el.classList.contains('in-view'), 'reveal element is visible without observer');
    assert.ok(el.textContent.trim().length > 0, 'content still present');
  });
});

test('9.4: JS layer fails silent on unexpected error, leaving the document intact', () => {
  const body = '<section><div class="reveal">content</div></section>';
  const h = dom.buildWindow(body, { reducedMotion: false, withObserver: true });
  const win = h.window;
  // Force a throw inside setup by making querySelectorAll blow up once.
  const origQSA = win.document.querySelectorAll.bind(win.document);
  let thrown = false;
  win.document.querySelectorAll = function () {
    if (!thrown) { thrown = true; throw new Error('boom'); }
    return origQSA.apply(win.document, arguments);
  };
  // Should not throw out of runMotionSystem (top-level try/catch).
  assert.doesNotThrow(() => runMotionSystem(win));
  win.document.querySelectorAll = origQSA;
  // Document content remains intact/visible.
  assert.ok(win.document.querySelector('.reveal').textContent.includes('content'));
});
