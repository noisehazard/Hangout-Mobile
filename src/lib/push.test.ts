import {
  hrefFromNotificationData,
  pushUnavailableReason,
  resolveProjectId,
} from '@/lib/push';

describe('pushUnavailableReason', () => {
  it('blocks Expo Go first', () => {
    expect(pushUnavailableReason({ isDevice: true, isExpoGo: true })).toBe('expo-go');
  });

  it('blocks emulators', () => {
    expect(pushUnavailableReason({ isDevice: false, isExpoGo: false })).toBe('simulator');
  });

  it('allows a real device in a dev build', () => {
    expect(pushUnavailableReason({ isDevice: true, isExpoGo: false })).toBeNull();
  });
});

describe('resolveProjectId', () => {
  it('reads the id from expoConfig', () => {
    expect(resolveProjectId({ expoConfig: { extra: { eas: { projectId: 'abc' } } } })).toBe('abc');
  });

  it('falls back to easConfig', () => {
    expect(resolveProjectId({ expoConfig: null, easConfig: { projectId: 'xyz' } })).toBe('xyz');
  });

  it('returns null when neither is present', () => {
    expect(resolveProjectId({})).toBeNull();
    expect(resolveProjectId({ expoConfig: { extra: {} } })).toBeNull();
  });
});

describe('hrefFromNotificationData', () => {
  it('accepts the routes the outbox writes', () => {
    expect(hrefFromNotificationData({ type: 'friend_request', url: '/friends' })).toBe('/friends');
    expect(hrefFromNotificationData({ url: '/user/abc-123' })).toBe('/user/abc-123');
    expect(hrefFromNotificationData({ url: '/event/abc-123' })).toBe('/event/abc-123');
  });

  it('rejects unknown roots', () => {
    expect(hrefFromNotificationData({ url: '/admin' })).toBeNull();
    expect(hrefFromNotificationData({ url: '/' })).toBeNull();
  });

  it('rejects anything that could leave the app', () => {
    expect(hrefFromNotificationData({ url: '//evil.example/friends' })).toBeNull();
    expect(hrefFromNotificationData({ url: 'https://evil.example' })).toBeNull();
    expect(hrefFromNotificationData({ url: 'hangoutai://friends' })).toBeNull();
    expect(hrefFromNotificationData({ url: '/friends /x' })).toBeNull();
  });

  it('tolerates junk payloads', () => {
    expect(hrefFromNotificationData(null)).toBeNull();
    expect(hrefFromNotificationData(undefined)).toBeNull();
    expect(hrefFromNotificationData('/friends')).toBeNull();
    expect(hrefFromNotificationData({})).toBeNull();
    expect(hrefFromNotificationData({ url: 42 })).toBeNull();
  });
});
