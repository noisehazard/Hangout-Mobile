import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fetchMessages, sendMessage, subscribeMessages } from '@/data/messages';
import { Message } from '@/data/messageMappers';
import { useAuth } from '@/lib/auth';
import { userMessage } from '@/lib/errors';
import { openUserProfile } from '@/lib/nav';
import { Colors, Spacing } from '@/theme';

type Props = {
  eventId: string;
  joined: boolean;
};

export function EventChat({ eventId, joined }: Props) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchMessages(eventId)
      .then((msgs) => {
        if (!active) return;
        setMessages(msgs);
      })
      .catch((e) => console.warn('fetchMessages failed', e));

    const unsubscribe = subscribeMessages(eventId, (m) => {
      if (!active) return;
      setMessages((prev) => (prev.some((existing) => existing.id === m.id) ? prev : [...prev, m]));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [eventId]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(eventId, body);
      setDraft('');
    } catch (e) {
      setError(userMessage(e, 'Could not send. Try again.', 'sendMessage'));
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Chat</Text>

      {messages.length === 0 ? (
        <Text style={styles.empty}>No messages yet</Text>
      ) : (
        <View style={styles.list}>
          {messages.map((m) => {
            const isOwn = session?.user.id === m.profileId;
            return (
              <View
                key={m.id}
                style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}
              >
                <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
                  {!isOwn && (
                    <Text style={styles.handle} onPress={() => openUserProfile(m.profileId)}>
                      {m.handle}
                    </Text>
                  )}
                  <Text style={[styles.body, isOwn && styles.bodyOwn]}>{m.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {joined ? (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Say something…"
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (pressed || sending || !draft.trim()) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={sending || !draft.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.joinHint}>Join to chat</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  empty: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  list: {
    gap: Spacing.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    backgroundColor: Colors.bgElement,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleOwn: {
    backgroundColor: Colors.accentSoft,
  },
  handle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    color: Colors.text,
  },
  bodyOwn: {
    color: Colors.text,
  },
  error: {
    fontSize: 13,
    color: '#D92D20',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
  },
  sendButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  joinHint: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
