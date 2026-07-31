create or replace function public.list_blocked()
returns table (profile_id uuid, handle text, avatar_url text)
language sql stable security invoker set search_path = public as $$
  select b.blocked_id, p.handle, p.avatar_url
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;
