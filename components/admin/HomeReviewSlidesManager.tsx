import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Edit2, ImageIcon, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { uploadImage } from '../../src/api/storageApi';
import {
    HOME_REVIEW_SLIDES_MAX,
    HomeReviewSlide,
    createHomeReviewSlideId,
    getHomeReviewSlides,
    upsertHomeReviewSlides,
} from '../../src/api/siteSettingsApi';
import { isSafeSceneImageUrl } from '../../src/utils/installationScenes';

type SlideForm = {
    id: string;
    image_url: string;
    mobile_image_url: string;
    category: string;
    title: string;
    description: string;
};

const EMPTY_FORM = (): SlideForm => ({
    id: createHomeReviewSlideId(),
    image_url: '',
    mobile_image_url: '',
    category: '',
    title: '',
    description: '',
});

const toForm = (slide: HomeReviewSlide): SlideForm => ({
    id: slide.id,
    image_url: slide.image_url,
    mobile_image_url: slide.mobile_image_url || '',
    category: slide.category || '',
    title: slide.title,
    description: slide.description || '',
});

// 홈 "설치후기" 슬라이드를 관리자가 직접 만들고 고치는 곳.
// 게시판의 설치후기 글과 연결되지 않는 보여 주기용 슬라이드이며, 홈에서 눌러도 이동하지 않는다.
export const HomeReviewSlidesManager: React.FC = () => {
    const [slides, setSlides] = useState<HomeReviewSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState<SlideForm | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState<'' | 'image' | 'mobile'>('');
    const imageInputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let cancelled = false;
        getHomeReviewSlides()
            .then((data) => {
                if (!cancelled) setSlides(data);
            })
            .catch((err) => {
                console.error('Failed to load home review slides:', err);
                alert('홈 설치후기 슬라이드를 불러오지 못했습니다.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const persist = async (next: HomeReviewSlide[]): Promise<boolean> => {
        setBusy(true);
        try {
            await upsertHomeReviewSlides(next);
            setSlides(next);
            return true;
        } catch (err) {
            console.error('Failed to save home review slides:', err);
            alert('저장에 실패했습니다.');
            return false;
        } finally {
            setBusy(false);
        }
    };

    const openAdd = () => {
        if (slides.length >= HOME_REVIEW_SLIDES_MAX) {
            alert(`슬라이드는 최대 ${HOME_REVIEW_SLIDES_MAX}개까지 만들 수 있습니다.`);
            return;
        }
        setForm(EMPTY_FORM());
        setIsNew(true);
        setError('');
    };

    const openEdit = (slide: HomeReviewSlide) => {
        setForm(toForm(slide));
        setIsNew(false);
        setError('');
    };

    const closeForm = () => {
        setForm(null);
        setError('');
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: 'image' | 'mobile') => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }
        setUploading(target);
        try {
            const url = await uploadImage(file, 'home-review-slides');
            setForm((current) => (current ? { ...current, [target === 'image' ? 'image_url' : 'mobile_image_url']: url } : current));
        } catch (err) {
            console.error('Failed to upload slide image:', err);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setUploading('');
        }
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form) return;

        const image = form.image_url.trim();
        const mobile = form.mobile_image_url.trim();
        const title = form.title.trim();
        if (!image) return setError('대표 이미지를 올려 주세요.');
        if (!isSafeSceneImageUrl(image)) return setError('대표 이미지 주소가 올바르지 않습니다. 다시 올려 주세요.');
        if (mobile && !isSafeSceneImageUrl(mobile)) return setError('모바일 이미지 주소가 올바르지 않습니다.');
        if (!title) return setError('제목을 입력해 주세요.');

        const slide: HomeReviewSlide = {
            id: form.id,
            image_url: image,
            mobile_image_url: mobile || undefined,
            category: form.category.trim() || undefined,
            title,
            description: form.description.trim() || undefined,
        };
        const next = isNew ? [...slides, slide] : slides.map((item) => (item.id === slide.id ? slide : item));
        if (await persist(next)) closeForm();
    };

    const remove = async (slide: HomeReviewSlide) => {
        if (!confirm(`"${slide.title}" 슬라이드를 삭제할까요?`)) return;
        if (await persist(slides.filter((item) => item.id !== slide.id))) {
            if (form?.id === slide.id) closeForm();
        }
    };

    const move = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= slides.length) return;
        const next = [...slides];
        [next[index], next[target]] = [next[target], next[index]];
        await persist(next);
    };

    const imageField = (target: 'image' | 'mobile', label: string, hint: string, required: boolean) => {
        if (!form) return null;
        const value = target === 'image' ? form.image_url : form.mobile_image_url;
        const inputRef = target === 'image' ? imageInputRef : mobileInputRef;
        const setValue = (next: string) =>
            setForm((current) => (current ? { ...current, [target === 'image' ? 'image_url' : 'mobile_image_url']: next } : current));
        return (
            <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="relative flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-slate-400"
                        aria-label={`${label} 올리기`}
                    >
                        {value && isSafeSceneImageUrl(value) ? (
                            <img src={value} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <span className="flex flex-col items-center gap-1 text-xs">
                                <Upload size={20} /> 이미지 올리기
                            </span>
                        )}
                        {uploading === target && (
                            <span className="absolute inset-0 flex items-center justify-center bg-white/80">
                                <Loader2 className="animate-spin text-[#001E45]" />
                            </span>
                        )}
                    </button>
                    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event, target)} />
                    <div className="min-w-0 flex-1">
                        <input
                            type="url"
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            placeholder="또는 이미지 주소(URL)를 붙여 넣으세요"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#001E45]"
                        />
                        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
                        {value && !required && (
                            <button type="button" onClick={() => setValue('')} className="mt-1 text-xs font-semibold text-red-400 hover:underline">
                                이미지 지우기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-label="홈 설치후기 슬라이드 관리">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">홈 설치후기 슬라이드</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        홈 화면 "설치후기" 영역에 보일 슬라이드를 직접 만듭니다. 게시판의 설치후기 글과는 연결되지 않으며, 홈에서 눌러도 이동하지 않는 보여 주기용입니다.
                        슬라이드가 하나도 없으면 홈에서 이 영역이 보이지 않습니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openAdd}
                    disabled={busy || !!form}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#001E45] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                >
                    <Plus size={16} /> 슬라이드 추가
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-[#001E45]" />
                </div>
            ) : (
                <>
                    {form && (
                        <form
                            onSubmit={submit}
                            noValidate
                            onInput={() => error && setError('')}
                            className="mt-5 space-y-4 rounded-2xl border border-[#001E45]/20 bg-slate-50/70 p-4 md:p-5"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-800">{isNew ? '새 슬라이드 추가' : '슬라이드 수정'}</h3>
                                <button type="button" onClick={closeForm} aria-label="닫기" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>

                            {imageField('image', '대표 이미지', 'PC와 모바일에서 보이는 기본 이미지입니다. 가로로 긴 사진(4:3 ~ 16:10)이 잘 어울립니다.', true)}
                            {imageField('mobile', '모바일 이미지 (선택)', '모바일에서만 다른 사진을 쓰고 싶을 때 올려 주세요. 비워 두면 대표 이미지를 씁니다.', false)}

                            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-slate-700">카테고리 (선택)</label>
                                    <input
                                        type="text"
                                        value={form.category}
                                        maxLength={40}
                                        onChange={(event) => setForm({ ...form, category: event.target.value })}
                                        placeholder="예: 시험장"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#001E45]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                                        제목 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        maxLength={120}
                                        onChange={(event) => setForm({ ...form, title: event.target.value })}
                                        placeholder="예: 국가기술자격시험장 PC·모니터 세팅"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#001E45]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-slate-700">설명 (선택)</label>
                                <textarea
                                    value={form.description}
                                    maxLength={300}
                                    rows={3}
                                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                                    placeholder="홈에 두 줄까지 보입니다."
                                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#001E45]"
                                />
                                <p className="mt-1 text-right text-xs text-slate-400">{form.description.length}/300</p>
                            </div>

                            {error && <p className="text-sm font-semibold text-red-500" role="alert">{error}</p>}

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={closeForm} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy || !!uploading}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#001E45] px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                                >
                                    {busy && <Loader2 size={15} className="animate-spin" />} 저장
                                </button>
                            </div>
                        </form>
                    )}

                    {slides.length === 0 && !form ? (
                        <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
                            <ImageIcon size={28} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-sm text-slate-500">등록된 슬라이드가 없습니다. 지금은 홈에 설치후기 영역이 보이지 않습니다.</p>
                        </div>
                    ) : (
                        <ol className="mt-5 space-y-2">
                            {slides.map((slide, index) => (
                                <li key={slide.id} className={`flex items-center gap-3 rounded-xl border bg-white p-2.5 pr-3 ${form?.id === slide.id ? 'border-[#001E45]/40' : 'border-slate-200'}`}>
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#001E45] text-xs font-bold text-white">{index + 1}</span>
                                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                        <img src={slide.image_url} alt="" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold text-[#26808b]">
                                            {slide.category || '설치 사례'}
                                            {slide.mobile_image_url && <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">MOBILE IMG</span>}
                                        </p>
                                        <p className="truncate text-sm font-bold text-slate-800">{slide.title}</p>
                                        {slide.description && <p className="truncate text-xs text-slate-400">{slide.description}</p>}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-0.5">
                                        <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label="위로" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                                            <ArrowUp size={16} />
                                        </button>
                                        <button type="button" onClick={() => move(index, 1)} disabled={busy || index === slides.length - 1} aria-label="아래로" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                                            <ArrowDown size={16} />
                                        </button>
                                        <button type="button" onClick={() => openEdit(slide)} disabled={busy} aria-label="수정" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#001E45] disabled:opacity-30">
                                            <Edit2 size={16} />
                                        </button>
                                        <button type="button" onClick={() => remove(slide)} disabled={busy} aria-label="삭제" className="rounded-lg p-2 text-red-400 hover:bg-red-50 disabled:opacity-30">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </>
            )}
        </section>
    );
};
