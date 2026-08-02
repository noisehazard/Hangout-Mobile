export type ErrorRow = {
  tag: string;
  code: string | null;
  message: string | null;
  fatal: boolean;
  app_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_model: string | null;
  created_at: string;
};

export type DigestRow = {
  tag: string;
  code: string | null;
  message: string | null;
  fatal: boolean;
  occurrences: number;
  users: number;
};

export type Mail = {
  subject: string;
  text: string;
};

function device(row: {
  os_name: string | null;
  os_version: string | null;
  device_model: string | null;
  app_version: string | null;
}): string {
  const parts = [
    row.device_model,
    row.os_name && row.os_version ? `${row.os_name} ${row.os_version}` : row.os_name,
    row.app_version ? `app ${row.app_version}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'unknown device';
}

export function formatCrashMail(row: ErrorRow): Mail {
  const where = row.tag || 'unknown';
  return {
    subject: `[HangoutAI] Crash in ${where}`,
    text: [
      `A crash was reported.`,
      ``,
      `Where:   ${where}`,
      `Message: ${row.message ?? '(none)'}`,
      `Code:    ${row.code ?? '(none)'}`,
      `Device:  ${device(row)}`,
      `When:    ${row.created_at}`,
    ].join('\n'),
  };
}

export function formatDigestMail(rows: DigestRow[], since: string): Mail | null {
  if (rows.length === 0) return null;

  const total = rows.reduce((sum, r) => sum + r.occurrences, 0);
  const crashes = rows.filter((r) => r.fatal);

  const lines = rows.map((r) => {
    const label = r.fatal ? 'CRASH' : r.code ?? '-';
    return `${String(r.occurrences).padStart(4)}x  ${r.users} user(s)  [${label}]  ${r.tag}: ${
      r.message ?? '(no message)'
    }`;
  });

  return {
    subject: `[HangoutAI] ${total} error${total === 1 ? '' : 's'} in the last day${
      crashes.length > 0 ? ` (${crashes.length} crash type${crashes.length === 1 ? '' : 's'})` : ''
    }`,
    text: [`Errors since ${since}:`, ``, ...lines].join('\n'),
  };
}
