export type Relationship = 'self' | 'friends' | 'outgoing' | 'incoming' | 'i_blocked' | 'none';

export type PublicProfile = {
  id: string;
  handle: string;
  avatarUrl: string | null;
  verified: boolean;
  createdAt: string;
  mutualFriends: number;
  relationship: Relationship;
  requestId: string | null;
};

export type PublicProfileRow = {
  id: string;
  handle: string;
  avatar_url: string | null;
  verified: boolean;
  created_at: string;
  mutual_friends: number;
  relationship: Relationship;
  request_id: string | null;
};

export function rowToPublicProfile(row: PublicProfileRow): PublicProfile {
  return {
    id: row.id,
    handle: row.handle,
    avatarUrl: row.avatar_url,
    verified: row.verified,
    createdAt: row.created_at,
    mutualFriends: row.mutual_friends,
    relationship: row.relationship,
    requestId: row.request_id,
  };
}
