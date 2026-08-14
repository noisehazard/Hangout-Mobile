alter table public.events add column if not exists link_token uuid;

create or replace function public.enable_event_link(p_event_id uuid)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_token uuid;
begin
  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.host_id = auth.uid()
  ) then
    raise exception 'Only the host can share this hangout';
  end if;
  v_token := gen_random_uuid();
  update public.events set link_token = v_token where id = p_event_id;
  return v_token;
end;
$$;

create or replace function public.disable_event_link(p_event_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.host_id = auth.uid()
  ) then
    raise exception 'Only the host can change this hangout';
  end if;
  update public.events set link_token = null where id = p_event_id;
end;
$$;

drop function if exists public.get_event_by_link(uuid, uuid);
create or replace function public.get_event_by_link(p_event_id uuid, p_token uuid)
returns table (
  id uuid, host_id uuid, host_handle text, title text, description text,
  theme text, photo_url text, latitude double precision, longitude double precision,
  open_to_strangers boolean, starts_at timestamptz, ends_at timestamptz,
  attendee_count bigint, location_name text, friends_going bigint,
  location_precision text, approximate boolean, visibility text
)
language sql stable security definer set search_path = public as $$
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
    where e.id = p_event_id
      and e.ends_at > now()
      and e.link_token is not null
      and e.link_token = p_token
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

create or replace function public.join_event_by_link(p_event_id uuid, p_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_banned() then raise exception 'Your account is suspended'; end if;
  if not public.is_verified() then
    raise exception 'Verify your email to join';
  end if;
  if not exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.ends_at > now()
      and e.link_token is not null
      and e.link_token = p_token
      and not public.is_blocked_with(e.host_id)
  ) then
    raise exception 'That link is no longer valid';
  end if;
  insert into public.event_attendees (event_id, profile_id)
  values (p_event_id, auth.uid())
  on conflict do nothing;
end;
$$;

revoke all on function public.get_event_by_link(uuid, uuid) from public, anon;
revoke all on function public.join_event_by_link(uuid, uuid) from public, anon;
grant execute on function public.get_event_by_link(uuid, uuid) to authenticated;
grant execute on function public.join_event_by_link(uuid, uuid) to authenticated;
