import React, { useEffect, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NavMenuItem, getAllNavMenuItems } from '../../src/api/cmsApi';
import { getCategories, type Category } from '../../src/api/categoryApi';
import { buildCategoryMaps, getCategoryHref, getCategoryHrefByName, sortCategories } from '../../src/utils/productCategoryRouting';
import { Container } from '../ui/Container';
import { useAuth } from '../../src/context/AuthContext';

interface FullMenuProps {
    onClose: () => void;
    variant?: 'mobile' | 'desktop';
    items?: NavMenuItem[];
}

export const FullMenu: React.FC<FullMenuProps> = ({ onClose, variant = 'mobile', items }) => {
    const [menuItems, setMenuItems] = useState<NavMenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, userProfile, logout } = useAuth();

    useEffect(() => {
        const loadCategoriesOnly = async () => {
            try {
                const categoryData = await getCategories().catch(() => []);
                setCategories(categoryData);
            } catch (error) {
                console.error('Failed to load categories:', error);
            }
        };

        if (items) {
            setMenuItems(items);
            void loadCategoriesOnly();
            setLoading(false);
            return;
        }

        const loadMenu = async () => {
            try {
                const [menuData, categoryData] = await Promise.all([
                    getAllNavMenuItems(),
                    getCategories().catch(() => []),
                ]);
                setMenuItems(menuData);
                setCategories(categoryData);
            } catch (error) {
                console.error('Failed to load menu:', error);
            } finally {
                setLoading(false);
            }
        };
        loadMenu();

    }, [variant, items]);

    const categoryGroups = React.useMemo(() => {
        if (categories.length === 0) return [];

        const { byId, childrenByParentId } = buildCategoryMaps(categories);
        const roots = sortCategories(categories.filter((category) => !category.parent_id));

        return roots.map((root) => ({
            name: root.name,
            link: getCategoryHref(root, byId),
            items: (childrenByParentId.get(root.id || null) || []).map((child) => ({
                id: child.id,
                name: child.name,
                link: getCategoryHref(child, byId),
            })),
        }));
    }, [categories]);

    // Fallback grouping from legacy nav_menu_items when categories are unavailable.
    const groups = React.useMemo(() => {
        if (categoryGroups.length > 0) {
            return categoryGroups;
        }

        const pMap = new Map<string, { name: string; items: NavMenuItem[]; display_order: number }>();

        // 1. Identify all defined parent items to check existence (Active + Inactive)
        const allDefinedParents = menuItems.filter(i => !i.category);
        const definedParentNames = new Set(allDefinedParents.map(p => p.name));

        // 2. Process ACTIVE Parents
        // We only create groups for Active Parents.
        // Inactive Parents are skipped, effectively hiding the group.
        allDefinedParents.forEach(p => {
            if (p.is_active) {
                pMap.set(p.name, {
                    name: p.name,
                    items: [],
                    display_order: p.display_order
                });
            }
        });

        // 3. Process ACTIVE Children
        const activeChildren = menuItems.filter(i => i.is_active && i.category);

        activeChildren.forEach(child => {
            const cat = child.category!;

            if (pMap.has(cat)) {
                // Belongs to an Active Parent
                pMap.get(cat)!.items.push(child);
            } else if (!definedParentNames.has(cat)) {
                // Orphan (Implicit Group) - Parent doesn't exist at all
                // Create implicit group
                if (!pMap.has(cat)) {
                    pMap.set(cat, { name: cat, items: [], display_order: 9999 });
                }
                pMap.get(cat)!.items.push(child);
            }
            // Else: Parent exists but is Inactive -> Skip child (Hide)
        });

        // 4. Convert to array and sort
        return Array.from(pMap.values()).sort((a, b) => a.display_order - b.display_order).map(g => ({
            ...g,
            items: g.items.sort((a, b) => a.display_order - b.display_order)
        }));
    }, [categoryGroups, menuItems]);

    const getGroupLink = (groupName: string) => {
        // Always try to resolve to the English SEO URL first
        const seoLink = getCategoryHrefByName(categories, groupName);
        if (seoLink && seoLink !== '/products') return seoLink;

        if (categoryGroups.length > 0) {
            const matched = categoryGroups.find((group) => group.name === groupName);
            if (matched?.link) return matched.link;
        }

        const parentObj = menuItems.find(i => i.name === groupName && !i.category);
        const parentLink = parentObj?.link?.trim();
        if (parentLink && parentLink !== '#' && parentLink !== '/products' && parentLink !== '/' && !parentLink.includes('?category=')) {
            return parentLink;
        }
        return seoLink && seoLink !== '/products' ? seoLink : `/products?category=${encodeURIComponent(groupName)}`;
    };

    return (
        <div
            className={`z-50 ${variant === 'mobile' ? 'fixed inset-0' : 'absolute top-full left-0 w-full'}`}
            style={variant === 'mobile' ? { zIndex: 9999 } : {}}
        >
            {/* Backdrop for Mobile */}
            {variant === 'mobile' && (
                <div
                    className="absolute inset-0 bg-slate-900/28 backdrop-blur-[2px] animate-fadeIn"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div
                className={`
                    bg-white flex flex-col
                    ${variant === 'mobile'
                        ? 'absolute top-0 right-0 bottom-0 w-[82vw] max-w-[360px] shadow-[0_18px_48px_rgba(15,23,42,0.18)] overflow-hidden animate-slideInRight'
                        : 'w-full border-t border-slate-200 shadow-xl max-h-[70vh]'}
                `}
                onMouseLeave={variant === 'desktop' ? onClose : undefined}
            >
                {/* Header - Only for Mobile */}
                {variant === 'mobile' && (
                    <>
                        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-white">
                            <img src="/ONlogo.png" alt="렌탈어때" className="h-[26px] object-contain" />
                            <button
                                onClick={onClose}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X size={22} className="text-current" />
                            </button>
                        </div>
                    </>
                )}

                {/* Content */}
                <div className={`flex-1 overflow-y-auto ${variant === 'mobile' ? '' : 'pt-8 px-8 pb-16'}`}>
                    <Container className={variant === 'mobile' ? '!px-0 !w-full !max-w-none' : ''}>
                        <div className={`${variant === 'mobile' ? 'pb-6' : 'grid grid-cols-1 md:grid-cols-4 gap-8'}`}>
                            {variant === 'mobile' && (
                                <div className="px-6 py-6 border-b border-slate-100 bg-white">
                                    {user ? (
                                        <>
                                            <h3 className="text-[20px] leading-[1.35] font-semibold text-slate-800">
                                                {(userProfile?.name || '고객')}님, 안녕하세요!
                                            </h3>
                                            <div className="mt-5 grid grid-cols-2 gap-2">
                                                <Link
                                                    to="/mypage"
                                                    onClick={onClose}
                                                    className="rounded-2xl bg-slate-100 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                                                >
                                                    마이페이지
                                                </Link>
                                                <Link
                                                    to="/cs"
                                                    onClick={onClose}
                                                    className="rounded-2xl border border-slate-100 bg-white py-3 text-center text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                                >
                                                    고객센터
                                                </Link>
                                            </div>
                                            <div className="mt-2 grid grid-cols-3 gap-2">
                                                <Link to="/notice" onClick={onClose} className="rounded-2xl border border-slate-100 bg-white py-2.5 text-center text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50">공지사항</Link>
                                                <Link to="/review" onClick={onClose} className="rounded-2xl border border-slate-100 bg-white py-2.5 text-center text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50">설치후기</Link>
                                                <Link to="/event" onClick={onClose} className="rounded-2xl border border-slate-100 bg-white py-2.5 text-center text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50">이벤트</Link>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-[20px] leading-[1.35] font-semibold text-slate-800">
                                                환영합니다!
                                            </h3>
                                            <div className="mt-5 grid grid-cols-2 gap-2">
                                                <Link
                                                    to="/login"
                                                    onClick={onClose}
                                                    className="rounded-2xl bg-slate-100 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                                                >
                                                    로그인
                                                </Link>
                                                <Link
                                                    to="/signup"
                                                    onClick={onClose}
                                                    className="rounded-2xl border border-slate-100 bg-white py-3 text-center text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                                >
                                                    회원가입
                                                </Link>
                                            </div>
                                            <div className="mt-2 grid grid-cols-3 gap-2">
                                                <Link to="/notice" onClick={onClose} className="rounded-2xl border border-slate-100 bg-white py-2.5 text-center text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50">공지사항</Link>
                                                <Link to="/review" onClick={onClose} className="rounded-2xl border border-slate-100 bg-white py-2.5 text-center text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50">설치후기</Link>
                                                <Link to="/cs" onClick={onClose} className="rounded-2xl border border-slate-100 bg-white py-2.5 text-center text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50">고객센터</Link>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {groups.map((group, idx) => (
                                <div key={idx} className={`${variant === 'mobile' ? 'border-b border-slate-50 last:border-0' : ''}`}>
                                    {/* Group Title */}
                                    {variant === 'mobile' ? (
                                        <Link
                                            to={getGroupLink(group.name)}
                                            onClick={onClose}
                                            className="flex h-[60px] w-full items-center justify-between px-6 text-left transition-colors hover:bg-slate-50"
                                        >
                                            <span className="text-[16px] font-semibold text-slate-800">
                                                {group.name}
                                            </span>
                                            <ChevronRight
                                                size={18}
                                                className="text-slate-400"
                                            />
                                        </Link>
                                    ) : (
                                        <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                                            <Link
                                                to={getGroupLink(group.name)}
                                                onClick={onClose}
                                                className="inline-flex hover:text-[#001E45] transition-colors"
                                            >
                                                {group.name}
                                            </Link>
                                        </h3>
                                    )}

                                    {/* Items List - Desktop only */}
                                    <div className={variant === 'mobile' ? 'hidden' : 'block'}>
                                        <ul className="space-y-3">
                                            {group.items.length > 0 ? (
                                                group.items.map(item => {
                                                    // Resolve SEO URL prioritizing English slugs
                                                    const seoLink = getCategoryHrefByName(categories, item.name);
                                                    let finalLink = seoLink && seoLink !== '/products' ? seoLink : (item as any).link;
                                                    
                                                    // Prevent legacy category query strings
                                                    if (finalLink?.includes('?category=')) {
                                                        finalLink = seoLink || finalLink;
                                                    }

                                                    // Prevent subcategories from just routing to /products
                                                    if (!finalLink || finalLink === '/products' || finalLink === '/') {
                                                        finalLink = `/products?category=${encodeURIComponent(item.name)}`;
                                                    }

                                                    return (
                                                        <li key={item.id}>
                                                            <Link
                                                                to={finalLink}
                                                                onClick={onClose}
                                                                className="block transition-all hover:text-[#001E45] text-slate-600 flex items-center gap-1 group text-sm"
                                                            >
                                                                {item.name}
                                                            </Link>
                                                        </li>
                                                    );
                                                })
                                            ) : (
                                                <li>
                                                    <Link
                                                        to={getGroupLink(group.name)}
                                                        onClick={onClose}
                                                        className="block p-3 text-sm text-slate-600 font-medium hover:text-[#001E45]"
                                                    >
                                                        바로가기
                                                    </Link>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                            {user && variant === 'mobile' && (
                                <div className="px-6 pt-5 border-t border-slate-100 flex justify-center">
                                    <button
                                        onClick={() => { logout(); onClose(); }}
                                        className="py-2.5 px-6 rounded-2xl bg-slate-50 text-slate-400 font-medium text-sm hover:bg-red-50 hover:text-red-400 transition-colors"
                                    >
                                        로그아웃
                                    </button>
                                </div>
                            )}
                        </div>
                    </Container>
                </div>
            </div>
        </div>
    );
};
