import * as Location from 'expo-location';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setHandle } from '@/data/friends';
import { useAuth } from '@/lib/auth';
import { userMessage } from '@/lib/errors';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

export function Onboarding({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [handle, setHandleInput] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveHandle() {
    const h = handle.trim();
    if (!h) {
      setStep(2);
      return;
    }
    setSaving(true);
    try {
      await setHandle(h);
      await refreshProfile();
      setStep(2);
    } catch (e) {
      toast.error(userMessage(e, "Couldn't set that handle. Try another.", 'onboardingHandle'));
    } finally {
      setSaving(false);
    }
  }

  async function askLocation() {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
    }
    onDone();
  }

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + Spacing.xl }]} pointerEvents="auto">
      {step === 0 && (
        <View style={styles.body}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Welcome to HangoutAI</Text>
          <Text style={styles.sub}>
            See what&apos;s happening around you right now, and let friends know when you&apos;re out.
          </Text>
          <Pressable style={styles.primary} onPress={() => setStep(1)}>
            <Text style={styles.primaryText}>Get started</Text>
          </Pressable>
        </View>
      )}

      {step === 1 && (
        <View style={styles.body}>
          <Text style={styles.emoji}>🙂</Text>
          <Text style={styles.title}>Pick a handle</Text>
          <Text style={styles.sub}>This is how friends find and recognize you.</Text>
          <TextInput
            style={styles.input}
            value={handle}
            onChangeText={setHandleInput}
            placeholder={profile?.handle ?? 'yourhandle'}
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <Pressable style={styles.primary} onPress={saveHandle} disabled={saving}>
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Continue'}</Text>
          </Pressable>
          <Pressable style={styles.skip} onPress={() => setStep(2)}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View style={styles.body}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.title}>Enable location</Text>
          <Text style={styles.sub}>
            We use your location to show hangouts near you. You can change this anytime.
          </Text>
          <Pressable style={styles.primary} onPress={askLocation}>
            <Text style={styles.primaryText}>Enable location</Text>
          </Pressable>
          <Pressable style={styles.skip} onPress={onDone}>
            <Text style={styles.skipText}>Not now</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  body: { alignItems: 'center', gap: Spacing.md },
  emoji: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  sub: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 21 },
  input: {
    width: '100%', borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.bgElement,
  },
  primary: {
    width: '100%', backgroundColor: Colors.accent, paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', marginTop: Spacing.sm,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skip: { paddingVertical: Spacing.sm },
  skipText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
});
