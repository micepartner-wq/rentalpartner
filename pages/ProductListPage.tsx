import React, { useEffect, useMemo, useState } from "react";
import { useProductsPageData } from "../src/hooks/useProductsPageData";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Container } from "../components/ui/Container";
import { getCategories, type Category } from "../src/api/categoryApi";
import { getAllNavMenuItems, type NavMenuItem } from "../src/api/cmsApi";
import { getProducts, isBasicProduct, type Product } from "../src/api/productApi";
import { getProductsBySection } from "../src/api/sectionApi";
import {
  buildCategoryMaps,
  createCategorySlug,
  findCategoryByName,
  findChildCategoryBySlug,
  findTopLevelCategoryBySlug,
  getCategoryAncestors,
  getCategoryHref,
  getCategorySlug,
  isProductInCategoryBranch,
  resolveProductCategory,
  sortCategories,
} from "../src/utils/productCategoryRouting";
import { ProductCard } from "../components/products/ProductCard";
import { CategoryTiles } from "../components/products/CategoryTiles";
import { ProductsQuoteBanner, ProductsTrustBar, ProductsTrustRail } from "../components/products/ProductsTrust";
import { ClientLogoMarqueeSection } from "../components/ClientLogoMarqueeSection";
import { buildBreadcrumbJsonLd, toJsonLd } from "../src/utils/seo";

const ALL_LABEL = "전체";
const SITE_URL = "https://rentalpartner.kr";

const normalizeName = (value?: string | null) => String(value || "").trim();

export const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const { categorySlug, subcategorySlug } = useParams<{
    categorySlug?: string;
    subcategorySlug?: string;
  }>();
  const [searchParams] = useSearchParams();
  const legacyCategory = searchParams.get("category");
  const legacyTitle = searchParams.get("title");
  const sectionId = searchParams.get("sectionId");

  const { data, isLoading: loading } = useProductsPageData(sectionId);
  const [visibleCount, setVisibleCount] = useState(24);
  const [sortBy, setSortBy] = useState<'default' | 'price_desc' | 'price_asc' | 'name'>('default');
  const [searchInCat, setSearchInCat] = useState('');

  useEffect(() => {
    setVisibleCount(24);
  }, [categorySlug, subcategorySlug, legacyCategory, sectionId]);

  const products = useMemo(() => {
    if (!data?.productData) return [];
    return data.productData.filter((product) =>
      isBasicProduct(product) ||
      (!product.product_type &&
        !String(product.category || "").includes("추가") &&
        !String(product.category || "").includes("장소") &&
        !String(product.category || "").includes("음식")),
    );
  }, [data?.productData]);

  const categories = data?.categoryData || [];
  const menuItems = data?.menuData || [];

  const rootCategories = useMemo(
    () => sortCategories(categories.filter((category) => !category.parent_id)),
    [categories],
  );

  const { byId, childrenByParentId } = useMemo(
    () => buildCategoryMaps(categories),
    [categories],
  );

  const menuParentCategories = useMemo(
    () =>
      [...menuItems]
        .filter((item) => !item.category)
        .sort((a, b) => a.display_order - b.display_order),
    [menuItems],
  );

  const menuChildMap = useMemo(() => {
    const next = new Map<string, NavMenuItem[]>();

    menuItems
      .filter((item) => item.category)
      .forEach((item) => {
        const key = item.category!;
        const current = next.get(key) || [];
        current.push(item);
        next.set(key, current);
      });

    next.forEach((items, key) => {
      next.set(
        key,
        [...items].sort((a, b) => a.display_order - b.display_order),
      );
    });

    return next;
  }, [menuItems]);

  const legacyResolvedCategory = useMemo(() => {
    if (!legacyCategory || categorySlug) return null;
    if (legacyCategory.includes(",")) return null;
    return findCategoryByName(categories, legacyCategory);
  }, [categories, categorySlug, legacyCategory]);

  const activeParentCategory = useMemo(() => {
    if (categorySlug) {
      return findTopLevelCategoryBySlug(categories, categorySlug);
    }

    if (!legacyResolvedCategory) return null;
    if (!legacyResolvedCategory.parent_id) return legacyResolvedCategory;
    return byId.get(legacyResolvedCategory.parent_id) || null;
  }, [byId, categories, categorySlug, legacyResolvedCategory]);

  const activeLeafCategory = useMemo(() => {
    if (categorySlug && subcategorySlug && activeParentCategory?.id) {
      return findChildCategoryBySlug(categories, activeParentCategory.id, subcategorySlug);
    }

    if (legacyResolvedCategory && legacyResolvedCategory.parent_id) {
      return legacyResolvedCategory;
    }

    return null;
  }, [activeParentCategory, categories, categorySlug, legacyResolvedCategory, subcategorySlug]);

  const siblingCategories = useMemo(() => {
    if (!activeParentCategory?.id) return [];
    return childrenByParentId.get(activeParentCategory.id) || [];
  }, [activeParentCategory, childrenByParentId]);

  const fallbackActiveParentName = useMemo(() => {
    if (activeParentCategory?.name) return activeParentCategory.name;

    if (categorySlug) {
      const matchedParent = menuParentCategories.find(
        (item) => createCategorySlug(item.name) === categorySlug,
      );
      if (matchedParent) return matchedParent.name;
    }

    const normalizedLegacy = normalizeName(legacyCategory);
    if (normalizedLegacy) {
      if (menuChildMap.has(normalizedLegacy)) return normalizedLegacy;

      for (const [parentName, children] of menuChildMap.entries()) {
        if (children.some((child) => normalizeName(child.name) === normalizedLegacy)) {
          return parentName;
        }
      }
    }

    return null;
  }, [activeParentCategory, categorySlug, legacyCategory, menuChildMap, menuParentCategories]);

  const fallbackActiveChildName = useMemo(() => {
    if (activeLeafCategory?.name) return activeLeafCategory.name;

    if (subcategorySlug && fallbackActiveParentName) {
      const matched = (menuChildMap.get(fallbackActiveParentName) || []).find(
        (item) => createCategorySlug(item.name) === subcategorySlug,
      );
      if (matched) return matched.name;
    }

    const normalizedLegacy = normalizeName(legacyCategory);
    if (normalizedLegacy && fallbackActiveParentName) {
      const matched = (menuChildMap.get(fallbackActiveParentName) || []).find(
        (item) => normalizeName(item.name) === normalizedLegacy,
      );
      if (matched) return matched.name;
    }

    return null;
  }, [activeLeafCategory, fallbackActiveParentName, legacyCategory, menuChildMap, subcategorySlug]);

  const effectiveRootCategories = useMemo(() => {
    if (rootCategories.length > 0) return rootCategories;

    return menuParentCategories.map((item, index) => ({
      id: item.id || `menu-parent-${index}`,
      name: item.name,
      slug: createCategorySlug(item.name),
      display_order: item.display_order,
      level: 1,
      parent_id: null,
    }));
  }, [menuParentCategories, rootCategories]);

  const effectiveSiblingNames = useMemo(() => {
    if (siblingCategories.length > 0) {
      return siblingCategories.map((category) => category.name);
    }

    if (fallbackActiveParentName) {
      return (menuChildMap.get(fallbackActiveParentName) || []).map((item) => item.name);
    }

    return [];
  }, [fallbackActiveParentName, menuChildMap, siblingCategories]);

  const effectiveDisplayedCategories = useMemo(
    () => (effectiveSiblingNames.length > 0 ? [ALL_LABEL, ...effectiveSiblingNames] : []),
    [effectiveSiblingNames],
  );

  const filteredProducts = useMemo(() => {
    if (activeLeafCategory) {
      return products.filter((product) => isProductInCategoryBranch(product, activeLeafCategory, categories));
    }

    if (activeParentCategory) {
      return products.filter((product) => isProductInCategoryBranch(product, activeParentCategory, categories));
    }

    if (fallbackActiveChildName) {
      return products.filter(
        (product) => normalizeName(product.category) === normalizeName(fallbackActiveChildName),
      );
    }

    if (fallbackActiveParentName && effectiveSiblingNames.length > 0) {
      const allowed = new Set(effectiveSiblingNames.map((name) => normalizeName(name)));
      return products.filter((product) => allowed.has(normalizeName(product.category)));
    }

    if (legacyCategory?.includes(",")) {
      const names = new Set(
        legacyCategory
          .split(",")
          .map((value) => normalizeName(value))
          .filter(Boolean),
      );

      return products.filter((product) => names.has(normalizeName(product.category)));
    }

    if (legacyCategory && !legacyResolvedCategory) {
      return products.filter((product) => normalizeName(product.category) === normalizeName(legacyCategory));
    }

    return products;
  }, [
    activeLeafCategory,
    activeParentCategory,
    categories,
    effectiveSiblingNames,
    fallbackActiveChildName,
    fallbackActiveParentName,
    legacyCategory,
    legacyResolvedCategory,
    products,
  ]);

  const sortedProducts = useMemo(() => {
    let result = [...filteredProducts];
    
    if (searchInCat.trim()) {
      const q = searchInCat.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.short_description?.toLowerCase().includes(q));
    }

    return result.sort((a, b) => {
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'name') return String(a.name || "").localeCompare(String(b.name || ""), "ko-KR");

      const categoryA = resolveProductCategory(a, categories);
      const categoryB = resolveProductCategory(b, categories);
      const orderA = categoryA?.display_order ?? 999999;
      const orderB = categoryB?.display_order ?? 999999;
      if (orderA !== orderB) return orderA - orderB;

      const categoryNameCompare = String(a.category || "").localeCompare(String(b.category || ""), "ko-KR");
      if (categoryNameCompare !== 0) return categoryNameCompare;

      return String(a.name || "").localeCompare(String(b.name || ""), "ko-KR");
    });
  }, [categories, filteredProducts, sortBy, searchInCat]);

  const productRootById = useMemo(() => {
    const map = new Map<string, Category>();
    products.forEach((product) => {
      if (!product.id) return;
      const root = getCategoryAncestors(resolveProductCategory(product, categories), byId)[0];
      if (root) map.set(product.id, root);
    });
    return map;
  }, [byId, categories, products]);

  const rootToneIndexById = useMemo(
    () => new Map(effectiveRootCategories.map((category, index) => [category.id, index])),
    [effectiveRootCategories],
  );

  const subCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const parentProducts = activeParentCategory
      ? products.filter((product) => isProductInCategoryBranch(product, activeParentCategory, categories))
      : products;

    effectiveSiblingNames.forEach((name) => {
      const sibling = siblingCategories.find((category) => category.name === name);
      counts.set(
        name,
        sibling
          ? parentProducts.filter((product) => isProductInCategoryBranch(product, sibling, categories)).length
          : products.filter((product) => normalizeName(product.category) === normalizeName(name)).length,
      );
    });

    return counts;
  }, [activeParentCategory, categories, effectiveSiblingNames, products, siblingCategories]);

  const subCategoryTotal = useMemo(
    () =>
      activeParentCategory
        ? products.filter((product) => isProductInCategoryBranch(product, activeParentCategory, categories)).length
        : undefined,
    [activeParentCategory, categories, products],
  );

  const categoryTiles = useMemo(() => {
    if (effectiveRootCategories.length === 0) return [];

    const isAllActive = !activeParentCategory && !fallbackActiveParentName;
    return [
      {
        key: "all",
        name: ALL_LABEL,
        count: products.length,
        isActive: isAllActive,
        onClick: () => navigate("/products"),
      },
      ...effectiveRootCategories.map((category) => ({
        key: category.id || category.name,
        name: category.name,
        count: products.filter((product) => product.id && productRootById.get(product.id)?.id === category.id).length,
        isActive:
          activeParentCategory?.id === category.id ||
          (!activeParentCategory && fallbackActiveParentName === category.name),
        onClick: () => navigate(`/products/${getCategorySlug(category) || createCategorySlug(category.name)}`),
      })),
    ];
  }, [activeParentCategory, effectiveRootCategories, fallbackActiveParentName, navigate, productRootById, products]);

  const pageTitle =
    activeLeafCategory?.name ||
    activeParentCategory?.name ||
    fallbackActiveChildName ||
    fallbackActiveParentName ||
    legacyTitle ||
    (legacyCategory && !legacyCategory.includes(",") ? legacyCategory : "모든 상품");

  const canonicalPath = activeLeafCategory
    ? getCategoryHref(activeLeafCategory, byId)
    : activeParentCategory
      ? getCategoryHref(activeParentCategory, byId)
      : fallbackActiveChildName && fallbackActiveParentName
        ? `/products/${createCategorySlug(fallbackActiveParentName)}/${createCategorySlug(fallbackActiveChildName)}`
        : fallbackActiveParentName
          ? `/products/${createCategorySlug(fallbackActiveParentName)}`
          : "/products";

  const handleDisplayedCategoryClick = (name: string) => {
    const effectiveParentName = activeParentCategory?.name || fallbackActiveParentName;
    if (!effectiveParentName) return;

    if (name === ALL_LABEL) {
      if (activeParentCategory) {
        navigate(getCategoryHref(activeParentCategory, byId));
        return;
      }

      navigate(`/products/${createCategorySlug(effectiveParentName)}`);
      return;
    }

    if (activeParentCategory) {
      const target = siblingCategories.find((category) => category.name === name);
      if (!target) return;
      navigate(getCategoryHref(target, byId));
      return;
    }

    navigate(`/products/${createCategorySlug(effectiveParentName)}/${createCategorySlug(name)}`);
  };

  const breadcrumbItems = [
    { name: "홈", item: `${SITE_URL}/` },
    { name: "렌탈 상품 목록", item: `${SITE_URL}/products` },
  ];

  if (activeLeafCategory) {
    if (activeParentCategory) {
      breadcrumbItems.push({ name: activeParentCategory.name, item: `${SITE_URL}${getCategoryHref(activeParentCategory, byId)}` });
    } else if (fallbackActiveParentName) {
      breadcrumbItems.push({ name: fallbackActiveParentName, item: `${SITE_URL}/products/${createCategorySlug(fallbackActiveParentName)}` });
    }
    breadcrumbItems.push({ name: activeLeafCategory.name, item: `${SITE_URL}${getCategoryHref(activeLeafCategory, byId)}` });
  } else if (activeParentCategory) {
    breadcrumbItems.push({ name: activeParentCategory.name, item: `${SITE_URL}${getCategoryHref(activeParentCategory, byId)}` });
  } else if (fallbackActiveChildName && fallbackActiveParentName) {
    breadcrumbItems.push({ name: fallbackActiveParentName, item: `${SITE_URL}/products/${createCategorySlug(fallbackActiveParentName)}` });
    breadcrumbItems.push({ name: fallbackActiveChildName, item: `${SITE_URL}/products/${createCategorySlug(fallbackActiveParentName)}/${createCategorySlug(fallbackActiveChildName)}` });
  } else if (fallbackActiveParentName) {
    breadcrumbItems.push({ name: fallbackActiveParentName, item: `${SITE_URL}/products/${createCategorySlug(fallbackActiveParentName)}` });
  }

  const itemListElement = sortedProducts.map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${SITE_URL}/products/${product.id}`
  }));

  const jsonLdData = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbJsonLd(breadcrumbItems),
      ...(itemListElement.length > 0 ? [{
        "@type": "ItemList",
        itemListElement
      }] : [])
    ]
  };

  return (
    <div className="bg-white pb-20">
      <Helmet>
        <title>{`${pageTitle} | 렌탈어때`}</title>
        <meta
          name="description"
          content={`${pageTitle} 카테고리의 렌탈 상품을 확인해보세요. 렌탈어때에서 카테고리별 상품과 견적 상담을 빠르게 비교할 수 있습니다.`}
        />
        <link rel="canonical" href={`${SITE_URL}${canonicalPath}`} />
        <script type="application/ld+json">{toJsonLd(jsonLdData)}</script>
      </Helmet>

      <div className="relative">
        <ProductsTrustRail />
      <div className="border-b border-slate-100 bg-slate-50">
        <Container>
          <div className="pb-8 pt-10 md:pb-10 md:pt-14">
            <h1 className="text-2xl font-bold leading-tight text-slate-900 md:text-[32px]">{pageTitle}</h1>
            <p className="mt-2 text-sm text-slate-500 md:text-base">
              {activeParentCategory || fallbackActiveParentName
                ? "원하는 상품을 골라 바로 견적을 문의해 보세요."
                : "사무기기부터 행사용품까지, 카테고리별로 렌탈 상품을 둘러보세요."}
            </p>
            {categoryTiles.length > 0 && (
              <div className="mt-6 md:mt-8">
                <CategoryTiles items={categoryTiles} />
              </div>
            )}

            {effectiveDisplayedCategories.length > 0 && (
              <div className="no-scrollbar -mx-[0.8rem] mt-4 overflow-x-auto px-[0.8rem] md:mx-0 md:overflow-visible md:px-0">
                <div className="flex w-max items-center gap-2 md:w-auto md:flex-wrap">
                  <span className="mr-1 shrink-0 text-[13px] font-semibold text-slate-500">
                    {activeParentCategory?.name || fallbackActiveParentName} ›
                  </span>
                  {effectiveDisplayedCategories.map((categoryName) => {
                    const isActive =
                      (categoryName === ALL_LABEL && !activeLeafCategory && !fallbackActiveChildName) ||
                      activeLeafCategory?.name === categoryName ||
                      fallbackActiveChildName === categoryName;
                    const count = categoryName === ALL_LABEL ? subCategoryTotal : subCategoryCounts.get(categoryName);

                    return (
                      <button
                        key={categoryName}
                        onClick={() => handleDisplayedCategoryClick(categoryName)}
                        aria-current={isActive ? "true" : undefined}
                        className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-[14px] font-semibold transition-colors ${
                          isActive
                            ? "border-transparent bg-[#DCE4F0] text-[#001E45]"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-[#001E45]"
                        }`}
                      >
                        {categoryName}
                        {count !== undefined && <span className="ml-1.5 font-medium text-slate-400">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Container>
      </div>

      <ProductsTrustBar />

      <Container>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#001E45]" size={40} />
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            등록된 상품이 없습니다.{" "}
            <Link to="/admin/products" className="text-[#001E45] underline">
              Admin에서 상품 추가
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 pb-4 pt-6 md:pt-8">
              <div className="text-sm text-gray-500">
                총 <span className="font-semibold text-[#001E45]">{sortedProducts.length}</span>개의 상품
              </div>
              <div className="flex w-full md:w-auto items-center gap-3">
                <input
                  type="text"
                  placeholder="카테고리 내 검색"
                  value={searchInCat}
                  onChange={(e) => setSearchInCat(e.target.value)}
                  className="w-full md:w-[180px] h-[38px] px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#001E45] focus:ring-1 focus:ring-[#001E45] transition-colors"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-[38px] px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#001E45] focus:ring-1 focus:ring-[#001E45] transition-colors cursor-pointer"
                >
                  <option value="default">기본순</option>
                  <option value="price_asc">가격 낮은순</option>
                  <option value="price_desc">가격 높은순</option>
                  <option value="name">이름순</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {sortedProducts.slice(0, visibleCount).map((product) => {
                const root = product.id ? productRootById.get(product.id) : undefined;
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    badgeLabel={root?.name || product._parent_category || null}
                    badgeToneIndex={root?.id ? (rootToneIndexById.get(root.id) ?? -1) : -1}
                  />
                );
              })}
            </div>

            {visibleCount < sortedProducts.length && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="px-8 py-3 rounded-xl border border-slate-200 bg-white text-[15px] font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-[#001E45] hover:border-[#001E45]"
                >
                  더 보기 ({visibleCount} / {sortedProducts.length})
                </button>
              </div>
            )}
          </>
        )}

        <ProductsQuoteBanner />
      </Container>
      </div>

      <div className="mt-14">
        <ClientLogoMarqueeSection />
      </div>
    </div>
  );
};
