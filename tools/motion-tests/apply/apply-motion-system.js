/* =============================================================================
   apply-motion-system.js — per-page additive Motion_System injector (DEV-ONLY)
   Feature: website-animation-ux-polish

   Applies the two canonical additive layers to a Target_Page's index.html:
     1. <style id="motion-system"> inserted in <head> AFTER existing styles
        (immediately before </head>), with tokens tuned to the page's business
        tier + brand-adapted focus ring. Reveal/entrance rules are gated behind
        html.motion-on so they stay inert when the fenced JS layer defers to a
        prior motion layer (Req 1.3/1.4). Movement/fade use transform/opacity
        only (Req 11.1); a single prefers-reduced-motion block neutralizes all
        effects (Req 6.1). The :focus-visible reinforcement is ungated (a11y
        floor, Req 4.2/10.2) and applies additively.
     2. The fenced JS IIFE (verbatim from the reference buildInlineIIFE()) before
        </body>, so the shipped inline code === the tested reference code.

   Fully additive: inserts two blocks only; never removes/alters existing text,
   colors, images, fonts, section order, nav links, or any form/handler. The JS
   layer binds no listeners to forms (formFence). Idempotent: skips a page that
   already carries the motion-system marker.

   DEV-ONLY: lives under tools/motion-tests/; never referenced by any index.html.
   Usage: node tools/motion-tests/apply/apply-motion-system.js
   ============================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const motionJs = require(path.join(__dirname, '..', 'reference', 'motion-system.js'));

// ---- Per-page tier tuning configs (Design "Per-business-type motion tuning") --
const CONFIGS = {
  'food-cafe-bakery/index.html': {
    tierName: 'STANDARD tier: warm / appetizing',
    tierNote: 'staggered card reveals ~430ms and a soft hover scale on imagery',
    ambient: true,
    tokens: {
      micro: '200ms', reveal: '430ms', revealStagger: '90ms', revealShift: '24px',
      entrance: '680ms', entranceDelay: '90ms',
      easeOut: 'cubic-bezier(.2, .7, .2, 1)', easeStd: 'cubic-bezier(.4, 0, .2, 1)',
      ambientCycle: '16s', ambientShift: '4%',
      focusRing: '#b85c2e', focusOffset: '#ffffff'
    },
    hover: { lift: 'translateY(-2px) scale(1.02)', activeTransform: 'translateY(0) scale(.98)', activeOpacity: '.94', activeDur: '110ms' }
  },
  'food-drink/index.html': {
    tierName: 'STANDARD tier: warm / appetizing',
    tierNote: 'staggered card reveals ~440ms and a soft hover scale on imagery',
    ambient: true,
    tokens: {
      micro: '200ms', reveal: '440ms', revealStagger: '90ms', revealShift: '24px',
      entrance: '700ms', entranceDelay: '90ms',
      easeOut: 'cubic-bezier(.2, .7, .2, 1)', easeStd: 'cubic-bezier(.4, 0, .2, 1)',
      ambientCycle: '15s', ambientShift: '4%',
      focusRing: '#c85f34', focusOffset: '#ffffff'
    },
    hover: { lift: 'translateY(-2px) scale(1.02)', activeTransform: 'translateY(0) scale(.98)', activeOpacity: '.94', activeDur: '110ms' }
  },
  'pet-services/index.html': {
    tierName: 'STANDARD tier: friendly / lively (springier easing)',
    tierNote: 'springier entering easing while keeping micro-interactions <=300ms',
    ambient: true,
    tokens: {
      micro: '200ms', reveal: '420ms', revealStagger: '85ms', revealShift: '24px',
      entrance: '660ms', entranceDelay: '85ms',
      easeOut: 'cubic-bezier(.34, 1.3, .64, 1)', easeStd: 'cubic-bezier(.34, 1.15, .64, 1)',
      ambientCycle: '12s', ambientShift: '5%',
      focusRing: '#2f7d4f', focusOffset: '#ffffff'
    },
    hover: { lift: 'translateY(-2px)', activeTransform: 'translateY(0) scale(.98)', activeOpacity: '.92', activeDur: '100ms' }
  },
  'pet-training/index.html': {
    tierName: 'STANDARD tier: friendly / lively (springier easing)',
    tierNote: 'springier entering easing while keeping micro-interactions <=300ms',
    ambient: true,
    tokens: {
      micro: '200ms', reveal: '420ms', revealStagger: '85ms', revealShift: '24px',
      entrance: '660ms', entranceDelay: '85ms',
      easeOut: 'cubic-bezier(.34, 1.3, .64, 1)', easeStd: 'cubic-bezier(.34, 1.15, .64, 1)',
      ambientCycle: '12s', ambientShift: '5%',
      focusRing: '#2a46e0', focusOffset: '#ffffff'
    },
    hover: { lift: 'translateY(-2px)', activeTransform: 'translateY(0) scale(.98)', activeOpacity: '.92', activeDur: '100ms' }
  },
  'health/index.html': {
    tierName: 'SUBTLE-STANDARD tier: trustworthy / clean (no ambient)',
    tierNote: 'restrained reveals ~500ms and focus polish; deliberately NO ambient',
    ambient: false,
    tokens: {
      micro: '220ms', reveal: '500ms', revealStagger: '100ms', revealShift: '20px',
      entrance: '740ms', entranceDelay: '100ms',
      easeOut: 'cubic-bezier(.2, .7, .2, 1)', easeStd: 'cubic-bezier(.4, 0, .2, 1)',
      focusRing: '#6c6398', focusOffset: '#ffffff'
    },
    hover: { lift: 'translateY(-1px)', activeTransform: 'translateY(0) scale(.99)', activeOpacity: '.94', activeDur: '120ms' }
  },
  'services/index.html': {
    tierName: 'SUBTLE-STANDARD tier: trustworthy / clean (no ambient)',
    tierNote: 'restrained reveals ~480ms and focus polish; deliberately NO ambient',
    ambient: false,
    tokens: {
      micro: '220ms', reveal: '480ms', revealStagger: '100ms', revealShift: '20px',
      entrance: '720ms', entranceDelay: '100ms',
      easeOut: 'cubic-bezier(.2, .7, .2, 1)', easeStd: 'cubic-bezier(.4, 0, .2, 1)',
      focusRing: '#1769aa', focusOffset: '#ffffff'
    },
    hover: { lift: 'translateY(-1px)', activeTransform: 'translateY(0) scale(.99)', activeOpacity: '.94', activeDur: '120ms' }
  },
  'index.html': {
    tierName: 'STANDARD tier: showcase / vibrant (dark theme)',
    tierNote: 'hero entrance + staggered demo-card reveals; existing count-up preserved (Req 1.3)',
    ambient: true,
    tokens: {
      micro: '200ms', reveal: '440ms', revealStagger: '90ms', revealShift: '24px',
      entrance: '720ms', entranceDelay: '90ms',
      easeOut: 'cubic-bezier(.2, .7, .2, 1)', easeStd: 'cubic-bezier(.4, 0, .2, 1)',
      ambientCycle: '14s', ambientShift: '4%',
      focusRing: '#6366f1', focusOffset: '#ffffff'
    },
    hover: { lift: 'translateY(-2px)', activeTransform: 'translateY(0) scale(.98)', activeOpacity: '.92', activeDur: '100ms' }
  }
};

function buildCssBlock(cfg) {
  const t = cfg.tokens;
  const h = cfg.hover;
  const ambientTokens = cfg.ambient
    ? '  --mo-ambient-cycle: ' + t.ambientCycle + ';   /* band 4-30s */\n' +
      '  --mo-ambient-shift: ' + t.ambientShift + ';      /* <=5% displacement/opacity */\n'
    : '';
  const ambientKeyframes = cfg.ambient
    ? '@keyframes moDrift { 0% { transform: translate3d(0,0,0); } 50% { transform: translate3d(var(--mo-ambient-shift), calc(-1 * var(--mo-ambient-shift)), 0); } 100% { transform: translate3d(0,0,0); } }\n' +
      '@keyframes moFloat { 0% { transform: translate3d(0,0,0); opacity: 1; } 50% { transform: translate3d(0, calc(-1 * var(--mo-ambient-shift)), 0); opacity: .96; } 100% { transform: translate3d(0,0,0); opacity: 1; } }\n'
    : '';
  const ambientHooks = cfg.ambient
    ? 'html.motion-on [data-atmosphere] .mo-ambient-drift { animation: moDrift var(--mo-ambient-cycle) ease-in-out infinite; will-change: transform; }\n' +
      'html.motion-on [data-atmosphere] .mo-ambient-float { animation: moFloat var(--mo-ambient-cycle) ease-in-out infinite; will-change: transform, opacity; }\n'
    : '';
  const rmAmbientSel = cfg.ambient
    ? ' html.motion-on [data-atmosphere] .mo-ambient-drift, html.motion-on [data-atmosphere] .mo-ambient-float,'
    : '';
  const ambientComment = cfg.ambient ? '' : ' Deliberately NO ambient / no [data-atmosphere].';

  return '' +
'<style id="motion-system">\n' +
'/* =============================================================================\n' +
'   Motion_System — canonical additive layer (' + cfg.tierName + ').\n' +
'   Feature: website-animation-ux-polish. Tuning: ' + cfg.tierNote + '.' + ambientComment + '\n' +
'   Added AFTER existing page styles. Reveal/entrance rules are gated behind\n' +
'   html.motion-on, which the fenced JS layer adds ONLY after confirming motion is\n' +
'   allowed AND that no equivalent prior motion layer exists. This page already\n' +
'   ships an equivalent reveal/entrance layer (anim2-layer / polish-pass), so the\n' +
'   JS layer defers (data-motion-skip, Req 1.3/1.4) and the gated rules below stay\n' +
'   inert; the ungated :focus-visible reinforcement applies additively. Movement &\n' +
'   fade use transform/opacity only (Req 11.1); a single reduced-motion block\n' +
'   neutralizes every effect (Req 6.1).\n' +
'   ============================================================================= */\n' +
':root {\n' +
'  --mo-micro: ' + t.micro + ';            /* band 150-300ms */\n' +
'  --mo-micro-max: 300ms;\n' +
'  --mo-feedback-max: 500ms;\n' +
'  --mo-reveal: ' + t.reveal + ';           /* band 200-600ms */\n' +
'  --mo-reveal-stagger: ' + t.revealStagger + ';   /* band 50-150ms */\n' +
'  --mo-reveal-shift: ' + t.revealShift + ';\n' +
'  --mo-entrance: ' + t.entrance + ';         /* band 200-1000ms */\n' +
'  --mo-entrance-delay: ' + t.entranceDelay + ';   /* band 50-300ms */\n' +
'  --mo-ease-out: ' + t.easeOut + ';\n' +
'  --mo-ease-standard: ' + t.easeStd + ';\n' +
ambientTokens +
'  --mo-focus-ring: ' + t.focusRing + ';     /* adapted to brand */\n' +
'  --mo-focus-ring-offset: ' + t.focusOffset + ';\n' +
'}\n' +
'@keyframes moRise { from { opacity: 0; transform: translateY(var(--mo-reveal-shift)); } to { opacity: 1; transform: none; } }\n' +
'@keyframes moFade { from { opacity: 0; transform: scale(.985); } to { opacity: 1; transform: none; } }\n' +
ambientKeyframes +
'html.motion-on .reveal { opacity: 0; transform: translateY(var(--mo-reveal-shift)); transition: opacity var(--mo-reveal) var(--mo-ease-out), transform var(--mo-reveal) var(--mo-ease-out); will-change: opacity, transform; }\n' +
'html.motion-on .reveal.in-view { opacity: 1; transform: none; }\n' +
'html.motion-on .mo-stagger > * { transition-delay: 0ms; }\n' +
'html.motion-on .mo-stagger > *:nth-child(2) { transition-delay: calc(var(--mo-reveal-stagger) * 1); }\n' +
'html.motion-on .mo-stagger > *:nth-child(3) { transition-delay: calc(var(--mo-reveal-stagger) * 2); }\n' +
'html.motion-on .mo-stagger > *:nth-child(4) { transition-delay: calc(var(--mo-reveal-stagger) * 3); }\n' +
'html.motion-on .mo-stagger > *:nth-child(5) { transition-delay: calc(var(--mo-reveal-stagger) * 4); }\n' +
'html.motion-on .mo-stagger > *:nth-child(6) { transition-delay: calc(var(--mo-reveal-stagger) * 5); }\n' +
'html.motion-on .mo-entrance > * { opacity: 0; animation: moRise var(--mo-entrance) var(--mo-ease-out) both; }\n' +
'html.motion-on .mo-entrance > *:nth-child(1), html.motion-on .mo-entrance > [data-mo-primary] { animation-delay: 0ms; }\n' +
'html.motion-on .mo-entrance > *:nth-child(2) { animation-delay: calc(var(--mo-entrance-delay) * 1); }\n' +
'html.motion-on .mo-entrance > *:nth-child(3) { animation-delay: calc(var(--mo-entrance-delay) * 2); }\n' +
'html.motion-on .mo-entrance > *:nth-child(4) { animation-delay: calc(var(--mo-entrance-delay) * 3); }\n' +
'html.motion-on .mo-entrance > *:nth-child(5) { animation-delay: calc(var(--mo-entrance-delay) * 4); }\n' +
'html.motion-on .mo-entrance > *:nth-child(6) { animation-delay: calc(var(--mo-entrance-delay) * 5); }\n' +
'html.motion-on .mo-entrance.mo-entrance-done > * { opacity: 1 !important; transform: none !important; animation: none !important; }\n' +
'.mo-hover, a.mo-link, [data-mo-card] { transition: transform var(--mo-micro) var(--mo-ease-standard), box-shadow var(--mo-micro) var(--mo-ease-standard), color var(--mo-micro) var(--mo-ease-standard), opacity var(--mo-micro) var(--mo-ease-standard); }\n' +
'html.motion-on .mo-hover:hover, html.motion-on [data-mo-card]:hover { transform: ' + h.lift + '; }\n' +
'.mo-hover:active, [data-mo-card]:active { transform: ' + h.activeTransform + '; opacity: ' + h.activeOpacity + '; transition-duration: ' + h.activeDur + '; }\n' +
'a.mo-link:hover { opacity: .82; }\n' +
'.btn:focus-visible, .mo-hover:focus-visible, a.mo-link:focus-visible, [data-mo-card]:focus-visible, [data-mo-focus]:focus-visible { outline: 3px solid var(--mo-focus-ring); outline-offset: 2px; box-shadow: 0 0 0 2px var(--mo-focus-ring-offset); }\n' +
ambientHooks +
'@media (prefers-reduced-motion: reduce) {\n' +
'  html .reveal, html.motion-on .reveal, html.motion-on .reveal.in-view, html.motion-on .mo-entrance > *,' + rmAmbientSel + ' .mo-hover, a.mo-link, [data-mo-card] {\n' +
'    animation: none !important; transition: none !important; opacity: 1 !important; transform: none !important;\n' +
'  }\n' +
'}\n' +
'</style>\n';
}

function apply() {
  const iife = motionJs.buildInlineIIFE();
  const results = [];
  Object.keys(CONFIGS).forEach(function (rel) {
    const abs = path.join(REPO_ROOT, rel);
    let html = fs.readFileSync(abs, 'utf8');
    if (html.indexOf('id="motion-system"') !== -1 || html.indexOf('MOTION-SYSTEM:START') !== -1) {
      results.push(rel + ': SKIPPED (already enhanced)');
      return;
    }
    const cssBlock = '\n' + buildCssBlock(CONFIGS[rel]) + '\n';
    if (!/<\/head>/i.test(html) || !/<\/body>/i.test(html)) {
      throw new Error(rel + ': missing </head> or </body> anchor');
    }
    html = html.replace(/<\/head>/i, cssBlock + '</head>');
    html = html.replace(/<\/body>/i, '\n' + iife + '\n</body>');
    fs.writeFileSync(abs, html, 'utf8');
    results.push(rel + ': ENHANCED (' + CONFIGS[rel].tierName + (CONFIGS[rel].ambient ? ', ambient' : ', no ambient') + ')');
  });
  process.stdout.write(results.join('\n') + '\n');
}

if (require.main === module) { apply(); }
module.exports = { apply, buildCssBlock, CONFIGS };
