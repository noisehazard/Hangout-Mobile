import { supabase } from '@/lib/supabase';
import { ActivityItem, ActivityRow, rowToActivityItem } from './activityMappers';

export async function listFriendActivity(): Promise<ActivityItem[]> {
  const { data, error } = await supabase.rpc('friend_activity');
  if (error) throw error;
  return (data as ActivityRow[]).map(rowToActivityItem);
}
