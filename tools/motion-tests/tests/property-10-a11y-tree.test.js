'use strict';

// Feature: website-animation-ux-polish, Property 10: Content is in the accessibility tree before it is revealed
// For all elements awaiting scroll-reveal, the element's content remains present and readable to
// assistive technology while hidden for motion — hidden state uses only opacity/transform
// (never display:none, visibility:hidden, or aria-hidden="true").
// Validates: Requirements 3.5

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const css = require('../utils/css');
const dom = require('../utils/dom');
const { runMotionSystem } = dom.motionJs;

const cssRoot = css.parse(css.readReferenceCss());
const cssText = css.readReferenceCss();

test('Property 10: the .reveal hidden-state rule uses only opacity/transform (no display/visibility)', () => {
  let revealRule = null;
  cssRoot.walkRules((rule) => {
    if (/\.reveal\b/.test(rule.selector) && /motion-on/.test(rule.selector) && !/in-view/.test(rule.selector)) {
      const decls = {};
      rule.walkDecls((d) => { decls[d.prop] = d.value; });
      if ('opacity' in decls || 'transform' in decls) { revealRule = decls; }
    }
  });
  assert.ok(revealRule, 'found the html.motion-on .reveal hidden-state rule');
  assert.strictEqual(revealRule.opacity, '0');
  assert.ok('transform' in revealRule);
  assert.ok(!('display' in revealRule), 'reveal hidden state must not use display');
  assert.ok(!('visibility' in revealRule), 'reveal hidden state must not use visibility');
});

test('Property 10: layer never hides reveal content via display:none / visibility:hidden', () => {
  assert.ok(!/\.reveal[^{]*\{[^}]*display\s*:\s*none/i.test(cssText));
  assert.ok(!/\.reveal[^{]*\{[^}]*visibility\s*:\s*hidden/i.test(cssText));
});

test('Property 10: JS never applies aria-hidden / display:none to reveal elements', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 8 }), (n) => {
      let items = '';
      for (let i = 0; i < n; i++) { items += '<div class="reveal">Readable content ' + i + '</div>'; }
      const h = dom.buildWindow('<section>' + items + '</section>', { reducedMotion: false, withObserver: true });
      runMotionSystem(h.window);
      const reveals = h.window.document.querySelectorAll('.reveal');
      for (let i = 0; i < reveals.length; i++) {
        const el = reveals[i];
        if (el.getAttribute('aria-hidden') === 'true') { return false; }
        if (el.style.display === 'none') { return false; }
        if (el.style.visibility === 'hidden') { return false; }
        if (!el.textContent || !el.textContent.trim()) { return false; } // content still present
      }
      return true;
    }),
    { numRuns: 100 }
  );
});
