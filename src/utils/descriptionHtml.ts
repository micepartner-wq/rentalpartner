const IMG_TAG = /<img\b[^>]*>/gi;
const STYLE_ATTR = /\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i;
const TEXT_ALIGN = /text-align\s*:\s*(left|center|right)\s*;?/i;

/**
 * 편집기의 정렬 버튼이 이미지에 `text-align` 만 남긴 상세설명(예: <img style="text-align: center;">)은
 * 이미지 자체에는 효과가 없어 정렬이 보이지 않는다. 이런 이미지를 실제로 정렬되도록 바꿔 준다.
 * 폭이 이미 지정된 이미지는 그 폭을 유지하고, 그렇지 않으면 원래 크기로 두되 화면보다 커지지 않게 한다.
 */
export const normalizeDescriptionImageAlignment = (html: string): string =>
  html.replace(IMG_TAG, (tag) => {
    const styleMatch = tag.match(STYLE_ATTR);
    if (!styleMatch) return tag;
    const style = styleMatch[2] ?? styleMatch[3] ?? '';
    const align = style.match(TEXT_ALIGN)?.[1]?.toLowerCase();
    if (!align) return tag;

    const rest = style.replace(TEXT_ALIGN, '').trim().replace(/;+\s*$/, '');
    const margins = align === 'center' ? 'margin-left:auto;margin-right:auto'
      : align === 'right' ? 'margin-left:auto;margin-right:0'
      : 'margin-left:0;margin-right:auto';
    const hasWidth = /(^|[;\s])width\s*:/i.test(rest) || /\swidth\s*=/i.test(tag);
    const next = [rest, 'display:block', margins, hasWidth ? '' : 'width:auto', 'max-width:100%']
      .filter(Boolean).join(';');
    return tag.replace(STYLE_ATTR, ` style="${next}"`);
  });

export type ImageAlign = 'left' | 'center' | 'right';

/** 편집기에서 선택한 이미지에 정렬을 직접 적용한다(블록으로 만들어 좌우 여백으로 정렬). */
export const applyImageAlignment = (image: HTMLElement, align: ImageAlign) => {
  image.style.textAlign = '';
  image.style.display = 'block';
  image.style.marginLeft = align === 'left' ? '0' : 'auto';
  image.style.marginRight = align === 'right' ? '0' : 'auto';
  if (!image.style.width && !image.getAttribute('width')) image.style.width = 'auto';
  image.style.maxWidth = '100%';
};

/** 편집기에서 선택한 이미지의 가로 크기를 본문 폭의 비율로 정한다. 줄어든 이미지는 정렬(좌·중·우)이 보인다. */
export const applyImageSize = (image: HTMLElement, percent: number) => {
  image.style.display = 'block';
  image.style.width = percent + '%';
  image.style.maxWidth = '100%';
  if (!image.style.marginLeft && !image.style.marginRight) {
    image.style.marginLeft = '0';
    image.style.marginRight = 'auto';
  }
};
