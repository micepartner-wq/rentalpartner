import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Container } from './ui/Container';
import { getTabMenuItems, getBoardPosts, TabMenuItem, BoardPostType, BoardPost } from '../src/api/cmsApi';
import { stripGnbContentImages } from '../src/utils/gnbContent';

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
const preview = (post: BoardPost) => (post.summary || '').trim() ||
  stripGnbContentImages(post.content || '').replace(/\s+/g, ' ').trim();
const postPath = (post: BoardPost) => post.id ? `${BOARD_PATH[post.board_type]}/${post.id}` : BOARD_PATH[post.board_type];

export const PromoSection: React.FC = () => {
  const [tabs, setTabs] = useState<TabMenuItem[]>([]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; scrollLeft: number; moved: boolean } | null>(null);
  const suppressCardClickRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTabMenuItems(), getBoardPosts()]).then(([tabData, postData]) => {
      if (cancelled) return;
      setTabs(tabData.filter(tab => resolveBoardType(tab)));
      setPosts([...postData].sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime() ||
        (a.display_order || 0) - (b.display_order || 0)));
    }).catch(error => console.error('Failed to load installation stories:', error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const showReviews = tabs.some(tab => resolveBoardType(tab) === 'review');
  const reviews = showReviews ? posts.filter(post => post.board_type === 'review').slice(0, 4) : [];
  const newsTabs = tabs.filter(tab => resolveBoardType(tab) !== 'review');

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const sync = () => {
      const cards = Array.from(gallery.querySelectorAll<HTMLElement>('[data-review-card]'));
      if (!cards.length) return;
      const end = gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 2;
      let nearest = 0;
      cards.forEach((card, index) => {
        if (Math.abs(card.offsetLeft - cards[0].offsetLeft - gallery.scrollLeft) <
          Math.abs(cards[nearest].offsetLeft - cards[0].offsetLeft - gallery.scrollLeft)) nearest = index;
      });
      setActiveIndex(end ? cards.length - 1 : nearest);
      setAtEnd(end);
    };
    sync();
    gallery.addEventListener('scroll', sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(gallery);
    return () => { gallery.removeEventListener('scroll', sync); observer.disconnect(); };
  }, [loading, reviews.length]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const drag = dragRef.current;
      const gallery = galleryRef.current;
      if (!drag || !gallery) return;
      const delta = event.clientX - drag.startX;
      if (Math.abs(delta) > 5) drag.moved = true;
      if (drag.moved) gallery.scrollLeft = drag.scrollLeft - delta;
    };
    const handleMouseUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (drag.moved) {
        suppressCardClickRef.current = true;
        window.setTimeout(() => { suppressCardClickRef.current = false; }, 400);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const move = (direction: number) => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const cards = Array.from(gallery.querySelectorAll<HTMLElement>('[data-review-card]'));
    const target = Math.max(0, Math.min(cards.length - 1, activeIndex + direction));
    if (!cards[target]) return;
    gallery.scrollTo({
      left: cards[target].offsetLeft - cards[0].offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  const handleGalleryMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#001E45]" aria-label="설치후기 불러오는 중" /></div>;
  if (!tabs.length) return null;

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
                  <span className="text-sm tabular-nums text-slate-400"><span className="font-bold text-[#001E45]">{String(activeIndex + 1).padStart(2, '0')}</span><span className="mx-3">/</span>{String(reviews.length).padStart(2, '0')}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => move(-1)} disabled={activeIndex === 0} aria-label="이전 설치후기" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-[#001E45] transition-colors hover:border-[#001E45] disabled:cursor-default disabled:opacity-30"><ChevronLeft size={19} /></button>
                    <button type="button" onClick={() => move(1)} disabled={atEnd} aria-label="다음 설치후기" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-[#001E45] transition-colors hover:border-[#001E45] disabled:cursor-default disabled:opacity-30"><ChevronRight size={19} /></button>
                  </div>
                </div>
              )}
            </div>
            {reviews.length ? (
              <div ref={galleryRef} role="region" aria-label="설치 사례 갤러리" tabIndex={0}
                onKeyDown={event => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
                  }
                }}
                onMouseDown={handleGalleryMouseDown}
                onDragStart={event => event.preventDefault()}
                className="relative flex min-w-0 cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto pb-2 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {reviews.map((post, index) => (
                  <Link key={post.id || index} to={postPath(post)} data-review-card
                    onClick={event => {
                      if (suppressCardClickRef.current) {
                        event.preventDefault();
                        event.stopPropagation();
                        suppressCardClickRef.current = false;
                      }
                    }}
                    className="group block w-[86%] shrink-0 snap-start overflow-hidden rounded-[22px] border border-slate-200/70 bg-white md:w-[78%] focus-visible:outline-offset-[-3px]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-200 md:aspect-[16/10]">
                      {(post.image_url || post.mobile_image_url) ? (
                        <picture>
                          {post.mobile_image_url && <source media="(max-width: 767px)" srcSet={post.mobile_image_url} />}
                          <img src={post.image_url || post.mobile_image_url} alt={post.title} loading="lazy" draggable={false} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none" />
                        </picture>
                      ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">설치 현장 이야기</div>}
                      <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-[#001E45]">PROJECT {String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="p-5 md:p-7">
                      <p className="text-xs font-semibold text-[#26808b]">{post.category || '설치 사례'}</p>
                      <h3 className="mt-2.5 line-clamp-2 break-keep text-[20px] font-bold leading-[1.45] tracking-[-0.025em] text-[#001E45] md:text-[23px]">{post.title}</h3>
                      <p className="mt-3 line-clamp-2 text-[13px] leading-[1.8] text-slate-500 md:text-sm">{preview(post) || '공간에 맞춰 완성한 렌탈 설치 현장을 만나보세요.'}</p>
                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-[#001E45]">
                        현장 자세히 보기 <ArrowRight size={18} className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
                      </div>
                    </div>
                  </Link>
                ))}
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
