import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventBottomSheet } from '@/components/EventBottomSheet';
import { LeafletMap, ProjectedPoint } from '@/components/LeafletMap';
import { MapIntro } from '@/components/MapIntro';
import { DEV_EVENTS } from '@/data/devEvents';
import { fetchNearbyEvents, joinEvent } from '@/data/events';
import { filterEventsByVibe, VIBES } from '@/data/vibes';
import { userMessage } from '@/lib/errors';
import { needsVerification, promptToVerify } from '@/lib/gating';
import { toast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { useUserLocation } from '@/hooks/useUserLocation';
import { HangoutEvent } from '@/types/event';
import { Colors } from '@/theme';

type Region = { latitude: number; longitude: number; latitudeDelta: number };

let introPlayed = false;

function Discover({ region, usingFallback }: { region: Region; usingFallback: boolean }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [events, setEvents] = useState<HangoutEvent[]>([]);
  const [selected, setSelected] = useState<HangoutEvent[] | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);

  const visibleEvents = useMemo(
    () => filterEventsByVibe(events, selectedVibe),
    [events, selectedVibe],
  );

  const [projected, setProjected] = useState<ProjectedPoint[]>([]);
  const [introVisible, setIntroVisible] = useState(!introPlayed);
  const [markersRevealed, setMarkersRevealed] = useState(introPlayed);

  const heroes = useMemo(
    () => [...events].sort((a, b) => b.attendeeCount - a.attendeeCount).slice(0, 3),
    [events],
  );
  const targets = useMemo(() => {
    const byId = new Map(projected.map((p) => [p.id, p]));
    return heroes.map((h) => byId.get(h.id) ?? null);
  }, [heroes, projected]);

  const handleReveal = useCallback(() => setMarkersRevealed(true), []);
  const handleIntroDone = useCallback(() => {
    introPlayed = true;
    setIntroVisible(false);
  }, []);

  useEffect(() => {
    if (!introVisible) return;
    const t = setTimeout(() => {
      if (events.length === 0) {
        introPlayed = true;
        setMarkersRevealed(true);
        setIntroVisible(false);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [introVisible, events.length]);

  const refresh = useCallback(async () => {
    try {
      const nearby = await fetchNearbyEvents(region, 30);
      setEvents([...DEV_EVENTS, ...nearby]);
    } catch (e) {
      setEvents([...DEV_EVENTS]);
      toast.error(userMessage(e, "Couldn't refresh hangouts.", 'nearbyEvents'));
    }
  }, [region]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function handleSelectEvent(event: HangoutEvent) {
    setSelected([event]);
    sheetRef.current?.present();
  }

  async function handleJoin(eventId: string) {
    if (needsVerification(profile)) {
      promptToVerify();
      return;
    }
    const bump = (delta: number) => (e: HangoutEvent) =>
      e.id === eventId ? { ...e, attendeeCount: e.attendeeCount + delta } : e;
    setEvents((cur) => cur.map(bump(1)));
    setSelected((cur) => (cur ? cur.map(bump(1)) : cur));
    try {
      await joinEvent(eventId);
      toast.success("You're in 🎉");
    } catch (e) {
      setEvents((cur) => cur.map(bump(-1)));
      setSelected((cur) => (cur ? cur.map(bump(-1)) : cur));
      toast.error(userMessage(e, "Couldn't join that hangout.", 'joinEvent'));
    }
  }

  return (
    <View style={styles.container}>
      <LeafletMap
        events={visibleEvents}
        region={region}
        onSelectEvent={handleSelectEvent}
        deferMarkers={introVisible && !markersRevealed}
        onPointsProjected={introVisible ? setProjected : undefined}
      />
      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={[styles.header, { paddingTop: insets.top + 12 }]} pointerEvents="none">
          <Text style={styles.headerTitle}>Happening now</Text>
          <Text style={styles.headerSubtitle}>
            {usingFallback
              ? 'Showing Chișinău — enable location to see your area'
              : 'Tap a bubble to see who\'s out'}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipBar}
          contentContainerStyle={styles.chipBarContent}
        >
          {VIBES.map((v) => {
            const active = selectedVibe === v;
            return (
              <Pressable
                key={v}
                onPress={() => setSelectedVibe(active ? null : v)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{v}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {visibleEvents.length === 0 && (
        <View style={styles.emptyHint} pointerEvents="none">
          <Text style={styles.emptyHintText}>
            {selectedVibe
              ? `No ${selectedVibe} hangouts nearby`
              : 'Nothing happening nearby yet — be the first to post one.'}
          </Text>
        </View>
      )}
      <EventBottomSheet
        ref={sheetRef}
        events={selected}
        onJoin={handleJoin}
        onOpenDetails={(id) => {
          sheetRef.current?.dismiss();
          router.push({ pathname: '/event/[id]', params: { id } });
        }}
      />
      {introVisible && (
        <MapIntro
          heroEvents={heroes}
          targets={targets}
          onReveal={handleReveal}
          onDone={handleIntroDone}
        />
      )}
    </View>
  );
}

export default function DiscoverScreen() {
  const { loading: authLoading } = useAuth();
  const { region, loading: locLoading, usingFallback } = useUserLocation();

  if (authLoading || locLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Finding hangouts near you…</Text>
      </View>
    );
  }
  return <Discover region={region} usingFallback={usingFallback} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.bg,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  chipBar: {
    marginTop: 8,
    maxHeight: 40,
  },
  chipBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  emptyHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: 'center',
  },
  emptyHintText: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
