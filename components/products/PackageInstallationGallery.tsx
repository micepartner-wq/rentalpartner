import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hand } from 'lucide-react';
import { getProductsByIds, type Product } from '../../src/api/productApi';
import { isSafeSceneImageUrl, type InstallationScene, type InstallationHotspot } from '../../src/utils/installationScenes';
import './PackageInstallationGallery.css';


function ProductImage({ product }: { product?: Product }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product?.image_url]);
  return product?.image_url && isSafeSceneImageUrl(product.image_url) && !failed
    ? <img className="pig-product-image" src={product.image_url} alt="" loading="lazy" onError={() => setFailed(true)} />
    : <span className="pig-product-image pig-image-placeholder" aria-hidden="true">상품</span>;
}

export function PackageInstallationGallery({ scenes }: { scenes: InstallationScene[] }) {
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
      <p>사진 속 상품을 눌러 사용된 상품을 확인하세요.</p>
    </header>
    <div className="pig-stage">
      <div className="pig-photo" onClick={event => {
        // 사진의 빈 곳을 누르면 상품 안내를 닫는다(상품 버튼 클릭은 각자 동작하므로 제외).
        if (selectedId && !(event.target as Element).closest('.pig-hotspot')) setSelectedId(null);
      }}>
        {!imageFailed ? <img key={scene.image_url} className="pig-scene-image" src={scene.image_url}
          alt={scene.caption || '간편패키지 설치 모습'} onLoad={() => { setLoadedImageUrl(scene.image_url); setFailedImageUrl(''); }}
          onError={() => { setFailedImageUrl(scene.image_url); setLoadedImageUrl(''); }} />
          : <div className="pig-photo-error" role="status">설치사진을 불러오지 못했습니다.</div>}
        {imageReady && scene.hotspots.map((hotspot, index) => <button
          key={hotspot.id} type="button" className={'pig-hotspot' + (selectedId === hotspot.id ? ' is-selected' : '')}
          style={{ left: `clamp(22px, ${hotspot.x}%, calc(100% - 22px))`, top: `clamp(22px, ${hotspot.y}%, calc(100% - 22px))` }}
          aria-label={`${index + 1}. ${productName(hotspot)} 안내`} aria-expanded={selectedId === hotspot.id}
          aria-controls={selectedId === hotspot.id ? uid + '-detail' : undefined}
          onClick={event => selectHotspot(hotspot, event.currentTarget)}><span aria-hidden="true"><Hand size={16} strokeWidth={2.2} /></span></button>)}
      </div>
      {selected && <div id={uid + '-detail'} className="pig-detail" role="region" aria-label="선택한 상품 안내"
        style={{ '--pig-x': `${selected.x}%`, '--pig-y': `${selected.y}%` } as React.CSSProperties}>
        <button type="button" className="pig-close" aria-label="상품 안내 닫기" onClick={closeSelection}>×</button>
        <ProductImage product={activeProduct} />
        <div className="pig-detail-copy" aria-live="polite">
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
    {status === 'error' && <div className="pig-status" role="status">상품 정보를 불러오지 못했습니다. <button type="button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div>}
  </section>;
}
export default PackageInstallationGallery;
