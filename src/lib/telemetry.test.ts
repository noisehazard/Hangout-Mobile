import { buildErrorRow, MAX_MESSAGE_LENGTH } from './telemetry';

describe('buildErrorRow', () => {
  it('carries the report fields through', () => {
    const row = buildErrorRow({ tag: 'joinEvent', code: '42501', message: 'rls' }, 'user-1');
    expect(row.tag).toBe('joinEvent');
    expect(row.code).toBe('42501');
    expect(row.message).toBe('rls');
    expect(row.profile_id).toBe('user-1');
  });

  it('defaults fatal to false', () => {
    expect(buildErrorRow({ tag: 't', code: null, message: null }, null).fatal).toBe(false);
  });

  it('keeps an explicit fatal flag', () => {
    expect(buildErrorRow({ tag: 't', code: null, message: null, fatal: true }, null).fatal).toBe(
      true,
    );
  });

  it('tolerates a null profile id', () => {
    expect(buildErrorRow({ tag: 't', code: null, message: null }, null).profile_id).toBeNull();
  });

  it('truncates a long message', () => {
    const long = 'x'.repeat(MAX_MESSAGE_LENGTH + 250);
    expect(buildErrorRow({ tag: 't', code: null, message: long }, null).message).toHaveLength(
      MAX_MESSAGE_LENGTH,
    );
  });

  it('leaves a null message null rather than stringifying it', () => {
    expect(buildErrorRow({ tag: 't', code: null, message: null }, null).message).toBeNull();
  });
});
