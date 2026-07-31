import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchMyEvents } from '@/data/events';
import { useAuth } from '@/lib/auth';
import { userMessage } from '@/lib/errors';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';
import { HangoutEvent } from '@/types/event';

function formatStart(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MyHangoutsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [events, setEvents] = useState<HangoutEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setEvents(await fetchMyEvents());
    } catch (e) {
      toast.error(userMessage(e, "Couldn't load your hangouts.", 'myEvents'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </Pressable>
      <Text style={styles.title}>Your hangouts</Text>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : events.length === 0 ? (
        <Text style={styles.empty}>You&apos;re not hosting or going to anything right now.</Text>
      ) : (
        events.map((e) => {
          const hosting = e.hostId === session?.user.id;
          return (
            <Pressable
              key={e.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {e.title}
                </Text>
                <View style={[styles.badge, hosting ? styles.hostBadge : styles.goingBadge]}>
                  <Text style={[styles.badgeText, hosting ? styles.hostBadgeText : styles.goingBadgeText]}>
                    {hosting ? 'Hosting' : 'Going'}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>🕒 {formatStart(e.startTime)}</Text>
              <Text style={styles.meta}>👥 {e.attendeeCount} going</Text>
            </Pressable>
          );
        })
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
  pressed: { opacity: 0.85 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  hostBadge: { backgroundColor: Colors.accentSoft },
  goingBadge: { backgroundColor: Colors.bgElement },
  badgeText: { fontSize: 12, fontWeight: '700' },
  hostBadgeText: { color: Colors.accent },
  goingBadgeText: { color: Colors.textMuted },
  meta: { fontSize: 14, color: Colors.text },
});
