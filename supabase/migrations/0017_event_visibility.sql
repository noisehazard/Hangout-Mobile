alter table public.events drop constraint if exists events_visibility_check;
alter table public.events add constraint events_visibility_check
  check (visibility in ('public', 'friends', 'private'));

create or replace function public.can_access_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (
        e.host_id = auth.uid()
        or e.visibility = 'public'
        or (e.visibility = 'friends' and exists (
              select 1 from public.friendships f
              where f.status = 'accepted'
                and ((f.requester_id = auth.uid() and f.addressee_id = e.host_id)
                  or (f.requester_id = e.host_id and f.addressee_id = auth.uid()))))
        or (e.visibility = 'private' and exists (
              select 1 from public.event_invites i
              where i.event_id = e.id and i.invitee_id = auth.uid()))
      )
  );
$$;

drop policy if exists "public events readable" on public.events;
drop policy if exists "accessible events readable" on public.events;
create policy "accessible events readable"
  on public.events for select to authenticated
  using (public.can_access_event(id));

drop policy if exists "attendees of public events readable" on public.event_attendees;
drop policy if exists "attendees of accessible events readable" on public.event_attendees;
create policy "attendees of accessible events readable"
  on public.event_attendees for select to authenticated
  using (public.can_access_event(event_id));

drop policy if exists "messages readable for public events" on public.messages;
drop policy if exists "messages readable for accessible events" on public.messages;
create policy "messages readable for accessible events"
  on public.messages for select to authenticated
  using (
    public.can_access_event(event_id)
    and not public.is_blocked_with(messages.profile_id)
  );

create or replace function public.join_event(p_event_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if public.is_banned() then raise exception 'Your account is suspended'; end if;
  if not public.is_verified() then
    raise exception 'Verify your email to join';
  end if;
  if not public.can_access_event(p_event_id) then
    raise exception 'You can''t join this hangout';
  end if;
  insert into public.event_attendees (event_id, profile_id)
  values (p_event_id, auth.uid())
  on conflict do nothing;
end;
$$;

drop function if exists public.get_event(uuid);
create or replace function public.get_event(p_event_id uuid)
returns table (
  id uuid, host_id uuid, host_handle text, title text, description text,
  theme text, photo_url text, latitude double precision, longitude double precision,
  open_to_strangers boolean, starts_at timestamptz, ends_at timestamptz,
  attendee_count bigint, location_name text, friends_going bigint,
  location_precision text, approximate boolean, visibility text
)
language sql stable security invoker set search_path = public as $$
  with base as (
    select e.id, e.host_id, p.handle as host_handle, e.title, e.description,
           e.theme, e.photo_url,
           ST_Y(e.location::geometry) as tlat,
           ST_X(e.location::geometry) as tlng,
           e.open_to_strangers, e.starts_at, e.ends_at, e.location_name,
           e.location_precision, e.visibility,
           (e.location_precision = 'approx'
            and not public.can_see_exact(e.id, e.host_id)) as approximate
    from public.events e
    join public.profiles p on p.id = e.host_id
    where e.id = p_event_id and public.can_access_event(e.id)
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
         b.location_precision, b.approximate, b.visibility
  from base b;
$$;

create or replace function public.list_attendees(p_event_id uuid)
returns table (profile_id uuid, handle text, avatar_url text, joined_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select a.profile_id, p.handle, p.avatar_url, a.joined_at
  from public.event_attendees a
  join public.profiles p on p.id = a.profile_id
  where a.event_id = p_event_id and public.is_verified()
    and public.can_access_event(p_event_id)
    and not public.is_blocked_with(a.profile_id)
  order by a.joined_at;
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
  location_precision text, approximate boolean, visibility text
)
language sql stable security invoker set search_path = public as $$
  with base as (
    select e.id, e.host_id, p.handle as host_handle, e.title, e.description,
           e.theme, e.photo_url,
           ST_Y(e.location::geometry) as tlat,
           ST_X(e.location::geometry) as tlng,
           e.open_to_strangers, e.starts_at, e.ends_at, e.location_name,
           e.location_precision, e.visibility,
           (e.location_precision = 'approx'
            and not public.can_see_exact(e.id, e.host_id)) as approximate
    from public.events e
    join public.profiles p on p.id = e.host_id
    where e.ends_at > now()
      and not public.is_blocked_with(e.host_id)
      and (
        e.visibility = 'public'
        or e.host_id = auth.uid()
        or (e.visibility = 'friends' and exists (
              select 1 from public.friendships f
              where f.status = 'accepted'
                and ((f.requester_id = auth.uid() and f.addressee_id = e.host_id)
                  or (f.requester_id = e.host_id and f.addressee_id = auth.uid()))))
      )
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
         b.location_precision, b.approximate, b.visibility
  from base b;
$$;

drop function if exists public.my_events();
create or replace function public.my_events()
returns table (
  id uuid, host_id uuid, host_handle text, title text, description text,
  theme text, photo_url text, latitude double precision, longitude double precision,
  open_to_strangers boolean, starts_at timestamptz, ends_at timestamptz,
  attendee_count bigint, location_name text, friends_going bigint,
  location_precision text, approximate boolean, visibility text
)
language sql stable security invoker set search_path = public as $$
  with base as (
    select e.id, e.host_id, p.handle as host_handle, e.title, e.description,
           e.theme, e.photo_url,
           ST_Y(e.location::geometry) as tlat,
           ST_X(e.location::geometry) as tlng,
           e.open_to_strangers, e.starts_at, e.ends_at, e.location_name,
           e.location_precision, e.visibility,
           (e.location_precision = 'approx'
            and not public.can_see_exact(e.id, e.host_id)) as approximate
    from public.events e
    join public.profiles p on p.id = e.host_id
    where e.ends_at > now()
      and (e.host_id = auth.uid()
           or exists (select 1 from public.event_attendees a
                      where a.event_id = e.id and a.profile_id = auth.uid()))
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
         b.location_precision, b.approximate, b.visibility
  from base b
  order by b.starts_at desc;
$$;

create or replace function public.friend_activity()
returns table (
  kind text, actor_id uuid, actor_handle text, actor_avatar_url text,
  event_id uuid, event_title text, event_theme text, at timestamptz
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
  where e.visibility in ('public', 'friends') and e.ends_at > now()
    and not public.is_blocked_with(e.host_id)
  union all
  select 'joined' as kind, a.profile_id as actor_id, p.handle as actor_handle,
         p.avatar_url as actor_avatar_url, e.id as event_id, e.title as event_title,
         e.theme as event_theme, a.joined_at as at
  from public.event_attendees a
  join my_friends mf on mf.fid = a.profile_id
  join public.events e on e.id = a.event_id
  join public.profiles p on p.id = a.profile_id
  where e.visibility in ('public', 'friends') and e.ends_at > now()
    and a.profile_id <> e.host_id
    and not public.is_blocked_with(a.profile_id)
  order by at desc
  limit 50;
$$;

drop function if exists public.create_event(
  text, text, text, double precision, double precision, boolean,
  timestamptz, timestamptz, text, text, text);
create or replace function public.create_event(
  p_title text, p_description text, p_theme text,
  p_lat double precision, p_lng double precision,
  p_open_to_strangers boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location_name text, p_photo_url text, p_location_precision text,
  p_visibility text default 'public'
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if public.is_banned() then raise exception 'Your account is suspended'; end if;
  if not public.is_verified() then
    raise exception 'Verify your email to create a hangout';
  end if;
  if p_visibility not in ('public', 'friends', 'private') then
    raise exception 'Invalid visibility';
  end if;
  insert into public.events
    (host_id, title, description, theme, location, open_to_strangers,
     starts_at, ends_at, location_name, photo_url, location_precision, visibility)
  values
    (auth.uid(), p_title, p_description, p_theme,
     ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
     p_open_to_strangers, coalesce(p_starts_at, now()), p_ends_at,
     p_location_name, p_photo_url, coalesce(p_location_precision, 'approx'),
     coalesce(p_visibility, 'public'))
  returning id into v_id;
  return v_id;
end;
$$;

drop function if exists public.update_event(
  uuid, text, text, text, double precision, double precision, boolean,
  timestamptz, timestamptz, text, text, text);
create or replace function public.update_event(
  p_event_id uuid, p_title text, p_description text, p_theme text,
  p_lat double precision, p_lng double precision,
  p_open_to_strangers boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location_name text, p_photo_url text, p_location_precision text,
  p_visibility text default 'public'
) returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_visibility not in ('public', 'friends', 'private') then
    raise exception 'Invalid visibility';
  end if;
  update public.events set
    title = p_title, description = p_description, theme = p_theme,
    location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    open_to_strangers = p_open_to_strangers,
    starts_at = coalesce(p_starts_at, now()), ends_at = p_ends_at,
    location_name = p_location_name, photo_url = p_photo_url,
    location_precision = coalesce(p_location_precision, 'approx'),
    visibility = coalesce(p_visibility, 'public')
  where id = p_event_id;   -- RLS "update own events" ensures only the host succeeds
end;
$$;
