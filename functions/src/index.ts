import * as admin from "firebase-admin";
import cors = require("cors");
import * as dotenv from "dotenv";
import * as functions from "firebase-functions/v1";
import * as https from "https";
import nodemailer = require("nodemailer");

dotenv.config();

const corsHandler = cors({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

const DEFAULT_APP_BASE_URL = "https://rentalpartner.kr";
const QUOTE_EMAIL_SETTINGS_KEY = "quote_email_notifications";
const QUOTE_EMAIL_DISPATCH_KEY_PREFIX = "quote_email_dispatch:";

const SECTION_HEADERS = {
  customer: ["고객 정보", "怨좉컼 ?뺣낫"],
  site: ["현장 정보", "?꾩옣 ?뺣낫"],
  extraRequest: ["추가 요청사항", "異붽? ?붿껌?ы빆"],
} as const;

const FIELD_LABELS = {
  customerName: ["고객명", "怨좉컼紐?"],
  companyName: ["회사명", "?뚯궗紐?"],
  contactPhone: ["연락처", "?곕씫泥?"],
  customerEmail: ["이메일", "?대찓??"],
  siteType: ["현장 유형", "?꾩옣 ?좏삎"],
  elevatorLabel: ["엘리베이터 여부", "?섎━踰좎씠???щ?"],
} as const;

interface QuoteEmailRecipient {
  email: string;
  enabled: boolean;
}

interface QuoteEmailSettings {
  enabled: boolean;
  recipients: QuoteEmailRecipient[];
  updatedAt?: string;
  updatedByUid?: string;
  updatedByEmail?: string;
}

interface QuoteEmailDispatchRecord {
  bookingId: string;
  status: string;
  updatedAt?: string;
  reason?: string;
  recipients?: string[];
  productName?: string;
  userId?: string;
  sentAt?: string;
  failedAt?: string;
  errorMessage?: string;
}

interface SiteSettingRow {
  setting_key: string;
  setting_value: string;
  updated_at?: string;
}

interface UserProfileRow {
  firebase_uid: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  company_name: string | null;
  is_admin?: boolean | null;
}

interface BookingOption {
  name?: string;
  quantity?: number;
  price?: number;
}

interface QuoteRequestItem {
  product_id: string;
  product_name: string;
  product_image_url?: string;
  product_quantity: number;
  unit_price: number;
  total_price: number;
  selected_options?: BookingOption[] | null;
  basic_components?: Array<{
    name?: string;
    quantity?: number;
    model_name?: string;
  }> | null;
}

interface BookingRow {
  id: string;
  product_id: string;
  user_id: string;
  user_email: string | null;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  selected_options: BookingOption[] | null;
  basic_components: unknown;
  quote_items?: QuoteRequestItem[] | null;
  installation_place: string | null;
  request_note: string | null;
  created_at: string;
}

interface ProductRow {
  id: string;
  name: string | null;
  image_url: string | null;
}

interface ParsedBookingRequestNote {
  customerName: string;
  companyName: string;
  contactPhone: string;
  customerEmail: string;
  siteType: string;
  elevatorLabel: string;
  extraRequest: string;
}

interface QuoteRequestEmailContent {
  subject: string;
  html: string;
  text: string;
}

type JsonRecord = Record<string, unknown>;
type HttpRequest = functions.https.Request;
type HttpResponse = functions.Response<unknown>;

const normalizeEnvValue = (value?: string) =>
  value ? value.trim().replace(/^['"]|['"]$/g, "") : "";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatPrice = (amount: number) =>
  `${new Intl.NumberFormat("ko-KR").format(
    typeof amount === "number" && Number.isFinite(amount) ? amount : 0,
  )}원`;

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getAppBaseUrl = () =>
  normalizeEnvValue(process.env.APP_BASE_URL) || DEFAULT_APP_BASE_URL;

const createTransporter = () => {
  const emailUser = normalizeEnvValue(process.env.EMAIL_USER);
  const emailPass = normalizeEnvValue(process.env.EMAIL_PASS);
  const emailFromName =
    normalizeEnvValue(process.env.EMAIL_FROM_NAME) || "휴먼파트너";
  const smtpHost = normalizeEnvValue(process.env.SMTP_HOST);
  const smtpPort = Number.parseInt(
    normalizeEnvValue(process.env.SMTP_PORT) || "587",
    10,
  );
  const smtpSecure = normalizeEnvValue(process.env.SMTP_SECURE) === "true";

  if (!emailUser || !emailPass) {
    throw new Error("Missing SMTP credentials");
  }

  const transporter = smtpHost
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      })
    : nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

  return {
    transporter,
    emailUser,
    emailFromName,
  };
};

const sendJsonError = (
  res: HttpResponse,
  statusCode: number,
  message: string,
) => {
  res.status(statusCode).json({ error: message });
};

const withCors = (
  req: HttpRequest,
  res: HttpResponse,
  handler: () => Promise<void>,
) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      await handler();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";
      console.error("[Functions] Unhandled error:", error);
      sendJsonError(res, 500, message);
    }
  });
};

const getBearerToken = (req: HttpRequest) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice("Bearer ".length).trim();
};

const requireAuthUser = async (req: HttpRequest) => {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error("인증 토큰이 없습니다.");
  }

  try {
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    console.error("[Auth] Failed to verify Firebase ID token:", error);
    throw new Error("인증에 실패했습니다.");
  }
};

const requestJson = async <T>(
  url: URL,
  options: https.RequestOptions,
  body?: string,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const request = https.request(url, options, (response) => {
      let rawData = "";

      response.on("data", (chunk) => {
        rawData += chunk;
      });

      response.on("end", () => {
        const statusCode = response.statusCode || 500;
        const hasBody = rawData.trim().length > 0;

        if (statusCode < 200 || statusCode >= 300) {
          let errorMessage = rawData || `Request failed with status ${statusCode}`;

          if (hasBody) {
            try {
              const parsed = JSON.parse(rawData) as JsonRecord;
              if (typeof parsed.message === "string") {
                errorMessage = parsed.message;
              } else if (typeof parsed.error === "string") {
                errorMessage = parsed.error;
              }
            } catch {
              // Ignore JSON parse failure and keep raw error message.
            }
          }

          reject(new Error(errorMessage));
          return;
        }

        if (!hasBody) {
          resolve(undefined as T);
          return;
        }

        try {
          resolve(JSON.parse(rawData) as T);
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });

const getSupabaseConfig = () => {
  const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL);
  const supabaseApiKey =
    normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    normalizeEnvValue(process.env.SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseApiKey) {
    throw new Error("Missing Supabase API credentials");
  }

  return { supabaseUrl, supabaseApiKey };
};

const supabaseSelect = async <T>(
  table: string,
  params: Record<string, string>,
) => {
  const { supabaseUrl, supabaseApiKey } = getSupabaseConfig();
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return requestJson<T[]>(url, {
    method: "GET",
    headers: {
      apikey: supabaseApiKey,
      Authorization: `Bearer ${supabaseApiKey}`,
      Accept: "application/json",
    },
  });
};

const supabaseUpsert = async (
  table: string,
  rows: JsonRecord[],
  onConflict: string,
) => {
  const { supabaseUrl, supabaseApiKey } = getSupabaseConfig();
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set("on_conflict", onConflict);

  await requestJson<void>(
    url,
    {
      method: "POST",
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
    },
    JSON.stringify(rows),
  );
};

const getUserProfileByFirebaseUid = async (firebaseUid?: string | null) => {
  if (!firebaseUid) {
    return null;
  }

  const profiles = await supabaseSelect<UserProfileRow>("user_profiles", {
    select: "firebase_uid,email,name,phone,company_name,is_admin",
    firebase_uid: `eq.${firebaseUid}`,
    limit: "1",
  });

  return profiles[0] || null;
};

const requireAdminUser = async (req: HttpRequest) => {
  const decodedToken = await requireAuthUser(req);
  const profile = await getUserProfileByFirebaseUid(decodedToken.uid);

  if (!profile?.is_admin) {
    throw new Error("관리자 권한이 필요합니다.");
  }

  return {
    decodedToken,
    profile,
  };
};

const sanitizeRecipients = (raw: unknown): QuoteEmailRecipient[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();

  return raw.reduce<QuoteEmailRecipient[]>((acc, recipient) => {
    if (!recipient || typeof recipient !== "object") {
      return acc;
    }

    const emailValue =
      "email" in recipient && typeof recipient.email === "string"
        ? recipient.email
        : "";
    const enabledValue =
      "enabled" in recipient ? recipient.enabled !== false : true;
    const email = normalizeEmail(emailValue);

    if (!email || !isValidEmail(email) || seen.has(email)) {
      return acc;
    }

    seen.add(email);
    acc.push({
      email,
      enabled: enabledValue,
    });
    return acc;
  }, []);
};

const parseJsonRecord = (value?: string | null): JsonRecord => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : {};
  } catch {
    return {};
  }
};

const getSiteSetting = async (settingKey: string) => {
  const rows = await supabaseSelect<SiteSettingRow>("site_settings", {
    select: "setting_key,setting_value,updated_at",
    setting_key: `eq.${settingKey}`,
    limit: "1",
  });

  return rows[0] || null;
};

const upsertSiteSetting = async (
  settingKey: string,
  settingValue: string,
) => {
  await supabaseUpsert(
    "site_settings",
    [
      {
        setting_key: settingKey,
        setting_value: settingValue,
      },
    ],
    "setting_key",
  );
};

const toQuoteEmailSettingsResponse = (
  row: SiteSettingRow | null,
): QuoteEmailSettings => {
  const data = parseJsonRecord(row?.setting_value);

  return {
    enabled: data.enabled === true,
    recipients: sanitizeRecipients(data.recipients),
    updatedAt: row?.updated_at,
    updatedByUid:
      typeof data.updatedByUid === "string" ? data.updatedByUid : undefined,
    updatedByEmail:
      typeof data.updatedByEmail === "string" ? data.updatedByEmail : undefined,
  };
};

const getQuoteEmailSettings = async (): Promise<QuoteEmailSettings> => {
  const row = await getSiteSetting(QUOTE_EMAIL_SETTINGS_KEY);
  if (!row) {
    return {
      enabled: false,
      recipients: [],
    };
  }

  return toQuoteEmailSettingsResponse(row);
};

const buildQuoteEmailSettingsPayload = (
  body: unknown,
  updatedByUid: string,
  updatedByEmail?: string | null,
) => {
  const data = body && typeof body === "object" ? (body as JsonRecord) : {};

  return {
    enabled: data.enabled === true,
    recipients: sanitizeRecipients(data.recipients),
    updatedByUid,
    updatedByEmail: updatedByEmail || undefined,
  };
};

const getDispatchSettingKey = (bookingId: string) =>
  `${QUOTE_EMAIL_DISPATCH_KEY_PREFIX}${bookingId}`;

const getDispatchRecord = async (bookingId: string) =>
  parseJsonRecord(
    (await getSiteSetting(getDispatchSettingKey(bookingId)))?.setting_value,
  );

const saveDispatchRecord = async (
  bookingId: string,
  payload: JsonRecord,
) => {
  await upsertSiteSetting(
    getDispatchSettingKey(bookingId),
    JSON.stringify({
      ...payload,
      updatedAt: new Date().toISOString(),
    }),
  );
};

const toQuoteEmailDispatchRecord = (
  row: SiteSettingRow,
): QuoteEmailDispatchRecord | null => {
  const data = parseJsonRecord(row.setting_value);
  const rawBookingId =
    typeof data.bookingId === "string"
      ? data.bookingId
      : row.setting_key.startsWith(QUOTE_EMAIL_DISPATCH_KEY_PREFIX)
        ? row.setting_key.slice(QUOTE_EMAIL_DISPATCH_KEY_PREFIX.length)
        : "";

  if (!rawBookingId) {
    return null;
  }

  return {
    bookingId: rawBookingId,
    status: typeof data.status === "string" ? data.status : "unknown",
    updatedAt:
      typeof data.updatedAt === "string" ? data.updatedAt : row.updated_at,
    reason: typeof data.reason === "string" ? data.reason : undefined,
    recipients: Array.isArray(data.recipients)
      ? data.recipients.filter(
          (recipient): recipient is string => typeof recipient === "string",
        )
      : undefined,
    productName:
      typeof data.productName === "string" ? data.productName : undefined,
    userId: typeof data.userId === "string" ? data.userId : undefined,
    sentAt: typeof data.sentAt === "string" ? data.sentAt : undefined,
    failedAt: typeof data.failedAt === "string" ? data.failedAt : undefined,
    errorMessage:
      typeof data.errorMessage === "string" ? data.errorMessage : undefined,
  };
};

const getRecentQuoteEmailDispatches = async (
  limit = 20,
): Promise<QuoteEmailDispatchRecord[]> => {
  const rows = await supabaseSelect<SiteSettingRow>("site_settings", {
    select: "setting_key,setting_value,updated_at",
    setting_key: `like.${QUOTE_EMAIL_DISPATCH_KEY_PREFIX}*`,
    order: "updated_at.desc",
    limit: String(limit),
  });

  return rows
    .map((row) => toQuoteEmailDispatchRecord(row))
    .filter(
      (record): record is QuoteEmailDispatchRecord =>
        Boolean(record && record.bookingId),
    );
};

const getActiveRecipientEmails = (settings: QuoteEmailSettings) =>
  settings.recipients
    .filter((recipient) => recipient.enabled)
    .map((recipient) => recipient.email);

const getBookingById = async (bookingId: string) => {
  const bookings = await supabaseSelect<BookingRow>("bookings", {
    select:
      "id,product_id,user_id,user_email,start_date,end_date,total_price,status,selected_options,basic_components,quote_items,installation_place,request_note,created_at",
    id: `eq.${bookingId}`,
    limit: "1",
  });

  return bookings[0] || null;
};

const getProductById = async (productId: string) => {
  const products = await supabaseSelect<ProductRow>("products", {
    select: "id,name,image_url",
    id: `eq.${productId}`,
    limit: "1",
  });

  return products[0] || null;
};

const normalizeSectionName = (value: string) => value.trim();

const isOneOf = (value: string, candidates: readonly string[]) =>
  candidates.some((candidate) => candidate === value);

const parseBookingRequestNote = (
  rawNote?: string | null,
): ParsedBookingRequestNote => {
  const parsed: ParsedBookingRequestNote = {
    customerName: "",
    companyName: "",
    contactPhone: "",
    customerEmail: "",
    siteType: "",
    elevatorLabel: "",
    extraRequest: "",
  };

  if (!rawNote?.trim()) {
    return parsed;
  }

  const extraRequestLines: string[] = [];
  let currentSection = "";

  rawNote.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      if (
        isOneOf(currentSection, SECTION_HEADERS.extraRequest) &&
        extraRequestLines.length > 0
      ) {
        extraRequestLines.push("");
      }
      return;
    }

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = normalizeSectionName(sectionMatch[1]);
      return;
    }

    if (isOneOf(currentSection, SECTION_HEADERS.extraRequest)) {
      extraRequestLines.push(rawLine.trimEnd());
      return;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      return;
    }

    const key = normalizeSectionName(line.slice(0, separatorIndex));
    const value = normalizeSectionName(line.slice(separatorIndex + 1));

    if (isOneOf(currentSection, SECTION_HEADERS.customer)) {
      if (isOneOf(key, FIELD_LABELS.customerName)) parsed.customerName = value;
      if (isOneOf(key, FIELD_LABELS.companyName)) parsed.companyName = value;
      if (isOneOf(key, FIELD_LABELS.contactPhone)) parsed.contactPhone = value;
      if (isOneOf(key, FIELD_LABELS.customerEmail)) parsed.customerEmail = value;
      return;
    }

    if (isOneOf(currentSection, SECTION_HEADERS.site)) {
      if (isOneOf(key, FIELD_LABELS.siteType)) parsed.siteType = value;
      if (isOneOf(key, FIELD_LABELS.elevatorLabel)) {
        parsed.elevatorLabel = value;
      }
    }
  });

  parsed.extraRequest = extraRequestLines.join("\n").trim();
  return parsed;
};

const getNormalizedQuoteItems = (
  booking: BookingRow,
  product: ProductRow | null,
): QuoteRequestItem[] => {
  if (Array.isArray(booking.quote_items) && booking.quote_items.length > 0) {
    return booking.quote_items;
  }

  return [
    {
      product_id: booking.product_id,
      product_name: product?.name || booking.product_id,
      product_quantity: 1,
      unit_price: booking.total_price,
      total_price: booking.total_price,
      selected_options: booking.selected_options || [],
    },
  ];
};

const formatProductSummary = (items: QuoteRequestItem[]) => {
  if (items.length === 0) {
    return "-";
  }

  if (items.length === 1) {
    return items[0].product_name || items[0].product_id || "상품";
  }

  const firstProductName = items[0].product_name || items[0].product_id || "상품";
  return `${firstProductName} 외 ${items.length - 1}종`;
};

const buildOptionTextLines = (selectedOptions?: BookingOption[] | null) => {
  if (!selectedOptions || selectedOptions.length === 0) {
    return ["선택 옵션 없음"];
  }

  return selectedOptions.map((option) => {
    const optionName = option.name || "옵션";
    const quantity =
      typeof option.quantity === "number" && Number.isFinite(option.quantity)
        ? option.quantity
        : 0;
    const subtotal =
      typeof option.price === "number" && Number.isFinite(option.price)
        ? option.price * quantity
        : 0;

    return `- ${optionName} / ${quantity}개 / ${formatPrice(subtotal)}`;
  });
};

const renderQuoteItemsHtml = (items: QuoteRequestItem[]) =>
  items
    .map((item) => {
      const optionLines = buildOptionTextLines(item.selected_options);
      return `
        <div style="padding: 16px 18px; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
            <div>
              <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${escapeHtml(item.product_name || item.product_id || "상품")}</div>
              <div style="margin-top: 4px; font-size: 13px; color: #64748b;">수량 ${escapeHtml(String(item.product_quantity || 0))}개</div>
            </div>
          </div>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px;">선택 옵션</div>
            <div style="font-size: 13px; line-height: 1.7; color: #334155; white-space: pre-line;">${escapeHtml(optionLines.join("\n"))}</div>
          </div>
        </div>
      `;
    })
    .join("");

const renderInfoTableRows = (
  items: Array<{ label: string; value: string; emphasized?: boolean }>,
) =>
  items
    .map(
      ({ label, value, emphasized }) => `
        <tr>
          <td style="padding: 6px 0; width: 110px; font-size: 14px; color: #64748b;">${escapeHtml(label)}</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a;${emphasized ? " font-weight: 700;" : ""}">${escapeHtml(value || "-")}</td>
        </tr>
      `,
    )
    .join("");

const buildQuoteRequestEmailContent = (
  booking: BookingRow,
  product: ProductRow | null,
  userProfile: UserProfileRow | null,
): QuoteRequestEmailContent => {
  const parsedNote = parseBookingRequestNote(booking.request_note);
  const quoteItems = getNormalizedQuoteItems(booking, product);
  const productSummary = formatProductSummary(quoteItems);
  const customerName = parsedNote.customerName || userProfile?.name || "고객";
  const companyName = parsedNote.companyName || userProfile?.company_name || "-";
  const contactPhone = parsedNote.contactPhone || userProfile?.phone || "-";
  const customerEmail =
    parsedNote.customerEmail || userProfile?.email || booking.user_email || "-";
  const siteType = parsedNote.siteType || "-";
  const elevatorLabel = parsedNote.elevatorLabel || "-";
  const extraRequest = parsedNote.extraRequest || "-";
  const adminUrl = `${getAppBaseUrl()}/admin/rental-requests`;
  const subject = `[휴먼파트너] 신규 견적 요청 - ${customerName} / ${productSummary}`;
  const quoteItemTextBlocks = quoteItems.map((item, index) => {
    const title = `${index + 1}. ${item.product_name || item.product_id || "상품"}`;
    const quantityLine = `수량: ${item.product_quantity || 0}개`;
    const optionLines = buildOptionTextLines(item.selected_options);

    return [title, quantityLine, "선택 옵션:", ...optionLines].join("\n");
  });

  const text = [
    "신규 견적 요청이 접수되었습니다.",
    "",
    "[고객 정보]",
    `고객명: ${customerName}`,
    `회사명: ${companyName}`,
    `연락처: ${contactPhone}`,
    `이메일: ${customerEmail}`,
    "",
    "[요청 정보]",
    `상품명: ${productSummary}`,
    `대여기간: ${formatDate(booking.start_date)} ~ ${formatDate(booking.end_date)}`,
    `접수 시각: ${formatDate(booking.created_at)}`,
    "",
    "[요청 상품 목록]",
    quoteItemTextBlocks.join("\n\n"),
    "",
    "[현장 정보]",
    `설치 장소: ${booking.installation_place || "-"}`,
    `현장 유형: ${siteType}`,
    `엘리베이터 여부: ${elevatorLabel}`,
    "",
    "[추가 요청사항]",
    extraRequest,
    "",
    `관리자 확인: ${adminUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
      <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="padding: 24px 28px; background: linear-gradient(135deg, #001E45 0%, #2A8FC2 100%); color: #ffffff;">
          <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px;">Rentalpartner Admin Notification</div>
          <h1 style="margin: 0; font-size: 24px; line-height: 1.4;">신규 견적 요청이 접수되었습니다.</h1>
        </div>
        <div style="padding: 28px;">
          <div style="display: grid; gap: 16px; margin-bottom: 24px;">
            <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 12px;">고객 정보</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${renderInfoTableRows([
                    { label: "고객명", value: customerName, emphasized: true },
                    { label: "회사명", value: companyName },
                    { label: "연락처", value: contactPhone },
                    { label: "이메일", value: customerEmail },
                  ])}
                </tbody>
              </table>
            </div>
            <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 12px;">요청 정보</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${renderInfoTableRows([
                    { label: "상품명", value: productSummary, emphasized: true },
                    {
                      label: "대여기간",
                      value: `${formatDate(booking.start_date)} ~ ${formatDate(booking.end_date)}`,
                    },
                    { label: "접수 시각", value: formatDate(booking.created_at) },
                  ])}
                </tbody>
              </table>
            </div>
          </div>
          <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 12px;">설치 및 현장 정보</div>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                ${renderInfoTableRows([
                  { label: "설치 장소", value: booking.installation_place || "-" },
                  { label: "현장 유형", value: siteType },
                  { label: "엘리베이터 여부", value: elevatorLabel },
                ])}
              </tbody>
            </table>
          </div>
          <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 12px;">요청 상품 목록</div>
            ${renderQuoteItemsHtml(quoteItems)}
          </div>
          <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 12px;">추가 요청사항</div>
            <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #0f172a; white-space: pre-line;">${escapeHtml(extraRequest)}</p>
          </div>
          <a href="${escapeHtml(adminUrl)}" style="display: inline-block; padding: 14px 18px; border-radius: 12px; background: #001E45; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px;">관리자에서 요청 확인하기</a>
        </div>
      </div>
    </div>
  `;

  return {
    subject,
    html,
    text,
  };
};

export const sendEmailVerification = functions.https.onRequest((req, res) => {
  withCors(req, res, async () => {
    if (req.method !== "POST") {
      sendJsonError(res, 405, "Method Not Allowed");
      return;
    }

    const { to, subject, html } = (req.body || {}) as Record<string, unknown>;

    if (!to || !subject || !html) {
      sendJsonError(res, 400, "Missing required fields (to, subject, html)");
      return;
    }

    const { transporter, emailUser, emailFromName } = createTransporter();
    const info = await transporter.sendMail({
      from: `"${emailFromName}" <${emailUser}>`,
      to: String(to),
      subject: String(subject),
      html: String(html),
    });

    console.log("Email sent successfully:", info.response);
    res.status(200).json({ message: "Email sent successfully", info });
  });
});

export const manageQuoteEmailSettings = functions.https.onRequest((req, res) => {
  withCors(req, res, async () => {
    if (req.method !== "GET" && req.method !== "PUT") {
      sendJsonError(res, 405, "Method Not Allowed");
      return;
    }

    try {
      const { decodedToken, profile } = await requireAdminUser(req);

      if (req.method === "GET") {
        const settings = await getQuoteEmailSettings();
        const includeDispatches =
          typeof req.query.includeDispatches === "string" &&
          req.query.includeDispatches === "true";
        const rawLimit =
          typeof req.query.dispatchLimit === "string"
            ? Number.parseInt(req.query.dispatchLimit, 10)
            : 20;
        const dispatchLimit =
          Number.isFinite(rawLimit) && rawLimit > 0
            ? Math.min(rawLimit, 50)
            : 20;

        if (!includeDispatches) {
          res.status(200).json(settings);
          return;
        }

        const dispatches = await getRecentQuoteEmailDispatches(dispatchLimit);
        res.status(200).json({
          ...settings,
          dispatches,
        });
        return;
      }

      const payload = buildQuoteEmailSettingsPayload(
        req.body,
        decodedToken.uid,
        profile.email || decodedToken.email,
      );
      await upsertSiteSetting(
        QUOTE_EMAIL_SETTINGS_KEY,
        JSON.stringify(payload),
      );

      const savedSettings = await getQuoteEmailSettings();
      res.status(200).json(savedSettings);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "관리자 인증에 실패했습니다.";
      const statusCode =
        message === "관리자 권한이 필요합니다." || message === "인증에 실패했습니다."
          ? 403
          : message === "인증 토큰이 없습니다."
            ? 401
            : 500;

      console.error("[QuoteEmailSettings] Failed to handle request:", error);
      sendJsonError(res, statusCode, message);
    }
  });
});

export const sendQuoteRequestNotification = functions.https.onRequest(
  (req, res) => {
    withCors(req, res, async () => {
      if (req.method !== "POST") {
        sendJsonError(res, 405, "Method Not Allowed");
        return;
      }

      const bookingId =
        req.body && typeof req.body.bookingId === "string"
          ? req.body.bookingId.trim()
          : "";

      if (!bookingId) {
        sendJsonError(res, 400, "bookingId is required");
        return;
      }

      try {
        const existingDispatch = await getDispatchRecord(bookingId);
        if (existingDispatch.status === "sent") {
          res.status(200).json({
            success: true,
            skipped: true,
            reason: "already_sent",
          });
          return;
        }

        const settings = await getQuoteEmailSettings();
        if (!settings.enabled) {
          await saveDispatchRecord(bookingId, {
            status: "skipped",
            reason: "disabled",
            bookingId,
          });
          res.status(200).json({
            success: true,
            skipped: true,
            reason: "disabled",
          });
          return;
        }

        const recipients = getActiveRecipientEmails(settings);
        if (recipients.length === 0) {
          await saveDispatchRecord(bookingId, {
            status: "skipped",
            reason: "no_recipients",
            bookingId,
          });
          res.status(200).json({
            success: true,
            skipped: true,
            reason: "no_recipients",
          });
          return;
        }

        const booking = await getBookingById(bookingId);
        if (!booking) {
          sendJsonError(res, 404, "견적 요청 정보를 찾을 수 없습니다.");
          return;
        }

        const [product, userProfile] = await Promise.all([
          getProductById(booking.product_id),
          getUserProfileByFirebaseUid(booking.user_id),
        ]);

        const { transporter, emailUser, emailFromName } = createTransporter();
        const emailContent = buildQuoteRequestEmailContent(
          booking,
          product,
          userProfile,
        );

        const info = await transporter.sendMail({
          from: `"${emailFromName}" <${emailUser}>`,
          to: recipients.join(", "),
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        console.log("Quote request admin email sent:", info.response);

        await saveDispatchRecord(bookingId, {
          status: "sent",
          bookingId,
          userId: booking.user_id,
          recipients,
          productName: product?.name || booking.product_id,
          sentAt: new Date().toISOString(),
        });

        res.status(200).json({ success: true });
      } catch (error) {
        console.error("[QuoteRequestNotification] Failed to send email:", error);

        await saveDispatchRecord(bookingId, {
          status: "failed",
          bookingId,
          errorMessage:
            error instanceof Error ? error.message : "Failed to send quote email",
          failedAt: new Date().toISOString(),
        });

        sendJsonError(
          res,
          500,
          error instanceof Error ? error.message : "Failed to send quote email",
        );
      }
    });
  },
);
