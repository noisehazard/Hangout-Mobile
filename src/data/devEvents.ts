import { HangoutEvent } from '@/types/event';


const NEVER_ENDS = '2099-12-31T23:59:59.000Z';
const STARTED = new Date().toISOString();

const DEV_EVENT_IDS = [
  'ddddddd1-0000-4000-8000-000000000001',
  'ddddddd2-0000-4000-8000-000000000002',
  'ddddddd3-0000-4000-8000-000000000003',
] as const;

function devEvent(
  id: string,
  title: string,
  latitude: number,
  longitude: number,
  locationName: string,
): HangoutEvent {
  return {
    id,
    title,
    description: 'Placeholder test event for local development.',
    latitude,
    longitude,
    startTime: STARTED,
    endsAt: NEVER_ENDS,
    attendeeCount: 3,
    friendsGoing: 0,
    openToStrangers: true,
    theme: 'Test',
    hostHandle: 'devtest',
    hostId: 'dev-host',
    locationName,
    photoUrl: null,
    locationPrecision: 'exact',
    approximate: false,
    visibility: 'public',
  };
}

export const DEV_EVENTS: HangoutEvent[] = __DEV__
  ? [
      devEvent(DEV_EVENT_IDS[0], 'Test 1', 47.0105, 28.8638, 'Central Chișinău'),
      devEvent(DEV_EVENT_IDS[1], 'Test 2', 47.0155, 28.87, 'Rîșcani, Chișinău'),
      devEvent(DEV_EVENT_IDS[2], 'Test 3', 47.006, 28.856, 'Centru, Chișinău'),
    ]
  : [];

export function getDevEvent(id: string): HangoutEvent | undefined {
  return DEV_EVENTS.find((e) => e.id === id);
}

export function isDevEvent(id: string): boolean {
  return DEV_EVENTS.some((e) => e.id === id);
}
