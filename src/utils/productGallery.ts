import { isSafeSceneImageUrl } from './installationScenes';

/** 대표 이미지(image_url) 뒤에 이어 붙는 추가 이미지 수. 슬라이드는 대표 + 추가 이미지로 구성된다. */
export const MAX_GALLERY_IMAGES = 7;

/** Tolerant read for legacy/malformed rows. */
export const normalizeGalleryImages = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const item of value) {
        if (!isSafeSceneImageUrl(item) || seen.has(item)) continue;
        seen.add(item);
        urls.push(item);
        if (urls.length >= MAX_GALLERY_IMAGES) break;
    }
    return urls;
};

/** 상세 상단 슬라이드에 보여 줄 전체 이미지: 대표 이미지를 맨 앞에 두고 추가 이미지를 잇는다. */
export const getProductSlideImages = (primary: string | undefined, gallery: unknown): string[] => {
    const urls = normalizeGalleryImages(gallery).filter(url => url !== primary);
    return primary && isSafeSceneImageUrl(primary) ? [primary, ...urls] : urls;
};

export const getGalleryImagesValidationError = (value: unknown): string | null => {
    if (!Array.isArray(value)) return '추가 이미지 형식을 확인해주세요.';
    if (value.length > MAX_GALLERY_IMAGES) return `추가 이미지는 최대 ${MAX_GALLERY_IMAGES}장까지 등록할 수 있습니다.`;
    for (const [index, item] of value.entries()) {
        if (!isSafeSceneImageUrl(item)) return `${index + 1}번째 추가 이미지 주소를 확인해주세요.`;
    }
    return null;
};

export const isMissingGalleryImagesError = (error: unknown): boolean => {
    if (typeof error !== 'object' || error === null) return false;
    const message = String((error as { message?: unknown }).message || '');
    const code = (error as { code?: unknown }).code;
    return message.includes('gallery_images') &&
        (code === '42703' || code === 'PGRST204' || /column|schema cache/i.test(message));
};
