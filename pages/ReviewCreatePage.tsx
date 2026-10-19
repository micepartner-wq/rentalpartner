import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Container } from '../components/ui/Container';
import ReviewPhotoEditor from '../components/review/ReviewPhotoEditor';
import { addBoardPost, getBoardPostById, getBoardPosts, updateBoardPost } from '../src/api/cmsApi';
import { getBoardCategories } from '../src/api/siteSettingsApi';
import { useAuth } from '../src/context/AuthContext';
import { MAX_REVIEW_PHOTOS, normalizeReviewPhotos, splitLegacyContent, type ReviewPhoto } from '../src/utils/reviewPhotos';

// 사례를 같은 틀로 쓰기 위한 소제목(원하면 한 번에 넣을 수 있다).
const CASE_TEMPLATE = [
  '■ 고객 유형', '', '■ 현장 상황', '', '■ 구성 장비와 수량', '- ', '', '■ 일정과 지역', '', '■ 설치 과정', '', '■ 해결한 문제', '', '■ 결과', '',
].join('\n');

const createId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

export interface ReviewCreatePageProps {
  editPostId?: string;
}

export const ReviewCreatePage: React.FC<ReviewCreatePageProps> = ({ editPostId }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const isEditMode = Boolean(editPostId);

  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingPost, setLoadingPost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const reviewCategories = (await getBoardCategories('review')).filter(item => item.trim().length > 0);
        setCategories(reviewCategories);
        setCategory(prev => prev || reviewCategories[0] || '일반');
      } catch (e) {
        console.error('Failed to load review categories', e);
        setCategories(['일반']);
        setCategory(prev => prev || '일반');
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadPostForEdit = async () => {
      if (!isEditMode || !editPostId) return;
      setLoadingPost(true);
      try {
        const post = await getBoardPostById(editPostId);
        if (!post || post.board_type !== 'review') {
          setError('수정할 게시글을 찾을 수 없습니다.');
          return;
        }
        setTitle(post.title || '');
        setSummary(post.summary || '');
        setCategory(post.category || '');
        setDisplayOrder(Number(post.display_order || 1));

        // 새 방식 글은 images 를 그대로, 예전 글(본문에 사진이 섞인 형식)은 사진과 글로 나눠서 불러온다.
        const { urls, text } = splitLegacyContent(post.content);
        const saved = normalizeReviewPhotos(post.images);
        const known = new Set(saved.map(photo => photo.image_url));
        const legacyUrls = [post.image_url || post.mobile_image_url || '', ...urls]
          .filter((url, index, all) => url && !known.has(url) && all.indexOf(url) === index);
        const merged: ReviewPhoto[] = [
          ...saved,
          ...legacyUrls.map(url => ({ id: createId(), image_url: url, caption: '', hotspots: [] })),
        ];
        setPhotos(merged.slice(0, MAX_REVIEW_PHOTOS));
        setBody(text);
        if (saved.length === 0 && merged.length > 0) {
          setNotice('예전 형식의 글을 새 형식으로 불러왔어요. 사진은 사진 목록으로, 글은 본문으로 나뉘었고 저장하면 새 구조로 바뀝니다.'
            + (merged.length > MAX_REVIEW_PHOTOS ? ` 사진이 ${MAX_REVIEW_PHOTOS}장을 넘어 앞의 ${MAX_REVIEW_PHOTOS}장만 불러왔어요.` : ''));
        }
      } catch (e) {
        console.error('Failed to load review post for edit', e);
        setError('게시글을 불러오지 못했습니다.');
      } finally {
        setLoadingPost(false);
      }
    };
    loadPostForEdit();
  }, [editPostId, isEditMode]);

  if (!isAdmin) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: { pathname: isEditMode && editPostId ? `/review/${editPostId}/edit` : '/review/new' } }}
      />
    );
  }

  const backPath = isEditMode && editPostId ? `/review/${editPostId}` : '/review';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedTitle = title.trim();
    const normalizedCategory = category.trim();
    const normalizedBody = body.trim();

    if (photos.length === 0) { setError('사진을 한 장 이상 올려 주세요.'); return; }
    if (!normalizedTitle) { setError('제목을 입력해 주세요.'); return; }
    if (!normalizedCategory) { setError('카테고리를 선택해 주세요.'); return; }

    // 첫 번째 사진이 목록·공유에 쓰이는 대표 이미지다.
    const cover = photos[0].image_url;
    setSubmitting(true);
    try {
      if (isEditMode && editPostId) {
        const updated = await updateBoardPost(editPostId, {
          category: normalizedCategory,
          title: normalizedTitle,
          summary: summary.trim(),
          content: normalizedBody,
          image_url: cover,
          mobile_image_url: cover,
          images: photos,
          display_order: displayOrder,
          is_active: true,
        });
        navigate(updated.id ? `/review/${updated.id}` : '/review', { replace: true });
      } else {
        const existing = await getBoardPosts('review');
        const nextDisplayOrder = existing.length > 0
          ? Math.max(...existing.map(post => Number(post.display_order || 0))) + 1
          : 1;
        const created = await addBoardPost({
          board_type: 'review',
          category: normalizedCategory,
          title: normalizedTitle,
          summary: summary.trim(),
          content: normalizedBody,
          image_url: cover,
          mobile_image_url: cover,
          images: photos,
          display_order: nextDisplayOrder,
          is_active: true,
        });
        navigate(created.id ? `/review/${created.id}` : '/review', { replace: true });
      }
    } catch (e) {
      console.error('Failed to submit review post', e);
      setError(e instanceof Error && e.message
        ? e.message
        : (isEditMode ? '사례 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.' : '사례 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] pb-28 pt-8 md:pt-10">
      <Container>
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-[28px] font-bold leading-tight text-[#101828] md:text-[32px]">{isEditMode ? '설치사례 수정' : '설치사례 등록'}</h1>
          <Link to={backPath} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <ArrowLeft size={14} /> 목록으로
          </Link>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {loadingPost && <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" /> 게시글을 불러오는 중입니다…</div>}
          {notice && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>}
          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6" aria-label="사진">
              <div className="mb-4 flex items-end justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">사진</h2>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-500">{photos.length} / {MAX_REVIEW_PHOTOS}</span>
              </div>
              <ReviewPhotoEditor value={photos} onChange={setPhotos} onBusyChange={setPhotosBusy} />
            </section>

            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-6" aria-label="사례 정보">
              <h2 className="text-lg font-bold text-slate-900">사례 정보</h2>

              <div>
                <label htmlFor="review-title" className="mb-2 block text-sm font-semibold text-slate-700">제목</label>
                <input id="review-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
                  placeholder="예) 국가기술자격시험장 PC 120대 설치"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900" />
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">카테고리</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="카테고리">
                  {(categories.length ? categories : ['일반']).map(item => (
                    <button key={item} type="button" role="radio" aria-checked={category === item} onClick={() => setCategory(item)}
                      className={'rounded-full border px-4 py-2 text-sm font-semibold transition-colors ' + (category === item ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="review-summary" className="mb-2 block text-sm font-semibold text-slate-700">한줄 요약 <span className="font-normal text-slate-400">(목록 카드에 보여요)</span></label>
                <textarea id="review-summary" value={summary} onChange={e => setSummary(e.target.value)} maxLength={240} rows={2}
                  placeholder="1~2문장으로 핵심만 적어 주세요. 숫자가 있으면 좋아요."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900" />
                <p className="mt-1 text-right text-xs text-slate-400">{summary.length}/240</p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="review-body" className="text-sm font-semibold text-slate-700">본문 <span className="font-normal text-slate-400">(선택)</span></label>
                  <button type="button" onClick={() => setBody(prev => prev.trim() ? prev : CASE_TEMPLATE)} disabled={Boolean(body.trim())}
                    title={body.trim() ? '본문이 비어 있을 때만 넣을 수 있어요' : undefined}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                    작성 틀 넣기
                  </button>
                </div>
                <textarea id="review-body" value={body} onChange={e => setBody(e.target.value)} rows={14}
                  placeholder="고객 유형, 현장 상황, 장비와 수량, 일정·지역, 설치 과정, 해결한 문제를 적어 주세요."
                  className="min-h-[320px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none focus:border-slate-900" />
                <p className="mt-1 text-xs text-slate-400">사진은 위 사진 영역에서 올려요. 본문에는 글만 적으면 돼요.</p>
              </div>
            </section>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
            <Container>
              <div className="flex items-center justify-end gap-3 py-3">
                <button type="button" onClick={() => navigate(backPath)}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
                <button type="submit" disabled={loadingPost || submitting || photosBusy}
                  className="min-w-[140px] rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
                  {photosBusy ? '사진 올리는 중…' : submitting ? (isEditMode ? '수정 중…' : '등록 중…') : (isEditMode ? '사례 수정' : '사례 등록')}
                </button>
              </div>
            </Container>
          </div>
        </form>
      </Container>
    </div>
  );
};

export default ReviewCreatePage;
