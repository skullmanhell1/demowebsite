/* =============================================================================
   utils/pages.js — page-list module (shared test utility)
   Feature: website-animation-ux-polish

   Enumerates all 13 Target_Pages (12 business templates + root Landing_Page),
   resolves their on-disk paths, and exposes helpers to read the current page
   HTML and its captured baseline PagePreservationSnapshot.

   DEV-ONLY: lives under tools/motion-tests/; never referenced by any index.html.
   ============================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');

// tools/motion-tests/utils -> tools/motion-tests -> tools -> repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SNAPSHOT_DIR = path.join(__dirname, '..', 'baseline', 'snapshots');

// The 13 Target_Pages. Order intentionally mirrors capture-baseline.js.
const PAGES = [
  { id: 'auto',                   file: 'auto/index.html' },
  { id: 'auto-detailing',         file: 'auto-detailing/index.html' },
  { id: 'beauty-nail-salon',      file: 'beauty-nail-salon/index.html' },
  { id: 'food-cafe-bakery',       file: 'food-cafe-bakery/index.html' },
  { id: 'food-drink',             file: 'food-drink/index.html' },
  { id: 'health',                 file: 'health/index.html' },
  { id: 'health-physio-wellness', file: 'health-physio-wellness/index.html' },
  { id: 'home-hvac',              file: 'home-hvac/index.html' },
  { id: 'mens-salon',             file: 'mens-salon/index.html' },
  { id: 'pet-services',           file: 'pet-services/index.html' },
  { id: 'pet-training',           file: 'pet-training/index.html' },
  { id: 'services',               file: 'services/index.html' },
  { id: 'root',                   file: 'index.html' }
];

function pageAbsPath(page) {
  return path.join(REPO_ROOT, page.file);
}

function readPageHtml(page) {
  return fs.readFileSync(pageAbsPath(page), 'utf8');
}

function readBaselineSnapshot(page) {
  const p = path.join(SNAPSHOT_DIR, page.id + '.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/**
 * Whether a page's current on-disk HTML already carries an applied motion layer
 * (i.e. has been "enhanced" by a rollout task). Two layers count as enhanced:
 *   - the new `motion-plus` genuine-upgrade layer (current approach), and
 *   - the legacy `motion-system` layer (earlier pages not yet migrated).
 * Used so preservation / coverage tests validate the REAL on-disk file once a page
 * ships a layer, and fall back to the reference layer for any not-yet-enhanced page.
 */
function pageIsEnhanced(page) {
  const html = readPageHtml(page);
  return html.includes('id="motion-plus"') || html.includes('id="motion-plus-js"') ||
    html.includes('id="motion-system"') || html.includes('MOTION-SYSTEM:START');
}

module.exports = {
  REPO_ROOT,
  SNAPSHOT_DIR,
  PAGES,
  pageAbsPath,
  readPageHtml,
  readBaselineSnapshot,
  pageIsEnhanced
};
