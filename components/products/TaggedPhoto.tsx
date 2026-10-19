import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProductsByIds, type Product } from '../../src/api/productApi';
import { isSafeSceneImageUrl, type InstallationHotspot } from '../../src/utils/installationScenes';
import './PackageInstallationGallery.css';

export type TaggedProductsStatus = 'loading' | 'ready' | 'error';

export function ProductImage({ product }: { product?: Product }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product?.image_url]);
  return product?.image_url && isSafeSceneImageUrl(product.image_url) && !failed
    ? <img className="pig-product-image" src={product.image_url} alt="" loading="lazy" onError={() => setFailed(true)} />
    : <span className="pig-product-image pig-image-placeholder" aria-hidden="true">상품</span>;
}

/** 사진에 태그된 상품 정보를 한 번에 불러온다. 삭제된 상품은 결과에 없고, 실패하면 retry 로 다시 시도한다. */
export function useTaggedProducts(productIds: string[]) {
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [status, setStatus] = useState<TaggedProductsStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const idsKey = JSON.stringify([...new Set(productIds)].sort());

  useEffect(() => {
    let active = true;
    const ids: string[] = JSON.parse(idsKey);
    setStatus('loading');
    setProducts({});
    if (!ids.length) { setStatus('ready'); return; }
    getProductsByIds(ids).then(items => {
      if (!active) return;
      setProducts(Object.fromEntries(items.filter(item => item.id).map(item => [item.id!, item])));
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [idsKey, attempt]);

  return { products, status, retry: () => setAttempt(value => value + 1) };
}

interface TaggedPhotoProps {
  photo: { id: string; image_url: string; hotspots: InstallationHotspot[] };
  products: Record<string, Product>;
  status: TaggedProductsStatus;
  alt: string;
  errorText?: string;
}

/**
 * 사진 위에 + 표시(상품 태그)를 얹고, 올리거나 누르면 상품 안내 상자를 보여 준다.
 * 사진이 바뀌면 부모에서 key 를 바꿔 상태를 초기화한다.
 */
export function TaggedPhoto({ photo, products, status, alt, errorText = '사진을 불러오지 못했습니다.' }: TaggedPhotoProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const uid = useId();
  // 마우스가 있는 화면(PC)에서는 + 에 올리기만 해도 안내를 보여 주고, 터치 화면에서는 누르면 열린다.
  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => { cancelClose(); closeTimer.current = window.setTimeout(() => setSelectedId(null), 180); };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const selected = photo.hotspots.find(hotspot => hotspot.id === selectedId);
  const activeProduct = selected ? products[selected.product_id] : undefined;
  const productName = (hotspot: InstallationHotspot) => products[hotspot.product_id]?.name
    || (status === 'loading' ? '상품 정보 불러오는 중' : status === 'error' ? '상품 정보 확인 필요' : '현재 확인할 수 없는 상품');

  const closeSelection = () => {
    setSelectedId(null);
    triggerRef.current?.focus();
  };

  return <div className="pig-stage" onKeyDown={event => {
    if (event.key === 'Escape' && selectedId) { event.preventDefault(); closeSelection(); }
  }}>
    <div className="pig-photo" onClick={event => {
      // 사진의 빈 곳을 누르면 상품 안내를 닫는다(+ 버튼 클릭은 각자 동작하므로 제외).
      if (selectedId && !(event.target as Element).closest('.pig-hotspot')) setSelectedId(null);
    }}>
      {!imageFailed
        ? <img className="pig-scene-image" src={photo.image_url} alt={alt}
            onLoad={() => setImageReady(true)} onError={() => setImageFailed(true)} />
        : <div className="pig-photo-error" role="status">{errorText}</div>}
      {imageReady && photo.hotspots.map((hotspot, index) => <button
        key={hotspot.id} type="button" className={'pig-hotspot' + (selectedId === hotspot.id ? ' is-selected' : '')}
        style={{ left: `clamp(22px, ${hotspot.x}%, calc(100% - 22px))`, top: `clamp(22px, ${hotspot.y}%, calc(100% - 22px))` }}
        aria-label={`${index + 1}. ${productName(hotspot)} 안내`} aria-expanded={selectedId === hotspot.id}
        aria-controls={selectedId === hotspot.id ? uid + '-detail' : undefined}
        onMouseEnter={event => { if (canHover()) { cancelClose(); triggerRef.current = event.currentTarget; setSelectedId(hotspot.id); } }}
        onMouseLeave={() => { if (canHover()) scheduleClose(); }}
        onClick={event => {
          triggerRef.current = event.currentTarget;
          if (canHover()) { cancelClose(); setSelectedId(hotspot.id); }
          else setSelectedId(current => current === hotspot.id ? null : hotspot.id);
        }}><span aria-hidden="true">{selectedId === hotspot.id ? '−' : '+'}</span></button>)}
    </div>
    {selected && <div id={uid + '-detail'} className="pig-detail" role="region" aria-label="선택한 상품 안내"
      onMouseEnter={() => { if (canHover()) cancelClose(); }} onMouseLeave={() => { if (canHover()) scheduleClose(); }}
      style={{ '--pig-x': `${selected.x}%`, '--pig-y': `${selected.y}%` } as React.CSSProperties}>
      <button type="button" className="pig-close" aria-label="상품 안내 닫기" onClick={closeSelection}>×</button>
      <ProductImage product={activeProduct} />
      <div className="pig-detail-copy" aria-live="polite">
        <strong>{productName(selected)}</strong>
        {activeProduct?.id ? <Link to={`/products/${encodeURIComponent(activeProduct.id)}`}>상품 보기 <span aria-hidden="true">↗</span></Link>
          : <span className="pig-unavailable">{status === 'loading' ? '잠시만 기다려 주세요.' : status === 'error' ? '잠시 후 다시 시도해 주세요.' : '상품 안내가 종료되었거나 변경되었습니다.'}</span>}
      </div>
    </div>}
  </div>;
}
