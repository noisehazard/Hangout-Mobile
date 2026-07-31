create unique index if not exists profiles_handle_unique on public.profiles (lower(handle));

create or replace function public.set_handle(p_handle text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_handle !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Handle must be 3-20 letters, numbers, or underscores';
  end if;
  update public.profiles set handle = p_handle where id = auth.uid();
exception when unique_violation then
  raise exception 'That handle is already taken';
end;
$$;

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships" on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists "send as self" on public.friendships;
create policy "send as self" on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
drop policy if exists "respond as addressee" on public.friendships;
create policy "respond as addressee" on public.friendships for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
drop policy if exists "remove if involved" on public.friendships;
create policy "remove if involved" on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create or replace function public.send_friend_request(p_handle text)
returns void language plpgsql security invoker set search_path = public as $$
declare v_target uuid;
begin
  select id into v_target from public.profiles where lower(handle) = lower(p_handle);
  if v_target is null then raise exception 'No one found with that handle'; end if;
  if v_target = auth.uid() then raise exception 'You can''t add yourself'; end if;
  if exists (select 1 from public.friendships
             where (requester_id = auth.uid() and addressee_id = v_target)
                or (requester_id = v_target and addressee_id = auth.uid())) then
    raise exception 'You are already connected or have a pending request';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (auth.uid(), v_target);
end;
$$;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_accept then
    update public.friendships set status = 'accepted'
      where id = p_request_id and addressee_id = auth.uid() and status = 'pending';
  else
    delete from public.friendships
      where id = p_request_id and addressee_id = auth.uid() and status = 'pending';
  end if;
end;
$$;

create or replace function public.list_friends()
returns table (friend_id uuid, handle text, avatar_url text,
               active_event_id uuid, active_event_title text)
language sql stable security invoker set search_path = public as $$
  with my_friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as fid
    from public.friendships
    where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  )
  select p.id, p.handle, p.avatar_url, e.id, e.title
  from my_friends mf
  join public.profiles p on p.id = mf.fid
  left join lateral (
    select ev.id, ev.title
    from public.events ev
    where ev.starts_at <= now() and ev.ends_at > now()
      and (ev.host_id = mf.fid
           or exists (select 1 from public.event_attendees a
                      where a.event_id = ev.id and a.profile_id = mf.fid))
    order by ev.starts_at desc
    limit 1
  ) e on true;
$$;

create or replace function public.list_friend_requests()
returns table (request_id uuid, requester_id uuid, handle text,
               avatar_url text, created_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select f.id, f.requester_id, p.handle, p.avatar_url, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid() and f.status = 'pending'
  order by f.created_at desc;
$$;

create or replace function public.remove_friend(p_friend_id uuid)
returns void language sql security invoker set search_path = public as $$
  delete from public.friendships
  where (requester_id = auth.uid() and addressee_id = p_friend_id)
     or (requester_id = p_friend_id and addressee_id = auth.uid());
$$;

drop function if exists public.nearby_events(double precision, double precision, integer);
create or replace function public.nearby_events(
  user_lat double precision, user_lng double precision, radius_m integer default 30000
)
returns table (
  id uuid, host_id uuid, host_handle text, title text, description text,
  theme text, photo_url text, latitude double precision, longitude double precision,
  open_to_strangers boolean, starts_at timestamptz, ends_at timestamptz,
  attendee_count bigint, location_name text, friends_going bigint
)
language sql stable security invoker set search_path = public as $$
  select e.id, e.host_id, p.handle as host_handle, e.title, e.description,
         e.theme, e.photo_url,
         ST_Y(e.location::geometry) as latitude,
         ST_X(e.location::geometry) as longitude,
         e.open_to_strangers, e.starts_at, e.ends_at,
         count(a.profile_id) as attendee_count,
         e.location_name,
         (select count(*) from public.event_attendees fa
          join public.friendships f
            on ((f.requester_id = auth.uid() and f.addressee_id = fa.profile_id)
             or (f.requester_id = fa.profile_id and f.addressee_id = auth.uid()))
          where fa.event_id = e.id and f.status = 'accepted') as friends_going
  from public.events e
  join public.profiles p on p.id = e.host_id
  left join public.event_attendees a on a.event_id = e.id
  where e.visibility = 'public' and e.ends_at > now()
    and ST_DWithin(e.location,
                   ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
                   radius_m)
  group by e.id, p.handle;
$$;

drop function if exists public.get_event(uuid);
create or replace function public.get_event(p_event_id uuid)
returns table (
  id uuid, host_id uuid, host_handle text, title text, description text,
  theme text, photo_url text, latitude double precision, longitude double precision,
  open_to_strangers boolean, starts_at timestamptz, ends_at timestamptz,
  attendee_count bigint, location_name text, friends_going bigint
)
language sql stable security invoker set search_path = public as $$
  select e.id, e.host_id, p.handle as host_handle, e.title, e.description,
         e.theme, e.photo_url,
         ST_Y(e.location::geometry) as latitude,
         ST_X(e.location::geometry) as longitude,
         e.open_to_strangers, e.starts_at, e.ends_at,
         count(a.profile_id) as attendee_count,
         e.location_name,
         (select count(*) from public.event_attendees fa
          join public.friendships f
            on ((f.requester_id = auth.uid() and f.addressee_id = fa.profile_id)
             or (f.requester_id = fa.profile_id and f.addressee_id = auth.uid()))
          where fa.event_id = e.id and f.status = 'accepted') as friends_going
  from public.events e
  join public.profiles p on p.id = e.host_id
  left join public.event_attendees a on a.event_id = e.id
  where e.id = p_event_id and e.visibility = 'public'
  group by e.id, p.handle;
$$;
