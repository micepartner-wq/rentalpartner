const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ProductDetail.tsx');

// Import and Top Section (Fixed Korean)
let content = `import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Container } from "../components/ui/Container";
import {
  Loader2,
  AlertCircle,
  Minus,
  Plus,
  ChevronRight,
  Package,
  Users,
  ShoppingBag,
  ShoppingCart,
  Check,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getAdditionalOptionProducts,
  getProductById,
  getProducts,
  getProductsByType,
  isGeneralBasicProduct,
  Product,
  ProductOptionGroup,
  ProductOptionSelectionMode,
} from "../src/api/productApi";
import { getAllNavMenuItems, NavMenuItem } from "../src/api/cmsApi";
import { usePriceDisplay } from "../src/context/PriceDisplayContext";
import { addQuoteCartItem, getQuoteCartCount } from "../src/utils/quoteCart";
import type { ProductPriceDisplayMode } from "../src/api/siteSettingsApi";
import { Helmet } from "react-helmet-async";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  buildSeoDescription,
  SITE_URL,
  stripHtmlTags,
  toAbsoluteUrl,
  toJsonLd,
} from "../src/utils/seo";
import { getPublicPriceClassName, getPublicPriceText, INQUIRY_PRICE_TEXT_CLASS, isVisiblePriceMode } from "../src/utils/priceDisplay";
import {
  logAnalyticsEvent,
  trackProductDetailView,
  trackQuoteRequestStart,
} from "../src/utils/analytics";

// Helper to get image for basic components
const getComponentComponentImage = (name: string) => {
  if (name.includes("노트북")) return "/comp-notebook.svg";
  if (name.includes("테이블")) return "/comp-table.svg";
  if (name.includes("의자")) return "/comp-chair.svg";
  if (name.includes("복합기") || name.includes("프린터")) return "/comp-printer.svg";
  if (name.includes("냉장고")) return "/comp-fridge.svg";
  if (name.includes("커피머신")) return "/comp-coffee.svg";
  return null;
};

interface SelectedOptionSummary {
  name: string;
  qty: number;
  subtotal: number;
  quantityLabel: string;
}

interface ProductOptionSelection {
  key: string;
  groupName: string;
  valueName: string;
  quantity: number;
}

interface SummaryRow {
  label: string;
  value: React.ReactNode;
}

type OptionTabId = "additional" | "cooperative";

interface SelectedProductOption {
  product: Product;
  quantity: number;
}

const getSelectedProductOptions = (
  selectedQty: Record<string, number>,
  items: Product[],
): SelectedProductOption[] =>
  Object.entries(selectedQty).reduce<SelectedProductOption[]>((acc, [key, qty]) => {
    const quantity = qty as number;
    const item = items.find((product) => product.id === key);
    if (item && quantity > 0) {
      acc.push({ product: item, quantity });
    }
    return acc;
  }, []);

const SummaryRows = ({ rows }: { rows: SummaryRow[] }) => (
  <div className="space-y-3 text-sm">
    {rows.map((row) => (
      <div key={row.label} className="flex justify-between gap-4">
        <span className="text-gray-500">{row.label}</span>
        <span className="font-medium text-gray-900 text-right">{row.value}</span>
      </div>
    ))}
  </div>
);

const SelectedOptionsSection = ({
  items,
  priceDisplayMode,
  priceDisplayLoading,
}: {
  items: SelectedOptionSummary[];
  priceDisplayMode: ProductPriceDisplayMode;
  priceDisplayLoading: boolean;
}) => (
  <div className="mt-4 border-t border-gray-100 pt-4">
    <p className="text-xs font-semibold text-gray-500 mb-2">수량 선택</p>
    <div className="max-h-32 overflow-y-auto pr-1">
      <div className="space-y-2 text-sm">
        {items.map((opt, idx) => (
          <div key={\`\${opt.name}-\${idx}\`} className="flex justify-between text-gray-700">
            <span className="truncate flex-1">{opt.name}</span>
            {!priceDisplayLoading && !isVisiblePriceMode(priceDisplayMode) ? (
              <span className="ml-2 font-medium text-gray-900">{opt.quantityLabel}</span>
            ) : (
              <span className="font-medium ml-2 text-gray-700">
                {getPublicPriceText({
                  amount: opt.subtotal,
                  mode: priceDisplayMode,
                  loading: priceDisplayLoading,
                })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const getQuantityUnit = (type?: string) => "개";

const getProductOptionSelectionMode = (
  groups: ProductOptionGroup[] = [],
): ProductOptionSelectionMode => (groups[0]?.selection_mode === "combination" ? "combination" : "independent");

const buildProductOptionKey = (groupName: string, valueName: string) =>
  \`\${groupName}::\${valueName}\`;

const getSelectedProductOptionQuantities = (groups: ProductOptionGroup[], quantities: Record<string, number>) =>
  groups.reduce<ProductOptionSelection[]>((acc, group) => {
    for (const value of group.values || []) {
      const key = buildProductOptionKey(group.name, value.name);
      const quantity = quantities[key] || 0;
      if (quantity > 0) {
        acc.push({
          key,
          groupName: group.name,
          valueName: value.name,
          quantity,
        });
      }
    }
    return acc;
  }, []);

const OptionItem = ({
  item,
  initialQty,
  imageUrl,
  onUpdate,
  selectionMode = 'quantity',
  priceDisplayMode,
  priceDisplayLoading,
}: {
  item: Product;
  initialQty: number;
  imageUrl?: string;
  onUpdate: (qty: number) => void;
  selectionMode?: 'quantity' | 'checkbox';
  priceDisplayMode: ProductPriceDisplayMode;
  priceDisplayLoading: boolean;
}) => {
  const [localQty, setLocalQty] = useState(initialQty);

  useEffect(() => {
    setLocalQty(initialQty);
  }, [initialQty]);

  const handleCreate = () => {
    const qtyToAdd = localQty > 0 ? localQty : 1;
    onUpdate(qtyToAdd);
    setLocalQty(qtyToAdd);
  };

  const handleUpdate = () => {
    onUpdate(localQty);
  };

  const isInCart = initialQty > 0;
  const isChanged = localQty !== initialQty;
  const shouldShowOptionPrice =
    priceDisplayLoading ||
    (isVisiblePriceMode(priceDisplayMode) &&
      typeof item.price === "number" &&
      item.price > 0);

  return (
    <div className="flex items-center gap-3 sm:gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0 relative">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={20} className="text-gray-300" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-24 sm:pr-0">
        <h5 className="font-semibold text-gray-900 text-sm sm:text-[15px] leading-snug line-clamp-1">
          {item.name}
        </h5>
        {shouldShowOptionPrice && (
          <p className={getPublicPriceClassName({
            mode: priceDisplayMode,
            loading: priceDisplayLoading,
            visibleClass: 'mt-0.5 text-sm font-semibold text-[#001E45]',
            hiddenClass: \`mt-0.5 \${INQUIRY_PRICE_TEXT_CLASS}\`,
          })}>
            {getPublicPriceText({
              amount: item.price,
              mode: priceDisplayMode,
              loading: priceDisplayLoading,
              zeroAsHidden: true,
            })}
          </p>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-2">
        {selectionMode === 'checkbox' ? (
          <button
            onClick={() => onUpdate(isInCart ? 0 : 1)}
            className={\`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold transition-all border
              \${isInCart ? "bg-[#001E45] text-white border-[#001E45] shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}\`}
          >
              <Check size={16} /> {isInCart ? "구성품에서 제외" : "구성품에 추가"}
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm h-9">
              <button
                className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded transition-colors"
                onClick={() => onUpdate(Math.max(0, initialQty - 1))}
              >
                <Minus size={14} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={localQty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\\d*$/.test(val)) {
                    setLocalQty(val === "" ? 0 : parseInt(val));
                  }
                }}
                onBlur={handleUpdate}
                className="w-10 text-center font-semibold text-gray-900 text-sm border-none focus:outline-none focus:ring-0 p-0"
              />
              <button
                className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded transition-colors"
                onClick={() => onUpdate(initialQty + 1)}
              >
                <Plus size={14} />
              </button>
            </div>

            {isInCart ? (
              <button
                onClick={handleUpdate}
                disabled={!isChanged}
                className={\`px-4 h-9 rounded-lg text-sm font-semibold transition-all
                  \${isChanged ? "bg-[#001E45] text-white shadow-md" : "bg-gray-900 text-white"}\`}
              >
                {isChanged ? "수정" : <Check size={18} />}
              </button>
            ) : (
              <button
                onClick={handleCreate}
                className="px-4 h-9 rounded-lg text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
              >
                    장바구니 담기
              </button>
            )}
          </>
        )}
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:hidden">
        {selectionMode === 'checkbox' ? (
          <button
            onClick={() => onUpdate(isInCart ? 0 : 1)}
            className={\`flex items-center justify-center w-8 h-8 rounded-full transition-all border
              \${isInCart ? "bg-[#001E45] text-white border-[#001E45]" : "bg-gray-50 text-gray-400 border-gray-200"}\`}
          >
            <Check size={16} />
          </button>
        ) : (
          <>
            <button
              onClick={() => onUpdate(Math.max(0, initialQty - 1))}
              className={\`w-7 h-7 flex items-center justify-center rounded-full transition-colors
                \${initialQty > 0 ? "text-gray-900 bg-gray-50" : "text-gray-300 pointer-events-none"}\`}
            >
              <Minus size={14} />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={localQty}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\\d*$/.test(val)) {
                  setLocalQty(val === "" ? 0 : parseInt(val));
                }
              }}
              onBlur={handleUpdate}
              className={\`w-8 text-center font-semibold text-sm border-none focus:outline-none focus:ring-0 p-0 bg-transparent
                \${initialQty > 0 ? "text-gray-900" : "text-gray-400"}\`}
            />
            <button
              onClick={() => onUpdate(initialQty + 1)}
              className="w-7 h-7 flex items-center justify-center text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Plus size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const getCategorizedGroups = (items: Product[], menuItems: NavMenuItem[], tabType?: string): { name: string, display_order: number }[] => {
  const groups = new Map<string, number>();

  items.forEach(item => {
    const cat = item.category || '기타';
    let groupName = cat;
    let order = 999;

    if (tabType === 'additional') {
      const childMenu = menuItems.find(m => m.name === cat && m.category);
      if (childMenu && childMenu.category) {
        groupName = childMenu.category;
        const parentMenu = menuItems.find(m => m.name === groupName && !m.category);
        if (parentMenu) order = parentMenu.display_order;
      } else {
        const menu = menuItems.find(m => m.name === cat && !m.category);
        if (menu) order = menu.display_order;
      }
    } else {
      const menu = menuItems.find(m => m.name === cat);
      order = menu ? menu.display_order : 999;
    }

    if (!groups.has(groupName)) {
      groups.set(groupName, order);
    } else {
      groups.set(groupName, Math.min(groups.get(groupName)!, order));
    }
  });

  return Array.from(groups.entries())
    .map(([name, display_order]) => ({ name, display_order }))
    .sort((a, b) => {
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      return a.name.localeCompare(b.name, 'ko-KR');
    });
};

const OptionListTypeA = ({
  items,
  selectedQty,
  setQty,
  componentProducts,
  menuItems,
  tabType,
  selectionMode = 'quantity',
  priceDisplayMode,
  priceDisplayLoading,
}: {
  items: Product[];
  selectedQty: { [key: string]: number };
  setQty: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
  componentProducts: Product[];
  menuItems: NavMenuItem[];
  tabType?: string;
  selectionMode?: 'quantity' | 'checkbox';
  priceDisplayMode: ProductPriceDisplayMode;
  priceDisplayLoading: boolean;
}) => {
  const optionGroups = React.useMemo(() => getCategorizedGroups(items, menuItems, tabType), [items, menuItems, tabType]);
  const [localActiveCategory, setLocalActiveCategory] = useState<string>('');

  useEffect(() => {
    if (optionGroups.length > 0) {
      setLocalActiveCategory(prev => {
        if (prev && optionGroups.find(p => p.name === prev)) return prev;
        return optionGroups[0].name;
      });
    }
  }, [optionGroups]);

  if (optionGroups.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <p>해당 카테고리에 등록된 상품이 없습니다.</p>
      </div>
    );
  }

  let displayItems: Product[] = [];

  if (localActiveCategory) {
    if (tabType === 'additional') {
      const childMenus = menuItems.filter((m) => m.category === localActiveCategory);
      const childMenuNames = new Set(childMenus.map(m => m.name));
      displayItems = items.filter(p => {
        const cat = p.category || '기타';
        return cat === localActiveCategory || childMenuNames.has(cat);
      });

      displayItems.sort((a, b) => {
        const catA = a.category || '기타';
        const catB = b.category || '기타';
        const menuA = childMenus.find(m => m.name === catA);
        const menuB = childMenus.find(m => m.name === catB);
        const orderA = menuA ? menuA.display_order : 999;
        const orderB = menuB ? menuB.display_order : 999;

        if (orderA !== orderB) return orderA - orderB;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    } else {
      displayItems = items.filter(p => (p.category || '기타') === localActiveCategory);
      displayItems.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    }
  }

  return (
    <div>
      <div className="flex overflow-x-auto pb-4 gap-2 px-6 pt-6 border-b border-gray-50 no-scrollbar">
        {optionGroups.map((group) => (
          <button
            key={group.name}
            onClick={() => setLocalActiveCategory(group.name)}
            className={\`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border
                     \${localActiveCategory === group.name
                ? "bg-[#001E45] text-white border-[#001E45]"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}\`}
          >
            {group.name}
          </button>
        ))}
      </div>

      <div className="max-h-[280px] sm:max-h-[400px] overflow-y-auto custom-scrollbar p-2">
        {displayItems.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {displayItems.map((item) => {
              const qty = selectedQty[item.id!] || 0;
              const imageUrl = item.image_url || getComponentComponentImage(item.name) || componentProducts.find(p => p.name === item.name)?.image_url;

              return (
                <OptionItem
                  key={item.id}
                  item={item}
                  initialQty={qty}
                  imageUrl={imageUrl}
                  onUpdate={(newQty) => setQty(prev => ({ ...prev, [item.id!]: newQty }))}
                  selectionMode={selectionMode}
                  priceDisplayMode={priceDisplayMode}
                  priceDisplayLoading={priceDisplayLoading}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            <p>선택된 카테고리에 상품이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductOptionGroups = ({
  groups,
  quantities,
  onUpdate,
}: {
  groups: ProductOptionGroup[];
  quantities: Record<string, number>;
  onUpdate: (groupName: string, valueName: string, quantity: number) => void;
}) => (
  <div className="space-y-5">
    {groups.map((group) => (
      <section key={group.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
            <p className="mt-1 text-sm text-slate-500">옵션별 수량을 바로 선택해서 같은 상품 안에 함께 담을 수 있습니다.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {group.values.length}개 옵션
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {group.values.map((value) => {
            const quantity = quantities[buildProductOptionKey(group.name, value.name)] || 0;

            return (
              <div key={\`\${group.name}-\${value.name}\`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{value.name}</p>
                  <p className="text-xs text-slate-500">{group.name}</p>
                </div>
                <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onUpdate(group.name, value.name, Math.max(0, quantity - 1))}
                    className={\`flex h-full w-10 items-center justify-center \${
                      quantity > 0 ? "text-slate-600 hover:bg-slate-50" : "text-slate-300"
                    }\`}
                    disabled={quantity <= 0}
                    aria-label={\`\${value.name} 수량 줄이기\`}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-10 border-x border-slate-200 text-center text-sm font-semibold text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdate(group.name, value.name, quantity + 1)}
                    className="flex h-full w-10 items-center justify-center text-slate-600 hover:bg-slate-50"
                    aria-label={\`\${value.name} 수량 늘리기\`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    ))}
  </div>
);

const CombinationProductOptionGroups = ({
  groups,
  selections,
  quantity,
  onSelect,
  onQuantityChange,
}: {
  groups: ProductOptionGroup[];
  selections: Record<string, string>;
  quantity: number;
  onSelect: (groupName: string, valueName: string) => void;
  onQuantityChange: (nextQuantity: number) => void;
}) => (
  <div className="space-y-5">
    {groups.map((group) => {
      const selectedValue = selections[group.name] || "";

      return (
        <section key={group.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
              <p className="mt-1 text-sm text-slate-500">각 그룹에서 옵션값을 하나씩 골라 한 세트로 담습니다.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              단일 선택
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {group.values.map((value) => {
              const active = selectedValue === value.name;

              return (
                <button
                  key={\`\${group.name}-\${value.name}\`}
                  type="button"
                  onClick={() => onSelect(group.name, value.name)}
                  className={\`rounded-xl border px-4 py-3 text-sm font-semibold transition-all \${
                    active
                      ? "border-[#001E45] bg-[#001E45] text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                  }\`}
                >
                  {value.name}
                </button>
              );
            })}
          </div>
        </section>
      );
    })}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">세트 수량</h3>
          <p className="mt-1 text-sm text-slate-500">선택한 옵션 조합으로 담을 수량입니다.</p>
        </div>
        <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            className="flex h-full w-11 items-center justify-center text-slate-600 hover:bg-slate-50"
            aria-label="수량 줄이기"
          >
            <Minus size={16} />
          </button>
          <span className="w-12 border-x border-slate-200 text-center text-sm font-semibold text-slate-900">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(quantity + 1)}
            className="flex h-full w-11 items-center justify-center text-slate-600 hover:bg-slate-50"
            aria-label="수량 늘리기"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </section>
  </div>
);

// ... (Rest of the component from update_layout3.cjs logic)
`;

// Now append the rest from a second script to avoid memory issues with huge strings
fs.writeFileSync('pages/fix_korean_final.cjs', \`const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'ProductDetail.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The script will continue here to append the rest
\`, 'utf8');
