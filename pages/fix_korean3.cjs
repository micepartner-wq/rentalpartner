const fs = require('fs');
let txt = fs.readFileSync('pages/ProductDetail.tsx', 'utf8');
const lines = txt.split('\n');

const fixes = new Map();

// Line 70: coffee machine
fixes.set(70, '  if (name.includes("커피머신")) return "/comp-coffee.svg";');

// Line 134
fixes.set(134, '    <p className="text-xs font-semibold text-gray-500 mb-2">수량 선택</p>');

// Line 157
fixes.set(157, '  productType === "cooperative" ? "협동" : "일반";');

// Line 266
fixes.set(266, '              <Check size={16} /> {isInCart ? "구성품에서 제외" : "구성품에 추가"}');

// Line 305
fixes.set(305, '                {isChanged ? "수정" : <Check size={18} />}');

// Line 369
fixes.set(369, "    const cat = item.category || '기타';");

// Line 456
fixes.set(456, "        const cat = p.category || '기타';");

// Line 462
fixes.set(462, "        const catA = a.category || '기타';");

// Line 463
fixes.set(463, "        const catB = b.category || '기타';");

// Line 477
fixes.set(477, "      displayItems = items.filter(p => (p.category || '기타') === localActiveCategory);");

// Line 530
fixes.set(530, '            <p>선택된 카테고리에 상품이 없습니다.</p>');

// Line 556
fixes.set(556, '            {group.values.length}개 옵션');

// Line 837
fixes.set(837, '          suffix: "일",');

for (const [lineNum, replacement] of fixes.entries()) {
  const idx = lineNum - 1;
  if (idx >= 0 && idx < lines.length) {
    const hadCR = lines[idx].endsWith('\r');
    lines[idx] = replacement + (hadCR ? '\r' : '');
  }
}

const result = lines.join('\n');
fs.writeFileSync('pages/ProductDetail.tsx', result, 'utf8');

// Verify
const verify = fs.readFileSync('pages/ProductDetail.tsx', 'utf8');
const vLines = verify.split('\n');
let count = 0;
vLines.forEach((l, i) => {
  if (l.includes('??') && !l.trim().startsWith('//') && !l.trim().startsWith('*')) {
    count++;
    console.log((i+1) + ': ' + l.trim().substring(0, 100));
  }
});
console.log('Remaining lines with ??:', count);
