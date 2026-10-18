/**
 * Business limits and validation rules.
 * Kept in one place so backend and frontend enforce identical rules.
 */

/** Minimum password length (NIST recommended). */
export const MIN_PASSWORD_LENGTH = 8;

/** Maximum length for a container or account name. */
export const MAX_NAME_LENGTH = 100;

/** Maximum length for a transaction description. */
export const MAX_DESCRIPTION_LENGTH = 200;

/** Maximum length for a note field. */
export const MAX_NOTE_LENGTH = 2000;

/** Maximum length for a unit label on a summary. */
export const MAX_UNIT_LENGTH = 64;

/** Default page size for list endpoints. */
export const DEFAULT_PAGE_SIZE = 50;

/** Maximum page size allowed. */
export const MAX_PAGE_SIZE = 200;

/** Default token expiry in days (sessions without "remember me"). */
export const SESSION_DEFAULT_DAYS = 7;

/** Extended session expiry with "remember me". */
export const SESSION_EXTENDED_DAYS = 30;

/** Absolute session maximum, regardless of activity. */
export const SESSION_ABSOLUTE_DAYS = 90;
