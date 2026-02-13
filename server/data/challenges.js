// ============================================================
// Arena Game Challenges - Expanded Data Set
// ============================================================

export const ARENA_CHALLENGES = [
  { type: "speed_tap", name: "سرعة الضغط", icon: "⚡", desc: "اضغط أسرع ما تقدر!", time: 8 },
  { type: "memory", name: "اختبار الذاكرة", icon: "🧠", desc: "تذكر التسلسل الصحيح!", time: 15 },
  { type: "math", name: "رياضيات سريعة", icon: "🔢", desc: "حل المسألة قبل الوقت!", time: 10 },
  { type: "reaction", name: "ردة الفعل", icon: "🎯", desc: "اضغط لمن يتحول أخضر!", time: 10 },
  { type: "word", name: "رتّب الحروف", icon: "🔤", desc: "رتب الحروف المبعثرة!", time: 15 },
  { type: "color", name: "تحدي الألوان", icon: "🎨", desc: "اختر اللون الصحيح مو الكلمة!", time: 8 },
];

// ============================================================
// MATH_PROBLEMS — 16 generator functions with varying difficulty
// Each returns { q: string, ans: number }
// ============================================================

export const MATH_PROBLEMS = [
  // 1. Easy addition (single/double digit)
  () => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    return { q: `${a} + ${b} = ?`, ans: a + b };
  },

  // 2. Hard addition (double/triple digit)
  () => {
    const a = Math.floor(Math.random() * 400) + 50;
    const b = Math.floor(Math.random() * 400) + 50;
    return { q: `${a} + ${b} = ?`, ans: a + b };
  },

  // 3. Easy subtraction (positive result)
  () => {
    const b = Math.floor(Math.random() * 15) + 1;
    const a = b + Math.floor(Math.random() * 20) + 1;
    return { q: `${a} - ${b} = ?`, ans: a - b };
  },

  // 4. Hard subtraction (larger numbers, positive result)
  () => {
    const b = Math.floor(Math.random() * 200) + 30;
    const a = b + Math.floor(Math.random() * 300) + 50;
    return { q: `${a} - ${b} = ?`, ans: a - b };
  },

  // 5. Easy multiplication (single digit)
  () => {
    const a = Math.floor(Math.random() * 9) + 2;
    const b = Math.floor(Math.random() * 9) + 2;
    return { q: `${a} × ${b} = ?`, ans: a * b };
  },

  // 6. Hard multiplication (one double digit factor)
  () => {
    const a = Math.floor(Math.random() * 12) + 2;
    const b = Math.floor(Math.random() * 40) + 10;
    return { q: `${a} × ${b} = ?`, ans: a * b };
  },

  // 7. Division (exact, no remainders)
  () => {
    const b = Math.floor(Math.random() * 9) + 2;
    const ans = Math.floor(Math.random() * 12) + 2;
    const a = b * ans;
    return { q: `${a} ÷ ${b} = ?`, ans: ans };
  },

  // 8. Division (larger numbers, exact)
  () => {
    const b = Math.floor(Math.random() * 12) + 3;
    const ans = Math.floor(Math.random() * 20) + 5;
    const a = b * ans;
    return { q: `${a} ÷ ${b} = ?`, ans: ans };
  },

  // 9. Square roots (small perfect squares 4–81)
  () => {
    const root = Math.floor(Math.random() * 8) + 2;
    const square = root * root;
    return { q: `√${square} = ?`, ans: root };
  },

  // 10. Square roots (large perfect squares 121–400)
  () => {
    const roots = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const root = roots[Math.floor(Math.random() * roots.length)];
    const square = root * root;
    return { q: `√${square} = ?`, ans: root };
  },

  // 11. Percentages (easy)
  () => {
    const percentages = [10, 20, 25, 50, 75];
    const bases = [40, 60, 80, 100, 120, 200, 400, 500, 1000];
    const pct = percentages[Math.floor(Math.random() * percentages.length)];
    const base = bases[Math.floor(Math.random() * bases.length)];
    const ans = (pct / 100) * base;
    return { q: `ما هو ${pct}% من ${base}؟`, ans: ans };
  },

  // 12. Percentages (harder)
  () => {
    const percentages = [5, 15, 30, 40, 60];
    const bases = [60, 80, 120, 200, 300, 500];
    const pct = percentages[Math.floor(Math.random() * percentages.length)];
    const base = bases[Math.floor(Math.random() * bases.length)];
    const ans = (pct / 100) * base;
    return { q: `ما هو ${pct}% من ${base}؟`, ans: ans };
  },

  // 13. Powers — squares
  () => {
    const base = Math.floor(Math.random() * 12) + 2;
    return { q: `${base}² = ?`, ans: base * base };
  },

  // 14. Powers — cubes (small bases)
  () => {
    const base = Math.floor(Math.random() * 5) + 2;
    return { q: `${base}³ = ?`, ans: base * base * base };
  },

  // 15. Mixed operation: (a + b) × c
  () => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    const c = Math.floor(Math.random() * 5) + 2;
    const ans = (a + b) * c;
    return { q: `(${a} + ${b}) × ${c} = ?`, ans: ans };
  },

  // 16. Mixed operation: a × b - c
  () => {
    const a = Math.floor(Math.random() * 7) + 2;
    const b = Math.floor(Math.random() * 7) + 2;
    const c = Math.floor(Math.random() * 10) + 1;
    const product = a * b;
    const ans = product - c;
    return { q: `${a} × ${b} - ${c} = ?`, ans: ans };
  },
];

// ============================================================
// WORD_PUZZLES — 100 Arabic words across 19 categories
// Each: { word: string, category: string }
// ============================================================

export const WORD_PUZZLES = [
  // ---- حيوان (Animals) ----
  { word: "أسد", category: "حيوان" },
  { word: "نمر", category: "حيوان" },
  { word: "فيل", category: "حيوان" },
  { word: "قط", category: "حيوان" },
  { word: "كلب", category: "حيوان" },
  { word: "حصان", category: "حيوان" },
  { word: "ثعلب", category: "حيوان" },
  { word: "دب", category: "حيوان" },
  { word: "ذئب", category: "حيوان" },
  { word: "غزال", category: "حيوان" },
  { word: "أرنب", category: "حيوان" },
  { word: "جمل", category: "حيوان" },

  // ---- نقل (Transportation) ----
  { word: "سيارة", category: "نقل" },
  { word: "طيارة", category: "نقل" },
  { word: "قطار", category: "نقل" },
  { word: "باص", category: "نقل" },
  { word: "دراجة", category: "نقل" },
  { word: "سفينة", category: "نقل" },
  { word: "مركب", category: "نقل" },

  // ---- طبيعة (Nature) ----
  { word: "شجرة", category: "طبيعة" },
  { word: "بحر", category: "طبيعة" },
  { word: "نهر", category: "طبيعة" },
  { word: "جبل", category: "طبيعة" },
  { word: "سحاب", category: "طبيعة" },
  { word: "قمر", category: "طبيعة" },
  { word: "شمس", category: "طبيعة" },
  { word: "نجمة", category: "طبيعة" },

  // ---- طعام (Food) ----
  { word: "خبز", category: "طعام" },
  { word: "رز", category: "طعام" },
  { word: "دجاج", category: "طعام" },
  { word: "سمك", category: "طعام" },
  { word: "لحم", category: "طعام" },
  { word: "بيض", category: "طعام" },
  { word: "جبنة", category: "طعام" },

  // ---- مشروب (Drinks) ----
  { word: "ماء", category: "مشروب" },
  { word: "حليب", category: "مشروب" },
  { word: "شاي", category: "مشروب" },
  { word: "قهوة", category: "مشروب" },
  { word: "عصير", category: "مشروب" },

  // ---- رياضة (Sports) ----
  { word: "كرة", category: "رياضة" },
  { word: "سباحة", category: "رياضة" },
  { word: "ركض", category: "رياضة" },
  { word: "ملعب", category: "رياضة" },
  { word: "هدف", category: "رياضة" },
  { word: "فريق", category: "رياضة" },

  // ---- تعليم (Education) ----
  { word: "كتاب", category: "تعليم" },
  { word: "قلم", category: "تعليم" },
  { word: "مدرسة", category: "تعليم" },
  { word: "معلم", category: "تعليم" },
  { word: "درس", category: "تعليم" },
  { word: "ورقة", category: "تعليم" },

  // ---- فضاء (Space) ----
  { word: "كوكب", category: "فضاء" },
  { word: "نجم", category: "فضاء" },
  { word: "مجرة", category: "فضاء" },
  { word: "صاروخ", category: "فضاء" },
  { word: "مدار", category: "فضاء" },

  // ---- بلد (Countries) ----
  { word: "مصر", category: "بلد" },
  { word: "عمان", category: "بلد" },
  { word: "كويت", category: "بلد" },
  { word: "يمن", category: "بلد" },
  { word: "عراق", category: "بلد" },
  { word: "تونس", category: "بلد" },

  // ---- مدينة (Cities) ----
  { word: "جدة", category: "مدينة" },
  { word: "دبي", category: "مدينة" },
  { word: "بغداد", category: "مدينة" },
  { word: "تبوك", category: "مدينة" },

  // ---- فاكهة (Fruits) ----
  { word: "تفاح", category: "فاكهة" },
  { word: "موز", category: "فاكهة" },
  { word: "عنب", category: "فاكهة" },
  { word: "برتقال", category: "فاكهة" },
  { word: "تمر", category: "فاكهة" },
  { word: "مانجو", category: "فاكهة" },
  { word: "خوخ", category: "فاكهة" },

  // ---- خضار (Vegetables) ----
  { word: "طماطم", category: "خضار" },
  { word: "خيار", category: "خضار" },
  { word: "بصل", category: "خضار" },
  { word: "ثوم", category: "خضار" },
  { word: "جزر", category: "خضار" },
  { word: "فلفل", category: "خضار" },

  // ---- مهنة (Professions) ----
  { word: "طبيب", category: "مهنة" },
  { word: "مهندس", category: "مهنة" },
  { word: "طباخ", category: "مهنة" },
  { word: "خياط", category: "مهنة" },
  { word: "نجار", category: "مهنة" },
  { word: "رسام", category: "مهنة" },

  // ---- لعبة (Games) ----
  { word: "شطرنج", category: "لعبة" },
  { word: "لغز", category: "لعبة" },
  { word: "نرد", category: "لعبة" },
  { word: "ورق", category: "لعبة" },

  // ---- ملابس (Clothing) ----
  { word: "قميص", category: "ملابس" },
  { word: "حذاء", category: "ملابس" },
  { word: "قبعة", category: "ملابس" },
  { word: "معطف", category: "ملابس" },
  { word: "جوارب", category: "ملابس" },

  // ---- أثاث (Furniture) ----
  { word: "كرسي", category: "أثاث" },
  { word: "طاولة", category: "أثاث" },
  { word: "سرير", category: "أثاث" },
  { word: "خزانة", category: "أثاث" },
  { word: "رف", category: "أثاث" },

  // ---- آلة موسيقية (Musical Instruments) ----
  { word: "عود", category: "آلة موسيقية" },
  { word: "طبل", category: "آلة موسيقية" },
  { word: "ناي", category: "آلة موسيقية" },
  { word: "كمان", category: "آلة موسيقية" },

  // ---- لون (Colors) ----
  { word: "أحمر", category: "لون" },
  { word: "أزرق", category: "لون" },
  { word: "أخضر", category: "لون" },

  // ---- جسم (Body) ----
  { word: "يد", category: "جسم" },
  { word: "عين", category: "جسم" },
  { word: "رأس", category: "جسم" },
  { word: "قلب", category: "جسم" },
  { word: "أذن", category: "جسم" },
  { word: "أنف", category: "جسم" },
];

// ============================================================
// COLOR_NAMES — 14 Arabic colors with hex codes
// ============================================================

export const COLOR_NAMES = [
  { name: "أحمر", hex: "#e74c3c" },
  { name: "أزرق", hex: "#3498db" },
  { name: "أخضر", hex: "#2ecc71" },
  { name: "أصفر", hex: "#f1c40f" },
  { name: "برتقالي", hex: "#e67e22" },
  { name: "بنفسجي", hex: "#9b59b6" },
  { name: "وردي", hex: "#e91e90" },
  { name: "أبيض", hex: "#ecf0f1" },
  { name: "رمادي", hex: "#95a5a6" },
  { name: "بني", hex: "#8b4513" },
  { name: "فيروزي", hex: "#1abc9c" },
  { name: "نيلي", hex: "#2c3e7b" },
  { name: "ذهبي", hex: "#f39c12" },
  { name: "زيتي", hex: "#6b8e23" },
];
