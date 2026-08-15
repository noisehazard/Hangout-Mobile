import { supabase } from '@/lib/supabase';

export type SoftLaunchMetrics = {
  livePerDay: number | null;
  opensWithEventPct: number | null;
  otherHosts14d: number;
  repeatAttendancePct: number | null;
  joinsPerHangout: number | null;
  events14d: number;
  opens14d: number;
};

type Numeric = number | string | null;

export type MetricsRow = {
  live_per_day: Numeric;
  opens_with_event_pct: Numeric;
  other_hosts_14d: Numeric;
  repeat_attendance_pct: Numeric;
  joins_per_hangout: Numeric;
  events_14d: Numeric;
  opens_14d: Numeric;
};

export function rowToMetrics(row: MetricsRow): SoftLaunchMetrics {
  return {
    livePerDay: row.live_per_day === null ? null : Number(row.live_per_day),
    opensWithEventPct: row.opens_with_event_pct === null ? null : Number(row.opens_with_event_pct),
    otherHosts14d: Number(row.other_hosts_14d ?? 0),
    repeatAttendancePct:
      row.repeat_attendance_pct === null ? null : Number(row.repeat_attendance_pct),
    joinsPerHangout: row.joins_per_hangout === null ? null : Number(row.joins_per_hangout),
    events14d: Number(row.events_14d ?? 0),
    opens14d: Number(row.opens_14d ?? 0),
  };
}

export async function fetchMetrics(): Promise<SoftLaunchMetrics | null> {
  const { data, error } = await supabase.rpc('soft_launch_metrics');
  if (error) throw error;
  const rows = data as MetricsRow[];
  return rows.length ? rowToMetrics(rows[0]) : null;
}

export async function recordAppOpen(eventsInRadius: number): Promise<void> {
  await supabase.rpc('record_app_open', { p_events_in_radius: eventsInRadius });
}
