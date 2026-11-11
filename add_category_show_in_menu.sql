-- 전체 메뉴 노출 여부 컬럼
-- 실행 위치: Supabase 대시보드 > SQL Editor. 여러 번 실행해도 안전합니다.
-- 기본값 true 이므로 실행해도 기존 메뉴는 그대로 보입니다.

alter table public.categories
    add column if not exists show_in_menu boolean not null default true;
