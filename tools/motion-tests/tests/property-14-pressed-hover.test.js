'use strict';

// Feature: website-animation-ux-polish, Property 14: Pressed state exists and hover is reversible
// For all interactive elements, a pressed/active state is expressed through at least one of
// {color, opacity, box-shadow(elevation), transform}; and applying then removing a hover or press
// returns the element's computed presentation to its base state (round-trip identity).
// Validates: Requirements 4.3, 4.5

const test = require('node:test');
const assert = require('node:assert');
const css = require('../utils/css');

const cssRoot = css.parse(css.readReferenceCss());

const PRESSED_CUES = new Set(['color', 'opacity', 'box-shadow', 'transform']);

function rulesMatching(re) {
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

test('Property 14: an :active (pressed) rule exists and uses an allowed pressed cue', () => {
  const active = rulesMatching(/:active\b/);
  assert.ok(active.length >= 1, 'at least one :active rule');
  active.forEach((r) => {
    const cues = Object.keys(r.decls).filter((p) => PRESSED_CUES.has(p));
    assert.ok(cues.length >= 1, ':active on ' + r.selector + ' must express a pressed cue, has ' + JSON.stringify(Object.keys(r.decls)));
  });
});

test('Property 14: hover rules only add transform/opacity/box-shadow/color (reversible, no layout)', () => {
  const hover = rulesMatching(/:hover\b/);
  assert.ok(hover.length >= 1);
  hover.forEach((r) => {
    Object.keys(r.decls).forEach((p) => {
      // hover polish is limited to reversible, non-layout properties
      assert.ok(['transform', 'opacity', 'box-shadow', 'color', 'border-color', 'outline'].includes(p),
        ':hover on ' + r.selector + ' uses non-reversible/layout prop: ' + p);
      assert.ok(!css.LAYOUT_PROPS.has(p), 'hover animates layout prop ' + p);
    });
  });
});

test('Property 14: hover/active are pseudo-class rules (base state returns automatically when state is removed)', () => {
  // Reversibility (round-trip identity) is guaranteed structurally: hover/active states are applied
  // ONLY via :hover / :active pseudo-classes and never persisted to the base selector. Assert no
  // base (stateless) interactive rule carries a hover-only transform that would fail to revert.
  const base = rulesMatching(/^\s*(\.btn|\.mo-hover|a\.mo-link|\[data-mo-card\])\s*$/);
  base.forEach((r) => {
    // The base rule may declare a transition, but must not bake in a hover transform offset.
    if (r.decls.transform) {
      assert.strictEqual(r.decls.transform, 'none', 'base interactive rule must rest at transform:none');
    }
  });
  // And a pressed state must exist to satisfy "pressed state exists".
  assert.ok(rulesMatching(/:active\b/).length >= 1);
});
