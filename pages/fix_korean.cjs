const fs = require('fs');
let txt = fs.readFileSync('pages/ProductDetail.tsx', 'utf8');

// Build replacement map: [corrupted string, correct Korean]
const replacements = [
  // Line 65-69: getComponentComponentImage function
  [/if \(name\.includes\("[^"]*"\)\) return "\/comp-notebook\.svg"/g, 'if (name.includes("노트북")) return "/comp-notebook.svg"'],
  [/if \(name\.includes\("[^"]*"\)\) return "\/comp-table\.svg"/g, 'if (name.includes("테이블")) return "/comp-table.svg"'],
  [/if \(name\.includes\("[^"]*"\)\) return "\/comp-chair\.svg"/g, 'if (name.includes("의자")) return "/comp-chair.svg"'],
  [/if \(name\.includes\("[^"]*"\) \|\| name\.includes\("[^"]*"\)\) return "\/comp-printer\.svg"/g, 'if (name.includes("복합기") || name.includes("프린터")) return "/comp-printer.svg"'],
  [/if \(name\.includes\("[^"]*"\)\) return "\/comp-fridge\.svg"/g, 'if (name.includes("냉장고")) return "/comp-fridge.svg"'],

  // SEO and meta
  [/\?{4}브컯\?{4}꿔꺂\?{12}ㅿ폍\?{6}딅젩 \| \?{4}ㅼ뒭\?{6}/g, '렌탈 제품 상세 견적요청 | 마이스데이'],
  [/\?{4}브컯\?{4}꿔꺂\?{12}ㅿ폍\?{6}딅젩\./g, '렌탈 제품 상세 견적요청.'],
  [/\?{4}ㅼ뒭\?{6}/g, '마이스데이'],

  // Common phrases - order matters (longer first)
  [/\?嚥▲굥猿\?\?怨몃굶 \?\?\?됰Ŋ\?\?\?/g, '견적 요청 접수'],
  [/\?逆곷틳源\?\?嶺\?\?\?\?\?\?\?源낇꺙/g, '장바구니 담기'],
  [/\?꿔꺂\?\?節뉖き\?\?\?\?\?\.\./g, '처리중...'],
  [/\?\?\?繹먮냱\?\?/g, '품절'],
  [/\?癲ル슢캉\?\?/g, '확인'],

  // Trust badges
  [/\?\?\?誘⑸\?\?癲ル슢\?\?蹂\?뼀\?節뚮뮋\?\?\?\?뤈\?\?\?/g, '장애인등록기업'],
  [/\?{4}逆\?{6}ㅼ뒭\?{6}썼キ\?{3}좊펳\?{7}/g, '사무장비 렌탈 전문기업'],
];

// Direct line-by-line fixes using line numbers from scan
const lineReplacements = {
  // getComponentComponentImage - lines 65-69
  65: '  if (name.includes("노트북")) return "/comp-notebook.svg";',
  66: '  if (name.includes("테이블")) return "/comp-table.svg";',
  67: '  if (name.includes("의자")) return "/comp-chair.svg";',
  68: '  if (name.includes("복합기") || name.includes("프린터")) return "/comp-printer.svg";',
  69: '  if (name.includes("냉장고")) return "/comp-fridge.svg";',
};

const lines = txt.split('\n');

// Apply line-level fixes first
for (const [lineNum, replacement] of Object.entries(lineReplacements)) {
  const idx = parseInt(lineNum) - 1;
  if (idx < lines.length) {
    lines[idx] = replacement;
  }
}

txt = lines.join('\n');

// Now do all the string-level replacements
// We need a comprehensive mapping. Let me scan each corrupted line and fix it.

const lineFixes = new Map();

// Line 1049-1050: toast/notification messages
lineFixes.set(1049, '          "견적 요청 접수 완료",');
lineFixes.set(1050, '          `${product.name} 견적 요청이 접수되었습니다. 영업일 기준 담당자가 확인 후 연락드리겠습니다.`,');

// Line 1079: error message
lineFixes.set(1079, '          message: "견적 요청 접수 중 오류가 발생했습니다.\\n잠시 후 다시 시도해 주세요. 문제가 지속될 경우 고객센터로 연락 부탁드립니다.",');

// Line 1097: another message
lineFixes.set(1097, '          message: "견적 요청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.\\n문제가 지속되면 고객센터로 문의 바랍니다.",');

// Line 1110, 1119: labels
lineFixes.set(1110, '          label: "기본 구성품",');
lineFixes.set(1119, '          label: "추가 구성품 및 옵션 선택",');

// Line 1151: title tag
lineFixes.set(1151, '        <title>렌탈 제품 상세 견적요청 | 마이스데이</title>');

// Line 1156: meta description
lineFixes.set(1156, '          렌탈 제품 상세 견적요청.');

// Line 1162: seoTitle  
lineFixes.set(1162, '        const seoTitle = `${product.name} | 마이스데이`;');

// Line 1165: seoDescription
lineFixes.set(1165, '          `${product.name} 마이스데이 옵션 선택 후 견적요청. 마이스데이에서 다양한 사무기기를 합리적인 가격에 렌탈하세요. 복합기, 노트북, 데스크탑 등 기업 맞춤 렌탈 서비스.`;');

// Line 1171-1172: breadcrumb
lineFixes.set(1171, '            { name: "홈", item: `${SITE_URL}/` },');
lineFixes.set(1172, '            { name: "렌탈 제품 목록", item: `${SITE_URL}/products` },');

// Line 1210: comment
lineFixes.set(1210, '            // 카테고리 메뉴에서 현재 카테고리를 찾아 부모 카테고리 경로를 표시');

// Line 1223
lineFixes.set(1223, '                    홈');

// Line 1307
lineFixes.set(1307, '                    {showDailySuffix && <span className="text-sm text-gray-400">/ 1일</span>}');

// Line 1313
lineFixes.set(1313, '                    <p className="mb-2 text-sm font-semibold text-slate-600 md:text-right">월 렌탈료</p>');

// Line 1322
lineFixes.set(1322, '                    aria-label="월 렌탈료 표시 전환"');

// Line 1340
lineFixes.set(1340, '                    aria-label="수량 줄이기"');

// Line 1348
lineFixes.set(1348, '                    aria-label="수량 늘리기"');

// Line 1362
lineFixes.set(1362, '                    날짜 선택');

// Line 1374
lineFixes.set(1374, '                    일정 초기화');

// Line 1392
lineFixes.set(1392, '                    렌탈 기간');

// Line 1401
lineFixes.set(1401, '                    <span className="text-gray-500 text-sm mt-1">({days}일)</span>');

// Line 1406
lineFixes.set(1406, '                    <span className="font-medium text-gray-700">예상 인원수</span>');

// Line 1434
lineFixes.set(1434, '                        <span className="font-medium text-gray-700">명</span>');

// Line 1462
lineFixes.set(1462, '                        기본 구성');

// Line 1464
lineFixes.set(1464, '                        기본 구성품으로 포함된 제품');

// Line 1467
lineFixes.set(1467, '                      ({product.basic_components.length}건)');

// Line 1476
lineFixes.set(1476, '                      기본 구성품으로 포함된 제품입니다. 고객님의 필요에 맞게 수량을 조정하거나 추가 구성품을 선택하실 수 있습니다.');

// Line 1534
lineFixes.set(1534, '                              {item.quantity}개');

// Line 1564
lineFixes.set(1564, '                    <h3 className="text-lg font-semibold text-gray-900">기본 구성품 및 옵션 선택</h3>');

// Line 1567
lineFixes.set(1567, '                    필요한 구성품과 옵션을 선택하고 수량을 지정하시면 맞춤 견적을 안내해 드립니다.');

// Line 1590-1591: tabs
lineFixes.set(1590, '            { id: "detail", label: "제품 소개 및 상세정보" },');
lineFixes.set(1591, '            { id: "guide", label: "도입 안내" },');

// Line 1617
lineFixes.set(1617, '                  제품 소개 및 상세정보를 준비중입니다.');

// Line 1624
lineFixes.set(1624, '                  도입 안내');

// Line 1627
lineFixes.set(1627, '                  아래 절차를 통해 간편하게 견적 요청이 가능합니다.');

// Line 1633
lineFixes.set(1633, '                    <h5 className="text-base font-semibold text-slate-900">견적 요청 절차</h5>');

// Line 1636
lineFixes.set(1636, '                      <span className="font-semibold text-slate-900">1. 견적 요청 접수</span>');

// Line 1637
lineFixes.set(1637, '                      <p className="mt-1">렌탈 기간과 수량 등을 선택하여 견적 요청을 접수해 주세요. 필요한 구성을 알려주시면 됩니다.</p>');

// Line 1640
lineFixes.set(1640, '                      <span className="font-semibold text-slate-900">2. 담당자 배정</span>');

// Line 1641
lineFixes.set(1641, '                      <p className="mt-1">접수 후 담당자가 배정되어 필요한 제품과 견적 세부 사항을 안내해 드립니다.</p>');

// Line 1644
lineFixes.set(1644, '                      <span className="font-semibold text-slate-900">3. 견적 확정</span>');

// Line 1645
lineFixes.set(1645, '                      <p className="mt-1">제품 사양 확인 후 렌탈 견적을 확정하고 필요에 따라 추가 옵션이나 일정을 조율합니다.</p>');

// Line 1648
lineFixes.set(1648, '                      <span className="font-semibold text-slate-900">4. 계약 및 배송</span>');

// Line 1649
lineFixes.set(1649, '                      <p className="mt-1">계약 체결 후 약속된 일정에 제품을 배송하고 설치까지 진행해 드립니다.</p>');

// Line 1655
lineFixes.set(1655, '                    <h5 className="text-base font-semibold text-slate-900">유지보수 안내</h5>');

// Line 1657
lineFixes.set(1657, '                    렌탈 계약 기간 내 제품에 대한 정기 점검과 장애 발생 시 무상 수리 또는 교체 서비스를 제공합니다.');

// Line 1658
lineFixes.set(1658, '                    장애 접수 후 1영업일 이내 현장 방문 또는 원격 지원이 가능합니다.');

// Line 1661
lineFixes.set(1661, '                    계약 만료 시 반납, 연장, 재계약 중 선택 가능하며 견적 요청 시 원하시는 방식을 말씀해 주시면 맞춤 안내해 드립니다.');

// Line 1666
lineFixes.set(1666, '                    <h5 className="text-base font-semibold text-slate-900">견적 요청 시 참고사항 및 상세정보</h5>');

// Line 1668-1670
lineFixes.set(1668, '                    <li>배송 및 설치에 대한 상세 일정은 별도 안내</li>');
lineFixes.set(1669, '                    <li>계약 기간에 따라 월 렌탈료가 달라질 수 있음</li>');
lineFixes.set(1670, '                    <li>수량이 많은 경우 별도 할인 적용 가능</li>');

// Line 1685
lineFixes.set(1685, '                    견적 요청 접수');

// Line 1700
lineFixes.set(1700, '                      예상 견적 비용');

// Line 1720
lineFixes.set(1720, '                        <Loader2 className="animate-spin" size={20} /> 처리중...');

// Line 1723
lineFixes.set(1723, '                      "품절"');

// Line 1725
lineFixes.set(1725, '                      "견적 요청 접수"');

// Line 1733
lineFixes.set(1733, '                    장바구니 담기');

// Line 1737
lineFixes.set(1737, '                      접수 후 영업일 내 담당자가 연락드립니다.');

// Line 1747
lineFixes.set(1747, '                          <span className="text-xl">💳</span>');

// Line 1751
lineFixes.set(1751, '                            온라인 결제 없이 견적 접수 후 계약 진행');

// Line 1753
lineFixes.set(1753, '                            법인카드, 세금계산서 등 기업 행정 서류를 지원합니다.');

// Line 1763
lineFixes.set(1763, '                            alt="장애인등록기업"');

// Line 1769
lineFixes.set(1769, '                            장애인등록기업');

// Line 1771
lineFixes.set(1771, '                            공공기관 우선구매 대상');

// Line 1780
lineFixes.set(1780, '                            alt="사무장비 렌탈 전문기업"');

// Line 1786
lineFixes.set(1786, '                            사무장비 렌탈 전문기업');

// Line 1789
lineFixes.set(1789, '                            복합기·노트북·데스크탑 렌탈 전문성 보유');

// Line 1815
lineFixes.set(1815, '            {mobileBarExpanded ? "접어두기" : "제품 상세 보기"}');

// Line 1824
lineFixes.set(1824, '            견적 요청 접수');

// Line 1838
lineFixes.set(1838, '              장바구니 담기 ({quoteCartCount})');

// Line 1846
lineFixes.set(1846, '              <p className="text-xs text-gray-500">예상 견적 비용</p>');

// Line 1865
lineFixes.set(1865, '              ? "처리중..."');

// Line 1867
lineFixes.set(1867, '              ? "품절"');

// Line 1868
lineFixes.set(1868, '              : "견적 요청 접수"}');

// Line 1885
lineFixes.set(1885, "              {actionConfirmModal.action === 'booking' ? '견적 요청 접수 확인' : '장바구니 담기 확인'}");

// Line 1891
lineFixes.set(1891, "              아래 내용으로 {actionConfirmModal.action === 'booking' ? '견적 요청을 접수' : '장바구니에 담기'}하시겠습니까?");

// Line 1898
lineFixes.set(1898, '              <span className="text-sm font-semibold text-slate-900">예상 견적 비용</span>');

// Line 1909
lineFixes.set(1909, "              ? '선택하신 구성으로 견적 요청이 접수됩니다. 영업일 기준 담당자가 확인 후 연락드리겠습니다. 문제가 있으시면 고객센터로 문의 부탁드립니다.'");

// Line 1910
lineFixes.set(1910, "              : '선택하신 구성이 장바구니에 담겼습니다. 장바구니에서 수량을 수정하거나 추가 제품을 선택하실 수 있습니다.'");

// Line 1918
lineFixes.set(1918, '              다시 검토');

// Line 1931
lineFixes.set(1931, "              {actionConfirmModal.action === 'booking' ? '이대로 요청하기' : '이대로 담기'}");

// Line 1977
lineFixes.set(1977, '              견적 요청이 접수되었습니다');

// Line 1986
lineFixes.set(1986, '              장바구니에 담겼습니다');

// Line 1996
lineFixes.set(1996, '              확인');



const finalLines = txt.split('\n');

for (const [lineNum, replacement] of lineFixes.entries()) {
  const idx = lineNum - 1;
  if (idx >= 0 && idx < finalLines.length) {
    // Preserve line ending
    const hadCR = finalLines[idx].endsWith('\r');
    finalLines[idx] = replacement + (hadCR ? '\r' : '');
  }
}

const result = finalLines.join('\n');
fs.writeFileSync('pages/ProductDetail.tsx', result, 'utf8');

// Verify
const verify = fs.readFileSync('pages/ProductDetail.tsx', 'utf8');
console.log('Has 장바구니:', verify.includes('장바구니'));
console.log('Has 견적:', verify.includes('견적'));
console.log('Has 노트북:', verify.includes('노트북'));
console.log('Has corrupted:', verify.includes('?嚥▲'));
console.log('Total lines:', verify.split('\n').length);
