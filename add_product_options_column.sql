alter table public.products
add column if not exists product_options jsonb not null default '[]'::jsonb;
