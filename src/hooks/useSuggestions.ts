import type { Reaction, Schema, Suggestion } from "../schema";
import type { Zero } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/solid";
import { useZero } from "../context/ZeroContext";
import { type Accessor, createMemo } from "solid-js";

export const suggestionQuery = (z: Zero<Schema>) =>
	z.query.suggestion.orderBy("timestamp", "desc");

export function useSuggestions() {
	const z = useZero();
	return useQuery(
		() => {
			return z.query.suggestion
				.orderBy("timestamp", "desc")
				.related("comments")
				.related("reactions");
		},
		{ ttl: "forever" },
	);
}

export function useSuggestionRating(emojis: string[]) {
	const rating = createMemo(() => {
		const thumbsUp = emojis.filter((e) => e === "👍").length ?? 0;
		const thumbsDown = emojis.filter((e) => e === "👎").length ?? 0;
		return thumbsUp - thumbsDown;
	});

	return rating();
}
