import React from 'react';
import { Container } from './ui/Container';
import { Link } from 'react-router-dom';
import { HeadphonesIcon, ArrowRight } from 'lucide-react';

export const BottomCtaSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-[#001E45] py-16 md:py-24">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 h-[500px] w-[500px] rounded-full bg-teal-400/10 blur-3xl"></div>
      
      <Container className="relative z-10">
        <div className="flex flex-col items-center justify-center text-center text-white">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <HeadphonesIcon size={36} className="text-teal-400" />
          </div>
          
          <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight md:text-5xl lg:text-[52px]">
            직접 상담받고 싶으신가요?
          </h2>
          
          <p className="mb-12 max-w-2xl text-[17px] font-light leading-relaxed text-blue-100/80 md:text-[19px]">
            추천 마법사로 정리가 안 되는 요청도 괜찮습니다.<br className="hidden md:block" />
            B2B 렌탈 전문가가 예산과 용도를 듣고 맞춤 견적을 안내해 드립니다.
          </p>
          
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link 
              to="/quote-request" 
              className="group flex items-center justify-center gap-2.5 rounded-full bg-teal-400 px-7 py-3.5 text-[16px] font-bold text-[#001E45] shadow-[0_10px_30px_rgba(45,212,191,0.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-teal-300 hover:shadow-[0_15px_40px_rgba(45,212,191,0.4)] md:px-8 md:py-4 md:text-[18px]"
            >
              다이렉트 1:1 견적
              <ArrowRight size={22} className="transition-transform duration-300 group-hover:translate-x-1.5" />
            </Link>
            <a
              href="tel:18001985"
              className="rounded-full border border-white/30 px-7 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-white/10 md:px-8 md:py-4 md:text-[18px]"
            >
              전화 1800-1985
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
};
