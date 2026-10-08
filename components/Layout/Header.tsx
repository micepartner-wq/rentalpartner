import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Container } from "../ui/Container";
import {
  getAllNavMenuItems,
  getTabMenuItems,
  NavMenuItem,
  TabMenuItem,
} from "../../src/api/cmsApi";
import { useAuth } from "../../src/context/AuthContext";
import { FullMenu } from "./FullMenu";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  Notification,
} from "../../src/api/notificationApi";

const BellIcon = ({ className }: { className?: string }) => (
  <img src="/notifications.svg" alt="알림" className={className} />
);

const MenuIcon = ({ className }: { className?: string }) => (
  <div
    className={`${className} bg-current`}
    style={{
      maskImage: "url(/menu.svg)",
      WebkitMaskImage: "url(/menu.svg)",
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
      maskPosition: "center",
      WebkitMaskPosition: "center",
      maskSize: "contain",
      WebkitMaskSize: "contain",
    }}
  />
);

const MobileMenuIcon = ({ className }: { className?: string }) => (
  <img src="/menu.svg" alt="메뉴" className={className} />
);

const ProfileIcon = ({ className }: { className?: string }) => (
  <img src="/person.svg" alt="프로필" className={className} />
);

const DEFAULT_GNB_TABS: TabMenuItem[] = [
  {
    name: "공지사항",
    link: "/notice",
    display_order: 1,
    is_active: true,
  },
  {
    name: "이벤트",
    link: "/event",
    display_order: 2,
    is_active: true,
  },
  {
    name: "설치후기",
    link: "/review",
    display_order: 3,
    is_active: true,
  },
  {
    name: "고객센터",
    link: "/cs",
    display_order: 4,
    is_active: true,
  },
];

const GNB_ROUTE_BY_NAME: Record<string, string> = {
  "공지사항": "/notice",
  "이벤트": "/event",
  "설치후기": "/review",
  "고객센터": "/cs",
};

const NotificationDropdown = ({
  notifications,
  unreadCount,
  onMarkAllRead,
  onNotificationClick,
}: {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onNotificationClick: (n: Notification) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-50">
      <button
        className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-slate-600 transition-colors rounded-xl md:rounded-full hover:bg-slate-100 ${isOpen ? "text-[#001E45] bg-sky-50" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <BellIcon className="w-6 h-6 md:w-7 md:h-7" />
        {/* Badge - Only show if unreadCount > 0 */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#001E45] rounded-full ring-1 ring-white"></span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between p-3 border-b border-gray-50 bg-gray-50/50">
              <span className="font-semibold text-gray-900 text-sm">알림</span>
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-xs text-gray-400 hover:text-[#001E45]"
                >
                  모두 읽음
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {notifications.map((noti) => (
                    <button
                      key={noti.id}
                      onClick={() => {
                        onNotificationClick(noti);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors flex gap-3 ${!noti.is_read ? "bg-sky-50" : ""}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!noti.is_read ? "bg-[#001E45]" : "bg-gray-200"}`}
                      />
                      <div>
                        <p
                          className={`text-sm ${!noti.is_read ? "font-semibold text-gray-900" : "text-gray-600"}`}
                        >
                          {noti.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {noti.message}
                        </p>
                        <p className="text-[10px] text-gray-300 mt-1">
                          {new Date(noti.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 text-xs">
                  새로운 알림이 없습니다.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [allMenuItems, setAllMenuItems] = useState<NavMenuItem[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  // Removed showNotifications state as it is now inside NotificationDropdown
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [gnbSectionTabs, setGnbSectionTabs] =
    useState<TabMenuItem[]>(DEFAULT_GNB_TABS);

  useEffect(() => {
    setShowAccountMenu(false);
    setShowDesktopMenu(false);
    setIsHeaderVisible(true);
  }, [location.pathname]);

  useEffect(() => {
    let previousY = window.scrollY;
    let direction = 0;
    let distance = 0;

    const handleScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const change = currentY - previousY;
      previousY = currentY;

      if (currentY <= 40 || showMobileMenu || showDesktopMenu || showAccountMenu) {
        distance = 0;
        setIsHeaderVisible(true);
        return;
      }

      const nextDirection = Math.sign(change);
      if (nextDirection === 0) return;
      distance = nextDirection === direction ? distance + Math.abs(change) : Math.abs(change);
      direction = nextDirection;

      if (distance >= 4) {
        if (nextDirection < 0) setIsHeaderVisible(true);
        else if (currentY > 120) setIsHeaderVisible(false);
        distance = 0;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showMobileMenu, showDesktopMenu, showAccountMenu]);

  const resolveGnbTabPath = (tab: TabMenuItem) => {
    const raw = (tab.link || "").trim();
    if (!raw || raw === "/") {
      return GNB_ROUTE_BY_NAME[tab.name] || "/";
    }
    return raw;
  };

  const isGnbSectionActive = (path: string) => {
    const [targetPathRaw, targetQueryRaw = ""] = path.split("?");
    const targetPath = targetPathRaw.replace(/\/+$/, "") || "/";
    const normalizedCurrent = location.pathname.replace(/\/+$/, "") || "/";

    if (targetPath !== normalizedCurrent) {
      if (targetPath === "/") return false;
      if (!targetQueryRaw && normalizedCurrent.startsWith(`${targetPath}/`)) {
        return true;
      }
      return false;
    }

    if (!targetQueryRaw) {
      return true;
    }

    const currentParams = new URLSearchParams(location.search);
    const targetParams = new URLSearchParams(targetQueryRaw);

    for (const [key, value] of targetParams.entries()) {
      if (currentParams.get(key) !== value) {
        return false;
      }
    }

    return true;
  };

  // Fetch notifications
  useEffect(() => {
    if (user) {
      const fetchNotis = async () => {
        const data = await getNotifications(user.uid);
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      };
      fetchNotis();
      // Optional: Set up real-time subscription here
      const interval = setInterval(fetchNotis, 30000); // Polling every 30s as simple fallback
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, location.pathname]); // Re-fetch on navigation

  const handleNotificationClick = async (noti: Notification) => {
    if (!noti.is_read) {
      await markAsRead(noti.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === noti.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (noti.link_url) {
      window.location.href = noti.link_url;
    }
  };

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllAsRead(user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const loadNavItems = async () => {
      try {
        const [menuData, tabData] = await Promise.all([
          getAllNavMenuItems(),
          getTabMenuItems(),
        ]);
        setAllMenuItems(menuData);
        setGnbSectionTabs(tabData.length > 0 ? tabData : DEFAULT_GNB_TABS);
      } catch (error) {
        console.error("Failed to load sections:", error);
        setGnbSectionTabs(DEFAULT_GNB_TABS);
      }
    };
    loadNavItems();
  }, []);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setShowMobileMenu(false);
    setShowDesktopMenu(false);

    if (location.pathname === "/" && !location.search && !location.hash) {
      event.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  };

  return (
    <header className={`w-full bg-white pointer-events-auto transition-transform duration-300 ease-out motion-reduce:transition-none ${isHeaderVisible ? '' : '-translate-y-full pointer-events-none'}`}>
      <div className={`w-full bg-white ${location.pathname === '/' ? '' : 'border-b border-gray-200 shadow-sm'}`}>
        {/* Top Utility Links - Premium Subtle Style */}
        <div className="hidden md:block xl:hidden bg-[#F8F9FA] border-b border-gray-100 py-2">
          <Container>
            <div className="flex justify-end gap-5 text-[12px] text-gray-500 font-medium items-center">
              {user ? (
                <>
                  <span className="text-gray-900">
                    {user.displayName || user.email}님 안녕하세요
                  </span>
                  <div className="w-px h-3 bg-gray-300 mx-1" />
                  <button
                    onClick={logout}
                    className="hover:text-gray-900 transition-colors"
                  >
                    로그아웃
                  </button>
                  <Link
                    to="/mypage"
                    className="hover:text-gray-900 transition-colors"
                  >
                    마이페이지
                  </Link>
                  <Link
                    to="/quote-cart"
                    className="hover:text-gray-900 transition-colors"
                  >
                    장바구니
                  </Link>
                  <Link
                    to="/cs"
                    className="hover:text-gray-900 transition-colors"
                  >
                    고객센터
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hover:text-gray-900 transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/signup"
                    className="hover:text-gray-900 transition-colors"
                  >
                    회원가입
                  </Link>
                  <Link
                    to="/mypage"
                    className="hover:text-gray-900 transition-colors"
                  >
                    마이페이지
                  </Link>
                  <Link
                    to="/quote-cart"
                    className="hover:text-gray-900 transition-colors"
                  >
                    장바구니
                  </Link>
                  <Link
                    to="/cs"
                    className="hover:text-gray-900 transition-colors"
                  >
                    고객센터
                  </Link>
                </>
              )}
            </div>
          </Container>
        </div>

        {/* Main Header Area */}
        <div className="h-[54px] md:h-[72px] xl:h-[82px] bg-white border-b border-gray-100 relative z-50">
          <Container className="h-full">
            <div className="h-full flex items-center justify-between gap-4 xl:gap-7">
              {/* Logo and Subtitle */}
              <Link
                to="/"
                onClick={handleLogoClick}
                className="flex-shrink-0 flex items-center gap-1.5 md:gap-2"
              >
                <img
                  src="/logo.png"
                  alt="렌탈어때"
                  className="h-[1.8rem] md:h-[2.0rem] object-contain"
                />
              </Link>

              <nav className="hidden xl:flex h-full items-center gap-1 flex-1 ml-7" aria-label="주요 메뉴">
                <div
                  className="h-full flex items-center"
                  onMouseEnter={() => setShowDesktopMenu(true)}
                >
                  <button
                    type="button"
                    onClick={() => { setShowDesktopMenu(false); navigate('/products'); }}
                    onFocus={() => setShowDesktopMenu(true)}
                    aria-expanded={showDesktopMenu}
                    className={`h-full inline-flex items-center gap-2 px-3 text-[15px] font-semibold whitespace-nowrap transition-colors ${showDesktopMenu ? 'text-[#00659b]' : 'text-[#102a47] hover:text-[#00659b]'}`}
                  >
                    렌탈 상품 <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {gnbSectionTabs.map((tab) => {
                  const path = resolveGnbTabPath(tab);
                  const isExternal = /^https?:\/\//i.test(path);
                  const className = `px-3 text-[14px] font-medium whitespace-nowrap transition-colors ${!isExternal && isGnbSectionActive(path) ? 'text-[#00659b]' : 'text-slate-600 hover:text-[#00659b]'}`;
                  return isExternal ? (
                    <a key={tab.id || `${tab.name}-${path}`} href={path} target="_blank" rel="noopener noreferrer" onMouseEnter={() => setShowDesktopMenu(false)} className={className}>{tab.name}</a>
                  ) : (
                    <Link key={tab.id || `${tab.name}-${path}`} to={path} onMouseEnter={() => setShowDesktopMenu(false)} className={className}>{tab.name}</Link>
                  );
                })}
              </nav>

              <div className="hidden md:block xl:hidden flex-1" />

              {/* Right Aligned Area: Search + Actions */}
              <div className="flex items-center gap-1 xl:gap-4 justify-end">
                {/* Search Bar (Desktop only, mobile relies on BottomNav) */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const target = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
                    if (target?.value.trim()) {
                      navigate(`/search?q=${encodeURIComponent(target.value.trim())}`);
                    }
                  }}
                  className="hidden md:flex flex-none relative group w-[320px] xl:w-[210px] 2xl:w-[250px]"
                  onMouseEnter={() => setShowDesktopMenu(false)}
                >
                  <input
                    name="q"
                    type="text"
                    placeholder="무엇을 도와드릴까요?"
                    className="w-full h-[40px] md:h-[44px] pl-5 pr-11 rounded-full bg-[#f3f6f9] border border-transparent focus:border-slate-200 focus:ring-0 focus:bg-white transition-all text-[13px] text-slate-700 placeholder-slate-400 text-ellipsis overflow-hidden whitespace-nowrap"
                  />
                  <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#001E45] transition-colors">
                    <Search className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </form>

                {/* Actions (Both Mobile & Desktop) */}
                <div className="flex items-center gap-0 relative z-50" onMouseEnter={() => setShowDesktopMenu(false)}>
                  <Link
                    to={user ? "/mypage" : "/login"}
                    className="hidden md:flex xl:hidden w-10 h-10 md:w-12 md:h-12 items-center justify-center text-gray-800 transition-colors rounded-full hover:bg-gray-100"
                    aria-label={user ? '마이페이지' : '로그인'}
                  >
                    <ProfileIcon className="w-6 h-6 md:w-7 md:h-7" />
                  </Link>
                  <div className="hidden xl:block relative">
                    <button
                      type="button"
                      onClick={() => setShowAccountMenu((value) => !value)}
                      aria-label="계정 메뉴"
                      aria-expanded={showAccountMenu}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <ProfileIcon className="w-6 h-6" />
                    </button>
                    {showAccountMenu && (
                      <>
                        <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="계정 메뉴 닫기" onClick={() => setShowAccountMenu(false)} />
                        <div className="absolute right-0 top-full mt-3 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_18px_48px_rgba(7,35,65,0.16)] z-50 text-sm">
                          {user && <p className="px-3 py-2 text-xs text-slate-500 truncate">{user.displayName || user.email}</p>}
                          <Link to={user ? '/mypage' : '/login'} className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">{user ? '마이페이지' : '로그인'}</Link>
                          {!user && <Link to="/signup" className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">회원가입</Link>}
                          <Link to="/quote-cart" className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">장바구니</Link>
                          <Link to="/cs" className="block rounded-lg px-3 py-2.5 hover:bg-slate-50">고객센터</Link>
                          {user && <button type="button" onClick={() => { setShowAccountMenu(false); logout(); }} className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-slate-50">로그아웃</button>}
                        </div>
                      </>
                    )}
                  </div>
                  <Link to="/quote-cart" aria-label="장바구니" className="hidden xl:flex w-10 h-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"><ShoppingBag className="w-5 h-5" /></Link>
                  <div className="relative z-[60]">
                    <NotificationDropdown
                      notifications={notifications}
                      unreadCount={unreadCount}
                      onMarkAllRead={handleMarkAllRead}
                      onNotificationClick={handleNotificationClick}
                    />
                  </div>
                  {/* Mobile Menu Toggle Button */}
                  <button
                    className="md:hidden w-10 h-10 flex items-center justify-center text-gray-800 hover:bg-gray-100 rounded-full"
                    onClick={() => setShowMobileMenu(true)}
                  >
                    <MobileMenuIcon className="w-6 h-6 object-contain" />
                  </button>
                </div>
              </div>
            </div>
          </Container>
          <div
            className={`hidden xl:block absolute top-full left-0 w-full z-50 transition-all duration-200 ${showDesktopMenu ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
            onMouseEnter={() => setShowDesktopMenu(true)}
            onMouseLeave={() => setShowDesktopMenu(false)}
          >
            <FullMenu variant="desktop" items={allMenuItems} onClose={() => setShowDesktopMenu(false)} />
          </div>
        </div>

        {/* Premium GNB - Horizontal Scroll on Mobile, Centered on Desktop */}
        <div className={`block xl:hidden border-t ${location.pathname === '/' ? '' : 'border-b'} border-gray-100 relative bg-white z-40`}>
          <Container>
            <div className="relative flex justify-start w-full h-[44px] md:h-[56px] transition-all duration-300">
              <nav className="flex h-full items-stretch justify-start gap-1 min-[375px]:gap-2 sm:gap-6 md:gap-2 w-max min-w-full md:w-auto overflow-x-auto md:overflow-visible no-scrollbar scroll-smooth snap-x md:-ml-4 px-0">
                <div
                  className="hidden md:block h-full"
                  onMouseEnter={() => setShowDesktopMenu(true)}
                  onMouseLeave={() => setShowDesktopMenu(false)}
                >
                  <button
                    onClick={() => { setShowDesktopMenu(false); navigate("/products"); }}
                    className={`relative flex h-full items-center gap-2 whitespace-nowrap text-[15px] font-[550] px-4 transition-all after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 md:after:-bottom-[2px] after:h-[2px] after:transition-colors ${showDesktopMenu ? "text-[#001E45] after:bg-[#001E45]" : "text-gray-600 hover:text-[#001E45] after:bg-transparent hover:after:bg-[#001E45]"}`}
                  >
                    <MenuIcon className="w-6 h-6" /> 전체 메뉴
                  </button>
                </div>

                {gnbSectionTabs.map((tab) => {
                  const path = resolveGnbTabPath(tab);
                  const isExternal = /^https?:\/\//i.test(path);
                  const isActive = !isExternal && isGnbSectionActive(path);
                  const className = `relative flex h-full flex-shrink-0 items-center whitespace-nowrap text-[14px] min-[357px]:text-[15px] font-[550] transition-all px-1 min-[375px]:px-2 sm:px-4 after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 md:after:-bottom-[2px] after:h-[2px] after:transition-colors ${isActive
                    ? 'text-[#001E45] after:bg-[#001E45]'
                    : 'text-gray-600 hover:text-[#001E45] after:bg-transparent hover:after:bg-[#001E45]'
                    }`;

                  if (isExternal) {
                    return (
                      <a
                        key={tab.id || `${tab.name}-${path}`}
                        href={path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                      >
                        {tab.name}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={tab.id || `${tab.name}-${path}`}
                      to={path}
                      className={className}
                    >
                      {tab.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
            </div>
          </Container>

          {/* Desktop Mega Menu Dropdown */}
          <div
            className={`
              absolute top-full left-0 w-full z-50 transition-all duration-300 ease-in-out origin-top block
              ${showDesktopMenu ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible pointer-events-none"}
            `}
            onMouseEnter={() => setShowDesktopMenu(true)}
            onMouseLeave={() => setShowDesktopMenu(false)}
          >
            <FullMenu
              variant="desktop"
              items={allMenuItems}
              onClose={() => setShowDesktopMenu(false)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Full Menu Overlay */}
      {showMobileMenu && (
        <FullMenu variant="mobile" onClose={() => setShowMobileMenu(false)} />
      )}
    </header>
  );
};
