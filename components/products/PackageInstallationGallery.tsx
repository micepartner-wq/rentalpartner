import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isSafeSceneImageUrl, type InstallationScene } from '../../src/utils/installationScenes';
import { TaggedPhoto, useTaggedProducts } from './TaggedPhoto';
import { TaggedProductRail } from './TaggedProductRail';
import './PackageInstallationGallery.css';

const SWIPE_DISTANCE = 50;

export function PackageInstallationGallery({ scenes }: { scenes: InstallationScene[] }) {
  const validScenes = useMemo(() => scenes.filter(scene => isSafeSceneImageUrl(scene.image_url)), [scenes]);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const uid = useId();
  const count = validScenes.length;
  const index = Math.min(sceneIndex, count - 1);
  const scene = validScenes[index];
  const { products, status, retry } = useTaggedProducts(validScenes.flatMap(item => item.hotspots.map(hotspot => hotspot.product_id)));
  // 사진에 태그한 상품을 한 번씩만(같은 상품을 여러 곳에 찍어도 하나로) 태그 순서대로 나열한다.
  const railProductIds = useMemo(() => [...new Set((scene?.hotspots || []).map(hotspot => hotspot.product_id))], [scene]);

  // 사진마다 비율이 달라도 보이는 사진의 높이에 맞춰 영역 높이를 바꾼다(상품 안내 상자가 열려도 함께 반영).
  useLayoutEffect(() => {
    const slide = slideRefs.current[index];
    if (!slide) return;
    const update = () => setViewportHeight(slide.offsetHeight);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [index, count]);

  if (!scene) return null;

  const go = (next: number) => setSceneIndex(Math.max(0, Math.min(count - 1, next)));

  return <section className="pig-gallery" aria-labelledby={uid + '-heading'}>
    <header className="pig-heading">
      <div><span className="pig-eyebrow">IN THE SPACE</span><h2 id={uid + '-heading'}>공간 속 렌탈 상품</h2></div>
      <p>사진 속 + 버튼을 눌러 사용된 상품을 확인하세요.</p>
    </header>
    <div className="pig-slider" role="group" aria-roledescription="슬라이드" aria-label="설치사진">
      <div className="pig-viewport" style={viewportHeight ? { height: viewportHeight } : undefined}
        onTouchStart={event => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }}
        onTouchEnd={event => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start || count < 2) return;
          const touch = event.changedTouches[0];
          const dx = touch.clientX - start.x;
          // 세로 스크롤과 구분하기 위해 가로로 충분히 움직였을 때만 넘긴다.
          if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(touch.clientY - start.y)) go(index + (dx < 0 ? 1 : -1));
        }}>
        <div className="pig-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {validScenes.map((item, itemIndex) => <div key={item.id} ref={element => { slideRefs.current[itemIndex] = element; }}
            className="pig-slide" aria-hidden={itemIndex !== index} inert={itemIndex !== index}>
            <TaggedPhoto key={item.id + item.image_url} photo={item} products={products} status={status} active={itemIndex === index}
              alt={item.caption || `간편패키지 설치 모습 ${itemIndex + 1}`} errorText="설치사진을 불러오지 못했습니다. 아래 상품 목록에서 확인해 주세요." />
          </div>)}
        </div>
      </div>
      {count > 1 && <>
        <button type="button" className="pig-nav pig-nav-prev" aria-label="이전 사진" disabled={index === 0} onClick={() => go(index - 1)}><span aria-hidden="true">‹</span></button>
        <button type="button" className="pig-nav pig-nav-next" aria-label="다음 사진" disabled={index === count - 1} onClick={() => go(index + 1)}><span aria-hidden="true">›</span></button>
      </>}
    </div>
    <div className="pig-caption">
      <p>{scene.caption || '실제 공간에서 확인하는 렌탈 구성'}</p>
      <span className="pig-pager">
        {count > 1 && <span className="pig-dots">{validScenes.map((item, itemIndex) => <button key={item.id} type="button"
          aria-label={`설치사진 ${itemIndex + 1}`} aria-current={itemIndex === index ? 'true' : undefined} onClick={() => go(itemIndex)} />)}</span>}
        <span aria-live="polite">{index + 1} / {count}</span>
      </span>
    </div>
    <TaggedProductRail productIds={railProductIds} products={products} status={status} onRetry={retry} />
  </section>;
}
export default PackageInstallationGallery;
