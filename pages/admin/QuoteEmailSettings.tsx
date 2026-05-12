import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Loader2,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  getQuoteEmailSettingsWithDispatches,
  QuoteEmailDispatchRecord,
  getQuoteEmailSettings,
  QuoteEmailRecipient,
  QuoteEmailSettings,
  updateQuoteEmailSettings,
} from "../../src/api/quoteEmailApi";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const serializeSettings = (settings: QuoteEmailSettings) =>
  JSON.stringify({
    enabled: settings.enabled,
    recipients: settings.recipients
      .map((recipient) => ({
        email: normalizeEmail(recipient.email),
        enabled: recipient.enabled,
      }))
      .sort((a, b) => a.email.localeCompare(b.email)),
  });

const DEFAULT_SETTINGS: QuoteEmailSettings = {
  enabled: false,
  recipients: [],
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

export const QuoteEmailSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<QuoteEmailSettings>(DEFAULT_SETTINGS);
  const [dispatches, setDispatches] = useState<QuoteEmailDispatchRecord[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState(serializeSettings(DEFAULT_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const hasChanges = useMemo(
    () => serializeSettings(settings) !== savedSnapshot,
    [savedSnapshot, settings],
  );

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getQuoteEmailSettingsWithDispatches();
      setSettings(data);
      setDispatches(data.dispatches);
      setSavedSnapshot(serializeSettings(data));
    } catch (error) {
      console.error("Failed to load quote email settings:", error);
      alert(getErrorMessage(error, "견적 메일 설정을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleAddRecipient = () => {
    const email = normalizeEmail(newEmail);
    if (!email) {
      alert("추가할 이메일 주소를 입력해주세요.");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      alert("올바른 이메일 형식을 입력해주세요.");
      return;
    }
    if (settings.recipients.some((recipient) => recipient.email === email)) {
      alert("이미 등록된 이메일 주소입니다.");
      return;
    }

    const nextRecipients: QuoteEmailRecipient[] = [
      ...settings.recipients,
      { email, enabled: true },
    ];

    setSettings((prev) => ({
      ...prev,
      recipients: nextRecipients,
    }));
    setNewEmail("");
  };

  const handleToggleRecipient = (email: string) => {
    setSettings((prev) => ({
      ...prev,
      recipients: prev.recipients.map((recipient) =>
        recipient.email === email
          ? { ...recipient, enabled: !recipient.enabled }
          : recipient,
      ),
    }));
  };

  const handleDeleteRecipient = (email: string) => {
    setSettings((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((recipient) => recipient.email !== email),
    }));
  };

  const handleSave = async () => {
    const normalizedRecipients = settings.recipients.map((recipient) => ({
      email: normalizeEmail(recipient.email),
      enabled: recipient.enabled,
    }));

    if (
      normalizedRecipients.some(
        (recipient) => !recipient.email || !EMAIL_PATTERN.test(recipient.email),
      )
    ) {
      alert("저장 전에 이메일 형식을 다시 확인해주세요.");
      return;
    }

    setSaving(true);
    try {
      const saved = await updateQuoteEmailSettings({
        ...settings,
        recipients: normalizedRecipients,
      });
      setSettings(saved);
      setSavedSnapshot(serializeSettings(saved));
      alert("견적 알림 메일 설정이 저장되었습니다.");
    } catch (error) {
      console.error("Failed to save quote email settings:", error);
      alert(getErrorMessage(error, "견적 알림 메일 설정 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  };

  const formatDispatchStatus = (dispatch: QuoteEmailDispatchRecord) => {
    if (dispatch.status === "sent") {
      return {
        label: "발송 완료",
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        icon: CheckCircle2,
      };
    }

    if (dispatch.status === "failed") {
      return {
        label: "발송 실패",
        className: "bg-red-50 text-red-700 border border-red-200",
        icon: AlertTriangle,
      };
    }

    return {
      label:
        dispatch.reason === "disabled"
          ? "알림 비활성화"
          : dispatch.reason === "no_recipients"
            ? "수신자 없음"
            : "발송 생략",
      className: "bg-amber-50 text-amber-700 border border-amber-200",
      icon: Clock3,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#001E45]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Mail size={24} className="text-[#001E45]" />
            견적 메일 설정
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            신규 견적 요청이 들어오면 등록된 운영 이메일로만 알림 메일을 보냅니다. 고객에게 자동 회신하지는 않습니다.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#001E45] text-white text-sm font-bold hover:bg-[#002D66] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          저장
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Bell size={18} className="text-[#001E45]" />
              신규 견적 메일 알림
            </div>
            <p className="text-sm text-slate-500 mt-1">
              알림을 끄면 고객 견적 요청은 그대로 접수되고, 운영 담당자에게 가는 내부 알림 메일만 중지됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`inline-flex items-center justify-center min-w-[120px] px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
              settings.enabled
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            {settings.enabled ? "발송 사용 중" : "발송 중지"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">수신 이메일 목록</h2>
            <p className="text-sm text-slate-500 mt-1">
              여러 운영 담당자를 추가할 수 있고, 주소별로 알림 수신 여부를 따로 관리할 수 있습니다.
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="manager@example.com"
              className="flex-1 md:w-[320px] px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:ring-4 focus:ring-[#001E45]/10 focus:border-[#001E45] outline-none transition-all font-medium"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddRecipient();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddRecipient}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#001E45] text-white text-sm font-bold hover:bg-[#002D66] transition-colors"
            >
              <Plus size={16} />
              추가
            </button>
          </div>
        </div>

        {settings.recipients.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 px-6 py-14 text-center">
            <ShieldCheck size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">등록된 수신 이메일이 없습니다.</p>
            <p className="text-sm text-slate-400 mt-1">
              운영 담당자 이메일을 추가하면 신규 견적 요청 알림을 받을 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {settings.recipients.map((recipient) => (
              <div
                key={recipient.email}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 break-all">
                    {recipient.email}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {recipient.enabled ? "현재 메일 수신 중" : "현재 수신 중지"}
                  </div>
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleRecipient(recipient.email)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      recipient.enabled
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {recipient.enabled ? "수신 중" : "중지됨"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecipient(recipient.email)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={14} />
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400 flex flex-col gap-1">
          <span>저장 후에는 신규 견적 요청부터 즉시 반영되며, 고객에게 자동 회신 메일은 발송되지 않습니다.</span>
          {settings.updatedAt ? (
            <span>
              마지막 저장: {new Date(settings.updatedAt).toLocaleString("ko-KR")}
              {settings.updatedByEmail ? ` · ${settings.updatedByEmail}` : ""}
            </span>
          ) : null}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mt-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">최근 견적 메일 발송 이력</h2>
            <p className="text-sm text-slate-500 mt-1">
              최근 20건 기준으로 성공, 실패, 생략 사유를 확인할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Loader2 size={14} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        {dispatches.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center">
            <Mail size={34} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">아직 기록된 발송 이력이 없습니다.</p>
            <p className="text-sm text-slate-400 mt-1">
              신규 견적 요청이 들어오면 이 화면에서 최근 발송 상태를 확인할 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dispatches.map((dispatch) => {
              const status = formatDispatchStatus(dispatch);
              const StatusIcon = status.icon;

              return (
                <div
                  key={`${dispatch.bookingId}-${dispatch.updatedAt || dispatch.status}`}
                  className="rounded-2xl border border-slate-200 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${status.className}`}>
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          예약 ID: {dispatch.bookingId}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-800 break-all">
                        {dispatch.productName || "상품 정보 미기록"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 flex flex-col gap-1">
                        <span>
                          최근 갱신:{" "}
                          {dispatch.updatedAt
                            ? new Date(dispatch.updatedAt).toLocaleString("ko-KR")
                            : "-"}
                        </span>
                        {dispatch.recipients && dispatch.recipients.length > 0 ? (
                          <span>수신 대상: {dispatch.recipients.join(", ")}</span>
                        ) : null}
                        {dispatch.reason ? <span>사유: {dispatch.reason}</span> : null}
                        {dispatch.errorMessage ? (
                          <span className="text-red-600">오류: {dispatch.errorMessage}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
