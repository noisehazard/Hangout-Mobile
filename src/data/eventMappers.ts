export type NearbyRow = {
  id: string;
  host_id: string;
  host_handle: string;
  title: string;
  description: string;
  theme: string | null;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  open_to_strangers: boolean;
  starts_at: string;
  ends_at: string;
  attendee_count: number;
  location_name: string | null;
  friends_going: number;
  location_precision: 'exact' | 'approx';
  approximate: boolean;
  visibility: 'public' | 'friends' | 'private';
};

import { HangoutEvent } from '@/types/event';

export function rowToHangoutEvent(row: NearbyRow): HangoutEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    startTime: row.starts_at,
    endsAt: row.ends_at,
    attendeeCount: Number(row.attendee_count),
    friendsGoing: Number(row.friends_going),
    openToStrangers: row.open_to_strangers,
    theme: row.theme,
    hostHandle: row.host_handle,
    hostId: row.host_id,
    locationName: row.location_name,
    photoUrl: row.photo_url,
    locationPrecision: row.location_precision,
    approximate: row.approximate,
    visibility: row.visibility,
  };
}

export type EndsInPreset = '1h' | '3h' | 'tonight';

export function endsAtFromPreset(preset: EndsInPreset, now: Date = new Date()): string {
  if (preset === '1h') return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  if (preset === '3h') return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
  const end = new Date(now);
  end.setHours(23, 59, 0, 0);
  if (end.getTime() <= now.getTime()) end.setDate(end.getDate() + 1);
  return end.toISOString();
}
