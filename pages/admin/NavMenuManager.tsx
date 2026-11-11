import React, { useEffect, useMemo, useState } from 'react';
import {
    Plus, Edit2, Trash2, X, Save, Loader2, ChevronRight, ChevronDown, ChevronUp, FolderTree, Eye, EyeOff,
} from 'lucide-react';
import {
    getCategories, addCategory, updateCategory, deleteCategory, getProductIdsOfCategory, renameCategoryWithProducts,
    isShownInMenu, Category,
} from '../../src/api/categoryApi';
import { createCategorySlug, sortCategories } from '../../src/utils/productCategoryRouting';

// 전체 메뉴 관리: 상품관리와 같은 categories 테이블을 그대로 편집한다.
// 사이트 전체 메뉴(FullMenu)도 이 테이블을 읽으므로 여기서 바꾸면 메뉴와 상품 분류가 함께 바뀐다.

const LEVEL_LABELS: Record<number, string> = { 1: '대분류', 2: '중분류', 3: '소분류' };
const LEVEL_COLORS: Record<number, string> = {
    1: 'bg-blue-100 text-blue-700 border-blue-200',
    2: 'bg-green-100 text-green-700 border-green-200',
    3: 'bg-purple-100 text-purple-700 border-purple-200',
};
// 상품 등록 화면이 대분류 → 중분류 2단계만 쓰므로 여기서도 2단계까지만 만든다.
const MAX_LEVEL = 2;

export const NavMenuManager: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [form, setForm] = useState({ name: '', slug: '', display_order: 0, parent_id: null as string | null, level: 1 });

    const load = async () => {
        try {
            setCategories(await getCategories());
        } catch (error) {
            console.error('Failed to load categories:', error);
            alert('카테고리를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const childrenOf = useMemo(() => {
        const map = new Map<string | null, Category[]>();
        categories.forEach((c) => {
            const key = c.parent_id || null;
            map.set(key, [...(map.get(key) || []), c]);
        });
        map.forEach((list, key) => map.set(key, sortCategories(list)));
        return map;
    }, [categories]);

    const toggleExpand = (id: string) => setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const parentName = (parentId: string | null) => categories.find((c) => c.id === parentId)?.name || '';

    const openAdd = (parentId: string | null, level: number) => {
        setEditing(null);
        setForm({ name: '', slug: '', display_order: (childrenOf.get(parentId) || []).length, parent_id: parentId, level });
        setShowModal(true);
    };

    const openEdit = (category: Category) => {
        setEditing(category);
        setForm({
            name: category.name,
            slug: category.slug || '',
            display_order: category.display_order,
            parent_id: category.parent_id || null,
            level: category.level || 1,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = form.name.trim();
        if (!name) return;
        const duplicate = categories.some((c) => c.id !== editing?.id && c.name.trim() === name);
        if (duplicate) {
            alert('같은 이름의 카테고리가 이미 있습니다. 상품이 이름으로 카테고리를 찾기 때문에 이름은 겹치면 안 됩니다.');
            return;
        }

        setSaving(true);
        try {
            if (editing?.id) {
                const renamed = editing.name.trim() !== name;
                if (renamed) {
                    const count = (await getProductIdsOfCategory(editing.id, editing.name)).length;
                    if (count > 0 && !confirm(`"${editing.name}" → "${name}"\n이 카테고리의 상품 ${count}개도 새 이름으로 함께 바뀝니다. 계속할까요?`)) {
                        setSaving(false);
                        return;
                    }
                    await renameCategoryWithProducts(editing.id, editing.name, name);
                }
                await updateCategory(editing.id, {
                    name,
                    slug: form.slug.trim() || editing.slug || createCategorySlug(name),
                    display_order: form.display_order,
                });
            } else {
                await addCategory({
                    name,
                    slug: form.slug.trim() || createCategorySlug(name),
                    display_order: form.display_order,
                    parent_id: form.parent_id,
                    level: form.level,
                });
            }
            await load();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save category:', error);
            alert('저장에 실패했습니다. (주소(slug)가 같은 카테고리가 이미 있을 수도 있습니다.)');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category: Category) => {
        if ((childrenOf.get(category.id!) || []).length > 0) {
            alert('하위 카테고리가 있어 삭제할 수 없습니다. 하위 카테고리를 먼저 삭제하거나 옮겨 주세요.');
            return;
        }
        try {
            const productCount = (await getProductIdsOfCategory(category.id!, category.name)).length;
            if (productCount > 0) {
                alert(`이 카테고리에 상품 ${productCount}개가 연결되어 있어 삭제할 수 없습니다.\n상품관리에서 상품의 카테고리를 먼저 바꿔 주세요. 메뉴에서만 빼려면 눈 아이콘으로 숨길 수 있습니다.`);
                return;
            }
            if (!confirm(`"${category.name}" 카테고리를 삭제할까요?`)) return;
            await deleteCategory(category.id!);
            await load();
        } catch (error: any) {
            console.error('Failed to delete category:', error);
            alert(error?.message || '삭제에 실패했습니다.');
        }
    };

    const toggleVisible = async (category: Category) => {
        try {
            await updateCategory(category.id!, { show_in_menu: !isShownInMenu(category) });
            await load();
        } catch (error) {
            console.error('Failed to toggle menu visibility:', error);
            alert('노출 설정을 저장하지 못했습니다. add_category_show_in_menu.sql 을 Supabase에서 먼저 실행했는지 확인해 주세요.');
        }
    };

    // 같은 부모 안에서 위/아래로 옮긴다. 순서 값이 겹쳐 있을 수 있어 0부터 다시 매긴 뒤 자리를 바꾼다.
    const move = async (category: Category, direction: -1 | 1) => {
        const siblings = childrenOf.get(category.parent_id || null) || [];
        const index = siblings.findIndex((c) => c.id === category.id);
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
            await load();
        } catch (error) {
            console.error('Failed to reorder categories:', error);
            alert('순서를 바꾸지 못했습니다.');
        }
    };

    const renderNode = (node: Category, depth: number, index: number, total: number): React.ReactNode => {
        const children = childrenOf.get(node.id!) || [];
        const level = node.level || 1;
        const visible = isShownInMenu(node);
        const open = expanded.has(node.id!);

        return (
            <div key={node.id}>
                <div className="flex items-center gap-2 p-3 border-b border-slate-100 hover:bg-slate-50" style={{ paddingLeft: `${depth * 24 + 16}px` }}>
                    <button onClick={() => toggleExpand(node.id!)} className={`p-1 rounded hover:bg-slate-200 ${children.length ? 'text-slate-600' : 'text-transparent pointer-events-none'}`}>
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${LEVEL_COLORS[level]}`}>{LEVEL_LABELS[level]}</span>
                    <span className={`flex-1 font-medium ${visible ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{node.name}</span>
                    {!visible && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">메뉴 숨김</span>}
                    <div className="flex items-center gap-1">
                        <button onClick={() => move(node, -1)} disabled={index === 0} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30" title="위로"><ChevronUp size={16} /></button>
                        <button onClick={() => move(node, 1)} disabled={index === total - 1} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30" title="아래로"><ChevronDown size={16} /></button>
                        <button onClick={() => toggleVisible(node)} className={`p-1.5 rounded hover:bg-slate-100 ${visible ? 'text-green-600' : 'text-slate-400'}`} title={visible ? '메뉴에서 숨기기' : '메뉴에 보이기'}>
                            {visible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        {level < MAX_LEVEL && (
                            <button onClick={() => { setExpanded((prev) => new Set(prev).add(node.id!)); openAdd(node.id!, level + 1); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title={`${LEVEL_LABELS[level + 1]} 추가`}><Plus size={16} /></button>
                        )}
                        <button onClick={() => openEdit(node)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="수정"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(node)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="삭제"><Trash2 size={16} /></button>
                    </div>
                </div>
                {open && children.map((child, i) => renderNode(child, depth + 1, i, children.length))}
            </div>
        );
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#001E45]" size={40} /></div>;
    }

    const roots = childrenOf.get(null) || [];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FolderTree size={24} />전체 메뉴 관리</h1>
                    <p className="text-sm text-slate-500 mt-1">상품관리의 카테고리와 같은 데이터입니다. 여기서 추가·수정·삭제·순서 변경을 하면 상품 분류와 사이트 전체 메뉴에 함께 반영됩니다.</p>
                </div>
                <button onClick={() => openAdd(null, 1)} className="flex items-center gap-2 bg-[#001E45] text-white px-4 py-2 rounded-lg hover:bg-[#002a5c]"><Plus size={20} />대분류 추가</button>
            </div>

            <div className="mb-4 text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                · 눈 아이콘: 사이트 전체 메뉴에서만 숨깁니다(상품과 카테고리는 그대로).<br />
                · 삭제: 하위 카테고리나 연결된 상품이 없을 때만 가능합니다. 상품이 있으면 상품관리에서 먼저 옮겨 주세요.<br />
                · 이름 변경: 연결된 상품의 카테고리 이름도 함께 바뀝니다. 페이지 주소(slug)는 바꾸지 않는 한 그대로입니다.
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {roots.length === 0 ? (
                    <div className="p-12 text-center text-slate-400"><p>등록된 카테고리가 없습니다.</p></div>
                ) : roots.map((root, i) => renderNode(root, 0, i, roots.length))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800">{editing ? '카테고리 수정' : `${LEVEL_LABELS[form.level]} 추가`}</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {form.parent_id && (
                                <div className="bg-slate-50 p-3 rounded-lg text-sm"><span className="text-slate-500">상위 카테고리: </span><span className="font-medium text-slate-700">{parentName(form.parent_id)}</span></div>
                            )}
                            <span className={`inline-block px-3 py-1 text-sm font-medium rounded border ${LEVEL_COLORS[form.level]}`}>{LEVEL_LABELS[form.level]}</span>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">카테고리 이름</label>
                                <input required autoFocus type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001E45]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL slug</label>
                                <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={createCategorySlug(form.name || 'category-name')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001E45]" />
                                <p className="mt-1 text-xs text-slate-500">{editing ? '바꾸면 기존 페이지 주소가 달라집니다. 보통은 그대로 두세요.' : '비워두면 이름 기준으로 자동 생성됩니다.'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">표시 순서</label>
                                <input type="number" min="0" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001E45]" />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">취소</button>
                                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#001E45] text-white rounded-lg hover:bg-[#002a5c] disabled:bg-slate-400">
                                    {saving ? <><Loader2 className="animate-spin" size={18} />저장 중...</> : <><Save size={18} />저장</>}
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
