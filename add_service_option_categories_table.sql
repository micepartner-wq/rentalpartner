create table if not exists public.service_option_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    display_order integer not null default 0,
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_service_option_categories_display_order
    on public.service_option_categories(display_order, created_at desc);

alter table public.service_option_categories enable row level security;

drop policy if exists "Allow all on service_option_categories" on public.service_option_categories;
create policy "Allow all on service_option_categories"
    on public.service_option_categories
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.service_option_categories to anon, authenticated;
