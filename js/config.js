/* إعدادات المنصة — كل ما يخص الاسم والربط يُعدَّل من هنا فقط */
window.CONFIG = {
  // اسم المنصة واسم صاحبتها (مؤقت إلى أن يصل الاسم النهائي)
  PLATFORM_NAME: "مِحَكّ",
  PLATFORM_TAGLINE: "اختبارات الرخصة المهنية للمعلمين",
  OWNER_NAME: "أ. اسم صاحبة المنصة",
  OWNER_CONTACT: "",              // رابط واتساب أو حساب تواصل (اختياري)
  LOGO_URL: "",                   // مسار الشعار، مثل assets/logo.png (اختياري)

  // رابط تطبيق Google Apps Script بعد النشر (يُترك فارغًا إلى أن يُجهَّز الجدول)
  SCRIPT_URL: "",

  // رابط خادم الأسئلة المركزي (تطبيق Apps Script الخاص بصاحبة المنتج). إذا وُضع تُجلب الأسئلة منه
  // بعد التحقق من اشتراك المنصة، وتُحذف ملفات js/banks من المستودع العام
  QUESTIONS_URL: "https://script.google.com/macros/s/AKfycbxgdYToBhxWmjyMJ44uMUMomFqBWZ4flQDm4834B9jrj9RGX9ZDhDpuhZpNm7McCw4V/exec",

  // إعدادات الاختبارات الكاملة
  GENERAL_SIM_COUNT: 60,          // عدد أسئلة الاختبار الكامل للتربوي العام (تُسحب عشوائيًا من البنك)
  GENERAL_SIM_MINUTES: 90,
  SPEC_SIM_COUNT: 50,             // عدد أسئلة الاختبار الكامل لكل تخصص (أو كامل البنك إن كان أصغر)
  SPEC_SIM_MINUTES: 30            // الحد الأدنى للمدة؛ تُحسب دقيقة ونصف لكل سؤال
};
