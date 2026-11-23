import React from 'react';
import { Phone } from 'lucide-react';
import { useConsultInfo } from '../src/hooks/useConsultInfo';
import { toTelHref } from '../src/utils/consultBar';

/** PC 플로팅 버튼 위에 놓이는 상담 카드: 운영 상태, 대표번호, 운영시간. */
export const ConsultStatusCard: React.FC = () => {
  const { phone, business_hours_text: hoursText, status } = useConsultInfo();
  return (
    <a
      href={toTelHref(phone)}
      aria-label={`전화 상담 ${phone}. ${status.label}`}
      className="hidden w-[196px] flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1 hover:shadow-lg md:flex"
    >
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        {status.open ? status.label : status.state === 'lunch' ? '점심시간 · 13시 이후 상담' : '운영시간 외'}
      </span>
      <span className="flex items-center gap-1.5 text-[19px] font-bold tracking-tight text-[#001e45]">
        <Phone size={17} aria-hidden="true" />
        {phone}
      </span>
      <span className="line-clamp-2 break-keep text-[11px] leading-snug text-slate-500">{hoursText}</span>
    </a>
  );
};
