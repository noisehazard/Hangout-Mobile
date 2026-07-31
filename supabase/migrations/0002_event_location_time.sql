alter table public.events add column location_name text;

drop function if exists public.create_event(
  text, text, text, double precision, double precision, boolean, timestamptz
);
create or replace function public.create_event(
  p_title text, p_description text, p_theme text,
  p_lat double precision, p_lng double precision,
  p_open_to_strangers boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location_name text
)
returns uuid language sql security invoker set search_path = public as $$
  insert into public.events
    (host_id, title, description, theme, location, open_to_strangers,
     starts_at, ends_at, location_name)
  values
    (auth.uid(), p_title, p_description, p_theme,
     ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
     p_open_to_strangers, coalesce(p_starts_at, now()), p_ends_at, p_location_name)
  returning id;
$$;

drop function if exists public.nearby_events(double precision, double precision, integer);
create or replace function public.nearby_events(
  user_lat double precision, user_lng double precision, radius_m integer default 30000
)
returns table (
  id uuid, host_id uuid, host_handle text, title text, description text,
  theme text, photo_url text, latitude double precision, longitude double precision,
  open_to_strangers boolean, starts_at timestamptz, ends_at timestamptz,
  attendee_count bigint, location_name text
)
language sql stable security invoker set search_path = public as $$
  select e.id, e.host_id, p.handle as host_handle, e.title, e.description,
         e.theme, e.photo_url,
         ST_Y(e.location::geometry) as latitude,
         ST_X(e.location::geometry) as longitude,
         e.open_to_strangers, e.starts_at, e.ends_at,
         count(a.profile_id) as attendee_count,
         e.location_name
  from public.events e
  join public.profiles p on p.id = e.host_id
  left join public.event_attendees a on a.event_id = e.id
  where e.visibility = 'public' and e.ends_at > now()
    and ST_DWithin(e.location,
                   ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
                   radius_m)
  group by e.id, p.handle;
$$;
