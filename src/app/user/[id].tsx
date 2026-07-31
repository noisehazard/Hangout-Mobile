import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { removeFriend, respondFriendRequest, sendFriendRequest } from '@/data/friends';
import { getPublicProfile } from '@/data/profile';
import { PublicProfile } from '@/data/profileMappers';
import { blockUser, submitReport, unblockUser } from '@/data/safety';
import { userMessage } from '@/lib/errors';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

const REPORT_REASONS = ['Inappropriate', 'Spam or scam', 'Safety concern'];

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const p = await getPublicProfile(id);
      if (p?.relationship === 'self') {
        router.replace('/(tabs)/profile');
        return;
      }
      setProfile(p);
    } catch (e) {
      console.warn('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await load();
    } catch (e) {
      toast.error(userMessage(e, "Couldn't do that just now.", 'profileAction'));
    } finally {
      setBusy(false);
    }
  }

  function reportUser() {
    if (!profile) return;
    Alert.alert('Report user', 'Why are you reporting this person?', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await submitReport('user', profile.id, reason);
            toast.success('Thanks — our team will take a look.');
          } catch (e) {
            toast.error(userMessage(e, "Couldn't send that report.", 'submitReport'));
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function confirmBlock() {
    if (!profile) return;
    Alert.alert('Block user', `Block @${profile.handle}? You won't see each other anymore.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => run(() => blockUser(profile.id)) },
    ]);
  }

  function confirmRemove() {
    if (!profile) return;
    Alert.alert('Remove friend', `Remove @${profile.handle} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(() => removeFriend(profile.id)) },
    ]);
  }

  function openMenu() {
    if (!profile) return;
    Alert.alert('Options', undefined, [
      { text: 'Report user', onPress: reportUser },
      { text: 'Block user', style: 'destructive', onPress: confirmBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function renderPrimary() {
    if (!profile) return null;
    switch (profile.relationship) {
      case 'none':
        return (
          <PrimaryButton
            label="Add friend"
            disabled={busy}
            onPress={() => run(() => sendFriendRequest(profile.handle))}
          />
        );
      case 'outgoing':
        return (
          <PrimaryButton
            label="Requested"
            variant="muted"
            disabled={busy}
            onPress={() => run(() => removeFriend(profile.id))}
          />
        );
      case 'incoming':
        return (
          <View style={styles.dualRow}>
            <PrimaryButton
              label="Accept"
              disabled={busy || !profile.requestId}
              onPress={() => run(() => respondFriendRequest(profile.requestId as string, true))}
            />
            <PrimaryButton
              label="Decline"
              variant="muted"
              disabled={busy || !profile.requestId}
              onPress={() => run(() => respondFriendRequest(profile.requestId as string, false))}
            />
          </View>
        );
      case 'friends':
        return <PrimaryButton label="Friends ✓" variant="muted" disabled={busy} onPress={confirmRemove} />;
      case 'i_blocked':
        return (
          <PrimaryButton
            label="Unblock"
            disabled={busy}
            onPress={() => run(() => unblockUser(profile.id))}
          />
        );
      default:
        return null;
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.lg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </Pressable>
        {profile && profile.relationship !== 'i_blocked' && (
          <Pressable style={styles.iconBtn} onPress={openMenu}>
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : !profile ? (
        <Text style={styles.unavailable}>This profile isn&apos;t available.</Text>
      ) : (
        <View style={styles.body}>
          <Avatar uri={profile.avatarUrl} handle={profile.handle} size={96} />
          <View style={styles.nameRow}>
            <Text style={styles.handle}>@{profile.handle}</Text>
            {profile.verified && <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />}
          </View>
          <Text style={styles.meta}>Member since {memberSince(profile.createdAt)}</Text>
          {profile.mutualFriends > 0 && (
            <Text style={styles.meta}>
              {profile.mutualFriends} mutual friend{profile.mutualFriends === 1 ? '' : 's'}
            </Text>
          )}

          <View style={styles.actions}>{renderPrimary()}</View>
        </View>
      )}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'accent',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'accent' | 'muted';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        variant === 'muted' && styles.primaryMuted,
        (pressed || disabled) && styles.primaryDim,
      ]}
    >
      <Text style={[styles.primaryText, variant === 'muted' && styles.primaryTextMuted]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: Spacing.lg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { alignItems: 'center', marginTop: Spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md },
  handle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  meta: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  actions: { marginTop: Spacing.lg, width: '100%', alignItems: 'center' },
  dualRow: { flexDirection: 'row', gap: Spacing.sm },
  primary: {
    minWidth: 160,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  primaryMuted: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
  primaryDim: { opacity: 0.5 },
  primaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  primaryTextMuted: { color: Colors.text },
  unavailable: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
});
