-- Humanpartner Mall - Supabase bootstrap schema
-- 실행 위치: Supabase SQL Editor
-- 목적: 프론트 코드가 사용하는 필수 테이블/관계/RLS를 한 번에 준비

create extension if not exists pgcrypto;

-- =========================================================
-- User Profiles
-- =========================================================
create table if not exists public.user_profiles (
    id uuid primary key default gen_random_uuid(),
    firebase_uid text not null unique,
    email text not null unique,
    name text not null,
    phone text not null,
    company_name text not null,
    department text,
    position text,
    address text,
    business_number text,
    business_license_url text,
    member_type text check (member_type in ('business', 'public')),
    manager_name text,
    is_admin boolean not null default false,
    is_approved boolean not null default false,
    agreed_terms boolean not null default false,
    agreed_privacy boolean not null default false,
    agreed_marketing boolean default false,
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_user_profiles_firebase_uid on public.user_profiles(firebase_uid);
create index if not exists idx_user_profiles_created_at on public.user_profiles(created_at desc);

alter table public.user_profiles enable row level security;
drop policy if exists "Allow all on user_profiles" on public.user_profiles;
create policy "Allow all on user_profiles"
    on public.user_profiles
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.user_profiles to anon, authenticated;

-- =========================================================
-- Categories
-- =========================================================
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    parent_id uuid references public.categories(id) on delete set null,
    level integer not null default 1,
    display_order integer not null default 0,
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_categories_parent_id on public.categories(parent_id);
create index if not exists idx_categories_level_display on public.categories(level, display_order);

alter table public.categories enable row level security;
drop policy if exists "Allow all on categories" on public.categories;
create policy "Allow all on categories"
    on public.categories
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.categories to anon, authenticated;

-- =========================================================
-- Service Option Categories
-- =========================================================
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

-- =========================================================
-- Sections
-- =========================================================
create table if not exists public.sections (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    display_order integer not null default 0,
    is_active boolean not null default true,
    layout_mode text default 'default',
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_sections_active_display on public.sections(is_active, display_order);

alter table public.sections enable row level security;
drop policy if exists "Allow all on sections" on public.sections;
create policy "Allow all on sections"
    on public.sections
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.sections to anon, authenticated;

-- =========================================================
-- Products
-- =========================================================
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    product_code text unique,
    name text not null,
    category text not null default '',
    price integer not null default 0,
    description text default '',
    short_description text default '',
    image_url text,
    stock integer not null default 0,
    discount_rate integer default 0,
    catalog_type text not null default 'general' check (catalog_type in ('general', 'package')),
    product_type text default 'basic' check (product_type in ('basic', 'essential', 'additional', 'cooperative', 'place', 'food')),
    basic_components jsonb not null default '[]'::jsonb,
    additional_components jsonb not null default '[]'::jsonb,
    cooperative_components jsonb not null default '[]'::jsonb,
    place_components jsonb not null default '[]'::jsonb,
    food_components jsonb not null default '[]'::jsonb,
    product_options jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_catalog_type on public.products(catalog_type);
create index if not exists idx_products_product_type on public.products(product_type);
create index if not exists idx_products_created_at on public.products(created_at desc);

alter table public.products enable row level security;
drop policy if exists "Allow all on products" on public.products;
create policy "Allow all on products"
    on public.products
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.products to anon, authenticated;

-- =========================================================
-- Product-Section Relations
-- =========================================================
create table if not exists public.product_sections (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    section_id uuid not null references public.sections(id) on delete cascade,
    display_order integer not null default 0,
    created_at timestamp with time zone not null default now(),
    unique (product_id, section_id)
);

create index if not exists idx_product_sections_section_id on public.product_sections(section_id);
create index if not exists idx_product_sections_product_id on public.product_sections(product_id);

alter table public.product_sections enable row level security;
drop policy if exists "Allow all on product_sections" on public.product_sections;
create policy "Allow all on product_sections"
    on public.product_sections
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.product_sections to anon, authenticated;

-- =========================================================
-- Section-Category Relations
-- =========================================================
create table if not exists public.section_categories (
    id uuid primary key default gen_random_uuid(),
    section_id uuid not null references public.sections(id) on delete cascade,
    category_id uuid not null references public.categories(id) on delete cascade,
    created_at timestamp with time zone not null default now(),
    unique (section_id, category_id)
);

create index if not exists idx_section_categories_section_id on public.section_categories(section_id);
create index if not exists idx_section_categories_category_id on public.section_categories(category_id);

alter table public.section_categories enable row level security;
drop policy if exists "Allow all on section_categories" on public.section_categories;
create policy "Allow all on section_categories"
    on public.section_categories
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.section_categories to anon, authenticated;

-- =========================================================
-- Bookings
-- =========================================================
create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    user_id text not null,
    user_email text,
    start_date date not null,
    end_date date not null,
    total_price integer not null default 0,
    status text not null default 'pending' check (status in ('pending', 'quote_sent', 'confirmed', 'cancelled')),
    selected_options jsonb not null default '[]'::jsonb,
    basic_components jsonb not null default '[]'::jsonb,
    quote_items jsonb not null default '[]'::jsonb,
    usage_period text,
    installation_place text,
    request_note text,
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_bookings_product_id on public.bookings(product_id);
create index if not exists idx_bookings_created_at on public.bookings(created_at desc);
create index if not exists idx_bookings_quote_items_gin on public.bookings using gin (quote_items);

alter table public.bookings enable row level security;
drop policy if exists "Allow all on bookings" on public.bookings;
create policy "Allow all on bookings"
    on public.bookings
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.bookings to anon, authenticated;

-- =========================================================
-- CMS Tables
-- =========================================================
create table if not exists public.quick_menu_items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    icon text default 'Package',
    image_url text,
    link text not null default '/',
    category text,
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.tab_menu_items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    link text not null default '/',
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.nav_menu_items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    link text not null default '#',
    category text,
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.banners (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    subtitle text default '',
    image_url text not null,
    mobile_image_url text,
    link text not null default '/',
    button_text text default '바로가기',
    brand_text text,
    display_mode text not null default 'text' check (display_mode in ('text', 'image')),
    banner_type text not null default 'hero' check (banner_type in ('hero', 'promo')),
    tab_id uuid references public.tab_menu_items(id) on delete set null,
    display_order integer not null default 0,
    is_active boolean not null default true,
    target_product_code text,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.popups (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    image_url text not null,
    link text default '/',
    start_date date,
    end_date date,
    display_order integer not null default 0,
    is_active boolean not null default true,
    target_product_code text,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.gnb_menu_items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    link text not null,
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.alliance_members (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category1 text,
    category2 text,
    address text,
    phone text,
    logo_url text,
    display_order integer default 0,
    is_active boolean default true,
    created_at timestamp with time zone default now()
);

create table if not exists public.mice_tab_posts (
    id uuid primary key default gen_random_uuid(),
    board_type text not null check (board_type in ('notice', 'event', 'review')),
    title text not null,
    summary text default '',
    content text default '',
    image_url text,
    link text default '',
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

alter table public.quick_menu_items enable row level security;
alter table public.tab_menu_items enable row level security;
alter table public.nav_menu_items enable row level security;
alter table public.banners enable row level security;
alter table public.popups enable row level security;
alter table public.gnb_menu_items enable row level security;
alter table public.alliance_members enable row level security;
alter table public.mice_tab_posts enable row level security;

drop policy if exists "Allow all on quick_menu_items" on public.quick_menu_items;
create policy "Allow all on quick_menu_items"
    on public.quick_menu_items
    for all to anon, authenticated
    using (true) with check (true);

drop policy if exists "Allow all on tab_menu_items" on public.tab_menu_items;
create policy "Allow all on tab_menu_items"
    on public.tab_menu_items
    for all to anon, authenticated
    using (true) with check (true);

drop policy if exists "Allow all on nav_menu_items" on public.nav_menu_items;
create policy "Allow all on nav_menu_items"
    on public.nav_menu_items
    for all to anon, authenticated
    using (true) with check (true);

drop policy if exists "Allow all on banners" on public.banners;
create policy "Allow all on banners"
    on public.banners
    for all to anon, authenticated
    using (true) with check (true);

drop policy if exists "Allow all on popups" on public.popups;
create policy "Allow all on popups"
    on public.popups
    for all to anon, authenticated
    using (true) with check (true);

drop policy if exists "Allow all on gnb_menu_items" on public.gnb_menu_items;
create policy "Allow all on gnb_menu_items"
    on public.gnb_menu_items
    for all to anon, authenticated
    using (true) with check (true);

drop policy if exists "Allow all on alliance_members" on public.alliance_members;
create policy "Allow all on alliance_members"
    on public.alliance_members
    for all to anon, authenticated
    using (true) with check (true);

drop policy if exists "Allow all on mice_tab_posts" on public.mice_tab_posts;
create policy "Allow all on mice_tab_posts"
    on public.mice_tab_posts
    for all to anon, authenticated
    using (true) with check (true);

grant select, insert, update, delete on public.quick_menu_items to anon, authenticated;
grant select, insert, update, delete on public.tab_menu_items to anon, authenticated;
grant select, insert, update, delete on public.nav_menu_items to anon, authenticated;
grant select, insert, update, delete on public.banners to anon, authenticated;
grant select, insert, update, delete on public.popups to anon, authenticated;
grant select, insert, update, delete on public.gnb_menu_items to anon, authenticated;
grant select, insert, update, delete on public.alliance_members to anon, authenticated;
grant select, insert, update, delete on public.mice_tab_posts to anon, authenticated;

-- =========================================================
-- Notifications
-- =========================================================
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    title text not null,
    message text not null,
    type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
    is_read boolean not null default false,
    link_url text,
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_notifications_user_id_created_at on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "Allow all on notifications" on public.notifications;
create policy "Allow all on notifications"
    on public.notifications
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.notifications to anon, authenticated;

-- =========================================================
-- Inquiries
-- =========================================================
create table if not exists public.inquiries (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    user_name text,
    user_email text,
    company_name text,
    category text,
    title text not null,
    content text not null,
    status text not null default 'pending' check (status in ('pending', 'answered')),
    answer text,
    created_at timestamp with time zone not null default now(),
    answered_at timestamp with time zone
);

alter table public.inquiries enable row level security;
drop policy if exists "Allow all on inquiries" on public.inquiries;
create policy "Allow all on inquiries"
    on public.inquiries
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.inquiries to anon, authenticated;

-- =========================================================
-- FAQs
-- =========================================================
create table if not exists public.faq_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    display_order integer not null default 0,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.faqs (
    id uuid primary key default gen_random_uuid(),
    category text not null,
    question text not null,
    answer text not null,
    display_order integer not null default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_faqs_set_updated_at on public.faqs;
create trigger trg_faqs_set_updated_at
before update on public.faqs
for each row
execute function public.set_updated_at();

alter table public.faq_categories enable row level security;
alter table public.faqs enable row level security;

drop policy if exists "Allow all on faq_categories" on public.faq_categories;
create policy "Allow all on faq_categories"
    on public.faq_categories
    for all to anon, authenticated
    using (true) with check (true);

drop policy if exists "Allow all on faqs" on public.faqs;
create policy "Allow all on faqs"
    on public.faqs
    for all to anon, authenticated
    using (true) with check (true);

grant select, insert, update, delete on public.faq_categories to anon, authenticated;
grant select, insert, update, delete on public.faqs to anon, authenticated;

-- =========================================================
-- Site Settings (운영 설정)
-- =========================================================
create table if not exists public.site_settings (
    setting_key text primary key,
    setting_value text not null,
    updated_at timestamp with time zone not null default now()
);

drop trigger if exists trg_site_settings_set_updated_at on public.site_settings;
create trigger trg_site_settings_set_updated_at
before update on public.site_settings
for each row
execute function public.set_updated_at();

alter table public.site_settings enable row level security;
drop policy if exists "Allow all on site_settings" on public.site_settings;
create policy "Allow all on site_settings"
    on public.site_settings
    for all to anon, authenticated
    using (true) with check (true);

grant select, insert, update, delete on public.site_settings to anon, authenticated;

-- 기본 FAQ 카테고리
insert into public.faq_categories (name, display_order)
values
    ('자주 묻는 질문', 1),
    ('공통', 2),
    ('이용문의', 3),
    ('예약/결제', 4),
    ('취소/환불', 5),
    ('상품문의', 6),
    ('기타', 7)
on conflict (name) do nothing;

-- 기본 고객센터 운영정보
insert into public.site_settings (setting_key, setting_value)
values
    ('cs_center_phone', '1800-1985'),
    ('cs_center_business_hours_text', '고객행복센터(전화): 오전 9시 ~ 오후 6시 운영'),
    ('cs_center_chat_url', 'https://pf.kakao.com/_iRxghX/chat'),
    ('cs_center_chat_hours_text', '채팅 상담 문의: 24시간 운영'),
    ('product_price_display_mode', 'visible')
on conflict (setting_key) do nothing;

-- =========================================================
-- Storage bucket (이미지 업로드용)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('humanpartner', 'humanpartner', true)
on conflict (id) do nothing;

drop policy if exists "Public read humanpartner bucket" on storage.objects;
create policy "Public read humanpartner bucket"
    on storage.objects
    for select
    to public
    using (bucket_id = 'humanpartner');

drop policy if exists "Public upload humanpartner bucket" on storage.objects;
create policy "Public upload humanpartner bucket"
    on storage.objects
    for insert
    to public
    with check (bucket_id = 'humanpartner');

drop policy if exists "Public update humanpartner bucket" on storage.objects;
create policy "Public update humanpartner bucket"
    on storage.objects
    for update
    to public
    using (bucket_id = 'humanpartner')
    with check (bucket_id = 'humanpartner');

drop policy if exists "Public delete humanpartner bucket" on storage.objects;
create policy "Public delete humanpartner bucket"
    on storage.objects
    for delete
    to public
    using (bucket_id = 'humanpartner');
