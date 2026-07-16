/* =============================================================================
   utils/dom.js — jsdom DOM harness + IntersectionObserver mock (shared utility)
   Feature: website-animation-ux-polish

   Builds jsdom windows wired with the reference CSS layer and the reference JS
   layer (required directly so the code under test IS the reference source of
   truth), and provides a controllable IntersectionObserver mock (jsdom does not
   implement one) plus a matchMedia mock for reduced-motion emulation.

   DEV-ONLY: lives under tools/motion-tests/; never referenced by any index.html.
   ============================================================================= */

'use strict';

const path = require('path');
const { JSDOM } = require('jsdom');
const cssUtil = require('./css');

const motionJs = require(path.join(__dirname, '..', 'reference', 'motion-system.js'));

/* ---------------------------------------------------------------------------
   Controllable IntersectionObserver mock.
   Records observed/unobserved targets and lets a test synthesize intersection
   events (enter/exit/re-enter) in arbitrary sequences.
   --------------------------------------------------------------------------- */
function makeIntersectionObserverClass() {
  const registry = { instances: [] };

  class MockIntersectionObserver {
    constructor(cb, options) {
      this.cb = cb;
      this.options = options || {};
      this.observed = new Set();
      this.unobserved = [];
      registry.instances.push(this);
    }
    observe(el) { this.observed.add(el); }
    unobserve(el) { this.observed.delete(el); this.unobserved.push(el); }
    disconnect() { this.observed.clear(); }
    // Test helper: fire an intersection event for a set of targets.
    fire(targets, isIntersecting) {
      const entries = targets.map(function (t) {
        return {
          target: t,
          isIntersecting: isIntersecting,
          intersectionRatio: isIntersecting ? 0.5 : 0,
          boundingClientRect: {},
          intersectionRect: {},
          rootBounds: null,
          time: Date.now()
        };
      });
      this.cb(entries, this);
    }
  }
  MockIntersectionObserver.__registry = registry;
  return MockIntersectionObserver;
}

/* ---------------------------------------------------------------------------
   matchMedia mock supporting a live "change" toggle for reduced-motion tests.
   --------------------------------------------------------------------------- */
function makeMatchMedia(initialReduced) {
  const state = { reduced: !!initialReduced, listeners: [] };
  function matchMedia(query) {
    const isReducedQuery = /prefers-reduced-motion\s*:\s*reduce/i.test(query);
    const mql = {
      media: query,
      get matches() { return isReducedQuery ? state.reduced : false; },
      addEventListener: function (type, cb) { if (type === 'change') { state.listeners.push({ mql: mql, cb: cb }); } },
      removeEventListener: function (type, cb) {
        state.listeners = state.listeners.filter(function (l) { return l.cb !== cb; });
      },
      addListener: function (cb) { state.listeners.push({ mql: mql, cb: cb }); },      // legacy
      removeListener: function (cb) { state.listeners = state.listeners.filter(function (l) { return l.cb !== cb; }); }
    };
    return mql;
  }
  matchMedia.__setReduced = function (val) {
    state.reduced = !!val;
    state.listeners.forEach(function (l) { try { l.cb.call(l.mql, l.mql); } catch (e) { /* noop */ } });
  };
  return matchMedia;
}

/**
 * Build a jsdom window for a given body HTML, injecting the reference CSS layer
 * into <head> and providing configurable capability mocks.
 *
 * opts:
 *   reducedMotion  : boolean (default false)
 *   withObserver   : boolean (default true) — whether IntersectionObserver exists
 *   extraHeadCss   : string  — additional CSS appended after the motion layer
 */
function buildWindow(bodyHtml, opts) {
  opts = opts || {};
  const css = cssUtil.readReferenceCss();
  const extraHead = opts.extraHeadCss ? '<style id="page-extra">' + opts.extraHeadCss + '</style>' : '';
  const doc =
    '<!DOCTYPE html><html><head>' +
    '<meta charset="utf-8">' +
    '<style id="motion-system">' + css + '</style>' +
    extraHead +
    '</head><body>' + (bodyHtml || '') + '</body></html>';

  const dom = new JSDOM(doc, { pretendToBeVisual: true, runScripts: 'outside-only' });
  const win = dom.window;

  // matchMedia mock (jsdom's is limited / non-live).
  const matchMedia = makeMatchMedia(opts.reducedMotion);
  win.matchMedia = matchMedia;
  win.__setReduced = matchMedia.__setReduced;

  // IntersectionObserver mock (jsdom has none).
  if (opts.withObserver === false) {
    try { delete win.IntersectionObserver; } catch (e) { win.IntersectionObserver = undefined; }
  } else {
    win.IntersectionObserver = makeIntersectionObserverClass();
  }

  return { dom: dom, window: win, document: win.document };
}

/**
 * Build a jsdom window from a COMPLETE HTML document string (e.g. an enhanced
 * page). Page scripts are not auto-run (runScripts:'outside-only'); we drive the
 * reference motion functions ourselves. Provides the same matchMedia /
 * IntersectionObserver mocks as buildWindow.
 */
function buildWindowFromDocument(html, opts) {
  opts = opts || {};
  const dom = new JSDOM(html, { pretendToBeVisual: true, runScripts: 'outside-only' });
  const win = dom.window;

  const matchMedia = makeMatchMedia(opts.reducedMotion);
  win.matchMedia = matchMedia;
  win.__setReduced = matchMedia.__setReduced;

  if (opts.withObserver === false) {
    try { delete win.IntersectionObserver; } catch (e) { win.IntersectionObserver = undefined; }
  } else {
    win.IntersectionObserver = makeIntersectionObserverClass();
  }
  return { dom: dom, window: win, document: win.document };
}

module.exports = {
  JSDOM,
  motionJs,
  makeIntersectionObserverClass,
  makeMatchMedia,
  buildWindow,
  buildWindowFromDocument
};
