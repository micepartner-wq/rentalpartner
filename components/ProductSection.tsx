import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Container } from './ui/Container';
import { ProductItem } from '../types';
import { usePriceDisplay } from '../src/context/PriceDisplayContext';
import { getPublicPriceClassName, getPublicPriceText, HIDDEN_PRICE_TEXT, INQUIRY_PRICE_TEXT_CLASS, isInquiryPriceMode } from '../src/utils/priceDisplay';
import './ProductSection.css';

interface ProductSectionProps {
  title: string;
  categories: string[];
  products: ProductItem[];
  variant?: 'gray' | 'white';
  layoutMode?: string;
  maxItems?: number;
}

export const ProductSection: React.FC<ProductSectionProps> = ({
  title, categories, products, variant = 'white', maxItems, layoutMode = 'grid-4',
}) => {
  const [activeCategory, setActiveCategory] = useState(categories[0] || '전체');
  const { mode: priceDisplayMode, loading: priceDisplayLoading } = usePriceDisplay();
  const hideInquiryPrice = title.replace(/\s+/g, '').includes('간편패키지');
  useEffect(() => {
    setActiveCategory(current => categories.includes(current) ? current : categories[0] || '전체');
  }, [categories]);
  const filteredProducts = activeCategory === '전체' ? products : products.filter(product => product.category === activeCategory);
  const visibleProducts = maxItems == null ? filteredProducts : filteredProducts.slice(0, maxItems);
  const allViewCategory = categories.filter(cat => cat && cat !== '전체').join(',');
  const allViewPath = allViewCategory
    ? `/products?category=${encodeURIComponent(allViewCategory)}&title=${encodeURIComponent(title)}`
    : `/products?title=${encodeURIComponent(title)}`;
  return (
    <section className={`rental-products ${variant === 'gray' ? 'rental-products--gray' : ''}`} aria-label={title}>
      <Container>
        <div className="rental-products__heading">
          <div>
            <p className="rental-products__eyebrow">PRODUCTS</p>
            <h2>{title}</h2>
            <p className="rental-products__intro">공간에 필요한 제품, 한곳에서 만나보세요.</p>
          </div>
          <Link to={allViewPath} className="rental-products__all">전체 상품 보기 <ArrowUpRight size={19} aria-hidden="true" /></Link>
        </div>
        <div className="rental-products__filters" role="group" aria-label="상품 카테고리">
          {categories.map((category, index) => (
            <button key={`${category}-${index}`} type="button" aria-pressed={activeCategory === category}
              onClick={() => setActiveCategory(category)} className={activeCategory === category ? 'is-active' : ''}>
              {category}
            </button>
          ))}
        </div>
        {visibleProducts.length > 0 ? (
          <div className={`rental-products__grid rental-products__grid--${layoutMode}`}>
            {visibleProducts.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`} className="rental-products__item">
                <div className="rental-products__image">
                  <img src={product.imageUrl} alt={product.title} loading="lazy" />
                </div>
                <div className="rental-products__details">
                  <span className="rental-products__category">{product.category || '렌탈 상품'}</span>
                  <h3>{product.title}</h3>
                  {!(hideInquiryPrice && getPublicPriceText({ amount: product.price, mode: priceDisplayMode, loading: priceDisplayLoading, zeroAsHidden: true }) === HIDDEN_PRICE_TEXT) && <div className="rental-products__price">
                    {!priceDisplayLoading && !isInquiryPriceMode(priceDisplayMode) && !!product.discountRate && <span className="rental-products__discount">{product.discountRate}%</span>}
                    <span className={getPublicPriceClassName({ mode: priceDisplayMode, loading: priceDisplayLoading, visibleClass: 'rental-products__amount', hiddenClass: INQUIRY_PRICE_TEXT_CLASS })}>
                      {getPublicPriceText({ amount: product.price, mode: priceDisplayMode, loading: priceDisplayLoading, zeroAsHidden: true })}
                    </span>
                  </div>}
                </div>
              </Link>
            ))}
          </div>
        ) : <p className="rental-products__empty" role="status">이 카테고리의 상품을 준비하고 있습니다. 다른 카테고리를 선택해 주세요.</p>}
      </Container>
    </section>
  );
};
