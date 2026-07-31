create table if not exists public.push_tokens (
  token      text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform   text not null default 'android',
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_profile_idx on public.push_tokens (profile_id);

alter table public.push_tokens enable row level security;

drop policy if exists "see own push tokens" on public.push_tokens;
create policy "see own push tokens" on public.push_tokens for select to authenticated
  using (profile_id = auth.uid());
drop policy if exists "insert own push tokens" on public.push_tokens;
create policy "insert own push tokens" on public.push_tokens for insert to authenticated
  with check (profile_id = auth.uid());
drop policy if exists "update own push tokens" on public.push_tokens;
create policy "update own push tokens" on public.push_tokens for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "delete own push tokens" on public.push_tokens;
create policy "delete own push tokens" on public.push_tokens for delete to authenticated
  using (profile_id = auth.uid());

create or replace function public.register_push_token(p_token text, p_platform text default 'android')
returns void language sql security definer set search_path = public as $$
  insert into public.push_tokens (token, profile_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update
    set profile_id = auth.uid(), platform = excluded.platform, updated_at = now();
$$;
