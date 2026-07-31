import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminReport, adminBanUser, adminRemoveEvent, listReports, resolveReport } from '@/data/safety';
import { userMessage } from '@/lib/errors';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setReports(await listReports());
    } catch (e) {
      toast.error(userMessage(e, "Couldn't load reports.", 'listReports'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<void>) {
    try {
      await fn();
      await load();
    } catch (e) {
      toast.error(userMessage(e, "Couldn't apply that action.", 'adminAction'));
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </Pressable>
      <Text style={styles.title}>Reports</Text>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : reports.length === 0 ? (
        <Text style={styles.empty}>No open reports.</Text>
      ) : (
        reports.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.reason}>{r.reason}</Text>
            <Text style={styles.meta}>
              {r.targetType} · by @{r.reporterHandle}
            </Text>
            <View style={styles.actions}>
              {r.targetType === 'event' && (
                <Pressable style={styles.danger} onPress={() => act(() => adminRemoveEvent(r.targetId))}>
                  <Text style={styles.dangerText}>Remove event</Text>
                </Pressable>
              )}
              {r.targetType === 'user' && (
                <Pressable style={styles.danger} onPress={() => act(() => adminBanUser(r.targetId))}>
                  <Text style={styles.dangerText}>Ban user</Text>
                </Pressable>
              )}
              <Pressable style={styles.dismiss} onPress={() => act(() => resolveReport(r.id))}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, backgroundColor: Colors.bg },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  empty: { fontSize: 14, color: Colors.textMuted, marginTop: Spacing.lg },
  card: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 14,
    padding: Spacing.md, marginBottom: Spacing.md, gap: 4,
  },
  reason: { fontSize: 16, fontWeight: '700', color: Colors.text },
  meta: { fontSize: 13, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  danger: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#D92D20',
  },
  dangerText: { color: '#D92D20', fontSize: 13, fontWeight: '700' },
  dismiss: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  dismissText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
});
