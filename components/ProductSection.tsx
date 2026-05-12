import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Container } from './ui/Container';
import { ProductItem } from '../types';
import { usePriceDisplay } from '../src/context/PriceDisplayContext';
import { getPublicPriceClassName, getPublicPriceText, INQUIRY_PRICE_TEXT_CLASS, isInquiryPriceMode } from '../src/utils/priceDisplay';

interface ProductSectionProps {
  title: string;
  categories: string[];
  products: ProductItem[];
  variant?: 'gray' | 'white';
  layoutMode?: string; // Additional prop
}

export const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  categories,
  products,
  variant = 'white',
  layoutMode = 'grid-4' // Default
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const { mode: priceDisplayMode, loading: priceDisplayLoading } = usePriceDisplay();

  useEffect(() => {
    if (categories.length > 0) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  const filteredProducts = activeCategory === '전체'
    ? products
    : products.filter(product => product.category === activeCategory);

  const allViewCategory = categories.filter(cat => cat && cat !== '전체').join(',');
  const allViewPath = allViewCategory
    ? `/products?category=${encodeURIComponent(allViewCategory)}&title=${encodeURIComponent(title)}`
    : `/products?title=${encodeURIComponent(title)}`;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Layout configurations
  let cardWidthClass = 'w-[180px] md:w-[280px]';
  const aspectRatioClass = 'aspect-square';

  switch (layoutMode) {
    case 'grid-5':
      cardWidthClass = 'w-[140px] md:w-[calc(20%_-_0.8rem)]';
      break;
    case 'grid-3':
      cardWidthClass = 'w-[220px] md:w-[calc(33.333%_-_0.666rem)]';
      break;
    case 'grid-2':
      cardWidthClass = 'w-[300px] md:w-[calc(50%_-_0.5rem)]';
      break;
    case 'grid-4':
    default:
      cardWidthClass = 'w-[180px] md:w-[calc(25%_-_0.75rem)]';
      break;
  }

  return (
    <div className={`py-12 md:py-20 ${variant === 'gray' ? 'bg-slate-50' : 'bg-white'}`}>
      <Container>
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-[24px] md:text-[28px] font-semibold text-slate-900 tracking-tight">{title}</h2>
          </div>
          <Link
            to={allViewPath}
            className="text-[1rem] font-semibold text-slate-400 hover:text-[#001E45] transition-colors hidden md:block"
          >
            전체보기
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex overflow-x-auto no-scrollbar gap-3 md:gap-4 mb-5 whitespace-nowrap px-1">
          {categories.map((cat, idx) => (
            <button
              key={`${cat}-${idx}`}
              onClick={() => setActiveCategory(cat)}
              className={`h-[40px] min-w-[100px] px-4 rounded-lg text-[14px] md:text-[15px] font-semibold transition-all border flex-shrink-0 text-center shadow-sm hover:shadow
                ${activeCategory === cat
                  ? 'bg-[#001E45] text-white border-[#001E45]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#001E45] hover:text-[#001E45]'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          {/* Left Arrow */}
          <button
            onClick={() => scroll('left')}
            className="absolute -left-3 md:-left-6 top-[calc(50%-48px)] -translate-y-1/2 z-10 w-14 h-14 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full shadow-xl flex items-center justify-center text-slate-500 hover:bg-white hover:border-slate-400 hover:text-[#001E45] hover:scale-105 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scroll('right')}
            className="absolute -right-3 md:-right-6 top-[calc(50%-48px)] -translate-y-1/2 z-10 w-14 h-14 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full shadow-xl flex items-center justify-center text-slate-500 hover:bg-white hover:border-slate-400 hover:text-[#001E45] hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={28} />
          </button>

          {/* Scrollable List */}
          <div
            ref={scrollContainerRef}
            className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar scrollbar-hide [&::-webkit-scrollbar]:hidden pb-4"
            style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className={`flex-none ${cardWidthClass} group/card cursor-pointer block`}
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className={`relative ${aspectRatioClass} overflow-hidden rounded-2xl bg-slate-100 mb-4 shadow-sm border border-slate-100`}>
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                  />
                  {/* Premium Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 md:p-5">
                    <button className="w-full px-5 py-2 bg-white text-slate-900 text-xs font-semibold rounded-lg shadow-xl translate-y-4 group-hover/card:translate-y-0 transition-transform duration-500 text-center">
                      상품보기
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-semibold text-[15px] text-slate-800 truncate group-hover/card:text-[#001E45] transition-colors">{product.title}</h3>

                  <div className="flex items-center gap-1 mt-1">
                    {!priceDisplayLoading && !isInquiryPriceMode(priceDisplayMode) && product.discountRate && (
                      <span className="text-rose-500 font-semibold text-[18px]">{product.discountRate}%</span>
                    )}
                    <span className={getPublicPriceClassName({
                      mode: priceDisplayMode,
                      loading: priceDisplayLoading,
                      visibleClass: 'font-medium text-[18px] text-slate-900',
                      hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                    })}>
                      {getPublicPriceText({
                        amount: product.price,
                        mode: priceDisplayMode,
                        loading: priceDisplayLoading,
                        zeroAsHidden: true,
                      })}
                    </span>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        </div>
      </Container >
    </div >
  );
};
