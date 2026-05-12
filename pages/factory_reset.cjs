const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'ProductDetail.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Revert CombinationProductOptionGroups to the original minimalist version
const originalComp = `const CombinationProductOptionGroups = ({
  groups,
  selections,
  quantity,
  onSelect,
  onQuantityChange,
}: {
  groups: ProductOptionGroup[];
  selections: Record<string, string>;
  quantity: number;
  onSelect: (groupName: string, valueName: string) => void;
  onQuantityChange: (nextQuantity: number) => void;
}) => (
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">세트 수량</h3>
          <p className="mt-1 text-sm text-slate-500">선택한 옵션 조합으로 담을 수량입니다.</p>
        </div>
        <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            className="flex h-full w-11 items-center justify-center text-slate-600 hover:bg-slate-50"
            aria-label="수량 줄이기"
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
            aria-label="수량 늘리기"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </section>
  </div>
);`;

content = content.replace(/const CombinationProductOptionGroups = \(\{[\s\S]*?\}\) => \{[\s\S]*?return \([\s\S]*?\n  \);\n\};\n/m, originalComp + '\n');

// 2. Remove combinationSets state and restore original logic
content = content.replace('  const [combinationSets, setCombinationSets] = useState<Array<{ id: string; selections: Record<string, string>; quantity: number; price: number }>>([]);', '');

// Restore selectedCombinationOptionItems
content = content.replace(
  /const selectedCombinationSummaryItems = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[isCombinationOptionMode, combinationSets, product\?\.price\]\);/,
  `const selectedCombinationOptionItems = React.useMemo(() => isCombinationOptionMode ? productOptionGroups.reduce<{ groupName: string; valueName: string }[]>((acc, group) => { const valueName = productOptionSelections[group.name]; if (valueName) acc.push({ groupName: group.name, valueName }); return acc; }, []) : [], [isCombinationOptionMode, productOptionGroups, productOptionSelections]);`
);

// Restore requestedQuantity
content = content.replace(
  'if (isCombinationOptionMode) return combinationSets.reduce((sum, set) => sum + set.quantity, 0);',
  'if (isCombinationOptionMode) return Math.max(productOptionSetQuantity, 1);'
);

// Restore summaryRows
const originalSummaryRows = `  const summaryRows: SummaryRow[] = [
    ...(isCombinationOptionMode && selectedCombinationOptionItems.length > 0 ? [{ label: "선택 옵션", value: <span className="text-gray-900">{selectedCombinationOptionItems.map((item) => item.valueName).join(" / ")}</span> }] : []),
    ...(!isPackageProduct && requestedQuantity > 0 && !isCombinationOptionMode ? [{ label: product?.name || "상품", value: hasProductOptions ? <span className="text-gray-900">{requestedQuantity}개</span> : !priceDisplayLoading && !isVisiblePriceMode(priceDisplayMode) ? <span className="text-gray-900">{requestedQuantity}개</span> : <span className={getPublicPriceClassName({ mode: priceDisplayMode, loading: priceDisplayLoading, visibleClass: 'text-gray-900', hiddenClass: INQUIRY_PRICE_TEXT_CLASS })}>{mainPriceText}</span> }] : []),
    ...(!isPackageProduct && requestedQuantity > 0 && isCombinationOptionMode ? [{ label: product?.name || "상품", value: <span className="text-gray-900">{requestedQuantity}개</span> }] : []),
  ];`;

content = content.replace(/const summaryRows: SummaryRow\[\] = \[\s*[\s\S]*?\];/m, originalSummaryRows);

// Restore buildSelectedOptions
content = content.replace(
  / \.\.\.\(isCombinationOptionMode \? combinationSets\.map\([\s\S]*?\),/,
  ` ...(isCombinationOptionMode ? selectedCombinationOptionItems.map((item) => ({ name: \`\${item.groupName}: \${item.valueName}\`, quantity: 1, price: 0 })) : selectedProductOptionItems.map((item) => ({ name: \`\${item.groupName}: \${item.valueName}\`, quantity: item.quantity, price: 0 }))),`
);

// Restore validateProductOptionSelection
content = content.replace(
  /if \(isCombinationOptionMode\) \{[\s\S]*?return false;\n    \}/,
  `    if (isCombinationOptionMode) {
      if (productOptionGroups.every((group) => Boolean(productOptionSelections[group.name])) && requestedQuantity > 0) return true;
      setBookingModal({ show: true, message: "모든 옵션 그룹에서 값을 하나씩 선택해 주세요.", type: "info" });
      return false;
    }`
);

// Remove handlers
content = content.replace(/const handleAddCombinationSet = \(\) => \{[\s\S]*?const handleRemoveCombination = \(id: string\) => \{[\s\S]*?\}\;\n/m, '');

// Restore JSX render
content = content.replace(
  /<CombinationProductOptionGroups[\s\S]*?\/>/m,
  `<CombinationProductOptionGroups
                      groups={productOptionGroups}
                      selections={productOptionSelections}
                      quantity={productOptionSetQuantity}
                      onSelect={(groupName, valueName) => setProductOptionSelections((prev) => ({ ...prev, [groupName]: valueName }))}
                      onQuantityChange={setProductOptionSetQuantity}
                    />`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Factory reset complete!');
