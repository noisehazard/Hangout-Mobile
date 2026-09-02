/**
 * The landing site that turns a share link into an app open. It does not exist
 * yet — the web app is still to be built, and no domain has been registered —
 * so these URLs currently resolve to nothing. Point EXPO_PUBLIC_SHARE_HOST at
 * the real host once it is live; the default below is a placeholder.
 */
const SHARE_HOST = process.env.EXPO_PUBLIC_SHARE_HOST ?? 'https://hangout.app';

export function eventShareUrl(eventId: string, token?: string | null): string {
  const base = `${SHARE_HOST}/e/${encodeURIComponent(eventId)}`;
  return token ? `${base}?k=${encodeURIComponent(token)}` : base;
}

export function eventShareMessage(title: string, url: string): string {
  return `${title} — join me on Hangout\n${url}`;
}
