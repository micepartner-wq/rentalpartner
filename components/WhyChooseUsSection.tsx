import React from 'react';
import { Container } from './ui/Container';
import { TrendingDown, Calculator, Award, Handshake } from 'lucide-react';

const reasons = [
  {
    icon: <TrendingDown size={32} />,
    title: "초기 비용 절감",
    description: "목돈 부담 없이 월 렌탈료만으로 최신 장비를 즉시 도입할 수 있습니다."
  },
  {
    icon: <Calculator size={32} />,
    title: "세금 혜택",
    description: "매월 발생하는 렌탈료는 전액 비용 처리되어 확실한 절세 효과를 누릴 수 있습니다."
  },
  {
    icon: <Award size={32} />,
    title: "대전 MICE 우수기업",
    description: "검증된 전문성과 다수의 대형 프로젝트 레퍼런스로 안정적인 서비스를 제공합니다."
  },
  {
    icon: <Handshake size={32} />,
    title: "수의계약 가능",
    description: "장애인기업 인증 업체로 공공기관 우선 구매 및 수의계약 진행이 가능합니다."
  }
];

export const WhyChooseUsSection: React.FC = () => {
  return (
    <section className="bg-white py-14 md:py-24">
      <Container>
        <div className="text-center mb-16">

          <h2 className="text-2xl font-bold text-slate-800 md:text-4xl px-4 break-keep">
            렌탈어때를 선택해야 하는 4가지 이유
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
          {reasons.map((reason, i) => (
            <div key={i} className="group flex flex-col items-center text-center p-4 sm:p-6 md:p-8 rounded-2xl border border-slate-100 bg-slate-50 transition-all hover:-translate-y-2 hover:bg-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
              <div className="mb-4 md:mb-6 flex h-14 w-14 md:h-[72px] md:w-[72px] items-center justify-center rounded-2xl bg-blue-50 text-[#001E45] shadow-sm transition-all duration-300 group-hover:bg-[#001E45] group-hover:text-white group-hover:shadow-md [&>svg]:w-6 [&>svg]:h-6 md:[&>svg]:w-8 md:[&>svg]:h-8">
                {reason.icon}
              </div>
              <h3 className="mb-2 md:mb-4 text-[15px] md:text-xl font-bold text-slate-800 break-keep">{reason.title}</h3>
              <p className="text-[13px] md:text-[15px] leading-snug md:leading-relaxed text-slate-500 break-keep">{reason.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
