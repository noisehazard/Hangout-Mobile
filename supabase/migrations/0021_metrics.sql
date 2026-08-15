create table if not exists public.app_opens (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid references public.profiles(id) on delete set null,
  events_in_radius  integer not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists app_opens_created_at_idx on public.app_opens (created_at desc);

alter table public.app_opens enable row level security;

drop policy if exists "insert own app opens" on public.app_opens;
create policy "insert own app opens"
  on public.app_opens for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "admins read app opens" on public.app_opens;
create policy "admins read app opens"
  on public.app_opens for select to authenticated
  using (public.is_admin());

create or replace function public.record_app_open(p_events_in_radius integer)
returns void
language sql security invoker set search_path = public as $$
  insert into public.app_opens (profile_id, events_in_radius)
  values (auth.uid(), greatest(coalesce(p_events_in_radius, 0), 0));
$$;

create or replace function public.soft_launch_metrics()
returns table (
  live_per_day numeric,
  opens_with_event_pct numeric,
  other_hosts_14d bigint,
  repeat_attendance_pct numeric,
  joins_per_hangout numeric,
  events_14d bigint,
  opens_14d bigint
)
language sql stable security definer set search_path = public as $$
  with guard as (select public.is_admin() as ok),
  days as (
    select generate_series(
      date_trunc('day', now()) - interval '13 days',
      date_trunc('day', now()),
      interval '1 day'
    ) as day
  ),
  live as (
    select d.day,
           (select count(*) from public.events e
            where e.starts_at < d.day + interval '1 day'
              and e.ends_at   > d.day) as n
    from days d
  ),
  opens as (
    select count(*) as total,
           count(*) filter (where events_in_radius > 0) as with_event
    from public.app_opens
    where created_at > now() - interval '14 days'
  ),
  recent_events as (
    select * from public.events where created_at > now() - interval '14 days'
  ),
  joiners as (
    select profile_id, count(*) as joins
    from public.event_attendees
    where joined_at > now() - interval '30 days'
    group by profile_id
  )
  select
    (select round(avg(n), 2) from live),
    (select case when total = 0 then null
                 else round(100.0 * with_event / total, 1) end from opens),
    (select count(distinct host_id) from recent_events where host_id <> auth.uid()),
    (select case when count(*) = 0 then null
                 else round(100.0 * count(*) filter (where joins >= 2) / count(*), 1) end
     from joiners),
    (select case when count(*) = 0 then null
                 else round(avg((select count(*) from public.event_attendees a
                                 where a.event_id = e.id)), 2) end
     from recent_events e),
    (select count(*) from recent_events),
    (select total from opens)
  where (select ok from guard);
$$;

revoke all on function public.soft_launch_metrics() from public, anon;
grant execute on function public.soft_launch_metrics() to authenticated;

create or replace function public.admin_metrics_for_digest()
returns table (
  live_per_day numeric,
  opens_with_event_pct numeric,
  other_hosts_14d bigint,
  repeat_attendance_pct numeric,
  joins_per_hangout numeric,
  events_14d bigint,
  opens_14d bigint
)
language sql stable security definer set search_path = public as $$
  with days as (
    select generate_series(
      date_trunc('day', now()) - interval '13 days',
      date_trunc('day', now()),
      interval '1 day'
    ) as day
  ),
  live as (
    select d.day,
           (select count(*) from public.events e
            where e.starts_at < d.day + interval '1 day'
              and e.ends_at   > d.day) as n
    from days d
  ),
  opens as (
    select count(*) as total,
           count(*) filter (where events_in_radius > 0) as with_event
    from public.app_opens
    where created_at > now() - interval '14 days'
  ),
  recent_events as (
    select * from public.events where created_at > now() - interval '14 days'
  ),
  joiners as (
    select profile_id, count(*) as joins
    from public.event_attendees
    where joined_at > now() - interval '30 days'
    group by profile_id
  )
  select
    (select round(avg(n), 2) from live),
    (select case when total = 0 then null
                 else round(100.0 * with_event / total, 1) end from opens),
    (select count(distinct e.host_id) from recent_events e
      join public.profiles p on p.id = e.host_id
      where p.is_admin = false),
    (select case when count(*) = 0 then null
                 else round(100.0 * count(*) filter (where joins >= 2) / count(*), 1) end
     from joiners),
    (select case when count(*) = 0 then null
                 else round(avg((select count(*) from public.event_attendees a
                                 where a.event_id = e.id)), 2) end
     from recent_events e),
    (select count(*) from recent_events),
    (select total from opens);
$$;

revoke all on function public.admin_metrics_for_digest() from public, anon, authenticated;
