-- 일반 회원가입 승인 대기 제거
-- 목적: 기존 일반 회원 중 승인 대기 계정을 일괄 승인

update public.user_profiles
set is_approved = true
where is_admin = false
  and member_type in ('business', 'public')
  and is_approved = false;
