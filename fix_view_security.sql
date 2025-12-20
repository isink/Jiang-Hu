-- FIX: Enable Row Level Security (RLS) on the View
-- Run this in Supabase SQL Editor to resolve "Data is publicly accessible" warning.

-- 1. Drop existing view (cascades to trigger)
drop view if exists public.location_comments cascade;

-- 2. Re-create view with security_invoker = true
-- This ensures the view respects the RLS policies of the underlying tables (raw_location_comments & profiles).
create view public.location_comments 
with (security_invoker = true)
as
select 
  c.id,
  c.location_id,
  c.text,
  c.rating,
  c.created_at,
  c.user_id,
  p.nickname as user_name,
  p.avatar_url as user_avatar
from public.raw_location_comments c
left join public.profiles p on c.user_id = p.id;

-- 3. Re-attach the Insert Trigger
create trigger on_location_comment_insert
  instead of insert on public.location_comments
  for each row execute procedure public.insert_location_comment();
