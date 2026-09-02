import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendAlert } from '../_shared/telegram.ts';
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

  await sendAlert(formatMetricsMail(rows[0]));
  return json({ sent: 'metrics' });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
