/**
 * Single source of truth for the details that appear in support and legal copy.
 *
 * SUPPORT_EMAIL is a personal mailbox for now; switching to an organisation
 * address means changing it here, in the Supabase SMTP settings, and in the
 * error-alert function secrets.
 */
export const SUPPORT_EMAIL = 'dax0068@gmail.com';

/** Date the legal copy was last revised, shown in the privacy policy. */
export const LEGAL_LAST_UPDATED = '27 September 2026';

/**
 * Who operates the service, and the governing law for the terms.
 *
 * Hangout is published by an individual, not a company, so OPERATOR is a legal
 * name and OPERATOR_ADDRESS is the postal address that identifies the data
 * controller. Google Play shows the same name and address publicly on the
 * store listing, and the two must match — if the listing address changes,
 * change it here too.
 */
export const OPERATOR = 'Brițchi Daniel';
export const OPERATOR_ADDRESS = 'MD-2004 Chișinău, Moldova';
export const JURISDICTION = 'Moldova';
