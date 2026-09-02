import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useNow } from '@/hooks/useNow';
import { isLive, startLabel } from '@/lib/eventTime';
import { Colors, Spacing } from '@/theme';
import { HangoutEvent } from '@/types/event';

type Props = {
  events: HangoutEvent[];
  onSelect: (id: string) => void;
  contentInsetTop: number;
};

function sortForList(events: HangoutEvent[], now: number): HangoutEvent[] {
  return [...events].sort((a, b) => {
    const aLive = isLive(a.startTime, now);
    const bLive = isLive(b.startTime, now);
    if (aLive !== bLive) return aLive ? -1 : 1;
    return Date.parse(a.startTime) - Date.parse(b.startTime);
  });
}

export function EventList({ events, onSelect, contentInsetTop }: Props) {
  const now = useNow();
  const ordered = useMemo(() => sortForList(events, now), [events, now]);

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={[styles.content, { paddingTop: contentInsetTop }]}
      data={ordered}
      keyExtractor={(e) => e.id}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nothing happening nearby yet.</Text>
          <Text style={styles.emptySub}>Be the first to post one.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const live = isLive(item.startTime, now);
        return (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => onSelect(item.id)}
          >
            <View style={[styles.dot, live ? styles.dotLive : styles.dotUpcoming]} />
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.locationName ? `${item.locationName} · ` : ''}
                {item.theme ?? 'Hangout'}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.when, live && styles.whenLive]}>
                {startLabel(item.startTime, now)}
              </Text>
              <View style={styles.going}>
                <Ionicons name="people" size={13} color={Colors.textMuted} />
                <Text style={styles.goingText}>{item.attendeeCount}</Text>
                {item.friendsGoing > 0 && (
                  <Text style={styles.friends}>· {item.friendsGoing} friend{item.friendsGoing > 1 ? 's' : ''}</Text>
                )}
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 120 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowPressed: { opacity: 0.6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotLive: { backgroundColor: '#2FBF71' },
  dotUpcoming: { backgroundColor: '#FF385C' },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  meta: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  when: { fontSize: 13, fontWeight: '700', color: Colors.text },
  whenLive: { color: '#2FBF71' },
  going: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  goingText: { fontSize: 12, color: Colors.textMuted },
  friends: { fontSize: 12, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: Spacing.xl * 2, gap: Spacing.xs },
  emptyText: { fontSize: 15, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textMuted },
});
