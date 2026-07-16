/* =============================================================================
   utils/fixture.js — representative annotated fixtures + additive enhancer
   Feature: website-animation-ux-polish

   Because the 13 pages are not yet enhanced, the property tests exercise the
   canonical reference layers against:
     (a) a representative annotated body fixture using every Motion_System hook
         (.mo-entrance, .reveal, .mo-stagger, [data-atmosphere], .btn, .mo-link,
          [data-mo-card], a fenced form), and
     (b) a synthetic "enhanced" page produced by applying the reference layers
         additively to a baseline page's HTML — used by the preservation and
         form tests to prove additive-only behavior now, and ready to validate
         real pages after rollout.

   DEV-ONLY: lives under tools/motion-tests/; never referenced by any index.html.
   ============================================================================= */

'use strict';

const cssUtil = require('./css');
const motionJs = require(require('path').join(__dirname, '..', 'reference', 'motion-system.js'));

/**
 * A representative body that uses every additive Motion_System hook.
 * Mirrors the structure the per-page rollout playbook produces.
 */
function representativeBody() {
  return [
    '<a class="mo-link" href="#main">Skip to content</a>',
    '<nav><a href="#services">Services</a><a href="#book">Book</a></nav>',
    '<header class="hero mo-entrance" data-atmosphere>',
    '  <div class="mo-ambient-drift" aria-hidden="true"></div>',
    '  <h1 data-mo-primary>Welcome</h1>',
    '  <p>Subheading copy</p>',
    '  <a class="btn" href="#book">Book now</a>',
    '</header>',
    '<main id="main">',
    '  <section id="services">',
    '    <h2 class="reveal">Our services</h2>',
    '    <ul class="mo-stagger">',
    '      <li class="reveal" data-mo-card tabindex="0">One</li>',
    '      <li class="reveal" data-mo-card tabindex="0">Two</li>',
    '      <li class="reveal" data-mo-card tabindex="0">Three</li>',
    '    </ul>',
    '  </section>',
    '  <section id="book">',
    '    <form id="bookingForm">',
    '      <input name="nameInput" type="text" required>',
    '      <input name="phoneInput" type="tel" required>',
    '      <select name="serviceSelect" required><option>Cut</option></select>',
    '      <textarea name="notesInput"></textarea>',
    '      <button class="btn" type="submit">Send</button>',
    '      <p role="status" class="form-status"></p>',
    '    </form>',
    '  </section>',
    '</main>',
    '<footer><a class="mo-link" href="#top">Back to top</a></footer>'
  ].join('\n');
}

/**
 * Apply the canonical Motion_System layers to a raw page HTML string, ADDITIVELY:
 *   1. inject <style id="motion-system"> into <head> AFTER existing styles
 *   2. annotate a few existing elements with class hooks (adds classes only;
 *      removes/alters nothing)
 *   3. append the fenced JS IIFE before </body>
 *
 * This models the rollout's additive contract so preservation tests can run now.
 */
function applyReferenceLayers(html) {
  const css = cssUtil.readReferenceCss();
  const styleBlock = '\n<style id="motion-system">\n' + css + '\n</style>\n';
  let out = html;

  // 1. CSS layer: insert right before </head> (after existing styles).
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, styleBlock + '</head>');
  } else {
    out = styleBlock + out;
  }

  // 2. Additive annotation: add a `.reveal` hook to the FIRST <section ...> by
  //    augmenting its class attribute (or adding one). Additive: never removes.
  out = out.replace(/<section\b([^>]*)>/i, function (full, attrs) {
    if (/\bclass\s*=/.test(attrs)) {
      return '<section' + attrs.replace(/class\s*=\s*"([^"]*)"/i, 'class="$1 reveal"') + '>';
    }
    return '<section' + attrs + ' class="reveal">';
  });

  // 3. JS layer: fenced IIFE before </body>.
  const iife = '\n' + motionJs.buildInlineIIFE() + '\n';
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, iife + '</body>');
  } else {
    out = out + iife;
  }
  return out;
}

module.exports = {
  representativeBody,
  applyReferenceLayers
};
