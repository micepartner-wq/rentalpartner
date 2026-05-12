-- 기본 GNB 메뉴 데이터 추가 (회사소개, 공지사항, 이벤트, 설치후기, 고객센터)
INSERT INTO public.gnb_menu_items (name, link, display_order, is_active)
VALUES 
    ('회사소개', 'https://humanpartner.kr/', 1, true),
    ('공지사항', '/notice', 2, true),
    ('이벤트', '/event', 3, true),
    ('설치후기', '/review', 4, true),
    ('고객센터', '/cs', 5, true);
