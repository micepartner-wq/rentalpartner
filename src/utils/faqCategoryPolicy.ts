import type { FAQ } from "../api/faqApi";

// Legacy data compatibility: old records may still use '예약/결제'.
// New writes should use current naming and avoid relying on this mapping.
const LEGACY_CATEGORY_ALIAS: Record<string, string> = {
  "예약/결제": "대여/결제",
};

export const normalizeLegacyFaqCategory = (value: string) =>
  LEGACY_CATEGORY_ALIAS[value] ?? value;

export const normalizeLegacyFaqCategoryList = (categories: string[]) => {
  const normalized = categories
    .map((item) => normalizeLegacyFaqCategory(item).trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
};

export const deriveCategoriesFromFaqs = (faqs: FAQ[]) =>
  normalizeLegacyFaqCategoryList(
    faqs.map((faq) => faq.category || "").filter(Boolean),
  );
