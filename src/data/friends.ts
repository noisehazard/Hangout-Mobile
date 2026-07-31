import { supabase } from '@/lib/supabase';
import { Friend, FriendRequest, FriendRequestRow, FriendRow, rowToFriend, rowToFriendRequest } from './friendMappers';

export async function setHandle(handle: string): Promise<void> {
  const { error } = await supabase.rpc('set_handle', { p_handle: handle });
  if (error) throw error;
}
export async function sendFriendRequest(handle: string): Promise<void> {
  const { error } = await supabase.rpc('send_friend_request', { p_handle: handle });
  if (error) throw error;
}
export async function respondFriendRequest(id: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_friend_request', { p_request_id: id, p_accept: accept });
  if (error) throw error;
}
export async function listFriends(): Promise<Friend[]> {
  const { data, error } = await supabase.rpc('list_friends');
  if (error) throw error;
  return (data as FriendRow[]).map(rowToFriend);
}
export async function listFriendRequests(): Promise<FriendRequest[]> {
  const { data, error } = await supabase.rpc('list_friend_requests');
  if (error) throw error;
  return (data as FriendRequestRow[]).map(rowToFriendRequest);
}
export async function removeFriend(friendId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendId });
  if (error) throw error;
}
