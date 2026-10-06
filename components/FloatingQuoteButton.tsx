import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ChevronUp, ShoppingCart, MessageCircle, X } from 'lucide-react';
import { getQuoteCartCount } from '../src/utils/quoteCart';

// 이 값(px)만 내려가도 버튼이 나타난다.
const SHOW_AFTER_SCROLL_PX = 40;

const mobileLabelClass =
  'pointer-events-none absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white md:hidden';

export const FloatingQuoteButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [quoteCartCount, setQuoteCartCount] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > SHOW_AFTER_SCROLL_PX);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // 초기 마운트 시에도 한번 체크
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const updateCartCount = () => {
      setQuoteCartCount(getQuoteCartCount());
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hp_quote_cart_v1') {
        updateCartCount();
      }
    };

    updateCartCount();
    window.addEventListener('quoteCartUpdated', updateCartCount);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('quoteCartUpdated', updateCartCount);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsOpen(false);
  };

  const cartBadge =
    quoteCartCount > 0 ? (
      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
        {quoteCartCount > 99 ? '99+' : quoteCartCount}
      </span>
    ) : null;

  return (
    <>
      {/* 모바일: 메뉴가 열려 있을 때 바깥을 누르면 닫힘 */}
      {isVisible && isOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[89] bg-black/20 md:hidden"
        />
      )}

      <div
        className={`fixed bottom-[90px] right-4 z-[90] flex flex-col items-end gap-3 transition-all duration-500 ease-out md:bottom-8 md:right-8 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
        }`}
      >
        {/* 개별 버튼: PC는 항상 표시, 모바일은 메뉴를 열었을 때만 표시 */}
        <div className={`${isOpen ? 'flex' : 'hidden'} flex-col items-end gap-3 md:flex`}>
          {/* 1. 장바구니 버튼 */}
          <Link
            to="/quote-cart"
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-[#001e45] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1 hover:shadow-lg md:h-[50px] md:w-[50px]"
            aria-label="장바구니"
          >
            <ShoppingCart size={22} className="transition-transform group-hover:scale-110" />
            {cartBadge}
            <span className={mobileLabelClass}>장바구니</span>
          </Link>

          {/* 2. 카카오톡 상담 버튼 */}
          <a
            href="http://pf.kakao.com/_iRxghX/chat"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#fde500] shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1 hover:shadow-lg md:h-[50px] md:w-[50px]"
            aria-label="카카오톡 채널 상담"
          >
            <img
              src="/kakao.png"
              alt="카카오톡 채널 상담"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <span className={mobileLabelClass}>카카오톡 상담</span>
          </a>

          {/* 3. 간편 견적 문의 버튼 (빠른 견적 문의) */}
          <Link
            to="/quote-request"
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-[#001e45] text-white shadow-[0_8px_30px_rgba(0,30,69,0.3)] transition-all hover:-translate-y-1 hover:bg-[#002b63] hover:shadow-[0_12px_40px_rgba(0,30,69,0.4)] md:h-[50px] md:w-auto md:px-6"
            aria-label="빠른 견적 문의"
          >
            <FileText size={20} className="md:mr-2" />
            <span className="hidden text-[14px] font-semibold tracking-[0.01em] md:block">빠른 견적 문의</span>
            <span className={mobileLabelClass}>견적 문의하기</span>

            {/* Notification Ping dot */}
            <span className="absolute right-0 top-0 flex h-4 w-4 -translate-y-1/4 translate-x-1/4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-teal-500 border-2 border-white"></span>
            </span>
          </Link>

          {/* 4. 위로 가기 버튼 */}
          <button
            onClick={scrollToTop}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1 hover:bg-slate-50 hover:text-[#001e45] md:h-[50px] md:w-[50px]"
            aria-label="맨 위로 가기"
          >
            <ChevronUp size={24} />
            <span className={mobileLabelClass}>맨 위로</span>
          </button>
        </div>

        {/* 모바일 전용 메뉴 토글 */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={isOpen ? '메뉴 닫기' : '빠른 메뉴 열기'}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#001e45] text-white shadow-[0_8px_30px_rgba(0,30,69,0.3)] transition-all active:scale-95 md:hidden"
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
          {!isOpen && cartBadge}
        </button>
      </div>
    </>
  );
};
