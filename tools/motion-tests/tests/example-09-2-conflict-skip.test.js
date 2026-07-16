'use strict';

// Feature: website-animation-ux-polish — Example test 9.2: conflict-skip
// On pages already carrying an equivalent reveal/entrance layer, assert the new layer detects it,
// skips, and sets data-motion-skip + logs the note.
// _Requirements: 1.3, 1.4_

const test = require('node:test');
const assert = require('node:assert');
const dom = require('../utils/dom');
const { runMotionSystem, detectPriorLayer } = dom.motionJs;

// Prior-layer signatures the reference layer defers to.
const PRIOR_STYLE_IDS = ['anim2-layer', 'polish-pass', 'enh-styles'];
const PRIOR_CLASSES = ['anim2-on', 'enh-anim'];

function docWithPriorStyle(id) {
  const body = '<style id="' + id + '"></style><section><div class="reveal">x</div></section>';
  return dom.buildWindow(body, { reducedMotion: false, withObserver: true });
}
function docWithPriorClass(cls) {
  const h = dom.buildWindow('<section><div class="reveal">x</div></section>', { reducedMotion: false, withObserver: true });
  h.window.document.documentElement.classList.add(cls);
  return h;
}

test('9.2: prior style-id layers are detected, skipped, and flagged with data-motion-skip + console note', () => {
  PRIOR_STYLE_IDS.forEach((id) => {
    const h = docWithPriorStyle(id);
    const win = h.window;
    let logged = 0;
    win.console.info = () => { logged++; };
    runMotionSystem(win);
    const root = win.document.documentElement;
    assert.strictEqual(root.getAttribute('data-motion-skip'), id, 'data-motion-skip set to ' + id);
    assert.ok(!root.classList.contains('motion-on'), 'motion gate NOT added when skipping');
    assert.ok(logged >= 1, 'a console note (surfaced indication) is emitted for ' + id);
  });
});

test('9.2: prior gate-class layers are detected and skipped', () => {
  PRIOR_CLASSES.forEach((cls) => {
    const h = docWithPriorClass(cls);
    const win = h.window;
    let logged = 0;
    win.console.info = () => { logged++; };
    runMotionSystem(win);
    const root = win.document.documentElement;
    assert.strictEqual(root.getAttribute('data-motion-skip'), cls);
    assert.ok(!root.classList.contains('motion-on'));
    assert.ok(logged >= 1);
  });
});

test('9.2: with NO prior layer the system runs normally (no skip flag, motion gate added)', () => {
  const h = dom.buildWindow('<section><div class="reveal">x</div></section>', { reducedMotion: false, withObserver: true });
  const win = h.window;
  assert.strictEqual(detectPriorLayer(win.document), null);
  runMotionSystem(win);
  const root = win.document.documentElement;
  assert.strictEqual(root.getAttribute('data-motion-skip'), null);
  assert.ok(root.classList.contains('motion-on'));
});
