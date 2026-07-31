const RAISE_EXCEPTION = 'P0001';

const OFFLINE = 'You seem to be offline.';

function messageOf(e: unknown): string | null {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return null;
}

function codeOf(e: unknown): string | null {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    return String((e as { code: unknown }).code);
  }
  return null;
}

function isNetworkFailure(e: unknown): boolean {
  const message = messageOf(e);
  if (message === null) return false;
  return message.includes('Network request failed') || message.includes('Failed to fetch');
}

export function userMessage(e: unknown, fallback: string, tag = 'error'): string {
  console.warn(`[${tag}]`, e);
  if (codeOf(e) === RAISE_EXCEPTION) {
    const message = messageOf(e);
    if (message) return message;
  }
  if (isNetworkFailure(e)) return OFFLINE;
  return fallback;
}
