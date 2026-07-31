alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists banned   boolean not null default false;
alter table public.profiles add column if not exists is_admin boolean not null default false;

update public.profiles set verified = true where is_anonymous = false and verified = false;

create or replace function public.handle_user_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null then
    update public.profiles
      set verified = true, is_anonymous = false
      where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_verified();

create or replace function public.is_verified()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select verified from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_banned()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select banned from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.create_event(
  p_title text, p_description text, p_theme text,
  p_lat double precision, p_lng double precision,
  p_open_to_strangers boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location_name text, p_photo_url text
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if public.is_banned() then raise exception 'Your account is suspended'; end if;
  if not public.is_verified() then
    raise exception 'Verify your email to create a hangout';
  end if;
  insert into public.events
    (host_id, title, description, theme, location, open_to_strangers,
     starts_at, ends_at, location_name, photo_url)
  values
    (auth.uid(), p_title, p_description, p_theme,
     ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
     p_open_to_strangers, coalesce(p_starts_at, now()), p_ends_at,
     p_location_name, p_photo_url)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.join_event(p_event_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if public.is_banned() then raise exception 'Your account is suspended'; end if;
  if not public.is_verified() then
    raise exception 'Verify your email to join';
  end if;
  insert into public.event_attendees (event_id, profile_id)
  values (p_event_id, auth.uid())
  on conflict do nothing;
end;
$$;

create or replace function public.list_attendees(p_event_id uuid)
returns table (profile_id uuid, handle text, avatar_url text, joined_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select a.profile_id, p.handle, p.avatar_url, a.joined_at
  from public.event_attendees a
  join public.profiles p on p.id = a.profile_id
  where a.event_id = p_event_id and public.is_verified()
  order by a.joined_at;
$$;
