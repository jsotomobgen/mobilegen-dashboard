/**
 * MOBILE GEN AUTO-UPDATER
 * ─────────────────────────────────────────────────────────────────────────────
 * Watches Gmail for "Mobile Gen Aligned Performance Report" from Verizon,
 * extracts the .xlsx attachment, parses all four data sections, and writes
 * them into your Google Sheet — fully automatically.
 *
 * SETUP INSTRUCTIONS (do these once, takes about 10 minutes):
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Open your Google Sheet
 * 2. Click Extensions → Apps Script
 * 3. Delete everything in the editor and paste this entire script
 * 4. Click the floppy disk icon to Save
 * 5. In the function dropdown (top bar), select "firstTimeSetup"
 * 6. Click ▶ Run
 * 7. Google will ask for permissions — click Review Permissions → Allow
 * 8. Done. It will now check automatically every 30 min from 6am–3pm daily.
 *
 * SHEET TABS REQUIRED — create these exact tab names in your Google Sheet:
 *   Companies | Regions | Districts | Stores | Log
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Configuration ─────────────────────────────────────────────────────────────
var SENDER  = 'vzw.consumer.channel.analysis@verizon.com';
var SUBJECT = 'Mobile Gen Aligned Performance Report';
var LABEL   = 'MobileGen-Processed';   // Gmail label to mark processed emails

// Column indices (0-based) in the Excel sheet rows
var EXEC_METRIC_COLS = [13, 14, 15, 16, 17, 18];   // Mobile Gen Exec tab
var MG_METRIC_COLS   = [13, 26, 47, 51, 64, 75];   // Mobile Gen tab
var METRIC_KEYS      = ['pga', 'vhi', 'prem', 'perks', 'vmp', 'pull'];


// ── First-time setup — run this ONCE ─────────────────────────────────────────
function firstTimeSetup() {
  // Create the Gmail label if it doesn't exist
  var label = GmailApp.getUserLabelByName(LABEL);
  if (!label) {
    GmailApp.createLabel(LABEL);
    Logger.log('Created Gmail label: ' + LABEL);
  }

  // Delete any existing triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  // Create time-based trigger: every 30 minutes
  ScriptApp.newTrigger('checkForNewReport')
    .timeBased()
    .everyMinutes(30)
    .create();

  Logger.log('✅ Setup complete. Trigger created — checking every 30 minutes.');
  Logger.log('Make sure your sheet has tabs named: Companies, Regions, Districts, Stores, Log');

  // Run once immediately to catch any emails already sitting in inbox
  checkForNewReport();
}


// ── Main function (runs automatically every 30 min) ───────────────────────────
function checkForNewReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  addLog(ss, '--- Checking for new Mobile Gen report ---');

  // Only run between 6am and 3pm in the spreadsheet's timezone
  var now  = new Date();
  var hour = parseInt(Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), 'H'));
  if (hour < 6 || hour >= 15) {
    addLog(ss, 'Outside active window (6am–3pm). Skipping.');
    return;
  }

  // Search for unprocessed matching emails
  var query   = 'from:(' + SENDER + ') subject:("' + SUBJECT + '") -label:' + LABEL;
  var threads = GmailApp.search(query, 0, 10);

  if (threads.length === 0) {
    addLog(ss, 'No new emails found.');
    return;
  }

  addLog(ss, 'Found ' + threads.length + ' unprocessed email(s). Processing most recent.');

  // Sort by date descending, process the newest one
  threads.sort(function(a, b) {
    return b.getLastMessageDate() - a.getLastMessageDate();
  });

  var processed = false;
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var msgs   = thread.getMessages();

    for (var j = 0; j < msgs.length; j++) {
      var msg         = msgs[j];
      var attachments = msg.getAttachments();

      for (var k = 0; k < attachments.length; k++) {
        var att = attachments[k];
        var name = att.getName();

        // Match any .xlsx file
        if (name.toLowerCase().indexOf('.xlsx') === -1) continue;

        addLog(ss, 'Found attachment: ' + name);
        try {
          processExcelFile(ss, att, name);
          processed = true;
        } catch(e) {
          addLog(ss, '❌ ERROR processing ' + name + ': ' + e.message);
        }
      }
    }

    // Mark thread as processed regardless (avoid reprocessing)
    var label = GmailApp.getUserLabelByName(LABEL);
    if (!label) label = GmailApp.createLabel(LABEL);
    thread.addLabel(label);
  }

  if (processed) {
    addLog(ss, '✅ Sheet updated successfully.');
  } else {
    addLog(ss, 'No .xlsx attachments found in matching emails.');
  }
}


// ── Parse Excel and write to sheet ───────────────────────────────────────────
function processExcelFile(ss, attachment, filename) {
  // Convert attachment blob to a temporary Google Sheet so we can read it
  var blob      = attachment.copyBlob();
  var tempFile  = Drive.Files.insert(
    { title: 'TEMP_MobileGen_' + new Date().getTime(), mimeType: MimeType.GOOGLE_SHEETS },
    blob,
    { convert: true }
  );
  var tempId = tempFile.id;

  try {
    var tempSS    = SpreadsheetApp.openById(tempId);
    var execSheet = getSheetByPartialName(tempSS, 'Mobile Gen Exec');
    var mgSheet   = getSheetByPartialName(tempSS, 'Mobile Gen');

    if (!execSheet) throw new Error('Could not find "Mobile Gen Exec" tab in attachment');
    if (!mgSheet)   throw new Error('Could not find "Mobile Gen" tab in attachment');

    // Parse date from exec sheet row 4 (0-indexed row 3)
    var execData = execSheet.getDataRange().getValues();
    var dateStr  = extractDate(execData[3][11]);
    addLog(ss, 'Report date: ' + dateStr);

    // ── Companies ─────────────────────────────────────────────────────────────
    var companies = [];
    for (var r = 7; r <= 20; r++) {
      if (r >= execData.length) break;
      var row  = execData[r];
      var type = String(row[11] || '').trim();
      var rank = parseInt(row[12]);
      if (!type || isNaN(rank)) continue;

      var vals = {};
      METRIC_KEYS.forEach(function(k, idx) {
        vals[k] = safeFloat(row[EXEC_METRIC_COLS[idx]]);
      });
      companies.push({ mtdRank: rank, type: type, vals: vals });
    }

    // ── Regions / Districts / Stores ──────────────────────────────────────────
    var mgData = mgSheet.getDataRange().getValues();
    var regions   = [];
    var districts = [];
    var stores    = [];

    mgData.forEach(function(row) {
      var level = String(row[0] || '').trim();
      var vals  = {};
      METRIC_KEYS.forEach(function(k, idx) {
        vals[k] = safeFloat(row[MG_METRIC_COLS[idx]]);
      });

      if (level === '5 Ag Region Unique') {
        var name = String(row[7] || '').trim();
        var area = String(row[6] || '').trim();
        var doors = parseInt(row[11]) || 0;
        if (name && name !== 'nan') {
          regions.push({ name: name, area: area, doors: doors, vals: vals });
        }

      } else if (level === '7 Ag Dist Unique') {
        var name  = String(row[8] || '').trim();
        var doors = parseInt(row[11]) || 0;
        if (name) {
          districts.push({ name: name, doors: doors, vals: vals });
        }

      } else if (level === '8 Outlet - BAU' || level === '8 Outlet - Divested') {
        var name     = String(row[10] || '').replace('Mobile Generation ', '').trim();
        var district = String(row[8]  || '').trim();
        var region   = String(row[7]  || '').trim();
        var divested = level === '8 Outlet - Divested';
        if (name && vals.pga !== null) {
          stores.push({ name: name, district: district, region: region,
                        divested: divested, vals: vals });
        }
      }
    });

    addLog(ss, 'Parsed: ' + companies.length + ' companies, ' +
           regions.length + ' regions, ' +
           districts.length + ' districts, ' +
           stores.length + ' stores');

    // ── Write to Google Sheet tabs ─────────────────────────────────────────────
    writeCompanies(ss, companies, dateStr);
    writeRegions(ss, regions, dateStr);
    writeDistricts(ss, districts, dateStr);
    writeStores(ss, stores, dateStr);

  } finally {
    // Always delete the temp file
    Drive.Files.remove(tempId);
  }
}


// ── Writers ───────────────────────────────────────────────────────────────────
function writeCompanies(ss, data, dateStr) {
  var tab = ss.getSheetByName('Companies');
  if (!tab) { ss.insertSheet('Companies'); tab = ss.getSheetByName('Companies'); }
  tab.clearContents();

  var headers = ['lastUpdated', 'mtdRank', 'type',
                 'pga', 'vhi', 'prem', 'perks', 'vmp', 'pull'];
  var rows = [headers];
  data.forEach(function(c) {
    rows.push([dateStr, c.mtdRank, c.type,
               c.vals.pga, c.vals.vhi, c.vals.prem,
               c.vals.perks, c.vals.vmp, c.vals.pull]);
  });
  tab.getRange(1, 1, rows.length, headers.length).setValues(rows);
}

function writeRegions(ss, data, dateStr) {
  var tab = ss.getSheetByName('Regions');
  if (!tab) { ss.insertSheet('Regions'); tab = ss.getSheetByName('Regions'); }
  tab.clearContents();

  var headers = ['lastUpdated', 'name', 'area', 'doors',
                 'pga', 'vhi', 'prem', 'perks', 'vmp', 'pull'];
  var rows = [headers];
  data.forEach(function(r) {
    rows.push([dateStr, r.name, r.area, r.doors,
               r.vals.pga, r.vals.vhi, r.vals.prem,
               r.vals.perks, r.vals.vmp, r.vals.pull]);
  });
  tab.getRange(1, 1, rows.length, headers.length).setValues(rows);
}

function writeDistricts(ss, data, dateStr) {
  var tab = ss.getSheetByName('Districts');
  if (!tab) { ss.insertSheet('Districts'); tab = ss.getSheetByName('Districts'); }
  tab.clearContents();

  var headers = ['lastUpdated', 'name', 'doors',
                 'pga', 'vhi', 'prem', 'perks', 'vmp', 'pull'];
  var rows = [headers];
  data.forEach(function(d) {
    rows.push([dateStr, d.name, d.doors,
               d.vals.pga, d.vals.vhi, d.vals.prem,
               d.vals.perks, d.vals.vmp, d.vals.pull]);
  });
  tab.getRange(1, 1, rows.length, headers.length).setValues(rows);
}

function writeStores(ss, data, dateStr) {
  var tab = ss.getSheetByName('Stores');
  if (!tab) { ss.insertSheet('Stores'); tab = ss.getSheetByName('Stores'); }
  tab.clearContents();

  var headers = ['lastUpdated', 'name', 'district', 'region', 'divested',
                 'pga', 'vhi', 'prem', 'perks', 'vmp', 'pull'];
  var rows = [headers];
  data.forEach(function(s) {
    rows.push([dateStr, s.name, s.district, s.region, s.divested ? 'true' : 'false',
               s.vals.pga, s.vals.vhi, s.vals.prem,
               s.vals.perks, s.vals.vmp, s.vals.pull]);
  });
  tab.getRange(1, 1, rows.length, headers.length).setValues(rows);
}


// ── Helpers ───────────────────────────────────────────────────────────────────
function safeFloat(v) {
  if (v === null || v === undefined || v === '') return null;
  var f = parseFloat(v);
  return isNaN(f) || f < 0 ? null : f;
}

function extractDate(cell) {
  // Tries to pull "5/13" style date from the header cell text
  var s = String(cell || '');
  var m = s.match(/\((\d+\/\d+)\)/);
  return m ? m[1] + '/' + new Date().getFullYear() : s;
}

function getSheetByPartialName(ss, partial) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().indexOf(partial) !== -1) return sheets[i];
  }
  return null;
}

function addLog(ss, message) {
  var logTab = ss.getSheetByName('Log');
  if (!logTab) { ss.insertSheet('Log'); logTab = ss.getSheetByName('Log'); }
  var ts = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  logTab.appendRow([ts, message]);
  Logger.log(message);

  // Keep log to last 200 rows
  var rows = logTab.getLastRow();
  if (rows > 200) logTab.deleteRows(1, rows - 200);
}


// ── Manual override — run this anytime to force a check ───────────────────────
function runNow() {
  checkForNewReport();
}
