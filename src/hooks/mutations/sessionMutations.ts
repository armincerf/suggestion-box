import { type TZero, useZero } from "../../zero/ZeroContext";
import { v4 as uuidv4 } from "uuid";
import type { MutationResult } from "./suggestionMutations";

/**
 * Creates a session with the specified users
 */
export async function createSessionWithUsers(
	startedBy: string,
	users: string[],
	z: TZero
): Promise<MutationResult<string>> {
	try {
		const id = uuidv4();
		const now = Date.now();
		
		await z.mutate.sessions.insert({
			id,
			startedBy,
			users,
			startedAt: now,
			updatedAt: now,
		});
		
		return { success: true, data: id };
	} catch (error) {
		console.error("Failed to create session:", error);
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error))
		};
	}
}

/**
 * Updates the users in a session
 */
export async function updateSessionUsers(
	sessionId: string,
	users: string[],
	z: TZero
): Promise<MutationResult<string>> {
	try {
		await z.mutate.sessions.update({
			id: sessionId,
			users,
			updatedAt: Date.now(),
		});
		
		return { success: true, data: sessionId };
	} catch (error) {
		console.error("Failed to update session users:", error);
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error))
		};
	}
}

/**
 * Hook to create a session that includes the current user
 */
export function useCreateSession() {
	const z = useZero();

	return async (userId: string, otherUsers: string[]): Promise<MutationResult<string>> => {
		if (!userId) {
			return { success: false, error: new Error("User ID not available") };
		}
		
		try {
			// Ensure current user is included
			const userIds = [userId, ...otherUsers.filter((id) => id !== userId)];
			
			return createSessionWithUsers(userId, userIds, z);
		} catch (error) {
			console.error("Failed to create session:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error))
			};
		}
	};
}

/**
 * Hook to update session users
 */
export function useUpdateSession() {
	const z = useZero();

	return async (sessionId: string, userId: string, otherUsers: string[]): Promise<MutationResult<string>> => {
		if (!sessionId) {
			return { success: false, error: new Error("Session ID not available") };
		}
		
		try {
			// Ensure current user is included
			const userIds = [userId, ...otherUsers.filter((id) => id !== userId)];
			
			return updateSessionUsers(sessionId, userIds, z);
		} catch (error) {
			console.error("Failed to update session:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error))
			};
		}
	};
}

/**
 * Hook to update session users (direct access)
 */
export function useUpdateSessionUsers() {
	const z = useZero();

	return async (sessionId: string, users: string[]): Promise<MutationResult<string>> => {
		if (!sessionId) {
			return { success: false, error: new Error("Session ID not available") };
		}
		
		return updateSessionUsers(sessionId, users, z);
	};
}
