import React, { useEffect, useMemo, useState } from "react";
import { Building2, Calendar, CheckCircle, FileText, Loader2, Phone, Trash2, XCircle } from "lucide-react";
import {
  BOOKING_STATUS_OPTIONS,
  Booking,
  deleteBooking,
  getBookings,
  getBookingStatusLabel,
  updateBookingStatus,
} from "../../src/api/bookingApi";
import { createNotification } from "../../src/api/notificationApi";
import { parseBookingRequestNote } from "../../src/utils/bookingRequestDetails";

const statusConfig = {
  pending: { className: "bg-orange-100 border-orange-300 text-orange-800", icon: Calendar },
  quote_sent: { className: "bg-cyan-100 border-cyan-300 text-cyan-800", icon: FileText },
  confirmed: { className: "bg-emerald-100 border-emerald-300 text-emerald-800", icon: CheckCircle },
  cancelled: { className: "bg-gray-100 border-gray-300 text-gray-700", icon: XCircle },
} as const;

export const BookingList = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, Booking["status"]>>({});

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await getBookings();
      setBookings(data);
      setStatusDrafts(
        data.reduce<Record<string, Booking["status"]>>((acc, booking) => {
          if (booking.id) acc[booking.id] = booking.status;
          return acc;
        }, {}),
      );
    } catch (error) {
      console.error("Failed to load bookings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  const visibleBookings = useMemo(() => bookings, [bookings]);

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
      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${config.className}`}>
        <Icon size={14} />
        {getBookingStatusLabel(status)}
      </span>
    );
  };

  const handleStatusChange = async (booking: Booking) => {
    if (!booking.id) return;
    const nextStatus = statusDrafts[booking.id] || booking.status;
    if (nextStatus === booking.status) return;

    setBusyId(booking.id);
    try {
      const updated = await updateBookingStatus(booking.id, nextStatus);
      setBookings((prev) => prev.map((item) => item.id === booking.id ? { ...item, status: updated.status } : item));
      if (booking.user_id) {
        await createNotification(
          booking.user_id,
          getBookingStatusLabel(updated.status),
          `견적 요청 상태가 '${getBookingStatusLabel(updated.status)}'로 변경되었습니다.`,
          updated.status === "confirmed" ? "success" : updated.status === "cancelled" ? "error" : "info",
          "/mypage",
        );
      }
    } catch (error) {
      console.error("Failed to update booking status", error);
      alert("상태 변경에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (bookingId?: string) => {
    if (!bookingId) return;
    if (!confirm("이 견적 요청을 삭제할까요?")) return;

    setBusyId(bookingId);
    try {
      await deleteBooking(bookingId);
      setBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
    } catch (error) {
      console.error("Failed to delete booking", error);
      alert("삭제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#001E45]" size={40} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">견적 요청 관리</h2>
          <p className="mt-1 text-sm text-slate-500">요청 단위 {visibleBookings.length}건</p>
        </div>
        <button onClick={loadBookings} className="text-sm font-semibold text-[#001E45]">
          새로고침
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">요청자</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">회사/연락처</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">요청 상품</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">사용기간</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">설치장소</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">상태</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">견적 요청 내역이 없습니다.</td>
                </tr>
              ) : (
                visibleBookings.map((booking) => {
                  const items = booking.quote_items || [];
                  const itemCount = items.reduce((sum, item) => sum + (item.product_quantity || 1), 0);
                  const isExpanded = expandedId === booking.id;
                  const requestDetails = parseBookingRequestNote(booking.request_note);
                  const customerName = requestDetails.customer.customerName || booking.user_profiles?.name || "-";
                  const companyName = requestDetails.customer.companyName || booking.user_profiles?.company_name || "-";
                  const contactPhone = requestDetails.customer.contactPhone || booking.user_profiles?.phone || "-";
                  const customerEmail = requestDetails.customer.customerEmail || booking.user_email || booking.user_id;

                  return (
                    <React.Fragment key={booking.id}>
                      <tr
                        className={`cursor-pointer hover:bg-slate-50 ${isExpanded ? "bg-slate-50" : ""}`}
                        onClick={() => setExpandedId(isExpanded ? null : booking.id || null)}
                      >
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900">{customerName}</div>
                          <div className="text-xs text-slate-400">{customerEmail}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Building2 size={14} className="text-slate-400" />
                            {companyName}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            {contactPhone}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{items[0]?.product_name || booking.products?.name || "-"}</div>
                          <div className="text-xs text-slate-500">상품 {items.length}종 / 총 수량 {itemCount}개</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatDate(booking.start_date)} ~ {formatDate(booking.end_date)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{booking.installation_place || "-"}</td>
                        <td className="px-4 py-4 text-center">{getStatusBadge(booking.status)}</td>
                        <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            {busyId === booking.id ? (
                              <Loader2 className="animate-spin text-slate-400" size={20} />
                            ) : (
                              <>
                                <select
                                  value={statusDrafts[booking.id!] || booking.status}
                                  onChange={(event) =>
                                    setStatusDrafts((prev) => ({ ...prev, [booking.id!]: event.target.value as Booking["status"] }))
                                  }
                                  className="min-w-[122px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                >
                                  {BOOKING_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <button onClick={() => handleStatusChange(booking)} className="rounded-lg bg-[#001E45] px-2.5 py-1.5 text-xs text-white">
                                  저장
                                </button>
                                <button onClick={() => handleDelete(booking.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={7} className="px-8 py-6">
                            <div className="grid gap-4 lg:grid-cols-[4fr_6fr]">
                              <div className="rounded-xl border border-slate-200 bg-white p-5">
                                <h3 className="mb-4 text-sm font-bold text-slate-800">요청 상품 목록</h3>
                                <div className="space-y-3">
                                  {items.map((item) => (
                                    <div key={`${booking.id}-${item.product_id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                                      <div className="flex items-center gap-3">
                                        {item.product_image_url ? (
                                          <img src={item.product_image_url} alt={item.product_name} className="h-12 w-12 rounded-lg object-cover" />
                                        ) : null}
                                        <div>
                                          <div className="font-semibold text-slate-900">{item.product_name}</div>
                                          <div className="text-xs text-slate-500">
                                            수량 {item.product_quantity}개 · 옵션 {item.selected_options?.length || 0}개 · 기본 구성 {item.basic_components?.length || 0}개
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right text-sm font-semibold text-[#001E45]">
                                        {item.total_price.toLocaleString()}원
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white p-5">
                                <h3 className="mb-4 text-sm font-bold text-slate-800">요청 정보</h3>
                                <dl className="space-y-3 text-sm">
                                  <div>
                                    <dt className="text-slate-400">접수일</dt>
                                    <dd className="font-medium text-slate-900">{formatDate(booking.created_at)}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-400">사용기간</dt>
                                    <dd className="font-medium text-slate-900">{booking.usage_period || `${formatDate(booking.start_date)} ~ ${formatDate(booking.end_date)}`}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-400">설치장소</dt>
                                    <dd className="font-medium text-slate-900">{booking.installation_place || "-"}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-400">요청사항</dt>
                                    <dd className="whitespace-pre-line font-medium text-slate-900">{booking.request_note || "-"}</dd>
                                  </div>
                                </dl>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
