import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Friend } from '@/data/friendMappers';
import { listFriends } from '@/data/friends';
import { inviteFriend } from '@/data/invites';
import { userMessage } from '@/lib/errors';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [invited, setInvited] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      setFriends(await listFriends());
    } catch (e) {
      toast.error(userMessage(e, "Couldn't load your friends.", 'loadFriends'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(friendId: string) {
    if (!id) return;
    setInvited((cur) => ({ ...cur, [friendId]: true }));
    try {
      await inviteFriend(id, friendId);
    } catch (e) {
      setInvited((cur) => ({ ...cur, [friendId]: false }));
      toast.error(userMessage(e, "Couldn't send that invite.", 'inviteFriend'));
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </Pressable>
      <Text style={styles.title}>Invite friends</Text>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : friends.length === 0 ? (
        <Text style={styles.empty}>Add friends first to invite them.</Text>
      ) : (
        friends.map((f) => (
          <View key={f.id} style={styles.row}>
            <Text style={styles.handle}>@{f.handle}</Text>
            <Pressable
              style={[styles.invite, invited[f.id] && styles.invited]}
              onPress={() => invite(f.id)}
              disabled={invited[f.id]}
            >
              <Text style={[styles.inviteText, invited[f.id] && styles.invitedText]}>
                {invited[f.id] ? 'Invited' : 'Invite'}
              </Text>
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
  invite: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.accent,
  },
  invited: { backgroundColor: Colors.bgElement },
  inviteText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  invitedText: { color: Colors.textMuted },
});
