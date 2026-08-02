import { setErrorReporter, userMessage } from './errors';

describe('userMessage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a server-authored P0001 message verbatim', () => {
    const e = { code: 'P0001', message: 'Verify your email to join', details: null, hint: null };
    expect(userMessage(e, 'Fallback.')).toBe('Verify your email to join');
  });

  it('falls back for any other postgres code', () => {
    const e = {
      code: '42501',
      message: 'new row violates row-level security policy for table "events"',
      details: null,
      hint: null,
    };
    expect(userMessage(e, 'Fallback.')).toBe('Fallback.');
  });

  it('reports offline for a network failure', () => {
    const e = new TypeError('Network request failed');
    expect(userMessage(e, 'Fallback.')).toBe('You seem to be offline.');
  });

  it('reports offline for a supabase-wrapped network failure', () => {
    const e = { code: '', message: 'TypeError: Network request failed', details: null, hint: null };
    expect(userMessage(e, 'Fallback.')).toBe('You seem to be offline.');
  });

  it('falls back for null, undefined, and plain strings', () => {
    expect(userMessage(null, 'Fallback.')).toBe('Fallback.');
    expect(userMessage(undefined, 'Fallback.')).toBe('Fallback.');
    expect(userMessage('boom', 'Fallback.')).toBe('Fallback.');
  });

  it('logs the raw error for debugging', () => {
    const spy = jest.spyOn(console, 'warn');
    const e = { code: '42501', message: 'nope', details: null, hint: null };
    userMessage(e, 'Fallback.', 'joinEvent');
    expect(spy).toHaveBeenCalledWith('[joinEvent]', e);
  });
});

describe('error reporting hook', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    setErrorReporter(null);
    jest.restoreAllMocks();
  });

  it('reports the tag, code, and message of a handled error', () => {
    const seen: unknown[] = [];
    setErrorReporter((r) => seen.push(r));
    const e = { code: '42501', message: 'rls denied', details: null, hint: null };
    userMessage(e, 'Fallback.', 'joinEvent');
    expect(seen).toEqual([{ tag: 'joinEvent', code: '42501', message: 'rls denied' }]);
  });

  it('reports P0001 errors too', () => {
    const seen: unknown[] = [];
    setErrorReporter((r) => seen.push(r));
    userMessage({ code: 'P0001', message: 'Verify your email' }, 'Fallback.', 'joinEvent');
    expect(seen).toEqual([{ tag: 'joinEvent', code: 'P0001', message: 'Verify your email' }]);
  });

  it('still returns the right text when a reporter throws', () => {
    setErrorReporter(() => {
      throw new Error('reporter exploded');
    });
    expect(userMessage({ code: 'P0001', message: 'Verify your email' }, 'Fallback.')).toBe(
      'Verify your email',
    );
  });

  it('does not report once the reporter is cleared', () => {
    const seen: unknown[] = [];
    setErrorReporter((r) => seen.push(r));
    setErrorReporter(null);
    userMessage({ code: '42501', message: 'nope' }, 'Fallback.');
    expect(seen).toEqual([]);
  });
});
