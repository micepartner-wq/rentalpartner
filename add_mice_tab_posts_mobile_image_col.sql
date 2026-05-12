-- GNB 게시글 모바일 전용 썸네일 컬럼 추가
-- 실행 후 admin에서 PC/모바일 이미지를 각각 등록할 수 있습니다.

alter table if exists public.mice_tab_posts
    add column if not exists mobile_image_url text;
