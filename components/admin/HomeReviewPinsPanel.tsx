import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Pin, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import type { BoardPost } from '../../src/api/cmsApi';
import { clearHomeReviewPins, getHomeReviewPins, upsertHomeReviewPins } from '../../src/api/siteSettingsApi';

interface HomeReviewPinsPanelProps {
    posts: BoardPost[];
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);

const byLatest = (a: BoardPost, b: BoardPost) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();

// 홈 "설치후기" 슬라이드에 보여 줄 후기를 직접 고르는 패널.
// 고정 목록이 없으면(= 한 번도 저장하지 않으면) 홈은 최신 후기를 자동으로 보여 준다.
export const HomeReviewPinsPanel: React.FC<HomeReviewPinsPanelProps> = ({ posts }) => {
    const [saved, setSaved] = useState<string[] | null>(null);
    const [draft, setDraft] = useState<string[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [selectedId, setSelectedId] = useState('');

    const reviews = useMemo(() => posts.filter((post) => post.board_type === 'review'), [posts]);
    const activeReviews = useMemo(() => reviews.filter((post) => post.is_active).sort(byLatest), [reviews]);
    const postById = useMemo(() => new Map(reviews.map((post) => [post.id, post])), [reviews]);

    useEffect(() => {
        let cancelled = false;
        getHomeReviewPins()
            .then((pins) => {
                if (cancelled) return;
                setSaved(pins);
                setDraft(pins);
            })
            .catch((error) => {
                console.error('Failed to load home review pins:', error);
                alert('홈 후기 고정 목록을 불러오지 못했습니다.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const isPinned = (id?: string) => !!id && !!draft?.includes(id);
    const candidates = activeReviews.filter((post) => !isPinned(post.id));
    const dirty = draft !== null && (saved === null || !sameList(draft, saved));

    const startPinning = () => {
        // 지금 홈에 보이는 상태(최신 후기 4개)에서 출발해서 바꿔 나갈 수 있게 한다.
        setDraft(activeReviews.slice(0, 4).map((post) => post.id!).filter(Boolean));
    };

    const addPin = () => {
        if (!selectedId || !draft) return;
        setDraft([...draft, selectedId]);
        setSelectedId('');
    };

    const removePin = (id: string) => draft && setDraft(draft.filter((pinId) => pinId !== id));

    const movePin = (index: number, direction: -1 | 1) => {
        if (!draft) return;
        const target = index + direction;
        if (target < 0 || target >= draft.length) return;
        const next = [...draft];
        [next[index], next[target]] = [next[target], next[index]];
        setDraft(next);
    };

    const save = async () => {
        if (!draft) return;
        setWorking(true);
        try {
            await upsertHomeReviewPins(draft);
            setSaved(draft);
            alert('홈 설치후기 슬라이드가 저장되었습니다.');
        } catch (error) {
            console.error('Failed to save home review pins:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setWorking(false);
        }
    };

    const resetToAuto = async () => {
        if (!confirm('고정 목록을 지우고 최신 후기를 자동으로 보여 주는 방식으로 되돌릴까요?')) return;
        setWorking(true);
        try {
            await clearHomeReviewPins();
            setSaved(null);
            setDraft(null);
        } catch (error) {
            console.error('Failed to clear home review pins:', error);
            alert('되돌리기에 실패했습니다.');
        } finally {
            setWorking(false);
        }
    };

    return (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-label="홈 설치후기 슬라이드 관리">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                        <Pin size={18} className="text-[#001E45]" /> 홈 설치후기 슬라이드
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {draft === null
                            ? '지금은 고정 목록이 없어서, 홈에는 최신 설치후기가 자동으로 표시됩니다.'
                            : '목록에 추가한 후기만, 아래 순서대로 홈에 표시됩니다. (새 후기를 써도 자동으로 들어오지 않습니다)'}
                    </p>
                </div>
                {draft !== null && (
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={resetToAuto}
                            disabled={working}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RotateCcw size={15} /> 최신 후기 자동으로 되돌리기
                        </button>
                        <button
                            type="button"
                            onClick={save}
                            disabled={working || !dirty}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#001E45] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                        >
                            {working ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            {dirty ? '저장' : '저장됨'}
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-[#001E45]" />
                </div>
            ) : draft === null ? (
                <button
                    type="button"
                    onClick={startPinning}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-[#001E45] hover:bg-slate-50"
                >
                    <Plus size={16} /> 고정 목록으로 관리하기 (현재 홈에 보이는 후기 {Math.min(activeReviews.length, 4)}개로 시작)
                </button>
            ) : (
                <>
                    <ol className="mt-4 space-y-2">
                        {draft.length === 0 && (
                            <li className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                고정된 후기가 없습니다. 저장하면 홈의 후기 슬라이드는 비어 보입니다.
                            </li>
                        )}
                        {draft.map((id, index) => {
                            const post = postById.get(id);
                            const unavailable = !post || !post.is_active;
                            return (
                                <li key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 pr-3">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                        {index + 1}
                                    </span>
                                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                        {post?.image_url || post?.mobile_image_url ? (
                                            <img src={post.image_url || post.mobile_image_url} alt="" className="h-full w-full object-cover" />
                                        ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate text-sm font-semibold ${unavailable ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            {post ? post.title : '삭제되었거나 찾을 수 없는 후기'}
                                        </p>
                                        <p className="truncate text-xs text-slate-400">
                                            {!post
                                                ? '홈에는 표시되지 않습니다. 목록에서 지워 주세요.'
                                                : !post.is_active
                                                    ? '비활성 상태라 홈에는 표시되지 않습니다.'
                                                    : post.category || '설치후기'}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => movePin(index, -1)}
                                            disabled={index === 0}
                                            aria-label="위로"
                                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => movePin(index, 1)}
                                            disabled={index === draft.length - 1}
                                            aria-label="아래로"
                                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                        >
                                            <ArrowDown size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removePin(id)}
                                            aria-label="목록에서 삭제"
                                            className="rounded-lg p-2 text-red-400 hover:bg-red-50"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <select
                            value={selectedId}
                            onChange={(event) => setSelectedId(event.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#001E45]"
                            aria-label="추가할 설치후기 선택"
                        >
                            <option value="">
                                {candidates.length ? '추가할 설치후기를 선택하세요' : '추가할 수 있는 후기가 없습니다'}
                            </option>
                            {candidates.map((post) => (
                                <option key={post.id} value={post.id}>
                                    {post.title}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={addPin}
                            disabled={!selectedId}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#001E45] px-4 py-2.5 text-sm font-semibold text-[#001E45] hover:bg-slate-50 disabled:opacity-40"
                        >
                            <Plus size={16} /> 목록에 추가
                        </button>
                    </div>
                    {dirty && <p className="mt-3 text-xs font-semibold text-amber-600">변경 사항이 아직 저장되지 않았습니다.</p>}
                </>
            )}
        </section>
    );
};
