import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CheckCircle, Clock, FileText, Loader2, XCircle } from "lucide-react";
import { Container } from "../components/ui/Container";
import { MyPageSidebar } from "../components/MyPageSidebar";
import {
  Booking,
  getBookingStatusLabel,
  getUserBookings,
  isBookingCancellable,
  updateBookingStatus,
} from "../src/api/bookingApi";
import { useAuth } from "../src/context/AuthContext";
import { usePriceDisplay } from "../src/context/PriceDisplayContext";
import { getPublicPriceClassName, getPublicPriceText, INQUIRY_PRICE_TEXT_CLASS } from "../src/utils/priceDisplay";

const statusConfig = {
  pending: { className: "bg-orange-50 border-orange-200 text-orange-700", icon: Calendar },
  quote_sent: { className: "bg-cyan-50 border-cyan-200 text-cyan-700", icon: FileText },
  confirmed: { className: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: CheckCircle },
  cancelled: { className: "bg-gray-50 border-gray-200 text-gray-600", icon: XCircle },
} as const;

export const MyPage: React.FC = () => {
  const { user } = useAuth();
  const { mode: priceDisplayMode, loading: priceDisplayLoading } = usePriceDisplay();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setBookings(await getUserBookings(user.uid));
      } catch (error) {
        console.error("Failed to fetch bookings", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchBookings();
  }, [user]);

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: Booking["status"]) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${config.className}`}>
        <Icon size={14} />
        {getBookingStatusLabel(status)}
      </span>
    );
  };

  const handleCancelBooking = async (bookingId?: string) => {
    if (!bookingId || cancellingId) return;
    if (!confirm("견적 요청을 취소할까요?")) return;

    setCancellingId(bookingId);
    try {
      const updated = await updateBookingStatus(bookingId, "cancelled");
      setBookings((prev) => prev.map((booking) => (
        booking.id === bookingId ? { ...booking, status: updated.status } : booking
      )));
    } catch (error) {
      console.error("Failed to cancel booking", error);
      alert("견적 요청 취소에 실패했습니다.");
    } finally {
      setCancellingId(null);
    }
  };

  const visibleBookings = bookings.filter((booking) => booking.status !== "cancelled");

  if (!user) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-gray-500">로그인이 필요합니다.</p>
        <Link to="/login" className="text-[#001E45] underline">로그인하기</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Container>
        <div className="grid gap-8 md:grid-cols-[260px_1fr]">
          <MyPageSidebar active="requests" />

          <main>
            <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <Clock size={24} /> 견적 요청 내역
            </h1>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-[#001E45]" size={40} />
              </div>
            ) : visibleBookings.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="mb-4 text-gray-500">접수된 견적 요청이 없습니다.</p>
                <Link to="/products" className="text-[#001E45] underline">상품 보러가기</Link>
              </div>
            ) : (
              <div className="space-y-5">
                {visibleBookings.map((booking) => {
                  const items = booking.quote_items || [];
                  const totalQuantity = items.reduce((sum, item) => sum + (item.product_quantity || 1), 0);

                  return (
                    <article key={booking.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                      <div className="border-b border-gray-100 p-5 md:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              {getStatusBadge(booking.status)}
                              <span className="text-xs text-gray-400">접수번호 {booking.id?.slice(0, 8)}</span>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">
                              {items[0]?.product_name || booking.products?.name || "견적 요청"}
                              {items.length > 1 ? ` 외 ${items.length - 1}종` : ""}
                            </h2>
                            <p className="mt-2 text-sm text-gray-500">
                              {formatDate(booking.start_date)} ~ {formatDate(booking.end_date)} · 상품 {items.length}종 · 총 수량 {totalQuantity}개
                            </p>
                            {booking.installation_place ? (
                              <p className="mt-1 text-sm text-gray-500">설치장소: {booking.installation_place}</p>
                            ) : null}
                          </div>
                          <div className="text-left md:text-right">
                            <div className={getPublicPriceClassName({
                              mode: priceDisplayMode,
                              loading: priceDisplayLoading,
                              visibleClass: "text-xl font-semibold text-[#001E45]",
                              hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                            })}>
                              {getPublicPriceText({ amount: booking.total_price, mode: priceDisplayMode, loading: priceDisplayLoading })}
                            </div>
                            {isBookingCancellable(booking.status) && (
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={cancellingId === booking.id}
                                className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:text-gray-300"
                              >
                                {cancellingId === booking.id ? <Loader2 className="animate-spin" size={16} /> : null}
                                요청 취소
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 md:p-6">
                        <h3 className="mb-3 text-sm font-semibold text-gray-800">요청 상품 및 수량</h3>
                        <div className="space-y-3">
                          {items.map((item) => (
                            <div key={`${booking.id}-${item.product_id}`} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-3">
                              <div className="flex min-w-0 items-center gap-3">
                                {item.product_image_url ? (
                                  <img src={item.product_image_url} alt={item.product_name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                                ) : (
                                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                                )}
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-gray-900">{item.product_name}</p>
                                  <p className="text-xs text-gray-500">
                                    수량 {item.product_quantity}개 · 옵션 {item.selected_options?.length || 0}개
                                  </p>
                                </div>
                              </div>
                              <div className={getPublicPriceClassName({
                                mode: priceDisplayMode,
                                loading: priceDisplayLoading,
                                visibleClass: "shrink-0 text-sm font-semibold text-gray-900",
                                hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                              })}>
                                {getPublicPriceText({ amount: item.total_price, mode: priceDisplayMode, loading: priceDisplayLoading })}
                              </div>
                            </div>
                          ))}
                        </div>
                        {booking.request_note ? (
                          <div className="mt-5 rounded-xl bg-gray-50 p-4">
                            <p className="mb-1 text-xs font-semibold text-gray-500">추가 요청사항</p>
                            <p className="whitespace-pre-line text-sm text-gray-700">{booking.request_note}</p>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
};
