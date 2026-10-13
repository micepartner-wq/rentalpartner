export type InstallationInclusion = 'included' | 'optional' | 'reference';

export interface InstallationHotspot {
    id: string;
    product_id: string;
    /** Position in the uncropped image, expressed as a percentage. */
    x: number;
    y: number;
    inclusion: InstallationInclusion;
}

export interface InstallationScene {
    id: string;
    image_url: string;
    caption: string;
    hotspots: InstallationHotspot[];
}

export const MAX_INSTALLATION_SCENES = 12;
export const MAX_INSTALLATION_HOTSPOTS = 30;

export const INSTALLATION_INCLUSION_LABELS: Record<InstallationInclusion, string> = {
    included: '기본 포함',
    optional: '추가 선택',
    reference: '연출 참고 · 별도 확인',
};

export const isSafeSceneImageUrl = (value: unknown): value is string => {
    if (typeof value !== 'string' || !value.trim() || value !== value.trim() || /[\\\s]/.test(value)) return false;
    if (value.startsWith('/') && !value.startsWith('//')) return true;
    try {
        const url = new URL(value);
        return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
    } catch {
        return false;
    }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
const isId = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && value.length <= 128 && value === value.trim();
const isCoordinate = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const isInclusion = (value: unknown): value is InstallationInclusion =>
    value === 'included' || value === 'optional' || value === 'reference';
const isHotspot = (value: unknown): value is InstallationHotspot =>
    isRecord(value) && isId(value.id) && isId(value.product_id) &&
    isCoordinate(value.x) && isCoordinate(value.y) && isInclusion(value.inclusion);

/** Tolerant read for legacy/malformed rows; never infer which products are included. */
export const normalizeInstallationScenes = (value: unknown): InstallationScene[] => {
    if (!Array.isArray(value)) return [];
    const ids = new Set<string>();
    return value.filter((scene) => {
        if (!isRecord(scene) || !isId(scene.id) || ids.has(scene.id) || !isSafeSceneImageUrl(scene.image_url)) return false;
        ids.add(scene.id);
        return true;
    }).slice(0, MAX_INSTALLATION_SCENES).map((scene) => {
        const hotspotIds = new Set<string>();
        const hotspots = (Array.isArray(scene.hotspots) ? scene.hotspots : []).filter((hotspot) => {
            if (!isHotspot(hotspot) || hotspotIds.has(hotspot.id)) return false;
            hotspotIds.add(hotspot.id);
            return true;
        }).slice(0, MAX_INSTALLATION_HOTSPOTS).map((hotspot) => ({
            id: hotspot.id, product_id: hotspot.product_id,
            x: hotspot.x, y: hotspot.y, inclusion: hotspot.inclusion,
        }));
        return { id: scene.id, image_url: scene.image_url, caption: typeof scene.caption === 'string' ? scene.caption.slice(0, 200) : '', hotspots };
    });
};

/** Strict write validation avoids silently discarding an administrator's edits. */
export const getInstallationScenesValidationError = (value: unknown): string | null => {
    if (!Array.isArray(value)) return '설치사진 형식을 확인해주세요.';
    if (value.length > MAX_INSTALLATION_SCENES) return '설치사진은 최대 12장까지 등록할 수 있습니다.';
    const ids = new Set<string>();
    for (const [index, scene] of value.entries()) {
        const label = (index + 1) + '번째 설치사진';
        if (!isRecord(scene) || !isId(scene.id) || ids.has(scene.id)) return label + ' 정보를 다시 확인해주세요.';
        ids.add(scene.id);
        if (!isSafeSceneImageUrl(scene.image_url)) return label + '의 이미지 주소를 확인해주세요.';
        if (typeof scene.caption !== 'string' || scene.caption.length > 200) return label + ' 설명은 200자 이내로 입력해주세요.';
        if (!Array.isArray(scene.hotspots) || scene.hotspots.length > MAX_INSTALLATION_HOTSPOTS) return label + '의 상품 태그는 최대 30개까지 등록할 수 있습니다.';
        const hotspotIds = new Set<string>();
        for (const hotspot of scene.hotspots) {
            if (!isHotspot(hotspot) || hotspotIds.has(hotspot.id)) return label + '의 상품 태그, 위치 및 포함 여부를 확인해주세요.';
            hotspotIds.add(hotspot.id);
        }
    }
    return null;
};

export const isMissingInstallationScenesError = (error: unknown): boolean => {
    if (!isRecord(error) && !(error instanceof Error)) return false;
    const message = String(error.message || '');
    const code = 'code' in error ? error.code : undefined;
    return message.includes('installation_scenes') &&
        (code === '42703' || code === 'PGRST204' || /column|schema cache/i.test(message));
};
