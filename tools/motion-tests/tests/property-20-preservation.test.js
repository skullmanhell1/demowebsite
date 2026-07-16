'use strict';

// Feature: website-animation-ux-polish, Property 20: Content, branding, and structure are preserved (additive-only superset)
// For all 13 Target_Pages, the enhanced document is a superset of the baseline: identical visible
// text multiset; every baseline color value, image ref, and font-family still present & unmodified;
// identical top-to-bottom section order and ordered nav links; no existing element/attr/declaration
// removed or altered.
// Validates: Requirements 8.4, 9.1, 9.2, 9.3, 9.4, 9.5

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { PAGES, readPageHtml, readBaselineSnapshot, pageIsEnhanced } = require('../utils/pages');
const { applyReferenceLayers } = require('../utils/fixture');
const { buildSnapshotFromHtml, diffSnapshots } = require('../utils/snapshot-diff');

// Produce the "enhanced" HTML for a page: its real enhanced form if rolled out, otherwise the
// synthetic additive enhancement (proves the additive contract now; validates real pages later).
function enhancedHtmlFor(page) {
  const html = readPageHtml(page);
  return pageIsEnhanced(page) ? html : applyReferenceLayers(html);
}

test('Property 20: applying the Motion_System preserves content/branding/structure for every page', () => {
  fc.assert(
    fc.property(fc.nat({ max: PAGES.length - 1 }), (i) => {
      const page = PAGES[i];
      const baseline = readBaselineSnapshot(page).snapshot;
      const enhanced = buildSnapshotFromHtml(enhancedHtmlFor(page));
      const result = diffSnapshots(baseline, enhanced);
      if (!result.ok) {
        // Surface the violation for debugging without hiding the failure.
        console.error('[Property 20] ' + page.id + ' violations:', result.violations);
      }
      return result.ok;
    }),
    { numRuns: 100 }
  );
});

test('Property 20: explicit per-page preservation check (all 13 pages)', () => {
  PAGES.forEach((page) => {
    const baseline = readBaselineSnapshot(page).snapshot;
    const enhanced = buildSnapshotFromHtml(enhancedHtmlFor(page));
    const result = diffSnapshots(baseline, enhanced);
    assert.ok(result.ok, page.id + ' preservation violations: ' + JSON.stringify(result.violations));
  });
});

test('Property 20: visible-text multiset is identical (zero words added/removed/altered)', () => {
  PAGES.forEach((page) => {
    const baseline = readBaselineSnapshot(page).snapshot.visibleText;
    const enhanced = buildSnapshotFromHtml(enhancedHtmlFor(page)).visibleText;
    // enhanced must contain exactly the same tokens with the same counts
    Object.keys(baseline).forEach((tok) => {
      assert.strictEqual(enhanced[tok], baseline[tok],
        page.id + ' token "' + tok + '" count changed ' + baseline[tok] + '->' + enhanced[tok]);
    });
    assert.strictEqual(Object.keys(enhanced).length, Object.keys(baseline).length,
      page.id + ' visible-text token set size changed');
  });
});

test('Property 20: section order and nav links are byte-identical to baseline', () => {
  PAGES.forEach((page) => {
    const baseline = readBaselineSnapshot(page).snapshot;
    const enhanced = buildSnapshotFromHtml(enhancedHtmlFor(page));
    assert.deepStrictEqual(enhanced.sectionOrder, baseline.sectionOrder, page.id + ' section order changed');
    assert.deepStrictEqual(enhanced.navLinks, baseline.navLinks, page.id + ' nav links changed');
  });
});
