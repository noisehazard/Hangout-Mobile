import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/theme';

function H({ children }: { children: ReactNode }) {
  return <Text style={styles.h}>{children}</Text>;
}
function P({ children }: { children: ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </Pressable>

      <Text style={styles.title}>Privacy Policy</Text>
      <P>Last updated: [DATE]. HangoutAI (&quot;we&quot;) is operated by [ENTITY/NAME], contact [CONTACT EMAIL].</P>
      <H>What we collect</H>
      <P>Account data (an anonymous id, and — if you verify — your email and chosen handle), your approximate or exact location when you use the map or post an event, the events you create or join, messages you send, and friend and block relationships.</P>
      <H>How we use it</H>
      <P>To show hangouts near you, run the friends and event features, keep the service safe (blocking, reporting, moderation), and operate the app. We do not sell your data.</P>
      <H>Sharing</H>
      <P>Data is stored with our backend provider, Supabase. Other users see what you choose to share: your handle, events, messages in events you join, and — depending on your per-event setting — an exact or approximate event location.</P>
      <H>Location</H>
      <P>Events you post as &quot;approximate&quot; are shown to non-members at a fuzzed location; the exact spot is shared only with the host, accepted friends, and people who join.</P>
      <H>Diagnostics</H>
      <P>When something goes wrong in the app we record the error, the screen it happened on, your account id, your device model, and your operating system version. We use this only to find and fix faults. These records are deleted automatically after 30 days.</P>
      <H>Retention &amp; deletion</H>
      <P>You can delete your account at any time from the You tab, which permanently removes your profile, events, messages, and relationships. Expired events are cleaned up automatically.</P>
      <H>Children</H>
      <P>HangoutAI is not intended for anyone under 13 (or the minimum age in your country).</P>
      <H>Contact</H>
      <P>Questions: [CONTACT EMAIL].</P>

      <Text style={[styles.title, { marginTop: Spacing.xl }]}>Terms of Service</Text>
      <P>By using HangoutAI you agree to these terms.</P>
      <H>Acceptable use</H>
      <P>Be respectful. Do not harass, threaten, impersonate, spam, or post illegal or dangerous content. Do not use the app to share someone&apos;s private location without consent.</P>
      <H>Your content</H>
      <P>You are responsible for what you post. You grant us permission to display your content within the app to operate the service.</P>
      <H>Safety &amp; enforcement</H>
      <P>We may remove content, and suspend or ban accounts, that violate these terms or endanger others. You can block and report other users and events.</P>
      <H>Disclaimer</H>
      <P>The app is provided &quot;as is,&quot; without warranties. Meeting people carries real-world risk; use your judgment and meet in public where possible.</P>
      <H>Changes &amp; contact</H>
      <P>We may update these terms; continued use means acceptance. Questions: [CONTACT EMAIL]. Governing law: [JURISDICTION].</P>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, backgroundColor: Colors.bg },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  h: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: Spacing.md },
  p: { fontSize: 14, color: Colors.textMuted, lineHeight: 21, marginTop: Spacing.xs },
});
