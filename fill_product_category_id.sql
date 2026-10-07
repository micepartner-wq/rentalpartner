-- products.category_id 채우기
--
-- 배경: 상품은 지금까지 카테고리를 "이름 문자열"(products.category)로만 연결했습니다.
--       카테고리 이름을 바꾸면 연결이 끊기므로, 이름이 일치하는 카테고리의 id를 category_id에 넣어 둡니다.
--
-- 선행 조건: add_product_category_routing_fields.sql 이 이미 실행되어 있어야 합니다(products.category_id 컬럼).
-- 실행 위치: Supabase 대시보드 > SQL Editor (소유자 권한). 여러 번 실행해도 안전합니다(이미 채워진 행은 건드리지 않음).
--
-- 2026-10-07 읽기 전용 점검 결과(실행 전 기대값):
--   상품 83개 중 일반(basic) 80개 = 카테고리 이름과 1:1 매칭, 부가서비스(cooperative) 3개 = 매칭 없음(NULL 유지)
--   카테고리 이름 중복 0개, 상품 카테고리가 대분류 이름인 경우 0개


-- ① 실행 전 점검 --------------------------------------------------------------

-- 이름이 같은 카테고리가 있는지 (결과가 0행이어야 안전)
select trim(name) as name, count(*) as cnt
from public.categories
group by trim(name)
having count(*) > 1;

-- 매칭되지 않는 상품 (부가서비스 '기타 서비스' 3개만 나오는 것이 정상)
select p.id, p.name, p.product_type, p.category
from public.products p
where p.category_id is null
  and not exists (
    select 1 from public.categories c where trim(c.name) = trim(p.category)
  )
order by p.product_type, p.category;


-- ② 채우기 ---------------------------------------------------------------------

begin;

with unique_names as (
  -- 이름이 한 번만 등장하는 카테고리만 대상으로 한다(애매한 이름은 건드리지 않음)
  select trim(name) as name, (array_agg(id))[1] as id
  from public.categories
  group by trim(name)
  having count(*) = 1
)
update public.products p
set category_id = u.id
from unique_names u
where p.category_id is null
  and trim(p.category) = u.name;

-- 결과 확인: updated 가 80 근처, 남은 NULL 은 부가서비스 3개여야 합니다.
select
  count(*) filter (where category_id is not null) as filled,
  count(*) filter (where category_id is null)     as still_null,
  count(*)                                         as total
from public.products;

-- 위 숫자가 기대와 다르면 rollback; 으로 취소하세요.
commit;


-- ③ 실행 후 확인 ---------------------------------------------------------------

-- 상품별 카테고리 이름과 category_id 가 가리키는 이름이 다른 행 (0행이어야 정상)
select p.id, p.name, p.category as stored_name, c.name as linked_name
from public.products p
join public.categories c on c.id = p.category_id
where trim(c.name) <> trim(p.category);


-- ④ (선택) 앞으로 저장되는 상품도 자동으로 연결 ----------------------------------
-- 관리자 화면(ProductManager)은 아직 category 이름만 저장합니다. 화면 코드를 고치기 전까지
-- 새로 등록/수정한 상품의 category_id 가 비어 있을 수 있어서, 필요하면 아래 트리거를 켜 두세요.
-- 사용하려면 주석을 해제해서 실행합니다.
--
-- create or replace function public.sync_product_category_id()
-- returns trigger
-- language plpgsql
-- as $$
-- declare
--   matched uuid;
-- begin
--   if new.category is null or trim(new.category) = '' then
--     return new;
--   end if;
--
--   -- 같은 이름의 카테고리가 정확히 하나일 때만 연결한다
--   select c.id into matched
--   from public.categories c
--   where trim(c.name) = trim(new.category)
--     and (select count(*) from public.categories c2 where trim(c2.name) = trim(new.category)) = 1
--   limit 1;
--
--   if matched is not null then
--     new.category_id := matched;
--   end if;
--   return new;
-- end;
-- $$;
--
-- drop trigger if exists trg_sync_product_category_id on public.products;
-- create trigger trg_sync_product_category_id
--   before insert or update of category on public.products
--   for each row execute function public.sync_product_category_id();
