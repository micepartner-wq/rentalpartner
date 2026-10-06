import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Save, Loader2, Upload, Image as ImageIcon, Grid3X3, Bold, Italic, Underline, Eye, EyeOff, Tag } from 'lucide-react';
import { getProducts, addProduct, updateProduct, deleteProduct, isGeneralBasicProduct, Product, ProductCatalogType, ProductOptionGroup, ProductOptionSelectionMode } from '../../src/api/productApi';
import { getSections, getProductSections, setProductSections, Section } from '../../src/api/sectionApi';
import { getAllNavMenuItems, NavMenuItem } from '../../src/api/cmsApi';
import { getCategories, Category } from '../../src/api/categoryApi';
import {
    addServiceOptionCategory,
    deleteServiceOptionCategory,
    getServiceOptionCategories,
    isMissingServiceOptionCategoryTableError,
    normalizeServiceOptionCategoryName,
    ServiceOptionCategory,
    syncServiceOptionCategories,
    updateServiceOptionCategory,
} from '../../src/api/serviceOptionCategoryApi';
import { uploadImage } from '../../src/api/storageApi';
import { usePriceDisplay } from '../../src/context/PriceDisplayContext';
import type { ProductPriceDisplayMode } from '../../src/api/siteSettingsApi';
import { buildCategoryMaps, sortCategories } from '../../src/utils/productCategoryRouting';

// 간단한 에디터 컴포넌트
const SimpleEditor = ({ initialValue, onChange }: { initialValue: string, onChange: (val: string) => void }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (contentRef.current && initialValue && contentRef.current.innerHTML !== initialValue) {
            contentRef.current.innerHTML = initialValue;
        }
    }, [initialValue]);

    const handleInput = () => {
        if (contentRef.current) onChange(contentRef.current.innerHTML);
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        handleInput();
        contentRef.current?.focus();
    };

    const handleImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                setUploading(true);
                try {
                    const url = await uploadImage(file, 'description-images');
                    execCmd('insertImage', url);
                } catch (error) {
                    alert('이미지 업로드 실패');
                } finally {
                    setUploading(false);
                }
            }
        };
        input.click();
    };

    return (
        <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col h-72">
            <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1 items-center">
                <button type="button" onClick={() => execCmd('bold')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><Bold size={18} /></button>
                <button type="button" onClick={() => execCmd('italic')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><Italic size={18} /></button>
                <button type="button" onClick={() => execCmd('underline')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><Underline size={18} /></button>
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <button type="button" onClick={handleImage} disabled={uploading} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1">
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                    <span className="text-xs font-medium">이미지</span>
                </button>
            </div>
            <div ref={contentRef} className="flex-1 p-4 overflow-y-auto outline-none prose prose-sm max-w-none bg-white" contentEditable onInput={handleInput} />
        </div>
    );
};

const createEmptyFormData = (
    catalogType: ProductCatalogType,
    productType: NonNullable<Product['product_type']> = 'basic',
) => ({
    name: '',
    category: '',
    price: 0,
    description: '',
    short_description: '',
    image_url: '',
    stock: 99999,
    discount_rate: 0,
    catalog_type: catalogType,
    product_type: productType,
    basic_components: [] as any[],
    additional_components: [] as any[],
    cooperative_components: [] as any[],
    place_components: [] as any[],
    food_components: [] as any[],
    product_options: [] as ProductOptionGroup[],
});

const createEmptyProductOptionGroup = (): ProductOptionGroup => ({
    name: '',
    values: [{ name: '' }],
    selection_mode: 'independent',
});

const getProductOptionSelectionMode = (groups: ProductOptionGroup[] = []): ProductOptionSelectionMode =>
    groups[0]?.selection_mode === 'combination' ? 'combination' : 'independent';

const normalizeProductOptions = (groups: ProductOptionGroup[] = []): ProductOptionGroup[] =>
    groups
        .map((group) => ({
            name: group.name.trim(),
            selection_mode: group.selection_mode === 'combination' ? 'combination' : 'independent',
            values: (group.values || [])
                .map((value) => ({ name: value.name.trim() }))
                .filter((value) => value.name),
        }))
        .filter((group) => group.name && group.values.length > 0);

const UNASSIGNED_SERVICE_CATEGORY_FILTER = '__UNASSIGNED__';

const getNormalizedCategoryName = (value?: string | null) =>
    normalizeServiceOptionCategoryName(value);

const getCategoryLabel = (value?: string | null) =>
    getNormalizedCategoryName(value) || '미분류';

const sortMenuItems = (items: NavMenuItem[]) =>
    [...items].sort((a, b) => a.display_order - b.display_order);

export const ProductManager = () => {
    const { mode: priceDisplayMode, loading: priceDisplayLoading, updatePriceDisplayMode } = usePriceDisplay();
    const [products, setProducts] = useState<Product[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [menuItems, setMenuItems] = useState<NavMenuItem[]>([]);
    const [productCategories, setProductCategories] = useState<Category[]>([]);
    const [serviceOptionCategories, setServiceOptionCategories] = useState<ServiceOptionCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState(() => createEmptyFormData('general', 'basic'));

    const [viewMode, setViewMode] = useState<'general' | 'options'>('general');
    const [selectedParentCategoryFilter, setSelectedParentCategoryFilter] = useState<string | null>(null);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
    const [packageComponentParentFilter, setPackageComponentParentFilter] = useState<string | null>(null);
    const [packageComponentCategoryFilter, setPackageComponentCategoryFilter] = useState<string | null>(null);

    const [priceDisplaySaving, setPriceDisplaySaving] = useState(false);
    const [showServiceCategoryModal, setShowServiceCategoryModal] = useState(false);
    const [newServiceCategoryName, setNewServiceCategoryName] = useState('');
    const [newServiceCategoryDisplayOrder, setNewServiceCategoryDisplayOrder] = useState(0);
    const [editingServiceCategoryId, setEditingServiceCategoryId] = useState<string | null>(null);
    const [editingServiceCategoryName, setEditingServiceCategoryName] = useState('');
    const [editingServiceCategoryDisplayOrder, setEditingServiceCategoryDisplayOrder] = useState(0);
    const [serviceCategorySaving, setServiceCategorySaving] = useState(false);
    const [serviceCategoryTableMissing, setServiceCategoryTableMissing] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [p, s, m, c] = await Promise.all([getProducts({ catalogType: 'all' }), getSections(), getAllNavMenuItems(), getCategories().catch(() => [])]);
            setProducts(p);
            setSections(s);
            setMenuItems(m);
            setProductCategories(c);

            try {
                const cooperativeCategoryNames = Array.from(new Set(
                    p
                        .filter((product) => product.product_type === 'cooperative')
                        .map((product) => getNormalizedCategoryName(product.category))
                        .filter(Boolean),
                ));

                await syncServiceOptionCategories(cooperativeCategoryNames);
                const categories = await getServiceOptionCategories();
                setServiceOptionCategories(categories);
                setServiceCategoryTableMissing(false);
            } catch (error) {
                if (isMissingServiceOptionCategoryTableError(error)) {
                    setServiceOptionCategories([]);
                    setServiceCategoryTableMissing(true);
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(createEmptyFormData('general', 'basic'));
        setEditingProduct(null);
        setSelectedSections([]);
        setSelectedParentCategory('');
        setPackageComponentParentFilter(null);
        setPackageComponentCategoryFilter(null);
        setShowForm(false);
    };

    const [selectedParentCategory, setSelectedParentCategory] = useState('');

    const openCreateModal = () => {
        const productType = (viewMode === 'options' ? 'cooperative' : 'basic') as NonNullable<Product['product_type']>;

        setEditingProduct(null);
        setSelectedSections([]);
        setSelectedParentCategory('');
        setFormData(createEmptyFormData('general', productType));
        setShowForm(true);
    };

    const openServiceCategoryModal = () => {
        const nextDisplayOrder = serviceOptionCategories.length > 0
            ? Math.max(...serviceOptionCategories.map((category) => category.display_order || 0)) + 1
            : 1;

        setNewServiceCategoryName('');
        setNewServiceCategoryDisplayOrder(nextDisplayOrder);
        setEditingServiceCategoryId(null);
        setEditingServiceCategoryName('');
        setEditingServiceCategoryDisplayOrder(0);
        setShowServiceCategoryModal(true);
    };

    const handleEdit = async (product: Product) => {
        setEditingProduct(product);
        setFormData({
            ...createEmptyFormData(
                product.catalog_type || 'general',
                (product.product_type || 'basic') as NonNullable<Product['product_type']>,
            ),
            name: product.name,
            category: getNormalizedCategoryName(product.category),
            price: product.price,
            description: product.description || '',
            short_description: product.short_description || '',
            image_url: product.image_url || '',
            stock: product.stock,
            discount_rate: product.discount_rate || 0,
            catalog_type: product.catalog_type || 'general',
            product_type: product.product_type || 'basic',
            basic_components: product.basic_components || [],
            additional_components: product.additional_components || [],
            cooperative_components: product.cooperative_components || [],
            place_components: product.place_components || [],
            food_components: product.food_components || [],
            product_options: product.product_options || [],
        });

        if (product.product_type === 'cooperative') {
            setSelectedParentCategory('');
        } else {
            const matchedCategory = productCategories.find((category) => category.name === product.category);
            const parentCategory = matchedCategory?.parent_id ? productCategoryById.get(matchedCategory.parent_id) : null;
            setSelectedParentCategory(parentCategory?.name || '');
        }

        setPackageComponentParentFilter(null);
        setPackageComponentCategoryFilter(null);

        const s = await getProductSections(product.id!);
        setSelectedSections(s);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const clean = (arr: any[]) => (arr || []).filter(i => i.name).map(({ _category, ...rest }) => rest);
            const isPackageProduct = formData.catalog_type === 'package' && formData.product_type === 'basic';
            const data = {
                ...formData,
                category: getNormalizedCategoryName(formData.category),
                basic_components: isPackageProduct ? clean(formData.basic_components) : [],
                cooperative_components: isPackageProduct ? clean(formData.cooperative_components) : [],
                additional_components: isPackageProduct ? clean(formData.additional_components) : [],
                place_components: isPackageProduct ? clean(formData.place_components) : [],
                food_components: isPackageProduct ? clean(formData.food_components) : [],
                product_options: isBasicProductEditor ? normalizeProductOptions(formData.product_options) : [],
            };

            let id;
            if (editingProduct) {
                await updateProduct(editingProduct.id!, data);
                id = editingProduct.id!;
            } else {
                const res = await addProduct(data);
                id = res.id!;
            }
            await setProductSections(id, selectedSections);
            await loadData(); resetForm();
            alert('저장되었습니다.');
        } catch (error: any) {
            alert(`저장 실패: ${error.message}`);
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteProduct(id);
            await loadData();
        } catch (error) {
            console.error('Failed to delete product:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const updateProductOptionGroup = (groupIndex: number, patch: Partial<ProductOptionGroup>) => {
        const nextGroups = [...formData.product_options];
        nextGroups[groupIndex] = {
            ...nextGroups[groupIndex],
            ...patch,
        };
        setFormData({ ...formData, product_options: nextGroups });
    };

    const updateProductOptionValue = (groupIndex: number, valueIndex: number, name: string) => {
        const nextGroups = [...formData.product_options];
        nextGroups[groupIndex] = {
            ...nextGroups[groupIndex],
            values: nextGroups[groupIndex].values.map((value, index) =>
                index === valueIndex ? { ...value, name } : value,
            ),
        };
        setFormData({ ...formData, product_options: nextGroups });
    };

    const updateProductOptionSelectionMode = (selectionMode: ProductOptionSelectionMode) => {
        setFormData({
            ...formData,
            product_options: formData.product_options.map((group) => ({
                ...group,
                selection_mode: selectionMode,
            })),
        });
    };

    const addProductOptionGroup = () => {
        const selectionMode = getProductOptionSelectionMode(formData.product_options);
        setFormData({
            ...formData,
            product_options: [...formData.product_options, { ...createEmptyProductOptionGroup(), selection_mode: selectionMode }],
        });
    };

    const removeProductOptionGroup = (groupIndex: number) => {
        setFormData({
            ...formData,
            product_options: formData.product_options.filter((_, index) => index !== groupIndex),
        });
    };

    const addProductOptionValue = (groupIndex: number) => {
        const nextGroups = [...formData.product_options];
        nextGroups[groupIndex] = {
            ...nextGroups[groupIndex],
            values: [...nextGroups[groupIndex].values, { name: '' }],
        };
        setFormData({ ...formData, product_options: nextGroups });
    };

    const removeProductOptionValue = (groupIndex: number, valueIndex: number) => {
        const nextGroups = [...formData.product_options];
        const nextValues = nextGroups[groupIndex].values.filter((_, index) => index !== valueIndex);
        nextGroups[groupIndex] = {
            ...nextGroups[groupIndex],
            values: nextValues.length > 0 ? nextValues : [{ name: '' }],
        };
        setFormData({ ...formData, product_options: nextGroups });
    };

    const generalBasicProducts = useMemo(
        () => sortMenuItems(menuItems) && products.filter((product) => isGeneralBasicProduct(product)),
        [menuItems, products],
    );

    const { byId: productCategoryById, childrenByParentId: productChildrenByParentId } = useMemo(
        () => buildCategoryMaps(productCategories),
        [productCategories],
    );

    const rootProductCategories = useMemo(
        () => sortCategories(productCategories.filter((category) => !category.parent_id)),
        [productCategories],
    );

    const productChildCategoriesByParentName = useMemo(() => {
        const next = new Map<string, Category[]>();

        rootProductCategories.forEach((parent) => {
            next.set(parent.name, productChildrenByParentId.get(parent.id || null) || []);
        });

        return next;
    }, [productChildrenByParentId, rootProductCategories]);

    const packageComponentParentMenus = useMemo(
        () => rootProductCategories.filter((parent) => (productChildCategoriesByParentName.get(parent.name) || []).length > 0),
        [productChildCategoriesByParentName, rootProductCategories],
    );

    const packageComponentChildMenus = useMemo(
        () =>
            packageComponentParentFilter
                ? (productChildCategoriesByParentName.get(packageComponentParentFilter) || [])
                : [],
        [packageComponentParentFilter, productChildCategoriesByParentName],
    );

    const filteredPackageComponentProducts = useMemo(() => {
        if (packageComponentCategoryFilter) {
            return generalBasicProducts.filter(
                (product) => getNormalizedCategoryName(product.category) === packageComponentCategoryFilter,
            );
        }

        if (packageComponentParentFilter) {
            const childCategoryNames = new Set(packageComponentChildMenus.map((item) => item.name));
            return generalBasicProducts.filter((product) => childCategoryNames.has(getNormalizedCategoryName(product.category)));
        }

        return generalBasicProducts;
    }, [
        generalBasicProducts,
        packageComponentCategoryFilter,
        packageComponentChildMenus,
        packageComponentParentFilter,
    ]);

    const handleAddServiceCategory = async () => {
        const categoryName = getNormalizedCategoryName(newServiceCategoryName);
        if (!categoryName) return;

        setServiceCategorySaving(true);
        try {
            await addServiceOptionCategory({
                name: categoryName,
                display_order: newServiceCategoryDisplayOrder || serviceOptionCategories.length + 1,
            });
            setNewServiceCategoryName('');
            await loadData();
        } catch (error) {
            console.error('Failed to add service option category:', error);
            alert(serviceCategoryTableMissing
                ? '부가서비스 카테고리 테이블이 없습니다. add_service_option_categories_table.sql 을 먼저 실행해주세요.'
                : '카테고리 추가에 실패했습니다. 같은 이름이 이미 있는지 확인해주세요.');
        } finally {
            setServiceCategorySaving(false);
        }
    };

    const startEditingServiceCategory = (category: ServiceOptionCategory) => {
        setEditingServiceCategoryId(category.id!);
        setEditingServiceCategoryName(category.name);
        setEditingServiceCategoryDisplayOrder(category.display_order || 0);
    };

    const resetEditingServiceCategory = () => {
        setEditingServiceCategoryId(null);
        setEditingServiceCategoryName('');
        setEditingServiceCategoryDisplayOrder(0);
    };

    const handleUpdateServiceCategory = async (id: string) => {
        const nextName = getNormalizedCategoryName(editingServiceCategoryName);
        if (!nextName) return;

        const targetCategory = serviceOptionCategories.find((category) => category.id === id);
        if (!targetCategory) return;

        setServiceCategorySaving(true);
        try {
            await updateServiceOptionCategory(id, {
                name: nextName,
                display_order: editingServiceCategoryDisplayOrder || targetCategory.display_order || 0,
            });

            const previousName = getNormalizedCategoryName(targetCategory.name);
            const renamed = previousName && previousName !== nextName;

            if (renamed) {
                const affectedProducts = products.filter((product) =>
                    product.product_type === 'cooperative'
                    && getNormalizedCategoryName(product.category) === previousName,
                );

                await Promise.all(
                    affectedProducts.map((product) =>
                        updateProduct(product.id!, { category: nextName }),
                    ),
                );

                if (selectedCategoryFilter === previousName) {
                    setSelectedCategoryFilter(nextName);
                }
            }

            resetEditingServiceCategory();
            await loadData();
        } catch (error) {
            console.error('Failed to update service option category:', error);
            alert('카테고리 수정에 실패했습니다.');
        } finally {
            setServiceCategorySaving(false);
        }
    };

    const handleDeleteServiceCategory = async (id: string) => {
        const targetCategory = serviceOptionCategories.find((category) => category.id === id);
        if (!targetCategory) return;

        const categoryName = getNormalizedCategoryName(targetCategory.name);
        const linkedProducts = products.filter((product) =>
            product.product_type === 'cooperative'
            && getNormalizedCategoryName(product.category) === categoryName,
        );

        const confirmMessage = linkedProducts.length > 0
            ? `'${targetCategory.name}' 카테고리를 삭제하시겠습니까?\n연결된 부가서비스 ${linkedProducts.length}개는 미분류로 변경됩니다.`
            : `'${targetCategory.name}' 카테고리를 삭제하시겠습니까?`;

        if (!confirm(confirmMessage)) return;

        setServiceCategorySaving(true);
        try {
            if (linkedProducts.length > 0) {
                await Promise.all(
                    linkedProducts.map((product) =>
                        updateProduct(product.id!, { category: '' }),
                    ),
                );
            }

            await deleteServiceOptionCategory(id);

            if (selectedCategoryFilter === categoryName) {
                setSelectedCategoryFilter(null);
            }

            if (formData.category === categoryName) {
                setFormData((prev) => ({ ...prev, category: '' }));
            }

            await loadData();
        } catch (error) {
            console.error('Failed to delete service option category:', error);
            alert('카테고리 삭제에 실패했습니다.');
        } finally {
            setServiceCategorySaving(false);
        }
    };

    const toggleSection = (sectionId: string) => {
        setSelectedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadImage(file);
            setFormData({ ...formData, image_url: url });
        } catch (error) { alert('업로드 실패'); } finally { setUploading(false); }
    };

    const handlePriceDisplayToggle = async () => {
        if (priceDisplayLoading || priceDisplaySaving) return;

        const nextMode: ProductPriceDisplayMode =
            priceDisplayMode === 'inquiry' ? 'visible' : 'inquiry';

        setPriceDisplaySaving(true);
        try {
            await updatePriceDisplayMode(nextMode);
            alert(nextMode === 'inquiry'
                ? '고객 화면 전체 가격이 비공개로 전환되었습니다.'
                : '고객 화면 전체 가격이 공개로 전환되었습니다.');
        } catch (error) {
            console.error('Failed to update product price display mode:', error);
            alert('가격 노출 설정 저장에 실패했습니다.');
        } finally {
            setPriceDisplaySaving(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#001E45]" size={40} /></div>;
    const serviceProducts = products.filter((product) => product.product_type === 'cooperative');
    const registeredServiceCategoryNames = new Set(
        serviceOptionCategories.map((category) => getNormalizedCategoryName(category.name)).filter(Boolean),
    );
    const orphanServiceCategories = Array.from(new Set(
        serviceProducts
            .map((product) => getNormalizedCategoryName(product.category))
            .filter((name) => Boolean(name) && !registeredServiceCategoryNames.has(name)),
    ))
        .sort((a, b) => a.localeCompare(b, 'ko-KR'))
        .map((name, index) => ({
            id: `legacy-${name}`,
            name,
            display_order: 100000 + index,
        }));
    const allServiceCategoryOptions = [...serviceOptionCategories, ...orphanServiceCategories]
        .sort((a, b) => {
            if ((a.display_order || 0) !== (b.display_order || 0)) {
                return (a.display_order || 0) - (b.display_order || 0);
            }
            return a.name.localeCompare(b.name, 'ko-KR');
        });
    const hasUnassignedServiceProducts = serviceProducts.some(
        (product) => !getNormalizedCategoryName(product.category),
    );
    const currentProductType = formData.product_type || 'basic';
    const isBasicProductEditor = currentProductType === 'basic';
    const isAdditionalOptionEditor = currentProductType === 'essential' || currentProductType === 'additional';
    const isServiceEditor = currentProductType === 'cooperative';
    const isOptionEditor = !isBasicProductEditor;
    const listTitle = viewMode === 'general' ? '상품 목록' : '부가서비스 목록';
    const createButtonLabel = viewMode === 'general'
        ? '새 상품 추가'
        : '새 부가서비스 추가';
    const editorTypeLabel = isServiceEditor
        ? '부가서비스'
        : isAdditionalOptionEditor
            ? '추가 구성 상품'
            : (formData.catalog_type || 'general') === 'package'
                ? '패키지 상품'
                : '일반 상품';
    const editorModalTitle = editingProduct ? `${editorTypeLabel} 수정` : `새 ${editorTypeLabel} 등록`;
    const editorBadgeLabel = isServiceEditor
        ? '부가서비스'
        : isAdditionalOptionEditor
            ? '추가 구성'
            : (formData.catalog_type || 'general') === 'package'
                ? '패키지 기본상품'
                : '일반 기본상품';
    const shortDescriptionPlaceholder = isServiceEditor
        ? '예: 케이터링, 촬영, 설치 지원 등 현장 운영을 돕는 서비스를 간단히 소개해주세요.'
        : isAdditionalOptionEditor
            ? '예: 본품과 함께 사용하는 보조 장비나 추가 구성을 한 줄로 설명해주세요.'
            : '예: 전시회와 박람회에 필요한 모든 것을 한번에!';

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* 상단 탭: 상품(일반+패키지) / 부가서비스 */}
            <div className="flex border-b mb-6">
                <button onClick={() => { setViewMode('general'); setSelectedParentCategoryFilter(null); setSelectedCategoryFilter(null); }} className={`px-6 py-3 font-bold transition-all ${viewMode === 'general' ? 'border-b-2 border-[#001E45] text-[#001E45]' : 'text-slate-400'}`}>상품 관리</button>
                <button onClick={() => { setViewMode('options'); setSelectedCategoryFilter(null); }} className={`px-6 py-3 font-bold transition-all ${viewMode === 'options' ? 'border-b-2 border-[#001E45] text-[#001E45]' : 'text-slate-400'}`}>부가서비스 관리</button>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-900">사이트 전체 가격 노출 설정</p>
                        <p className="mt-1 text-sm text-slate-500">
                            비공개로 전환하면 고객 화면 전체에서 숫자 가격 대신 <span className="font-semibold text-slate-700">가격문의</span>로 표시됩니다.
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                        <button
                            type="button"
                            onClick={handlePriceDisplayToggle}
                            disabled={priceDisplayLoading || priceDisplaySaving}
                            aria-pressed={priceDisplayMode === 'inquiry'}
                            className={`inline-flex min-w-[260px] items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${priceDisplayMode === 'inquiry'
                                ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-white text-amber-800 hover:border-amber-300 hover:bg-amber-50'
                                : 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-white text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50'
                                }`}
                        >
                            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${priceDisplayMode === 'inquiry'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                {priceDisplayLoading || priceDisplaySaving ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : priceDisplayMode === 'inquiry' ? (
                                    <EyeOff size={16} />
                                ) : (
                                    <Eye size={16} />
                                )}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className={`text-[11px] font-black uppercase tracking-[0.14em] ${priceDisplayMode === 'inquiry' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {priceDisplayMode === 'inquiry' ? 'Inquiry Mode' : 'Visible Mode'}
                                </span>
                                <span className="mt-0.5 text-sm font-bold text-slate-900">
                                    {priceDisplayMode === 'inquiry' ? '가격 비공개 적용 중' : '가격 공개 적용 중'}
                                </span>
                            </span>
                            <span className={`relative inline-flex h-8 w-14 flex-shrink-0 rounded-full transition-colors ${priceDisplayMode === 'inquiry' ? 'bg-amber-400' : 'bg-emerald-400'}`}>
                                <span className={`absolute inset-y-1 left-1 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-transform duration-200 ${priceDisplayMode === 'inquiry' ? 'translate-x-6' : 'translate-x-0'}`} />
                            </span>
                        </button>
                        <p className="text-xs text-slate-400">
                            현재 상태: {priceDisplayMode === 'inquiry' ? '고객 가격 비공개' : '고객 가격 공개'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{listTitle}</h2>
                <div className="flex items-center gap-2">
                    {viewMode === 'options' && (
                        <button
                            type="button"
                            onClick={openServiceCategoryModal}
                            className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-700"
                        >
                            <Tag size={18} /> 카테고리 관리
                        </button>
                    )}
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-[#001E45] text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-all font-medium"
                    >
                        <Plus size={20} /> {createButtonLabel}
                    </button>
                </div>
            </div>

            {/* 상품 관리 - 계층형 카테고리 필터 */}
            {viewMode !== 'options' && (() => {
                const packageProducts = products.filter(p =>
                    p.product_type === 'basic' || !p.product_type
                );

                // 상품에 있는 카테고리(중분류) 목록
                // 대분류 목록: 상품이 있는 중분류의 상위 카테고리
                const parentMenus = menuItems
                    .filter(m => !m.category) // 대분류는 category가 null
                    .filter(parent => {
                        // 해당 대분류의 중분류 중 상품이 있는 것이 있는지 확인
                        const children = menuItems.filter(child => child.category === parent.name);
                        return children.length > 0;
                    })
                    .sort((a, b) => a.display_order - b.display_order);

                // 선택된 대분류의 중분류 (상품이 있는 것만)
                const childMenus = selectedParentCategoryFilter
                    ? (productChildCategoriesByParentName.get(selectedParentCategoryFilter) || [])
                    : [];

                const effectiveParentMenus = rootProductCategories
                    .filter(parent => (productChildCategoriesByParentName.get(parent.name) || []).length > 0);
                const effectiveChildMenus = selectedParentCategoryFilter
                    ? (productChildCategoriesByParentName.get(selectedParentCategoryFilter) || [])
                    : [];

                if (effectiveParentMenus.length === 0) return null;

                return (
                    <div className="space-y-3 mb-6">
                        {/* 대분류 탭 (1차 메뉴) */}
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
                            <button
                                onClick={() => {
                                    setSelectedParentCategoryFilter(null);
                                    setSelectedCategoryFilter(null);
                                }}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${selectedParentCategoryFilter === null
                                    ? 'bg-white text-[#001E45] shadow-sm'
                                    : 'text-slate-500'
                                    }`}
                            >
                                전체 ({packageProducts.length})
                            </button>
                            {effectiveParentMenus.map(parent => {
                                const children = productChildCategoriesByParentName.get(parent.name) || [];
                                const count = packageProducts.filter(p => children.some(c => c.name === p.category)).length;
                                return (
                                    <button
                                        key={parent.id}
                                        onClick={() => {
                                            setSelectedParentCategoryFilter(parent.name);
                                            setSelectedCategoryFilter(null);
                                        }}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${selectedParentCategoryFilter === parent.name
                                            ? 'bg-white text-[#001E45] shadow-sm'
                                            : 'text-slate-500'
                                            }`}
                                    >
                                        {parent.name} ({count})
                                    </button>
                                );
                            })}
                        </div>

                        {/* 중분류 탭 (2차 메뉴) - 대분류 선택 시만 표시 */}
                        {selectedParentCategoryFilter && effectiveChildMenus.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedCategoryFilter(null)}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${selectedCategoryFilter === null
                                        ? 'bg-[#001E45] text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    전체 ({packageProducts.filter(p => childMenus.some(c => c.name === p.category)).length})
                                </button>
                                {childMenus.map(child => {
                                    const count = packageProducts.filter(p => p.category === child.name).length;
                                    return (
                                        <button
                                            key={child.id}
                                            onClick={() => setSelectedCategoryFilter(child.name)}
                                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${selectedCategoryFilter === child.name
                                                ? 'bg-[#001E45] text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {child.name} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}

            {viewMode === 'options' && (
                <div className="space-y-4 mb-6">
                    {serviceCategoryTableMissing && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            부가서비스 카테고리 전용 테이블이 아직 없습니다. `add_service_option_categories_table.sql` 을 실행하면 카테고리 CRUD가 활성화됩니다.
                        </div>
                    )}

                    {(allServiceCategoryOptions.length > 0 || hasUnassignedServiceProducts) && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedCategoryFilter(null)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${selectedCategoryFilter === null
                                    ? 'bg-[#001E45] text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                전체 ({serviceProducts.length})
                            </button>
                            {allServiceCategoryOptions.map((category) => {
                                const categoryName = getNormalizedCategoryName(category.name);
                                const count = serviceProducts.filter((product) =>
                                    getNormalizedCategoryName(product.category) === categoryName,
                                ).length;

                                return (
                                    <button
                                        key={category.id || category.name}
                                        onClick={() => setSelectedCategoryFilter(categoryName)}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${selectedCategoryFilter === categoryName
                                            ? 'bg-[#001E45] text-white shadow-sm'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {category.name} ({count})
                                    </button>
                                );
                            })}
                            {hasUnassignedServiceProducts && (
                                <button
                                    onClick={() => setSelectedCategoryFilter(UNASSIGNED_SERVICE_CATEGORY_FILTER)}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${selectedCategoryFilter === UNASSIGNED_SERVICE_CATEGORY_FILTER
                                        ? 'bg-[#001E45] text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    미분류 ({serviceProducts.filter((product) => !getNormalizedCategoryName(product.category)).length})
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 메인 폼 모달 */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[1000px] max-h-[90vh] flex flex-col">
                        <div className="flex justify-between p-4 border-b bg-slate-50 rounded-t-xl">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">{editorModalTitle}</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                                        {editorBadgeLabel}
                                    </span>
                                </p>
                            </div>
                            <button onClick={resetForm} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
                            {isBasicProductEditor && !editingProduct && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">상품 유형</label>
                                    <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
                                        {([['general', '일반 상품'], ['package', '패키지 상품']] as const).map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, catalog_type: value })}
                                                className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${(formData.catalog_type || 'general') === value ? 'bg-white text-[#001E45] shadow-sm' : 'text-slate-500'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 기본 정보 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div><label className="block text-sm font-bold text-slate-700 mb-1">상품명 *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] outline-none" /></div>
                                    <div><label className="block text-sm font-bold text-slate-700 mb-1">간단 소개 <span className="text-slate-400 font-normal text-xs">{isOptionEditor ? '(목록 카드에 먼저 노출)' : '(상품명 아래 표시)'}</span></label><textarea value={formData.short_description} onChange={(e) => setFormData({ ...formData, short_description: e.target.value })} placeholder={shortDescriptionPlaceholder} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] outline-none resize-none h-16" /></div>
                                    {isServiceEditor ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="block text-sm font-bold text-slate-700">부가서비스 카테고리 *</label>
                                                <button
                                                    type="button"
                                                    onClick={openServiceCategoryModal}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#001E45] hover:text-[#002D66]"
                                                >
                                                    <Tag size={14} />
                                                    카테고리 관리
                                                </button>
                                            </div>
                                            <select
                                                required
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg outline-none"
                                            >
                                                <option value="">카테고리 선택</option>
                                                {allServiceCategoryOptions.map((category) => (
                                                    <option key={category.id || category.name} value={category.name}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-slate-500">
                                                부가서비스 카테고리는 목록 필터와 상세페이지 분류에 함께 사용됩니다.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">1차 메뉴 (대분류)</label>
                                                <select
                                                    value={selectedParentCategory}
                                                    onChange={(e) => {
                                                        setSelectedParentCategory(e.target.value);
                                                        setFormData({ ...formData, category: '' });
                                                    }}
                                                    className="w-full px-4 py-2 border rounded-lg outline-none bg-slate-50 focus:bg-white transition-colors"
                                                >
                                                    <option value="">대분류 선택</option>
                                                    {rootProductCategories.map(parent => (
                                                        <option key={parent.id} value={parent.name}>{parent.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-1">2차 메뉴 (중분류) *</label>
                                                <select
                                                    required
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full px-4 py-2 border rounded-lg outline-none"
                                                    disabled={!selectedParentCategory}
                                                >
                                                    <option value="">
                                                        {!selectedParentCategory ? '대분류를 먼저 선택하세요' : '중분류 선택'}
                                                    </option>
                                                    {selectedParentCategory && (productChildCategoriesByParentName.get(selectedParentCategory) || [])
                                                        .map(child => (
                                                            <option key={child.id} value={child.name}>{child.name}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    <div className={`grid gap-4 ${isBasicProductEditor ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        <div><label className="block text-sm font-bold text-slate-700 mb-1">가격 (원) *</label><input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
                                        {isBasicProductEditor && (
                                            <div><label className="block text-sm font-bold text-slate-700 mb-1">할인율 (%)</label><input type="number" value={formData.discount_rate} onChange={(e) => setFormData({ ...formData, discount_rate: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-700">대표 이미지</label>
                                    <div onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden relative border-slate-300">
                                        {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover" /> : <div className="text-center text-slate-400"><Upload size={40} className="mx-auto mb-2" /><span className="text-sm">클릭하여 업로드</span></div>}
                                        {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-[#001E45]" /></div>}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                                    <input type="url" placeholder="또는 이미지 URL 입력" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-4 py-2 text-sm border rounded-lg outline-none" />
                                </div>
                            </div>

                            {/* 노출 섹션 */}
                            {isBasicProductEditor && (
                                <div><label className="block text-sm font-bold text-slate-700 mb-2">노출 섹션 (메인페이지)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {sections.map(s => <button key={s.id} type="button" onClick={() => toggleSection(s.id!)} className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${selectedSections.includes(s.id!) ? 'bg-[#001E45] text-white border-[#001E45]' : 'bg-white text-slate-500 hover:border-slate-400'}`}>{s.name}</button>)}
                                    </div>
                                </div>
                            )}

                            {/* 상세 설명 */}
                            {isBasicProductEditor ? (
                                <div><label className="block text-sm font-bold text-slate-700 mb-2">상세 설명</label><SimpleEditor initialValue={formData.description} onChange={(v) => setFormData({ ...formData, description: v })} /></div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">상세 설명 (선택)</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder={isServiceEditor ? '예: 현장 운영 인력이 세팅부터 종료까지 지원합니다.' : '예: 행사 현장에서 본품과 함께 사용하기 좋은 추가 장비입니다.'}
                                        rows={5}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:ring-4 focus:ring-[#001E45]/10 focus:border-[#001E45] outline-none transition-all font-medium resize-none"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        비워두면 간단 소개를 우선 사용하고, 필요할 때만 보충 설명을 넣으면 됩니다.
                                    </p>
                                </div>
                            )}

                            {isBasicProductEditor && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-2">
                    <h4 className="font-bold text-slate-900">상세페이지 추가 구성 노출 안내</h4>
                    <p className="text-sm leading-6 text-slate-600">
                        <span className="font-semibold text-slate-800">추가 구성</span>은 일반 상품 관리에 등록된 일반상품이 전역으로 자동 노출됩니다.
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                        <span className="font-semibold text-slate-800">부가서비스</span>는 부가서비스 관리에서 등록한 항목이 전역으로 노출됩니다.
                    </p>
                    {(formData.catalog_type || 'general') === 'general' && (
                        <p className="text-sm leading-6 text-slate-600">
                                            이 일반 상품은 저장 후 다른 상세페이지의 <span className="font-semibold text-slate-800">추가 구성</span> 후보에 자동 포함됩니다.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 패키지 상품 구성 설정 */}
                            {isBasicProductEditor && (
                                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h4 className="text-base font-bold text-slate-900">상품 옵션</h4>
                                            <p className="mt-1 text-sm text-slate-500">
                                                색상, 사이즈처럼 같은 상품 안에서 옵션값별 수량을 나눠 담을 수 있게 설정합니다.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addProductOptionGroup}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50"
                                        >
                                            <Plus size={16} />
                                            옵션 그룹 추가
                                        </button>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-sm font-semibold text-slate-900">옵션 입력 방식</p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            독립 수량형은 옵션값마다 수량을 따로 담고, 조합 선택형은 그룹별 값을 하나씩 고른 뒤 세트 수량만 조절합니다.
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {([
                                                { value: 'independent', label: '독립 수량형' },
                                                { value: 'combination', label: '조합 선택형' },
                                            ] as const).map((mode) => {
                                                const active = getProductOptionSelectionMode(formData.product_options) === mode.value;
                                                return (
                                                    <button
                                                        key={mode.value}
                                                        type="button"
                                                        onClick={() => updateProductOptionSelectionMode(mode.value)}
                                                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                                                            active
                                                                ? 'bg-[#001E45] text-white shadow-sm'
                                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {mode.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {formData.product_options.length === 0 ? (
                                        <div className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-400">
                                            등록된 상품 옵션이 없습니다.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {formData.product_options.map((group, groupIndex) => (
                                                <div key={`product-option-group-${groupIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={group.name}
                                                            onChange={(e) => updateProductOptionGroup(groupIndex, { name: e.target.value })}
                                                            placeholder="예: 사이즈"
                                                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition-all focus:border-[#001E45] focus:ring-4 focus:ring-[#001E45]/10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeProductOptionGroup(groupIndex)}
                                                            className="rounded-xl border border-red-200 p-3 text-red-500 transition-all hover:bg-red-50"
                                                            aria-label="옵션 그룹 삭제"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>

                                                    <div className="mt-4 space-y-2">
                                                        {group.values.map((value, valueIndex) => (
                                                            <div key={`product-option-value-${groupIndex}-${valueIndex}`} className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={value.name}
                                                                    onChange={(e) => updateProductOptionValue(groupIndex, valueIndex, e.target.value)}
                                                                    placeholder="예: 1200"
                                                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition-all focus:border-[#001E45] focus:ring-4 focus:ring-[#001E45]/10"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeProductOptionValue(groupIndex, valueIndex)}
                                                                    className="rounded-xl border border-slate-200 p-3 text-slate-500 transition-all hover:bg-slate-100"
                                                                    aria-label="옵션값 삭제"
                                                                >
                                                                    <X size={18} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => addProductOptionValue(groupIndex)}
                                                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100"
                                                    >
                                                        <Plus size={15} />
                                                        옵션값 추가
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.catalog_type === 'package' && formData.product_type === 'basic' && (
                                <div className="space-y-6 pt-8 border-t">
                                    <h4 className="font-bold text-lg flex items-center gap-2"><Grid3X3 size={22} className="text-[#001E45]" /> 패키지 구성 세부 설정</h4>

                                    {/* 기본 구성품 */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="font-bold text-slate-800 underline decoration-blue-200 underline-offset-4">기본 필수 구성품 (가격 포함)</span>
                                            <button type="button" onClick={() => setFormData({ ...formData, basic_components: [...formData.basic_components, { name: '', quantity: 1 }] })} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all font-bold">+ 항목 추가</button>
                                        </div>
                                        {packageComponentParentMenus.length > 0 && (
                                            <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">상품 빠르게 찾기</p>
                                                    <p className="mt-1 text-sm text-slate-600">
                                                        1차 메뉴 탭과 2차 메뉴 탭으로 후보 상품을 좁힌 뒤 각 구성품을 선택할 수 있습니다.
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPackageComponentParentFilter(null);
                                                            setPackageComponentCategoryFilter(null);
                                                        }}
                                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${packageComponentParentFilter === null
                                                            ? 'bg-[#001E45] text-white shadow-sm'
                                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        전체 ({generalBasicProducts.length})
                                                    </button>
                                                    {packageComponentParentMenus.map((parent) => {
                                                        const childNames = menuItems
                                                            .filter((child) => child.category === parent.name)
                                                            .map((child) => child.name);
                                                        const count = generalBasicProducts.filter((product) =>
                                                            childNames.includes(getNormalizedCategoryName(product.category)),
                                                        ).length;

                                                        return (
                                                            <button
                                                                key={parent.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setPackageComponentParentFilter(parent.name);
                                                                    setPackageComponentCategoryFilter(null);
                                                                }}
                                                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${packageComponentParentFilter === parent.name
                                                                    ? 'bg-[#001E45] text-white shadow-sm'
                                                                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                                                                    }`}
                                                            >
                                                                {parent.name} ({count})
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {packageComponentParentFilter && packageComponentChildMenus.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPackageComponentCategoryFilter(null)}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${packageComponentCategoryFilter === null
                                                                ? 'bg-slate-900 text-white'
                                                                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            전체
                                                        </button>
                                                        {packageComponentChildMenus.map((child) => {
                                                            const count = generalBasicProducts.filter(
                                                                (product) => getNormalizedCategoryName(product.category) === child.name,
                                                            ).length;

                                                            return (
                                                                <button
                                                                    key={child.id}
                                                                    type="button"
                                                                    onClick={() => setPackageComponentCategoryFilter(child.name)}
                                                                    className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${packageComponentCategoryFilter === child.name
                                                                        ? 'bg-slate-900 text-white'
                                                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                                                        }`}
                                                                >
                                                                    {child.name} ({count})
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            {formData.basic_components.map((item, idx) => (
                                                <div key={idx} className="flex gap-2 items-center bg-white p-2.5 rounded-lg border shadow-sm">
                                                    <select value={item.name} onChange={(e) => {
                                                        const val = e.target.value;
                                                        const n = [...formData.basic_components]; n[idx].name = val;
                                                        setFormData({ ...formData, basic_components: n });
                                                    }} className="flex-1 text-sm border-slate-200 rounded-md focus:ring-1 focus:ring-blue-400">
                                                        <option value="">
                                                            {packageComponentCategoryFilter
                                                                ? `${packageComponentCategoryFilter} 상품 선택`
                                                                : packageComponentParentFilter
                                                                    ? `${packageComponentParentFilter} 상품 선택`
                                                                    : '일반상품 선택 (등록된 기본상품)'}
                                                        </option>
                                                        {[
                                                            ...filteredPackageComponentProducts,
                                                            ...generalBasicProducts.filter(
                                                                (product) =>
                                                                    product.name === item.name &&
                                                                    !filteredPackageComponentProducts.some((filtered) => filtered.id === product.id),
                                                            ),
                                                        ].map((product) => (
                                                                <option key={product.id} value={product.name}>
                                                                    {product.name}
                                                                    {product.category ? ` / ${product.category}` : ''}
                                                                    {product.price > 0 ? ` (${product.price.toLocaleString()}원)` : ''}
                                                                </option>
                                                            ))}
                                                    </select>
                                                    <input type="number" min="1" value={item.quantity} onChange={(e) => {
                                                        const n = [...formData.basic_components]; n[idx].quantity = Number(e.target.value);
                                                        setFormData({ ...formData, basic_components: n });
                                                    }} className="w-20 text-sm border-slate-200 rounded-md" />
                                                    <button type="button" onClick={() => setFormData({ ...formData, basic_components: formData.basic_components.filter((_, i) => i !== idx) })} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                        <h5 className="font-bold text-slate-900 mb-2">전역 옵션 노출 방식</h5>
                                        <p className="text-sm leading-6 text-slate-600">
                                            패키지 상세의 <span className="font-semibold text-slate-800">추가 구성</span>은 모든 일반 상품 전역 풀에서 자동 노출됩니다.
                                        </p>
                                        <p className="text-sm leading-6 text-slate-600">
                                            <span className="font-semibold text-slate-800">부가서비스</span>는 부가서비스 전역 풀에서 자동 노출되며, 개별 패키지별 토글은 더 이상 사용하지 않습니다.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </form>

                        <div className="p-4 border-t bg-slate-50 flex gap-4 rounded-b-xl">
                            <button type="button" onClick={resetForm} className="flex-1 py-3 border border-slate-300 rounded-xl bg-white hover:bg-slate-100 font-bold transition-all">취소</button>
                            <button type="submit" onClick={(e) => { e.preventDefault(); handleSubmit(e); }} disabled={saving} className="flex-1 py-3 bg-[#001E45] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 disabled:bg-slate-300 shadow-lg font-bold transition-all">
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                <span>{editingProduct ? `${editorTypeLabel} 저장` : `${editorTypeLabel} 등록`}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showServiceCategoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">부가서비스 카테고리 관리</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    추가, 이름 변경, 삭제 시 부가서비스 상품 분류와 함께 연동됩니다.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowServiceCategoryModal(false);
                                    resetEditingServiceCategory();
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5 px-5 py-5">
                            {serviceCategoryTableMissing && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    SQL 테이블 생성 전에는 카테고리 저장이 되지 않습니다. `add_service_option_categories_table.sql` 을 먼저 실행해주세요.
                                </div>
                            )}

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="mb-3 text-sm font-bold text-slate-800">새 카테고리 추가</p>
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto]">
                                    <input
                                        type="text"
                                        value={newServiceCategoryName}
                                        onChange={(e) => setNewServiceCategoryName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                void handleAddServiceCategory();
                                            }
                                        }}
                                        placeholder="예: 설치 지원, 케이터링"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#001E45] focus:ring-4 focus:ring-[#001E45]/10"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        value={newServiceCategoryDisplayOrder}
                                        onChange={(e) => setNewServiceCategoryDisplayOrder(parseInt(e.target.value, 10) || 0)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#001E45] focus:ring-4 focus:ring-[#001E45]/10"
                                        placeholder="노출 순서"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddServiceCategory}
                                        disabled={serviceCategorySaving || !getNormalizedCategoryName(newServiceCategoryName)}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#001E45] px-4 py-3 font-bold text-white transition-all hover:bg-[#002D66] disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        {serviceCategorySaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        추가
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                {allServiceCategoryOptions.length === 0 ? (
                                    <div className="rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center text-slate-400">
                                        등록된 부가서비스 카테고리가 없습니다.
                                    </div>
                                ) : (
                                    allServiceCategoryOptions.map((category) => {
                                        const categoryName = getNormalizedCategoryName(category.name);
                                        const linkedCount = serviceProducts.filter((product) =>
                                            getNormalizedCategoryName(product.category) === categoryName,
                                        ).length;
                                        const isEditing = editingServiceCategoryId === category.id;
                                        const isLegacyCategory = String(category.id).startsWith('legacy-');

                                        return (
                                            <div key={category.id || category.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                {isEditing ? (
                                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto_auto]">
                                                        <input
                                                            type="text"
                                                            value={editingServiceCategoryName}
                                                            onChange={(e) => setEditingServiceCategoryName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    void handleUpdateServiceCategory(category.id!);
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    resetEditingServiceCategory();
                                                                }
                                                            }}
                                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#001E45] focus:ring-4 focus:ring-[#001E45]/10"
                                                            autoFocus
                                                        />
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editingServiceCategoryDisplayOrder}
                                                            onChange={(e) => setEditingServiceCategoryDisplayOrder(parseInt(e.target.value, 10) || 0)}
                                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#001E45] focus:ring-4 focus:ring-[#001E45]/10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateServiceCategory(category.id!)}
                                                            disabled={serviceCategorySaving || !getNormalizedCategoryName(editingServiceCategoryName)}
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#001E45] px-4 py-3 font-bold text-white transition-all hover:bg-[#002D66] disabled:cursor-not-allowed disabled:bg-slate-300"
                                                        >
                                                            {serviceCategorySaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                            저장
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={resetEditingServiceCategory}
                                                            className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-600 transition-all hover:bg-slate-50"
                                                        >
                                                            취소
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                        <div className="space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-base font-bold text-slate-900">{category.name}</span>
                                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                                                    순서 {category.display_order || 0}
                                                                </span>
                                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                                                    연결 {linkedCount}개
                                                                </span>
                                                                {isLegacyCategory && (
                                                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                                                                        기존 데이터
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-500">
                                                                {isLegacyCategory
                                                                    ? '기존 부가서비스 상품에서 감지된 카테고리입니다. 새로 등록해 관리 가능한 상태로 바꿔주세요.'
                                                                    : '상세페이지 부가서비스 탭의 분류와 어드민 필터에 사용됩니다.'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {!isLegacyCategory && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => startEditingServiceCategory(category)}
                                                                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
                                                                    >
                                                                        수정
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteServiceCategory(category.id!)}
                                                                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-500 transition-all hover:bg-red-50"
                                                                    >
                                                                        삭제
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 상품 리스트 테이블 */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mt-8 border border-slate-100">
                <table className="w-full">
                    <thead className="bg-[#001E45] text-white">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-bold uppercase tracking-wider">상품 정보</th>
                            <th className="text-left px-6 py-4 text-sm font-bold uppercase tracking-wider">메뉴(카테고리)</th>
                            <th className="text-right px-6 py-4 text-sm font-bold uppercase tracking-wider">가격</th>
                            <th className="text-center px-6 py-4 text-sm font-bold uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {products
                            .filter(p => {
                                // 상품 타입 필터
                                let typeMatch = false;
                                if (viewMode === 'general') {
                                    typeMatch = p.product_type === 'basic' || !p.product_type;
                                } else if (viewMode === 'options') {
                                    typeMatch = p.product_type === 'cooperative';
                                }

                                if (!typeMatch) return false;

                                // 상품 관리: 대분류/중분류 필터
                                if (viewMode === 'general') {
                                    if (selectedCategoryFilter) {
                                        // 중분류가 선택된 경우
                                        return p.category === selectedCategoryFilter;
                                    } else if (selectedParentCategoryFilter) {
                                        // 대분류만 선택된 경우: 해당 대분류의 모든 중분류 상품 표시
                                        const childCategories = (productChildCategoriesByParentName.get(selectedParentCategoryFilter) || [])
                                            .map(m => m.name);
                                        return childCategories.includes(p.category || '');
                                    }
                                    return true;
                                }

                                // 부가서비스 관리: 중분류 필터
                                if (viewMode === 'options' && selectedCategoryFilter) {
                                    if (selectedCategoryFilter === UNASSIGNED_SERVICE_CATEGORY_FILTER) {
                                        return !getNormalizedCategoryName(p.category);
                                    }
                                    return getNormalizedCategoryName(p.category) === selectedCategoryFilter;
                                }

                                return true;
                            })
                            .map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {p.image_url ? <img src={p.image_url} className="w-12 h-12 object-cover rounded-xl shadow-sm" /> : <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300"><ImageIcon size={20} /></div>}
                                            <div className="flex items-center gap-2 font-bold text-slate-800">{p.name}{p.catalog_type === 'package' && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">패키지</span>}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium">{getCategoryLabel(p.category)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{p.price.toLocaleString()}원</td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Pencil size={18} /></button>
                                            <button onClick={() => handleDelete(p.id!)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
