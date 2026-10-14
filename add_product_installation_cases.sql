-- Per-product installation case photos (up to 6) shown on the product detail page.
-- Run once in the Supabase SQL Editor for the project's existing database.
-- Additive only: existing products and policies are preserved.
begin;

alter table public.products
    add column if not exists installation_cases jsonb not null default '[]'::jsonb;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.products'::regclass
          and conname = 'products_installation_cases_array'
    ) then
        alter table public.products add constraint products_installation_cases_array
            check (case when jsonb_typeof(installation_cases) = 'array'
                then jsonb_array_length(installation_cases) <= 6 else false end);
    end if;
end $$;

comment on column public.products.installation_cases is
    'Per-product installation case photos: [{id, image_url, caption}], max 6.';
notify pgrst, 'reload schema';
commit;
