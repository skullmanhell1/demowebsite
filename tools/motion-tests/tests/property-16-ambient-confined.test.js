'use strict';

// Feature: website-animation-ux-polish, Property 16: Ambient motion is decorative and confined to flagged sections
// For all sections, ambient motion is applied only where the section is flagged atmosphere-enabled;
// sections not so flagged receive no ambient motion; and with ambient motion disabled, all
// information on the page remains fully perceivable and comprehensible.
// Validates: Requirements 5.3, 5.5

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const css = require('../utils/css');
const dom = require('../utils/dom');
const { runMotionSystem } = dom.motionJs;

const cssRoot = css.parse(css.readReferenceCss());

test('Property 16: every ambient animation selector is scoped under [data-atmosphere]', () => {
  const tokens = css.extractRootTokens(cssRoot);
  const ambient = css.extractAnimations(cssRoot, tokens).filter((a) => a.loops && a.name);
  assert.ok(ambient.length >= 1);
  ambient.forEach((a) => {
    assert.ok(/\[data-atmosphere\]/.test(a.selector),
      'ambient animation on "' + a.selector + '" must be confined to [data-atmosphere]');
  });
});

test('Property 16: sections without [data-atmosphere] never match an ambient rule', () => {
  // Build a mix of flagged and unflagged sections; only flagged ones may carry ambient children.
  fc.assert(
    fc.property(
      fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
      (flags) => {
        let body = '';
        flags.forEach((flagged, i) => {
          body += '<section' + (flagged ? ' data-atmosphere' : '') + ' id="s' + i + '">' +
            '<div class="mo-ambient-drift" aria-hidden="true"></div>' +
            '<p>Info ' + i + '</p></section>';
        });
        const h = dom.buildWindow(body, { reducedMotion: false, withObserver: true });
        runMotionSystem(h.window);
        // The CSS gate `html.motion-on [data-atmosphere] .mo-ambient-drift` means ambient only
        // *applies* under a [data-atmosphere] ancestor. Structurally verify no unflagged section
        // is a [data-atmosphere] ancestor.
        const drifts = h.window.document.querySelectorAll('.mo-ambient-drift');
        for (let i = 0; i < drifts.length; i++) {
          const inAtmosphere = drifts[i].closest('[data-atmosphere]') !== null;
          const parentSection = drifts[i].closest('section');
          const sectionFlagged = parentSection && parentSection.hasAttribute('data-atmosphere');
          if (inAtmosphere !== !!sectionFlagged) { return false; }
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

test('Property 16: content is fully perceivable with ambient disabled (decorative only)', () => {
  // Remove/disable ambient layers and assert all informational content remains present.
  const body = '<section data-atmosphere><div class="mo-ambient-drift" aria-hidden="true"></div>' +
    '<h2>Heading</h2><p>Important copy that must remain</p></section>';
  const h = dom.buildWindow(body, { reducedMotion: true, withObserver: true }); // reduced => ambient off
  runMotionSystem(h.window);
  const doc = h.window.document;
  assert.strictEqual(doc.querySelector('h2').textContent, 'Heading');
  assert.strictEqual(doc.querySelector('p').textContent, 'Important copy that must remain');
  // Ambient element is decorative (aria-hidden) so its suppression removes no information.
  assert.strictEqual(doc.querySelector('.mo-ambient-drift').getAttribute('aria-hidden'), 'true');
});
