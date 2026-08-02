create table if not exists public.client_errors (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles(id) on delete set null,
  tag           text not null,
  code          text,
  message       text,
  fatal         boolean not null default false,
  app_version   text,
  os_name       text,
  os_version    text,
  device_model  text,
  created_at    timestamptz not null default now()
);

create index if not exists client_errors_created_idx
  on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

drop policy if exists "log own errors" on public.client_errors;
create policy "log own errors"
  on public.client_errors for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "admins read errors" on public.client_errors;
create policy "admins read errors"
  on public.client_errors for select to authenticated
  using (public.is_admin());

create or replace function public.error_digest(p_since timestamptz)
returns table (tag text, code text, message text, fatal boolean, occurrences bigint, users bigint)
language sql stable security definer set search_path = public as $$
  select e.tag,
         e.code,
         min(e.message) as message,
         bool_or(e.fatal) as fatal,
         count(*) as occurrences,
         count(distinct e.profile_id) as users
  from public.client_errors e
  where e.created_at >= p_since
  group by e.tag, e.code
  order by bool_or(e.fatal) desc, count(*) desc
  limit 50;
$$;

revoke all on function public.error_digest(timestamptz) from anon, authenticated;

select cron.schedule(
  'client-errors-cleanup',
  '30 * * * *',
  $$delete from public.client_errors where created_at < now() - interval '30 days'$$
);
