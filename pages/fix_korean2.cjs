const fs = require('fs');
let txt = fs.readFileSync('pages/ProductDetail.tsx', 'utf8');
const lines = txt.split('\n');

const fixes = new Map();

// Line 312
fixes.set(312, '                    장바구니 담기');

// Line 399: comment
fixes.set(399, '      // When display_order is the same (e.g. both 999), sort alphabetically by name (가나다 오름차순)');

// Line 443
fixes.set(443, '        <p>해당 카테고리에 등록된 상품이 없습니다.</p>');

// Line 553
fixes.set(553, '            <p className="mt-1 text-sm text-slate-500">옵션별 수량을 바로 선택해서 같은 상품 안에 함께 담을 수 있습니다.</p>');

// Line 577
fixes.set(577, '                    aria-label={`${value.name} 수량 줄이기`}');

// Line 588
fixes.set(588, '                    aria-label={`${value.name} 수량 늘리기`}');

// Line 691: comment
fixes.set(691, '            // 기존 코드와 동일하게 하위 카테고리 메뉴 항목을 찾아 해당 카테고리의 상품을 표시');

// Line 737: comment
fixes.set(737, '// 선택된 상품 수량 계산 함수 (From Colleague\'s Code)');

// Line 851-852: toast messages
fixes.set(851, '              ? "선택하신 구성으로 견적 요청이 접수되었습니다. 영업일 기준 담당자가 확인 후 연락드리겠습니다. 제품 소개"');
fixes.set(852, '              : "선택하신 구성으로 장바구니에 담겼습니다. 수량을 변경하거나 추가 구성품을 선택하실 수 있습니다. 장바구니"');

// Line 855-856: toast messages  
fixes.set(855, '              ? "제품 상세 페이지에서 견적 요청 후 접수 완료.\\n영업일 기준 담당자가 배정되어 연락드리겠습니다."');
fixes.set(856, '              : "장바구니에 담겼습니다. 추가 옵션이나 수량을 변경하실 수 있습니다.\\n영업일 기준 담당자가 배정됩니다."');

// Line 858-859: more messages
fixes.set(858, '              ? "제품 상세 페이지에서 견적 요청 후 접수 완료.\\n영업일 기준 담당자가 배정되어 연락드리겠습니다."');
fixes.set(859, '              : "장바구니에 담겼습니다. 추가 옵션이나 수량을 변경하실 수 있습니다.\\n영업일 기준 담당자가 배정됩니다."');

// Line 939
fixes.set(939, '          message: "로그인 후 이용 가능한 서비스입니다.",');

// Line 976  
fixes.set(976, '          "장바구니에 추가되었습니다.\\n견적 요청 시 렌탈 조건을 확인하고 장바구니에서 수량을 조정하실 수 있습니다.",');

// Line 990
fixes.set(990, "          message: '필수 정보를 모두 입력해 주세요.',");

// Line 1006
fixes.set(1006, '          message: "수량과 기간 등을 확인해 주세요.\\n문제가 지속될 경우 고객센터로 문의 바랍니다.",');

for (const [lineNum, replacement] of fixes.entries()) {
  const idx = lineNum - 1;
  if (idx >= 0 && idx < lines.length) {
    const hadCR = lines[idx].endsWith('\r');
    lines[idx] = replacement + (hadCR ? '\r' : '');
  }
}

const result = lines.join('\n');
fs.writeFileSync('pages/ProductDetail.tsx', result, 'utf8');

// Verify remaining corrupted chars
const verify = fs.readFileSync('pages/ProductDetail.tsx', 'utf8');
const vLines = verify.split('\n');
let corruptCount = 0;
vLines.forEach((l, i) => {
  if (l.match(/[嚥▲굥猿怨몃굶됰Ŋ逆곷틳源嶺낇꺙꿔꺂節뉖き繹먮냱癲ル슢캉誘⑸蹂뼀뮋뤈ㅼ뒭썼キ좊펳]/)) {
    corruptCount++;
    console.log((i+1) + ': ' + l.trim().substring(0, 100));
  }
});
console.log('Remaining corrupted lines:', corruptCount);
