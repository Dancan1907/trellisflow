/** Default lifetime of a newly issued API token. */
export const DEFAULT_TOKEN_EXPIRY_DAYS = 90;

/** Tokens expiring within this many days are flagged as "expiring soon". */
export const TOKEN_EXPIRY_WARNING_DAYS = 14;

/** How long the old token keeps working after a rotation (zero-downtime hand-over). */
export const DEFAULT_ROTATION_GRACE_HOURS = 24;
export const MAX_ROTATION_GRACE_HOURS = 168; // 7 days

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
