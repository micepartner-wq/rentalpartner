alter table public.categories
    add column if not exists slug text;

create unique index if not exists idx_categories_root_slug_unique
    on public.categories(slug)
    where parent_id is null and slug is not null;

create unique index if not exists idx_categories_parent_slug_unique
    on public.categories(parent_id, slug)
    where parent_id is not null and slug is not null;

alter table public.products
    add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists idx_products_category_id
    on public.products(category_id);
