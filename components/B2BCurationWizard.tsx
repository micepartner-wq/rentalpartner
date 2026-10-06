import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Bot, Building2, Users, Monitor, Calendar, Target, ArrowRight } from 'lucide-react';
import { Container } from './ui/Container';

type AnswerState = Record<string, string>;

interface StepOption {
  label: string;
  value: string;
}

interface StepDef {
  id: string;
  question: string;
  icon: React.ReactNode;
  options: StepOption[];
  condition?: (answers: AnswerState) => boolean;
}

const ALL_STEPS: StepDef[] = [
  {
    id: 'event_type',
    question: '어떤 성격의 행사를 준비 중이신가요?',
    icon: <Building2 className="mb-4 h-8 w-8 text-blue-500" />,
    options: [
      { label: '일반 기업 행사 (세미나, 워크숍)', value: 'corp' },
      { label: '전시 및 행사(부스,축제)', value: 'expo' },
      { label: '공공기관(감사실,시험장)', value: 'public' },
      { label: '임시 사무 공간 (건설현장, 캠프)', value: 'office' },
    ],
  },
  {
    id: 'sub_corp',
    question: '가장 비중이 큰 행사 형태는 무엇인가요?',
    icon: <Users className="mb-4 h-8 w-8 text-indigo-500" />,
    condition: (ans) => ans.event_type === 'corp',
    options: [
      { label: '사내 워크숍 및 팀빌딩', value: 'workshop' },
      { label: '기업 세미나 및 임직원 교육', value: 'seminar' },
      { label: '대규모 컨퍼런스 / 학술 대회', value: 'conference' },
      { label: '기타 (직접 상담 신청)', value: 'other' },
    ],
  },
  {
    id: 'sub_expo',
    question: '행사가 진행되는 주요 공간과 특징은 무엇인가요?',
    icon: <Target className="mb-4 h-8 w-8 text-sky-500" />,
    condition: (ans) => ans.event_type === 'expo',
    options: [
      { label: '실내 전시부스 운영', value: 'booth' },
      { label: '야외 축제 및 팝업 행사', value: 'festival' },
      { label: '모델하우스 및 분양 홍보관', value: 'modelhouse' },
      { label: '기타 (직접 상담 신청)', value: 'other' },
    ],
  },
  {
    id: 'sub_public',
    question: '어떤 성격의 공공/특수 목적이신가요?',
    icon: <Building2 className="mb-4 h-8 w-8 text-green-500" />,
    condition: (ans) => ans.event_type === 'public',
    options: [
      { label: '국정감사 등 대규모 감사/조사', value: 'audit' },
      { label: '공공기관 정기 보고 및 회의', value: 'meeting' },
      { label: '대규모 국가자격시험 운영', value: 'exam' },
      { label: '기타 (직접 상담 신청)', value: 'other' },
    ],
  },
  {
    id: 'sub_office',
    question: '임시 사무실이 설치되는 현장은 어디인가요?',
    icon: <Monitor className="mb-4 h-8 w-8 text-orange-500" />,
    condition: (ans) => ans.event_type === 'office',
    options: [
      { label: 'IT / 일반 비즈니스 프로젝트 룸', value: 'smart' },
      { label: '선거캠프 / 특수 조직 운영 본부', value: 'election' },
      { label: '건설 / 건축 현장 관리 사무소', value: 'construction' },
      { label: '기타 (직접 상담 신청)', value: 'other' },
    ],
  }
];

export const B2BCurationWizard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // 현재 답변 상태에 따라 보여져야 할 유효한 스텝들만 필터링
  const activeSteps = ALL_STEPS.filter(step => !step.condition || step.condition(answers));

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOptionSelect = (value: string) => {
    const stepId = activeSteps[currentStep].id;
    const newAnswers = { ...answers, [stepId]: value };
    setAnswers(newAnswers);

    // 업데이트된 답변으로 활성 스텝 다시 계산
    const nextActiveSteps = ALL_STEPS.filter(step => !step.condition || step.condition(newAnswers));

    if (currentStep < nextActiveSteps.length - 1) {
      setTimeout(() => setCurrentStep((prev) => prev + 1), 300);
    } else {
      setIsAnalyzing(true);
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowResult(true);
      }, 2000); // 2초 분석 로딩 애니메이션
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
    setIsAnalyzing(false);
  };

  const closeWizard = () => {
    setIsOpen(false);
    setTimeout(resetWizard, 300);
  };

  const getRecommendation = () => {
    const isOther = Object.values(answers).includes('other');
    if (isOther) {
      return {
        title: '1:1 맞춤형 특별 렌탈 상담',
        desc: '표준 패키지로 담기 어려운 특별한 행사나 공간이신가요? 휴먼파트너의 전문가가 고객님의 상황에 꼭 맞는 장비 세팅을 맞춤 컨설팅해 드립니다.',
        tags: ['무료 견적 상담', '맞춤형 세팅', '전문가 배정'],
        url: 'https://humanpartner.kr/quote-request',
        buttonText: '기타 상담 받으러가기'
      };
    }

    let title = '';
    let desc = '';
    let tags: string[] = [];
    let url = '/products'; // 나중에 실제 상품 리스트나 검색결과 URL로 연결할 수 있습니다.
    let buttonText = '추천된 맞춤 상품들 둘러보기';

    // 1. 카테고리 및 세부 목적에 따른 패키지 매핑
    if (answers.event_type === 'corp') {
      if (answers.sub_corp === 'workshop') {
         title = '기업 워크숍 올인원 패키지';
         desc = '임직원 간의 원활한 소통과 팀빌딩을 위한 워크숍 최적화 장비 세트';
         tags = ['빔프로젝터', '음향시스템', '레크리에이션 지원'];
         url = '/products/e10d5a1d-93aa-4c3a-8230-933caf2bd4a1';
      } else if (answers.sub_corp === 'seminar') {
         title = '기업 세미나 운영 패키지';
         desc = '전문적인 지식 전달과 집중도를 높이는 기업 교육 및 세미나 맞춤 세트';
         tags = ['대형 디스플레이', '강연용 마이크', '무선 프레젠터'];
         url = '/products/9f512fea-c298-4404-b047-bc3bda5ae994';
      } else {
         title = '컨퍼런스 올인원 운영 패키지';
         desc = '대규모 참석자를 수용하는 학술 대회 및 대형 컨퍼런스를 위한 마스터 세트';
         tags = ['다중 디스플레이', '전문 중계장비', 'VIP 대기실 세팅'];
         url = '/products/e552cb65-f250-4eef-984c-b53e3c3eeea8';
      }
    } else if (answers.event_type === 'expo') {
      if (answers.sub_expo === 'booth') {
         title = '전시부스 올인원 패키지';
         desc = '방문객의 시선을 사로잡는 세련된 실내 전시 및 부스 운영 세트';
         tags = ['사이니지 모니터', '디자인 가구', '키오스크'];
         url = '/products/a70a5f18-d2e2-450e-b1e1-31ba886c54e7';
      } else if (answers.sub_expo === 'festival') {
         title = '야외 축제 및 행사 패키지';
         desc = '날씨와 외부 환경에 강한 야외 행사 특화 장비 및 천막 풀세트';
         tags = ['야외용 천막', '대용량 발전기', '내구성 강한 가구'];
         url = '/products/7d8138c0-3744-4e0f-b1fe-d2c178f41828';
      } else {
         title = '모델하우스 및 분양 홍보관 패키지';
         desc = '고급스러운 방문객 경험을 제공하는 홍보관 특화 프리미엄 세트';
         tags = ['프리미엄 상담가구', '초고화질 TV', '안내용 태블릿'];
         url = '/products/31c4fd51-1579-4b60-a9f2-581a44e57bed';
      }
    } else if (answers.event_type === 'public') {
      if (answers.sub_public === 'audit') {
         title = '국정감사 맞춤형 패키지';
         desc = '보안과 안정성이 최우선인 국정감사 및 대규모 조사 현장 특화 세트';
         tags = ['보안 파기기', '고속 복합기', '방음 파티션'];
         url = '/products/d46b2854-47d3-47c0-8168-88caeb6d8bef';
      } else if (answers.sub_public === 'meeting') {
         title = '공공기관 보고·회의 패키지';
         desc = '격식 있는 보고 자리와 정기 회의에 최적화된 회의용 스마트 기기 세트';
         tags = ['전자 칠판', '회의용 마이크', '태블릿 PC'];
         url = '/products/d7b3fa8c-9d41-418b-9226-20095bf970ae';
      } else {
         title = '국가자격시험 운영 패키지';
         desc = '대규모 수험생을 통제하고 감독하기 위한 시험장 전용 운영 세트';
         tags = ['다량의 수험용 책상', '안내 방송 시스템', '타이머/시계'];
         url = '/products/3e3ad5a1-3758-4e5f-b947-15325b5a67c5';
      }
    } else if (answers.event_type === 'office') {
      if (answers.sub_office === 'smart') {
         title = '스마트 임시 사무실 패키지';
         desc = '언제 어디서나 즉시 업무가 가능한 IT 기반의 임시 비즈니스 프로젝트 룸';
         tags = ['사무용 PC/노트북', '스마트 워크 데스크', '기가 와이파이'];
         url = '/products/88cd575b-149d-46fe-b615-8e42a2fc3330';
      } else if (answers.sub_office === 'election') {
         title = '선거캠프 사무실 패키지';
         desc = '신속한 정보 취합과 다수의 인원이 상주하기 좋은 선거캠프 전용 세트';
         tags = ['상황판 모니터', '다목적 회의테이블', '고용량 제본기'];
         url = '/products/8970f345-b5f5-48bf-9dd2-2b5d100a0a43';
      } else {
         title = '건설현장 사무실 패키지';
         desc = '열악한 현장에서도 튼튼하게 버티는 건설/건축 현장 맞춤형 사무 가구';
         tags = ['철재 데스크', 'A3 도면 출력기', '스탠드 냉난방기'];
         url = '/products/e021cf62-5eea-46ad-b14c-2a54bf4ffa80';
      }
    }

    return { title, desc, tags, url, buttonText };
  };

  const result = getRecommendation();

  return (
    <>
      <section className="bg-slate-50 py-16 md:py-24">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-8 md:p-12 shadow-2xl">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white/10 text-teal-400 backdrop-blur-md shadow-inner border border-white/20">
                <Bot size={36} />
              </div>
              <h2 className="mb-4 text-2xl font-bold text-white md:text-4xl">
                어떤 사무실을 준비 중이신가요?
              </h2>
              <p className="mb-8 max-w-xl text-slate-300 md:text-lg font-light leading-relaxed">
                복잡한 렌탈 고민은 끝! 스마트한 AI가 몇 가지 질문만으로<br className="hidden md:block" />
                고객님의 비즈니스 환경에 최적화된 맞춤 패키지를 큐레이션 해드립니다.
              </p>
              <button
                onClick={() => setIsOpen(true)}
                className="group inline-flex items-center gap-2 rounded-full bg-teal-400 px-8 py-4 font-bold text-slate-900 transition-all hover:bg-teal-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(45,212,191,0.4)]"
              >
                AI 맞춤 추천 시작하기
                <ChevronRight className="transition-transform group-hover:translate-x-1" size={20} />
              </button>
            </div>
          </div>
        </Container>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Bot size={20} className="text-teal-500" />
                AI B2B 렌탈 큐레이터
              </h3>
              <button
                onClick={closeWizard}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-10 min-h-[400px] flex flex-col justify-center">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 h-24 w-24 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
                    <Monitor className="absolute inset-0 m-auto h-8 w-8 text-slate-400 animate-pulse" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-800">AI가 최적의 패키지를 구성하는 중...</h4>
                  <p className="text-slate-500 text-center">선택하신 환경과 조건에 맞는<br/>최적의 장비 데이터를 분석하고 있습니다.</p>
                </div>
              ) : showResult ? (
                <div className="flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom-4 fade-in duration-500">
                  <div className="mb-6 rounded-full bg-teal-50 p-4">
                    <CheckCircleIcon className="h-12 w-12 text-teal-500" />
                  </div>
                  <h4 className="mb-2 text-sm font-bold tracking-wider text-teal-600 uppercase">
                    AI 추천 결과
                  </h4>
                  <h2 className="mb-4 text-2xl md:text-3xl font-bold text-slate-900 break-keep">
                    {result.title}
                  </h2>
                  <p className="mb-8 text-base md:text-lg text-slate-600 leading-relaxed max-w-md break-keep">
                    {result.desc}
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-2 mb-10">
                    {result.tags.map((tag, idx) => (
                      <span key={idx} className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-600 border border-slate-200">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <a
                    href={result.url}
                    onClick={closeWizard}
                    className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg w-full md:w-auto justify-center"
                  >
                    {result.buttonText}
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </a>
                </div>
              ) : (
                <div className="flex flex-col animate-in slide-in-from-right-8 fade-in duration-300" key={currentStep}>
                  <div className="mb-8 text-center">
                    <div className="flex justify-center mb-2">
                      {activeSteps[currentStep].icon}
                    </div>
                    <p className="text-sm font-bold text-teal-600 mb-2">
                      Step {currentStep + 1} of {activeSteps.length}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 break-keep">
                      {activeSteps[currentStep].question}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSteps[currentStep].options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleOptionSelect(option.value)}
                        className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-100 bg-white p-6 text-center transition-all hover:border-teal-500 hover:bg-teal-50 hover:shadow-md active:scale-95"
                      >
                        <span className="text-lg font-bold text-slate-700 break-keep">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Progress Bar (only show during questions) */}
            {!isAnalyzing && !showResult && (
              <div className="h-2 w-full bg-slate-100">
                <div 
                  className="h-full bg-gradient-to-r from-teal-400 to-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep) / activeSteps.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Simple check circle icon for result
function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
