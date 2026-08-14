const SHARE_HOST = 'https://hangoutai.app';

export function eventShareUrl(eventId: string, token?: string | null): string {
  const base = `${SHARE_HOST}/e/${encodeURIComponent(eventId)}`;
  return token ? `${base}?k=${encodeURIComponent(token)}` : base;
}

export function eventShareMessage(title: string, url: string): string {
  return `${title} — join me on HangoutAI\n${url}`;
}
