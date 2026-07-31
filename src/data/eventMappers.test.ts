import { endsAtFromPreset, rowToHangoutEvent } from './eventMappers';

describe('rowToHangoutEvent', () => {
  it('maps a DB row to a HangoutEvent, coercing the bigint count to a number', () => {
    const event = rowToHangoutEvent({
      id: 'e1',
      host_id: 'h1',
      host_handle: 'Guest-1234',
      title: 'Sunset drinks',
      description: 'cans on the hill',
      theme: 'Drinks',
      photo_url: null,
      latitude: 47.0105,
      longitude: 28.8638,
      open_to_strangers: true,
      starts_at: '2026-07-20T18:00:00.000Z',
      ends_at: '2026-07-20T21:00:00.000Z',
      attendee_count: 12,
      location_name: 'Cathedral Park',
      friends_going: 2,
      location_precision: 'approx',
      approximate: true,
      visibility: 'public',
    });
    expect(event).toEqual({
      id: 'e1',
      title: 'Sunset drinks',
      description: 'cans on the hill',
      latitude: 47.0105,
      longitude: 28.8638,
      startTime: '2026-07-20T18:00:00.000Z',
      endsAt: '2026-07-20T21:00:00.000Z',
      attendeeCount: 12,
      friendsGoing: 2,
      openToStrangers: true,
      theme: 'Drinks',
      hostHandle: 'Guest-1234',
      hostId: 'h1',
      locationName: 'Cathedral Park',
      photoUrl: null,
      locationPrecision: 'approx',
      approximate: true,
      visibility: 'public',
    });
  });

  it('maps visibility through', () => {
    const event = rowToHangoutEvent({
      id: 'e1', host_id: 'h1', host_handle: 'ana', title: 'T', description: '',
      theme: null, photo_url: null, latitude: 1, longitude: 2, open_to_strangers: true,
      starts_at: '2026-07-28T10:00:00.000Z', ends_at: '2026-07-28T12:00:00.000Z',
      attendee_count: 0, location_name: null, friends_going: 0,
      location_precision: 'exact', approximate: false, visibility: 'friends',
    });
    expect(event.visibility).toBe('friends');
  });
});

describe('endsAtFromPreset', () => {
  const now = new Date('2026-07-20T18:00:00.000Z');

  it('1h adds one hour', () => {
    expect(endsAtFromPreset('1h', now)).toBe('2026-07-20T19:00:00.000Z');
  });

  it('3h adds three hours', () => {
    expect(endsAtFromPreset('3h', now)).toBe('2026-07-20T21:00:00.000Z');
  });

  it('tonight is later the same day', () => {
    expect(new Date(endsAtFromPreset('tonight', now)).getTime()).toBeGreaterThan(now.getTime());
  });
});
