import { parseGnbContent } from './gnbContent';
import {
    getInstallationScenesValidationError,
    normalizeInstallationScenes,
    type InstallationScene,
} from './installationScenes';

/** 설치후기 사진 한 장: 사진 주소, 설명, 사진 위 상품 태그(+). 패키지 설치사진과 같은 구조를 쓴다. */
export type ReviewPhoto = InstallationScene;

export const MAX_REVIEW_PHOTOS = 10;

/** Tolerant read for legacy/malformed rows. */
export const normalizeReviewPhotos = (value: unknown): ReviewPhoto[] =>
    normalizeInstallationScenes(value).slice(0, MAX_REVIEW_PHOTOS);

/** Strict write validation so an administrator's edits are never silently dropped. */
export const getReviewPhotosValidationError = (value: unknown): string | null => {
    if (Array.isArray(value) && value.length > MAX_REVIEW_PHOTOS) return `사진은 최대 ${MAX_REVIEW_PHOTOS}장까지 등록할 수 있습니다.`;
    const error = getInstallationScenesValidationError(value);
    return error ? error.replace(/설치사진/g, '사진') : null;
};

export const isMissingReviewImagesError = (error: unknown): boolean => {
    if (typeof error !== 'object' || error === null) return false;
    const message = String((error as { message?: unknown }).message || '');
    const code = (error as { code?: unknown }).code;
    return /'images'|\bimages\b/.test(message) && (code === '42703' || code === 'PGRST204' || /column|schema cache/i.test(message));
};

/** 태그된 상품 ID(중복 제거, 사진·태그 순서대로). */
export const getReviewTaggedProductIds = (photos: ReviewPhoto[]): string[] =>
    [...new Set(photos.flatMap((photo) => photo.hotspots.map((hotspot) => hotspot.product_id)))];

/**
 * 예전 글(본문에 [[image:주소]] 가 섞인 형식)을 새 구조로 나눈다.
 * 사진은 본문에 나온 순서대로, 글은 사진을 뺀 나머지를 문단 단위로 이어 붙인다.
 */
export const splitLegacyContent = (content?: string): { urls: string[]; text: string } => {
    const blocks = parseGnbContent(content);
    return {
        urls: blocks.filter((block) => block.type === 'image').map((block) => block.value),
        text: blocks.filter((block) => block.type === 'text').map((block) => block.value).join('\n\n'),
    };
};
