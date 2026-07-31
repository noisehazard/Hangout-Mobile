import { avatarObjectPath, photoObjectPath, withCacheBuster } from './storage';
describe('photoObjectPath', () => {
  it('builds a .jpg path from the given id', () => {
    expect(photoObjectPath('abc')).toBe('abc.jpg');
  });
  it('generates a non-empty path when no id given', () => {
    expect(photoObjectPath().endsWith('.jpg')).toBe(true);
  });
});

describe('avatar storage helpers', () => {
  it('builds a per-user avatar path', () => {
    expect(avatarObjectPath('user-123')).toBe('user-123/avatar.jpg');
  });

  it('appends a cache-buster query param to the public URL', () => {
    const url = withCacheBuster('https://x.co/storage/avatars/user-123/avatar.jpg');
    expect(url).toMatch(
      /^https:\/\/x\.co\/storage\/avatars\/user-123\/avatar\.jpg\?v=\d+$/,
    );
  });
});
