import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { HangoutEvent } from '@/types/event';

type Props = {
  events: HangoutEvent[] | null;
  onJoin: (eventId: string) => void;
  onOpenDetails?: (eventId: string) => void;
};

function formatStart(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function EventCard({
  event,
  onJoin,
  onOpenDetails,
}: {
  event: HangoutEvent;
  onJoin: (id: string) => void;
  onOpenDetails?: (id: string) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onOpenDetails && styles.cardPressed]}
      onPress={onOpenDetails ? () => onOpenDetails(event.id) : undefined}
    >
      <View style={styles.headerRow}>
        {event.photoUrl && (
          <Image source={{ uri: event.photoUrl }} style={styles.thumbnail} resizeMode="cover" />
        )}
        <View style={styles.headerText}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        </View>
      </View>

      {event.locationName && (
        <Text style={styles.location} numberOfLines={1}>
          📍 {event.locationName}
        </Text>
      )}

      {event.approximate && (
        <Text style={styles.location}>≈ Approximate area — exact spot shown after you join</Text>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.meta}>🕒 {formatStart(event.startTime)}</Text>
        <Text style={styles.meta}>👥 {event.attendeeCount} going</Text>
      </View>

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

      {onOpenDetails && (
        <Pressable
          style={({ pressed }) => [styles.detailsButton, pressed && styles.detailsButtonPressed]}
          onPress={() => onOpenDetails(event.id)}
        >
          <Text style={styles.detailsButtonText}>See details</Text>
        </Pressable>
      )}

      {event.openToStrangers && (
        <Pressable
          style={({ pressed }) => [styles.joinButton, pressed && styles.joinButtonPressed]}
          onPress={() => onJoin(event.id)}
        >
          <Text style={styles.joinButtonText}>I&apos;m in!</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export const EventBottomSheet = forwardRef<BottomSheetModal, Props>(function EventBottomSheet(
  { events, onJoin, onOpenDetails },
  ref,
) {
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal ref={ref} enableDynamicSizing backdropComponent={renderBackdrop}>
      <BottomSheetView style={styles.content}>
        {events?.map((event) => (
          <EventCard key={event.id} event={event} onJoin={onJoin} onOpenDetails={onOpenDetails} />
        ))}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 20,
  },
  card: {
    gap: 8,
  },
  cardPressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#F4F4F6',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
  },
  description: {
    fontSize: 15,
    color: '#60646C',
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 2,
  },
  meta: {
    fontSize: 14,
    color: '#111111',
  },
  friendsGoing: {
    fontSize: 14,
    color: '#FF385C',
    fontWeight: '600',
    marginTop: 4,
  },
  location: {
    fontSize: 14,
    color: '#60646C',
  },
  openness: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  open: {
    color: '#0A7D2C',
  },
  closed: {
    color: '#8A8F98',
  },
  detailsButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  detailsButtonPressed: {
    opacity: 0.7,
  },
  detailsButtonText: {
    color: '#FF385C',
    fontSize: 14,
    fontWeight: '600',
  },
  joinButton: {
    marginTop: 10,
    backgroundColor: '#FF385C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonPressed: {
    opacity: 0.85,
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
