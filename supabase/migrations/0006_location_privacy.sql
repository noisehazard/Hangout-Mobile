alter table public.events
  add column if not exists location_precision text not null default 'approx'
  check (location_precision in ('exact','approx'));

create or replace function public.fuzz_lat(p_id uuid, p_lat double precision)
returns double precision language sql immutable set search_path = public as $$
  select p_lat
    + ((('x' || substr(md5(p_id::text), 1, 8))::bit(32)::bigint)::double precision
        / 4294967295.0 - 0.5) * 0.006;
$$;

create or replace function public.fuzz_lng(p_id uuid, p_lat double precision, p_lng double precision)
returns double precision language sql immutable set search_path = public as $$
  select p_lng
    + ((('x' || substr(md5(p_id::text), 9, 8))::bit(32)::bigint)::double precision
        / 4294967295.0 - 0.5) * 0.006 / cos(radians(p_lat));
$$;

create or replace function public.can_see_exact(p_event_id uuid, p_host_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_host_id = auth.uid()
    or exists (select 1 from public.event_attendees a
               where a.event_id = p_event_id and a.profile_id = auth.uid())
    or exists (select 1 from public.friendships f
               where f.status = 'accepted'
                 and ((f.requester_id = auth.uid() and f.addressee_id = p_host_id)
                   or (f.requester_id = p_host_id and f.addressee_id = auth.uid())));
$$;

drop function if exists public.create_event(
  text, text, text, double precision, double precision, boolean, timestamptz, timestamptz, text, text
);
create or replace function public.create_event(
  p_title text, p_description text, p_theme text,
  p_lat double precision, p_lng double precision,
  p_open_to_strangers boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location_name text, p_photo_url text, p_location_precision text
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if public.is_banned() then raise exception 'Your account is suspended'; end if;
  if not public.is_verified() then
    raise exception 'Verify your email to create a hangout';
  end if;
  insert into public.events
    (host_id, title, description, theme, location, open_to_strangers,
     starts_at, ends_at, location_name, photo_url, location_precision)
  values
    (auth.uid(), p_title, p_description, p_theme,
     ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
     p_open_to_strangers, coalesce(p_starts_at, now()), p_ends_at,
     p_location_name, p_photo_url, coalesce(p_location_precision, 'approx'))
  returning id into v_id;
  return v_id;
end;
$$;

drop function if exists public.update_event(
  uuid, text, text, text, double precision, double precision, boolean, timestamptz, timestamptz, text, text
);
create or replace function public.update_event(
  p_event_id uuid, p_title text, p_description text, p_theme text,
  p_lat double precision, p_lng double precision,
  p_open_to_strangers boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location_name text, p_photo_url text, p_location_precision text
) returns void language sql security invoker set search_path = public as $$
  update public.events set
    title = p_title, description = p_description, theme = p_theme,
    location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    open_to_strangers = p_open_to_strangers,
    starts_at = coalesce(p_starts_at, now()), ends_at = p_ends_at,
    location_name = p_location_name, photo_url = p_photo_url,
    location_precision = coalesce(p_location_precision, 'approx')
  where id = p_event_id;   -- RLS "update own events" ensures only the host succeeds
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
