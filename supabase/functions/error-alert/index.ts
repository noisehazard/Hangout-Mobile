import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendAlert } from '../_shared/telegram.ts';
import {
  formatCrashMail,
  formatDigestMail,
  type DigestRow,
  type ErrorRow,
} from './format.ts';

Deno.serve(async (req) => {
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  if (payload.mode === 'digest') {
    return await sendDigest();
  }

  const row = (payload.record ?? null) as ErrorRow | null;
  if (!row) return json({ skipped: 'no record' });
  if (!row.fatal) return json({ skipped: 'not fatal' });

  await sendAlert(formatCrashMail(row));
  return json({ sent: 'crash' });
});

async function sendDigest(): Promise<Response> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('error_digest', { p_since: since });
  if (error) return json({ error: error.message }, 500);

  const mail = formatDigestMail((data ?? []) as DigestRow[], since);
  if (!mail) return json({ sent: 'nothing', reason: 'no errors in window' });

  await sendAlert(mail);
  return json({ sent: 'digest', groups: (data ?? []).length });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
