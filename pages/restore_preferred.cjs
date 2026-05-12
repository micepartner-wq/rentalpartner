const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'ProductDetail.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Restore combinationSets state
if (!content.includes('const [combinationSets, setCombinationSets]')) {
  content = content.replace(
    'const [productOptionSetQuantity, setProductOptionSetQuantity] = useState(1);',
    'const [productOptionSetQuantity, setProductOptionSetQuantity] = useState(1);\n  const [combinationSets, setCombinationSets] = useState<Array<{ id: string; selections: Record<string, string>; quantity: number; price: number }>>([]);'
  );
}

// 2. Restore CombinationProductOptionGroups (Sequential + Auto-add)
const sequentialComp = `const CombinationProductOptionGroups = ({
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

content = content.replace(/const CombinationProductOptionGroups = \(\{[\s\S]*?\}\) => \([\s\S]*?\n\);/m, sequentialComp);

// 3. Restore handlers
const handlers = `
  const handleSelectCombinationOption = (groupName: string, valueName: string) => {
    const nextSelections = { ...productOptionSelections, [groupName]: valueName };
    setProductOptionSelections(nextSelections);

    if (productOptionGroups.every(g => nextSelections[g.name])) {
      const id = productOptionGroups.map((g) => nextSelections[g.name]).join(" / ");
      
      setCombinationSets((prev) => {
        const existing = prev.find((s) => s.id === id);
        if (existing) {
          return prev.map((s) => (s.id === id ? { ...s, quantity: s.quantity + 1 } : s));
        }
        return [...prev, { id, selections: nextSelections, quantity: 1, price: 0 }];
      });
      
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

if (!content.includes('const handleSelectCombinationOption')) {
    content = content.replace('const openActionConfirm = (action: \'booking\' | \'cart\') => {', handlers + '\n  const openActionConfirm = (action: \'booking\' | \'cart\') => {');
}

// 4. Update Sidebar SummaryRows to the user's preferred format (Turn 1 style for each set)
const preferredSummaryRows = `  const summaryRows: SummaryRow[] = [
    ...(isCombinationOptionMode && combinationSets.length > 0 ? combinationSets.flatMap((set) => ([
      { label: "선택 옵션", value: <span className="text-gray-900 font-bold">{Object.values(set.selections).join(" / ")}</span> },
      { label: product?.name || "상품", value: <span className="text-gray-900 font-bold">{set.quantity}개</span> }
    ])) : []),
    ...(!isPackageProduct && requestedQuantity > 0 && !isCombinationOptionMode ? [{ label: product?.name || "상품", value: hasProductOptions ? <span className="text-gray-900">{requestedQuantity}개</span> : !priceDisplayLoading && !isVisiblePriceMode(priceDisplayMode) ? <span className="text-gray-900">{requestedQuantity}개</span> : <span className={getPublicPriceClassName({ mode: priceDisplayMode, loading: priceDisplayLoading, visibleClass: 'text-gray-900', hiddenClass: INQUIRY_PRICE_TEXT_CLASS })}>{mainPriceText}</span> }] : []),
  ];`;

content = content.replace(/const summaryRows: SummaryRow\[\] = \[\s*[\s\S]*?\];/m, preferredSummaryRows);

// 5. Update buildSelectedOptions
content = content.replace(
  ` ...(isCombinationOptionMode ? selectedCombinationOptionItems.map((item) => ({ name: \`\${item.groupName}: \${item.valueName}\`, quantity: 1, price: 0 })) : selectedProductOptionItems.map((item) => ({ name: \`\${item.groupName}: \${item.valueName}\`, quantity: item.quantity, price: 0 }))),`,
  ` ...(isCombinationOptionMode ? combinationSets.map((set) => ({ name: \`[옵션세트] \${Object.values(set.selections).join(" / ")}\`, quantity: set.quantity, price: 0 })) : selectedProductOptionItems.map((item) => ({ name: \`\${item.groupName}: \${item.valueName}\`, quantity: item.quantity, price: 0 }))),`
);

// 6. Restore JSX render
content = content.replace(
  /<CombinationProductOptionGroups[\s\S]*?\/>/m,
  `<CombinationProductOptionGroups
                      groups={productOptionGroups}
                      selections={productOptionSelections}
                      onSelect={handleSelectCombinationOption}
                    />`
);

// 7. Update requestedQuantity
content = content.replace(
  'if (isCombinationOptionMode) return Math.max(productOptionSetQuantity, 1);',
  'if (isCombinationOptionMode) return combinationSets.reduce((sum, set) => sum + set.quantity, 0);'
);

// 8. Update validateProductOptionSelection
content = content.replace(
  /if \(isCombinationOptionMode\) \{[\s\S]*?return false;\n    \}/,
  `    if (isCombinationOptionMode) {
      if (combinationSets.length > 0) return true;
      setBookingModal({ show: true, message: "원하시는 옵션을 차례로 선택해 주세요.", type: "info" });
      return false;
    }`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Partial revert and preferred sidebar applied!');
