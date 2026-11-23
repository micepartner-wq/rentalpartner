import { useEffect, useRef, useState } from 'react';
import { uploadImage } from '../../src/api/storageApi';
import { isSafeSceneImageUrl } from '../../src/utils/installationScenes';
import { MAX_GALLERY_IMAGES } from '../../src/utils/productGallery';
import { useImageCrop } from './ImageCropDialog';

interface Props {
    value: string[];
    onChange: (urls: string[]) => void;
    onBusyChange?: (busy: boolean) => void;
}

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** 대표 이미지 뒤에 붙는 추가 이미지(슬라이드) 편집기. */
export default function ProductGalleryEditor({ value, onChange, onBusyChange }: Props) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const { requestCrop, cropDialog } = useImageCrop();
    const alive = useRef(true);
    const current = useRef({ value, onChange, onBusyChange });
    current.current = { value, onChange, onBusyChange };
    useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; current.current.onBusyChange?.(false); };
    }, []);

    const upload = async (files: FileList | null) => {
        if (!files || files.length === 0 || busy) return;
        setMessage('');
        setBusy(true);
        current.current.onBusyChange?.(true);
        const failures: string[] = [];
        try {
            for (const file of Array.from(files)) {
                if (current.current.value.length >= MAX_GALLERY_IMAGES) { failures.push('최대 ' + MAX_GALLERY_IMAGES + '장까지 등록할 수 있어 나머지는 건너뛰었습니다.'); break; }
                if (!EXTENSIONS[file.type] || file.size > 10 * 1024 * 1024 || !file.size) { failures.push(file.name + ': 10MB 이하의 JPG, PNG, WebP만 가능합니다.'); continue; }
                try {
                    // 사진마다 자르기 창이 차례로 뜬다. '취소'를 누르면 그 사진은 올리지 않고 다음으로 넘어간다.
                    const cropped = await requestCrop(file);
                    if (!cropped) continue;
                    const safeFile = new File([cropped], 'product-gallery.' + EXTENSIONS[cropped.type], { type: cropped.type });
                    const url = await uploadImage(safeFile, 'product-gallery');
                    if (!alive.current) return;
                    const latest = current.current;
                    latest.onChange([...latest.value, url]);
                    current.current = { ...latest, value: [...latest.value, url] };
                } catch (error) {
                    failures.push(file.name + ': ' + (error instanceof Error ? error.message : '업로드에 실패했습니다.'));
                }
            }
        } finally {
            if (alive.current) {
                setBusy(false);
                current.current.onBusyChange?.(false);
                setMessage(failures.length ? failures.join(' ') : '이미지를 등록했습니다. 상품을 저장해야 반영됩니다.');
            }
        }
    };

    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= value.length) return;
        const next = [...value];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    const full = value.length >= MAX_GALLERY_IMAGES;
    return (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-5" aria-label="추가 대표 이미지 편집">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold text-slate-900">추가 대표 이미지 (슬라이드)</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">위 대표 이미지 뒤에 이어서 상세페이지 상단에 슬라이드로 보입니다. 상품 목록 카드에는 위 대표 이미지만 나옵니다.</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-600">{value.length} / {MAX_GALLERY_IMAGES}장</span>
            </div>
            <label className={`inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 ${busy || full ? 'pointer-events-none opacity-50' : 'hover:border-slate-400'}`}>
                {busy ? '업로드 중…' : '이미지 추가 (여러 장 선택 가능)'}
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy || full}
                    onChange={e => { void upload(e.target.files); e.target.value = ''; }} />
            </label>
            <small className="ml-3 text-xs text-slate-500">JPG · PNG · WebP / 최대 10MB</small>
            {cropDialog}
            {message && <p role="status" aria-live="polite" className="text-sm text-slate-600">{message}</p>}
            {value.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-3">
                    {value.map((url, index) => (
                        <li key={url + index} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <img src={isSafeSceneImageUrl(url) ? url : undefined} alt={`추가 이미지 ${index + 1}`} className="aspect-[4/3] w-full bg-slate-50 object-contain" draggable={false} />
                            <div className="flex items-center justify-between p-2 text-sm">
                                <span className="font-semibold text-slate-500">{index + 2}번째</span>
                                <span className="flex gap-1">
                                    <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40" aria-label={`추가 이미지 ${index + 1} 앞으로`}>←</button>
                                    <button type="button" disabled={index === value.length - 1} onClick={() => move(index, 1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40" aria-label={`추가 이미지 ${index + 1} 뒤로`}>→</button>
                                    <button type="button" onClick={() => { if (window.confirm('이 이미지를 삭제할까요?')) onChange(value.filter((_, i) => i !== index)); }} className="rounded-md border border-red-200 px-2 py-1 text-red-600">삭제</button>
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
