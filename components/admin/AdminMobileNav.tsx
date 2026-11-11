import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck, LayoutDashboard, LogOut, MessageSquare, Menu, X, ExternalLink } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { AppInstallCard } from './AdminPwa';
import { adminNavGroups } from './adminNavigation';

export function useAdminCounts(refreshKey: string) {
  const [counts, setCounts] = useState<{ quotes: number | null; inquiries: number | null }>({ quotes: null, inquiries: null });
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setCounts({ quotes: null, inquiries: null });
    (async () => {
      const results = await Promise.allSettled([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      const countAt = (index: number) => { const result = results[index]; return result.status === 'fulfilled' && !result.value.error ? result.value.count : null; };
      if (active) { setCounts({ quotes: countAt(0), inquiries: countAt(1) }); setLoading(false); }
    })();
    return () => { active = false; };
  }, [refreshKey, revision]);
  return { ...counts, loading, refresh: () => setRevision(value => value + 1) };
}

interface Props {
  counts: { quotes: number | null; inquiries: number | null };
  isActive: (path: string, exact?: boolean) => boolean;
  onLogout: () => void;
}

export function AdminMobileNav({ counts, isActive, onLogout }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (moreOpen) dialog.showModal(); else dialog.close();
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (media.matches) setMoreOpen(false); };
    media.addEventListener('change', closeOnDesktop);
    return () => { document.body.style.overflow = previous; media.removeEventListener('change', closeOnDesktop); };
  }, [moreOpen]);
  const tabs = [
    { path: '/admin', label: '운영 홈', icon: LayoutDashboard, exact: true, badge: null },
    { path: '/admin/rental-requests', label: '견적', icon: CalendarCheck, badge: counts.quotes },
    { path: '/admin/inquiries', label: '문의', icon: MessageSquare, badge: counts.inquiries },
  ];
  const moreActive = moreOpen || !tabs.some(tab => isActive(tab.path, tab.exact));
  return <div className="admin-mobile">
    <nav aria-label="모바일 관리자 메뉴" className="admin-mobile-tabs">
      {tabs.map(tab => <Link key={tab.path} to={tab.path} className={isActive(tab.path, tab.exact) ? 'is-active' : ''} aria-current={isActive(tab.path, tab.exact) ? 'page' : undefined}><tab.icon size={21} /><span>{tab.label}</span>{tab.badge != null && tab.badge > 0 && <b aria-label={`${tab.badge}건`}>{tab.badge > 99 ? '99+' : tab.badge}</b>}</Link>)}
      <button type="button" className={moreActive ? 'is-active' : ''} onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}><Menu size={21} /><span>전체 메뉴</span></button>
    </nav>
    <dialog ref={dialogRef} className="admin-menu-dialog" aria-labelledby="admin-menu-title" onClose={() => setMoreOpen(false)} onClick={event => { if (event.target === event.currentTarget) setMoreOpen(false); }}>
      <div className="admin-menu-inner"><div className="admin-menu-heading"><div><small>렌탈어때 관리</small><h2 id="admin-menu-title">전체 메뉴</h2></div><button type="button" autoFocus onClick={() => setMoreOpen(false)} aria-label="메뉴 닫기"><X size={22} /></button></div>
        {adminNavGroups.map(group => <section className="admin-mobile-group" key={group.label}><h3>{group.label}</h3>{group.items.map(item => <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)} className={isActive(item.path, item.exact) ? 'is-active' : ''} aria-current={isActive(item.path, item.exact) ? 'page' : undefined}><item.icon size={19} />{item.label}</Link>)}</section>)}
        <div className="admin-mobile-extras"><Link to="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={17} />고객 사이트 보기</Link><AppInstallCard /><button type="button" onClick={onLogout}><LogOut size={17} />로그아웃</button></div>
      </div>
    </dialog>
  </div>;
}
