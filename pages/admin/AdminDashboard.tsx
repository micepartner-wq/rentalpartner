import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, LogOut, Package, CalendarCheck, MessageSquare, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '../../src/context/AuthContext';
import { AdminPwaHead } from '../../components/admin/AdminPwa';
import { AdminMobileNav, useAdminCounts } from '../../components/admin/AdminMobileNav';
import { adminHome, adminNavGroups, adminNavItems, isAdminPathActive, type AdminNavItem } from '../../components/admin/adminNavigation';
import '../../components/admin/admin.css';

export const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();
  const isActive = (path: string, exact?: boolean) => isAdminPathActive(location.pathname, path, exact);
  const isRoot = isActive('/admin', true);
  const counts = useAdminCounts(location.pathname);
  const current = adminNavItems.find(item => isActive(item.path, item.exact));
  const group = adminNavGroups.find(group => group.items.some(item => isActive(item.path)));
  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) { await logout(); navigate('/admin/login'); }
  };
  const navLink = (item: AdminNavItem) => {
    const Icon = item.icon;
    const active = isActive(item.path, item.exact);
    const count = item.path === '/admin/rental-requests' ? counts.quotes : item.path === '/admin/inquiries' ? counts.inquiries : null;
    return <Link key={item.path} to={item.path} className={`admin-nav-link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
      <Icon size={18} aria-hidden="true" /><span>{item.label}</span>
      {count != null && count > 0 && <span className="admin-nav-count">{count > 99 ? '99+' : count}</span>}
    </Link>;
  };
  return (
    <div className="admin-workspace">
      <AdminPwaHead />
      <a className="admin-skip" href="#admin-content">본문 바로가기</a>
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/admin"><span className="admin-brand-mark"><Package size={23} /></span><span>렌탈어때<small>관리자 워크스페이스</small></span></Link>
        <nav aria-label="관리자 주 메뉴" className="admin-navigation">{navLink(adminHome)}{adminNavGroups.map(group => <div className="admin-nav-group" key={group.label}><p>{group.label}</p>{group.items.map(navLink)}</div>)}</nav>
        <div className="admin-sidebar-footer"><Link to="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />고객 사이트 보기<ArrowUpRight size={15} /></Link></div>
      </aside>
      <div className="admin-body">
        <header className="admin-topbar">
          <div className="admin-breadcrumb"><Link to="/admin">렌탈어때 관리</Link><span>/</span><strong>{group?.label || (isRoot ? '운영 홈' : '상품 관리')}</strong></div>
          <div className="admin-account"><span className="admin-avatar">{userProfile?.name?.charAt(0) || '관'}</span><span className="admin-account-name">{userProfile?.name || '관리자'}<small>관리자</small></span><button onClick={handleLogout} aria-label="로그아웃" title="로그아웃"><LogOut size={18} /></button></div>
        </header>
        <main id="admin-content" className="admin-content" tabIndex={-1}>
          {isRoot ? <div className="admin-home">
            <section className="admin-page-heading"><div><p className="admin-eyebrow">WORKSPACE</p><h1>오늘의 운영</h1><p>안녕하세요, {userProfile?.name || '관리자'}님. 처리할 업무부터 확인해 보세요.</p></div><Link to="/admin/products" className="admin-primary-link"><Package size={17} />상품 관리<ArrowUpRight size={16} /></Link></section>
            <section aria-labelledby="admin-tasks-title">
              <div className="admin-section-heading"><h2 id="admin-tasks-title">처리할 업무</h2><button className="admin-refresh" onClick={counts.refresh} disabled={counts.loading}><RefreshCw size={14} className={counts.loading ? 'animate-spin' : ''} />새로고침</button></div>
              <div className="admin-task-grid">
                {[{ path: '/admin/rental-requests', label: '대기 중인 견적', detail: '접수된 견적 요청을 확인해 주세요.', count: counts.quotes, icon: CalendarCheck, color: 'amber' }, { path: '/admin/inquiries', label: '답변 대기 문의', detail: '고객이 답변을 기다리고 있습니다.', count: counts.inquiries, icon: MessageSquare, color: 'blue' }].map(task => <Link key={task.path} to={task.path} className={`admin-task-card ${task.color}`}>
                  <div className="admin-task-top"><span className="admin-task-icon"><task.icon size={22} /></span><ArrowUpRight size={20} /></div>
                  <h3>{task.label}</h3><div className="admin-task-number" aria-live="polite">{task.count ?? '—'}<span>건</span></div>
                  <p>{counts.loading ? '업무 현황을 확인하고 있습니다.' : task.count === null ? '현황을 불러오지 못했습니다. 다시 시도해 주세요.' : task.count === 0 ? '현재 대기 중인 업무가 없습니다.' : task.detail}</p>
                  <span className="admin-task-action">목록 확인<ArrowRight size={16} /></span>
                </Link>)}
              </div>
            </section>
            <section aria-labelledby="admin-quick-title"><div className="admin-section-heading"><h2 id="admin-quick-title">자주 쓰는 작업</h2><span>바로 이동</span></div><div className="admin-quick-grid">{['/admin/products', '/admin/menus', '/admin/cms'].map(path => { const item = adminNavItems.find(item => item.path === path)!; const Icon = item.icon; return <Link key={path} to={path}><span className="admin-quick-icon"><Icon size={20} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowUpRight size={17} /></Link>; })}</div></section>
            <section aria-labelledby="admin-directory-title"><div className="admin-section-heading"><h2 id="admin-directory-title">업무별 메뉴</h2><span>필요한 기능을 찾아보세요</span></div><div className="admin-directory">{adminNavGroups.map((group, index) => <div className="admin-directory-group" key={group.label}><h3><span>0{index + 1}</span>{group.label}</h3><div>{group.items.map(item => <Link key={item.path} to={item.path}><span>{item.label}</span><ArrowRight size={15} /></Link>)}</div></div>)}</div></section>
          </div> : <><div className="admin-context-heading"><Link to="/admin">운영 홈</Link><span>/</span><span>{current?.label || '카테고리 상세 관리'}</span></div><div className="admin-page-surface"><Outlet /></div></>}
          <footer className="admin-content-footer">렌탈어때 <span>관리자 워크스페이스</span></footer>
        </main>
      </div>
      <AdminMobileNav counts={counts} isActive={isActive} onLogout={handleLogout} />
    </div>
  );
};
