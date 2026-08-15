import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { formatMetricsMail, type MetricsRow } from './format.ts';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase.rpc('admin_metrics_for_digest');
  if (error) return json({ error: error.message }, 500);

  const rows = (data ?? []) as MetricsRow[];
  if (!rows.length) return json({ sent: 'nothing', reason: 'no metrics row' });

  await sendMail(formatMetricsMail(rows[0]));
  return json({ sent: 'metrics' });
});

async function sendMail(mail: { subject: string; text: string }): Promise<void> {
  const to = Deno.env.get('ALERT_EMAIL_TO');
  const user = Deno.env.get('SMTP_USER');
  const password = Deno.env.get('SMTP_PASS');
  const hostname = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com';
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465');
  if (!to || !user || !password) {
    console.warn('[metrics-digest] SMTP env not configured; skipping send');
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
    headers: { 'Content-Type': 'application/json' },
  });
}
