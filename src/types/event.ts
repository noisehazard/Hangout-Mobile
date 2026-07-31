export type EventVisibility = 'public' | 'friends' | 'private';

export type HangoutEvent = {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endsAt: string;
  attendeeCount: number;
  friendsGoing: number;
  openToStrangers: boolean;
  theme: string | null;
  hostHandle: string;
  hostId: string;
  locationName: string | null;
  photoUrl: string | null;
  locationPrecision: 'exact' | 'approx';
  approximate: boolean;
  visibility: EventVisibility;
};
