import { useEffect, useRef, useState } from 'react';

const ASPECTS: Array<{ label: string; value: number | null }> = [
    { label: '자유', value: null },
    { label: '4:3', value: 4 / 3 },
    { label: '1:1', value: 1 },
    { label: '16:10', value: 16 / 10 },
    { label: '3:4', value: 3 / 4 },
];
const CROPPABLE = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_OUTPUT_WIDTH = 2000;
const MIN_SIZE = 24;

type Rect = { x: number; y: number; w: number; h: number };
type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLES: Array<{ id: Handle; style: React.CSSProperties; cursor: string; corner: boolean }> = [
    { id: 'nw', style: { left: 0, top: 0 }, cursor: 'nwse-resize', corner: true },
    { id: 'ne', style: { left: '100%', top: 0 }, cursor: 'nesw-resize', corner: true },
    { id: 'sw', style: { left: 0, top: '100%' }, cursor: 'nesw-resize', corner: true },
    { id: 'se', style: { left: '100%', top: '100%' }, cursor: 'nwse-resize', corner: true },
    { id: 'n', style: { left: '50%', top: 0 }, cursor: 'ns-resize', corner: false },
    { id: 's', style: { left: '50%', top: '100%' }, cursor: 'ns-resize', corner: false },
    { id: 'w', style: { left: 0, top: '50%' }, cursor: 'ew-resize', corner: false },
    { id: 'e', style: { left: '100%', top: '50%' }, cursor: 'ew-resize', corner: false },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** 비율을 고정했을 때 사진 안에서 가장 크게 들어가는 가운데 사각형. */
const fitRect = (dw: number, dh: number, aspect: number | null): Rect => {
    if (!aspect) return { x: 0, y: 0, w: dw, h: dh };
    let w = dw;
    let h = w / aspect;
    if (h > dh) { h = dh; w = h * aspect; }
    return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
};

interface DialogProps {
    file: File;
    defaultAspect: number | null;
    onDone: (file: File | null) => void;
}

/** 사진 앱의 '자르기'처럼, 사진 위에 사각형을 놓고 끌어 옮기거나 모서리를 당겨 원하는 부분만 잘라 쓴다. */
function ImageCropDialog({ file, defaultAspect, onDone }: DialogProps) {
    // StrictMode 는 효과를 두 번 실행하므로 주소는 효과 안에서 만들고 정리한다(useMemo 로 만들면 먼저 폐기돼 사진이 안 뜬다).
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
    const [aspect, setAspect] = useState<number | null>(defaultAspect);
    const [rect, setRect] = useState<Rect | null>(null);
    const [failed, setFailed] = useState(false);
    const [working, setWorking] = useState(false);
    const drag = useRef<{ handle: Handle; px: number; py: number; start: Rect } | null>(null);

    const maxW = Math.min(560, window.innerWidth - 56);
    const maxH = Math.max(180, window.innerHeight * 0.5);
    const scale = natural ? Math.min(maxW / natural.w, maxH / natural.h) : 1;
    const dw = natural ? natural.w * scale : 0;
    const dh = natural ? natural.h * scale : 0;

    useEffect(() => {
        if (natural) setRect(fitRect(natural.w * scale, natural.h * scale, defaultAspect));
        // 처음 한 번만 초기 사각형을 만든다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [natural]);

    const chooseAspect = (value: number | null) => {
        setAspect(value);
        if (natural) setRect(fitRect(dw, dh, value));
    };

    const update = (event: React.PointerEvent) => {
        const state = drag.current;
        if (!state || !natural) return;
        const dx = event.clientX - state.px;
        const dy = event.clientY - state.py;
        const s = state.start;
        if (state.handle === 'move') {
            setRect({ ...s, x: clamp(s.x + dx, 0, dw - s.w), y: clamp(s.y + dy, 0, dh - s.h) });
            return;
        }
        const west = state.handle.includes('w');
        const east = state.handle.includes('e');
        const north = state.handle.includes('n');
        const south = state.handle.includes('s');
        if (aspect && state.handle.length === 2) {
            // 비율 고정: 반대편 모서리를 고정점으로 두고 사각형을 키우거나 줄인다.
            const ax = east ? s.x : s.x + s.w;
            const ay = south ? s.y : s.y + s.h;
            const cornerX = (east ? s.x + s.w : s.x) + dx;
            const cornerY = (south ? s.y + s.h : s.y) + dy;
            let w = Math.max(Math.abs(cornerX - ax), Math.abs(cornerY - ay) * aspect);
            w = Math.min(w, east ? dw - ax : ax, (south ? dh - ay : ay) * aspect);
            w = Math.max(w, MIN_SIZE);
            const h = w / aspect;
            setRect({ x: east ? ax : ax - w, y: south ? ay : ay - h, w, h });
            return;
        }
        let x1 = s.x, y1 = s.y, x2 = s.x + s.w, y2 = s.y + s.h;
        if (west) x1 = clamp(s.x + dx, 0, x2 - MIN_SIZE);
        if (east) x2 = clamp(s.x + s.w + dx, x1 + MIN_SIZE, dw);
        if (north) y1 = clamp(s.y + dy, 0, y2 - MIN_SIZE);
        if (south) y2 = clamp(s.y + s.h + dy, y1 + MIN_SIZE, dh);
        setRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    };

    const startDrag = (handle: Handle) => (event: React.PointerEvent) => {
        if (!rect) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { handle, px: event.clientX, py: event.clientY, start: rect };
    };
    const endDrag = () => { drag.current = null; };

    const outSize = natural && rect ? { w: Math.round(rect.w / scale), h: Math.round(rect.h / scale) } : null;

    const apply = () => {
        if (!natural || !rect || !url || working) return;
        setWorking(true);
        const img = new Image();
        img.onload = () => {
            const sx = rect.x / scale, sy = rect.y / scale, sw = rect.w / scale, sh = rect.h / scale;
            const outW = Math.max(1, Math.round(Math.min(sw, MAX_OUTPUT_WIDTH)));
            const outH = Math.max(1, Math.round(outW * sh / sw));
            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');
            if (!ctx) { setWorking(false); setFailed(true); return; }
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
            const png = file.type === 'image/png';
            canvas.toBlob(blob => {
                if (!blob) { setWorking(false); setFailed(true); return; }
                const base = file.name.replace(/\.[^.]+$/, '') || 'image';
                onDone(new File([blob], base + (png ? '.png' : '.jpg'), { type: png ? 'image/png' : 'image/jpeg' }));
            }, png ? 'image/png' : 'image/jpeg', 0.92);
        };
        img.onerror = () => { setWorking(false); setFailed(true); };
        img.src = url;
    };

    return (
        <div role="dialog" aria-modal="true" aria-label="사진 자르기" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-full w-full max-w-[620px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900">사진 자르기</h3>
                <p className="mt-1 text-xs text-slate-500">사각형을 끌어서 옮기고, 모서리나 변을 당겨 크기를 조절하세요. 사각형 안에 있는 부분만 올라갑니다.</p>

                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="자르기 비율">
                    {ASPECTS.map(item => (
                        <button key={item.label} type="button" onClick={() => chooseAspect(item.value)} aria-pressed={aspect === item.value}
                            className={'rounded-full border px-3 py-1.5 text-sm font-semibold ' + (aspect === item.value ? 'border-[#001E45] bg-[#001E45] text-white' : 'border-slate-300 bg-white text-slate-600')}>{item.label}</button>
                    ))}
                </div>

                <div className="mt-4 flex justify-center">
                    <div className="relative touch-none select-none bg-slate-200" style={{ width: dw || maxW, height: dh || 200 }}>
                        {url && (
                            <img src={url} alt="자를 사진" draggable={false} className="block h-full w-full" style={{ width: dw || undefined, height: dh || undefined }}
                                onLoad={event => setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })}
                                onError={() => setFailed(true)} />
                        )}
                        {!natural && !failed && <span className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">불러오는 중…</span>}
                        {rect && (
                            <div className="absolute border-2 border-white" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', cursor: 'move', clipPath: undefined }}
                                onPointerDown={startDrag('move')} onPointerMove={update} onPointerUp={endDrag} onPointerCancel={endDrag}>
                                {/* 삼분할 안내선 */}
                                <span className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/50" />
                                <span className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/50" />
                                <span className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/50" />
                                <span className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/50" />
                                {HANDLES.filter(item => item.corner || !aspect).map(item => (
                                    <span key={item.id} role="presentation" onPointerDown={startDrag(item.id)} onPointerMove={update} onPointerUp={endDrag} onPointerCancel={endDrag}
                                        className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center" style={{ ...item.style, cursor: item.cursor }}>
                                        <span className="block h-3.5 w-3.5 rounded-sm border-2 border-[#001E45] bg-white" />
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {outSize && <p className="mt-3 text-center text-xs tabular-nums text-slate-500">자를 크기 {outSize.w} × {outSize.h}px{outSize.w > MAX_OUTPUT_WIDTH ? ' (올릴 때 가로 ' + MAX_OUTPUT_WIDTH + 'px로 줄어듭니다)' : ''}</p>}
                {failed && <p role="alert" className="mt-3 text-sm text-red-600">이 사진은 자를 수 없습니다. 「원본 그대로 올리기」를 눌러 주세요.</p>}

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => onDone(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">취소</button>
                    <button type="button" onClick={() => onDone(file)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">원본 그대로 올리기</button>
                    <button type="button" onClick={apply} disabled={!natural || !rect || working} className="rounded-xl bg-[#001E45] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{working ? '처리 중…' : '자르고 올리기'}</button>
                </div>
            </div>
        </div>
    );
}

interface Request {
    id: number;
    file: File;
    aspect: number | null;
    resolve: (file: File | null) => void;
}

/**
 * 사용법: const { requestCrop, cropDialog } = useImageCrop();
 *  const result = await requestCrop(file);  // 자른 파일 / 원본 / null(취소)
 * 화면 어딘가에 {cropDialog} 를 렌더링해야 한다. JPG·PNG·WebP 가 아니면 자르지 않고 원본을 그대로 돌려준다.
 */
export function useImageCrop(defaultAspect: number | null = null) {
    const [request, setRequest] = useState<Request | null>(null);
    const counter = useRef(0);

    const requestCrop = (file: File, aspect: number | null = defaultAspect): Promise<File | null> => {
        if (!CROPPABLE.includes(file.type)) return Promise.resolve(file);
        return new Promise(resolve => setRequest({ id: ++counter.current, file, aspect, resolve }));
    };

    const cropDialog = request ? (
        <ImageCropDialog key={request.id} file={request.file} defaultAspect={request.aspect}
            onDone={result => { request.resolve(result); setRequest(null); }} />
    ) : null;

    return { requestCrop, cropDialog };
}
