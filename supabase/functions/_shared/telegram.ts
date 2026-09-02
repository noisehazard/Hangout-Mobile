/**
 * Delivery for the alerts that are addressed to the operator, not to users.
 *
 * These messages only ever go to one person, so email was always the wrong
 * shape for them: it needed a verified sender, a domain, and a provider willing
 * to relay for an individual. A bot token has none of that, and a crash alert
 * arrives on the phone instead of in an inbox.
 *
 * User-facing mail — sign-in codes above all — is unrelated and still goes
 * through Supabase Auth's own SMTP configuration.
 */

const API_ROOT = 'https://api.telegram.org';

/** Telegram rejects any message over 4096 characters. */
export const MESSAGE_LIMIT = 4096;

export type Alert = { subject: string; text: string };

export function buildMessage(alert: Alert): string {
  return `${alert.subject}\n\n${alert.text}`;
}

/**
 * Splits a message to fit the size limit, breaking on line boundaries so a
 * digest never splits mid-entry. A single line longer than the limit is hard
 * split, since there is nowhere better to cut it.
 */
export function messageChunks(message: string, limit = MESSAGE_LIMIT): string[] {
  if (message.length <= limit) return [message];

  const chunks: string[] = [];
  let current = '';

  for (const line of message.split('\n')) {
    for (const piece of hardSplit(line, limit)) {
      const candidate = current ? `${current}\n${piece}` : piece;
      if (candidate.length <= limit) {
        current = candidate;
      } else {
        if (current) chunks.push(current);
        current = piece;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function hardSplit(line: string, limit: number): string[] {
  if (line.length <= limit) return [line];
  const out: string[] = [];
  for (let i = 0; i < line.length; i += limit) out.push(line.slice(i, i + limit));
  return out;
}

export async function sendAlert(alert: Alert): Promise<void> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) {
    console.warn('[alert] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set; skipping send');
    return;
  }

  for (const chunk of messageChunks(buildMessage(alert))) {
    const res = await fetch(`${API_ROOT}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // No parse_mode: the text is plain and Telegram's Markdown would demand
      // escaping every -, ., ! and ( in it.
      body: JSON.stringify({ chat_id: chatId, text: chunk, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Telegram sendMessage failed: ${res.status} ${detail}`);
    }
  }
}
