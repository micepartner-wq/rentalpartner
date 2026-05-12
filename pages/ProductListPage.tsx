import React, { useState, useEffect } from 'react';
import { Container } from '../components/ui/Container';
import { Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getProducts, Product } from '../src/api/productApi';
import { getProductsBySection } from '../src/api/sectionApi';
import { getAllNavMenuItems } from '../src/api/cmsApi';
import { usePriceDisplay } from '../src/context/PriceDisplayContext';
import { getPublicPriceClassName, getPublicPriceText, INQUIRY_PRICE_TEXT_CLASS, isInquiryPriceMode, isVisiblePriceMode } from '../src/utils/priceDisplay';

const sortByDisplayOrderThenName = <T extends { display_order?: number; name?: string }>(items: T[]) =>
    [...items].sort((a, b) => {
        const orderA = a.display_order ?? 999999;
        const orderB = b.display_order ?? 999999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '', 'ko-KR');
    });

export const ProductListPage: React.FC = () => {
    const { mode: priceDisplayMode, loading: priceDisplayLoading } = usePriceDisplay();
    const [searchParams] = useSearchParams();
    const urlCategory = searchParams.get('category');
    const sectionId = searchParams.get('sectionId');
    const urlTitle = searchParams.get('title');

    const [activeCategory, setActiveCategory] = useState("전체");
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [displayedCategories, setDisplayedCategories] = useState<string[]>(['전체']);
    const [parentCategories, setParentCategories] = useState<string[]>([]);

    // Grouping State
    const [parentToChildMap, setParentToChildMap] = useState<Record<string, string[]>>({});
    const [childToParentMap, setChildToParentMap] = useState<Record<string, string>>({});
    const [categoryOrderMap, setCategoryOrderMap] = useState<Record<string, number>>({});
    const [currentGroup, setCurrentGroup] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const [productData, navItems] = await Promise.all([
                    sectionId ? getProductsBySection(sectionId) : getProducts(),
                    getAllNavMenuItems()
                ]);

                // Filter basic products
                const basicProducts = productData.filter(p =>
                    p.product_type === 'basic' ||
                    (!p.product_type && !p.category.includes('추가') && !p.category.includes('장소') && !p.category.includes('음식'))
                );
                setProducts(basicProducts);

                // Build Category Maps
                const pMap: Record<string, string[]> = {};
                const cMap: Record<string, string> = {};
                const orderMap: Record<string, number> = {};

                sortByDisplayOrderThenName(navItems).forEach(item => {
                    orderMap[item.name] = item.display_order || 0;
                    if (item.category && item.name) {
                        // item.category is Parent, item.name is Child
                        if (!pMap[item.category]) pMap[item.category] = [];
                        pMap[item.category].push(item.name);
                        cMap[item.name] = item.category;
                    }
                });

                setParentToChildMap(pMap);
                setChildToParentMap(cMap);
                setCategoryOrderMap(orderMap);
                setParentCategories(Object.keys(pMap).sort((a, b) => (orderMap[a] ?? 999999) - (orderMap[b] ?? 999999)));

                // Extract unique categories from actual products for fallback
                const uniqueCategories = ['전체', ...new Set(basicProducts.map(p => p.category))];

                // Determine Group & Active Category
                let targetGroup: string | null = null;
                let targetActive = "전체";
                let targetDisplayed = uniqueCategories;

                if (urlCategory) {
                    if (pMap[urlCategory]) {
                        // Helper: User clicked a Parent Category (e.g., from Main Page Tab)
                        targetGroup = urlCategory;
                        targetActive = "전체";

                        // Display siblings (children of this parent)
                        const children = [...pMap[urlCategory]].sort((a, b) => (orderMap[a] ?? 999999) - (orderMap[b] ?? 999999));
                        targetDisplayed = ['전체', ...children];

                    } else if (cMap[urlCategory]) {
                        // Helper: User clicked a Child Category (e.g., from Mega Menu)
                        const parent = cMap[urlCategory];
                        targetGroup = parent;
                        targetActive = urlCategory;

                        // Display siblings (children of the parent)
                        const siblings = [...pMap[parent]].sort((a, b) => (orderMap[a] ?? 999999) - (orderMap[b] ?? 999999));
                        targetDisplayed = ['전체', ...siblings];

                    } else {
                        // Fallback: Standalone category
                        targetActive = urlCategory;
                        targetDisplayed = uniqueCategories;

                        // Check if comma separated (legacy)
                        if (urlCategory.includes(',')) {
                            const selected = urlCategory.split(',');
                            targetDisplayed = ['전체', ...selected];
                        }
                    }
                }

                setCurrentGroup(targetGroup);
                setActiveCategory(targetActive);
                setDisplayedCategories(targetDisplayed.length > 1 ? [targetDisplayed[0], ...targetDisplayed.slice(1).sort((a, b) => (orderMap[a] ?? 999999) - (orderMap[b] ?? 999999))] : targetDisplayed);

            } catch (error) {
                console.error("Error getting products: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [urlCategory, sectionId]);

    const handleParentCategoryClick = (parent: string) => {
        if (parent === '전체') {
            const uniqueCategories = ['전체', ...new Set(products.map(p => p.category).filter(Boolean))];
            setCurrentGroup(null);
            setActiveCategory('전체');
            setDisplayedCategories([
                '전체',
                ...uniqueCategories.slice(1).sort((a, b) => (categoryOrderMap[a] ?? 999999) - (categoryOrderMap[b] ?? 999999))
            ]);
            return;
        }

        const children = parentToChildMap[parent] || [];
        setCurrentGroup(parent);
        setActiveCategory('전체');
        setDisplayedCategories([
            '전체',
            ...[...children].sort((a, b) => (categoryOrderMap[a] ?? 999999) - (categoryOrderMap[b] ?? 999999))
        ]);
    };

    // Enhanced Filter Logic
    const filteredProducts = products.filter(p => {
        // 1. If Active is "전체"
        if (activeCategory === "전체") {
            // If we are in a group context, "전체" means "Any product belonging to this group's children"
            if (currentGroup && parentToChildMap[currentGroup]) {
                return parentToChildMap[currentGroup].includes(p.category);
            }
            // Otherwise, it means EVERYTHING
            return true;
        }

        // 2. Direct Match
        if (p.category === activeCategory) return true;

        // 3. Comma-separated list Match
        if (activeCategory.includes(',')) {
            return activeCategory.split(',').includes(p.category);
        }

        return false;
    }).sort((a, b) => {
        const orderA = categoryOrderMap[a.category || ''] ?? 999999;
        const orderB = categoryOrderMap[b.category || ''] ?? 999999;
        if (orderA !== orderB) return orderA - orderB;
        const catCompare = (a.category || '').localeCompare(b.category || '', 'ko-KR');
        if (catCompare !== 0) return catCompare;
        return (a.name || '').localeCompare(b.name || '', 'ko-KR');
    });

    return (
        <div className="pb-20 bg-white">
            <Helmet>
                <title>상품목록 | 렌탈어때</title>
                <meta
                    name="description"
                    content="복합기, 노트북, 데스크탑 등 렌탈어때의 사무기기 렌탈 상품을 확인해보세요."
                />
                <link rel="canonical" href="https://rentalpartner.kr/products" />
            </Helmet>
            {parentCategories.length > 0 && (
                <div className="border-b border-slate-200 bg-white">
                    <Container>
                        <nav className="overflow-x-auto no-scrollbar -mx-[0.8rem] px-[0.8rem] md:mx-0 md:px-0 md:overflow-visible">
                            <div className="flex w-max items-center py-7 text-[15px] font-semibold md:w-full md:justify-between md:py-8 md:text-base">
                                {parentCategories.map((parent) => {
                                    const isActive = currentGroup === parent;

                                    return (
                                        <button
                                            key={parent}
                                            onClick={() => handleParentCategoryClick(parent)}
                                            className={`relative shrink-0 whitespace-nowrap px-4 text-center transition-colors md:flex-1 md:px-2 ${
                                                isActive
                                                    ? 'text-[#001E45]'
                                                    : 'text-slate-500 hover:text-[#001E45]'
                                            }`}
                                        >
                                            {parent}
                                            {isActive && (
                                                <span className="absolute -bottom-7 left-4 right-4 h-[2px] bg-[#001E45] md:-bottom-8 md:left-6 md:right-6" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </nav>
                    </Container>
                </div>
            )}
            <Container>
                <div className="pt-10 md:pt-16 mb-8 space-y-5 md:space-y-6">
                    {/* Title Logic: Use Current Group Name if available, otherwise URL Title or Active Category */}
                    <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight">
                        {currentGroup || urlTitle || (activeCategory !== '전체' ? activeCategory : "모든 상품")}
                    </h1>

                    {/* Category Filter */}
                    <div className="overflow-x-auto no-scrollbar -mx-[0.8rem] px-[0.8rem] pt-1 pb-1 md:mx-0 md:px-0 md:overflow-visible">
                        <div className="flex w-max gap-2.5 md:w-auto md:flex-wrap md:gap-3">
                            {displayedCategories.map((cat, idx) => (
                                <button
                                    key={`${cat}-${idx}`}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`h-10 shrink-0 whitespace-nowrap rounded-lg border px-4 text-[14px] md:h-[42px] md:text-[15px] font-semibold transition-all
                                        ${activeCategory === cat
                                            ? 'bg-[#001E45] text-white border-[#001E45] shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#001E45] hover:text-[#001E45]'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="animate-spin text-[#001E45]" size={40} />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-20 text-center text-gray-500">
                        등록된 상품이 없습니다. <Link to="/admin/products" className="text-[#001E45] underline">Admin에서 상품 추가</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <Link to={`/products/${product.id}`} key={product.id} className="group cursor-pointer">
                                <div className="relative aspect-[4/3] sm:aspect-square overflow-hidden bg-gray-50 mb-4 rounded-lg border border-gray-100">
                                    <img
                                        src={product.image_url || 'https://picsum.photos/seed/product/400/500'}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                    {product.stock === 0 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="text-white font-semibold">품절</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>

                                    <div className="flex flex-col">
                                        {!priceDisplayLoading && !isInquiryPriceMode(priceDisplayMode) && product.discount_rate && product.discount_rate > 0 && (
                                            <span className="text-red-600 font-semibold text-sm block">
                                                {product.discount_rate}%
                                            </span>
                                        )}
                                        <span className={getPublicPriceClassName({
                                            mode: priceDisplayMode,
                                            loading: priceDisplayLoading,
                                            visibleClass: 'font-semibold text-lg text-gray-900',
                                            hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                        })}>
                                            {getPublicPriceText({
                                                amount: product.price,
                                                mode: priceDisplayMode,
                                                loading: priceDisplayLoading,
                                                suffix: isVisiblePriceMode(priceDisplayMode) ? '원/일' : '원',
                                                zeroAsHidden: true,
                                            })}
                                        </span>
                                    </div>

                                    {product.stock !== undefined && product.stock > 0 && product.stock <= 3 && (
                                        <span className="text-xs text-orange-500">재고 {product.stock}개 남음</span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </Container>
        </div>
    );
};
