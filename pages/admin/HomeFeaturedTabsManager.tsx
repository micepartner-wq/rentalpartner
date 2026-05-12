import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Search,
  Save,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import { getAllNavMenuItems, type NavMenuItem } from "../../src/api/cmsApi";
import {
  getHomeFeaturedCategoryTabs,
  type HomeFeaturedCategoryTabSetting,
  upsertHomeFeaturedCategoryTabs,
} from "../../src/api/siteSettingsApi";

type SelectedTabItem = HomeFeaturedCategoryTabSetting;

const normalizeId = (value?: string | null) => (value || "").trim();

const isParentMenu = (item: NavMenuItem) => !normalizeId(item.category);

const serializeItems = (items: SelectedTabItem[]) =>
  JSON.stringify(
    items.map((item, index) => ({
      menu_id: item.menu_id,
      is_active: item.is_active,
      display_order: index + 1,
    })),
  );

export const HomeFeaturedTabsManager = () => {
  const [navItems, setNavItems] = useState<NavMenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedTabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("[]");

  const loadData = async () => {
    setLoading(true);
    try {
      const [menus, settings] = await Promise.all([
        getAllNavMenuItems(),
        getHomeFeaturedCategoryTabs(),
      ]);

      const parentMenus = menus.filter(isParentMenu);
      const nextSelected = settings
        .map((item, index) => ({
          menu_id: normalizeId(item.menu_id),
          is_active: item.is_active !== false,
          display_order: index + 1,
        }))
        .filter((item) => item.menu_id);

      setNavItems(parentMenus);
      setSelectedItems(nextSelected);
      setSavedSnapshot(serializeItems(nextSelected));
    } catch (error) {
      console.error("Failed to load home featured tabs:", error);
      alert("홈 추천 탭 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const menuById = useMemo(() => {
    return navItems.reduce<Record<string, NavMenuItem>>((acc, item) => {
      if (item.id) {
        acc[item.id] = item;
      }
      return acc;
    }, {});
  }, [navItems]);

  const selectedMenuIds = useMemo(
    () => new Set(selectedItems.map((item) => item.menu_id)),
    [selectedItems],
  );

  const availableMenus = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return navItems.filter((item) => {
      if (!item.id || selectedMenuIds.has(item.id)) return false;
      if (!normalizedSearch) return true;

      return (
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.link.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [navItems, searchTerm, selectedMenuIds]);

  const selectedRows = useMemo(() => {
    return selectedItems
      .map((item, index) => ({
        ...item,
        display_order: index + 1,
        menu: menuById[item.menu_id] || null,
      }))
      .filter((item) => item.menu || item.menu_id);
  }, [menuById, selectedItems]);

  const hasChanges = useMemo(
    () => serializeItems(selectedItems) !== savedSnapshot,
    [savedSnapshot, selectedItems],
  );

  const addMenu = (menuId: string) => {
    if (!menuId) return;
    if (selectedMenuIds.has(menuId)) return;

    setSelectedItems((prev) => [
      ...prev,
      { menu_id: menuId, is_active: true, display_order: prev.length + 1 },
    ]);
  };

  const removeMenu = (menuId: string) => {
    setSelectedItems((prev) =>
      prev
        .filter((item) => item.menu_id !== menuId)
        .map((item, index) => ({ ...item, display_order: index + 1 })),
    );
  };

  const moveMenu = (menuId: string, direction: "up" | "down") => {
    setSelectedItems((prev) => {
      const index = prev.findIndex((item) => item.menu_id === menuId);
      if (index < 0) return prev;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((item, idx) => ({ ...item, display_order: idx + 1 }));
    });
  };

  const toggleActive = (menuId: string) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.menu_id === menuId ? { ...item, is_active: !item.is_active } : item,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedItems = selectedItems.map((item, index) => ({
        menu_id: item.menu_id,
        is_active: item.is_active,
        display_order: index + 1,
      }));

      await upsertHomeFeaturedCategoryTabs(normalizedItems);
      setSelectedItems(normalizedItems);
      setSavedSnapshot(serializeItems(normalizedItems));
      alert("홈 추천 탭 설정이 저장되었습니다.");
    } catch (error) {
      console.error("Failed to save home featured tabs:", error);
      alert("홈 추천 탭 설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutGrid size={24} className="text-[#001E45]" />
            홈 추천 탭 관리
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            메인페이지의 추천 카테고리 탭으로 노출할 1차 메뉴를 직접 선택하고 순서를 조정합니다.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#001E45] text-white text-sm font-bold hover:bg-[#002D66] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          저장
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">선택 가능한 1차 메뉴</h2>
                <p className="text-sm text-slate-500 mt-1">
                  `nav_menu_items`에서 category가 비어 있는 항목만 표시됩니다.
                </p>
              </div>
              <div className="text-sm font-medium text-slate-500">
                {availableMenus.length}개
              </div>
            </div>

            <div className="relative mt-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="메뉴명 또는 링크로 검색"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001E45] bg-white"
              />
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            {availableMenus.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                선택할 수 있는 1차 메뉴가 없습니다.
              </div>
            ) : (
              availableMenus.map((menu) => (
                <div
                  key={menu.id}
                  className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-[#001E45]/30 hover:shadow-sm transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800 truncate">{menu.name}</h3>
                      {!menu.is_active && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          비활성 메뉴
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-1">{menu.link}</p>
                  </div>

                  <button
                    onClick={() => addMenu(menu.id!)}
                    className="inline-flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl bg-[#001E45] text-white text-sm font-medium hover:bg-[#002D66] transition-colors"
                  >
                    <Plus size={16} />
                    추가
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">메인 페이지 노출 탭</h2>
                <p className="text-sm text-slate-500 mt-1">
                  순서, 활성화 여부, 삭제를 여기서 관리합니다.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                <ShieldCheck size={16} className="text-emerald-500" />
                {selectedRows.length}개 선택됨
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            {selectedRows.length === 0 ? (
              <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                아직 선택된 탭이 없습니다.
              </div>
            ) : (
              selectedRows.map((item, index) => {
                const menu = item.menu;
                return (
                  <div
                    key={item.menu_id}
                    className={`border rounded-2xl p-4 transition-all ${
                      item.is_active
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-50 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#001E45]/10 text-[#001E45] text-xs font-bold">
                            {index + 1}
                          </span>
                          <h3 className="font-semibold text-slate-800 truncate">
                            {menu?.name || "삭제된 메뉴"}
                          </h3>
                          {menu && !menu.is_active && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                              원본 메뉴 비활성
                            </span>
                          )}
                          {!menu && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
                              메뉴 없음
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1 truncate">
                          {menu?.link || item.menu_id}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleActive(item.menu_id)}
                          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                          title={item.is_active ? "비활성화" : "활성화"}
                        >
                          {item.is_active ? (
                            <ToggleRight size={22} className="text-emerald-500" />
                          ) : (
                            <ToggleLeft size={22} />
                          )}
                        </button>
                        <button
                          onClick={() => moveMenu(item.menu_id, "up")}
                          disabled={index === 0}
                          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="위로 이동"
                        >
                          <ArrowUp size={18} />
                        </button>
                        <button
                          onClick={() => moveMenu(item.menu_id, "down")}
                          disabled={index === selectedRows.length - 1}
                          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="아래로 이동"
                        >
                          <ArrowDown size={18} />
                        </button>
                        <button
                          onClick={() => removeMenu(item.menu_id)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                          title="삭제"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
