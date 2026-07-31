export type OutboxItem = {
  id: string;
  recipient_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

export type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

export type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

export function buildExpoPushMessages(
  items: OutboxItem[],
  tokensByRecipient: Record<string, string[]>,
): ExpoMessage[] {
  const messages: ExpoMessage[] = [];
  for (const item of items) {
    for (const to of tokensByRecipient[item.recipient_id] ?? []) {
      messages.push({ to, title: item.title, body: item.body, data: item.data });
    }
  }
  return messages;
}

export function chunk<T>(arr: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function invalidTokensFromTickets(messages: ExpoMessage[], tickets: ExpoTicket[]): string[] {
  const bad: string[] = [];
  tickets.forEach((t, i) => {
    if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' && messages[i]) {
      bad.push(messages[i].to);
    }
  });
  return bad;
}
