// 모바일 하단 상담 바를 숨기는 화면: 이미 하단에 고정된 요소(견적 요약 바, 작성 버튼 등)가 있거나 상담 바가 필요 없는 화면이다.
// 이 화면들에서는 기존 플로팅 버튼 메뉴가 그대로 보인다.
const PRODUCT_ID_PATH = /^\/products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/i;
const HIDDEN_PATHS: RegExp[] = [
  /^\/quote-(cart|request)(\/|$)/,
  /^\/(login|signup|blank|install)(\/|$)/,
  /^\/review\/(new|[^/]+\/edit)(\/|$)/,
  /^\/p\//,
  PRODUCT_ID_PATH,
];

export const isConsultBarRoute = (pathname: string): boolean =>
  !HIDDEN_PATHS.some((pattern) => pattern.test(pathname));

/** 전화번호에서 숫자만 남겨 tel: 링크에 쓴다. */
export const toTelHref = (phone: string): string => `tel:${phone.replace(/[^0-9+]/g, '')}`;
