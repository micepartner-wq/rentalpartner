import React from "react";
import { FileText, Handshake, Headphones } from "lucide-react";
import type { Product } from "../../src/api/productApi";

const FACTS = [
  { icon: FileText, label: "견적 방식", value: "일정·수량에 맞춘 맞춤 견적" },
  { icon: Headphones, label: "상담 문의", value: "1800-1985" },
  { icon: Handshake, label: "계약", value: "비용 처리 · 수의계약 가능" },
];

export const ProductDetailHero: React.FC<{ product: Product }> = ({ product }) => (
  <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm lg:rounded-[28px]">
    <div className="relative flex items-center justify-center bg-slate-50 px-6 py-8 sm:py-10">
      {product.category && (
        <span className="absolute left-5 top-5 rounded-md bg-white px-3 py-1.5 text-[12px] font-semibold leading-none text-[#001E45] shadow-sm sm:left-7 sm:top-7">
          {product.category}
        </span>
      )}
      <img
        src={product.image_url || "https://picsum.photos/seed/product/800/600"}
        alt={product.name}
        className="block h-[240px] w-auto max-w-full object-contain mix-blend-multiply sm:h-[320px] lg:h-[400px]"
      />
    </div>

    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold leading-tight text-gray-900 break-keep xl:text-[32px]">{product.name}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-500 break-keep sm:text-base">
        {product.short_description || "일정과 수량을 접수하면 담당자가 렌탈 조건을 안내해 드립니다."}
      </p>

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
