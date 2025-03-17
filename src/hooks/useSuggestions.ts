import type { Schema } from "../schema";
import type { Zero } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";

export const suggestionQuery = (z: Zero<Schema>) =>
	z.query.suggestion.orderBy("timestamp", "desc");

export function useSuggestions() {
	const z = useZero();
	return useQuery(() => {
		return z.query.suggestion
			.orderBy("timestamp", "desc")
			.related("comments")
			.related("reactions");
	}, { ttl: "forever" });
}
