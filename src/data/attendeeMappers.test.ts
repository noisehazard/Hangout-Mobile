import { rowToAttendee } from './attendeeMappers';

test('maps a flat attendee row from list_attendees', () => {
  expect(
    rowToAttendee({
      profile_id: 'p1',
      handle: 'ana',
      avatar_url: null,
      joined_at: '2026-01-01T00:00:00Z',
    }),
  ).toEqual({
    profileId: 'p1',
    handle: 'ana',
    avatarUrl: null,
    joinedAt: '2026-01-01T00:00:00Z',
  });
});

test('falls back to Guest when handle is missing', () => {
  expect(
    rowToAttendee({
      profile_id: 'p1',
      handle: undefined as unknown as string,
      avatar_url: null,
      joined_at: '2026-01-01T00:00:00Z',
    }).handle,
  ).toBe('Guest');
});
