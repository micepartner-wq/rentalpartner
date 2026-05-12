import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Container } from "./ui/Container";
import { getAllNavMenuItems, type NavMenuItem } from "../src/api/cmsApi";
import {
  getProducts,
  isGeneralBasicProduct,
  type Product,
} from "../src/api/productApi";
import {
  getHomeFeaturedCategoryTabs,
  type HomeFeaturedCategoryTabSetting,
} from "../src/api/siteSettingsApi";

interface FeaturedTab extends HomeFeaturedCategoryTabSetting {
  menu: NavMenuItem;
  categoryNames: string[];
  products: Product[];
}

export const HomeFeaturedCategorySection: React.FC = () => {
  const [tabs, setTabs] = useState<FeaturedTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSection = async () => {
      try {
        const [savedTabs, navItems, products] = await Promise.all([
          getHomeFeaturedCategoryTabs(),
          getAllNavMenuItems(),
          getProducts(),
        ]);

        const parentMenus = navItems.filter((item) => !item.category);
        const parentMenuMap = new Map(parentMenus.map((menu) => [menu.id, menu]));
        const basicProducts = products.filter(isGeneralBasicProduct);

        const resolvedTabs = savedTabs
          .filter((tab) => tab.is_active)
          .map((tab) => {
            const menu = parentMenuMap.get(tab.menu_id);
            if (!menu) return null;

            const childCategoryNames = navItems
              .filter((item) => item.category === menu.name)
              .map((item) => item.name)
              .filter(Boolean);

            const categoryNames = Array.from(
              new Set([menu.name, ...childCategoryNames].filter(Boolean)),
            );

            const tabProducts = basicProducts
              .filter((product) => categoryNames.includes(product.category || ""))
              .slice(0, 4);

            return {
              ...tab,
              menu,
              categoryNames,
              products: tabProducts,
            } satisfies FeaturedTab;
          })
          .filter((tab): tab is FeaturedTab => Boolean(tab))
          .sort((a, b) => a.display_order - b.display_order);

        setTabs(resolvedTabs);
        setActiveTabId((current) => {
          if (current && resolvedTabs.some((tab) => tab.menu.id === current)) {
            return current;
          }
          return resolvedTabs[0]?.menu.id || null;
        });
      } catch (error) {
        console.error("Failed to load home featured category tabs:", error);
        setTabs([]);
        setActiveTabId(null);
      } finally {
        setLoading(false);
      }
    };

    void loadSection();
  }, []);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.menu.id === activeTabId) || tabs[0] || null,
    [activeTabId, tabs],
  );

  useEffect(() => {
    if (!activeTab && tabs.length > 0) {
      setActiveTabId(tabs[0].menu.id || null);
    }
  }, [activeTab, tabs]);

  if (loading) {
    return (
      <section className="bg-white pb-12 md:pb-16">
        <Container>
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#001E45]" size={32} />
          </div>
        </Container>
      </section>
    );
  }

  if (!activeTab || tabs.length === 0) {
    return null;
  }

  return (
    <div className="pb-12 md:pb-16 bg-white">
      <Container>
        <div className="flex w-full mb-[20px] bg-gray-100/80 p-1.5 rounded-2xl overflow-hidden relative border border-gray-200">
          <div className="absolute inset-1.5 z-0 pointer-events-none">
            {tabs.length > 0 && activeTabId && (
              <div
                className="h-full transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
                style={{
                  width: `${100 / tabs.length}%`,
                  transform: `translateX(${tabs.findIndex((tab) => tab.menu.id === activeTabId) * 100}%)`,
                }}
              >
                <div className="h-full bg-[#001E45] rounded-xl shadow-lg shadow-[#001E45]/20 mx-0.5" />
              </div>
            )}
          </div>

          {tabs.map((tab) => (
            <button
              key={tab.menu.id}
              onClick={() => setActiveTabId(tab.menu.id || null)}
              className={`flex-1 py-3 md:py-4 text-center text-[16px] font-semibold transition-colors duration-300 relative z-10 ${
                activeTabId === tab.menu.id
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.menu.name}
            </button>
          ))}
        </div>

        {activeTab.products.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            이 카테고리에 표시할 대표 상품이 없습니다.
            <br />
            <span className="text-sm">상품 관리에서 카테고리를 연결하면 메인에 자동 반영됩니다.</span>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden">
            {activeTab.products.map((product, index) => (
              <Link
                key={product.id || `${product.name}-${index}`}
                to={`/products/${product.id}`}
                className="group relative aspect-[16/9] w-[330px] md:w-[calc(50%_-_0.6rem)] overflow-hidden block rounded-2xl cursor-pointer snap-start flex-shrink-0 bg-slate-100 shadow-sm border border-slate-100"
              >
                {product.image_url ? (
                  <div className="w-full h-full bg-white">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
                    {product.name}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
};
