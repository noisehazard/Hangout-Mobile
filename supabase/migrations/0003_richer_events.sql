create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_event_created_idx on public.messages (event_id, created_at);

alter table public.messages enable row level security;

create policy "messages readable for public events"
  on public.messages for select to authenticated
  using (exists (select 1 from public.events e
                 where e.id = event_id and e.visibility = 'public'));

create policy "post if joined"
  on public.messages for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (select 1 from public.event_attendees a
                where a.event_id = messages.event_id and a.profile_id = auth.uid())
  );

alter publication supabase_realtime add table public.messages;

create or replace function public.get_event(p_event_id uuid)
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
  where e.id = p_event_id and e.visibility = 'public'
  group by e.id, p.handle;
$$;

drop function if exists public.create_event(
  text, text, text, double precision, double precision, boolean, timestamptz, timestamptz, text
);
create or replace function public.create_event(
  p_title text, p_description text, p_theme text,
  p_lat double precision, p_lng double precision,
  p_open_to_strangers boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location_name text, p_photo_url text
)
returns uuid language sql security invoker set search_path = public as $$
  insert into public.events
    (host_id, title, description, theme, location, open_to_strangers,
     starts_at, ends_at, location_name, photo_url)
  values
    (auth.uid(), p_title, p_description, p_theme,
     ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
     p_open_to_strangers, coalesce(p_starts_at, now()), p_ends_at, p_location_name, p_photo_url)
  returning id;
$$;

create or replace function public.update_event(
  p_event_id uuid, p_title text, p_description text, p_theme text,
  p_lat double precision, p_lng double precision,
  p_open_to_strangers boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location_name text, p_photo_url text
)
returns void language sql security invoker set search_path = public as $$
  update public.events set
    title = p_title, description = p_description, theme = p_theme,
    location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    open_to_strangers = p_open_to_strangers,
    starts_at = coalesce(p_starts_at, now()), ends_at = p_ends_at,
    location_name = p_location_name, photo_url = p_photo_url
  where id = p_event_id;   -- RLS "update own events" ensures only the host succeeds
$$;

insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

create policy "event-photos public read"
  on storage.objects for select using (bucket_id = 'event-photos');
create policy "event-photos authenticated upload"
  on storage.objects for insert to authenticated with check (bucket_id = 'event-photos');
