import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventForm, EventFormValues } from '@/components/EventForm';
import { getEvent, updateEvent } from '@/data/events';
import { Colors, Spacing } from '@/theme';
import { HangoutEvent } from '@/types/event';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<HangoutEvent | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const ev = await getEvent(id);
      setEvent(ev);
    } catch (e) {
      console.warn('Failed to load event', e);
      setEvent(null);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(values: EventFormValues) {
    if (!id) return;
    try {
      await updateEvent(id, {
        title: values.title,
        description: values.description,
        theme: values.theme,
        latitude: values.latitude,
        longitude: values.longitude,
        openToStrangers: values.openToStrangers,
        startsAt: values.startsAt.toISOString(),
        endsAt: values.endsAt,
        locationName: values.locationName,
        photoUrl: values.photoUrl,
        locationPrecision: values.locationPrecision,
        visibility: values.visibility,
      });
      router.back();
    } catch (e) {
      Alert.alert('Could not save', 'Please try again in a moment.');
      console.warn('updateEvent failed', e);
    }
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </Pressable>

        <Text style={styles.title}>Edit hangout</Text>
        <Text style={styles.subtitle}>Update the details for your hangout.</Text>

        <EventForm
          initial={{
            title: event.title,
            description: event.description,
            theme: event.theme,
            latitude: event.latitude,
            longitude: event.longitude,
            locationName: event.locationName,
            openToStrangers: event.openToStrangers,
            photoUrl: event.photoUrl,
            startsAt: new Date(event.startTime),
            endsAt: event.endsAt,
            locationPrecision: event.locationPrecision,
            visibility: event.visibility,
          }}
          defaultCenter={{ latitude: event.latitude, longitude: event.longitude }}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.bg,
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgElement,
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.md },
});
