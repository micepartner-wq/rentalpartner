import React, { useState, useEffect } from "react";
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
  X,
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
          <div key={`${opt.name}-${idx}`} className="flex justify-between text-gray-700">
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
  `${groupName}::${valueName}`;

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
            hiddenClass: `mt-0.5 ${INQUIRY_PRICE_TEXT_CLASS}`,
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
            className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold transition-all border
              ${isInCart ? "bg-[#001E45] text-white border-[#001E45] shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
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
                  if (/^\d*$/.test(val)) {
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
                className={`px-4 h-9 rounded-lg text-sm font-semibold transition-all
                  ${isChanged ? "bg-[#001E45] text-white shadow-md" : "bg-gray-900 text-white"}`}
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
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all border
              ${isInCart ? "bg-[#001E45] text-white border-[#001E45]" : "bg-gray-50 text-gray-400 border-gray-200"}`}
          >
            <Check size={16} />
          </button>
        ) : (
          <>
            <button
              onClick={() => onUpdate(Math.max(0, initialQty - 1))}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors
                ${initialQty > 0 ? "text-gray-900 bg-gray-50" : "text-gray-300 pointer-events-none"}`}
            >
              <Minus size={14} />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={localQty}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setLocalQty(val === "" ? 0 : parseInt(val));
                }
              }}
              onBlur={handleUpdate}
              className={`w-8 text-center font-semibold text-sm border-none focus:outline-none focus:ring-0 p-0 bg-transparent
                ${initialQty > 0 ? "text-gray-900" : "text-gray-400"}`}
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
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border
                     ${localActiveCategory === group.name
                ? "bg-[#001E45] text-white border-[#001E45]"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
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
              <div key={`${group.name}-${value.name}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{value.name}</p>
                  <p className="text-xs text-slate-500">{group.name}</p>
                </div>
                <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onUpdate(group.name, value.name, Math.max(0, quantity - 1))}
                    className={`flex h-full w-10 items-center justify-center ${
                      quantity > 0 ? "text-slate-600 hover:bg-slate-50" : "text-slate-300"
                    }`}
                    disabled={quantity <= 0}
                    aria-label={`${value.name} 수량 줄이기`}
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
                    aria-label={`${value.name} 수량 늘리기`}
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
  onSelect,
}: {
  groups: ProductOptionGroup[];
  selections: Record<string, string>;
  onSelect: (groupName: string, valueName: string) => void;
}) => {
  return (
    <div className="space-y-4">
      {groups.map((group, index) => {
        const previousGroup = index > 0 ? groups[index - 1] : null;
        const isVisible = index === 0 || (previousGroup && selections[previousGroup.name]);
        
        if (!isVisible) return null;

        const selectedValue = selections[group.name] || "";

        return (
          <section key={group.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[15px] font-bold text-slate-900">{group.name}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const active = selectedValue === value.name;

                return (
                  <button
                    key={`${group.name}-${value.name}`}
                    type="button"
                    onClick={() => onSelect(group.name, value.name)}
                    className={`rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-all ${
                      active
                        ? "border-[#001E45] bg-[#001E45] text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {value.name}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    mode: priceDisplayMode,
    loading: priceDisplayLoading,
    isInquiryMode,
  } = usePriceDisplay();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [activeTab, setActiveTab] = useState("detail");
  const [expectedPeople, setExpectedPeople] = useState<number | string>(1);
  const [activeOptionTab, setActiveOptionTab] = useState<OptionTabId>("additional");
  const [bookingModal, setBookingModal] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
    variant?: 'default' | 'cart';
    onClose?: () => void;
  }>({ show: false, message: '', type: 'info', variant: 'default' });
  const [actionConfirmModal, setActionConfirmModal] = useState<{
    show: boolean;
    action: 'booking' | 'cart' | null;
  }>({ show: false, action: null });
  const [mobileBarExpanded, setMobileBarExpanded] = useState(false);
  const [quoteCartCount, setQuoteCartCount] = useState(0);
  const [basicComponentsExpanded, setBasicComponentsExpanded] = useState(true);
  const [globalCooperative, setGlobalCooperative] = useState<Product[]>([]);
  const [globalAdditional, setGlobalAdditional] = useState<Product[]>([]);
  const [componentProducts, setComponentProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchComponentProducts = async () => {
      try {
        const products = await getProducts({ catalogType: "general" });
        setComponentProducts(products.filter(isGeneralBasicProduct));
      } catch (err) {
        console.error("Failed to fetch component products", err);
      }
    };
    fetchComponentProducts();
  }, []);

  useEffect(() => {
    setQuoteCartCount(getQuoteCartCount());
  }, []);

  const [menuItems, setMenuItems] = useState<NavMenuItem[]>([]);
  const [selectedCooperative, setSelectedCooperative] = useState<{ [key: string]: number }>({});
  const [selectedAdditional, setSelectedAdditional] = useState<{ [key: string]: number }>({});
  const [productOptionQuantities, setProductOptionQuantities] = useState<Record<string, number>>({});
  const [productOptionSelections, setProductOptionSelections] = useState<Record<string, string>>({});
  const [productOptionSetQuantity, setProductOptionSetQuantity] = useState(1);
  const [combinationSets, setCombinationSets] = useState<Array<{ id: string; selections: Record<string, string>; quantity: number; price: number }>>([]);
  const [combinationQuantityDrafts, setCombinationQuantityDrafts] = useState<Record<string, string>>({});


  useEffect(() => {
    const fetchProductAndOptions = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [
          productData,
          cooperativeData,
          additionalData,
          menuItemsData,
        ] = await Promise.all([
          getProductById(id),
          getProductsByType("cooperative"),
          getAdditionalOptionProducts(),
          getAllNavMenuItems(),
        ]);
        setProduct(productData);
        setGlobalCooperative(cooperativeData);
        setGlobalAdditional(additionalData.filter((item) => item.id && item.id !== id));
        setMenuItems(menuItemsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndOptions();
  }, [id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!product?.id) return;
    trackProductDetailView({
      productId: product.id,
      productName: product.name,
      category: product.category,
      value: typeof product.price === "number" ? product.price : undefined,
    });
  }, [product]);

  const selectedAdditionalItems = React.useMemo(() => getSelectedProductOptions(selectedAdditional, globalAdditional), [selectedAdditional, globalAdditional]);
  const selectedCooperativeItems = React.useMemo(() => getSelectedProductOptions(selectedCooperative, globalCooperative), [selectedCooperative, globalCooperative]);
  const productOptionGroups = product?.product_options || [];
  const hasProductOptions = productOptionGroups.length > 0;
  const productOptionSelectionMode = getProductOptionSelectionMode(productOptionGroups);
  const isCombinationOptionMode = hasProductOptions && productOptionSelectionMode === "combination";
  const selectedProductOptionItems = React.useMemo(() => isCombinationOptionMode ? [] : getSelectedProductOptionQuantities(productOptionGroups, productOptionQuantities), [isCombinationOptionMode, productOptionGroups, productOptionQuantities]);
  const selectedProductOptionQuantity = React.useMemo(() => selectedProductOptionItems.reduce((sum, item) => sum + item.quantity, 0), [selectedProductOptionItems]);
  const selectedCombinationSummaryItems = React.useMemo(() => {
    if (!isCombinationOptionMode) return [];
    return combinationSets.map(set => ({
      name: `선택 옵션: ${Object.values(set.selections).join(" / ")}`,
      qty: set.quantity,
      subtotal: (product?.price || 0) * set.quantity,
      quantityLabel: `${set.quantity}개`
    }));
  }, [isCombinationOptionMode, combinationSets, product?.price]);

  const selectedSummary = React.useMemo<SelectedOptionSummary[]>(() => [
    ...selectedCombinationSummaryItems,
    ...(!isCombinationOptionMode ? selectedProductOptionItems.map((item) => ({ name: `${item.groupName}: ${item.valueName}`, qty: item.quantity, subtotal: (product?.price || 0) * item.quantity, quantityLabel: String(item.quantity) + "개" })) : []),
    ...selectedAdditionalItems.map(({ product: item, quantity }) => ({ name: item.name, qty: quantity, subtotal: item.price * quantity, quantityLabel: String(quantity) + "개" })),
    ...selectedCooperativeItems.map(({ product: item, quantity }) => ({ name: item.name, qty: quantity, subtotal: item.price * quantity, quantityLabel: String(quantity) + "개" })),
  ], [selectedCombinationSummaryItems, isCombinationOptionMode, selectedProductOptionItems, selectedAdditionalItems, selectedCooperativeItems, product?.price]);

  const isPackageProduct = (product?.catalog_type || "general") === "package";
  const requestedQuantity = React.useMemo(() => {
    if (isCombinationOptionMode) return combinationSets.reduce((sum, set) => sum + set.quantity, 0);
    if (hasProductOptions) return selectedProductOptionQuantity;
    if (typeof expectedPeople === "string") return parseInt(expectedPeople || "0", 10) || 1;
    return Math.max(expectedPeople || 1, 1);
  }, [combinationSets, expectedPeople, hasProductOptions, isCombinationOptionMode, selectedProductOptionQuantity]);

  const totalPrice = React.useMemo(() => {
    const basePrice = product?.price || 0;
    const addOnTotal = [...selectedAdditionalItems, ...selectedCooperativeItems].reduce((total, { product: item, quantity }) => total + item.price * quantity, 0);
    return basePrice * requestedQuantity + addOnTotal;
  }, [product, requestedQuantity, selectedAdditionalItems, selectedCooperativeItems, hasProductOptions]);

  const mainPriceText = getPublicPriceText({ amount: product?.price, mode: priceDisplayMode, loading: priceDisplayLoading, suffix: "원" });
  const totalPriceText = getPublicPriceText({ amount: totalPrice, mode: priceDisplayMode, loading: priceDisplayLoading });
  const guideDescription = isInquiryMode ? "상세페이지 하단 구성품을 확인하고 장바구니에 담으시면 담당자가 확인하여 견적 조건과 배송 일정을 접수해 드립니다." : "상세페이지 하단 구성품을 선택하고 장바구니에 담으시면 대여 일정, 설치 장소 정보 등을 입력하실 수 있습니다.";
          const summaryRows: SummaryRow[] = [
    ...(isCombinationOptionMode && combinationSets.length > 0
      ? [{ label: product?.name || "상품", value: <span className="text-gray-900 font-bold">{requestedQuantity}개</span> }]
      : []),
    ...(!isPackageProduct && requestedQuantity > 0 && !isCombinationOptionMode ? [{ label: product?.name || "상품", value: hasProductOptions ? <span className="text-gray-900">{requestedQuantity}개</span> : !priceDisplayLoading && !isVisiblePriceMode(priceDisplayMode) ? <span className="text-gray-900">{requestedQuantity}개</span> : <span className={getPublicPriceClassName({ mode: priceDisplayMode, loading: priceDisplayLoading, visibleClass: 'text-gray-900', hiddenClass: INQUIRY_PRICE_TEXT_CLASS })}>{mainPriceText}</span> }] : []),
  ];
  const displaySummaryRows = summaryRows;

  const buildSelectedOptions = () => [
    ...(isCombinationOptionMode ? combinationSets.map((set) => ({ name: `[옵션세트] ${Object.values(set.selections).join(" / ")}`, quantity: set.quantity, price: 0 })) : selectedProductOptionItems.map((item) => ({ name: `${item.groupName}: ${item.valueName}`, quantity: item.quantity, price: 0 }))),
    ...selectedAdditionalItems.map(({ product: item, quantity }) => ({ name: item.name, quantity, price: item.price || 0 })),
    ...selectedCooperativeItems.map(({ product: item, quantity }) => ({ name: item.name, quantity, price: item.price || 0 })),
  ];

  const buildBasicComponents = () => product?.basic_components?.map((comp) => ({ name: comp.name, quantity: comp.quantity, model_name: comp.model_name })) || [];

  
  
  
  


  
  const handleSelectCombinationOption = (groupName: string, valueName: string) => {
    const nextSelections = { ...productOptionSelections, [groupName]: valueName };
    setProductOptionSelections(nextSelections);

    if (productOptionGroups.every(g => nextSelections[g.name])) {
      const id = productOptionGroups.map((g) => nextSelections[g.name]).join(" / ");
      
      setCombinationSets((prev) => {
        const existing = prev.find((s) => s.id === id);
        if (existing) {
          return prev.map((s) => (s.id === id ? { ...s, quantity: s.quantity + 1 } : s));
        }
        return [...prev, { id, selections: nextSelections, quantity: 1, price: 0 }];
      });
      
      setTimeout(() => setProductOptionSelections({}), 150);
    }
  };

  const handleUpdateCombinationQuantity = (id: string, quantity: number) => {
    setCombinationQuantityDrafts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (quantity <= 0) {
      setCombinationSets((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    setCombinationSets((prev) => prev.map((s) => (s.id === id ? { ...s, quantity } : s)));
  };

  const handleCombinationQuantityInputChange = (id: string, rawValue: string) => {
    if (!/^\d*$/.test(rawValue)) return;
    setCombinationQuantityDrafts((prev) => ({ ...prev, [id]: rawValue }));
    if (rawValue === "") return;
    const nextQuantity = parseInt(rawValue, 10);
    if (Number.isNaN(nextQuantity)) return;
    setCombinationSets((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: Math.max(1, nextQuantity) } : s)));
  };

  const handleCombinationQuantityInputBlur = (id: string, fallbackQuantity: number) => {
    const draftValue = combinationQuantityDrafts[id];
    if (draftValue === undefined) return;
    const nextQuantity = draftValue === "" ? fallbackQuantity : Math.max(1, parseInt(draftValue, 10) || fallbackQuantity);
    setCombinationSets((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: nextQuantity } : s)));
    setCombinationQuantityDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRemoveCombination = (id: string) => {
    setCombinationSets((prev) => prev.filter((s) => s.id !== id));
  };

  const openActionConfirm = (action: 'booking' | 'cart') => {
    if (!product || !id || product.stock === 0) return;
    if (!validateProductOptionSelection()) return;
    if (action === "booking") trackQuoteRequestStart({ source: "product_detail", productId: id, productName: product.name, itemCount: 1, value: totalPrice });
    setActionConfirmModal({ show: true, action });
  };

  const closeActionConfirm = () => setActionConfirmModal({ show: false, action: null });

  const validateProductOptionSelection = () => {
    if (!hasProductOptions) return true;
            if (isCombinationOptionMode) {
      if (combinationSets.length > 0) return true;
      setBookingModal({ show: true, message: "원하시는 옵션을 차례로 선택해 주세요.", type: "info" });
      return false;
    }
    if (requestedQuantity > 0) return true;
    setBookingModal({ show: true, message: "최소한 하나 이상의 수량을 선택해 주세요.", type: "info" });
    return false;
  };

  const handleAddToQuoteCart = ({ showSuccessModal = true }: { showSuccessModal?: boolean } = {}) => {
    if (!product || !id) return;
    if (!validateProductOptionSelection()) return;
    addQuoteCartItem({ product_id: id, product_name: product.name, product_image_url: product.image_url, product_catalog_type: product.catalog_type || "general", expected_people: isCombinationOptionMode ? requestedQuantity : isPackageProduct ? 0 : typeof expectedPeople === "string" ? parseInt(expectedPeople || "0", 10) || 0 : expectedPeople, product_quantity: requestedQuantity, selected: true, option_quantity_managed: hasProductOptions && !isCombinationOptionMode, option_selection_mode: hasProductOptions ? productOptionSelectionMode : undefined, total_price: totalPrice, selected_options: buildSelectedOptions(), basic_components: buildBasicComponents() });
    setQuoteCartCount(getQuoteCartCount());
    logAnalyticsEvent("quote_cart_add", { source: "product_detail", product_id: id, product_name: product.name, value: totalPrice });
    if (showSuccessModal) setBookingModal({ show: true, message: "장바구니에 담겼습니다.\n견적 요청 또는 추가 옵션\n확인을 위해\n장바구니에서\n수량을 조절하실 수 있습니다.", type: "success", variant: "cart" });
  };

  const handleBooking = () => { if (!product || !id) return; setIsBooking(true); handleAddToQuoteCart({ showSuccessModal: false }); navigate("/quote-cart"); setIsBooking(false); };

  const optionTabs = React.useMemo(() => [
    { id: "additional" as const, label: "기본 구성품", icon: Package, show: globalAdditional.length > 0, count: Object.values(selectedAdditional).filter((qty) => (qty as number) > 0).length },
    { id: "cooperative" as const, label: "추가 구성 및 옵션", icon: Users, show: globalCooperative.length > 0, count: Object.values(selectedCooperative).filter((qty) => (qty as number) > 0).length },
  ].filter((tab) => tab.show), [globalAdditional, globalCooperative, selectedAdditional, selectedCooperative]);

  useEffect(() => { if (optionTabs.length === 0) return; if (!optionTabs.some((tab) => tab.id === activeOptionTab)) setActiveOptionTab(optionTabs[0].id); }, [activeOptionTab, optionTabs]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#001E45]" size={40} /></div>;
  if (!product) return <div className="p-20 text-center text-gray-500">상품 정보를 불러올 수 없습니다.</div>;

  const canonicalUrl = `${SITE_URL}/products/${product.id || id || ""}`;
  const seoTitle = `${product.name} | 마이스데이`;
  const seoDescription = buildSeoDescription(product.short_description, product.description) || `${product.name} 마이스데이 렌탈 서비스.`;
  const seoImage = toAbsoluteUrl(product.image_url);

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">{toJsonLd({ "@context": "https://schema.org", "@graph": [buildBreadcrumbJsonLd([{ name: "홈", item: `${SITE_URL}/` }, { name: "렌탈 상품 목록", item: `${SITE_URL}/products` }, { name: product.name, item: canonicalUrl }]), buildProductJsonLd({ name: product.name, description: seoDescription, url: canonicalUrl, image: seoImage, category: product.category, sku: product.id, price: product.price, stock: product.stock, includeOffers: !priceDisplayLoading && isVisiblePriceMode(priceDisplayMode) })] })}</script>
      </Helmet>
      <div className="pt-8 pb-8 bg-gray-50 min-h-screen">
        <Container>
          <nav className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
              <li><a href="/" className="hover:text-[#001E45] transition-colors">홈</a></li>
              {product.category && (
                <>
                  <li><ChevronRight size={14} className="text-gray-300" /></li>
                  <li><a href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-[#001E45] transition-colors">{product.category}</a></li>
                </>
              )}
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-10">
            <div className="lg:col-span-7 xl:col-span-8 lg:row-start-1 space-y-8">
              <section className="overflow-hidden rounded-[24px] lg:rounded-[28px] border border-gray-100 bg-white shadow-sm flex flex-col">
                <div className="p-6 sm:p-8 sm:pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{product.category}</span>
                    <span className="rounded-full border border-[#001E45]/10 bg-[#001E45]/5 px-3 py-1 text-xs font-medium text-[#001E45]">맞춤 견적형 상품</span>
                  </div>
                  <div className="mt-4">
                    <h1 className="text-2xl font-bold leading-tight text-gray-900 xl:text-[32px]">{product.name}</h1>
                    <p className="mt-3 text-[15px] leading-relaxed text-slate-500 break-keep">{product.short_description || "일정과 수량을 접수하면 담당자가 렌탈 조건을 안내해 드립니다."}</p>
                  </div>
                </div>
                <div className="flex w-full items-center justify-center p-6 sm:px-10 sm:pb-10 sm:pt-4">
                  <img src={product.image_url || "https://picsum.photos/seed/product/800/600"} alt={product.name} className="block h-[240px] sm:h-[320px] lg:h-[380px] w-auto object-contain rounded-xl mx-auto" />
                </div>
              </section>

              {product.basic_components && product.basic_components.length > 0 && (
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                  <button onClick={() => setBasicComponentsExpanded(!basicComponentsExpanded)} className="w-full flex items-center justify-between pb-2 text-left">
                    <div className="flex items-center gap-3">
                      <span className="bg-[#001E45] text-white px-2.5 py-1 rounded-md text-xs font-bold tracking-wide">기본 구성</span>
                      <h3 className="font-semibold text-gray-900 text-lg">기본 구성품으로 포함된 제품</h3>
                      <span className="text-sm font-medium text-[#001E45] bg-[#001E45]/5 px-2 py-0.5 rounded-full">{product.basic_components.length}건</span>
                    </div>
                    <ChevronRight size={20} className={`text-gray-400 transition-transform duration-200 ${basicComponentsExpanded ? "rotate-90" : ""}`} />
                  </button>
                  <p className="mt-2 text-[14px] text-slate-500 break-keep">패키지에 기본으로 포함된 제품 목록입니다. 필요에 맞게 추가 구성품을 선택하거나 수량을 조정할 수 있습니다.</p>
                  {basicComponentsExpanded && (
                    <div className="space-y-0 mt-4 border-t border-gray-100 pt-2">
                      {product.basic_components.map((item, idx) => {
                        const imageUrl = item.image_url || componentProducts.find((p) => p.name === item.name)?.image_url || getComponentComponentImage(item.name);
                        return (
                          <div key={idx} className="flex items-center gap-4 py-4 border-b border-dashed border-gray-200 last:border-0 hover:bg-gray-50/50 transition-colors rounded-xl px-2 -mx-2">
                            <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden relative">
                              {imageUrl ? <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package size={24} className="text-slate-400" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-[15px]">{item.name}</p>
                              {item.model_name && <p className="text-[13px] text-gray-400 mt-1">{item.model_name}</p>}
                            </div>
                            <span className="font-bold text-[#001E45] bg-[#001E45]/5 px-3 py-1.5 rounded-lg text-sm">{item.quantity}개</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(hasProductOptions || globalCooperative.length > 0) && (
                <div className="space-y-6">
                  {hasProductOptions && isCombinationOptionMode ? (
                    <CombinationProductOptionGroups
                      groups={productOptionGroups}
                      selections={productOptionSelections}
                      onSelect={handleSelectCombinationOption}
                    />
                  ) : hasProductOptions ? (
                    <ProductOptionGroups
                      groups={productOptionGroups}
                      quantities={productOptionQuantities}
                      onUpdate={(groupName, valueName, quantity) => {
                        const key = buildProductOptionKey(groupName, valueName);
                        setProductOptionQuantities((prev) => ({ ...prev, [key]: quantity }));
                      }}
                    />
                  ) : null}
                  {globalCooperative.length > 0 && (
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Users size={18} className="text-[#001E45]" />
                          <h3 className="text-[15px] font-semibold text-gray-900">추가 구성품 및 옵션 선택</h3>
                        </div>
                      </div>
                      <OptionListTypeA
                        items={globalCooperative}
                        selectedQty={selectedCooperative}
                        setQty={setSelectedCooperative}
                        componentProducts={componentProducts}
                        menuItems={menuItems}
                        tabType="cooperative"
                        selectionMode="checkbox"
                        priceDisplayMode={priceDisplayMode}
                        priceDisplayLoading={priceDisplayLoading}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-gray-100">
                <div className="flex border-b border-gray-100">
                  {[{ id: "detail", label: "제품 상세정보" }, { id: "guide", label: "대여 안내" }].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-5 font-semibold text-[15px] transition-colors relative ${activeTab === tab.id ? "text-[#001E45] bg-slate-50/50" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
                      {tab.label}
                      {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#001E45]" />}
                    </button>
                  ))}
                </div>
                <div className="min-h-[300px] p-6 sm:p-10">
                  {activeTab === "detail" && (product.description ? <div className="prose prose-slate max-w-none w-full [&>p]:m-0 [&>img]:w-full [&>img]:m-0 [&>img]:rounded-xl" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, "<br/>") }} /> : <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4"><Package size={48} className="text-gray-200" /><p>상세정보를 준비중입니다.</p></div>)}
                  {activeTab === "guide" && (
                    <article className="mx-auto max-w-3xl space-y-10 text-[15px] leading-8 text-slate-600">
                      <section className="space-y-4">
                        <span className="inline-block bg-[#001E45]/10 text-[#001E45] px-3 py-1 rounded-full text-xs font-bold">대여 안내</span>
                        <h4 className="text-2xl font-bold text-slate-900">간편하고 체계적인<br/>렌탈 견적 요청 절차</h4>
                        <p className="text-[15px] text-slate-600">{guideDescription}</p>
                      </section>
                      <section className="border-t border-slate-100 pt-8">
                        <h5 className="text-lg font-bold text-slate-900 mb-6">견적 요청 진행 단계</h5>
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="bg-slate-50 p-5 rounded-2xl"><div className="text-[#001E45] font-bold text-xl mb-2">01</div><h6 className="font-bold text-slate-900">견적 요청 요약</h6><p className="mt-2 text-sm text-slate-600 leading-relaxed">상품 구성과 수량을 선택해 장바구니에 담아 주세요.</p></div>
                          <div className="bg-slate-50 p-5 rounded-2xl"><div className="text-[#001E45] font-bold text-xl mb-2">02</div><h6 className="font-bold text-slate-900">담당자 배정</h6><p className="mt-2 text-sm text-slate-600 leading-relaxed">접수된 정보를 확인하여 담당자가 배정됩니다.</p></div>
                          <div className="bg-slate-50 p-5 rounded-2xl"><div className="text-[#001E45] font-bold text-xl mb-2">03</div><h6 className="font-bold text-slate-900">견적 확정</h6><p className="mt-2 text-sm text-slate-600 leading-relaxed">세부 사양을 확정하고 견적을 안내해 드립니다.</p></div>
                          <div className="bg-slate-50 p-5 rounded-2xl"><div className="text-[#001E45] font-bold text-xl mb-2">04</div><h6 className="font-bold text-slate-900">계약 및 배송</h6><p className="mt-2 text-sm text-slate-600 leading-relaxed">계약 체결 후 약속된 일정에 설치를 진행합니다.</p></div>
                        </div>
                      </section>
                    </article>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 xl:col-span-4 lg:row-start-1">
              <div className="lg:sticky lg:top-24 space-y-5">
                {/* Summary Card */}
                <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative">
                  <div className="p-7">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 flex items-center gap-2">
                      <ShoppingBag size={20} className="text-[#001E45]" />
                      견적 요청 요약
                    </h3>

                  <p className="text-[14px] text-gray-500 leading-relaxed mb-6 break-keep">
                    선택하신 구성을 바탕으로 대여 일정과 요청사항을 접수해 주시면 맞춤 렌탈 조건을 안내해 드립니다.
                  </p>

                  <div className="space-y-4">
                    {displaySummaryRows.filter(row => {
                      const val = String(row.value);
                      return !val.includes("0개");
                    }).map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[13.5px]">
                        <span className="text-gray-500">{row.label}</span>
                        <span className="font-semibold text-gray-900">{row.value}</span>
                      </div>
                    ))}
                    
                    {selectedSummary.length > 0 && (
                      <div className="pt-3 border-t border-gray-50 space-y-2">
                        {selectedSummary.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[12.5px] text-gray-600">
                            <span className="truncate flex-1">{item.name}</span>
                            {isCombinationOptionMode && combinationSets[idx] ? (
                              <div className="ml-2 inline-flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCombinationQuantity(combinationSets[idx].id, item.qty - 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-40"
                                  disabled={item.qty <= 1}
                                  aria-label="수량 줄이기"
                                >
                                  <Minus size={11} />
                                </button>
                                <input
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={combinationQuantityDrafts[combinationSets[idx].id] ?? String(item.qty)}
                                  onChange={(event) => handleCombinationQuantityInputChange(combinationSets[idx].id, event.target.value)}
                                  onBlur={() => handleCombinationQuantityInputBlur(combinationSets[idx].id, item.qty)}
                                  className="w-12 rounded-md border border-slate-200 bg-white px-1 py-1 text-center text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-slate-300"
                                  aria-label="?섎웾 ?낅젰"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCombinationQuantity(combinationSets[idx].id, item.qty + 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100"
                                  aria-label="수량 늘리기"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            ) : (
                              <span className="font-medium ml-2">{item.quantityLabel}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-medium text-gray-600 text-[13px]">예상 견적 비용</span>
                    <span className={getPublicPriceClassName({
                      mode: priceDisplayMode,
                      loading: priceDisplayLoading,
                      visibleClass: 'text-[16px] font-semibold text-[#001E45]',
                      hiddenClass: 'text-[16px] font-semibold text-rose-500'
                    })}>
                      {totalPriceText}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <button 
                      onClick={() => openActionConfirm('booking')} 
                      disabled={isBooking || product.stock === 0} 
                      className="w-full py-4 rounded-xl bg-[#001E45] text-white font-bold text-base hover:bg-[#002D66] transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                      {isBooking ? <Loader2 className="animate-spin" size={20} /> : "장바구니에서 견적 요청"}
                    </button>
                    <button 
                      onClick={() => openActionConfirm('cart')} 
                      className="w-full py-4 rounded-xl border border-slate-200 text-[#001E45] font-bold text-base bg-slate-50/50 flex items-center justify-center gap-2 transition-all hover:bg-slate-100"
                    >
                      <ShoppingCart size={18} /> 장바구니 담기
                    </button>
                  </div>

                  <p className="mt-6 text-[12px] text-center text-gray-400 leading-relaxed">
                    최종 견적 요청 시 영업일 기준 담당자가 연락드립니다.
                  </p>
                </div>
              </div>

              {/* Trust Cards */}
                <div className="space-y-3">
                  {[
                    {
                      icon: "💳",
                      bgColor: "bg-blue-50/70",
                      title: "온라인 결제 없이 계약 진행",
                      desc: "법인카드, 세금계산서 지원"
                    },
                    {
                      img: "/cert-disabled.jpg",
                      fallback: "https://cdn-icons-png.flaticon.com/512/1000/1000957.png",
                      title: "장애인등록기업",
                      desc: "공공기관 우선구매 대상"
                    },
                    {
                      img: "/cert-mice.jpg",
                      fallback: "https://cdn-icons-png.flaticon.com/512/3232/3232860.png",
                      title: "사무장비 렌탈 전문",
                      desc: "복합기·노트북 렌탈 전문성"
                    },
                    {
                      icon: "🧾",
                      bgColor: "bg-purple-50/70",
                      title: "맞춤 조건 상담 진행",
                      desc: "계약 기간별 맞춤 조건"
                    }
                  ].map((card, idx) => (
                    <div key={idx} className="flex items-center gap-4 rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full overflow-hidden ${card.bgColor || 'bg-slate-50 border border-slate-100'}`}>
                        {card.img ? (
                          <img
                            src={card.img}
                            alt={card.title}
                            className="h-full w-full object-cover"
                            onError={(e) => { (e.target as any).src = card.fallback; }}
                          />
                        ) : (
                          <span className="text-xl">{card.icon}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-[14.5px] leading-tight">{card.title}</p>
                        <p className="text-[12.5px] text-gray-500 mt-2 leading-tight">{card.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 overflow-hidden bg-white border-t border-gray-200 rounded-t-[26px] shadow-[0_-8px_24px_rgba(15,23,42,0.1)] z-50 lg:hidden transition-all duration-300 ${mobileBarExpanded ? "max-h-[85vh]" : "max-h-[100px]"}`}>
        <button onClick={() => setMobileBarExpanded(!mobileBarExpanded)} className="w-full flex flex-col items-center justify-center py-3">
          <div className="w-10 h-1 bg-gray-200 rounded-full mb-1" />
        </button>
        {mobileBarExpanded ? (
          <div className="px-6 pb-8 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4"><ShoppingBag size={20} className="text-[#001E45]" /><h3 className="font-bold text-lg text-gray-900">견적 요청 요약</h3></div>
            <SummaryRows rows={displaySummaryRows} />
            {selectedSummary.length > 0 && <SelectedOptionsSection items={selectedSummary} priceDisplayMode={priceDisplayMode} priceDisplayLoading={priceDisplayLoading} />}
            <div className="mt-6 space-y-3">
              <button onClick={() => openActionConfirm('booking')} className="w-full py-4 rounded-xl bg-[#001E45] text-white font-bold flex items-center justify-center gap-2 shadow-lg">견적 요청하기</button>
              <button onClick={() => openActionConfirm('cart')} className="w-full py-4 rounded-xl border border-[#001E45] text-[#001E45] font-bold bg-white flex items-center justify-center gap-2">장바구니 담기 ({quoteCartCount})</button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-8 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0"><p className="text-[13px] font-bold text-[#001E45] truncate">{product.name}</p><p className="text-xs text-gray-500">수량 {requestedQuantity}개 선택됨</p></div>
            <button onClick={() => setMobileBarExpanded(true)} className="px-8 py-3.5 bg-[#001E45] text-white rounded-xl font-bold text-sm shadow-md">견적 확인</button>
          </div>
        )}
      </div>

      {actionConfirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeActionConfirm}>
          <div className="bg-white rounded-[28px] max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 text-center border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">{actionConfirmModal.action === 'booking' ? '견적 요청' : '장바구니 담기'}</h2><p className="mt-1 text-sm text-gray-500">선택하신 구성으로 진행하시겠습니까?</p></div>
            <div className="p-8 space-y-6">
              <div className="rounded-2xl bg-gray-50 p-5 space-y-4">
                <SummaryRows rows={displaySummaryRows} />
                {selectedSummary.length > 0 && <SelectedOptionsSection items={selectedSummary} priceDisplayMode={priceDisplayMode} priceDisplayLoading={priceDisplayLoading} />}
                <div className="pt-4 border-t border-gray-200 flex items-center justify-between font-bold text-lg"><span className="text-gray-900">예상 견적</span><span className="text-[#001E45]">{totalPriceText}</span></div>
              </div>
            </div>
            <div className="flex gap-3 p-8 pt-0">
              <button onClick={closeActionConfirm} className="flex-1 py-4 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50">취소</button>
              <button onClick={() => { const action = actionConfirmModal.action; closeActionConfirm(); if (action === 'booking') { handleBooking(); return; } handleAddToQuoteCart(); }} className="flex-1 py-4 rounded-xl bg-[#001E45] text-white font-bold shadow-lg">확인</button>
            </div>
          </div>
        </div>
      )}

      {bookingModal.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setBookingModal(prev => ({ ...prev, show: false }))}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-[380px] p-10 text-center animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex justify-center">{bookingModal.type === 'success' ? <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center"><CheckCircle size={36} className="text-emerald-500" /></div> : <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center"><AlertCircle size={36} className="text-blue-500" /></div>}</div>
            <p className="text-gray-900 font-bold text-lg whitespace-pre-line mb-8">{bookingModal.message}</p>
            {bookingModal.variant === 'cart' ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setBookingModal(prev => ({ ...prev, show: false }))} className="py-4 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200">계속 쇼핑</button>
                <button onClick={() => { setBookingModal(prev => ({ ...prev, show: false })); navigate('/quote-cart'); }} className="py-4 rounded-xl bg-[#001E45] text-white font-bold shadow-md">장바구니 이동</button>
              </div>
            ) : <button onClick={() => setBookingModal(prev => ({ ...prev, show: false }))} className="w-full py-4 bg-[#001E45] text-white font-bold rounded-xl shadow-md">확인</button>}
          </div>
        </div>
      )}
    </>
  );
};
