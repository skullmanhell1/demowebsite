/* =============================================================================
   utils/snapshot-diff.js — PagePreservationSnapshot diff helper (shared utility)
   Feature: website-animation-ux-polish

   Compares a baseline PagePreservationSnapshot against an "enhanced" one and
   returns a structured diff describing any preservation violation (Property 20 /
   21). Reuses the exact extractors from capture-baseline.js so extraction is
   identical by construction for baseline and enhanced HTML.

   DEV-ONLY: lives under tools/motion-tests/; never referenced by any index.html.
   ============================================================================= */

'use strict';

const path = require('path');
const capture = require(path.join(__dirname, '..', 'baseline', 'capture-baseline.js'));

function buildSnapshotFromHtml(html) {
  return capture.buildSnapshot(html);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) { return false; }
  for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) { return false; } }
  return true;
}

/** Multiset diff for the visibleText token->count maps. */
function diffMultiset(baseline, enhanced) {
  const missing = [];   // present in baseline, dropped/reduced in enhanced
  const changed = [];   // count differs
  Object.keys(baseline).forEach(function (tok) {
    const b = baseline[tok];
    const e = enhanced[tok] || 0;
    if (e < b) { missing.push({ token: tok, baseline: b, enhanced: e }); }
    else if (e !== b) { changed.push({ token: tok, baseline: b, enhanced: e }); }
  });
  return { missing: missing, changed: changed };
}

/** Set diff: which baseline entries are absent from enhanced. */
function diffSetSubset(baseline, enhanced) {
  const enhancedSet = new Set(enhanced);
  return baseline.filter(function (v) { return !enhancedSet.has(v); });
}

/**
 * Compare a baseline FormShape[] against an enhanced FormShape[].
 * Returns array of violation descriptions (empty === preserved).
 */
function diffForms(baseForms, enhForms) {
  const violations = [];
  if (baseForms.length !== enhForms.length) {
    violations.push('form count changed: ' + baseForms.length + ' -> ' + enhForms.length);
    return violations;
  }
  const byId = {};
  enhForms.forEach(function (f) { byId[f.formId || ('@' + enhForms.indexOf(f))] = f; });

  baseForms.forEach(function (bf, i) {
    const key = bf.formId || ('@' + i);
    const ef = byId[key] || enhForms[i];
    if (!ef) { violations.push('form "' + key + '" removed'); return; }
    if ((bf.formId || null) !== (ef.formId || null)) {
      violations.push('form id changed: ' + bf.formId + ' -> ' + ef.formId);
    }
    if ((bf.destination || null) !== (ef.destination || null)) {
      violations.push('form "' + key + '" destination changed: ' + bf.destination + ' -> ' + ef.destination);
    }
    if (bf.submitHandlerBound !== ef.submitHandlerBound) {
      violations.push('form "' + key + '" submit-handler binding changed: ' +
        bf.submitHandlerBound + ' -> ' + ef.submitHandlerBound);
    }
    if (bf.fields.length !== ef.fields.length) {
      violations.push('form "' + key + '" field count changed: ' +
        bf.fields.length + ' -> ' + ef.fields.length);
    } else {
      bf.fields.forEach(function (bField, j) {
        const eField = ef.fields[j];
        if (bField.name !== eField.name || bField.type !== eField.type ||
            bField.required !== eField.required) {
          violations.push('form "' + key + '" field[' + j + '] changed: ' +
            JSON.stringify(bField) + ' -> ' + JSON.stringify(eField));
        }
      });
    }
  });
  return violations;
}

/**
 * Full preservation diff. Returns { ok, violations:[...] }.
 * `baseline` and `enhanced` are the `.snapshot` objects (not the wrapper).
 */
function diffSnapshots(baseline, enhanced) {
  const violations = [];

  const textDiff = diffMultiset(baseline.visibleText, enhanced.visibleText);
  if (textDiff.missing.length) {
    violations.push('visibleText tokens missing/reduced: ' + JSON.stringify(textDiff.missing.slice(0, 10)));
  }
  if (textDiff.changed.length) {
    violations.push('visibleText token counts changed: ' + JSON.stringify(textDiff.changed.slice(0, 10)));
  }

  const missingColors = diffSetSubset(baseline.colorValues, enhanced.colorValues);
  if (missingColors.length) { violations.push('color values missing: ' + JSON.stringify(missingColors)); }

  const missingImgs = diffSetSubset(baseline.imageRefs, enhanced.imageRefs);
  if (missingImgs.length) { violations.push('image refs missing: ' + JSON.stringify(missingImgs)); }

  const missingFonts = diffSetSubset(baseline.fontFamilies, enhanced.fontFamilies);
  if (missingFonts.length) { violations.push('font-family declarations missing: ' + JSON.stringify(missingFonts)); }

  if (!arraysEqual(baseline.sectionOrder, enhanced.sectionOrder)) {
    violations.push('section order changed: ' + JSON.stringify(baseline.sectionOrder) +
      ' -> ' + JSON.stringify(enhanced.sectionOrder));
  }

  if (!arraysEqual(baseline.navLinks, enhanced.navLinks)) {
    violations.push('nav links changed: ' + JSON.stringify(baseline.navLinks) +
      ' -> ' + JSON.stringify(enhanced.navLinks));
  }

  const formViolations = diffForms(baseline.forms, enhanced.forms);
  formViolations.forEach(function (v) { violations.push(v); });

  return { ok: violations.length === 0, violations: violations };
}

module.exports = {
  buildSnapshotFromHtml,
  diffSnapshots,
  diffForms,
  diffMultiset,
  diffSetSubset,
  arraysEqual
};
