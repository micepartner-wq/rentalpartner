import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../../src/api/productApi";
import { usePriceDisplay } from "../../src/context/PriceDisplayContext";
import {
  getPublicPriceClassName,
  getPublicPriceText,
  INQUIRY_PRICE_TEXT_CLASS,
  isInquiryPriceMode,
  isVisiblePriceMode,
} from "../../src/utils/priceDisplay";

// Tailwind이 클래스를 정적으로 감지하도록 전체 문자열로 나열한다.
const BADGE_TONES = [
  "bg-blue-50 text-blue-800",
  "bg-amber-50 text-amber-800",
  "bg-emerald-50 text-emerald-800",
  "bg-violet-50 text-violet-800",
  "bg-rose-50 text-rose-800",
  "bg-orange-50 text-orange-800",
  "bg-teal-50 text-teal-800",
];

export const getCategoryBadgeTone = (index: number) =>
  index < 0 ? "bg-slate-100 text-slate-700" : BADGE_TONES[index % BADGE_TONES.length];

interface ProductCardProps {
  product: Product;
  badgeLabel?: string | null;
  badgeToneIndex?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, badgeLabel, badgeToneIndex = -1 }) => {
  const { mode, loading } = usePriceDisplay();
  // 4:3 안에 거의 맞는 가로형 사진은 꽉 채우고, 그 외(세로로 긴 제품컷 등)는 잘리지 않게 전체를 보여준다.
  const [fillFrame, setFillFrame] = useState(false);
  const showDiscount =
    !loading && !isInquiryPriceMode(mode) && !!product.discount_rate && product.discount_rate > 0;
  const description = product.short_description?.trim();

  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
        <img
          src={product.image_url || "https://picsum.photos/seed/product/400/300"}
          alt={product.name}
          loading="lazy"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (!naturalWidth || !naturalHeight) return;
            const ratio = naturalWidth / naturalHeight;
            setFillFrame(ratio >= 1.2 && ratio <= 1.9);
          }}
          className={`h-full w-full transition-transform duration-500 group-hover:scale-105 ${
            fillFrame ? "object-cover" : "object-contain p-3 mix-blend-multiply"
          }`}
        />
        {badgeLabel && (
          <span
            className={`absolute left-3 top-3 rounded-md px-2.5 py-1 text-[12px] font-semibold leading-none ${getCategoryBadgeTone(badgeToneIndex)}`}
          >
            {badgeLabel}
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="font-semibold text-white">품절</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 break-keep text-[15px] font-semibold leading-snug text-slate-900 md:text-base">
          {product.name}
        </h3>
        {description && <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-500">{description}</p>}

        <div className="mt-auto flex items-baseline gap-2 pt-2">
          {showDiscount && <span className="text-sm font-semibold text-red-600">{product.discount_rate}%</span>}
          <span
            className={getPublicPriceClassName({
              mode,
              loading,
              visibleClass: "text-lg font-semibold text-slate-900",
              hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
            })}
          >
            {getPublicPriceText({
              amount: product.price,
              mode,
              loading,
              suffix: isVisiblePriceMode(mode) ? "원" : "",
              zeroAsHidden: true,
            })}
          </span>
        </div>

        {product.stock !== undefined && product.stock > 0 && product.stock <= 3 && (
          <span className="text-xs text-orange-500">재고 {product.stock}개 남음</span>
        )}
      </div>
    </Link>
  );
};
