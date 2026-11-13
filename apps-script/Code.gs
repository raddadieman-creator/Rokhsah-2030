/**
 * منصة محاكاة الرخصة المهنية — الخادم على Google Apps Script
 * يُلصق هذا الملف في محرر Apps Script المرتبط بجدول Google Sheet.
 *
 * النشر مرتان من الملف نفسه:
 *  1) نشر «واجهة برمجية»: التنفيذ بصفتي، والوصول: أي شخص  ← يوضع رابطه في js/config.js
 *  2) نشر «لوحة»: التنفيذ بصفتي، والوصول: أنا فقط         ← رابط اللوحة الخاصة
 */

const SHEET_RESULTS = 'النتائج';
const SHEET_QUESTIONS = 'أسئلة_إضافية';
const RESULT_HEADERS = ['التاريخ', 'المعرّف', 'الاسم', 'الجوال', 'المرحلة', 'التخصص', 'الاختبار', 'رمز البنك', 'الطريقة',
  'عدد الأسئلة', 'الصحيحة', 'الدرجة٪', 'المُجاب', 'المدة (دقيقة)', 'انتهى الوقت', 'الأداء في المحاور', 'أرقام الأسئلة الخاطئة'];
const QUESTION_HEADERS = ['المعرّف', 'رمز البنك', 'السؤال', 'الإجابة الصحيحة', 'بديل 1', 'بديل 2', 'بديل 3', 'التفسير', 'المحور', 'مفعّل', 'تاريخ الإضافة'];

/* ---------- الإعداد ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('منصة الرخصة')
    .addItem('تجهيز الأوراق', 'setup')
    .addToUi();
}
function setup() {
  sheet_(SHEET_RESULTS, RESULT_HEADERS);
  sheet_(SHEET_QUESTIONS, QUESTION_HEADERS);
}
function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1C2A48').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  }
  return sh;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function isOwner_() {
  const active = Session.getActiveUser().getEmail();
  return !!active && active === Session.getEffectiveUser().getEmail();
}
function guard_() {
  if (!isOwner_()) throw new Error('غير مصرح');
}
function clip_(v, n) { return String(v == null ? '' : v).slice(0, n || 500); }

/* ---------- استقبال النتائج من المنصة ---------- */
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.action !== 'result') return json_({ ok: false });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const sh = sheet_(SHEET_RESULTS, RESULT_HEADERS);
      const ids = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().map(r => r[0]) : [];
      if (ids.indexOf(d.id) === -1) {
        sh.appendRow([new Date(d.ts || Date.now()), clip_(d.id, 40), clip_(d.name, 120), "'" + clip_(d.phone, 15), clip_(d.stage, 20), clip_(d.spec, 80),
          clip_(d.test, 80), clip_(d.bank, 20), clip_(d.mode, 20), Number(d.total) || 0, Number(d.correct) || 0, Number(d.pct) || 0,
          Number(d.answered) || 0, Number(d.minutes) || 0, d.timeUp ? 'نعم' : 'لا', clip_(d.axes, 1500), clip_(d.wrong, 600)]);
      }
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false });
  }
}

/* ---------- الطلبات العامة واللوحة ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'questions') return json_({ ok: true, items: questionsFor_(p.bank) });
  if (isOwner_()) {
    return HtmlService.createHtmlOutputFromFile('Dashboard')
      .setTitle('لوحة نتائج المنصة')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return json_({ ok: true, service: 'rukhsa' });
}
function questionsFor_(bank) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_QUESTIONS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, QUESTION_HEADERS.length).getValues()
    .filter(r => String(r[1]) === String(bank) && r[9] !== 'لا' && r[2] && r[3])
    .map(r => [String(r[2]), String(r[3]), String(r[4]), String(r[5]), String(r[6]), String(r[7]), String(r[8])]);
}

/* ---------- دوال اللوحة (لصاحبة المنصة فقط) ---------- */
function getResults() {
  guard_();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESULTS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, RESULT_HEADERS.length).getValues().map(r => ({
    ts: r[0] instanceof Date ? r[0].getTime() : new Date(r[0]).getTime(), id: r[1], name: r[2], phone: String(r[3]).replace(/^'/, ''),
    stage: r[4], spec: r[5], test: r[6], bank: r[7], mode: r[8], total: r[9], correct: r[10], pct: r[11], answered: r[12],
    minutes: r[13], timeUp: r[14], axes: r[15], wrong: r[16]
  }));
}
function getQuestions() {
  guard_();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_QUESTIONS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, QUESTION_HEADERS.length).getValues().map((r, i) => ({
    row: i + 2, id: r[0], bank: r[1], q: r[2], correct: r[3], d1: r[4], d2: r[5], d3: r[6], e: r[7], axis: r[8], active: r[9] !== 'لا'
  }));
}
function addQuestion(q) {
  guard_();
  if (!q || !q.bank || !q.q || !q.correct || !q.d1) throw new Error('أكملي البنك والسؤال والإجابة الصحيحة وبديلًا واحدًا على الأقل.');
  const sh = sheet_(SHEET_QUESTIONS, QUESTION_HEADERS);
  sh.appendRow(['q' + Date.now().toString(36), clip_(q.bank, 20), clip_(q.q, 1500), clip_(q.correct), clip_(q.d1), clip_(q.d2), clip_(q.d3),
    clip_(q.e, 1000), clip_(q.axis, 120), 'نعم', new Date()]);
  return getQuestions();
}
function toggleQuestion(row) {
  guard_();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_QUESTIONS);
  const cell = sh.getRange(Number(row), 10);
  cell.setValue(cell.getValue() === 'لا' ? 'نعم' : 'لا');
  return getQuestions();
}
function deleteResult(id) {
  guard_();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESULTS);
  const ids = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().map(r => r[0]);
  const i = ids.indexOf(id);
  if (i > -1) sh.deleteRow(i + 2);
  return getResults();
}
function sheetUrl() { guard_(); return SpreadsheetApp.getActiveSpreadsheet().getUrl(); }
