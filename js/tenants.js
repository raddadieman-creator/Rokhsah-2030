/* المشتركات: لكل مدربة سطر هنا ومجلد باسم المفتاح نفسه (يُولَّد بالأمر: python3 make_tenants.py)
   ACTIVE: false يغلق المنصة فورًا. EXPIRES: تاريخ انتهاء الاشتراك بصيغة YYYY-MM-DD */
window.TENANTS = {
  amani: {
    PLATFORM_NAME: "مِحَكّ",
    OWNER_NAME: "أ. أماني الردادي",
    ORG_NAME: "متوسطة أروى بنت أنيس وثانوية البيان",
    LOGO_URL: "",
    SCRIPT_URL: "",
    ACCENT: "#A99BD6",
    ACCENT_SOFT: "#EFEBF9",
    ACCENT_TEXT: "#4B3C86",
    ACTIVE: true,
    EXPIRES: "2027-11-13"
  }
};

/* دمج إعدادات المشتركة مع الإعدادات العامة */
(function () {
  const id = window.TENANT;
  if (!id) return;
  const t = window.TENANTS[id];
  if (!t) { window.CONFIG.BLOCKED = "notfound"; return; }
  Object.assign(window.CONFIG, t);
  const today = new Date().toISOString().slice(0, 10);
  if (t.ACTIVE === false || (t.EXPIRES && today > t.EXPIRES)) window.CONFIG.BLOCKED = "expired";
})();
