/**
 * Wide Web Solutions — Demo Visit Tracker (backend)
 * -------------------------------------------------
 * Receives a "ping" from each demo page when a real browser loads it,
 * resolves the ?ref= code against a "Prospects" lookup tab, logs the visit
 * to a "Visits" tab, and (optionally) emails you an instant alert that
 * includes the prospect's business name, email and phone.
 *
 * TABS (created automatically; run setup() once to create them up front):
 *   - "Prospects"  your lookup list. Columns:
 *         A: Ref code   (the short slug you put in ?ref=, e.g. "joescafe")
 *         B: Business   (e.g. "Joe's Cafe")
 *         C: Email      (e.g. "joe@joescafe.com")
 *         D: Phone      (e.g. "+61 400 000 000")
 *         E: Notes      (anything you like)
 *   - "Visits"     the auto-filled log of every visit.
 *
 * HOW TO (RE)DEPLOY:
 *   1. In the Demo Visits Sheet: Extensions > Apps Script.
 *   2. Replace the code with this file. Set ALERT_EMAIL below. Save.
 *   3. (Optional) Run the setup() function once (Run > setup) to create the
 *      Prospects/Visits tabs with headers and an example row.
 *   4. Deploy > Manage deployments > (edit / pencil) > Version: New version
 *      > Deploy.  ** This keeps the SAME /exec URL, so the website pages do
 *      not need to change. **  (Only use "New deployment" for a brand-new URL.)
 *
 * Notes:
 *   - Fires only when the page actually loads in a browser, NOT on email open.
 *   - MailApp has a daily quota (~100/day consumer Gmail). DEDUPE_MINUTES
 *     prevents repeat emails for the same ref+demo within the window (the
 *     Visits tab still logs every hit).
 */

var VISITS_SHEET    = "Visits";
var PROSPECTS_SHEET = "Prospects";
var ALERT_EMAIL     = "you@example.com"; // <-- change this, or set "" to disable emails
var DEDUPE_MINUTES  = 360;               // don't re-email same ref+site within this window (0 = always email)

var VISITS_HEADER = [
  "Received", "Ref code", "Business", "Email", "Phone",
  "Site", "Page", "Referrer", "Language", "Screen", "Client time", "Notes"
];
var PROSPECTS_HEADER = ["Ref code", "Business", "Email", "Phone", "Notes"];

function doGet(e)  { return handle_(e); }
function doPost(e) { return handle_(e); }

/** Run once from the editor to create the tabs before you start. */
function setup() {
  getProspectsSheet_();
  getVisitsSheet_();
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

    // Human-friendly 12-hour times (e.g. "Thu 16 Jul 2026, 6:00 PM").
    var whenReadable   = fmt_(now);
    var clientReadable = clientTs ? fmtIso_(clientTs) : "";

    // Resolve the ref code against the Prospects lookup tab.
    var match    = lookupProspect_(ref); // {business, email, phone, notes} (blanks if not found)
    var business = match.business;
    var email    = match.email;
    var phone    = match.phone;
    var notes    = match.notes;

    getVisitsSheet_().appendRow([
      now, ref, business, email, phone,
      site, page, referrer, lang, screen, clientReadable, notes
    ]);

    if (ALERT_EMAIL && !isDuplicate_(ref, site)) {
      // Prefer the friendly business label; fall back to the raw ref code.
      var label = business
        ? (business + (email ? " (" + email + ")" : ""))
        : (ref ? ref + " (unknown ref — add it to Prospects)" : "(no ref tag)");

      MailApp.sendEmail(
        ALERT_EMAIL,
        "Demo visit: " + label + " -> " + (site || "site"),
        "A prospect opened a demo page.\n\n" +
        "Business:   " + (business || "(not in Prospects list)") + "\n" +
        "Email:      " + (email    || "-") + "\n" +
        "Phone:      " + (phone    || "-") + "\n" +
        "Ref code:   " + (ref      || "(none)") + "\n" +
        "Notes:      " + (notes    || "-") + "\n" +
        "\n" +
        "Demo:       " + site + "\n" +
        "Page:       " + page + "\n" +
        "Came from:  " + (referrer || "(direct / email)") + "\n" +
        "Device:     " + (screen || "-") + " / " + (lang || "-") + "\n" +
        "Time:       " + whenReadable + "\n" +
        (clientReadable ? "Their time: " + clientReadable + "\n" : "")
      );
    }

    return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("err: " + err).setMimeType(ContentService.MimeType.TEXT);
  }
}

/** Look up a ref code (case-insensitive, trimmed) in the Prospects tab. */
function lookupProspect_(ref) {
  var empty = { business: "", email: "", phone: "", notes: "" };
  var key = String(ref || "").trim().toLowerCase();
  if (!key) return empty;

  var sheet = getProspectsSheet_();
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) { // skip header
    var code = String(values[i][0] || "").trim().toLowerCase();
    if (code && code === key) {
      return {
        business: String(values[i][1] || "").trim(),
        email:    String(values[i][2] || "").trim(),
        phone:    String(values[i][3] || "").trim(),
        notes:    String(values[i][4] || "").trim()
      };
    }
  }
  return empty;
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

function getVisitsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(VISITS_SHEET);

  // If a Visits tab from an older layout exists (no "Business" column), archive it
  // so the new columns line up instead of writing under the wrong headers.
  if (sheet && sheet.getLastRow() > 0) {
    var cols = Math.max(sheet.getLastColumn(), VISITS_HEADER.length);
    var header = sheet.getRange(1, 1, 1, cols).getValues()[0];
    var isCurrent = header[1] === "Ref code" && header[2] === "Business";
    if (!isCurrent) {
      var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Etc/GMT", "yyyy-MM-dd HHmm");
      sheet.setName(VISITS_SHEET + " (old " + stamp + ")");
      sheet = null;
    }
  }

  if (!sheet) {
    sheet = ss.getSheetByName(VISITS_SHEET) || ss.insertSheet(VISITS_SHEET);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(VISITS_HEADER);
    sheet.setFrozenRows(1);
  }
  // Show the "Received" column (A) as a 12-hour time, e.g. "Thu 16 Jul 2026, 6:00 PM".
  // The cell still holds a real datetime, so it stays sortable.
  try {
    sheet.getRange("A2:A").setNumberFormat("ddd d mmm yyyy, h:mm AM/PM");
  } catch (e) { /* non-fatal */ }
  return sheet;
}

/** Format a Date as a friendly 12-hour string in the project's timezone. */
function fmt_(date) {
  try {
    var tz = Session.getScriptTimeZone() || "Etc/GMT";
    return Utilities.formatDate(date, tz, "EEE d MMM yyyy, h:mm a"); // e.g. Thu 16 Jul 2026, 6:00 PM
  } catch (e) {
    return String(date);
  }
}

/** Parse an ISO timestamp string and format it 12-hour; falls back to the raw value. */
function fmtIso_(iso) {
  try {
    var d = new Date(iso);
    if (!isNaN(d.getTime())) return fmt_(d);
  } catch (e) {}
  return iso;
}

function getProspectsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROSPECTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PROSPECTS_SHEET);
    sheet.appendRow(PROSPECTS_HEADER);
    sheet.setFrozenRows(1);
    // Treat the lookup columns as plain text so phone numbers that start with "+"
    // (e.g. +61 400 000 000) aren't mistaken for a formula (which shows #ERROR!).
    sheet.getRange("A2:E").setNumberFormat("@");
    // Example row so the format is obvious — edit or delete it.
    sheet.appendRow(["joescafe", "Joe's Cafe", "joe@joescafe.com", "+61 400 000 000", "Met at expo"]);
  }
  return sheet;
}
