import { buildExpoPushMessages, chunk, invalidTokensFromTickets } from './messages';

describe('buildExpoPushMessages', () => {
  const items = [
    { id: 'o1', recipient_id: 'u1', title: 'T1', body: 'B1', data: { url: '/friends' } },
    { id: 'o2', recipient_id: 'u2', title: 'T2', body: 'B2', data: {} },
  ];

  it('emits one message per recipient token', () => {
    const msgs = buildExpoPushMessages(items, { u1: ['tokA', 'tokB'], u2: ['tokC'] });
    expect(msgs).toEqual([
      { to: 'tokA', title: 'T1', body: 'B1', data: { url: '/friends' } },
      { to: 'tokB', title: 'T1', body: 'B1', data: { url: '/friends' } },
      { to: 'tokC', title: 'T2', body: 'B2', data: {} },
    ]);
  });

  it('skips recipients with no tokens', () => {
    expect(buildExpoPushMessages(items, { u1: ['tokA'] })).toHaveLength(1);
  });
});

describe('chunk', () => {
  it('splits into batches of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('defaults to 100 per chunk', () => {
    expect(chunk(new Array(150).fill(0)).map((c) => c.length)).toEqual([100, 50]);
  });
});

describe('invalidTokensFromTickets', () => {
  it('returns only DeviceNotRegistered tokens aligned to their messages', () => {
    const messages = [
      { to: 'tokA', title: '', body: '', data: {} },
      { to: 'tokB', title: '', body: '', data: {} },
      { to: 'tokC', title: '', body: '', data: {} },
    ];
    const tickets = [
      { status: 'ok' as const, id: '1' },
      { status: 'error' as const, message: 'gone', details: { error: 'DeviceNotRegistered' } },
      { status: 'error' as const, message: 'other', details: { error: 'MessageTooBig' } },
    ];
    expect(invalidTokensFromTickets(messages, tickets)).toEqual(['tokB']);
  });
});
