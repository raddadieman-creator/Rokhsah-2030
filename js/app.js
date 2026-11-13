(function () {
  "use strict";
  const C = window.CONFIG, G = window.GENERAL, SPECS = window.SPECS;
  const $ = (s, el = document) => el.querySelector(s);
  const main = $("#main");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const AR = ["أ", "ب", "ج", "د", "هـ"], EN = ["A", "B", "C", "D", "E"];
  const toAr = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);

  /* ---------- التخزين المحلي ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* التخزين غير متاح */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const NS = window.TENANT ? "mhk_" + window.TENANT + "_" : "mhk_";
  const K = { user: NS + "user", hist: NS + "hist", live: NS + "live" };
  const BASE = window.ASSET_BASE || "";
  let user = store.get(K.user, null);

  /* ---------- فهرس التخصصات ---------- */
  if (Array.isArray(C.STAGES)) {
    const ok = st => C.STAGES.some(x => st.includes(x)) || st === "جميع المراحل";
    SPECS.forEach(g => { g.items = g.items.filter(s => ok(s.stage)); });
    for (let i = SPECS.length - 1; i >= 0; i--) if (!SPECS[i].items.length) SPECS.splice(i, 1);
  }
  const SPEC_INDEX = {};
  SPECS.forEach(g => g.items.forEach(s => { SPEC_INDEX[s.id] = Object.assign({ file: g.file, group: g.group }, s); }));
  function bankInfo(id) {
    if (id === "gen") return { id: "gen", name: G.name, file: G.file, axes: G.standards, domains: G.domains, stage: "جميع التخصصات" };
    return SPEC_INDEX[id];
  }

  /* ---------- الهوية ---------- */
  document.title = C.PLATFORM_NAME + " | " + C.PLATFORM_TAGLINE;
  $("#brandName").textContent = C.PLATFORM_NAME;
  $("#brandOwner").textContent = C.OWNER_NAME;
  $("#footName").textContent = C.PLATFORM_NAME;
  $("#footOwner").textContent = C.OWNER_NAME;
  if (C.LOGO_URL) { const im = $("#brandLogo"); im.src = /^(https?:|data:)/.test(C.LOGO_URL) ? C.LOGO_URL : BASE + C.LOGO_URL; im.hidden = false; $(".brand-mark").hidden = true; }
  if (C.ACCENT) {
    const r = document.documentElement.style;
    r.setProperty("--mark", C.ACCENT);
    if (C.INK) r.setProperty("--ink", C.INK);
    if (C.INK_2) r.setProperty("--ink-2", C.INK_2);
    if (C.PAPER) r.setProperty("--paper", C.PAPER);
    if (C.ACCENT_SOFT) r.setProperty("--mark-soft", C.ACCENT_SOFT);
    if (C.ACCENT_TEXT) r.setProperty("--mark-text", C.ACCENT_TEXT);
  }
  if (C.ORG_NAME) { $("#footOwner").textContent = C.OWNER_NAME + " — " + C.ORG_NAME; }
  if (C.BLOCKED) {
    document.querySelector(".top-nav").hidden = true;
    main.innerHTML = '<div class="panel empty" style="margin-top:40px"><h1 class="page-h">' +
      (C.BLOCKED === "expired" ? "انتهى اشتراك هذه المنصة" : "المنصة غير موجودة") +
      '</h1><p class="page-sub">' + (C.BLOCKED === "expired" ? "تواصل مع إدارة المنصة لتجديد الاشتراك." : "تحقق من الرابط.") + "</p></div>";
    return;
  }
  function refreshChip() {
    const chip = $("#userChip");
    chip.hidden = !user;
    if (user) chip.textContent = user.name.split(" ")[0];
  }
  refreshChip();

  /* ---------- نافذة التأكيد ---------- */
  function confirmBox(title, text, okLabel) {
    return new Promise(res => {
      const m = $("#modal");
      $("#modalTitle").textContent = title; $("#modalText").textContent = text; $("#modalOk").textContent = okLabel;
      m.hidden = false; $("#modalOk").focus();
      const done = v => { m.hidden = true; $("#modalOk").onclick = $("#modalCancel").onclick = null; document.removeEventListener("keydown", onKey); res(v); };
      const onKey = e => { if (e.key === "Escape") done(false); };
      document.addEventListener("keydown", onKey);
      $("#modalOk").onclick = () => done(true);
      $("#modalCancel").onclick = () => done(false);
    });
  }

  /* ---------- تحميل البنوك ---------- */
  const loaded = {};
  function loadFile(file) {
    if (loaded[file]) return loaded[file];
    loaded[file] = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = BASE + "js/banks/" + file + ".js"; s.onload = res; s.onerror = () => { delete loaded[file]; rej(new Error("load")); };
      document.head.appendChild(s);
    });
    return loaded[file];
  }
  async function fetchExtra(id) {
    if (!C.SCRIPT_URL) return [];
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
      const r = await fetch(C.SCRIPT_URL + "?action=questions&bank=" + encodeURIComponent(id), { signal: ctl.signal });
      clearTimeout(t);
      const j = await r.json();
      return Array.isArray(j.items) ? j.items : [];
    } catch (e) { return []; }
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function normalize(id, raw, info) {
    return raw.map((r, i) => {
      let ax = r[6];
      if (typeof ax === "string") { const k = info.axes.indexOf(ax); ax = k; }
      if (typeof ax !== "number" || ax < 0 || ax >= info.axes.length) ax = -1;
      const opts = shuffle([{ t: r[1], c: true }, { t: r[2], c: false }, { t: r[3], c: false }, { t: r[4], c: false }].filter(o => o.t !== "" && o.t != null));
      return { id: id + "-" + i, text: r[0], opts, e: r[5] || "", ax };
    });
  }
  let vaultKey = null;
  async function getKey() {
    if (vaultKey) return vaultKey;
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(C.QUESTIONS_URL + "?action=key&t=" + encodeURIComponent(window.TENANT || ""), { signal: ctl.signal });
    clearTimeout(t);
    const j = await r.json();
    if (!j.ok) { const e = new Error(j.reason || "denied"); e.denied = true; throw e; }
    const raw = Uint8Array.from(atob(j.key), c => c.charCodeAt(0));
    vaultKey = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    return vaultKey;
  }
  async function serverBank(id) {
    const key = await getKey();
    const v = await (await fetch(BASE + "js/vault/" + id + ".json")).json();
    const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(v.iv) }, key, b64(v.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async function getQuestions(id) {
    const info = bankInfo(id);
    let base;
    if (C.QUESTIONS_URL) base = await serverBank(id);
    else { await loadFile(info.file); base = window.BANKS[id] || []; }
    const extra = await fetchExtra(id);
    return normalize(id, base.concat(extra), info);
  }
  function stratified(qs, n) {
    const groups = {};
    shuffle(qs).forEach(q => (groups[q.ax] = groups[q.ax] || []).push(q));
    const keys = shuffle(Object.keys(groups)); const out = [];
    while (out.length < n && keys.some(k => groups[k].length)) {
      for (const k of keys) { if (groups[k].length && out.length < n) out.push(groups[k].shift()); }
    }
    return shuffle(out);
  }

  /* ---------- الموجّه ---------- */
  let timerId = null;
  function go(hash) { if (location.hash === "#" + hash) route(); else location.hash = hash; }
  document.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b) { e.preventDefault(); go(b.dataset.go); } });
  window.addEventListener("hashchange", route);
  function route() {
    clearInterval(timerId);
    const [view, arg] = (location.hash.slice(1) || "home").split("/");
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 0);
    if (view === "exam") return viewExam();
    if (view === "setup") return need(() => viewSetup(arg), "setup/" + arg);
    if (view === "result") return viewResult(arg);
    if (view === "history") return viewHistory();
    if (view === "profile") return viewProfile();
    if (view === "register") return viewProfile(arg);
    viewHome();
  }
  function need(fn, back) { if (!user) { go("register/" + encodeURIComponent(back)); return; } fn(); }

  /* ---------- الرئيسية ---------- */
  function lastScore(bank) {
    const h = store.get(K.hist, []).filter(a => a.bank === bank && a.mode === "sim");
    return h.length ? h[0] : null;
  }
  function bubbles(p) {
    const on = Math.round((p || 0) / 20);
    return '<span class="bubbles" aria-hidden="true">' + [0, 1, 2, 3, 4].map(i => "<i" + (i < on ? ' class="on"' : "") + "></i>").join("") + "</span>";
  }
  function readyRow(label, sub, att) {
    return '<div class="ready-row"><div class="lbl">' + esc(label) + "<small>" + esc(sub) + "</small></div>" +
      (att ? '<div><div class="val">' + toAr(att.pct) + "٪</div>" + bubbles(att.pct) + "</div>" : '<div class="val none">لم يُختبر بعد</div>') + "</div>";
  }
  function viewHome() {
    const live = store.get(K.live, null);
    const mySpec = user && SPEC_INDEX[user.spec];
    const g = lastScore("gen"), s = mySpec ? lastScore(mySpec.id) : null;
    let html = '<section class="hero"><div class="hero-main">' +
      (C.LOGO_URL ? '<img class="hero-logo" src="' + esc(/^(https?:|data:)/.test(C.LOGO_URL) ? C.LOGO_URL : BASE + C.LOGO_URL) + '" alt="' + esc(C.ORG_NAME || "") + '">' : "") +
      '<h1 class="hero-name">' + esc(C.PLATFORM_NAME) + "</h1>" +
      '<p class="hero-sub">منصة محاكاة اختبارات الرخصة المهنية للمعلمين</p>' +
      (C.ORG_NAME ? '<p class="hero-org">' + esc(C.ORG_NAME) + "</p>" : "") +
      '<p class="lead">اختبارات محاكية للاختبار التربوي العام واختبارات التخصص، بزمن محدد وتنقل حر بين الأسئلة، يعقبها تقرير مفصل للأداء في كل معيار وتفسير علمي لكل إجابة.</p>' +
      '<div class="hero-actions">' +
      (live ? '<button class="btn mark" data-go="exam">استكمال الاختبار المفتوح</button>' : "") +
      '<button class="btn" data-go="setup/gen">ابدأ التربوي العام</button>' +
      (mySpec ? '<button class="btn ghost" data-go="setup/' + mySpec.id + '">اختبار ' + esc(mySpec.name) + "</button>" : '<a class="btn ghost" href="#specs">اختيار تخصص</a>') +
      "</div></div>" +
      '<div class="hero-side"><section class="about" aria-labelledby="aboutH"><h2 id="aboutH">عن اختبار الرخصة المهنية</h2><dl>' +
      "<div><dt>الاختبار التربوي العام</dt><dd>مشترك بين جميع المعلمين، ويقيس ثلاثة مجالات: القيم والمسؤوليات المهنية، والمعرفة المهنية، والممارسة المهنية.</dd></div>" +
      "<div><dt>الاختبار التخصصي</dt><dd>يقيس مفاهيم التخصص وبنيته، ولكل تخصص اختبار مستقل.</dd></div>" +
      "<div><dt>الدرجة المطلوبة</dt><dd>لا تُمنح الرخصة بأقل من ٥٠ في كل اختبار، ويتحدد مستواها بالدرجة الأدنى من الاختبارين مع المؤهل وسنوات الخبرة.</dd></div>" +
      "<div><dt>في المنصة</dt><dd>" + toAr(93) + " سؤالًا في التربوي العام، و" + toAr(Object.keys(SPEC_INDEX).length) + " تخصصًا، وتفسير لكل إجابة.</dd></div>" +
      "</dl></section>" +
      '<aside class="ready" aria-label="بطاقة الجاهزية"><h2>بطاقة جاهزيتك</h2><p class="who">' +
      (user ? esc(user.name) + (mySpec ? " — " + esc(mySpec.name) : "") : "سجّل بياناتك لتظهر نتائجك هنا") + "</p>" +
      readyRow("التربوي العام", "آخر محاكاة", g) +
      readyRow(mySpec ? mySpec.name : "اختبار التخصص", mySpec ? "آخر محاكاة" : "لم يُحدَّد التخصص", s) +
      "</aside></div></section>";

    html += '<section class="general" style="margin-top:20px"><div><h3>' + esc(G.name) + '</h3><p style="margin:0 0 8px;opacity:.8;font-size:13.5px">يشترك فيه جميع المعلمين، ويغطي ثلاثة مجالات:</p><ul>' + G.domains.map(d => "<li>" + esc(d.name) + "</li>").join("") +
      '</ul></div><div class="acts"><button class="btn mark" data-go="setup/gen">ابدأ</button></div></section>';

    html += '<div class="section-h" id="specs"><h2>اختبارات التخصص</h2><p>' + toAr(Object.keys(SPEC_INDEX).length) + ' تخصصًا</p></div>' +
      '<div class="spec-tools"><input id="specSearch" type="search" placeholder="ابحث عن تخصصك" aria-label="البحث في التخصصات"></div><div id="specGroups">' +
      SPECS.map(gr => '<div class="spec-group"><h3>' + esc(gr.group) + '</h3><ul class="spec-list">' +
        gr.items.map(it => '<li class="' + (mySpec && mySpec.id === it.id ? "mine" : "") + '" data-name="' + esc(it.name) + '"><button data-go="setup/' + it.id + '"><b>' + esc(it.name) + "</b><small>" + esc(it.stage) + "</small></button></li>").join("") +
        "</ul></div>").join("") + "</div>";
    main.innerHTML = html;
    $("#specSearch").addEventListener("input", e => {
      const q = e.target.value.trim();
      main.querySelectorAll(".spec-list li").forEach(li => { li.hidden = q && !li.dataset.name.includes(q); });
      main.querySelectorAll(".spec-group").forEach(g => { g.hidden = !g.querySelector("li:not([hidden])"); });
    });
  }

  /* ---------- التسجيل والملف ---------- */
  function specOptions(sel) {
    return '<option value="">اختر التخصص</option>' + SPECS.map(g => '<optgroup label="' + esc(g.group) + '">' +
      g.items.map(s => '<option value="' + s.id + '"' + (sel === s.id ? " selected" : "") + ">" + esc(s.name) + "</option>").join("") + "</optgroup>").join("");
  }
  function viewProfile(back) {
    const isNew = !user;
    main.innerHTML = '<div class="narrow"><div class="panel"><h1 class="page-h">' + (isNew ? "بيانات المتدرب" : "بياناتي") + "</h1>" +
      '<p class="page-sub">' + (isNew ? "تُحفظ مع نتائجك ليتابعها فريق المنصة." : "عدّل بياناتك، وتُرسل مع نتائجك القادمة.") + "</p>" +
      '<form id="pf" novalidate>' +
      '<label class="field"><span>الاسم الثلاثي</span><input name="name" autocomplete="name" required value="' + esc(user ? user.name : "") + '"></label>' +
      '<label class="field"><span>المرحلة</span><select name="stage" required><option value="">اختر المرحلة</option>' + (C.STAGES || ["ابتدائي", "متوسط", "ثانوي"]).map(o => "<option" + (user && user.stage === o ? " selected" : "") + ">" + o + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>التخصص</span><select name="spec" required>' + specOptions(user && user.spec) + "</select></label>" +
      '<p class="err" id="pfErr" role="alert"></p>' +
      '<button class="btn" type="submit" style="width:100%">' + (isNew ? "حفظ والمتابعة" : "حفظ التعديلات") + "</button></form></div></div>";
    $("#pf").addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const name = String(f.get("name")).trim().replace(/\s+/g, " ");
      const spec = String(f.get("spec")), stage = String(f.get("stage"));
      let err = "";
      if (name.split(" ").length < 3) err = "اكتب الاسم ثلاثيًا.";
      else if (!stage) err = "اختر المرحلة.";
      else if (!spec) err = "اختر التخصص.";
      $("#pfErr").textContent = err;
      if (err) return;
      user = { name, stage, spec };
      store.set(K.user, user); refreshChip();
      go(back ? decodeURIComponent(back) : "home");
    });
  }

  /* ---------- إعداد الاختبار ---------- */
  async function viewSetup(id) {
    const info = bankInfo(id);
    if (!info) return go("home");
    main.innerHTML = '<p class="loading">جارٍ تحميل الأسئلة…</p>';
    let qs;
    try { qs = await getQuestions(id); } catch (e) {
      main.innerHTML = e.denied
        ? '<div class="panel empty"><h1 class="page-h">الاشتراك غير مفعّل</h1><p class="page-sub">تواصل مع إدارة المنصة لتفعيل الاشتراك.</p></div>'
        : '<div class="empty">تعذّر تحميل الأسئلة. تحقق من الاتصال ثم أعد المحاولة.<br><button class="btn" data-go="setup/' + id + '">إعادة المحاولة</button></div>';
      return;
    }
    const isGen = id === "gen";
    const simN = isGen ? Math.min(C.GENERAL_SIM_COUNT, qs.length) : qs.length;
    const mins = isGen ? C.GENERAL_SIM_MINUTES : C.SPEC_SIM_MINUTES;
    const counts = {}; qs.forEach(q => counts[q.ax] = (counts[q.ax] || 0) + 1);
    main.innerHTML = '<div class="narrow" style="max-width:640px"><div class="panel">' +
      '<h1 class="page-h">' + esc(info.name) + '</h1><p class="page-sub">' + esc(info.stage) + " — في البنك " + toAr(qs.length) + " سؤالًا</p>" +
      '<form id="sf"><fieldset style="border:0;padding:0;margin:0"><legend class="muted" style="font-size:14px">طريقة الاختبار</legend><div class="mode-pick">' +
      '<label><input type="radio" name="mode" value="sim" checked><b>محاكاة</b><small>' + toAr(simN) + " سؤالًا في " + toAr(mins) + " دقيقة، والنتيجة والتفسيرات في النهاية.</small></label>" +
      '<label><input type="radio" name="mode" value="practice"><b>تدريب</b><small>دون وقت، وتظهر الإجابة الصحيحة وتفسيرها بعد كل سؤال.</small></label>' +
      "</div></fieldset>" +
      '<div id="practiceOpts" hidden><label class="field"><span>' + (isGen ? "المعيار" : "المحور") + '</span><select name="axis"><option value="all">الكل</option>' +
      info.axes.map((a, i) => counts[i] ? '<option value="' + i + '">' + esc(a) + " (" + toAr(counts[i]) + ")</option>" : "").join("") +
      (counts[-1] ? '<option value="-1">أسئلة مضافة (' + toAr(counts[-1]) + ")</option>" : "") + "</select></label>" +
      '<label class="field"><span>عدد الأسئلة</span><select name="count"><option value="10">١٠</option><option value="20" selected>٢٠</option><option value="all">كل الأسئلة المتاحة</option></select></label></div>' +
      '<button class="btn" type="submit" style="width:100%">بدء الاختبار</button></form></div></div>';
    const sf = $("#sf");
    sf.addEventListener("change", () => { $("#practiceOpts").hidden = sf.mode.value !== "practice"; });
    sf.addEventListener("submit", async e => {
      e.preventDefault();
      if (store.get(K.live, null) && !(await confirmBox("لديك اختبار مفتوح", "بدء اختبار جديد يلغي الاختبار المفتوح ولا يحفظ نتيجته.", "بدء اختبار جديد"))) return;
      const mode = sf.mode.value;
      let pick;
      if (mode === "sim") pick = isGen ? stratified(qs, simN) : shuffle(qs);
      else {
        const ax = sf.axis.value; let pool = ax === "all" ? qs : qs.filter(q => String(q.ax) === ax);
        const n = sf.count.value === "all" ? pool.length : Math.min(+sf.count.value, pool.length);
        pick = ax === "all" && isGen ? stratified(pool, n) : shuffle(pool).slice(0, n);
      }
      const now = Date.now();
      store.set(K.live, {
        bank: id, title: info.name, mode, dir: info.dir || "rtl", qs: pick,
        ans: pick.map(() => null), flags: pick.map(() => false), cur: 0, startedAt: now,
        endsAt: mode === "sim" ? now + mins * 60000 : null
      });
      go("exam");
    });
  }

  /* ---------- شاشة الاختبار ---------- */
  function viewExam() {
    const st = store.get(K.live, null);
    if (!st) return go("home");
    const L = st.dir === "ltr" ? EN : AR;
    const save = () => store.set(K.live, st);
    const answered = () => st.ans.filter(a => a !== null).length;

    function draw() {
      const q = st.qs[st.cur], a = st.ans[st.cur], prac = st.mode === "practice";
      const locked = prac && a !== null;
      const info = bankInfo(st.bank);
      main.innerHTML = '<div class="exam"><div class="exam-bar"><div><h1>' + esc(st.title) + "</h1><small>" + (prac ? "وضع التدريب" : "محاكاة") + " — أُجيب عن " + toAr(answered()) + " من " + toAr(st.qs.length) + "</small></div>" +
        (st.endsAt ? '<div class="timer" id="timer" role="timer" aria-label="الوقت المتبقي"></div>' : "") + "</div>" +
        '<div><article class="qcard" dir="' + st.dir + '">' +
        '<div class="qmeta" dir="rtl"><span>السؤال ' + toAr(st.cur + 1) + " من " + toAr(st.qs.length) + "</span><span>" + esc(q.ax >= 0 ? info.axes[q.ax] : "سؤال مضاف") + "</span></div>" +
        '<p class="qtext">' + esc(q.text) + '</p><ul class="opts">' +
        q.opts.map((o, i) => {
          let cls = "";
          if (locked) { if (o.c) cls = "right"; else if (i === a) cls = "wrong"; }
          return '<li><button class="opt ' + cls + '" data-i="' + i + '" aria-pressed="' + (i === a) + '"' + (locked ? " disabled" : "") + '><span class="bub">' + L[i] + "</span><span>" + esc(o.t) + "</span></button></li>";
        }).join("") + "</ul>" +
        (locked && q.e ? '<div class="explain" dir="rtl"><b>' + (q.opts[a].c ? "إجابة صحيحة" : "الإجابة الصحيحة: " + L[q.opts.findIndex(o => o.c)]) + "</b>" + esc(q.e) + "</div>" : "") +
        '<div class="qnav" dir="rtl"><button class="btn ghost small" id="prev"' + (st.cur === 0 ? " disabled" : "") + '>السابق</button>' +
        '<div class="mid"><button class="btn ghost small flag" id="flag" aria-pressed="' + st.flags[st.cur] + '">' + (st.flags[st.cur] ? "مُعلَّم للمراجعة" : "تعليم للمراجعة") + "</button></div>" +
        (st.cur < st.qs.length - 1 ? '<button class="btn small" id="next">التالي</button>' : '<button class="btn mark small" id="end2">إنهاء الاختبار</button>') +
        "</div></article></div>" +
        '<aside class="side" aria-label="خريطة الأسئلة"><h2>خريطة الأسئلة</h2><div class="grid-nav">' +
        st.qs.map((qq, i) => {
          let c = "";
          if (st.ans[i] !== null) c = prac ? (qq.opts[st.ans[i]].c ? "r" : "w") : "done";
          return '<button data-j="' + i + '" class="' + c + (st.flags[i] ? " flagged" : "") + (i === st.cur ? " cur" : "") + '" aria-label="السؤال ' + (i + 1) + '">' + toAr(i + 1) + "</button>";
        }).join("") + "</div>" +
        '<div class="legend"><span><i class="f"></i>مُجاب</span><span><i></i>لم يُجب</span><span><i class="m"></i>للمراجعة</span></div>' +
        '<button class="btn mark" id="end">إنهاء الاختبار</button><button class="btn ghost small" data-go="home">حفظ والخروج</button></aside></div>';

      main.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        st.ans[st.cur] = +b.dataset.i; save();
        if (!prac && st.cur < st.qs.length - 1) { draw(); }
        else draw();
      });
      main.querySelectorAll("[data-j]").forEach(b => b.onclick = () => { st.cur = +b.dataset.j; save(); draw(); });
      const pv = $("#prev"), nx = $("#next");
      if (pv) pv.onclick = () => { st.cur--; save(); draw(); };
      if (nx) nx.onclick = () => { st.cur++; save(); draw(); window.scrollTo({ top: 0 }); };
      $("#flag").onclick = () => { st.flags[st.cur] = !st.flags[st.cur]; save(); draw(); };
      const ask = async () => {
        const left = st.qs.length - answered(), fl = st.flags.filter(Boolean).length;
        const msg = (left ? "بقي " + toAr(left) + " سؤالًا دون إجابة. " : "أجبت عن جميع الأسئلة. ") + (fl ? "ولديك " + toAr(fl) + " مُعلَّمة للمراجعة. " : "") + "لا يمكن تعديل الإجابات بعد الإنهاء.";
        if (await confirmBox("إنهاء الاختبار؟", msg, "إنهاء وعرض النتيجة")) finish(st);
      };
      $("#end").onclick = ask; const e2 = $("#end2"); if (e2) e2.onclick = ask;
      tick();
    }
    function tick() {
      const t = $("#timer"); if (!t) return;
      const left = Math.max(0, Math.round((st.endsAt - Date.now()) / 1000));
      t.textContent = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0");
      t.classList.toggle("low", left <= 300);
      if (left === 0) { clearInterval(timerId); finish(st, true); }
    }
    clearInterval(timerId);
    if (st.endsAt) { if (Date.now() >= st.endsAt) return finish(st, true); timerId = setInterval(tick, 1000); }
    draw();
    document.onkeydown = e => {
      if (!location.hash.startsWith("#exam") || !$("#modal").hidden || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === "ArrowLeft" && st.cur < st.qs.length - 1) { st.cur++; save(); draw(); }
      else if (e.key === "ArrowRight" && st.cur > 0) { st.cur--; save(); draw(); }
    };
  }

  /* ---------- الإنهاء والحساب والإرسال ---------- */
  function band(p) {
    if (p >= 80) return { k: 3, t: "٨٠ فأعلى" };
    if (p >= 70) return { k: 2, t: "من ٧٠ إلى ٧٩" };
    if (p >= 50) return { k: 1, t: "من ٥٠ إلى ٦٩" };
    return { k: 0, t: "أقل من ٥٠" };
  }
  function finish(st, timeUp) {
    clearInterval(timerId);
    const info = bankInfo(st.bank);
    const ax = {};
    let correct = 0;
    st.qs.forEach((q, i) => {
      const ok = st.ans[i] !== null && q.opts[st.ans[i]].c;
      if (ok) correct++;
      const k = q.ax; ax[k] = ax[k] || { c: 0, n: 0 }; ax[k].n++; if (ok) ax[k].c++;
    });
    const total = st.qs.length, pct = Math.round(correct / total * 100);
    const att = {
      id: "a" + Date.now().toString(36), ts: Date.now(), bank: st.bank, title: st.title, mode: st.mode, dir: st.dir,
      total, correct, pct, answered: st.ans.filter(a => a !== null).length,
      secs: Math.round((Date.now() - st.startedAt) / 1000), timeUp: !!timeUp,
      axes: Object.keys(ax).map(k => ({ ax: +k, name: +k >= 0 ? info.axes[+k] : "أسئلة مضافة", c: ax[k].c, n: ax[k].n })).sort((a, b) => a.ax - b.ax),
      qs: st.qs, ans: st.ans, flags: st.flags, user: user ? Object.assign({}, user) : null, sent: null
    };
    const hist = store.get(K.hist, []);
    hist.unshift(att);
    hist.slice(15).forEach(h => { delete h.qs; delete h.ans; delete h.flags; });
    store.set(K.hist, hist.slice(0, 60));
    store.del(K.live);
    send(att);
    go("result/" + att.id);
  }
  function send(att) {
    if (!C.SCRIPT_URL) return;
    const L = att.dir === "ltr" ? EN : AR;
    const payload = {
      action: "result", id: att.id, ts: new Date(att.ts).toISOString(),
      name: att.user && att.user.name, phone: (att.user && att.user.phone) || "",
      spec: att.user && (SPEC_INDEX[att.user.spec] || {}).name, stage: (att.user && att.user.stage) || "",
      test: att.title, bank: att.bank, mode: att.mode === "sim" ? "محاكاة" : "تدريب",
      total: att.total, correct: att.correct, pct: att.pct, answered: att.answered,
      minutes: Math.round(att.secs / 6) / 10, timeUp: att.timeUp,
      axes: att.axes.map(a => a.name + ": " + a.c + "/" + a.n).join(" | "),
      wrong: att.qs.map((q, i) => (att.ans[i] === null || !q.opts[att.ans[i]].c) ? (i + 1) : null).filter(Boolean).join("، ")
    };
    fetch(C.SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) })
      .then(() => mark(att.id, true)).catch(() => mark(att.id, false));
  }
  function mark(id, ok) {
    const h = store.get(K.hist, []); const a = h.find(x => x.id === id);
    if (a) { a.sent = ok; store.set(K.hist, h); }
    const el = $("#sendState");
    if (el) { el.className = "send-state " + (ok ? "ok" : "bad"); el.textContent = ok ? "أُرسلت النتيجة إلى فريق المنصة." : "تعذّر إرسال النتيجة، وستبقى محفوظة في السجل."; }
  }

  /* ---------- صفحة النتيجة ---------- */
  function viewResult(id) {
    const att = store.get(K.hist, []).find(a => a.id === id);
    if (!att) return go("history");
    const b = band(att.pct), info = bankInfo(att.bank);
    const ringColor = ["var(--bad)", "var(--mark)", "var(--ink)", "var(--ok)"][b.k];
    const mm = Math.floor(att.secs / 60), ss = att.secs % 60;
    const row = a => {
      const p = Math.round(a.c / a.n * 100);
      return '<div class="bar-row"><span>' + esc(a.name) + '</span><div class="bar" role="img" aria-label="' + p + '٪"><i class="' + (p < 50 ? "lowv" : "") + '" style="width:' + p + '%"></i></div><span class="pct">' + toAr(p) + "٪<small>" + toAr(a.c) + " من " + toAr(a.n) + "</small></span></div>";
    };
    let bd = "";
    if (att.bank === "gen") {
      G.domains.forEach(d => {
        const rows = att.axes.filter(a => d.standards.includes(a.ax));
        if (rows.length) bd += '<p class="dom-h">' + esc(d.name) + "</p>" + rows.map(row).join("");
      });
      att.axes.filter(a => a.ax < 0).forEach(a => bd += row(a));
    } else bd = att.axes.map(row).join("");
    const weak = att.axes.filter(a => a.n >= 2 && a.c / a.n < .5).map(a => a.name);

    let html = '<section class="result-head"><div class="score-ring" style="--p:' + att.pct + ";--c:" + ringColor + '"><div><span><b>' + toAr(att.pct) + "٪</b><small>" + toAr(att.correct) + " من " + toAr(att.total) + "</small></span></div></div>" +
      "<div><h1>" + esc(att.title) + '</h1><span class="band b' + b.k + '">نطاق الدرجة: ' + b.t + "</span>" +
      "<p>في نظام الرخصة يُحدَّد المستوى بالدرجة الأدنى من الاختبارين مع المؤهل وسنوات الخبرة، والحد الأدنى ٥٠ في كلٍّ منهما. هذه درجة تدريبية لا تتنبأ بالدرجة الرسمية.</p>" +
      '<div class="facts"><span>الطريقة: <b>' + (att.mode === "sim" ? "محاكاة" : "تدريب") + "</b></span><span>المدة: <b>" + toAr(mm) + ":" + toAr(String(ss).padStart(2, "0")) + "</b></span><span>دون إجابة: <b>" + toAr(att.total - att.answered) + "</b></span>" + (att.timeUp ? "<span><b>انتهى الوقت</b></span>" : "") + "</div>" +
      (C.SCRIPT_URL ? '<p id="sendState" class="send-state ' + (att.sent === true ? "ok" : att.sent === false ? "bad" : "") + '">' + (att.sent === true ? "أُرسلت النتيجة إلى فريق المنصة." : att.sent === false ? "تعذّر إرسال النتيجة، وستبقى محفوظة في السجل." : "جارٍ إرسال النتيجة…") + "</p>" : "") +
      "</div></section>";
    html += '<section class="breakdown"><h2>' + (att.bank === "gen" ? "الأداء في المعايير" : "الأداء في المحاور") + "</h2>" + bd +
      (weak.length ? '<p class="explain"><b>ابدأ مراجعتك من هنا</b>' + esc(weak.join("، ")) + "</p>" : "") + "</section>";
    html += '<div class="result-actions"><button class="btn" data-go="setup/' + att.bank + '">اختبار جديد في ' + esc(info.name) + '</button><button class="btn ghost" data-go="home">اختيار اختبار آخر</button><button class="btn ghost" onclick="window.print()">طباعة النتيجة</button>' +
      (C.SCRIPT_URL && att.sent === false && att.qs ? '<button class="btn ghost" id="resend">إعادة إرسال النتيجة</button>' : "") + "</div>";
    if (att.qs) {
      html += '<section class="review"><h2>مراجعة الإجابات</h2><div class="review-tabs" role="group" aria-label="تصفية"><button data-f="all" aria-pressed="true">الكل</button><button data-f="wrong" aria-pressed="false">الخاطئة وغير المُجابة</button><button data-f="flag" aria-pressed="false">المُعلَّمة للمراجعة</button></div><div id="revList"></div></section>';
    }
    main.innerHTML = html;
    const rs = $("#resend"); if (rs) rs.onclick = () => { send(att); rs.remove(); };
    if (!att.qs) return;
    const L = att.dir === "ltr" ? EN : AR;
    const list = f => att.qs.map((q, i) => {
      const a = att.ans[i], ok = a !== null && q.opts[a].c;
      if (f === "wrong" && ok) return ""; if (f === "flag" && !att.flags[i]) return "";
      return '<article class="rev-item" dir="' + att.dir + '"><div class="qmeta" dir="rtl"><span>السؤال ' + toAr(i + 1) + " — " + (a === null ? "لم يُجب" : ok ? "صحيحة" : "خاطئة") + "</span><span>" + esc(q.ax >= 0 ? info.axes[q.ax] : "سؤال مضاف") + '</span></div><p class="qtext">' + esc(q.text) + '</p><ul class="opts">' +
        q.opts.map((o, k) => '<li><div class="opt ' + (o.c ? "right" : k === a ? "wrong" : "") + '"><span class="bub">' + L[k] + "</span><span>" + esc(o.t) + "</span></div></li>").join("") + "</ul>" +
        (q.e ? '<div class="explain" dir="rtl"><b>التفسير</b>' + esc(q.e) + "</div>" : "") + "</article>";
    }).join("") || '<p class="empty">لا توجد أسئلة في هذا التصنيف.</p>';
    $("#revList").innerHTML = list("all");
    main.querySelectorAll("[data-f]").forEach(btn => btn.onclick = () => {
      main.querySelectorAll("[data-f]").forEach(x => x.setAttribute("aria-pressed", x === btn));
      $("#revList").innerHTML = list(btn.dataset.f);
    });
  }

  /* ---------- السجل ---------- */
  function viewHistory() {
    const h = store.get(K.hist, []);
    if (!h.length) { main.innerHTML = '<div class="panel empty"><p>لم تُجرِ أي اختبار بعد على هذا الجهاز.</p><button class="btn" data-go="setup/gen">ابدأ التربوي العام</button></div>'; return; }
    main.innerHTML = '<h1 class="page-h">السجل</h1><p class="page-sub">نتائجك المحفوظة على هذا الجهاز.</p><table class="hist"><thead><tr><th>الاختبار</th><th>الدرجة</th><th>الطريقة</th><th>التاريخ</th><th></th></tr></thead><tbody>' +
      h.map(a => "<tr><td>" + esc(a.title) + '</td><td class="n">' + toAr(a.pct) + "٪</td><td>" + (a.mode === "sim" ? "محاكاة" : "تدريب") + "</td><td>" + new Date(a.ts).toLocaleDateString("ar-SA-u-ca-gregory-nu-arab", { day: "numeric", month: "short" }) + '</td><td><button class="btn ghost small" data-go="result/' + a.id + '">عرض</button></td></tr>').join("") + "</tbody></table>";
  }

  route();
})();
