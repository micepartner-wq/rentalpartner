import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Download, Share } from 'lucide-react';

/**
 * 관리자 화면에서만 앱(PWA) 설치 정보를 head 에 넣는다. 고객용 사이트에는 매니페스트가 없어서
 * 고객이 관리자 앱을 설치하라는 안내를 받을 일이 없다.
 */
export function AdminPwaHead() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => { /* 설치 기능만 빠질 뿐 화면은 정상 동작 */ });
  }, []);
  return (
    <Helmet>
      <link rel="manifest" href="/admin.webmanifest" />
      <meta name="theme-color" content="#001E45" />
      <link rel="apple-touch-icon" href="/app/apple-touch-icon.png" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="렌탈어때" />
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandaloneMode = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

/** 설치 상태: 안드로이드(크롬)는 설치 버튼, 아이폰(사파리)은 '홈 화면에 추가' 안내를 보여 준다. */
export function useAppInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneMode());
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setDeferred(event as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return {
    installed,
    canPrompt: Boolean(deferred) && !installed,
    showIosGuide: isIos && !installed,
    install: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => undefined);
      setDeferred(null);
    },
  };
}

/** 앱 설치 안내 카드(이미 앱으로 열었거나 설치할 수 없는 환경에서는 나오지 않는다). */
export function AppInstallCard() {
  const { installed, canPrompt, showIosGuide, install } = useAppInstall();
  if (installed || (!canPrompt && !showIosGuide)) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Download size={16} aria-hidden="true" /> 앱으로 설치하기</p>
      {canPrompt ? (
        <>
          <p className="mt-1 text-xs text-slate-500">홈 화면에 "렌탈어때" 아이콘이 생기고, 눌러서 바로 견적·문의를 확인할 수 있어요.</p>
          <button type="button" onClick={() => void install()} className="mt-3 w-full rounded-xl bg-[#001E45] py-3 text-sm font-semibold text-white">홈 화면에 설치</button>
        </>
      ) : (
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs leading-6 text-slate-600">
          사파리 하단의 <Share size={14} aria-label="공유" className="inline" /> 공유 버튼 → <b>홈 화면에 추가</b>를 누르세요.
        </p>
      )}
    </div>
  );
}
