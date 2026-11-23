import { useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '../../src/api/productApi';
import { uploadImage } from '../../src/api/storageApi';
import { isSafeSceneImageUrl, MAX_INSTALLATION_SCENES, MAX_INSTALLATION_HOTSPOTS, type InstallationScene, type InstallationHotspot } from '../../src/utils/installationScenes';
import './PackageInstallationEditor.css';

interface Props {
    value: InstallationScene[];
    onChange: (scenes: InstallationScene[]) => void;
    products: Product[];
    onBusyChange?: (busy: boolean) => void;
    representativeImageUrl?: string;
}
type Point = { x: number; y: number };
const MAX_SCENES = MAX_INSTALLATION_SCENES;
const MAX_TAGS = MAX_INSTALLATION_HOTSPOTS;
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n * 100) / 100));
// LAN HTTP origins lack randomUUID, but getRandomValues remains available.
const createId = (): string => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
};

export default function PackageInstallationEditor({ value, onChange, products, onBusyChange, representativeImageUrl }: Props) {
    const [sceneId, setSceneId] = useState(value[0]?.id || '');
    const [tagId, setTagId] = useState('');
    const [draft, setDraft] = useState<Point | null>(null);
    const [query, setQuery] = useState('');
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [failedImage, setFailedImage] = useState('');
    const alive = useRef(true);
    const busyRef = useRef(false);
    const current = useRef({ value, onChange, onBusyChange });
    current.current = { value, onChange, onBusyChange };
    useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; current.current.onBusyChange?.(false); };
    }, []);
    useEffect(() => { current.current.onBusyChange?.(busy || Boolean(draft)); }, [busy, draft]);
    const scene = value.find(item => item.id === sceneId) || value[0];
    const tag = scene?.hotspots.find(item => item.id === tagId);
    const point = tag || draft;
    const eligible = useMemo(() => products.filter(product => product.id && product.catalog_type !== 'package'), [products]);
    const results = useMemo(() => {
        const keyword = query.trim().toLocaleLowerCase();
        return eligible.filter(product => !keyword || [product.name, product.product_code, product.category].some(text => text?.toLocaleLowerCase().includes(keyword))).slice(0, 40);
    }, [eligible, query]);
    const linked = tag && eligible.find(product => product.id === tag.product_id);
    const resetSelection = () => { setTagId(''); setDraft(null); setQuery(''); };
    const updateScene = (next: InstallationScene) => onChange(value.map(item => item.id === next.id ? next : item));
    const updateTag = (patch: Partial<InstallationHotspot>) => {
        if (scene && tag) updateScene({ ...scene, hotspots: scene.hotspots.map(item => item.id === tag.id ? { ...item, ...patch } : item) });
    };
    const appendImage = (imageUrl: string) => {
        const latest = current.current;
        if (latest.value.length >= MAX_SCENES) throw new Error('설치사진은 최대 12장까지 등록할 수 있습니다.');
        const next = { id: createId(), image_url: imageUrl, caption: '', hotspots: [] };
        latest.onChange([...latest.value, next]);
        setSceneId(next.id); resetSelection(); setMessage('사진을 등록했습니다. 사진 속 상품 위치를 클릭해 주세요.');
    };
    const upload = async (file?: File) => {
        if (!file || busyRef.current) return;
        setMessage('');
        const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
        if (!extensions[file.type] || file.size > 10 * 1024 * 1024 || !file.size) {
            setMessage('10MB 이하의 JPG, PNG, WebP 파일을 선택해 주세요. SVG는 사용할 수 없습니다.'); return;
        }
        busyRef.current = true; setBusy(true); current.current.onBusyChange?.(true);
        try {
            const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
            const valid = file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
                : file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)
                : String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
            if (!valid) throw new Error('파일 내용과 이미지 형식이 일치하지 않습니다.');
            if (!alive.current) return;
            const safeFile = new File([file], 'installation.' + extensions[file.type], { type: file.type });
            const imageUrl = await uploadImage(safeFile, 'package-installations');
            if (alive.current) appendImage(imageUrl);
        } catch (error) {
            if (alive.current) setMessage(error instanceof Error ? error.message : '사진 업로드에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            busyRef.current = false;
            if (alive.current) { setBusy(false); }
        }
    };
    const chooseProduct = (product: Product) => {
        if (!scene || !product.id) return;
        if (tag) updateTag({ product_id: product.id });
        else if (draft && scene.hotspots.length < MAX_TAGS) {
            const next: InstallationHotspot = { id: createId(), product_id: product.id, ...draft };
            updateScene({ ...scene, hotspots: [...scene.hotspots, next] }); setTagId(next.id); setDraft(null);
        }
        setQuery(''); setMessage('상품을 연결했습니다. 패키지 구성품에도 자동으로 추가됩니다.');
    };
    const startDraft = (point: Point) => {
        if (!scene || scene.hotspots.length >= MAX_TAGS) { setMessage('사진 한 장에 상품 태그를 최대 30개까지 등록할 수 있습니다.'); return; }
        setTagId(''); setDraft(point); setQuery(''); setMessage('연결할 상품을 선택하면 태그가 추가됩니다.');
    };

    return <section className="package-scene-editor" aria-label="설치사진과 상품 태그 편집">
        <div className="pse-heading"><div><h3>설치사진 · 상품 태그</h3><p>사진 속 위치에 기존 상품을 연결하세요. 포함 여부는 직접 선택해 주세요.</p></div><span>{value.length} / {MAX_SCENES}장</span></div>
        <div className="pse-upload">
            {representativeImageUrl && isSafeSceneImageUrl(representativeImageUrl) && <button type="button" disabled={busy || value.length >= MAX_SCENES} onClick={() => { try { appendImage(representativeImageUrl); } catch (error) { setMessage((error as Error).message); } }}>대표 이미지 가져오기</button>}
            <label>설치사진 업로드<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || value.length >= MAX_SCENES} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label>
            <small>JPG · PNG · WebP / 최대 10MB. 사진 교체는 삭제 후 새로 등록해 주세요.</small>
            <div className="pse-url"><label>또는 이미지 주소<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" disabled={busy} /></label><button type="button" disabled={busy || value.length >= MAX_SCENES || !url.trim()} onClick={() => {
                if (!isSafeSceneImageUrl(url.trim())) { setMessage('사용 가능한 이미지 주소를 입력해 주세요.'); return; }
                try { appendImage(url.trim()); setUrl(''); } catch (error) { setMessage((error as Error).message); }
            }}>주소로 추가</button></div>
        </div>
        <p role="status" aria-live="polite" className="pse-status">{busy ? '사진을 업로드하는 중입니다. 완료 후 상품을 저장해 주세요.' : message}</p>
        {value.length > 0 && <div className="pse-scenes" aria-label="등록한 설치사진">{value.map((item, index) => <button type="button" key={item.id} aria-pressed={scene?.id === item.id} disabled={busy} onClick={() => { setSceneId(item.id); resetSelection(); setMessage(''); }}>사진 {index + 1}<small>{item.hotspots.length}개 상품</small></button>)}</div>}
        {scene ? <fieldset disabled={busy} className="pse-fieldset">
            <div className="pse-caption"><label>사진 설명<input value={scene.caption} maxLength={200} onChange={e => updateScene({ ...scene, caption: e.target.value })} placeholder="예: 30인 세미나 설치 사례" /></label><button type="button" className="pse-delete" onClick={() => {
                if (!window.confirm('이 사진과 연결된 상품 태그를 삭제할까요?')) return;
                onChange(value.filter(item => item.id !== scene.id)); resetSelection();
            }}>사진 삭제</button></div>
            <div className="pse-layout">
                <div>
                    <div className="pse-photo">
                        <img src={isSafeSceneImageUrl(scene.image_url) ? scene.image_url : undefined} alt={scene.caption || '상품 위치를 지정할 설치사진'} draggable={false}
                            onError={() => setFailedImage(scene.id)} onLoad={() => setFailedImage('')}
                            onClick={e => {
                                if (failedImage === scene.id || busy) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (rect.width && rect.height) startDraft({ x: clamp((e.clientX - rect.left) / rect.width * 100), y: clamp((e.clientY - rect.top) / rect.height * 100) });
                            }} />
                        {failedImage !== scene.id && scene.hotspots.map((item, index) => <button type="button" className="pse-marker" key={item.id} style={{ left: item.x + '%', top: item.y + '%' }} aria-label={(index + 1) + '번 상품 태그 편집'} aria-pressed={tag?.id === item.id} onClick={() => { setTagId(item.id); setDraft(null); setQuery(''); }}>{index + 1}</button>)}
                        {draft && <span className="pse-marker pse-draft" style={{ left: draft.x + '%', top: draft.y + '%' }}>+</span>}
                    </div>
                    {failedImage === scene.id ? <p role="alert">사진을 불러오지 못했습니다. 주소를 확인하고 사진을 다시 등록해 주세요.</p> : <p className="pse-hint">사진 속 상품을 클릭하거나 아래 버튼으로 태그 위치를 지정하세요.</p>}
                    <button type="button" disabled={failedImage === scene.id || scene.hotspots.length >= MAX_TAGS} onClick={() => startDraft({ x: 50, y: 50 })}>중앙에 상품 태그 추가</button>
                    <div className="pse-tag-list">{scene.hotspots.map((item, index) => <button key={item.id} type="button" aria-pressed={tag?.id === item.id} onClick={() => { setTagId(item.id); setDraft(null); setQuery(''); }}><span>{index + 1}. {eligible.find(product => product.id === item.product_id)?.name || '연결 상품 확인 필요'}</span></button>)}</div>
                </div>
                <div className="pse-panel">
                    {point ? <>
                        <h4>{tag ? '상품 태그 편집' : '새 상품 연결'}</h4>
                        {tag && <><p className="pse-linked">{linked?.name || '연결 상품이 삭제되었거나 목록에 없습니다. 다른 상품을 선택하거나 태그를 삭제해 주세요.'}</p>
                        <small>태그한 상품은 패키지 구성품에 자동으로 들어갑니다. 구성에서 빼려면 이 태그를 삭제하세요.</small></>}
                        <div className="pse-coordinates">{(['x', 'y'] as const).map(axis => <label key={axis}>{axis === 'x' ? '가로 위치 (%)' : '세로 위치 (%)'}<input type="number" min={0} max={100} step={0.1} value={point[axis]} onChange={e => {
                            const n = e.target.valueAsNumber; if (!Number.isFinite(n)) return;
                            if (tag) updateTag({ [axis]: clamp(n) }); else setDraft({ ...point, [axis]: clamp(n) });
                        }} /></label>)}</div>
                        <label>{tag ? '연결 상품 변경' : '연결할 상품 검색'}<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="상품명 또는 상품 코드" /></label>
                        <div className="pse-results" aria-label="연결 가능한 상품">{results.map(product => <button type="button" key={product.id} onClick={() => chooseProduct(product)}><span>{product.name}</span>{product.product_code && <small>{product.product_code}</small>}</button>)}{results.length === 0 && <p>검색된 상품이 없습니다.</p>}</div>
                        {results.length === 40 && <small>최대 40개를 표시합니다. 검색어를 입력해 범위를 좁혀 주세요.</small>}
                        <button type="button" className="pse-delete" onClick={() => { if (tag) updateScene({ ...scene, hotspots: scene.hotspots.filter(item => item.id !== tag.id) }); resetSelection(); }}>{tag ? '이 태그 삭제' : '태그 추가 취소'}</button>
                        {draft && <small>상품을 선택하거나 태그 추가를 취소한 후 저장할 수 있습니다.</small>}
                    </> : <p>사진에서 위치를 지정하거나 등록한 태그를 선택해 주세요.</p>}
                </div>
            </div>
        </fieldset> : <div className="pse-empty">설치사진을 등록하면 사진 속 상품을 연결할 수 있습니다.</div>}
    </section>;
}
