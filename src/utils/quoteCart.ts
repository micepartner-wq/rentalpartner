import type { ProductCatalogType, ProductOptionSelectionMode } from "../api/productApi";

export interface QuoteCartOption {
  name: string;
  quantity: number;
  price: number;
}

export interface QuoteCartBasicComponent {
  name: string;
  quantity: number;
  model_name?: string;
}

export interface QuoteCartItem {
  cart_item_id: string;
  product_id: string;
  product_name: string;
  product_image_url?: string;
  product_catalog_type?: ProductCatalogType;
  start_date?: string;
  end_date?: string;
  expected_people: number;
  product_quantity: number;
  total_price: number;
  selected: boolean;
  option_quantity_managed?: boolean;
  option_selection_mode?: ProductOptionSelectionMode;
  selected_options: QuoteCartOption[];
  basic_components: QuoteCartBasicComponent[];
  created_at: string;
}

const QUOTE_CART_STORAGE_KEY = "hp_quote_cart_v1";

const serializeOptions = (options: QuoteCartOption[]) =>
  JSON.stringify(
    [...options]
      .map((option) => ({
        name: option.name,
        quantity: option.quantity,
        price: option.price,
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.quantity - b.quantity),
  );

const serializeBasicComponents = (components: QuoteCartBasicComponent[]) =>
  JSON.stringify(
    [...components]
      .map((component) => ({
        name: component.name,
        quantity: component.quantity,
        model_name: component.model_name || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.quantity - b.quantity),
  );

const canUseStorage = () => typeof window !== "undefined";

export const getQuoteCartItems = (): QuoteCartItem[] => {
  if (!canUseStorage()) return [];

  const raw = window.localStorage.getItem(QUOTE_CART_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return (parsed as Partial<QuoteCartItem>[]).map((item) => ({
      cart_item_id: item.cart_item_id || `${item.product_id || "item"}-${Date.now()}`,
      product_id: item.product_id || "",
      product_name: item.product_name || "상품",
      product_image_url: item.product_image_url,
      product_catalog_type: item.product_catalog_type,
      start_date: item.start_date,
      end_date: item.end_date,
      expected_people: item.expected_people || 0,
      product_quantity: item.product_quantity || item.expected_people || 1,
      total_price: item.total_price || 0,
      selected: item.selected ?? true,
      option_quantity_managed: item.option_quantity_managed ?? false,
      option_selection_mode: item.option_selection_mode,
      selected_options: item.selected_options || [],
      basic_components: item.basic_components || [],
      created_at: item.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Failed to parse quote cart data", error);
    return [];
  }
};

export const setQuoteCartItems = (items: QuoteCartItem[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(QUOTE_CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("quoteCartUpdated"));
};

export const addQuoteCartItem = (
  item: Omit<QuoteCartItem, "cart_item_id" | "created_at">,
) => {
  const current = getQuoteCartItems();
  const now = new Date().toISOString();

  const existingIndex = current.findIndex(
    (target) =>
      target.product_id === item.product_id &&
      serializeOptions(target.selected_options) === serializeOptions(item.selected_options) &&
      serializeBasicComponents(target.basic_components) === serializeBasicComponents(item.basic_components),
  );

  const nextItem: QuoteCartItem = {
    ...item,
    product_quantity: item.product_quantity || item.expected_people || 1,
    selected: item.selected ?? true,
    option_quantity_managed: item.option_quantity_managed ?? false,
    option_selection_mode: item.option_selection_mode,
    cart_item_id:
      existingIndex >= 0
        ? current[existingIndex].cart_item_id
        : `${item.product_id}-${Date.now()}`,
    created_at: now,
  };

  if (existingIndex >= 0) {
    current[existingIndex] = nextItem;
  } else {
    current.push(nextItem);
  }

  setQuoteCartItems(current);
  return nextItem;
};

export const removeQuoteCartItem = (cartItemId: string) => {
  const filtered = getQuoteCartItems().filter(
    (item) => item.cart_item_id !== cartItemId,
  );
  setQuoteCartItems(filtered);
  return filtered;
};

export const clearQuoteCartItems = () => {
  setQuoteCartItems([]);
};

export const getQuoteCartCount = () => getQuoteCartItems().length;
