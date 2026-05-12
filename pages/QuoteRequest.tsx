import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, FileText, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Container } from "../components/ui/Container";
import { useAuth } from "../src/context/AuthContext";
import { createBooking } from "../src/api/bookingApi";
import { createNotification } from "../src/api/notificationApi";
import { sendQuoteRequestNotificationEmail } from "../src/api/quoteEmailApi";
import { QuoteCartItem, getQuoteCartItems, setQuoteCartItems } from "../src/utils/quoteCart";
import { usePriceDisplay } from "../src/context/PriceDisplayContext";
import { getPublicPriceClassName, getPublicPriceText, INQUIRY_PRICE_TEXT_CLASS } from "../src/utils/priceDisplay";
import { buildBookingRequestNote } from "../src/utils/bookingRequestDetails";

const SITE_TYPE_OPTIONS = [
  "사무실",
  "전시장",
  "행사장",
  "학교",
  "공공기관",
  "기타",
] as const;

const ELEVATOR_OPTIONS = [
  { value: "yes", label: "있음" },
  { value: "no", label: "없음" },
  { value: "unknown", label: "모름" },
] as const;

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayString = () => toLocalDateInputValue(new Date());

const nextWeekString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toLocalDateInputValue(date);
};

const getOptionSummaryText = (item: QuoteCartItem) => {
  if (item.selected_options.length === 0) return null;

  const [primaryOption] = item.selected_options;
  const primaryOptionText =
    primaryOption.quantity > 1
      ? `${primaryOption.name} ${primaryOption.quantity}개`
      : primaryOption.name;
  const remainingCount = item.selected_options.length - 1;

  return remainingCount > 0
    ? `${primaryOptionText} 외 ${remainingCount}개`
    : primaryOptionText;
};

export const QuoteRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { mode: priceDisplayMode, loading: priceDisplayLoading } = usePriceDisplay();
  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState(nextWeekString());
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [installationPlace, setInstallationPlace] = useState("");
  const [siteType, setSiteType] = useState<(typeof SITE_TYPE_OPTIONS)[number]>("사무실");
  const [elevatorType, setElevatorType] = useState<(typeof ELEVATOR_OPTIONS)[number]["value"]>("unknown");
  const [requestNote, setRequestNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const cartItems = getQuoteCartItems();
    setItems(cartItems.filter((item) => item.selected));
  }, []);

  useEffect(() => {
    if (userProfile?.name) {
      setCustomerName((prev) => prev || userProfile.name);
    }
    if (userProfile?.company_name) {
      setCompanyName((prev) => prev || userProfile.company_name);
    }
    if (userProfile?.phone) {
      setContactPhone((prev) => prev || userProfile.phone);
    }
    if (userProfile?.email || user?.email) {
      setCustomerEmail((prev) => prev || userProfile?.email || user?.email || "");
    }
  }, [user, userProfile]);

  const selectedTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.total_price, 0),
    [items],
  );
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + (item.product_quantity || 1), 0),
    [items],
  );

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (items.length === 0) {
      alert("견적 요청할 상품을 선택해 주세요.");
      navigate("/quote-cart");
      return;
    }
    if (
      !startDate ||
      !endDate ||
      !customerName.trim() ||
      !companyName.trim() ||
      !contactPhone.trim() ||
      !customerEmail.trim() ||
      !installationPlace.trim()
    ) {
      alert("고객명, 회사명, 연락처, 이메일, 사용 기간, 설치 장소를 입력해 주세요.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert("사용 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingUserId =
        user?.uid || `guest:${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
      const elevatorLabel =
        ELEVATOR_OPTIONS.find((option) => option.value === elevatorType)?.label || elevatorType;
      const booking = await createBooking({
        product_id: items[0].product_id,
        user_id: bookingUserId,
        user_email: customerEmail.trim(),
        start_date: startDate,
        end_date: endDate,
        total_price: selectedTotal,
        status: "pending",
        selected_options: [],
        basic_components: [],
        quote_items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_image_url: item.product_image_url,
          product_quantity: item.product_quantity || 1,
          unit_price: Math.round(item.total_price / Math.max(item.product_quantity || 1, 1)),
          total_price: item.total_price,
          selected_options: item.selected_options,
          basic_components: item.basic_components,
        })),
        usage_period: `${startDate} ~ ${endDate}`,
        installation_place: installationPlace.trim(),
        request_note: buildBookingRequestNote({
          customer: {
            customerName,
            companyName,
            contactPhone,
            customerEmail,
          },
          site: {
            siteType,
            elevatorLabel,
          },
          extraRequest: requestNote,
        }),
      });

      if (booking.id) {
        try {
          await sendQuoteRequestNotificationEmail(booking.id);
        } catch (error) {
          console.error("Failed to send quote request email", error);
        }
      }

      if (user) {
        await createNotification(
          user.uid,
          "견적 요청 완료",
          `${items.length}개 상품의 견적 요청이 접수되었습니다.`,
          "info",
          "/mypage",
        );
      }

      const requestedIds = new Set(items.map((item) => item.cart_item_id));
      setQuoteCartItems(getQuoteCartItems().filter((item) => !requestedIds.has(item.cart_item_id)));
      setCompleted(true);
    } catch (error) {
      console.error("Failed to submit quote request", error);
      alert("견적 요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <Helmet>
          <title>견적 요청 완료 | 렌탈파트너</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Container>
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <CheckCircle className="mx-auto text-[#001E45]" size={40} />
            <h1 className="mt-4 text-2xl font-semibold text-slate-900">견적 요청이 접수되었습니다.</h1>
            <p className="mt-2 text-sm text-slate-500">
              입력하신 연락처와 이메일 기준으로 담당자가 확인 후 안내드립니다.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {user ? (
                <Link to="/mypage" className="rounded-xl bg-[#001E45] px-5 py-3 text-sm font-semibold text-white">
                  마이페이지 이동
                </Link>
              ) : (
                <Link to="/" className="rounded-xl bg-[#001E45] px-5 py-3 text-sm font-semibold text-white">
                  홈으로 이동
                </Link>
              )}
              <Link to="/products" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
                상품 더 보기
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <Helmet>
        <title>견적 요청 정보 입력 | 렌탈파트너</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Container>
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <Link to="/quote-cart" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#001E45]">
              <ArrowLeft size={16} /> 장바구니로 돌아가기
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <FileText size={24} /> 견적 요청 정보 입력
            </h1>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <p className="mb-4 text-slate-500">선택된 장바구니 상품이 없습니다.</p>
              <Link to="/quote-cart" className="inline-flex rounded-xl bg-[#001E45] px-5 py-2.5 text-sm font-semibold text-white">
                장바구니로 이동
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">요청 상품</h2>
                <div className="space-y-3">
                  {items.map((item) => {
                    const optionSummaryText = getOptionSummaryText(item);

                    return (
                      <div key={item.cart_item_id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {item.product_image_url ? (
                            <img src={item.product_image_url} alt={item.product_name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{item.product_name}</p>
                          <div className="mt-1 text-xs text-slate-500 sm:flex sm:flex-wrap sm:items-center sm:gap-1">
                            <span>{`수량 ${item.product_quantity || 1}개`}</span>
                            {optionSummaryText ? (
                              <>
                                <span className="hidden text-slate-300 sm:inline">·</span>
                                <span className="block min-w-0 break-words text-slate-600 sm:inline">
                                  {optionSummaryText}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className={getPublicPriceClassName({
                          mode: priceDisplayMode,
                          loading: priceDisplayLoading,
                          visibleClass: "shrink-0 text-sm font-semibold text-rose-600",
                          hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                        })}>
                          {getPublicPriceText({ amount: item.total_price, mode: priceDisplayMode, loading: priceDisplayLoading })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <aside className="rounded-2xl border border-slate-200 bg-white p-6 h-fit">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">상세 정보</h2>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">사용 기간</span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">고객명</span>
                      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="예: 홍길동" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">연락처</span>
                      <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="예: 010-1234-5678" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">회사명/업체명</span>
                      <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="예: 휴먼파트너" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">이메일</span>
                      <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="예: hello@example.com" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">설치 장소</span>
                    <input value={installationPlace} onChange={(e) => setInstallationPlace(e.target.value)} placeholder="예: 서울 강남구 테헤란로 00, 5층 회의실" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">현장 유형</span>
                      <select value={siteType} onChange={(e) => setSiteType(e.target.value as (typeof SITE_TYPE_OPTIONS)[number])} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        {SITE_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">엘리베이터 여부</span>
                      <select value={elevatorType} onChange={(e) => setElevatorType(e.target.value as (typeof ELEVATOR_OPTIONS)[number]["value"])} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        {ELEVATOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">추가 요청사항</span>
                    <textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)} rows={5} placeholder="반입 시간 제한, 주차 가능 여부, 희망 연락 시간 등을 입력해 주세요." className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                </div>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                    <span>상품 {items.length}종 / 총 수량 {totalQuantity}개</span>
                    <span>선택 상품 합계</span>
                  </div>
                  <div className={getPublicPriceClassName({
                    mode: priceDisplayMode,
                    loading: priceDisplayLoading,
                    visibleClass: "text-right text-xl font-semibold text-[#001E45]",
                    hiddenClass: `${INQUIRY_PRICE_TEXT_CLASS} text-right`,
                  })}>
                    {getPublicPriceText({ amount: selectedTotal, mode: priceDisplayMode, loading: priceDisplayLoading })}
                  </div>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="mt-5 h-12 w-full rounded-xl bg-[#001E45] font-semibold text-white hover:bg-[#002D66] disabled:bg-slate-300"
                >
                  {isSubmitting ? <Loader2 className="mx-auto animate-spin" size={20} /> : "견적 요청 완료"}
                </button>
              </aside>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};
