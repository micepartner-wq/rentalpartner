import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ArrowUpRight, Megaphone, MessageSquare, Headphones, Printer, Armchair, Monitor, Refrigerator, Tv, Package, Sparkles, Grid2X2 } from 'lucide-react';
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
        if (variant !== 'mobile') return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [variant, onClose]);

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

    if (variant === 'mobile') {
        const categoryIcon = (name: string) => {
            if (name.includes('사무기기')) return Printer;
            if (name.includes('가구')) return Armchair;
            if (name.includes('IT')) return Monitor;
            if (name.includes('가전')) return Refrigerator;
            if (name.includes('TV') || name.includes('캠')) return Tv;
            if (name.includes('패키지')) return Package;
            if (name.includes('행사')) return Sparkles;
            return Grid2X2;
        };

        return (
            <div className="fixed inset-0 z-[9999]">
                <button type="button" aria-label="메뉴 닫기" onClick={onClose} className="absolute inset-0 bg-[#102a47]/30 backdrop-blur-sm" />
                <div role="dialog" aria-modal="true" aria-label="전체 메뉴" className="absolute inset-y-0 right-0 flex w-[92vw] max-w-[420px] flex-col bg-[#f7f9fb] shadow-2xl animate-slideInRight motion-reduce:animate-none">
                    <div className="flex h-[76px] shrink-0 items-center justify-between px-6">
                        <Link to="/" onClick={onClose} aria-label="렌탈어때 홈"><img src="/logo.png" alt="렌탈어때" className="h-7 w-auto" /></Link>
                        <button autoFocus type="button" onClick={onClose} aria-label="전체 메뉴 닫기" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"><X size={21} strokeWidth={1.6} /></button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
                        <section className="rounded-2xl bg-[#e9f0f5] p-5">
                            <p className="mb-2 text-[11px] font-semibold tracking-[0.15em] text-[#53758c]">RENTAL PARTNER</p>
                            <h2 className="text-[22px] font-bold leading-snug tracking-tight text-[#102a47]">{user ? `${userProfile?.name || '고객'}님, 반갑습니다` : <>필요한 순간,<br />렌탈어때와 함께</>}</h2>
                            <div className="mt-5 flex items-center gap-4">
                                <Link to={user ? '/mypage' : '/login'} onClick={onClose} className="inline-flex min-h-11 items-center gap-5 rounded-xl bg-[#102a47] px-4 text-[13px] font-semibold text-white hover:bg-[#234761]">{user ? '마이페이지' : '로그인'}<ArrowUpRight size={16} /></Link>
                                <Link to={user ? '/quote-cart' : '/signup'} onClick={onClose} className="text-[13px] font-medium text-[#537085] hover:text-[#102a47]">{user ? '장바구니' : '회원가입'}<ChevronRight size={14} className="ml-1 inline" /></Link>
                            </div>
                        </section>
                        <Link to="/quote-request" onClick={onClose} className="mt-3 flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border border-[#cbdfe9] bg-white px-4 py-3 text-[#00659b] transition-colors hover:bg-[#edf5f9]">
                            <span className="text-[14px] font-semibold">견적 문의하기</span>
                            <ArrowUpRight size={19} strokeWidth={1.7} />
                        </Link>
                        <nav aria-label="고객 서비스" className="my-5 grid grid-cols-3 rounded-2xl border border-slate-100 bg-white py-4">
                            {[{ label: '공지사항', to: '/notice', Icon: Megaphone }, { label: '설치후기', to: '/review', Icon: MessageSquare }, { label: '고객센터', to: '/cs', Icon: Headphones }].map(({ label, to, Icon }) => <Link key={to} to={to} onClick={onClose} className="flex flex-col items-center gap-2 border-r border-slate-100 text-slate-600 last:border-0 hover:text-[#00659b]"><Icon size={21} strokeWidth={1.5} /><span className="text-[12px] font-medium">{label}</span></Link>)}
                        </nav>
                        <div className="mb-3 mt-7 flex items-center justify-between px-1"><h3 className="text-[16px] font-bold text-[#102a47]">어떤 제품을 찾으세요?</h3><Link to="/products" onClick={onClose} className="inline-flex items-center text-[12px] text-slate-500">전체보기<ChevronRight size={14} /></Link></div>
                        <nav aria-label="렌탈 상품 카테고리" className="grid grid-cols-2 gap-2.5">
                            {loading && <p className="col-span-2 py-6 text-center text-sm text-slate-500">상품 메뉴를 불러오고 있어요.</p>}
                            {groups.map(group => { const Icon = categoryIcon(group.name); return <Link key={group.name} to={getGroupLink(group.name)} onClick={onClose} className="group flex min-h-[100px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 transition-colors hover:border-[#b9d3e1] hover:bg-[#f0f6fa]"><Icon size={24} strokeWidth={1.4} className="text-[#53758c]" /><span className="mt-3 flex items-center justify-between gap-1 text-[13px] font-semibold text-[#243e53]">{group.name}<ArrowUpRight size={14} className="shrink-0 text-slate-400" /></span></Link>; })}
                        </nav>
                        {user && <div className="mt-6 flex justify-end border-t border-slate-200 pt-4"><button type="button" onClick={() => { logout(); onClose(); }} className="p-2 text-xs text-slate-500 hover:text-slate-800">로그아웃</button></div>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute top-full left-0 z-50 w-full">
            <div className="flex max-h-[70vh] w-full flex-col border-t border-slate-200 bg-white shadow-xl" onMouseLeave={onClose}>
                <div className="flex-1 overflow-y-auto px-8 pt-8 pb-16">
                    <Container>
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                            {groups.map(group => (
                                <div key={group.name}>
                                    <h3 className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-900"><Link to={getGroupLink(group.name)} onClick={onClose} className="inline-flex transition-colors hover:text-[#001E45]">{group.name}</Link></h3>
                                    <ul className="space-y-3">
                                        {group.items.length > 0 ? group.items.map(item => {
                                            const seoLink = getCategoryHrefByName(categories, item.name);
                                            let finalLink = seoLink && seoLink !== '/products' ? seoLink : (item as any).link;
                                            if (finalLink?.includes('?category=')) finalLink = seoLink || finalLink;
                                            if (!finalLink || finalLink === '/products' || finalLink === '/') finalLink = '/products?category=' + encodeURIComponent(item.name);
                                            return <li key={item.id}><Link to={finalLink} onClick={onClose} className="flex items-center gap-1 text-sm text-slate-600 transition-all hover:text-[#001E45]">{item.name}</Link></li>;
                                        }) : <li><Link to={getGroupLink(group.name)} onClick={onClose} className="block p-3 text-sm font-medium text-slate-600 hover:text-[#001E45]">바로가기</Link></li>}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </Container>
                </div>
            </div>
        </div>
    );
};
