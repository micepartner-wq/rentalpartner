const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'ProductDetail.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Rewrite CombinationProductOptionGroups for sequential + auto-add + compact UI
const newComp = `const CombinationProductOptionGroups = ({
  groups,
  selections,
  onSelect,
}: {
  groups: ProductOptionGroup[];
  selections: Record<string, string>;
  onSelect: (groupName: string, valueName: string) => void;
}) => {
  return (
    <div className="space-y-4">
      {groups.map((group, index) => {
        // Show if it's the first group, OR if the previous group is selected
        const previousGroup = index > 0 ? groups[index - 1] : null;
        const isVisible = index === 0 || (previousGroup && selections[previousGroup.name]);
        
        if (!isVisible) return null;

        const selectedValue = selections[group.name] || "";

        return (
          <section key={group.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[15px] font-bold text-slate-900">{group.name}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const active = selectedValue === value.name;

                return (
                  <button
                    key={\`\${group.name}-\${value.name}\`}
                    type="button"
                    onClick={() => onSelect(group.name, value.name)}
                    className={\`rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-all \${
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
    </div>
  );
};`;

content = content.replace(/const CombinationProductOptionGroups = \(\{[\s\S]*?\}\) => \{[\s\S]*?return \([\s\S]*?\n  \);\n\};\n/m, newComp + '\n');

// 2. Update handlers for auto-add
const newHandlers = `
  const handleSelectCombinationOption = (groupName: string, valueName: string) => {
    const nextSelections = { ...productOptionSelections, [groupName]: valueName };
    setProductOptionSelections(nextSelections);

    // Auto add if all groups are selected
    if (productOptionGroups.every(g => nextSelections[g.name])) {
      const id = productOptionGroups.map((g) => nextSelections[g.name]).join(" / ");
      
      setCombinationSets((prev) => {
        const existing = prev.find((s) => s.id === id);
        if (existing) {
          return prev.map((s) => (s.id === id ? { ...s, quantity: s.quantity + 1 } : s));
        }
        return [...prev, { id, selections: nextSelections, quantity: 1, price: 0 }];
      });
      
      // Reset selections to start over
      setTimeout(() => setProductOptionSelections({}), 150);
    }
  };

  const handleUpdateCombinationQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCombinationSets((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    setCombinationSets((prev) => prev.map((s) => (s.id === id ? { ...s, quantity } : s)));
  };

  const handleRemoveCombination = (id: string) => {
    setCombinationSets((prev) => prev.filter((s) => s.id !== id));
  };
`;

// Replace the old handlers
content = content.replace(/const handleAddCombinationSet = \(\) => \{[\s\S]*?const handleRemoveCombination = \(id: string\) => \{[\s\S]*?\}\;\n/m, newHandlers + '\n');

// 3. Update the JSX where CombinationProductOptionGroups is rendered
content = content.replace(
  /<CombinationProductOptionGroups[\s\S]*?\/>/m,
  `<CombinationProductOptionGroups
                      groups={productOptionGroups}
                      selections={productOptionSelections}
                      onSelect={handleSelectCombinationOption}
                    />`
);

// 4. Update Sidebar SummaryRows
const newSummaryRows = `  const summaryRows: SummaryRow[] = [
    ...(isCombinationOptionMode && combinationSets.length > 0 ? [{
      label: "선택 옵션",
      value: (
        <div className="space-y-3 mt-1 w-full">
          {combinationSets.map((set) => (
            <div key={set.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3 relative flex flex-col gap-2 animate-in fade-in duration-200">
              <button onClick={() => handleRemoveCombination(set.id)} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
              <div className="text-[13px] text-slate-700 pr-5 text-left font-medium">
                {Object.values(set.selections).join(" / ")}
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[12px] text-slate-500">수량</span>
                <div className="flex items-center rounded-md border border-slate-200 bg-white">
                  <button onClick={() => handleUpdateCombinationQuantity(set.id, set.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    value={set.quantity}
                    onChange={(e) => handleUpdateCombinationQuantity(set.id, parseInt(e.target.value) || 1)}
                    className="w-10 text-center text-[13px] font-medium border-x border-slate-200 h-7 outline-none appearance-none bg-transparent"
                    min="1"
                  />
                  <button onClick={() => handleUpdateCombinationQuantity(set.id, set.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }] : []),
    ...(!isPackageProduct && requestedQuantity > 0 && !isCombinationOptionMode ? [{ label: product?.name || "상품", value: hasProductOptions ? <span className="text-gray-900">{requestedQuantity}개</span> : !priceDisplayLoading && !isVisiblePriceMode(priceDisplayMode) ? <span className="text-gray-900">{requestedQuantity}개</span> : <span className={getPublicPriceClassName({ mode: priceDisplayMode, loading: priceDisplayLoading, visibleClass: 'text-gray-900', hiddenClass: INQUIRY_PRICE_TEXT_CLASS })}>{mainPriceText}</span> }] : []),
    ...(!isPackageProduct && requestedQuantity > 0 && isCombinationOptionMode ? [{ label: "총 수량", value: <span className="text-gray-900 font-semibold">{requestedQuantity}개</span> }] : []),
  ];`;

content = content.replace(/const summaryRows: SummaryRow\[\] = \([\s\S]*?\];/m, newSummaryRows); // wait, it might be const summaryRows: SummaryRow[] = [ ... ];
content = content.replace(/const summaryRows: SummaryRow\[\] = \[\s*\.\.\.\(isCombinationOptionMode[\s\S]*?\];/m, newSummaryRows);


fs.writeFileSync(file, content, 'utf8');
console.log('Update complete!');
