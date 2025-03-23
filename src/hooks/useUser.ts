import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";
import { getNameFromUserId } from "../nameGenerator";
import { createMemo } from "solid-js";
import type { Zero } from "@rocicorp/zero";
import type { Schema } from "../schema";

export const userQuery = (z: Zero<Schema>) =>
	z.query.user.where("id", "=", z.userID).one();

export function useUser() {
	const z = useZero();
	const userId = z.userID;
	const [userData] = useQuery(() => userQuery(z), { ttl: "forever" });

	return {
		user: userData,
		displayName: createMemo(
			() => userData()?.displayName || getNameFromUserId(userId),
		),
		userId: userId,
	};
}
