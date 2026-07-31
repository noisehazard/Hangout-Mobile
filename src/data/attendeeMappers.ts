export type EventAttendee = {
  profileId: string;
  handle: string;
  avatarUrl: string | null;
  joinedAt: string;
};

export type AttendeeRow = {
  profile_id: string;
  handle: string;
  avatar_url: string | null;
  joined_at: string;
};

export function rowToAttendee(row: AttendeeRow): EventAttendee {
  return {
    profileId: row.profile_id,
    handle: row.handle ?? 'Guest',
    avatarUrl: row.avatar_url,
    joinedAt: row.joined_at,
  };
}
