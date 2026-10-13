-- Package installation photos and percentage-based product hotspots.
-- Run once in the Supabase SQL Editor for the project's existing database.
-- Additive only: existing products and policies are preserved.
begin;

alter table public.products
    add column if not exists installation_scenes jsonb not null default '[]'::jsonb;

-- A bounded array keeps oversized payloads out of this field.
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.products'::regclass
          and conname = 'products_installation_scenes_array'
    ) then
        alter table public.products add constraint products_installation_scenes_array
            check (case when jsonb_typeof(installation_scenes) = 'array'
                then jsonb_array_length(installation_scenes) <= 12 else false end);
    end if;
end $$;

comment on column public.products.installation_scenes is
    'Package installation photos with product_id, percentage x/y positions and included/optional/reference labels.';
notify pgrst, 'reload schema';
commit;
