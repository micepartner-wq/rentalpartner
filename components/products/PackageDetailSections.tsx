import { useEffect, useState } from 'react';
import { ArrowDown, Boxes, CalendarDays, ChevronDown, ClipboardList, Package, SlidersHorizontal, Truck, RotateCcw, Minus, Plus, X } from 'lucide-react';
import type { Product } from '../../src/api/productApi';
import { isSafeSceneImageUrl, normalizeInstallationScenes } from '../../src/utils/installationScenes';
import { PackageInstallationGallery } from './PackageInstallationGallery';
import { ZoomableHtml } from './ZoomableHtml';
import './PackageDetail.css';

function PackageImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && isSafeSceneImageUrl(src) && !failed
    ? <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
    : <span className={'pkd-image-placeholder ' + className}><Package size={32} strokeWidth={1.2} aria-hidden="true" /><span>상품 이미지 준비 중</span></span>;
}

export function PackageDetailHeader({ product, onCustomize }: { product: Product; onCustomize: () => void }) {
  const count = product.basic_components?.length || 0;
  return <header className="pkd-header">
    <div className="pkd-header-copy"><span className="pkd-eyebrow">PACKAGE SOLUTION</span><h1>{product.name}</h1>
      <p>{product.short_description || '필요한 상품을 함께 살펴보고, 우리 공간에 맞는 렌탈 구성을 준비하세요.'}</p>
    </div>
    <div className="pkd-facts">
      <div><Boxes size={19} aria-hidden="true" /><span>기본 구성<strong>{count ? count + '종의 상품' : '구성 상담'}</strong></span></div>
      <div><SlidersHorizontal size={19} aria-hidden="true" /><span>구성 방식<strong>{count ? '추천 구성에서 자유롭게 조정' : '필요한 옵션 선택'}</strong></span></div>
      <div><CalendarDays size={19} aria-hidden="true" /><span>견적 안내<strong>일정·장소에 맞춰 상담</strong></span></div>
    </div>
    <nav className="pkd-section-nav" aria-label="패키지 상세 안내"><a href="#package-space">공간 살펴보기</a><a href="#package-customize" onClick={event => { event.preventDefault(); onCustomize(); }}>구성과 수량</a><a href="#package-guide">이용 안내</a><ArrowDown size={15} aria-hidden="true" /></nav>
  </header>;
}

export function PackageSpaceShowcase({ product }: { product: Product }) {
  const scenes = normalizeInstallationScenes(product.installation_scenes);
  return <section id="package-space" className="pkd-space">
    {scenes.length ? <PackageInstallationGallery key={product.id} scenes={scenes} /> : <>
      <div className="pkd-section-heading"><div><span className="pkd-eyebrow">THE PACKAGE</span><h2>패키지 살펴보기</h2></div><p>대표 이미지로 구성을 살펴보세요.</p></div>
      <div className="pkd-representative"><PackageImage src={product.image_url} alt={product.name + ' 대표 이미지'} /></div>
    </>}
  </section>;
}

const steps = [
  { icon: ClipboardList, title: '견적 요청', text: '필요한 구성과 사용 일정, 설치 장소를 알려주세요.' },
  { icon: SlidersHorizontal, title: '구성·조건 확인', text: '상담을 통해 상품, 수량과 렌탈 조건을 확인합니다.' },
  { icon: Truck, title: '설치 일정 협의', text: '현장 여건과 반입 방법, 설치 일정을 함께 확인합니다.' },
  { icon: RotateCcw, title: '회수 일정 협의', text: '사용 종료 시점과 회수 방법을 상담해 주세요.' },
];

export function PackageServiceGuide() {
  return <section id="package-guide" className="pkd-guide">
    <div className="pkd-section-heading"><div><span className="pkd-eyebrow">HOW IT WORKS</span><h2>공간 준비, 이렇게 진행해요</h2></div></div>
    <ol className="pkd-steps">{steps.map(({ icon: Icon, title, text }, index) => <li key={title}><div className="pkd-step-top"><span>0{index + 1}</span><Icon size={22} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></li>)}</ol>
    <div className="pkd-faq"><h3>견적 전에 궁금한 점</h3>
      <details><summary>사진에 있는 상품이 모두 포함되나요?<ChevronDown size={17} aria-hidden="true" /></summary><p>사진 속 상품은 눌러서 확인하실 수 있고, 이 패키지의 구성은 아래 “패키지 구성과 수량” 목록에서 확인하실 수 있습니다. 사진은 연출된 이미지일 수 있으니 최종 구성은 견적 상담에서 확인해 주세요.</p></details>
      <details><summary>구성과 수량을 바꿀 수 있나요?<ChevronDown size={17} aria-hidden="true" /></summary><p>네, 이 구성은 추천 시작점이에요. 패키지 구성과 수량에서 필요 없는 상품은 수량을 0으로 줄여 빼고, 필요한 수량으로 바꿀 수 있습니다. 목록에 없는 다른 장비는 견적 요청 단계의 ‘추가 요청사항’에 적어 주시면 담당자가 상담에서 함께 맞춰 드립니다. 상품 준비 가능 여부와 최종 조건은 상담 시 확인해 주세요.</p></details>
      <details><summary>렌탈 비용은 어떻게 확인하나요?<ChevronDown size={17} aria-hidden="true" /></summary><p>선택 구성, 사용 기간과 설치 장소를 함께 알려주시면 견적 상담에 도움이 됩니다. 운송·설치·회수 등 필요한 항목의 비용과 조건도 함께 확인해 주세요.</p></details>
    </div>
  </section>;
}

export function PackageOriginalDetails({ description }: { description?: string }) {
  if (!description?.trim()) return null;
  return <details className="pkd-original"><summary><span>상세 사양과 기존 안내 보기</span><ChevronDown size={18} aria-hidden="true" /></summary><ZoomableHtml className="pkd-original-content prose max-w-none" html={description.replace(/\n/g, '<br />')} /></details>;
}

export function PackageCombinationControls({ combinations, drafts, onUpdate, onInput, onBlur }: {
  combinations: Array<{ id: string; selections: Record<string, string>; quantity: number }>;
  drafts: Record<string, string>;
  onUpdate: (id: string, quantity: number) => void;
  onInput: (id: string, value: string) => void;
  onBlur: (id: string, fallback: number) => void;
}) {
  if (!combinations.length) return null;
  return <section className="pkd-combination-controls" aria-label="선택한 옵션 수량 조정">
    <h3>선택한 옵션과 수량</h3>
    {combinations.map(item => {
      const name = Object.values(item.selections).join(' / ');
      return <div key={item.id} className="pkd-combination-row"><span>{name}</span><div>
        <button type="button" disabled={item.quantity <= 1} onClick={() => onUpdate(item.id, item.quantity - 1)} aria-label={name + ' 수량 줄이기'}><Minus size={15} aria-hidden="true" /></button>
        <input inputMode="numeric" pattern="[0-9]*" aria-label={name + ' 수량'} value={drafts[item.id] ?? String(item.quantity)} onChange={event => onInput(item.id, event.target.value)} onBlur={() => onBlur(item.id, item.quantity)} />
        <button type="button" onClick={() => onUpdate(item.id, item.quantity + 1)} aria-label={name + ' 수량 늘리기'}><Plus size={15} aria-hidden="true" /></button>
        <button type="button" onClick={() => onUpdate(item.id, 0)} aria-label={name + ' 선택 제외'}><X size={15} aria-hidden="true" /></button>
      </div></div>;
    })}
  </section>;
}
