/* =============================================================================
   utils/css.js — CSS parsing + animated-declaration extractor (shared utility)
   Feature: website-animation-ux-polish

   postcss-backed helpers used by the structural-invariant and motion property
   tests to reason about the Motion_System CSS layer: token resolution, keyframe
   extraction, transition/animation parsing, animated-property classification,
   easing detection, and duration parsing.

   DEV-ONLY: lives under tools/motion-tests/; never referenced by any index.html.
   ============================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const REFERENCE_CSS_PATH = path.join(__dirname, '..', 'reference', 'motion-system.css');

function readReferenceCss() {
  return fs.readFileSync(REFERENCE_CSS_PATH, 'utf8');
}

function parse(css) {
  return postcss.parse(css);
}

/* ---------------------------------------------------------------------------
   Token resolution: read :root custom properties into a map, then resolve
   var(--x) / calc(var(--x) * n) references to concrete values where possible.
   --------------------------------------------------------------------------- */
function extractRootTokens(root) {
  const tokens = {};
  root.walkRules(function (rule) {
    if (rule.selector && rule.selector.split(',').some(function (s) { return s.trim() === ':root'; })) {
      rule.walkDecls(function (decl) {
        if (decl.prop.startsWith('--')) { tokens[decl.prop.trim()] = decl.value.trim(); }
      });
    }
  });
  return tokens;
}

/** Resolve a value string that may reference var(--x) and simple calc(var * n). */
function resolveValue(value, tokens, depth) {
  depth = depth || 0;
  if (depth > 10) { return value; }
  let out = value;
  // Resolve calc(var(--x) * n) and calc(--x * n) forms first.
  out = out.replace(/calc\(\s*var\((--[\w-]+)\)\s*\*\s*([\d.]+)\s*\)/g, function (_, name, mult) {
    const base = tokens[name];
    if (base == null) { return _; }
    const resolved = resolveValue(base, tokens, depth + 1);
    const num = parseFloat(resolved);
    const unit = String(resolved).replace(/^[\d.\-]+/, '').trim() || 'ms';
    if (isNaN(num)) { return _; }
    return (num * parseFloat(mult)) + unit;
  });
  // Resolve calc(-1 * var(--x))
  out = out.replace(/calc\(\s*-1\s*\*\s*var\((--[\w-]+)\)\s*\)/g, function (_, name) {
    const base = tokens[name];
    if (base == null) { return _; }
    const resolved = resolveValue(base, tokens, depth + 1);
    const num = parseFloat(resolved);
    const unit = String(resolved).replace(/^[\d.\-]+/, '').trim();
    if (isNaN(num)) { return _; }
    return (-num) + unit;
  });
  // Resolve bare var(--x)
  out = out.replace(/var\((--[\w-]+)\)/g, function (_, name) {
    const base = tokens[name];
    if (base == null) { return _; }
    return resolveValue(base, tokens, depth + 1);
  });
  return out.trim();
}

/** Parse a duration/time token like "200ms" / "12s" into milliseconds. */
function timeToMs(value) {
  if (value == null) { return NaN; }
  const v = String(value).trim();
  const m = v.match(/^(-?[\d.]+)\s*(ms|s)?$/i);
  if (!m) { return NaN; }
  const num = parseFloat(m[1]);
  const unit = (m[2] || 'ms').toLowerCase();
  return unit === 's' ? num * 1000 : num;
}

/* ---------------------------------------------------------------------------
   Keyframes: return { name -> [{ selector, decls: {prop: value} }] }
   --------------------------------------------------------------------------- */
function extractKeyframes(root) {
  const out = {};
  root.walkAtRules(/keyframes/i, function (atRule) {
    const name = atRule.params.trim();
    const steps = [];
    atRule.each(function (step) {
      if (step.type !== 'rule') { return; }
      const decls = {};
      step.walkDecls(function (d) { decls[d.prop.trim()] = d.value.trim(); });
      steps.push({ selector: step.selector.trim(), decls: decls });
    });
    out[name] = steps;
  });
  return out;
}

/**
 * The set of CSS properties a @keyframes rule actually animates
 * (union of all properties declared across its steps).
 */
function keyframeAnimatedProps(steps) {
  const props = new Set();
  steps.forEach(function (s) {
    Object.keys(s.decls).forEach(function (p) { props.add(p); });
  });
  return Array.from(props);
}

/* ---------------------------------------------------------------------------
   Transition parsing.
   A `transition` shorthand list looks like:
     "opacity 200ms cubic-bezier(...), transform 200ms ease"
   We split on top-level commas (not inside parens) and pull out
   { property, duration, timingFunction } per segment.
   --------------------------------------------------------------------------- */
function splitTopLevel(value) {
  const parts = [];
  let depth = 0, cur = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '(') { depth++; }
    if (ch === ')') { depth--; }
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) { parts.push(cur); }
  return parts.map(function (p) { return p.trim(); }).filter(Boolean);
}

const TIMING_FUNCTION_RE = /(cubic-bezier\([^)]*\)|steps\([^)]*\)|ease-in-out|ease-out|ease-in|ease|linear|step-start|step-end)/i;
const TIME_RE = /(-?[\d.]+m?s)\b/i;

function parseTransitionSegment(seg, tokens) {
  const resolved = resolveValue(seg, tokens);
  // First token is the property name.
  const tokensArr = resolved.split(/\s+/);
  const property = tokensArr[0];
  const tf = resolved.match(TIMING_FUNCTION_RE);
  // duration is the FIRST time value in the segment (delay is the 2nd, if any)
  const times = resolved.match(new RegExp(TIME_RE.source, 'gi')) || [];
  return {
    property: property,
    duration: times.length ? times[0] : null,
    durationMs: times.length ? timeToMs(times[0]) : NaN,
    timingFunction: tf ? tf[1].toLowerCase() : null,
    raw: seg.trim()
  };
}

/** Is this node nested inside an @media (prefers-reduced-motion: reduce) block? */
function isInsideReducedMotion(node) {
  let p = node.parent;
  while (p) {
    if (p.type === 'atrule' && /media/i.test(p.name) &&
        /prefers-reduced-motion\s*:\s*reduce/i.test(p.params || '')) {
      return true;
    }
    p = p.parent;
  }
  return false;
}

/**
 * Walk every rule and collect all *active* transition segments introduced by the
 * layer, keyed with the owning selector. By default this excludes the
 * reduced-motion neutralizing block (where `transition: none` disables motion,
 * not animates it) and `none`/`all` shorthand values which are not real animated
 * properties.
 *
 * opts.includeReducedMotion = true  -> also include reduced-motion decls
 * opts.includeNone          = true  -> also include none/all values
 */
function extractTransitions(root, tokens, opts) {
  opts = opts || {};
  const out = [];
  root.walkDecls(/^transition$/i, function (decl) {
    if (!opts.includeReducedMotion && isInsideReducedMotion(decl)) { return; }
    const selector = decl.parent && decl.parent.selector ? decl.parent.selector : '';
    const segs = splitTopLevel(decl.value);
    segs.forEach(function (seg) {
      const parsed = parseTransitionSegment(seg, tokens);
      parsed.selector = selector;
      if (!opts.includeNone && (parsed.property === 'none' || parsed.property === 'all')) { return; }
      out.push(parsed);
    });
  });
  return out;
}

/**
 * Collect `animation` shorthand declarations, resolving name/duration/timing.
 */
function extractAnimations(root, tokens, opts) {
  opts = opts || {};
  const out = [];
  root.walkDecls(/^animation$/i, function (decl) {
    if (!opts.includeReducedMotion && isInsideReducedMotion(decl)) { return; }
    const selector = decl.parent && decl.parent.selector ? decl.parent.selector : '';
    const resolved = resolveValue(decl.value, tokens);
    const tf = resolved.match(TIMING_FUNCTION_RE);
    const times = resolved.match(new RegExp(TIME_RE.source, 'gi')) || [];
    // First bare identifier that is not a keyword is the animation name.
    const words = resolved.replace(/cubic-bezier\([^)]*\)|steps\([^)]*\)/g, ' ').split(/\s+/);
    const keywords = new Set(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear',
      'infinite', 'both', 'forwards', 'backwards', 'normal', 'alternate', 'none',
      'reverse', 'alternate-reverse', 'running', 'paused', '']);
    let name = null;
    for (const w of words) {
      if (!keywords.has(w) && !/^-?[\d.]+m?s$/i.test(w) && !/^\d/.test(w)) { name = w; break; }
    }
    out.push({
      selector: selector,
      name: name,
      duration: times.length ? times[0] : null,
      durationMs: times.length ? timeToMs(times[0]) : NaN,
      timingFunction: tf ? tf[1].toLowerCase() : null,
      loops: /\binfinite\b/.test(resolved),
      raw: decl.value.trim()
    });
  });
  return out;
}

/* ---------------------------------------------------------------------------
   Reduced-motion block: return the array of rules inside
   @media (prefers-reduced-motion: reduce)
   --------------------------------------------------------------------------- */
function extractReducedMotionRules(root) {
  const blocks = [];
  root.walkAtRules('media', function (atRule) {
    if (/prefers-reduced-motion\s*:\s*reduce/i.test(atRule.params)) {
      const rules = [];
      atRule.walkRules(function (rule) {
        const decls = {};
        rule.walkDecls(function (d) { decls[d.prop.trim()] = { value: d.value.trim(), important: d.important === true }; });
        rules.push({ selector: rule.selector, decls: decls });
      });
      blocks.push({ params: atRule.params.trim(), rules: rules });
    }
  });
  return blocks;
}

// Classification sets used across property tests.
const MOVEMENT_FADE_PROPS = new Set(['transform', 'opacity']);
const POLISH_PROPS = new Set(['box-shadow', 'color', 'border-color', 'outline', 'outline-color', 'outline-offset']);
const LAYOUT_PROPS = new Set(['width', 'height', 'top', 'left', 'right', 'bottom', 'margin',
  'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right']);

function isNonLinearTimingFunction(tf) {
  if (!tf) { return false; }
  const v = tf.toLowerCase();
  if (v === 'linear') { return false; }
  if (/^steps\(/.test(v)) { return false; }
  return /^cubic-bezier\(/.test(v) || v === 'ease' || v === 'ease-in' || v === 'ease-out' || v === 'ease-in-out';
}

module.exports = {
  REFERENCE_CSS_PATH,
  readReferenceCss,
  parse,
  extractRootTokens,
  resolveValue,
  timeToMs,
  extractKeyframes,
  keyframeAnimatedProps,
  splitTopLevel,
  parseTransitionSegment,
  extractTransitions,
  extractAnimations,
  extractReducedMotionRules,
  isInsideReducedMotion,
  isNonLinearTimingFunction,
  MOVEMENT_FADE_PROPS,
  POLISH_PROPS,
  LAYOUT_PROPS
};
