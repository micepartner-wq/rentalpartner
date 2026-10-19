-- 설치후기(게시글) 사진 + 상품 태그 컬럼 추가
-- Supabase SQL Editor에서 한 번 실행하세요. 기존 글과 정책은 그대로 유지됩니다(추가만 함).
-- images 형식: [{ id, image_url, caption, hotspots: [{ id, product_id, x, y }] }]  (사진 최대 10장)
begin;

alter table if exists public.mice_tab_posts
    add column if not exists images jsonb not null default '[]'::jsonb;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.mice_tab_posts'::regclass
          and conname = 'mice_tab_posts_images_array'
    ) then
        alter table public.mice_tab_posts add constraint mice_tab_posts_images_array
            check (case when jsonb_typeof(images) = 'array'
                then jsonb_array_length(images) <= 10 else false end);
    end if;
end $$;

comment on column public.mice_tab_posts.images is
    'Review photos with product tags: [{id, image_url, caption, hotspots:[{id, product_id, x, y}]}], max 10.';
notify pgrst, 'reload schema';
commit;
