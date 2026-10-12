import React from 'react';
import { Container } from './ui/Container';

const steps = [
  { title: '견적 문의', desc: '필요한 상품과 이용 기간을 알려주세요.' },
  { title: '맞춤 상담', desc: '용도와 예산에 맞는 구성을 함께 찾습니다.' },
  { title: '계약 확정', desc: '렌탈 조건과 설치 일정을 확인합니다.' },
  { title: '설치 · 납품', desc: '협의한 장소와 일정에 맞춰 준비합니다.' },
  { title: '이용 · 관리', desc: '이용 중 필요한 사항을 담당자에게 문의하세요.' },
];
export const HowItWorksSection: React.FC = () => (
  <section className="home-service home-service-process" aria-labelledby="home-service-process-title">
    <Container>
      <div className="home-service-section-heading">
        <div><p className="home-service-eyebrow">HOW IT WORKS</p><h2 id="home-service-process-title" className="home-service-title">시작은 간단하게.<br />준비는 차근차근.</h2></div>
        <p className="home-service-intro">문의부터 설치, 이용 관리까지<br />렌탈의 흐름을 한눈에 확인하세요.</p>
      </div>
      <ol className="home-service-steps">
        {steps.map((step, index) => <li key={step.title}><span className="home-service-step-number" aria-hidden="true">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.desc}</p></div></li>)}
      </ol>
    </Container>
  </section>
);
