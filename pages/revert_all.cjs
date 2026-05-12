const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'ProductDetail.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Revert CombinationProductOptionGroups to Turn 9 (with Add button)
const turn9Comp = `const CombinationProductOptionGroups = ({
  groups,
  selections,
  quantity,
  combinationSets,
  onSelect,
  onQuantityChange,
  onAddCombination,
  onUpdateCombinationQuantity,
  onRemoveCombination,
}: {
  groups: ProductOptionGroup[];
  selections: Record<string, string>;
  quantity: number;
  combinationSets: Array<{ id: string; selections: Record<string, string>; quantity: number }>;
  onSelect: (groupName: string, valueName: string) => void;
  onQuantityChange: (nextQuantity: number) => void;
  onAddCombination: () => void;
  onUpdateCombinationQuantity: (id: string, quantity: number) => void;
  onRemoveCombination: (id: string) => void;
}) => {
  const isComplete = groups.length > 0 && groups.every((g) => Boolean(selections[g.name]));

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const selectedValue = selections[group.name] || "";

        return (
          <section key={group.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
                <p className="mt-1 text-sm text-slate-500">각 그룹에서 옵션값을 하나씩 골라 한 세트로 담습니다.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                단일 선택
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {group.values.map((value) => {
                const active = selectedValue === value.name;

                return (
                  <button
                    key={\`\${group.name}-\${value.name}\`}
                    type="button"
                    onClick={() => onSelect(group.name, value.name)}
                    className={\`rounded-xl border px-4 py-3 text-sm font-semibold transition-all \${
                      active
                        ? "border-[#001E45] bg-[#001E45] text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                    }\`}
                  >
                    {value.name}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">세트 수량</h3>
            <p className="mt-1 text-sm text-slate-500">조합한 옵션을 몇 세트 담을지 선택하세요.</p>
          </div>
          <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              className="flex h-full w-11 items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <Minus size={16} />
            </button>
            <span className="w-12 border-x border-slate-200 text-center text-sm font-semibold text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantityChange(quantity + 1)}
              className="flex h-full w-11 items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddCombination}
          disabled={!isComplete}
          className="w-full rounded-xl bg-slate-800 py-3.5 text-[15px] font-bold text-white transition-all disabled:bg-slate-300 disabled:text-slate-500 hover:bg-slate-900"
        >
          선택한 옵션 세트 추가하기
        </button>
      </section>

      {combinationSets.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-inner">
          <h3 className="mb-4 text-[15px] font-bold text-slate-900">추가된 옵션 세트 ({combinationSets.length})</h3>
          <div className="space-y-3">
            {combinationSets.map((set) => (
              <div key={set.id} className="relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => onRemoveCombination(set.id)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
                <div className="pr-8">
                  {Object.entries(set.selections).map(([key, val]) => (
                    <div key={key} className="text-[13px] text-slate-600">
                      <span className="font-medium">{key}:</span> <span className="font-semibold text-slate-900">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[13px] font-semibold text-slate-600">수량</span>
                  <div className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => onUpdateCombinationQuantity(set.id, Math.max(1, set.quantity - 1))}
                      className="flex h-full w-8 items-center justify-center text-slate-600 hover:bg-slate-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 border-x border-slate-200 text-center text-[13px] font-semibold text-slate-900">
                      {set.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateCombinationQuantity(set.id, set.quantity + 1)}
                      className="flex h-full w-8 items-center justify-center text-slate-600 hover:bg-slate-50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};`;

content = content.replace(/const CombinationProductOptionGroups = \(\{[\s\S]*?\}\) => \{[\s\S]*?return \([\s\S]*?\n  \);\n\};\n/m, turn9Comp + '\n');

// 2. Revert handleSelectCombinationOption to Turn 9 (manual add)
const turn9Handlers = `
  const handleAddCombinationSet = () => {
    if (!productOptionGroups.every((group) => Boolean(productOptionSelections[group.name]))) {
      setBookingModal({ show: true, message: "모든 옵션을 선택해 주세요.", type: "info" });
      return;
    }
    const id = productOptionGroups.map((g) => productOptionSelections[g.name]).join(" / ");
    
    setCombinationSets((prev) => {
      const existing = prev.find((s) => s.id === id);
      if (existing) {
        return prev.map((s) => (s.id === id ? { ...s, quantity: s.quantity + productOptionSetQuantity } : s));
      }
      return [...prev, { id, selections: productOptionSelections, quantity: productOptionSetQuantity, price: 0 }];
    });
    
    setProductOptionSelections({});
    setProductOptionSetQuantity(1);
  };

  const handleUpdateCombinationQuantity = (id: string, quantity: number) => {
    setCombinationSets((prev) => prev.map((s) => (s.id === id ? { ...s, quantity } : s)));
  };

  const handleRemoveCombination = (id: string) => {
    setCombinationSets((prev) => prev.filter((s) => s.id !== id));
  };
`;

content = content.replace(/const handleSelectCombinationOption = \([\s\S]*?const handleRemoveCombination = \(id: string\) => \{[\s\S]*?\}\;\n/m, turn9Handlers + '\n');

// 3. Update the JSX where CombinationProductOptionGroups is rendered
content = content.replace(
  /<CombinationProductOptionGroups[\s\S]*?\/>/m,
  `<CombinationProductOptionGroups
                      groups={productOptionGroups}
                      selections={productOptionSelections}
                      quantity={productOptionSetQuantity}
                      combinationSets={combinationSets}
                      onSelect={(groupName, valueName) => setProductOptionSelections((prev) => ({ ...prev, [groupName]: valueName }))}
                      onQuantityChange={setProductOptionSetQuantity}
                      onAddCombination={handleAddCombinationSet}
                      onUpdateCombinationQuantity={handleUpdateCombinationQuantity}
                      onRemoveCombination={handleRemoveCombination}
                    />`
);

// 4. Revert Sidebar SummaryRows to Turn 9 (simple text)
const turn9SummaryRows = `  const summaryRows: SummaryRow[] = [
    ...(isCombinationOptionMode && combinationSets.length > 0 ? combinationSets.map((set, idx) => ({ label: idx === 0 ? "선택 옵션" : "", value: <span className="text-gray-900">{Object.values(set.selections).join(" / ")} <span className="text-gray-500 ml-1">({set.quantity}개)</span></span> })) : []),
    ...(!isPackageProduct && requestedQuantity > 0 && !isCombinationOptionMode ? [{ label: product?.name || "상품", value: hasProductOptions ? <span className="text-gray-900">{requestedQuantity}개</span> : !priceDisplayLoading && !isVisiblePriceMode(priceDisplayMode) ? <span className="text-gray-900">{requestedQuantity}개</span> : <span className={getPublicPriceClassName({ mode: priceDisplayMode, loading: priceDisplayLoading, visibleClass: 'text-gray-900', hiddenClass: INQUIRY_PRICE_TEXT_CLASS })}>{mainPriceText}</span> }] : []),
    ...(!isPackageProduct && requestedQuantity > 0 && isCombinationOptionMode ? [{ label: "총 수량", value: <span className="text-gray-900 font-semibold">{requestedQuantity}개</span> }] : []),
  ];`;

content = content.replace(/const summaryRows: SummaryRow\[\] = \[\s*\.\.\.\(isCombinationOptionMode[\s\S]*?\];/m, turn9SummaryRows);

fs.writeFileSync(file, content, 'utf8');
console.log('Revert complete!');
