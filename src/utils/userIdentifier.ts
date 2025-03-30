import { logger } from "../hyperdx-logger";

/**
 * User identifier stored in localStorage
 * Gets or creates a unique user identifier from localStorage
 */
const USER_ID_KEY = "userId";

/**
 * Gets or creates a unique user identifier from localStorage
 * @returns A unique identifier for the current user
 */
export function getUserIdentifier(): string {
	let identifier = localStorage.getItem(USER_ID_KEY);
	if (!identifier) {
		// Create a new identifier if one doesn't exist
		identifier = generateUserId();
		try {
			localStorage.setItem(USER_ID_KEY, identifier);
		} catch (error) {
			logger.error("Failed to store user identifier:", error);
		}
	}
	return identifier;
}

// Generate a new random user ID using crypto.randomUUID()
function generateUserId(): string {
	return crypto.randomUUID();
}
