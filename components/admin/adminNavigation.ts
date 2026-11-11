import { LayoutDashboard, Package, FolderTree, CalendarCheck, MessageSquare, Users, Image, Layers, PanelsTopLeft, HelpCircle, Mail, type LucideIcon } from 'lucide-react';
export interface AdminNavItem { path: string; label: string; description: string; icon: LucideIcon; exact?: boolean; }
export const adminHome: AdminNavItem = { path: '/admin', label: '운영 홈', description: '오늘 처리할 업무를 확인하세요.', icon: LayoutDashboard, exact: true };
export const adminNavGroups: { label: string; items: AdminNavItem[] }[] = [
  { label: '상품 관리', items: [
    { path: '/admin/products', label: '상품 목록', description: '상품 정보와 판매 구성을 관리합니다.', icon: Package },
    { path: '/admin/menus', label: '상품 카테고리', description: '상품 분류와 전체 메뉴를 관리합니다.', icon: FolderTree },
  ] },
  { label: '고객·견적', items: [
    { path: '/admin/rental-requests', label: '견적 요청', description: '접수된 견적을 확인하고 처리합니다.', icon: CalendarCheck },
    { path: '/admin/inquiries', label: '1:1 문의', description: '고객 문의를 확인하고 답변합니다.', icon: MessageSquare },
    { path: '/admin/users', label: '회원', description: '가입 회원과 고객 정보를 확인합니다.', icon: Users },
  ] },
  { label: '사이트 관리', items: [
    { path: '/admin/cms', label: '배너·팝업·아이콘', description: '배너와 팝업, 바로가기를 편집합니다.', icon: Image },
    { path: '/admin/sections', label: '메인 상품 진열', description: '메인 화면의 상품 묶음과 순서를 설정합니다.', icon: Layers },
    { path: '/admin/gnb-sections', label: '메뉴·게시글·후기', description: '상단 메뉴와 게시글, 설치후기를 관리합니다.', icon: PanelsTopLeft },
    { path: '/admin/faqs', label: '자주 묻는 질문', description: '고객센터의 질문과 답변을 편집합니다.', icon: HelpCircle },
  ] },
  { label: '설정', items: [
    { path: '/admin/quote-email-settings', label: '견적 메일 설정', description: '알림 수신 이메일과 발송 여부를 설정합니다.', icon: Mail },
  ] },
];
export const adminNavItems = [adminHome, ...adminNavGroups.flatMap(group => group.items)];
export const isAdminPathActive = (pathname: string, path: string, exact?: boolean) => exact ? pathname.replace(/\/$/, '') === path : pathname === path || pathname.startsWith(`${path}/`);
