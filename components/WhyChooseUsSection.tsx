import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Container } from './ui/Container';
import './HomeServiceSections.css';

export const WhyChooseUsSection: React.FC = () => (
  <section className="home-service home-service-trust" aria-labelledby="home-service-trust-title">
    <Container>
      <div className="home-service-trust-layout">
        <div>
          <p className="home-service-eyebrow">WHY RENTAL</p>
          <h2 id="home-service-trust-title" className="home-service-title">장비를 넘어,<br />함께 준비하는 파트너.</h2>
          <p className="home-service-intro">업무 공간부터 행사 현장까지.<br />필요한 장비와 이용 조건을 함께 살펴봅니다.</p>
          <dl className="home-service-values">
            <div><dt>필요한 만큼 유연하게</dt><dd>구매 부담을 줄이고, 용도와 기간에 맞는 렌탈을 상담하세요.</dd></div>
            <div><dt>준비부터 이용까지</dt><dd>상품 선택, 설치 일정, 이용 중 관리까지 담당자와 확인할 수 있습니다.</dd></div>
          </dl>
        </div>
        <div className="home-service-certificates">
          <p className="home-service-cert-heading">렌탈어때의 인증 · 지정 내역</p>
          <div className="home-service-cert-grid">
            <div className="home-service-cert">
              <div className="home-service-cert-image"><img src="/cert-disabled.jpg" alt="장애인기업 확인서" loading="lazy" /></div>
              <span>장애인기업 인증</span>
            </div>
            <a href="https://www.daejeoncvb.kr/alliance/view/search_field/eNortjI0slJKzs8tSMyrjM9LzE1VsgZcMESdBsE~/search_keyword/eNortjI0tVJ6O2fL6xV73vb0vO3a8bqlQ8kaXDCNTQyE/page/1/id/80" target="_blank" rel="noopener noreferrer" className="home-service-cert">
              <div className="home-service-cert-image"><img src="/cert-mice.jpg" alt="대전 MICE 우수기업 인증 자료" loading="lazy" /></div>
              <span>대전 MICE 우수기업 <ArrowUpRight size={18} aria-hidden="true" /></span>
              <small>기업 소개 보기 · 새 창</small>
            </a>
          </div>
        </div>
      </div>
    </Container>
  </section>
);
