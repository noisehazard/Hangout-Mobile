import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/theme';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Ionicons
        name="chevron-back"
        size={26}
        color={Colors.text}
        onPress={() => router.back()}
        style={styles.back}
      />

      <View style={styles.body}>
        <Ionicons name="notifications-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.title}>Notifications are coming</Text>
        <Text style={styles.text}>
          We&apos;re still building these. Soon you&apos;ll be able to get a nudge when a friend
          invites you to a hangout, someone accepts your friend request, or there&apos;s a new
          message in a hangout you joined.
        </Text>
        <Text style={styles.text}>
          For now, check the Friends tab for invites and requests.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
  },
  back: {
    marginBottom: Spacing.md,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.xl * 2,
    gap: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
