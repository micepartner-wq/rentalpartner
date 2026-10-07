import { supabase } from "../lib/supabase";

export interface Category {
  id?: string;
  name: string;
  slug?: string | null;
  display_order: number;
  parent_id?: string | null;
  level?: number;
  created_at?: string;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}

export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("level", { ascending: true })
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getCategoriesByLevel = async (level: number): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("level", level)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getCategoriesByParent = async (parentId: string | null): Promise<Category[]> => {
  let query = supabase.from("categories").select("*");

  if (parentId === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data, error } = await query.order("display_order", { ascending: true });
  if (error) throw error;
  return data || [];
};

export const buildCategoryTree = (categories: Category[]): CategoryTree[] => {
  const map = new Map<string, CategoryTree>();
  const roots: CategoryTree[] = [];

  categories.forEach((category) => {
    if (category.id) {
      map.set(category.id, { ...category, children: [] });
    }
  });

  categories.forEach((category) => {
    const node = category.id ? map.get(category.id) : undefined;
    if (!node) return;

    if (category.parent_id && map.has(category.parent_id)) {
      const parent = map.get(category.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

export const addCategory = async (
  category: Omit<Category, "id" | "created_at">,
): Promise<Category> => {
  const { data, error } = await supabase
    .from("categories")
    .insert([category])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category> => {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", id);

  if (children && children.length > 0) {
    throw new Error("하위 카테고리가 있는 경우 삭제할 수 없습니다.");
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) throw error;
};
