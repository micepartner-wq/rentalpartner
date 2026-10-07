import React, { useEffect, useState } from 'react';
import { getPopups, Popup } from '../../src/api/cmsApi';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PopupManager: React.FC = () => {
    const [popups, setPopups] = useState<Popup[]>([]);
    const [loading, setLoading] = useState(true);
    // 화면 크기는 렌더 때 한 번만 읽지 않고 변경(회전, 주소창 변화)에 맞춰 갱신한다.
    // 모바일에서 vh 는 주소창/하단 바를 뺀 실제 보이는 높이보다 커서, innerHeight 로 계산한다.
    const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
    const isMobile = viewport.w <= 640;

    useEffect(() => {
        const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
        };
    }, []);

    useEffect(() => {
        const fetchPopups = async () => {
            try {
                const now = new Date();
                const data = await getPopups();

                // Client-side filtering for active status and date range
                // Also check LocalStorage for "Don't show today"
                const activePopups = data.filter(p => {
                    if (!p.is_active) return false;

                    // Date Check
                    if (p.start_date) {
                        const start = new Date(p.start_date);
                        start.setHours(0, 0, 0, 0);
                        if (now < start) return false;
                    }
                    if (p.end_date) {
                        const end = new Date(p.end_date);
                        end.setHours(23, 59, 59, 999);
                        if (now > end) return false;
                    }

                    // LocalStorage Check
                    const hideDate = localStorage.getItem(`hide_popup_${p.id}`);
                    if (hideDate) {
                        const today = new Date().toDateString();
                        if (hideDate === today) return false;
                    }

                    return true;
                });

                setPopups(activePopups);
            } catch (error) {
                console.error("Failed to load popups", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPopups();
    }, []);

    const closePopup = (id: string, hideToday: boolean = false) => {
        if (hideToday) {
            localStorage.setItem(`hide_popup_${id}`, new Date().toDateString());
        }
        setPopups(prev => prev.filter(p => p.id !== id));
    };

    if (loading || popups.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center sm:block sm:inset-auto">
            {/* Mobile: Modal Style (One by one or stacked) */}
            {/* Desktop: Draggable or Fixed positions. For simplicity, we center them or stack them with slight offset */}

            {/* 모바일: 팝업 바깥(어두운 배경)을 누르면 가장 위의 팝업이 닫힌다 */}
            {isMobile && (
                <button
                    type="button"
                    aria-label="팝업 닫기"
                    onClick={() => closePopup(popups[popups.length - 1].id!)}
                    className="pointer-events-auto fixed inset-0 bg-black/40"
                    style={{ zIndex: 999 }}
                />
            )}

            {popups.map((popup, index) => (
                <div
                    key={popup.id}
                    className="pointer-events-auto fixed bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col border border-slate-200"
                    style={{
                        top: isMobile ? '50%' : '100px',
                        left: isMobile ? '50%' : `${100 + (index * 20)}px`,
                        transform: isMobile ? 'translate(-50%, -50%)' : 'none',
                        zIndex: 1000 + index,
                        maxWidth: '90vw',
                        width: '400px',
                        maxHeight: isMobile ? Math.floor(viewport.h * 0.8) : '80vh'
                    }}
                >
                    {/* Image / Content */}
                    <div className="relative flex-1 bg-slate-50 min-h-[200px] overflow-hidden flex items-center justify-center">
                        {/* 모서리 닫기 버튼: 하단 작은 글자 외에 쉽게 누를 수 있는 닫기 */}
                        <button
                            type="button"
                            aria-label="팝업 닫기"
                            onClick={() => closePopup(popup.id!)}
                            className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
                        >
                            <X size={20} />
                        </button>
                        {/* Link wrapper if link or target_product_code exists */}
                        {(popup.target_product_code || popup.link) ? (
                            popup.link && popup.link.startsWith('http') ? (
                                <a
                                    href={popup.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full h-full block"
                                    onClick={() => closePopup(popup.id!)}
                                >
                                    <img
                                        src={popup.image_url || 'https://via.placeholder.com/400x400?text=Popup'}
                                        alt={popup.title}
                                        className="w-full h-auto max-h-full object-contain"
                                    />
                                </a>
                            ) : (
                                <Link
                                    to={popup.target_product_code ? `/p/${popup.target_product_code}` : (popup.link || '/')}
                                    className='w-full h-full block'
                                    onClick={() => closePopup(popup.id!)}
                                >
                                    <img
                                        src={popup.image_url || 'https://via.placeholder.com/400x400?text=Popup'}
                                        alt={popup.title}
                                        className="w-full h-auto max-h-full object-contain"
                                    />
                                </Link>
                            )
                        ) : (
                            <img
                                src={popup.image_url || 'https://via.placeholder.com/400x400?text=Popup'}
                                alt={popup.title}
                                className="w-full h-auto max-h-full object-contain"
                            />
                        )}
                    </div>

                    {/* Footer Actions: 터치하기 쉽도록 버튼 높이를 44px 이상으로 */}
                    <div className="bg-slate-900 text-white px-2 flex justify-between items-center text-sm">
                        <button
                            type="button"
                            onClick={() => closePopup(popup.id!, true)}
                            className="min-h-[44px] px-2 text-slate-300 hover:text-white transition-colors text-xs sm:text-xs"
                        >
                            오늘 하루 보지 않기
                        </button>
                        <button
                            type="button"
                            onClick={() => closePopup(popup.id!)}
                            className="min-h-[44px] min-w-[64px] px-2 font-semibold flex items-center justify-center gap-1 hover:text-slate-300 transition-colors"
                        >
                            닫기 <X size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
