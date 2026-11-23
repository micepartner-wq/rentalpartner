import { useEffect, useRef, useState } from 'react';
import { uploadImage } from '../../src/api/storageApi';
import { isSafeSceneImageUrl } from '../../src/utils/installationScenes';
import { MAX_INSTALLATION_CASES, type InstallationCase } from '../../src/utils/installationCases';

interface Props {
    value: InstallationCase[];
    onChange: (cases: InstallationCase[]) => void;
    onBusyChange?: (busy: boolean) => void;
}

// LAN HTTP origins lack randomUUID, but getRandomValues remains available.
const createId = (): string => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export default function InstallationCasesEditor({ value, onChange, onBusyChange }: Props) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const alive = useRef(true);
    const current = useRef({ value, onChange, onBusyChange });
    current.current = { value, onChange, onBusyChange };
    useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; current.current.onBusyChange?.(false); };
    }, []);

    const upload = async (file?: File) => {
        if (!file || busy) return;
        setMessage('');
        if (!EXTENSIONS[file.type] || file.size > 10 * 1024 * 1024 || !file.size) {
            setMessage('10MB 이하의 JPG, PNG, WebP 파일을 선택해 주세요. SVG는 사용할 수 없습니다.');
            return;
        }
        if (current.current.value.length >= MAX_INSTALLATION_CASES) {
            setMessage(`이미지는 최대 ${MAX_INSTALLATION_CASES}장까지 등록할 수 있습니다.`);
            return;
        }
        setBusy(true);
        current.current.onBusyChange?.(true);
        try {
            const safeFile = new File([file], 'installation-case.' + EXTENSIONS[file.type], { type: file.type });
            const imageUrl = await uploadImage(safeFile, 'installation-cases');
            const latest = current.current;
            if (alive.current && latest.value.length < MAX_INSTALLATION_CASES) {
                latest.onChange([...latest.value, { id: createId(), image_url: imageUrl, caption: '' }]);
                setMessage('이미지를 등록했습니다. 상품을 저장해야 반영됩니다.');
            }
        } catch (error) {
            if (alive.current) setMessage(error instanceof Error ? error.message : '사진 업로드에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            if (alive.current) { setBusy(false); current.current.onBusyChange?.(false); }
        }
    };

    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= value.length) return;
        const next = [...value];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-5" aria-label="상세 상단 이미지 편집">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold text-slate-900">상세 상단 이미지</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">상품 상세페이지의 상세 이미지 위에 그대로 표시됩니다. 이 상품이 +태그로 연결된 패키지는 아래에 자동으로 안내됩니다.</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-600">{value.length} / {MAX_INSTALLATION_CASES}장</span>
            </div>
            <label className={`inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 ${busy || value.length >= MAX_INSTALLATION_CASES ? 'pointer-events-none opacity-50' : 'hover:border-slate-400'}`}>
                {busy ? '업로드 중…' : '이미지 추가'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy || value.length >= MAX_INSTALLATION_CASES}
                    onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <small className="ml-3 text-xs text-slate-500">JPG · PNG · WebP / 최대 10MB</small>
            {message && <p role="status" aria-live="polite" className="text-sm text-slate-600">{message}</p>}
            {value.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {value.map((item, index) => (
                        <li key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <img src={isSafeSceneImageUrl(item.image_url) ? item.image_url : undefined} alt={`이미지 ${index + 1}`} className="aspect-[16/10] w-full object-cover" draggable={false} />
                            <div className="space-y-2 p-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-slate-500">{index + 1}번</span>
                                    <span className="flex gap-1">
                                        <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40" aria-label={`${index + 1}번 이미지 앞으로`}>↑</button>
                                        <button type="button" disabled={index === value.length - 1} onClick={() => move(index, 1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40" aria-label={`${index + 1}번 이미지 뒤로`}>↓</button>
                                        <button type="button" onClick={() => { if (window.confirm('이 이미지를 삭제할까요?')) onChange(value.filter(v => v.id !== item.id)); }} className="rounded-md border border-red-200 px-2 py-1 text-red-600">삭제</button>
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
