import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Edit2, Trash2, X, Save, Loader2, Eye, EyeOff,
    Grid3X3, Image as ImageIcon, Upload, GripVertical, MessageSquare
} from 'lucide-react';
import {
    getAllQuickMenuItems, addQuickMenuItem, updateQuickMenuItem, deleteQuickMenuItem, QuickMenuItem,
    getAllBanners, addBanner, updateBanner, deleteBanner, Banner,
    getAllPopups, addPopup, updatePopup, deletePopup, Popup,
    getAllAllianceMembers, addAllianceMember, updateAllianceMember, deleteAllianceMember, AllianceMember
} from '../../src/api/cmsApi';
import { getProducts, Product } from '../../src/api/productApi';
import { uploadImage } from '../../src/api/storageApi';

type TabType = 'quickmenu' | 'banners' | 'popups' | 'alliance';
type PopupLinkMode = 'none' | 'link' | 'product';

const getPopupLinkMode = (popup?: { link?: string | null; target_product_code?: string | null }): PopupLinkMode => {
    if (popup?.target_product_code) return 'product';

    const link = (popup?.link || '').trim();
    if (link && link !== '/') return 'link';

    return 'none';
};

const getBannerLinkMode = (banner?: { link?: string | null; target_product_code?: string | null }): PopupLinkMode => {
    if (banner?.target_product_code) return 'product';

    const link = (banner?.link || '').trim();
    if (link) return 'link';

    return 'none';
};

export const CMSManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('quickmenu');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mobileImageInputRef = useRef<HTMLInputElement>(null);

    // Data states
    const [quickMenuItems, setQuickMenuItems] = useState<QuickMenuItem[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [popups, setPopups] = useState<Popup[]>([]);
    const [allianceMembers, setAllianceMembers] = useState<AllianceMember[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Form states
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [bannerLinkMode, setBannerLinkMode] = useState<PopupLinkMode>('none');
    const [popupLinkMode, setPopupLinkMode] = useState<PopupLinkMode>('none');
    const quickMenuCategoryOptions = Array.from(
        new Set(
            products
                .map((product) => product.category)
                .filter((category): category is string => Boolean(category && category.trim()))
        )
    ).sort((a, b) => a.localeCompare(b, 'ko'));

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch individually to handle errors gracefully (e.g. if popups table doesn't exist yet)
            const quickMenuPromise = getAllQuickMenuItems().catch(e => { console.error("CMS Load Error (QuickMenu):", e); return []; });
            const bannerPromise = getAllBanners().catch(e => { console.error("CMS Load Error (Banners):", e); return []; });
            const popupPromise = getAllPopups().catch(e => { console.error("CMS Load Error (Popups):", e); return []; });
            const alliancePromise = getAllAllianceMembers().catch(e => { console.error("CMS Load Error (Alliance):", e); return []; });
            const productsPromise = getProducts().catch(e => { console.error("CMS Load Error (Products):", e); return []; });

            const [quickMenu, bannerData, popupData, allianceData, productsData] = await Promise.all([
                quickMenuPromise,
                bannerPromise,
                popupPromise,
                alliancePromise,
                productsPromise
            ]);

            setQuickMenuItems(quickMenu);
            setBanners(bannerData);
            setPopups(popupData);
            setAllianceMembers(allianceData);
            setProducts(productsData);
        } catch (error) {
            console.error('Failed to load CMS data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        if (activeTab === 'quickmenu') {
            setFormData({ name: '', link: '/', category: '', display_order: quickMenuItems.length + 1, is_active: true });
        } else if (activeTab === 'banners') {
            setFormData({ title: '', subtitle: '', image_url: '', mobile_image_url: null, link: '', button_text: '자세히보기', brand_text: 'Humanpartner', display_mode: 'text', banner_type: 'hero', display_order: banners.length + 1, is_active: true });
            setBannerLinkMode('none');
        } else if (activeTab === 'popups') {
            setFormData({ title: '', image_url: '', link: '', start_date: '', end_date: '', display_order: popups.length + 1, is_active: true });
            setPopupLinkMode('none');
        } else if (activeTab === 'alliance') {
            setFormData({ name: '', category1: 'MICE 시설분과', category2: '호텔', address: '', phone: '', logo_url: '', display_order: allianceMembers.length + 1, is_active: true });
        }
        setShowModal(true);
    };

    const openEditModal = (item: any) => {
        setEditingItem(item);
        setFormData(activeTab === 'banners' ? { ...item, display_mode: item.display_mode || 'text' } : { ...item });
        if (activeTab === 'banners') {
            setBannerLinkMode(getBannerLinkMode(item));
        }
        if (activeTab === 'popups') {
            setPopupLinkMode(getPopupLinkMode(item));
        }
        setShowModal(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField?: 'mobile_image_url') => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }
        setUploading(true);
        try {
            const imageUrl = await uploadImage(file);
            const field = targetField || (activeTab === 'alliance' ? 'logo_url' : 'image_url');
            setFormData((current: any) => ({
                ...current,
                [field]: imageUrl,
                ...(activeTab === 'banners' && field === 'image_url' && current.display_mode === 'image' && !current.title?.trim()
                    ? { title: file.name.replace(/\.[^.]+$/, '') }
                    : {}),
            }));
        } catch (error) {
            console.error('Upload failed:', error);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === 'banners' && !formData.image_url?.trim()) {
            alert('PC 배너 이미지를 등록해주세요.');
            return;
        }
        setSaving(true);
        try {
            if (activeTab === 'quickmenu') {
                const normalizedCategory = (formData.category || '').trim();
                const quickMenuPayload = {
                    ...formData,
                    category: normalizedCategory || null,
                    link: normalizedCategory ? '/products' : (formData.link || '/')
                };

                if (editingItem) {
                    await updateQuickMenuItem(editingItem.id, quickMenuPayload);
                } else {
                    await addQuickMenuItem(quickMenuPayload);
                }
            } else if (activeTab === 'banners') {
                const normalizedBannerLink = (formData.link || '').trim();
                const displayMode = formData.display_mode === 'image' ? 'image' : 'text';
                const bannerPayload = {
                    ...formData,
                    title: formData.title?.trim() || (displayMode === 'image' ? '이미지 배너' : ''),
                    banner_type: 'hero',
                    tab_id: null,
                    link: bannerLinkMode === 'link' ? normalizedBannerLink : '',
                    target_product_code: bannerLinkMode === 'product' ? (formData.target_product_code || null) : null,
                };
                if (formData.mobile_image_url || editingItem?.mobile_image_url) {
                    bannerPayload.mobile_image_url = formData.mobile_image_url || null;
                } else {
                    delete bannerPayload.mobile_image_url;
                }
                if (displayMode === 'image' || editingItem?.display_mode) {
                    bannerPayload.display_mode = displayMode;
                } else {
                    delete bannerPayload.display_mode;
                }
                if (editingItem) {
                    await updateBanner(editingItem.id, bannerPayload);
                } else {
                    await addBanner(bannerPayload);
                }
            } else if (activeTab === 'popups') {
                // Handle empty dates as null
                const normalizedPopupLink = (formData.link || '').trim();
                const popupData = {
                    ...formData,
                    link: popupLinkMode === 'link' ? normalizedPopupLink : '',
                    target_product_code: popupLinkMode === 'product' ? (formData.target_product_code || null) : null,
                    start_date: formData.start_date || null,
                    end_date: formData.end_date || null
                };

                if (editingItem) {
                    await updatePopup(editingItem.id, popupData);
                } else {
                    await addPopup(popupData);
                }
            } else if (activeTab === 'alliance') {
                if (editingItem) {
                    await updateAllianceMember(editingItem.id, formData);
                } else {
                    await addAllianceMember(formData);
                }
            }
            await loadData();
            setShowModal(false);
        } catch (error: any) {
            console.error('Save failed:', error);
            if (activeTab === 'banners' && /mobile_image_url|display_mode/.test(String(error?.message || ''))) {
                alert('이미지형 배너를 저장하려면 먼저 Supabase SQL Editor에서 add_banners_image_mode.sql을 실행해주세요.');
                return;
            }
            // Show detailed error message
            alert(`저장에 실패했습니다.\n\n오류 내용: ${error.message || JSON.stringify(error)}\n\n(Tip: 만약 'relation "popups" does not exist' 오류라면 데이터베이스에 테이블이 없는 것입니다. SQL 실행이 필요합니다.)`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            if (activeTab === 'quickmenu') {
                await deleteQuickMenuItem(id);
            } else if (activeTab === 'banners') {
                await deleteBanner(id);
            } else if (activeTab === 'popups') {
                await deletePopup(id);
            } else if (activeTab === 'alliance') {
                await deleteAllianceMember(id);
            }
            await loadData();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const toggleActive = async (item: any) => {
        try {
            if (activeTab === 'quickmenu') {
                await updateQuickMenuItem(item.id, { is_active: !item.is_active });
            } else if (activeTab === 'banners') {
                await updateBanner(item.id, { is_active: !item.is_active });
            } else if (activeTab === 'popups') {
                await updatePopup(item.id, { is_active: !item.is_active });
            } else if (activeTab === 'alliance') {
                await updateAllianceMember(item.id, { is_active: !item.is_active });
            }
            await loadData();
        } catch (error) {
            console.error('Toggle failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#001E45]" size={40} />
            </div>
        );
    }

    const tabs = [
        { id: 'quickmenu' as TabType, label: '아이콘 메뉴', icon: Grid3X3, count: quickMenuItems.length },
        { id: 'banners' as TabType, label: '배너', icon: ImageIcon, count: banners.length },
        { id: 'popups' as TabType, label: '팝업', icon: MessageSquare, count: popups.length },
    ];

    const currentItems = activeTab === 'quickmenu' ? quickMenuItems
        : activeTab === 'banners' ? banners
            : activeTab === 'popups' ? popups
                : activeTab === 'alliance' ? allianceMembers : [];

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">CMS 관리</h1>
                    <p className="text-sm text-slate-500 mt-1">메인 페이지 UI 요소들을 관리합니다</p>
                    <p className="text-xs text-slate-400 mt-1">GNB 탭/게시글 관리는 별도 메뉴의 "GNB 섹션 관리"에서 관리합니다.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-[#001E45] text-white px-4 py-2 rounded-lg hover:bg-[#001E45] transition-colors"
                >
                    <Plus size={20} />
                    추가
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
                            ? 'text-[#001E45] border-[#001E45]'
                            : 'text-slate-500 border-transparent hover:text-slate-700'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Items List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                {currentItems.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        등록된 항목이 없습니다. 항목을 추가해주세요.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {currentItems.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 rounded-xl">
                                <GripVertical size={20} className="text-slate-300 cursor-grab" />

                                {((activeTab === 'banners' || activeTab === 'popups') && item.image_url) && (
                                    <img src={item.image_url} alt={item.title} className={`w-20 h-12 rounded ${activeTab === 'banners' && item.display_mode === 'image' ? 'object-contain bg-white border border-slate-100' : 'object-cover'}`} />
                                )}
                                {(activeTab === 'alliance' && item.logo_url) && (
                                    <div className="w-20 h-12 bg-gray-100 flex items-center justify-center rounded-lg">
                                        <img src={item.logo_url} alt={item.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-800 truncate">
                                            {item.name || item.title}
                                        </span>
                                        {activeTab === 'banners' && (
                                            <span className={`text-xs px-2 py-0.5 rounded border ${item.banner_type === 'hero'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                }`}>
                                                {item.banner_type === 'hero' ? '메인 슬라이드' : '프로모션'}
                                            </span>
                                        )}
                                        {activeTab === 'banners' && item.display_mode === 'image' && (
                                            <span className="text-xs px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">이미지형</span>
                                        )}
                                        {activeTab === 'quickmenu' && item.category && (
                                            <span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                                                카테고리 연결: {item.category}
                                            </span>
                                        )}
                                        {!item.is_active && (
                                            <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded">비활성</span>
                                        )}

                                        {activeTab === 'popups' && (
                                            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                                                {item.start_date && item.end_date ? `${item.start_date} ~ ${item.end_date}` : '상시 노출'}
                                            </span>
                                        )}
                                        {activeTab === 'alliance' && (
                                            <>
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border
                                                    ${item.category1 === 'MICE 시설분과' ? 'text-[#e69b00] bg-[#fff9ea] border-[#ffe099]' :
                                                        item.category1 === 'MICE 기획 · 운영분과' || item.category1 === 'MICE 기획분과' ? 'text-[#3b5bdb] bg-[#edf2ff] border-[#bac8ff]' :
                                                            item.category1 === 'MICE 지원분과' ? 'text-[#0ca678] bg-[#e6fcf5] border-[#63e6be]' :
                                                                'text-gray-600 bg-gray-100 border-gray-300'}`}
                                                >
                                                    {item.category1 === 'MICE 기획분과' ? 'MICE 기획 · 운영분과' : item.category1}
                                                </span>
                                                <span className="text-[11px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                    {item.category2}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {activeTab === 'alliance'
                                            ? item.phone
                                            : activeTab === 'banners'
                                                ? item.target_product_code
                                                    ? `/p/${item.target_product_code}`
                                                    : (item.link || '연결 안 함')
                                            : activeTab === 'popups'
                                                ? item.target_product_code
                                                    ? `/p/${item.target_product_code}`
                                                    : (item.link || '연결 안 함')
                                            : activeTab === 'quickmenu' && item.category
                                                ? `/products?category=${item.category}`
                                                : item.link}
                                    </span>
                                </div>

                                <span className="text-xs text-slate-400">순서: {item.display_order}</span>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => toggleActive(item)}
                                        className={`p-2 rounded-lg transition-colors ${item.is_active ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'
                                            }`}
                                        title={item.is_active ? '비활성화' : '활성화'}
                                    >
                                        {item.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                    <button
                                        onClick={() => openEditModal(item)}
                                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="수정"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingItem ? '수정' : '추가'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {/* QuickMenu Form */}
                            {activeTab === 'quickmenu' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">아이콘 이미지 (선택)</label>
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={formData.image_url || ''}
                                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                                placeholder="이미지 URL 입력 또는 업로드"
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] text-sm"
                                            />
                                            <input
                                                type="file"
                                                id="quickmenu-file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                            <div className="flex gap-2">
                                                <label
                                                    htmlFor="quickmenu-file"
                                                    className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                                                >
                                                    {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                                                    이미지 업로드
                                                </label>
                                                {formData.image_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, image_url: '' })}
                                                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                            {formData.image_url && (
                                                <div className="relative w-16 h-16 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                                                    <img src={formData.image_url} alt="Icon Preview" className="w-full h-full object-contain" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">링크</label>
                                        <input
                                            type="text"
                                            value={formData.link || ''}
                                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                            disabled={Boolean(formData.category)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] ${formData.category ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`}
                                            placeholder="/products?category=hotel"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            {formData.category
                                                ? '카테고리 연결이 활성화되어 링크는 자동으로 /products 로 처리됩니다.'
                                                : '직접 이동할 경로를 입력하세요.'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">상품 카테고리 연결 (선택)</label>
                                        <select
                                            value={formData.category || ''}
                                            onChange={(e) => {
                                                const selectedCategory = e.target.value;
                                                setFormData({
                                                    ...formData,
                                                    category: selectedCategory,
                                                    link: selectedCategory ? '/products' : (formData.link || '/')
                                                });
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] bg-white"
                                        >
                                            <option value="">직접 링크 사용</option>
                                            {quickMenuCategoryOptions.map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-500 mt-1">선택하면 아이콘 클릭 시 해당 카테고리의 상품 목록으로 이동합니다.</p>
                                    </div>
                                </>
                            )}

                            {/* Banner Form */}
                            {activeTab === 'banners' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">배너 타입</label>
                                        <input
                                            type="text"
                                            value="메인 슬라이드 (상단 전체 배너)"
                                            readOnly
                                            className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-600"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">프로모션 배너는 GNB 게시글 썸네일 구조로 이관되어 사용하지 않습니다.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">슬라이드 표시 방식</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'text', label: '문구형', description: '이미지 위에 제목과 버튼 표시' },
                                                { value: 'image', label: '이미지형', description: '이미지 전체를 그대로 표시' },
                                            ].map((mode) => (
                                                <button
                                                    key={mode.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, display_mode: mode.value })}
                                                    className={`rounded-lg border p-3 text-left transition-colors ${formData.display_mode === mode.value ? 'border-[#001E45] bg-blue-50 text-[#001E45]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                                >
                                                    <span className="block text-sm font-semibold">{mode.label}</span>
                                                    <span className="block text-xs mt-1 opacity-70">{mode.description}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {formData.display_mode === 'image' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">관리용 이름 · 이미지 설명 <span className="font-normal text-slate-400">(선택)</span></label>
                                            <input
                                                type="text"
                                                value={formData.title || ''}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="비우면 '이미지 배너'로 저장"
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">새 이미지를 올리면 파일명이 자동 입력됩니다. 화면에는 표시되지 않습니다.</p>
                                        </div>
                                    ) : <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">브랜드 텍스트</label>
                                        <input
                                            type="text"
                                            value={formData.brand_text || ''}
                                            onChange={(e) => setFormData({ ...formData, brand_text: e.target.value })}
                                            placeholder="렌탈어때"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">제목 위에 표시되는 작은 텍스트 (비우면 기본값 사용)</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                                        <input
                                            type="text"
                                            value={formData.title || ''}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">부제목</label>
                                        <input
                                            type="text"
                                            value={formData.subtitle || ''}
                                            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                        />
                                    </div>
                                    </>}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">PC 배너 이미지</label>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        {formData.image_url ? (
                                            <div className="relative">
                                                <img src={formData.image_url} alt="배너 미리보기" className={`w-full rounded-lg ${formData.display_mode === 'image' ? 'h-40 object-contain bg-white border border-slate-200' : 'h-32 object-cover'}`} />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, image_url: '' })}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-[#001E45] transition-colors"
                                            >
                                                {uploading ? (
                                                    <Loader2 className="animate-spin text-[#001E45]" size={20} />
                                                ) : (
                                                    <>
                                                        <Upload className="text-slate-400" size={20} />
                                                        <span className="text-sm text-slate-500">이미지 업로드</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <p className="text-xs text-slate-500 mt-2">{formData.display_mode === 'image' ? '이미지형은 잘라내지 않고 전체를 보여줍니다. 남는 공간은 흰색으로 표시됩니다.' : '권장 크기 2400 × 1100px'} · 모바일 이미지가 없으면 이 이미지가 사용됩니다.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">모바일 배너 이미지 <span className="font-normal text-slate-400">(선택)</span></label>
                                        <input
                                            type="file"
                                            ref={mobileImageInputRef}
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'mobile_image_url')}
                                            className="hidden"
                                        />
                                        {formData.mobile_image_url ? (
                                            <div className="relative w-36">
                                                <img src={formData.mobile_image_url} alt="모바일 배너 미리보기" className={`w-36 h-48 rounded-lg ${formData.display_mode === 'image' ? 'object-contain bg-white border border-slate-200' : 'object-cover'}`} />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, mobile_image_url: null })}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                    aria-label="모바일 배너 이미지 삭제"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => mobileImageInputRef.current?.click()}
                                                disabled={uploading}
                                                className="w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-[#001E45] transition-colors disabled:opacity-50"
                                            >
                                                {uploading ? <Loader2 className="animate-spin text-[#001E45]" size={20} /> : <>
                                                    <Upload className="text-slate-400" size={20} />
                                                    <span className="text-sm text-slate-500">모바일 이미지 업로드</span>
                                                </>}
                                            </button>
                                        )}
                                        <p className="text-xs text-slate-500 mt-2">권장 크기 1080 × 1600px · 비워두면 PC 이미지를 사용합니다.{formData.display_mode === 'image' && ' 가로형 PC 이미지는 모바일에서 작게 보일 수 있습니다.'}</p>
                                    </div>
                                    {formData.display_mode !== 'image' && <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">버튼 텍스트</label>
                                        <input
                                            type="text"
                                            value={formData.button_text || ''}
                                            onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                        />
                                    </div>}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">연결 방식</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'none', label: '연결 안 함' },
                                                { id: 'link', label: '직접 링크' },
                                                { id: 'product', label: '상품 연결' },
                                            ].map((option) => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => setBannerLinkMode(option.id as PopupLinkMode)}
                                                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                                        bannerLinkMode === option.id
                                                            ? 'bg-[#001E45] text-white border-[#001E45]'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            {formData.display_mode === 'image' ? '연결 대상을 선택하면 이미지 전체를 클릭할 수 있습니다. 연결하지 않아도 됩니다.' : '배너 클릭 시 이동할 대상을 선택합니다. 직접 링크와 상품 연결은 동시에 사용하지 않습니다.'}
                                        </p>
                                    </div>
                                    {bannerLinkMode === 'link' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">링크 입력</label>
                                            <input
                                                type="text"
                                                value={formData.link || ''}
                                                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                                placeholder="예: https://humanpartner.kr 또는 /products"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                외부 링크는 `https://`, 내부 페이지는 `/products`처럼 입력해주세요.
                                            </p>
                                        </div>
                                    )}
                                    {bannerLinkMode === 'product' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">연결할 상품</label>
                                            <div className="space-y-2">
                                                <select
                                                    value={formData.target_product_code || ''}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, target_product_code: e.target.value });
                                                    }}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                                >
                                                    <option value="">상품 선택</option>
                                                    {products.map((product) => (
                                                        <option key={product.id} value={product.product_code || product.id}>
                                                            {product.name} ({product.product_code || 'No Code'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                선택한 상품의 상세 페이지로 연결됩니다.
                                            </p>
                                        </div>
                                    )}
                                    {bannerLinkMode === 'none' && (
                                        <p className="text-xs text-slate-500">
                                            현재 배너는 클릭해도 이동하지 않습니다.
                                        </p>
                                    )}
                                </>
                            )}

                            {/* Popup Form */}
                            {activeTab === 'popups' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">제목 (관리용)</label>
                                        <input
                                            type="text"
                                            value={formData.title || ''}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">팝업 이미지</label>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        {formData.image_url ? (
                                            <div className="relative">
                                                <img src={formData.image_url} alt="Popup" className="w-full h-auto object-contain rounded-lg max-h-[200px]" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, image_url: '' })}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-[#001E45] transition-colors"
                                            >
                                                {uploading ? (
                                                    <Loader2 className="animate-spin text-[#001E45]" size={20} />
                                                ) : (
                                                    <>
                                                        <Upload className="text-slate-400" size={20} />
                                                        <span className="text-sm text-slate-500">이미지 업로드</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">연결 방식</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'none', label: '연결 안 함' },
                                                { id: 'link', label: '직접 링크' },
                                                { id: 'product', label: '상품 연결' },
                                            ].map((option) => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => setPopupLinkMode(option.id as PopupLinkMode)}
                                                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                                        popupLinkMode === option.id
                                                            ? 'bg-[#001E45] text-white border-[#001E45]'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            팝업 클릭 시 이동할 대상을 선택합니다. 직접 링크와 상품 연결은 동시에 사용하지 않습니다.
                                        </p>
                                    </div>
                                    {popupLinkMode === 'link' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">링크 입력</label>
                                            <input
                                                type="text"
                                                value={formData.link || ''}
                                                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                                placeholder="예: https://humanpartner.kr 또는 /products"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                외부 링크는 `https://`, 내부 페이지는 `/products`처럼 입력해주세요.
                                            </p>
                                        </div>
                                    )}
                                    {popupLinkMode === 'product' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">연결할 상품</label>
                                            <div className="space-y-2">
                                                <select
                                                    value={formData.target_product_code || ''}
                                                    onChange={(e) => {
                                                        setFormData({
                                                            ...formData,
                                                            target_product_code: e.target.value,
                                                        });
                                                    }}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                                >
                                                    <option value="">상품 선택</option>
                                                    {products.map((product) => (
                                                        <option key={product.id} value={product.product_code || product.id}>
                                                            {product.name} ({product.product_code || 'No Code'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                선택한 상품의 상세 페이지로 연결됩니다.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">게시 시작일</label>
                                            <input
                                                type="date"
                                                value={formData.start_date || ''}
                                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">게시 종료일</label>
                                            <input
                                                type="date"
                                                value={formData.end_date || ''}
                                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Alliance Form */}
                            {activeTab === 'alliance' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">상호명(이름)</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">1차 카테고리 (분과)</label>
                                            <select
                                                value={formData.category1 || 'MICE 시설분과'}
                                                onChange={(e) => setFormData({ ...formData, category1: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            >
                                                <option value="MICE 시설분과">MICE 시설분과</option>
                                                <option value="MICE 기획 · 운영분과">MICE 기획 · 운영분과</option>
                                                <option value="MICE 지원분과">MICE 지원분과</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">2차 카테고리 (분류)</label>
                                            <input
                                                type="text"
                                                value={formData.category2 || ''}
                                                onChange={(e) => setFormData({ ...formData, category2: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                                placeholder="예: 호텔, 컨벤션센터 등"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">주소</label>
                                        <input
                                            type="text"
                                            value={formData.address || ''}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            placeholder="주소 입력"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
                                        <input
                                            type="text"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                            placeholder="042-000-0000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">로고 이미지</label>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        {formData.logo_url ? (
                                            <div className="relative border border-gray-200 rounded-lg p-4 bg-gray-50 flex justify-center">
                                                <img src={formData.logo_url} alt="Logo" className="h-20 object-contain mix-blend-multiply" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, logo_url: '' })}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-[#001E45] transition-colors"
                                            >
                                                {uploading ? (
                                                    <Loader2 className="animate-spin text-[#001E45]" size={20} />
                                                ) : (
                                                    <>
                                                        <Upload className="text-slate-400" size={20} />
                                                        <span className="text-sm text-slate-500">이미지 업로드</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">배경이 투명하거나 흰색인 로고 이미지를 권장합니다.</p>
                                    </div>
                                </>
                            )}

                            {/* Common fields */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">표시 순서</label>
                                <input
                                    type="number"
                                    value={formData.display_order || 1}
                                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
                                    min="1"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || uploading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#001E45] text-white rounded-lg hover:bg-[#001E45] disabled:bg-slate-400"
                                >
                                    {saving || uploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {uploading ? '업로드 중' : '저장'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CMSManager;
