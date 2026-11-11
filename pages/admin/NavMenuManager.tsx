import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Loader2, X, Save, ChevronRight, ChevronUp, ChevronDown, Menu as MenuIcon, Folder, FileText } from 'lucide-react';
import {
    getCategories, addCategory, updateCategory, deleteCategory, getProductIdsOfCategory, renameCategoryWithProducts, Category,
} from '../../src/api/categoryApi';
import { createCategorySlug, sortCategories } from '../../src/utils/productCategoryRouting';

// 전체 메뉴 관리: 상품관리와 같은 categories 테이블을 편집한다.
// 1차 메뉴 = 대분류, 2차 메뉴 = 중분류. 사이트 전체 메뉴와 상품 등록 화면의 분류 선택이 모두 이 데이터를 쓴다.

export const NavMenuManager = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'parent' | 'child'>('parent');
    const [editingItem, setEditingItem] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: '', slug: '', display_order: 0 });

    const loadData = async () => {
        try {
            setCategories(await getCategories());
        } catch (error) {
            console.error('Failed to load categories:', error);
            alert('카테고리를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void loadData(); }, []);

    const parentItems = useMemo(() => sortCategories(categories.filter((c) => !c.parent_id)), [categories]);
    const selectedParent = parentItems.find((p) => p.id === selectedParentId) || null;
    const childItems = useMemo(
        () => (selectedParent ? sortCategories(categories.filter((c) => c.parent_id === selectedParent.id)) : []),
        [categories, selectedParent],
    );

    const openModal = (type: 'parent' | 'child', item?: Category) => {
        setModalType(type);
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, slug: item.slug || '', display_order: item.display_order });
        } else {
            setEditingItem(null);
            setFormData({ name: '', slug: '', display_order: type === 'parent' ? parentItems.length : childItems.length });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = formData.name.trim();
        if (!name) return;
        if (categories.some((c) => c.id !== editingItem?.id && c.name.trim() === name)) {
            alert('같은 이름의 카테고리가 이미 있습니다. 상품이 이름으로 카테고리를 찾기 때문에 이름은 겹치면 안 됩니다.');
            return;
        }

        setSaving(true);
        try {
            if (editingItem?.id) {
                if (editingItem.name.trim() !== name) {
                    const count = (await getProductIdsOfCategory(editingItem.id, editingItem.name)).length;
                    if (count > 0 && !confirm(`"${editingItem.name}" → "${name}"\n이 카테고리의 상품 ${count}개도 새 이름으로 함께 바뀝니다. 계속할까요?`)) {
                        return;
                    }
                    await renameCategoryWithProducts(editingItem.id, editingItem.name, name);
                }
                await updateCategory(editingItem.id, {
                    name,
                    slug: formData.slug.trim() || editingItem.slug || createCategorySlug(name),
                    display_order: formData.display_order,
                });
            } else {
                await addCategory({
                    name,
                    slug: formData.slug.trim() || createCategorySlug(name),
                    display_order: formData.display_order,
                    parent_id: modalType === 'child' ? selectedParent?.id ?? null : null,
                    level: modalType === 'child' ? 2 : 1,
                });
            }
            await loadData();
            closeModal();
        } catch (error) {
            console.error('Failed to save:', error);
            alert('저장에 실패했습니다. (주소(slug)가 같은 카테고리가 이미 있을 수도 있습니다.)');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: Category) => {
        if (categories.some((c) => c.parent_id === item.id)) {
            alert('하위 메뉴가 있어 삭제할 수 없습니다. 2차 메뉴를 먼저 삭제해 주세요.');
            return;
        }
        try {
            const productCount = (await getProductIdsOfCategory(item.id!, item.name)).length;
            if (productCount > 0) {
                alert(`이 카테고리에 상품 ${productCount}개가 연결되어 있어 삭제할 수 없습니다.\n상품관리에서 상품의 카테고리를 먼저 바꿔 주세요.`);
                return;
            }
            if (!confirm(`"${item.name}" 을(를) 삭제할까요?`)) return;
            await deleteCategory(item.id!);
            if (selectedParentId === item.id) setSelectedParentId(null);
            await loadData();
        } catch (error: any) {
            alert(error?.message || '삭제 실패');
        }
    };

    // 같은 부모 안에서 위/아래로 옮긴다. 순서 값이 겹쳐 있을 수 있어 0부터 다시 매긴 뒤 자리를 바꾼다.
    const move = async (item: Category, siblings: Category[], direction: -1 | 1) => {
        const index = siblings.findIndex((c) => c.id === item.id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= siblings.length) return;
        const reordered = [...siblings];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        try {
            await Promise.all(
                reordered
                    .map((c, order) => ({ c, order }))
                    .filter(({ c, order }) => c.display_order !== order)
                    .map(({ c, order }) => updateCategory(c.id!, { display_order: order })),
            );
            await loadData();
        } catch (error) {
            console.error('Failed to reorder:', error);
            alert('순서를 바꾸지 못했습니다.');
        }
    };

    if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">상품 카테고리</h2>
                    <p className="text-slate-500 text-sm mt-1">상품관리의 카테고리와 같은 데이터입니다. 여기서 바꾸면 상품 분류와 사이트 전체 메뉴에 함께 반영됩니다.</p>
                </div>
            </div>

            <div className="flex gap-6 flex-1 h-full overflow-hidden">
                {/* Left: 1차 메뉴 (대분류) */}
                <div className="w-1/3 bg-white rounded-xl shadow-md flex flex-col border border-slate-200">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center rounded-t-xl">
                        <h3 className="font-bold flex items-center gap-2"><Folder size={18} className="text-[#001E45]" /> 1차 메뉴 (대분류)</h3>
                        <button onClick={() => openModal('parent')} className="text-xs bg-[#001E45] text-white px-2 py-1.5 rounded hover:bg-slate-800 transition flex items-center gap-1"><Plus size={14} /> 대분류 추가</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {parentItems.map((p, i) => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedParentId(p.id!)}
                                className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${selectedParentId === p.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-slate-500">{i + 1}</span>
                                    <span className={`font-medium ${selectedParentId === p.id ? 'text-[#001E45]' : 'text-slate-700'}`}>{p.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); void move(p, parentItems, -1); }} disabled={i === 0} className="p-1.5 text-slate-400 hover:text-slate-700 rounded disabled:opacity-30" title="위로"><ChevronUp size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); void move(p, parentItems, 1); }} disabled={i === parentItems.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 rounded disabled:opacity-30" title="아래로"><ChevronDown size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); openModal('parent', p); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); void handleDelete(p); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                    <ChevronRight size={16} className={`transition-transform ${selectedParentId === p.id ? 'text-blue-500 translate-x-1' : 'text-slate-300'}`} />
                                </div>
                            </div>
                        ))}
                        {parentItems.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">등록된 1차 메뉴가 없습니다.</div>}
                    </div>
                </div>

                {/* Right: 2차 메뉴 (중분류) */}
                <div className="flex-1 bg-white rounded-xl shadow-md flex flex-col border border-slate-200">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center rounded-t-xl">
                        <h3 className="font-bold flex items-center gap-2">
                            <FileText size={18} className="text-[#001E45]" />
                            2차 메뉴 (중분류)
                            {selectedParent && <span className="text-slate-400 font-normal text-sm ml-2">- {selectedParent.name}</span>}
                        </h3>
                        <button
                            onClick={() => selectedParent ? openModal('child') : alert('좌측에서 1차 메뉴(대분류)를 먼저 선택해주세요.')}
                            disabled={!selectedParent}
                            className="text-xs bg-[#001E45] text-white px-2 py-1.5 rounded hover:bg-slate-800 transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={14} /> 중분류 추가
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {!selectedParent ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <MenuIcon size={48} className="mb-4 opacity-20" />
                                <p>좌측에서 관리할 1차 메뉴(대분류)를 선택해주세요.</p>
                            </div>
                        ) : childItems.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                                이 대분류에 등록된 중분류가 없습니다.
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="py-2 px-3 text-left w-16">순서</th>
                                        <th className="py-2 px-3 text-left">메뉴명</th>
                                        <th className="py-2 px-3 text-left">주소(slug)</th>
                                        <th className="py-2 px-3 text-center w-32">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {childItems.map((item, i) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                                            <td className="py-2 px-3 font-medium text-slate-800">{item.name}</td>
                                            <td className="py-2 px-3 text-slate-500 truncate max-w-[200px]">{item.slug}</td>
                                            <td className="py-2 px-3 flex justify-center gap-1">
                                                <button onClick={() => void move(item, childItems, -1)} disabled={i === 0} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30" title="위로"><ChevronUp size={14} /></button>
                                                <button onClick={() => void move(item, childItems, 1)} disabled={i === childItems.length - 1} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30" title="아래로"><ChevronDown size={14} /></button>
                                                <button onClick={() => openModal('child', item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                                                <button onClick={() => void handleDelete(item)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-bold text-lg">{modalType === 'parent' ? '1차 메뉴(대분류)' : '2차 메뉴(중분류)'} {editingItem ? '수정' : '추가'}</h3>
                            <button onClick={closeModal}><X size={24} className="text-slate-400 hover:text-black" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">메뉴명 *</label>
                                <input required autoFocus type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] outline-none" placeholder="메뉴 이름 입력" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">주소(slug)</label>
                                <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] outline-none text-sm" placeholder={createCategorySlug(formData.name || 'category-name')} />
                                <p className="text-xs text-slate-400 mt-1">{editingItem ? '바꾸면 기존 페이지 주소가 달라집니다. 보통은 그대로 두세요.' : '비워두면 이름 기준으로 자동 생성됩니다.'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">표시 순서</label>
                                <input type="number" min="0" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg outline-none" />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-slate-50">취소</button>
                                <button type="submit" disabled={saving} className="px-4 py-2 bg-[#001E45] text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1">
                                    {saving ? '저장 중...' : <><Save size={16} />저장하기</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NavMenuManager;
