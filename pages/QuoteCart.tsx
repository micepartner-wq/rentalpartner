import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2, Printer } from "lucide-react";
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
import { getPublicPriceClassName, getPublicPriceText, INQUIRY_PRICE_TEXT_CLASS, isVisiblePriceMode } from "../src/utils/priceDisplay";

export const QuoteCartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode: priceDisplayMode, loading: priceDisplayLoading } = usePriceDisplay();
  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [combinationQuantityDrafts, setCombinationQuantityDrafts] = useState<Record<string, string>>({});
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

  const printComponents = useMemo(() => {
    const componentMap = new Map<string, number>();
    selectedItems.forEach(item => {
      const multiplier = item.product_quantity || 1;
      
      if (item.basic_components && item.basic_components.length > 0) {
        item.basic_components.forEach(comp => {
          const qty = comp.quantity * multiplier;
          componentMap.set(comp.name, (componentMap.get(comp.name) || 0) + qty);
        });
      } else {
        componentMap.set(item.product_name, (componentMap.get(item.product_name) || 0) + multiplier);
      }

      if (item.selected_options && item.selected_options.length > 0) {
        item.selected_options.forEach(opt => {
          componentMap.set(opt.name, (componentMap.get(opt.name) || 0) + opt.quantity);
        });
      }
    });

    return Array.from(componentMap.entries()).map(([name, quantity]) => ({ name, quantity }));
  }, [selectedItems]);

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

  const updateCombinationOptionQuantity = (item: QuoteCartItem, optionIndex: number, quantity: number) => {
    const nextOptionQuantity = Math.max(1, quantity);
    const nextSelectedOptions = item.selected_options.map((option, index) =>
      index === optionIndex ? { ...option, quantity: nextOptionQuantity } : option,
    );
    const nextProductQuantity = nextSelectedOptions.reduce((sum, option) => sum + option.quantity, 0);
    const previousOptionAmount = item.selected_options.reduce((sum, option) => sum + option.price * option.quantity, 0);
    const nextOptionAmount = nextSelectedOptions.reduce((sum, option) => sum + option.price * option.quantity, 0);
    const unitBase = Math.max(item.total_price - previousOptionAmount, 0) / Math.max(item.product_quantity || 1, 1);

    updateItem(item.cart_item_id, {
      selected_options: nextSelectedOptions,
      product_quantity: nextProductQuantity,
      expected_people: nextProductQuantity,
      total_price: Math.round(unitBase * nextProductQuantity + nextOptionAmount),
    });
  };

  const getCombinationDraftKey = (cartItemId: string, optionIndex: number) => `${cartItemId}:${optionIndex}`;

  const clearCombinationQuantityDraft = (cartItemId: string, optionIndex: number) => {
    const draftKey = getCombinationDraftKey(cartItemId, optionIndex);
    setCombinationQuantityDrafts((prev) => {
      if (!(draftKey in prev)) return prev;
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  };

  const handleCombinationQuantityInputChange = (item: QuoteCartItem, optionIndex: number, rawValue: string) => {
    if (!/^\d*$/.test(rawValue)) return;
    const draftKey = getCombinationDraftKey(item.cart_item_id, optionIndex);
    setCombinationQuantityDrafts((prev) => ({ ...prev, [draftKey]: rawValue }));
    if (rawValue === "") return;
    const nextQuantity = parseInt(rawValue, 10);
    if (Number.isNaN(nextQuantity)) return;
    updateCombinationOptionQuantity(item, optionIndex, nextQuantity);
  };

  const handleCombinationQuantityInputBlur = (item: QuoteCartItem, optionIndex: number, fallbackQuantity: number) => {
    const draftKey = getCombinationDraftKey(item.cart_item_id, optionIndex);
    const draftValue = combinationQuantityDrafts[draftKey];
    if (draftValue === undefined) return;
    if (draftValue !== "") {
      const nextQuantity = Math.max(1, parseInt(draftValue, 10) || fallbackQuantity);
      updateCombinationOptionQuantity(item, optionIndex, nextQuantity);
    }
    setCombinationQuantityDrafts((prev) => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
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
    <>
      <div className="min-h-screen bg-gray-50 py-12 print:hidden">
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
                              {(priceDisplayLoading || isVisiblePriceMode(priceDisplayMode)) && (
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
                              )}
                            </div>

                            {(componentCount > 0 || optionCount > 0) && (
                              <div className={`mt-3 grid gap-3 text-sm text-slate-600 ${isCombinationOptionMode ? "max-w-xl" : "sm:grid-cols-2"}`}>
                                {componentCount > 0 && (
                                  <div className="rounded-lg bg-slate-50 px-4 py-3">
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
                                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                                    <p className="mb-2 font-semibold text-slate-500">{optionLabel}</p>
                                    <div className={isCombinationOptionMode ? "space-y-2" : "space-y-0.5"}>
                                      {(isCombinationOptionMode ? item.selected_options : item.selected_options.slice(0, 3)).map((option, index) => (
                                        isCombinationOptionMode ? (
                                          <div key={`${item.cart_item_id}-option-${index}`} className="flex items-center justify-between gap-3">
                                            <span className="truncate text-[15px]">{option.name}</span>
                                            <div className="ml-2 inline-flex items-center gap-2 rounded-full bg-white px-2 py-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  clearCombinationQuantityDraft(item.cart_item_id, index);
                                                  updateCombinationOptionQuantity(item, index, option.quantity - 1);
                                                }}
                                                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-40"
                                                disabled={option.quantity <= 1}
                                                aria-label="옵션 수량 줄이기"
                                              >
                                                <Minus size={12} />
                                              </button>
                                              <input
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={combinationQuantityDrafts[getCombinationDraftKey(item.cart_item_id, index)] ?? String(option.quantity)}
                                                onChange={(event) => handleCombinationQuantityInputChange(item, index, event.target.value)}
                                                onBlur={() => handleCombinationQuantityInputBlur(item, index, option.quantity)}
                                                className="w-14 rounded-md border border-slate-200 bg-white px-1 py-1 text-center text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-slate-300"
                                                aria-label="옵션 수량 입력"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  clearCombinationQuantityDraft(item.cart_item_id, index);
                                                  updateCombinationOptionQuantity(item, index, option.quantity + 1);
                                                }}
                                                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100"
                                                aria-label="옵션 수량 늘리기"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div key={`${item.cart_item_id}-option-${index}`} className="flex justify-between gap-2">
                                            <span className="truncate">{option.name}</span>
                                            <span className="shrink-0 font-semibold">{option.quantity}개</span>
                                          </div>
                                        )
                                      ))}
                                      {!isCombinationOptionMode && item.selected_options.length > 3 && <p className="text-slate-400">외 {item.selected_options.length - 3}개</p>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-3">
                              {isCombinationOptionMode ? (
                                <div className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                                  총 {item.product_quantity || 1}개
                                </div>
                              ) : (
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
                              )}
                              <button onClick={() => openDeleteConfirm("single", item.cart_item_id)} className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                                <Trash2 size={15} /> 삭제
                              </button>
                            </div>
                          </div>

                          {(priceDisplayLoading || isVisiblePriceMode(priceDisplayMode)) && (
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
                          )}
                        </div>
                      </article>
                    );
                  })}
                </section>

                <div className="sticky bottom-[65px] md:bottom-0 z-20 mt-6 rounded-t-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:rounded-2xl md:shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">선택 상품 {selectedItems.length}개</p>
                      {(priceDisplayLoading || isVisiblePriceMode(priceDisplayMode)) && (
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
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => window.print()}
                        disabled={selectedItems.length === 0}
                        className="h-12 flex-1 sm:flex-none rounded-xl border border-slate-300 bg-white px-4 sm:px-6 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:text-slate-300 disabled:border-slate-200 sm:min-w-[140px] flex items-center justify-center gap-2"
                      >
                        <Printer size={18} />
                        견적서 출력
                      </button>
                      <button
                        onClick={goRequestPage}
                        disabled={selectedItems.length === 0}
                        className="h-12 flex-[2] sm:flex-none rounded-xl bg-[#001E45] px-4 sm:px-6 font-semibold text-white transition-colors hover:bg-[#002D66] disabled:bg-slate-300 sm:min-w-[220px]"
                      >
                        선택 상품 견적요청
                      </button>
                    </div>
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

      {/* Printable Area */}
      <div className="hidden print:block bg-white text-black font-sans w-full max-w-[21cm] mx-auto text-[12px] leading-tight print:p-4">
        
        {/* Title */}
        <div className="flex justify-between items-end border-b-2 border-black pb-3 mb-6">
          <h1 className="text-3xl font-black tracking-widest text-center flex-1 ml-40">가 견 적 서</h1>
          <div className="text-right w-56 font-bold text-[#001E45]">
            <div className="text-[10px] tracking-tight mb-0.5 text-gray-500">종합가구·기기 판매 & 렌탈 브랜드</div>
            <div className="text-2xl tracking-tighter flex items-center justify-end gap-1.5">
              <span className="bg-[#001E45] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-black">R</span> 렌탈어때
            </div>
          </div>
        </div>

        {/* Company Info Table */}
        <table className="w-full border-collapse border-2 border-black mb-8 text-center text-[11px]">
          <tbody>
            <tr>
              <th className="border border-black bg-[#E6EEF9] py-2 font-bold w-28">사업자등록번호</th>
              <td colSpan={3} className="border border-black py-2 text-lg font-bold tracking-widest text-[#001E45]">305-30-85537</td>
              <th className="border border-black bg-[#E6EEF9] py-2 font-bold w-28">고객센터</th>
              <td className="border border-black py-2 text-xl font-black tracking-wider text-[#001E45]">1800-1985</td>
            </tr>
            <tr>
              <th className="border border-black bg-[#E6EEF9] py-2 font-bold w-24">상 호 명</th>
              <td className="border border-black py-2 font-bold tracking-widest text-sm">휴먼파트너</td>
              <th className="border border-black bg-[#E6EEF9] py-2 font-bold w-24">대표이사</th>
              <td className="border border-black py-2 font-bold tracking-widest text-sm relative text-center">
                이 기 섭
              </td>
              <th className="border border-black bg-[#E6EEF9] py-2 font-bold w-28">이메일</th>
              <td className="border border-black py-2 text-[11px]">hm_solution@naver.com</td>
            </tr>
            <tr>
              <th className="border border-black bg-[#E6EEF9] py-2 font-bold">소 재 지</th>
              <td colSpan={3} className="border border-black py-2 text-left px-3 text-[10px]">대전광역시 대덕구 대화로106번길 66 펜타플렉스 705호</td>
              <th className="border border-black bg-[#E6EEF9] py-2 font-bold">홈페이지</th>
              <td className="border border-black py-2 text-[11px]">humanpartner.kr</td>
            </tr>
          </tbody>
        </table>

        {/* Product Table */}
        <div className="flex border-2 border-b-0 border-black w-fit">
          <div className="bg-[#E6EEF9] px-6 py-1.5 font-bold text-black text-sm border-r-2 border-black">
            렌탈상품 내역
          </div>
        </div>
        <table className="w-full border-collapse border-2 border-black text-center mb-8">
          <thead>
            <tr className="bg-[#E6EEF9]">
              <th className="border border-black py-1.5 w-12 font-bold">NO</th>
              <th className="border border-black py-1.5 font-bold">상 품 명</th>
              <th className="border border-black py-1.5 w-32 font-bold">규 격</th>
              <th className="border border-black py-1.5 w-24 font-bold">수 량</th>
              <th className="border border-black py-1.5 w-40 font-bold">비 고</th>
            </tr>
          </thead>
          <tbody>
            {printComponents.map((comp, idx) => (
              <tr key={idx}>
                <td className="border border-black py-1">{idx + 1}</td>
                <td className="border border-black py-1 text-left px-3 font-semibold text-[11px] leading-tight break-keep">{comp.name}</td>
                <td className="border border-black py-1 text-gray-500 text-[9px]">-</td>
                <td className="border border-black py-1 font-bold text-[11px]">{comp.quantity}</td>
                <td className="border border-black py-1"></td>
              </tr>
            ))}
            <tr>
              <th colSpan={3} className="border border-black bg-[#E6EEF9] py-3 text-right px-6 font-bold text-sm">
                총 견적 금액 (VAT 포함)
              </th>
              <td colSpan={2} className="border border-black py-3 text-center font-black text-xl text-red-600 tracking-wider">
                {selectedTotal.toLocaleString()} 원
              </td>
            </tr>
          </tbody>
        </table>

        {/* Notice Section */}
        <div className="flex border-2 border-b-0 border-black w-fit">
          <div className="bg-[#E6EEF9] px-6 py-1.5 font-bold text-black text-sm border-r-2 border-black">
            견적 확인 안내
          </div>
        </div>
        <table className="w-full border-collapse border-2 border-black text-left mb-16">
          <tbody>
            <tr>
              <td className="border border-black p-6 text-[12px] leading-loose text-gray-800 bg-gray-50/50">
                1) 본 견적서는 렌탈어때(휴먼파트너) 온라인 웹사이트에서 발행된 <strong className="text-black">가견적서</strong>입니다.<br/>
                2) 실제 렌탈 계약 시, 대여 기간, 설치 장소(엘리베이터 유무), 야간 및 주말 작업 여부에 따라 <strong className="text-red-600">물류비/세팅비가 추가되어 최종 금액이 변동</strong>될 수 있습니다.<br/>
                3) 견적일자: <strong>{new Date().toLocaleDateString('ko-KR')}</strong><br/>
                4) 본 견적서는 발행일로부터 7일간 유효합니다.
              </td>
            </tr>
          </tbody>
        </table>

        <div className="text-center text-sm font-semibold">
          <p>위와 같이 가견적을 제안합니다.</p>
          <p className="mt-4 text-[13px]">{new Date().getFullYear()}년 {new Date().getMonth() + 1}월 {new Date().getDate()}일</p>
          <div className="mt-8 text-3xl tracking-[0.5em] font-black pl-4">
            휴 먼 파 트 너
          </div>
        </div>
      </div>
    </>
  );
};
