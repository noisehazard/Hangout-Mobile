import { rowToInvite } from './invites';

test('maps an invite row', () => {
  expect(
    rowToInvite({
      invite_id: 'i1',
      event_id: 'e1',
      event_title: 'Drinks',
      inviter_handle: 'ana',
      created_at: '2026-01-01T00:00:00Z',
    }),
  ).toEqual({
    inviteId: 'i1',
    eventId: 'e1',
    eventTitle: 'Drinks',
    inviterHandle: 'ana',
    createdAt: '2026-01-01T00:00:00Z',
  });
});
