import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** 사이트 이미지의 우클릭 메뉴와 끌어서 저장을 막는다(관리자 화면은 제외). 글자 선택·복사는 그대로 둔다. */
export const ImageProtection = () => {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) return undefined;
    const block = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement) event.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, [isAdmin]);

  return null;
};
