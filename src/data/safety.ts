import { supabase } from '@/lib/supabase';

export type ReportTargetType = 'event' | 'user';

export type AdminReport = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  reporterHandle: string;
  createdAt: string;
};

export type BlockedUser = { profileId: string; handle: string; avatarUrl: string | null };

type BlockedRow = { profile_id: string; handle: string; avatar_url: string | null };

export async function listBlocked(): Promise<BlockedUser[]> {
  const { data, error } = await supabase.rpc('list_blocked');
  if (error) throw error;
  return (data as BlockedRow[]).map((r) => ({
    profileId: r.profile_id,
    handle: r.handle,
    avatarUrl: r.avatar_url,
  }));
}

export async function blockUser(targetId: string): Promise<void> {
  const { error } = await supabase.rpc('block_user', { p_target: targetId });
  if (error) throw error;
}

export async function unblockUser(targetId: string): Promise<void> {
  const { error } = await supabase.rpc('unblock_user', { p_target: targetId });
  if (error) throw error;
}

export async function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc('submit_report', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
  });
  if (error) throw error;
}

type AdminReportRow = {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  reporter_handle: string;
  created_at: string;
};

export async function listReports(): Promise<AdminReport[]> {
  const { data, error } = await supabase.rpc('admin_list_reports');
  if (error) throw error;
  return (data as AdminReportRow[]).map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    reporterHandle: r.reporter_handle,
    createdAt: r.created_at,
  }));
}

export async function adminRemoveEvent(eventId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_remove_event', { p_event_id: eventId });
  if (error) throw error;
}

export async function adminBanUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_ban_user', { p_user_id: userId });
  if (error) throw error;
}

export async function resolveReport(reportId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_resolve_report', { p_report_id: reportId });
  if (error) throw error;
}
