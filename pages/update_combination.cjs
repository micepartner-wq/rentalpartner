const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'ProductDetail.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add X icon
if (!content.includes('import { X,')) {
    content = content.replace('import { Package, Plus, Minus, Users, ShoppingCart, Loader2, ChevronRight', 'import { Package, Plus, Minus, Users, ShoppingCart, Loader2, ChevronRight, X');
}

// 2. Rewrite CombinationProductOptionGroups
const newComp = `const CombinationProductOptionGroups = ({
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

content = content.replace(/const CombinationProductOptionGroups = \(\{[\s\S]*?\}\) => \([\s\S]*?\n\);\n/, newComp + '\n');

// 3. Add state
if (!content.includes('const [combinationSets, setCombinationSets]')) {
  content = content.replace(
    'const [productOptionSetQuantity, setProductOptionSetQuantity] = useState(1);',
    'const [productOptionSetQuantity, setProductOptionSetQuantity] = useState(1);\n  const [combinationSets, setCombinationSets] = useState<Array<{ id: string; selections: Record<string, string>; quantity: number; price: number }>>([]);'
  );
}

// 4. Update selectedCombinationOptionItems
content = content.replace(
  'const selectedCombinationOptionItems = React.useMemo(() => isCombinationOptionMode ? productOptionGroups.reduce<{ groupName: string; valueName: string }[]>((acc, group) => { const valueName = productOptionSelections[group.name]; if (valueName) acc.push({ groupName: group.name, valueName }); return acc; }, []) : [], [isCombinationOptionMode, productOptionGroups, productOptionSelections]);',
  `const selectedCombinationSummaryItems = React.useMemo(() => {
    if (!isCombinationOptionMode) return [];
    return combinationSets.map(set => ({
      name: \`선택 옵션: \${Object.values(set.selections).join(" / ")}\`,
      qty: set.quantity,
      subtotal: (product?.price || 0) * set.quantity,
      quantityLabel: \`\${set.quantity}개\`
    }));
  }, [isCombinationOptionMode, combinationSets, product?.price]);`
);

// 5. Update selectedSummary
content = content.replace(
  /const selectedSummary = React\.useMemo<SelectedOptionSummary\[\]>\(\(\) => \[\n    \.\.\.selectedProductOptionItems\.map[^\n]+\n/,
  `const selectedSummary = React.useMemo<SelectedOptionSummary[]>(() => [
    ...selectedCombinationSummaryItems,
    ...(!isCombinationOptionMode ? selectedProductOptionItems.map((item) => ({ name: \`\${item.groupName}: \${item.valueName}\`, qty: item.quantity, subtotal: (product?.price || 0) * item.quantity, quantityLabel: String(item.quantity) + "개" })) : []),
`
);

// 6. Update requestedQuantity
content = content.replace(
  `  const requestedQuantity = React.useMemo(() => {
    if (isCombinationOptionMode) return Math.max(productOptionSetQuantity, 1);`,
  `  const requestedQuantity = React.useMemo(() => {
    if (isCombinationOptionMode) return combinationSets.reduce((sum, set) => sum + set.quantity, 0);`
);

// 7. Update summaryRows
content = content.replace(
  `...(isCombinationOptionMode && selectedCombinationOptionItems.length > 0 ? [{ label: "선택 옵션", value: <span className="text-gray-900">{selectedCombinationOptionItems.map((item) => item.valueName).join(" / ")}</span> }] : []),`,
  `...(isCombinationOptionMode && combinationSets.length > 0 ? combinationSets.map((set, idx) => ({ label: idx === 0 ? "선택 옵션" : "", value: <span className="text-gray-900">{Object.values(set.selections).join(" / ")} <span className="text-gray-500 ml-1">({set.quantity}개)</span></span> })) : []),`
);

// 8. Update displaySummaryRows
content = content.replace(
  `const displaySummaryRows = React.useMemo(() => summaryRows.map((row, index) => isCombinationOptionMode && index === 0 ? { ...row, label: "선택 옵션" } : row), [isCombinationOptionMode, summaryRows]);`,
  `const displaySummaryRows = summaryRows;`
);

// 9. Update buildSelectedOptions
content = content.replace(
  `    ...(isCombinationOptionMode ? selectedCombinationOptionItems.map((item) => ({ name: \`\${item.groupName}: \${item.valueName}\`, quantity: 1, price: 0 })) : selectedProductOptionItems.map((item) => ({ name: \`\${item.groupName}: \${item.valueName}\`, quantity: item.quantity, price: 0 }))),`,
  `    ...(isCombinationOptionMode ? combinationSets.map((set) => ({ name: \`[옵션세트] \${Object.values(set.selections).join(" / ")}\`, quantity: set.quantity, price: 0 })) : selectedProductOptionItems.map((item) => ({ name: \`\${item.groupName}: \${item.valueName}\`, quantity: item.quantity, price: 0 }))),`
);

// 10. Update validateProductOptionSelection
content = content.replace(
  `    if (isCombinationOptionMode) {
      if (productOptionGroups.every((group) => Boolean(productOptionSelections[group.name])) && requestedQuantity > 0) return true;
      setBookingModal({ show: true, message: "모든 옵션 그룹에서 값을 하나씩 선택해 주세요.", type: "info" });
      return false;
    }`,
  `    if (isCombinationOptionMode) {
      if (combinationSets.length > 0) return true;
      setBookingModal({ show: true, message: "원하시는 옵션을 선택한 후 '옵션 세트 추가하기' 버튼을 눌러주세요.", type: "info" });
      return false;
    }`
);

// 11. Add handlers for Combination Sets
const handlers = `
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

content = content.replace('const openActionConfirm = (action: \'booking\' | \'cart\') => {', handlers + '\n  const openActionConfirm = (action: \'booking\' | \'cart\') => {');

// 12. Update JSX render
content = content.replace(
  `                  {hasProductOptions && isCombinationOptionMode ? (
                    <CombinationProductOptionGroups
                      groups={productOptionGroups}
                      selections={productOptionSelections}
                      quantity={productOptionSetQuantity}
                      onSelect={(groupName, valueName) => setProductOptionSelections((prev) => ({ ...prev, [groupName]: valueName }))}
                      onQuantityChange={setProductOptionSetQuantity}
                    />`,
  `                  {hasProductOptions && isCombinationOptionMode ? (
                    <CombinationProductOptionGroups
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

fs.writeFileSync(file, content, 'utf8');
console.log('Update complete!');
