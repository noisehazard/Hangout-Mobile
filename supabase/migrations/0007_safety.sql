create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "see own blocks" on public.blocks;
create policy "see own blocks" on public.blocks for select to authenticated
  using (blocker_id = auth.uid());
drop policy if exists "block as self" on public.blocks;
create policy "block as self" on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());
drop policy if exists "unblock as self" on public.blocks;
create policy "unblock as self" on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('event','user')),
  target_id   uuid not null,
  reason      text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "file as self" on public.reports;
create policy "file as self" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_blocked_with(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = auth.uid()));
$$;

create or replace function public.block_user(p_target uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_target = auth.uid() then raise exception 'You can''t block yourself'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), p_target)
    on conflict do nothing;
  delete from public.friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = p_target)
       or (f.requester_id = p_target and f.addressee_id = auth.uid());
end;
$$;

create or replace function public.unblock_user(p_target uuid)
returns void language sql security invoker set search_path = public as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_target;
$$;

create or replace function public.submit_report(p_target_type text, p_target_id uuid, p_reason text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_target_type not in ('event','user') then raise exception 'Invalid report target'; end if;
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values (auth.uid(), p_target_type, p_target_id, p_reason);
end;
$$;

create or replace function public.admin_list_reports()
returns table (id uuid, target_type text, target_id uuid, reason text,
               reporter_handle text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return query
    select r.id, r.target_type, r.target_id, r.reason, p.handle, r.created_at
    from public.reports r
    join public.profiles p on p.id = r.reporter_id
    where r.resolved = false
    order by r.created_at desc;
end;
$$;

create or replace function public.admin_remove_event(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  delete from public.events where id = p_event_id;
  update public.reports set resolved = true
    where target_type = 'event' and target_id = p_event_id;
end;
$$;

create or replace function public.admin_ban_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set banned = true where id = p_user_id;
  update public.reports set resolved = true
    where target_type = 'user' and target_id = p_user_id;
end;
$$;

create or replace function public.admin_resolve_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.reports set resolved = true where id = p_report_id;
end;
$$;

create or replace function public.send_friend_request(p_handle text)
returns void language plpgsql security invoker set search_path = public as $$
declare v_target uuid;
begin
  select id into v_target from public.profiles where lower(handle) = lower(p_handle);
  if v_target is null then raise exception 'No one found with that handle'; end if;
  if v_target = auth.uid() then raise exception 'You can''t add yourself'; end if;
  if public.is_blocked_with(v_target) then raise exception 'No one found with that handle'; end if;
  if exists (select 1 from public.friendships
             where (requester_id = auth.uid() and addressee_id = v_target)
                or (requester_id = v_target and addressee_id = auth.uid())) then
    raise exception 'You are already connected or have a pending request';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (auth.uid(), v_target);
end;
$$;

drop policy if exists "messages readable for public events" on public.messages;
create policy "messages readable for public events"
  on public.messages for select to authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id and e.visibility = 'public')
    and not public.is_blocked_with(messages.profile_id)
  );

create or replace function public.list_attendees(p_event_id uuid)
returns table (profile_id uuid, handle text, avatar_url text, joined_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select a.profile_id, p.handle, p.avatar_url, a.joined_at
  from public.event_attendees a
  join public.profiles p on p.id = a.profile_id
  where a.event_id = p_event_id and public.is_verified()
    and not public.is_blocked_with(a.profile_id)
  order by a.joined_at;
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
  ) e on true
  where not public.is_blocked_with(mf.fid);
$$;

drop function if exists public.nearby_events(double precision, double precision, integer);
create or replace function public.nearby_events(
  user_lat double precision, user_lng double precision, radius_m integer default 30000
)
returns table (
  id uuid, host_id uuid, host_handle text, title text, description text,
  theme text, photo_url text, latitude double precision, longitude double precision,
  open_to_strangers boolean, starts_at timestamptz, ends_at timestamptz,
  attendee_count bigint, location_name text, friends_going bigint,
  location_precision text, approximate boolean
)
language sql stable security invoker set search_path = public as $$
  with base as (
    select e.id, e.host_id, p.handle as host_handle, e.title, e.description,
           e.theme, e.photo_url,
           ST_Y(e.location::geometry) as tlat,
           ST_X(e.location::geometry) as tlng,
           e.open_to_strangers, e.starts_at, e.ends_at, e.location_name,
           e.location_precision,
           (e.location_precision = 'approx'
            and not public.can_see_exact(e.id, e.host_id)) as approximate
    from public.events e
    join public.profiles p on p.id = e.host_id
    where e.visibility = 'public' and e.ends_at > now()
      and not public.is_blocked_with(e.host_id)
      and ST_DWithin(e.location,
                     ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
                     radius_m)
  )
  select b.id, b.host_id, b.host_handle, b.title, b.description, b.theme, b.photo_url,
         case when b.approximate then public.fuzz_lat(b.id, b.tlat) else b.tlat end as latitude,
         case when b.approximate then public.fuzz_lng(b.id, b.tlat, b.tlng) else b.tlng end as longitude,
         b.open_to_strangers, b.starts_at, b.ends_at,
         (select count(*) from public.event_attendees a where a.event_id = b.id) as attendee_count,
         b.location_name,
         (select count(*) from public.event_attendees fa
          join public.friendships f
            on ((f.requester_id = auth.uid() and f.addressee_id = fa.profile_id)
             or (f.requester_id = fa.profile_id and f.addressee_id = auth.uid()))
          where fa.event_id = b.id and f.status = 'accepted') as friends_going,
         b.location_precision, b.approximate
  from base b;
$$;

drop function if exists public.get_event(uuid);
create or replace function public.get_event(p_event_id uuid)
returns table (
  id uuid, host_id uuid, host_handle text, title text, description text,
  theme text, photo_url text, latitude double precision, longitude double precision,
  open_to_strangers boolean, starts_at timestamptz, ends_at timestamptz,
  attendee_count bigint, location_name text, friends_going bigint,
  location_precision text, approximate boolean
)
language sql stable security invoker set search_path = public as $$
  with base as (
    select e.id, e.host_id, p.handle as host_handle, e.title, e.description,
           e.theme, e.photo_url,
           ST_Y(e.location::geometry) as tlat,
           ST_X(e.location::geometry) as tlng,
           e.open_to_strangers, e.starts_at, e.ends_at, e.location_name,
           e.location_precision,
           (e.location_precision = 'approx'
            and not public.can_see_exact(e.id, e.host_id)) as approximate
    from public.events e
    join public.profiles p on p.id = e.host_id
    where e.id = p_event_id and e.visibility = 'public'
      and not public.is_blocked_with(e.host_id)
  )
  select b.id, b.host_id, b.host_handle, b.title, b.description, b.theme, b.photo_url,
         case when b.approximate then public.fuzz_lat(b.id, b.tlat) else b.tlat end as latitude,
         case when b.approximate then public.fuzz_lng(b.id, b.tlat, b.tlng) else b.tlng end as longitude,
         b.open_to_strangers, b.starts_at, b.ends_at,
         (select count(*) from public.event_attendees a where a.event_id = b.id) as attendee_count,
         b.location_name,
         (select count(*) from public.event_attendees fa
          join public.friendships f
            on ((f.requester_id = auth.uid() and f.addressee_id = fa.profile_id)
             or (f.requester_id = fa.profile_id and f.addressee_id = auth.uid()))
          where fa.event_id = b.id and f.status = 'accepted') as friends_going,
         b.location_precision, b.approximate
  from base b;
$$;
