import type { ReactNode } from 'react';
import { TaggedPhoto, useTaggedProducts } from '../products/TaggedPhoto';
import { TaggedProductRail } from '../products/TaggedProductRail';
import { getReviewTaggedProductIds, type ReviewPhoto } from '../../src/utils/reviewPhotos';

interface ReviewPhotoStackProps {
  photos: ReviewPhoto[];
  title: string;
  /** 사진 앞에 놓을 내용(본문 글). 순서: 본문 글 → 사진 속 렌탈 상품 슬라이드 → 사진들. */
  intro?: ReactNode;
}

/** 설치후기 상세: 본문 글, 태그한 상품 슬라이드, 올린 순서대로의 사진(사진마다 상품 태그 +)을 차례로 보여 준다. */
export function ReviewPhotoStack({ photos, title, intro }: ReviewPhotoStackProps) {
  const taggedIds = getReviewTaggedProductIds(photos);
  const { products, status, retry } = useTaggedProducts(taggedIds);
  if (photos.length === 0) return null;
  return (
    <>
      {intro && <div className="mb-10">{intro}</div>}
      {taggedIds.length > 0 && <div className="mb-10"><TaggedProductRail productIds={taggedIds} products={products} status={status} onRetry={retry} /></div>}
      <div className="mb-10 space-y-4">
        {photos.map((photo, index) => (
          <div key={photo.id} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
            <TaggedPhoto photo={photo} products={products} status={status} alt={photo.caption || `${title} 사진 ${index + 1}`} />
          </div>
        ))}
      </div>
    </>
  );
}
