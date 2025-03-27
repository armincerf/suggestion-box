import type { Schema } from "../zero-schema";
import type { Zero } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";

/**
 * Base query for categories
 */
export const categoryQuery = (z: Zero<Schema>) =>
	z.query.categories.orderBy("name", "asc");

/**
 * Hook to fetch all categories
 */
export function useCategories() {
	const z = useZero();

	return useQuery(() => categoryQuery(z), { ttl: "forever" });
}
