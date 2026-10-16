export interface InstallationHotspot {
    id: string;
    product_id: string;
    /** Position in the uncropped image, expressed as a percentage. */
    x: number;
    y: number;
}

export interface InstallationScene {
    id: string;
    image_url: string;
    caption: string;
    hotspots: InstallationHotspot[];
}

export const MAX_INSTALLATION_SCENES = 12;
export const MAX_INSTALLATION_HOTSPOTS = 30;

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
const isHotspot = (value: unknown): value is InstallationHotspot =>
    isRecord(value) && isId(value.id) && isId(value.product_id) &&
    isCoordinate(value.x) && isCoordinate(value.y);

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
            x: hotspot.x, y: hotspot.y,
        }));
        return { id: scene.id, image_url: scene.image_url, caption: typeof scene.caption === 'string' ? scene.caption.slice(0, 200) : '', hotspots };
    });
};

/**
 * 사진에 태그한 상품과 기본 수량. 수량은 한 사진 안의 같은 상품 태그 개수이고,
 * 여러 사진에 나오면 사진별 개수 중 최댓값을 쓴다(같은 장비를 여러 각도로 찍어도 부풀지 않게).
 */
export const getTaggedProductQuantities = (scenes: InstallationScene[]): Array<{ product_id: string; quantity: number }> => {
    const result = new Map<string, number>();
    for (const scene of scenes) {
        const counts = new Map<string, number>();
        for (const hotspot of scene.hotspots) counts.set(hotspot.product_id, (counts.get(hotspot.product_id) || 0) + 1);
        for (const [productId, count] of counts) result.set(productId, Math.max(result.get(productId) || 0, count));
    }
    return [...result].map(([product_id, quantity]) => ({ product_id, quantity }));
};

type NamedQuantity = { name: string; quantity: number };
type NamedProduct = { id?: string; name: string };

/**
 * 태그를 바꿀 때 구성품 목록을 따라 맞춘다.
 * - 새로 태그한 상품은 구성품에 추가한다(이미 있으면 그대로, 새 항목의 수량은 태그 개수).
 * - 마지막 태그를 지운 상품은 구성품에서도 뺀다.
 * - 그 밖의 항목과 수량은 건드리지 않는다.
 */
export const applyTagChangesToComponents = <T extends NamedQuantity>(
    current: T[],
    before: InstallationScene[],
    after: InstallationScene[],
    products: NamedProduct[],
): T[] => {
    const idsOf = (scenes: InstallationScene[]) => new Set(scenes.flatMap((scene) => scene.hotspots.map((hotspot) => hotspot.product_id)));
    const beforeIds = idsOf(before);
    const afterIds = idsOf(after);
    const quantities = new Map(getTaggedProductQuantities(after).map((item) => [item.product_id, item.quantity]));
    const nameOf = (id: string) => products.find((product) => product.id === id)?.name;
    let next = [...current];
    for (const id of beforeIds) {
        const name = nameOf(id);
        if (!afterIds.has(id) && name) next = next.filter((item) => item.name !== name);
    }
    for (const id of afterIds) {
        const name = nameOf(id);
        if (!beforeIds.has(id) && name && !next.some((item) => item.name === name)) next.push({ name, quantity: quantities.get(id) || 1 } as T);
    }
    return next;
};

/** 덮어쓰기: 구성품을 사진에 태그한 상품 전체로 바꾼다. 같은 이름의 기존 항목은 수량(과 부가 정보)을 유지한다. */
export const buildComponentsFromScenes = <T extends NamedQuantity>(
    current: T[],
    scenes: InstallationScene[],
    products: NamedProduct[],
): { components: T[]; missing: number } => {
    const components: T[] = [];
    let missing = 0;
    for (const { product_id, quantity } of getTaggedProductQuantities(scenes)) {
        const product = products.find((candidate) => candidate.id === product_id);
        if (!product) { missing += 1; continue; }
        if (components.some((item) => item.name === product.name)) continue;
        components.push(current.find((item) => item.name === product.name) ?? ({ name: product.name, quantity } as T));
    }
    return { components, missing };
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
            if (!isHotspot(hotspot) || hotspotIds.has(hotspot.id)) return label + '의 상품 태그와 위치를 확인해주세요.';
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
