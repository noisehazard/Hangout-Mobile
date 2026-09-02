import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pushBlockedReason, pushPermissionState, registerForPushNotifications } from '@/data/push';
import { userMessage } from '@/lib/errors';
import { PUSH_UNAVAILABLE_MESSAGE, type PushUnavailableReason } from '@/lib/push';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

type State =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: PushUnavailableReason }
  | { kind: 'on' }
  | { kind: 'off'; canAskAgain: boolean };

const NUDGES = [
  { icon: 'person-add-outline', text: 'A friend request, and when someone accepts yours' },
  { icon: 'mail-outline', text: 'An invite to a hangout' },
  { icon: 'chatbubble-outline', text: 'A new message in a hangout you joined' },
] as const;

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const reason = pushBlockedReason();
    if (reason) {
      setState({ kind: 'unavailable', reason });
      return;
    }
    const { granted, canAskAgain } = await pushPermissionState();
    setState(granted ? { kind: 'on' } : { kind: 'off', canAskAgain });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function enable() {
    setBusy(true);
    try {
      const result = await registerForPushNotifications({ ask: true });
      if (result.status === 'registered') {
        setState({ kind: 'on' });
        toast.success("You're all set.");
      } else if (result.status === 'denied') {
        setState({ kind: 'off', canAskAgain: result.canAskAgain });
      } else {
        setState({ kind: 'unavailable', reason: result.reason });
      }
    } catch (e) {
      toast.error(userMessage(e, "Couldn't turn on notifications.", 'registerPush'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </Pressable>
      <Text style={styles.title}>Notifications</Text>

      <View style={styles.list}>
        {NUDGES.map((n) => (
          <View key={n.text} style={styles.row}>
            <Ionicons name={n.icon} size={20} color={Colors.textMuted} />
            <Text style={styles.rowText}>{n.text}</Text>
          </View>
        ))}
      </View>

      {state.kind === 'loading' && <ActivityIndicator color={Colors.accent} />}

      {state.kind === 'on' && (
        <View style={styles.statusOn}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.statusOnText}>
            Notifications are on. Turn them off any time in your phone&apos;s settings.
          </Text>
        </View>
      )}

      {state.kind === 'off' && state.canAskAgain && (
        <Pressable style={[styles.cta, busy && styles.ctaBusy]} onPress={enable} disabled={busy}>
          <Text style={styles.ctaText}>{busy ? 'Turning on…' : 'Turn on notifications'}</Text>
        </Pressable>
      )}

      {state.kind === 'off' && !state.canAskAgain && (
        <>
          <Text style={styles.note}>
            Notifications are blocked for Hangout. You can turn them back on in your phone&apos;s
            settings.
          </Text>
          <Pressable style={styles.cta} onPress={() => Linking.openSettings()}>
            <Text style={styles.ctaText}>Open settings</Text>
          </Pressable>
        </>
      )}

      {state.kind === 'unavailable' && (
        <Text style={styles.note}>{PUSH_UNAVAILABLE_MESSAGE[state.reason]}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: Spacing.lg },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg },
  list: { gap: Spacing.md, marginBottom: Spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowText: { flex: 1, fontSize: 15, lineHeight: 21, color: Colors.text },
  statusOn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusOnText: { flex: 1, fontSize: 14, lineHeight: 20, color: Colors.textMuted },
  note: { fontSize: 14, lineHeight: 20, color: Colors.textMuted, marginBottom: Spacing.md },
  cta: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaBusy: { opacity: 0.6 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
