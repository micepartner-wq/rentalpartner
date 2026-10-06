import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Calculator, Handshake, TrendingDown } from "lucide-react";
import { Container } from "../ui/Container";

const BENEFITS = [
  { icon: TrendingDown, title: "초기 비용 절감", description: "목돈 없이 월 렌탈료로 도입" },
  { icon: Calculator, title: "렌탈료 비용 처리", description: "매월 렌탈료 전액 비용 처리" },
  { icon: Award, title: "대전 MICE 우수기업", description: "다수의 대형 프로젝트 레퍼런스" },
  { icon: Handshake, title: "수의계약 가능", description: "장애인기업 인증, 공공기관 구매" },
];

export const ProductsTrustBar: React.FC = () => (
  <div className="border-b border-slate-100 bg-white min-[1720px]:hidden">
    <Container>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 md:grid-cols-4 md:py-5">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#001E45]">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-snug text-slate-800 break-keep md:text-[14px]">{title}</p>
              <p className="text-[12px] leading-snug text-slate-500 break-keep">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  </div>
);

// 넓은 화면에서 본문 왼쪽 여백에 떠서 스크롤을 따라다니는 혜택 안내.
// 부모(Container)에 relative 가 필요하다. 1720px 미만에서는 숨기고 ProductsTrustBar 가 대신 보인다.
// 넓은 화면에서 페이지 왼쪽 여백에 떠서 스크롤을 따라다니는 혜택 안내.
// 부모(페이지 본문 래퍼)에 relative 가 필요하다. 본문(max-w 1280px) 왼쪽 바깥에 붙고,
// 위쪽 pt-14 는 헤더의 "모든 상품" 제목 시작 높이에 맞춘 값이다.
// 1720px 미만에서는 숨기고 ProductsTrustBar 가 대신 보인다.
export const ProductsTrustRail: React.FC = () => (
  <aside
    aria-label="렌탈어때 혜택 안내"
    className="pointer-events-none absolute inset-y-0 right-[calc(50%+660px)] z-10 hidden w-[200px] pt-14 min-[1720px]:block"
  >
    <ul className="pointer-events-auto sticky top-10 space-y-3">
      {BENEFITS.map(({ icon: Icon, title, description }) => (
        <li
          key={title}
          className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 shadow-[0_8px_24px_rgba(0,30,69,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,30,69,0.1)]"
        >
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#001E45] shadow-sm">
            <Icon size={20} aria-hidden="true" />
          </span>
          <p className="text-[14px] font-bold leading-snug text-slate-800 break-keep">{title}</p>
          <p className="mt-1 text-[12px] leading-snug text-slate-500 break-keep">{description}</p>
        </li>
      ))}
    </ul>
  </aside>
);

export const ProductsQuoteBanner: React.FC = () => (
  <div className="mt-14 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#001E45] px-6 py-7 text-white md:flex-row md:items-center md:px-10 md:py-8">
    <div>
      <p className="text-lg font-bold break-keep md:text-xl">찾는 장비가 없거나 어떤 걸 골라야 할지 막막하신가요?</p>
      <p className="mt-1.5 text-sm text-blue-100/80 break-keep md:text-[15px]">
        예산과 용도를 알려 주시면 B2B 렌탈 전문가가 맞춤 견적을 제안해 드립니다.
      </p>
    </div>
    <Link
      to="/quote-request"
      className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-teal-400 px-6 py-3 text-[15px] font-bold text-[#001E45] transition-colors hover:bg-teal-300"
    >
      1:1 견적 상담
      <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
    </Link>
  </div>
);
