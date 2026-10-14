import { isSafeSceneImageUrl } from './installationScenes';

/** 개별 상품 상세페이지의 납품·설치 사례 사진. 패키지의 installation_scenes 와는 별개다. */
export interface InstallationCase {
    id: string;
    image_url: string;
    caption: string;
}

export const MAX_INSTALLATION_CASES = 6;
const MAX_CAPTION = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
const isId = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && value.length <= 128 && value === value.trim();

/** Tolerant read for legacy/malformed rows. */
export const normalizeInstallationCases = (value: unknown): InstallationCase[] => {
    if (!Array.isArray(value)) return [];
    const ids = new Set<string>();
    const cases: InstallationCase[] = [];
    for (const item of value) {
        if (!isRecord(item) || !isId(item.id) || ids.has(item.id) || !isSafeSceneImageUrl(item.image_url)) continue;
        ids.add(item.id);
        cases.push({
            id: item.id,
            image_url: item.image_url,
            caption: typeof item.caption === 'string' ? item.caption.slice(0, MAX_CAPTION) : '',
        });
        if (cases.length >= MAX_INSTALLATION_CASES) break;
    }
    return cases;
};

/** Strict write validation so an administrator's edits are never silently dropped. */
export const getInstallationCasesValidationError = (value: unknown): string | null => {
    if (!Array.isArray(value)) return '이미지 형식을 확인해주세요.';
    if (value.length > MAX_INSTALLATION_CASES) return `이미지는 최대 ${MAX_INSTALLATION_CASES}장까지 등록할 수 있습니다.`;
    const ids = new Set<string>();
    for (const [index, item] of value.entries()) {
        const label = `${index + 1}번째 이미지`;
        if (!isRecord(item) || !isId(item.id) || ids.has(item.id)) return `${label} 정보를 다시 확인해주세요.`;
        ids.add(item.id);
        if (!isSafeSceneImageUrl(item.image_url)) return `${label}의 이미지 주소를 확인해주세요.`;
        if (typeof item.caption !== 'string' || item.caption.length > MAX_CAPTION) return `${label} 설명은 ${MAX_CAPTION}자 이내로 입력해주세요.`;
    }
    return null;
};

export const isMissingInstallationCasesError = (error: unknown): boolean => {
    if (!isRecord(error) && !(error instanceof Error)) return false;
    const message = String(error.message || '');
    const code = 'code' in error ? error.code : undefined;
    return message.includes('installation_cases') &&
        (code === '42703' || code === 'PGRST204' || /column|schema cache/i.test(message));
};
