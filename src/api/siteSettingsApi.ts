import { supabase } from "../lib/supabase";
import type { BoardPostType } from "./cmsApi";

export interface SiteSetting {
  setting_key: string;
  setting_value: string;
  updated_at?: string;
}

const TABLE_NAME = "site_settings";
export const PRODUCT_PRICE_DISPLAY_MODE_SETTING_KEY = "product_price_display_mode";
export const HOME_FEATURED_CATEGORY_TABS_SETTING_KEY = "home_featured_category_tabs";
export const BOARD_CATEGORY_SETTING_KEYS = {
  notice: "notice_board_categories",
  review: "review_board_categories",
} as const;
export type ProductPriceDisplayMode = "visible" | "inquiry";
export const DEFAULT_PRODUCT_PRICE_DISPLAY_MODE: ProductPriceDisplayMode = "visible";
export type BoardCategoryBoardType = Extract<BoardPostType, "notice" | "review">;

export interface HomeFeaturedCategoryTabSetting {
  menu_id: string;
  display_order: number;
  is_active: boolean;
}

const normalizeBoardCategories = (value?: string | null): string[] => {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];

  return Array.from(
    new Set(
      parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  );
};

export const CS_CENTER_SETTING_KEYS = {
  phone: "cs_center_phone",
  business_hours_text: "cs_center_business_hours_text",
  chat_url: "cs_center_chat_url",
  chat_hours_text: "cs_center_chat_hours_text",
} as const;

export interface CSCenterSettings {
  phone: string;
  business_hours_text: string;
  chat_url: string;
  chat_hours_text: string;
}

export const DEFAULT_CS_CENTER_SETTINGS: CSCenterSettings = {
  phone: "1800-1985",
  business_hours_text: "고객행복센터(전화): 오전 9시 ~ 오후 6시 운영",
  chat_url: "https://pf.kakao.com/_iRxghX/chat",
  chat_hours_text: "채팅 상담 문의: 24시간 운영",
};

const parseJsonValue = (value?: string | null): unknown => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeHomeFeaturedCategoryTabs = (
  value?: string | null,
): HomeFeaturedCategoryTabSetting[] => {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .reduce<HomeFeaturedCategoryTabSetting[]>((acc, item) => {
      if (!item || typeof item !== "object") return acc;

      const menuId =
        "menu_id" in item && typeof item.menu_id === "string"
          ? item.menu_id.trim()
          : "";
      const displayOrder =
        "display_order" in item && typeof item.display_order === "number"
          ? item.display_order
          : acc.length + 1;
      const isActive =
        "is_active" in item ? item.is_active !== false : true;

      if (!menuId) return acc;

      acc.push({
        menu_id: menuId,
        display_order: displayOrder,
        is_active: isActive,
      });

      return acc;
    }, [])
    .sort((a, b) => a.display_order - b.display_order);
};

export const getSiteSettings = async (
  keys?: string[],
): Promise<Record<string, string>> => {
  let query = supabase.from(TABLE_NAME).select("setting_key, setting_value");
  if (keys && keys.length > 0) {
    query = query.in("setting_key", keys);
  }

  const { data, error } = await query;
  if (error) throw error;

  const records = data || [];
  return records.reduce<Record<string, string>>((acc, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {});
};

export const upsertSiteSettings = async (
  settings: Record<string, string>,
): Promise<void> => {
  const payload = Object.entries(settings).map(([setting_key, setting_value]) => ({
    setting_key,
    setting_value,
  }));

  if (payload.length === 0) return;

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: "setting_key" });

  if (error) throw error;
};

export const normalizeProductPriceDisplayMode = (
  value?: string | null,
): ProductPriceDisplayMode => (value === "inquiry" ? "inquiry" : "visible");

export const getProductPriceDisplayMode = async (): Promise<ProductPriceDisplayMode> => {
  const settings = await getSiteSettings([PRODUCT_PRICE_DISPLAY_MODE_SETTING_KEY]);
  return normalizeProductPriceDisplayMode(
    settings[PRODUCT_PRICE_DISPLAY_MODE_SETTING_KEY],
  );
};

export const upsertProductPriceDisplayMode = async (
  mode: ProductPriceDisplayMode,
): Promise<void> => {
  await upsertSiteSettings({
    [PRODUCT_PRICE_DISPLAY_MODE_SETTING_KEY]: mode,
  });
};

export const getHomeFeaturedCategoryTabs = async (): Promise<
  HomeFeaturedCategoryTabSetting[]
> => {
  const settings = await getSiteSettings([HOME_FEATURED_CATEGORY_TABS_SETTING_KEY]);
  return normalizeHomeFeaturedCategoryTabs(
    settings[HOME_FEATURED_CATEGORY_TABS_SETTING_KEY],
  );
};

export const upsertHomeFeaturedCategoryTabs = async (
  tabs: HomeFeaturedCategoryTabSetting[],
): Promise<void> => {
  const normalized = tabs
    .filter((tab) => typeof tab.menu_id === "string" && tab.menu_id.trim())
    .map((tab, index) => ({
      menu_id: tab.menu_id.trim(),
      display_order:
        typeof tab.display_order === "number" ? tab.display_order : index + 1,
      is_active: tab.is_active !== false,
    }))
    .sort((a, b) => a.display_order - b.display_order)
    .map((tab, index) => ({
      ...tab,
      display_order: index + 1,
    }));

  await upsertSiteSettings({
    [HOME_FEATURED_CATEGORY_TABS_SETTING_KEY]: JSON.stringify(normalized),
  });
};

export const getBoardCategories = async (
  boardType: BoardCategoryBoardType,
): Promise<string[]> => {
  const settingKey = BOARD_CATEGORY_SETTING_KEYS[boardType];
  const settings = await getSiteSettings([settingKey]);
  return normalizeBoardCategories(settings[settingKey]);
};

export const upsertBoardCategories = async (
  boardType: BoardCategoryBoardType,
  categories: string[],
): Promise<void> => {
  const settingKey = BOARD_CATEGORY_SETTING_KEYS[boardType];
  const normalized = Array.from(
    new Set(
      categories
        .map((category) => category.trim())
        .filter(Boolean),
    ),
  );

  await upsertSiteSettings({
    [settingKey]: JSON.stringify(normalized),
  });
};

export const getCSCenterSettings = async (): Promise<CSCenterSettings> => {
  const settings = await getSiteSettings(Object.values(CS_CENTER_SETTING_KEYS));
  return {
    phone: settings[CS_CENTER_SETTING_KEYS.phone] || DEFAULT_CS_CENTER_SETTINGS.phone,
    business_hours_text:
      settings[CS_CENTER_SETTING_KEYS.business_hours_text] ||
      DEFAULT_CS_CENTER_SETTINGS.business_hours_text,
    chat_url:
      settings[CS_CENTER_SETTING_KEYS.chat_url] || DEFAULT_CS_CENTER_SETTINGS.chat_url,
    chat_hours_text:
      settings[CS_CENTER_SETTING_KEYS.chat_hours_text] ||
      DEFAULT_CS_CENTER_SETTINGS.chat_hours_text,
  };
};

export const upsertCSCenterSettings = async (
  settings: Partial<CSCenterSettings>,
): Promise<void> => {
  const payload: Record<string, string> = {};

  if (typeof settings.phone === "string") {
    payload[CS_CENTER_SETTING_KEYS.phone] = settings.phone;
  }
  if (typeof settings.business_hours_text === "string") {
    payload[CS_CENTER_SETTING_KEYS.business_hours_text] = settings.business_hours_text;
  }
  if (typeof settings.chat_url === "string") {
    payload[CS_CENTER_SETTING_KEYS.chat_url] = settings.chat_url;
  }
  if (typeof settings.chat_hours_text === "string") {
    payload[CS_CENTER_SETTING_KEYS.chat_hours_text] = settings.chat_hours_text;
  }

  await upsertSiteSettings(payload);
};
