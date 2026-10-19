import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, ChevronsUpDown, Plus, Search, Trash2, X } from 'lucide-react';
import { getProducts, type Product } from '../../src/api/productApi';
import { uploadImage } from '../../src/api/storageApi';
import { isSafeSceneImageUrl, MAX_INSTALLATION_HOTSPOTS, type InstallationHotspot } from '../../src/utils/installationScenes';
import { MAX_REVIEW_PHOTOS, type ReviewPhoto } from '../../src/utils/reviewPhotos';

interface Props {
  value: ReviewPhoto[];
  onChange: (photos: ReviewPhoto[]) => void;
  onBusyChange?: (busy: boolean) => void;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// LAN HTTP origins lack randomUUID, but getRandomValues remains available.
const createId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

const roundPercent = (value: number) => Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;

/** 설치후기 사진 편집기: 여러 장 올리기, 끌어서 순서 바꾸기, 사진 위에 상품 태그(+) 달기. */
export default function ReviewPhotoEditor({ value, onChange, onBusyChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const uploadingRef = useRef(false);
  const addFilesRef = useRef<(files: File[]) => Promise<void>>(async () => {});
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; onBusyChange?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    getProducts().then(list => { if (active) setProducts(list); }).catch(() => { if (active) setProductsError(true); });
    return () => { active = false; };
  }, []);

  const photo = value.find(item => item.id === selectedId) ?? value[0];
  const photoIndex = photo ? value.findIndex(item => item.id === photo.id) : -1;
  const tag = photo?.hotspots.find(item => item.id === tagId);
  const linked = tag ? products.find(product => product.id === tag.product_id) : undefined;
  const searchOpen = Boolean(draft) || (Boolean(tag) && changing);

  const resetTagging = () => { setPlacing(false); setDraft(null); setTagId(null); setChanging(false); setQuery(''); };
  const selectPhoto = (id: string) => { setSelectedId(id); resetTagging(); };

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return products
      .filter(product => !product.product_type || product.product_type === 'basic')
      .filter(product => !keyword || product.name.toLowerCase().includes(keyword) || (product.category || '').toLowerCase().includes(keyword))
      .slice(0, 30);
  }, [products, query]);

  const updatePhoto = (id: string, patch: Partial<ReviewPhoto>) =>
    onChange(valueRef.current.map(item => item.id === id ? { ...item, ...patch } : item));

  // ── 업로드 ───────────────────────────────────────────────────────────────────────────────────
  const addFiles = async (files: File[]) => {
    if (files.length === 0 || uploadingRef.current) return;
    setMessage('');
    const room = MAX_REVIEW_PHOTOS - valueRef.current.length;
    if (room <= 0) { setMessage(`사진은 최대 ${MAX_REVIEW_PHOTOS}장까지 올릴 수 있어요.`); return; }
    const usable = files.filter(file => ACCEPTED.includes(file.type) && file.size > 0 && file.size <= MAX_FILE_BYTES);
    const notes: string[] = [];
    if (usable.length < files.length) notes.push('10MB 이하의 JPG, PNG, WebP만 올릴 수 있어요.');
    const batch = usable.slice(0, room);
    if (usable.length > room) notes.push(`${MAX_REVIEW_PHOTOS}장까지만 올라가서 나머지 ${usable.length - room}장은 제외했어요.`);
    if (batch.length === 0) { setMessage(notes.join(' ')); return; }

    uploadingRef.current = true;
    onBusyChange?.(true);
    setUploading({ done: 0, total: batch.length });
    let list = [...valueRef.current];
    let failed = 0;
    for (const file of batch) {
      try {
        const url = await uploadImage(file, 'gnb-posts/review');
        if (!alive.current) { uploadingRef.current = false; return; }
        list = [...list, { id: createId(), image_url: url, caption: '', hotspots: [] }];
        valueRef.current = list;
        onChange(list);
        setSelectedId(list[list.length - 1].id);
      } catch {
        failed += 1;
      }
      if (alive.current) setUploading(prev => prev ? { ...prev, done: prev.done + 1 } : prev);
    }
    uploadingRef.current = false;
    if (!alive.current) return;
    if (failed) notes.push(`${failed}장은 업로드에 실패했어요. 다시 시도해 주세요.`);
    setMessage(notes.join(' '));
    setUploading(null);
    resetTagging();
    onBusyChange?.(false);
  };

  addFilesRef.current = addFiles;
  // 이미지를 복사한 뒤 Ctrl+V 로 붙여넣으면 사진으로 추가한다(글 붙여넣기는 그대로 둔다).
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []).filter(file => file.type.startsWith('image/'));
      if (files.length === 0) return;
      event.preventDefault();
      void addFilesRef.current(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  // ── 순서 변경 ────────────────────────────────────────────────────────────────────────────────
  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const removePhoto = (id: string) => {
    if (!window.confirm('이 사진을 삭제할까요? 사진에 단 상품 태그도 함께 삭제돼요.')) return;
    const next = value.filter(item => item.id !== id);
    onChange(next);
    setSelectedId(next[0]?.id ?? null);
    resetTagging();
  };

  // ── 상품 태그 ────────────────────────────────────────────────────────────────────────────────
  const pointFromEvent = (event: { clientX: number; clientY: number }, box: DOMRect) => ({
    x: roundPercent(((event.clientX - box.left) / box.width) * 100),
    y: roundPercent(((event.clientY - box.top) / box.height) * 100),
  });

  const chooseProduct = (product: Product) => {
    if (!photo || !product.id) return;
    if (tag && changing) {
      updatePhoto(photo.id, { hotspots: photo.hotspots.map(item => item.id === tag.id ? { ...item, product_id: product.id! } : item) });
    } else if (draft) {
      if (photo.hotspots.length >= MAX_INSTALLATION_HOTSPOTS) { setMessage(`상품 태그는 사진당 최대 ${MAX_INSTALLATION_HOTSPOTS}개까지 달 수 있어요.`); return; }
      const next: InstallationHotspot = { id: createId(), product_id: product.id, x: draft.x, y: draft.y };
      updatePhoto(photo.id, { hotspots: [...photo.hotspots, next] });
      setTagId(next.id);
    }
    setDraft(null); setPlacing(false); setChanging(false); setQuery('');
  };
  const removeTag = () => {
    if (!photo || !tag) return;
    updatePhoto(photo.id, { hotspots: photo.hotspots.filter(item => item.id !== tag.id) });
    resetTagging();
  };
  const dragMarker = (event: React.PointerEvent<HTMLButtonElement>, hotspot: InstallationHotspot) => {
    if (!photo) return;
    const stage = event.currentTarget.parentElement;
    if (!stage) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setTagId(hotspot.id); setPlacing(false); setDraft(null); setChanging(false); setQuery('');
    const box = stage.getBoundingClientRect();
    const photoId = photo.id;
    const onMove = (moveEvent: PointerEvent) => {
      const point = pointFromEvent(moveEvent, box);
      onChange(valueRef.current.map(item => item.id === photoId
        ? { ...item, hotspots: item.hotspots.map(h => h.id === hotspot.id ? { ...h, ...point } : h) } : item));
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const dropZoneHandlers = {
    onDragOver: (event: React.DragEvent) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDropActive(true); } },
    onDragLeave: () => setDropActive(false),
    onDrop: (event: React.DragEvent) => {
      if (!event.dataTransfer.files?.length) return;
      event.preventDefault();
      setDropActive(false);
      void addFiles(Array.from(event.dataTransfer.files));
    },
  };
  const fileInput = (
    <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1}
      onChange={event => { void addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
  );
  const status = uploading
    ? <p role="status" className="mt-3 text-sm font-medium text-sky-600">사진 올리는 중… {uploading.done}/{uploading.total}</p>
    : message ? <p role="status" className="mt-3 text-sm text-red-600">{message}</p> : null;

  // ── 사진이 없을 때: 큰 업로드 영역 ───────────────────────────────────────────────────────────
  if (value.length === 0) {
    return (
      <div {...dropZoneHandlers}>
        {fileInput}
        <div className={'flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ' + (dropActive ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50')}>
          <Camera size={34} className="text-slate-400" aria-hidden="true" />
          <p className="mt-4 text-lg font-bold text-slate-600">사진을 끌어다 놓으세요</p>
          <p className="mt-1 text-sm text-slate-400">{MAX_REVIEW_PHOTOS}장까지 올릴 수 있어요. 복사한 이미지는 Ctrl+V로 붙여넣을 수도 있어요.</p>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={Boolean(uploading)}
            className="mt-6 rounded-xl bg-sky-500 px-8 py-3 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60">
            {uploading ? '올리는 중…' : 'PC에서 불러오기'}
          </button>
        </div>
        {status}
      </div>
    );
  }

  // ── 사진이 있을 때: 왼쪽 썸네일(끌어서 순서 변경) + 큰 미리보기 ──────────────────────────────────
  return (
    <div {...dropZoneHandlers} className={dropActive ? 'rounded-2xl ring-2 ring-sky-300' : ''}>
      {fileInput}
      <div className="flex flex-col gap-4 md:flex-row">
        <ul className="flex shrink-0 gap-3 overflow-x-auto pb-1 md:max-h-[640px] md:w-[88px] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0" aria-label="사진 목록 (끌어서 순서 변경)">
          {value.map((item, index) => (
            <li key={item.id} className="shrink-0"
              draggable
              onDragStart={event => { setDragId(item.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); }}
              onDragOver={event => { if (dragId) { event.preventDefault(); setOverId(item.id); } }}
              onDrop={event => {
                if (!dragId) return;
                event.preventDefault(); event.stopPropagation();
                move(value.findIndex(v => v.id === dragId), index);
                setDragId(null); setOverId(null);
              }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}>
              <button type="button" onClick={() => selectPhoto(item.id)} aria-label={`${index + 1}번째 사진 선택`} aria-current={item.id === photo?.id}
                className={'group relative block h-[72px] w-[72px] cursor-grab overflow-hidden rounded-xl border-2 bg-slate-100 active:cursor-grabbing md:h-[80px] md:w-[80px] '
                  + (item.id === photo?.id ? 'border-slate-900 ' : 'border-transparent ') + (overId === item.id && dragId !== item.id ? 'ring-2 ring-sky-400 ' : '') + (dragId === item.id ? 'opacity-40' : '')}>
                <img src={isSafeSceneImageUrl(item.image_url) ? item.image_url : undefined} alt="" draggable={false} className="h-full w-full object-cover" />
                <span className="absolute inset-0 hidden items-center justify-center bg-black/35 text-white group-hover:flex" aria-hidden="true"><ChevronsUpDown size={22} /></span>
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{index === 0 ? '대표' : index + 1}</span>
                {item.hotspots.length > 0 && <span className="absolute bottom-1 right-1 rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white">{item.hotspots.length}</span>}
              </button>
            </li>
          ))}
          {value.length < MAX_REVIEW_PHOTOS && (
            <li className="shrink-0">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={Boolean(uploading)} aria-label="사진 추가"
                className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-slate-400 hover:text-slate-600 disabled:opacity-50 md:h-[80px] md:w-[80px]">
                <Plus size={26} aria-hidden="true" />
              </button>
            </li>
          )}
        </ul>

        {photo && (
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl bg-slate-100 p-3">
              <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl bg-white">
                <img src={isSafeSceneImageUrl(photo.image_url) ? photo.image_url : undefined} alt={`${photoIndex + 1}번째 사진`} draggable={false}
                  className="block h-auto max-h-[560px] w-auto max-w-full select-none"
                  onClick={event => { if (placing) setDraft(pointFromEvent(event, event.currentTarget.getBoundingClientRect())); }}
                  style={{ cursor: placing ? 'crosshair' : 'default' }} />
                {photo.hotspots.map((item, index) => (
                  <button key={item.id} type="button" aria-label={`${index + 1}번 상품 태그`} aria-pressed={item.id === tagId}
                    onPointerDown={event => dragMarker(event, item)}
                    className={'absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-move touch-none items-center justify-center rounded-full border-2 border-white text-[12px] font-bold text-white shadow-md '
                      + (item.id === tagId ? 'bg-slate-900 ring-2 ring-sky-400' : 'bg-[#087f8c]')}
                    style={{ left: item.x + '%', top: item.y + '%' }}>{index + 1}</button>
                ))}
                {draft && <span aria-hidden="true" className="pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-white shadow-md" style={{ left: draft.x + '%', top: draft.y + '%' }}><Plus size={16} /></span>}
                {placing && !draft && <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center"><span className="rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white">상품이 있는 위치를 눌러 주세요</span></div>}
                {!placing && !searchOpen && (
                  <div className="absolute inset-x-0 bottom-4 flex justify-center">
                    <button type="button" onClick={() => { setPlacing(true); setTagId(null); setChanging(false); }}
                      className="rounded-full bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-sky-600">+ 상품 태그 추가</button>
                  </div>
                )}
                {placing && (
                  <button type="button" onClick={resetTagging} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-700 shadow" aria-label="태그 추가 취소"><X size={16} /></button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <input value={photo.caption} maxLength={200} onChange={event => updatePhoto(photo.id, { caption: event.target.value })}
                placeholder="사진 설명 (선택)" aria-label="사진 설명"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(photoIndex, photoIndex - 1)} disabled={photoIndex === 0} aria-label="앞으로"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ChevronUp size={16} /></button>
                <button type="button" onClick={() => move(photoIndex, photoIndex + 1)} disabled={photoIndex === value.length - 1} aria-label="뒤로"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ChevronDown size={16} /></button>
                <button type="button" onClick={() => removePhoto(photo.id)} aria-label="이 사진 삭제"
                  className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </div>

            {/* 연결된 상품 표시 / 상품 검색 */}
            {tag && !changing && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                {linked?.image_url && isSafeSceneImageUrl(linked.image_url)
                  ? <img src={linked.image_url} alt="" className="h-12 w-12 rounded-lg bg-slate-50 object-contain" />
                  : <span className="h-12 w-12 rounded-lg bg-slate-100" aria-hidden="true" />}
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{linked?.name || '연결된 상품을 찾을 수 없어요. 다른 상품을 선택하거나 태그를 삭제해 주세요.'}</p>
                <button type="button" onClick={() => { setChanging(true); setQuery(''); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">상품 변경</button>
                <button type="button" onClick={removeTag} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">태그 삭제</button>
              </div>
            )}
            {searchOpen && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <Search size={16} className="text-slate-400" aria-hidden="true" />
                  <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="연결할 상품 이름을 검색하세요"
                    aria-label="상품 검색" className="min-w-0 flex-1 text-sm outline-none" />
                  <button type="button" onClick={() => { setDraft(null); setChanging(false); setPlacing(false); setQuery(''); }} aria-label="검색 닫기" className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                {productsError && <p className="mt-2 text-xs text-red-500">상품 목록을 불러오지 못했어요. 새로고침해 주세요.</p>}
                <ul className="mt-2 max-h-[260px] overflow-y-auto">
                  {results.map(product => (
                    <li key={product.id}>
                      <button type="button" onClick={() => chooseProduct(product)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50">
                        {product.image_url && isSafeSceneImageUrl(product.image_url)
                          ? <img src={product.image_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md bg-slate-50 object-contain" />
                          : <span className="h-10 w-10 shrink-0 rounded-md bg-slate-100" aria-hidden="true" />}
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{product.name}</span>
                          {product.category && <span className="block truncate text-xs text-slate-400">{product.category}</span>}</span>
                      </button>
                    </li>
                  ))}
                  {results.length === 0 && <li className="px-2 py-6 text-center text-sm text-slate-400">{products.length === 0 && !productsError ? '상품을 불러오는 중…' : '검색 결과가 없어요.'}</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      {status}
    </div>
  );
}
