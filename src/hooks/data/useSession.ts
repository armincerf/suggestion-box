import { useQuery } from "@rocicorp/zero/solid";
import { type TZero, useZero } from "../../zero/ZeroContext";
import { createMemo, createSignal, type Accessor } from "solid-js";
import {
	DUMMY_QUERY_ID,
	QUERY_TTL_FOREVER,
	QUERY_TTL_SHORT,
} from "../../utils/constants";
import { createLogger } from "../../hyperdx-logger";
import { useFilteredUsers } from "./useUser";

const logger = createLogger("suggestion-box:useSession");

export const sessionByIdQuery = (z: TZero, id: string) =>
	z.query.sessions.where("id", "=", id).one();

export const allSessionsQuery = (z: TZero) => z.query.sessions;

export const activeSessionsQuery = (z: TZero) =>
	z.query.sessions.where("endedAt", "IS", null).orderBy("startedAt", "desc");

export function useSession(id: string) {
	const z = useZero();

	return useQuery(() => sessionByIdQuery(z, id), { ttl: QUERY_TTL_FOREVER });
}

export function useSessionUsers(sessionId: string) {
	const [session] = useSession(sessionId);
	
	// Create a memo for the session user IDs
	const sessionUserIds = createMemo(() => {
		const currentSession = session();
		return currentSession?.users || [];
	});
	
	// Use the filtered users hook
	return useFilteredUsers(sessionUserIds);
}

export function useSessions() {
	const z = useZero();

	return useQuery(() => allSessionsQuery(z), { ttl: QUERY_TTL_FOREVER });
}

export function useActiveSessions() {
	const z = useZero();

	return useQuery(() => activeSessionsQuery(z), { ttl: QUERY_TTL_SHORT });
}

// Query to get the most recent *ended* session before the current one
const previousEndedSessionQuery = (z: TZero, currentSessionId: string) =>
	z.query.sessions
		.where("id", "!=", currentSessionId)
		.where("endedAt", "IS NOT", null)
		.orderBy("endedAt", "desc")
		.limit(1)
		.one();

// Query for suggestions between last session end and current session start
const suggestionsBetweenSessionsQuery = (
	z: TZero,
	lastSessionEndTime: number | null, // Can be null if no previous session
	currentSessionStartTime: number,
) => {
	// Use 0 if lastSessionEndTime is null (gets all suggestions before current start)
	const lowerBound = lastSessionEndTime ?? 0;

	return z.query.suggestions
		.where("deletedAt", "IS", null)
		.where("updatedAt", ">", lowerBound) // Use updatedAt as per original logic
		.where("updatedAt", "<", currentSessionStartTime) // Use updatedAt as per original logic
		.orderBy("categoryId", "asc") // Or original sort order
		.related("comments") // Add relations if needed
		.related("reactions");
};

/**
 * Hook to fetch suggestions to review between sessions
 *
 * This function queries for suggestions that were created or updated between:
 * 1. The end of the last completed session (or beginning of time if no previous session)
 * 2. The start of the current session
 *
 * These are suggestions that haven't been reviewed in any session yet.
 */
export function useSuggestionsToReview(
	sessionId: string,
	startedAt: Accessor<number>, // Accessor for current session start time
) {
	const z = useZero();

	// Fetch the previous ended session reactively
	const [previousSession] = useQuery(
		() => previousEndedSessionQuery(z, sessionId),
		{ ttl: QUERY_TTL_FOREVER }, // Cache previous session info
	);

	// Calculate the end time of the previous session reactively
	const lastSessionEndTime = createMemo(
		() => previousSession()?.endedAt ?? null,
	);

	// Fetch suggestions based on the time range
	return useQuery(
		() => {
			const startTime = startedAt(); // Get current start time
			const lastEndTime = lastSessionEndTime(); // Get previous end time

			return suggestionsBetweenSessionsQuery(z, lastEndTime, startTime);
		},
		{ ttl: QUERY_TTL_SHORT },
	);
}

/**
 * Hook for session management including start and end functionality
 */
export function useSessionMutations() {
	const z = useZero();
	const [currentSessionId, setCurrentSessionId] = createSignal<string | null>(
		null,
	);

	/**
	 * Starts a session by setting the startedAt timestamp
	 */
	const startSession = async (sessionId: string) => {
		if (!z) return;

		try {
			// Call mutate directly
			await z.mutate.sessions.update({
				id: sessionId,
				startedAt: Date.now(),
				updatedAt: Date.now(),
			});

			// Update local session state
			setCurrentSessionId(sessionId);
		} catch (error) {
			logger.error("Failed to start session:", error);
		}
	};

	/**
	 * Ends the current session by setting the endedAt timestamp
	 */
	const endSession = async (sessionId: string) => {
		if (!z || !sessionId) return;

		try {
			// Call mutate directly
			await z.mutate.sessions.update({
				id: sessionId,
				endedAt: Date.now(),
				updatedAt: Date.now(),
			});

			// Clear local session state
			setCurrentSessionId(null);
		} catch (error) {
			logger.error("Failed to end session:", error);
		}
	};

	return {
		startSession,
		endSession,
		currentSessionId,
	};
}

// Query for suggestions within an active session's timeframe
const activeSessionSuggestionsQuery = (
	z: TZero,
	startedAt: number,
	endedAt: number | null, // Allow null for ongoing sessions
) => {
	let query = z.query.suggestions
		.where("deletedAt", "IS", null) // Exclude deleted
		.where("updatedAt", ">", startedAt) // Use updatedAt from original logic
		.related("comments") // Add relations if needed
		.related("reactions");

	if (endedAt) {
		// If session ended, only include suggestions up to the end time
		query = query.where("updatedAt", "<=", endedAt);
	}

	return query;
};

// Hook to get suggestions active during a session
export function useActiveSessionSuggestions(
	startedAt: Accessor<number | null | undefined>,
	endedAt: Accessor<number | null | undefined>,
) {
	const z = useZero();

	return useQuery(
		() => {
			const start = startedAt();
			const end = endedAt();

			// Only run query if startedAt is valid
			if (!start || start <= 0) {
				// Return a query for nothing if session hasn't properly started
				return z.query.suggestions.where("id", "=", DUMMY_QUERY_ID);
			}

			// Use the actual start time and handle end being undefined
			return activeSessionSuggestionsQuery(z, start, end || null);
		},
		{ ttl: QUERY_TTL_SHORT },
	);
}
