alter table public.products
    add column if not exists catalog_type text;

update public.products
set catalog_type = 'general'
where catalog_type is null;

alter table public.products
    alter column catalog_type set default 'general';

alter table public.products
    alter column catalog_type set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'products_catalog_type_check'
    ) then
        alter table public.products
            add constraint products_catalog_type_check
            check (catalog_type in ('general', 'package'));
    end if;
end $$;

create index if not exists idx_products_catalog_type on public.products(catalog_type);
