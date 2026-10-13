import React from 'react';
import { ArrowDown, ArrowUp, Pin, PinOff } from 'lucide-react';
import type { BoardPost } from '../../src/api/cmsApi';

interface HomeReviewPinOrderProps {
    pins: string[];
    posts: BoardPost[];
    busy: boolean;
    onMove: (index: number, direction: -1 | 1) => void;
    onRemove: (id: string) => void;
}

// 홈 설치후기 슬라이드에 고정된 후기를 "홈에 보이는 순서대로" 위쪽에 모아 보여 주고, 순서를 바꾸는 목록.
export const HomeReviewPinOrder: React.FC<HomeReviewPinOrderProps> = ({ pins, posts, busy, onMove, onRemove }) => {
    const postById = new Map(posts.map((post) => [post.id, post]));

    return (
        <section className="mb-6 rounded-2xl border border-[#001E45]/15 bg-white p-4 shadow-sm md:p-5" aria-label="홈 슬라이드 고정 후기 순서">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Pin size={15} className="text-[#001E45]" /> 홈 슬라이드에 보이는 순서
            </h3>

            {pins.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                    고정된 후기가 없습니다. 아래 설치후기의 핀 아이콘을 눌러 추가하세요. (지금은 홈 슬라이드가 비어 보입니다)
                </p>
            ) : (
                <ol className="mt-3 space-y-2">
                    {pins.map((id, index) => {
                        const post = postById.get(id);
                        const hidden = !post || !post.is_active;
                        return (
                            <li key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 pr-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#001E45] text-xs font-bold text-white">
                                    {index + 1}
                                </span>
                                <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                    {post && (post.image_url || post.mobile_image_url) ? (
                                        <img src={post.image_url || post.mobile_image_url} alt="" className="h-full w-full object-cover" />
                                    ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate text-sm font-semibold ${hidden ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {post ? post.title : '삭제되었거나 찾을 수 없는 후기'}
                                    </p>
                                    {hidden && (
                                        <p className="truncate text-xs text-slate-400">
                                            {post ? '비활성(HIDDEN) 상태라 홈에는 보이지 않습니다.' : '홈에는 보이지 않습니다. 고정을 해제해 주세요.'}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onMove(index, -1)}
                                        disabled={busy || index === 0}
                                        aria-label="위로"
                                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onMove(index, 1)}
                                        disabled={busy || index === pins.length - 1}
                                        aria-label="아래로"
                                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(id)}
                                        disabled={busy}
                                        aria-label="고정 해제"
                                        title="고정 해제"
                                        className="rounded-lg p-2 text-red-400 hover:bg-red-50 disabled:opacity-30"
                                    >
                                        <PinOff size={16} />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
};
