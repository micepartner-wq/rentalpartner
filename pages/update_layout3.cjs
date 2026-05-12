const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ProductDetail.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\r\n/g, '\n');

const startIndex = content.indexOf('          {/* 2-Column Layout / Grid Ordering for Responsive */}');
const endMarker = '        </Container>\n      </div>\n\n      <div\n        className={`fixed bottom-0 left-0 right-0';
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find start or end index.');
  process.exit(1);
}

const replacement = `          {/* 2-Column Layout / Grid Ordering for Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-10">
            
            {/* LEFT COLUMN: Product Configuration */}
            <div className="lg:col-span-7 xl:col-span-8 lg:row-start-1 space-y-8">
              
              {/* 1. Merged Hero Section (Title -> Image) */}
              <section className="overflow-hidden rounded-[24px] lg:rounded-[28px] border border-gray-100 bg-white shadow-sm flex flex-col">
                {/* Title & Short Description */}
                <div className="p-6 sm:p-8 sm:pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {product.category}
                    </span>
                    <span className="rounded-full border border-[#001E45]/10 bg-[#001E45]/5 px-3 py-1 text-xs font-medium text-[#001E45]">
                      맞춤 견적형 상품
                    </span>
                  </div>
                  <div className="mt-4">
                    <h1 className="text-2xl font-bold leading-tight text-gray-900 xl:text-[32px]">
                      {product.name}
                    </h1>
                    <p className="mt-3 text-[15px] leading-relaxed text-slate-500 break-keep">
                      {product.short_description ||
                        "일정과 수량을 접수하면 담당자가 렌탈 조건을 안내해 드립니다."}
                    </p>
                  </div>
                </div>

                {/* Image */}
                <div className="flex aspect-video sm:aspect-[16/9] w-full items-center justify-center p-6 sm:px-10 sm:pb-10 sm:pt-4">
                  <img
                    src={product.image_url || "https://picsum.photos/seed/product/800/600"}
                    alt={product.name}
                    className="block h-full w-full object-cover rounded-xl"
                  />
                </div>
              </section>

              {/* 2. Basic Configuration */}
              {product.basic_components && product.basic_components.length > 0 && (
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                  <button
                    onClick={() => setBasicComponentsExpanded(!basicComponentsExpanded)}
                    className="w-full flex items-center justify-between pb-2 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-[#001E45] text-white px-2.5 py-1 rounded-md text-xs font-bold tracking-wide">
                        기본 구성
                      </span>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        기본 구성품으로 포함된 제품
                      </h3>
                      <span className="text-sm font-medium text-[#001E45] bg-[#001E45]/5 px-2 py-0.5 rounded-full">
                        {product.basic_components.length}건
                      </span>
                    </div>
                    <ChevronRight
                      size={20}
                      className={\`text-gray-400 transition-transform duration-200 \${basicComponentsExpanded ? "rotate-90" : ""}\`}
                    />
                  </button>
                  <p className="mt-2 text-[14px] text-slate-500 break-keep">
                    패키지에 기본으로 포함된 제품 목록입니다. 고객님의 필요에 맞게 추가 구성품을 선택하거나 수량을 조정할 수 있습니다.
                  </p>
                  
                  {basicComponentsExpanded && (
                    <div className="space-y-0 mt-4 border-t border-gray-100 pt-2">
                      {product.basic_components.map((item, idx) => {
                        const matchedProduct = componentProducts.find((p) => p.name === item.name);
                        const imageUrl = item.image_url || matchedProduct?.image_url || getComponentComponentImage(item.name);

                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-4 py-4 border-b border-dashed border-gray-200 last:border-0 hover:bg-gray-50/50 transition-colors rounded-xl px-2 -mx-2"
                          >
                            <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden relative">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement?.classList.add("fallback-icon");
                                  }}
                                />
                              ) : (
                                <Package size={24} className="text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-[15px]">
                                {item.name}
                              </p>
                              {(item.model_name || matchedProduct?.product_code) && (
                                <p className="text-[13px] text-gray-400 mt-1">
                                  {item.model_name || matchedProduct?.product_code || "P0000"}
                                </p>
                              )}
                            </div>
                            <span className="font-bold text-[#001E45] bg-[#001E45]/5 px-3 py-1.5 rounded-lg text-sm">
                              {item.quantity}개
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Options Selection (Moved BELOW Basic Configuration) */}
              {(hasProductOptions || globalCooperative.length > 0) && (
                <div className="space-y-6">
                  {hasProductOptions && (
                    <ProductOptionGroups
                      groups={productOptionGroups}
                      quantities={productOptionQuantities}
                      onUpdate={(groupName, valueName, quantity) => {
                        const key = buildProductOptionKey(groupName, valueName);
                        setProductOptionQuantities((prev) => ({
                          ...prev,
                          [key]: quantity,
                        }));
                      }}
                    />
                  )}

                  {globalCooperative.length > 0 && (
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Users size={18} className="text-[#001E45]" />
                          <h3 className="text-[15px] font-semibold text-gray-900">추가 구성품 및 옵션 선택</h3>
                        </div>
                      </div>
                      <OptionListTypeA
                        items={globalCooperative}
                        selectedQty={selectedCooperative}
                        setQty={setSelectedCooperative}
                        componentProducts={componentProducts}
                        menuItems={menuItems}
                        tabType="cooperative"
                        selectionMode="checkbox"
                        priceDisplayMode={priceDisplayMode}
                        priceDisplayLoading={priceDisplayLoading}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 4. Product Details Tabs */}
              <div className="bg-white rounded-[24px] shadow-sm overflow-hidden border border-gray-100">
                <div className="flex border-b border-gray-100">
                  {[
                    { id: "detail", label: "제품 소개 및 상세정보" },
                    { id: "guide", label: "대여 안내" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={\`flex-1 py-5 font-semibold text-[15px] transition-colors relative
                        \${activeTab === tab.id ? "text-[#001E45] bg-slate-50/50" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}\`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#001E45]" />
                      )}
                    </button>
                  ))}
                </div>
                <div className={\`min-h-[300px] \${activeTab === 'detail' ? 'p-6 sm:p-10' : 'p-6 sm:p-10'}\`}>
                  {activeTab === "detail" &&
                    (product.description ? (
                      <div
                        className="prose prose-slate max-w-none w-full [&>p]:m-0 [&>img]:w-full [&>img]:m-0 [&>img]:rounded-xl"
                        dangerouslySetInnerHTML={{
                          __html: product.description.replace(/\\n/g, "<br/>"),
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
                        <Package size={48} className="text-gray-200" />
                        <p>제품 소개 및 상세정보를 준비중입니다.</p>
                      </div>
                    ))}
                  {activeTab === "guide" && (
                    <article className="mx-auto max-w-3xl space-y-10 text-[15px] leading-8 tracking-[-0.025em] text-slate-600">
                      <section className="space-y-4">
                        <span className="inline-block bg-[#001E45]/10 text-[#001E45] px-3 py-1 rounded-full text-xs font-bold">
                          대여 안내
                        </span>
                        <h4 className="text-2xl font-bold leading-9 text-slate-900">
                          간편하고 체계적인<br/>렌탈 견적 요청 절차
                        </h4>
                        <p className="text-[15px] text-slate-600">{guideDescription}</p>
                      </section>

                      <section className="border-t border-slate-100 pt-8">
                        <h5 className="text-lg font-bold text-slate-900 mb-6">견적 요청 진행 단계</h5>
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="bg-slate-50 p-5 rounded-2xl">
                            <div className="text-[#001E45] font-bold text-xl mb-2">01</div>
                            <h6 className="font-bold text-slate-900">견적 요청 요약</h6>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">상품 구성과 수량을 선택해 장바구니에 담아 주세요. 필요한 옵션을 함께 정리하실 수 있습니다.</p>
                          </div>
                          <div className="bg-slate-50 p-5 rounded-2xl">
                            <div className="text-[#001E45] font-bold text-xl mb-2">02</div>
                            <h6 className="font-bold text-slate-900">담당자 배정</h6>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">대여 일정과 요청사항을 접수하면 담당자가 배정되어 세부 사항을 안내해 드립니다.</p>
                          </div>
                          <div className="bg-slate-50 p-5 rounded-2xl">
                            <div className="text-[#001E45] font-bold text-xl mb-2">03</div>
                            <h6 className="font-bold text-slate-900">견적 확정</h6>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">제품 사양 확인 후 렌탈 견적을 확정하고 필요에 따라 추가 옵션이나 일정을 조율합니다.</p>
                          </div>
                          <div className="bg-slate-50 p-5 rounded-2xl">
                            <div className="text-[#001E45] font-bold text-xl mb-2">04</div>
                            <h6 className="font-bold text-slate-900">계약 및 배송</h6>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">계약 체결 후 약속된 일정에 제품을 배송하고 설치까지 완벽하게 진행해 드립니다.</p>
                          </div>
                        </div>
                      </section>

                      <section className="border-t border-slate-100 pt-8 space-y-4">
                        <h5 className="text-lg font-bold text-slate-900">유지보수 안내</h5>
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 text-slate-700 space-y-4">
                          <p>
                            렌탈 계약 기간 내 제품에 대한 <strong className="text-slate-900">정기 점검과 장애 발생 시 무상 수리 또는 교체 서비스</strong>를 제공합니다. 장애 접수 후 1영업일 이내 현장 방문 또는 원격 지원이 가능합니다.
                          </p>
                          <p>
                            계약 만료 시 반납, 연장, 재계약 중 선택 가능하며 견적 요청 시 원하시는 방식을 말씀해 주시면 맞춤 안내해 드립니다.
                          </p>
                        </div>
                      </section>

                      <section className="border-t border-slate-100 pt-8">
                        <h5 className="text-lg font-bold text-slate-900 mb-4">견적 요청 시 참고사항</h5>
                        <ul className="space-y-3">
                          <li className="flex items-start gap-2">
                            <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>배송 및 설치에 대한 상세 일정은 계약 시 별도 안내됩니다.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>계약 기간(단기/장기)에 따라 월 렌탈료가 달라질 수 있습니다.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>수량이 많은 대량 렌탈의 경우 별도의 맞춤 할인이 적용될 수 있습니다.</span>
                          </li>
                        </ul>
                      </section>
                    </article>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Sticky Summary & Banners */}
            <div className="lg:col-span-5 xl:col-span-4 lg:row-start-1">
              <div className="lg:sticky lg:top-24 space-y-6">
                
                {/* 1. Quote Request Summary Box */}
                <div className="bg-white rounded-[24px] p-6 border border-[#001E45]/10 shadow-[0_8px_24px_rgba(15,23,42,0.06)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#001E45]"></div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 flex items-center gap-2">
                    <ShoppingBag size={20} className="text-[#001E45]" />
                    견적 요청 요약
                  </h3>
                  <p className="text-[14px] text-gray-500 leading-relaxed mb-6 break-keep">
                    선택하신 구성을 바탕으로 대여 일정과 요청사항을 접수해 주시면 맞춤 렌탈 조건을 안내해 드립니다.
                  </p>

                  <SummaryRows rows={summaryRows} />
                  {selectedSummary.length > 0 && (
                    <SelectedOptionsSection
                      items={selectedSummary}
                      priceDisplayMode={priceDisplayMode}
                      priceDisplayLoading={priceDisplayLoading}
                    />
                  )}

                  <div className="mt-6 pt-5 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">예상 견적 비용</span>
                      <span className={getPublicPriceClassName({
                        mode: priceDisplayMode,
                        loading: priceDisplayLoading,
                        visibleClass: 'text-2xl font-bold text-[#001E45]',
                        hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                      })}>
                        {totalPriceText}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      onClick={() => openActionConfirm('booking')}
                      disabled={isBooking || product.stock === 0}
                      className="w-full flex-1 bg-[#001E45] text-white py-4 rounded-xl font-semibold hover:bg-[#002D66] transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                      {isBooking ? (
                        <>
                          <Loader2 className="animate-spin" size={20} /> 처리중...
                        </>
                      ) : product.stock === 0 ? (
                        "품절"
                      ) : (
                        "장바구니에서 견적 요청"
                      )}
                    </button>
                    <button
                      onClick={() => openActionConfirm('cart')}
                      className="w-full flex-1 bg-white text-[#001E45] py-3.5 rounded-xl font-semibold border border-[#001E45] hover:bg-sky-50 transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} />
                      장바구니 담기
                    </button>
                  </div>
                  
                  <p className="mt-4 text-[13px] text-center text-gray-500">
                    최종 견적 요청 시 영업일 기준 담당자가 연락드립니다.
                  </p>
                </div>

                {/* 2. Banners (Stacked vertically on Desktop, grid on Mobile) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 rounded-[20px] border border-gray-200 bg-white p-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50">
                      <span className="text-xl">💳</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-[13px]">
                        온라인 결제 없이 계약 진행
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        법인카드, 세금계산서 지원
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-[20px] border border-gray-200 bg-white p-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50">
                      <img
                        src="/cert-disabled.jpg"
                        alt="장애인등록기업"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-[13px]">장애인등록기업</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">공공기관 우선구매 대상</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-[20px] border border-gray-200 bg-white p-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50">
                      <img
                        src="/cert-mice.jpg"
                        alt="사무장비 렌탈 전문기업"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-[13px]">사무장비 렌탈 전문</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">복합기·노트북 렌탈 전문성</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-[20px] border border-gray-200 bg-white p-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50">
                      <span className="text-xl">🧾</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-[13px]">맞춤 조건 상담 진행</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">계약 기간별 맞춤 조건</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Layout updated successfully');
