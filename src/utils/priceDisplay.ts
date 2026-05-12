import {
  DEFAULT_PRODUCT_PRICE_DISPLAY_MODE,
  type ProductPriceDisplayMode,
} from "../api/siteSettingsApi";

export const HIDDEN_PRICE_TEXT = "가격문의";
export const PRICE_LOADING_TEXT = "가격 확인 중";
export const INQUIRY_PRICE_TEXT_CLASS = "text-[15px] font-semibold text-rose-600";
export const HIDDEN_PRICE_TEXT_CLASS = "text-rose-600";

const formatNumber = (amount: number) => new Intl.NumberFormat("ko-KR").format(amount);

export const formatKrw = (amount: number, suffix = "원"): string =>
  `${formatNumber(amount)}${suffix}`;

export const isInquiryPriceMode = (
  mode: ProductPriceDisplayMode = DEFAULT_PRODUCT_PRICE_DISPLAY_MODE,
): boolean => mode === "inquiry";

export const isVisiblePriceMode = (
  mode: ProductPriceDisplayMode = DEFAULT_PRODUCT_PRICE_DISPLAY_MODE,
): boolean => mode === "visible";

export const getPublicPriceClassName = ({
  mode = DEFAULT_PRODUCT_PRICE_DISPLAY_MODE,
  loading = false,
  visibleClass,
  hiddenClass = HIDDEN_PRICE_TEXT_CLASS,
}: {
  mode?: ProductPriceDisplayMode;
  loading?: boolean;
  visibleClass: string;
  hiddenClass?: string;
}): string =>
  !loading && isInquiryPriceMode(mode) ? hiddenClass : visibleClass;

export const getPublicPriceText = ({
  amount,
  mode = DEFAULT_PRODUCT_PRICE_DISPLAY_MODE,
  loading = false,
  suffix = "원",
  hiddenText = HIDDEN_PRICE_TEXT,
  zeroAsHidden = false,
}: {
  amount?: number | null;
  mode?: ProductPriceDisplayMode;
  loading?: boolean;
  suffix?: string;
  hiddenText?: string;
  zeroAsHidden?: boolean;
}): string => {
  if (loading) return PRICE_LOADING_TEXT;
  if (isInquiryPriceMode(mode)) return hiddenText;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return hiddenText;
  if (zeroAsHidden && amount <= 0) return hiddenText;
  return `${formatNumber(amount)}${suffix}`;
};
