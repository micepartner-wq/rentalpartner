-- Cart-based quote request fields.
-- One booking row now represents one quote request that can contain multiple products.

alter table public.bookings
    add column if not exists quote_items jsonb not null default '[]'::jsonb,
    add column if not exists usage_period text,
    add column if not exists installation_place text,
    add column if not exists request_note text;

create index if not exists idx_bookings_quote_items_gin
    on public.bookings using gin (quote_items);
