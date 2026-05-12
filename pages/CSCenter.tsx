import React, { useState, useEffect } from 'react';
import { Container } from '../components/ui/Container';
import { Phone, MessageCircle, ChevronDown, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getFAQs, FAQ, getFAQCategories } from '../src/api/faqApi';
import {
    DEFAULT_CS_CENTER_SETTINGS,
    getCSCenterSettings,
    type CSCenterSettings
} from '../src/api/siteSettingsApi';
import {
    deriveCategoriesFromFaqs,
    normalizeLegacyFaqCategory,
    normalizeLegacyFaqCategoryList
} from '../src/utils/faqCategoryPolicy';


export const CSCenter: React.FC = () => {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [csCenterSettings, setCsCenterSettings] = useState<CSCenterSettings>(DEFAULT_CS_CENTER_SETTINGS);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [faqResult, categoryResult, settingsResult] = await Promise.allSettled([
                    getFAQs(),
                    getFAQCategories(),
                    getCSCenterSettings()
                ]);

                const faqData = faqResult.status === 'fulfilled' ? faqResult.value : [];
                const normalizedFaqs = faqData.map((item) => ({
                    ...item,
                    category: normalizeLegacyFaqCategory(item.category)
                }));
                setFaqs(normalizedFaqs);

                if (categoryResult.status === 'fulfilled') {
                    setCategories(normalizeLegacyFaqCategoryList(categoryResult.value.map((c) => c.name)));
                } else {
                    // Fallback for category-table read failure only: infer from FAQ rows.
                    setCategories(deriveCategoriesFromFaqs(normalizedFaqs));
                }

                if (settingsResult.status === 'fulfilled') {
                    setCsCenterSettings(settingsResult.value);
                }
            } catch (error) {
                console.error('Failed to load data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        setActiveCategory((prev) => {
            if (prev && categories.includes(prev)) {
                return prev;
            }
            return categories[0] || '';
        });
    }, [categories]);

    const toggleAccordion = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const filteredFAQ = faqs.filter(item => {
        return activeCategory ? item.category === activeCategory : false;
    });

    return (
        <div className="pb-32 bg-white min-h-screen">
            <Helmet>
                <title>고객센터 | 렌탈어때</title>
                <meta name="description" content="렌탈어때 고객센터입니다. 자주 묻는 질문부터 실시간 상담까지 도와드립니다." />
                <link rel="canonical" href="https://rentalpartner.kr/cs" />
            </Helmet>

            <Container>
                {/* Header Section */}
                <div className="py-10 md:py-16 text-left">
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4">고객센터</h1>
                    <p className="text-slate-500 font-medium">어려움이나 궁금한 점이 있으신가요?</p>
                </div>

                {/* CS Info Card */}
                <div className="bg-slate-50 rounded-3xl p-6 md:p-10 mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400">
                            <Phone size={24} className="md:w-8 md:h-8" />
                        </div>
                        <div>
                            <div className="text-2xl md:text-3xl font-semibold text-slate-900 mb-1">{csCenterSettings.phone}</div>
                            <div className="text-xs md:text-sm text-slate-500 font-medium space-y-0.5">
                                <p>{csCenterSettings.business_hours_text}</p>
                                <p>{csCenterSettings.chat_hours_text}</p>
                            </div>
                        </div>
                    </div>

                    <a
                        href={csCenterSettings.chat_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full md:w-auto px-8 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 font-semibold text-slate-700 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <MessageCircle size={20} className="text-slate-400" />
                        채팅 상담
                    </a>
                </div>

                {/* FAQ Section */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-6">자주 묻는 질문</h2>

                    {/* Category Tabs */}
                    {categories.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-8 -mx-[0.8rem] px-[0.8rem] md:mx-0 md:px-0">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`
                                        whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-semibold transition-all
                                        ${activeCategory === cat
                                            ? 'bg-[#001E45] text-white'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }
                                    `}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    ) : (
                        !loading && (
                            <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                FAQ 카테고리가 아직 등록되지 않았습니다. 관리자에서 카테고리를 먼저 생성해주세요.
                            </div>
                        )
                    )}

                    {/* FAQ List (Accordion) */}
                    <div className="border-t border-slate-100">
                        {loading ? (
                            <div className="py-20 flex justify-center">
                                <Loader2 className="animate-spin text-[#001E45]" size={40} />
                            </div>
                        ) : activeCategory && filteredFAQ.length > 0 ? (
                            filteredFAQ.map(item => (
                                <div key={item.id} className="border-b border-slate-100">
                                    <button
                                        onClick={() => toggleAccordion(item.id!)}
                                        className="w-full py-5 flex items-center gap-3 text-left hover:bg-slate-50/50 transition-colors px-2"
                                    >
                                        <span className="text-[#001E45] font-semibold text-lg">Q</span>
                                        <span className="flex-1 font-semibold text-slate-800 text-[15px] md:text-base leading-snug">
                                            {item.question}
                                        </span>
                                        <span className={`text-slate-300 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}>
                                            <ChevronDown size={20} />
                                        </span>
                                    </button>

                                    {expandedId === item.id && (
                                        <div className="px-10 pb-6 pt-1 animate-fadeIn">
                                            <div className="bg-slate-50 p-5 rounded-2xl text-slate-600 text-sm md:text-[15px] leading-relaxed font-medium whitespace-pre-wrap">
                                                {item.answer}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : activeCategory ? (
                            <div className="py-20 text-center text-slate-400 font-medium">
                                해당 카테고리에 등록된 질문이 없습니다.
                            </div>
                        ) : (
                            <div className="py-20 text-center text-slate-400 font-medium">
                                표시할 FAQ 카테고리가 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
};

