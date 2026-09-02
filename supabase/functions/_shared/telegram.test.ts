import { buildMessage, messageChunks, MESSAGE_LIMIT } from './telegram.ts';

describe('buildMessage', () => {
  it('puts the subject on its own line above the body', () => {
    expect(buildMessage({ subject: 'Hangout weekly', text: 'line one\nline two' })).toBe(
      'Hangout weekly\n\nline one\nline two',
    );
  });
});

describe('messageChunks', () => {
  it('leaves a short message alone', () => {
    expect(messageChunks('short')).toEqual(['short']);
  });

  it('does not split a message exactly at the limit', () => {
    expect(messageChunks('x'.repeat(MESSAGE_LIMIT))).toHaveLength(1);
  });

  it('splits on line boundaries rather than mid-entry', () => {
    const line = 'y'.repeat(100);
    const chunks = messageChunks(Array.from({ length: 60 }, () => line).join('\n'), 1000);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1000);
      // every line survived whole
      for (const l of chunk.split('\n')) expect(l).toBe(line);
    }
  });

  it('hard splits a single line with no break to use', () => {
    const chunks = messageChunks('z'.repeat(250), 100);
    expect(chunks).toHaveLength(3);
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
  });

  it('loses no content', () => {
    const message = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n');
    expect(messageChunks(message, 50).join('\n')).toBe(message);
  });
});
