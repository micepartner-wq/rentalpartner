import type { Product } from '../api/productApi';

export type QualityKind = 'general' | 'package';
export type QualitySeverity = 'required' | 'recommended';

export interface QualityIssue {
  key: string;
  label: string;
  /** 무엇을 채우면 되는지 */
  hint: string;
  severity: QualitySeverity;
  /** 이 항목이 비어 있을 때 깎이는 점수 */
  weight: number;
}

export interface ProductQuality {
  product: Product;
  kind: QualityKind;
  issues: QualityIssue[];
  /** 100점 만점. 필수·권장 항목을 모두 채우면 100점. */
  score: number;
  hasRequiredIssue: boolean;
}

const DETAIL_TEXT_MIN_LENGTH = 30;

const stripHtml = (html?: string | null) =>
  (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const isEmptyList = (value: unknown) => !Array.isArray(value) || value.length === 0;

/** 상품 한 개의 정보가 얼마나 채워져 있는지 점검한다(고객에게 보이는 정보 기준). */
export const evaluateProductQuality = (product: Product): ProductQuality => {
  const kind: QualityKind = product.catalog_type === 'package' ? 'package' : 'general';
  const issues: QualityIssue[] = [];
  const add = (issue: QualityIssue) => issues.push(issue);

  if (!product.image_url) {
    add({ key: 'image', label: '대표 이미지 없음', hint: '상품 목록과 상세 맨 위에 보이는 대표 이미지를 올려주세요.', severity: 'required', weight: 25 });
  }
  if (!stripHtml(product.short_description)) {
    add({ key: 'summary', label: '한 줄 소개 없음', hint: '상품 목록과 상세 제목 아래에 보이는 소개 문장을 적어주세요. 비우면 모든 상품에 같은 기본 문구가 나옵니다.', severity: 'required', weight: 20 });
  }

  if (kind === 'general') {
    const detailText = stripHtml(product.description);
    const hasDetailImage = /<img\b/i.test(product.description || '');
    if (detailText.length === 0 && !hasDetailImage) {
      add({ key: 'detail', label: '상세 설명 없음', hint: '상세 설명이 비어 있으면 "상세정보를 준비중입니다"가 보입니다. 글이나 이미지를 넣어주세요.', severity: 'required', weight: 20 });
    } else if (detailText.length < DETAIL_TEXT_MIN_LENGTH) {
      add({ key: 'detailText', label: '상세 설명에 글이 없음', hint: '이미지만 있으면 검색에 잘 잡히지 않아요. 규격·색상·재질·구성 같은 핵심 정보를 글로도 적어주세요.', severity: 'recommended', weight: 15 });
    }
    if (isEmptyList(product.gallery_images)) {
      add({ key: 'gallery', label: '추가 이미지 없음', hint: '여러 각도의 이미지를 추가하면 대표 이미지에서 넘겨 볼 수 있어요.', severity: 'recommended', weight: 8 });
    }
    if (isEmptyList(product.installation_cases)) {
      add({ key: 'topImages', label: '상세 상단 이미지 없음', hint: '상품이 쓰인 공간 이미지를 넣으면 이 상품이 들어간 패키지로 연결됩니다.', severity: 'recommended', weight: 6 });
    }
  } else {
    if (isEmptyList(product.installation_scenes)) {
      add({ key: 'scenes', label: '설치사진 없음', hint: '패키지 상세에서 사진 속 상품 태그(+)를 보여주는 설치사진을 올려주세요.', severity: 'required', weight: 25 });
    }
    if (isEmptyList(product.basic_components)) {
      add({ key: 'components', label: '구성품 없음', hint: '패키지에 들어가는 기본 구성품을 등록해주세요.', severity: 'required', weight: 20 });
    }
  }

  if (!product.category_id) {
    add({ key: 'category', label: '카테고리 연결 없음', hint: '카테고리를 다시 선택해 저장하면 이름이 바뀌어도 연결이 유지됩니다.', severity: 'recommended', weight: kind === 'general' ? 6 : 10 });
  }

  const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + issue.weight, 0));
  return { product, kind, issues, score, hasRequiredIssue: issues.some((issue) => issue.severity === 'required') };
};

export interface QualitySummary {
  total: number;
  complete: number;
  needsRequired: number;
  averageScore: number;
  /** 항목(key)별로 몇 개 상품이 비어 있는지 */
  issueCounts: Record<string, { label: string; count: number }>;
}

export const summarizeQuality = (items: ProductQuality[]): QualitySummary => {
  const issueCounts: QualitySummary['issueCounts'] = {};
  items.forEach((item) => item.issues.forEach((issue) => {
    issueCounts[issue.key] ??= { label: issue.label, count: 0 };
    issueCounts[issue.key].count += 1;
  }));
  return {
    total: items.length,
    complete: items.filter((item) => item.issues.length === 0).length,
    needsRequired: items.filter((item) => item.hasRequiredIssue).length,
    averageScore: items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0,
    issueCounts,
  };
};
