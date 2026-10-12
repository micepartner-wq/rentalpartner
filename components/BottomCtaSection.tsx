import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Container } from './ui/Container';

export const BottomCtaSection: React.FC = () => (
  <section className="home-service home-service-contact" aria-labelledby="home-service-contact-title">
    <Container>
      <div className="home-service-contact-layout">
        <div><p className="home-service-eyebrow">LET’S GET STARTED</p><h2 id="home-service-contact-title">다음 공간을,<br /><span>함께 준비할까요?</span></h2><p className="home-service-intro">아직 상품을 정하지 못했어도 괜찮습니다.<br />필요한 용도와 일정을 알려주세요.</p></div>
        <div className="home-service-contact-actions">
          <Link to="/quote-request" className="home-service-quote-link"><span><small>나에게 맞는 구성 찾기</small><strong>맞춤 견적 요청</strong></span><ArrowRight size={28} aria-hidden="true" /></Link>
          <a href="tel:18001985" className="home-service-phone-link"><span><small>전화로 상담하기</small><strong>1800-1985</strong></span><ArrowUpRight size={25} aria-hidden="true" /></a>
        </div>
      </div>
    </Container>
  </section>
);
