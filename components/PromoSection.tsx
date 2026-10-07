import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from './ui/Container';
import { Loader2 } from 'lucide-react';
import {
  getTabMenuItems,
  getBoardPosts,
  TabMenuItem,
  BoardPostType,
  BoardPost,
} from '../src/api/cmsApi';
import { stripGnbContentImages } from '../src/utils/gnbContent';

const BOARD_PATH: Record<BoardPostType, string> = {
  notice: '/notice',
  event: '/event',
  review: '/review',
};

const getTabKey = (tab: TabMenuItem) => tab.id || `${tab.name}-${tab.link}`;

const resolveBoardType = (tab: TabMenuItem): BoardPostType | null => {
  const link = (tab.link || '').toLowerCase();
  if (link.startsWith('/notice')) return 'notice';
  if (link.startsWith('/event')) return 'event';
  if (link.startsWith('/review')) return 'review';

  const normalizedName = (tab.name || '').replace(/\s+/g, '');
  if (normalizedName.includes('공지')) return 'notice';
  if (normalizedName.includes('이벤트')) return 'event';
  if (normalizedName.includes('후기')) return 'review';

  return null;
};

const getPostPreview = (post: BoardPost) => {
  const summary = (post.summary || '').trim();
  if (summary) return summary;

  return stripGnbContentImages(post.content || '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const PromoSection: React.FC = () => {
  const [tabs, setTabs] = useState<TabMenuItem[]>([]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    const loadTabs = async () => {
      try {
        const tabData = await getTabMenuItems();
        const boardTabs = tabData.filter((tab) => resolveBoardType(tab) !== null);
        
        // Force '설치후기' (Review) to appear first, then '공지사항' (Notice)
        const sortedTabs = boardTabs.sort((a, b) => {
          const aType = resolveBoardType(a);
          const bType = resolveBoardType(b);
          if (aType === 'review' && bType === 'notice') return -1;
          if (aType === 'notice' && bType === 'review') return 1;
          return 0;
        });

        setTabs(sortedTabs);
        if (sortedTabs.length > 0) {
          setActiveTabKey(getTabKey(sortedTabs[0]));
        }
      } catch (error) {
        console.error('Failed to load GNB tabs for promo section:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTabs();
  }, []);

  useEffect(() => {
    if (!activeTabKey) return;
    const activeTab = tabs.find((tab) => getTabKey(tab) === activeTabKey);
    if (!activeTab) return;

    const boardType = resolveBoardType(activeTab);
    if (!boardType) {
      setPosts([]);
      return;
    }

    const loadPosts = async () => {
      setLoadingPosts(true);
      try {
        const data = await getBoardPosts(boardType);
        const recentPosts = [...data]
          .sort((a, b) => {
            const bTime = new Date(b.created_at || 0).getTime();
            const aTime = new Date(a.created_at || 0).getTime();
            if (aTime === bTime) return (a.display_order || 0) - (b.display_order || 0);
            return bTime - aTime;
          })
          .slice(0, 2);
        setPosts(recentPosts);
      } catch (error) {
        console.error('Failed to load promo posts:', error);
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadPosts();
  }, [activeTabKey, tabs]);

  if (loading) {
    return (
      <div className="bg-white flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#001E45]" size={32} />
      </div>
    );
  }

  if (tabs.length === 0) {
    return null;
  }

  const activeTab = tabs.find((tab) => getTabKey(tab) === activeTabKey);
  const activeBoardType = activeTab ? resolveBoardType(activeTab) : null;

  return (
    <div className="py-14 md:py-24 bg-white">
      <Container>
        <div className="flex w-full mb-[20px] bg-gray-100/80 p-1.5 rounded-2xl overflow-hidden relative border border-gray-200">
          <div className="absolute inset-1.5 z-0 pointer-events-none">
            {tabs.length > 0 && activeTabKey && (
              <div
                className="h-full transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
                style={{
                  width: `${100 / tabs.length}%`,
                  transform: `translateX(${tabs.findIndex((t) => getTabKey(t) === activeTabKey) * 100}%)`,
                }}
              >
                <div className="h-full bg-[#001E45] rounded-xl shadow-lg shadow-[#001E45]/20 mx-0.5" />
              </div>
            )}
          </div>

          {tabs.map((tab) => (
            <button
              key={getTabKey(tab)}
              onClick={() => setActiveTabKey(getTabKey(tab))}
                className={`flex-1 py-3 md:py-4 text-center text-[16px] font-semibold transition-colors duration-300 relative z-10
                ${activeTabKey === getTabKey(tab) ? 'text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {loadingPosts ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#001E45]" size={32} />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            이 탭에 표시할 게시글이 없습니다.
            <br />
            <span className="text-sm">새 소식이 준비되는 대로 업데이트하겠습니다.</span>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden">
            {posts.map((post, index) => {
              const boardPath = activeBoardType ? BOARD_PATH[activeBoardType] : '/notice';
              const detailPath = post.id ? `${boardPath}/${post.id}` : boardPath;
              const previewText = getPostPreview(post);
              return (
                <Link
                  key={post.id || `${post.title}-${index}`}
                  to={detailPath}
                  className="group relative aspect-[16/9] w-[85vw] max-w-[340px] md:max-w-none md:w-[calc(50%_-_0.6rem)] overflow-hidden block rounded-2xl cursor-pointer snap-start flex-shrink-0 bg-slate-100 shadow-sm border border-slate-100"
                >
                  {(post.image_url || post.mobile_image_url) ? (
                    <picture className="block w-full h-full">
                      {post.mobile_image_url && <source media="(max-width: 767px)" srcSet={post.mobile_image_url} />}
                      <img
                        src={post.image_url || post.mobile_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </picture>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
                      썸네일 이미지 없음
                    </div>
                  )}
                  {activeBoardType === 'review' ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-5 pt-16 text-white">
                      <h3 className="text-[18px] font-semibold leading-tight tracking-[-0.02em] break-keep line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-[13px] leading-5 text-white/85 break-keep line-clamp-2">
                        {previewText || '자세한 설치 사례를 확인해보세요.'}
                      </p>
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};
