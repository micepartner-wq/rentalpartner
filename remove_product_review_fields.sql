alter table public.products
    drop column if exists rating,
    drop column if exists review_count;
