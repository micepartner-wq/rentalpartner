-- Simplify booking status pipeline to a 4-step flow
alter table public.bookings
    drop constraint if exists bookings_status_check;

update public.bookings
set status = case
    when status in ('quote_sent', 'negotiating') then 'quote_sent'
    when status in ('confirmed', 'completed') then 'confirmed'
    else status
end;

alter table public.bookings
    add constraint bookings_status_check
    check (status in ('pending', 'quote_sent', 'confirmed', 'cancelled'));

alter table public.bookings
    alter column status set default 'pending';
