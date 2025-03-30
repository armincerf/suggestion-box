import { useQuery } from "@rocicorp/zero/solid";
import { createMemo } from "solid-js";
import { type TZero, useZero } from "../../zero/ZeroContext";
import { getUserIdentifier } from "../../utils/userIdentifier";
import { getNameFromUserId } from "../../nameGenerator";
import { QUERY_TTL_FOREVER } from "../../utils/constants";

function getUserColour(userId: string | null | undefined): string {
    if (!userId) return 'hsl(0, 0%, 50%)';
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = userId.charCodeAt(i) + ((hash << 5) - hash);
		hash = hash & hash;
	}
	const hue = hash % 360;
	return `hsl(${hue}, 70%, 50%)`;
}

export const userByIdQuery = (z: TZero, userId: string | null) =>
	userId ? z.query.users.where("id", "=", userId).one() : null;

export const usersQuery = (z: TZero) =>
	z.query.users;

export function useUser() {
	const z = useZero();
	const userId = createMemo(() => z.userID || getUserIdentifier());

	const [user] = useQuery(
		() => userByIdQuery(z, userId()),
		{ ttl: QUERY_TTL_FOREVER }
	);

	const displayName = createMemo(() => user()?.displayName || getNameFromUserId(userId() || ''));

	const color = createMemo(() => getUserColour(userId()));

	return {
		user,
		userId: userId(),
		displayName,
		color,
		isLoading: user === undefined,
	};
}

export function useUsers() {
	const z = useZero();
	return useQuery(
		() => usersQuery(z),
		{ ttl: QUERY_TTL_FOREVER }
	);
} 