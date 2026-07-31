import { supabase } from '@/lib/supabase';
import { PublicProfile, PublicProfileRow, rowToPublicProfile } from './profileMappers';

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc('get_public_profile', { p_id: id });
  if (error) throw error;
  const rows = data as PublicProfileRow[];
  return rows.length > 0 ? rowToPublicProfile(rows[0]) : null;
}
