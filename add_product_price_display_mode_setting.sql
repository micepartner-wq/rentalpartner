insert into public.site_settings (setting_key, setting_value)
values ('product_price_display_mode', 'visible')
on conflict (setting_key) do nothing;
