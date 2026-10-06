import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getCategories } from "../src/api/categoryApi";
import { getAllNavMenuItems } from "../src/api/cmsApi";
import {
  createCategorySlug,
  findChildCategoryBySlug,
  findTopLevelCategoryBySlug,
  getLegacyProductRedirect,
} from "../src/utils/productCategoryRouting";
import { ProductListPage } from "./ProductListPage";
import { ProductDetailPage } from "./ProductDetail";
import { NotFound } from "./NotFound";

const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ProductRouteResolver: React.FC = () => {
  const { categorySlug, subcategorySlug } = useParams<{
    categorySlug?: string;
    subcategorySlug?: string;
  }>();
  const [state, setState] = useState<"loading" | "category" | "detail" | "not-found">("loading");
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    // 주소가 바뀌면(리다이렉트 직후 포함) 이전 판정을 지우고 다시 판정한다.
    setRedirectUrl(null);
    setState("loading");
    let cancelled = false;

    const resolve = async () => {
      if (!categorySlug) {
        setState("not-found");
        return;
      }

      if (!subcategorySlug && UUID_LIKE_PATTERN.test(categorySlug)) {
        setState("detail");
        return;
      }

      const normalizedCat = createCategorySlug(categorySlug);
      const normalizedSub = subcategorySlug ? createCategorySlug(subcategorySlug) : undefined;

      if (normalizedCat !== categorySlug || (subcategorySlug && normalizedSub !== subcategorySlug)) {
        setRedirectUrl(normalizedSub ? `/products/${normalizedCat}/${normalizedSub}` : `/products/${normalizedCat}`);
        return;
      }

      try {
        const [categories, menuItems] = await Promise.all([
          getCategories().catch(() => []),
          getAllNavMenuItems().catch(() => []),
        ]);
        if (cancelled) return;
        const parent = findTopLevelCategoryBySlug(categories, categorySlug);
        const fallbackParent = menuItems.find(
          (item) => !item.category && createCategorySlug(item.name) === categorySlug,
        );

        const legacyRedirect = parent ? null : getLegacyProductRedirect(categorySlug, subcategorySlug);
        if (legacyRedirect) {
          setRedirectUrl(legacyRedirect);
          return;
        }

        if (!parent && !fallbackParent) {
          setState(!subcategorySlug ? "detail" : "not-found");
          return;
        }

        if (!subcategorySlug) {
          setState("category");
          return;
        }

        const child = parent ? findChildCategoryBySlug(categories, parent.id, subcategorySlug) : null;
        const fallbackChild = fallbackParent
          ? menuItems.find(
              (item) =>
                item.category === fallbackParent.name &&
                createCategorySlug(item.name) === subcategorySlug,
            )
          : null;

        setState(child || fallbackChild ? "category" : "not-found");
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to resolve product route:", error);
        setState(!subcategorySlug ? "detail" : "not-found");
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [categorySlug, subcategorySlug]);

  if (redirectUrl) {
    return <Navigate to={redirectUrl} replace />;
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#001E45]" size={36} />
      </div>
    );
  }

  if (state === "category") {
    return <ProductListPage />;
  }

  if (state === "detail") {
    return <ProductDetailPage />;
  }

  return <NotFound />;
};
