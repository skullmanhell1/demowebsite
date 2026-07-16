/* =============================================================================
   Motion_System — Canonical JS layer (reference template)
   Feature: website-animation-ux-polish

   This file is the single source of truth for the guarded IIFE that is copied,
   fenced, into each Target_Page before </body> as:

     <!-- MOTION-SYSTEM:START -->
     <script id="motion-system-js"> (function(){ ... })(); </script>
     <!-- MOTION-SYSTEM:END -->

   It is authored as an ES-module-exportable source (functions are exported for
   unit / property testing under jsdom) that ALSO serializes to that fenced
   inline IIFE via `buildInlineIIFE()` — so the shipped inline code is exactly
   the code under test (no drift).

   DEV-ONLY: lives under tools/motion-tests/ and is never linked by any shipped
   index.html; only its serialized IIFE text is embedded inline per page.

   Requirements: 1.3, 1.4, 2.2, 2.3, 2.5, 3.2, 3.6, 6.2, 6.4, 7.5,
                 8.1, 8.4, 8.5

   --- formFence discipline (Req 8.1, 8.4, 8.5) --------------------------------
   The runtime layer MUST NOT:
     * call addEventListener / removeEventListener on any <form> or form control
     * mutate any form/control attribute (name, type, required, action, method…)
     * reassign onsubmit or otherwise touch submit handling
   It only reads structure for prior-layer detection. Any visual polish on form
   controls is delivered by the CSS layer as presentation-only rules.
   ============================================================================= */

'use strict';

/* -----------------------------------------------------------------------------
   Pure helper: clampDuration
   Total, bounded, idempotent clamp into the permitted [150, 500] ms band.
   (Property 1 / Req 7.5)
   --------------------------------------------------------------------------- */
function clampDuration(ms) {
  var MIN = 150;
  var MAX = 500;
  var n = Number(ms);
  if (isNaN(n) || !isFinite(n)) { return MIN; }
  if (n < MIN) { return MIN; }
  if (n > MAX) { return MAX; }
  return n;
}

/* -----------------------------------------------------------------------------
   Pure helper: computeStaggerDelays
   Given a group size and a per-step interval (ms), returns strictly increasing
   start offsets with the first (primary) element at 0. Used by both the
   entrance ordering and sibling scroll-reveal spacing. (Property 6 / Req 2.2, 3.3)
   --------------------------------------------------------------------------- */
function computeStaggerDelays(count, stepMs) {
  var out = [];
  var step = Number(stepMs) || 0;
  for (var i = 0; i < count; i++) { out.push(i * step); }
  return out;
}

/* -----------------------------------------------------------------------------
   Capability + preference gate
   Motion is allowed only when the user has NOT requested reduced motion AND
   IntersectionObserver is available. (Req 3.6, 6.x)
   --------------------------------------------------------------------------- */
function motionSupported(win) {
  try {
    var mq = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)');
    var reduced = !!(mq && mq.matches);
    var hasObserver = ('IntersectionObserver' in win);
    return !reduced && hasObserver;
  } catch (e) {
    return false;
  }
}

/* -----------------------------------------------------------------------------
   Prior-layer detection (Req 1.3 / 1.4)
   If an equivalent reveal/entrance layer already exists on the page, this layer
   defers: it marks documentElement with data-motion-skip and emits a console
   note (the "surfaced indication") rather than double-wiring behavior.
   --------------------------------------------------------------------------- */
function detectPriorLayer(doc) {
  var root = doc.documentElement;
  // Known prior additive layers in this repo + generic reveal markers.
  var priorStyleIds = ['anim2-layer', 'polish-pass', 'enh-styles'];
  for (var i = 0; i < priorStyleIds.length; i++) {
    if (doc.getElementById(priorStyleIds[i])) { return priorStyleIds[i]; }
  }
  var priorClasses = ['anim2-on', 'enh-anim'];
  for (var j = 0; j < priorClasses.length; j++) {
    if (root.classList.contains(priorClasses[j])) { return priorClasses[j]; }
  }
  return null;
}

/* -----------------------------------------------------------------------------
   revealController
   Single IntersectionObserver (~0.1 threshold). On first intersection: apply a
   sibling stagger transition-delay, add .in-view, then unobserve => fire-once
   (Property 5 / Req 3.2). Hidden state is opacity/transform only, never
   display:none / visibility:hidden / aria-hidden (Property 10 / Req 3.5).
   --------------------------------------------------------------------------- */
function setupReveal(win) {
  var doc = win.document;
  var els = doc.querySelectorAll('.reveal');
  if (!els.length) { return; }

  // Graceful fallback: no observer => reveal everything immediately (Req 3.6).
  if (!('IntersectionObserver' in win)) {
    for (var k = 0; k < els.length; k++) { els[k].classList.add('in-view'); }
    return;
  }

  var stepVar = win.getComputedStyle(doc.documentElement).getPropertyValue('--mo-reveal-stagger');
  var stepMs = parseFloat(stepVar) || 90;

  var io = new win.IntersectionObserver(function (entries) {
    // Group entries intersecting together so their stagger is deterministic.
    var revealing = [];
    for (var e = 0; e < entries.length; e++) {
      if (entries[e].isIntersecting) { revealing.push(entries[e].target); }
    }
    for (var r = 0; r < revealing.length; r++) {
      var el = revealing[r];
      // Assign a per-sibling stagger delay for elements entering together.
      var group = el.parentNode ? el.parentNode.querySelectorAll(':scope > .reveal') : [el];
      var idx = 0;
      for (var g = 0; g < group.length; g++) { if (group[g] === el) { idx = g; break; } }
      el.style.transitionDelay = (idx * stepMs) + 'ms';
      el.classList.add('in-view');
      io.unobserve(el); // fire-once
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });

  for (var o = 0; o < els.length; o++) { io.observe(els[o]); }
  return io;
}

/* -----------------------------------------------------------------------------
   entranceController
   The hero entrance is driven by the CSS layer's staggered animation. Here we
   only guarantee the terminal contract: on animationend OR interruption, strip
   residual transforms and ensure interactivity (Property 7 / Req 2.3, 2.5).
   --------------------------------------------------------------------------- */
function setupEntrance(win) {
  var doc = win.document;
  var heroes = doc.querySelectorAll('.mo-entrance');
  if (!heroes.length) { return; }

  function finalize(hero) {
    hero.classList.add('mo-entrance-done');
    var kids = hero.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      el.style.opacity = '1';
      el.style.transform = 'none';
      // never leave motion-added non-interactivity behind
      if (el.style.pointerEvents === 'none') { el.style.pointerEvents = ''; }
    }
  }

  for (var h = 0; h < heroes.length; h++) {
    (function (hero) {
      var last = hero.lastElementChild || hero;
      var done = false;
      var complete = function () { if (done) { return; } done = true; finalize(hero); };
      // Normal completion: the last-staggered child's animation ending.
      last.addEventListener('animationend', complete);
      // Interruption safety net: guarantee terminal state shortly after the
      // maximum possible entrance duration (entrance + stagger budget).
      var budget = 1000 + (hero.children.length * 300) + 120;
      win.setTimeout(complete, budget);
      // Any early user interaction snaps to the final state.
      var onInterrupt = function () { complete(); };
      win.addEventListener('pointerdown', onInterrupt, { once: true });
      win.addEventListener('keydown', onInterrupt, { once: true });
    })(heroes[h]);
  }
}

/* -----------------------------------------------------------------------------
   reducedMotionWatcher
   Live change to reduce => remove motion gating and snap to the static, fully
   visible, interactive state within 100ms, without a reload (Property 9 / Req 6.4).
   --------------------------------------------------------------------------- */
function setupReducedMotionWatcher(win, snapToStatic) {
  if (!win.matchMedia) { return; }
  var mq = win.matchMedia('(prefers-reduced-motion: reduce)');
  var handler = function () {
    if (mq.matches) { snapToStatic(); }
  };
  if (mq.addEventListener) { mq.addEventListener('change', handler); }
  else if (mq.addListener) { mq.addListener(handler); } // legacy Safari
  return handler;
}

function snapToStaticState(win) {
  var doc = win.document;
  var root = doc.documentElement;
  root.classList.remove('motion-on');
  var revealed = doc.querySelectorAll('.reveal');
  for (var i = 0; i < revealed.length; i++) {
    revealed[i].classList.add('in-view');
    revealed[i].style.transitionDelay = '0ms';
  }
  var heroes = doc.querySelectorAll('.mo-entrance');
  for (var h = 0; h < heroes.length; h++) {
    heroes[h].classList.add('mo-entrance-done');
    var kids = heroes[h].children;
    for (var k = 0; k < kids.length; k++) {
      kids[k].style.opacity = '1';
      kids[k].style.transform = 'none';
    }
  }
}

/* -----------------------------------------------------------------------------
   Orchestrator: runMotionSystem
   - documentElement.__motionSystemDone idempotency guard
   - top-level try/catch fail-silent wrapper (Req 3.6, 8.x, 9.x)
   - capability + preference gate; only on success add html.motion-on
   - prior-layer detection => data-motion-skip + console note (Req 1.3/1.4)
   NOTE: binds NO listeners to forms or their controls (formFence, Req 8.x).
   --------------------------------------------------------------------------- */
function runMotionSystem(win) {
  try {
    var doc = win.document;
    var root = doc.documentElement;

    if (root.__motionSystemDone) { return; }
    root.__motionSystemDone = true;

    // Reduced-motion / no-observer => static path; add NO motion classes.
    if (!motionSupported(win)) {
      // Ensure any .reveal elements are fully visible (defensive; CSS already
      // leaves them visible without .motion-on).
      var rev = doc.querySelectorAll('.reveal');
      for (var i = 0; i < rev.length; i++) { rev[i].classList.add('in-view'); }
      // Still watch for a live change AWAY from reduce is not required; but keep
      // watching so a later switch stays static-safe.
      setupReducedMotionWatcher(win, function () { snapToStaticState(win); });
      return;
    }

    // If an equivalent prior layer already covers reveal/entrance, defer.
    var prior = detectPriorLayer(doc);
    if (prior) {
      root.setAttribute('data-motion-skip', prior);
      if (win.console && win.console.info) {
        win.console.info('[motion-system] Prior motion layer "' + prior +
          '" detected — skipping to preserve existing animation (Req 1.3/1.4).');
      }
      return;
    }

    root.classList.add('motion-on');
    setupEntrance(win);
    setupReveal(win);
    setupReducedMotionWatcher(win, function () { snapToStaticState(win); });
  } catch (e) {
    // Fail silent: CSS defaults leave content visible and the form functional.
    if (win && win.console && win.console.warn) {
      win.console.warn('[motion-system] init skipped:', e && e.message);
    }
  }
}

/* -----------------------------------------------------------------------------
   Bootstrap (for the module path / jsdom): run on DOM ready or immediately.
   --------------------------------------------------------------------------- */
function bootMotionSystem(win) {
  var doc = win.document;
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', function () { runMotionSystem(win); });
  } else {
    runMotionSystem(win);
  }
}

/* -----------------------------------------------------------------------------
   Serialization: buildInlineIIFE()
   Stringifies the runtime functions above into the fenced inline IIFE that gets
   pasted into each page. Single source of truth => the shipped code equals the
   tested code.
   --------------------------------------------------------------------------- */
function buildInlineIIFE() {
  var runtimeFns = [
    clampDuration,
    computeStaggerDelays,
    motionSupported,
    detectPriorLayer,
    setupReveal,
    setupEntrance,
    setupReducedMotionWatcher,
    snapToStaticState,
    runMotionSystem
  ];
  var body = runtimeFns.map(function (fn) { return fn.toString(); }).join('\n\n');
  var iife =
    '<!-- MOTION-SYSTEM:START -->\n' +
    '<script id="motion-system-js">\n' +
    '(function(){\n' +
    '  "use strict";\n' +
    '  var win = window;\n' +
    '  try {\n' +
    body + '\n' +
    '    if (document.readyState === "loading") {\n' +
    '      document.addEventListener("DOMContentLoaded", function(){ runMotionSystem(win); });\n' +
    '    } else {\n' +
    '      runMotionSystem(win);\n' +
    '    }\n' +
    '  } catch (e) { /* fail silent: static, fully-visible page remains intact */ }\n' +
    '})();\n' +
    '</' + 'script>\n' +
    '<!-- MOTION-SYSTEM:END -->\n';
  return iife;
}

/* -----------------------------------------------------------------------------
   Exports (Node / ES-module test harness). No-op in the browser IIFE.
   --------------------------------------------------------------------------- */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampDuration: clampDuration,
    computeStaggerDelays: computeStaggerDelays,
    motionSupported: motionSupported,
    detectPriorLayer: detectPriorLayer,
    setupReveal: setupReveal,
    setupEntrance: setupEntrance,
    setupReducedMotionWatcher: setupReducedMotionWatcher,
    snapToStaticState: snapToStaticState,
    runMotionSystem: runMotionSystem,
    bootMotionSystem: bootMotionSystem,
    buildInlineIIFE: buildInlineIIFE
  };
}
