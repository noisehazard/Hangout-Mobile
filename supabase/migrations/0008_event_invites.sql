create table if not exists public.event_invites (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (event_id, invitee_id)
);
create index if not exists event_invites_invitee_idx on public.event_invites (invitee_id, status);

alter table public.event_invites enable row level security;
drop policy if exists "see own invites" on public.event_invites;
create policy "see own invites" on public.event_invites for select to authenticated
  using (inviter_id = auth.uid() or invitee_id = auth.uid());
drop policy if exists "invite as self" on public.event_invites;
create policy "invite as self" on public.event_invites for insert to authenticated
  with check (inviter_id = auth.uid());
drop policy if exists "respond as invitee" on public.event_invites;
create policy "respond as invitee" on public.event_invites for update to authenticated
  using (invitee_id = auth.uid()) with check (invitee_id = auth.uid());

create or replace function public.invite_friend(p_event_id uuid, p_friend_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_verified() then raise exception 'Verify your email to invite'; end if;
  if public.is_blocked_with(p_friend_id) then raise exception 'Cannot invite this person'; end if;
  if not exists (select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = p_friend_id)
          or (f.requester_id = p_friend_id and f.addressee_id = auth.uid()))) then
    raise exception 'You can only invite friends';
  end if;
  insert into public.event_invites (event_id, inviter_id, invitee_id)
  values (p_event_id, auth.uid(), p_friend_id)
  on conflict (event_id, invitee_id) do nothing;
end;
$$;

create or replace function public.list_my_invites()
returns table (invite_id uuid, event_id uuid, event_title text,
               inviter_handle text, created_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select i.id, i.event_id, e.title, p.handle, i.created_at
  from public.event_invites i
  join public.events e on e.id = i.event_id
  join public.profiles p on p.id = i.inviter_id
  where i.invitee_id = auth.uid() and i.status = 'pending' and e.ends_at > now()
  order by i.created_at desc;
$$;

create or replace function public.respond_invite(p_invite_id uuid, p_accept boolean)
returns void language plpgsql security invoker set search_path = public as $$
declare v_event uuid;
begin
  select event_id into v_event from public.event_invites
    where id = p_invite_id and invitee_id = auth.uid() and status = 'pending';
  if v_event is null then return; end if;
  if p_accept then
    if not public.is_verified() then raise exception 'Verify your email to join'; end if;
    insert into public.event_attendees (event_id, profile_id)
    values (v_event, auth.uid()) on conflict do nothing;
    update public.event_invites set status = 'accepted' where id = p_invite_id;
  else
    update public.event_invites set status = 'declined' where id = p_invite_id;
  end if;
end;
$$;
