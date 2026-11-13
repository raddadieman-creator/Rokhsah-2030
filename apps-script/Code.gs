/**
 * منصة اختبارات الرخصة المهنية — الخادم على Google Apps Script
 * يُلصق هذا الملف في محرر Apps Script المرتبط بجدول Google Sheet.
 *
 * النشر مرتان من الملف نفسه:
 *  1) نشر «واجهة برمجية»: التنفيذ بصفتي، والوصول: أي شخص  ← يوضع رابطه في js/config.js
 *  2) نشر «لوحة»: التنفيذ بصفتي، والوصول: أنا فقط         ← رابط اللوحة الخاصة
 */

// معرّف جدول النتائج (من رابطه بين /d/ و /edit). يُترك فارغًا إذا كان السكربت مرتبطًا بالجدول نفسه
const SHEET_ID = '';
function ss_() { return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

// هوية اللوحة
const OWNER_NAME = '';
const ORG_NAME = '';
const ACCENT = '#E0A526';

const SHEET_RESULTS = 'النتائج';
const SHEET_QUESTIONS = 'أسئلة_إضافية';
const RESULT_HEADERS = ['التاريخ', 'المعرّف', 'الاسم', 'الجوال', 'المرحلة', 'التخصص', 'الاختبار', 'رمز البنك', 'الطريقة',
  'عدد الأسئلة', 'الصحيحة', 'الدرجة٪', 'المُجاب', 'المدة (دقيقة)', 'انتهى الوقت', 'الأداء في المحاور', 'أرقام الأسئلة الخاطئة', 'الإجابات التفصيلية'];
const SHEET_ITEMS = 'الفقرات';
const ITEM_HEADERS = ['المعرّف', 'رمز البنك', 'المحور', 'السؤال', 'الإجابة الصحيحة', 'بديل 1', 'بديل 2', 'بديل 3'];
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
  sheet_(SHEET_ITEMS, ITEM_HEADERS);
}
function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1C2A48').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  } else if (sh.getLastColumn() < headers.length) {
    // إضافة أعمدة جديدة إلى ورقة قديمة دون المساس ببياناتها
    const from = sh.getLastColumn() + 1;
    sh.getRange(1, from, 1, headers.length - from + 1).setValues([headers.slice(from - 1)])
      .setFontWeight('bold').setBackground('#1C2A48').setFontColor('#ffffff');
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
          Number(d.answered) || 0, Number(d.minutes) || 0, d.timeUp ? 'نعم' : 'لا', clip_(d.axes, 1500), clip_(d.wrong, 600), clip_(d.items, 40000)]);
        saveItems_(d.meta);
      }
    } finally { lock.releaseLock(); }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false });
  }
}

// يسجل نص كل سؤال مرة واحدة فقط ليعرضه تحليل الفقرات
function saveItems_(meta) {
  if (!Array.isArray(meta) || !meta.length) return;
  const sh = sheet_(SHEET_ITEMS, ITEM_HEADERS);
  const have = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(r => have[r[0]] = 1);
  const rows = [];
  meta.forEach(m => {
    if (!Array.isArray(m) || !m[0] || have[m[0]]) return;
    have[m[0]] = 1;
    rows.push([clip_(m[0], 60), clip_(m[1], 20), Number(m[2]), clip_(m[3], 400), clip_(m[4], 200), clip_(m[5], 200), clip_(m[6], 200), clip_(m[7], 200)]);
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, ITEM_HEADERS.length).setValues(rows);
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
  const sh = ss_().getSheetByName(SHEET_QUESTIONS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, QUESTION_HEADERS.length).getValues()
    .filter(r => String(r[1]) === String(bank) && r[9] !== 'لا' && r[2] && r[3])
    .map(r => [String(r[2]), String(r[3]), String(r[4]), String(r[5]), String(r[6]), String(r[7]), String(r[8])]);
}

/* ---------- دوال اللوحة (لصاحبة المنصة فقط) ---------- */
function getResults() {
  guard_();
  const sh = ss_().getSheetByName(SHEET_RESULTS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, RESULT_HEADERS.length).getValues().map(r => ({
    ts: r[0] instanceof Date ? r[0].getTime() : new Date(r[0]).getTime(), id: r[1], name: r[2], phone: String(r[3]).replace(/^'/, ''),
    stage: r[4], spec: r[5], test: r[6], bank: r[7], mode: r[8], total: r[9], correct: r[10], pct: r[11], answered: r[12],
    minutes: r[13], timeUp: r[14], axes: r[15], wrong: r[16]
  }));
}
function getQuestions() {
  guard_();
  const sh = ss_().getSheetByName(SHEET_QUESTIONS);
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
  const sh = ss_().getSheetByName(SHEET_QUESTIONS);
  const cell = sh.getRange(Number(row), 10);
  cell.setValue(cell.getValue() === 'لا' ? 'نعم' : 'لا');
  return getQuestions();
}
function deleteResult(id) {
  guard_();
  const sh = ss_().getSheetByName(SHEET_RESULTS);
  const ids = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().map(r => r[0]);
  const i = ids.indexOf(id);
  if (i > -1) sh.deleteRow(i + 2);
  return getResults();
}
/* تحليل الفقرات: معامل السهولة، ومعامل التمييز (الارتباط الثنائي النقطي المصحح)، وتوزيع البدائل.
   يعتمد على محاولات «الاختبار الكامل» وحدها، لأن التدريب قد يقتصر على محور واحد. */
function getItemStats(bank) {
  guard_();
  const res = ss_().getSheetByName(SHEET_RESULTS);
  if (!res || res.getLastRow() < 2) return { n: 0, items: [] };
  const rows = res.getRange(2, 1, res.getLastRow() - 1, RESULT_HEADERS.length).getValues()
    .filter(r => String(r[7]) === String(bank) && r[8] !== 'تدريب' && r[17]);
  const att = rows.map(r => {
    const picks = {};
    String(r[17]).split(';').forEach(x => { const k = x.lastIndexOf(':'); if (k > 0) picks[x.slice(0, k)] = Number(x.slice(k + 1)); });
    let tot = 0; Object.keys(picks).forEach(id => { if (picks[id] === 0) tot++; });
    return { picks: picks, tot: tot };
  });
  const meta = {};
  const it = ss_().getSheetByName(SHEET_ITEMS);
  if (it && it.getLastRow() > 1) it.getRange(2, 1, it.getLastRow() - 1, ITEM_HEADERS.length).getValues().forEach(r => {
    meta[r[0]] = { ax: r[2], q: r[3], opts: [r[4], r[5], r[6], r[7]] };
  });
  const ids = {};
  att.forEach(a => Object.keys(a.picks).forEach(id => ids[id] = 1));
  const items = Object.keys(ids).map(id => {
    const x = [], y = [], dist = [0, 0, 0, 0, 0];
    att.forEach(a => {
      if (!(id in a.picks)) return;
      const p = a.picks[id], c = p === 0 ? 1 : 0;
      dist[p >= 0 && p <= 3 ? p : 4]++;
      x.push(c); y.push(a.tot - c); // الدرجة دون هذا السؤال
    });
    const n = x.length, pv = n ? x.reduce((s, v) => s + v, 0) / n : 0;
    let rpb = null;
    if (n >= 5) {
      const my = y.reduce((s, v) => s + v, 0) / n;
      const sy = Math.sqrt(y.reduce((s, v) => s + (v - my) * (v - my), 0) / n);
      const sx = Math.sqrt(pv * (1 - pv));
      if (sy > 0 && sx > 0) {
        const cov = x.reduce((s, v, i) => s + (v - pv) * (y[i] - my), 0) / n;
        rpb = cov / (sx * sy);
      }
    }
    const m = meta[id] || {};
    return { id: id, ax: m.ax, q: m.q || '', opts: m.opts || [], n: n, p: pv, rpb: rpb, dist: dist };
  }).sort((a, b) => (a.rpb == null ? 9 : a.rpb) - (b.rpb == null ? 9 : b.rpb));
  return { n: att.length, items: items };
}
function sheetUrl() { guard_(); return ss_().getUrl(); }
function getMeta() { guard_(); return { owner: OWNER_NAME, org: ORG_NAME, accent: ACCENT, url: ss_().getUrl() }; }
