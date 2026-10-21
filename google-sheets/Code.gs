/**
 * Simple Oven — order log for Google Sheets
 * ------------------------------------------
 * Paste this whole file into Extensions → Apps Script of your Google Sheet.
 * Then: Project Settings → Script properties → add  SECRET = (any long random text)
 * Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone → Deploy.
 * Copy the Web app URL into Vercel as SHEETS_WEBHOOK_URL, and the same SECRET as SHEETS_SECRET.
 */
const SHEET_NAME = 'Orders';
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
        o.fulfillment === 'pickup' ? 'Pick-up' : 'Delivery', o.date, o.time, o.zone, o.address, o.items, o.subtotal, o.payment, o.gift, o.notes]);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
