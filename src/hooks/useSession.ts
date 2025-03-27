import type { Zero } from "@rocicorp/zero";
import type { Schema, Session, User } from "../zero-schema";
import { randID } from "../rand";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";
import type { Accessor } from "solid-js";
import { logger } from "../../hyperdx-logger";

export const sessionQuery = (z: Zero<Schema>, sessionId: string) =>
	z.query.sessions.where("id", "=", sessionId).one();

export function useSession(sessionId: string) {
	const z = useZero();
	return useQuery(() => sessionQuery(z, sessionId), { ttl: 10000 });
}

export function useSessionUsers(sessionId: string) {
	const z = useZero();
	const [session] = useSession(sessionId);

	return useQuery(
		() => {
			if (!session()) {
				return z.query.users.where("id", "=", "dummy-non-existent-id");
			}

			const userIds = session()?.users || [];
			if (userIds.length === 0) {
				return z.query.users.where("id", "=", "dummy-non-existent-id");
			}

			// Use a complex where expression to build a compound OR query for multiple user IDs
			return z.query.users.where(({ cmp, or }) => {
				// Create an array of conditions, one for each user ID
				const conditions = userIds.map((userId) => cmp("id", userId));
				// Apply OR to all conditions
				return or(...conditions);
			});
		},
		{ ttl: 5000 },
	);
}

export function useSuggestionsToReview(
	sessionId: string,
	startedAt: Accessor<number>,
) {
	const z = useZero();
	const [previousSession] = useQuery(
		() =>
			z.query.sessions
				.where("id", "!=", sessionId)
				.where("endedAt", "IS NOT", null)
				.orderBy("endedAt", "desc")
				.limit(1)
				.one(),
		{ ttl: "forever" },
	);

	// Filter sessions and compute last session end time using createMemo
	const lastSessionEndTime = previousSession()?.endedAt || 0;

	return useQuery(() => {
		console.log("finding suggestions between", lastSessionEndTime, startedAt());
		// We need to get suggestions between last session end and this session start
		return z.query.suggestions
			.where("deletedAt", "IS", null)
			.where("updatedAt", ">", lastSessionEndTime)
			.where("updatedAt", "<", startedAt())
			.orderBy("categoryId", "asc")
			.related("comments")
			.related("reactions");
	});
}

export function useActiveSessionSuggestions(
	startedAt: number,
	endedAt: number | null,
) {
	const z = useZero();

	return useQuery(
		() => {
			let query = z.query.suggestions
				.where("updatedAt", ">", startedAt)
				.related("comments")
				.related("reactions");

			if (endedAt) {
				query = query.where("updatedAt", "<=", endedAt);
			}

			return query;
		},
		{ ttl: 5000 },
	);
}

export async function createSessionWithUsers(
	z: Zero<Schema>,
	userId: string,
	options: {
		startNow?: boolean;
	} = {},
): Promise<string> {
	const sessionId = randID();
	await z.mutate.sessions.insert({
		id: sessionId,
		startedAt: options.startNow ? Date.now() : 0,
		startedBy: userId,
		users: [userId],
		updatedAt: Date.now(),
	});
	return sessionId;
}

export async function updateSessionUsers(
	z: Zero<Schema>,
	sessionId: string,
	userId: string,
): Promise<void> {
	const session = await z.query.sessions
		.where("id", "=", sessionId)
		.one()
		.run();
	if (!session || !session.users) {
		console.error(`Session with ID ${sessionId} not found`, { session });
		throw new Error(`Session with ID ${sessionId} not found`);
	}

	if (!session.users.includes(userId)) {
		const updatedUsers = [...session.users, userId];
		await z.mutate.sessions.update({
			id: sessionId,
			users: updatedUsers,
			updatedAt: Date.now(),
		});
	}
}

export async function getSessionUsers(
	z: Zero<Schema>,
	sessionId: string,
): Promise<User[]> {
	const session = await z.query.sessions
		.where("id", "=", sessionId)
		.one()
		.run();
	if (!session || !session.users) {
		console.error(`Session with ID ${sessionId} not found`, { session });
		throw new Error(`Session with ID ${sessionId} not found`);
	}

	const users = await Promise.all(
		session.users.map(async (userId: string) => {
			return await z.query.users.where("id", "=", userId).one().run();
		}),
	);

	return users.filter(Boolean) as User[];
}

export async function startSession(
	z: Zero<Schema>,
	sessionId: string,
	userId: string,
): Promise<void> {
	try {
		await z.mutate.sessions.update({
			id: sessionId,
			startedAt: Date.now(),
			updatedAt: Date.now(),
		});
		logger.info("Session started", {
			sessionId,
			startedBy: userId,
		});
	} catch (error) {
		logger.error(
			"Error starting session",
			error instanceof Error ? error : new Error(String(error)),
		);
	}
}

export async function endSession(
	z: Zero<Schema>,
	sessionId: string,
): Promise<void> {
	await z.mutate.sessions.update({
		id: sessionId,
		endedAt: Date.now(),
		updatedAt: Date.now(),
	});
}

export async function getPreviousSessions(
	z: Zero<Schema>,
	currentSessionId: string,
	limit = 1,
): Promise<Session[]> {
	const sessions = await z.query.sessions
		.orderBy("endedAt", "desc")
		.limit(limit + 1)
		.run();
	return sessions.filter((session) => session.id !== currentSessionId);
}

/**
 * Hook to get active sessions (sessions that have not ended)
 */
export function useActiveSessions() {
	const z = useZero();

	// Query for active sessions directly using where with IS operator for null comparison
	return useQuery(
		() =>
			z.query.sessions
				.where("endedAt", "IS", null)
				.orderBy("startedAt", "desc"),
		{ ttl: 5000 },
	);
}
