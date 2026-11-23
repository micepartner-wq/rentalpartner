import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Phone } from 'lucide-react';
import { useConsultInfo } from '../src/hooks/useConsultInfo';
import { isConsultBarRoute, toTelHref } from '../src/utils/consultBar';

/**
 * 모바일 하단에 항상 떠 있는 상담 바(전화 · 카카오톡 · 견적 요청).
 * 운영 상태(상담 가능/운영 종료)를 함께 보여 줘서, 연결이 안 될 시간에는 카톡·견적으로 유도한다.
 * 이미 하단에 고정된 요소가 있는 화면에서는 숨기고, 그 화면에서는 기존 플로팅 버튼이 보인다.
 */
export const MobileConsultBar: React.FC = () => {
  const { pathname } = useLocation();
  const { phone, chat_url: chatUrl, status } = useConsultInfo();

  if (!isConsultBarRoute(pathname)) return null;

  return (
    <nav
      aria-label="빠른 상담"
      className="fixed inset-x-0 bottom-0 z-[85] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden print:hidden"
    >
      <p role="status" className="flex items-center justify-center gap-1.5 px-3 pt-2 text-[11px] font-semibold text-slate-600">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        {status.label}
      </p>
      <div className="grid grid-cols-3 gap-2 px-3 pb-2.5 pt-1.5">
        <a
          href={toTelHref(phone)}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-[13px] font-bold text-slate-800 active:bg-slate-100"
          aria-label={`전화 상담 ${phone}`}
        >
          <Phone size={16} aria-hidden="true" />
          전화 상담
        </a>
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#fde500] text-[13px] font-bold text-[#191919] active:brightness-95"
        >
          <img src="/kakao.png" alt="" className="h-5 w-5 rounded-md" />
          카카오톡
        </a>
        <Link
          to="/quote-request"
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#001e45] text-[13px] font-bold text-white active:bg-[#002b63]"
        >
          <FileText size={16} aria-hidden="true" />
          견적 요청
        </Link>
      </div>
    </nav>
  );
};
