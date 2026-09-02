import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildExpoPushMessages,
  chunk,
  invalidTokensFromTickets,
  type ExpoTicket,
  type OutboxItem,
} from './messages.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Claim rather than select: the webhook fires once per inserted row, so
  // several invocations run at once and would otherwise each read the same
  // unsent rows and send them all. claim_notifications (migration 0023) hands
  // each row to exactly one caller.
  const { data: items, error: outboxErr } = await supabase.rpc('claim_notifications', {
    p_limit: 100,
  });
  if (outboxErr) return json({ error: outboxErr.message }, 500);
  if (!items || items.length === 0) return json({ processed: 0 });

  const recipientIds = [...new Set((items as OutboxItem[]).map((i) => i.recipient_id))];
  const { data: tokenRows, error: tokErr } = await supabase
    .from('push_tokens')
    .select('token, profile_id')
    .in('profile_id', recipientIds);
  if (tokErr) return json({ error: tokErr.message }, 500);

  const tokensByRecipient: Record<string, string[]> = {};
  for (const r of tokenRows ?? []) {
    (tokensByRecipient[r.profile_id] ??= []).push(r.token);
  }

  const messages = buildExpoPushMessages(items as OutboxItem[], tokensByRecipient);
  const invalidTokens: string[] = [];
  for (const batch of chunk(messages, 100)) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(batch),
    });
    const payload = await res.json().catch(() => ({}));
    const tickets: ExpoTicket[] = payload?.data ?? [];
    invalidTokens.push(...invalidTokensFromTickets(batch, tickets));
  }

  // Only now that Expo has accepted them. A row claimed but never stamped is
  // retried once its claim goes stale, so a crash here delays delivery rather
  // than dropping it.
  await supabase
    .from('notification_outbox')
    .update({ sent_at: new Date().toISOString() })
    .in('id', (items as OutboxItem[]).map((i) => i.id));

  if (invalidTokens.length > 0) {
    await supabase.from('push_tokens').delete().in('token', invalidTokens);
  }

  return json({ processed: items.length, messages: messages.length, pruned: invalidTokens.length });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
