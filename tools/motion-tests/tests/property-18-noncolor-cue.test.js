'use strict';

// Feature: website-animation-ux-polish, Property 18: Interactive and status states carry a non-color cue
// For all interactive or status states affected by the Motion_System (including polished form
// confirmation/error indicators), the state is conveyed by at least one non-color cue (visible text,
// icon, shape, or pattern) in addition to color.
// Validates: Requirements 10.4

const test = require('node:test');
const assert = require('node:assert');
const css = require('../utils/css');
const dom = require('../utils/dom');
const { representativeBody } = require('../utils/fixture');

const cssRoot = css.parse(css.readReferenceCss());

function ruleDecls(re) {
  const out = [];
  cssRoot.walkRules((rule) => {
    if (re.test(rule.selector)) {
      const decls = {};
      rule.walkDecls((d) => { decls[d.prop] = d.value; });
      out.push({ selector: rule.selector, decls: decls });
    }
  });
  return out;
}

// Non-color cues: outline/box-shadow (shape/elevation), transform (shape/position), opacity (visibility).
const NON_COLOR_CUES = new Set(['outline', 'outline-offset', 'box-shadow', 'transform', 'opacity']);

test('Property 18: focus state carries a non-color cue (outline/box-shadow shape) beyond color', () => {
  const focus = ruleDecls(/:focus-visible/);
  assert.ok(focus.length >= 1);
  focus.forEach((r) => {
    const cues = Object.keys(r.decls).filter((p) => NON_COLOR_CUES.has(p));
    assert.ok(cues.length >= 1, 'focus state on ' + r.selector + ' needs a non-color cue, has ' + JSON.stringify(Object.keys(r.decls)));
  });
});

test('Property 18: pressed/active state carries a non-color cue (transform/opacity/elevation)', () => {
  const active = ruleDecls(/:active\b/);
  assert.ok(active.length >= 1);
  active.forEach((r) => {
    const cues = Object.keys(r.decls).filter((p) => NON_COLOR_CUES.has(p));
    assert.ok(cues.length >= 1, 'active state on ' + r.selector + ' needs a non-color cue');
  });
});

test('Property 18: hover state carries a non-color cue', () => {
  const hover = ruleDecls(/:hover\b/);
  assert.ok(hover.length >= 1);
  hover.forEach((r) => {
    const cues = Object.keys(r.decls).filter((p) => NON_COLOR_CUES.has(p));
    assert.ok(cues.length >= 1, 'hover state on ' + r.selector + ' needs a non-color cue');
  });
});

test('Property 18: form status indicator conveys state via text (role="status"), not color alone', () => {
  const h = dom.buildWindow(representativeBody(), { reducedMotion: false, withObserver: true });
  const status = h.window.document.querySelector('[role="status"]');
  assert.ok(status, 'form status region present with role="status" (a text/live-region cue)');
});
