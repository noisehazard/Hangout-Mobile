create table if not exists public.notification_outbox (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  body         text not null,
  data         jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index if not exists notification_outbox_unsent_idx
  on public.notification_outbox (created_at) where sent_at is null;

alter table public.notification_outbox enable row level security;

create or replace function public.notify_friend_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_handle text;
begin
  if new.status = 'pending' then
    select handle into v_handle from public.profiles where id = new.requester_id;
    insert into public.notification_outbox (recipient_id, title, body, data)
    values (
      new.addressee_id,
      'New friend request',
      '@' || coalesce(v_handle, 'someone') || ' sent you a friend request',
      jsonb_build_object('type', 'friend_request', 'url', '/friends')
    );
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_friend_request on public.friendships;
create trigger trg_notify_friend_request after insert on public.friendships
  for each row execute function public.notify_friend_request();

create or replace function public.notify_friend_accepted() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_handle text;
begin
  if new.status = 'accepted' and old.status = 'pending' then
    select handle into v_handle from public.profiles where id = new.addressee_id;
    insert into public.notification_outbox (recipient_id, title, body, data)
    values (
      new.requester_id,
      'Friend request accepted',
      '@' || coalesce(v_handle, 'someone') || ' accepted your friend request',
      jsonb_build_object('type', 'friend_accepted', 'url', '/user/' || new.addressee_id)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_friend_accepted on public.friendships;
create trigger trg_notify_friend_accepted after update on public.friendships
  for each row execute function public.notify_friend_accepted();

create or replace function public.notify_event_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_handle text; v_title text;
begin
  select handle into v_handle from public.profiles where id = new.inviter_id;
  select title into v_title from public.events where id = new.event_id;
  insert into public.notification_outbox (recipient_id, title, body, data)
  values (
    new.invitee_id,
    'Hangout invite',
    '@' || coalesce(v_handle, 'someone') || ' invited you to ' || coalesce(v_title, 'a hangout'),
    jsonb_build_object('type', 'event_invite', 'url', '/event/' || new.event_id)
  );
  return new;
end;
$$;
drop trigger if exists trg_notify_event_invite on public.event_invites;
create trigger trg_notify_event_invite after insert on public.event_invites
  for each row execute function public.notify_event_invite();

create or replace function public.notify_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_handle text; v_title text;
begin
  select handle into v_handle from public.profiles where id = new.profile_id;
  select title into v_title from public.events where id = new.event_id;
  insert into public.notification_outbox (recipient_id, title, body, data)
  select r.rid,
         'New message',
         '@' || coalesce(v_handle, 'someone') || ' in ' || coalesce(v_title, 'a hangout') || ': ' || new.body,
         jsonb_build_object('type', 'message', 'url', '/event/' || new.event_id)
  from (
    select a.profile_id as rid from public.event_attendees a where a.event_id = new.event_id
    union
    select e.host_id from public.events e where e.id = new.event_id
  ) r
  where r.rid <> new.profile_id
    and not public.is_blocked_with(r.rid);
  return new;
end;
$$;
drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message after insert on public.messages
  for each row execute function public.notify_new_message();
