import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { B2BCurationWizard } from '../components/B2BCurationWizard';
import { Helmet } from 'react-helmet-async';
import { QuickMenu } from '../components/QuickMenu';
import { PromoSection } from '../components/PromoSection';
import { ProductSection } from '../components/ProductSection';
import { ClientLogoMarqueeSection } from '../components/ClientLogoMarqueeSection';
import { WhyChooseUsSection } from '../components/WhyChooseUsSection';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { BottomCtaSection } from '../components/BottomCtaSection';
import { getProducts, Product } from '../src/api/productApi';
import { getActiveSections, getProductsBySection, Section } from '../src/api/sectionApi';
import { Loader2 } from 'lucide-react';
import { PopupManager } from '../components/Layout/PopupManager';

interface SectionWithProducts {
    section: Section;
    products: Product[];
}

export const MainPage: React.FC = () => {
    const [sectionsWithProducts, setSectionsWithProducts] = useState<SectionWithProducts[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const sections = await getActiveSections();

                if (sections.length === 0) {
                    setAllProducts(await getProducts());
                    setSectionsWithProducts([]);
                    return;
                }

                const sectionsData = await Promise.all(
                    sections.map(async (section) => {
                        const sectionProducts = await getProductsBySection(section.id!);
                        return {
                            section,
                            products: sectionProducts
                        } satisfies SectionWithProducts;
                    })
                );

                setSectionsWithProducts(sectionsData);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Helper to format products for ProductSection
    const formatProducts = (products: Product[]) => {
        return products.map(p => ({
            id: p.id || '',
            title: p.name,
            subtitle: p.name,
            imageUrl: p.image_url || 'https://picsum.photos/seed/product/400/500',
            category: p.category || '',
            price: p.price,
            discountRate: p.discount_rate,
        }));
    };

    const getCategories = (products: Product[]) => {
        const cats = products.map(p => p.category).filter(Boolean);
        return ['전체', ...Array.from(new Set(cats))];
    };

    const getSectionCategories = (section: Section, products: Product[]) => {
        if (section.categories && section.categories.length > 0) {
            const cats = section.categories.map(c => c.name);
            return ['전체', ...Array.from(new Set(cats))];
        }
        return getCategories(products);
    };

    return (
        <main>
            <Helmet>
                <title>렌탈어때 | 기업 맞춤 종합 렌탈</title>
                <meta name="description" content="기업 행사, 관공서 비품은 렌탈어때! 사무기기부터 대형 MICE 장비까지 맞춤 견적과 대량 납품을 지원하는 종합 렌탈 파트너입니다." />
                <link rel="canonical" href="https://rentalpartner.kr/" />
            </Helmet>
            <h1 className="sr-only">렌탈어때 - B2B B2G 기업 맞춤 종합 렌탈. 사무기기, 복합기, 행사 장비, 관공서 컨퍼런스 비품 렌탈 전문</h1>
            <PopupManager />
            <Hero />
            <QuickMenu />
            <B2BCurationWizard />

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-[#001E45]" size={40} />
                </div>
            ) : sectionsWithProducts.length > 0 ? (
                <>
                    {sectionsWithProducts.map(({ section, products }) => {
                        if (products.length === 0) return null;
                        const formattedProducts = formatProducts(products);
                        return (
                            <ProductSection
                                key={section.id}
                                title={section.name}
                                categories={getSectionCategories(section, products)}
                                products={formattedProducts}
                                layoutMode="grid-4"
                            />
                        );
                    })}
                </>
            ) : allProducts.length > 0 ? (
                // Fallback: if no sections exist but products do, show all products
                <ProductSection
                    title="전체 상품"
                    categories={getCategories(allProducts)}
                    products={formatProducts(allProducts)}
                    layoutMode="grid-4"
                />
            ) : (
                <div className="text-center py-20 text-slate-400">
                    등록된 상품이 없습니다. 상품이 준비되는 대로 업데이트하겠습니다.
                </div>
            )}

            <WhyChooseUsSection />
            <HowItWorksSection />
            <ClientLogoMarqueeSection />
            <PromoSection />

            <BottomCtaSection />
        </main>
    );
};

