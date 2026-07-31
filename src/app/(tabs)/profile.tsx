import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { setHandle } from '@/data/friends';
import { removeAvatar, uploadAvatar } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import { userMessage } from '@/lib/errors';
import { toast } from '@/lib/toast';
import { Colors, Spacing } from '@/theme';

type Row = { icon: keyof typeof Ionicons.glyphMap; label: string };

const SETTINGS: Row[] = [
  { icon: 'notifications-outline', label: 'Notifications' },
  { icon: 'location-outline', label: 'Location & privacy' },
  { icon: 'ban-outline', label: 'Blocked users' },
  { icon: 'document-text-outline', label: 'Privacy & Terms' },
  { icon: 'help-circle-outline', label: 'Help & feedback' },
];

const SETTING_ROUTES: Record<string, '/legal' | '/blocked'> = {
  'Privacy & Terms': '/legal',
  'Blocked users': '/blocked',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, loading, linkEmail, verifyEmailOtp, refreshProfile, deleteAccount, updateAvatar } =
    useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'idle' | 'code' | 'busy'>('idle');
  const [handleInput, setHandleInput] = useState(profile?.handle ?? '');
  const [handleSeeded, setHandleSeeded] = useState(false);
  const [savingHandle, setSavingHandle] = useState(false);
  const [handleSaved, setHandleSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!handleSeeded && profile?.handle) {
      setHandleInput(profile.handle);
      setHandleSeeded(true);
    }
  }, [profile?.handle, handleSeeded]);

  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'This permanently removes your account, events, friends, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              toast.success('Account deleted — you are now browsing as a guest.');
            } catch (e) {
              toast.error(userMessage(e, "Couldn't delete your account.", 'deleteAccount'));
            }
          },
        },
      ],
    );
  }

  async function saveHandle() {
    const trimmed = handleInput.trim();
    setSavingHandle(true);
    setHandleSaved(false);
    try {
      await setHandle(trimmed);
      await refreshProfile();
      setHandleSaved(true);
      setTimeout(() => setHandleSaved(false), 2000);
    } catch (e) {
      toast.error(userMessage(e, "Couldn't save that handle.", 'setHandle'));
    } finally {
      setSavingHandle(false);
    }
  }

  async function startLink() {
    setStage('busy');
    try {
      await linkEmail(email.trim());
      setStage('code');
    } catch (e) {
      toast.error(userMessage(e, "Couldn't send the code. Check the email and try again.", 'linkEmail'));
      setStage('idle');
    }
  }

  async function confirmCode() {
    setStage('busy');
    try {
      await verifyEmailOtp(email.trim(), code.trim());
      toast.success('Email saved 🎉 Your account is now saved to this email.');
      setCode('');
      setStage('idle');
    } catch (e) {
      toast.error(userMessage(e, 'Wrong or expired code. Please try again.', 'verifyOtp'));
      setStage('code');
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  async function pickAndUploadAvatar() {
    if (!profile) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Enable photo library access to set a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      toast.error('Could not read that photo. Please try another.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(profile.id, asset.base64);
      await updateAvatar(url);
    } catch (e) {
      toast.error(userMessage(e, "Couldn't upload that photo.", 'uploadAvatar'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function clearAvatar() {
    if (!profile) return;
    setUploadingAvatar(true);
    try {
      await removeAvatar(profile.id);
      await updateAvatar(null);
    } catch (e) {
      toast.error(userMessage(e, "Couldn't remove that photo.", 'clearAvatar'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  function onPressAvatar() {
    if (!profile) return;
    if (profile.avatarUrl) {
      Alert.alert('Profile photo', undefined, [
        { text: 'Change photo', onPress: pickAndUploadAvatar },
        { text: 'Remove photo', style: 'destructive', onPress: clearAvatar },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickAndUploadAvatar();
    }
  }

  const avatarLetters = (profile?.handle ?? 'You').slice(0, 2).toUpperCase();
  const name = profile?.handle ?? 'Guest';
  const isAnonymous = profile?.isAnonymous ?? true;
  const trimmedHandle = handleInput.trim();
  const handleUnchanged = trimmedHandle === (profile?.handle ?? '');
  const saveHandleDisabled = savingHandle || trimmedHandle.length === 0 || handleUnchanged;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
    >
      <View style={styles.card}>
        <Pressable style={styles.avatar} onPress={onPressAvatar} disabled={uploadingAvatar || !profile}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{avatarLetters}</Text>
          )}
          {uploadingAvatar ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          )}
        </Pressable>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.handle}>{isAnonymous ? 'Not signed in' : 'Signed in'}</Text>

        {isAnonymous && stage === 'idle' && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable
              style={({ pressed }) => [
                styles.formButton,
                (pressed || !email.trim()) && styles.pressed,
              ]}
              onPress={startLink}
              disabled={!email.trim()}
            >
              <Text style={styles.signInText}>Save my account</Text>
            </Pressable>
          </View>
        )}

        {isAnonymous && stage === 'code' && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
            <Pressable
              style={({ pressed }) => [styles.formButton, pressed && styles.pressed]}
              onPress={confirmCode}
            >
              <Text style={styles.signInText}>Confirm</Text>
            </Pressable>
          </View>
        )}

        {stage === 'busy' && (
          <View style={styles.form}>
            <Pressable style={styles.formButton} disabled>
              <ActivityIndicator color={Colors.accent} />
            </Pressable>
          </View>
        )}

      </View>

      <View style={styles.handleSection}>
        <Text style={styles.sectionLabel}>Your handle</Text>
        <Text style={styles.currentHandle}>@{profile?.handle ?? '—'}</Text>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={handleInput}
            onChangeText={setHandleInput}
            placeholder="yourhandle"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <Pressable
            style={({ pressed }) => [
              styles.formButton,
              (pressed || saveHandleDisabled) && styles.pressed,
            ]}
            onPress={saveHandle}
            disabled={saveHandleDisabled}
          >
            {savingHandle ? (
              <ActivityIndicator color={Colors.accent} />
            ) : (
              <Text style={styles.signInText}>{handleSaved ? 'Saved ✓' : 'Save'}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
        onPress={() => router.push('/my-hangouts')}
      >
        <Ionicons name="calendar-outline" size={20} color={Colors.accent} />
        <Text style={styles.linkButtonText}>Your hangouts</Text>
      </Pressable>

      <View style={styles.settings}>
        {SETTINGS.map((row, i) => (
          <Pressable
            key={row.label}
            onPress={() => {
              const route = SETTING_ROUTES[row.label];
              if (route) router.push(route);
            }}
            style={({ pressed }) => [
              styles.settingRow,
              i < SETTINGS.length - 1 && styles.settingBorder,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name={row.icon} size={22} color={Colors.textMuted} />
            <Text style={styles.settingLabel}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#C4C7CE" />
          </Pressable>
        ))}
      </View>

      {profile?.isAdmin && (
        <Pressable
          style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}
          onPress={() => router.push('/admin')}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={Colors.accent} />
          <Text style={styles.adminButtonText}>Reports</Text>
        </Pressable>
      )}

      <Pressable style={styles.deleteButton} onPress={confirmDelete}>
        <Text style={styles.deleteButtonText}>Delete account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.bg,
  },
  card: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  handle: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  form: {
    width: '100%',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.bgElement,
  },
  signInButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  handleSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.bg,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  currentHandle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginTop: 2 },
  settings: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 15,
    backgroundColor: Colors.bg,
  },
  settingBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingLabel: { flex: 1, fontSize: 15, color: Colors.text },
  adminButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: Spacing.lg, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.accent,
  },
  adminButtonText: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  linkButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: Spacing.lg, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.accent,
  },
  linkButtonText: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
  deleteButton: { marginTop: Spacing.lg, paddingVertical: 14, alignItems: 'center' },
  deleteButtonText: { color: '#D92D20', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
