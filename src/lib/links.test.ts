import { eventShareMessage, eventShareUrl } from './links';

describe('eventShareUrl', () => {
  it('builds a url without a token for a public event', () => {
    expect(eventShareUrl('abc-123')).toBe('https://hangout.app/e/abc-123');
  });

  it('appends the token when one is given', () => {
    expect(eventShareUrl('abc-123', 'tok-9')).toBe('https://hangout.app/e/abc-123?k=tok-9');
  });

  it('treats null and undefined tokens the same as absent', () => {
    expect(eventShareUrl('abc-123', null)).toBe('https://hangout.app/e/abc-123');
    expect(eventShareUrl('abc-123', undefined)).toBe('https://hangout.app/e/abc-123');
  });

  it('encodes ids and tokens', () => {
    expect(eventShareUrl('a b', 'c&d')).toBe('https://hangout.app/e/a%20b?k=c%26d');
  });
});

describe('eventShareMessage', () => {
  it('puts the title and url in the message', () => {
    const msg = eventShareMessage('Sunset drinks', 'https://hangout.app/e/1');
    expect(msg).toContain('Sunset drinks');
    expect(msg).toContain('https://hangout.app/e/1');
  });
});
