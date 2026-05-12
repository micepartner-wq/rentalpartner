import { useEffect, useMemo, useRef, useState } from 'react';
import { Edit2, Eye, EyeOff, Image as ImageIcon, Loader2, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import {
    addBoardPost,
    addTabMenuItem,
    deleteBoardPost,
    deleteTabMenuItem,
    getAllBoardPosts,
    getAllTabMenuItems,
    BoardPost,
    BoardPostType,
    TabMenuItem,
    updateTabMenuItem,
    updateBoardPost
} from '../../src/api/cmsApi';
import { uploadImage } from '../../src/api/storageApi';
import {
    BoardCategoryBoardType,
    getBoardCategories,
    upsertBoardCategories
} from '../../src/api/siteSettingsApi';
import {
    buildGnbContentImageToken,
    extractGnbContentImageUrls,
    stripGnbContentImages
} from '../../src/utils/gnbContent';

type FilterType = 'all' | BoardPostType;

const TAB_LABEL: Record<BoardPostType, string> = {
    notice: '공지사항',
    event: '이벤트',
    review: '설치후기'
};

const TAB_BADGE_STYLE: Record<BoardPostType, string> = {
    notice: 'bg-blue-50 text-blue-700 border-blue-200',
    event: 'bg-orange-50 text-orange-700 border-orange-200',
    review: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

interface FormData {
    board_type: BoardPostType;
    category: string;
    title: string;
    content: string;
    image_url: string;
    link: string;
    display_order: number;
    is_active: boolean;
}

interface TabFormData {
    name: string;
    link: string;
    display_order: number;
    is_active: boolean;
}

const EMPTY_FORM: FormData = {
    board_type: 'notice',
    category: '',
    title: '',
    content: '',
    image_url: '',
    link: '',
    display_order: 1,
    is_active: true
};

const EMPTY_TAB_FORM: TabFormData = {
    name: '',
    link: '/notice',
    display_order: 1,
    is_active: true
};

const TAB_PRESETS = [
    { name: '공지사항', link: '/notice' },
    { name: '이벤트', link: '/event' },
    { name: '설치후기', link: '/review' },
    { name: '고객센터', link: '/cs' },
];

const BOARD_CATEGORY_TYPES: BoardCategoryBoardType[] = ['notice', 'review'];

const normalizeCategoryValue = (value: unknown) => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

const normalizeCategoryList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];

    return Array.from(
        new Set(
            value
                .map((item) => normalizeCategoryValue(item))
                .filter((item) => Boolean(item)),
        ),
    );
};

const serializeBoardCategorySettings = (
    settings: Record<BoardCategoryBoardType, string[]>,
) =>
    JSON.stringify({
        notice: settings.notice,
        review: settings.review,
    });

const resolveBoardCategorySelection = (
    boardType: BoardPostType,
    currentCategory: string,
    categories: Record<BoardCategoryBoardType, string[]>,
) => {
    if (boardType === 'event') return '';

    const nextCategories = categories[boardType];
    const normalizedCurrent = normalizeCategoryValue(currentCategory);

    if (normalizedCurrent && nextCategories.includes(normalizedCurrent)) {
        return normalizedCurrent;
    }

    return nextCategories[0] || normalizedCurrent;
};

export const GnbSectionManager = () => {
    const [gnbTabs, setGnbTabs] = useState<TabMenuItem[]>([]);
    const [posts, setPosts] = useState<BoardPost[]>([]);
    const [boardCategories, setBoardCategories] = useState<Record<BoardCategoryBoardType, string[]>>({
        notice: [],
        review: [],
    });
    const [savedBoardCategorySnapshot, setSavedBoardCategorySnapshot] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tabSaving, setTabSaving] = useState(false);
    const [categorySaving, setCategorySaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [selectedCategoryBoardType, setSelectedCategoryBoardType] = useState<BoardCategoryBoardType>('notice');
    const [newCategoryName, setNewCategoryName] = useState('');

    const [showTabModal, setShowTabModal] = useState(false);
    const [editingTab, setEditingTab] = useState<TabMenuItem | null>(null);
    const [tabFormData, setTabFormData] = useState<TabFormData>(EMPTY_TAB_FORM);

    const [showModal, setShowModal] = useState(false);
    const [editingPost, setEditingPost] = useState<BoardPost | null>(null);
    const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
    const thumbnailFileInputRef = useRef<HTMLInputElement>(null);
    const contentFileInputRef = useRef<HTMLInputElement>(null);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [contentSelection, setContentSelection] = useState({ start: 0, end: 0 });

    const loadData = async () => {
        setLoading(true);
        try {
            const [postData, tabData, noticeCategories, reviewCategories] = await Promise.all([
                getAllBoardPosts(),
                getAllTabMenuItems(),
                getBoardCategories('notice'),
                getBoardCategories('review'),
            ]);
            const categorySettings: Record<BoardCategoryBoardType, string[]> = {
                notice: normalizeCategoryList(noticeCategories),
                review: normalizeCategoryList(reviewCategories),
            };

            setPosts(postData as BoardPost[]);
            setGnbTabs(tabData);
            setBoardCategories(categorySettings);
            setSavedBoardCategorySnapshot(serializeBoardCategorySettings(categorySettings));
        } catch (error) {
            console.error('Failed to load GNB tab posts:', error);
            alert('GNB 탭 데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredPosts = useMemo(() => {
        if (filterType === 'all') return posts;
        return posts.filter((post) => post.board_type === filterType);
    }, [posts, filterType]);
    const contentImageUrls = useMemo(() => extractGnbContentImageUrls(formData.content), [formData.content]);
    const categoryFormOptions = formData.board_type === 'event'
        ? []
        : boardCategories[formData.board_type as BoardCategoryBoardType] || [];
    const categoryFormHasOptions = categoryFormOptions.length > 0;
    const categorySettingsDirty = useMemo(
        () => serializeBoardCategorySettings(boardCategories) !== savedBoardCategorySnapshot,
        [boardCategories, savedBoardCategorySnapshot],
    );

    const openAddTabModal = () => {
        setEditingTab(null);
        setTabFormData({
            ...EMPTY_TAB_FORM,
            display_order: gnbTabs.length + 1
        });
        setShowTabModal(true);
    };

    const openEditTabModal = (tab: TabMenuItem) => {
        setEditingTab(tab);
        setTabFormData({
            name: tab.name || '',
            link: tab.link || '/notice',
            display_order: tab.display_order || 1,
            is_active: tab.is_active
        });
        setShowTabModal(true);
    };

    const closeTabModal = () => {
        setShowTabModal(false);
        setEditingTab(null);
    };

    const handleTabSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTabSaving(true);
        try {
            if (editingTab?.id) {
                await updateTabMenuItem(editingTab.id, tabFormData);
            } else {
                await addTabMenuItem(tabFormData);
            }
            await loadData();
            closeTabModal();
        } catch (error) {
            console.error('Failed to save GNB tab:', error);
            alert('탭 저장에 실패했습니다.');
        } finally {
            setTabSaving(false);
        }
    };

    const handleDeleteTab = async (id?: string) => {
        if (!id) return;
        if (!confirm('이 탭을 삭제하시겠습니까?')) return;
        try {
            await deleteTabMenuItem(id);
            await loadData();
        } catch (error) {
            console.error('Failed to delete tab:', error);
            alert('탭 삭제에 실패했습니다.');
        }
    };

    const toggleTabActive = async (tab: TabMenuItem) => {
        if (!tab.id) return;
        try {
            await updateTabMenuItem(tab.id, { is_active: !tab.is_active });
            await loadData();
        } catch (error) {
            console.error('Failed to toggle tab active:', error);
            alert('탭 상태 변경에 실패했습니다.');
        }
    };

    const openAddModal = () => {
        const inferredType = filterType === 'all' ? 'notice' : filterType;
        const nextOrder = posts.filter((p) => p.board_type === inferredType).length + 1;
        const nextCategory = resolveBoardCategorySelection(
            inferredType,
            '',
            boardCategories,
        );
        setEditingPost(null);
        setContentSelection({ start: 0, end: 0 });
        setFormData({
            ...EMPTY_FORM,
            board_type: inferredType,
            category: nextCategory,
            display_order: nextOrder
        });
        setShowModal(true);
    };

    const openEditModal = (post: BoardPost) => {
        setEditingPost(post);
        setContentSelection({ start: 0, end: 0 });
        const nextCategory = resolveBoardCategorySelection(
            post.board_type,
            post.category || '',
            boardCategories,
        );
        setFormData({
            board_type: post.board_type,
            category: nextCategory,
            title: post.title || '',
            content: post.content || '',
            image_url: post.image_url || post.mobile_image_url || '',
            link: post.link || '',
            display_order: post.display_order || 1,
            is_active: post.is_active
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPost(null);
        setContentSelection({ start: 0, end: 0 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            board_type: formData.board_type,
            category: formData.board_type === 'event' ? '' : formData.category,
            title: formData.title,
            summary: '',
            content: formData.content,
            image_url: formData.image_url,
            link: formData.link,
            display_order: formData.display_order,
            is_active: formData.is_active
        } as any;

        try {
            if (editingPost?.id) {
                await updateBoardPost(editingPost.id, payload);
            } else {
                await addBoardPost(payload);
            }
            await loadData();
            closeModal();
        } catch (error) {
            console.error('Failed to save GNB tab post:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleCategoryAdd = () => {
        const nextName = normalizeCategoryValue(newCategoryName);
        if (!nextName) return;

        setBoardCategories((prev) => {
            const current = prev[selectedCategoryBoardType] || [];
            if (current.includes(nextName)) return prev;

            return {
                ...prev,
                [selectedCategoryBoardType]: [...current, nextName],
            };
        });
        setNewCategoryName('');
    };

    const handleCategoryRemove = (categoryName: string) => {
        setBoardCategories((prev) => ({
            ...prev,
            [selectedCategoryBoardType]: (prev[selectedCategoryBoardType] || []).filter(
                (category) => category !== categoryName,
            ),
        }));
    };

    const handleCategorySave = async () => {
        setCategorySaving(true);
        try {
            await Promise.all(
                BOARD_CATEGORY_TYPES.map((boardType) =>
                    upsertBoardCategories(boardType, boardCategories[boardType]),
                ),
            );
            setSavedBoardCategorySnapshot(serializeBoardCategorySettings(boardCategories));
            alert('게시판 카테고리가 저장되었습니다.');
        } catch (error) {
            console.error('Failed to save board categories:', error);
            alert('게시판 카테고리 저장에 실패했습니다.');
        } finally {
            setCategorySaving(false);
        }
    };

    const handleBoardTypeChange = (nextBoardType: BoardPostType) => {
        setFormData((prev) => {
            const nextCategory = resolveBoardCategorySelection(
                nextBoardType,
                prev.category,
                boardCategories,
            );

            return {
                ...prev,
                board_type: nextBoardType,
                category: nextBoardType === 'event' ? '' : nextCategory,
            };
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        setUploading(true);
        try {
            const imageUrl = await uploadImage(file);
            setFormData((prev) => ({ ...prev, image_url: imageUrl }));
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
            if (thumbnailFileInputRef.current) thumbnailFileInputRef.current.value = '';
        }
    };

    const handleContentSelectionChange = (element: HTMLTextAreaElement) => {
        setContentSelection({
            start: element.selectionStart ?? 0,
            end: element.selectionEnd ?? element.selectionStart ?? 0
        });
    };

    const insertContentImageToken = (imageUrl: string) => {
        setFormData((prev) => {
            const content = prev.content || '';
            const start = Math.min(contentSelection.start, content.length);
            const end = Math.min(contentSelection.end, content.length);
            const prefix = content.slice(0, start);
            const suffix = content.slice(end);
            const token = buildGnbContentImageToken(imageUrl);
            const leadingSpacing = prefix.length > 0 && !prefix.endsWith('\n') ? '\n\n' : '';
            const trailingSpacing = suffix.length > 0 && !suffix.startsWith('\n') ? '\n\n' : '';
            const nextContent = `${prefix}${leadingSpacing}${token}${trailingSpacing}${suffix}`;
            const nextCursorPosition = prefix.length + leadingSpacing.length + token.length + trailingSpacing.length;

            requestAnimationFrame(() => {
                const textarea = contentTextareaRef.current;
                if (!textarea) return;
                textarea.focus();
                textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
                setContentSelection({ start: nextCursorPosition, end: nextCursorPosition });
            });

            return {
                ...prev,
                content: nextContent
            };
        });
    };

    const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        setUploading(true);
        try {
            const imageUrl = await uploadImage(file, 'gnb-posts/content');
            insertContentImageToken(imageUrl);
        } catch (error) {
            console.error('Failed to upload content image:', error);
            alert('본문 이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
            if (contentFileInputRef.current) contentFileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!confirm('이 항목을 삭제하시겠습니까?')) return;

        try {
            await deleteBoardPost(id);
            await loadData();
        } catch (error) {
            console.error('Failed to delete GNB tab post:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const toggleActive = async (post: BoardPost) => {
        if (!post.id) return;
        try {
            await updateBoardPost(post.id, { is_active: !post.is_active });
            await loadData();
        } catch (error) {
            console.error('Failed to toggle active:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#001E45]" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-[#001E45] mb-1">
                        <div className="w-8 h-1 bg-[#001E45] rounded-full" />
                        <span className="text-xs font-bold tracking-wider uppercase">CMS Control Center</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">GNB 섹션 관리</h1>
                    <p className="text-slate-500 mt-2 max-w-2xl">
                        홈페이지 상단 메뉴와 각 카테고리별 콘텐츠를 통합 관리합니다.
                        고객센터(CS)는 통합 문의 시스템과 연동되어 실시간으로 반영됩니다.
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="group flex items-center gap-2 bg-[#001E45] text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-[#001E45]/20 active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    <span className="font-semibold">새 게시글 등록</span>
                </button>
            </div>

            <div className="flex flex-col gap-8">
                {/* GNB Tabs Management - Matched with Filter Design */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <div className="bg-slate-100/80 p-1 rounded-2xl inline-flex flex-nowrap gap-1 border border-slate-200/50">
                        {gnbTabs.length === 0 ? (
                            <span className="text-xs text-slate-400 italic px-4 py-2">등록된 메뉴가 없습니다.</span>
                        ) : (
                            gnbTabs.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((tab) => (
                                <div
                                    key={tab.id}
                                    className={`group relative px-5 py-2.5 rounded-xl transition-all flex-shrink-0 flex items-center gap-4 ${
                                        tab.is_active 
                                            ? 'bg-white text-[#001E45] shadow-sm' 
                                            : 'text-slate-500 hover:bg-white/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-black ${tab.is_active ? 'text-[#001E45]/40' : 'text-slate-300'}`}>
                                            {String(tab.display_order).padStart(2, '0')}
                                        </span>
                                        <span className="text-sm font-bold whitespace-nowrap">
                                            {tab.name}
                                        </span>
                                    </div>
                                    
                                    {/* Action Buttons inside the tab-like item */}
                                    <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200/50 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => toggleTabActive(tab)}
                                            className={`p-1.5 rounded-lg transition-colors ${tab.is_active ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                            title={tab.is_active ? '비활성화' : '활성화'}
                                        >
                                            {tab.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                        <button
                                            onClick={() => openEditTabModal(tab)}
                                            className="p-1.5 text-slate-400 hover:text-[#001E45] hover:bg-slate-100 rounded-lg transition-colors"
                                            title="수정"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTab(tab.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="삭제"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <button
                        onClick={openAddTabModal}
                        className="flex-shrink-0 w-11 h-11 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-[#001E45] hover:border-[#001E45] hover:bg-white transition-all flex items-center justify-center ml-1"
                        title="새 메뉴 추가"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Divider with Label */}
                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-[#f8fafc] px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">게시글 목록 및 관리</span>
                    </div>
                </div>

                {/* Bottom Section: Post Management (Main Content) */}
                <div className="space-y-6">
                    {/* Filter & Action Area */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="bg-slate-100/80 p-1 rounded-xl inline-flex gap-1 border border-slate-200/50">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'all'
                                        ? 'bg-white text-[#001E45] shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                    }`}
                            >
                                전체보기
                            </button>
                            {(Object.keys(TAB_LABEL) as BoardPostType[]).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${filterType === type
                                            ? 'bg-white text-[#001E45] shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                        }`}
                                >
                                    {TAB_LABEL[type]}
                                </button>
                            ))}
                        </div>
                        
                        <div className="text-right">
                            <span className="text-xs font-bold text-slate-400 mr-2">총 {filteredPosts.length}개의 게시글</span>
                        </div>
                    </div>

                    {/* Posts Grid/List */}
                    <div className="space-y-4">
                        {filteredPosts.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-20 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ImageIcon size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">등록된 게시글이 없습니다</h3>
                                <p className="text-slate-400 mt-1">상단의 '새 게시글 등록' 버튼을 눌러 첫 콘텐츠를 만들어보세요.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredPosts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((post) => (
                                    <div
                                        key={post.id}
                                        className={`group relative bg-white rounded-2xl border transition-all hover:shadow-md ${post.is_active ? 'border-slate-200' : 'border-slate-100 opacity-80'
                                            }`}
                                    >
                                        <div className="p-4 flex gap-5">
                                            {/* Thumbnail Area */}
                                            <div className="relative w-40 h-28 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 group-hover:border-[#001E45]/20 transition-colors">
                                                {(post.image_url || post.mobile_image_url) ? (
                                                    <img
                                                        src={post.image_url || post.mobile_image_url}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                                        <ImageIcon size={24} />
                                                        <span className="text-[10px] font-bold mt-1">NO IMAGE</span>
                                                    </div>
                                                )}

                                                {/* Badge on Thumbnail */}
                                                <div className="absolute top-2 left-2">
                                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shadow-sm ${TAB_BADGE_STYLE[post.board_type]}`}>
                                                        {TAB_LABEL[post.board_type]}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Content Area */}
                                            <div className="flex-1 min-w-0 pr-12">
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">ORDER No.{post.display_order}</span>
                                                    {post.mobile_image_url && (
                                                        <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-md font-bold">MOBILE ONLY</span>
                                                    )}
                                                    {(post.board_type === 'notice' || post.board_type === 'review') && post.category && (
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-md font-bold">
                                                            {post.category}
                                                        </span>
                                                    )}
                                                    {!post.is_active && (
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md font-bold">HIDDEN</span>
                                                    )}
                                                </div>

                                                <h4 className="text-lg font-bold text-slate-900 truncate group-hover:text-[#001E45] transition-colors">
                                                    {post.title}
                                                </h4>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                    {(stripGnbContentImages(post.content) || '').trim() || '입력된 상세 내용이 없습니다.'}
                                                </p>
                                                {post.link && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-[#001E45] text-xs font-semibold overflow-hidden">
                                                        <div className="w-1.5 h-1.5 bg-[#001E45] rounded-full flex-shrink-0" />
                                                        <span className="truncate opacity-70 group-hover:opacity-100 transition-opacity">{post.link}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons (Floating on Right) */}
                                            <div className="absolute top-4 right-4 flex flex-col gap-1">
                                                <button
                                                    onClick={() => toggleActive(post)}
                                                    className={`p-2 rounded-xl transition-all shadow-sm border border-slate-100 ${post.is_active
                                                            ? 'bg-white text-green-600 hover:bg-green-50 hover:border-green-100'
                                                            : 'bg-slate-50 text-slate-400 hover:bg-white hover:text-green-600 hover:border-green-100'
                                                        }`}
                                                    title={post.is_active ? '비활성화' : '활성화'}
                                                >
                                                    {post.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(post)}
                                                    className="p-2 bg-white text-slate-400 hover:text-[#001E45] hover:bg-[#001E45]/5 hover:border-[#001E45]/10 rounded-xl transition-all shadow-sm border border-slate-100"
                                                    title="내용 수정"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="p-2 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 rounded-xl transition-all shadow-sm border border-slate-100"
                                                    title="삭제하기"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50">
                            <h5 className="text-sm font-bold text-blue-900 mb-2">콘텐츠 관리 가이드</h5>
                            <ul className="text-xs text-blue-700/80 space-y-2 leading-relaxed">
                                <li className="flex gap-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>순서 제어:</strong> 게시글 내 '표시 순서' 숫자를 조정하여 리스트 노출 순서를 변경할 수 있습니다.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>이미지 최적화:</strong> 고해상도 이미지는 로딩 속도에 영향을 줄 수 있으므로 1MB 이하의 WebP 형식을 권장합니다.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>모바일 이미지:</strong> 모바일 전용 이미지를 등록하면 세로 비율이 높은 기기에서 더 선명한 최적의 화면을 제공합니다.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>


            {showTabModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800">{editingTab ? 'GNB 탭 수정' : 'GNB 탭 추가'}</h2>
                            <button onClick={closeTabModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleTabSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">기본 탭 빠른 선택</label>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        const selected = TAB_PRESETS.find((preset) => preset.link === e.target.value);
                                        if (!selected) return;
                                        setTabFormData((prev) => ({
                                            ...prev,
                                            name: selected.name,
                                            link: selected.link
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                >
                                    <option value="">선택 시 이름/링크 자동 입력</option>
                                    {TAB_PRESETS.map((preset) => (
                                        <option key={preset.link} value={preset.link}>
                                            {preset.name} ({preset.link})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">탭 이름</label>
                                <input
                                    type="text"
                                    required
                                    value={tabFormData.name}
                                    onChange={(e) => setTabFormData({ ...tabFormData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">링크</label>
                                <input
                                    type="text"
                                    required
                                    value={tabFormData.link}
                                    onChange={(e) => setTabFormData({ ...tabFormData, link: e.target.value })}
                                    placeholder="/notice, /event, /review, /cs"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">표시 순서</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={tabFormData.display_order}
                                    onChange={(e) => setTabFormData({ ...tabFormData, display_order: Number(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={tabFormData.is_active}
                                    onChange={(e) => setTabFormData({ ...tabFormData, is_active: e.target.checked })}
                                    className="w-4 h-4 accent-[#001E45]"
                                />
                                노출 활성화
                            </label>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeTabModal}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={tabSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#001E45] text-white rounded-lg hover:bg-slate-800 disabled:opacity-60"
                                >
                                    {tabSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800">{editingPost ? '항목 수정' : '항목 추가'}</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">탭 종류</label>
                                    <select
                                        value={formData.board_type}
                                        onChange={(e) => handleBoardTypeChange(e.target.value as BoardPostType)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                    >
                                        {(Object.keys(TAB_LABEL) as BoardPostType[]).map((type) => (
                                            <option key={type} value={type}>{TAB_LABEL[type]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">표시 순서</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.display_order}
                                        onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                    />
                                </div>
                            </div>

                            {formData.board_type !== 'event' && (
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-sm font-bold text-slate-800">카테고리 설정</h3>
                                        <button 
                                            type="button"
                                            onClick={handleCategorySave}
                                            disabled={categorySaving || !categorySettingsDirty}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-[#001E45] hover:underline disabled:opacity-30 disabled:no-underline"
                                        >
                                            {categorySaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                            설정 저장
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-slate-700 ml-1">분류 선택</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#001E45]/20 focus:border-[#001E45] transition-all"
                                            >
                                                <option value="">분류를 선택하세요</option>
                                                {(boardCategories[formData.board_type as BoardCategoryBoardType] || []).map((category) => (
                                                    <option key={category} value={category}>
                                                        {category}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-sm font-medium text-slate-700">새 분류 추가</label>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    id="modal-new-category"
                                                    placeholder="분류 이름 입력"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const input = e.currentTarget;
                                                            const val = input.value.trim();
                                                            if (val) {
                                                                const bType = formData.board_type as BoardCategoryBoardType;
                                                                setBoardCategories(prev => {
                                                                    if (prev[bType].includes(val)) return prev;
                                                                    return { ...prev, [bType]: [...prev[bType], val] };
                                                                });
                                                                setFormData(prev => ({ ...prev, category: val }));
                                                                input.value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#001E45]/20 focus:border-[#001E45] transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const input = document.getElementById('modal-new-category') as HTMLInputElement;
                                                        const val = input?.value.trim();
                                                        if (val) {
                                                            const bType = formData.board_type as BoardCategoryBoardType;
                                                            setBoardCategories(prev => {
                                                                if (prev[bType].includes(val)) return prev;
                                                                return { ...prev, [bType]: [...prev[bType], val] };
                                                            });
                                                            setFormData(prev => ({ ...prev, category: val }));
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="px-4 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
                                                >
                                                    추가
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-1 pt-1">
                                        <p className="text-sm font-bold text-slate-800 mb-2.5">등록된 분류 목록 관리</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                                            {(boardCategories[formData.board_type as BoardCategoryBoardType] || []).map((category) => (
                                                <div
                                                    key={category}
                                                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#001E45] transition-colors group"
                                                >
                                                    <span className="text-slate-300 group-hover:text-[#001E45]">#</span>
                                                    {category}
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const bType = formData.board_type as BoardCategoryBoardType;
                                                            setBoardCategories(prev => ({
                                                                ...prev,
                                                                [bType]: prev[bType].filter(c => c !== category)
                                                            }));
                                                            if (formData.category === category) {
                                                                setFormData(prev => ({ ...prev, category: '' }));
                                                            }
                                                        }} 
                                                        className="text-slate-300 hover:text-red-500 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!boardCategories[formData.board_type as BoardCategoryBoardType] || boardCategories[formData.board_type as BoardCategoryBoardType].length === 0) && (
                                                <span className="text-sm text-slate-400 italic">등록된 분류가 없습니다.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <label className="block text-sm font-medium text-slate-700">본문</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            ref={contentFileInputRef}
                                            accept="image/*"
                                            onChange={handleContentImageUpload}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => contentFileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-60"
                                        >
                                            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                            본문 이미지 업로드
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    ref={contentTextareaRef}
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    onClick={(e) => handleContentSelectionChange(e.currentTarget)}
                                    onKeyUp={(e) => handleContentSelectionChange(e.currentTarget)}
                                    onSelect={(e) => handleContentSelectionChange(e.currentTarget)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] min-h-[280px]"
                                    placeholder="상세 내용을 입력하세요."
                                />
                                <p className="text-[11px] text-slate-500 mt-2">
                                    이미지를 업로드하면 현재 커서 위치에 자동 삽입됩니다. 본문 이미지 삭제는 입력창에서 해당 줄을 지우면 됩니다.
                                </p>
                                {contentImageUrls.length > 0 && (
                                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-semibold text-slate-600 mb-2">본문 삽입 이미지 {contentImageUrls.length}개</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {contentImageUrls.map((imageUrl, index) => (
                                                <div key={`${imageUrl}-${index}`} className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white">
                                                    <img src={imageUrl} alt={`본문 이미지 ${index + 1}`} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">썸네일 이미지 (16:9 권장)</label>
                                    <input
                                        type="text"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] text-sm"
                                        placeholder="썸네일 이미지 URL 입력 또는 업로드"
                                    />
                                    <input
                                        type="file"
                                        ref={thumbnailFileInputRef}
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => thumbnailFileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-60"
                                        >
                                            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                            이미지 업로드
                                        </button>
                                        {formData.image_url && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, image_url: '' })}
                                                className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                                            >
                                                삭제
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">메인 프로모션 카드와 목록 썸네일에 공통으로 사용됩니다.</p>
                                    {formData.image_url && (
                                        <div className="mt-2 aspect-[16/9] w-full max-w-[220px] bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                            <img src={formData.image_url} alt="썸네일 미리보기" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">링크 (선택)</label>
                                    <input
                                        type="text"
                                        value={formData.link}
                                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                        placeholder="/notice 또는 https://..."
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 accent-[#001E45]"
                                />
                                노출 활성화
                            </label>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#001E45] text-white rounded-lg hover:bg-slate-800 disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GnbSectionManager;
