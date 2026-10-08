import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '../components/ui/Container';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getBoardPosts, BoardPost, BoardPostType } from '../src/api/cmsApi';
import { getBoardCategories, type BoardCategoryBoardType } from '../src/api/siteSettingsApi';
import { stripGnbContentImages } from '../src/utils/gnbContent';
import { useAuth } from '../src/context/AuthContext';

interface BoardPageProps {
  boardType: BoardPostType;
}

interface BoardMeta {
  title: string;
  description: string;
  placeholder: string;
  metaTitle: string;
  metaDescription: string;
}

const BOARD_META: Record<BoardPostType, BoardMeta> = {
  notice: {
    title: '공지사항',
    description: '렌탈어때 서비스 최신 공지사항을 확인하실 수 있습니다.',
    placeholder: '공지 제목 또는 내용을 입력해주세요.',
    metaTitle: '공지사항 - 렌탈어때',
    metaDescription: '렌탈어때 공지사항 페이지입니다.',
  },
  event: {
    title: '이벤트',
    description: '진행 중인 이벤트와 프로모션 소식을 확인하실 수 있습니다.',
    placeholder: '이벤트 제목 또는 내용을 입력해주세요.',
    metaTitle: '이벤트 - 렌탈어때',
    metaDescription: '렌탈어때 이벤트 페이지입니다.',
  },
  review: {
    title: '설치후기',
    description: '현장 설치 사례와 운영 후기를 통해 서비스 품질을 확인해보세요.',
    placeholder: '후기 제목 또는 내용을 입력해주세요.',
    metaTitle: '설치후기 - 렌탈어때',
    metaDescription: '렌탈어때 설치후기 페이지입니다.',
  },
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ko-KR');
};

const getPostPreview = (post: BoardPost) => {
  const summary = (post.summary || '').trim();
  if (summary) return summary;

  const contentText = stripGnbContentImages(post.content || '')
    .replace(/\s+/g, ' ')
    .trim();

  return contentText;
};

const BOARD_PATH: Record<BoardPostType, string> = {
  notice: '/notice',
  event: '/event',
  review: '/review',
};

export const BoardPage: React.FC<BoardPageProps> = ({ boardType }) => {
  const meta = BOARD_META[boardType];
  const { isAdmin } = useAuth();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = boardType === 'review' ? 12 : 8;

  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = ['전체', ...categories].findIndex(c => c === activeCategory);
      const activeTab = tabsRef.current[activeIndex];
      if (activeTab) {
        setIndicatorStyle({
          left: activeTab.offsetLeft,
          width: activeTab.offsetWidth,
        });
      }
    };
    
    updateIndicator();
    // 렌더링 직후 위치 미세 조정을 위해 한 번 더 호출
    const timeoutId = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeCategory, categories]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const [data, managedCategories] = await Promise.all([
          getBoardPosts(boardType),
          boardType === 'event'
            ? Promise.resolve<string[]>([])
            : getBoardCategories(boardType as BoardCategoryBoardType),
        ]);

        const inferredCategories = Array.from(
          new Set(
            data
              .map((post) => (post.category || '').trim())
              .filter(Boolean),
          ),
        );

        const mergedCategories = managedCategories.length > 0
          ? [...managedCategories, ...inferredCategories.filter((category) => !managedCategories.includes(category))]
          : inferredCategories;

        setPosts(data);
        setCategories(mergedCategories);
        setActiveCategory((current) => (
          current !== '전체' && mergedCategories.includes(current)
            ? current
            : '전체'
        ));
      } catch (error) {
        console.error(`Failed to load ${boardType} posts:`, error);
        setPosts([]);
        setCategories([]);
        setActiveCategory('전체');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [boardType]);

  const filteredPosts = useMemo(() => {
    const categoryFilteredPosts = activeCategory === '전체'
      ? posts
      : posts.filter((post) => (post.category || '').trim() === activeCategory);

    const sortedPosts = activeCategory === '전체'
      ? [...categoryFilteredPosts].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })
      : categoryFilteredPosts;

    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return sortedPosts;

    return sortedPosts.filter((post) => {
      const haystacks = [post.title, stripGnbContentImages(post.content)];
      return haystacks.some((text) => text.toLowerCase().includes(keyword));
    });
  }, [activeCategory, posts, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  const totalItems = filteredPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredPosts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const canWriteReview = boardType === 'review' && isAdmin;

  return (
    <>
      <Helmet>
        <title>{meta.metaTitle}</title>
        <meta name="description" content={meta.metaDescription} />
        <link rel="canonical" href={`https://rentalpartner.kr${BOARD_PATH[boardType]}`} />
      </Helmet>

      <div className="bg-white min-h-screen pb-20">
        <Container>
          <div className="py-12 md:py-16 text-left">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">{meta.title}</h2>
                <p className="text-slate-500 text-[16px] font-medium whitespace-pre-line leading-relaxed break-keep">
                  {meta.description}
                </p>
              </div>
              {canWriteReview && (
                <Link
                  to="/review/new"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-[#001E45] px-6 text-[14px] font-bold text-white shadow-sm hover:bg-[#002a5e] transition-all shrink-0"
                >
                  사례 등록
                </Link>
              )}
            </div>
          </div>

          {boardType !== 'review' && (
            <div className="bg-[#f7f8f9] py-6 md:py-8 px-4 md:px-6 flex justify-start items-center mb-10 rounded-sm">
              <div className="flex w-full max-w-2xl bg-white border border-gray-200 shadow-sm">
                <input
                  type="text"
                  placeholder={meta.placeholder}
                  className="flex-1 min-w-0 px-3 md:px-4 py-3 text-sm outline-none bg-transparent"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <button className="bg-[#001E45] text-white px-5 md:px-8 py-3 text-sm font-medium hover:bg-[#002a5e] transition-colors shrink-0">
                  검색
                </button>
              </div>
            </div>
          )}

          <div className="mb-8 md:mb-10 border-b border-gray-200">
            <div className="overflow-x-auto no-scrollbar -mx-[0.8rem] px-[0.8rem] md:mx-0 md:px-0">
              <div className="relative flex w-max min-w-full gap-0">
                {['전체', ...categories].map((category, index) => (
                  <button
                    key={category}
                    ref={(el) => { tabsRef.current[index] = el; }}
                    onClick={() => setActiveCategory(category)}
                    className={`
                      relative inline-flex h-12 min-w-[104px] shrink-0 items-center justify-center whitespace-nowrap px-4 text-center text-[15px] md:h-14 md:min-w-[120px] md:text-[16px] font-bold transition-colors
                      ${activeCategory === category
                        ? 'text-[#001E45]'
                        : 'text-slate-500 hover:text-slate-900 bg-transparent hover:bg-slate-50'
                      }
                    `}
                  >
                    {category}
                  </button>
                ))}
                {/* Sliding Indicator */}
                <div 
                  className="absolute bottom-[-1px] h-[3px] bg-[#001E45] transition-all duration-300 ease-out"
                  style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                />
              </div>
            </div>
          </div>

        </Container>

        {loading ? (
          <Container>
            <div className="py-24 text-center mb-16">
              <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
            </div>
          </Container>
        ) : currentItems.length > 0 ? (
          boardType === 'review' ? (
            <div className="w-full px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto mb-16">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
                {currentItems.map((post, index) => {
                  const detailPath = post.id ? `${BOARD_PATH[boardType]}/${post.id}` : BOARD_PATH[boardType];
                  const categoryLabel = (post.category || '').trim();

                  return (
                    <Link
                      key={post.id || `${post.title}-${index}`}
                      to={detailPath}
                      className="group block"
                    >
                      <div className="overflow-hidden rounded-2xl bg-[#f2f4f7] aspect-[4/3] shadow-sm mb-6 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
                        {(post.image_url || post.mobile_image_url) ? (
                          <picture className="block w-full h-full">
                            {post.mobile_image_url && <source media="(max-width: 767px)" srcSet={post.mobile_image_url} />}
                            <img
                              src={post.image_url || post.mobile_image_url}
                              alt={post.title}
                              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                            />
                          </picture>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                            썸네일 이미지 없음
                          </div>
                        )}
                      </div>
                      <div className="px-1 flex flex-col items-start mt-1">
                        {categoryLabel && (
                          <span className="mb-2.5 inline-flex rounded-[4px] bg-[#f1f5f9] px-2.5 py-1 text-[12px] font-semibold tracking-[-0.01em] text-slate-600">
                            {categoryLabel}
                          </span>
                        )}
                        <h3 className="text-[18px] lg:text-[20px] font-bold text-slate-900 line-clamp-2 leading-snug tracking-[-0.01em] group-hover:text-[#001E45] transition-colors">
                          {post.title}
                        </h3>
                      </div>
                    </Link>
                  );
                })}
                </div>
              </div>
            ) : (
              <Container>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                {currentItems.map((post, index) => {
                  const detailPath = post.id ? `${BOARD_PATH[boardType]}/${post.id}` : BOARD_PATH[boardType];
                  const previewText = getPostPreview(post);
                  const categoryLabel = (post.category || '').trim();

                  return (
                    <Link
                      key={post.id || `${post.title}-${index}`}
                      to={detailPath}
                      className="group block"
                    >
                      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
                        <div className="aspect-[16/9] bg-[#f2f4f7] overflow-hidden">
                          {(post.image_url || post.mobile_image_url) ? (
                            <picture className="block w-full h-full">
                              {post.mobile_image_url && <source media="(max-width: 767px)" srcSet={post.mobile_image_url} />}
                              <img
                                src={post.image_url || post.mobile_image_url}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                              />
                            </picture>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                              썸네일 이미지 없음
                            </div>
                          )}
                        </div>
                        <div className="px-6 pb-6 pt-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              {categoryLabel ? (
                                <span className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold tracking-[-0.01em] text-slate-600">
                                  {categoryLabel}
                                </span>
                              ) : null}
                              <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 break-keep line-clamp-2">
                                {post.title}
                              </h3>
                            </div>
                            <p className="shrink-0 pt-1 text-[13px] font-medium text-slate-400">
                              {formatDate(post.created_at)}
                            </p>
                          </div>
                          {previewText ? (
                            <p className="mt-4 text-[14px] leading-6 break-keep line-clamp-1 text-slate-500">
                              {previewText}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                </div>
              </Container>
            )
          ) : (
            <Container>
              <div className="py-24 text-center border-b border-gray-200 mb-16">
                <p className="text-gray-500">검색 결과가 없습니다.</p>
              </div>
            </Container>
          )}

          <Container>
            {boardType === 'review' && (
            <div className="flex justify-center mb-12">
              <div className="flex w-full max-w-sm bg-white border border-gray-300 rounded-full shadow-sm overflow-hidden transition-shadow focus-within:shadow-md focus-within:border-[#001E45]">
                <input
                  type="text"
                  placeholder={meta.placeholder}
                  className="flex-1 min-w-0 px-5 py-2.5 text-[14px] outline-none bg-transparent"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <button className="bg-[#001E45] text-white px-6 py-2.5 text-[14px] font-medium hover:bg-[#002a5e] transition-colors shrink-0">
                  검색
                </button>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 font-sans">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 10 && currentPage > 5) {
                  pageNum = currentPage - 5 + i;
                  if (pageNum > totalPages) return null;
                }
                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center border text-[13px] transition-colors ${currentPage === pageNum
                      ? 'border-[#001E45] bg-[#001E45] text-white font-semibold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </Container>
      </div>
    </>
  );
};

export default BoardPage;
