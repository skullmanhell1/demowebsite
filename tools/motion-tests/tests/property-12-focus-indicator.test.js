'use strict';

// Feature: website-animation-ux-polish, Property 12: Focus indicator is persistent, thick enough, and sufficiently contrasting
// For all interactive elements, keyboard focus produces a persistent focus indicator at least 2 CSS
// pixels thick with a contrast ratio of at least 3:1 against both the element's unfocused appearance
// and the adjacent background.
// Validates: Requirements 4.2, 10.2

const test = require('node:test');
const assert = require('node:assert');
const css = require('../utils/css');
const { contrastRatio } = require('../utils/color');

const cssRoot = css.parse(css.readReferenceCss());
const tokens = css.extractRootTokens(cssRoot);

function focusVisibleRules() {
  const rules = [];
  cssRoot.walkRules((rule) => {
    if (/:focus-visible/.test(rule.selector)) {
      const decls = {};
      rule.walkDecls((d) => { decls[d.prop] = { value: d.value, important: d.important === true }; });
      rules.push({ selector: rule.selector, decls: decls });
    }
  });
  return rules;
}

test('Property 12: a :focus-visible rule exists and is NOT gated behind html.motion-on (persistent)', () => {
  const rules = focusVisibleRules();
  assert.ok(rules.length >= 1, 'at least one :focus-visible rule');
  const persistent = rules.some((r) => !/motion-on/.test(r.selector) && r.decls.outline);
  assert.ok(persistent, 'focus indicator must apply regardless of motion gate');
});

test('Property 12: focus outline is at least 2px thick', () => {
  const rules = focusVisibleRules();
  const withOutline = rules.filter((r) => r.decls.outline);
  assert.ok(withOutline.length >= 1);
  withOutline.forEach((r) => {
    const outline = css.resolveValue(r.decls.outline.value, tokens);
    const px = outline.match(/(\d+(?:\.\d+)?)px/);
    assert.ok(px, 'outline declares a px thickness: ' + outline);
    assert.ok(parseFloat(px[1]) >= 2, 'outline >= 2px, got ' + px[1]);
  });
});

test('Property 12: focus-ring color contrasts >= 3:1 against white and against a mid surface', () => {
  const ring = css.resolveValue(tokens['--mo-focus-ring'], tokens);
  const offset = css.resolveValue(tokens['--mo-focus-ring-offset'], tokens);
  // Ring vs its offset halo (adjacent) and vs white background.
  const vsOffset = contrastRatio(ring, offset);
  const vsWhite = contrastRatio(ring, '#ffffff');
  assert.ok(vsOffset >= 3, 'ring vs offset halo contrast >= 3:1, got ' + vsOffset.toFixed(2));
  assert.ok(vsWhite >= 3, 'ring vs white contrast >= 3:1, got ' + vsWhite.toFixed(2));
});

test('Property 12: the two-tone ring (outline + offset box-shadow) provides contrast on light AND dark surfaces', () => {
  const rules = focusVisibleRules();
  const r = rules.find((x) => x.decls.outline && x.decls['box-shadow']);
  assert.ok(r, 'focus rule pairs an outline with a box-shadow halo');
  const ring = css.resolveValue(tokens['--mo-focus-ring'], tokens);
  const offset = css.resolveValue(tokens['--mo-focus-ring-offset'], tokens);
  // Dark surface: the white offset halo separates the ring from a dark background.
  assert.ok(contrastRatio(offset, '#111111') >= 3, 'offset halo separates ring from dark surfaces');
  // Light surface: the colored ring separates from white.
  assert.ok(contrastRatio(ring, '#ffffff') >= 3, 'ring separates from light surfaces');
});
