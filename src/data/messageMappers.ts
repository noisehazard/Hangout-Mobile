export type Message = {
  id: string; body: string; createdAt: string; profileId: string; handle: string;
};
export type MessageRow = {
  id: string; body: string; created_at: string; profile_id: string;
  profiles: { handle: string } | null;
};
export function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id, body: row.body, createdAt: row.created_at,
    profileId: row.profile_id, handle: row.profiles?.handle ?? 'Guest',
  };
}
