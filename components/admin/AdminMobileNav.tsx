import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, LayoutDashboard, LogOut, MessageSquare, MoreHorizontal, X, type LucideIcon } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { AppInstallCard } from './AdminPwa';

export interface AdminNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

/** 처리하지 않은 견적 요청, 답변하지 않은 문의 개수. 화면을 옮길 때마다 다시 센다. */
export function useAdminCounts(refreshKey: string) {
  const [counts, setCounts] = useState({ quotes: 0, inquiries: 0 });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [quotes, inquiries] = await Promise.all([
          supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);
        if (active) setCounts({ quotes: quotes.count ?? 0, inquiries: inquiries.count ?? 0 });
      } catch {
        /* 개수 표시만 빠질 뿐 화면은 정상 동작 */
      }
    })();
    return () => { active = false; };
  }, [refreshKey]);
  return counts;
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute right-[calc(50%-22px)] top-1.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white" aria-label={`${count}건`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

interface Props {
  items: AdminNavItem[];
  counts: { quotes: number; inquiries: number };
  isActive: (path: string, exact?: boolean) => boolean;
  onLogout: () => void;
}

/** 휴대폰 전용 하단 탭(홈, 견적, 문의, 더보기). PC에서는 보이지 않는다. */
export function AdminMobileNav({ items, counts, isActive, onLogout }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = [
    { path: '/admin', label: '홈', icon: LayoutDashboard, exact: true, badge: 0 },
    { path: '/admin/rental-requests', label: '견적', icon: CalendarCheck, badge: counts.quotes },
    { path: '/admin/inquiries', label: '문의', icon: MessageSquare, badge: counts.inquiries },
  ];
  const tabPaths = new Set(tabs.map(tab => tab.path));
  const moreItems = items.filter(item => !tabPaths.has(item.path));
  const tabClass = (active: boolean) =>
    'relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ' + (active ? 'text-[#001E45]' : 'text-slate-400');

  return (
    <div className="md:hidden">
      <nav aria-label="관리자 메뉴" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = isActive(tab.path, tab.exact);
          return (
            <Link key={tab.path} to={tab.path} className={tabClass(active)} aria-current={active ? 'page' : undefined}>
              <Icon size={22} aria-hidden="true" />
              {tab.label}
              <Badge count={tab.badge} />
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={tabClass(moreOpen)} aria-haspopup="dialog">
          <MoreHorizontal size={22} aria-hidden="true" />
          더보기
        </button>
      </nav>

      {moreOpen && (
        <div role="dialog" aria-modal="true" aria-label="전체 메뉴" className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setMoreOpen(false)}>
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }} onClick={event => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">전체 메뉴</h2>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="닫기" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><X size={18} /></button>
            </div>
            <ul className="space-y-1">
              {moreItems.map(item => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link to={item.path} onClick={() => setMoreOpen(false)}
                      className={'flex items-center gap-3 rounded-xl px-3 py-3.5 text-[15px] font-medium ' + (isActive(item.path, item.exact) ? 'bg-[#001E45] text-white' : 'text-slate-700 active:bg-slate-100')}>
                      <Icon size={20} aria-hidden="true" /> {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 space-y-3">
              <AppInstallCard />
              <button type="button" onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600">
                <LogOut size={16} aria-hidden="true" /> 로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
