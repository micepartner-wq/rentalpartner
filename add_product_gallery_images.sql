-- Extra representative images (slide) for a product's detail page, after the main image_url.
-- Run once in the Supabase SQL Editor for the project's existing database.
-- Additive only: existing products and policies are preserved.
begin;

alter table public.products
    add column if not exists gallery_images jsonb not null default '[]'::jsonb;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.products'::regclass
          and conname = 'products_gallery_images_array'
    ) then
        alter table public.products add constraint products_gallery_images_array
            check (case when jsonb_typeof(gallery_images) = 'array'
                then jsonb_array_length(gallery_images) <= 7 else false end);
    end if;
end $$;

comment on column public.products.gallery_images is
    'Extra representative image URLs shown after image_url as a slide: ["https://...", ...], max 7.';
notify pgrst, 'reload schema';
commit;
