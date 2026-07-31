import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LocationPickerMap } from '@/components/LocationPickerMap';
import { EndsInPreset, endsAtFromPreset } from '@/data/eventMappers';
import { userMessage } from '@/lib/errors';
import { PlaceResult, reverseGeocode, searchPlaces } from '@/lib/geocode';
import { uploadEventPhoto } from '@/lib/storage';
import { toast } from '@/lib/toast';
import { VIBES } from '@/data/vibes';
import { EventVisibility } from '@/types/event';
import { Colors, Spacing } from '@/theme';

export type EventFormValues = {
  title: string;
  description: string;
  theme: string | null;
  latitude: number;
  longitude: number;
  locationName: string | null;
  openToStrangers: boolean;
  startsAt: Date;
  endsAt: string;
  photoUrl: string | null;
  locationPrecision: 'exact' | 'approx';
  visibility: EventVisibility;
};

type Props = {
  initial?: Partial<EventFormValues>;
  defaultCenter: { latitude: number; longitude: number };
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
};

export function EventForm({ initial, defaultCenter, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [vibe, setVibe] = useState<string | null>(initial?.theme ?? null);
  const [openToStrangers, setOpenToStrangers] = useState(initial?.openToStrangers ?? true);
  const [visibility, setVisibility] = useState<EventVisibility>(initial?.visibility ?? 'public');
  const [submitting, setSubmitting] = useState(false);

  const [point, setPoint] = useState({
    latitude: initial?.latitude ?? defaultCenter.latitude,
    longitude: initial?.longitude ?? defaultCenter.longitude,
  });
  const [locationName, setLocationName] = useState<string | null>(initial?.locationName ?? null);
  const [placeQuery, setPlaceQuery] = useState(initial?.locationName ?? '');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [startsAt, setStartsAt] = useState<Date>(initial?.startsAt ?? new Date());
  const [endsAt, setEndsAt] = useState<Date>(() =>
    initial?.endsAt ? new Date(initial.endsAt) : new Date(endsAtFromPreset('3h', startsAt))
  );
  const [activePreset, setActivePreset] = useState<EndsInPreset | null>(() =>
    initial?.endsAt ? null : '3h'
  );
  const [picker, setPicker] = useState<null | 'date' | 'time'>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photoUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [locationPrecision, setLocationPrecision] = useState<'exact' | 'approx'>(
    initial?.locationPrecision ?? 'approx',
  );

  const canPost = title.trim().length > 0;

  useEffect(() => {
    const q = placeQuery;
    if (q.trim().length < 3) {
      setPlaceResults([]);
      return;
    }
    const t = setTimeout(async () => setPlaceResults(await searchPlaces(q)), 500);
    return () => clearTimeout(t);
  }, [placeQuery]);

  function choosePlace(p: PlaceResult) {
    setPoint({ latitude: p.latitude, longitude: p.longitude });
    setLocationName(p.name);
    setPlaceQuery(p.name);
    setPlaceResults([]);
  }

  async function handlePinMove(latitude: number, longitude: number) {
    setPoint({ latitude, longitude });
    const name = await reverseGeocode(latitude, longitude);
    if (name) setLocationName(name);
  }

  function applyNewStartsAt(newStartsAt: Date) {
    setStartsAt(newStartsAt);
    if (activePreset) {
      setEndsAt(new Date(endsAtFromPreset(activePreset, newStartsAt)));
    }
  }

  function onPickerChange(event: { type: string }, selected?: Date) {
    if (event.type === 'dismissed' || !selected) {
      setPicker(null);
      return;
    }
    if (Platform.OS === 'android' && picker === 'date') {
      const merged = new Date(startsAt);
      merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      applyNewStartsAt(merged);
      setPicker('time');
      return;
    }
    if (Platform.OS === 'android') {
      const merged = new Date(startsAt);
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      applyNewStartsAt(merged);
    } else {
      applyNewStartsAt(selected);
    }
    setPicker(null);
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Enable photo library access to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    if (!asset.base64) {
      toast.error('Could not read that photo. Please try another.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await uploadEventPhoto(asset.base64);
      setPhotoUrl(url);
    } catch (e) {
      toast.error(userMessage(e, "Couldn't upload that photo.", 'uploadEventPhoto'));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit() {
    if (!canPost || submitting || uploadingPhoto) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        theme: vibe,
        latitude: point.latitude,
        longitude: point.longitude,
        locationName,
        openToStrangers,
        startsAt,
        endsAt: endsAt.toISOString(),
        photoUrl,
        locationPrecision,
        visibility,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Text style={styles.label}>What’s happening?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Sunset drinks at Cathedral Park"
        placeholderTextColor="#9A9DA5"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Details</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Add anything worth knowing — where exactly, what to bring…"
        placeholderTextColor="#9A9DA5"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Photo</Text>
      {photoUrl ? (
        <Pressable onPress={handlePickPhoto} disabled={uploadingPhoto}>
          <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
          {uploadingPhoto && (
            <View style={styles.photoUploadingOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </Pressable>
      ) : (
        <Pressable
          style={[styles.input, styles.photoButton]}
          onPress={handlePickPhoto}
          disabled={uploadingPhoto}
        >
          {uploadingPhoto ? (
            <ActivityIndicator color={Colors.accent} />
          ) : (
            <>
              <Ionicons name="image-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.photoButtonText}>Add photo</Text>
            </>
          )}
        </Pressable>
      )}

      <Text style={styles.label}>Vibe</Text>
      <View style={styles.chips}>
        {VIBES.map((v) => {
          const active = vibe === v;
          return (
            <Pressable
              key={v}
              onPress={() => setVibe(active ? null : v)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{v}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Who can see this</Text>
      <View style={styles.chips}>
        {([
          ['public', 'Public'],
          ['friends', 'Friends only'],
          ['private', 'Invite only'],
        ] as const).map(([value, label]) => {
          const active = visibility === value;
          return (
            <Pressable
              key={value}
              onPress={() => setVisibility(value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.switchTitle}>Open to meeting new people</Text>
          <Text style={styles.switchHint}>Others can ask to join your group.</Text>
        </View>
        <Switch
          value={openToStrangers}
          onValueChange={setOpenToStrangers}
          trackColor={{ true: Colors.accent }}
        />
      </View>

      <Text style={styles.label}>Where</Text>
      <TextInput
        style={styles.input}
        placeholder="Search a place…"
        placeholderTextColor="#9A9DA5"
        value={placeQuery}
        onChangeText={setPlaceQuery}
      />
      {placeResults.length > 0 && (
        <View>
          {placeResults.map((p, i) => (
            <Pressable key={`${p.latitude}-${p.longitude}-${i}`} style={styles.resultRow} onPress={() => choosePlace(p)}>
              <Text style={{ fontSize: 14, color: Colors.text }} numberOfLines={1}>
                {p.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.mapBox}>
        <LocationPickerMap point={point} onChange={handlePinMove} />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.switchTitle}>Show exact location</Text>
          <Text style={styles.switchHint}>
            Off shows only an approximate area until someone joins.
          </Text>
        </View>
        <Switch
          value={locationPrecision === 'exact'}
          onValueChange={(on) => setLocationPrecision(on ? 'exact' : 'approx')}
          trackColor={{ true: Colors.accent }}
        />
      </View>

      <Text style={styles.label}>Starts</Text>
      <Pressable
        style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}
        onPress={() => setPicker(Platform.OS === 'ios' ? 'time' : 'date')}
      >
        <Text style={{ fontSize: 15, color: Colors.text }}>
          {startsAt.toLocaleString([], {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </Pressable>
      {picker && (
        <DateTimePicker
          value={startsAt}
          mode={Platform.OS === 'ios' ? 'datetime' : picker}
          onChange={onPickerChange}
        />
      )}

      <Text style={styles.label}>Ends in</Text>
      <View style={styles.chips}>
        {(['1h', '3h', 'tonight'] as EndsInPreset[]).map((p) => {
          const active = activePreset === p;
          const label = p === 'tonight' ? 'Tonight' : p;
          return (
            <Pressable
              key={p}
              onPress={() => {
                setActivePreset(p);
                setEndsAt(new Date(endsAtFromPreset(p, startsAt)));
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.endsAtHint}>
        Ends:{' '}
        {endsAt.toLocaleString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </Text>

      <Pressable
        onPress={handleSubmit}
        disabled={!canPost || submitting || uploadingPhoto}
        style={({ pressed }) => [
          styles.postButton,
          (!canPost || submitting || uploadingPhoto) && styles.postButtonDisabled,
          pressed && canPost && !submitting && !uploadingPhoto && styles.postButtonPressed,
        ]}
      >
        <Ionicons name="rocket" size={18} color="#fff" />
        <Text style={styles.postButtonText}>{submitLabel}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.bgElement,
  },
  multiline: { height: 96, textAlignVertical: 'top' },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonText: { fontSize: 15, color: Colors.textMuted, fontWeight: '600' },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.bgElement,
  },
  photoUploadingOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.bgElement,
    marginTop: Spacing.xs,
  },
  mapBox: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElement,
  },
  chipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  chipText: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: Colors.accent },
  endsAtHint: { fontSize: 13, color: Colors.textMuted, marginTop: Spacing.xs },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  switchTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  switchHint: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: Spacing.xl,
  },
  postButtonDisabled: { backgroundColor: '#F1B8C4' },
  postButtonPressed: { opacity: 0.85 },
  postButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
