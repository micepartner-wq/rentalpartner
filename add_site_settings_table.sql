-- 운영 변경값(CS 연락처/운영시간/채팅링크) CMS화를 위한 설정 테이블
create table if not exists public.site_settings (
    setting_key text primary key,
    setting_value text not null,
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

drop trigger if exists trg_site_settings_set_updated_at on public.site_settings;
create trigger trg_site_settings_set_updated_at
before update on public.site_settings
for each row
execute function public.set_updated_at();

alter table public.site_settings enable row level security;
drop policy if exists "Allow all on site_settings" on public.site_settings;
create policy "Allow all on site_settings"
    on public.site_settings
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.site_settings to anon, authenticated;

insert into public.site_settings (setting_key, setting_value)
values
    ('cs_center_phone', '1800-1985'),
    ('cs_center_business_hours_text', '고객행복센터(전화): 오전 9시 ~ 오후 6시 운영'),
    ('cs_center_chat_url', 'https://pf.kakao.com/_iRxghX/chat'),
    ('cs_center_chat_hours_text', '채팅 상담 문의: 24시간 운영'),
    ('product_price_display_mode', 'visible')
on conflict (setting_key) do nothing;
