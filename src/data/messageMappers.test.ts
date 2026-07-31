import { rowToMessage } from './messageMappers';
describe('rowToMessage', () => {
  it('maps a message row with embedded profile handle', () => {
    expect(rowToMessage({
      id: 'm1', body: 'hi', created_at: '2026-07-24T10:00:00.000Z',
      profile_id: 'p1', profiles: { handle: 'Guest-1' },
    })).toEqual({ id: 'm1', body: 'hi', createdAt: '2026-07-24T10:00:00.000Z', profileId: 'p1', handle: 'Guest-1' });
  });
});
