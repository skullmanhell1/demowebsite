/**
 * Wide Web Solutions — Demo Visit Tracker (backend)
 * -------------------------------------------------
 * Receives a "ping" from each demo page when a real browser loads it,
 * logs it to a Google Sheet, and (optionally) emails you an instant alert.
 *
 * HOW TO DEPLOY (once):
 *   1. Create a new Google Sheet (this will hold the visit log).
 *   2. Extensions > Apps Script. Delete any code, paste this file in.
 *   3. Set ALERT_EMAIL below to the address that should get alerts
 *      (or set it to "" to disable emails and only log to the Sheet).
 *   4. Click Deploy > New deployment > type: Web app.
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Copy the resulting /exec URL.
 *   5. Paste that URL into TRACKER_ENDPOINT in the pages' tracker snippet
 *      (see tracker/README.md for the exact spot).
 *
 * Notes:
 *   - This fires only when the actual page loads in a browser, NOT when an
 *     email is merely opened — so it reflects genuine site visits.
 *   - MailApp has a daily send quota (~100/day on consumer Gmail). The
 *     DEDUPE window below prevents repeat emails for the same prospect+demo.
 */

var SHEET_NAME    = "Visits";
var ALERT_EMAIL   = "you@example.com"; // <-- change this, or set "" to disable emails
var DEDUPE_MINUTES = 360;              // don't re-email same ref+site within this window (0 = always email)

function doGet(e) {
  return handle_(e);
}

function doPost(e) {
  return handle_(e);
}

function handle_(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var now = new Date();

    var site     = p.site     || "";
    var ref      = p.ref      || "";
    var page     = p.page     || "";
    var referrer = p.referrer || "";
    var lang     = p.lang     || "";
    var screen   = p.screen   || "";
    var clientTs = p.ts       || "";

    getSheet_().appendRow([now, site, ref, page, referrer, lang, screen, clientTs]);

    if (ALERT_EMAIL && !isDuplicate_(ref, site)) {
      var who = ref ? ref : "(no ref tag)";
      MailApp.sendEmail(
        ALERT_EMAIL,
        "Demo visit: " + who + " -> " + (site || "site"),
        "Someone opened a demo page.\n\n" +
        "Prospect (ref): " + who + "\n" +
        "Demo:           " + site + "\n" +
        "Page:           " + page + "\n" +
        "Came from:      " + (referrer || "(direct / email)") + "\n" +
        "Language:       " + lang + "\n" +
        "Screen:         " + screen + "\n" +
        "Time:           " + now + "\n"
      );
    }

    // Return a 1x1 transparent GIF so the <img> beacon resolves cleanly.
    return ContentService
      .createTextOutput("ok")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService
      .createTextOutput("err: " + err)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function isDuplicate_(ref, site) {
  if (!DEDUPE_MINUTES) return false;
  try {
    var cache = CacheService.getScriptCache();
    var key = "seen:" + (ref || "noref") + "|" + (site || "nosite");
    if (cache.get(key)) return true;
    cache.put(key, "1", Math.min(DEDUPE_MINUTES * 60, 21600)); // cache max is 6h
    return false;
  } catch (e) {
    return false;
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Received", "Site", "Ref (prospect)", "Page", "Referrer", "Language", "Screen", "Client time"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
