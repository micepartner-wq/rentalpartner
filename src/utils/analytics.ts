import type { Analytics } from "firebase/analytics";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { app } from "../firebase";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;

let analyticsPromise: Promise<Analytics | null> | null = null;

const hasMeasurementId = () =>
  Boolean(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim());

const sanitizeParams = (params: AnalyticsParams = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  );

const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (typeof window === "undefined" || !hasMeasurementId()) {
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch(() => null);
  }

  return analyticsPromise;
};

export const logAnalyticsEvent = (
  eventName: string,
  params: AnalyticsParams = {},
) => {
  void getAnalyticsInstance().then((analytics) => {
    if (!analytics) return;
    logEvent(analytics, eventName, sanitizeParams(params));
  });
};

export const trackPageView = (pagePath: string) => {
  logAnalyticsEvent("page_view", {
    page_location: typeof window !== "undefined" ? window.location.href : pagePath,
    page_path: pagePath,
    page_title: typeof document !== "undefined" ? document.title : undefined,
  });
};

export const trackProductDetailView = (params: {
  productId: string;
  productName: string;
  category?: string;
  value?: number;
}) => {
  logAnalyticsEvent("product_detail_view", {
    product_id: params.productId,
    product_name: params.productName,
    product_category: params.category,
    value: params.value,
  });
};

export const trackQuoteRequestStart = (params: {
  source: "product_detail" | "quote_cart";
  productId?: string;
  productName?: string;
  itemCount?: number;
  value?: number;
}) => {
  logAnalyticsEvent("quote_request_start", {
    source: params.source,
    product_id: params.productId,
    product_name: params.productName,
    item_count: params.itemCount,
    value: params.value,
  });
};

export const trackQuoteRequestComplete = (params: {
  source: "product_detail" | "quote_cart";
  productId?: string;
  productName?: string;
  itemCount?: number;
  successCount?: number;
  value?: number;
}) => {
  logAnalyticsEvent("quote_request_complete", {
    source: params.source,
    product_id: params.productId,
    product_name: params.productName,
    item_count: params.itemCount,
    success_count: params.successCount,
    value: params.value,
  });
};

export const trackInquiryComplete = (params: {
  category?: string;
  titleLength?: number;
}) => {
  logAnalyticsEvent("inquiry_complete", {
    inquiry_category: params.category,
    title_length: params.titleLength,
  });
};

export const trackException = (
  description: string,
  fatal = false,
  context?: string,
) => {
  logAnalyticsEvent("exception", {
    description: context ? `${context}: ${description}` : description,
    fatal,
  });
};

export const trackOperationFailure = (params: {
  operation: string;
  message: string;
  source?: string;
  productId?: string;
  itemCount?: number;
}) => {
  trackException(params.message, false, params.operation);
  logAnalyticsEvent("operation_failure", {
    operation: params.operation,
    source: params.source,
    product_id: params.productId,
    item_count: params.itemCount,
    message: params.message,
  });
};
