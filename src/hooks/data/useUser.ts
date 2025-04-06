import { useQuery } from "@rocicorp/zero/solid";
import { createMemo, type Accessor } from "solid-js";
import { type TZero, useZero } from "../../zero/ZeroContext";
import { getUserIdentifier } from "../../utils/userIdentifier";
import { getNameFromUserId } from "../../nameGenerator";
import { QUERY_TTL_FOREVER } from "../../utils/constants";

function getUserColour(userId: string | null | undefined): string {
	if (!userId) return "hsl(0, 0%, 50%)";
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = userId.charCodeAt(i) + ((hash << 5) - hash);
		hash = hash & hash;
	}
	const hue = hash % 360;
	return `hsl(${hue}, 70%, 50%)`;
}

const usersQuery = (z: TZero) => z.query.users;

/**
 * Hook to get all users
 */
export function useUsers() {
	const z = useZero();
	return useQuery(() => usersQuery(z), { ttl: QUERY_TTL_FOREVER });
}

/**
 * Hook to get a specific user by ID
 */
export function useUser(id?: string) {
	const z = useZero();
	const userId = createMemo(() => id || z.userID || getUserIdentifier());
	const [allUsers] = useUsers();

	// Filter the specific user in createMemo
	const user = createMemo(() => {
		const users = allUsers();
		const currentId = userId();
		return users?.find(u => u.id === currentId) || null;
	});

	const displayName = createMemo(
		() => user()?.displayName || getNameFromUserId(userId() || ""),
	);

	const color = createMemo(() => getUserColour(userId()));

	return {
		user,
		userId: userId(),
		displayName,
		color,
		isLoading: allUsers() === undefined,
	};
}

/**
 * Hook to get users filtered by an array of IDs
 */
export function useFilteredUsers(userIds: Accessor<string[]>) {
	const [allUsers] = useUsers();
	
	// Filter users by the provided IDs
	const filteredUsers = createMemo(() => {
		const users = allUsers();
		const ids = userIds();
		
		if (!users || !ids || ids.length === 0) {
			return [];
		}
		
		return users.filter(user => ids.includes(user.id));
	});
	
	return [filteredUsers] as const;
}
