export type PushUnavailableReason = 'expo-go' | 'simulator' | 'no-project-id';

export const PUSH_UNAVAILABLE_MESSAGE: Record<PushUnavailableReason, string> = {
  'expo-go': "Push notifications need the installed app — they don't work in Expo Go.",
  simulator: 'Push notifications need a real device, not an emulator.',
  'no-project-id': 'This build is missing its EAS project id, so it can’t register for push.',
};

export function pushUnavailableReason(env: {
  isDevice: boolean;
  isExpoGo: boolean;
}): PushUnavailableReason | null {
  if (env.isExpoGo) return 'expo-go';
  if (!env.isDevice) return 'simulator';
  return null;
}

type ConstantsLike = {
  expoConfig?: { extra?: { eas?: { projectId?: string } } } | null;
  easConfig?: { projectId?: string } | null;
};

export function resolveProjectId(constants: ConstantsLike): string | null {
  return constants.expoConfig?.extra?.eas?.projectId ?? constants.easConfig?.projectId ?? null;
}

/**
 * Routes we are willing to open from a push payload. The outbox only ever writes
 * /friends, /user/<id> and /event/<id> (migration 0016), but a token is a token —
 * treat `data.url` as untrusted and only follow paths we recognise.
 */
const ALLOWED_ROOTS = ['friends', 'event', 'user', 'activity', 'my-hangouts'];

export function hrefFromNotificationData(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const url = (data as { url?: unknown }).url;
  if (typeof url !== 'string') return null;
  // Reject anything that isn't a plain in-app absolute path: no protocol-relative
  // "//evil.example", no schemes, no whitespace.
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  if (/\s/.test(url)) return null;
  const root = url.slice(1).split('/')[0];
  return ALLOWED_ROOTS.includes(root) ? url : null;
}
