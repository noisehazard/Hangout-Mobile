import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EventAttendee } from '@/data/attendeeMappers';
import { openUserProfile } from '@/lib/nav';
import { Colors, Spacing } from '@/theme';

type Props = {
  attendees: EventAttendee[];
  count: number;
  locked?: boolean;
};

export function WhoIsGoing({ attendees, count, locked = false }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{count} going</Text>
      {attendees.length > 0 ? (
        <View style={styles.row}>
          {attendees.map((attendee) => (
            <Pressable
              key={attendee.profileId}
              style={styles.person}
              onPress={() => openUserProfile(attendee.profileId)}
            >
              <Avatar uri={attendee.avatarUrl} handle={attendee.handle} size={48} />
              <Text style={styles.handle} numberOfLines={1}>
                {attendee.handle}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : locked && count > 0 ? (
        <Text style={styles.empty}>Verify your account to see who&apos;s going</Text>
      ) : (
        <Text style={styles.empty}>Be the first to join</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  empty: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  person: {
    alignItems: 'center',
    width: 64,
  },
  handle: {
    marginTop: Spacing.xs,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
