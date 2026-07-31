import { rowToActivityItem } from './activityMappers';

describe('rowToActivityItem', () => {
  it('maps a hosting row', () => {
    expect(
      rowToActivityItem({
        kind: 'hosting',
        actor_id: 'u1',
        actor_handle: 'ana',
        actor_avatar_url: 'https://x.co/a.jpg',
        event_id: 'e1',
        event_title: 'Coffee',
        event_theme: 'Coffee',
        at: '2026-07-27T10:00:00.000Z',
      }),
    ).toEqual({
      kind: 'hosting',
      actorId: 'u1',
      actorHandle: 'ana',
      actorAvatarUrl: 'https://x.co/a.jpg',
      eventId: 'e1',
      eventTitle: 'Coffee',
      eventTheme: 'Coffee',
      at: '2026-07-27T10:00:00.000Z',
    });
  });

  it('preserves null avatar and theme on a joined row', () => {
    const a = rowToActivityItem({
      kind: 'joined',
      actor_id: 'u2',
      actor_handle: 'mo',
      actor_avatar_url: null,
      event_id: 'e2',
      event_title: 'Run',
      event_theme: null,
      at: '2026-07-27T09:00:00.000Z',
    });
    expect(a.kind).toBe('joined');
    expect(a.actorAvatarUrl).toBeNull();
    expect(a.eventTheme).toBeNull();
  });
});
