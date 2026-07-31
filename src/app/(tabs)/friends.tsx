import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  listFriendRequests,
  listFriends,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
} from '@/data/friends';
import { Friend, FriendRequest } from '@/data/friendMappers';
import { EventInvite, listMyInvites, respondInvite } from '@/data/invites';
import { Avatar } from '@/components/Avatar';
import { userMessage } from '@/lib/errors';
import { openUserProfile } from '@/lib/nav';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

const AVATAR_COLORS = ['#FF385C', '#3B82F6', '#0A7D2C', '#B45309', '#7C3AED', '#0891B2'];

function avatarColor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [invites, setInvites] = useState<EventInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [reqs, frs, invs] = await Promise.all([
        listFriendRequests(),
        listFriends(),
        listMyInvites(),
      ]);
      setRequests(reqs);
      setFriends(frs);
      setInvites(invs);
    } catch (e) {
      toast.error(userMessage(e, "Couldn't load your friends.", 'loadFriendsTab'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleAdd() {
    const h = handle.trim().replace(/^@/, '');
    if (!h || adding) return;
    setAdding(true);
    try {
      await sendFriendRequest(h);
      setHandle('');
      toast.success(`Friend request sent to @${h}.`);
      await load();
    } catch (e) {
      toast.error(userMessage(e, "Couldn't send that friend request.", 'addFriend'));
    } finally {
      setAdding(false);
    }
  }

  async function respond(id: string, accept: boolean) {
    try {
      await respondFriendRequest(id, accept);
      await load();
    } catch (e) {
      toast.error(userMessage(e, "Couldn't update that request.", 'respondToRequest'));
    }
  }

  async function respondToInvite(id: string, accept: boolean, eventId: string) {
    try {
      await respondInvite(id, accept);
      await load();
      if (accept) router.push({ pathname: '/event/[id]', params: { id: eventId } });
    } catch (e) {
      toast.error(userMessage(e, "Couldn't update that invite.", 'respondToInvite'));
    }
  }

  function confirmRemove(friend: Friend) {
    Alert.alert('Remove friend', `Remove @${friend.handle} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFriend(friend.id);
            await load();
          } catch (e) {
            toast.error(userMessage(e, "Couldn't remove that friend.", 'removeFriend'));
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Friends</Text>
        <Pressable hitSlop={10} onPress={() => router.push('/activity')}>
          <Ionicons name="notifications-outline" size={24} color={Colors.text} />
        </Pressable>
      </View>

      {/* Add a friend */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={handle}
          onChangeText={setHandle}
          placeholder="Add by @handle"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          onSubmitEditing={handleAdd}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (pressed || !handle.trim() || adding) && styles.sendButtonDim,
          ]}
          onPress={handleAdd}
          disabled={!handle.trim() || adding}
        >
          {adding ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="person-add" size={18} color="#fff" />
          )}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : (
        <>
          {/* Event invites */}
          {invites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Event invites</Text>
              {invites.map((inv) => (
                <View key={inv.inviteId} style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.handleText}>{inv.eventTitle}</Text>
                    <Text style={styles.status}>from @{inv.inviterHandle}</Text>
                  </View>
                  <Pressable
                    style={styles.accept}
                    onPress={() => respondToInvite(inv.inviteId, true, inv.eventId)}
                  >
                    <Text style={styles.acceptText}>Join</Text>
                  </Pressable>
                  <Pressable
                    style={styles.decline}
                    onPress={() => respondToInvite(inv.inviteId, false, inv.eventId)}
                  >
                    <Text style={styles.declineText}>Ignore</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Incoming requests */}
          {requests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Requests</Text>
              {requests.map((r) => (
                <View key={r.id} style={styles.row}>
                  <Pressable onPress={() => openUserProfile(r.requesterId)}>
                    <Avatar uri={r.avatarUrl} handle={r.handle} size={48} color={avatarColor(r.requesterId)} />
                  </Pressable>
                  <Text style={styles.handleText}>@{r.handle}</Text>
                  <Pressable style={styles.accept} onPress={() => respond(r.id, true)}>
                    <Text style={styles.acceptText}>Accept</Text>
                  </Pressable>
                  <Pressable style={styles.decline} onPress={() => respond(r.id, false)}>
                    <Text style={styles.declineText}>Decline</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Friends list */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {friends.length > 0 ? `Your friends · ${friends.length}` : 'Your friends'}
            </Text>
            {friends.length === 0 ? (
              <Text style={styles.empty}>No friends yet — add someone by their @handle.</Text>
            ) : (
              friends.map((f) => {
                const out = !!f.activeEventTitle;
                return (
                  <Pressable
                    key={f.id}
                    style={styles.row}
                    onPress={() =>
                      f.activeEventId &&
                      router.push({ pathname: '/event/[id]', params: { id: f.activeEventId } })
                    }
                    onLongPress={() => confirmRemove(f)}
                  >
                    <Pressable onPress={() => openUserProfile(f.id)}>
                      <Avatar uri={f.avatarUrl} handle={f.handle} size={48} color={avatarColor(f.id)} />
                      {out && <View style={styles.presenceDot} />}
                    </Pressable>
                    <View style={styles.flex}>
                      <Text style={styles.handleText}>@{f.handle}</Text>
                      <Text style={[styles.status, out && styles.statusActive]}>
                        {out ? `At ${f.activeEventTitle}` : 'Free'}
                      </Text>
                    </View>
                    <Pressable hitSlop={10} onPress={() => confirmRemove(f)}>
                      <Ionicons name="ellipsis-horizontal" size={20} color="#C4C7CE" />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.bg,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  addRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.bgElement,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDim: { opacity: 0.6 },
  section: { marginTop: Spacing.lg },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  presenceDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2.5,
    borderColor: Colors.bg,
  },
  handleText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  status: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  statusActive: { color: Colors.success, fontWeight: '600' },
  accept: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.accent,
  },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  decline: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  declineText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  empty: { fontSize: 14, color: Colors.textMuted, marginTop: Spacing.xs },
});
