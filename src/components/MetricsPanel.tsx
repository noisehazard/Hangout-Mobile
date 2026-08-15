import { StyleSheet, Text, View } from 'react-native';

import { SoftLaunchMetrics } from '@/data/metrics';
import { Colors, Spacing } from '@/theme';

type Row = {
  label: string;
  value: number | null;
  suffix?: string;
  target: number;
  why: string;
};

function rows(m: SoftLaunchMetrics): Row[] {
  return [
    {
      label: 'Live hangouts per day',
      value: m.livePerDay,
      target: 1,
      why: 'The map-is-empty problem, directly',
    },
    {
      label: 'Opens with something nearby',
      value: m.opensWithEventPct,
      suffix: '%',
      target: 70,
      why: 'What a user actually experiences',
    },
    {
      label: 'Hosts who are not you (14d)',
      value: m.otherHosts14d,
      target: 3,
      why: 'Whether it can outlive your effort',
    },
    {
      label: 'Repeat attendance',
      value: m.repeatAttendancePct,
      suffix: '%',
      target: 40,
      why: 'Whether it is worth coming back to',
    },
    {
      label: 'Joins per hangout',
      value: m.joinsPerHangout,
      target: 3,
      why: 'Whether events are worth showing up to',
    },
  ];
}

export function MetricsPanel({ metrics }: { metrics: SoftLaunchMetrics }) {
  return (
    <View style={styles.wrap}>
      {rows(metrics).map((r) => {
        const hasValue = r.value !== null;
        const met = hasValue && (r.value as number) >= r.target;
        return (
          <View key={r.label} style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.why}>{r.why}</Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.value, hasValue && (met ? styles.good : styles.bad)]}>
                {hasValue ? `${r.value}${r.suffix ?? ''}` : '—'}
              </Text>
              <Text style={styles.target}>
                target {r.target}
                {r.suffix ?? ''}
              </Text>
            </View>
          </View>
        );
      })}
      <Text style={styles.footnote}>
        {metrics.events14d} hangouts and {metrics.opens14d} app opens in the last 14 days. A dash
        means there is no data yet, which is not the same as zero.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  left: { flex: 1 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.text },
  why: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  right: { alignItems: 'flex-end', minWidth: 74 },
  value: { fontSize: 19, fontWeight: '800', color: Colors.textMuted },
  good: { color: '#2FBF71' },
  bad: { color: '#D6455D' },
  target: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  footnote: { fontSize: 12, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 17 },
});
