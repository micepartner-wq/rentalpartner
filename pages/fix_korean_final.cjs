const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ProductDetail.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Common corruption patterns to correct Korean
const mappings = [
    [/Ʈ/g, "노트북"],
    [/̺/g, "테이블"],
    [//g, "의자"],
    [/ձ/g, "복합기"],
    [//g, "프린터"],
    [//g, "냉장고"],
    [/ĿǸӽ/g, "커피머신"],
    [/??웾 ?좏깮/g, "수량 선택"],
    [//g, "개"],
    [/ъ꽦??뿉????쇅/g, "구성품에서 제외"],
    [/ъ꽦??뿉 ?붽?/g, "구성품에 추가"],
    [/??젙/g, "수정"],
    [/\?λ\?\?\?\?\?\?린/g, "장바구니 담기"],
    [/\?\? ?곸꽭 蹂닿\?/g, "구성 상세 보기"],
    [/寃ъ쟻 ?붿껌 ?붿빟/g, "견적 요청 요약"],
    [/?λ?\?\?濡\?\?\?\?\?\?\?\?\?\?젙\?붿껌\?\?\?\?\?\?퍡 ?묒닔??떎/g, "장바구니에 담으시면 일정과 견적 조건을 담당자가 확인하여 안내해 드립니다."],
    [/ ɼ/g, "선택된 옵션"],
    [/ǰ/g, "상품"],
    [/\?명듃 ??웾/g, "세트 수량"],
    [/湲곕\?\?\?ъ꽦??/g, "기본 구성품"],
    [/\?붽\? \?ъ꽦\?\?\?\?\?\???좏깮/g, "추가 구성품 및 옵션 선택"],
];

mappings.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
});

// 2. Fix the Mobile Sticky Bar specifically (using the clean layout from update_layout3)
const mobileBarRegex = /<div\s+className={`fixed bottom-0 left-0 right-0 overflow-hidden bg-white border border-gray-200 border-b-0 rounded-t-\[26px\] shadow-\[0_-12px_32px_rgba\(15,23,42,0.12\)\] z-50 lg:hidden transition-all duration-300 \${mobileBarExpanded \? "max-h-\[80vh\]" : "max-h-\[140px\]"}`}[\s\S]+?<\/div>\s+<\/div>\s+<\/div>/;

const cleanMobileBar = `<div className={\`fixed bottom-0 left-0 right-0 overflow-hidden bg-white border-t border-gray-200 rounded-t-[26px] shadow-[0_-8px_24px_rgba(15,23,42,0.1)] z-50 lg:hidden transition-all duration-300 \${mobileBarExpanded ? "max-h-[85vh]" : "max-h-[100px]"}\`}>
        <button onClick={() => setMobileBarExpanded(!mobileBarExpanded)} className="w-full flex items-center justify-center py-3 bg-white">
          <div className="w-10 h-1 bg-gray-200 rounded-full mb-1" />
        </button>

        {mobileBarExpanded ? (
          <div className="px-6 pb-8 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={20} className="text-[#001E45]" />
              <h3 className="font-bold text-lg text-gray-900">견적 요청 요약</h3>
            </div>
            <SummaryRows rows={displaySummaryRows} />
            {selectedSummary.length > 0 && <SelectedOptionsSection items={selectedSummary} priceDisplayMode={priceDisplayMode} priceDisplayLoading={priceDisplayLoading} />}
            <div className="mt-6 space-y-3">
              <button onClick={() => openActionConfirm('booking')} disabled={isBooking || product.stock === 0} className="w-full py-4 rounded-xl bg-[#001E45] text-white font-bold shadow-lg flex items-center justify-center gap-2">
                {isBooking ? <Loader2 className="animate-spin" size={20} /> : <><ShoppingBag size={20} /> 장바구니에서 견적 요청</>}
              </button>
              <button onClick={() => openActionConfirm('cart')} className="w-full py-4 rounded-xl border-2 border-[#001E45] text-[#001E45] font-bold bg-white flex items-center justify-center gap-2">
                <ShoppingCart size={20} /> 장바구니 담기 ({quoteCartCount})
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-8 flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-[13px] font-bold text-[#001E45] mb-0.5">{product.name}</p>
              <p className="text-xs text-gray-500">수량 {requestedQuantity}개 선택됨</p>
            </div>
            <button onClick={() => setMobileBarExpanded(true)} className="px-8 py-3.5 bg-[#001E45] text-white rounded-xl font-bold text-sm shadow-md">
              견적 확인
            </button>
          </div>
        )}
      </div>`;

content = content.replace(mobileBarRegex, cleanMobileBar);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Recovery completed successfully.');
