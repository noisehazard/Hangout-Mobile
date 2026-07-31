export type Friend = {
  id: string; handle: string; avatarUrl: string | null;
  activeEventId: string | null; activeEventTitle: string | null;
};
export type FriendRow = {
  friend_id: string; handle: string; avatar_url: string | null;
  active_event_id: string | null; active_event_title: string | null;
};
export function rowToFriend(r: FriendRow): Friend {
  return { id: r.friend_id, handle: r.handle, avatarUrl: r.avatar_url,
    activeEventId: r.active_event_id, activeEventTitle: r.active_event_title };
}
export type FriendRequest = {
  id: string; requesterId: string; handle: string; avatarUrl: string | null; createdAt: string;
};
export type FriendRequestRow = {
  request_id: string; requester_id: string; handle: string;
  avatar_url: string | null; created_at: string;
};
export function rowToFriendRequest(r: FriendRequestRow): FriendRequest {
  return { id: r.request_id, requesterId: r.requester_id, handle: r.handle,
    avatarUrl: r.avatar_url, createdAt: r.created_at };
}
