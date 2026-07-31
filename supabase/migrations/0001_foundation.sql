create extension if not exists postgis;
create extension if not exists pg_cron;

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text not null,
  avatar_url   text,
  is_anonymous boolean not null default true,
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle, is_anonymous)
  values (
    new.id,
    'Guest-' || lpad((floor(random() * 10000))::int::text, 4, '0'),
    coalesce(new.is_anonymous, true)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.events (
  id                uuid primary key default gen_random_uuid(),
  host_id           uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  description       text not null default '',
  theme             text,
  photo_url         text,
  location          geography(Point, 4326) not null,
  open_to_strangers boolean not null default true,
  starts_at         timestamptz not null default now(),
  ends_at           timestamptz not null,
  visibility        text not null default 'public' check (visibility in ('public')),
  created_at        timestamptz not null default now()
);
create index events_location_gix on public.events using gist (location);
create index events_ends_at_idx  on public.events (ends_at);

create table public.event_attendees (
  event_id   uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (event_id, profile_id)
);

alter table public.profiles         enable row level security;
alter table public.events           enable row level security;
alter table public.event_attendees  enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "public events readable"
  on public.events for select to authenticated using (visibility = 'public');
create policy "insert own events"
  on public.events for insert to authenticated with check (host_id = auth.uid());
create policy "update own events"
  on public.events for update to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "delete own events"
  on public.events for delete to authenticated using (host_id = auth.uid());

create policy "attendees of public events readable"
  on public.event_attendees for select to authenticated
  using (exists (select 1 from public.events e
                 where e.id = event_id and e.visibility = 'public'));
create policy "join as self"
  on public.event_attendees for insert to authenticated
  with check (profile_id = auth.uid());
create policy "leave as self"
  on public.event_attendees for delete to authenticated
  using (profile_id = auth.uid());

create or replace function public.nearby_events(
  user_lat double precision,
  user_lng double precision,
  radius_m integer default 30000
)
returns table (
  id uuid, host_id uuid, host_handle text, title text, description text,
  theme text, photo_url text, latitude double precision, longitude double precision,
  open_to_strangers boolean, starts_at timestamptz, ends_at timestamptz,
  attendee_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select e.id, e.host_id, p.handle as host_handle, e.title, e.description,
         e.theme, e.photo_url,
         ST_Y(e.location::geometry) as latitude,
         ST_X(e.location::geometry) as longitude,
         e.open_to_strangers, e.starts_at, e.ends_at,
         count(a.profile_id) as attendee_count
  from public.events e
  join public.profiles p on p.id = e.host_id
  left join public.event_attendees a on a.event_id = e.id
  where e.visibility = 'public'
    and e.ends_at > now()
    and ST_DWithin(e.location,
                   ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
                   radius_m)
  group by e.id, p.handle;
$$;

create or replace function public.create_event(
  p_title text, p_description text, p_theme text,
  p_lat double precision, p_lng double precision,
  p_open_to_strangers boolean, p_ends_at timestamptz
)
returns uuid
language sql
security invoker
set search_path = public
as $$
  insert into public.events
    (host_id, title, description, theme, location, open_to_strangers, ends_at)
  values
    (auth.uid(), p_title, p_description, p_theme,
     ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
     p_open_to_strangers, p_ends_at)
  returning id;
$$;

create or replace function public.join_event(p_event_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.event_attendees (event_id, profile_id)
  values (p_event_id, auth.uid())
  on conflict do nothing;
$$;

select cron.schedule(
  'hangout-cleanup',
  '0 * * * *',
  $$delete from public.events where ends_at < now() - interval '1 day'$$
);
