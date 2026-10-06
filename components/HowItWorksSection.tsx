import React from 'react';
import { Container } from './ui/Container';
import { FileText, PhoneCall, FileSignature, Truck, Settings } from 'lucide-react';

const steps = [
  { icon: <FileText size={24} />, title: "견적 문의", desc: "원하는 상품 견적 요청" },
  { icon: <PhoneCall size={24} />, title: "맞춤 상담", desc: "전문 매니저 1:1 상담" },
  { icon: <FileSignature size={24} />, title: "계약", desc: "조건 확정 및 전자 계약" },
  { icon: <Truck size={24} />, title: "설치/납품", desc: "원하는 일정에 전국 배송" },
  { icon: <Settings size={24} />, title: "사후관리", desc: "철저한 A/S 및 유지보수" }
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="bg-slate-50 py-14 md:py-24 border-t border-slate-100 overflow-hidden">
      <Container>
        <div className="text-center mb-20">

          <h2 className="text-2xl font-bold text-slate-800 md:text-4xl px-4 break-keep">
            쉽고 빠른 B2B 렌탈 진행 절차
          </h2>
        </div>
        <div className="relative">
          {/* Connecting Line for PC */}
          <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[2px] bg-slate-200">
            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-teal-400/20 via-[#001E45]/20 to-teal-400/20"></div>
          </div>
          
          <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-5 md:gap-y-12 md:gap-x-4 pb-8 md:pb-0 snap-x snap-mandatory scrollbar-hide [&::-webkit-scrollbar]:hidden px-1">
            {steps.map((step, i) => (
              <div key={i} className="group relative z-10 flex flex-col items-center text-center min-w-[150px] snap-start">
                <div className="mb-5 flex h-[72px] w-[72px] md:h-[80px] md:w-[80px] items-center justify-center rounded-full border-[6px] border-white bg-[#001E45] text-white shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:bg-teal-500 [&>svg]:w-6 [&>svg]:h-6 md:[&>svg]:w-6 md:[&>svg]:h-6">
                  {step.icon}
                </div>
                <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[13px] font-bold text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-700 transition-colors">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-[16px] md:text-[17px] font-bold text-slate-800 break-keep">{step.title}</h3>
                <p className="text-[13px] md:text-[14px] text-slate-500 break-keep">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};
