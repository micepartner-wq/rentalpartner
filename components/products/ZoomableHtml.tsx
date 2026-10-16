import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './ZoomableHtml.css';

/**
 * 상세설명 HTML 안의 이미지를 누르면 큰 화면으로 보여 준다(글씨가 작은 상세 이미지용).
 * 이미지 우클릭 메뉴와 끌어서 저장은 막는다. 단, 화면 캡처나 개발자 도구까지 막을 수는 없는 가벼운 방지 장치다.
 */
export function ZoomableHtml({ html, className = '' }: { html: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  const isImage = (target: EventTarget | null): target is HTMLImageElement => target instanceof HTMLImageElement;

  useEffect(() => {
    if (!src) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSrc(null); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [src]);

  return (
    <>
      <div className={'zh-root ' + className} dangerouslySetInnerHTML={{ __html: html }}
        onClick={event => { if (isImage(event.target)) setSrc(event.target.currentSrc || event.target.src); }}
        onContextMenu={event => { if (isImage(event.target)) event.preventDefault(); }}
        onDragStart={event => { if (isImage(event.target)) event.preventDefault(); }} />
      {src && createPortal(
        <div role="dialog" aria-modal="true" aria-label="이미지 크게 보기" className="zh-overlay" onContextMenu={event => event.preventDefault()}>
          <button type="button" className="zh-close" onClick={() => setSrc(null)} aria-label="닫기"><X size={22} aria-hidden="true" /></button>
          <div className="zh-scroll" onClick={() => setSrc(null)}>
            <img src={src} alt="상세 이미지 크게 보기" draggable={false} onContextMenu={event => event.preventDefault()} />
          </div>
          <p className="zh-hint">화면을 누르면 닫힙니다</p>
        </div>,
        document.body,
      )}
    </>
  );
}
