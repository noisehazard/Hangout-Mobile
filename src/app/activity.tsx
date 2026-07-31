import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { listFriendActivity } from '@/data/activity';
import { ActivityItem } from '@/data/activityMappers';
import { userMessage } from '@/lib/errors';
import { openUserProfile } from '@/lib/nav';
import { toast } from '@/lib/toast';
import { timeAgo } from '@/lib/timeAgo';
import { Colors, Spacing } from '@/theme';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItems(await listFriendActivity());
    } catch (e) {
      toast.error(userMessage(e, "Couldn't load activity.", 'friendActivity'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </Pressable>
      <Text style={styles.title}>Activity</Text>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No recent activity from friends.</Text>
      ) : (
        items.map((item, i) => (
          <Pressable
            key={`${item.kind}-${item.actorId}-${item.eventId}-${i}`}
            style={styles.row}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.eventId } })}
          >
            <Pressable onPress={() => openUserProfile(item.actorId)}>
              <Avatar uri={item.actorAvatarUrl} handle={item.actorHandle} size={44} />
            </Pressable>
            <View style={styles.body}>
              <Text style={styles.line}>
                <Text style={styles.handle}>@{item.actorHandle}</Text>
                {item.kind === 'hosting' ? ' is hosting ' : ' joined '}
                <Text style={styles.eventTitle}>{item.eventTitle}</Text>
              </Text>
              <Text style={styles.meta}>
                {item.eventTheme ? `${item.eventTheme} · ` : ''}
                {timeAgo(item.at)}
              </Text>
            </View>
          </Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  body: { flex: 1 },
  line: { fontSize: 15, color: Colors.text },
  handle: { fontWeight: '700', color: Colors.text },
  eventTitle: { fontWeight: '700', color: Colors.text },
  meta: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
});
