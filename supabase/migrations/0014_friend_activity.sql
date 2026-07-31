create or replace function public.friend_activity()
returns table (
  kind text,
  actor_id uuid,
  actor_handle text,
  actor_avatar_url text,
  event_id uuid,
  event_title text,
  event_theme text,
  at timestamptz
)
language sql stable security definer set search_path = public as $$
  with my_friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as fid
    from public.friendships
    where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  )
  select 'hosting' as kind, e.host_id as actor_id, p.handle as actor_handle,
         p.avatar_url as actor_avatar_url, e.id as event_id, e.title as event_title,
         e.theme as event_theme, e.created_at as at
  from public.events e
  join my_friends mf on mf.fid = e.host_id
  join public.profiles p on p.id = e.host_id
  where e.visibility = 'public' and e.ends_at > now()
    and not public.is_blocked_with(e.host_id)
  union all
  select 'joined' as kind, a.profile_id as actor_id, p.handle as actor_handle,
         p.avatar_url as actor_avatar_url, e.id as event_id, e.title as event_title,
         e.theme as event_theme, a.joined_at as at
  from public.event_attendees a
  join my_friends mf on mf.fid = a.profile_id
  join public.events e on e.id = a.event_id
  join public.profiles p on p.id = a.profile_id
  where e.visibility = 'public' and e.ends_at > now()
    and a.profile_id <> e.host_id
    and not public.is_blocked_with(a.profile_id)
  order by at desc
  limit 50;
$$;
