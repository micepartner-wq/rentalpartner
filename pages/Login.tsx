import React, { useState, useEffect } from 'react';
import { Container } from '../components/ui/Container';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { auth } from '../src/firebase';
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth';
import { getUserProfileByFirebaseUid } from '../src/api/userApi';
import { getAuthErrorMessage } from '../src/utils/authErrors';
import { getMissingSupabaseTableName, isMissingSupabaseTableError } from '../src/utils/supabaseErrors';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [rememberId, setRememberId] = useState(false);
    const [keepLoggedIn, setKeepLoggedIn] = useState(false);

    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setFormData(prev => ({ ...prev, email: savedEmail }));
            setRememberId(true);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 이메일 저장 처리
            if (rememberId) {
                localStorage.setItem('rememberedEmail', formData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            // 로그인 상태 유지 설정
            await setPersistence(auth, keepLoggedIn ? browserLocalPersistence : browserSessionPersistence);

            const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            
            // 승인 여부 확인
            const profile = await getUserProfileByFirebaseUid(userCredential.user.uid);

            if (!profile) {
                await auth.signOut();
                alert('회원 프로필이 등록되지 않았습니다. 관리자에게 문의해주세요.');
                return;
            }

            if (!profile.is_approved) {
                await auth.signOut();
                alert('관리자 승인이 필요한 계정입니다. 승인 완료 후 이용해주세요.');
                return;
            }

            navigate('/');
        } catch (error: any) {
            console.error('Login failed', error);
            if (isMissingSupabaseTableError(error)) {
                await auth.signOut().catch(() => undefined);
                const tableName = getMissingSupabaseTableName(error) || 'public.user_profiles';
                alert(
                    `로그인은 되었지만 DB 테이블(${tableName})이 없어 인증 검증을 완료할 수 없습니다.\n` +
                    `Supabase에서 초기 스키마 SQL을 먼저 실행해주세요.`
                );
                return;
            }

            const message = getAuthErrorMessage(error.code);
            alert(`로그인에 실패했습니다: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-20 bg-gray-50 min-h-screen flex items-center justify-center px-4">
            <Helmet>
                <title>로그인 | 렌탈어때</title>
                <meta name="description" content="렌탈어때 로그인 페이지입니다." />
                <meta name="robots" content="noindex, nofollow" />
                <link rel="canonical" href="https://rentalpartner.kr/login" />
            </Helmet>
            <Container>
                <div className="w-full max-w-xl md:max-w-3xl mx-auto bg-white p-6 md:p-16 rounded-3xl shadow-lg border border-gray-100 mb-20">
                    <div className="text-center mb-6 md:mb-10">
                        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">로그인</h1>
                        <p className="text-gray-500 text-sm md:text-base mt-2 md:mt-3">렌탈어때 서비스 이용을 위해 로그인해주세요.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                        <div>
                            <label className="block text-sm md:text-base font-medium text-gray-700 mb-1 md:mb-2">이메일</label>
                            <input
                                type="email"
                                name="email"
                                required
                                className="w-full px-4 py-3 md:px-5 md:py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#001E45] focus:border-transparent outline-none transition-all text-base md:text-lg"
                                placeholder="example@email.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm md:text-base font-medium text-gray-700 mb-1 md:mb-2">비밀번호</label>
                            <input
                                type="password"
                                name="password"
                                required
                                className="w-full px-4 py-3 md:px-5 md:py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#001E45] focus:border-transparent outline-none transition-all text-base md:text-lg"
                                placeholder="비밀번호를 입력하세요"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="flex items-center justify-between py-1 md:py-2">
                            <div className="flex items-center gap-4 md:gap-6">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            className="peer sr-only" 
                                            checked={rememberId}
                                            onChange={(e) => setRememberId(e.target.checked)}
                                        />
                                        <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-gray-300 rounded peer-checked:bg-[#001E45] peer-checked:border-[#001E45] transition-all"></div>
                                        <svg className="absolute w-2.5 h-2.5 md:w-3 md:h-3 text-white left-0.5 top-0.5 md:left-1 md:top-1 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <span className="text-xs md:text-sm text-gray-600 group-hover:text-gray-900 transition-colors">아이디 저장</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            className="peer sr-only" 
                                            checked={keepLoggedIn}
                                            onChange={(e) => setKeepLoggedIn(e.target.checked)}
                                        />
                                        <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-gray-300 rounded peer-checked:bg-[#001E45] peer-checked:border-[#001E45] transition-all"></div>
                                        <svg className="absolute w-2.5 h-2.5 md:w-3 md:h-3 text-white left-0.5 top-0.5 md:left-1 md:top-1 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <span className="text-xs md:text-sm text-gray-600 group-hover:text-gray-900 transition-colors">로그인 상태 유지</span>
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full text-white py-3 md:py-4 rounded-lg font-semibold transition-all mt-4 md:mt-6 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#001E45] hover:bg-[#002D66]'}`}
                        >
                            {loading ? '로그인 중...' : '로그인하기'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        계정이 없으신가요? <Link to="/signup" className="text-[#001E45] font-semibold hover:underline">회원가입</Link>
                    </div>
                </div>
            </Container>
        </div>
    );
};

