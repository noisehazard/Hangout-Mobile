import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ProjectedPoint } from '@/components/LeafletMap';
import { Colors } from '@/theme';
import { HangoutEvent } from '@/types/event';

type Props = {
  heroEvents: HangoutEvent[];
  targets: Array<ProjectedPoint | null>;
  onReveal: () => void;
  onDone: () => void;
};

const CARD_W = 148;
const CARD_H = 132;

const THEME_VISUALS: Record<string, { emoji: string; color: string }> = {
  Drinks: { emoji: '🍺', color: '#B45309' },
  Food: { emoji: '🍔', color: '#C2410C' },
  Music: { emoji: '🎵', color: '#7C3AED' },
  Party: { emoji: '🎉', color: '#DB2777' },
  Sports: { emoji: '⚽', color: '#0A7D2C' },
  Football: { emoji: '⚽', color: '#0A7D2C' },
  Coffee: { emoji: '☕', color: '#92400E' },
  Outdoors: { emoji: '🌳', color: '#15803D' },
  Games: { emoji: '🎮', color: '#4338CA' },
};

function visualFor(theme: string | null): { emoji: string; color: string } {
  if (theme && THEME_VISUALS[theme]) return THEME_VISUALS[theme];
  return { emoji: '✨', color: Colors.accent };
}

export function MapIntro({ heroEvents, targets, onReveal, onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const [started, setStarted] = useState(false);

  const bgOpacity = useRef(new Animated.Value(1)).current;
  const anims = useRef(
    Array.from({ length: 3 }, () => ({
      enter: new Animated.Value(0),
      move: new Animated.Value(0),
    })),
  ).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const starts = useMemo(() => {
    const cx = width / 2;
    const cy = height * 0.4;
    const spread = Math.min(width * 0.28, 132);
    return [
      { x: cx, y: cy - 78 },
      { x: cx - spread, y: cy + 66 },
      { x: cx + spread, y: cy + 66 },
    ];
  }, [width, height]);

  useEffect(() => {
    if (started) return;
    const n = heroEvents.length;
    if (n === 0) return;
    if (targets.length < n || !targets.slice(0, n).every(Boolean)) return;
    setStarted(true);

    const used = anims.slice(0, n);
    Animated.stagger(
      150,
      used.map((a) =>
        Animated.spring(a.enter, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 90,
        }),
      ),
    ).start(() => {
      holdTimer.current = setTimeout(() => {
        onReveal();
        Animated.parallel([
          Animated.timing(bgOpacity, {
            toValue: 0,
            duration: 550,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          ...used.map((a) =>
            Animated.timing(a.move, {
              toValue: 1,
              duration: 650,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ),
        ]).start(() => onDone());
      }, 480);
    });
  }, [heroEvents, targets, started, anims, bgOpacity, onReveal, onDone]);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, styles.bg, { opacity: bgOpacity }]} />

      {heroEvents.slice(0, 3).map((ev, i) => {
        const start = starts[i];
        const target = targets[i];
        const dx = target ? target.x - start.x : 0;
        const dy = target ? target.y - start.y : 0;
        const a = anims[i];
        const v = visualFor(ev.theme);

        return (
          <Animated.View
            key={ev.id}
            style={[
              styles.card,
              {
                left: start.x - CARD_W / 2,
                top: start.y - CARD_H / 2,
                opacity: Animated.multiply(
                  a.enter,
                  a.move.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] }),
                ),
                transform: [
                  { translateX: a.move.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                  { translateY: a.move.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                  {
                    scale: Animated.multiply(
                      a.enter,
                      a.move.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }),
                    ),
                  },
                ],
              },
            ]}
          >
            {ev.photoUrl ? (
              <Image source={{ uri: ev.photoUrl }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: v.color }]}>
                <Text style={styles.emoji}>{v.emoji}</Text>
              </View>
            )}
            <Text style={styles.title} numberOfLines={1}>
              {ev.title}
            </Text>
            <Text style={styles.count}>👥 {ev.attendeeCount} going</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: Colors.bg },
  card: {
    position: 'absolute',
    width: CARD_W,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  thumb: {
    width: CARD_W - 20,
    height: 72,
    borderRadius: 12,
    backgroundColor: Colors.bgElement,
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 34 },
  title: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    maxWidth: CARD_W - 20,
  },
  count: { marginTop: 2, fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
});
