import { randID } from "../rand";

/**
 * Gets or creates a unique user identifier from localStorage
 * @returns A unique identifier for the current user
 */
export function getuserId(): string {
	let identifier = localStorage.getItem("userId");
	if (!identifier) {
		// Create a new identifier if one doesn't exist
		identifier = randID();
		try {
			localStorage.setItem("userId", identifier);
		} catch (error) {
			console.error("Failed to store user identifier:", error);
		}
	}
	return identifier;
}
