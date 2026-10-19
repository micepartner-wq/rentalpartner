import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '../../src/api/productApi';
import { ProductImage, type TaggedProductsStatus } from './TaggedPhoto';
import './PackageInstallationGallery.css';

interface TaggedProductRailProps {
  productIds: string[];
  products: Record<string, Product>;
  status: TaggedProductsStatus;
  onRetry: () => void;
  title?: string;
}

/** 사진에 태그한 상품을 옆으로 넘기는 이미지 타일로 나열한다. 누르면 그 상품의 상세 페이지로 이동한다. */
export function TaggedProductRail({ productIds, products, status, onRetry, title = '사진 속 렌탈 상품' }: TaggedProductRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [edge, setEdge] = useState({ prev: false, next: false });
  const idsKey = productIds.join('|');

  const updateEdge = () => {
    const box = railRef.current;
    if (!box) return;
    setEdge({ prev: box.scrollLeft > 4, next: box.scrollLeft + box.clientWidth < box.scrollWidth - 4 });
  };
  useEffect(() => {
    updateEdge();
    window.addEventListener('resize', updateEdge);
    return () => window.removeEventListener('resize', updateEdge);
    // 상품 정보가 도착하면 타일 폭이 정해지므로 다시 계산한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, products, status]);
  const scroll = (direction: 1 | -1) => {
    const box = railRef.current;
    if (box) box.scrollBy({ left: direction * box.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (productIds.length === 0) return null;
  return <section className="pig-rail" aria-label={title}>
    <div className="pig-list-heading"><h3>{title} <span>{productIds.length}</span></h3></div>
    {status === 'error' && <div className="pig-status" role="status">상품 정보를 불러오지 못했습니다. <button type="button" onClick={onRetry}>다시 시도</button></div>}
    <div className="pig-rail-wrap">
      {edge.prev && <button type="button" className="pig-rail-btn pig-rail-prev" aria-label="이전 상품" onClick={() => scroll(-1)}><ChevronLeft size={22} aria-hidden="true" /></button>}
      <div className="pig-rail-track" ref={railRef} onScroll={updateEdge}>
        {productIds.map(productId => {
          const product = products[productId];
          const name = product?.name || (status === 'loading' ? '불러오는 중' : '확인할 수 없는 상품');
          const tile = <>
            <span className="pig-rail-img"><ProductImage product={product} /></span>
            <span className="pig-rail-name">{name}</span>
          </>;
          return product?.id
            ? <Link key={productId} className="pig-rail-item" to={`/products/${encodeURIComponent(product.id)}`} aria-label={`${name} 상품 보기`}>{tile}</Link>
            : <span key={productId} className="pig-rail-item is-unavailable">{tile}</span>;
        })}
      </div>
      {edge.next && <button type="button" className="pig-rail-btn pig-rail-next" aria-label="다음 상품" onClick={() => scroll(1)}><ChevronRight size={22} aria-hidden="true" /></button>}
    </div>
  </section>;
}
