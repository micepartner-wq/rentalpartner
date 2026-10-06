import type { Category } from "../api/categoryApi";
import type { Product } from "../api/productApi";
import defaultCategorySlugs from "./categorySlugMap.json";

// 이름 → 기본 슬러그 표. 빌드 스크립트(scripts/generate-route-html.cjs)도 같은 파일을 읽는다.
const DEFAULT_CATEGORY_SLUGS: Record<string, string> = defaultCategorySlugs;

const collator = new Intl.Collator("ko-KR");

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

export const createCategorySlug = (name: string) => {
  const normalized = normalizeWhitespace(name);
  if (!normalized) return "";

  const mapped = DEFAULT_CATEGORY_SLUGS[normalized];
  if (mapped) return mapped;

  return normalized
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\/]/g, " ")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export const getCategorySlug = (category?: Pick<Category, "name" | "slug"> | null) =>
  normalizeWhitespace(category?.slug || "") || createCategorySlug(category?.name || "");

export const sortCategories = <T extends Pick<Category, "display_order" | "name">>(categories: T[]) =>
  [...categories].sort((a, b) => {
    const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return collator.compare(a.name || "", b.name || "");
  });

export const buildCategoryMaps = (categories: Category[]) => {
  const byId = new Map<string, Category>();
  const childrenByParentId = new Map<string | null, Category[]>();

  categories.forEach((category) => {
    if (category.id) {
      byId.set(category.id, category);
    }

    const parentId = category.parent_id || null;
    const siblings = childrenByParentId.get(parentId) || [];
    siblings.push(category);
    childrenByParentId.set(parentId, siblings);
  });

  childrenByParentId.forEach((items, parentId) => {
    childrenByParentId.set(parentId, sortCategories(items));
  });

  return { byId, childrenByParentId };
};

export const findCategoryByName = (categories: Category[], name?: string | null) => {
  const normalized = normalizeWhitespace(name || "");
  if (!normalized) return null;

  const matches = categories.filter((category) => normalizeWhitespace(category.name) === normalized);
  if (matches.length === 0) return null;

  return [...matches].sort((a, b) => {
    const levelDiff = (b.level ?? 0) - (a.level ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  })[0];
};

export const findTopLevelCategoryBySlug = (categories: Category[], slug?: string | null) => {
  const normalized = normalizeWhitespace(slug || "").toLowerCase();
  if (!normalized) return null;

  return (
    categories.find(
      (category) =>
        !category.parent_id &&
        getCategorySlug(category).toLowerCase() === normalized,
    ) || null
  );
};

export const findChildCategoryBySlug = (
  categories: Category[],
  parentId: string | null | undefined,
  slug?: string | null,
) => {
  const normalized = normalizeWhitespace(slug || "").toLowerCase();
  if (!parentId || !normalized) return null;

  return (
    categories.find(
      (category) =>
        category.parent_id === parentId &&
        getCategorySlug(category).toLowerCase() === normalized,
    ) || null
  );
};

export const getCategoryAncestors = (
  category: Category | null | undefined,
  categoryById: Map<string, Category>,
) => {
  const chain: Category[] = [];
  let current = category || null;

  while (current) {
    chain.unshift(current);
    current = current.parent_id ? categoryById.get(current.parent_id) || null : null;
  }

  return chain;
};

export const getCategoryHref = (
  category: Category | null | undefined,
  categoryById: Map<string, Category>,
) => {
  if (!category) return "/products";

  const ancestors = getCategoryAncestors(category, categoryById);
  if (ancestors.length === 0) return "/products";

  const root = ancestors[0];
  const child = ancestors[1];
  const rootSlug = getCategorySlug(root);
  const childSlug = getCategorySlug(child);

  if (!rootSlug) return "/products";
  if (!childSlug || ancestors.length === 1) {
    return `/products/${rootSlug}`;
  }

  return `/products/${rootSlug}/${childSlug}`;
};

export const getCategoryHrefByName = (categories: Category[], name?: string | null) => {
  const category = findCategoryByName(categories, name);
  if (!category) return null;
  const { byId } = buildCategoryMaps(categories);
  return getCategoryHref(category, byId);
};

export const resolveProductCategory = (product: Product, categories: Category[]) => {
  if (product.category_id) {
    const direct = categories.find((category) => category.id === product.category_id);
    if (direct) return direct;
  }

  return findCategoryByName(categories, product.category);
};

export const isProductInCategoryBranch = (
  product: Product,
  target: Category | null | undefined,
  categories: Category[],
) => {
  if (!target) return true;

  const { byId } = buildCategoryMaps(categories);
  const resolved = resolveProductCategory(product, categories);
  if (!resolved) return false;

  const ancestors = getCategoryAncestors(resolved, byId);
  return ancestors.some((category) => category.id === target.id);
};

// 대분류 개편 전 URL → 현재 URL. 현재 카테고리에 같은 슬러그가 없을 때만 적용한다.
// firebase.json 의 hosting.redirects(301)에도 같은 목록이 있으니 함께 수정할 것.
const LEGACY_PRODUCT_ROUTE_REDIRECTS: Record<string, string> = {
  "appliance-furniture": "/products/가전",
  "appliance-furniture/desk-table": "/products/사무가구/desk-table",
  "appliance-furniture/chair-sofa": "/products/사무가구/chair-sofa",
  "appliance-furniture/partition": "/products/사무가구/partition",
  "appliance-furniture/refrigerator": "/products/가전/refrigerator",
  "appliance-furniture/ac-purifier": "/products/가전",
  "tv": "/products/tv-음향",
  "tv/video-conference": "/products/tv-음향/video-conference",
  "lighting": "/products/행사용품/lighting",
};

export const getLegacyProductRedirect = (categorySlug: string, subcategorySlug?: string) =>
  LEGACY_PRODUCT_ROUTE_REDIRECTS[subcategorySlug ? `${categorySlug}/${subcategorySlug}` : categorySlug] ||
  (subcategorySlug ? LEGACY_PRODUCT_ROUTE_REDIRECTS[categorySlug] : undefined) ||
  null;
