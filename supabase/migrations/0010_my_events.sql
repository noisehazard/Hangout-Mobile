create or replace function public.my_events()
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
         b.location_precision, b.approximate
  from base b
  order by b.starts_at desc;
$$;

create or replace function public.leave_event(p_event_id uuid)
returns void language sql security invoker set search_path = public as $$
  delete from public.event_attendees where event_id = p_event_id and profile_id = auth.uid();
$$;
