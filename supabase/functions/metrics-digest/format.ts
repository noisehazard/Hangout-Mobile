export type MetricsRow = {
  live_per_day: number | string | null;
  opens_with_event_pct: number | string | null;
  other_hosts_14d: number | string | null;
  repeat_attendance_pct: number | string | null;
  joins_per_hangout: number | string | null;
  events_14d: number | string | null;
  opens_14d: number | string | null;
};

export type Mail = { subject: string; text: string };

type Line = { label: string; value: number | null; suffix: string; target: number };

function num(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toLines(row: MetricsRow): Line[] {
  return [
    { label: 'Live hangouts per day', value: num(row.live_per_day), suffix: '', target: 1 },
    { label: 'Opens with something nearby', value: num(row.opens_with_event_pct), suffix: '%', target: 70 },
    { label: 'Hosts who are not you (14d)', value: num(row.other_hosts_14d), suffix: '', target: 3 },
    { label: 'Repeat attendance', value: num(row.repeat_attendance_pct), suffix: '%', target: 40 },
    { label: 'Joins per hangout', value: num(row.joins_per_hangout), suffix: '', target: 3 },
  ];
}

export function formatMetricsMail(row: MetricsRow): Mail {
  const lines = toLines(row);
  const hit = lines.filter((l) => l.value !== null && l.value >= l.target).length;

  const body = lines
    .map((l) => {
      const shown = l.value === null ? '—' : `${l.value}${l.suffix}`;
      const mark = l.value === null ? '?' : l.value >= l.target ? 'OK' : '!!';
      return `${mark}  ${l.label.padEnd(30)} ${shown.padStart(7)}   target ${l.target}${l.suffix}`;
    })
    .join('\n');

  const hosts = num(row.other_hosts_14d) ?? 0;
  const verdict =
    hosts >= 3
      ? 'Hosts other than you are the real metric, and it is being met.'
      : hosts > 0
        ? `Only ${hosts} host${hosts > 1 ? 's' : ''} other than you in 14 days. That is the number to move.`
        : 'Nobody but you has hosted in 14 days. That is the number to move, ahead of any feature work.';

  return {
    subject: `Hangout weekly — ${hit}/5 targets met`,
    text: [
      'Soft launch metrics, last 14 days.',
      '',
      body,
      '',
      `${num(row.events_14d) ?? 0} hangouts, ${num(row.opens_14d) ?? 0} app opens.`,
      'A dash means no data yet, which is not the same as zero.',
      '',
      verdict,
    ].join('\n'),
  };
}
