import { supabase } from '@/lib/supabase';

export type EventInvite = {
  inviteId: string;
  eventId: string;
  eventTitle: string;
  inviterHandle: string;
  createdAt: string;
};

export type InviteRow = {
  invite_id: string;
  event_id: string;
  event_title: string;
  inviter_handle: string;
  created_at: string;
};

export function rowToInvite(row: InviteRow): EventInvite {
  return {
    inviteId: row.invite_id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    inviterHandle: row.inviter_handle,
    createdAt: row.created_at,
  };
}

export async function inviteFriend(eventId: string, friendId: string): Promise<void> {
  const { error } = await supabase.rpc('invite_friend', {
    p_event_id: eventId,
    p_friend_id: friendId,
  });
  if (error) throw error;
}

export async function listMyInvites(): Promise<EventInvite[]> {
  const { data, error } = await supabase.rpc('list_my_invites');
  if (error) throw error;
  return (data as InviteRow[]).map(rowToInvite);
}

export async function respondInvite(inviteId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_invite', {
    p_invite_id: inviteId,
    p_accept: accept,
  });
  if (error) throw error;
}
