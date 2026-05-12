-- 기존 회사소개 메뉴 링크를 운영사 사이트로 통일

update public.gnb_menu_items
set link = 'https://humanpartner.kr/'
where trim(link) = '/company'
   or name = '회사소개';

update public.tab_menu_items
set link = 'https://humanpartner.kr/'
where trim(link) = '/company'
   or name = '회사소개';

update public.nav_menu_items
set link = 'https://humanpartner.kr/'
where trim(link) = '/company'
   or name = '회사소개';
