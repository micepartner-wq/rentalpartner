import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Container } from "../components/ui/Container";
import { MyPageSidebar } from "../components/MyPageSidebar";
import {
  QuoteCartItem,
  getQuoteCartItems,
  removeQuoteCartItem,
  setQuoteCartItems,
} from "../src/utils/quoteCart";
import { useAuth } from "../src/context/AuthContext";
import { usePriceDisplay } from "../src/context/PriceDisplayContext";
import { getPublicPriceClassName, getPublicPriceText, INQUIRY_PRICE_TEXT_CLASS } from "../src/utils/priceDisplay";

export const QuoteCartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode: priceDisplayMode, loading: priceDisplayLoading } = usePriceDisplay();
  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "single" | "selected" | null;
    cartItemId?: string;
  }>({ open: false, type: null });

  useEffect(() => {
    setItems(getQuoteCartItems());
  }, []);

  const selectedItems = useMemo(() => items.filter((item) => item.selected), [items]);
  const allSelected = useMemo(() => items.length > 0 && items.every((item) => item.selected), [items]);
  const selectedTotal = useMemo(() => selectedItems.reduce((sum, item) => sum + item.total_price, 0), [selectedItems]);

  const persistItems = (next: QuoteCartItem[]) => {
    setItems(next);
    setQuoteCartItems(next);
  };

  const updateItem = (cartItemId: string, patch: Partial<QuoteCartItem>) => {
    persistItems(items.map((item) => (item.cart_item_id === cartItemId ? { ...item, ...patch } : item)));
  };

  const updateQuantity = (item: QuoteCartItem, quantity: number) => {
    if (item.option_quantity_managed) {
      return;
    }

    const nextQuantity = Math.max(1, quantity);
    const optionAmount = item.selected_options.reduce((sum, option) => sum + option.price * option.quantity, 0);
    const unitBase = Math.max(item.total_price - optionAmount, 0) / Math.max(item.product_quantity || 1, 1);

    updateItem(item.cart_item_id, {
      product_quantity: nextQuantity,
      expected_people: nextQuantity,
      total_price: Math.round(unitBase * nextQuantity + optionAmount),
    });
  };

  const handleRemove = (cartItemId: string) => {
    setItems(removeQuoteCartItem(cartItemId));
  };

  const setAllSelected = (selected: boolean) => {
    persistItems(items.map((item) => ({ ...item, selected })));
  };

  const removeSelectedItems = () => {
    if (selectedItems.length === 0) return;
    persistItems(items.filter((item) => !item.selected));
  };

  const openDeleteConfirm = (type: "single" | "selected", cartItemId?: string) => {
    setDeleteConfirm({ open: true, type, cartItemId });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, type: null });
  };

  const confirmDelete = () => {
    if (deleteConfirm.type === "single" && deleteConfirm.cartItemId) {
      handleRemove(deleteConfirm.cartItemId);
    }
    if (deleteConfirm.type === "selected") {
      removeSelectedItems();
    }
    closeDeleteConfirm();
  };

  const goRequestPage = () => {
    if (selectedItems.length === 0) {
      alert("견적 요청할 상품을 선택해 주세요.");
      return;
    }
    navigate("/quote-request");
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <Helmet>
        <title>장바구니 | 렌탈파트너</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Container>
        <div className={user ? "grid gap-8 md:grid-cols-[260px_1fr]" : "mx-auto max-w-5xl"}>
          {user && <MyPageSidebar active="cart" />}
          <main className="min-w-0">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                  <ShoppingCart size={24} /> 장바구니
                </h1>
                <p className="mt-2 text-sm text-slate-500">견적 요청할 상품만 체크하고 수량을 조정하세요.</p>
              </div>
              <span className="text-sm font-medium text-slate-500">선택 {selectedItems.length}개 / 전체 {items.length}개</span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="mb-4 text-slate-500">장바구니에 담긴 상품이 없습니다.</p>
                <Link to="/products" className="inline-flex rounded-xl bg-[#001E45] px-5 py-2.5 text-sm font-semibold text-white">
                  상품 보러가기
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAllSelected(true)}
                      disabled={allSelected}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                    >
                      전체선택
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllSelected(false)}
                      disabled={selectedItems.length === 0}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                    >
                      전체해제
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm("selected")}
                      disabled={selectedItems.length === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                    >
                      <Trash2 size={14} /> 선택삭제
                    </button>
                  </div>
                  <p className="text-sm text-slate-500">선택 {selectedItems.length}개 / 전체 {items.length}개</p>
                </div>

                <section className="space-y-3">
                  {items.map((item) => {
                    const componentCount = item.basic_components.length;
                    const optionCount = item.selected_options.length;
                    const isCombinationOptionMode =
                      item.option_selection_mode === "combination";
                    const optionLabel = item.option_selection_mode === "combination" ? "선택 옵션" : "선택 상품";

                    return (
                      <article
                        key={item.cart_item_id}
                        className={`rounded-2xl border bg-white p-4 transition-colors ${
                          item.selected ? "border-[#001E45]/20" : "border-slate-200 opacity-70"
                        }`}
                      >
                        <div className="grid grid-cols-[24px_72px_1fr] gap-3 md:grid-cols-[24px_84px_1fr_auto] md:items-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(event) => updateItem(item.cart_item_id, { selected: event.target.checked })}
                            className="mt-6 h-5 w-5 accent-[#001E45] md:mt-0"
                            aria-label={`${item.product_name} 선택`}
                          />

                          <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 md:h-20 md:w-20">
                            {item.product_image_url ? (
                              <img src={item.product_image_url} alt={item.product_name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <h2 className="truncate text-base font-semibold text-slate-900 md:text-lg">{item.product_name}</h2>
                              <div
                                className={getPublicPriceClassName({
                                  mode: priceDisplayMode,
                                  loading: priceDisplayLoading,
                                  visibleClass: "text-sm font-semibold text-rose-600 md:hidden",
                                  hiddenClass: INQUIRY_PRICE_TEXT_CLASS + " md:hidden",
                                })}
                              >
                                {getPublicPriceText({ amount: item.total_price, mode: priceDisplayMode, loading: priceDisplayLoading })}
                              </div>
                            </div>

                            {(componentCount > 0 || optionCount > 0) && (
                              <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                                {componentCount > 0 && (
                                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                                    <p className="mb-1 font-semibold text-slate-500">기본 구성</p>
                                    <div className="space-y-0.5">
                                      {item.basic_components.slice(0, 3).map((component, index) => (
                                        <div key={`${item.cart_item_id}-basic-${index}`} className="flex justify-between gap-2">
                                          <span className="truncate">{component.name}</span>
                                          <span className="shrink-0 font-semibold">{component.quantity}개</span>
                                        </div>
                                      ))}
                                      {item.basic_components.length > 3 && <p className="text-slate-400">외 {item.basic_components.length - 3}개</p>}
                                    </div>
                                  </div>
                                )}
                                {optionCount > 0 && (
                                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                                    <p className="mb-1 font-semibold text-slate-500">{optionLabel}</p>
                                    <div className="space-y-0.5">
                                      {item.selected_options.slice(0, 3).map((option, index) => (
                                        isCombinationOptionMode ? (
                                          <p key={`${item.cart_item_id}-option-${index}`} className="truncate">
                                            {option.name}
                                          </p>
                                        ) : (
                                          <div key={`${item.cart_item_id}-option-${index}`} className="flex justify-between gap-2">
                                            <span className="truncate">{option.name}</span>
                                            <span className="shrink-0 font-semibold">{option.quantity}개</span>
                                          </div>
                                        )
                                      ))}
                                      {item.selected_options.length > 3 && <p className="text-slate-400">외 {item.selected_options.length - 3}개</p>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-3">
                              <div className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white">
                                <button
                                  onClick={() => updateQuantity(item, (item.product_quantity || 1) - 1)}
                                  className="flex h-full w-9 items-center justify-center text-slate-500 hover:bg-slate-50 disabled:text-slate-300"
                                  disabled={item.option_quantity_managed || (item.product_quantity || 1) <= 1}
                                  aria-label="수량 줄이기"
                                >
                                  <Minus size={15} />
                                </button>
                                <span className="w-10 border-x border-slate-200 text-center text-sm font-semibold">{item.product_quantity || 1}</span>
                                <button
                                  onClick={() => updateQuantity(item, (item.product_quantity || 1) + 1)}
                                  className="flex h-full w-9 items-center justify-center text-slate-500 hover:bg-slate-50 disabled:text-slate-300"
                                  disabled={item.option_quantity_managed}
                                  aria-label="수량 늘리기"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                              <button onClick={() => openDeleteConfirm("single", item.cart_item_id)} className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                                <Trash2 size={15} /> 삭제
                              </button>
                            </div>
                            {item.option_quantity_managed && (
                              <p className="mt-2 text-xs text-slate-500">옵션별 수량은 상품 상세페이지에서 변경할 수 있습니다.</p>
                            )}
                          </div>

                          <div className="hidden min-w-[120px] text-right md:block">
                            <div
                              className={getPublicPriceClassName({
                                mode: priceDisplayMode,
                                loading: priceDisplayLoading,
                                visibleClass: "text-base font-semibold text-rose-600",
                                hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                              })}
                            >
                              {getPublicPriceText({ amount: item.total_price, mode: priceDisplayMode, loading: priceDisplayLoading })}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>

                <div className="sticky bottom-0 z-20 mt-6 rounded-t-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:rounded-2xl md:shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">선택 상품 {selectedItems.length}개</p>
                      <p
                        className={getPublicPriceClassName({
                          mode: priceDisplayMode,
                          loading: priceDisplayLoading,
                          visibleClass: "text-xl font-semibold text-[#001E45]",
                          hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                        })}
                      >
                        {getPublicPriceText({ amount: selectedTotal, mode: priceDisplayMode, loading: priceDisplayLoading })}
                      </p>
                    </div>
                    <button
                      onClick={goRequestPage}
                      disabled={selectedItems.length === 0}
                      className="h-12 rounded-xl bg-[#001E45] px-6 font-semibold text-white transition-colors hover:bg-[#002D66] disabled:bg-slate-300 sm:min-w-[220px]"
                    >
                      선택 상품 견적요청
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </Container>

      {deleteConfirm.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={closeDeleteConfirm}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">{deleteConfirm.type === "selected" ? "선택 상품 삭제" : "상품 삭제"}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {deleteConfirm.type === "selected"
                ? "선택한 상품을 장바구니에서 삭제하시겠습니까?"
                : "이 상품을 장바구니에서 삭제하시겠습니까?"}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
