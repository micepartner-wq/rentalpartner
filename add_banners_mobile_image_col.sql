-- 메인 슬라이드에 모바일 전용 이미지를 선택적으로 등록할 수 있도록 합니다.
-- 값이 없으면 사이트에서 기존 image_url을 사용합니다.

alter table if exists public.banners
    add column if not exists mobile_image_url text;
