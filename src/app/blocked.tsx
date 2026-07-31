import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockedUser, listBlocked, unblockUser } from '@/data/safety';
import { userMessage } from '@/lib/errors';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

export default function BlockedScreen() {
  const insets = useSafeAreaInsets();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setBlocked(await listBlocked());
    } catch (e) {
      toast.error(userMessage(e, "Couldn't load your blocked list.", 'listBlocked'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function unblock(user: BlockedUser) {
    try {
      await unblockUser(user.profileId);
      await load();
    } catch (e) {
      toast.error(userMessage(e, "Couldn't unblock that person.", 'unblockUser'));
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </Pressable>
      <Text style={styles.title}>Blocked users</Text>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : blocked.length === 0 ? (
        <Text style={styles.empty}>You haven&apos;t blocked anyone.</Text>
      ) : (
        blocked.map((u) => (
          <View key={u.profileId} style={styles.row}>
            <Text style={styles.handle}>@{u.handle}</Text>
            <Pressable style={styles.unblock} onPress={() => unblock(u)}>
              <Text style={styles.unblockText}>Unblock</Text>
            </Pressable>
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
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  handle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  unblock: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  unblockText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
});
