-- 빠른 견적 문의(상품 미지정)용 전용 항목 1개
-- 견적(bookings)은 상품 ID가 필수라서, 상품을 고르지 않고 접수되는 빠른 견적은 이 항목에 연결됩니다.
-- product_type = 'place' 라서 일반 상품 목록, 사이트맵, 검색에는 나오지 않습니다. 삭제하지 마세요.
-- 실행하지 않아도 첫 빠른 견적이 접수될 때 사이트가 자동으로 만들지만, 미리 만들어 두면 더 안전합니다.
insert into public.products (product_code, name, category, price, stock, description, short_description, catalog_type, product_type)
values ('QUICK-QUOTE', '[시스템] 빠른 견적 문의 (상품 미지정)', '', 0, 0,
        '삭제하지 마세요. 상품을 고르지 않고 접수되는 빠른 견적 문의가 연결되는 시스템 항목입니다.', '', 'general', 'place')
on conflict (product_code) do nothing;
