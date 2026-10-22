/**
 * Simple Oven — order log for Google Sheets + Google Calendar
 * -------------------------------------------------------------
 * Paste this whole file into Extensions → Apps Script of your Google Sheet.
 * Then: Project Settings → Script properties → add  SECRET = (any long random text)
 *       (optional) CALENDAR_ID = the calendar to use (default: your main Google Calendar)
 * Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone → Deploy.
 * Copy the Web app URL into Cloudflare as SHEETS_WEBHOOK_URL, and the same SECRET as SHEETS_SECRET.
 * Every order becomes a row in the "Orders" sheet AND an event on its pick-up date and time.
 */
const SHEET_NAME = 'Orders';
const SHEET_ID = ''; // optional: the spreadsheet ID, if this script isn't opened from the sheet itself
const book = () => SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);

// Run this once (▶ Run → setup). It asks Google for permission, creates the Orders sheet,
// makes a random SECRET and shows it in a "Setup" tab so you can copy it into Cloudflare.
function setup() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('SECRET');
  if (!secret) { secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); props.setProperty('SECRET', secret); }
  sheet();
  CalendarApp.getDefaultCalendar(); // asks for calendar permission now
  const ss = book();
  const st = ss.getSheetByName('Setup') || ss.insertSheet('Setup');
  st.clear();
  st.getRange('A1:B3').setValues([['Copy into Cloudflare as', 'Value'], ['SHEETS_SECRET', secret], ['SHEETS_WEBHOOK_URL', 'Deploy → Manage deployments → copy the Web app URL']]);
  st.getRange('A1:B1').setFontWeight('bold');
  st.autoResizeColumns(1, 2);
}
const HEADERS = ['Order no.', 'Received', 'Status', 'Payment proof', 'Name', 'Mobile', 'Email', 'IG / FB',
  'Delivery / Pick-up', 'Date', 'Time', 'Area', 'Address', 'Items', 'Subtotal (₱)', 'Payment', 'Gift', 'Notes'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || data.secret !== secret) return json({ ok: false, error: 'bad secret' });
    const sh = sheet();
    if (data.action === 'order') {
      const o = data.order;
      sh.appendRow([o.orderId, new Date(o.createdAt), 'New', '', o.name, "'" + o.phone, o.email, o.social,
        o.fulfillment, o.date, o.time, o.zone, o.address, o.items, o.subtotal, o.payment, o.gift, o.notes]);
      try { addToCalendar(o); } catch (err) { console.warn('calendar: ' + err); }
      return json({ ok: true });
    }
    if (data.action === 'payment') {
      const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => r[0]);
      const i = ids.indexOf(data.orderId);
      const note = 'Received ' + Utilities.formatDate(new Date(), 'Asia/Manila', 'MMM d, h:mm a') + (data.amount ? ' · ' + data.amount : '');
      if (i >= 0) {
        sh.getRange(i + 2, 4).setValue(note).setBackground('#d9f2dd');
        if (sh.getRange(i + 2, 3).getValue() === 'New') sh.getRange(i + 2, 3).setValue('Check payment');
      } else {
        sh.appendRow([data.orderId, new Date(), 'Check payment', note + ' (order not found)', '', "'" + data.phone]);
      }
      return json({ ok: true });
    }
    return json({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function sheet() {
  const ss = book();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#17120e').setFontColor('#f3ece0');
    sh.setFrozenRows(1);
    // Status dropdown so you can track each order
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['New', 'Check payment', 'Confirmed', 'Baking', 'Done', 'Cancelled']).build();
    sh.getRange('C2:C').setDataValidation(rule);
  }
  return sh;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ── Google Calendar: one event per order on the pick-up date/time ──
function addToCalendar(o) {
  if (!o.date) return;
  const id = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
  const cal = id ? CalendarApp.getCalendarById(id) : CalendarApp.getDefaultCalendar();
  if (!cal) return;
  const title = '🍪 ' + o.name + ' · ' + o.items + ' · ₱' + o.subtotal;
  const desc = [
    'Order ' + o.orderId,
    o.fulfillment + ' · ' + (o.time || ''),
    'Mobile: ' + o.phone + (o.social ? ' · ' + o.social : ''),
    'Items: ' + o.items,
    'Total: ₱' + o.subtotal + ' · ' + o.payment,
    o.gift ? 'Gift: ' + o.gift : '',
    o.notes ? 'Notes: ' + o.notes : '',
  ].filter(String).join('\n');
  const slot = parseSlot(o.date, o.time);
  const ev = slot ? cal.createEvent(title, slot[0], slot[1], { description: desc })
                  : cal.createAllDayEvent(title, new Date(o.date + 'T00:00:00+08:00'), { description: desc });
  ev.setColor(o.gift ? CalendarApp.EventColor.MAUVE : CalendarApp.EventColor.ORANGE);
  ev.addPopupReminder(24 * 60); // reminder the day before
}
// "Morning (9am – 12nn)" → 9:00–12:00 on that date (Manila time). Returns null if no time is found.
function parseSlot(date, time) {
  const re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|nn|mn)?/gi, hits = [];
  let m;
  while ((m = re.exec(time || '')) && hits.length < 2) {
    let h = +m[1]; const min = +(m[2] || 0), ap = (m[3] || '').toLowerCase();
    if (h > 23) continue;
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (ap === 'mn') h = 0;
    hits.push([h, min]);
  }
  if (!hits.length) return null;
  const at = (hm) => new Date(date + 'T' + String(hm[0]).padStart(2, '0') + ':' + String(hm[1]).padStart(2, '0') + ':00+08:00');
  const start = at(hits[0]);
  let end = hits[1] ? at(hits[1]) : new Date(start.getTime() + 60 * 60 * 1000);
  if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);
  return [start, end];
}
