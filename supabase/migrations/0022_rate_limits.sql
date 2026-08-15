create or replace function public.check_rate_limit(
  p_action text, p_max integer, p_window interval
)
returns void
language plpgsql stable security definer set search_path = public as $$
declare v_count integer;
begin
  if auth.uid() is null then return; end if;

  if p_action = 'create_event' then
    select count(*) into v_count from public.events
    where host_id = auth.uid() and created_at > now() - p_window;
  elsif p_action = 'join_event' then
    select count(*) into v_count from public.event_attendees
    where profile_id = auth.uid() and joined_at > now() - p_window;
  elsif p_action = 'message' then
    select count(*) into v_count from public.messages
    where profile_id = auth.uid() and created_at > now() - p_window;
  elsif p_action = 'friend_request' then
    select count(*) into v_count from public.friendships
    where requester_id = auth.uid() and created_at > now() - p_window;
  elsif p_action = 'report' then
    select count(*) into v_count from public.reports
    where reporter_id = auth.uid() and created_at > now() - p_window;
  else
    return;
  end if;

  if v_count >= p_max then
    raise exception 'You are doing that too often. Try again a bit later.';
  end if;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, interval) from public, anon;

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
    raise exception 'Save your account to create a hangout';
  end if;
  if p_visibility not in ('public', 'friends', 'private') then
    raise exception 'Invalid visibility';
  end if;
  if p_ends_at <= coalesce(p_starts_at, now()) then
    raise exception 'A hangout has to end after it starts';
  end if;
  perform public.check_rate_limit('create_event', 10, interval '1 hour');

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

create or replace function public.join_event(p_event_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if public.is_banned() then raise exception 'Your account is suspended'; end if;
  if not public.is_verified() then
    raise exception 'Save your account to join';
  end if;
  if not public.can_access_event(p_event_id) then
    raise exception 'You can''t join this hangout';
  end if;
  perform public.check_rate_limit('join_event', 40, interval '1 hour');
  insert into public.event_attendees (event_id, profile_id)
  values (p_event_id, auth.uid())
  on conflict do nothing;
end;
$$;

create or replace function public.duplicate_event(p_event_id uuid, p_starts_at timestamptz)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_src public.events; v_id uuid; v_duration interval;
begin
  if public.is_banned() then raise exception 'Your account is suspended'; end if;
  if not public.is_verified() then
    raise exception 'Save your account to create a hangout';
  end if;

  select * into v_src from public.events
  where id = p_event_id and host_id = auth.uid();
  if not found then
    raise exception 'You can only repeat a hangout you hosted';
  end if;

  perform public.check_rate_limit('create_event', 10, interval '1 hour');

  v_duration := v_src.ends_at - v_src.starts_at;

  insert into public.events
    (host_id, title, description, theme, location, open_to_strangers,
     starts_at, ends_at, location_name, photo_url, location_precision, visibility)
  values
    (auth.uid(), v_src.title, v_src.description, v_src.theme, v_src.location,
     v_src.open_to_strangers, p_starts_at, p_starts_at + v_duration,
     v_src.location_name, v_src.photo_url, v_src.location_precision, v_src.visibility)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.duplicate_event(uuid, timestamptz) from public, anon;
grant execute on function public.duplicate_event(uuid, timestamptz) to authenticated;
