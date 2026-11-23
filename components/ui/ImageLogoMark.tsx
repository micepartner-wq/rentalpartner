import type { FC } from 'react';

/**
 * 상품·설치 사진 칸의 우측 하단에 렌탈어때 로고를 얹는다. 이미지 파일은 건드리지 않고 화면에서만 덧그린다.
 * 부모는 `relative`여야 하고, 클릭·드래그는 이미지로 그대로 전달된다.
 */
export const ImageLogoMark: FC<{ className?: string }> = ({ className = '' }) => (
  <img
    src="/logo.png"
    alt=""
    aria-hidden="true"
    draggable={false}
    className={`pointer-events-none absolute bottom-2 right-2 z-[1] w-[17%] min-w-[42px] max-w-[84px] select-none rounded-md bg-white/70 p-1 ${className}`}
  />
);
