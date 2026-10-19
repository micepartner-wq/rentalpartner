import { useId, useMemo, useState } from 'react';
import { isSafeSceneImageUrl, type InstallationScene } from '../../src/utils/installationScenes';
import { TaggedPhoto, useTaggedProducts } from './TaggedPhoto';
import { TaggedProductRail } from './TaggedProductRail';
import './PackageInstallationGallery.css';

export function PackageInstallationGallery({ scenes }: { scenes: InstallationScene[] }) {
  const validScenes = useMemo(() => scenes.filter(scene => isSafeSceneImageUrl(scene.image_url)), [scenes]);
  const [sceneIndex, setSceneIndex] = useState(0);
  const uid = useId();
  const scene = validScenes[Math.min(sceneIndex, validScenes.length - 1)];
  const { products, status, retry } = useTaggedProducts(validScenes.flatMap(item => item.hotspots.map(hotspot => hotspot.product_id)));
  // 사진에 태그한 상품을 한 번씩만(같은 상품을 여러 곳에 찍어도 하나로) 태그 순서대로 나열한다.
  const railProductIds = useMemo(() => [...new Set((scene?.hotspots || []).map(hotspot => hotspot.product_id))], [scene]);

  if (!scene) return null;

  return <section className="pig-gallery" aria-labelledby={uid + '-heading'}>
    <header className="pig-heading">
      <div><span className="pig-eyebrow">IN THE SPACE</span><h2 id={uid + '-heading'}>공간 속 렌탈 상품</h2></div>
      <p>사진 속 + 버튼을 눌러 사용된 상품을 확인하세요.</p>
    </header>
    <TaggedPhoto key={scene.id + scene.image_url} photo={scene} products={products} status={status}
      alt={scene.caption || '간편패키지 설치 모습'} errorText="설치사진을 불러오지 못했습니다. 아래 상품 목록에서 확인해 주세요." />
    <div className="pig-caption"><p>{scene.caption || '실제 공간에서 확인하는 렌탈 구성'}</p><span>{Math.min(sceneIndex + 1, validScenes.length)} / {validScenes.length}</span></div>
    {validScenes.length > 1 && <nav className="pig-thumbnails" aria-label="설치사진 선택">
      {validScenes.map((item, index) => <button key={item.id} type="button" aria-label={`설치사진 ${index + 1}`}
        aria-current={item.id === scene.id ? 'true' : undefined} onClick={() => setSceneIndex(index)}>
        <img src={item.image_url} alt="" loading="lazy" /><span>{String(index + 1).padStart(2, '0')}</span>
      </button>)}
    </nav>}
    <TaggedProductRail productIds={railProductIds} products={products} status={status} onRetry={retry} />
  </section>;
}
export default PackageInstallationGallery;
