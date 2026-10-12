import React from 'react';
import { Container } from './ui/Container';

const clients = [
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

export const ClientLogoMarqueeSection: React.FC = () => (
  <section className="home-service home-service-clients" aria-labelledby="home-service-clients-title">
    <Container>
      <div className="home-service-section-heading">
        <div><p className="home-service-eyebrow">OUR CLIENTS</p><h2 id="home-service-clients-title" className="home-service-title">다양한 현장에서<br />함께해 온 이름들.</h2></div>
        <p className="home-service-intro">기업과 기관의 공간에<br />렌탈어때가 함께합니다.</p>
      </div>
    </Container>
    <div className="home-service-logo-marquee" aria-label="고객사 및 기관 로고">
      {[clients.slice(0, 10), clients.slice(10)].map((row, rowIndex) => (
        <div key={rowIndex} className="home-service-logo-track" data-reverse={rowIndex === 1}>
          {[0, 1].map(copy => (
            <div key={copy} className="home-service-logo-group" aria-hidden={copy === 1 || undefined}>
              {row.map((logo, index) => (
                <div key={logo} className="home-service-logo-item">
                  <img src={logo} alt={copy === 0 ? `고객사 및 기관 로고 ${rowIndex * 10 + index + 1}` : ''} loading="lazy" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  </section>
);
