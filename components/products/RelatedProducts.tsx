import React, { useMemo } from "react";
import { useProductsPageData } from "../../src/hooks/useProductsPageData";
import { isBasicProduct, type Product } from "../../src/api/productApi";
import { buildCategoryMaps, getCategoryAncestors, resolveProductCategory, sortCategories } from "../../src/utils/productCategoryRouting";
import { ProductCard } from "./ProductCard";

const MAX_ITEMS = 4;

export const RelatedProducts: React.FC<{ product: Product }> = ({ product }) => {
  const { data } = useProductsPageData();

  const { items, rootOf, toneOf } = useMemo(() => {
    const all = (data?.productData || []).filter((item) => isBasicProduct(item) && item.id && item.id !== product.id);
    const categories = data?.categoryData || [];
    const { byId } = buildCategoryMaps(categories);
    const roots = sortCategories(categories.filter((category) => !category.parent_id));

    const sameCategory = all.filter((item) => item.category && item.category === product.category);
    const sameType = all.filter(
      (item) => (item.catalog_type || "general") === (product.catalog_type || "general") && !sameCategory.includes(item),
    );

    return {
      items: [...sameCategory, ...sameType].slice(0, MAX_ITEMS),
      rootOf: (item: Product) => getCategoryAncestors(resolveProductCategory(item, categories), byId)[0],
      toneOf: (rootId?: string) => roots.findIndex((root) => root.id === rootId),
    };
  }, [data, product]);

  if (items.length === 0) return null;

  return (
    <section className="mt-12 border-t border-slate-200 pt-10 lg:mt-16 lg:pt-12" aria-labelledby="related-products-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[#001E45]">MORE PRODUCTS</p>
          <h2 id="related-products-title" className="mt-2 text-xl font-bold text-slate-900 md:text-2xl">함께 보면 좋은 상품</h2>
          <p className="mt-2 text-sm text-slate-500">비슷한 상품을 살펴보고 필요한 구성을 비교해 보세요.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{items.length}개 상품</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {items.map((item) => {
          const root = rootOf(item);
          return (
            <ProductCard key={item.id} product={item} badgeLabel={root?.name || null} badgeToneIndex={toneOf(root?.id)} />
          );
        })}
      </div>
    </section>
  );
};
