-- 기존 배너에 모바일 전용 이미지와 이미지형 슬라이드 설정을 추가합니다.
-- 기존 배너는 모두 문구형(text)으로 유지됩니다.

alter table if exists public.banners
    add column if not exists mobile_image_url text;

alter table if exists public.banners
    add column if not exists display_mode text not null default 'text';

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'banners_display_mode_check'
          and conrelid = 'public.banners'::regclass
    ) then
        alter table public.banners
            add constraint banners_display_mode_check check (display_mode in ('text', 'image'));
    end if;
end $$;
