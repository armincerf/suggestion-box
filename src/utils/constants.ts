// Constants used throughout the application

// Common emojis used for reactions
export const COMMON_EMOJIS = ["👍", "👎"];

// Pagination constants
export const MAX_REPLIES_SHOWN = 3;
export const MAX_DEPTH = 4;
export const MAX_COMMENTS_SHOWN = 5;
export const MAX_SUGGESTIONS_SHOWN = 50;

// Screen breakpoints
export const SCREEN_BREAKPOINT_MD = 768;

// Database query constants
export const DUMMY_QUERY_ID = "NON_EXISTENT_ID";

/**
 * Standard TTL options for queries to ensure consistency across the app
 */
export const QUERY_TTL_FOREVER = "forever";
export const QUERY_TTL_SHORT = "5s";
export const QUERY_TTL_MEDIUM = "1m";
export const QUERY_TTL_LONG = "1h";
