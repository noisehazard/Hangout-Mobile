import { rowToPublicProfile } from './profileMappers';

describe('rowToPublicProfile', () => {
  it('maps every field from snake_case to camelCase', () => {
    expect(
      rowToPublicProfile({
        id: 'u1',
        handle: 'ana',
        avatar_url: 'https://x.co/a.jpg?v=1',
        verified: true,
        created_at: '2026-07-01T10:00:00.000Z',
        mutual_friends: 3,
        relationship: 'incoming',
        request_id: 'r9',
      }),
    ).toEqual({
      id: 'u1',
      handle: 'ana',
      avatarUrl: 'https://x.co/a.jpg?v=1',
      verified: true,
      createdAt: '2026-07-01T10:00:00.000Z',
      mutualFriends: 3,
      relationship: 'incoming',
      requestId: 'r9',
    });
  });

  it('preserves a null avatar and null request id', () => {
    const p = rowToPublicProfile({
      id: 'u2',
      handle: 'mo',
      avatar_url: null,
      verified: false,
      created_at: '2026-07-02T10:00:00.000Z',
      mutual_friends: 0,
      relationship: 'none',
      request_id: null,
    });
    expect(p.avatarUrl).toBeNull();
    expect(p.requestId).toBeNull();
  });
});
