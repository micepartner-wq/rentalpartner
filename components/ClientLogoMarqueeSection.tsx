import React from 'react';
import { Container } from './ui/Container';

// 현재 public/logos 폴더에 있는 19개의 이미지들입니다.
const clientsRow1 = [
  '/logos/1773280725490_v9z9bg.svg',
  '/logos/1773280741121_v0hg30.png',
  '/logos/1773280821120_1dgcuh.png',
  '/logos/1773280832492_3lrpja.png',
  '/logos/1773280967778_kwm81g.svg',
  '/logos/1773281107907_yebrz5.webp',
  '/logos/1773281170530_5e4bqk.png',
  '/logos/1773281297036_vv31o7.jpg',
  '/logos/1773281888199_9vhz9k.png',
  '/logos/1773282781619_fdevih.png',
];

const clientsRow2 = [
  '/logos/1773282795161_1vvz12.svg',
  '/logos/APwordmark.jpg',
  '/logos/Doosan_Logo.jpg',
  '/logos/Flag_of_Junggu,_Daejeon.svg.png',
  '/logos/logo1.svg',
  '/logos/logo2.png',
  '/logos/logo3.jpg',
  '/logos/logo5.webp',
  '/logos/logo6.png',
];

export const ClientLogoMarqueeSection: React.FC = () => {
  return (
    <section className="border-y border-slate-100 bg-white py-10 md:py-16 overflow-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
        .animate-marquee-reverse {
          animation: marquee 35s linear infinite reverse;
        }
      `}</style>
      <Container>
        <div className="text-center mb-10">
          <p className="text-sm font-bold tracking-widest text-[#001E45] mb-3">비즈니스 파트너</p>
          <h2 className="text-2xl font-bold text-slate-800 md:text-3xl px-4 break-keep">
            이미 많은 기업들이 렌탈어때와 함께하고 있습니다
          </h2>
        </div>
      </Container>
      
      <div className="relative flex flex-col gap-5 md:gap-8 w-full overflow-hidden">
        {/* 첫 번째 줄: 왼쪽으로 이동 */}
        <div className="animate-marquee whitespace-nowrap flex items-center gap-8 md:gap-24 px-6 w-max">
          {[...clientsRow1, ...clientsRow1, ...clientsRow1, ...clientsRow1].map((logo, i) => (
            <div key={`r1-${i}`} className="flex h-12 w-[120px] md:h-16 md:w-[170px] items-center justify-center">
              <img src={logo} alt="Partner Logo" className="max-h-full max-w-full object-contain" />
            </div>
          ))}
        </div>
        
        {/* 두 번째 줄: 오른쪽으로 이동 */}
        <div className="animate-marquee-reverse whitespace-nowrap flex items-center gap-8 md:gap-24 px-6 w-max">
          {[...clientsRow2, ...clientsRow2, ...clientsRow2, ...clientsRow2].map((logo, i) => (
            <div key={`r2-${i}`} className="flex h-12 w-[120px] md:h-16 md:w-[170px] items-center justify-center">
              <img src={logo} alt="Partner Logo" className="max-h-full max-w-full object-contain" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
