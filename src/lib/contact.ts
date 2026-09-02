/**
 * Single source of truth for the details that appear in support and legal copy.
 *
 * SUPPORT_EMAIL is a personal mailbox for now; switching to an organisation
 * address means changing it here, in the Supabase SMTP settings, and in the
 * error-alert function secrets.
 */
export const SUPPORT_EMAIL = 'dax0068@gmail.com';

/** Date the legal copy was last revised, shown in the privacy policy. */
export const LEGAL_LAST_UPDATED = '2 September 2026';

/**
 * Who operates the service, and the governing law for the terms.
 *
 * TODO(before first Play release): Google rejects apps whose policy still shows
 * placeholders, and these two are decisions only you can make — whether you
 * publish as yourself or a registered company, and under which country's law.
 */
export const OPERATOR = '[ENTITY/NAME]';
export const JURISDICTION = '[JURISDICTION]';
