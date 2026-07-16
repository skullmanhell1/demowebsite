/* =============================================================================
   capture-baseline.js — PagePreservationSnapshot capture (reference tooling)
   Feature: website-animation-ux-polish

   Reads each of the 13 Target_Pages at the PRE-ENHANCEMENT git ref (default:
   HEAD, since no page has been enhanced yet) and writes a PagePreservationSnapshot
   JSON per page under ./snapshots/, keyed by page id. Later before/after
   comparisons (Property 20 / 21 tests) diff the enhanced page against these
   frozen baselines.

   PagePreservationSnapshot {
     visibleText  : { token: count }      // multiset of visible text tokens
     colorValues  : string[]              // all color declarations (hex/rgb/hsl)
     imageRefs    : string[]              // <img src> + url(...) references
     fontFamilies : string[]              // font-family declarations
     sectionOrder : string[]              // top-to-bottom <section> id sequence
     navLinks     : string[]              // ordered <nav> anchor hrefs
     forms        : FormShape[]           // per-form field set + handler binding
   }
   FormShape { formId, fields:[{name,type,required}], submitHandlerBound, destination }

   DEV-ONLY: lives under tools/motion-tests/; never referenced by any index.html.
   Zero external dependencies (Node built-ins only) so it runs standalone before
   the test harness (Task 2) installs jsdom/postcss.

   Usage:  node tools/motion-tests/baseline/capture-baseline.js [gitRef]

   Requirements: 8.1, 9.1, 9.2, 9.3, 9.4
   ============================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
const GIT_REF = process.argv[2] || 'HEAD';

// The 13 Target_Pages: 12 business templates + the root Landing_Page.
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

/* ---------------------------------------------------------------------------
   Read a file's contents at the pre-enhancement git ref, falling back to the
   working tree if the ref is unavailable.
   --------------------------------------------------------------------------- */
function readAtRef(relFile) {
  try {
    return execSync('git show ' + GIT_REF + ':' + relFile, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    });
  } catch (e) {
    const abs = path.join(REPO_ROOT, relFile);
    return fs.readFileSync(abs, 'utf8');
  }
}

/* ---------------------------------------------------------------------------
   Small HTML helpers (regex-based, dependency-free). The same extractor parses
   both baseline and enhanced pages, so extraction is consistent by construction.
   --------------------------------------------------------------------------- */
function stripBlocks(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013');
}

function getAttr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i')) ||
            tag.match(new RegExp(name + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? m[1] : null;
}
function hasAttr(tag, name) {
  return new RegExp('(^|\\s)' + name + '(\\s|=|>|/|$)', 'i').test(tag);
}

/* ---------------------------------------------------------------------------
   Extractors
   --------------------------------------------------------------------------- */
function extractVisibleText(html) {
  const text = decodeEntities(stripBlocks(html).replace(/<[^>]+>/g, ' '));
  const tokens = text.split(/\s+/).filter(Boolean);
  const counts = {};
  for (const t of tokens) { counts[t] = (counts[t] || 0) + 1; }
  return counts;
}

function extractColorValues(html) {
  const set = new Set();
  const re = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
  let m;
  while ((m = re.exec(html)) !== null) { set.add(m[0].replace(/\s+/g, '').toLowerCase()); }
  return Array.from(set).sort();
}

function extractImageRefs(html) {
  const set = new Set();
  let m;
  const imgRe = /<img\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)')/gi;
  while ((m = imgRe.exec(html)) !== null) { set.add(m[2] || m[3]); }
  const urlRe = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\)/gi;
  while ((m = urlRe.exec(html)) !== null) {
    const v = (m[1] || m[2] || m[3] || '').trim();
    if (v && !v.startsWith('data:')) { set.add(v); }
  }
  return Array.from(set).sort();
}

function extractFontFamilies(html) {
  const set = new Set();
  const re = /font-family\s*:\s*([^;{}"']+)[;}]/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    set.add(m[1].replace(/\s+/g, ' ').trim().toLowerCase());
  }
  return Array.from(set).sort();
}

function extractSectionOrder(html) {
  const order = [];
  const re = /<section\b([^>]*)>/gi;
  let m, n = 0;
  while ((m = re.exec(html)) !== null) {
    const id = getAttr(m[1], 'id') ||
               getAttr(m[1], 'aria-labelledby') ||
               ('section@' + n);
    order.push(id);
    n++;
  }
  return order;
}

function extractNavLinks(html) {
  const links = [];
  const navRe = /<nav\b[^>]*>([\s\S]*?)<\/nav>/gi;
  let navM;
  while ((navM = navRe.exec(html)) !== null) {
    const aRe = /<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)')/gi;
    let aM;
    while ((aM = aRe.exec(navM[1])) !== null) { links.push(aM[2] || aM[3]); }
  }
  return links;
}

function extractForms(html) {
  const forms = [];
  const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let fm;
  while ((fm = formRe.exec(html)) !== null) {
    const attrs = fm[1];
    const inner = fm[2];
    const formId = getAttr(attrs, 'id');
    const destination = getAttr(attrs, 'action');
    const hasInlineSubmit = hasAttr(attrs, 'onsubmit');

    const fields = [];
    const ctlRe = /<(input|select|textarea)\b([^>]*)>/gi;
    let cm;
    while ((cm = ctlRe.exec(inner)) !== null) {
      const kind = cm[1].toLowerCase();
      const cAttrs = cm[2];
      const name = getAttr(cAttrs, 'name') || getAttr(cAttrs, 'id') || null;
      let type;
      if (kind === 'input') { type = (getAttr(cAttrs, 'type') || 'text').toLowerCase(); }
      else { type = kind; }
      fields.push({ name: name, type: type, required: hasAttr(cAttrs, 'required') });
    }

    // Heuristic submit-handler binding detection (deterministic on the source):
    // inline onsubmit, or a JS submit listener/handler referencing this form id.
    let submitHandlerBound = hasInlineSubmit;
    if (!submitHandlerBound && formId) {
      const idEsc = formId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundRe = new RegExp(
        "getElementById\\(['\"]" + idEsc + "['\"]\\)[\\s\\S]{0,120}?addEventListener\\(\\s*['\"]submit" +
        "|['\"]#?" + idEsc + "['\"][\\s\\S]{0,120}?addEventListener\\(\\s*['\"]submit" +
        "|#" + idEsc + "[\\s\\S]{0,120}?addEventListener\\(\\s*['\"]submit",
        'i'
      );
      submitHandlerBound = boundRe.test(html);
    }

    forms.push({
      formId: formId,
      fields: fields,
      submitHandlerBound: submitHandlerBound,
      destination: destination
    });
  }
  return forms;
}

function buildSnapshot(html) {
  return {
    visibleText: extractVisibleText(html),
    colorValues: extractColorValues(html),
    imageRefs: extractImageRefs(html),
    fontFamilies: extractFontFamilies(html),
    sectionOrder: extractSectionOrder(html),
    navLinks: extractNavLinks(html),
    forms: extractForms(html)
  };
}

/* ---------------------------------------------------------------------------
   Main
   --------------------------------------------------------------------------- */
function main() {
  if (!fs.existsSync(SNAPSHOT_DIR)) { fs.mkdirSync(SNAPSHOT_DIR, { recursive: true }); }

  const summary = [];
  for (const page of PAGES) {
    const html = readAtRef(page.file);
    const snapshot = {
      pageId: page.id,
      file: page.file,
      gitRef: GIT_REF,
      capturedAt: new Date().toISOString(),
      snapshot: buildSnapshot(html)
    };
    const outPath = path.join(SNAPSHOT_DIR, page.id + '.json');
    fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

    const s = snapshot.snapshot;
    const textTokens = Object.keys(s.visibleText).length;
    summary.push(
      page.id.padEnd(24) +
      ' text=' + textTokens +
      ' colors=' + s.colorValues.length +
      ' imgs=' + s.imageRefs.length +
      ' fonts=' + s.fontFamilies.length +
      ' sections=' + s.sectionOrder.length +
      ' nav=' + s.navLinks.length +
      ' forms=' + s.forms.length
    );
  }

  process.stdout.write(
    'Captured ' + PAGES.length + ' baseline snapshots at ref "' + GIT_REF + '" -> ' +
    path.relative(REPO_ROOT, SNAPSHOT_DIR) + '\n' +
    summary.join('\n') + '\n'
  );
}

if (require.main === module) { main(); }

module.exports = {
  PAGES: PAGES,
  buildSnapshot: buildSnapshot,
  extractVisibleText: extractVisibleText,
  extractColorValues: extractColorValues,
  extractImageRefs: extractImageRefs,
  extractFontFamilies: extractFontFamilies,
  extractSectionOrder: extractSectionOrder,
  extractNavLinks: extractNavLinks,
  extractForms: extractForms
};
