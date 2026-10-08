import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Container } from './ui/Container';
import { getHeroBanners, Banner } from '../src/api/cmsApi';

export const Hero: React.FC = () => {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const dragStartRef = useRef<number | null>(null);
  const dragCurrentRef = useRef<number | null>(null);
  const suppressSlideClickRef = useRef(false);
  const suppressResetTimerRef = useRef<number | null>(null);
  const preloadedImageSetRef = useRef<Set<string>>(new Set());

  const preloadImage = useCallback((src?: string | null) => {
    if (!src || preloadedImageSetRef.current.has(src)) return;

    const img = new Image();
    img.decoding = 'async';
    img.src = src;

    const markLoaded = () => {
      preloadedImageSetRef.current.add(src);
    };

    img.onload = markLoaded;
    img.onerror = markLoaded;
  }, []);

  // Load banners from DB
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const banners = await getHeroBanners();
        setSlides(banners);
      } catch (error) {
        console.error('Failed to load banners:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBanners();
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (slides.length === 0 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  useEffect(() => {
    if (slides.length === 0) return;

    const current = slides[currentSlide];
    const next = slides[(currentSlide + 1) % slides.length];
    const nextAfter = slides[(currentSlide + 2) % slides.length];
    const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
    const imageForViewport = (banner?: Banner) =>
      isMobileViewport ? banner?.mobile_image_url?.trim() || banner?.image_url : banner?.image_url;

    preloadImage(imageForViewport(current));
    preloadImage(imageForViewport(next));
    preloadImage(imageForViewport(nextAfter));
  }, [slides, currentSlide, preloadImage]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const hintSeenKey = 'hero_swipe_hint_seen';
    if (window.sessionStorage.getItem(hintSeenKey) === '1') return;

    setShowSwipeHint(true);
    window.sessionStorage.setItem(hintSeenKey, '1');

    const timerId = window.setTimeout(() => {
      setShowSwipeHint(false);
    }, 3000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [slides.length]);

  const nextSlide = () => {
    setShowSwipeHint(false);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setShowSwipeHint(false);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setShowSwipeHint(false);
    setCurrentSlide(index);
  };

  const resetDragState = () => {
    dragStartRef.current = null;
    dragCurrentRef.current = null;
    setIsDragging(false);
  };

  const beginDrag = (clientX: number) => {
    if (suppressResetTimerRef.current) {
      window.clearTimeout(suppressResetTimerRef.current);
      suppressResetTimerRef.current = null;
    }

    dragStartRef.current = clientX;
    dragCurrentRef.current = clientX;
    setIsDragging(true);
    setShowSwipeHint(false);
    suppressSlideClickRef.current = false;
    setIsPaused(true);
  };

  const updateDrag = (clientX: number) => {
    if (dragStartRef.current === null) return;

    dragCurrentRef.current = clientX;
    if (Math.abs(dragStartRef.current - clientX) > 10) {
      suppressSlideClickRef.current = true;
    }
  };

  const endDrag = () => {
    if (dragStartRef.current === null || dragCurrentRef.current === null) {
      resetDragState();
      setIsPaused(false);
      return;
    }

    const distance = dragStartRef.current - dragCurrentRef.current;
    if (distance > 50) nextSlide();
    else if (distance < -50) prevSlide();

    if (suppressSlideClickRef.current) {
      suppressResetTimerRef.current = window.setTimeout(() => {
        suppressSlideClickRef.current = false;
        suppressResetTimerRef.current = null;
      }, 0);
    }

    resetDragState();
    setIsPaused(false);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateDrag(e.clientX);
    };

    const handleMouseUp = () => {
      endDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    return () => {
      if (suppressResetTimerRef.current) {
        window.clearTimeout(suppressResetTimerRef.current);
      }
    };
  }, []);

  const handleSlideClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!suppressSlideClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressSlideClickRef.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    beginDrag(e.clientX);
  };

  const preventNativeDrag = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    beginDrag(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    updateDrag(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    endDrag();
  };

  if (loading) {
    return (
      <section className="relative w-full h-[570px] md:h-[620px] xl:h-auto xl:flex-1 xl:min-h-[580px] bg-[#061c32] flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={40} />
      </section>
    );
  }

  if (slides.length === 0) {
    return (
      <section className="relative w-full h-[570px] md:h-[620px] xl:h-auto xl:flex-1 xl:min-h-[580px] bg-[#061c32] flex items-center justify-center">
        <p className="text-white/70">더 나은 공간을 위한 렌탈을 준비하고 있습니다.</p>
      </section>
    );
  }

  return (
    <section
      className="relative w-full h-[570px] sm:h-[620px] md:h-[650px] xl:h-auto xl:flex-1 xl:min-h-[580px] bg-[#061c32] overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!isDragging) {
          setIsPaused(false);
        }
      }}
    >
      <div
        className={`relative h-full select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onDragStart={preventNativeDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Slides */}
        {slides.map((slide, index) => {
          const isImageOnly = slide.display_mode === 'image';
          let linkHref = slide.target_product_code ? `/p/${slide.target_product_code}` : (slide.link || '').trim();
          if (linkHref.includes('humanpartner-mall.web.app')) {
            linkHref = linkHref.replace(/^https?:\/\/[^\/]+/, '') || '/';
          }
          const isExternal = linkHref.startsWith('http');

          const SlideContent = (
            <>
              {/* Background Image */}
              <div
                className={`absolute inset-0 w-full h-full transform-gpu transition-transform duration-[7000ms] ease-out motion-reduce:transition-none ${isImageOnly ? 'bg-white' : index === currentSlide ? 'scale-[1.035]' : 'scale-100'}`}
                style={{ willChange: 'transform' }}
              >
                <picture className="absolute inset-0 block">
                  {slide.mobile_image_url?.trim() && <source media="(max-width: 767px)" srcSet={slide.mobile_image_url.trim()} />}
                  <img src={slide.image_url} alt={isImageOnly ? slide.title : ''} draggable={false} className={`w-full h-full object-center ${isImageOnly ? 'object-contain' : 'object-cover'}`} />
                </picture>
                {!isImageOnly && <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,21,42,0.87)_0%,rgba(3,21,42,0.63)_38%,rgba(3,21,42,0.17)_77%),linear-gradient(0deg,rgba(2,15,31,0.55)_0%,transparent_42%)]" />}
              </div>

              {/* Content Area */}
              {!isImageOnly && <Container className="relative h-full flex flex-col justify-center text-white z-20 px-6 sm:px-8">
                <div className="max-w-[790px] pb-12 md:pb-5">
                  <div className={`mb-6 md:mb-8 flex items-center gap-3 text-[11px] md:text-xs font-semibold tracking-[0.2em] text-sky-200 uppercase transition-all duration-700 motion-reduce:transition-none ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                    <span className="h-px w-8 bg-sky-200/80" />{slide.brand_text?.trim() || 'RENTAL EOTTAE'}
                  </div>
                  {/* Main Title */}
                  <h1 className={`max-w-[650px] text-[40px] sm:text-[48px] md:text-[62px] xl:text-[72px] font-semibold leading-[1.14] tracking-[-0.055em] text-white mb-5 md:mb-7 break-keep transition-all duration-700 delay-100 motion-reduce:transition-none transform
                    ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                  `}>
                    {slide.title}
                  </h1>

                  {/* Subtitle */}
                  <p className={`max-w-[580px] text-[16px] md:text-[20px] font-normal text-white/85 leading-[1.65] break-keep transition-all duration-700 delay-200 motion-reduce:transition-none transform
                    ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                  `}>
                    {slide.subtitle}
                  </p>

                  {/* Action CTA */}
                  {linkHref && <div className={`mt-9 md:mt-11 transition-all duration-700 delay-300 motion-reduce:transition-none transform
                    ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                  `}>
                    <div className="inline-flex items-center justify-between gap-6 min-w-[180px] h-[52px] md:h-[58px] px-6 rounded-full bg-white text-[#062949] text-sm md:text-[15px] font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition-all duration-300 hover:bg-sky-50 hover:translate-x-1">
                      {slide.button_text?.trim() || '바로가기'}
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>}
                </div>
              </Container>}
            </>
          );

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-[900ms] motion-reduce:transition-none ease-[cubic-bezier(0.22,1,0.36,1)]
                ${index === currentSlide ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}
              `}
              style={{ willChange: 'opacity' }}
            >
              {!linkHref ? (
                <div className="block w-full h-full relative">{SlideContent}</div>
              ) : isExternal ? (
                <a
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full relative group/slide cursor-pointer"
                  onClick={handleSlideClick}
                >
                  {SlideContent}
                </a>
              ) : (
                <Link
                  to={linkHref}
                  className="block w-full h-full relative group/slide cursor-pointer"
                  onClick={handleSlideClick}
                >
                  {SlideContent}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Slide controls */}
      <div className="absolute inset-x-0 z-30 bottom-7 md:bottom-10">
      <Container className="flex items-center justify-between px-6 sm:px-8 text-white">
        <div className="flex items-center gap-4 md:gap-6 rounded-full bg-slate-950/35 px-4 backdrop-blur-sm">
          <span className="text-sm font-semibold tabular-nums">{String(currentSlide + 1).padStart(2, '0')} <span className="text-white/45 mx-1">/</span> {String(slides.length).padStart(2, '0')}</span>
          <div className="flex items-center gap-1.5">
            {slides.map((_, index) => (
              <button key={index} type="button" onClick={() => goToSlide(index)} aria-label={`${index + 1}번 슬라이드 보기`} aria-current={index === currentSlide ? 'true' : undefined} className="group py-3">
                <span className={`block h-[3px] rounded-full transition-all duration-500 ${index === currentSlide ? 'w-9 md:w-12 bg-white' : 'w-4 md:w-6 bg-white/40 group-hover:bg-white/80'}`} />
              </button>
            ))}
          </div>
        </div>
        {slides.length > 1 && <div className="flex items-center gap-2">
          <button type="button" onClick={prevSlide} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/35 bg-slate-950/35 backdrop-blur-sm flex items-center justify-center hover:bg-slate-950/50 transition-colors" aria-label="이전 슬라이드"><ChevronLeft size={20} /></button>
          <button type="button" onClick={nextSlide} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/35 bg-slate-950/35 backdrop-blur-sm flex items-center justify-center hover:bg-slate-950/50 transition-colors" aria-label="다음 슬라이드"><ChevronRight size={20} /></button>
        </div>}
      </Container>
      </div>

      <div
        className={`absolute left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-black/45 text-white text-xs md:text-sm font-medium backdrop-blur-sm transition-all duration-300 ${
          showSwipeHint ? 'bottom-24 md:bottom-28 opacity-100' : 'bottom-20 md:bottom-24 opacity-0 pointer-events-none'
        }`}
      >
        좌우로 넘겨보세요
      </div>

    </section>
  );
};
