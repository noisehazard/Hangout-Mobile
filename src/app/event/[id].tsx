import { Ionicons } from '@expo/vector-icons';
import { Href, router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventChat } from '@/components/EventChat';
import { LeafletMap } from '@/components/LeafletMap';
import { WhoIsGoing } from '@/components/WhoIsGoing';
import { EventAttendee } from '@/data/attendeeMappers';
import { deleteEvent, fetchAttendees, getEvent, joinEvent, leaveEvent } from '@/data/events';
import { blockUser, submitReport } from '@/data/safety';
import { useAuth } from '@/lib/auth';
import { userMessage } from '@/lib/errors';
import { needsVerification, promptToVerify } from '@/lib/gating';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';
import { HangoutEvent } from '@/types/event';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<HangoutEvent | null | undefined>(undefined);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [ev, att] = await Promise.all([getEvent(id), fetchAttendees(id)]);
      setEvent(ev);
      setAttendees(att);
    } catch (e) {
      console.warn('Failed to load event', e);
      setEvent(null);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleJoin() {
    if (!id) return;
    if (needsVerification(profile)) {
      promptToVerify();
      return;
    }
    setJoining(true);
    try {
      await joinEvent(id);
      const att = await fetchAttendees(id);
      setAttendees(att);
    } catch (e) {
      toast.error(userMessage(e, "Couldn't join that hangout.", 'joinEvent'));
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!id) return;
    setLeaving(true);
    try {
      await leaveEvent(id);
      const att = await fetchAttendees(id);
      setAttendees(att);
    } catch (e) {
      toast.error(userMessage(e, "Couldn't leave that hangout.", 'leaveEvent'));
    } finally {
      setLeaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert('Delete this hangout?', 'This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(id);
            router.back();
          } catch (e) {
            toast.error(userMessage(e, "Couldn't delete that hangout.", 'deleteEvent'));
          }
        },
      },
    ]);
  }

  function reportEvent() {
    if (!id) return;
    const reasons = ['Inappropriate', 'Spam or scam', 'Safety concern'];
    Alert.alert('Report hangout', 'Why are you reporting this?', [
      ...reasons.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await submitReport('event', id, reason);
            toast.success('Thanks — our team will take a look.');
          } catch (e) {
            toast.error(userMessage(e, "Couldn't send that report.", 'submitReport'));
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function blockHost() {
    if (!event) return;
    const host = event;
    Alert.alert('Block host', `Block @${host.hostHandle}? You won't see each other anymore.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(host.hostId);
            router.back();
          } catch (e) {
            toast.error(userMessage(e, "Couldn't block that person.", 'blockUser'));
          }
        },
      },
    ]);
  }

  function openMenu() {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Report hangout', onPress: reportEvent },
    ];
    if (session?.user.id !== event?.hostId) {
      options.push({ text: 'Block host', onPress: blockHost });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Options', undefined, options);
  }

  if (event === undefined) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (event === null) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top + Spacing.lg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.notFoundText}>This hangout isn&apos;t available</Text>
      </View>
    );
  }

  const isHost = session?.user.id === event.hostId;
  const joined = attendees.some((a) => a.profileId === session?.user.id);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        {event.photoUrl && (
          <Image source={{ uri: event.photoUrl }} style={styles.photo} resizeMode="cover" />
        )}

        <View style={[styles.topBar, { top: insets.top + Spacing.sm }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </Pressable>
          <Pressable style={styles.backButton} onPress={openMenu}>
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{event.title}</Text>
          {event.locationName && (
            <Text style={styles.location}>📍 {event.locationName}</Text>
          )}
          {event.approximate && (
            <Text style={styles.location}>
              ≈ Approximate area — the exact spot shows once you join
            </Text>
          )}

          <View style={styles.mapWrap}>
            <LeafletMap
              events={[event]}
              region={{
                latitude: event.latitude,
                longitude: event.longitude,
                latitudeDelta: 0.02,
              }}
              onSelectEvent={() => {}}
            />
          </View>

          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.metaBlock}>
            <Text style={styles.meta}>Hosted by {event.hostHandle}</Text>
            <Text style={styles.meta}>🕒 {formatTime(event.startTime)} – {formatTime(event.endsAt)}</Text>
            {event.theme && <Text style={styles.meta}>✨ {event.theme}</Text>}
            {event.visibility !== 'public' && (
              <Text style={styles.meta}>
                🔒 {event.visibility === 'friends' ? 'Friends only' : 'Invite only'}
              </Text>
            )}
            {event.friendsGoing > 0 && (
              <Text style={styles.friendsGoing}>
                👥 {event.friendsGoing} friend{event.friendsGoing === 1 ? '' : 's'} going
              </Text>
            )}
            <Text style={[styles.openness, event.openToStrangers ? styles.open : styles.closed]}>
              {event.openToStrangers
                ? '👋 Open to meeting new people'
                : '🔒 Not looking for new people right now'}
            </Text>
          </View>

          <WhoIsGoing
            attendees={attendees}
            count={event.attendeeCount}
            locked={needsVerification(profile)}
          />

          {!needsVerification(profile) && (
            <Pressable
              style={({ pressed }) => [styles.inviteButton, pressed && styles.pressed]}
              onPress={() => router.push(`/event/${id}/invite` as unknown as Href)}
            >
              <Ionicons name="person-add-outline" size={18} color={Colors.accent} />
              <Text style={styles.inviteButtonText}>Invite friends</Text>
            </Pressable>
          )}

          <EventChat eventId={id} joined={joined} />

          {!isHost && joined && (
            <Pressable
              style={({ pressed }) => [styles.leaveButton, (pressed || leaving) && styles.pressed]}
              onPress={handleLeave}
              disabled={leaving}
            >
              <Text style={styles.leaveButtonText}>{leaving ? 'Leaving…' : 'Leave'}</Text>
            </Pressable>
          )}

          {!isHost && !joined && event.openToStrangers && (
            <Pressable
              style={({ pressed }) => [styles.joinButton, (pressed || joining) && styles.pressed]}
              onPress={handleJoin}
              disabled={joining}
            >
              <Text style={styles.joinButtonText}>{joining ? 'Joining…' : "I'm in!"}</Text>
            </Pressable>
          )}

          {isHost && (
            <View style={styles.hostActions}>
              <Pressable
                style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
                onPress={() => router.push(`/event/${id}/edit` as unknown as Href)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  notFound: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.bg,
  },
  notFoundText: {
    marginTop: Spacing.xl,
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  photo: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.bgElement,
  },
  topBar: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
  },
  location: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  mapWrap: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
  },
  description: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  metaBlock: {
    gap: Spacing.xs,
  },
  meta: {
    fontSize: 14,
    color: Colors.text,
  },
  friendsGoing: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.sm,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  inviteButtonText: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  openness: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  open: {
    color: Colors.success,
  },
  closed: {
    color: '#8A8F98',
  },
  joinButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  leaveButton: {
    marginTop: Spacing.sm,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  hostActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D92D20',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#D92D20',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
