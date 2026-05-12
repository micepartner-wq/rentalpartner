alter table public.mice_tab_posts
add column if not exists category text;

comment on column public.mice_tab_posts.category is
'공지사항/이벤트/설치후기 게시글 카테고리 탭용 문자열';
