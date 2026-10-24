export interface Category {
  categoryId: string;
  name: string;
  nameAr: string;
  parentCategoryId?: string | null;
  description?: string;
  children?: Category[];
}

// النسخة النهائية المؤكَّدة عبر Swagger 2026-07-19 — حقل واحد فقط للاسم (name)، لا يوجد
// nameAr في POST/PUT إطلاقاً (خلافاً لتخمين سابق أضاف nameAr كحقل مطلوب منفصل بعد خطأ 400
// كان في الواقع من نسخة أقدم من الـ endpoint).
export interface CreateCategoryDto {
  name: string;
  parentCategoryId?: string | null;
  description?: string;
}

export interface FlatCategory {
  categoryId: string;
  name: string;
  nameAr: string;
  level: number;
}
