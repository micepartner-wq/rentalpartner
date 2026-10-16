import { useEffect, useRef, useState, type FC } from "react";
import { ChevronLeft, ChevronRight, FileText, Handshake, Headphones } from "lucide-react";
import type { Product } from "../../src/api/productApi";
import { getProductSlideImages } from "../../src/utils/productGallery";

const FACTS = [
  { icon: FileText, label: "견적 방식", value: "일정·수량에 맞춘 맞춤 견적" },
  { icon: Headphones, label: "상담 문의", value: "1800-1985" },
  { icon: Handshake, label: "계약", value: "비용 처리 · 수의계약 가능" },
];

const IMG_CLASS = "block h-[240px] w-auto max-w-full object-contain mix-blend-multiply sm:h-[320px] lg:h-[400px]";

/** 대표 이미지 + 추가 이미지 슬라이드(좌우 이동 애니메이션, 아래 썸네일). 이미지가 1장이면 이미지만 보인다. */
const ProductImageSlider: FC<{ images: string[]; name: string }> = ({ images, name }) => {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const key = images.join("|");
  useEffect(() => { setIndex(0); }, [key]);
  const count = images.length;
  const go = (delta: number) => setIndex(current => (current + delta + count) % count);

  // 선택한 썸네일이 가려지지 않게 썸네일 줄만 가로로 옮긴다(페이지 스크롤은 건드리지 않음).
  useEffect(() => {
    const box = strip.current;
    const thumb = box?.children[index] as HTMLElement | undefined;
    if (!box || !thumb) return;
    box.scrollTo({ left: thumb.offsetLeft - (box.clientWidth - thumb.clientWidth) / 2, behavior: "smooth" });
  }, [index]);

  if (count <= 1) return <img src={images[0] || "https://picsum.photos/seed/product/800/600"} alt={name} className={IMG_CLASS} />;
  return (
    <div className="flex w-full flex-col items-center" role="group" aria-roledescription="carousel" aria-label={name + " 이미지"} tabIndex={0}
      onKeyDown={event => {
        if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
        else if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
      }}
      onTouchStart={event => { touchX.current = event.touches[0].clientX; }}
      onTouchEnd={event => {
        if (touchX.current === null) return;
        const dx = event.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}>
      <div className="relative w-full overflow-hidden">
        <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: "translateX(-" + index * 100 + "%)" }}>
          {images.map((src, i) => (
            <div key={src + i} className="flex w-full shrink-0 items-center justify-center" aria-hidden={i !== index || undefined}>
              <img src={src} alt={name + " " + (i + 1) + " / " + count} draggable={false} loading={i === 0 ? undefined : "lazy"} className={IMG_CLASS} />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => go(-1)} aria-label="이전 이미지"
          className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[#001E45] hover:bg-white sm:left-2"><ChevronLeft size={26} /></button>
        <button type="button" onClick={() => go(1)} aria-label="다음 이미지"
          className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[#001E45] hover:bg-white sm:right-2"><ChevronRight size={26} /></button>
        <span className="absolute bottom-1 right-1 rounded-full bg-slate-500/70 px-2.5 py-1 text-xs font-semibold tabular-nums text-white sm:bottom-2 sm:right-2" aria-hidden="true">
          <b>{index + 1}</b>/{count}
        </span>
      </div>
      <div className="mt-4 flex max-w-full items-center gap-1">
        <button type="button" onClick={() => go(-1)} aria-label="이전 이미지" className="flex h-8 w-6 shrink-0 items-center justify-center text-slate-400 hover:text-[#001E45]"><ChevronLeft size={18} /></button>
        <div ref={strip} className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <button key={src + i} type="button" onClick={() => setIndex(i)} aria-label={(i + 1) + "번째 이미지 보기"} aria-current={i === index}
              className={"h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-white transition-colors " + (i === index ? "border-[#001E45]" : "border-slate-200 opacity-80 hover:opacity-100")}>
              <img src={src} alt="" draggable={false} loading="lazy" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label="다음 이미지" className="flex h-8 w-6 shrink-0 items-center justify-center text-slate-400 hover:text-[#001E45]"><ChevronRight size={18} /></button>
      </div>
      <p className="sr-only" aria-live="polite">{index + 1} / {count}</p>
    </div>
  );
};

export const ProductDetailHero: FC<{ product: Product }> = ({ product }) => {
  const slideImages = getProductSlideImages(product.image_url, product.gallery_images);
  const heading = (
    <div className="px-6 pt-6 sm:px-8 sm:pt-8">
      <h1 className="text-2xl font-bold leading-tight text-gray-900 break-keep xl:text-[32px]">{product.name}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-500 break-keep sm:text-base">
        {product.short_description || "일정과 수량을 접수하면 담당자가 렌탈 조건을 안내해 드립니다."}
      </p>
    </div>
  );
  return (
  <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm lg:rounded-[28px]">
    <div className="flex flex-col items-center bg-slate-50 px-6 pb-8 pt-5 sm:pb-10 sm:pt-6">
      {/* 뱃지는 사진 위에 겹치지 않고 사진 영역 위쪽 별도 줄에 둔다(사진 배경색에 따라 보이는 모양이 달라지지 않게). */}
      {product.category && (
        <span className="mb-4 self-start rounded-md bg-white px-3 py-1.5 text-[12px] font-semibold leading-none text-[#001E45] shadow-sm">
          {product.category}
        </span>
      )}
      <ProductImageSlider images={slideImages} name={product.name} />
    </div>

    {heading}
    <div className="px-6 pb-6 sm:px-8 sm:pb-8">
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FACTS.map(({ icon: Icon, label, value }) => (
          <li key={label} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#001E45] shadow-sm">
              <Icon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-slate-400">{label}</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-snug text-slate-800 break-keep">{value}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
  );
};
