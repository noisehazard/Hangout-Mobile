import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventForm, EventFormValues } from '@/components/EventForm';
import { createEvent } from '@/data/events';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAuth } from '@/lib/auth';
import { userMessage } from '@/lib/errors';
import { needsVerification, promptToVerify } from '@/lib/gating';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { region } = useUserLocation();
  const { profile } = useAuth();
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(values: EventFormValues) {
    if (needsVerification(profile)) {
      promptToVerify();
      return;
    }
    try {
      await createEvent({
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
      toast.success('Hangout posted 🎉');
      setFormKey((k) => k + 1);
    } catch (e) {
      toast.error(userMessage(e, "Couldn't post that hangout.", 'createEvent'));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create a hangout</Text>
        <Text style={styles.subtitle}>Let people nearby know something’s happening.</Text>

        <EventForm
          key={formKey}
          defaultCenter={{ latitude: region.latitude, longitude: region.longitude }}
          submitLabel="Post hangout"
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.bg,
    gap: Spacing.sm,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.md },
});
