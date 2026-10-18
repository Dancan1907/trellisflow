/**
 * Shared API constants.
 */

/** The version prefix for the external REST API. */
export const API_VERSION = 'v1';

/** The base path for the external REST API. */
export const API_BASE_PATH = `/api/trellisflow/${API_VERSION}`;

/** The prefix for API tokens (helps identify them in logs). */
export const API_TOKEN_PREFIX = 'tf_';

/** Length (in characters) of the random portion of an API token. */
export const API_TOKEN_RANDOM_LENGTH = 43;

/** Default expiry for API tokens, in days. */
export const API_TOKEN_DEFAULT_EXPIRY_DAYS = 90;

/** Days before expiry to warn users. */
export const API_TOKEN_WARNING_DAYS = 14;
