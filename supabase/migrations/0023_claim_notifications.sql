-- Concurrent invocations of send-push each read the same unsent rows before any
-- of them stamped sent_at, so one chat message — which enqueues a row per
-- attendee, and therefore fires the webhook once per attendee — could deliver
-- the same notification several times.
--
-- claim_notifications hands every row to exactly one caller. FOR UPDATE SKIP
-- LOCKED makes parallel callers take disjoint sets instead of queueing.
--
-- Claiming is deliberately separate from sending. claimed_at reserves the row;
-- sent_at is stamped only once Expo has accepted it. A claim that is never
-- completed — the function crashed, the runtime was killed mid-flight — becomes
-- eligible again after p_stale, so a failure delays a notification rather than
-- losing it. Stamping sent_at up front would have been simpler and would have
-- traded duplicate sends for silent losses, which is the worse failure.

alter table public.notification_outbox
  add column if not exists claimed_at timestamptz;

create index if not exists notification_outbox_claimable_idx
  on public.notification_outbox (created_at)
  where sent_at is null;

create or replace function public.claim_notifications(
  p_limit int default 100,
  p_stale interval default '5 minutes'
)
returns table (id uuid, recipient_id uuid, title text, body text, data jsonb)
language sql
security definer
set search_path = public
as $$
  with claimed as (
    select c.id
      from public.notification_outbox c
     where c.sent_at is null
       and (c.claimed_at is null or c.claimed_at < now() - p_stale)
     order by c.created_at
     for update skip locked
     limit p_limit
  )
  update public.notification_outbox o
     set claimed_at = now()
    from claimed
   where o.id = claimed.id
  returning o.id, o.recipient_id, o.title, o.body, o.data;
$$;

-- Postgres grants EXECUTE to PUBLIC by default; only the service role that
-- send-push authenticates with has any business draining the queue.
revoke all on function public.claim_notifications(int, interval) from public;
revoke all on function public.claim_notifications(int, interval) from anon;
revoke all on function public.claim_notifications(int, interval) from authenticated;
grant execute on function public.claim_notifications(int, interval) to service_role;
