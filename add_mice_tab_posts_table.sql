-- MICE 탭(공지사항/이벤트/설치후기) 관리용 테이블 추가

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

alter table public.mice_tab_posts enable row level security;

drop policy if exists "Allow all on mice_tab_posts" on public.mice_tab_posts;
create policy "Allow all on mice_tab_posts"
    on public.mice_tab_posts
    for all to anon, authenticated
    using (true) with check (true);

grant select, insert, update, delete on public.mice_tab_posts to anon, authenticated;
