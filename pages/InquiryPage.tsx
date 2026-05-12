import React, { useState, useEffect } from 'react';
import { Container } from '../components/ui/Container';
import { User, MessageSquare, Clock, Loader2, Plus, X, Send, ChevronDown, CheckCircle } from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import { Link } from 'react-router-dom';
import { getMyInquiries, addInquiry, Inquiry } from '../src/api/inquiryApi';
import { getFAQCategories } from '../src/api/faqApi';
import { normalizeLegacyFaqCategory, normalizeLegacyFaqCategoryList } from '../src/utils/faqCategoryPolicy';
import { trackInquiryComplete, trackOperationFailure } from '../src/utils/analytics';

export const InquiryPage: React.FC = () => {
    const { user, userProfile } = useAuth();
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [inquiryCategories, setInquiryCategories] = useState<string[]>([]);
    const [formData, setFormData] = useState({ title: '', content: '', category: '' });

    const loadInquiries = async () => {
        if (!user) return;
        try {
            const data = await getMyInquiries(user.uid);
            setInquiries(data);
        } catch (error) {
            console.error('Failed to load inquiries:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadInquiryCategories = async () => {
        try {
            // 정책: 문의 분류는 FAQ 카테고리와 동일 소스를 사용한다.
            const data = await getFAQCategories();
            const categories = normalizeLegacyFaqCategoryList(data.map((item) => item.name));
            setInquiryCategories(categories);
            setFormData((prev) => ({
                ...prev,
                category: categories.includes(prev.category) ? prev.category : (categories[0] || ''),
            }));
        } catch (error) {
            console.error('Failed to load inquiry categories:', error);
            setInquiryCategories([]);
            setFormData((prev) => ({ ...prev, category: '' }));
        }
    };

    useEffect(() => {
        if (!user) return;
        loadInquiries();
        loadInquiryCategories();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!formData.category) {
            alert('문의 카테고리를 먼저 설정해주세요. FAQ 카테고리 관리에서 추가할 수 있습니다.');
            return;
        }
        setSaving(true);
        try {
            await addInquiry({
                user_id: user.uid,
                user_name: userProfile?.name || '',
                user_email: userProfile?.email || user.email || '',
                company_name: userProfile?.company_name || '',
                category: formData.category,
                title: formData.title,
                content: formData.content,
            });
            trackInquiryComplete({
                category: formData.category,
                titleLength: formData.title.trim().length,
            });
            setFormData({ title: '', content: '', category: inquiryCategories[0] || '' });
            setShowForm(false);
            await loadInquiries();
        } catch (error) {
            console.error('Failed to submit inquiry:', error);
            trackOperationFailure({
                operation: 'inquiry_submit',
                source: 'inquiry_page',
                itemCount: 1,
                message: error instanceof Error ? error.message : 'Failed to submit inquiry',
            });
            alert('문의 등록에 실패했습니다. 테이블이 생성되었는지 확인해주세요.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `${date} ${time}`;
    };

    if (!user) {
        return (
            <div className="py-20 text-center">
                <p className="text-gray-500 mb-4">로그인이 필요합니다.</p>
                <Link to="/login" className="text-[#001E45] underline">로그인하기</Link>
            </div>
        );
    }

    return (
        <div className="py-12 bg-gray-50 min-h-screen">
            <Container>
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="md:w-1/4">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                            <div className="w-20 h-20 bg-[#B3C1D4] rounded-full mx-auto mb-4 flex items-center justify-center">
                                <User size={32} className="text-[#001E45]" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">{userProfile?.name || '고객'} 님</h2>
                            <p className="text-sm text-gray-500 mb-6">{userProfile?.email || user.email}</p>
                            <div className="text-left space-y-1 border-t border-gray-100 pt-4">
                                <Link to="/mypage" className="text-sm text-gray-500 block w-full text-left py-2 px-2 rounded hover:bg-gray-50 hover:text-black">
                                    대여 신청 내역
                                </Link>
                                <Link to="/quote-cart" className="text-sm text-gray-500 block w-full text-left py-2 px-2 rounded hover:bg-gray-50 hover:text-black">
                                    장바구니
                                </Link>
                                <Link to="/mypage/info" className="text-sm text-gray-500 block w-full text-left py-2 px-2 rounded hover:bg-gray-50 hover:text-black">
                                    내 정보 관리
                                </Link>
                                <Link to="/mypage/inquiry" className="text-sm font-semibold text-[#001E45] block w-full text-left py-2 px-2 rounded hover:bg-[#001E45]/5">
                                    1:1 문의 내역
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="md:w-3/4">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                                <MessageSquare size={24} /> 1:1 문의 내역
                            </h1>
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all font-semibold text-sm ${showForm ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                            >
                                {showForm ? <X size={18} /> : <Plus size={18} />}
                                {showForm ? '작성 취소' : '문의하기'}
                            </button>
                        </div>

                        {/* Inquiry Form */}
                        {showForm && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6 animate-fadeIn">
                                <h3 className="font-semibold text-lg text-gray-900 mb-4">새 문의 작성</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">문의 분류</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                disabled={inquiryCategories.length === 0}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-4 focus:ring-[#001E45]/10 focus:border-[#001E45] outline-none transition-all font-medium appearance-none"
                                                required
                                            >
                                                {inquiryCategories.length > 0 ? (
                                                    inquiryCategories.map((category) => (
                                                        <option key={category} value={category}>
                                                            {category}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="">카테고리 없음</option>
                                                )}
                                            </select>
                                            {inquiryCategories.length === 0 && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    문의 카테고리가 없습니다. 관리자에서 FAQ 카테고리를 먼저 등록해주세요.
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">제목</label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="문의 제목을 입력해주세요"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-4 focus:ring-[#001E45]/10 focus:border-[#001E45] outline-none transition-all font-medium"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">문의 내용</label>
                                        <textarea
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            placeholder="문의하실 내용을 자세히 적어주세요"
                                            rows={6}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-4 focus:ring-[#001E45]/10 focus:border-[#001E45] outline-none transition-all font-medium resize-none"
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="flex items-center gap-2 bg-[#001E45] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#002D66] shadow-lg shadow-[#001E45]/20 transition-all disabled:bg-gray-300 disabled:shadow-none"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                            문의 등록
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Inquiry List */}
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="animate-spin text-[#001E45]" size={40} />
                            </div>
                        ) : inquiries.length === 0 ? (
                            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                                <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500 mb-2 font-medium">등록된 문의가 없습니다.</p>
                                <p className="text-gray-400 text-sm">궁금한 점이 있으시면 문의하기 버튼을 눌러주세요.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {inquiries.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${expandedId === item.id ? 'ring-2 ring-gray-900 ring-opacity-5' : 'hover:shadow-md hover:-translate-y-0.5'}`}
                                    >
                                        <button
                                            onClick={() => setExpandedId(expandedId === item.id ? null : (item.id || null))}
                                            className="w-full px-6 py-6 text-left"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    {item.status === 'answered' ? (
                                                        <span className="px-3 py-1 bg-[#001E45] text-white text-[10px] uppercase tracking-wider font-semibold rounded-md shadow-sm">
                                                            답변완료
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] uppercase tracking-wider font-semibold rounded-md border border-gray-200">
                                                            답변대기
                                                        </span>
                                                    )}
                                                    <span className="text-gray-300 mx-1 font-light text-xs">|</span>
                                                    <span className="text-[12px] font-semibold text-gray-700">
                                                        {normalizeLegacyFaqCategory(item.category || '미분류')}
                                                    </span>
                                                </div>
                                                <div className="text-[12px] font-medium text-gray-400">
                                                    {formatDate(item.created_at!)}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-start justify-between gap-4">
                                                <h3 className={`text-lg leading-snug flex-1 ${expandedId === item.id ? 'font-semibold text-gray-900' : 'font-semibold text-gray-800'}`}>
                                                    {item.title}
                                                </h3>
                                                <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${expandedId === item.id ? 'rotate-180 bg-gray-100' : ''}`}>
                                                    <ChevronDown size={18} className="text-gray-400" />
                                                </div>
                                            </div>
                                        </button>

                                        {expandedId === item.id && (
                                            <div className="px-6 pb-6 animate-fadeIn">
                                                <div className="h-px bg-gray-100 mb-6 w-full" />
                                                
                                                <div className="space-y-8">
                                                    {/* Question Section */}
                                                    <div className="flex gap-4 sm:gap-6">
                                                        <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center font-semibold text-lg flex-shrink-0 border border-gray-200/50">
                                                            Q
                                                        </div>
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-tight">나의 문의 내용</span>
                                                                <span className="text-[10px] font-medium text-gray-300">{formatDate(item.created_at!)}</span>
                                                            </div>
                                                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                                                <p className="text-[15px] font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                                    {item.content}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Answer Section */}
                                                    {item.status === 'answered' && item.answer ? (
                                                        <div className="flex gap-4 sm:gap-6">
                                                            <div className="w-10 h-10 rounded-2xl bg-[#001E45] text-white flex items-center justify-center font-semibold text-lg flex-shrink-0 shadow-lg shadow-[#001E45]/20">
                                                                A
                                                            </div>
                                                            <div className="flex-1 space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-semibold text-[#001E45] uppercase tracking-tight">렌탈어때 답변</span>
                                                                        <CheckCircle size={10} className="text-[#001E45]" />
                                                                    </div>
                                                                    <span className="text-[10px] font-medium text-gray-300">{formatDate(item.answered_at!)}</span>
                                                                </div>
                                                                <div className="bg-white rounded-2xl p-5 border-2 border-[#001E45]/10 shadow-sm">
                                                                    <p className="text-[15px] font-semibold text-gray-800 leading-relaxed whitespace-pre-wrap italic">
                                                                        "{item.answer}"
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-4 sm:gap-6">
                                                            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0 border border-amber-100">
                                                                <Clock size={20} className="animate-pulse" />
                                                            </div>
                                                            <div className="flex-1 space-y-2">
                                                                <span className="text-xs font-semibold text-amber-600 uppercase tracking-tight">진행 상태</span>
                                                                <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100/50">
                                                                    <p className="text-[14px] font-semibold text-amber-700">
                                                                        문의가 접수되었습니다. 담당자가 상세 내용을 검토 중입니다.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
};

