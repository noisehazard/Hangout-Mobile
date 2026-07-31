export type ActivityKind = 'hosting' | 'joined';

export type ActivityItem = {
  kind: ActivityKind;
  actorId: string;
  actorHandle: string;
  actorAvatarUrl: string | null;
  eventId: string;
  eventTitle: string;
  eventTheme: string | null;
  at: string;
};

export type ActivityRow = {
  kind: ActivityKind;
  actor_id: string;
  actor_handle: string;
  actor_avatar_url: string | null;
  event_id: string;
  event_title: string;
  event_theme: string | null;
  at: string;
};

export function rowToActivityItem(row: ActivityRow): ActivityItem {
  return {
    kind: row.kind,
    actorId: row.actor_id,
    actorHandle: row.actor_handle,
    actorAvatarUrl: row.actor_avatar_url,
    eventId: row.event_id,
    eventTitle: row.event_title,
    eventTheme: row.event_theme,
    at: row.at,
  };
}
