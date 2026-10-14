import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Container } from './ui/Container';
import { getTabMenuItems, getBoardPosts, TabMenuItem, BoardPostType, BoardPost } from '../src/api/cmsApi';
import { getHomeReviewSlides, HomeReviewSlide } from '../src/api/siteSettingsApi';

const BOARD_PATH: Record<BoardPostType, string> = { notice: '/notice', event: '/event', review: '/review' };
const resolveBoardType = (tab: TabMenuItem): BoardPostType | null => {
  const link = (tab.link || '').toLowerCase();
  if (link.startsWith('/notice')) return 'notice';
  if (link.startsWith('/event')) return 'event';
  if (link.startsWith('/review')) return 'review';
  const name = (tab.name || '').replace(/\s+/g, '');
  if (name.includes('공지')) return 'notice';
  if (name.includes('이벤트')) return 'event';
  if (name.includes('후기')) return 'review';
  return null;
};
const postPath = (post: BoardPost) => post.id ? `${BOARD_PATH[post.board_type]}/${post.id}` : BOARD_PATH[post.board_type];

export const PromoSection: React.FC = () => {
  const [tabs, setTabs] = useState<TabMenuItem[]>([]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  // 관리자가 직접 만든 설치후기 슬라이드(게시글과 연결하지 않는 보여 주기용). 없으면 후기 영역을 숨긴다.
  const [reviews, setReviews] = useState<HomeReviewSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [resetting, setResetting] = useState(false);
  const movingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getTabMenuItems(),
      getBoardPosts(),
      // 슬라이드를 못 불러와도 공지/이벤트 영역은 보이게 한다.
      getHomeReviewSlides().catch(() => [] as HomeReviewSlide[]),
    ]).then(([tabData, postData, slideData]) => {
      if (cancelled) return;
      setReviews(slideData);
      setTabs(tabData.filter(tab => resolveBoardType(tab)));
      setPosts([...postData].sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime() ||
        (a.display_order || 0) - (b.display_order || 0)));
    }).catch(error => console.error('Failed to load installation stories:', error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const showReviews = reviews.length > 0;
  const newsTabs = tabs.filter(tab => resolveBoardType(tab) !== 'review');
  const count = reviews.length;
  const logicalIndex = count ? (activeIndex + count) % count : 0;
  // Copies on either side keep the next preview visible across the loop boundary.
  const slides = count > 1 ? [...reviews, ...reviews, ...reviews] : reviews;
  const trackIndex = count > 1 ? activeIndex + count : 0;

  useEffect(() => {
    if (!movingRef.current || resetting) return;
    const timer = window.setTimeout(() => {
      if (activeIndex < 0 || activeIndex >= count) {
        setResetting(true);
        setActiveIndex((activeIndex + count) % count);
      } else {
        movingRef.current = false;
      }
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 560);
    return () => window.clearTimeout(timer);
  }, [activeIndex, count, resetting]);

  useEffect(() => {
    if (!resetting) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        setResetting(false);
        movingRef.current = false;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [resetting]);

  const move = (direction: number) => {
    if (count < 2) return;
    movingRef.current = true;
    setActiveIndex(current => Math.max(-1, Math.min(count, current + direction)));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#001E45]" aria-label="설치후기 불러오는 중" /></div>;
  // 보여 줄 슬라이드도, 공지/이벤트 줄도 없으면 빈 여백만 남지 않게 섹션 자체를 숨긴다.
  if (!showReviews && newsTabs.length === 0) return null;

  return (
    <section aria-label="설치후기와 소식" className="overflow-hidden bg-[#f5f7fa] py-14 md:py-20 lg:py-24">
      <Container>
        {showReviews && (
          <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
            <div className="flex flex-col items-start lg:py-3">
              <p className="flex items-center gap-3 text-[11px] font-bold tracking-[0.18em] text-[#26808b]">
                <span className="h-px w-7 bg-[#26808b]" /> INSTALLATION STORIES
              </p>
              <p className="mt-7 text-sm font-semibold text-slate-500">설치후기</p>
              <h2 className="mt-3 text-[32px] font-bold leading-[1.35] tracking-[-0.045em] text-[#001E45] md:text-[38px]">
                설치 현장에서<br />만나는 렌탈어때
              </h2>
              <p className="mt-5 max-w-[300px] break-keep text-[15px] leading-7 text-slate-500">
                시험장부터 사무실, 행사장까지.<br />
                실제 설치 사진과 이야기로 우리 공간에 필요한 렌탈을 살펴보세요.
              </p>
              <Link to="/review" className="mt-7 inline-flex items-center gap-6 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-[#001E45] transition-colors hover:border-[#001E45] hover:bg-[#001E45] hover:text-white">
                설치후기 전체보기 <ArrowUpRight size={17} />
              </Link>
              {reviews.length > 1 && (
                <div className="mt-8 flex w-full items-center gap-5 lg:mt-auto lg:pt-10">
                  <span className="text-sm tabular-nums text-slate-400"><span className="font-bold text-[#001E45]">{String(logicalIndex + 1).padStart(2, '0')}</span><span className="mx-3">/</span>{String(reviews.length).padStart(2, '0')}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => move(-1)}  aria-label="이전 설치후기" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-[#001E45] transition-colors hover:border-[#001E45] disabled:cursor-default disabled:opacity-30"><ChevronLeft size={19} /></button>
                    <button type="button" onClick={() => move(1)}  aria-label="다음 설치후기" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-[#001E45] transition-colors hover:border-[#001E45] disabled:cursor-default disabled:opacity-30"><ChevronRight size={19} /></button>
                  </div>
                </div>
              )}
            </div>
            {reviews.length ? (
              <div role="region" aria-roledescription="carousel" aria-label="설치 사례 갤러리" tabIndex={0}
                onKeyDown={event => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    event.currentTarget.focus({ preventScroll: true });
                    move(event.key === 'ArrowRight' ? 1 : -1);
                  }
                }}
                className="review-gallery min-w-0">
                <div className="review-gallery-track" data-resetting={resetting} style={{ '--review-index': trackIndex } as React.CSSProperties}>
                {slides.map((slide, index) => (
                  <article key={index} data-review-card data-active={index === trackIndex}
                    className="review-gallery-card relative overflow-hidden rounded-[22px] border border-slate-200/70 bg-white">
                  <Link to={BOARD_PATH.review} tabIndex={index === trackIndex ? 0 : -1}
                    aria-hidden={index !== trackIndex || undefined}
                    className="group block h-full focus-visible:outline-offset-[-3px]"
                    style={{ pointerEvents: index === trackIndex ? 'auto' : 'none' }}>
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-200 md:aspect-[16/10]">
                      {(slide.image_url || slide.mobile_image_url) ? (
                        <picture>
                          {slide.mobile_image_url && <source media="(max-width: 767px)" srcSet={slide.mobile_image_url} />}
                          <img src={slide.image_url || slide.mobile_image_url} alt={slide.title} loading="lazy" draggable={false} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none" />
                        </picture>
                      ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">설치 현장 이야기</div>}
                      <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-[#001E45]">PROJECT {String(index % count + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="p-5 md:p-7">
                      <p className="text-xs font-semibold text-[#26808b]">{slide.category || '설치 사례'}</p>
                      <h3 className="mt-2.5 line-clamp-2 break-keep text-[20px] font-bold leading-[1.45] tracking-[-0.025em] text-[#001E45] md:text-[23px]">{slide.title}</h3>
                      <p className="mt-3 line-clamp-2 text-[13px] leading-[1.8] text-slate-500 md:text-sm">{slide.description || '공간에 맞춰 완성한 렌탈 설치 현장을 만나보세요.'}</p>
                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-[#001E45]">
                        설치후기 더 보기 <ArrowRight size={18} className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
                      </div>
                    </div>
                  </Link>
                  {index === trackIndex + 1 && (
                    <button type="button" className="review-gallery-preview"
                      aria-label={'다음 설치후기 보기: ' + slide.title}
                      onClick={event => {
                        move(1);
                        event.currentTarget.closest<HTMLElement>('[role="region"]')?.focus({ preventScroll: true });
                      }}>
                    </button>
                  )}
                  </article>
                ))}
                </div>
                <p className="sr-only" aria-live="polite" aria-atomic="true">설치후기 {logicalIndex + 1} / {reviews.length}</p>
              </div>
            ) : <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-white text-sm text-slate-500">새로운 설치 사례를 준비하고 있습니다.</div>}
          </div>
        )}
        {newsTabs.length > 0 && (
          <div className={showReviews ? 'mt-10 border-t border-slate-200 pt-5 md:mt-12' : ''}>
            {newsTabs.map(tab => {
              const type = resolveBoardType(tab)!;
              const post = posts.find(item => item.board_type === type);
              return (
                <div key={tab.id || type} className="flex items-center gap-4 py-3 md:gap-7">
                  <span className="shrink-0 text-sm font-bold text-[#001E45]">{tab.name}</span>
                  {post ? <Link to={postPath(post)} className="min-w-0 flex-1 truncate text-sm text-slate-600 hover:text-[#001E45]">{post.title}</Link> : <span className="flex-1 text-sm text-slate-400">새 소식을 준비하고 있습니다.</span>}
                  <Link to={BOARD_PATH[type]} aria-label={`${tab.name} 전체보기`} className="flex shrink-0 items-center gap-2 text-xs text-slate-500 hover:text-[#001E45]"><span className="hidden sm:inline">전체보기</span><ArrowUpRight size={17} /></Link>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
};
