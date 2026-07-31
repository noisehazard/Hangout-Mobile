import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { subscribeToasts, ToastPayload, ToastVariant } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

const VISIBLE_MS = 3000;
const IN_MS = 220;
const OUT_MS = 180;

const BACKGROUND: Record<ToastVariant, string> = {
  error: Colors.accent,
  success: Colors.success,
  info: '#111111',
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<ToastPayload | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);

  const hide = useCallback(() => {
    translateY.value = withTiming(120, { duration: OUT_MS });
    opacity.value = withTiming(0, { duration: OUT_MS });
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setPayload(null), OUT_MS);
  }, [opacity, translateY]);

  useEffect(() => {
    subscribeToasts((next) => {
      setPayload(next);
      AccessibilityInfo.announceForAccessibility(next.message);
      translateY.value = withTiming(0, { duration: IN_MS });
      opacity.value = withTiming(1, { duration: IN_MS });
      if (clearTimer.current) clearTimeout(clearTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(hide, VISIBLE_MS);
    });
    return () => {
      subscribeToasts(null);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, [hide, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!payload) return null;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 76 }]} pointerEvents="box-none">
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={hide}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.toast, { backgroundColor: BACKGROUND[payload.variant] }]}
        >
          <Text style={styles.text}>{payload.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    zIndex: 9999,
    elevation: 24,
  },
  toast: {
    borderRadius: 12,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
