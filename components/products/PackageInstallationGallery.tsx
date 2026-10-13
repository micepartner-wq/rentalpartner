import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProductsByIds, type Product } from '../../src/api/productApi';
import { isSafeSceneImageUrl, INSTALLATION_INCLUSION_LABELS, type InstallationScene, type InstallationHotspot } from '../../src/utils/installationScenes';
import './PackageInstallationGallery.css';

const inclusionLabels = INSTALLATION_INCLUSION_LABELS;

function ProductImage({ product }: { product?: Product }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product?.image_url]);
  return product?.image_url && isSafeSceneImageUrl(product.image_url) && !failed
    ? <img className="pig-product-image" src={product.image_url} alt="" loading="lazy" onError={() => setFailed(true)} />
    : <span className="pig-product-image pig-image-placeholder" aria-hidden="true">상품</span>;
}

export function PackageInstallationGallery({ scenes, compactProducts = false }: { scenes: InstallationScene[]; compactProducts?: boolean }) {
  const validScenes = useMemo(() => scenes.filter(scene => isSafeSceneImageUrl(scene.image_url)), [scenes]);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [loadedImageUrl, setLoadedImageUrl] = useState('');
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const uid = useId();
  const scene = validScenes[Math.min(sceneIndex, validScenes.length - 1)];
  const imageReady = Boolean(scene && loadedImageUrl === scene.image_url);
  const imageFailed = Boolean(scene && failedImageUrl === scene.image_url);
  const selected = scene?.hotspots.find(hotspot => hotspot.id === selectedId);
  const productIdsKey = JSON.stringify([...new Set(validScenes.flatMap(item => item.hotspots.map(hotspot => hotspot.product_id)))].sort());

  useEffect(() => {
    let active = true;
    const ids: string[] = JSON.parse(productIdsKey);
    setStatus('loading');
    setProducts({});
    if (!ids.length) { setStatus('ready'); return; }
    getProductsByIds(ids).then(items => {
      if (!active) return;
      setProducts(Object.fromEntries(items.filter(item => item.id).map(item => [item.id!, item])));
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [productIdsKey, retry]);

  useEffect(() => {
    setSelectedId(null);
  }, [scene?.id, scene?.image_url]);

  const closeSelection = () => {
    setSelectedId(null);
    triggerRef.current?.focus();
  };

  const selectHotspot = (hotspot: InstallationHotspot, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setSelectedId(current => current === hotspot.id ? null : hotspot.id);
  };

  if (!scene) return null;
  const activeProduct = selected ? products[selected.product_id] : undefined;
  const productName = (hotspot: InstallationHotspot) => products[hotspot.product_id]?.name
    || (status === 'loading' ? '상품 정보 불러오는 중' : status === 'error' ? '상품 정보 확인 필요' : '현재 확인할 수 없는 상품');

  return <section className="pig-gallery" aria-labelledby={uid + '-heading'} onKeyDown={event => {
    if (event.key === 'Escape' && selectedId) { event.preventDefault(); closeSelection(); }
  }}>
    <header className="pig-heading">
      <div><span className="pig-eyebrow">IN THE SPACE</span><h2 id={uid + '-heading'}>공간 속 렌탈 상품</h2></div>
      <p>사진 속 + 버튼을 눌러 사용된 상품을 확인하세요.</p>
    </header>
    <div className="pig-stage">
      <div className="pig-photo">
        {!imageFailed ? <img key={scene.image_url} className="pig-scene-image" src={scene.image_url}
          alt={scene.caption || '간편패키지 설치 모습'} onLoad={() => { setLoadedImageUrl(scene.image_url); setFailedImageUrl(''); }}
          onError={() => { setFailedImageUrl(scene.image_url); setLoadedImageUrl(''); }} />
          : <div className="pig-photo-error" role="status">설치사진을 불러오지 못했습니다. 아래 상품 목록에서 확인해 주세요.</div>}
        {imageReady && scene.hotspots.map((hotspot, index) => <button
          key={hotspot.id} type="button" className={'pig-hotspot' + (selectedId === hotspot.id ? ' is-selected' : '')}
          style={{ left: `clamp(22px, ${hotspot.x}%, calc(100% - 22px))`, top: `clamp(22px, ${hotspot.y}%, calc(100% - 22px))` }}
          aria-label={`${index + 1}. ${productName(hotspot)} 안내`} aria-expanded={selectedId === hotspot.id}
          aria-controls={selectedId === hotspot.id ? uid + '-detail' : undefined}
          onClick={event => selectHotspot(hotspot, event.currentTarget)}><span aria-hidden="true">{selectedId === hotspot.id ? '−' : '+'}</span></button>)}
      </div>
      {selected && <div id={uid + '-detail'} className="pig-detail" role="region" aria-label="선택한 상품 안내"
        style={{ '--pig-x': `${selected.x}%`, '--pig-y': `${selected.y}%` } as React.CSSProperties}>
        <button type="button" className="pig-close" aria-label="상품 안내 닫기" onClick={closeSelection}>×</button>
        <ProductImage product={activeProduct} />
        <div className="pig-detail-copy" aria-live="polite">
          <span className={'pig-badge pig-badge-' + selected.inclusion}>{inclusionLabels[selected.inclusion]}</span>
          <strong>{productName(selected)}</strong>
          {activeProduct?.id ? <Link to={`/products/${encodeURIComponent(activeProduct.id)}`}>상품 보기 <span aria-hidden="true">↗</span></Link>
            : <span className="pig-unavailable">{status === 'loading' ? '잠시만 기다려 주세요.' : status === 'error' ? '아래에서 다시 시도해 주세요.' : '상품 안내가 종료되었거나 변경되었습니다.'}</span>}
        </div>
      </div>}
    </div>
    <div className="pig-caption"><p>{scene.caption || '실제 공간에서 확인하는 렌탈 구성'}</p><span>{Math.min(sceneIndex + 1, validScenes.length)} / {validScenes.length}</span></div>
    {validScenes.length > 1 && <nav className="pig-thumbnails" aria-label="설치사진 선택">
      {validScenes.map((item, index) => <button key={item.id} type="button" aria-label={`설치사진 ${index + 1}`}
        aria-current={item.id === scene.id ? 'true' : undefined} onClick={() => { setSceneIndex(index); setSelectedId(null); }}>
        <img src={item.image_url} alt="" loading="lazy" /><span>{String(index + 1).padStart(2, '0')}</span>
      </button>)}
    </nav>}
    {compactProducts ? <details className="pig-product-disclosure"><summary>사진 속 렌탈 상품 <span>{scene.hotspots.length}개 안내</span></summary>    <div className="pig-list-heading"><h3>사진 속 렌탈 상품 <span>{scene.hotspots.length}</span></h3>
      <p>포함 표시는 기본 패키지 기준입니다. 참고 상품은 패키지에 포함되지 않습니다.</p></div>
    {status === 'loading' && <p className="pig-status" role="status">상품 정보를 불러오고 있습니다.</p>}
    {status === 'error' && <div className="pig-status" role="status">상품 정보를 불러오지 못했습니다. <button type="button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div>}
    {scene.hotspots.length ? <ul className="pig-products">
      {scene.hotspots.map((hotspot, index) => <li key={hotspot.id} className={selectedId === hotspot.id ? 'is-selected' : ''}>
        <button type="button" className="pig-product-select" onClick={event => selectHotspot(hotspot, event.currentTarget)}
          aria-expanded={selectedId === hotspot.id} aria-controls={selectedId === hotspot.id ? uid + '-detail' : undefined}>
          <ProductImage product={products[hotspot.product_id]} />
          <span className="pig-product-copy"><span className={'pig-badge pig-badge-' + hotspot.inclusion}>{inclusionLabels[hotspot.inclusion]}</span>
            <strong>{productName(hotspot)}</strong><span className="pig-location">{String(index + 1).padStart(2, '0')} · 사진 속 위치 보기</span></span>
        </button>
        {products[hotspot.product_id]?.id && <Link className="pig-product-link" to={`/products/${encodeURIComponent(hotspot.product_id)}`} aria-label={`${productName(hotspot)} 상품 보기`}>상품 보기 <span aria-hidden="true">↗</span></Link>}
      </li>)}
    </ul> : <p className="pig-status">이 사진에 등록된 상품 안내가 없습니다.</p>}</details> : <>    <div className="pig-list-heading"><h3>사진 속 렌탈 상품 <span>{scene.hotspots.length}</span></h3>
      <p>포함 표시는 기본 패키지 기준입니다. 참고 상품은 패키지에 포함되지 않습니다.</p></div>
    {status === 'loading' && <p className="pig-status" role="status">상품 정보를 불러오고 있습니다.</p>}
    {status === 'error' && <div className="pig-status" role="status">상품 정보를 불러오지 못했습니다. <button type="button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div>}
    {scene.hotspots.length ? <ul className="pig-products">
      {scene.hotspots.map((hotspot, index) => <li key={hotspot.id} className={selectedId === hotspot.id ? 'is-selected' : ''}>
        <button type="button" className="pig-product-select" onClick={event => selectHotspot(hotspot, event.currentTarget)}
          aria-expanded={selectedId === hotspot.id} aria-controls={selectedId === hotspot.id ? uid + '-detail' : undefined}>
          <ProductImage product={products[hotspot.product_id]} />
          <span className="pig-product-copy"><span className={'pig-badge pig-badge-' + hotspot.inclusion}>{inclusionLabels[hotspot.inclusion]}</span>
            <strong>{productName(hotspot)}</strong><span className="pig-location">{String(index + 1).padStart(2, '0')} · 사진 속 위치 보기</span></span>
        </button>
        {products[hotspot.product_id]?.id && <Link className="pig-product-link" to={`/products/${encodeURIComponent(hotspot.product_id)}`} aria-label={`${productName(hotspot)} 상품 보기`}>상품 보기 <span aria-hidden="true">↗</span></Link>}
      </li>)}
    </ul> : <p className="pig-status">이 사진에 등록된 상품 안내가 없습니다.</p>}</>}
  </section>;
}
export default PackageInstallationGallery;
