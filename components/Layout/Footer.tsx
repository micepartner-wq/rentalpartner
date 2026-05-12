import React, { useEffect, useState } from 'react';
import { Container } from '../ui/Container';
import { ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getQuoteCartCount } from '../../src/utils/quoteCart';

export function Footer() {
    const [quoteCartCount, setQuoteCartCount] = useState(0);
    const { pathname } = useLocation();
    const hideMobileFloatingButtons =
        pathname.startsWith('/products/') || pathname.startsWith('/p/');

    useEffect(() => {
        const updateCartCount = () => {
            setQuoteCartCount(getQuoteCartCount());
        };

        updateCartCount();
        window.addEventListener('quoteCartUpdated', updateCartCount);

        return () => window.removeEventListener('quoteCartUpdated', updateCartCount);
    }, []);

    return (
        <footer className="bg-white border-t border-gray-200 pt-0 pb-24 md:pb-20 text-[14px] text-gray-600">
            {/* TOP LAYER: Links (Full width border) */}
            <div className="w-full border-b border-gray-200 py-5 mb-12">
                <Container>
                    <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 text-[13px] md:text-[14px] font-semibold text-gray-600">
                        <Link to="/" className="hover:text-black transition-colors whitespace-nowrap flex items-center h-full">홈</Link>
                        <span className="w-px h-3.5 bg-gray-200 hidden md:block"></span>
                        <Link to="/cs" className="hover:text-[#001E45] font-semibold text-[#001E45] transition-colors whitespace-nowrap flex items-center h-full">고객센터</Link>
                        <span className="w-px h-3.5 bg-gray-200 hidden md:block"></span>
                        <a href="https://humanpartner.kr/" className="cursor-pointer hover:text-black transition-colors whitespace-nowrap flex items-center h-full">회사소개</a>
                        <span className="w-px h-3.5 bg-gray-200 hidden md:block"></span>
                        <Link to="/terms" className="cursor-pointer hover:text-black transition-colors whitespace-nowrap flex items-center h-full">이용약관</Link>
                        <span className="w-px h-3.5 bg-gray-200 hidden md:block"></span>
                        <Link to="/privacy" className="cursor-pointer hover:text-black font-semibold text-gray-800 transition-colors whitespace-nowrap flex items-center h-full">개인정보처리방침</Link>
                    </div>
                </Container>
            </div>

            <Container>
                {/* BOTTOM LAYER: 3 Columns on PC */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-12 lg:gap-16">

                    {/* LEFT: CS & Bank (Horizontal on Tablet/PC) */}
                    <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 shrink-0">
                        {/* C/S CENTER */}
                        <div className="w-full sm:w-auto">
                            <h3 className="font-semibold text-gray-800 mb-3 text-[13px] md:text-[14px] tracking-wide">C/S CENTER</h3>
                            <div className="text-2xl font-semibold text-gray-900 mb-2 tracking-tight">1800-1985</div>
                            <div className="text-gray-500 text-[13px] md:text-[14px] leading-relaxed">
                                <p>평일 09:00~18:00 (점심 12:00~13:00)</p>
                                <p>주말 및 공휴일 휴무</p>
                            </div>
                        </div>

                        {/* BANK ACCOUNT */}
                        <div className="flex items-start pt-8 sm:pt-0 border-t sm:border-t-0 border-gray-100 relative sm:pl-12">
                            {/* Vertical Divider for Tablet/PC */}
                            <div className="hidden sm:block absolute left-0 top-1 w-px h-[90px] bg-gray-100"></div>

                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3 text-[13px] md:text-[14px] tracking-wide">입금계좌</h3>
                                <div className="text-gray-800 font-semibold text-[14px] mb-1 tracking-tight">
                                    <span className="text-[#001E45]">하나은행</span> 734-910239-17507
                                </div>
                                <div className="text-gray-500 text-[13px] md:text-[14px]">
                                    예금주 : humanpartner (이기섭)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Company Text */}
                    <div className="flex-1 lg:pl-12 pt-8 lg:pt-0 border-t lg:border-t-0 border-gray-100 w-full relative">
                        {/* Vertical Divider for PC */}
                        <div className="hidden lg:block absolute left-0 top-1 w-px h-[90px] bg-gray-100"></div>

                        <div className="text-[13px] md:text-[14px] leading-7 md:leading-8 text-gray-500">
                            <p>
                                법인명(상호) : 휴먼파트너 <span className="mx-2 text-gray-300">|</span> 대표자(성명) : 이기섭 <span className="mx-2 text-gray-300">|</span> 사업자 등록번호 : 305-30-85537
                            </p>
                            <p>
                                통신판매업 신고 : 2025-대전대덕-0526 &nbsp; <span className="underline cursor-pointer hover:text-gray-800 transition-colors">[사업자정보확인]</span>
                            </p>
                            <p>
                                전화 : 010-4074-6967 <span className="mx-2 text-gray-300">|</span> 주소 : 대전광역시 대덕구 대화로106번길 66 펜타플렉스 705호 34365
                            </p>
                            <p>
                                개인정보보호책임자 : 이기섭(micepartner@micepartner.co.kr)
                            </p>
                            <p className="mt-6 text-[13px] md:text-[14px] text-gray-400 font-medium">
                                Copyright © 2024 렌탈어때. All rights reserved.
                            </p>
                        </div>
                    </div>

                </div>

                <div
                    className={`fixed right-4 md:right-6 z-40 flex-col gap-2 ${hideMobileFloatingButtons ? 'hidden md:flex md:bottom-6' : 'flex bottom-24 md:bottom-6'}`}
                >
                    <Link
                        to="/quote-cart"
                        className="w-12 h-12 rounded-[4px] bg-[#001E45] text-white hover:bg-[#002a5e] transition-all flex items-center justify-center relative group shadow-lg"
                        aria-label="장바구니 이동"
                        title="장바구니"
                    >
                        <ShoppingCart size={22} className="group-hover:scale-110 transition-transform" />
                        {quoteCartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full">
                                {quoteCartCount > 99 ? '99+' : quoteCartCount}
                            </span>
                        )}
                    </Link>

                    <a
                        href="http://pf.kakao.com/_iRxghX/chat"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-12 h-12 rounded-[4px] hover:scale-110 transition-all overflow-hidden"
                        aria-label="카카오톡 채널 상담"
                        title="카카오톡 상담"
                    >
                        <img src="/kakao.png" alt="카카오톡 채널" className="w-full h-full object-cover" />
                    </a>
                </div>
            </Container>
        </footer>
    );
}
