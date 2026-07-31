import { rowToFriend, rowToFriendRequest } from './friendMappers';
describe('friend mappers', () => {
  it('maps a friend row incl. active event', () => {
    expect(rowToFriend({ friend_id: 'f1', handle: 'ana', avatar_url: null,
      active_event_id: 'e1', active_event_title: 'Drinks' }))
      .toEqual({ id: 'f1', handle: 'ana', avatarUrl: null, activeEventId: 'e1', activeEventTitle: 'Drinks' });
  });
  it('maps a friend with no active event', () => {
    expect(rowToFriend({ friend_id: 'f2', handle: 'mo', avatar_url: null,
      active_event_id: null, active_event_title: null }).activeEventId).toBeNull();
  });
  it('maps a friend request row', () => {
    expect(rowToFriendRequest({ request_id: 'r1', requester_id: 'u1', handle: 'zoe',
      avatar_url: null, created_at: '2026-07-25T10:00:00.000Z' }))
      .toEqual({ id: 'r1', requesterId: 'u1', handle: 'zoe', avatarUrl: null, createdAt: '2026-07-25T10:00:00.000Z' });
  });
});
