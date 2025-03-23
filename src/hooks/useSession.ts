import type { Zero } from "@rocicorp/zero";
import type { Schema, Session, User } from "../schema";
import { randID } from "../rand";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";
import { createMemo } from "solid-js";

export const sessionQuery = (z: Zero<Schema>, sessionId: string) =>
	z.query.session.where("id", "=", sessionId).one();

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
				return z.query.user.where("id", "=", "dummy-non-existent-id");
			}

			const userIds = session()?.users || [];
			if (userIds.length === 0) {
				return z.query.user.where("id", "=", "dummy-non-existent-id");
			}

			// Use a complex where expression to build a compound OR query for multiple user IDs
			return z.query.user.where(({ cmp, or }) => {
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
	startedAt: number,
	reviewCompleted: boolean,
) {
	const z = useZero();
	const [previousSessions] = useQuery(
		() => z.query.session.orderBy("endedAt", "desc").limit(10),
		{ ttl: 5000 },
	);

	// Filter sessions and compute last session end time using createMemo
	const lastSessionEndTime = createMemo(() => {
		const sessions = previousSessions() || [];
		const filtered = sessions.filter((s) => s.id !== sessionId && s.endedAt);
		return filtered.length > 0 ? filtered[0].endedAt || 0 : 0;
	});

	return useQuery(
		() => {
			if (!startedAt || reviewCompleted) {
				return z.query.suggestion.where("id", "=", "dummy-non-existent-id");
			}

			// We need to get suggestions between last session end and this session start
			return z.query.suggestion
				.where("updatedAt", ">", lastSessionEndTime())
				.where("updatedAt", "<", startedAt)
				.orderBy("updatedAt", "asc");
		},
		{ ttl: 5000 },
	);
}

export function useActiveSessionSuggestions(
	startedAt: number,
	endedAt: number | null,
) {
	const z = useZero();

	return useQuery(
		() => {
			let query = z.query.suggestion
				.where("updatedAt", ">", startedAt)
				.related("comments")
				.related("reactions")
				.orderBy("updatedAt", "desc");

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
	await z.mutate.session.insert({
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
	const session = await z.query.session.where("id", "=", sessionId).one().run();
	if (!session) {
		throw new Error(`Session with ID ${sessionId} not found`);
	}

	if (!session.users.includes(userId)) {
		const updatedUsers = [...session.users, userId];
		await z.mutate.session.update({
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
	const session = await z.query.session.where("id", "=", sessionId).one().run();
	if (!session) {
		throw new Error(`Session with ID ${sessionId} not found`);
	}

	const users = await Promise.all(
		session.users.map(async (userId: string) => {
			return await z.query.user.where("id", "=", userId).one().run();
		}),
	);

	return users.filter(Boolean) as User[];
}

export async function startSession(
	z: Zero<Schema>,
	sessionId: string,
): Promise<void> {
	await z.mutate.session.update({
		id: sessionId,
		startedAt: Date.now(),
		updatedAt: Date.now(),
	});
}

export async function endSession(
	z: Zero<Schema>,
	sessionId: string,
): Promise<void> {
	await z.mutate.session.update({
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
	const sessions = await z.query.session
		.orderBy("endedAt", "desc")
		.limit(limit + 1)
		.run();
	return sessions.filter((session) => session.id !== currentSessionId);
}
