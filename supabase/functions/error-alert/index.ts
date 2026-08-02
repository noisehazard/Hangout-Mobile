import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import {
  formatCrashMail,
  formatDigestMail,
  type DigestRow,
  type ErrorRow,
  type Mail,
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

  await sendMail(formatCrashMail(row));
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

  await sendMail(mail);
  return json({ sent: 'digest', groups: (data ?? []).length });
}

async function sendMail(mail: Mail): Promise<void> {
  const to = Deno.env.get('ALERT_EMAIL_TO');
  const user = Deno.env.get('SMTP_USER');
  const password = Deno.env.get('SMTP_PASS');
  const hostname = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com';
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465');
  if (!to || !user || !password) {
    console.warn('[error-alert] SMTP env not configured; skipping send');
    return;
  }

  const client = new SMTPClient({
    connection: { hostname, port, tls: true, auth: { username: user, password } },
  });
  try {
    await client.send({ from: user, to, subject: mail.subject, content: mail.text });
  } finally {
    await client.close();
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
