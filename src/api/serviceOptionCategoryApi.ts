import { supabase } from '../lib/supabase';

export interface ServiceOptionCategory {
    id?: string;
    name: string;
    display_order: number;
    created_at?: string;
}

const TABLE_NAME = 'service_option_categories';

const normalizeCategoryName = (name?: string | null) => (name || '').trim();

export const isMissingServiceOptionCategoryTableError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code ?? '')
        : '';

    return code === '42P01'
        || code === 'PGRST205'
        || message.includes(TABLE_NAME);
};

export const getServiceOptionCategories = async (): Promise<ServiceOptionCategory[]> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const addServiceOptionCategory = async (
    category: Omit<ServiceOptionCategory, 'id' | 'created_at'>,
): Promise<ServiceOptionCategory> => {
    const payload = {
        ...category,
        name: normalizeCategoryName(category.name),
    };

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateServiceOptionCategory = async (
    id: string,
    updates: Partial<ServiceOptionCategory>,
): Promise<ServiceOptionCategory> => {
    const payload = {
        ...updates,
        ...(typeof updates.name === 'string'
            ? { name: normalizeCategoryName(updates.name) }
            : {}),
    };

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteServiceOptionCategory = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const syncServiceOptionCategories = async (categoryNames: string[]): Promise<void> => {
    const normalizedNames = Array.from(
        new Set(
            categoryNames
                .map((name) => normalizeCategoryName(name))
                .filter(Boolean),
        ),
    );

    if (normalizedNames.length === 0) return;

    const existingCategories = await getServiceOptionCategories();
    const existingNames = new Set(
        existingCategories.map((category) => normalizeCategoryName(category.name)),
    );
    const nextDisplayOrder = existingCategories.length > 0
        ? Math.max(...existingCategories.map((category) => category.display_order || 0)) + 1
        : 1;

    const missingCategories = normalizedNames
        .filter((name) => !existingNames.has(name))
        .map((name, index) => ({
            name,
            display_order: nextDisplayOrder + index,
        }));

    if (missingCategories.length === 0) return;

    const { error } = await supabase
        .from(TABLE_NAME)
        .insert(missingCategories);

    if (error) throw error;
};

export const normalizeServiceOptionCategoryName = normalizeCategoryName;
