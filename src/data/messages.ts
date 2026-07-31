import { supabase } from '@/lib/supabase';
import { Message, MessageRow, rowToMessage } from './messageMappers';

export async function fetchMessages(eventId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, body, created_at, profile_id, profiles(handle)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as MessageRow[]).map(rowToMessage);
}

export async function sendMessage(eventId: string, body: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Not signed in');
  const { error } = await supabase.from('messages').insert({ event_id: eventId, profile_id: uid, body });
  if (error) throw error;
}

export function subscribeMessages(eventId: string, onInsert: (m: Message) => void): () => void {
  const channel = supabase
    .channel(`messages:${eventId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `event_id=eq.${eventId}` },
      async (payload) => {
        const row = payload.new as { id: string; body: string; created_at: string; profile_id: string };
        const { data } = await supabase.from('profiles').select('handle').eq('id', row.profile_id).single();
        onInsert(rowToMessage({ ...row, profiles: data ? { handle: data.handle } : null }));
      },
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
