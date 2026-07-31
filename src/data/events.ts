import { supabase } from '@/lib/supabase';
import { EventVisibility, HangoutEvent } from '@/types/event';
import { getDevEvent, isDevEvent } from './devEvents';
import { NearbyRow, rowToHangoutEvent } from './eventMappers';
import { AttendeeRow, EventAttendee, rowToAttendee } from './attendeeMappers';

export async function fetchNearbyEvents(
  center: { latitude: number; longitude: number },
  radiusKm = 30,
): Promise<HangoutEvent[]> {
  const { data, error } = await supabase.rpc('nearby_events', {
    user_lat: center.latitude,
    user_lng: center.longitude,
    radius_m: Math.round(radiusKm * 1000),
  });
  if (error) throw error;
  return (data as NearbyRow[]).map(rowToHangoutEvent);
}

export type CreateEventInput = {
  title: string;
  description: string;
  theme: string | null;
  latitude: number;
  longitude: number;
  openToStrangers: boolean;
  startsAt: string;
  endsAt: string;
  locationName: string | null;
  photoUrl: string | null;
  locationPrecision: 'exact' | 'approx';
  visibility: EventVisibility;
};

export async function createEvent(input: CreateEventInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_event', {
    p_title: input.title,
    p_description: input.description,
    p_theme: input.theme,
    p_lat: input.latitude,
    p_lng: input.longitude,
    p_open_to_strangers: input.openToStrangers,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_location_name: input.locationName,
    p_photo_url: input.photoUrl,
    p_location_precision: input.locationPrecision,
    p_visibility: input.visibility,
  });
  if (error) throw error;
  return data as string;
}

export async function joinEvent(eventId: string): Promise<void> {
  if (isDevEvent(eventId)) return;
  const { error } = await supabase.rpc('join_event', { p_event_id: eventId });
  if (error) throw error;
}

export async function leaveEvent(eventId: string): Promise<void> {
  if (isDevEvent(eventId)) return;
  const { error } = await supabase.rpc('leave_event', { p_event_id: eventId });
  if (error) throw error;
}

export async function fetchMyEvents(): Promise<HangoutEvent[]> {
  const { data, error } = await supabase.rpc('my_events');
  if (error) throw error;
  return (data as NearbyRow[]).map(rowToHangoutEvent);
}

export type UpdateEventInput = CreateEventInput;

export async function getEvent(id: string): Promise<HangoutEvent | null> {
  const dev = getDevEvent(id);
  if (dev) return dev;
  const { data, error } = await supabase.rpc('get_event', { p_event_id: id });
  if (error) throw error;
  const rows = data as NearbyRow[];
  return rows.length ? rowToHangoutEvent(rows[0]) : null;
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<void> {
  const { error } = await supabase.rpc('update_event', {
    p_event_id: id,
    p_title: input.title, p_description: input.description, p_theme: input.theme,
    p_lat: input.latitude, p_lng: input.longitude,
    p_open_to_strangers: input.openToStrangers,
    p_starts_at: input.startsAt, p_ends_at: input.endsAt,
    p_location_name: input.locationName, p_photo_url: input.photoUrl,
    p_location_precision: input.locationPrecision,
    p_visibility: input.visibility,
  });
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchAttendees(eventId: string): Promise<EventAttendee[]> {
  if (isDevEvent(eventId)) return [];
  const { data, error } = await supabase.rpc('list_attendees', { p_event_id: eventId });
  if (error) throw error;
  return (data as AttendeeRow[]).map(rowToAttendee);
}
