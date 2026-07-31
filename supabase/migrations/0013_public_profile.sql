create or replace function public.get_public_profile(p_id uuid)
returns table (
  id uuid,
  handle text,
  avatar_url text,
  verified boolean,
  created_at timestamptz,
  mutual_friends integer,
  relationship text,
  request_id uuid
)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  visible as (
    select 1
    where not exists (
      select 1 from public.blocks b, me
      where b.blocker_id = p_id and b.blocked_id = me.uid
    )
  ),
  rel as (
    select case
      when p_id = (select uid from me) then 'self'
      when exists (select 1 from public.blocks b, me
                   where b.blocker_id = me.uid and b.blocked_id = p_id) then 'i_blocked'
      when exists (select 1 from public.friendships f, me
                   where f.status = 'accepted'
                     and ((f.requester_id = me.uid and f.addressee_id = p_id)
                       or (f.requester_id = p_id and f.addressee_id = me.uid))) then 'friends'
      when exists (select 1 from public.friendships f, me
                   where f.status = 'pending'
                     and f.requester_id = me.uid and f.addressee_id = p_id) then 'outgoing'
      when exists (select 1 from public.friendships f, me
                   where f.status = 'pending'
                     and f.requester_id = p_id and f.addressee_id = me.uid) then 'incoming'
      else 'none'
    end as relationship
  ),
  req as (
    select f.id as request_id
    from public.friendships f, me
    where f.status = 'pending'
      and ((f.requester_id = me.uid and f.addressee_id = p_id)
        or (f.requester_id = p_id and f.addressee_id = me.uid))
    limit 1
  ),
  mutual as (
    select count(*)::int as n
    from (
      select case when requester_id = (select uid from me) then addressee_id else requester_id end as fid
      from public.friendships
      where status = 'accepted' and (select uid from me) in (requester_id, addressee_id)
    ) mine
    join (
      select case when requester_id = p_id then addressee_id else requester_id end as fid
      from public.friendships
      where status = 'accepted' and p_id in (requester_id, addressee_id)
    ) theirs on theirs.fid = mine.fid
  )
  select p.id, p.handle, p.avatar_url, p.verified, p.created_at,
         (select n from mutual),
         (select relationship from rel),
         (select request_id from req)
  from public.profiles p, visible
  where p.id = p_id;
$$;
