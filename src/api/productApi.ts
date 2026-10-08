import { supabase } from '../lib/supabase';

export type ProductCatalogType = 'general' | 'package';

export interface ProductOptionValue {
    name: string;
}

export type ProductOptionSelectionMode = 'independent' | 'combination';

export interface ProductOptionGroup {
    name: string;
    values: ProductOptionValue[];
    selection_mode?: ProductOptionSelectionMode;
}

export interface Product {
    id?: string;
    name: string;
    category?: string;
    category_id?: string | null;
    _parent_category?: string;
    price: number;
    description?: string;
    short_description?: string;
    image_url?: string;
    stock: number;
    discount_rate?: number;
    created_at?: string;
    catalog_type?: ProductCatalogType;
    product_code?: string;
    product_type?: 'basic' | 'essential' | 'additional' | 'cooperative' | 'place' | 'food';
    basic_components?: { name: string; model_name?: string; quantity: number; image_url?: string }[];
    additional_components?: { name: string; model_name?: string; price: number; _category?: string }[];
    cooperative_components?: { name: string; model_name?: string; price: number; _category?: string }[];
    place_components?: { name: string; price: number }[];
    food_components?: { name: string; price: number }[];
    product_options?: ProductOptionGroup[];
}

interface ProductQueryOptions {
    catalogType?: ProductCatalogType | 'all';
}

export const isBasicProduct = (product: Product) =>
    product.product_type === 'basic' || !product.product_type;

export const isGeneralBasicProduct = (product: Product) =>
    (product.catalog_type || 'general') === 'general' && isBasicProduct(product);

export const isAdditionalOptionPoolProduct = (product: Product) =>
    isGeneralBasicProduct(product);

const isMissingCatalogTypeError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('catalog_type');
};

const isMissingProductOptionsError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('product_options');
};

// Supabase 쿼리 빌더의 제네릭을 그대로 받으면 타입 추론이 무한히 깊어져(TS2589) 최소한의 모양만 선언한다.
interface CatalogFilterable {
    eq: (column: string, value: string) => any;
    or: (filters: string) => any;
}

const applyCatalogFilter = (query: CatalogFilterable, catalogType?: ProductCatalogType | 'all'): any => {
    if (!catalogType || catalogType === 'all') {
        return query;
    }

    if (catalogType === 'package') {
        return query.eq('catalog_type', 'package');
    }

    return query.or('catalog_type.eq.general,catalog_type.is.null');
};

// 쿼리 빌더 타입을 한 곳에서만 좁혀 두면 호출부마다 깊은 제네릭 추론이 일어나지 않는다.
const selectProducts = () => supabase.from('products').select('*') as unknown as CatalogFilterable;

// 癲ル슢?꾤땟??????ㅺ강? ?釉뚰???
export const getProducts = async (options: ProductQueryOptions = {}): Promise<Product[]> => {
    try {
        const query = applyCatalogFilter(
            selectProducts(),
            options.catalogType
        );

        const { data, error } = await query
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {

        const { data, error: fallbackError } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        return options.catalogType === 'package' ? [] : (data || []);
    }
};

// ?怨멸텭??沃섅뀙??關履????????ㅺ강? ?釉뚰???
export const getProductsByCategory = async (category: string, options: ProductQueryOptions = {}): Promise<Product[]> => {
    try {
        const query = applyCatalogFilter(selectProducts(), options.catalogType);

        if (category && category !== 'all') {
            query.eq('category', category);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (error) {

        const fallbackQuery = supabase.from('products').select('*');
        if (category && category !== 'all') {
            fallbackQuery.eq('category', category);
        }

        const { data, error: fallbackError } = await fallbackQuery.order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        return options.catalogType === 'package' ? [] : (data || []);
    }
};

// ??????ヂ????ㅺ강? ?釉뚰???(basic, essential, additional, cooperative, place, food)
export const getProductsByType = async (type: string, options: ProductQueryOptions = {}): Promise<Product[]> => {
    try {
        let query = applyCatalogFilter(selectProducts(), options.catalogType);
        
        if (type === 'additional' || type === 'essential') {
            // 'essential'?? 'additional'?? '??醫딅떁?????⑥?????? ???굿??            query = query.in('product_type', ['essential', 'additional']);
        } else {
            query = query.eq('product_type', type);
        }

        const { data, error } = await query.order('name', { ascending: true }); // Alphabetical order for options
        if (error) throw error;
        return data || [];
    } catch (error) {
        if (!isMissingCatalogTypeError(error)) throw error;

        let fallbackQuery = supabase.from('products').select('*');
        if (type === 'additional' || type === 'essential') {
            fallbackQuery = fallbackQuery.in('product_type', ['essential', 'additional']);
        } else {
            fallbackQuery = fallbackQuery.eq('product_type', type);
        }

        const { data, error: fallbackError } = await fallbackQuery.order('name', { ascending: true });
        if (fallbackError) throw fallbackError;
        return options.catalogType === 'package' ? [] : (data || []);
    }
};

export const getAdditionalOptionProducts = async (): Promise<Product[]> => {
    const products = await getProducts({ catalogType: 'all' });
    return products.filter(isAdditionalOptionPoolProduct);
};

const SYNONYMS: Record<string, string[]> = {
    'notebook': ['노트북', '랩탑', 'laptop'],
    '노트북': ['notebook', '랩탑', 'laptop'],
    'pc': ['데스크탑', '컴퓨터', 'desktop', 'computer'],
    '컴퓨터': ['pc', '데스크탑', 'desktop', 'computer'],
    '데스크탑': ['pc', '컴퓨터', 'desktop', 'computer'],
    'tv': ['티비', '텔레비전', 'television'],
    '티비': ['tv', '텔레비전', 'television'],
    'monitor': ['모니터'],
    '모니터': ['monitor'],
    '의자': ['chair', '체어'],
    '테이블': ['table', '책상', 'desk'],
    '책상': ['테이블', 'table', 'desk'],
    '빔프로젝터': ['프로젝터', 'projector', '빔'],
    '프로젝터': ['빔프로젝터', 'projector', '빔'],
};

// ???ㅺ강? ?濡ろ떟???API
export const searchProducts = async (keyword: string): Promise<Product[]> => {
    if (!keyword) return [];

    try {
        const query = applyCatalogFilter(
            selectProducts(),
            'all'
        );

        const lowerKeyword = keyword.toLowerCase();
        const searchTerms = [lowerKeyword, ...(SYNONYMS[lowerKeyword] || [])];
        
        const orConditions = searchTerms.flatMap(term => [
            `name.ilike.%${term}%`,
            `description.ilike.%${term}%`,
            `short_description.ilike.%${term}%`,
            `category.ilike.%${term}%`
        ]).join(',');

        const { data, error } = await query
            .or(orConditions)
            .eq('product_type', 'basic')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        if (!isMissingCatalogTypeError(error)) throw error;

        const lowerKeyword = keyword.toLowerCase();
        const searchTerms = [lowerKeyword, ...(SYNONYMS[lowerKeyword] || [])];
        
        const orConditions = searchTerms.flatMap(term => [
            `name.ilike.%${term}%`,
            `description.ilike.%${term}%`,
            `short_description.ilike.%${term}%`,
            `category.ilike.%${term}%`
        ]).join(',');

        const { data, error: fallbackError } = await supabase
            .from('products')
            .select('*')
            .or(orConditions)
            .eq('product_type', 'basic')
            .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        return data || [];
    }
};

// ???쒒????ㅺ강? ?釉뚰???
export const getProductById = async (id: string): Promise<Product | null> => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

// ???ㅺ강? ??⑤베堉?
// ???ㅺ강? ??⑤베堉?
export const addProduct = async (product: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const userData = { ...product };

    // ???ㅺ강? ?類???????筌???獄쏅똻???棺??짆?먰맪???癰귙끋源?
    // if (!userData.product_code) ...


    try {
        const { data, error } = await supabase
            .from('products')
            .insert([userData])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        if (isMissingProductOptionsError(error)) {
            if (Array.isArray(userData.product_options) && userData.product_options.length > 0) {
                throw new Error('상품 옵션 기능을 사용하려면 add_product_options_column.sql 을 먼저 실행해주세요.');
            }
        }
        if (!isMissingCatalogTypeError(error)) throw error;
        if (userData.catalog_type === 'package') {
            throw new Error('????類잛땡?堉온 ???ㅺ강? ??れ삀?????????嚥?議롳┼?add_product_catalog_type.sql ???沃섅굥?? ????덈틖???⑥궢猷?嶺뚮ㅎ???');
        }

        const { catalog_type, product_options, ...legacyProduct } = userData;
        const { data, error: fallbackError } = await supabase
            .from('products')
            .insert([legacyProduct])
            .select()
            .single();

        if (fallbackError) throw fallbackError;
        return data;
    }
};

// ???ㅺ강? ???쒓낯??
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
    try {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        if (isMissingProductOptionsError(error)) {
            if (Array.isArray(updates.product_options) && updates.product_options.length > 0) {
                throw new Error('상품 옵션 기능을 사용하려면 add_product_options_column.sql 을 먼저 실행해주세요.');
            }
        }
        if (!isMissingCatalogTypeError(error)) throw error;
        if (updates.catalog_type === 'package') {
            throw new Error('????類잛땡?堉온 ???ㅺ강? ??れ삀?????????嚥?議롳┼?add_product_catalog_type.sql ???沃섅굥?? ????덈틖???⑥궢猷?嶺뚮ㅎ???');
        }

        const { catalog_type, product_options, ...legacyUpdates } = updates;
        const { data, error: fallbackError } = await supabase
            .from('products')
            .update(legacyUpdates)
            .eq('id', id)
            .select()
            .single();

        if (fallbackError) throw fallbackError;
        return data;
    }
};

// ???ㅺ강? ????
export const deleteProduct = async (id: string): Promise<void> => {
    // ???ㅺ강?-?????????ㅼ뒦?????굿???沃섅굥?? ????
    await supabase.from('product_sections').delete().eq('product_id', id);
    // ???怨좊뭿 ???⑤９肉?????(FK ??筌???釉뚰???쨨?????됰쐳)
    await supabase.from('bookings').delete().eq('product_id', id);

    // ??熬곣뫖?????ㅺ강? ????
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ???ㅺ강? ?類????臾믩퓠??釉뚰???
export const getProductByCode = async (code: string): Promise<Product | null> => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_code', code)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data;
};
