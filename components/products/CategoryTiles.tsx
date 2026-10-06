import React from "react";

export interface CategoryTileItem {
  key: string;
  name: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export const CategoryTiles: React.FC<{ items: CategoryTileItem[] }> = ({ items }) => (
  <nav aria-label="상품 카테고리" className="no-scrollbar -mx-[0.8rem] overflow-x-auto px-[0.8rem] md:mx-0 md:overflow-visible md:px-0">
    <ul className="flex w-max gap-2.5 md:grid md:w-full md:grid-cols-4 lg:grid-cols-8">
      {items.map((item) => (
        <li key={item.key} className="w-[104px] shrink-0 md:w-auto">
          <button
            type="button"
            onClick={item.onClick}
            aria-current={item.isActive ? "true" : undefined}
            className={`w-full rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
              item.isActive
                ? "border-[#001E45] bg-[#001E45] text-white"
                : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
            }`}
          >
            <p className="truncate text-[14px] font-semibold">{item.name}</p>
            {item.count > 0 && (
              <p className={`mt-0.5 text-[12px] ${item.isActive ? "text-white/70" : "text-slate-500"}`}>
                {item.count}개 상품
              </p>
            )}
          </button>
        </li>
      ))}
    </ul>
  </nav>
);
